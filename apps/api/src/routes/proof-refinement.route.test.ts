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
  /** Every `.update()` the route issued against `icps` THAT ACTUALLY MATCHED A ROW. */
  icpUpdates: [] as Row[],
  /** The predicate each matching update carried — proves WHICH branch wrote. */
  icpUpdateConds: [] as Array<Array<[string, unknown]>>,
  /** Every `.insert()` against `icps`. A proof refinement must never produce one. */
  icpInserts: [] as Row[],
  /** Set to a revision to make it appear right after the core read — the race. */
  pendingAppearsAfterCoreRead: null as Row | null,
  /** How many times the core ICP row was SELECTED during one request. */
  icpReads: 0,
  /** Anything else that should happen in the window between the core read and the write. */
  afterCoreRead: null as (() => void) | null,
}

const CORE_COLS = 'id, name, is_active, pending_targeting'

function query(table: string) {
  let cols = ''
  const q: Record<string, unknown> = {
    select(c?: string) { cols = c ?? ''; return q },
    eq() { return q }, in() { return q }, is() { return q }, neq() { return q },
    not() { return q }, order() { return q }, limit() { return q },
    async maybeSingle() {
      if (table === 'clients') return { data: { id: 'c1', proof_passes_done: state.passes, company_name: 'Acme' }, error: null }
      if (table === 'icps') {
        // ⚠️ COUNT THE CORE SELECTION ONLY, BY ITS COLUMN LIST. `/icps/revise` also reads
        // `id, name` for the founder alert — a pre-existing, unrelated read. A counter that
        // could not tell them apart reported 2 for correct code and would have been "fixed"
        // by loosening the assertion to 2, which is exactly the number the defect produced.
        if (cols === CORE_COLS) state.icpReads += 1
        // A SNAPSHOT, exactly like a real read: the caller holds these values, and the row
        // in the database can move afterwards.
        const snapshot = state.icp ? { ...state.icp } : null
        // ⚑ 25 Aug — THE RACE, INJECTED AT THE ONLY MOMENT IT MATTERS. Set by a test to make
        // a revision arrive for review AFTER the verdict has read a clean row and BEFORE the
        // update runs. Fires once, so the second read in a normal flow is not disturbed.
        // ⚠️ ONLY AFTER THE **CORE** READ. `/icps/revise` reads `id, name` first for the
        // founder alert; firing there would move the row BEFORE the verdict ever saw it,
        // which is the earlier conflict this file already covers — not the race.
        if (cols === CORE_COLS) {
          if (state.pendingAppearsAfterCoreRead && state.icp) {
            state.icp = { ...state.icp, pending_targeting: state.pendingAppearsAfterCoreRead }
            state.pendingAppearsAfterCoreRead = null
          }
          if (state.afterCoreRead) { const f = state.afterCoreRead; state.afterCoreRead = null; f() }
        }
        return { data: snapshot, error: null }
      }
      return { data: null, error: null }
    },
    async single() { return { data: state.icp, error: null } },

    // ⚑ 25 Aug — THE UPDATE PREDICATE IS EVALUATED, NOT IGNORED.
    //
    // This used to record the patch the moment `.update()` was called and hand back a row
    // whatever the `.eq()`/`.is()` chain said — so a conditional write that should have
    // matched NOTHING still looked like a successful write, and the harness could not have
    // told a working fence from a missing one. The conditions are now collected and checked
    // against the row as it stands AT WRITE TIME, which is the whole point of the fence: the
    // test mutates `state.icp` between the read and the write to simulate the race.
    update(patch: Row) {
      const conds: Array<[string, unknown]> = []
      const finish = () => {
        const row = state.icp
        const matches = !!row && conds.every(([col, val]) => {
          if (col === 'client_id') return true                        // one client in this harness
          if (col === 'pending_targeting' && val === null) return (row[col] ?? null) === null
          return row[col] === val
        })
        // ⚠️ RECORDED ONLY WHEN IT MATCHED. "Zero rows affected" must leave no write behind,
        // or `expect(state.icpUpdates).toHaveLength(0)` proves nothing.
        if (!matches) return { data: null, error: null }
        if (table === 'icps') { state.icpUpdates.push(patch); state.icpUpdateConds.push([...conds]) }
        // ⚠️ THE WRITE ACTUALLY LANDS ON THE ROW. The harness used to return a merged object
        // and leave `state.icp` alone — so "the live targeting survived" was true no matter
        // what the route did, and a mutation that dropped the whole predicate stayed green.
        // A test that cannot observe the damage cannot prove the absence of damage.
        const next = { ...row, ...patch }
        if (table === 'icps') state.icp = next
        return { data: next, error: null }
      }
      const chain: Record<string, unknown> = {
        eq(col: string, val: unknown) { conds.push([col, val]); return chain },
        is(col: string, val: unknown) { conds.push([col, val]); return chain },
        select() { return chain },
        async single() { return finish() },
        async maybeSingle() { return finish() },
        then(r: (v: unknown) => unknown) { return r(finish()) },
      }
      return chain
    },
    // ⚑ 25 Aug — INSERTS ARE RECORDED, because "no second ICP was created" is a claim and
    // an unrecorded insert is not evidence of anything. Returns a plausible NEW row rather
    // than echoing the existing one, so a test cannot mistake a creation for an update.
    insert(row: Row) {
      if (table === 'icps') state.icpInserts.push(row)
      const created = { id: 'icp-NEW', ...row }
      const done = { data: created, error: null }
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

/** POST /icps — the ONBOARDING door, which legitimately creates a client's first ICP. */
async function callCreate(body: Row) {
  const { icpRouter } = await import('./icps')
  const layer = (icpRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }> })
    .stack.find(l => l.route?.path === '/' && l.route?.methods.post)
  if (!layer?.route) throw new Error('POST /icps not found on the icp router')
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
  state.icp = { id: 'icp-1', name: 'My targeting', is_active: true, pending_targeting: null }
  state.funding = []
  state.passes = 1
  state.icpUpdates = []
  state.icpUpdateConds = []
  state.icpInserts = []
  state.pendingAppearsAfterCoreRead = null
  state.icpReads = 0
  state.afterCoreRead = null
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

  // ⛓️ REPLACED 25 Aug — THE OLD GUARD ASSERTED THE OPPOSITE OF WHAT IT CHECKED.
  //
  // It was called "one selection, not two" and its evidence was that BOTH call sites
  // existed: `proofRefinementVerdict(..., await coreIcpRow(clientId))` in the route AND
  // `const core = await coreIcpRow(clientId)` inside `saveClientTargeting`. Two reads. The
  // test asserted the defect and named itself after the fix. Caught in GPT-5.6's literal
  // review, not by me and not by any check here.
  //
  // A source assertion could never have settled this, so the replacement COUNTS THE READS
  // AT RUNTIME, through the real handler.
  it('the revise route reads the core ICP exactly ONCE per operation', async () => {
    state.icp = { id: 'icp-1', name: 'My targeting', is_active: true, pending_targeting: null }
    await callRevise({ ...TARGETING({ industries: ['Fintech'] }), proof_refinement: true })
    // The verdict judged a row and the write targeted a row. If those are two separate
    // selections, this is 2 and the two can disagree — which is the entire defect.
    expect(state.icpReads, 'one authoritative observation of the core ICP').toBe(1)
  })

  it('the ordinary revise path still reads its own row — no caller was forced to change', async () => {
    state.icp = { id: 'icp-1', name: 'My targeting', is_active: true, pending_targeting: null }
    await callRevise(TARGETING({ industries: ['Fintech'] }))
    expect(state.icpReads, 'still exactly one, still authoritative').toBe(1)
  })

  it('one helper, one column list — the two readers cannot drift apart', () => {
    const src = readFileSync(join(__dirname, './icps.ts'), 'utf8')
    expect(src).toContain('async function coreIcpRow(clientId: string)')
    // The route selects once and hands the SAME row to both consumers.
    expect(src).toContain('const core = await coreIcpRow(clientId)\n    const verdict = await proofRefinementVerdict(clientId, req.body, core)')
    expect(src).toContain('await saveClientTargeting(clientId, body, revisedIntent, verdict === \'apply\', core)')
    // …and the old shape, which read twice, is gone.
    expect(src).not.toContain('proofRefinementVerdict(clientId, req.body, await coreIcpRow(clientId))')
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

  // ⚑ 25 Aug — SAME CLASS AS THE CORRECTED-COMMENT GUARD: a comment naming a function that
  // no longer exists sends the next reader looking for code that is not there, and this one
  // was written in this very build and caught in review of my own diff. A rename is exactly
  // when it happens, so the name is pinned rather than left to memory.
  it('no comment names a function this build renamed away', () => {
    const src = readFileSync(join(__dirname, './icps.ts'), 'utf8')
    expect(src, 'the old name is gone everywhere, comments included')
      .not.toContain('proofRefinementApplies')
    expect(src).toContain('`proofRefinementVerdict()` returning `\'apply\'` is the')
  })
})

// ── ⚑ 25 Aug — THE RACE BETWEEN THE DECISION AND THE WRITE (founder-ruled) ───────────────
//
// Reading the core ICP once closed the gap between the two READS. It does not close the gap
// between the read and the WRITE. A revision can be submitted for review — or the ICP
// deactivated — in the milliseconds after the verdict says 'apply', and the write would then
// land on a row that no longer matches the row the decision was made on, overwriting a
// waiting revision the founder's ruling says must survive untouched.
//
// So the verdict's conditions are restated as the UPDATE's own predicate and the database
// evaluates them atomically at write time. This block drives that predicate for real: the
// harness mutates the row between the read and the write, and the update must match nothing.
describe('the apply write fails closed if the row moves underneath it', () => {
  const AROSE = { industries: ['Logistics'], job_titles: ['COO'] }

  it('1/2/3/4 · a revision arriving mid-flight makes the conditional update match ZERO rows', async () => {
    state.icp = { id: 'icp-1', name: 'My targeting', is_active: true, pending_targeting: null }
    // The verdict will read a CLEAN row — no conflict — and then the revision appears.
    state.pendingAppearsAfterCoreRead = AROSE
    const r = await callRevise({ ...TARGETING({ industries: ['Fintech'] }), proof_refinement: true })
    expect(r.code, 'a safe state-conflict, not a success').toBe(409)
    expect(r.payload.code).toBe('targeting_state_changed')
    expect(String(r.payload.error)).toContain('The targeting changed while you were reviewing it.')
    expect(String(r.payload.error)).toContain('no new search has started')
    // 3 · nothing was written. Not the live columns, not anything.
    expect(state.icpUpdates, 'zero rows affected means zero writes recorded').toHaveLength(0)
  })

  it('5/6 · the live targeting AND the revision that arrived both survive untouched', async () => {
    state.icp = {
      id: 'icp-1', name: 'My targeting', is_active: true, pending_targeting: null,
      industries: ['SaaS'], job_titles: ['CTO'],
    }
    state.pendingAppearsAfterCoreRead = AROSE
    await callRevise({ ...TARGETING({ industries: ['Fintech'] }), proof_refinement: true })
    // The live columns are exactly what they were before the request.
    expect(state.icp?.industries, 'live targeting unchanged').toEqual(['SaaS'])
    expect(state.icp?.job_titles).toEqual(['CTO'])
    // …and the revision that appeared mid-flight is byte-for-byte the one that arrived.
    expect(state.icp?.pending_targeting, 'the new revision is untouched').toEqual(AROSE)
  })

  it('7/8 · it does NOT fall back to a pending write, and does NOT insert another ICP', async () => {
    state.icp = { id: 'icp-1', name: 'My targeting', is_active: true, pending_targeting: null }
    state.pendingAppearsAfterCoreRead = AROSE
    await callRevise({ ...TARGETING(), proof_refinement: true })
    // ⚠️ EVERY "RECOVERY" HERE IS A DESTRUCTION. Retrying as an ordinary revision overwrites
    // the revision that just arrived; inserting a second ICP orphans pass 1's leads and
    // feedback on a row nothing looks at again. The correct behaviour is to do neither.
    expect(state.icpUpdates).toHaveLength(0)
    expect(state.icp?.id, 'still the one ICP').toBe('icp-1')
  })

  it('a DEACTIVATION mid-flight is refused by the same predicate', async () => {
    state.icp = { id: 'icp-1', name: 'My targeting', is_active: true, pending_targeting: null }
    // The verdict reads an ACTIVE row; it is deactivated in the same window. `is_active` is
    // in the predicate for this reason — an ICP that stopped being live is not one a proof
    // refinement may write to, whatever the verdict decided a moment earlier.
    state.afterCoreRead = () => { state.icp = { ...(state.icp as Row), is_active: false } }
    const r = await callRevise({ ...TARGETING(), proof_refinement: true })
    expect(r.code).toBe(409)
    expect(r.payload.code).toBe('targeting_state_changed')
    expect(state.icpUpdates).toHaveLength(0)
  })

  it('9/10/11 · when the row does NOT move, the apply still lands live on the same ICP', async () => {
    state.icp = { id: 'icp-1', name: 'My targeting', is_active: true, pending_targeting: null }
    const r = await callRevise({ ...TARGETING({ industries: ['Fintech'] }), proof_refinement: true })
    expect(r.code).toBe(201)
    expect(wasApplied(), 'the live columns moved').toBe(true)
    expect(patch().industries).toEqual(['Fintech'])
    expect((r.payload.data as Row)?.id, 'the SAME ICP').toBe('icp-1')
    expect(r.payload.pending_review, 'the desk fence reads this').toBe(false)
    // ⚠️ AND IT WENT THROUGH THE GUARDED BRANCH. Without this, a build that deleted the
    // predicate still passed here — `hold` is false when `applyLive` is true, so the
    // ORDINARY path also writes live. Same visible result, no fence. The predicate the
    // write carried is the only thing that tells the two apart.
    const conds = state.icpUpdateConds[0].map(([c]) => c)
    expect(conds, 'the apply write carried its predicate').toEqual(
      ['id', 'client_id', 'is_active', 'pending_targeting'])
  })

  it('12 · a PAYING live client is never subjected to the conditional write', async () => {
    // Their verdict is 'normal', so the apply branch — and its predicate — is not reached.
    // Their revision parks exactly as it always did, even with a revision already waiting.
    state.funding = [{ type: 'purchase', reference: 'pi_live_1' }]
    state.icp = { id: 'icp-1', name: 'My targeting', is_active: true, pending_targeting: AROSE }
    state.pendingAppearsAfterCoreRead = { industries: ['Anything'] }
    const r = await callRevise({ ...TARGETING({ industries: ['Fintech'] }), proof_refinement: true })
    expect(r.code).toBe(201)
    expect(wasHeld()).toBe(true)
  })

  it('13 · an ordinary unflagged revision is never subjected to it either', async () => {
    state.icp = { id: 'icp-1', name: 'My targeting', is_active: true, pending_targeting: null }
    state.pendingAppearsAfterCoreRead = AROSE
    const r = await callRevise(TARGETING({ industries: ['Fintech'] }))
    expect(r.code, 'no 409 — this path has no predicate to fail').toBe(201)
    expect(wasHeld(), 'parked for review, exactly as today').toBe(true)
    // …and it wrote with the SAME two conditions it always did. A predicate appearing here
    // would be a behaviour change on a path the founder said not to touch.
    expect(state.icpUpdateConds[0].map(([c]) => c), 'ordinary predicate unchanged')
      .toEqual(['id', 'client_id'])
  })

  it('the predicate restates EVERY condition the verdict checked', () => {
    const src = readFileSync(join(__dirname, './icps.ts'), 'utf8')
    const applyBlock = src.slice(src.indexOf('  if (applyLive) {'), src.indexOf("    if (!data) return { ok: false, reason: 'state_changed' }"))
    expect(applyBlock).toContain(".eq('id', core.id)")
    expect(applyBlock).toContain(".eq('client_id', clientId)")
    expect(applyBlock).toContain(".eq('is_active', true)")
    expect(applyBlock).toContain(".is('pending_targeting', null)")
    // `maybeSingle`, so zero rows is an ANSWER rather than an exception.
    expect(applyBlock).toContain('.select().maybeSingle()')
    // ⚠️ THE ORDINARY PATH KEEPS `.single()`. Switching it would turn a real database failure
    // into a quiet 404 — a behaviour change on a path nobody asked to change.
    expect(src).toContain(".update(patch).eq('id', core.id).eq('client_id', clientId).select().single()")
  })
})

// ── ⚑ 25 Aug — NO CORE ICP IS A STOP, NEVER A CREATION (founder-ruled) ───────────────────
//
// THE DEFECT, found in literal review of the atomicity build. `proofRefinementVerdict` asked
// `core?.pending_targeting` — and for a null core that is `undefined`, which sailed through
// the "nothing is waiting" test and returned `'apply'`. `saveClientTargeting` was then called
// with `applyLive = true` and `coreIn = null`, hit its no-core branch, and INSERTED.
//
// A second ICP is the worst possible outcome of a refinement: `leads.icp_id`, the campaign's
// `icp_id` and the PDL cursor all hang off `icp.id`, so pass 1's leads and feedback would be
// orphaned on a row nothing looks at again — and the client would have spent their last free
// pass on a brand-new experiment they never asked for.
//
// TWO protections, because they are reached by different callers and a guard that depends on
// another guard having run is not a guard.
describe('a proof refinement with no core ICP fails closed', () => {
  it('1 · the route answers 409 targeting_state_changed', async () => {
    state.icp = null
    const r = await callRevise({ ...TARGETING({ industries: ['Fintech'] }), proof_refinement: true })
    expect(r.code).toBe(409)
    expect(r.payload.code).toBe('targeting_state_changed')
    expect(String(r.payload.error)).toContain('no new search has started')
  })

  it('2/3/4 · zero inserts, zero updates, and no fallback pending write', async () => {
    state.icp = null
    await callRevise({ ...TARGETING(), proof_refinement: true })
    expect(state.icpInserts, 'NO second ICP was created').toHaveLength(0)
    expect(state.icpUpdates, 'and nothing was updated either').toHaveLength(0)
  })

  it('the VERDICT refuses it — `apply` is never produced without a core ICP', () => {
    const src = readFileSync(join(__dirname, './icps.ts'), 'utf8')
    const fn = src.slice(src.indexOf('async function proofRefinementVerdict'),
                         src.indexOf('async function persistMillaUnderstanding'))
    expect(fn).toContain("if (!core?.id) return 'state_changed'")
    // ⚠️ ORDER IS THE GUARD. Asked BEFORE the pending question, because a null core answers
    // that one `undefined` — which is exactly how `'apply'` was reached.
    expect(fn.indexOf("!core?.id")).toBeLessThan(fn.indexOf('const waiting'))
    // …and once past it the optional chain is gone, so the null case cannot be re-introduced
    // silently by someone reading `core?.` as "this might be null here".
    expect(fn).toContain('const waiting = core.pending_targeting')
  })

  it('the SAVE refuses it too, above the insert branch — the independent second fence', () => {
    const src = readFileSync(join(__dirname, './icps.ts'), 'utf8')
    const fn = src.slice(src.indexOf('  const core = coreIn !== undefined'),
                         src.indexOf('  const isLive = (core as { is_active?: boolean })'))
    expect(fn).toContain("if (applyLive && !core?.id) return { ok: false, reason: 'state_changed' }")
    // ABOVE the insert. Below it, the insert has already happened and the guard is decoration.
    expect(fn.indexOf('applyLive && !core?.id')).toBeLessThan(fn.indexOf("db.from('icps').insert"))
    // ⚠️ `applyLive` ONLY — `POST /icps` creating a client's FIRST ICP is what that insert is
    // for, and gating it unconditionally would break onboarding.
    expect(fn).not.toMatch(/if \(!core\?\.id\) return \{ ok: false/)
  })

  it('5 · an eligible refinement WITH a core ICP still applies live', async () => {
    state.icp = { id: 'icp-1', name: 'My targeting', is_active: true, pending_targeting: null }
    const r = await callRevise({ ...TARGETING({ industries: ['Fintech'] }), proof_refinement: true })
    expect(r.code).toBe(201)
    expect(wasApplied()).toBe(true)
    expect(state.icpInserts, 'still no insert — it UPDATED').toHaveLength(0)
    expect((r.payload.data as Row)?.id).toBe('icp-1')
  })

  it('6 · an ordinary no-core POST /icps still INSERTS, exactly as before', async () => {
    state.icp = null
    const r = await callCreate(TARGETING({ industries: ['Fintech'] }))
    expect(r.code, 'onboarding is untouched').toBe(201)
    expect(state.icpInserts, 'the first ICP is created here, as it always was').toHaveLength(1)
    expect(state.icpInserts[0]).toMatchObject({ industries: ['Fintech'], client_id: 'c1' })
    expect(state.icpUpdates).toHaveLength(0)
  })

  it('an ordinary no-core /icps/revise also still inserts — no flag, no refusal', async () => {
    state.icp = null
    const r = await callRevise(TARGETING({ industries: ['Fintech'] }))
    expect(r.code).toBe(201)
    expect(state.icpInserts).toHaveLength(1)
  })

  it('7 · a PAID client is never refused by it — their verdict never reaches apply', async () => {
    state.funding = [{ type: 'purchase', reference: 'pi_live_1' }]
    state.icp = null
    const r = await callRevise({ ...TARGETING({ industries: ['Fintech'] }), proof_refinement: true })
    expect(r.code, 'no 409 — this is ordinary creation for them').toBe(201)
    expect(state.icpInserts).toHaveLength(1)
  })

  it('both refusals answer with ONE sentence, written once', () => {
    const src = readFileSync(join(__dirname, './icps.ts'), 'utf8')
    expect(src).toContain('function stateChanged(res: Response): void {')
    // Two callers, one copy — a second copy is a second thing to keep in step, and a client
    // reading a different sentence for the same fact is how a support conversation goes wrong.
    expect((src.match(/stateChanged\(res\); return/g) ?? []), 'both refusals use it').toHaveLength(2)
    expect((src.match(/The targeting changed while you were reviewing it\./g) ?? []),
      'the sentence exists exactly once').toHaveLength(1)
  })
})
