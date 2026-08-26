// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 27 Aug — PROOF WITH PAID PROVIDERS OFF, THROUGH THE REAL runIcpJob.
//
// THE PRODUCTION FAILURE. With PAID_PROVIDERS_ENABLED unset (the fail-closed default R66
// shipped) and a real PDL key present, every proof pass whose pool serve came up short hit
// the zero-spend guard inside the provider call, and the deliberate PaidProviderBlockedError
// propagated straight OUT of runIcpJob. Three consequences, each observed live:
//   1. pool-served leads were already inserted but the surfacing stamp never ran — the desk
//      requires delivered_at AND surfaced_for_approval_at, so it showed NOTHING even when
//      the pool had matches;
//   2. the proof reservation was never reconciled (the F1 refund lives below the throw) —
//      up to 20 of the prospect's lifetime-40 records burned per blocked attempt;
//   3. the crash boundary recorded failed/0/0 — false counts — or, where the `failed` CHECK
//      constraint is missing, nothing at all, leaving the desk to its 240s failsafe.
//
// ⚠️ WHY THE OLD SUITE MISSED IT: vitest.setup.ts deletes every provider key, so
// `pdlSearchPage` exited at its no-key branch BEFORE the guard — the throw was unreachable
// under test. These tests inject the block AT the search boundary, which is exactly where
// production produces it, and drive the REAL runIcpJob around it.
//
// Mocks only. No provider, no network, no database. `fetch` is never called.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi } from 'vitest'

vi.mock('./alerts', () => ({ sendFounderAlert: async () => undefined }))

const ICP = {
  job_titles:       ['CEO', 'CTO'],
  seniority_levels: ['C-Suite'],
  industries:       ['SaaS'],
  company_sizes:    ['201–500'],
  geographies:      ['United Kingdom'],
}

type Outcome = { status: string; pool_served: number; total_inserted: number; records_requested: number }
type Rec = {
  searches: number; rpcs: Array<{ fn: string; args: Record<string, unknown> }>
  outcomes: Outcome[]; surfacings: number; leadInserts: number; alerts: string[]
}
const fresh = (): Rec => ({ searches: 0, rpcs: [], outcomes: [], surfacings: 0, leadInserts: 0, alerts: [] })

/** Drive the REAL runIcpJob with: N safe pool candidates, and a provider boundary that
 *  either serves, throws the DELIBERATE spend block, or throws an ordinary error. */
async function runProofJob(opts: {
  pool: number
  provider: 'blocked' | 'serves' | 'crashes'
  providerCount?: number
  audience?: 'client' | 'house'
}, rec: Rec) {
  vi.resetModules()

  const icpRow = {
    id: 'icp-1', client_id: 'c1', name: 'ICP', is_active: true, pending_targeting: null,
    ...ICP, pdl_scroll_token: null, pdl_scroll_query: null, pdl_exhausted_at: null,
  }
  const poolRows = Array.from({ length: opts.pool }, (_, i) => ({
    email_norm: `pool${i}@safe.example`, first_name: 'P', last_name: `${i}`,
    title: 'CEO', seniority: 'C-Suite', company: `Co${i}`, industry: 'SaaS',
    company_size: '201–500', country: 'United Kingdom', linkedin_url: null,
  }))

  vi.doMock('@kind/db', () => {
    const q = (table: string) => {
      const chain: Record<string, unknown> = {
        select() { return chain }, eq() { return chain }, in() { return chain },
        is() { return chain }, not() { return chain }, neq() { return chain },
        or() { return chain }, order() { return chain }, limit() { return chain },
        gte() { return chain },
        async upsert() { return { error: null } },
        async maybeSingle() {
          if (table === 'icps') return { data: icpRow, error: null }
          if (table === 'clients') return { data: { id: 'c1', leads_per_run: null, is_demo: false, company_name: 'Co' }, error: null }
          return { data: null, error: null }
        },
        async single() { return chain.maybeSingle instanceof Function ? (chain.maybeSingle as () => unknown)() : { data: null, error: null } },
        update(patch: Record<string, unknown>) {
          if (table === 'leads' && typeof patch.surfaced_for_approval_at === 'string') rec.surfacings += 1
          const c2: Record<string, unknown> = {
            eq() { return c2 }, is() { return c2 }, in() { return c2 }, filter() { return c2 }, select() { return c2 },
            async single() { return { data: icpRow, error: null } },
            async maybeSingle() { return { data: icpRow, error: null } },
            then(r: (v: unknown) => unknown) { return r({ data: [{}], error: null }) },
          }
          return c2
        },
        insert(rows: unknown) {
          const list = Array.isArray(rows) ? rows : [rows]
          if (table === 'icp_run_outcomes') {
            const o = list[0] as Record<string, unknown>
            rec.outcomes.push({
              status: String(o.status), pool_served: Number(o.pool_served),
              total_inserted: Number(o.total_inserted), records_requested: Number(o.records_requested),
            })
          }
          if (table === 'leads') rec.leadInserts += list.length
          const data = list.map((_, i) => ({ id: `lead-${rec.leadInserts}-${i}` }))
          const c2: Record<string, unknown> = {
            select() { return c2 }, async single() { return { data: data[0], error: null } },
            then(r: (v: unknown) => unknown) { return r({ data, error: null }) },
          }
          return c2
        },
        then(resolve: (v: unknown) => unknown) {
          if (table === 'lead_pool') return resolve({ data: poolRows, error: null })
          if (table === 'credit_transactions') return resolve({ data: [], count: 0, error: null })
          return resolve({ data: [], count: 0, error: null })
        },
      }
      return chain
    }
    return {
      db: {
        from: (t: string) => q(t),
        rpc: async (fn: string, args: Record<string, unknown>) => {
          rec.rpcs.push({ fn, args })
          if (fn === 'try_reserve_proof_records') {
            return { data: { granted: Number(args.p_requested ?? 0), reservation_id: 'res-1', reason: 'GRANTED' }, error: null }
          }
          if (fn === 'try_claim_proof_pass') return { data: 1, error: null }
          if (fn === 'try_spend_sourcing') return { data: Number(args.p_requested ?? 0), error: null }
          if (fn === 'release_proof_records') return { data: Number(args.p_records ?? 0), error: null }
          return { data: null, error: null }
        },
        auth: { admin: { getUserById: async () => ({ data: { user: { email: '' } } }) } },
      },
    }
  })

  vi.doMock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _s: unknown, n: () => void) => n() }))
  vi.doMock('./lead-delivery', () => ({ enrichAndDeliverLeads: async () => 0 }))
  vi.doMock('./provider-boundary', async () => {
    const real = await vi.importActual<typeof import('./provider-boundary')>('./provider-boundary')
    const a = opts.audience ?? 'client'
    return { ...real, audienceForClient: async () => a, audienceForUser: async () => a }
  })
  vi.doMock('./apollo', () => ({
    searchPeopleWithFallback: async (_i: unknown, _p: number, size: number) => {
      rec.searches += 1
      if (opts.provider === 'blocked') {
        // The EXACT production shape: the guard's named refusal, recognised by its code.
        throw Object.assign(new Error('SAFE_TEST_MODE is on — refusing to call PDL'), { code: 'SAFE_TEST_MODE_BLOCKED', name: 'PaidProviderBlockedError' })
      }
      if (opts.provider === 'crashes') throw new Error('ECONNRESET: socket hang up')
      const n = Math.min(opts.providerCount ?? size, size)
      return {
        contacts: Array.from({ length: n }, (_, i) => ({
          id: `pdl_${i}`, first_name: 'A', last_name: `B${i}`, email: `a${i}@b.example`,
          email_status: 'verified', linkedin_url: null, title: 'CEO', seniority: 'C-Suite',
          country: 'united kingdom', organization_name: 'Acme', organization: null,
        })),
        relaxed: null,
        pdlPage: { contacts: [], scrollToken: null, exhausted: false, matchedNothing: n === 0, error: null, completed: true },
      }
    },
    ApolloCreditsExhaustedError: class extends Error {},
    ApolloRateLimitError: class extends Error {},
  }))

  const { runIcpJob } = await import('../routes/icps')
  return runIcpJob('icp-1', 'c1', 'u1', 20, { proofPass: 1 })
}

const released = (rec: Rec) => rec.rpcs.filter(r => r.fn === 'release_proof_records')

describe('EXECUTED · a blocked paid remainder no longer kills the run', () => {
  it('⚑ POOL 7 + BLOCKED PAID REMAINDER → the run COMPLETES, serves 7, and says served', async () => {
    const rec = fresh()
    const out = await runProofJob({ pool: 7, provider: 'blocked' }, rec)
    // The run RESOLVED — before the fix it rejected here and everything below never ran.
    expect(out.inserted).toBe(7)
    // One honest outcome, with REAL counts — not the crash boundary's failed/0/0.
    expect(rec.outcomes).toHaveLength(1)
    expect(rec.outcomes[0].status).toBe('served')
    expect(rec.outcomes[0].pool_served).toBe(7)
    expect(rec.outcomes[0].total_inserted).toBe(7)
    // The desk requires the surfacing stamp — it ran, so the 7 are VISIBLE.
    expect(rec.surfacings, 'pool leads must surface').toBeGreaterThan(0)
    // And the unused reservation was refunded IN FULL — the lifetime-40 no longer leaks.
    expect(released(rec)).toHaveLength(1)
    expect(released(rec)[0].args.p_records, 'the whole 13-record remainder grant').toBe(13)
  })

  it('⚑ POOL 0 + BLOCKED → failed (the neutral review state), NEVER no_match — and the 40 is refunded', async () => {
    const rec = fresh()
    const out = await runProofJob({ pool: 0, provider: 'blocked' }, rec)
    expect(out.inserted).toBe(0)
    expect(rec.outcomes).toHaveLength(1)
    expect(rec.outcomes[0].status).toBe('failed')
    expect(rec.outcomes[0].status).not.toBe('no_match')
    expect(released(rec)[0].args.p_records, 'the whole 20-record grant').toBe(20)
  })

  it('a blocked HOUSE run is not promoted to proven — failed, never a trusted zero', async () => {
    const rec = fresh()
    await runProofJob({ pool: 0, provider: 'blocked', audience: 'house' }, rec)
    expect(rec.outcomes[0].status).toBe('failed')
  })

  it('an ORDINARY provider crash still propagates to the crash boundary — only the block is absorbed', async () => {
    const rec = fresh()
    await expect(runProofJob({ pool: 3, provider: 'crashes' }, rec)).rejects.toThrow(/ECONNRESET/)
    // The absorb is NARROW: a network error keeps its existing crash-boundary handling.
    expect(rec.outcomes).toHaveLength(0)
  })

  it('providers ON and serving is untouched: pool 5 + provider 15 → served 20', async () => {
    const rec = fresh()
    const out = await runProofJob({ pool: 5, provider: 'serves', providerCount: 15 }, rec)
    expect(out.inserted).toBe(20)
    expect(rec.outcomes[0].status).toBe('served')
    expect(rec.outcomes[0].total_inserted).toBe(20)
  })

  it('a full pool (20) never touches the provider at all', async () => {
    const rec = fresh()
    const out = await runProofJob({ pool: 20, provider: 'blocked' }, rec)
    expect(out.inserted).toBe(20)
    expect(rec.searches, 'pdlRemainder is 0 — no provider call to block').toBe(0)
    expect(rec.outcomes[0].status).toBe('served')
  })

  it('exactly ONE provider attempt when blocked — a block is never retried into spend', async () => {
    const rec = fresh()
    await runProofJob({ pool: 2, provider: 'blocked' }, rec)
    expect(rec.searches).toBe(1)
  })

  it('a trustworthy completed provider ZERO is still no_match — the block did not blur it', async () => {
    const rec = fresh()
    await runProofJob({ pool: 0, provider: 'serves', providerCount: 0 }, rec)
    expect(rec.outcomes[0].status).toBe('no_match')
  })
})
