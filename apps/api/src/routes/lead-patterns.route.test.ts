import { describe, it, expect, vi, beforeEach } from 'vitest'

// GET /leads/patterns + POST /leads/patterns/request-more, through the real handlers.
//
// The arithmetic is unit-tested in `lib/lead-patterns.test.ts` and was never the risky part.
// What only a route test can pin is what the route FEEDS it and what it does with the answer:
//
//   ① A FAILED READ MUST NOT BECOME A PATTERN. The winner population is assembled from three
//      separate queries. If the replies query fails and the route carries on, the client is
//      shown a shape computed from a partial picture — with full confidence, and no way to
//      tell. That is #349's swallow with a statistician's face on it.
//   ② "FIND ME MORE" MUST NOT SPEND. Sourcing runs against our PDL budget behind a monthly
//      fence, and the model is managed. A client button that quietly spends our money is the
//      wrong shape whatever the label says.

type Row = Record<string, unknown>

const state = {
  clientId: 'client-1' as string | null,
  leads: [] as Row[],
  leadsError: null as { message: string } | null,
  sent: [] as Row[],
  sentError: null as { message: string } | null,
  replies: [] as Row[],
  repliesError: null as { message: string } | null,
  bookings: [] as Row[],
  inserts: [] as { table: string; row: Row }[],
  insertError: null as { message: string } | null,
}

function query(table: string) {
  const q: Record<string, unknown> = {
    select() { return q },
    eq() { return q }, in() { return q }, is() { return q }, not() { return q },
    gte() { return q }, lt() { return q }, order() { return q }, limit() { return q },
    async maybeSingle() {
      // getClientId reads `clients`.
      if (table === 'clients') return { data: state.clientId ? { id: state.clientId } : null, error: null }
      return { data: null, error: null }
    },
    async range() {
      if (table === 'leads') return { data: state.leadsError ? null : state.leads, error: state.leadsError }
      return { data: [], error: null }
    },
    insert(row: Row) {
      state.inserts.push({ table, row })
      return { then: (r: (v: unknown) => unknown) => r({ error: state.insertError }) }
    },
    then(resolve: (v: { data: Row[] | null; error: unknown }) => unknown) {
      if (table === 'figsy_sent_emails') return resolve({ data: state.sentError ? null : state.sent, error: state.sentError })
      if (table === 'figsy_replies') return resolve({ data: state.repliesError ? null : state.replies, error: state.repliesError })
      if (table === 'calendar_bookings') return resolve({ data: state.bookings, error: null })
      return resolve({ data: [], error: null })
    },
  }
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => query(t), rpc: async () => ({ data: null, error: null }) } }))
vi.mock('../middleware/auth', () => ({
  requireAuth: (req: Record<string, unknown>, _res: unknown, next: () => void) => { req.userId = 'user-1'; next() },
}))

async function call(method: 'get' | 'post', path: string, body: unknown = {}) {
  const { leadRouter } = await import('./leads')
  const layer = (leadRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }> })
    .stack.find(l => l.route?.path === path && l.route?.methods[method])
  if (!layer?.route) throw new Error(`${method.toUpperCase()} ${path} not found on the lead router`)
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const res: { code: number; payload: Row } = { code: 200, payload: {} }
  const fakeRes = {
    status(c: number) { res.code = c; return fakeRes },
    json(p: Row) { res.payload = p; return fakeRes },
  }
  await handler({ userId: 'user-1', body, headers: {}, params: {}, query: {} }, fakeRes, () => {})
  return res
}

/** n leads that were emailed and replied. */
const winners = (n: number, over: Row = {}) =>
  Array.from({ length: n }, (_, i) => ({ id: `w${i}`, job_title: 'Operations Director', industry: 'Logistics',
    company_size: null, country: null, seniority: null, revealed_at: 'x', passed_at: null, ...over }))
const losers = (n: number, over: Row = {}) =>
  Array.from({ length: n }, (_, i) => ({ id: `s${i}`, job_title: 'Marketing Manager', industry: 'Retail',
    company_size: null, country: null, seniority: null, revealed_at: 'x', passed_at: null, ...over }))

beforeEach(() => {
  state.clientId = 'client-1'
  state.leads = []; state.leadsError = null
  state.sent = []; state.sentError = null
  state.replies = []; state.repliesError = null
  state.bookings = []
  state.inserts = []; state.insertError = null
})

describe('① a failed read never becomes a pattern', () => {
  it('a failed REPLIES read returns 500, not a shape computed without the replies', () => {
    // The worst version: replies are the positive class. Losing them silently turns every
    // winner into a "silent" lead and reports the exact opposite shape, confidently.
    state.leads = [...winners(10), ...losers(40)]
    state.sent = state.leads.map(l => ({ lead_id: l.id, opened_at: null }))
    state.repliesError = { message: 'statement timeout' }
    return call('get', '/patterns').then(r => {
      expect(r.code).toBe(500)
      expect(String(r.payload.error)).toContain('replies')
    })
  })

  it('a failed SENDS read returns 500 too — it decides who was contacted at all', () => {
    state.leads = [...winners(10), ...losers(40)]
    state.sentError = { message: 'connection reset' }
    return call('get', '/patterns').then(r => {
      expect(r.code).toBe(500)
      expect(String(r.payload.error)).toContain('sends')
    })
  })

  it('a failed LEADS read returns 500', () => {
    state.leadsError = { message: 'permission denied' }
    return call('get', '/patterns').then(r => expect(r.code).toBe(500))
  })

  it('an unknown client is a 404', () => {
    state.clientId = null
    return call('get', '/patterns').then(r => expect(r.code).toBe(404))
  })
})

describe('the happy path, and the refusal that is the normal state today', () => {
  it('with real evidence it returns a shape', async () => {
    state.leads = [...winners(10), ...losers(40)]
    state.sent = state.leads.map(l => ({ lead_id: l.id, opened_at: null }))
    state.replies = winners(10).map(l => ({ lead_id: l.id }))

    const r = await call('get', '/patterns')
    expect(r.code).toBe(200)
    const d = r.payload.data as Row
    const shape = d.shape as { enough: boolean; value: { traits: { value: string }[] } }
    expect(shape.enough).toBe(true)
    expect(shape.value.traits.map(t => t.value)).toContain('Logistics')
  })

  it('with an EMPTY desk it refuses, and that is the correct answer today', async () => {
    // Every client starts here, and so does Client Zero. A tab that invented a pattern from
    // nothing would be wrong on the very first day anyone opened it.
    const r = await call('get', '/patterns')
    expect(r.code).toBe(200)
    const d = r.payload.data as Row
    for (const k of ['shape', 'approvals', 'trend']) {
      expect((d[k] as { enough: boolean }).enough, k).toBe(false)
    }
    expect((d.totals as { leads: number }).leads).toBe(0)
  })

  it('leads nobody emailed do not create a pattern out of nothing', async () => {
    // 50 leads, none contacted. There is no evidence here, only rows.
    state.leads = [...winners(10), ...losers(40)]
    const r = await call('get', '/patterns')
    expect((( r.payload.data as Row).shape as { enough: boolean }).enough).toBe(false)
  })
})

describe('② "find me more" asks an operator — it never sources', () => {
  it('writes a client_messages row and nothing else', async () => {
    const r = await call('post', '/patterns/request-more', {
      shape: { winners: 10, silent: 40, nothingStandsOut: false,
        traits: [{ attribute: 'industry', value: 'Logistics', winners: 7, lift: 2.4 }] },
    })
    expect(r.code).toBe(200)
    expect(state.inserts).toHaveLength(1)
    expect(state.inserts[0].table).toBe('client_messages')
    expect(state.inserts[0].row.sender_type).toBe('client')
    expect(String(state.inserts[0].row.content)).toContain('Logistics')
    // Nothing that spends, sources or charges.
    expect(state.inserts.map(i => i.table)).not.toContain('sourcing_ledger')
    expect(state.inserts.map(i => i.table)).not.toContain('credit_transactions')
  })

  it('refuses when there is no analysis to send', async () => {
    const r = await call('post', '/patterns/request-more', {})
    expect(r.code).toBe(400)
    expect(String(r.payload.error)).toContain('Run the analysis first')
    expect(state.inserts).toEqual([])
  })

  it('a failed write is reported, not swallowed', async () => {
    // Silently losing the request means the client waits for leads that were never asked for.
    state.insertError = { message: 'permission denied' }
    const r = await call('post', '/patterns/request-more', { shape: { winners: 9, silent: 20, traits: [], nothingStandsOut: true } })
    expect(r.code).toBe(500)
    expect(String(r.payload.error)).toContain('could not send')
  })
})
