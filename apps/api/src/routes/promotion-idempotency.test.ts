import { describe, it, expect, vi, beforeEach } from 'vitest'

// ⛓️ 12 Sep (S2-AUDIT-001) — RETARGETED, NOT WEAKENED. Every assertion below keeps its
// exact meaning; only the NAME of the claim changed. `try_claim_proof_pass` incremented a
// counter nothing could release, so a run that crashed at the PDL boundary consumed the
// client's pass and left them with nothing. Authority now comes from the durable claim
// ledger (`claim_proof_authority` -> `proof_pass_claims`), which can give it back. The old
// RPC is retained in the database for rollback and has ZERO live callers
// (`proof-authority-bypass.test.ts` asserts that, and it is what keeps it dead).

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ MVP1 — PROMOTION SURVIVES A DOUBLE CLICK, AND A RETRY NEVER REPLAYS A STALE BRIEF.
//
// 🛑 PROMOTION IS THREE CALLS THE BROWSER MAKES IN ORDER, and that is what makes this hard:
//     ① POST /auth/onboard      creates the client
//     ② POST /icps              creates the canonical ICP
//     ③ POST /icps/:id/proof    starts Proof
// A double click, a retry after an ambiguous response, or a back-button re-submit replays all
// three. Only the first was safe on its own — `clients.user_id` is unique, so a second call
// updates the one client.
//
// ⚠️ THE ICP LEG *LOOKED* SAFE AND WAS NOT. `saveClientTargeting` keeps ONE core ICP and
// updates it, so no second row is created — but the replay carries the ONBOARDING-DRAFT
// snapshot, so it OVERWRITES whatever the confirmed ICP has legitimately become since: the
// client's own later refinement, an operator's correction. No duplicate, and the truth is
// still lost. That is the founder's scenario 22 and it is the reason for this file.
//
// ⚠️ THE PROOF LEG WAS NOT SAFE EITHER. `try_claim_proof_pass` is ATOMIC, which is not the
// same as idempotent: it guarantees one claimant per race, and does nothing to stop a
// double-clicked promotion claiming pass 1 and then pass 2. The client would be two free
// passes down before looking at the first batch, and pass 2 is the one the refinement journey
// needs.
//
// ⚠️ EVERY CASE HERE DRIVES THE REAL HANDLER. The lesson this repo keeps relearning is that a
// helper can be right and the route can call it wrong.
// ═══════════════════════════════════════════════════════════════════════════════════════

type Row = Record<string, unknown>

const state = {
  /** the caller's client row, or null */
  client: null as Row | null,
  /** the client's ICP rows */
  icps: [] as Row[],
  /** every write this test round observed, so "wrote nothing" is an assertion, not a hope */
  writes: [] as { table: string; op: 'insert' | 'update' | 'upsert'; patch: Row }[],
  /** every RPC the handler called — `try_claim_proof_pass` must appear exactly when intended */
  rpcs: [] as string[],
}

function query(table: string) {
  const filters: ((r: Row) => boolean)[] = []
  const rows = (): Row[] => table === 'icps' ? state.icps
    : table === 'clients' ? (state.client ? [state.client] : [])
    : []   // leads / lead_feedback / credit_transactions: empty, which is a first-run client
  const q: Record<string, unknown> = {
    select() { return q },
    eq(c: string, v: unknown) { filters.push(r => r[c] === v); return q },
    is(c: string, v: unknown) { filters.push(r => (r[c] ?? null) === v); return q },
    // ⚑ 11 Sep — the proof route reads the calibration state before it claims, and
    // `readAttempts` filters `leads` with `.not('proof_pass', 'is', null)`. Without this the
    // fake throws, `readCalibration` fails, and the route's C43 fail-safe correctly refuses —
    // i.e. the missing method would look exactly like a product defect.
    not(c: string, _op: string, v: unknown) { filters.push(r => (r[c] ?? null) !== v); return q },
    or() { return q },
    order() { return q },
    limit() { return q },
    async single() { const h = rows().filter(r => filters.every(f => f(r))); return { data: h[0] ?? null, error: null } },
    async maybeSingle() { const h = rows().filter(r => filters.every(f => f(r))); return { data: h[0] ?? null, error: null } },
    insert(patch: Row) {
      state.writes.push({ table, op: 'insert', patch })
      const made = { id: `${table}-new`, ...patch }
      if (table === 'icps') state.icps.push(made)
      return {
        select: () => ({ async single() { return { data: made, error: null } },
                         async maybeSingle() { return { data: made, error: null } } }),
        then: (r: (v: unknown) => unknown) => r({ data: made, error: null }),
      }
    },
    upsert(patch: Row) {
      state.writes.push({ table, op: 'upsert', patch })
      return { then: (r: (v: unknown) => unknown) => r({ data: null, error: null }) }
    },
    update(patch: Row) {
      state.writes.push({ table, op: 'update', patch })
      const u: Record<string, unknown> = {
        eq() { return u }, is() { return u }, select() { return u },
        async single() { return { data: { ...(rows()[0] ?? {}), ...patch }, error: null } },
        async maybeSingle() { return { data: { ...(rows()[0] ?? {}), ...patch }, error: null } },
        then: (r: (v: unknown) => unknown) => r({ error: null }),
      }
      return u
    },
    then(resolve: (v: unknown) => unknown) {
      return resolve({ data: rows().filter(r => filters.every(f => f(r))), error: null })
    },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => query(t),
    rpc: async (name: string) => { state.rpcs.push(name); return { data: 1, error: null } },
    auth: { getUser: async () => ({ data: { user: { id: 'user-1', email: 'e@t.test' } }, error: null }) },
  },
}))
vi.mock('../middleware/auth', () => ({
  requireAuth: (_q: unknown, _s: unknown, next: () => void) => next(),
}))

async function call(path: string, method: 'post', body: Row, params: Row = {}) {
  const { icpRouter } = await import('./icps')
  const layer = (icpRouter as unknown as {
    stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>
  }).stack.find(l => l.route?.path === path && l.route?.methods[method])
  if (!layer?.route) throw new Error(`${method.toUpperCase()} ${path} not found on the icp router`)
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const out: { code: number; payload: Row } = { code: 200, payload: {} }
  const fakeRes = {
    status(c: number) { out.code = c; return fakeRes },
    json(p: Row) { out.payload = p; return fakeRes },
  }
  await handler({ body, headers: {}, params, query: {}, userId: 'user-1' }, fakeRes, () => {})
  return out
}

/** The ICP the onboarding confirmation posts — the client's own words, from the draft. */
const FROM_DRAFT = {
  name: 'Digital marketing agencies — UK',
  target_category: 'Digital marketing agencies',
  target_company_type: 'agency',
  industries: ['Marketing and Advertising'],
  job_titles: ['Managing Director'],
  seniority_levels: ['C-Suite'],
  company_sizes: ['11–50'],
  geographies: ['United Kingdom'],
  tech_stack: [],
  keywords: [],
  from_brief_draft: true,
}

/** The core ICP as it exists AFTER promotion — and after it has legitimately moved on. */
const NEWER_TRUTH = {
  id: 'icp-1', client_id: 'client-1', is_active: true, pending_targeting: null,
  pending_campaign_intent: null,
  name: 'Healthcare businesses — UK',
  target_category: 'Healthcare businesses',
  target_company_type: 'clinic',
  industries: ['Hospital & Health Care'], geographies: ['United Kingdom'],
  job_titles: ['Practice Manager'], seniority_levels: ['Director'],
  company_sizes: ['11–50'], tech_stack: [], keywords: [],
}

const icpWrites = () => state.writes.filter(w => w.table === 'icps')

beforeEach(() => {
  state.client = { id: 'client-1', user_id: 'user-1', proof_passes_done: 0, credit_balance: 0 }
  state.icps = []
  state.writes = []
  state.rpcs = []
  process.env.ANTHROPIC_API_KEY = 'test-key-not-a-real-one'
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑦ 20 · a retried promotion cannot create or replace the canonical ICP', () => {
  it('1 · the FIRST onboarding save creates the core ICP', async () => {
    const r = await call('/', 'post', FROM_DRAFT)
    expect(r.code).toBe(201)
    expect(icpWrites().filter(w => w.op === 'insert')).toHaveLength(1)
  })

  it('2 · 🛑 the SECOND, identical save writes nothing at all', async () => {
    await call('/', 'post', FROM_DRAFT)
    state.writes = []
    const r = await call('/', 'post', FROM_DRAFT)
    expect(r.code).toBe(200)
    expect(r.payload.replayed).toBe(true)
    expect(icpWrites(), 'a replayed promotion touched the ICP').toEqual([])
  })

  it('3 · and there is still exactly ONE ICP row', async () => {
    await call('/', 'post', FROM_DRAFT)
    await call('/', 'post', FROM_DRAFT)
    await call('/', 'post', FROM_DRAFT)
    expect(state.icps).toHaveLength(1)
  })

  // ── 🛑 22 · THE STRONGER RULE: A STALE RETRY MUST NOT REPLAY OVER NEWER TRUTH ────────
  it('4 · 🛑 a stale retry cannot overwrite an ICP that has legitimately moved on', async () => {
    // Promotion succeeded some time ago; the targeting has since become something else.
    state.icps = [NEWER_TRUTH]
    const r = await call('/', 'post', FROM_DRAFT)
    expect(r.code).toBe(200)
    expect(icpWrites(), 'the old draft snapshot was written over confirmed truth').toEqual([])
    expect(state.icps[0].target_category).toBe('Healthcare businesses')
    expect(state.icps[0].target_company_type).toBe('clinic')
  })

  it('5 · and the reply hands back the CURRENT truth, with nothing parked for review', async () => {
    state.icps = [NEWER_TRUTH]
    const r = await call('/', 'post', FROM_DRAFT)
    expect((r.payload.data as Row).target_category).toBe('Healthcare businesses')
    // ⚠️ THE `pending_targeting` HALF IS THE POINT, and asserting only the returned row was
    // not enough: with the guard removed, a LIVE client's replay is PARKED rather than
    // applied, so the live columns still read "Healthcare businesses" and this case stayed
    // green while a revision nobody asked for sat waiting for K.I.N.D to approve it.
    expect(icpWrites().filter(w => 'pending_targeting' in w.patch),
      'a replayed promotion parked a stale revision for review').toEqual([])
    expect(r.payload.pending_review).toBeUndefined()
  })

  it('7 · 🛑 and it holds for a client whose ICP is NOT live — where a replay really lands', async () => {
    // ⚠️ A LIVE client's revision is parked; a non-live one is APPLIED to the live columns.
    // That is the case where a stale replay genuinely overwrites confirmed truth, so it is
    // asserted separately rather than assumed to behave like the branch above.
    state.icps = [{ ...NEWER_TRUTH, is_active: false }]
    const r = await call('/', 'post', FROM_DRAFT)
    expect(r.payload.replayed).toBe(true)
    expect(icpWrites(), 'the old draft snapshot was applied over confirmed truth').toEqual([])
    expect(state.icps[0].target_category).toBe('Healthcare businesses')
  })

  it('6 · an ORDINARY revision is untouched — this guard can refuse, never permit', async () => {
    state.icps = [NEWER_TRUTH]
    // No `from_brief_draft`: this is a client revising their own targeting, which is allowed.
    const { from_brief_draft: _drop, ...revision } = FROM_DRAFT
    const r = await call('/', 'post', revision)
    expect(r.payload.replayed).toBeUndefined()
    expect(icpWrites().length, 'a legitimate revision was refused').toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑦ 21 · a retried promotion cannot start Proof twice', () => {
  const PROOF = { from_brief_draft: true }

  it('1 · the first start reaches the claim', async () => {
    state.icps = [{ id: 'icp-1', client_id: 'client-1', is_active: true }]
    await call('/:id/proof', 'post', PROOF, { id: 'icp-1' })
    expect(state.rpcs).toContain('claim_proof_authority')
  })

  it('2 · 🛑 a replay claims NOTHING — the second free pass is not spent', async () => {
    state.icps = [{ id: 'icp-1', client_id: 'client-1', is_active: true }]
    // The first claim landed: the RPC increments this very column.
    state.client = { ...state.client!, proof_passes_done: 1 }
    state.rpcs = []
    const r = await call('/:id/proof', 'post', PROOF, { id: 'icp-1' })
    expect(r.code).toBe(200)
    expect(r.payload.data).toEqual({ already_started: true })
    expect(state.rpcs, 'a replayed promotion claimed a second proof pass').toEqual([])
  })

  it('3 · the refinement journey’s legitimate second pass is untouched', async () => {
    state.icps = [{ id: 'icp-1', client_id: 'client-1', is_active: true }]
    state.client = { ...state.client!, proof_passes_done: 1 }
    state.rpcs = []
    // No `from_brief_draft` — this is the refinement path, not a replayed promotion.
    await call('/:id/proof', 'post', {}, { id: 'icp-1' })
    expect(state.rpcs).toContain('claim_proof_authority')
  })

  it('4 · 🛑 14 · Proof never starts for somebody who has no client at all', async () => {
    state.client = null
    const r = await call('/:id/proof', 'post', PROOF, { id: 'icp-1' })
    expect(r.code).toBe(404)
    expect(state.rpcs).toEqual([])
  })

  it('5 · and never against an ICP that is not theirs', async () => {
    state.icps = [{ id: 'icp-1', client_id: 'somebody-else', is_active: true }]
    const r = await call('/:id/proof', 'post', PROOF, { id: 'icp-1' })
    expect(r.code).toBe(404)
    expect(state.rpcs).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ MVP1 — WHAT THE CLIENT CONFIRMED IS WHAT GETS STORED, WORD FOR WORD.
//
// 🛑 THE FAILURE THIS GUARDS AGAINST IS SILENT. A promotion that "worked" but tidied the
// client's own words into a provider label, or filled a fact they never gave from a website
// read or a default, produces an account that looks complete and targets somebody else. The
// founder's rule: nothing is filled in on the client's behalf, and the category is theirs.
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('⑨ 10 · 11 · the confirmed brief reaches the ICP exactly as the client gave it', () => {
  const inserted = () => (icpWrites().find(w => w.op === 'insert')?.patch ?? {}) as Row

  it('🛑 10 · target_category survives verbatim — their words, not a taxonomy', async () => {
    await call('/', 'post', FROM_DRAFT)
    expect(inserted().target_category).toBe('Digital marketing agencies')
  })

  it('🛑 11 · target_company_type survives', async () => {
    await call('/', 'post', FROM_DRAFT)
    expect(inserted().target_company_type).toBe('agency')
  })

  it('the provider-edge hint rides ALONGSIDE the category, never instead of it', async () => {
    await call('/', 'post', FROM_DRAFT)
    expect(inserted().industries).toEqual(['Marketing and Advertising'])
    expect(inserted().target_category).toBe('Digital marketing agencies')
  })

  it('geography, roles and size are carried as given', async () => {
    await call('/', 'post', FROM_DRAFT)
    expect(inserted().geographies).toEqual(['United Kingdom'])
    expect(inserted().job_titles).toEqual(['Managing Director'])
    expect(inserted().company_sizes).toEqual(['11–50'])
  })

  it('🛑 nothing is invented for a fact the client did not give', async () => {
    // A brief that established the category and NOT the organisational form. The column must
    // read empty — never guessed from the category, the website or a default.
    const { target_company_type: _none, ...short } = FROM_DRAFT
    await call('/', 'post', short)
    expect(inserted().target_company_type, 'a company type was invented').toBe('')
  })
})
