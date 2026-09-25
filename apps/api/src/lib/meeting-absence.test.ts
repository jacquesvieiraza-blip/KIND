// ═══════════════════════════════════════════════════════════════════════════════════════
// 25 Sep (R141 · R166 · P5c, board #2351) — NO-SHOWS, CANCELLATIONS, AND THE ONE FREE RESCHEDULE.
//
// Terms: the prospect does not attend or cancels → reschedule once at no charge; the client
// cancels or does not attend → it counts as delivered; a rescheduled meeting counts once.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Row = Record<string, unknown>
const state = vi.hoisted(() => ({ meeting: null as Row | null, updates: [] as Row[], inserted: [] as Row[], cas: true }))

vi.mock('@kind/db', () => ({
  db: {
    from: () => {
      let pending: Row | null = null
      const q: any = {
        select: () => q, eq: () => q, is: () => q, not: () => q,
        update: (row: Row) => { pending = row; state.updates.push(row); return q },
        insert: (row: Row) => { state.inserted.push(row); return { select: () => ({ single: async () => ({ data: { id: 'm-new', ...row }, error: null }) }) } },
        maybeSingle: async () => ({ data: state.meeting, error: null }),
        single: async () => ({ data: state.meeting, error: null }),
        then: (r: (v: unknown) => unknown) => Promise.resolve(pending
          ? { data: state.cas ? [{ id: 'm1' }] : [], error: null }
          : { data: null, error: null }).then(r),
      }
      return q
    },
  },
}))

import { recordMeetingAbsence, rescheduleAfterAbsence, rescheduleMeeting } from './meeting-truth'

beforeEach(() => {
  state.meeting = {
    id: 'm1', client_id: 'c1', lead_id: 'l1', state: 'BOOKED', excluded_reason: null, superseded_by: null, rescheduled_from: null,
    absence_kind: null, absence_party: null, booked_at: '2026-09-24T10:00:00.000Z',
    qualification: { icp_fit: true }, qualified_at: '2026-09-24T12:00:00Z', qualified_by: 'op', evidence_reply_id: 'r1',
  }
  state.updates = []; state.inserted = []; state.cas = true
})

describe('recording who was absent', () => {
  it('a prospect no-show is the NO_SHOW outcome with its stamp, and says who', async () => {
    const r = await recordMeetingAbsence('m1', { kind: 'no_show', party: 'prospect' }, 'op@kind')
    expect(r).toMatchObject({ ok: true, kind: 'no_show', party: 'prospect' })
    expect(state.updates[0]).toMatchObject({ state: 'NO_SHOW', absence_kind: 'no_show', absence_party: 'prospect', absence_recorded_by: 'op@kind', confirmed_by: 'op@kind' })
    expect(state.updates[0].no_show_confirmed_at).toBeTruthy()
  })

  it('a cancellation leaves the meeting booked (it still counts) and records who', async () => {
    const r = await recordMeetingAbsence('m1', { kind: 'cancelled', party: 'client' }, 'op')
    expect(r.ok).toBe(true)
    expect(state.updates[0]).toMatchObject({ absence_kind: 'cancelled', absence_party: 'client' })
    expect(state.updates[0].state).toBeUndefined()
  })

  it('🛑 refused: no who, a made-up kind, twice, after HELD, or on a moved meeting', async () => {
    expect((await recordMeetingAbsence('m1', { kind: 'no_show', party: '' }, 'op')).ok).toBe(false)
    expect((await recordMeetingAbsence('m1', { kind: 'late', party: 'prospect' }, 'op')).ok).toBe(false)
    state.meeting = { ...state.meeting!, absence_kind: 'cancelled', absence_party: 'prospect' }
    expect(await recordMeetingAbsence('m1', { kind: 'no_show', party: 'prospect' }, 'op')).toMatchObject({ ok: false, reason: 'already_recorded' })
    state.meeting = { ...state.meeting!, absence_kind: null, absence_party: null, state: 'HELD' }
    expect(await recordMeetingAbsence('m1', { kind: 'no_show', party: 'prospect' }, 'op')).toMatchObject({ ok: false, reason: 'already_recorded' })
    state.meeting = { ...state.meeting!, state: 'BOOKED', superseded_by: 'm2' }
    expect(await recordMeetingAbsence('m1', { kind: 'no_show', party: 'prospect' }, 'op')).toMatchObject({ ok: false, reason: 'not_countable' })
    expect(state.updates).toEqual([])
  })
})

describe('🛑 the one free reschedule', () => {
  it('after the PROSPECT missed: a new meeting, carrying its qualification and ORIGINAL booking time', async () => {
    state.meeting = { ...state.meeting!, state: 'NO_SHOW', absence_kind: 'no_show', absence_party: 'prospect' }
    const r = await rescheduleAfterAbsence('m1', '2026-10-02T10:00:00.000Z')
    expect(r.ok).toBe(true)
    expect(state.inserted).toHaveLength(1)
    expect(state.inserted[0]).toMatchObject({
      rescheduled_from: 'm1', scheduled_at: '2026-10-02T10:00:00.000Z',
      booked_at: '2026-09-24T10:00:00.000Z', qualified_at: '2026-09-24T12:00:00Z', evidence_reply_id: 'r1',
    })
    // The old row is superseded — the pair counts once.
    expect(state.updates.some(u => u.superseded_by)).toBe(true)
  })

  it('🛑 the CLIENT missed or cancelled → refused: it counts as delivered', async () => {
    state.meeting = { ...state.meeting!, state: 'NO_SHOW', absence_kind: 'no_show', absence_party: 'client' }
    expect(await rescheduleAfterAbsence('m1', '2026-10-02T10:00:00Z')).toMatchObject({ ok: false, reason: 'client_absence' })
    expect(state.inserted).toEqual([])
  })

  it('🛑 only once: a meeting that is already the reschedule is refused; nothing recorded is refused', async () => {
    state.meeting = { ...state.meeting!, absence_kind: 'cancelled', absence_party: 'prospect', rescheduled_from: 'm0' }
    expect(await rescheduleAfterAbsence('m1', '2026-10-02T10:00:00Z')).toMatchObject({ ok: false, reason: 'already_rescheduled' })
    state.meeting = { ...state.meeting!, absence_kind: null, absence_party: null, rescheduled_from: null }
    expect(await rescheduleAfterAbsence('m1', '2026-10-02T10:00:00Z')).toMatchObject({ ok: false, reason: 'no_absence' })
    state.meeting = { ...state.meeting!, absence_kind: 'no_show', absence_party: 'prospect' }
    expect(await rescheduleAfterAbsence('m1', 'not a date')).toMatchObject({ ok: false, reason: 'invalid' })
    expect(state.inserted).toEqual([])
  })

  it('a NO_SHOW is still not movable by the ordinary reschedule door', async () => {
    state.meeting = { ...state.meeting!, state: 'NO_SHOW' }
    const r = await rescheduleMeeting('m1', '2026-10-02T10:00:00Z')
    expect(r.ok).toBe(false)
  })
})

describe('the doors', () => {
  it('Vida records and reschedules, both audited; the panel offers both', () => {
    const op = readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')
    const a = op.indexOf("operatorRouter.post('/meetings/:id/absence'")
    const b = op.indexOf("operatorRouter.post('/meetings/:id/reschedule'")
    expect(a).toBeGreaterThan(-1); expect(b).toBeGreaterThan(-1)
    expect(op.slice(a, a + 1200)).toContain("action: 'meeting_absence_recorded'")
    expect(op.slice(b, b + 1400)).toContain("action: 'meeting_rescheduled'")
    const panel = readFileSync(join(__dirname, '../../../admin/src/components/vida/MeetingQualifyPanel.tsx'), 'utf8')
    expect(panel).toContain('/absence`')
    expect(panel).toContain('/reschedule`')
  })
})
