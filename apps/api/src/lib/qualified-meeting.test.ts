// ═══════════════════════════════════════════════════════════════════════════════════════
// 25 Sep (R141 · R166 · P5a, board #2351) — A QUALIFIED MEETING IS RECORDED, WITH EVIDENCE.
//
// The website sells a Qualified Meeting with seven conditions. A meeting now becomes one only
// when a person confirms all seven and links the prospect's own accepting reply; the client's
// 3-business-day challenge window is stamped from the booking.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Row = Record<string, unknown>
const state = vi.hoisted(() => ({ meeting: null as Row | null, reply: null as Row | null, updates: [] as Row[], cas: true }))

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      let pending: Row | null = null
      const q: any = {
        select: () => q, eq: () => q, is: () => q,
        update: (row: Row) => { pending = row; return q },
        maybeSingle: async () => ({ data: table === 'meetings' ? state.meeting : table === 'figsy_replies' ? state.reply : null, error: null }),
        then: (r: (v: unknown) => unknown) => {
          if (pending) { state.updates.push(pending); return Promise.resolve({ data: state.cas ? [{ id: 'm1' }] : [], error: null }).then(r) }
          return Promise.resolve({ data: null, error: null }).then(r)
        },
      }
      return q
    },
  },
}))

import { QUALIFIED_MEETING_CONDITIONS, allConditionsMet, addBusinessDays, CHALLENGE_BUSINESS_DAYS } from './meeting-qualification'
import { qualifyMeeting } from './meeting-truth'

const ALL = Object.fromEntries(QUALIFIED_MEETING_CONDITIONS.map(c => [c.key, true]))
beforeEach(() => {
  // Booked on a Thursday.
  state.meeting = { id: 'm1', client_id: 'c1', lead_id: 'l1', booked_at: '2026-09-24T10:00:00.000Z', qualified_at: null, excluded_reason: null, superseded_by: null }
  state.reply = { id: 'r1', client_id: 'c1', lead_id: 'l1', classification: 'hot' }
  state.updates = []; state.cas = true
})

describe('the seven conditions, R141\'s', () => {
  it('seven, in the Terms\' order', () => {
    expect(QUALIFIED_MEETING_CONDITIONS.map(c => c.key)).toEqual([
      'icp_fit', 'role_fit', 'agreed_to_meet', 'date_time_set', 'genuine_relevance', 'not_existing_customer', 'acceptance_evidenced',
    ])
    expect(allConditionsMet(ALL)).toBe(true)
    expect(allConditionsMet({ ...ALL, genuine_relevance: false })).toBe(false)
    expect(allConditionsMet({ ...ALL, acceptance_evidenced: 'yes' })).toBe(false)
  })

  it('3 business days skips the weekend', () => {
    expect(CHALLENGE_BUSINESS_DAYS).toBe(3)
    // Thursday + 3 business days = Tuesday.
    expect(addBusinessDays(new Date('2026-09-24T10:00:00.000Z'), 3).toISOString()).toBe('2026-09-29T10:00:00.000Z')
  })
})

describe('🛑 qualifying a meeting', () => {
  it('all seven + the prospect\'s own reply → qualified, with the challenge deadline stamped', async () => {
    const r = await qualifyMeeting('m1', { qualification: ALL, evidenceReplyId: 'r1', evidenceNote: 'Invite accepted' }, 'op@kind')
    expect(r).toMatchObject({ ok: true, challengeDeadlineAt: '2026-09-29T10:00:00.000Z' })
    expect(state.updates[0]).toMatchObject({ qualified_by: 'op@kind', evidence_reply_id: 'r1', evidence_note: 'Invite accepted', challenge_deadline_at: '2026-09-29T10:00:00.000Z' })
  })

  it('one condition short → refused, naming it, nothing written', async () => {
    const r = await qualifyMeeting('m1', { qualification: { ...ALL, not_existing_customer: false }, evidenceReplyId: 'r1' }, 'op')
    expect(r.ok).toBe(false)
    expect((r as { message: string }).message).toContain('Not an existing customer')
    expect(state.updates).toEqual([])
  })

  it('🛑 no evidence, our own outbound, or another person\'s reply is not evidence', async () => {
    expect((await qualifyMeeting('m1', { qualification: ALL, evidenceReplyId: null }, 'op')).ok).toBe(false)
    state.reply = { id: 'r1', client_id: 'c1', lead_id: 'l1', classification: 'sent_reply' }
    expect((await qualifyMeeting('m1', { qualification: ALL, evidenceReplyId: 'r1' }, 'op')).ok).toBe(false)
    state.reply = { id: 'r1', client_id: 'c1', lead_id: 'someone-else', classification: 'hot' }
    expect((await qualifyMeeting('m1', { qualification: ALL, evidenceReplyId: 'r1' }, 'op')).ok).toBe(false)
    state.reply = { id: 'r1', client_id: 'other-client', lead_id: 'l1', classification: 'hot' }
    expect((await qualifyMeeting('m1', { qualification: ALL, evidenceReplyId: 'r1' }, 'op')).ok).toBe(false)
    expect(state.updates).toEqual([])
  })

  it('once qualified it stands; an excluded or rescheduled meeting cannot be qualified', async () => {
    state.meeting = { ...state.meeting!, qualified_at: '2026-09-24T12:00:00Z' }
    expect(await qualifyMeeting('m1', { qualification: ALL, evidenceReplyId: 'r1' }, 'op')).toMatchObject({ ok: false, reason: 'already_qualified' })
    state.meeting = { ...state.meeting!, qualified_at: null, superseded_by: 'm2' }
    expect(await qualifyMeeting('m1', { qualification: ALL, evidenceReplyId: 'r1' }, 'op')).toMatchObject({ ok: false, reason: 'not_countable' })
  })

  it('two operators at once: the loser is told and nothing changes', async () => {
    state.cas = false
    expect(await qualifyMeeting('m1', { qualification: ALL, evidenceReplyId: 'r1' }, 'op')).toMatchObject({ ok: false, reason: 'already_qualified' })
  })
})

describe('the doors', () => {
  it('Vida lists meetings with replies to choose evidence from, and qualifying is audited', () => {
    const op = readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')
    expect(op).toContain("operatorRouter.get('/meetings'")
    const at = op.indexOf("operatorRouter.post('/meetings/:id/qualify'")
    expect(at).toBeGreaterThan(-1)
    expect(op.slice(at, at + 1400)).toContain("action: 'meeting_qualified'")
  })

  it('the Vida panel is mounted and posts to the qualify route', () => {
    const panel = readFileSync(join(__dirname, '../../../admin/src/components/vida/MeetingQualifyPanel.tsx'), 'utf8')
    const vida = readFileSync(join(__dirname, '../../../admin/src/app/vida/page.tsx'), 'utf8')
    expect(panel).toContain('/qualify`, {')
    expect(vida).toContain('<MeetingQualifyPanel clientId={selected} />')
  })
})
