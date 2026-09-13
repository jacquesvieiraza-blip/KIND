import { describe, it, expect, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════════════
// B2 — "IS HISTORICAL CLASSIFICATION REQUIRED?", ANSWERED BY THE SERVER, PROVED ON THE ROUTE.
//
// ── WHY THE BOOLEANS EXIST ─────────────────────────────────────────────────────────────
//
// `claim_proof_authority` fails closed on pre-ledger ambiguity (`unclassified`,
// `restart_unclassified`) and the two operator POSTs are the remedy. Vida could not tell a
// client who NEEDS classifying from one already classified, so the controls could not be shown
// to exactly the right clients — and showing them to everyone was explicitly forbidden.
//
// The answer had to come from the server, from the SAME persisted columns the RPC reads,
// because an authority rule re-derived in a browser is a second definition that drifts.
//
// ── WHAT THESE TESTS DRIVE ─────────────────────────────────────────────────────────────
//
// The REAL `GET /operator/proof-review/:clientId/evidence` handler, against a fake database
// whose rows are set per case. Each assertion is on the JSON the operator's browser receives.
//
// ⚠️ AND THE HARSHEST ONE IS THE WRITE AUDIT. This endpoint may never classify anything by
// being loaded — the RPC auto-classifies a zero-counter client as a side effect of CLAIMING,
// and a read that copied that behaviour would invent historical truth on page load.
// ═══════════════════════════════════════════════════════════════════════════════════════

type Row = Record<string, unknown>

const state = {
  client: null as Row | null,
  /** rows in `proof_pass_claims` for this client */
  claims: [] as Row[],
  /** EVERY write the handler attempted, by table. Must stay empty. */
  writes: [] as { table: string; op: string; patch: Row }[],
  /** force a read error on one table */
  failTable: null as string | null,
}

function query(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rows = (): Row[] =>
    table === 'clients' ? (state.client ? [state.client] : [])
    : table === 'proof_pass_claims' ? state.claims
    : []
  const err = () => (state.failTable === table ? { message: `${table} unreadable` } : null)
  const q: Record<string, unknown> = {
    select() { return q },
    eq(c: string, v: unknown) { filters.push(r => r[c] === v); return q },
    is(c: string, v: unknown) { filters.push(r => (r[c] ?? null) === v); return q },
    not(c: string, _op: string, v: unknown) { filters.push(r => (r[c] ?? null) !== v); return q },
    or() { return q },
    order() { return q },
    limit() { return q },
    async single() {
      const e = err(); if (e) return { data: null, error: e }
      const h = rows().filter(r => filters.every(f => f(r))); return { data: h[0] ?? null, error: null }
    },
    async maybeSingle() {
      const e = err(); if (e) return { data: null, error: e }
      const h = rows().filter(r => filters.every(f => f(r))); return { data: h[0] ?? null, error: null }
    },
    insert(patch: Row) {
      state.writes.push({ table, op: 'insert', patch })
      return { select: () => ({ async single() { return { data: patch, error: null } } }),
               then: (r: (v: unknown) => unknown) => r({ data: null, error: null }) }
    },
    upsert(patch: Row) {
      state.writes.push({ table, op: 'upsert', patch })
      return { then: (r: (v: unknown) => unknown) => r({ data: null, error: null }) }
    },
    update(patch: Row) {
      state.writes.push({ table, op: 'update', patch })
      const u: Record<string, unknown> = {
        eq() { return u }, is() { return u }, select() { return u },
        async single() { return { data: patch, error: null } },
        async maybeSingle() { return { data: patch, error: null } },
        then: (r: (v: unknown) => unknown) => r({ error: null }),
      }
      return u
    },
    then(resolve: (v: unknown) => unknown) {
      const e = err(); if (e) return resolve({ data: null, error: e })
      return resolve({ data: rows().filter(r => filters.every(f => f(r))), error: null })
    },
  }
  return q
}

const rpcCalls: string[] = []

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => query(t),
    rpc: async (name: string) => { rpcCalls.push(name); return { data: null, error: null } },
    auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'op@kind.test' } }, error: null }) },
  },
}))
vi.mock('../lib/operator-audit', () => ({ writeOperatorAudit: async () => {} }))
// `operator.ts` pulls in `icps.ts`, which imports the auth middleware — and that module builds
// a Supabase client AT IMPORT from env. Mocked rather than env-stubbed so the route under test
// never depends on a real URL existing, and so nothing here can reach a network client.
vi.mock('../middleware/auth', () => ({
  requireAuth: (_q: unknown, _s: unknown, next: () => void) => next(),
}))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: null }, error: null }) } }),
}))

const ADMIN = 'test-admin-key'

// ⚠️ `null` MEANS "NO KEY HEADER", NOT `undefined` — a default parameter is satisfied by
// `undefined`, so `evidence(id, undefined)` would silently send the VALID key and the
// unauthorised case would assert nothing. Caught by running it.
async function evidence(clientId: string, adminKey: string | null = ADMIN) {
  const { operatorRouter } = await import('./operator')
  const layer = (operatorRouter as unknown as {
    stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>
  }).stack.find(l => l.route?.path === '/proof-review/:clientId/evidence' && l.route?.methods.get)
  if (!layer?.route) throw new Error('GET /proof-review/:clientId/evidence not found on the operator router')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const out: { code: number; payload: Row } = { code: 200, payload: {} }
  const fakeRes = {
    status(c: number) { out.code = c; return fakeRes },
    json(p: Row) { out.payload = p; return fakeRes },
  }
  await handler(
    { params: { clientId }, headers: adminKey ? { 'x-admin-key': adminKey } : {}, body: {}, query: {} },
    fakeRes, () => {},
  )
  return out
}

/** A client row with the three columns the predicates read. */
const client = (o: Partial<{
  proof_passes_done: number | null
  proof_passes_legacy: number | null
  proof_calibrated_restart_used_at: string | null
}>): Row => ({
  id: 'c1',
  phone: null, contact_name: null,
  proof_review_requested_at: null, proof_review_resolved_at: null,
  proof_escalation_trigger: null, proof_phone_confirmed_at: null, proof_calibration_note: null,
  proof_calibrated_restart_at: null, proof_calibration_resolved_by: null,
  proof_refinement_text: null, proof_refinement_proposed_at: null, proof_refinement_confirmed_at: null,
  proof_completed_at: null,
  proof_passes_done: 0, proof_passes_legacy: null, proof_calibrated_restart_used_at: null,
  ...o,
})

const data = (r: { payload: Row }) => r.payload.data as Row

beforeEach(() => {
  vi.resetModules()
  state.client = client({})
  state.claims = []
  state.writes = []
  state.failTable = null
  rpcCalls.length = 0
  process.env.ADMIN_SECRET_KEY = ADMIN
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('§7 A–D · legacy_passes_classification_required', () => {
  it('A · legacy NULL + one pass done → REQUIRED', async () => {
    state.client = client({ proof_passes_legacy: null, proof_passes_done: 1 })
    const r = await evidence('c1')
    expect(r.code).toBe(200)
    expect(data(r).legacy_passes_classification_required).toBe(true)
  })

  it('B · legacy NULL + two passes done → REQUIRED', async () => {
    state.client = client({ proof_passes_legacy: null, proof_passes_done: 2 })
    expect(data(await evidence('c1')).legacy_passes_classification_required).toBe(true)
  })

  it('🛑 C · legacy NULL + ZERO passes done → NOT required (and nothing is written)', async () => {
    // The RPC auto-classifies this client to 0 as a side effect of CLAIMING. A read must reach
    // the same CONCLUSION without the write.
    state.client = client({ proof_passes_legacy: null, proof_passes_done: 0 })
    expect(data(await evidence('c1')).legacy_passes_classification_required).toBe(false)
    expect(state.writes, 'the evidence GET classified a client by being loaded').toEqual([])
  })

  it('C2 · a NULL counter coalesces to 0, exactly as the RPC does → NOT required', async () => {
    state.client = client({ proof_passes_legacy: null, proof_passes_done: null })
    expect(data(await evidence('c1')).legacy_passes_classification_required).toBe(false)
  })

  it('🛑 D · an ALREADY-CLASSIFIED client is never asked again — 0, 1 and 2 all read false', async () => {
    for (const legacy of [0, 1, 2]) {
      for (const done of [0, 1, 2]) {
        state.client = client({ proof_passes_legacy: legacy, proof_passes_done: done })
        const v = data(await evidence('c1')).legacy_passes_classification_required
        expect(v, `legacy=${legacy} done=${done} asked for classification again`).toBe(false)
      }
    }
  })

  it('D2 · `legacy_passes_classified_as` reports the persisted column, null when unclassified', async () => {
    state.client = client({ proof_passes_legacy: null, proof_passes_done: 1 })
    expect(data(await evidence('c1')).legacy_passes_classified_as).toBeNull()
    state.client = client({ proof_passes_legacy: 2, proof_passes_done: 2 })
    expect(data(await evidence('c1')).legacy_passes_classified_as).toBe(2)
  })
})

describe('§7 E–G · legacy_restart_classification_required', () => {
  it('🛑 E · restart SPENT + no calibrated_restart ledger row → REQUIRED', async () => {
    state.client = client({
      proof_passes_legacy: 2, proof_passes_done: 2,
      proof_calibrated_restart_used_at: '2026-09-01T10:00:00.000Z',
    })
    state.claims = []
    expect(data(await evidence('c1')).legacy_restart_classification_required).toBe(true)
  })

  it('🛑 F · restart SPENT + a canonical calibrated_restart row exists → NOT required', async () => {
    state.client = client({
      proof_passes_legacy: 2, proof_passes_done: 2,
      proof_calibrated_restart_used_at: '2026-09-01T10:00:00.000Z',
    })
    state.claims = [{ id: 'k1', client_id: 'c1', authority: 'calibrated_restart', status: 'completed' }]
    expect(data(await evidence('c1')).legacy_restart_classification_required).toBe(false)
  })

  it('🛑 F2 · ANY status counts, exactly as the RPC’s `not exists` does', async () => {
    // The RPC's ③ tests only `authority = 'calibrated_restart'` — it does not filter on status.
    // A released classification is still a classification, and asking again would let one
    // client be classified twice.
    for (const status of ['open', 'completed', 'released']) {
      state.client = client({
        proof_passes_legacy: 2, proof_passes_done: 2,
        proof_calibrated_restart_used_at: '2026-09-01T10:00:00.000Z',
      })
      state.claims = [{ id: 'k1', client_id: 'c1', authority: 'calibrated_restart', status }]
      const v = data(await evidence('c1')).legacy_restart_classification_required
      expect(v, `a '${status}' calibrated_restart row was ignored`).toBe(false)
    }
  })

  it('F3 · an AUTOMATIC claim row does not satisfy the restart predicate', async () => {
    state.client = client({
      proof_passes_legacy: 2, proof_passes_done: 2,
      proof_calibrated_restart_used_at: '2026-09-01T10:00:00.000Z',
    })
    state.claims = [{ id: 'k1', client_id: 'c1', authority: 'automatic_1', status: 'completed' }]
    expect(data(await evidence('c1')).legacy_restart_classification_required).toBe(true)
  })

  it('G · no restart ever spent → NOT required, whatever the ledger holds', async () => {
    state.client = client({ proof_passes_legacy: 2, proof_passes_done: 2, proof_calibrated_restart_used_at: null })
    state.claims = []
    expect(data(await evidence('c1')).legacy_restart_classification_required).toBe(false)
    state.claims = [{ id: 'k1', client_id: 'c1', authority: 'calibrated_restart', status: 'completed' }]
    expect(data(await evidence('c1')).legacy_restart_classification_required).toBe(false)
  })
})

describe('🛑 §6 · the two classifications are independent — all four combinations', () => {
  const RESTART_SPENT = '2026-09-01T10:00:00.000Z'
  const CASES: Array<[string, Row, Row[], boolean, boolean]> = [
    ['true / true',   { proof_passes_legacy: null, proof_passes_done: 2, proof_calibrated_restart_used_at: RESTART_SPENT }, [], true,  true],
    ['true / false',  { proof_passes_legacy: null, proof_passes_done: 2, proof_calibrated_restart_used_at: RESTART_SPENT },
                      [{ id: 'k1', client_id: 'c1', authority: 'calibrated_restart', status: 'completed' }], true, false],
    ['false / true',  { proof_passes_legacy: 2,    proof_passes_done: 2, proof_calibrated_restart_used_at: RESTART_SPENT }, [], false, true],
    ['false / false', { proof_passes_legacy: 2,    proof_passes_done: 2, proof_calibrated_restart_used_at: null },          [], false, false],
  ]

  for (const [label, row, claims, passes, restart] of CASES) {
    it(`${label} — passes=${passes} restart=${restart}`, async () => {
      state.client = client(row)
      state.claims = claims
      const d = data(await evidence('c1'))
      expect(d.legacy_passes_classification_required, `${label}: passes`).toBe(passes)
      expect(d.legacy_restart_classification_required, `${label}: restart`).toBe(restart)
    })
  }

  it('🛑 the passes answer never suppresses the restart answer', async () => {
    // The RPC returns `unclassified` FIRST and never reaches its restart branch for such a
    // client. That is correct for a claim and useless for an operator, so the read reports both
    // — and this is the test that stops the reporting order leaking back in as a semantic.
    state.client = client({
      proof_passes_legacy: null, proof_passes_done: 2,
      proof_calibrated_restart_used_at: '2026-09-01T10:00:00.000Z',
    })
    state.claims = []
    const d = data(await evidence('c1'))
    expect(d.legacy_passes_classification_required).toBe(true)
    expect(d.legacy_restart_classification_required).toBe(true)
  })
})

describe('🛑 §2 · the GET is read-only, and stays protected', () => {
  it('H · loading performs ZERO writes, in every state', async () => {
    for (const row of [
      { proof_passes_legacy: null, proof_passes_done: 0 },
      { proof_passes_legacy: null, proof_passes_done: 2 },
      { proof_passes_legacy: 1,    proof_passes_done: 2, proof_calibrated_restart_used_at: '2026-09-01T10:00:00.000Z' },
    ]) {
      state.client = client(row)
      state.claims = []
      state.writes = []
      await evidence('c1')
      expect(state.writes, `a write escaped for ${JSON.stringify(row)}`).toEqual([])
    }
  })

  it('🛑 H2 · loading calls NO rpc — it cannot claim, settle or classify', async () => {
    state.client = client({ proof_passes_legacy: null, proof_passes_done: 2 })
    await evidence('c1')
    expect(rpcCalls, `the read invoked an RPC: ${rpcCalls.join(', ')}`).toEqual([])
  })

  it('H3 · loading it ten times still writes nothing', async () => {
    state.client = client({ proof_passes_legacy: null, proof_passes_done: 1 })
    for (let i = 0; i < 10; i++) await evidence('c1')
    expect(state.writes).toEqual([])
    // …and the answer is stable, because nothing it did changed the answer.
    expect(data(await evidence('c1')).legacy_passes_classification_required).toBe(true)
  })

  it('I · a missing admin key is refused exactly as before — and reads nothing', async () => {
    state.client = client({ proof_passes_legacy: null, proof_passes_done: 2 })
    const r = await evidence('c1', null)
    expect(r.code).toBe(403)
    expect(r.payload.error).toBe('Operator key required')
    expect(r.payload.data).toBeUndefined()
    expect(state.writes).toEqual([])
  })

  it('I2 · a WRONG admin key is refused', async () => {
    const r = await evidence('c1', 'not-the-key')
    expect(r.code).toBe(403)
    expect(r.payload.data).toBeUndefined()
  })

  it('🛑 an unreadable ledger REFUSES — "we could not tell" never renders as "nothing to do"', async () => {
    state.client = client({ proof_passes_legacy: 2, proof_passes_done: 2, proof_calibrated_restart_used_at: '2026-09-01T10:00:00.000Z' })
    state.failTable = 'proof_pass_claims'
    const r = await evidence('c1')
    expect(r.code).toBe(500)
    expect(r.payload.success).toBe(false)
    // No booleans at all, rather than two false ones.
    expect(r.payload.data).toBeUndefined()
  })
})
