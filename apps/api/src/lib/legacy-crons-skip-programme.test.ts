// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 23 Sep — TWO LEGACY CRONS MUST NOT REACH A PROGRAMME CLIENT (R124 · R136 · R137)
//
// R137 (23 Sep) retired the per-lead model for every account: `mayUseLegacyCommercialPath`
// answers no for everyone. R136 (23 Sep) credits a programme that stops short to the client's
// wallet — a `credit_transactions` row of type `wallet_topup`, reference
// `programme-shortfall:<id>`. Two daily crons were written for the per-lead model and never
// asked who the client is:
//
//   ① `/leads/drip` reveals and delivers legacy (non-programme) pool leads to any client that
//      passes `deliveryCapBalance` — a programme client included.
//   ② `/clients/cold-check` treats any `PAID_TX_TYPES` row (which includes `wallet_topup`) as
//      "paid", then warns / suspends on 30 days without a newly REVEALED lead — a per-lead rule.
//      The shortfall credit made a programme client "paid" in its eyes.
//
// These tests drive the REAL handlers with a stubbed database. The commercial-model resolver
// is the REAL one; the only seam is `forceLegacyAllowed`, a positive control proving the
// harness would see a delivery / suspension if the legacy door were open, so the programme
// assertions cannot pass vacuously.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321'
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key'

type Row = Record<string, unknown>

const DAY = 86_400_000
const CLIENT = 'client-programme-1'

const state = {
  client: null as Row | null,
  /** `undefined` field → resolver says unreadable; used for the fail-closed case */
  programme: null as Row | null,
  txs: [] as Row[],
  pendingLeads: [] as Row[],
  lastRevealedAt: null as string | null,
  activeCampaigns: [] as Row[],
  pausedCampaignIds: [] as string[],
  delivered: [] as { clientId: string; ids: string[] }[],
  alerts: [] as { kind: string; title: string }[],
  forceLegacyAllowed: false,
}

function query(table: string) {
  const filters: Array<{ op: string; col: string; val: unknown }> = []
  let updating: Row | null = null
  const q: Record<string, unknown> = {
    select() { return q },
    eq(col: string, val: unknown) { filters.push({ op: 'eq', col, val }); return q },
    in(col: string, val: unknown) { filters.push({ op: 'in', col, val }); return q },
    is(col: string, val: unknown) { filters.push({ op: 'is', col, val }); return q },
    not() { return q }, order() { return q }, limit() { return q }, gte() { return q }, lte() { return q },
    update(row: Row) { updating = row; return q },
    async maybeSingle() {
      if (table === 'clients') return { data: state.client ? { ...state.client } : null, error: null }
      if (table === 'programmes') return { data: state.programme, error: null }
      if (table === 'leads') return { data: state.lastRevealedAt ? { revealed_at: state.lastRevealedAt } : null, error: null }
      return { data: null, error: null }
    },
    then(resolve: (v: { data: Row[] | null; count?: number; error: unknown }) => unknown) {
      if (table === 'clients') return resolve({ data: state.client ? [{ ...state.client }] : [], error: null })
      if (table === 'leads') return resolve({ data: state.pendingLeads, error: null })
      if (table === 'figsy_campaigns' && updating?.status === 'paused') {
        const cid = filters.find(f => f.col === 'client_id')?.val
        const hit = state.activeCampaigns.filter(c => c.client_id === cid && c.status === 'active')
        for (const c of hit) { c.status = 'paused'; state.pausedCampaignIds.push(String(c.id)) }
        return resolve({ data: hit.map(c => ({ id: c.id })), error: null })
      }
      return resolve({ data: [], count: 0, error: null })
    },
  }
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => query(t), rpc: async () => ({ data: null, error: null }) } }))

// The delivery seam — the thing that reveals (spends) and delivers.
vi.mock('./lead-delivery', () => ({
  enrichAndDeliverLeads: async (clientId: string, ids: string[]) => {
    state.delivered.push({ clientId, ids })
    return ids.length
  },
}))

vi.mock('./alerts', () => ({
  sendFounderAlert: async (kind: string, title: string) => { state.alerts.push({ kind, title }) },
}))

// "Paid" is derived from the REAL `PAID_TX_TYPES` the route passes in — so a `wallet_topup`
// shortfall credit makes this client "paid" exactly as production would page it.
vi.mock('./page-rows', () => ({
  paidClientIds: async (types: string[]) => ({
    ids: new Set(state.txs.filter(t => types.includes(String(t.type))).map(t => String(t.client_id))),
    complete: true,
  }),
}))

vi.mock('./real-clients', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  resolveHouseUserIds: async () => new Set<string>(),
}))

// The REAL resolver, with one positive-control switch.
vi.mock('./commercial-model', async (orig) => {
  const real = await orig<typeof import('./commercial-model')>()
  return {
    ...real,
    legacyDoorVerdict: async (clientId: string) =>
      state.forceLegacyAllowed ? { allowed: true as const } : real.legacyDoorVerdict(clientId),
  }
})

async function call(path: string): Promise<{ status: number; body: Row }> {
  const { internalRouter } = await import('../routes/internal')
  const layer = (internalRouter as unknown as { stack: Array<{ route?: { path: string; stack: Array<{ handle: unknown }> } }> })
    .stack.find(l => l.route?.path === path)
  if (!layer?.route) throw new Error(`${path} not found on internalRouter`)
  const handler = layer.route.stack[layer.route.stack.length - 1].handle as (req: unknown, res: unknown) => Promise<void>
  const out = { status: 200, body: {} as Row }
  const res = {
    status(s: number) { out.status = s; return res },
    json(b: Row) { out.body = b; return res },
  }
  await handler({ body: {}, params: {}, headers: {}, query: {} }, res)
  return out
}

beforeEach(() => {
  // A programme client holding an R136 shortfall credit: wallet raised, ledger row written.
  state.client = {
    id: CLIENT, company_name: 'Programme Co', user_id: 'u-1', is_demo: false,
    commercial_model: 'programme', plan: 'lead_gen', daily_drip_rate: 5,
    credit_balance: 150, wallet_balance_usd: 150, figsy_credits_remaining: 0,
    first_icp_run_at: new Date(Date.now() - 60 * DAY).toISOString(),
  }
  state.programme = null
  state.txs = [{ client_id: CLIENT, type: 'wallet_topup', amount: 150, reference: 'programme-shortfall:prog-1' }]
  state.pendingLeads = [{ id: 'lead-a' }, { id: 'lead-b' }, { id: 'lead-c' }]
  state.lastRevealedAt = new Date(Date.now() - 40 * DAY).toISOString()
  state.activeCampaigns = [{ id: 'camp-1', client_id: CLIENT, status: 'active' }]
  state.pausedCampaignIds = []
  state.delivered = []
  state.alerts = []
  state.forceLegacyAllowed = false
})

describe('① /leads/drip — the legacy drip delivers nothing to a programme client', () => {
  it('🛑 a programme client with a shortfall credit gets no legacy pool leads', async () => {
    const r = await call('/leads/drip')
    expect(r.status).toBe(200)
    expect(state.delivered, 'the legacy drip revealed/delivered pool leads to a programme client').toEqual([])
    expect((r.body.data as Row).total_delivered).toBe(0)
  })

  it('🛑 an UNREADABLE commercial model also gets nothing — the drip fails closed', async () => {
    state.client = { ...state.client!, commercial_model: 'something-else' }
    await call('/leads/drip')
    expect(state.delivered).toEqual([])
  })

  it('positive control — were the legacy door open, the same fixture WOULD be dripped', async () => {
    state.forceLegacyAllowed = true
    await call('/leads/drip')
    expect(state.delivered).toEqual([{ clientId: CLIENT, ids: ['lead-a', 'lead-b', 'lead-c'] }])
  })
})

describe('② /clients/cold-check — the per-lead reveal rule does not apply to a programme client', () => {
  it('🛑 40 days without a reveal: NOT suspended, no churn alert', async () => {
    const r = await call('/clients/cold-check')
    expect(r.status).toBe(200)
    expect(state.pausedCampaignIds, 'a programme client was suspended by the per-lead cold rule').toEqual([])
    expect(r.body.suspended).toBe(0)
    expect(state.alerts).toEqual([])
    expect(r.body.exempted).toBe(1)
  })

  it('🛑 25 days without a reveal: NOT warned', async () => {
    state.lastRevealedAt = new Date(Date.now() - 25 * DAY).toISOString()
    const r = await call('/clients/cold-check')
    expect(r.body.warned).toBe(0)
    expect(state.alerts).toEqual([])
  })

  it('positive control — were the legacy door open, the same fixture WOULD be suspended', async () => {
    state.forceLegacyAllowed = true
    const r = await call('/clients/cold-check')
    expect(r.body.suspended).toBe(1)
    expect(state.pausedCampaignIds).toEqual(['camp-1'])
  })
})

describe('coldCheckExempt — the programme exemption is explicit and says why', () => {
  it('a refused legacy verdict (programme) exempts, with a reason', async () => {
    const { coldCheckExempt } = await import('./cold-client')
    const r = coldCheckExempt({ clientId: 'c', isDemo: false, houseClientId: null, legacyVerdict: { allowed: false, status: 403, reason: 'x' } })
    expect(r.exempt).toBe(true)
    expect(r.why).toMatch(/programme/i)
  })

  it('an unreadable verdict (503) also exempts, and says it could not tell', async () => {
    const { coldCheckExempt } = await import('./cold-client')
    const r = coldCheckExempt({ clientId: 'c', isDemo: false, houseClientId: null, legacyVerdict: { allowed: false, status: 503, reason: 'boom' } })
    expect(r.exempt).toBe(true)
    expect(r.why).toMatch(/could not be read/i)
  })

  it('an allowed verdict, or none at all, changes nothing — the display surfaces are untouched', async () => {
    const { coldCheckExempt } = await import('./cold-client')
    expect(coldCheckExempt({ clientId: 'c', isDemo: false, houseClientId: null, legacyVerdict: { allowed: true } }).exempt).toBe(false)
    expect(coldCheckExempt({ clientId: 'c', isDemo: false, houseClientId: null }).exempt).toBe(false)
  })
})
