// ═══════════════════════════════════════════════════════════════════════════
// POST /icps/revise — WHO MAY APPLY A REVISION TO THE LIVE COLUMNS.
//
// THE DEFECT THIS FILE EXISTS FOR, and it was found by literal review rather than by any
// test. `icps.is_active` DEFAULTS TO TRUE at the database and `icpSchema` carries no such
// field, so the insert in `saveClientTargeting` omits it — which means a Milla-created
// PROSPECT's ICP is "live" in exactly the same way a paying client's is.
//
// The `isLive` branch then parked their confirmed refinement in `pending_targeting` and never
// touched the live columns. `runIcpJob` reads the live columns. So a free-proof prospect could
// press "these aren't right", describe what was wrong, confirm, SPEND THEIR SECOND AND LAST
// PASS — and be shown another batch sourced from pass 1's targeting. The same-ICP guard
// passed the whole way through, because it genuinely is the same row.
//
// ⚠️ EVERY TEST HERE IS BEHAVIOURAL, THROUGH THE REAL EXPRESS HANDLER. A source assertion
// cannot tell "wrote pending_targeting" from "wrote the targeting", and that distinction is
// the entire bug. What is asserted is the literal `.update()` payload the route produces.
//
// Mocks only. No provider, no database, no network.
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>

const state = {
  /** The client's one ICP. `is_active` is what the founder-locked hold rule turns on. */
  icp: { id: 'icp-1', name: 'My targeting', is_active: true } as Row | null,
  /** Rows in credit_transactions — a purchase here makes `fundedVia` non-null. */
  funding: [] as Row[],
  /** clients.proof_passes_done — the SAME column try_claim_proof_pass increments. */
  passes: 1 as number,
  /** Every `.update()` the route issued against `icps`. */
  icpUpdates: [] as Row[],
}

function query(table: string) {
  const q: Record<string, unknown> = {
    select() { return q },
    eq() { return q }, in() { return q }, is() { return q }, neq() { return q },
    not() { return q }, order() { return q }, limit() { return q },
    async maybeSingle() {
      if (table === 'clients') return { data: { id: 'c1', proof_passes_done: state.passes, company_name: 'Acme' }, error: null }
      if (table === 'icps') return { data: state.icp, error: null }
      return { data: null, error: null }
    },
    async single() { return { data: state.icp, error: null } },
    update(patch: Row) {
      if (table === 'icps') state.icpUpdates.push(patch)
      const done = { data: { ...(state.icp ?? {}), ...patch }, error: null }
      const chain: Record<string, unknown> = {
        eq() { return chain },
        select() { return chain },
        async single() { return done },
        async maybeSingle() { return done },
        then(r: (v: unknown) => unknown) { return r(done) },
      }
      return chain
    },
    insert() {
      const done = { data: { ...(state.icp ?? {}) }, error: null }
      const chain: Record<string, unknown> = {
        select() { return chain },
        async single() { return done },
        then(r: (v: unknown) => unknown) { return r(done) },
      }
      return chain
    },
    then(resolve: (v: { data: Row[]; error: null }) => unknown) {
      if (table === 'credit_transactions') return resolve({ data: state.funding, error: null })
      return resolve({ data: [], error: null })
    },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: { from: (t: string) => query(t), rpc: async () => ({ data: null, error: null }),
        auth: { admin: { getUserById: async () => ({ data: { user: { email: '' } } }) } } },
}))
// Everything the route fires alongside the save. None of it is what this file tests, and all
// of it is already fire-and-forget in the route — stubbed so a mock gap cannot fail a save.
vi.mock('../lib/start-work', async (orig) => ({
  ...(await orig() as Row), ensureCampaignForIcp: async () => undefined,
}))
vi.mock('../lib/founder-alert', () => ({ sendFounderAlert: async () => undefined }))
// `middleware/auth` builds a real Supabase client at import time and there is no URL in a
// test env. The handler is invoked directly below, so the middleware never runs anyway.
vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _s: unknown, n: () => void) => n() }))

/** Whatever `/icps/chat-build`'s model call should answer with, verbatim. */
const modelBox = { text: '{}' }
vi.mock('@anthropic-ai/sdk', () => ({
  default: class FakeAnthropic {
    messages = { create: async () => ({ content: [{ type: 'text', text: modelBox.text }] }) }
  },
}))

const TARGETING = (over: Row = {}) => ({
  name: 'My targeting',
  industries: ['SaaS'], job_titles: ['CTO'], seniority_levels: ['C-Suite'],
  company_sizes: ['11–50'], geographies: ['United States'],
  tech_stack: [], keywords: [],
  ...over,
})

async function callRevise(body: Row) {
  const { icpRouter } = await import('./icps')
  const layer = (icpRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }> })
    .stack.find(l => l.route?.path === '/revise' && l.route?.methods.post)
  if (!layer?.route) throw new Error('POST /revise not found on the icp router')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const out: { code: number; payload: Row } = { code: 200, payload: {} }
  const res = {
    status(c: number) { out.code = c; return res },
    json(p: Row) { out.payload = p; return res },
  }
  await handler({ body, headers: {}, params: {}, query: {}, userId: 'u1' }, res, () => {})
  return out
}

async function callChatBuild(modelJson: unknown) {
  modelBox.text = typeof modelJson === 'string' ? modelJson : JSON.stringify(modelJson)
  const { icpRouter } = await import('./icps')
  const layer = (icpRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }> })
    .stack.find(l => l.route?.path === '/chat-build' && l.route?.methods.post)
  if (!layer?.route) throw new Error('POST /chat-build not found on the icp router')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const out: { code: number; payload: Row } = { code: 200, payload: {} }
  const res = {
    status(c: number) { out.code = c; return res },
    json(p: Row) { out.payload = p; return res },
  }
  await handler({ body: { message: 'any industry please' }, headers: {}, params: {}, query: {}, userId: 'u1' }, res, () => {})
  return (out.payload.data ?? {}) as Row
}

/** The single `.update()` the route made against `icps`. */
const patch = () => {
  expect(state.icpUpdates, 'exactly one icps update').toHaveLength(1)
  return state.icpUpdates[0]
}
/** HELD = parked for K.I.N.D review. APPLIED = the live targeting columns actually moved. */
const wasHeld    = () => 'pending_targeting' in patch()
const wasApplied = () => 'industries' in patch() && !('pending_targeting' in patch())

beforeEach(() => {
  vi.resetModules()
  state.icp = { id: 'icp-1', name: 'My targeting', is_active: true }
  state.funding = []
  state.passes = 1
  state.icpUpdates = []
})

describe('free-proof refinement applies immediately — and only it does', () => {
  it('1 · an unpaid prospect at pass 1 UPDATES THE LIVE TARGETING of the same ICP', async () => {
    const r = await callRevise({ ...TARGETING({ industries: ['Fintech'] }), proof_refinement: true })
    expect(r.code, '/revise answers 201 on success').toBe(201)
    expect(wasApplied(), 'the live columns moved').toBe(true)
    expect(patch().industries).toEqual(['Fintech'])
    // The SAME row — a revision must never mint a second ICP for pass 2 to run against.
    expect((r.payload.data as Row)?.id).toBe('icp-1')
    // …and the desk's own same-ICP check reads this, so it must say the save landed live.
    expect(r.payload.pending_review, 'not parked for review').toBe(false)
  })

  it('2 · …and does NOT write only pending_targeting', async () => {
    await callRevise({ ...TARGETING({ industries: ['Fintech'] }), proof_refinement: true })
    expect(wasHeld(), 'nothing was parked for review').toBe(false)
    expect(patch()).not.toHaveProperty('pending_submitted_at')
  })

  it('3 · a PAYING client\'s revision still waits for K.I.N.D — the 22 Aug lock is untouched', async () => {
    // A real purchase. `fundedVia` reads exactly this ledger, so this is the same test the
    // proof route itself applies — not a second notion of paid-ness.
    state.funding = [{ type: 'purchase', reference: 'pi_live_1' }]
    state.passes = 1
    await callRevise({ ...TARGETING({ industries: ['Fintech'] }), proof_refinement: true })
    expect(wasHeld(), 'a funded client is still HELD even asking for the exception').toBe(true)
    expect(patch()).not.toHaveProperty('industries')
  })

  it('4 · the request flag ALONE cannot bypass the rule', async () => {
    // Funded AND at pass 1 AND shouting the flag: still held. The flag is a declaration of
    // intent; the permission is read from the server's own tables and nowhere else.
    state.funding = [{ type: 'purchase', reference: 'pi_live_1' }]
    await callRevise({ ...TARGETING(), proof_refinement: true, apply_now: true, force: true, is_proof: true })
    expect(wasHeld()).toBe(true)
  })

  it('5 · proof_passes_done = 0 cannot use the immediate apply', async () => {
    state.passes = 0
    await callRevise({ ...TARGETING(), proof_refinement: true })
    expect(wasHeld(), 'nothing to refine before pass 1 exists').toBe(true)
  })

  it('6 · proof_passes_done >= 2 cannot use the immediate apply', async () => {
    state.passes = 2
    await callRevise({ ...TARGETING(), proof_refinement: true })
    expect(wasHeld(), 'both passes spent — a human takes over, not another apply').toBe(true)
    state.icpUpdates = []
    state.passes = 7
    await callRevise({ ...TARGETING(), proof_refinement: true })
    expect(wasHeld()).toBe(true)
  })

  it('a NORMAL revision — no flag at all — behaves exactly as it did before this build', async () => {
    await callRevise(TARGETING({ industries: ['Fintech'] }))
    expect(wasHeld(), 'live ICP, no exception asked for → parked, as today').toBe(true)
  })

  it('an INACTIVE ICP still applies directly, exactly as it did before this build', async () => {
    state.icp = { id: 'icp-1', name: 'My targeting', is_active: false }
    await callRevise(TARGETING({ industries: ['Fintech'] }))
    expect(wasApplied(), 'never-live ICPs were always applied in place').toBe(true)
  })

  it('the exception writes the CLIENT\'S OWN five fields, and nothing commercial', async () => {
    await callRevise({
      ...TARGETING({ industries: [] }),
      proof_refinement: true,
      // Every one of these is ignored: icpSchema strips unknown keys, so a hand-built body
      // cannot reach a column the client has no business writing.
      wallet_balance_usd: 999_999, proof_passes_done: 0, is_active: false, client_id: 'someone-else',
    })
    const p = patch()
    expect(p.industries).toEqual([])                       // an explicit clear survives the round trip
    expect(p).not.toHaveProperty('wallet_balance_usd')
    expect(p).not.toHaveProperty('proof_passes_done')
    expect(p).not.toHaveProperty('is_active')
    expect(p).not.toHaveProperty('client_id')
  })
})

// ── `clear_fields` — THE ONLY WAY TO SAY "REMOVE THIS FILTER" (founder-ruled 25 Aug) ──────
//
// `[]` has always meant "not enough information yet" — the prompt says so in those words —
// so it could never ALSO mean "remove this filter". A prospect saying *"any industry, I
// don't care"* produced an empty `industries`, the merge correctly PRESERVED it, and the
// filter they asked us to delete survived. Two intentions, one representation.
//
// ⚠️ THE ALLOWLIST IS ENFORCED ON THE SERVER, FAIL-CLOSED. The model is asked for field
// names and can return anything at all. Everything outside the five clearable filters is
// DROPPED, so the worst a bad response can do is clear nothing.
describe('/icps/chat-build exposes an explicit, allowlisted clear_fields', () => {
  it('9/10 · an explicit clear survives for industries and company_sizes', async () => {
    const d = await callChatBuild({ message: 'ok', clear_fields: ['industries', 'company_sizes'] })
    expect(d.clear_fields).toEqual(['industries', 'company_sizes'])
  })

  it('all five clearable filters are permitted, and only those five', async () => {
    const d = await callChatBuild({ clear_fields: ['job_titles', 'seniority_levels', 'industries', 'company_sizes', 'geographies'] })
    expect(d.clear_fields).toHaveLength(5)
  })

  it('11 · anything outside the five is STRIPPED — fail closed, never echoed back', async () => {
    const d = await callChatBuild({
      clear_fields: ['industries', 'wallet_balance_usd', 'is_active', 'client_id', 'DROP TABLE leads', '', 42, null, { k: 1 }],
    })
    expect(d.clear_fields, 'only the legitimate one survives').toEqual(['industries'])
  })

  it('12 · name, tech_stack and keywords can NEVER be cleared by this flow', async () => {
    const d = await callChatBuild({ clear_fields: ['name', 'tech_stack', 'keywords'] })
    expect(d.clear_fields, 'all three refused').toEqual([])
  })

  it('a non-array, a missing field and unparseable prose all become [] — never undefined', async () => {
    expect((await callChatBuild({ clear_fields: 'industries' })).clear_fields).toEqual([])
    expect((await callChatBuild({ message: 'hi' })).clear_fields).toEqual([])
    expect((await callChatBuild('not json at all')).clear_fields).toEqual([])
  })

  it('the prompt tells the model what [] means, and what clear_fields is for', () => {
    const src = readFileSync(join(__dirname, './icps.ts'), 'utf8')
    // The old sentence STAYS — `[]` still means "not enough info". That is what makes a
    // separate signal necessary, so a build that deleted it would have changed the meaning
    // of every empty array in the system.
    expect(src).toContain("Leave arrays empty [] if not enough info yet.")
    expect(src).toContain('It is NOT a request to remove a filter.')
    expect(src).toContain('"clear_fields": array — ONLY for filters the user EXPLICITLY asked to remove or broaden')
  })
})

// ── ⚑ 25 Aug — A WAITING REVISION IS A CONFLICT, NOT AN ORDINARY EDIT (founder-ruled) ────
//
// The eligibility rule checked funding and the pass count but never asked whether the SAME
// ICP already had a revision waiting for review. Without that question the exception simply
// would not apply — and the refinement would fall into the ordinary live-client branch,
// which OVERWRITES `pending_targeting`. A prospect confirming a batch refinement would have
// silently destroyed a targeting change they had already submitted and were waiting on us
// to look at, and would then have spent a proof pass on targeting that never went live.
//
// The founder's ruling is STOP / HUMAN: write nothing at all, keep both the live ICP and the
// waiting revision, answer 409, and let a person work out which one they meant.
describe('an existing pending_targeting stops the refinement dead', () => {
  const WAITING = { industries: ['Logistics'], job_titles: ['COO'] }

  it('1/2 · nothing is written — not the live columns, and not pending_targeting', async () => {
    state.icp = { id: 'icp-1', name: 'My targeting', is_active: true, pending_targeting: WAITING }
    await callRevise({ ...TARGETING({ industries: ['Fintech'] }), proof_refinement: true })
    // ⚠️ ZERO updates, not "an update that happened to be harmless". The route returns
    // BEFORE saveClientTargeting, so there is no write to inspect and nothing to undo.
    expect(state.icpUpdates, 'no icps write at all').toHaveLength(0)
  })

  it('3 · it answers 409 with the stable machine-readable code', async () => {
    state.icp = { id: 'icp-1', name: 'My targeting', is_active: true, pending_targeting: WAITING }
    const r = await callRevise({ ...TARGETING(), proof_refinement: true })
    expect(r.code).toBe(409)
    expect(r.payload.code).toBe('existing_pending_targeting')
    expect(r.payload.success).toBe(false)
    // 27 · the client-safe text must not claim a new search started.
    expect(String(r.payload.error)).toContain('no new search has started')
    expect(String(r.payload.error)).toMatch(/waiting for K\.I\.N\.D to review/)
  })

  it('5 · no client-supplied field can pretend the waiting revision is absent', async () => {
    state.icp = { id: 'icp-1', name: 'My targeting', is_active: true, pending_targeting: WAITING }
    // Every one of these is a lie the body is allowed to tell. The verdict reads the ICP row.
    const r = await callRevise({
      ...TARGETING(), proof_refinement: true,
      pending_targeting: null, pending_submitted_at: null,
      has_pending: false, ignore_pending: true, force: true,
    })
    expect(r.code).toBe(409)
    expect(state.icpUpdates).toHaveLength(0)
  })

  it('an EMPTY pending_targeting object still counts as waiting — only null is absent', async () => {
    state.icp = { id: 'icp-1', name: 'My targeting', is_active: true, pending_targeting: {} }
    const r = await callRevise({ ...TARGETING(), proof_refinement: true })
    expect(r.code, 'a submitted-but-empty revision is still a revision').toBe(409)
    expect(state.icpUpdates).toHaveLength(0)
  })

  it('6/7/8 · with NO waiting revision the exception still applies, same ICP, live', async () => {
    state.icp = { id: 'icp-1', name: 'My targeting', is_active: true, pending_targeting: null }
    const r = await callRevise({ ...TARGETING({ industries: ['Fintech'] }), proof_refinement: true })
    expect(r.code).toBe(201)
    expect(wasApplied()).toBe(true)
    expect((r.payload.data as Row)?.id, 'the SAME ICP').toBe('icp-1')
    expect(r.payload.pending_review, 'the desk fence reads this').toBe(false)
  })

  it('9/10 · a PAYING client with a waiting revision is UNAFFECTED — today\'s behaviour', async () => {
    // ⚠️ THE CONFLICT IS PROOF-ONLY. A funded client revising over their own waiting
    // revision has always overwritten it, and that is not this build's business to change.
    state.funding = [{ type: 'purchase', reference: 'pi_live_1' }]
    state.icp = { id: 'icp-1', name: 'My targeting', is_active: true, pending_targeting: WAITING }
    const r = await callRevise({ ...TARGETING({ industries: ['Fintech'] }), proof_refinement: true })
    expect(r.code, 'no 409 for a paying client').toBe(201)
    expect(wasHeld(), 'still parked for review, exactly as before').toBe(true)
    expect(patch().pending_targeting, 'and the new revision replaces the old, as today')
      .toMatchObject({ industries: ['Fintech'] })
  })

  it('an ordinary unflagged revision over a waiting revision is also unaffected', async () => {
    state.icp = { id: 'icp-1', name: 'My targeting', is_active: true, pending_targeting: WAITING }
    const r = await callRevise(TARGETING({ industries: ['Fintech'] }))
    expect(r.code).toBe(201)
    expect(wasHeld()).toBe(true)
  })

  it('the conflict check reads the SAME row the save writes — one selection, not two', () => {
    const src = readFileSync(join(__dirname, './icps.ts'), 'utf8')
    // ⚠️ A conflict check that selects its own ICP could inspect a different row than the
    // save touches, and would then report safety it never verified. Both go through one
    // helper, so they cannot drift apart.
    expect(src).toContain('async function coreIcpRow(clientId: string)')
    expect(src).toContain('const core = await coreIcpRow(clientId)')
    expect(src).toContain('await proofRefinementVerdict(clientId, req.body, await coreIcpRow(clientId))')
    expect((src.match(/const cols = 'id, name, is_active, pending_targeting'/g) ?? []),
      'one column list').toHaveLength(1)
    // 15 · NO PROVIDER ROUTING WAS TOUCHED. ⚠️ SCOPED TO THE CODE THIS BUILD ADDED — a
    // file-wide ban was meaningless here, because `icps.ts` IS the sourcing route and names
    // PDL, Apollo and the provider boundary all over its legitimate length. What matters is
    // that the eligibility decision reaches none of them.
    const verdictFn = src.slice(src.indexOf('async function proofRefinementVerdict'),
                                src.indexOf('async function persistMillaUnderstanding'))
    expect(verdictFn.length).toBeGreaterThan(0)
    expect(verdictFn).not.toMatch(/pdl|apollo|hunter|smartlead|stripe|provider/i)
    const coreFn = src.slice(src.indexOf('async function coreIcpRow'),
                             src.indexOf('async function saveClientTargeting'))
    expect(coreFn).not.toMatch(/pdl|apollo|hunter|smartlead|stripe|provider/i)
  })
})
