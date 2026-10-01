// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (Coaching #2495 follow-up drafts · #2502 follow-up coach · R180 · R184) — THE ROUTE.
//
// 🛑 What this holds: the ladder (Founders refused · Growth a draft only · Full Coaching the draft
// plus coaching), only after a meeting that went somewhere, only on THIS client's meeting, the
// prompt grounded in the client's own note and sales context (a result only with permission),
// R87's figure check, and the kept draft read back without a second model call. The ladder is
// read through the REAL `coachingAccessFor` against mocked `programmes` rows, so a change to who
// gets what fails here too.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'

type Row = Record<string, any>

const state = vi.hoisted(() => ({
  band: 'growth' as string,
  activated: false,
  meetings: [] as Row[],
  outcomes: [] as Row[],
  pitch: {} as Row,
  inserts: [] as Row[],
  calls: [] as Array<{ body: Row; opts: Row | undefined }>,
  reply: '',
}))

const get = (r: Row, c: string) => (c.startsWith('payload->>') ? r.payload?.[c.slice(10)] : r[c])

function table(name: string) {
  const rows = (): Row[] => name === 'clients' ? [{ id: 'C', user_id: 'u', company_name: 'Northwind Field Software' }]
    : name === 'programmes' ? [{ id: 'P', client_id: 'C', size_band: state.band, status: 'ACTIVE', created_at: '2026-09-01' }]
    : name === 'coaching_activations' ? (state.activated ? [{ id: 'a1', programme_id: 'P' }] : [])
    : name === 'leads' ? [
      { id: 'L1', client_id: 'C', first_name: 'Hannah', last_name: 'Cole', job_title: 'Head of Operations', company: 'Brightwell Facilities', email: 'h@x.invalid' },
    ]
    : name === 'figsy_replies' ? [
      { client_id: 'C', lead_id: 'L1', classification: 'sent_reply', body_text: 'OUR OWN OUTBOUND', received_at: '2026-09-21' },
      { client_id: 'C', lead_id: 'L1', classification: 'hot', body_text: 'Scheduling is our headache — Tuesday works.', received_at: '2026-09-20' },
    ]
    : name === 'figsy_knowledge' ? [{ client_id: 'C', kind: 'pitch', data: state.pitch }]
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
    // ⚑ 1 Oct — `.is(col, null)`: F3's coachingActivated() skips switched-off (deactivated) rows.
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
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: async (body: Row, opts?: Row) => { state.calls.push({ body, opts }); return { content: [{ type: 'text', text: state.reply }] } },
    }
  },
}))
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
const outcome = (meetingId: string, answer: string, note: string | null = 'Wants a pilot proposal for two depots by Friday', at = '2026-09-30T12:00:00Z') =>
  ({ client_id: 'C', event_type: 'meeting_outcome', payload: { meeting_id: meetingId, answer, note }, occurred_at: at })

const COACH_JSON = JSON.stringify({
  subject: 'Pilot proposal for your two depots',
  body: 'Hi Hannah,\n\nThanks for today. As agreed, I will send the pilot proposal for two depots by Friday.\n\n[Your name]',
  confirm: 'Which two depots are in the pilot.', next_step: 'Propose a 20-minute review call early next week.', risk: 'Scheduling change fatigue in the depot teams.',
})

async function handler(method: 'get' | 'post', path: string) {
  const m = await import('./leads')
  const layer = (m.leadRouter as unknown as { stack: any[] }).stack.find(l => l.route?.path === path && l.route?.methods[method])
  return layer.route.stack[layer.route.stack.length - 1].handle
}
async function post(id: string, body: Row = {}) {
  const h = await handler('post', '/meetings/:id/follow-up')
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

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'test-key'
  state.band = 'growth'; state.activated = false
  state.meetings = [
    { id: 'm-1', clientId: 'C', programmeId: 'P', leadId: 'L1', scheduledAt: PAST, state: 'HELD', rescheduled: false },
    { id: 'm-2', clientId: 'C', programmeId: 'P', leadId: 'L1', scheduledAt: PAST, state: 'HELD', rescheduled: false },
    { id: 'm-other', clientId: 'C2', programmeId: 'P', leadId: 'L9', scheduledAt: PAST, state: 'HELD', rescheduled: false },
  ]
  state.outcomes = [outcome('m-1', 'next_step'), outcome('m-other', 'next_step')]
  state.pitch = {
    offer: { problems: 'Missed job slots', solution: 'Field scheduling software', roi: 'Saved one client $40,000 a year', roi_may_quote: false },
    sales_context: { objections: 'Too busy to switch — we migrate in a week', decider: 'The operations director' },
  }
  state.inserts = []; state.calls = []
  state.reply = COACH_JSON
})

describe('🛑 the ladder (R180)', () => {
  it('Founders are refused with the plain line, and no model is called', async () => {
    state.band = 'founders'
    const r = await post('m-1')
    expect(r.status).toBe(403)
    expect(r.payload.error).toBe('Follow-up drafts come with Growth or Full Coaching.')
    expect(state.calls).toEqual([])
  })

  it('Growth gets the DRAFT only — coaching lines are dropped even if the model wrote them', async () => {
    const r = await post('m-1')
    expect(r.status).toBe(200)
    expect(r.payload.data).toMatchObject({ level: 'draft', subject: 'Pilot proposal for your two depots', coaching: null })
    expect(state.calls[0].body.messages[0].content).not.toContain('"confirm"')
    expect(state.inserts[0].payload.coaching).toBeUndefined()
  })

  it('Full Coaching (Growth + activated) gets the draft PLUS confirm · next step · risk', async () => {
    state.activated = true
    const r = await post('m-1')
    expect(r.payload.data.level).toBe('coach')
    expect(r.payload.data.coaching).toEqual({
      confirm: 'Which two depots are in the pilot.', nextStep: 'Propose a 20-minute review call early next week.', risk: 'Scheduling change fatigue in the depot teams.',
    })
    expect(state.inserts[0]).toMatchObject({ client_id: 'C', event_type: 'follow_up_draft', payload: { meeting_id: 'm-1', coaching: { risk: 'Scheduling change fatigue in the depot teams.' } } })
  })

  it('Enterprise has the whole product without activating', async () => {
    state.band = 'enterprise'
    expect((await post('m-1')).payload.data.level).toBe('coach')
  })
})

describe('🛑 only a meeting that went somewhere, only this client\'s', () => {
  for (const answer of ['not_fit', 'no_show']) {
    it(`"${answer}" gets no draft (409) and no model call`, async () => {
      state.outcomes = [outcome('m-1', answer)]
      expect((await post('m-1')).status).toBe(409)
      expect(state.calls).toEqual([])
    })
  }

  it('an unanswered meeting gets no draft', async () => {
    expect((await post('m-2')).status).toBe(409)
  })

  it('"interested, not now" earns a draft', async () => {
    state.outcomes = [outcome('m-1', 'not_now')]
    expect((await post('m-1')).status).toBe(200)
    expect(state.calls[0].body.messages[0].content).toContain('interested, but the timing is later')
  })

  it('another client\'s meeting is a 404 — nothing read, nothing written', async () => {
    const r = await post('m-other')
    expect(r.status).toBe(404)
    expect(state.calls).toEqual([])
    expect(state.inserts).toEqual([])
  })
})

describe('🛑 grounded in what the client told us — never a result without permission (R87)', () => {
  it('the prompt carries the prospect, their own words, the client\'s note and sales context', async () => {
    await post('m-1')
    const p: string = state.calls[0].body.messages[0].content
    expect(p).toContain('Hannah Cole — Head of Operations at Brightwell Facilities')
    expect(p).toContain('Scheduling is our headache — Tuesday works.')
    expect(p).not.toContain('OUR OWN OUTBOUND')
    expect(p).toContain('Wants a pilot proposal for two depots by Friday')
    expect(p).toContain('Too busy to switch — we migrate in a week')
    expect(p).toContain('Who usually decides: The operations director')
  })

  it('🛑 a result the client did NOT allow is never in the prompt; once allowed, it is', async () => {
    await post('m-1')
    expect(state.calls[0].body.messages[0].content).not.toContain('$40,000')
    state.pitch.offer.roi_may_quote = true
    await post('m-1', { again: true })
    expect(state.calls[1].body.messages[0].content).toContain('A result the seller may mention: Saved one client $40,000 a year')
  })

  it('🛑 a draft quoting a figure nobody gave is refused, and not kept', async () => {
    state.reply = JSON.stringify({ subject: 'Next steps', body: 'Clients like you save 30% and $25,000 in year one.\n\n[Your name]' })
    const r = await post('m-1')
    expect(r.status).toBe(502)
    expect(state.inserts).toEqual([])
  })

  it('the model call is the background model, bounded for a waiting browser', async () => {
    await post('m-1')
    expect(state.calls[0].body.model).toBe('claude-haiku-4-5-20251001')
    expect(state.calls[0].opts).toEqual({ timeout: 30_000, maxRetries: 0 })
  })
})

describe('the latest draft is kept and read back', () => {
  it('a second press returns the kept draft without a new model call; "again" writes a new one', async () => {
    await post('m-1')
    expect(state.calls).toHaveLength(1)
    const again = await post('m-1')
    expect(again.payload.data.subject).toBe('Pilot proposal for your two depots')
    expect(state.calls).toHaveLength(1)
    state.reply = JSON.stringify({ subject: 'Second go', body: 'Hi Hannah, thanks again.\n\n[Your name]' })
    expect((await post('m-1', { again: true })).payload.data.subject).toBe('Second go')
    expect(state.calls).toHaveLength(2)
  })

  it('GET /leads/meetings shows the latest draft on the card, and nothing on a meeting that does not qualify', async () => {
    state.outcomes.push(
      { client_id: 'C', event_type: 'follow_up_draft', payload: { meeting_id: 'm-1', subject: 'Old', body: 'old body' }, occurred_at: '2026-09-30T13:00:00Z' },
      { client_id: 'C', event_type: 'follow_up_draft', payload: { meeting_id: 'm-1', subject: 'Newest', body: 'new body' }, occurred_at: '2026-09-30T14:00:00Z' },
    )
    const rows = await list()
    expect(rows.find(m => m.id === 'm-1')!.followUp).toMatchObject({ level: 'draft', draft: { subject: 'Newest', body: 'new body', coaching: null } })
    expect(rows.find(m => m.id === 'm-2')!.followUp).toBeNull()
    expect(rows.find(m => m.id === 'm-other')).toBeUndefined()
  })

  it('GET /leads/meetings tells a Founders card the quiet line, with no draft', async () => {
    state.band = 'founders'
    expect((await list()).find(m => m.id === 'm-1')!.followUp).toEqual({ level: 'none', draft: null })
  })
})
