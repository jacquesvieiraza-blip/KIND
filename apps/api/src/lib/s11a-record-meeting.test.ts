// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 2 Oct (R189 ⑤ · card #2556 · sending fix #11a) — VIDA CAN RECORD A MEETING AGREED BY EMAIL.
//
// R189 ⑤: *"Vida gets a 'Record meeting' control for a time agreed by email."* Until now nothing
// in Vida could turn "yes, Tuesday at 10 works" into a meeting — the only writer was a route
// called from the retired /dashboard page — so meetings booked stayed at 0 for House and for
// every client, and "How did it go?", the 25/50/75% moments, coaching and settlement all read 0.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Row = Record<string, unknown>
const state = {
  replies: [] as Row[],
  replyUpdates: [] as Row[],
  bookings: [] as Row[],
  bookingRefusal: null as null | { reason: string; message: string },
  outcomes: [] as Row[],
  recomputed: [] as string[],
}

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const filters: [string, unknown][] = []
      let patch: Row | null = null
      const q: Record<string, unknown> = {
        select() { return q },
        eq(c: string, v: unknown) { filters.push([c, v]); return q },
        is() { return q },
        update(p: Row) { patch = p; return q },
        async maybeSingle() {
          const rows = table === 'figsy_replies' ? state.replies : []
          return { data: rows.find(r => filters.every(([c, v]) => r[c] === v)) ?? null, error: null }
        },
        then(res: (v: unknown) => unknown) {
          if (patch && table === 'figsy_replies') state.replyUpdates.push({ ...patch, where: Object.fromEntries(filters) })
          return res({ data: null, error: null })
        },
      }
      return q
    },
  },
}))
vi.mock('./meeting-truth', () => ({
  resolveBookingAttribution: async () => ({ enrollmentId: 'enr-1', campaignId: 'camp-1', programmeId: 'prog-1' }),
  recordBooking: async (p: Row) => {
    if (state.bookingRefusal) return { ok: false, refused: state.bookingRefusal }
    state.bookings.push(p)
    return { ok: true, meeting: { id: 'meet-1', state: 'BOOKED_UNVERIFIED', scheduled_at: p.scheduledAt } }
  },
}))
vi.mock('./outcomes', () => ({ logOutcomeEvent: async (e: Row) => { state.outcomes.push(e) } }))
vi.mock('./figsy', () => ({ recomputeCampaignCounters: async (id: string) => { state.recomputed.push(id) } }))
vi.mock('../routes/signals', () => ({ emitSignal: async () => {} }))

const AGREED = '2026-10-06T09:00:00.000Z'
const record = async (over: Partial<{ clientId: string; replyId: string; scheduledAt: string }> = {}) =>
  (await import('./record-meeting')).recordMeetingFromReply({ clientId: 'client-A', replyId: 'reply-1', scheduledAt: AGREED, ...over })

beforeEach(() => {
  state.replies = [{ id: 'reply-1', client_id: 'client-A', lead_id: 'lead-1', campaign_id: 'camp-1', meeting_booked_at: null }]
  state.replyUpdates = []; state.bookings = []; state.bookingRefusal = null; state.outcomes = []; state.recomputed = []
})

describe('R189 ⑤ — "Record meeting" for a time agreed by email', () => {
  it('🛑 records the meeting at the AGREED time, against the reply\'s prospect, inside its programme', async () => {
    const r = await record()
    expect(r).toMatchObject({ ok: true, meetingId: 'meet-1', scheduledAt: AGREED })
    expect(state.bookings).toEqual([expect.objectContaining({
      clientId: 'client-A', leadId: 'lead-1', scheduledAt: AGREED,
      campaignId: 'camp-1', enrollmentId: 'enr-1', programmeId: 'prog-1',
    })])
  })

  it('🛑 it is never claimed to be on a calendar — no calendar event id is passed, so it is "booked, not yet on a calendar"', async () => {
    await record()
    expect(state.bookings[0]).not.toHaveProperty('googleEventId')
  })

  it('🛑 the reply is marked booked and the outcome logged — only once the meeting exists', async () => {
    await record()
    expect(state.replyUpdates[0]).toMatchObject({ where: { id: 'reply-1', client_id: 'client-A' } })
    expect(state.replyUpdates[0].meeting_booked_at).toBeTruthy()
    expect(state.outcomes).toEqual([expect.objectContaining({ client_id: 'client-A', event_type: 'meeting_booked' })])
    expect(state.recomputed).toEqual(['camp-1'])
  })

  it('🛑 a time that cannot be read is refused and nothing is recorded', async () => {
    const r = await record({ scheduledAt: 'next tuesday-ish' })
    expect(r).toMatchObject({ ok: false, status: 400 })
    expect(state.bookings).toHaveLength(0)
  })

  it('🛑 another client\'s reply is out of reach', async () => {
    const r = await record({ clientId: 'client-B' })
    expect(r).toMatchObject({ ok: false, status: 404 })
    expect(state.bookings).toHaveLength(0)
  })

  it('🛑 a reply with no prospect behind it is refused in plain words', async () => {
    state.replies[0].lead_id = null
    const r = await record()
    expect(r).toMatchObject({ ok: false, status: 422 })
    expect(state.bookings).toHaveLength(0)
  })

  it('🛑 a second meeting for the same prospect is refused — and nothing is stamped or logged', async () => {
    state.bookingRefusal = { reason: 'already_booked', message: 'This lead already has a live booking.' }
    const r = await record()
    expect(r).toMatchObject({ ok: false, status: 409 })
    expect(state.replyUpdates).toHaveLength(0)
    expect(state.outcomes).toHaveLength(0)
  })
})

describe('the control is wired: Vida → operator route → the one recorder', () => {
  const operator = readFileSync(join(__dirname, '..', 'routes', 'operator.ts'), 'utf8')
  const route = operator.slice(operator.indexOf("operatorRouter.post('/replies/:id/record-meeting'"))
  const vida = readFileSync(join(__dirname, '..', '..', '..', 'admin', 'src', 'app', 'vida', 'page.tsx'), 'utf8')

  it('the operator route exists, is scoped to the client, records through recordMeetingFromReply and is audited', () => {
    expect(operator).toContain("operatorRouter.post('/replies/:id/record-meeting'")
    expect(route.slice(0, 1500)).toContain('requireClient(')
    expect(route.slice(0, 1500)).toContain('recordMeetingFromReply(')
    expect(route.slice(0, 1500)).toContain("action: 'record_meeting'")
  })

  it('Vida\'s open reply has a "Record meeting" control that sends the agreed time', () => {
    expect(vida).toContain('/record-meeting`')
    expect(vida).toContain('scheduled_at')
    expect(vida).toContain('Record meeting')
  })
})
