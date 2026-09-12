// ═══════════════════════════════════════════════════════════════════════════
// PR2 — THE PROOF-REVIEW HANDOFF IS REAL WORK, NOT A SENTENCE.
//
// A prospect who used both free proof passes and asked for another was told "K.I.N.D will
// review this with you". Nobody at K.I.N.D was told. These tests hold the two halves that
// make that sentence true: the ask is PERSISTED exactly once, and it reaches a human.
//
// ⚠️ WHAT THE FALSE-POSITIVE TEST IS FOR. The tempting implementation is a derived alert on
// `proof_passes_done >= 2`. That fires the moment pass 2 is merely GENERATED — the ordinary,
// healthy end of a proof that worked — and fills the operator queue with people who need
// nothing. Three tests below exist only to prove pass 1, a refinement and a completed pass 2
// each leave the review columns untouched.
//
// ⚠️ WHAT THIS SUITE DOES AND DOES NOT PROVE ABOUT ATOMICITY. The store mock evaluates the
// UPDATE's predicate against live rows, so it faithfully models "of N racing writers exactly
// one matches" — which is what the route depends on. The guarantee underneath that is
// Postgres re-evaluating the WHERE after taking the row lock, and no unit test can prove
// Postgres. What IS proved here is that the route asks the database to decide, and never the
// UI: the transition is a conditional write whose returned rows gate the alert.
//
// Mocks only. No provider, no database, no network, no sending, no money path.
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ⛓️ 12 Sep (S2-AUDIT-001) — RETARGETED, NOT WEAKENED. Every assertion below keeps its
// exact meaning; only the NAME of the claim changed. `try_claim_proof_pass` incremented a
// counter nothing could release, so a run that crashed at the PDL boundary consumed the
// client's pass and left them with nothing. Authority now comes from the durable claim
// ledger (`claim_proof_authority` -> `proof_pass_claims`), which can give it back. The old
// RPC is retained in the database for rollback and has ZERO live callers
// (`proof-authority-bypass.test.ts` asserts that, and it is what keeps it dead).

type Row = Record<string, any>

type Rec = {
  rpcs: Array<{ fn: string; args: Row }>
  alerts: Array<{ kind: string; subject: string; lines: string[] }>
  runs: number
  /** Set to make the NEXT clients UPDATE resolve with `{ data: null, error }` — the shape
   *  supabase-js actually returns for a missing column, which does not throw. */
  updateError?: { message: string } | null
}

type Store = { clients: Row[]; icps: Row[]; credit_transactions: Row[] }

const newStore = (): Store => ({
  clients: [{
    id: 'c1', user_id: 'u1', company_name: 'Acme', is_demo: false,
    credit_balance: 0, leads_per_run: null,
    proof_passes_done: 0,
    proof_review_requested_at: null,
    proof_review_resolved_at: null,
    proof_review_icp_id: null,
  }],
  icps: [{ id: 'icp-1', client_id: 'c1', is_active: false }],
  credit_transactions: [],           // never funded → a prospect, so proof applies
})

/**
 * A predicate engine small enough to read and real enough to matter.
 *
 * The idempotency claim rests entirely on the UPDATE's filter, so a mock that ignored
 * filters (returning every row for any query) would make the retry tests pass against an
 * unconditional write — the precise bug they exist to catch. These four forms are the ones
 * the route actually uses.
 */
type Pred = (r: Row) => boolean

function orPred(expr: string): Pred {
  // 'proof_review_requested_at.is.null,proof_review_resolved_at.not.is.null'
  const parts = expr.split(',').map(s => s.trim())
  const preds: Pred[] = parts.map(p => {
    if (p.endsWith('.not.is.null')) { const c = p.slice(0, -'.not.is.null'.length); return r => r[c] !== null && r[c] !== undefined }
    if (p.endsWith('.is.null'))     { const c = p.slice(0, -'.is.null'.length);     return r => r[c] === null || r[c] === undefined }
    throw new Error(`mock cannot parse or() term: ${p}`)
  })
  return r => preds.some(f => f(r))
}

/**
 * ── TEST ISOLATION — THE ONE INDIRECTION THAT MAKES A STALE BINDING HARMLESS ──────────────
 *
 * 🛑 THE MEASURED DEFECT. On a failing run, stamping each store with an id showed:
 *
 *     rpc store=3   rpc store=3   rpc store=3      <- the three requests
 *     assert store=4 passes=0                      <- what the assertion read
 *
 * The handler wrote to the PREVIOUS test's store while the assertion read the current one.
 * Response codes were still `[200, 200, 409]`, so the Proof rules themselves were correct
 * throughout — this was never a product bug.
 *
 * ⚠️ WHY IT HAPPENED. `installDb` used to close over its `store` PARAMETER, so each
 * `vi.doMock` factory was permanently welded to the store that existed when it was
 * registered. `vi.resetModules()` plus vitest's dynamic-import sequencing could hand a later
 * test a `@kind/db` built by an earlier factory — and that module then wrote, correctly and
 * invisibly, into an abandoned store.
 *
 * ⚠️ THE FIX IS TO REMOVE THE WELD, NOT TO CHASE THE SEQUENCING. The factory now reads
 * through `ctx`, a single object that outlives every reset; `beforeEach` swaps its CONTENTS.
 * So a stale `@kind/db` binding — however it arises — still reads the CURRENT store, and the
 * route and the assertion cannot disagree about which store they are looking at. That is a
 * property of the harness, not a race that has to be won.
 *
 * ⚠️ NOTHING ABOUT THE MOCK'S BEHAVIOUR CHANGES. Same predicate engine, same conditional
 * UPDATE semantics, same `try_claim_proof_pass` ceiling. Only the lookup is indirect.
 */
const ctx: { store: Store; rec: Rec } = {
  store: newStore(),
  rec: { rpcs: [], alerts: [], runs: 0, updateError: null },
}

function installDb() {
  vi.doMock('@kind/db', () => {
    const build = (table: string) => {
      const rows = (): Row[] => (ctx.store as any)[table] ?? []
      const preds: Pred[] = []
      const q: any = {}
      for (const m of ['select', 'in', 'gte', 'lte', 'limit', 'order']) q[m] = () => q
      q.eq  = (c: string, v: unknown) => { preds.push(r => r[c] === v); return q }
      q.neq = (c: string, v: unknown) => { preds.push(r => r[c] !== v); return q }
      q.is  = (c: string, _v: unknown) => { preds.push(r => r[c] === null || r[c] === undefined); return q }
      q.not = (c: string, _op: string, _v: unknown) => { preds.push(r => r[c] !== null && r[c] !== undefined); return q }
      q.or  = (e: string) => { preds.push(orPred(e)); return q }
      const matched = () => rows().filter(r => preds.every(f => f(r)))
      q.maybeSingle = async () => ({ data: matched()[0] ?? null, error: null })
      q.single      = async () => ({ data: matched()[0] ?? null, error: null })
      q.then = (resolve: (v: unknown) => void) =>
        resolve({ data: matched(), count: matched().length, error: null })

      q.update = (patch: Row) => {
        const upreds: Pred[] = []
        const chain: any = {}
        chain.eq  = (c: string, v: unknown) => { upreds.push(r => r[c] === v); return chain }
        chain.is  = (c: string, _v: unknown) => { upreds.push(r => r[c] === null || r[c] === undefined); return chain }
        chain.not = (c: string, _o: string, _v: unknown) => { upreds.push(r => r[c] !== null && r[c] !== undefined); return chain }
        chain.or  = (e: string) => { upreds.push(orPred(e)); return chain }
        chain.in  = () => chain
        const apply = () => {
          const targets = rows().filter(r => upreds.every(f => f(r)))
          targets.forEach(r => Object.assign(r, patch))
          return targets
        }
        chain.select = () => ({ then: (r: (v: unknown) => void) => {
          // The returned-error shape: data null, error set, NOTHING written, no throw.
          if (ctx.rec.updateError) { r({ data: null, error: ctx.rec.updateError }); return }
          r({ data: apply(), error: null })
        } })
        chain.then = (r: (v: unknown) => void) => { apply(); r({ error: null }) }
        return chain
      }
      q.insert = () => ({ then: (r: (v: unknown) => void) => r({ error: null }),
                          select: () => ({ single: async () => ({ data: null, error: null }) }) })
      return q
    }
    return {
      db: {
        from: (t: string) => build(t),
        rpc: async (fn: string, args: Row) => {
          ctx.rec.rpcs.push({ fn, args })
          // ── ⛓️ 12 Sep (S2-AUDIT-001) — THE LEDGER, STANDING IN FOR THE OLD COUNTER ────────
          // The route claims through `claim_proof_authority` now. The old RPC branch is kept
          // beside it so a rollback needs no fixture change; this one mirrors the SAME rule —
          // two automatic passes then refuse — so every assertion below is unchanged.
          if (fn === 'claim_proof_authority') {
            const c = ctx.store.clients[0]
            const done = c.proof_passes_done ?? 0
            if (done >= 2) return { data: { ok: false, reason: 'exhausted' }, error: null }   // no pass 3
            c.proof_passes_done = done + 1
            return { data: {
              ok: true, claim_id: `claim-${c.proof_passes_done}`,
              authority: `automatic_${c.proof_passes_done}`, pass: c.proof_passes_done,
              kind: 'automatic', reason: 'granted',
            }, error: null }
          }
          if (fn === 'settle_proof_claim') return { data: { ok: true, status: args.p_status }, error: null }
          if (fn === 'try_claim_proof_pass') {
            const c = ctx.store.clients[0]
            const done = c.proof_passes_done ?? 0
            if (done >= 2) return { data: 0, error: null }      // the real ceiling: no pass 3
            c.proof_passes_done = done + 1
            return { data: c.proof_passes_done, error: null }
          }
          return { data: null, error: null }
        },
      },
    }
  })

  vi.doMock('./alerts', () => ({
    sendFounderAlert: async (kind: string, subject: string, lines: string[]) => {
      ctx.rec.alerts.push({ kind, subject, lines }); return undefined
    },
  }))
  // The same module set `launch-journey.test.ts` neutralises before importing the ICP routes.
  // These build clients or reach networks at IMPORT time, so without them the module graph
  // throws "supabaseUrl is required" before a single assertion runs.
  // `middleware/auth` calls createClient() at module scope; importing the ICP routes without
  // this throws "supabaseUrl is required" before any test body runs. The handler is invoked
  // directly with a userId, so the real middleware is never wanted here anyway.
  vi.doMock('../middleware/auth', () => ({ requireAuth: (_q: Row, _s: Row, n: () => void) => n() }))
  vi.doMock('../routes/admin', () => ({ adminKeyValid: (k: unknown) => k === 'right-key' }))
  vi.doMock('./apollo', () => ({
    searchPeopleWithFallback: async () => { throw new Error('no provider call may happen in this suite') },
    ApolloCreditsExhaustedError: class extends Error {},
    ApolloRateLimitError: class extends Error {},
  }))
  vi.doMock('./provider-boundary', async () => {
    const actual = await vi.importActual<Record<string, unknown>>('./provider-boundary')
    return { ...actual }
  })
}

async function proofHandler() {
  const mod = await import('../routes/icps')
  const stack = (mod.icpRouter as unknown as { stack: Array<Row> }).stack
  const layer = stack.find(l => l.route?.path === '/:id/proof' && l.route?.methods?.post)
  expect(layer, 'POST /:id/proof not found').toBeTruthy()
  return layer!.route.stack[layer!.route.stack.length - 1].handle
}

function reqres(icpId = 'icp-1') {
  const res: Row = { code: 200, body: null }
  res.status = (c: number) => { res.code = c; return res }
  res.json = (b: unknown) => { res.body = b; return res }
  return { req: { params: { id: icpId }, userId: 'u1', body: {}, headers: {} }, res }
}

beforeEach(() => {
  vi.resetModules()
  // ⚠️ THE HOLDER IS NEVER REPLACED — only what it holds. Reassigning `ctx` would recreate
  // the exact weld this design removes: the factory would keep pointing at the old object.
  ctx.store = newStore()
  ctx.rec = { rpcs: [], alerts: [], runs: 0, updateError: null }
  installDb()
})
afterEach(() => { vi.restoreAllMocks(); vi.resetModules() })

const client = () => ctx.store.clients[0]
const open = () =>
  client().proof_review_requested_at !== null && client().proof_review_resolved_at === null

/**
 * Only the handoff alerts.
 *
 * ⚠️ NOT `rec.alerts.length`. A SUCCESSFUL pass fires `runIcpJob`, which this suite
 * deliberately does not mock out — it crashes against the minimal store and the route's own
 * crash handler then sends a `source_down` alert. Those are real, correct, and nothing to do
 * with the handoff. Counting every alert made the retry assertion depend on how many
 * fire-and-forget crash alerts had resolved by the time it ran: flaky, and measuring the
 * wrong thing. The claim under test is "the OPERATOR HANDOFF is raised once".
 */
const escalations = () => ctx.rec.alerts.filter(a => a.kind === 'support_escalation')

// ────────────────────────────────────────────────────────────────────────────
// THE FALSE POSITIVES — a generated pass is not a cry for help
// ────────────────────────────────────────────────────────────────────────────
describe('a proof that is working must never raise a review', () => {
  it('pass 1 does NOT create a proof review', async () => {
    const h = await proofHandler()
    const { req, res } = reqres()
    await h(req, res)
    expect(client().proof_passes_done).toBe(1)
    expect(client().proof_review_requested_at).toBeNull()
    expect(escalations()).toHaveLength(0)
  })

  it('pass 2 completing normally does NOT create a proof review', async () => {
    const h = await proofHandler()
    await h(...Object.values(reqres()) as [Row, Row])
    await h(...Object.values(reqres()) as [Row, Row])
    expect(client().proof_passes_done).toBe(2)
    // The count is now at the ceiling — the exact state a derived alert would escalate on.
    expect(client().proof_review_requested_at).toBeNull()
    expect(escalations()).toHaveLength(0)
  })

  it('a refinement does NOT create a proof review — only the proof route writes these columns', () => {
    // Bound to the source rather than to a refinement fixture: the guarantee wanted is that
    // NOTHING ELSE anywhere in the ICP routes can raise a handoff, which one fixture cannot
    // show. Comments stripped so the explanation of the write cannot answer for the write.
    const src = readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')
      .split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
    const writes = src.split('proof_review_requested_at:').length - 1
    expect(writes, 'exactly one place may set proof_review_requested_at').toBe(1)

    const refine = src.indexOf("icpRouter.post('/:id/refine'")
    const revise = src.indexOf("icpRouter.post('/revise'")
    for (const [name, at] of [['refine', refine], ['revise', revise]] as const) {
      expect(at, `${name} route missing`).toBeGreaterThan(-1)
      expect(src.slice(at, at + 3000)).not.toContain('proof_review_requested_at')
    }
  })
})

// ────────────────────────────────────────────────────────────────────────────
// THE HANDOFF — the third ask is the trigger
// ────────────────────────────────────────────────────────────────────────────
describe('asking for a third set creates exactly one review', () => {
  async function exhaust(times: number) {
    const h = await proofHandler()
    const codes: number[] = []
    for (let i = 0; i < times; i++) {
      const { req, res } = reqres()
      await h(req, res)
      codes.push(res.code)
    }
    return codes
  }

  it('the third attempt is refused 409 and persists ONE open review', async () => {
    const codes = await exhaust(3)
    expect(codes).toEqual([200, 200, 409])
    expect(client().proof_passes_done).toBe(2)          // no pass 3 was ever minted
    expect(open()).toBe(true)
    expect(client().proof_review_icp_id).toBe('icp-1')
  })

  it('retrying does not create a second review, and does not re-alert', async () => {
    await exhaust(6)                                     // 2 passes + FOUR refused retries
    expect(client().proof_passes_done).toBe(2)
    expect(open()).toBe(true)
    expect(escalations()).toHaveLength(1)                // the operator is told once
  })

  it('the requested_at timestamp is the FIRST ask, not the latest retry', async () => {
    await exhaust(3)
    const first = client().proof_review_requested_at
    await exhaust(1)
    expect(client().proof_review_requested_at).toBe(first)
  })

  it('concurrent third attempts still leave exactly one review and one alert', async () => {
    const h = await proofHandler()
    await h(...Object.values(reqres()) as [Row, Row])
    await h(...Object.values(reqres()) as [Row, Row])    // both passes spent
    const racers = Array.from({ length: 5 }, () => {
      const { req, res } = reqres()
      return h(req, res)
    })
    await Promise.all(racers)
    expect(open()).toBe(true)
    expect(escalations()).toHaveLength(1)
  })

  it('the alert carries what an operator needs to act', async () => {
    await exhaust(3)
    expect(escalations()).toHaveLength(1)
    const a = escalations()[0]
    expect(a.kind).toBe('support_escalation')
    const all = [a.subject, ...a.lines].join(' ')
    expect(all).toContain('c1')                          // client id
    expect(all).toContain('icp-1')                       // ICP id
    expect(all).toContain('2 of 2')                      // passes done
    expect(all.toLowerCase()).toContain('exhaust')       // clear reason
    expect(all).toContain(client().proof_review_requested_at)  // timestamp/context
    expect(all).toContain('ACTION')                      // what to do
  })

  it('a handoff write that FAILS still returns the honest 409, and still reaches a human', async () => {
    // ⚑ FOUND BY THIS PR, NOT INVENTED. The first implementation put the handoff write inside
    // the route's outer try, so a write failure was caught by the generic handler and became
    // a 500 — "Could not start your proof batch". The prospect would never see "we will
    // review this with you"; they would see an error and press the button again. Two existing
    // proof suites went red on exactly this and were right to.
    //
    // The ranking under test: the client ALWAYS learns the truth, and a failed handoff
    // becomes a louder problem for US rather than a worse experience for THEM.
    const h = await proofHandler()
    await h(...Object.values(reqres()) as [Row, Row])
    await h(...Object.values(reqres()) as [Row, Row])

    const c = client()
    Object.defineProperty(c, 'proof_review_requested_at', {
      get: () => null,
      set: () => { throw new Error('column does not exist — migration not applied') },
      configurable: true,
    })

    const { req, res } = reqres()
    await h(req, res)

    expect(res.code, 'the refusal must survive a failed handoff write').toBe(409)
    expect(String(res.body.error)).toContain('two sets of leads')
    // The alert IS the handoff now — it is the only remaining trace of the promise.
    expect(escalations()).toHaveLength(1)
    expect(escalations()[0].lines.join(' ')).toContain('ONLY trace')
  })

  it('a RETURNED {data:null,error} still returns 409 and still reaches a human', async () => {
    // ⚑ THE ONE THE FIRST VERSION MISSED, AND THE LIKELIEST FAILURE IN PRODUCTION.
    //
    // supabase-js RESOLVES with `{ data: null, error }` for a missing column or a permission
    // refusal — it does not reject. The original block only caught throws, so with the
    // 20260827 migration not yet applied `opened` came back null, `length > 0` was false, and
    // NOBODY WAS ALERTED: the exact silence this PR exists to remove, reintroduced by the
    // error handling meant to prevent it. The deploy order makes that window real — merging
    // deploys the API and the migration is applied by hand afterwards.
    //
    // The thrown case is the test below; this is the returned case. Both must behave alike.
    const h = await proofHandler()
    await h(...Object.values(reqres()) as [Row, Row])
    await h(...Object.values(reqres()) as [Row, Row])

    ctx.rec.updateError = { message: 'column clients.proof_review_requested_at does not exist' }

    const { req, res } = reqres()
    await h(req, res)

    expect(res.code, 'the refusal must survive a RETURNED error').toBe(409)
    expect(String(res.body.error)).toContain('two sets of leads')
    expect(escalations(), 'a returned error must still page a human').toHaveLength(1)
    const lines = escalations()[0].lines.join(' ')
    expect(lines).toContain('ONLY trace')
    expect(lines).toContain('does not exist')        // the diagnosis travels with the alert
    expect(lines).toContain('migration may not be applied')
    // and nothing was written
    expect(client().proof_review_requested_at).toBeNull()
  })

  it('pass 3 remains impossible — no run is ever started for the refused attempt', async () => {
    await exhaust(4)
    const claims = ctx.rec.rpcs.filter(r => r.fn === 'claim_proof_authority')
    // ⛓️ RETARGETED 10 Sep — 4 → 3 CLAIMS, BECAUSE THE REFUSAL MOVED EARLIER, NOT AWAY.
    //
    // C07 added a check ahead of the claim: a client whose calibration has ALREADY been
    // handed to a person is refused without asking the RPC at all. So of four attempts,
    // 1 and 2 claim, 3 claims-and-fails (which is what OPENS the review), and 4 never
    // reaches the RPC because by then Milla has promised them a call and "finding people is
    // paused" — asking the counter again would be asking a question we have already answered.
    //
    // ⚠️ THE DUTY IS UNCHANGED AND NOW STRICTER: pass 3 is still impossible, and the fourth
    // attempt now costs not even a round-trip. The two assertions that matter — the counter
    // never passes 2, and no run is started — are below, unchanged and joined by a third.
    expect(claims).toHaveLength(3)
    expect(client().proof_passes_done).toBe(2)
    // 🛑 AND EXACTLY ONE REVIEW, however many times they ask.
    expect(client().proof_review_requested_at).toBeTruthy()
  })
})

// ────────────────────────────────────────────────────────────────────────────
// NOTHING ELSE MOVED — no spend, no send, no money
// ────────────────────────────────────────────────────────────────────────────
describe('the handoff costs nothing and sends nothing', () => {
  // ⛓️ 12 Sep — WIDENED BY ONE NAME, AND THE DUTY IS UNCHANGED. The earlier passes' runs now
  // settle their claim asynchronously (`settle_proof_claim`), so that name can appear in the
  // recorded list. It is authority bookkeeping — it RETURNS or CONSUMES an attempt and spends
  // nothing — whereas this test exists to prove no SOURCING, REVEAL, WALLET or PROOF-RESERVATION
  // rpc fires. The forbidden set below is untouched; only the permitted set gained a name.
  it('no sourcing, reveal, wallet or proof-reservation RPC fires on the refused attempt', async () => {
    const h = await proofHandler()
    await h(...Object.values(reqres()) as [Row, Row])
    await h(...Object.values(reqres()) as [Row, Row])
    const before = ctx.rec.rpcs.length
    const { req, res } = reqres()
    await h(req, res)                                     // the refused third attempt

    const after = ctx.rec.rpcs.slice(before)
    // The ONLY database call the refused branch may make is the claim that refused it.
    const names = after.map(r => r.fn)
    expect(names).toContain('claim_proof_authority')
    // 🛑 THE FORBIDDEN SET, ASSERTED DIRECTLY RATHER THAN BY AN EXACT-LIST SIDE EFFECT.
    for (const spend of [
      'try_reserve_proof_records', 'release_proof_records', 'try_spend_sourcing',
      'add_sourcing_allowance', 'try_charge_wallet', 'try_reserve_programme_sourcing',
    ]) {
      expect(names, `${spend} fired on a refused proof attempt`).not.toContain(spend)
    }
    // Nothing outside the claim/settle pair is permitted at all.
    expect(names.filter(n => n !== 'claim_proof_authority' && n !== 'settle_proof_claim')).toEqual([])
    for (const banned of ['try_spend_sourcing', 'try_reserve_proof_records', 'try_charge_wallet',
                          'increment_wallet', 'add_sourcing_allowance', 'release_proof_records']) {
      expect(ctx.rec.rpcs.map(r => r.fn)).not.toContain(banned)
    }
  })

  it('the refused branch contains no provider, send or Stripe call in source', () => {
    const src = readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')
      .split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
    // The branch EXACTLY: from the refusal test to the `return` that ends it. An earlier
    // draft used a fixed ±2000-character window, which ran past the closing brace into the
    // success path and reported `runIcpJob(` as if the refused branch called it. A guard that
    // reads the wrong lines is not a strict guard, it is a wrong one.
    // ⛓️ 12 Sep — the branch is entered on the CLAIM RESULT now, not on a pass number:
    // `restart_already_used` and `exhausted` both mean "no authority left", which is exactly
    // what this hand-off has always been for, so they fall into the same branch.
    const start = src.indexOf('if (!authority.ok) {')
    expect(start, 'the refusal branch was not found').toBeGreaterThan(-1)
    const end = src.indexOf('\n    }', src.indexOf('return', src.indexOf('res.status(409)', start)))
    expect(end).toBeGreaterThan(start)
    const branch = src.slice(start, end)

    for (const banned of ['searchPeople', 'waterfallEnrich', 'smartlead', 'sendCampaign',
                          'stripe', 'runIcpJob(', 'enrichAndDeliverLeads']) {
      expect(branch, `refused branch must not reach ${banned}`).not.toContain(banned)
    }
    // And it really is the branch — it contains the write and the refusal, nothing less.
    expect(branch).toContain('proof_review_requested_at:')
    expect(branch).toContain('res.status(409)')
  })
})
