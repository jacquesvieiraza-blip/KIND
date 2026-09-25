// 25 Sep (R141 · R166 · P5d, board #2351) — COACHING READS THE MEETING RECORD.
//
// It read `calendar_bookings`, the retired source: a meeting moved once was coached twice, and an
// excluded meeting was coached at all. It now reads `meetingsForClient` (the same rules as the
// Meetings tab), and "their own words" are never our own outbound email.
import { describe, it, expect, vi, beforeEach } from 'vitest'

type Row = Record<string, unknown>
const HOUR = 36e5
const soon = (h: number) => new Date(Date.now() + h * HOUR).toISOString()

const state = vi.hoisted(() => ({
  meetings: null as Row[] | null,
  bookingsTouched: false,
  replies: [] as Row[],
  scope: { mode: 'ids', ids: ['L1', 'L2'], programmeId: 'P' } as Record<string, unknown>,
  programmeAsked: null as string | null,
}))

function table(name: string) {
  if (name === 'calendar_bookings') state.bookingsTouched = true
  const f: ((r: Row) => boolean)[] = []
  const rows = () => (name === 'figsy_replies' ? state.replies
    : name === 'leads' ? [{ id: 'L1', first_name: 'Tom', last_name: 'Reeve' }, { id: 'L2', first_name: 'Priya', last_name: 'Shah' }]
    : name === 'clients' ? [{ id: 'C', user_id: 'u' }] : [])
  const q: any = {
    select() { return q },
    eq(c: string, v: unknown) { f.push(r => r[c] === v); return q },
    neq(c: string, v: unknown) { f.push(r => r[c] !== v); return q },
    in(c: string, l: unknown[]) { f.push(r => l.includes(r[c])); return q },
    gte() { return q }, order() { return q }, limit() { return q },
    async maybeSingle() { return { data: rows().filter(r => f.every(fn => fn(r)))[0] ?? null, error: null } },
    then(res: (v: unknown) => unknown) { return Promise.resolve({ data: rows().filter(r => f.every(fn => fn(r))), error: null }).then(res) },
  }
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => table(t) } }))
vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _r: unknown, next: () => void) => next() }))
vi.mock('../lib/alerts', () => ({ sendFounderAlert: () => Promise.resolve() }))
vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { create: async () => ({ content: [] }) } } }))
vi.mock('../lib/current-outreach', () => ({
  currentOutreachLeads: async () => state.scope,
  safeIn: (ids: string[]) => (ids.length ? ids : ['00000000-0000-0000-0000-000000000000']),
}))
vi.mock('../lib/meeting-truth', async (orig) => ({
  ...(await orig() as object),
  meetingsForClient: async (f: { programmeId?: string }) => { state.programmeAsked = f.programmeId ?? null; return state.meetings },
}))

async function call() {
  const m = await import('./leads')
  const layer = (m.leadRouter as unknown as { stack: any[] }).stack.find(l => l.route?.path === '/coaching' && l.route?.methods.get)
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  let payload: any = null; let status = 200
  const res: any = { json: (b: unknown) => { payload = b }, status: (s: number) => { status = s; return res } }
  await handler({ userId: 'u', query: {}, body: {}, params: {} }, res, () => {})
  return { payload, status }
}

beforeEach(() => {
  state.scope = { mode: 'ids', ids: ['L1', 'L2'], programmeId: 'P' }
  state.bookingsTouched = false; state.programmeAsked = null
  state.meetings = [
    { id: 'm-late', leadId: 'L2', scheduledAt: soon(48), state: 'BOOKED', rescheduled: true },
    { id: 'm-soon', leadId: 'L1', scheduledAt: soon(2), state: 'BOOKED_UNVERIFIED', rescheduled: false },
    { id: 'm-past', leadId: 'L1', scheduledAt: soon(-72), state: 'BOOKED', rescheduled: false },
    { id: 'm-held', leadId: 'L2', scheduledAt: soon(1), state: 'HELD', rescheduled: false },
  ]
  state.replies = [
    { client_id: 'C', lead_id: 'L1', classification: 'sent_reply', body_text: 'OUR OWN OUTBOUND' },
    { client_id: 'C', lead_id: 'L1', classification: 'hot', body_text: 'Go on then, Tuesday works.' },
  ]
})

describe('GET /leads/coaching', () => {
  it('🛑 reads the meeting record, never calendar_bookings; this programme only', async () => {
    const { payload } = await call()
    expect(state.bookingsTouched).toBe(false)
    expect(state.programmeAsked).toBe('P')
    expect(payload.success).toBe(true)
  })

  it('upcoming live meetings only, soonest first, with the meeting id', async () => {
    const ids = (await call()).payload.data.meetings.map((m: Row) => m.booking_id)
    expect(ids).toEqual(['m-soon', 'm-late'])   // past and HELD are not coached
  })

  it('🛑 "their own words" are the prospect\'s, never our outbound', async () => {
    const tom = (await call()).payload.data.meetings.find((m: Row) => m.lead_id === 'L1')
    expect(tom.their_words).toBe('Go on then, Tuesday works.')
  })

  it('a calibration workspace has none; an unreadable record is a 503, never an empty list', async () => {
    state.scope = { mode: 'none' }
    expect((await call()).payload).toEqual({ success: true, data: { meetings: [] } })
    state.scope = { mode: 'ids', ids: ['L1'], programmeId: 'P' }; state.meetings = null
    expect((await call()).status).toBe(503)
  })
})
