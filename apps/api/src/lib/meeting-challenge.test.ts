// ═══════════════════════════════════════════════════════════════════════════════════════
// 25 Sep (R141 · R166 · P5b, board #2351) — THE CLIENT MAY CHALLENGE A MEETING, IN MILLA.
//
// Terms: within 3 business days of booking, naming which of the seven conditions was not met.
// A person in Vida upholds or rejects it with a reason the client reads.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Row = Record<string, unknown>
const state = vi.hoisted(() => ({ meeting: null as Row | null, updates: [] as Row[], filters: [] as string[], cas: true }))

vi.mock('@kind/db', () => ({
  db: {
    from: () => {
      let pending: Row | null = null
      const q: any = {
        select: () => q,
        eq: (c: string, v: unknown) => { if (pending) state.filters.push(`eq:${c}=${v}`); return q },
        is: (c: string) => { if (pending) state.filters.push(`is:${c}`); return q },
        not: (c: string) => { if (pending) state.filters.push(`not:${c}`); return q },
        update: (row: Row) => { pending = row; return q },
        maybeSingle: async () => ({ data: state.meeting, error: null }),
        then: (r: (v: unknown) => unknown) => {
          if (pending) { state.updates.push(pending); return Promise.resolve({ data: state.cas ? [{ id: 'm1' }] : [], error: null }).then(r) }
          return Promise.resolve({ data: null, error: null }).then(r)
        },
      }
      return q
    },
  },
}))

import { challengeWindowOpen, challengeDeadline, QUALIFIED_MEETING_CONDITIONS } from './meeting-qualification'
import { challengeMeeting, resolveMeetingChallenge } from './meeting-truth'

// Booked Thursday 24 Sep 10:00 UTC → window closes Tuesday 29 Sep 10:00 UTC.
const BOOKED = '2026-09-24T10:00:00.000Z'
const inTime = new Date('2026-09-28T09:00:00.000Z')
const late = new Date('2026-09-29T10:00:01.000Z')

beforeEach(() => {
  state.meeting = { id: 'm1', client_id: 'c1', booked_at: BOOKED, excluded_reason: null, superseded_by: null, challenged_at: null, challenge_outcome: null }
  state.updates = []; state.filters = []; state.cas = true
})

describe('the window is the Terms\' — 3 business days from booking', () => {
  it('closes on the third business day after booking, weekend skipped', () => {
    expect(challengeDeadline(BOOKED).toISOString()).toBe('2026-09-29T10:00:00.000Z')
    expect(challengeWindowOpen(BOOKED, inTime)).toBe(true)
    expect(challengeWindowOpen(BOOKED, late)).toBe(false)
  })

  it('every condition carries the website Pricing page\'s own sentence for the client', () => {
    const pricing = readFileSync(join(__dirname, '../../../website/pricing.html'), 'utf8').replace(/&rsquo;|’/g, '’')
    for (const c of QUALIFIED_MEETING_CONDITIONS) expect(pricing).toContain(c.clientLabel)
  })
})

describe('🛑 the client raises a challenge', () => {
  it('in time, naming a condition → recorded against their own meeting only', async () => {
    const r = await challengeMeeting('m1', 'c1', { condition: 'role_fit', note: 'Intern, not a buyer' }, inTime)
    expect(r).toMatchObject({ ok: true, challengedAt: inTime.toISOString() })
    expect(state.updates[0]).toMatchObject({ challenge_condition: 'role_fit', challenge_note: 'Intern, not a buyer', challenged_at: inTime.toISOString() })
    // Compare-and-set: this client's meeting, not yet challenged.
    expect(state.filters).toEqual(expect.arrayContaining(['eq:client_id=c1', 'is:challenged_at']))
  })

  it('🛑 another client\'s meeting reads as not found, and nothing is written', async () => {
    const r = await challengeMeeting('m1', 'c2', { condition: 'role_fit' }, inTime)
    expect(r).toMatchObject({ ok: false, reason: 'not_found' })
    expect(state.updates).toEqual([])
  })

  it('🛑 out of time, no condition, a made-up condition, or a second challenge → refused', async () => {
    expect(await challengeMeeting('m1', 'c1', { condition: 'role_fit' }, late)).toMatchObject({ ok: false, reason: 'out_of_time' })
    expect(await challengeMeeting('m1', 'c1', { condition: '' }, inTime)).toMatchObject({ ok: false, reason: 'condition_required' })
    expect(await challengeMeeting('m1', 'c1', { condition: 'the_call_went_badly' }, inTime)).toMatchObject({ ok: false, reason: 'condition_required' })
    state.meeting = { ...state.meeting!, challenged_at: '2026-09-25T09:00:00Z' }
    expect(await challengeMeeting('m1', 'c1', { condition: 'role_fit' }, inTime)).toMatchObject({ ok: false, reason: 'already_challenged' })
    expect(state.updates).toEqual([])
  })

  it('a rescheduled or excluded meeting cannot be challenged; a lost race is told', async () => {
    state.meeting = { ...state.meeting!, superseded_by: 'm2' }
    expect(await challengeMeeting('m1', 'c1', { condition: 'role_fit' }, inTime)).toMatchObject({ ok: false, reason: 'not_countable' })
    state.meeting = { ...state.meeting!, superseded_by: null }; state.cas = false
    expect(await challengeMeeting('m1', 'c1', { condition: 'role_fit' }, inTime)).toMatchObject({ ok: false, reason: 'already_challenged' })
  })
})

describe('🛑 a person resolves it in Vida', () => {
  beforeEach(() => { state.meeting = { ...state.meeting!, challenged_at: '2026-09-25T09:00:00Z' } })

  it('upheld or rejected, with a reason the client reads', async () => {
    const r = await resolveMeetingChallenge('m1', { outcome: 'upheld', note: 'Agreed — the contact is an intern.' }, 'op@kind')
    expect(r).toMatchObject({ ok: true, outcome: 'upheld' })
    expect(state.updates[0]).toMatchObject({ challenge_outcome: 'upheld', challenge_resolved_by: 'op@kind', challenge_resolution_note: 'Agreed — the contact is an intern.' })
    expect(state.filters).toEqual(expect.arrayContaining(['is:challenge_outcome']))
  })

  it('no reason, a third outcome, an unchallenged or already-resolved meeting → refused', async () => {
    expect((await resolveMeetingChallenge('m1', { outcome: 'upheld', note: 'ok' }, 'op')).ok).toBe(false)
    expect((await resolveMeetingChallenge('m1', { outcome: 'partly', note: 'a long enough reason' }, 'op')).ok).toBe(false)
    state.meeting = { ...state.meeting!, challenge_outcome: 'rejected' }
    expect(await resolveMeetingChallenge('m1', { outcome: 'upheld', note: 'a long enough reason' }, 'op')).toMatchObject({ ok: false, reason: 'already_resolved' })
    state.meeting = { ...state.meeting!, challenged_at: null, challenge_outcome: null }
    expect(await resolveMeetingChallenge('m1', { outcome: 'upheld', note: 'a long enough reason' }, 'op')).toMatchObject({ ok: false, reason: 'not_challenged' })
    expect(state.updates).toEqual([])
  })
})

describe('the doors', () => {
  const my = readFileSync(join(__dirname, '../routes/my-programme.ts'), 'utf8')
  const op = readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')

  it('Milla: the client\'s meetings and the challenge, tenancy from the session', () => {
    expect(my).toContain("myProgrammeRouter.get('/meetings'")
    const at = my.indexOf("myProgrammeRouter.post('/meetings/challenge'")
    expect(at).toBeGreaterThan(-1)
    expect(my.slice(at, at + 600)).toContain("challengeMeeting(String(req.body?.meetingId ?? ''), clientId")
    // Operator-only facts never leave for the client.
    const get = my.slice(my.indexOf("myProgrammeRouter.get('/meetings'"), at)
    expect(get).not.toMatch(/qualified_by|evidence_reply_id|evidence_note|challenge_resolved_by/)
  })

  it('Vida: resolving is audited', () => {
    const at = op.indexOf("operatorRouter.post('/meetings/:id/resolve-challenge'")
    expect(at).toBeGreaterThan(-1)
    expect(op.slice(at, at + 1200)).toContain("action: 'meeting_challenge_resolved'")
  })

  it('the Milla card is mounted on the programme screen, and Vida shows Uphold / Reject', () => {
    const page = readFileSync(join(__dirname, '../../../portal/src/app/(milla)/milla/programme/page.tsx'), 'utf8')
    expect(page).toContain('<MeetingChallenges />')
    const tab = readFileSync(join(__dirname, '../../../portal/src/app/(milla)/milla/meetings/page.tsx'), 'utf8')
    expect(tab).toContain('<MeetingChallenges />')
    const card = readFileSync(join(__dirname, '../../../portal/src/components/milla/MeetingChallenges.tsx'), 'utf8')
    expect(card).toContain("'/my/programme/meetings/challenge', { meetingId: m.id, condition, note }")
    const panel = readFileSync(join(__dirname, '../../../admin/src/components/vida/MeetingQualifyPanel.tsx'), 'utf8')
    expect(panel).toContain('/resolve-challenge`, {')
  })
})
