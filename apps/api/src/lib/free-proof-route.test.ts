// ═══════════════════════════════════════════════════════════════════════════
// FREE PROOF — WHAT `runIcpJob` ACTUALLY DOES.
//
// `free-proof-fence.test.ts` proves the fence arithmetic. This file proves the CALLER wires
// itself to the right authority — which is the half a fence cannot defend on its own. A
// perfect fence called from the wrong branch protects nothing.
//
// Every assertion below is about which RPCs a real invocation reaches, and which it must
// never reach. Since round 4 the contract is EXPLICIT (proof is an execution mode the
// client's proof route asks for, never inferred from the account):
//
//   POST /icps/:id/proof     → claims the pass, then runs in proof mode
//   proof-mode run           → try_reserve_proof_records — and NEVER a pass claim of its own
//   any run WITHOUT the mode → try_spend_sourcing, whoever the account is
//   paying / comped client   → the paid path, exactly as before, untouched
//
// Mocks only. No provider, no database, no network.
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Rec = {
  rpcs: Array<{ fn: string; args: Record<string, unknown> }>
  leadUpdates: Array<Record<string, unknown>>
  leadInserts: number
  alerts: Array<{ subject: string; lines: string[] }>
  poolCap: number | null
  eqs: Array<{ table: string; col: string; val: unknown }>
  /** ⚑ 24 Aug — every enrichAndDeliverLeads() call: the PAID reveal/delivery path.
   *  A free-proof run must never appear here. Each entry is the candidate id list. */
  enrich: string[][]
}
const emptyRec = (): Rec => ({ rpcs: [], leadUpdates: [], leadInserts: 0, alerts: [], poolCap: null, eqs: [], enrich: [] })

const ICP_ROW = {
  id: 'icp-1', client_id: 'c1',
  geographies: [], job_titles: [], industries: [], seniority_levels: [], company_sizes: [],
}

/**
 * @param funded  'real' → a purchase row · null → never funded (a prospect)
 * @param pass    what try_claim_proof_pass returns
 * @param reserve what try_reserve_proof_records returns
 */
async function runJob(opts: {
  funded: 'real' | null
  pass?: number
  reserve?: number
  reserveReason?: string
  /** Simulate the RPC failing to answer at all — data comes back null. */
  reserveNoAnswer?: boolean
  grant?: number
  contacts?: number
  /** How many matching records the shared pool holds for this ICP. */
  pool?: number
  /** What the caller asks for — the pre-existing effectiveCap input. */
  maxLeads?: number
  /** Explicit proof mode: the pass number the proof ROUTE claimed. Absent = a normal run. */
  proof?: number
  /** Simulate an ICP that does not exist for this client (or belongs to someone else). */
  icpMissing?: boolean
}, rec: Rec) {
  vi.resetModules()

  vi.doMock('@kind/db', () => {
    const singleFor = (t: string) => {
      if (t === 'icps') return opts.icpMissing ? null : ICP_ROW
      if (t === 'clients') return { id: 'c1', leads_per_run: null, is_demo: false, user_id: 'u1', credit_balance: 0 }
      return null
    }
    const makeQuery = (table: string) => {
      const q: Record<string, unknown> = {}
      for (const m of ['select', 'in', 'is', 'neq', 'not', 'order', 'or', 'gte', 'lte']) q[m] = () => q
      q.eq = (col: string, val: unknown) => { rec.eqs.push({ table, col, val }); return q }
      q.limit       = async (n?: number) => {
        if (table === 'lead_pool') {
          // servePoolLeads pulls a buffer of max(cap*5, 50) then .slice(0, cap). Recording
          // n lets the test read back the cap the proof path actually handed the pool.
          if (typeof n === 'number') rec.poolCap = n >= 50 ? Math.round(n / 5) : null
          const rows = Array.from({ length: opts.pool ?? 0 }, (_, i) => ({
            email_norm: `pool${i}@acme.co`, first_name: 'P', last_name: String(i),
            title: 'CTO', seniority: 'C-Suite', company: 'Acme', industry: 'SaaS',
            company_size: '11-50', country: 'United Kingdom', linkedin_url: null,
          }))
          return { data: rows, error: null }
        }
        return { data: [], error: null }
      }
      q.single      = async () => ({ data: singleFor(table), error: null })
      q.maybeSingle = async () => ({ data: singleFor(table), error: null })
      q.update      = (patch: Record<string, unknown>) => {
        if (table === 'leads') rec.leadUpdates.push(patch)
        const chain: Record<string, unknown> = {}
        for (const m of ['eq', 'in', 'is', 'neq']) chain[m] = () => chain
        ;(chain as { then: unknown }).then = (r: (v: unknown) => void) => r({ error: null })
        return chain
      }
      q.upsert = async () => ({ error: null })
      q.insert = (rows?: unknown) => {
        if (table === 'leads') rec.leadInserts += Array.isArray(rows) ? rows.length : 1
        return {
          select: () => ({
            single: async () => ({ data: { id: `lead-${rec.leadInserts}` }, error: null }),
            then:   (r: (v: unknown) => void) => r({
              data: Array.isArray(rows) ? rows.map((_, i) => ({ id: `lead-${i}` })) : [], error: null,
            }),
          }),
          then: (r: (v: unknown) => void) => r({ error: null }),
        }
      }
      // credit_transactions drives fundedVia: a purchase row WITH a provider reference is
      // real money; no rows at all is a prospect.
      q.then = (r: (v: unknown) => void) => r({
        data: table === 'credit_transactions'
          ? (opts.funded === 'real' ? [{ type: 'purchase', reference: 'cs_live_123' }] : [])
          : [],
        count: 0, error: null,
      })
      return q
    }
    return {
      db: {
        from: (t: string) => makeQuery(t),
        rpc: async (fn: string, args: Record<string, unknown>) => {
          rec.rpcs.push({ fn, args })
          if (fn === 'try_claim_proof_pass')       return { data: opts.pass ?? 1, error: null }
          // The corrected contract (22 Aug round 2): reserve returns jsonb with the
          // reservation's identity, and release must address that identity.
          if (fn === 'try_reserve_proof_records' && opts.reserveNoAnswer) return { data: null, error: null }
          if (fn === 'try_reserve_proof_records')  return { data: {
            granted: opts.reserve ?? 10,
            reservation_id: (opts.reserve ?? 10) > 0 ? 'res-1' : null,
            reason: opts.reserveReason ?? ((opts.reserve ?? 10) > 0 ? 'GRANTED' : 'MONTHLY_PROOF_BUDGET_REACHED'),
          }, error: null }
          if (fn === 'try_spend_sourcing')         return { data: opts.grant ?? 10, error: null }
          return { data: null, error: null }
        },
        auth: { admin: {
          listUsers:   async () => ({ data: { users: [] }, error: null }),
          getUserById: async () => ({ data: { user: { email: '' } }, error: null }),
        } },
      },
    }
  })

  vi.doMock('./alerts', () => ({
    sendFounderAlert: async (_k: string, subject: string, lines: string[]) => {
      rec.alerts.push({ subject, lines })
    },
  }))

  // The house/client decision is proved in provider-boundary.test.ts; pinned here so the
  // FUNDING branch is what this file is testing.
  vi.doMock('./provider-boundary', async () => {
    const real = await vi.importActual<typeof import('./provider-boundary')>('./provider-boundary')
    return { ...real, audienceForClient: async () => 'client', audienceForUser: async () => 'client' }
  })

  const contacts = Array.from({ length: opts.contacts ?? 0 }, (_, i) => ({
    id: `pdl_${i}`, first_name: 'A', last_name: 'B', email: null, email_status: null,
    linkedin_url: null, title: null, seniority: null, country: null,
    organization_name: null, organization: null,
  }))

  // ⚑ 24 Aug — THE PAID REVEAL/DELIVERY DOOR, recorded rather than executed. This is the
  // function that sends ids to Apollo's bulk_match and then runs the Hunter waterfall; a
  // free-proof run reaching it is the defect this file now guards. Mocked so the guard reads
  // WHETHER it was called, and so no test can ever touch a real enrichment path.
  vi.doMock('./lead-delivery', () => ({
    enrichAndDeliverLeads: async (_clientId: string, ids: string[]) => { rec.enrich.push(ids); return 0 },
  }))

  vi.doMock('./apollo', () => ({
    searchPeopleWithFallback: async () => ({ contacts, relaxed: false }),
    ApolloCreditsExhaustedError: class extends Error {},
    ApolloRateLimitError: class extends Error {},
  }))

  const { runIcpJob } = await import('../routes/icps')
  return runIcpJob('icp-1', 'c1', 'u1', opts.maxLeads ?? 20,
    // The route claims the pass and hands the claim over; a run without it is normal.
    ...(opts.proof ? [{ proofPass: opts.proof }] as const : []))
}

/**
 * Drives the REAL POST /icps/:id/proof handler inside the same mock world as runJob —
 * the client's one proof entry: owns-the-ICP check, prospect-only check, atomic pass
 * claim, then the proof-mode run, fire-and-forget.
 */
async function runProofRoute(opts: Parameters<typeof runJob>[0], rec: Rec, userId = 'u1') {
  vi.resetModules()
  const setup = runJob(opts, rec)                       // installs the doMocks…
  await setup.catch(() => {})                           // …and runs one job we ignore below
  rec.rpcs.length = 0; rec.leadUpdates.length = 0; rec.eqs.length = 0; rec.alerts.length = 0
  const mod = await import('../routes/icps')
  const layer = (mod.icpRouter as unknown as { stack: Array<Record<string, any>> }).stack
    .find(l => l.route?.path === '/:id/proof' && l.route?.methods?.post)
  expect(layer, 'POST /icps/:id/proof missing').toBeTruthy()
  const handler = layer!.route.stack[layer!.route.stack.length - 1].handle
  const res = {
    statusCode: 200, body: null as unknown,
    status(c: number) { this.statusCode = c; return this },
    json(b: unknown) { this.body = b; return this },
  }
  await handler({ params: { id: 'icp-1' }, body: {}, headers: {}, userId }, res)
  return res
}

const prev = {
  anthropic: process.env.ANTHROPIC_API_KEY,
  url: process.env.SUPABASE_URL,
  anon: process.env.SUPABASE_ANON_KEY,
}

describe('runIcpJob routes an unpaid prospect to the PROOF authority, never the paid one', () => {
  beforeEach(() => {
    // `middleware/auth.ts` calls createClient() at module scope, so importing routes/icps
    // throws without these. Dummies — no client is ever used; every read goes through the
    // mocked @kind/db.
    process.env.ANTHROPIC_API_KEY = 'test-key'
    process.env.SUPABASE_URL      = 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'
  })
  afterEach(() => {
    vi.doUnmock('./provider-boundary'); vi.doUnmock('./apollo'); vi.doUnmock('./alerts')
    vi.resetModules()
    process.env.ANTHROPIC_API_KEY = prev.anthropic
    process.env.SUPABASE_URL = prev.url
    process.env.SUPABASE_ANON_KEY = prev.anon
  })

  it('A PROOF RUN never calls try_spend_sourcing — and never claims its own pass', async () => {
    const rec = emptyRec()
    await runJob({ funded: null, proof: 1, contacts: 5 }, rec)
    const names = rec.rpcs.map(r => r.fn)
    expect(names).toContain('try_reserve_proof_records')
    expect(names).not.toContain('try_spend_sourcing')
    expect(names).not.toContain('add_sourcing_allowance')
    // The pass travels IN — the run claiming one itself is exactly the round-4 defect.
    expect(names).not.toContain('try_claim_proof_pass')
  })

  it('THE ROUTE CLAIMS THE PASS BEFORE ANYTHING RUNS — a pool-only batch still spends one', async () => {
    const rec = emptyRec()
    const res = await runProofRoute({ funded: null, pool: 3, contacts: 0 }, rec)
    expect(res.statusCode).toBe(200)
    expect((res.body as { data: { pass: number } }).data.pass).toBe(1)
    const names = rec.rpcs.map(r => r.fn)
    // The claim is the FIRST rpc of the whole flow — before the pool serve, before any
    // reservation — so a prospect with a well-covered pool still spends a pass.
    expect(names[0]).toBe('try_claim_proof_pass')
  })

  it('WHEN BOTH PASSES ARE USED, THE ROUTE REFUSES — a human takes over, nothing runs', async () => {
    const rec = emptyRec()
    const res = await runProofRoute({ funded: null, pass: 0 }, rec)
    expect(res.statusCode).toBe(409)
    expect(String((res.body as { error: string }).error)).toMatch(/two sets of leads/i)
    const names = rec.rpcs.map(r2 => r2.fn)
    expect(names).toContain('try_claim_proof_pass')
    expect(names).not.toContain('try_reserve_proof_records')
    expect(names).not.toContain('try_spend_sourcing')
    expect(rec.leadInserts).toBe(0)
  })

  it('an under-return releases the proof reservation, not the paid allowance', async () => {
    const rec = emptyRec()
    await runJob({ funded: null, proof: 1, reserve: 20, contacts: 8 }, rec)
    const names = rec.rpcs.map(r => r.fn)
    expect(names).toContain('release_proof_records')
    expect(names).not.toContain('add_sourcing_allowance')
    const rel = rec.rpcs.find(r => r.fn === 'release_proof_records')!
    expect(rel.args.p_records).toBe(12)          // 20 reserved − 8 returned
    // …and it addresses THE reservation, not the client aggregate — the identity is what
    // makes a replayed reconcile a no-op instead of a second decrement.
    expect(rel.args.p_reservation_id).toBe('res-1')
    expect('p_client_id' in rel.args).toBe(false)
  })

  it('proof leads are surfaced AND delivered, and revealed_at is never set', async () => {
    const rec = emptyRec()
    await runJob({ funded: null, proof: 1, reserve: 5, contacts: 3 }, rec)
    const surf = rec.leadUpdates.find(u => 'surfaced_for_approval_at' in u)
    expect(surf).toBeTruthy()
    expect(surf).toHaveProperty('delivered_at')
    // Nothing anywhere in the run may mark a proof lead revealed — that is the commercial
    // state that carries the pack slot and the $4.
    expect(rec.leadUpdates.some(u => 'revealed_at' in u)).toBe(false)
  })
})

describe('runIcpJob leaves the PAID path exactly as it was', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    process.env.SUPABASE_URL      = 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'
  })
  afterEach(() => {
    vi.doUnmock('./provider-boundary'); vi.doUnmock('./apollo'); vi.doUnmock('./alerts')
    vi.resetModules()
    process.env.ANTHROPIC_API_KEY = prev.anthropic
    process.env.SUPABASE_URL = prev.url
    process.env.SUPABASE_ANON_KEY = prev.anon
  })

  it('A PAYING CLIENT still spends AR8 and never touches proof state', async () => {
    const rec = emptyRec()
    await runJob({ funded: 'real', grant: 15, contacts: 15 }, rec)
    const names = rec.rpcs.map(r => r.fn)
    expect(names).toContain('try_spend_sourcing')
    expect(names).not.toContain('try_claim_proof_pass')
    expect(names).not.toContain('try_reserve_proof_records')
    expect(names).not.toContain('release_proof_records')
  })

  it('a paying client with an under-return still refunds the AR8 allowance', async () => {
    const rec = emptyRec()
    await runJob({ funded: 'real', grant: 20, contacts: 6 }, rec)
    const names = rec.rpcs.map(r => r.fn)
    expect(names).toContain('add_sourcing_allowance')
    expect(names).not.toContain('release_proof_records')
  })

  it('a paying client\'s leads are NOT auto-surfaced by this path', async () => {
    // Paid delivery reaches the desk through start-work / the drip, which is where the
    // operator decides what is sent. Proof surfacing must not quietly change that.
    const rec = emptyRec()
    await runJob({ funded: 'real', grant: 10, contacts: 10 }, rec)
    expect(rec.leadUpdates.some(u => 'surfaced_for_approval_at' in u)).toBe(false)
  })
})

// ── THE 20-LEAD PROOF PASS (22 Aug, round 3) ─────────────────────────────────
//
// GPT found that the proof path was using the pre-existing `effectiveCap` — the paid
// client's per-run target, which the $299 pack sets to 200. So "up to 20 real masked
// leads" was a sentence in the founder's model and nowhere in the code.
//
// The two rules are SEPARATE and this suite pins both halves:
//   CUSTOMER EXPERIENCE — at most 20 SURFACED leads per automatic proof pass.
//   PDL SPEND — at most 40 PDL records across BOTH passes, lifetime.
//
// Pool records cost $0 and never touch the 40-record fence, but they DO fill the 20 —
// a prospect shown 13 from the pool may be bought at most 7 more.
describe('free proof — a proof pass surfaces at most 20 leads', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    process.env.SUPABASE_URL      = 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'
  })
  afterEach(() => {
    vi.doUnmock('./provider-boundary'); vi.doUnmock('./apollo'); vi.doUnmock('./alerts')
    vi.resetModules()
    process.env.ANTHROPIC_API_KEY = prev.anthropic
    process.env.SUPABASE_URL = prev.url
    process.env.SUPABASE_ANON_KEY = prev.anon
  })

  it('AN EFFECTIVE CAP OF 200 STILL ASKS FOR ONLY 20', async () => {
    // The $299 pack sets leads_per_run high so a paying client can pass on half. A
    // prospect is not a paying client.
    const rec = emptyRec()
    await runJob({ funded: null, proof: 1, maxLeads: 200, pool: 0, contacts: 0 }, rec)
    const res = rec.rpcs.find(r => r.fn === 'try_reserve_proof_records')!
    expect(res.args.p_requested).toBe(20)
  })

  it('POOL 13 → PDL IS ASKED FOR AT MOST 7', async () => {
    const rec = emptyRec()
    await runJob({ funded: null, proof: 1, maxLeads: 200, pool: 13, contacts: 0 }, rec)
    const res = rec.rpcs.find(r => r.fn === 'try_reserve_proof_records')!
    expect(res.args.p_requested).toBe(7)
  })

  it('POOL 20 → NO PDL RESERVATION AT ALL', async () => {
    const rec = emptyRec()
    await runJob({ funded: null, proof: 1, maxLeads: 200, pool: 20, contacts: 0 }, rec)
    expect(rec.rpcs.map(r => r.fn)).not.toContain('try_reserve_proof_records')
  })

  it('a pool holding 25 matches still surfaces only 20 for the pass', async () => {
    const rec = emptyRec()
    await runJob({ funded: null, proof: 1, maxLeads: 200, pool: 25, contacts: 0 }, rec)
    expect(rec.poolCap).toBe(20)                     // the cap handed to servePoolLeads
    expect(rec.rpcs.map(r => r.fn)).not.toContain('try_reserve_proof_records')
  })

  it('A PAYING CLIENT\'S CAP IS UNTOUCHED — still the full effectiveCap', async () => {
    const rec = emptyRec()
    await runJob({ funded: 'real', maxLeads: 200, pool: 0, grant: 200, contacts: 0 }, rec)
    const spend = rec.rpcs.find(r => r.fn === 'try_spend_sourcing')!
    expect(spend.args.p_requested).toBe(200)         // NOT 20 — the 20 is a proof rule only
  })
})

// ── THE TWO WAYS A RESERVATION CAN RETURN ZERO (22 Aug, round 3) ─────────────
//
// GPT found the caller treated EVERY zero grant as "the $300 monthly acquisition budget
// is spent". It is not: a zero is far more often just this prospect finishing their own
// 40 records. Alerting the founder that his acquisition budget is gone, when it is not,
// is the kind of false alarm that trains someone to ignore the real one.
describe('free proof — a prospect finishing their 40 is not a company budget alert', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    process.env.SUPABASE_URL      = 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'
  })
  afterEach(() => {
    vi.doUnmock('./provider-boundary'); vi.doUnmock('./apollo'); vi.doUnmock('./alerts')
    vi.resetModules()
    process.env.ANTHROPIC_API_KEY = prev.anthropic
    process.env.SUPABASE_URL = prev.url
    process.env.SUPABASE_ANON_KEY = prev.anon
  })

  it('CLIENT_PROOF_LIMIT_REACHED DOES NOT RAISE THE $300 ALERT', async () => {
    const rec = emptyRec()
    await runJob({ funded: null, proof: 1, reserve: 0, reserveReason: 'CLIENT_PROOF_LIMIT_REACHED', pool: 0 }, rec)
    const budgetAlerts = rec.alerts.filter(a => /acquisition budget/i.test(a.subject))
    expect(budgetAlerts).toHaveLength(0)
  })

  it('MONTHLY_PROOF_BUDGET_REACHED DOES raise it', async () => {
    const rec = emptyRec()
    await runJob({ funded: null, proof: 1, reserve: 0, reserveReason: 'MONTHLY_PROOF_BUDGET_REACHED', pool: 0 }, rec)
    const budgetAlerts = rec.alerts.filter(a => /acquisition budget/i.test(a.subject))
    expect(budgetAlerts).toHaveLength(1)
    // …and it must say plainly that paying clients are untouched, because the whole point
    // of the separate budget is that acquisition cannot starve delivery.
    expect(budgetAlerts[0].lines.join(' ')).toMatch(/PAYING CLIENTS ARE UNAFFECTED/)
  })

  it('AN UNEXPLAINED REFUSAL IS NOT REPORTED AS THE BUDGET RUNNING OUT', async () => {
    // The RPC always returns a reason, so a missing one means the CALL failed — a
    // transport error, a function not yet created in this database. Announcing "the $300
    // acquisition budget is spent" on the strength of an RPC that never answered would be
    // stating a fact about company money that nothing established.
    const rec = emptyRec()
    await runJob({ funded: null, proof: 1, reserveNoAnswer: true, pool: 0 }, rec)
    expect(rec.alerts.filter(a => /acquisition budget/i.test(a.subject))).toHaveLength(0)
    // And nothing was bought: a refusal we cannot explain still spends nothing.
    expect(rec.rpcs.some(r => r.fn === 'try_spend_sourcing')).toBe(false)
  })

  it('POOL-ONLY PROOF STILL WORKS WHEN THE MONTHLY PDL BUDGET IS GONE', async () => {
    // Owned records cost nothing, so a spent acquisition budget must not stop us showing
    // a prospect real leads we already have.
    const rec = emptyRec()
    const r = await runJob({
      funded: null, proof: 1, maxLeads: 200, pool: 12, reserve: 0,
      reserveReason: 'MONTHLY_PROOF_BUDGET_REACHED', contacts: 0,
    }, rec)
    expect(r.inserted).toBe(12)
    expect(rec.leadUpdates.some(u => 'surfaced_for_approval_at' in u)).toBe(true)
  })
})

// ── ROUND 4 — PROOF AUTHORITY IS INVOKED DELIBERATELY, NEVER INFERRED ─────────
//
// The first wiring let `runIcpJob` decide "this is a proof run" whenever `fundedVia`
// returned null. That made proof a property of the ACCOUNT rather than of the ACTION: a
// nightly cron, an operator run, an admin kick or a partner route hitting a never-funded
// account would silently consume one of the prospect's two proof passes and reserve
// acquisition money the founder meant for a deliberate proof batch. Found in review.
//
// Now proof is an execution mode the caller must ask for — the client's own proof route
// claims the pass and hands `runIcpJob` the claim. A run without that claim is a normal
// run whoever the account is, and a never-funded account on the normal path simply has no
// budget (try_spend_sourcing grants 0), which is the pre-proof behaviour restored.
describe('round 4 — proof is an execution mode, not an account property', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    process.env.SUPABASE_URL      = 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'
  })
  afterEach(() => {
    vi.doUnmock('./provider-boundary'); vi.doUnmock('./apollo'); vi.doUnmock('./alerts')
    vi.resetModules()
    process.env.ANTHROPIC_API_KEY = prev.anthropic
    process.env.SUPABASE_URL = prev.url
    process.env.SUPABASE_ANON_KEY = prev.anon
  })

  it('A NORMAL RUN ON A NEVER-FUNDED ACCOUNT MUST NOT TOUCH PROOF AUTHORITY', async () => {
    // THE DEFECT, ASSERTED: no proof mode was asked for, so no proof pass may be claimed
    // and no acquisition money reserved — whatever fundedVia would say about this account.
    const rec = emptyRec()
    await runJob({ funded: null, pool: 0, contacts: 0 }, rec)
    const names = rec.rpcs.map(r => r.fn)
    expect(names).not.toContain('try_claim_proof_pass')
    expect(names).not.toContain('try_reserve_proof_records')
    // The normal fence answers instead — and for a never-funded account it grants 0.
    expect(names).toContain('try_spend_sourcing')
  })

  it('A NORMAL RUN DOES NOT AUTO-SURFACE A NEVER-FUNDED ACCOUNT\'S LEADS', async () => {
    // Surfacing is the proof experience. A normal run that somehow inserts leads for a
    // never-funded account (grant > 0 cannot happen in prod, but the mock can) must not
    // quietly put them on the prospect's desk as if a proof pass had been spent.
    const rec = emptyRec()
    await runJob({ funded: null, pool: 0, contacts: 5, grant: 5 }, rec)
    expect(rec.leadUpdates.some(u => 'surfaced_for_approval_at' in u)).toBe(false)
  })

  it('THE CLIENT PROOF ROUTE EXISTS — POST /icps/:id/proof', async () => {
    vi.resetModules()
    const mod = await import('../routes/icps')
    const layer = (mod.icpRouter as unknown as { stack: Array<Record<string, any>> }).stack
      .find(l => l.route?.path === '/:id/proof' && l.route?.methods?.post)
    expect(layer, 'POST /icps/:id/proof is the client\'s only proof entry — it does not exist').toBeTruthy()
  })

  it('A FUNDED ACCOUNT IN PROOF MODE IS REFUSED — no reserve, no spend', async () => {
    // Defense in depth behind the route's own check: even if a caller hands proof mode a
    // paying client, the run must not let paid money and proof money cross.
    const rec = emptyRec()
    const r = await runJob({ funded: 'real', proof: 1, contacts: 5 }, rec)
    const names = rec.rpcs.map(r2 => r2.fn)
    expect(names).not.toContain('try_reserve_proof_records')
    expect(names).not.toContain('try_spend_sourcing')
    expect(r.inserted).toBe(0)
  })
})

// ── ROUND 4 — THE PROOF DOOR ITSELF ──────────────────────────────────────────
describe('POST /icps/:id/proof — the client\'s one proof entry, and its fences', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    process.env.SUPABASE_URL      = 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'
  })
  afterEach(() => {
    vi.doUnmock('./provider-boundary'); vi.doUnmock('./apollo'); vi.doUnmock('./alerts')
    vi.resetModules()
    process.env.ANTHROPIC_API_KEY = prev.anthropic
    process.env.SUPABASE_URL = prev.url
    process.env.SUPABASE_ANON_KEY = prev.anon
  })

  it('a prospect can request proof for their own ICP — pass 1 then pass 2', async () => {
    const rec = emptyRec()
    const r1 = await runProofRoute({ funded: null, pass: 1, pool: 2 }, rec)
    expect(r1.statusCode).toBe(200)
    expect((r1.body as { data: { pass: number } }).data.pass).toBe(1)
    const r2 = await runProofRoute({ funded: null, pass: 2, pool: 2 }, rec)
    expect((r2.body as { data: { pass: number } }).data.pass).toBe(2)
  })

  it('AN ICP THAT IS NOT THEIRS IS A 404 — and the lookup is client-scoped in the query', async () => {
    const rec = emptyRec()
    const res = await runProofRoute({ funded: null, icpMissing: true }, rec)
    expect(res.statusCode).toBe(404)
    // The scoping is IN the query, not in an after-the-fact comparison: the icps lookup
    // carries the caller's own client_id, so someone else's ICP id reads as missing.
    expect(rec.eqs.some(e => e.table === 'icps' && e.col === 'client_id' && e.val === 'c1')).toBe(true)
    // Nothing was claimed for an ICP they do not own.
    expect(rec.rpcs.map(r => r.fn)).not.toContain('try_claim_proof_pass')
  })

  it('THE PROOF REQUEST NEVER MAKES THE ICP LIVE', async () => {
    const rec = emptyRec()
    await runProofRoute({ funded: null, pool: 3 }, rec)
    await new Promise(r => setTimeout(r, 80))     // let the fire-and-forget run finish
    // No icps write anywhere in the flow set is_active — activation stays K.I.N.D-only.
    expect(rec.eqs.filter(e => e.table === 'icps' && e.col === 'is_active')).toHaveLength(0)
  })

  it('A PAID OR COMPED ACCOUNT CANNOT DRAW FREE-PROOF AUTHORITY — 403, no pass spent', async () => {
    const rec = emptyRec()
    const res = await runProofRoute({ funded: 'real' }, rec)
    expect(res.statusCode).toBe(403)
    expect(String((res.body as { error: string }).error)).toMatch(/already live/i)
    const names = rec.rpcs.map(r => r.fn)
    expect(names).not.toContain('try_claim_proof_pass')
    expect(names).not.toContain('try_reserve_proof_records')
  })

  it('NO COMMERCIAL SIDE EFFECT ANYWHERE IN A PROOF REQUEST', async () => {
    const rec = emptyRec()
    await runProofRoute({ funded: null, pool: 3, reserve: 5, contacts: 2 }, rec)
    await vi.waitFor(() => expect(rec.leadUpdates.some(u => 'surfaced_for_approval_at' in u)).toBe(true), { timeout: 2000 })
    // Surfaced and delivered — and NOTHING commercial: no reveal, no charge, no enrolment.
    expect(rec.leadUpdates.some(u => 'revealed_at' in u)).toBe(false)
    const names = rec.rpcs.map(r => r.fn)
    for (const forbidden of ['approve_lead_atomic', 'increment_emails_sent', 'try_spend_sourcing']) {
      expect(names).not.toContain(forbidden)
    }
  })
})

// ── FREE PROOF NEVER ENTERS THE PAID DELIVERY PATH (founder-ruled 24 Aug) ────────────────
//
// THE LIVE DEFECT. `runIcpJob`'s delivery block read `if (insertedIds.length > 0)` and
// nothing else, so a free-proof run fell into paid delivery: 20 PDL ids went to Apollo's
// `bulkMatchEmails` (AR5 refused every one — correctly — and logged it, which is how this
// was found), then the HUNTER WATERFALL ran over the email-less leads if the key was set.
// Every lead Hunter FOUND an address for was stamped `delivered_at` — and the proof
// surfacing block below claims `.is('delivered_at', null)`, so it skipped exactly those
// rows. They got `delivered_at` but never `surfaced_for_approval_at`, and
// `/leads/for-approval` requires BOTH.
//
// So the client saw only the leads Hunter FAILED on. Sourcing worked, proof worked, and the
// successful enrichments are what made the leads disappear.
//
// ⚠️ WHAT THESE GUARDS PROTECT, in both directions. Free proof must not reach that door;
// PAID must still walk through it exactly as before. The second half matters as much as the
// first — a fix that quietly stopped delivering paid leads would be a worse bug than this one.
describe('free proof never reaches the paid reveal/delivery path', () => {
  beforeEach(() => { process.env.SUPABASE_URL = 'http://x'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'k' })
  afterEach(() => { vi.resetModules(); vi.restoreAllMocks() })

  it('A PROOF RUN WITH LEADS NEVER CALLS enrichAndDeliverLeads', async () => {
    const rec = emptyRec()
    await runJob({ funded: null, proof: 1, reserve: 20, contacts: 20 }, rec)
    expect(rec.leadInserts, 'the run really did insert leads').toBeGreaterThan(0)
    expect(rec.enrich, 'the paid reveal/delivery door was never opened').toEqual([])
  })

  it('…and it STILL surfaces them, which is the whole point', async () => {
    const rec = emptyRec()
    await runJob({ funded: null, proof: 1, reserve: 20, contacts: 20 }, rec)
    const surf = rec.leadUpdates.find(u => 'surfaced_for_approval_at' in u)
    expect(surf, 'proof leads are surfaced by the proof block').toBeTruthy()
    // BOTH fields, because /leads/for-approval requires both — that is the bug's mechanism.
    expect(surf).toHaveProperty('delivered_at')
    // …and nothing was revealed. A proof lead stays masked and commercially inert.
    expect(rec.leadUpdates.some(u => 'revealed_at' in u), 'revealed_at is never set').toBe(false)
  })

  it('A PAID RUN STILL CALLS IT — the fix must not stop delivering to paying clients', async () => {
    const rec = emptyRec()
    await runJob({ funded: 'real', grant: 20, contacts: 20 }, rec)
    expect(rec.leadInserts).toBeGreaterThan(0)
    expect(rec.enrich.length, 'the paid path still enriches and delivers').toBe(1)
    expect(rec.enrich[0].length, 'and it is given the inserted leads').toBeGreaterThan(0)
  })

  it('a NEVER-FUNDED account on a NORMAL run is still the paid path — proof is a MODE', async () => {
    // Round 4's rule, re-asserted here: proof-ness comes from the claimed pass, never from
    // the absence of money. A normal run on a prospect must behave like any other normal run.
    const rec = emptyRec()
    await runJob({ funded: null, grant: 20, contacts: 20 }, rec)
    expect(rec.enrich.length, 'no proof claim → the ordinary delivery path').toBe(1)
  })

  it('the guard reads the SAME proofMode everything else does — no second flag', () => {
    const src = readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')
    expect(src).toContain('if (!proofMode && insertedIds.length > 0) {')
    expect(src).toContain('const proofMode = (opts?.proofPass ?? 0) > 0')
    // ⚠️ COUNTED ON THE SOURCE OF PROOF-NESS, NOT THE NAME. A first cut counted
    // `const proofMode =` — and RED G7, which added a second flag called `proofMode2`
    // derived from the same `opts?.proofPass`, PASSED, because the regex did not match the
    // new name. A guard that a rename defeats does not protect the thing it names. Exactly
    // ONE place may read the claimed pass into a boolean; every other consumer reads that
    // boolean.
    // ⚑ 24 Aug (batch refinement) — REFINED, NOT RELAXED. This counted every read of
    // `opts?.proofPass` and required exactly one. Pass-2 calibration precedence legitimately
    // adds a SECOND read — but it asks a different question ("is this pass TWO?"), not a
    // second notion of proof-ness. So the count moves onto the DERIVATION itself: proof-ness
    // is computed in exactly one place, and the only other permitted read is the pass-number
    // rule, also exactly once. RED G7 (a `proofMode2` alias) and G7b (re-deriving inline at
    // the delivery guard) both still fail, which is what this guard was written for.
    expect((src.match(/proofPass \?\? 0/g) ?? []), 'one derivation of proof-ness').toHaveLength(1)
    expect((src.match(/opts\?\.proofPass === 2/g) ?? []), 'one pass-number rule').toHaveLength(1)
    expect((src.match(/opts\?\.proofPass/g) ?? []), 'and nothing else reads it').toHaveLength(2)
  })

  it('the proof surfacing block itself is UNCHANGED — same claim, same two fields', () => {
    const src = readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')
    expect(src).toContain("if (proofMode && insertedIds.length > 0) {")
    expect(src).toContain(".update({ surfaced_for_approval_at: nowIso, delivered_at: nowIso })")
    expect(src).toContain(".in('id', insertedIds).is('delivered_at', null)")
  })

  it('NO Hunter, Apollo or reveal implementation was touched by this fix', () => {
    const delivery = readFileSync(join(__dirname, './lead-delivery.ts'), 'utf8')
    const apollo   = readFileSync(join(__dirname, './apollo.ts'), 'utf8')
    // The paid path's machinery is exactly as it was — this build changed WHO enters it.
    expect(delivery).toContain('if (process.env.HUNTER_API_KEY) {')
    expect(delivery).toContain('const revealed = await bulkMatchEmails(needEmail.map(r => r.apollo_id as string))')
    expect(apollo).toContain('const ids = apolloRevealableIds(apolloIds)')
    expect(apollo).toContain('bulk_match: AR5 refused ${refused} non-Apollo id(s) — routed to the Hunter waterfall instead')
    // …and delivery still cannot charge (#420's invariant).
    expect(delivery).toContain('INVARIANT VIOLATED: delivery must not charge')
  })

  it('and no extra provider call or fence change came with it', () => {
    const src = readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')
    // One search call site, one proof-pass claim, one reservation — all as before.
    expect((src.match(/searchPeopleWithFallback\(/g) ?? [])).toHaveLength(1)
    expect(src).toContain("db.rpc('try_claim_proof_pass', { p_client_id: clientId })")
    expect(src).toContain("db.rpc('try_reserve_proof_records'")
    expect(src).toContain('const PROOF_PASS_LEADS = 20')
    expect(src).toContain('PROOF_CLIENT_RECORD_CAP = 40')
    // …and #1447/#1448 are still where they were.
    const pdl = readFileSync(join(__dirname, './pdl-search.ts'), 'utf8')
    expect(pdl).toContain("if (opts?.proofMode !== true) must.push({ exists: { field: 'work_email' } })")
    expect(pdl).toContain("'Head of':                ['manager', 'director', 'vp'],")
    expect(pdl).toContain("'1,000+': ['1001-5000', '5001-10000', '10001+'],")
    expect(pdl).toContain('canonicalLaunchCountry(g)')
  })
})

// ── THE BATCH VERDICT: PASS 1 → REFINE → PASS 2 → HUMAN (founder-ruled 24 Aug) ───────────
//
// The server rule was complete from the start — two passes, then a 409 with a human
// sentence — but nothing on the desk could SPEND the second one. A prospect who told Milla
// conversationally that the batch was wrong was sent to go and find My ICP, because the
// shared chat engine has no tools and does not know the ICP id or the pass count.
//
// This is the desk-controlled half: an explicit batch verdict, their words turned into
// targeting by the converter that already exists, the revision shown back, and only then —
// on an explicit confirm — the SAME ICP updated and pass 2 claimed exactly once.
//
// ⚠️ EVERY GUARD BELOW IS ABOUT WHERE THE SPEND BOUNDARY SITS. Opening the control, and
// describing what is wrong, must cost nothing and mutate nothing.
describe('batch refinement — pass 1 → refine → pass 2, then a human', () => {
  const desk = () => readFileSync(join(__dirname, '../../../portal/src/app/(milla)/milla/page.tsx'), 'utf8')
  /** Comments stripped — absence is asserted on CODE, the convention this repo uses everywhere. */
  const deskCode = () => desk().replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')
  /**
   * ONLY confirmRefine's body.
   *
   * ⚠️ BOUNDED AT THE FIRST MEMBER AT 2-SPACE INDENT, which is the real end of the function.
   * Two looser cuts were both caught by mutation rather than by reading: slicing to
   * end-of-file matched "send" in the chat composer 300 lines below, and slicing to the next
   * NAMED landmark still swallowed anything inserted between — a stray function carrying a
   * second `/proof` POST sat inside the slice and the guard stayed green.
   */
  const confirmBody = () => {
    const d = desk()
    const from = d.indexOf('async function confirmRefine')
    expect(from, 'confirmRefine exists').toBeGreaterThan(-1)
    const rest = d.slice(from + 1)
    const end = rest.search(/\n {2}(?:\/\/|\/\*|async function |function |useEffect\(|const |return )/)
    expect(end, 'the next top-level member after it').toBeGreaterThan(-1)
    return rest.slice(0, end)
  }
  const summarySrc = () => readFileSync(join(__dirname, './milla-summary.ts'), 'utf8')

  it('proof state comes from the EXISTING server column — no second counter', () => {
    const s = summarySrc()
    expect(s).toContain("db.from('clients').select('wallet_balance_usd, proof_passes_done')")
    expect(s).toContain('proof_passes_done: Number((client as Record<string, number> | null)?.proof_passes_done ?? 0)')
    // …and the desk reads THAT, rather than counting anything itself.
    expect(desk()).toContain('const proofPassesDone = summary?.proof_passes_done ?? 0')
    expect(desk()).not.toMatch(/passesUsed|proofCount|localPass/)
  })

  it('the control is PROOF-ONLY — a paying client never sees it', () => {
    const d = desk()
    // Both conditions. `proofMode` is the authoritative unpaid signal (has_funded = real
    // purchases); the pass count alone is NOT one, because a client who later paid still
    // carries proof_passes_done = 1 forever.
    expect(d).toContain('const canRefine       = proofMode && proofPassesDone === 1')
    expect(d).toContain('const proofExhausted  = proofMode && proofPassesDone >= 2')
    expect(d).toContain('const proofMode = needsGoLive')
    expect(d).toContain('const needsGoLive = !!summary && summary.icp_versions.length > 0 && !summary.has_funded')
    // …and never inferred from anything else.
    expect(d).not.toMatch(/canRefine\s*=\s*[^&]*wallet_balance|canRefine\s*=\s*[^&]*company_name/)
  })

  it('pass 0 and pass 2 do NOT offer another automatic run', () => {
    const d = desk()
    // `=== 1` is the whole point: not `>= 1`, which would offer a third after pass 2.
    expect(d).toContain('proofPassesDone === 1')
    expect(d).not.toContain('proofPassesDone >= 1')
    expect(d).toContain("These aren&rsquo;t right")
    // The exhausted state is a STATEMENT, with no action attached.
    expect(d).toContain('We&rsquo;ve used both proof passes. K.I.N.D will review this with you.')
  })

  it('the wording is the founder\'s, verbatim', () => {
    const d = desk()
    expect(d).toContain('What&rsquo;s off about this batch?')
    expect(d).toContain('Use this refinement and find another set?')
  })

  it('OPENING the control spends nothing — no call, no mutation', () => {
    const d = desk()
    const open = d.slice(d.indexOf('function openRefine()'), d.indexOf('async function submitRefine'))
    expect(open.length).toBeGreaterThan(0)
    expect(open).not.toMatch(/api\.(post|get|put|patch|delete)/)
  })

  it('DESCRIBING the problem uses the existing converter, and still spends nothing', () => {
    const d = desk()
    const sub = d.slice(d.indexOf('async function submitRefine'), d.indexOf('async function confirmRefine'))
    expect(sub).toContain("'/icps/chat-build'")            // the existing NL → targeting path
    expect(sub).not.toContain('/icps/revise')              // no mutation yet
    expect(sub).not.toMatch(/\/proof/)                     // and no pass claimed
  })

  it('THE SPEND BOUNDARY — revise happens BEFORE proof, and only on confirm', () => {
    const d = desk()
    const confirm = confirmBody()
    const reviseAt = confirm.indexOf("'/icps/revise'")
    const proofAt  = confirm.indexOf('/proof`')
    expect(reviseAt, 'revise is called').toBeGreaterThan(-1)
    expect(proofAt, 'proof is called').toBeGreaterThan(-1)
    expect(reviseAt).toBeLessThan(proofAt)
    // A failed revise must NOT reach the pass claim — the throw between them is what guarantees it.
    expect(confirm).toContain("if (!afterId || afterId !== core.id) throw new Error('same-icp')")
  })

  it('SAME ICP — proved at runtime, not only in this file', () => {
    const d = desk()
    expect(d).toContain("const before = await api.get<{ data: Array<IcpTargeting & { id: string }> }>('/icps', tk)")
    expect(d).toContain('afterId !== core.id')
    expect(d).toContain('await api.post(`/icps/${afterId}/proof`, {}, tk)')
    // No path anywhere on this desk creates an ICP.
    expect(d).not.toMatch(/api\.post\(\s*'\/icps'\s*,/)
  })

  it('the pass is claimed EXACTLY ONCE, and never retried', () => {
    const d = desk()
    // ⚠️ ON CODE, NOT SOURCE. Three of the four `/proof\`` mentions on this page are
    // COMMENTS explaining why the poll may only read and why a second POST would cost the
    // client their last pass — exactly the reasoning that must stay written down. Counting
    // the source made this guard fail on its own explanation.
    expect((deskCode().match(/\/proof`/g) ?? []), 'exactly one proof POST').toHaveLength(1)
    // …and that one POST is inside THIS function, exactly once. That is the property the
    // test's name actually claims — one confirmation, one pass consumed.
    expect((confirmBody().match(/\/proof`/g) ?? []), 'one POST per confirmation').toHaveLength(1)
    // ⚠️ BANS RETRY CONSTRUCTS, NOT LOOPS. A first cut banned `for (` outright and failed on
    // `for (const k of keys)` — the MERGE loop over targeting field names, which is the
    // founder's "preserve any field the refinement does not change" rule, not a retry.
    expect(confirmBody()).not.toMatch(/setTimeout|setInterval|while \(/)
    // The failure path is terminal: it sets an error and stops. No retry control, no re-call.
    // ⚠️ SCOPED TO THE FUNCTION, for the same reason as the ban above. The desk carries four
    // legitimate "please try again" strings — approve, pass, and the chat composer — which
    // SHOULD be retryable because none of them spends a proof pass. Banning the phrase across
    // the whole page failed on three unrelated features and would have pushed me to delete
    // working retries to make a test about the proof path go green.
    expect(confirmBody()).toContain('K.I.N.D needs to resolve this.')
    expect(confirmBody()).not.toMatch(/try again|try the search again/i)
  })

  it('a successful pass 2 enters the EXISTING finding experience', () => {
    expect(desk()).toContain("router.push('/milla?finding=1')")
  })

  it('MERGE, never replace — a refinement about titles cannot wipe the geographies', () => {
    const d = desk()
    expect(d).toContain('merged[k] = Array.isArray(next) && next.length > 0 ? next : (core[k] ?? [])')
    // …and only the ICP's own targeting fields are touched. No pricing, campaign or provider.
    expect(d).toContain("const keys = ['job_titles','seniority_levels','industries','company_sizes','geographies','tech_stack','keywords'] as const")
    // ⚠️ BOUNDED TO THE FUNCTION. A first cut sliced to end-of-file and matched "send" in
    // the chat composer 300 lines below — a guard that reads the whole file proves nothing
    // about the function it names.
    expect(confirmBody()).not.toMatch(/stripe|price|campaign|reveal|send/i)
  })

  it('PASS 2 RUNS THE CONFIRMED ICP — old per-lead calibration does not silently narrow it', () => {
    const src = readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')
    expect(src).toContain('const confirmedRefinement = opts?.proofPass === 2')
    expect(src).toContain('if (!confirmedRefinement) try {')
    // …and it SAYS so in the log, so a run that skipped calibration is never a mystery.
    expect(src).toContain('calibration SKIPPED for client')
  })

  it('…but lead_feedback is RETAINED, and paid calibration is untouched', () => {
    const src = readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')
    // The rows are still read, still by the same client-scoped query — nothing is deleted.
    expect(src).toContain("db.from('lead_feedback')")
    expect(src).toContain('narrowSizeBands((icp as { company_sizes?: string[] }).company_sizes ?? [], rows)')
    expect(src).not.toMatch(/delete\(\)[\s\S]{0,80}lead_feedback|lead_feedback[\s\S]{0,80}\.delete\(\)/)
    // The condition is the PASS NUMBER, so pass 1 and every paid run still calibrate.
    expect(src).not.toContain('const confirmedRefinement = proofMode')
    expect(src).not.toContain('if (!proofMode) try {')
  })

  it('and every earlier launch fix is still standing', () => {
    const icps = readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')
    const pdl  = readFileSync(join(__dirname, './pdl-search.ts'), 'utf8')
    const d    = desk()
    // #1449 — proof never enters paid delivery.
    expect(icps).toContain('if (!proofMode && insertedIds.length > 0) {')
    // #1448 — proof asks about fit, paid still asks about reach.
    expect(pdl).toContain("if (opts?.proofMode !== true) must.push({ exists: { field: 'work_email' } })")
    // #1447 — the targeting mappings.
    expect(pdl).toContain("'Head of':                ['manager', 'director', 'vp'],")
    expect(pdl).toContain("'1,000+': ['1001-5000', '5001-10000', '10001+'],")
    expect(pdl).toContain('canonicalLaunchCountry(g)')
    // The server's own pass-3 fence, and the per-lead control, both untouched.
    expect(icps).toContain('We have shown you two sets of leads.')
    expect(d).toContain('Not a fit')
    expect(d).toContain("await api.post(`/leads/${id}/pass`, {}, await token())")
  })
})
