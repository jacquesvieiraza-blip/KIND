import { describe, it, expect, vi, beforeEach } from 'vitest'

// #571 — THE SAME DEFECT, ONE ROUTE OVER, AND ROUTE-LEVEL FOR THE SAME REASON AS #541.
//
// `POST /operator/source` read the client's ICPs with
//     .eq('is_active', true).maybeSingle()      ← no .limit(1)
// so a client with TWO active ICPs made PostgREST return "multiple rows returned", `icp` came
// back null, and the route answered *"No active ICP — set the client's targeting before
// sourcing."* The operator was sent to fix targeting that was already correct, for the one
// client who had done MORE of it than asked.
//
// Adding `.limit(1)` would have stopped the error and KEPT the real bug: one of the client's
// audiences silently never sourced. PR #1209 had already settled the right answer in
// `lib/start-work.ts` — every active ICP, target split across them — so this route now does
// the same thing and imports the same `splitSourceTarget`, because two copies of a split rule
// is precisely how the two paths drift apart again.
//
// Driven through the real Express handler rather than a unit test of the helper: the helper was
// never wrong. The bug was in what the route fed it, which is the exact lesson of #541.

type Rows = Record<string, unknown>[]
const state = {
  client: { id: 'client-1', company_name: 'Acme' } as Record<string, unknown> | null,
  paidCount: 1,
  isDemo: false,
  /** active ICPs, newest first — what the route's read should return */
  icps: [] as { id: string; name: string | null }[],
  runs: [] as { icpId: string; want: number }[],
  failFor: [] as string[],
  audit: [] as Record<string, unknown>[],
  /** GET /source-preview only: what lead_pool returns for EVERY ICP's candidate query. */
  pool: [] as string[],
  leadsPerRun: 200,
}

function query(table: string) {
  let counting = false
  const q: Record<string, unknown> = {
    select(_c: string, opts?: { count?: string; head?: boolean }) { counting = !!opts?.count; return q },
    eq() { return q }, in() { return q }, is() { return q }, neq() { return q },
    not() { return q }, order() { return q }, limit() { return q },
    or() { return q },   // the preview's OR-generous lead_pool candidate query
    async maybeSingle() {
      // Spreading a null client used to yield a truthy `{is_demo, user_id}`, so requireClient
      // succeeded for a client that does not exist and the 404 test passed a 200. The harness
      // has to be able to say "no such client" or it cannot test the gate that says so.
      if (table === 'clients') {
        return state.client
          ? { data: { ...state.client, is_demo: state.isDemo, user_id: 'user-1',
                      leads_per_run: state.leadsPerRun, sourcing_allowance: 0 }, error: null }
          : { data: null, error: null }
      }
      // The ICP read is MULTI-ROW now. If anything ever calls .maybeSingle() on icps again,
      // this returns null and the "two ICPs" tests below fail — which is the point.
      return { data: null, error: null }
    },
    async single() { return { data: state.client, error: null } },
    insert() { return { then: (r: (v: unknown) => unknown) => r({ error: null }) } },
    update() { return { in: () => ({ is: async () => ({ error: null }), then: (r: (v: unknown) => unknown) => r({ error: null }) }) } },
    async range() { return { data: [], error: null } },
    then(resolve: (v: { data: Rows; count?: number; error: null }) => unknown) {
      if (table === 'credit_transactions' && counting) return resolve({ data: [], count: state.paidCount, error: null })
      if (table === 'icps') return resolve({ data: state.icps as unknown as Rows, error: null })
      // Every ICP's candidate query returns the SAME pool — which is what makes the
      // double-counting test below meaningful: two audiences that overlap completely.
      if (table === 'lead_pool') return resolve({ data: state.pool.map(e => ({ email_norm: e })) as unknown as Rows, error: null })
      return resolve({ data: [], count: 0, error: null })
    },
  }
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => query(t), rpc: async () => ({ data: true, error: null }) } }))
vi.mock('./admin', () => ({ adminKeyValid: () => true }))
vi.mock('./icps', () => ({
  runIcpJob: vi.fn(async (icpId: string, _c: string, _u: string, want: number) => {
    state.runs.push({ icpId, want })
    if (state.failFor.includes(icpId)) throw new Error(`boom for ${icpId}`)
    return { inserted: want, skipped: 0, relaxed: null }
  }),
}))
vi.mock('../lib/start-work', async (orig) => {
  // splitSourceTarget is the REAL one — sharing it is the whole point of the fix.
  const actual = await orig() as Record<string, unknown>
  return {
    ...actual,
    surfaceEverything: async () => ({ surfaced: 7, recommended: 7 }),
    sendReadiness: async () => ({ canSend: true }),
  }
})
vi.mock('../lib/operator-audit', () => ({
  writeOperatorAudit: async (e: Record<string, unknown>) => { state.audit.push(e) },
  campaignAuditAction: () => 'start_campaign',
}))
vi.mock('../lib/real-clients', () => ({ getExcludedClientIds: async () => new Set<string>() }))
vi.mock('../lib/suppression', () => ({ isSuppressed: () => false }))

async function callSource(body: unknown) {
  const { operatorRouter } = await import('./operator')
  const layer = (operatorRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }> })
    .stack.find(l => l.route?.path === '/source' && l.route?.methods.post)
  if (!layer?.route) throw new Error('POST /source not found on the operator router')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const res: { code: number; payload: Record<string, unknown> } = { code: 200, payload: {} }
  const fakeRes = {
    status(c: number) { res.code = c; return fakeRes },
    json(p: Record<string, unknown>) { res.payload = p; return fakeRes },
  }
  await handler({ body, headers: {}, params: {}, query: {} }, fakeRes, () => {})
  return res
}

// GET /source-preview — the card that renders BEFORE the button above.
async function callPreview(query: Record<string, unknown>) {
  const { operatorRouter } = await import('./operator')
  const layer = (operatorRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }> })
    .stack.find(l => l.route?.path === '/source-preview' && l.route?.methods.get)
  if (!layer?.route) throw new Error('GET /source-preview not found on the operator router')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const res: { code: number; payload: Record<string, unknown> } = { code: 200, payload: {} }
  const fakeRes = {
    status(c: number) { res.code = c; return fakeRes },
    json(p: Record<string, unknown>) { res.payload = p; return fakeRes },
  }
  await handler({ body: {}, headers: {}, params: {}, query }, fakeRes, () => {})
  return res
}
const previewData = (r: { payload: Record<string, unknown> }) => r.payload.data as Record<string, unknown>

const BODY = (over: Record<string, unknown> = {}) => ({ client_id: 'client-1', count: 200, confirm: true, ...over })

beforeEach(() => {
  state.client = { id: 'client-1', company_name: 'Acme' }
  state.paidCount = 1
  state.isDemo = false
  state.icps = [{ id: 'icp-new', name: 'Fintech' }]
  state.runs = []
  state.failFor = []
  state.audit = []
  state.pool = []
  state.leadsPerRun = 200
})

describe('the defect: two active ICPs used to read as ZERO', () => {
  it('TWO ACTIVE ICPs BOTH GET SOURCED — and the route does not 400', async () => {
    // Before the fix this returned 400 "No active ICP" at a client who had two.
    state.icps = [{ id: 'icp-new', name: 'Fintech' }, { id: 'icp-old', name: 'SaaS' }]
    const res = await callSource(BODY())
    expect(res.code).toBe(200)
    expect(state.runs.map(r => r.icpId).sort()).toEqual(['icp-new', 'icp-old'])
  })

  it('the target is SPLIT, not doubled — the allowance is shared', async () => {
    state.icps = [{ id: 'a', name: null }, { id: 'b', name: null }]
    await callSource(BODY({ count: 200 }))
    expect(state.runs.reduce((s, r) => s + r.want, 0)).toBe(200)
    expect(state.runs.map(r => r.want)).toEqual([100, 100])
  })

  it('it uses the SAME split as the paid path — remainder to the newest first', async () => {
    // Imported from lib/start-work, not re-derived. 10 across 3 = [4,3,3].
    state.icps = [{ id: 'a', name: null }, { id: 'b', name: null }, { id: 'c', name: null }]
    await callSource(BODY({ count: 10 }))
    expect(state.runs.map(r => r.want)).toEqual([4, 3, 3])
  })

  it('a single-ICP client is completely unchanged', async () => {
    const res = await callSource(BODY({ count: 20 }))
    expect(res.code).toBe(200)
    expect(state.runs).toEqual([{ icpId: 'icp-new', want: 20 }])
  })

  it('ZERO active ICPs still 400s with the same message', async () => {
    state.icps = []
    const res = await callSource(BODY())
    expect(res.code).toBe(400)
    expect(String(res.payload.error)).toContain('No active ICP')
    expect(state.runs).toHaveLength(0)
  })

  it('more ICPs than leads: the surplus is SKIPPED, not run empty', async () => {
    state.icps = [{ id: 'a', name: null }, { id: 'b', name: null }, { id: 'c', name: null }]
    await callSource(BODY({ count: 2 }))
    expect(state.runs.map(r => r.icpId)).toEqual(['a', 'b'])
  })
})

describe('the gates that guard the spend are untouched', () => {
  it('an unpaid, non-demo client is still refused 402 before any run', async () => {
    state.paidCount = 0
    const res = await callSource(BODY())
    expect(res.code).toBe(402)
    expect(state.runs).toHaveLength(0)
  })

  it('a demo client is allowed through the money gate, as before', async () => {
    state.paidCount = 0
    state.isDemo = true
    expect((await callSource(BODY())).code).toBe(200)
  })

  it('confirm:false is still refused — sourcing spends our PDL budget', async () => {
    const res = await callSource(BODY({ confirm: false }))
    expect(res.code).toBe(400)
    expect(state.runs).toHaveLength(0)
  })

  it('an unknown client is still 404', async () => {
    state.client = null
    expect((await callSource(BODY())).code).toBe(404)
  })
})

describe('a partial failure is reported, not hidden and not fatal', () => {
  it('one ICP failing still returns the other\'s people', async () => {
    state.icps = [{ id: 'good', name: 'Fintech' }, { id: 'bad', name: 'SaaS' }]
    state.failFor = ['bad']
    const res = await callSource(BODY({ count: 100 }))
    expect(res.code).toBe(200)
    expect(res.payload.inserted).toBe(50)
    expect(String(res.payload.note)).toContain('FAILED')
  })

  it('the per-ICP breakdown names which one failed', async () => {
    state.icps = [{ id: 'good', name: 'Fintech' }, { id: 'bad', name: 'SaaS' }]
    state.failFor = ['bad']
    const runs = (await callSource(BODY())).payload.runs as { icp_id: string; error?: string }[]
    expect(runs.find(r => r.icp_id === 'bad')?.error).toContain('boom')
    expect(runs.find(r => r.icp_id === 'good')?.error).toBeUndefined()
  })

  it('ALL failing is a 502 — that is a real outage, not a partial delivery', async () => {
    state.icps = [{ id: 'a', name: null }, { id: 'b', name: null }]
    state.failFor = ['a', 'b']
    const res = await callSource(BODY())
    expect(res.code).toBe(502)
  })
})

// ── GET /source-preview — THE THIRD INSTANCE ─────────────────────────────────────────────
//
// The card that renders BEFORE the button. It carried the SAME bare `.maybeSingle()`, so for a
// client with two active ICPs the preview errored, `icp` came back null, the card said "no
// active ICP" — and the Source button never appeared. Fixing POST /source alone would have left
// a working door behind a gate that refused to open, for exactly the client the fix was for.
describe('the preview no longer reports "no active ICP" at a client who has two', () => {
  it('TWO ACTIVE ICPs: no_active_icp is NOT set — the button can render', async () => {
    state.icps = [{ id: 'a', name: 'Fintech' }, { id: 'b', name: 'SaaS' }]
    const d = previewData(await callPreview({ client_id: 'client-1', count: 20 }))
    expect(d.no_active_icp).toBeUndefined()
    expect(d.icps_active).toBe(2)
  })

  it('ZERO ICPs still reports no_active_icp — the real "set targeting first" case', async () => {
    state.icps = []
    const d = previewData(await callPreview({ client_id: 'client-1', count: 20 }))
    expect(d.no_active_icp).toBe(true)
    expect(d.icps_active).toBe(0)
  })

  it('a single-ICP client is unchanged, icp_name included', async () => {
    const d = previewData(await callPreview({ client_id: 'client-1', count: 20 }))
    expect(d.no_active_icp).toBeUndefined()
    expect(d.icp_name).toBe('Fintech')
    expect(d.icps_active).toBe(1)
  })

  it('the breakdown mirrors the SPLIT the real run will use', async () => {
    // The card must predict the run, not a different run with the same total.
    state.icps = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }]
    const d = previewData(await callPreview({ client_id: 'client-1', count: 10 }))
    expect((d.icps as { requested: number }[]).map(i => i.requested)).toEqual([4, 3, 3])
  })

  it('OVERLAPPING audiences are counted ONCE — the estimate must not flatter itself', async () => {
    // Two ICPs, one shared pool of 10. Without the dedupe set each ICP claims its own 10, so
    // pool_free reads 20 for 20 requested, pdl_needed reads 0, and the operator confirms a run
    // that then spends real PDL money. Over-stating the free pool is the direction that costs.
    state.icps = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]
    state.pool = Array.from({ length: 10 }, (_, i) => `p${i}@x.com`)
    const d = previewData(await callPreview({ client_id: 'client-1', count: 20 }))
    expect(d.pool_free).toBe(10)
    expect(d.pdl_needed).toBe(10)
  })

  it('the money gate still guards the preview', async () => {
    state.paidCount = 0
    expect((await callPreview({ client_id: 'client-1', count: 20 })).code).toBe(402)
  })

  it('an unknown client is still 404', async () => {
    state.client = null
    expect((await callPreview({ client_id: 'nope', count: 20 })).code).toBe(404)
  })
})

describe('the audit row records how many ICPs actually ran', () => {
  it('icps_active and icps_run are written', async () => {
    // Before the fix the honest answer was always "one, whichever the database returned".
    state.icps = [{ id: 'a', name: null }, { id: 'b', name: null }]
    await callSource(BODY())
    const detail = state.audit[0].detail as Record<string, unknown>
    expect(detail.icps_active).toBe(2)
    expect(detail.icps_run).toBe(2)
  })

  it('the row still has a subject — the newest ICP', async () => {
    state.icps = [{ id: 'newest', name: null }, { id: 'older', name: null }]
    await callSource(BODY())
    expect(state.audit[0].subjectId).toBe('newest')
    expect(state.audit[0].action).toBe('source_run')
  })
})
