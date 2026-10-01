// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (Coaching #2501 Meeting Debrief · Phase 1 · R180) — THE ROUTE AND THE MEETINGS LIST.
//
// 🛑 What this holds: the debrief is Full Coaching only (Enterprise, or Founders/Growth with Full
// Coaching on) — every other plan is refused and the Meetings list sends it nothing to show; only
// after the client's own "How did it go?" said the meeting happened; only on THIS client's
// meeting; and the saved debrief comes back on the list. The ladder is read through the REAL
// `coachingAccessFor` against mocked `programmes` rows, so a change to who gets what fails here too.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'

type Row = Record<string, any>

const state = vi.hoisted(() => ({
  band: 'enterprise' as string,
  activated: false,
  meetings: [] as Row[],
  outcomes: [] as Row[],
  inserts: [] as Row[],
}))

const get = (r: Row, c: string) => (c.startsWith('payload->>') ? r.payload?.[c.slice(10)] : r[c])

function table(name: string) {
  const rows = (): Row[] => name === 'clients' ? [{ id: 'C', user_id: 'u', company_name: 'Northwind Field Software' }]
    : name === 'programmes' ? [{ id: 'P', client_id: 'C', size_band: state.band, status: 'ACTIVE', created_at: '2026-09-01' }]
    : name === 'coaching_activations' ? (state.activated ? [{ id: 'a1', programme_id: 'P' }] : [])
    : name === 'leads' ? [{ id: 'L1', client_id: 'C', first_name: 'Hannah', last_name: 'Cole', company: 'Brightwell Facilities', email: 'h@x.invalid' }]
    : name === 'outcome_events' ? state.outcomes : []
  const f: ((r: Row) => boolean)[] = []
  let sort: { c: string; asc: boolean } | null = null
  const result = () => {
    const out = rows().filter(r => f.every(fn => fn(r)))
    if (sort) { const { c, asc } = sort; out.sort((a, b) => (String(a[c]) < String(b[c]) ? -1 : 1) * (asc ? 1 : -1)) }
    return out
  }
  const q: any = {
    select() { return q },
    eq(c: string, v: unknown) { f.push(r => get(r, c) === v); return q },
    neq(c: string, v: unknown) { f.push(r => get(r, c) !== v); return q },
    is(c: string, v: unknown) { f.push(r => (get(r, c) ?? null) === v); return q },
    in(c: string, l: unknown[]) { f.push(r => l.includes(get(r, c))); return q },
    order(c: string, o?: { ascending?: boolean }) { sort = { c, asc: o?.ascending !== false }; return q },
    limit() { return q },
    insert(row: Row) { state.inserts.push(row); if (name === 'outcome_events') state.outcomes.push(row); return Promise.resolve({ error: null }) },
    async maybeSingle() { return { data: result()[0] ?? null, error: null } },
    then(res: (v: unknown) => unknown) { return Promise.resolve({ data: result(), error: null }).then(res) },
  }
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => table(t) } }))
vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _r: unknown, next: () => void) => next() }))
vi.mock('../lib/alerts', () => ({ sendFounderAlert: () => Promise.resolve() }))
vi.mock('../lib/current-outreach', () => ({
  currentOutreachLeads: async () => ({ mode: 'ids', ids: ['L1'], programmeId: 'P' }),
  safeIn: (ids: string[]) => (ids.length ? ids : ['00000000-0000-0000-0000-000000000000']),
}))
vi.mock('../lib/meeting-truth', async (orig) => ({
  ...(await orig() as object),
  // Another client's meeting sits in the same store: the scope is what keeps it out.
  meetingsForClient: async (f: { clientId: string; programmeId?: string }) =>
    state.meetings.filter(m => m.clientId === f.clientId && m.programmeId === f.programmeId),
}))

const PAST = '2026-09-30T10:00:00Z'
const outcome = (meetingId: string, answer: string, at = '2026-09-30T12:00:00Z') =>
  ({ client_id: 'C', event_type: 'meeting_outcome', payload: { meeting_id: meetingId, answer, note: null }, occurred_at: at })
const BODY = { who: 'Hannah and her finance lead', objections: 'Worried about the cost of switching', agreed: 'Pilot proposal by Friday' }

async function handler(method: 'get' | 'post', path: string) {
  const m = await import('./leads')
  const layer = (m.leadRouter as unknown as { stack: any[] }).stack.find(l => l.route?.path === path && l.route?.methods[method])
  return layer.route.stack[layer.route.stack.length - 1].handle
}
async function post(id: string, body: Row = BODY) {
  const h = await handler('post', '/meetings/:id/debrief')
  let payload: any = null; let status = 200
  const res: any = { json: (b: unknown) => { payload = b }, status: (s: number) => { status = s; return res } }
  await h({ userId: 'u', authEmail: 'hannah@northwind.test', query: {}, body, params: { id } }, res, () => {})
  return { payload, status }
}
async function list() {
  const h = await handler('get', '/meetings')
  let payload: any = null
  const res: any = { json: (b: unknown) => { payload = b }, status: () => res }
  await h({ userId: 'u', query: {}, body: {}, params: {} }, res, () => {})
  return payload.data as Row[]
}
const debriefs = () => state.inserts.filter(r => r.event_type === 'meeting_debrief')

beforeEach(() => {
  state.band = 'enterprise'; state.activated = false
  state.meetings = [
    { id: 'm-1', clientId: 'C', programmeId: 'P', leadId: 'L1', scheduledAt: PAST, state: 'HELD', rescheduled: false },
    { id: 'm-2', clientId: 'C', programmeId: 'P', leadId: 'L1', scheduledAt: PAST, state: 'HELD', rescheduled: false },
    { id: 'm-3', clientId: 'C', programmeId: 'P', leadId: 'L1', scheduledAt: PAST, state: 'BOOKED', rescheduled: false },
    { id: 'm-other', clientId: 'C2', programmeId: 'P', leadId: 'L9', scheduledAt: PAST, state: 'HELD', rescheduled: false },
  ]
  state.outcomes = [outcome('m-1', 'not_fit'), outcome('m-3', 'no_show'), outcome('m-other', 'next_step')]
  state.inserts = []
})

describe('🛑 the ladder (R180) — Full Coaching only', () => {
  it('Founders and Growth without Full Coaching are refused with the plain line, and nothing is written', async () => {
    for (const band of ['founders', 'growth']) {
      state.band = band
      const r = await post('m-1')
      expect(r.status).toBe(403)
      expect(r.payload.error).toBe('Meeting debriefs come with Full Coaching.')
    }
    expect(debriefs()).toEqual([])
  })

  it('…and their Meetings list carries no debrief at all — no form, no upsell line', async () => {
    for (const band of ['founders', 'growth']) {
      state.band = band
      expect((await list()).every(m => m.debrief === null)).toBe(true)
    }
  })

  it('Enterprise has it; Growth or Founders with Full Coaching on have it', async () => {
    expect((await post('m-1')).status).toBe(200)
    state.band = 'founders'; state.activated = true
    expect((await post('m-1')).status).toBe(200)
    expect(debriefs()).toHaveLength(2)
  })
})

describe('only after a meeting that happened, only on this client\'s meeting', () => {
  it('saved append-only as `meeting_debrief`, and returned on the Meetings list', async () => {
    const r = await post('m-1')
    expect(r.payload.data).toMatchObject({ ...BODY, cared: '', differently: '' })
    expect(debriefs()[0]).toMatchObject({ client_id: 'C', event_type: 'meeting_debrief', payload: { meeting_id: 'm-1', programme_id: 'P', by: 'hannah@northwind.test' } })
    const m1 = (await list()).find(m => m.id === 'm-1')!
    expect(m1.debrief.saved).toMatchObject(BODY)
  })

  it('a meeting with no "How did it go?" answer, or a "didn\'t show", is refused — and offered no debrief', async () => {
    expect((await post('m-2')).status).toBe(409)
    expect((await post('m-3')).status).toBe(409)
    expect(debriefs()).toEqual([])
    const rows = await list()
    expect(rows.find(m => m.id === 'm-1')!.debrief).toEqual({ saved: null })
    expect(rows.find(m => m.id === 'm-2')!.debrief).toBeNull()
    expect(rows.find(m => m.id === 'm-3')!.debrief).toBeNull()
  })

  it('another client\'s meeting is "no such meeting"', async () => {
    expect((await post('m-other')).status).toBe(404)
    expect(debriefs()).toEqual([])
  })

  it('an empty debrief is refused', async () => {
    const r = await post('m-1', { who: '  ' })
    expect(r.status).toBe(400)
    expect(r.payload.error).toBe('Answer at least one question.')
  })
})
