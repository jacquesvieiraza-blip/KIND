import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ═══════════════════════════════════════════════════════════════════════════════════════
// S1-PD-07 — RESOLVING A REVIEW COMPLETES THE UNRESOLVED HALF. IT DOES NOT REPLACE THE ICP.
//
// ── THE DEFECT, AND IT DELETED CUSTOMER TRUTH SILENTLY ─────────────────────────────────
//
// A provider field can be MIXED. The client says "Consulting and creative agencies":
//   · "Consulting" canonicalises and goes live in `icps.industries`
//   · "creative agencies" does not, and becomes the review requirement
// Vida shows the operator the unresolved words. They map them to "Media" and press save. The
// route wrote `industries = ["Media"]`, because `outcome.values` held only what the operator
// had just supplied.
//
//   "Consulting" was DELETED by the act of completing the translation.
//
// No error, no warning, an audit row that looked deliberate, and a client whose targeting is
// now narrower than the brief they confirmed. The human was translating the unresolved half;
// nobody asked them to replace the half that already worked.
//
// ── HOW THIS IS PROVED ─────────────────────────────────────────────────────────────────
//
// §A  THE ROUTE, EXECUTED. The REAL `POST /operator/icp-review/:icpId/resolve` handler is
//     driven against a STATEFUL double, and every assertion is about the row that ended up
//     in the store. Ownership, replay, refusal and the merge are all claims about state.
// §B  THE RULE, EXECUTED. `resolveReview` directly, over the merge and bound cases.
// §C  THE SERVER OWNS IT. The existing half is read from the ROW, never from the request.
// ═══════════════════════════════════════════════════════════════════════════════════════

type Row = Record<string, unknown>

const store = vi.hoisted(() => ({ icps: [] as Row[], audits: [] as Row[] }))

function table(name: string) {
  const filters: ((r: Row) => boolean)[] = []
  const rows = () => (name === 'icps' ? store.icps : store.audits)
  const q: Record<string, unknown> = {
    select() { return q },
    eq(c: string, v: unknown) { filters.push(r => r[c] === v); return q },
    is(c: string, v: unknown) { filters.push(r => (r[c] ?? null) === v); return q },
    not(c: string) { filters.push(r => (r[c] ?? null) !== null); return q },
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
vi.mock('./operator-audit', async (orig) => {
  const actual = await (orig() as Promise<Record<string, unknown>>)
  return { ...actual, writeOperatorAudit: async (entry: Row) => { store.audits.push(entry) } }
})

const ADMIN_KEY = 'test-operator-key'
process.env.ADMIN_SECRET_KEY = ADMIN_KEY

const review = (field: string, said: string[]) => ({ requirements: [{ field, said }] })

/** An ICP whose MIXED field already holds the half that translated. */
const icpRow = (over: Row = {}): Row => ({
  id: 'icp-1', client_id: 'client-1', name: 'UK agencies',
  industries: ['Consulting'], seniority_levels: ['C-Suite'], company_sizes: ['11–50'],
  geographies: ['United Kingdom'], job_titles: ['Founder'],
  icp_review: review('industries', ['creative agencies']),
  icp_review_at: '2026-09-14T08:00:00Z',
  icp_review_resolved_at: null, icp_review_resolved_by: null,
  ...over,
})

beforeEach(() => { store.icps = []; store.audits = [] })

// ⚠️ `null` MEANS "SEND NO KEY". Passing `undefined` triggers the default parameter, which is
// how a no-key case once passed while silently sending the valid one.
async function callResolve(icpId: string, body: Row, key: string | null = ADMIN_KEY) {
  const { operatorRouter } = await import('../routes/operator')
  const layer = (operatorRouter as unknown as {
    stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>
  }).stack.find(l => l.route?.path === '/icp-review/:icpId/resolve' && l.route?.methods.post)
  if (!layer?.route) throw new Error('POST /icp-review/:icpId/resolve not found')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const out: { code: number; payload: Row } = { code: 200, payload: {} }
  const res = { status(c: number) { out.code = c; return res }, json(p: Row) { out.payload = p; return res } }
  await handler({ body, params: { icpId }, query: {}, headers: key ? { 'x-admin-key': key } : {} }, res, () => {})
  return out
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// §A · THE ROUTE
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 S1-PD-07 §A · the already-valid half survives the resolution', () => {
  it('🛑 A · existing ["Consulting"] + operator maps "creative agencies" → Media', async () => {
    store.icps.push(icpRow())
    const r = await callResolve('icp-1', { client_id: 'client-1', values: { industries: ['Media'] } })
    expect(r.code).toBe(200)
    // 🛑 THE WHOLE BLOCKER. `["Media"]` here is the defect; `["Consulting","Media"]` is the fix.
    expect(store.icps[0].industries).toEqual(['Consulting', 'Media'])
  })

  it('🛑 B · existing ["SaaS","Fintech"] — all three survive', async () => {
    store.icps.push(icpRow({ industries: ['SaaS', 'Fintech'] }))
    const r = await callResolve('icp-1', { client_id: 'client-1', values: { industries: ['Consulting'] } })
    expect(r.code).toBe(200)
    expect(store.icps[0].industries).toEqual(['SaaS', 'Fintech', 'Consulting'])
  })

  it('🛑 C · the same for company_sizes', async () => {
    store.icps.push(icpRow({
      company_sizes: ['11–50'],
      icp_review: review('company_sizes', ['a few hundred people']),
    }))
    const r = await callResolve('icp-1', { client_id: 'client-1', values: { company_sizes: ['201–500'] } })
    expect(r.code).toBe(200)
    expect(store.icps[0].company_sizes).toEqual(['11–50', '201–500'])
    expect(store.icps[0].industries, 'a field not under review is untouched').toEqual(['Consulting'])
  })

  it('🛑 D · the same for seniority_levels', async () => {
    store.icps.push(icpRow({
      seniority_levels: ['C-Suite'],
      icp_review: review('seniority_levels', ['whoever signs things off']),
    }))
    const r = await callResolve('icp-1', { client_id: 'client-1', values: { seniority_levels: ['VP / Director'] } })
    expect(r.code).toBe(200)
    expect(store.icps[0].seniority_levels).toEqual(['C-Suite', 'VP / Director'])
  })

  it('🛑 E · a resolution that repeats an existing value does NOT duplicate it', async () => {
    store.icps.push(icpRow())
    const r = await callResolve('icp-1', { client_id: 'client-1', values: { industries: ['consulting'] } })
    expect(r.code).toBe(200)
    // Case-insensitive, and the EXISTING spelling wins — the column is not rewritten because
    // an operator typed it differently.
    expect(store.icps[0].industries).toEqual(['Consulting'])
  })

  it('🛑 F · a merge beyond the provider maximum FAILS CLOSED and writes nothing', async () => {
    store.icps.push(icpRow({
      industries: ['SaaS', 'Fintech', 'Retail', 'Media', 'Banking', 'Energy'],   // already 6
    }))
    const r = await callResolve('icp-1', { client_id: 'client-1', values: { industries: ['Consulting'] } })
    expect(r.code).toBe(400)
    expect(String(r.payload.error)).toContain('at most 6')
    // 🛑 NOT TRUNCATED. Choosing by array position which constraint to drop is the defect
    // wearing a different hat.
    expect(store.icps[0].industries).toEqual(['SaaS', 'Fintech', 'Retail', 'Media', 'Banking', 'Energy'])
    expect(store.icps[0].icp_review_resolved_at, 'and the review stays open').toBeNull()
    expect(store.audits, 'nothing happened, so nothing is audited').toEqual([])
  })

  it('🛑 G · an INVALID resolution preserves the existing half, the review and the null stamp', async () => {
    store.icps.push(icpRow())
    const r = await callResolve('icp-1', { client_id: 'client-1', values: { industries: ['agencies'] } })
    expect(r.code).toBe(400)
    expect(store.icps[0].industries, 'the client\'s valid half is untouched').toEqual(['Consulting'])
    expect(store.icps[0].icp_review, 'the review is still open').toBeTruthy()
    expect(store.icps[0].icp_review_resolved_at).toBeNull()
  })

  it('🛑 H · REPLAY remains ONE transition — the second press merges nothing', async () => {
    store.icps.push(icpRow())
    const first = await callResolve('icp-1', { client_id: 'client-1', values: { industries: ['Media'] } })
    expect(first.code).toBe(200)
    expect(store.icps[0].industries).toEqual(['Consulting', 'Media'])
    const stamp = store.icps[0].icp_review_resolved_at

    const second = await callResolve('icp-1', { client_id: 'client-1', values: { industries: ['Retail'] } })
    expect(second.code).toBe(409)
    expect(store.icps[0].industries, 'a replay must not keep appending').toEqual(['Consulting', 'Media'])
    expect(store.icps[0].icp_review_resolved_at).toBe(stamp)
    expect(store.icps, 'no second ICP, ever').toHaveLength(1)
  })

  it('🛑 I · ANOTHER CLIENT\'S ICP is refused, and nothing merges', async () => {
    store.icps.push(icpRow())
    const r = await callResolve('icp-1', { client_id: 'someone-else', values: { industries: ['Media'] } })
    expect(r.code).toBe(404)
    expect(store.icps[0].industries).toEqual(['Consulting'])
    expect(store.icps[0].icp_review_resolved_at).toBeNull()
  })

  it('🛑 and the operator key is still required for any of it', async () => {
    store.icps.push(icpRow())
    const r = await callResolve('icp-1', { client_id: 'client-1', values: { industries: ['Media'] } }, null)
    expect(r.code).toBe(403)
    expect(store.icps[0].industries).toEqual(['Consulting'])
  })

  it('the AUDIT row records the merge, not just the operator\'s half', async () => {
    store.icps.push(icpRow())
    await callResolve('icp-1', { client_id: 'client-1', values: { industries: ['Media'] } })
    expect(store.audits).toHaveLength(1)
    const detail = store.audits[0].detail as Record<string, unknown>
    expect((detail.values as Record<string, string[]>).industries).toEqual(['Consulting', 'Media'])
    // Without this, "industries became [Consulting, Media]" is unreadable later — nobody can
    // tell what the operator chose from what was already there.
    expect((detail.already_canonical as Record<string, string[]>).industries).toEqual(['Consulting'])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// §B · THE RULE
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 S1-PD-07 §B · resolveReview merges, and refuses rather than slicing', () => {
  const VOCAB = {
    industries: ['Consulting', 'Media', 'SaaS', 'Fintech', 'Retail', 'Banking', 'Energy'],
    seniority_levels: ['C-Suite', 'VP / Director'],
    company_sizes: ['11–50', '201–500'],
  }

  it('the union is existing-first, then the operator\'s, deduplicated', async () => {
    const { resolveReview } = await import('./icp-provider-translation')
    const r = resolveReview(
      review('industries', ['creative agencies']) as never,
      { industries: ['Media', 'Consulting'] },
      VOCAB,
      { industries: ['Consulting'] },
    )
    expect(r.ok && r.values.industries).toEqual(['Consulting', 'Media'])
  })

  it('no existing values at all still works — the merge degenerates to the operator\'s list', async () => {
    const { resolveReview } = await import('./icp-provider-translation')
    const r = resolveReview(
      review('industries', ['creative agencies']) as never,
      { industries: ['Media'] }, VOCAB, {},
    )
    expect(r.ok && r.values.industries).toEqual(['Media'])
  })

  it('🛑 over the ceiling REFUSES and names the whole union', async () => {
    const { resolveReview } = await import('./icp-provider-translation')
    const r = resolveReview(
      review('industries', ['creative agencies']) as never,
      { industries: ['Consulting'] }, VOCAB,
      { industries: ['SaaS', 'Fintech', 'Retail', 'Media', 'Banking', 'Energy'] },
    )
    expect(r.ok).toBe(false)
    expect(!r.ok && r.reason).toBe('over_max')
    expect(!r.ok && r.max).toBe(6)
    expect(!r.ok && r.would).toHaveLength(7)
  })

  it('🛑 exactly AT the ceiling is allowed — the refusal is not off by one', async () => {
    const { resolveReview } = await import('./icp-provider-translation')
    const r = resolveReview(
      review('industries', ['creative agencies']) as never,
      { industries: ['Consulting'] }, VOCAB,
      { industries: ['SaaS', 'Fintech', 'Retail', 'Media', 'Banking'] },
    )
    expect(r.ok).toBe(true)
    expect(r.ok && r.values.industries).toHaveLength(6)
  })

  it('a blank or non-array existing value cannot corrupt the merge', async () => {
    const { resolveReview } = await import('./icp-provider-translation')
    for (const bad of [null, undefined, 'Consulting', 42, { a: 1 }]) {
      const r = resolveReview(
        review('industries', ['x']) as never, { industries: ['Media'] }, VOCAB,
        { industries: bad },
      )
      expect(r.ok && r.values.industries, `existing=${JSON.stringify(bad)}`).toEqual(['Media'])
    }
    // An array with blanks keeps only the real values.
    const r = resolveReview(
      review('industries', ['x']) as never, { industries: ['Media'] }, VOCAB,
      { industries: ['Consulting', '', '   ', null] },
    )
    expect(r.ok && r.values.industries).toEqual(['Consulting', 'Media'])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// §C · THE SERVER OWNS THE MERGE
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 S1-PD-07 §C · the existing half comes from the ROW, never from the request', () => {
  it('🛑 a caller cannot supply the existing half — a forged one is ignored', async () => {
    store.icps.push(icpRow())
    await callResolve('icp-1', {
      client_id: 'client-1',
      values: { industries: ['Media'] },
      // A caller trying to decide what the client already had.
      existing: { industries: ['Energy', 'Banking'] },
      canonical: { industries: ['Energy'] },
    })
    expect(store.icps[0].industries, 'the row decided, not the body').toEqual(['Consulting', 'Media'])
  })

  it('🛑 the route SELECTS the three provider columns it merges with', async () => {
    const src = readFileSync(join(process.cwd(), 'apps/api/src/routes/operator.ts'), 'utf8')
    expect(src).toContain("'id, client_id, icp_review, icp_review_resolved_at, industries, seniority_levels, company_sizes'")
    // And snapshots them from the ROW, before the write, into the merge.
    expect(src).toContain("industries:       listBefore('industries'),")
    expect(src).toContain("seniority_levels: listBefore('seniority_levels'),")
    expect(src).toContain("company_sizes:    listBefore('company_sizes'),")
    expect(src).toContain('const outcome = resolveReview(')
    expect(src).toContain('      alreadyCanonical,\n    )')
  })

  it('🛑 `existing` is a REQUIRED parameter — it cannot be forgotten back into the defect', async () => {
    const src = readFileSync(join(process.cwd(), 'apps/api/src/lib/icp-provider-translation.ts'), 'utf8')
    const at = src.indexOf('export function resolveReview(')
    const body = src.slice(at, src.indexOf('): ResolutionOutcome {', at))
    const live = body.split('\n').filter(l => !l.trimStart().startsWith('*') && !l.trimStart().startsWith('//')).join('\n')
    expect(live).toContain('existing: Partial<Record<ProviderField, unknown>>,')
    expect(live, 'a default would let a call site silently reintroduce the replacement bug')
      .not.toMatch(/existing[^,)]*=\s*\{\s*\}/)
  })
})
