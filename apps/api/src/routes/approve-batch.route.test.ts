import { describe, it, expect, vi, beforeEach } from 'vitest'

// ROUTE-LEVEL, on purpose.
//
// `lib/approval-batch.ts` has 18 passing unit tests and the gate was still bypassable,
// because the hole was never in the decision function — it was in what the route FED it.
// The route passed `ids.length`, so twenty ids of which nineteen were already-approved (or
// simply invented) read as "20 selected" and let a client approve ONE lead against a gate
// demanding twenty.
//
// So this drives the real Express handler with a real request body and asserts on the real
// response. Any future change that stops resolving the ids fails here.

// ── a controllable fake of @kind/db ──────────────────────────────────────────────────
type Rows = Record<string, unknown>[]
const state = {
  client: { id: 'client-1' } as Record<string, unknown> | null,
  /** ids that ARE genuinely approvable — what `.in('id', …)` should match against. */
  approvableIds: [] as string[],
  availableCount: 0,
  approvedEverCount: 0,
  approveCalls: [] as string[],
}

function query(table: string) {
  const filters: Array<[string, unknown]> = []
  let inIds: string[] | null = null
  let counting = false

  const q: Record<string, unknown> = {
    select(_c: string, opts?: { count?: string; head?: boolean }) { counting = !!opts?.count; return q },
    eq(col: string, val: unknown) { filters.push([col, val]); return q },
    is(col: string, val: unknown) { filters.push([`is:${col}`, val]); return q },
    neq(col: string, val: unknown) { filters.push([`neq:${col}`, val]); return q },
    not(col: string, _op: string, val: unknown) { filters.push([`not:${col}`, val]); return q },
    in(col: string, vals: string[]) { if (col === 'id') inIds = vals; return q },
    order() { return q },
    limit() { return q },
    async maybeSingle() {
      if (table === 'clients') return { data: state.client, error: null }
      return { data: null, error: null }
    },
    async single() { return { data: state.client, error: null } },
    // Counts and row reads both await the builder.
    then(resolve: (v: { data: Rows; count?: number; error: null }) => unknown) {
      if (table === 'leads' && counting) {
        // Two counts are asked for: "available" (has not:surfaced) and "approvedEver"
        // (has not:revealed_at). Distinguish them by which filter is present.
        const wantsApproved = filters.some(([k]) => k === 'not:revealed_at')
        return resolve({ data: [], count: wantsApproved ? state.approvedEverCount : state.availableCount, error: null })
      }
      if (table === 'leads' && inIds) {
        const hit = inIds.filter(id => state.approvableIds.includes(id)).map(id => ({ id }))
        return resolve({ data: hit, error: null })
      }
      return resolve({ data: [], error: null })
    },
  }
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => query(t), rpc: async () => ({ data: true, error: null }) } }))
vi.mock('../middleware/auth', () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}))
vi.mock('../lib/rate-limit', () => ({ rateLimit: () => (_q: unknown, _s: unknown, n: () => void) => n() }))
// approveLead is the money path — stubbed so this test is about the GATE only.
vi.mock('../lib/approve-lead', () => ({
  PRICE_PER_LEAD_USD: 4,
  approveLead: async (leadId: string) => { state.approveCalls.push(leadId); return { status: 'approved', revealed: true, email: 'x@y.z', charged: false } },
  passLead: async () => ({ status: 'passed' }),
}))

async function callApproveBatch(body: unknown) {
  const { leadRouter } = await import('./leads')
  const layer = (leadRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }> })
    .stack.find(l => l.route?.path === '/approve-batch' && l.route?.methods.post)
  if (!layer?.route) throw new Error('POST /approve-batch not found on the router')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle

  const res: { code: number; payload: Record<string, unknown> } = { code: 200, payload: {} }
  const fakeRes = {
    status(c: number) { res.code = c; return fakeRes },
    json(p: Record<string, unknown>) { res.payload = p; return fakeRes },
  }
  await handler({ body, userId: 'user-1', params: {} }, fakeRes, () => {})
  return res
}

beforeEach(() => {
  state.client = { id: 'client-1' }
  state.approvableIds = []
  state.availableCount = 0
  state.approvedEverCount = 0
  state.approveCalls = []
})

describe('POST /leads/approve-batch — the gate counts LEADS, not the request', () => {
  it('refuses 20 ids when only one is genuinely approvable', async () => {
    // THE BYPASS. Nineteen invented ids + one real one used to read as "20 selected".
    state.approvableIds = ['real-1']
    state.availableCount = 40
    state.approvedEverCount = 0
    const fake = Array.from({ length: 19 }, (_, i) => `made-up-${i}`)

    const res = await callApproveBatch({ lead_ids: [...fake, 'real-1'] })

    expect(res.code).toBe(409)
    expect(res.payload.error).toBe('batch_minimum')
    expect(res.payload.required).toBe(20)
    // and critically: nothing was charged
    expect(state.approveCalls).toEqual([])
  })

  it('refuses when the ids are real but already approved', async () => {
    // A client re-submitting leads they already own is the same bypass in friendlier dress.
    state.approvableIds = []           // all 20 already revealed → none approvable
    state.availableCount = 40
    const res = await callApproveBatch({ lead_ids: Array.from({ length: 20 }, (_, i) => `done-${i}`) })
    expect(res.code).toBe(409)
    expect(state.approveCalls).toEqual([])
  })

  it('allows twenty genuinely approvable leads', async () => {
    const ids = Array.from({ length: 20 }, (_, i) => `ok-${i}`)
    state.approvableIds = ids
    state.availableCount = 40
    const res = await callApproveBatch({ lead_ids: ids })
    expect(res.code).toBe(200)
    expect(res.payload.approved).toBe(20)
    expect(state.approveCalls).toHaveLength(20)
  })

  it('only ever works on the resolved ids, never on what was posted', async () => {
    // Twenty real + twenty junk: the gate passes on the twenty, and the junk must not
    // reach approveLead at all.
    const real = Array.from({ length: 20 }, (_, i) => `ok-${i}`)
    const junk = Array.from({ length: 20 }, (_, i) => `junk-${i}`)
    state.approvableIds = real
    state.availableCount = 40
    const res = await callApproveBatch({ lead_ids: [...real, ...junk] })
    expect(res.code).toBe(200)
    expect(state.approveCalls.sort()).toEqual(real.sort())
    expect(state.approveCalls.some(id => id.startsWith('junk'))).toBe(false)
  })

  it('releases the gate for a client already past twenty approvals', async () => {
    state.approvableIds = ['one']
    state.availableCount = 40
    state.approvedEverCount = 25
    const res = await callApproveBatch({ lead_ids: ['one'] })
    expect(res.code).toBe(200)
    expect(state.approveCalls).toEqual(['one'])
  })

  it('rejects an empty body without touching the money path', async () => {
    const res = await callApproveBatch({})
    expect(res.code).toBe(400)
    expect(state.approveCalls).toEqual([])
  })

  it('caps the batch size so one request cannot hold the connection open mid-charge', async () => {
    const res = await callApproveBatch({ lead_ids: Array.from({ length: 201 }, (_, i) => `x-${i}`) })
    expect(res.code).toBe(400)
    expect(state.approveCalls).toEqual([])
  })
})
