// ═══════════════════════════════════════════════════════════════════════════
// FREE PROOF — WHAT `runIcpJob` ACTUALLY DOES.
//
// `free-proof-fence.test.ts` proves the fence arithmetic. This file proves the CALLER wires
// itself to the right authority — which is the half a fence cannot defend on its own. A
// perfect fence called from the wrong branch protects nothing.
//
// Every assertion below is about which RPCs a real `runIcpJob` invocation reaches, and which
// it must never reach:
//
//   never-funded prospect → try_claim_proof_pass + try_reserve_proof_records
//   paying / comped client → try_spend_sourcing, exactly as before, untouched
//
// Mocks only. No provider, no database, no network.
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

type Rec = {
  rpcs: Array<{ fn: string; args: Record<string, unknown> }>
  leadUpdates: Array<Record<string, unknown>>
  leadInserts: number
  alerts: Array<{ subject: string; lines: string[] }>
  poolCap: number | null
}
const emptyRec = (): Rec => ({ rpcs: [], leadUpdates: [], leadInserts: 0, alerts: [], poolCap: null })

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
}, rec: Rec) {
  vi.resetModules()

  vi.doMock('@kind/db', () => {
    const singleFor = (t: string) => {
      if (t === 'icps') return ICP_ROW
      if (t === 'clients') return { leads_per_run: null, is_demo: false, user_id: 'u1', credit_balance: 0 }
      return null
    }
    const makeQuery = (table: string) => {
      const q: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'in', 'is', 'neq', 'not', 'order', 'or', 'gte', 'lte']) q[m] = () => q
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

  vi.doMock('./apollo', () => ({
    searchPeopleWithFallback: async () => ({ contacts, relaxed: false }),
    ApolloCreditsExhaustedError: class extends Error {},
    ApolloRateLimitError: class extends Error {},
  }))

  const { runIcpJob } = await import('../routes/icps')
  return runIcpJob('icp-1', 'c1', 'u1', opts.maxLeads ?? 20)
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

  it('A NEVER-FUNDED PROSPECT never calls try_spend_sourcing', async () => {
    const rec = emptyRec()
    await runJob({ funded: null, contacts: 5 }, rec)
    const names = rec.rpcs.map(r => r.fn)
    expect(names).toContain('try_claim_proof_pass')
    expect(names).toContain('try_reserve_proof_records')
    expect(names).not.toContain('try_spend_sourcing')
    expect(names).not.toContain('add_sourcing_allowance')
  })

  it('the proof pass is claimed BEFORE any reservation — a pool-only batch still spends one', async () => {
    const rec = emptyRec()
    await runJob({ funded: null, contacts: 0 }, rec)
    const names = rec.rpcs.map(r => r.fn)
    expect(names.indexOf('try_claim_proof_pass')).toBeGreaterThanOrEqual(0)
    expect(names.indexOf('try_claim_proof_pass'))
      .toBeLessThan(names.indexOf('try_reserve_proof_records') === -1 ? Infinity : names.indexOf('try_reserve_proof_records'))
  })

  it('WHEN BOTH PASSES ARE USED, NOTHING IS SOURCED AT ALL', async () => {
    const rec = emptyRec()
    const r = await runJob({ funded: null, pass: 0 }, rec)
    const names = rec.rpcs.map(r2 => r2.fn)
    expect(names).toContain('try_claim_proof_pass')
    expect(names).not.toContain('try_reserve_proof_records')
    expect(names).not.toContain('try_spend_sourcing')
    expect(r.inserted).toBe(0)
    expect(String(r.relaxed)).toMatch(/two sets of leads/i)
  })

  it('an under-return releases the proof reservation, not the paid allowance', async () => {
    const rec = emptyRec()
    await runJob({ funded: null, reserve: 20, contacts: 8 }, rec)
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
    await runJob({ funded: null, reserve: 5, contacts: 3 }, rec)
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
    await runJob({ funded: null, maxLeads: 200, pool: 0, contacts: 0 }, rec)
    const res = rec.rpcs.find(r => r.fn === 'try_reserve_proof_records')!
    expect(res.args.p_requested).toBe(20)
  })

  it('POOL 13 → PDL IS ASKED FOR AT MOST 7', async () => {
    const rec = emptyRec()
    await runJob({ funded: null, maxLeads: 200, pool: 13, contacts: 0 }, rec)
    const res = rec.rpcs.find(r => r.fn === 'try_reserve_proof_records')!
    expect(res.args.p_requested).toBe(7)
  })

  it('POOL 20 → NO PDL RESERVATION AT ALL', async () => {
    const rec = emptyRec()
    await runJob({ funded: null, maxLeads: 200, pool: 20, contacts: 0 }, rec)
    expect(rec.rpcs.map(r => r.fn)).not.toContain('try_reserve_proof_records')
  })

  it('a pool holding 25 matches still surfaces only 20 for the pass', async () => {
    const rec = emptyRec()
    await runJob({ funded: null, maxLeads: 200, pool: 25, contacts: 0 }, rec)
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
    await runJob({ funded: null, reserve: 0, reserveReason: 'CLIENT_PROOF_LIMIT_REACHED', pool: 0 }, rec)
    const budgetAlerts = rec.alerts.filter(a => /acquisition budget/i.test(a.subject))
    expect(budgetAlerts).toHaveLength(0)
  })

  it('MONTHLY_PROOF_BUDGET_REACHED DOES raise it', async () => {
    const rec = emptyRec()
    await runJob({ funded: null, reserve: 0, reserveReason: 'MONTHLY_PROOF_BUDGET_REACHED', pool: 0 }, rec)
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
    await runJob({ funded: null, reserveNoAnswer: true, pool: 0 }, rec)
    expect(rec.alerts.filter(a => /acquisition budget/i.test(a.subject))).toHaveLength(0)
    // And nothing was bought: a refusal we cannot explain still spends nothing.
    expect(rec.rpcs.some(r => r.fn === 'try_spend_sourcing')).toBe(false)
  })

  it('POOL-ONLY PROOF STILL WORKS WHEN THE MONTHLY PDL BUDGET IS GONE', async () => {
    // Owned records cost nothing, so a spent acquisition budget must not stop us showing
    // a prospect real leads we already have.
    const rec = emptyRec()
    const r = await runJob({
      funded: null, maxLeads: 200, pool: 12, reserve: 0,
      reserveReason: 'MONTHLY_PROOF_BUDGET_REACHED', contacts: 0,
    }, rec)
    expect(r.inserted).toBe(12)
    expect(rec.leadUpdates.some(u => 'surfaced_for_approval_at' in u)).toBe(true)
  })
})
