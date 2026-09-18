// ══════════════════════════════════════════════════════════════════════════════════════════
// J5-C7 · THE PROOF ROUTE'S DECISIVE READS FAIL LOUD, AND THE HAND-OFF IS ONE CAS
//
// ── THE DEFECT, IN ONE LINE OF CODE ─────────────────────────────────────────────────────
//
//     const { data: fundingRows } = await db.from('credit_transactions')
//       .select('type, reference').eq('client_id', clientId)
//     if (fundedVia(fundingRows ?? []) !== null) { …refuse: the account is already live… }
//
// The `error` is destructured away. This is the repository's standing defect class
// (`const { data } = await …`), and here it decides MONEY: supabase-js answers a failed read
// with `{ data: null, error }`, so a database blip makes `fundingRows` null, `fundedVia([])`
// answers "not funded", and the route proceeds to claim a free Proof pass for a client who
// may be live and paying. The client is told nothing; the pass is simply gone.
//
// ⚠️ IT IS THE INVERSION THAT MATTERS, not the outage. "We could not read whether you are
// funded" and "you are not funded" are different facts, and only one of them may spend a
// pass. LR 21 is exactly this rule.
//
// ── THE SECOND HALF: ONE CAS ────────────────────────────────────────────────────────────
//
// The hand-off must be a single compare-and-set, so two requests cannot both claim. That is
// already true — `claimProofAuthority` is an RPC whose row is the authority — and it is
// asserted here so it cannot be replaced by a read-then-write during this build.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest'

type Row = Record<string, unknown>

const state = {
  clients: [{ id: 'client-1', user_id: 'user-1', proof_passes_done: 0, proof_started_at: null }] as Row[],
  icps: [{ id: 'icp-1', client_id: 'client-1', pending_targeting: null, icp_review_state: null }] as Row[],
  credit_transactions: [] as Row[],
  /** which table's read should fail — F-DBREAD */
  unreadable: null as string | null,
  /** every claim the route actually attempted */
  claims: [] as string[],
}

function table(name: string) {
  const filters: ((r: Row) => boolean)[] = []
  const rows = (): Row[] => {
    const t = state as unknown as Record<string, Row[]>
    if (!Array.isArray(t[name])) t[name] = []
    return t[name]
  }
  const fail = () => state.unreadable === name
  const q: Record<string, unknown> = {
    select() { return q },
    eq(c: string, v: unknown) { filters.push(r => r[c] === v); return q },
    is(c: string, v: unknown) { filters.push(r => (r[c] ?? null) === v); return q },
    in(c: string, v: unknown[]) { filters.push(r => v.includes(r[c])); return q },
    // `.not('col','is',null)` — the calibration read uses it. A missing method here throws and
    // the route refuses, which made four F-DBREAD cases pass for the WRONG reason.
    not(c: string, op: string, v: unknown) {
      filters.push(r => (op === 'is' && v === null ? (r[c] ?? null) !== null : r[c] !== v))
      return q
    },
    gte() { return q }, lte() { return q }, gt() { return q }, lt() { return q },
    order() { return q }, limit() { return q },
    async maybeSingle() {
      if (fail()) return { data: null, error: { code: '08006', message: `${name} is unreadable` } }
      const h = rows().filter(r => filters.every(f => f(r)))
      return { data: h[0] ?? null, error: null }
    },
    async single() {
      if (fail()) return { data: null, error: { code: '08006', message: `${name} is unreadable` } }
      const h = rows().filter(r => filters.every(f => f(r)))
      return { data: h[0] ?? null, error: h[0] ? null : { message: 'no rows' } }
    },
    insert(row: Row) {
      const made = { id: `${name}-${rows().length + 1}`, ...row }
      return {
        select: () => ({
          async maybeSingle() { rows().push(made); return { data: made, error: null } },
          async single() { rows().push(made); return { data: made, error: null } },
        }),
        then(resolve: (v: unknown) => unknown) { rows().push(made); return resolve({ data: made, error: null }) },
      }
    },
    update(patch: Row) {
      const uf: ((r: Row) => boolean)[] = []
      const u: Record<string, unknown> = {
        eq(c: string, v: unknown) { uf.push(r => r[c] === v); return u },
        is(c: string, v: unknown) { uf.push(r => (r[c] ?? null) === v); return u },
        in(c: string, v: unknown[]) { uf.push(r => v.includes(r[c])); return u },
        select() { return u },
        async maybeSingle() {
          const h = rows().filter(r => uf.every(f => f(r)))
          if (!h.length) return { data: null, error: null }
          Object.assign(h[0], patch); return { data: h[0], error: null }
        },
        then(resolve: (v: unknown) => unknown) {
          for (const r of rows().filter(x => uf.every(f => f(x)))) Object.assign(r, patch)
          return resolve({ error: null })
        },
      }
      return u
    },
    // 🛑 THE LIST READ IS WHERE THE DEFECT LIVES. A failed read here must arrive as
    // `{ data: null, error }` — exactly what supabase-js returns — so a caller that
    // destructures only `data` sees an empty result and calls it "not funded".
    then(resolve: (v: unknown) => unknown) {
      if (fail()) return resolve({ data: null, error: { code: '08006', message: `${name} is unreadable` } })
      return resolve({ data: rows().filter(r => filters.every(f => f(r))), error: null })
    },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => table(t),
    rpc: async (fn: string) => {
      if (fn !== 'claim_proof_authority') return { data: null, error: { message: `unexpected rpc ${fn}` } }
      state.claims.push(fn)
      return { data: { ok: true, claim_id: 'claim-1', authority: 'free_proof', pass: 1, kind: 'automatic' }, error: null }
    },
  },
}))
vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _s: unknown, n: () => void) => n() }))
vi.mock('./proof-run-launch', () => ({ launchProofRun: () => {} }))

async function startProof() {
  const { icpRouter } = await import('../routes/icps')
  const layer = (icpRouter as unknown as {
    stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>
  }).stack.find(l => l.route?.path === '/:id/proof' && l.route?.methods.post)
  if (!layer?.route) throw new Error('POST /:id/proof not found on the icp router')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const out: { code: number; payload: Record<string, unknown> } = { code: 200, payload: {} }
  const res = {
    status(c: number) { out.code = c; return res },
    json(p: Record<string, unknown>) { out.payload = p; return res },
  }
  await handler({ body: {}, headers: {}, params: { id: 'icp-1' }, query: {}, userId: 'user-1' }, res, () => {})
  return out
}

beforeEach(() => {
  process.env.SUPABASE_URL ||= 'http://127.0.0.1:1/supabase-not-used'
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'not-a-real-key'
  process.env.SUPABASE_ANON_KEY ||= 'not-a-real-anon-key'
  state.clients = [{ id: 'client-1', user_id: 'user-1', proof_passes_done: 0, proof_started_at: null }]
  state.icps = [{ id: 'icp-1', client_id: 'client-1', pending_targeting: null, icp_review_state: null }]
  state.credit_transactions = []
  state.unreadable = null
  state.claims = []
  vi.resetModules()
})

describe('J5-C7 · unreadable funding REFUSES rather than guessing "not funded"', () => {
  it('🛑 F-DBREAD · a failed credit_transactions read must not spend a Proof pass', async () => {
    state.unreadable = 'credit_transactions'
    const r = await startProof()

    expect(state.claims,
      'a Proof pass was claimed while we could not read whether the client is already live',
    ).toHaveLength(0)
    expect(r.code, 'an unreadable funding state was treated as a usable answer').toBeGreaterThanOrEqual(400)
  })

  it('the refusal is RETRYABLE — the client did nothing wrong and nothing was consumed', async () => {
    state.unreadable = 'credit_transactions'
    const r = await startProof()
    expect(r.payload.retryable ?? r.code === 503, 'a transient read failure was reported as terminal').toBeTruthy()
  })

  it('a readable, UNFUNDED client still starts Proof — the guard is about the read, not the answer', async () => {
    const r = await startProof()
    expect(r.code, JSON.stringify(r.payload)).toBe(200)
    expect(state.claims, 'the ordinary path stopped claiming').toHaveLength(1)
  })

  it('a readable, FUNDED client is refused — live accounts get leads through their campaign', async () => {
    state.credit_transactions = [{ client_id: 'client-1', type: 'wallet_topup', reference: 'stripe' }]
    const r = await startProof()
    expect(r.code).toBe(403)
    expect(state.claims, 'a funded client spent a free Proof pass').toHaveLength(0)
  })
})

describe('J5-C7 · the hand-off is ONE compare-and-set', () => {
  it('🛑 the pass is claimed by the ledger RPC, never by a read-then-write', async () => {
    await startProof()
    // The claim is the RPC itself: one statement, one row, no window between deciding and
    // writing. A read-then-write here would let two requests both see "0 passes done".
    expect(state.claims, 'the claim did not go through the authority ledger').toEqual(['claim_proof_authority'])
  })

  it('🛑 nothing is claimed before the decisive reads have all succeeded', async () => {
    // Ordering is the guarantee: `claimProofAuthority` is the line that spends a pass, so
    // every refusal must come BEFORE it. Proven by failing a read the route makes first.
    state.unreadable = 'icps'
    const r = await startProof()
    expect(state.claims, 'a pass was spent and only then did a read fail').toHaveLength(0)
    expect(r.code).toBeGreaterThanOrEqual(400)
  })
})
