import { describe, it, expect, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════════════
// RESOLVING A NEEDS-ICP-REVIEW, EXECUTED — the route that lifts a Proof block. (S1-RT-005.)
//
// ── WHY THIS FILE EXISTS ───────────────────────────────────────────────────────────────
//
// 🛑 TWO SOURCE PINS IN THIS BATCH SURVIVED `if (false && ...)`. A regex that finds a string
// cannot tell a live gate from a dead one, and this route is the single thing that can lift
// a block holding back Proof and provider spend. So its authority is proved by RUNNING it:
// ownership, replay, validation and the write are driven through the real handler against a
// stateful double, and the assertions are about what ended up in the row.
//
// ⚠️ THE DOUBLE IS A REAL STORE, NOT A STUB. Replay and "did the flag actually clear" are
// claims about state across two calls; a mock that answers the same thing twice would prove
// neither.
// ═══════════════════════════════════════════════════════════════════════════════════════

type Row = Record<string, unknown>

const store = vi.hoisted(() => ({
  icps: [] as Row[],
  audits: [] as Row[],
}))

function table(name: string) {
  const filters: ((r: Row) => boolean)[] = []
  const rows = () => (name === 'icps' ? store.icps : store.audits)
  const q: Record<string, unknown> = {
    select() { return q },
    eq(c: string, v: unknown) { filters.push(r => r[c] === v); return q },
    is(c: string, v: unknown) { filters.push(r => (r[c] ?? null) === v); return q },
    not(c: string, _op: string, _v: unknown) { filters.push(r => (r[c] ?? null) !== null); return q },
    order() { return q }, limit() { return q },
    insert(row: Row) { rows().push({ ...row }); return { then: (r: (v: unknown) => unknown) => r({ error: null }) } },
    async maybeSingle() {
      const hit = rows().filter(r => filters.every(f => f(r)))
      return { data: hit[0] ?? null, error: null }
    },
    update(patch: Row) {
      const uf: ((r: Row) => boolean)[] = []
      const u: Record<string, unknown> = {
        eq(c: string, v: unknown) { uf.push(r => r[c] === v); return u },
        is(c: string, v: unknown) { uf.push(r => (r[c] ?? null) === v); return u },
        select() { return u },
        then(resolve: (v: unknown) => unknown) {
          const hit = rows().filter(r => uf.every(f => f(r)))
          for (const r of hit) Object.assign(r, patch)
          return resolve({ data: hit.map(r => ({ id: r.id })), error: null })
        },
      }
      return u
    },
    then(resolve: (v: unknown) => unknown) {
      return resolve({ data: rows().filter(r => filters.every(f => f(r))), error: null })
    },
  }
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => table(t), rpc: async () => ({ data: null, error: null }) } }))
vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _s: unknown, n: () => void) => n() }))
// The audit writer is exercised for the fact that it RAN and with what action — its own
// storage is somebody else's test.
vi.mock('./operator-audit', async (orig) => {
  const actual = await (orig() as Promise<Record<string, unknown>>)
  return {
    ...actual,
    writeOperatorAudit: async (entry: Row) => { store.audits.push(entry) },
  }
})

const ADMIN_KEY = 'test-operator-key'
process.env.ADMIN_SECRET_KEY = ADMIN_KEY

const OPEN_REVIEW = { requirements: [{ field: 'industries', said: ['B2B service businesses'] }] }

const icpRow = (over: Row = {}): Row => ({
  id: 'icp-1', client_id: 'client-1', name: 'UK agencies',
  industries: [], seniority_levels: ['C-Suite'], company_sizes: ['11–50'],
  geographies: ['United Kingdom'], job_titles: ['Founder'],
  target_category: 'Agencies and consultancies', target_company_type: 'agency',
  icp_review: OPEN_REVIEW, icp_review_at: '2026-09-14T08:00:00Z',
  icp_review_resolved_at: null, icp_review_resolved_by: null,
  ...over,
})

beforeEach(() => { store.icps = []; store.audits = [] })

// ⚠️ `null` MEANS "SEND NO KEY", not `undefined`. A default parameter is applied when the
// argument IS `undefined`, so passing `undefined` for "no key" silently sent the VALID one
// and the no-key case passed while proving nothing — the same false-pass shape this batch
// already found twice, this time in the harness rather than the assertion.
async function callResolve(icpId: string, body: Row, key: string | null = ADMIN_KEY) {
  const { operatorRouter } = await import('../routes/operator')
  const layer = (operatorRouter as unknown as {
    stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>
  }).stack.find(l => l.route?.path === '/icp-review/:icpId/resolve' && l.route?.methods.post)
  if (!layer?.route) throw new Error('POST /icp-review/:icpId/resolve not found on the operator router')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const out: { code: number; payload: Row } = { code: 200, payload: {} }
  const res = {
    status(c: number) { out.code = c; return res },
    json(p: Row) { out.payload = p; return res },
  }
  await handler(
    { body, params: { icpId }, query: {}, headers: key ? { 'x-admin-key': key } : {} },
    res, () => {},
  )
  return out
}

describe('🛑 the resolve route is the ONLY thing that lifts a Proof block', () => {
  it('🛑 an operator key is REQUIRED', async () => {
    store.icps.push(icpRow())
    const r = await callResolve('icp-1', { client_id: 'client-1', values: { industries: ['Consulting'] } }, null)
    expect(r.code).toBe(403)
    expect(store.icps[0].icp_review_resolved_at, 'nothing may clear without the key').toBeNull()
  })

  it('a valid resolution writes the canonical values AND clears the flag, together', async () => {
    store.icps.push(icpRow())
    const r = await callResolve('icp-1', { client_id: 'client-1', values: { industries: ['consulting', 'Media'] } })
    expect(r.code).toBe(200)
    expect(r.payload.success).toBe(true)
    const row = store.icps[0]
    expect(row.industries, 'canonicalised, never the operator\'s casing').toEqual(['Consulting', 'Media'])
    expect(row.icp_review_resolved_at).toBeTruthy()
  })

  it('🛑 and the ICP is then NOT in review — proved through the same predicate Proof uses', async () => {
    const { icpNeedsReview } = await import('./icp-provider-translation')
    store.icps.push(icpRow())
    expect(icpNeedsReview(store.icps[0].icp_review, store.icps[0].icp_review_resolved_at as string | null)).toBe(true)
    await callResolve('icp-1', { client_id: 'client-1', values: { industries: ['Consulting'] } })
    expect(icpNeedsReview(store.icps[0].icp_review, store.icps[0].icp_review_resolved_at as string | null)).toBe(false)
  })

  it('🛑 ANOTHER CLIENT\'S ICP CANNOT BE TOUCHED — and the answer gives nothing away', async () => {
    store.icps.push(icpRow())
    const r = await callResolve('icp-1', { client_id: 'someone-else', values: { industries: ['Consulting'] } })
    expect(r.code).toBe(404)
    expect(String(r.payload.error)).toBe('No such ICP for that client.')
    expect(store.icps[0].icp_review_resolved_at, 'the real row is untouched').toBeNull()
    expect(store.icps[0].industries).toEqual([])
  })

  it('a missing client_id is refused — a resolution must name who it belongs to', async () => {
    store.icps.push(icpRow())
    const r = await callResolve('icp-1', { values: { industries: ['Consulting'] } })
    expect(r.code).toBe(400)
    expect(store.icps[0].icp_review_resolved_at).toBeNull()
  })

  it('🛑 AN OFF-VOCABULARY VALUE IS REFUSED — an operator is not more trusted than a model', async () => {
    store.icps.push(icpRow())
    const r = await callResolve('icp-1', { client_id: 'client-1', values: { industries: ['agencies'] } })
    expect(r.code).toBe(400)
    expect(String(r.payload.error)).toContain('agencies')
    expect(store.icps[0].icp_review_resolved_at, 'an unprovable resolution must not clear the flag').toBeNull()
    expect(store.icps[0].industries, 'and must not reach the provider column').toEqual([])
  })

  it('🛑 AN EMPTY RESOLUTION IS REFUSED — it would silently WIDEN the search', async () => {
    store.icps.push(icpRow())
    const r = await callResolve('icp-1', { client_id: 'client-1', values: { industries: [] } })
    expect(r.code).toBe(400)
    expect(String(r.payload.error)).toContain('NO constraint')
    expect(store.icps[0].icp_review_resolved_at).toBeNull()
  })

  it('🛑 supplying nothing at all is refused for the same reason', async () => {
    store.icps.push(icpRow())
    const r = await callResolve('icp-1', { client_id: 'client-1', values: {} })
    expect(r.code).toBe(400)
    expect(store.icps[0].icp_review_resolved_at).toBeNull()
  })

  it('a field that is not under review cannot be written through this door', async () => {
    store.icps.push(icpRow())
    const r = await callResolve('icp-1', { client_id: 'client-1', values: { job_titles: ['CEO'] } })
    expect(r.code).toBe(400)
    expect(store.icps[0].job_titles, 'untouched').toEqual(['Founder'])
  })

  it('🛑 REPLAY writes nothing and creates nothing — the second press is told so', async () => {
    store.icps.push(icpRow())
    const first = await callResolve('icp-1', { client_id: 'client-1', values: { industries: ['Consulting'] } })
    expect(first.code).toBe(200)
    const stamp = store.icps[0].icp_review_resolved_at

    const second = await callResolve('icp-1', { client_id: 'client-1', values: { industries: ['Media'] } })
    expect(second.code).toBe(409)
    expect(store.icps[0].icp_review_resolved_at, 'the recorded moment must not move').toBe(stamp)
    expect(store.icps[0].industries, 'and the second press must not overwrite the first').toEqual(['Consulting'])
    expect(store.icps, 'no second ICP, ever').toHaveLength(1)
  })

  it('🛑 an ICP that is NOT awaiting review cannot be "resolved" into one', async () => {
    store.icps.push(icpRow({ icp_review: null, icp_review_at: null }))
    const r = await callResolve('icp-1', { client_id: 'client-1', values: { industries: ['Consulting'] } })
    expect(r.code).toBe(409)
    expect(store.icps[0].icp_review_resolved_at).toBeNull()
  })

  it('the resolution is AUDITED — who lifted the block, on which ICP, for which client', async () => {
    store.icps.push(icpRow())
    await callResolve('icp-1', { client_id: 'client-1', values: { industries: ['Consulting'] } })
    expect(store.audits).toHaveLength(1)
    expect(store.audits[0].action).toBe('icp_provider_review_resolved')
    expect(store.audits[0].clientId).toBe('client-1')
    expect(store.audits[0].subjectId).toBe('icp-1')
  })

  it('🛑 a REFUSED resolution writes no audit row — nobody lifted anything', async () => {
    store.icps.push(icpRow())
    await callResolve('icp-1', { client_id: 'client-1', values: { industries: ['agencies'] } })
    expect(store.audits, 'an audit row is a claim that a person did something').toEqual([])
  })
})
