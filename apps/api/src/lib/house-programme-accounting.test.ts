// ═══════════════════════════════════════════════════════════════════════════════════════
// HOUSE-009 · A HOUSE RUN IS ACCOUNTED FOR, AND IT STILL BUYS NO PDL (founder-locked 7 Sep).
//
// 🛑 WHAT PRODUCTION SHOWED. The first real House run sourced 246 people and the Programme
// screen said `0 used · 0 reserved · 2500 left · no batch has been opened yet`.
//
// The cause was a CONFLATION, not a missing call. `try_spend_sourcing` did two unrelated jobs
// in one body — programme ENTITLEMENT (reserve, ceiling, 250 batch cap) and PDL MONEY (a
// `sourcing_ledger` row at $0.28 a record). House sources from Apollo, which is prepaid, so
// recording $0.28 a head against it would be a fabricated cost; the 22-Aug fix therefore
// exempted House from the WHOLE function and lost the entitlement accounting with it.
//
// ⚠️ THE COUNTERS ARE THE SYMPTOM. THE CEILING IS THE DEFECT. With no reservation, nothing was
// enforcing the programme's 2,500 limit on the house path at all.
//
// ── WHAT THIS SUITE PINS, AND WHY EACH ONE ─────────────────────────────────────────────
//   ① House reserves programme authority — so `sourced_reserved`, the ceiling and the batch
//     cap all apply to it.
//   ② House opens a BATCH — so `settleBatch` can convert reserved → used and the leads can be
//     stamped with it. Without a batch the whole downstream chain is inert.
//   ③ House STILL never calls `try_spend_sourcing` — AR5/AR8 is unchanged. This is the same
//     assertion `provider-boundary.test.ts` case A makes, restated here against the NEW path,
//     because that test's fixture has no programme and so no longer covers this branch.
//   ④ The reserve function writes NO ledger row and touches NO wallet — read out of the SQL
//     itself, because "House buys no PDL" has to be true of the thing that actually runs.
//   ⑤ A House ICP with no programme behaves exactly as it did — a counter fix must not be
//     able to stop house sourcing.
//
// RED PROOF (`/tmp` teeth harness, 7 Sep): reverting the branch to `grantedSize = pdlRemainder`
// fails ①②; deleting the `openBatch` call fails ②; routing House back through
// `try_spend_sourcing` fails ③; adding a `sourcing_ledger` insert to the reserve fails ④.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const MIGRATION = readFileSync(
  join(__dirname, '../../../../supabase/migrations/20260907_programme_sourcing_authority.sql'), 'utf8')

/** Executable SQL only — a promise made in a comment is not a property of the function. */
const sql = (s: string) => s.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')

/** The body of one named function, so an assertion about it cannot be satisfied by another. */
function fnBody(name: string): string {
  const src = sql(MIGRATION)
  const at = src.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`)
  expect(at, `${name} is not defined in the migration`).toBeGreaterThan(-1)
  const rest = src.slice(at)
  const end = rest.indexOf('\n$$;')
  return rest.slice(0, end > -1 ? end : rest.length)
}

const PROGRAMME_ID = '11111111-2222-3333-4444-555555555555'

// ── ① – ③ · THE RUNTIME PATH, driving the REAL runIcpJob ──────────────────────────────

describe('HOUSE-009 — a house run reserves programme authority and opens a batch', () => {
  const prev = {
    anthropic: process.env.ANTHROPIC_API_KEY,
    url: process.env.SUPABASE_URL,
    anon: process.env.SUPABASE_ANON_KEY,
  }
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'
  })
  afterEach(() => {
    vi.doUnmock('./provider-boundary'); vi.doUnmock('./apollo')
    vi.resetModules()
    process.env.ANTHROPIC_API_KEY = prev.anthropic
    process.env.SUPABASE_URL = prev.url
    process.env.SUPABASE_ANON_KEY = prev.anon
  })

  /**
   * Runs the REAL `runIcpJob` as the house, against mocks, and reports what it reached for.
   *
   * `programmeId` is the ICP's own `programme_id` — the field the branch reads. `reserveReturns`
   * is what the authority RPC grants.
   */
  async function runHouse(programmeId: string | null, reserveReturns: number) {
    const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = []
    const searchCalls: Array<{ size: number; audience: string }> = []

    vi.resetModules()

    vi.doMock('@kind/db', () => {
      const singleFor = (table: string) => {
        if (table === 'icps') return {
          id: 'icp-1', client_id: 'c1', programme_id: programmeId,
          geographies: [], job_titles: [], industries: [], seniority_levels: [], company_sizes: [],
        }
        // An ICP that NAMES a programme must resolve to a readable, same-client, authorised
        // one — `runIcpJob` fails closed otherwise (29 Aug), and that guard runs before this
        // branch. So the fixture supplies a real House-shaped programme, not a stub.
        if (table === 'programmes') return {
          id: programmeId, client_id: 'c1', status: 'SOURCING_AUTHORISED', paused_at: null,
          sourcing_ceiling: 2500, sourced_used: 0, sourced_reserved: 0,
          first_authorised_at: '2026-09-01T00:00:00Z', second_authorised_at: null,
          approved_at: null, went_live_at: null, completed_at: null, cancelled_at: null,
        }
        if (table === 'clients') return { leads_per_run: null, is_demo: false, user_id: 'u1', commercial_model: null }
        return null
      }
      const makeQuery = (table: string) => {
        const q: Record<string, unknown> = {}
        for (const m of ['select', 'eq', 'in', 'is', 'neq', 'not', 'order', 'or', 'gte', 'lte']) q[m] = () => q
        q.limit = () => ({
          then: (r: (v: unknown) => void) => r({ data: [], error: null }),
          maybeSingle: async () => ({ data: null, error: null }),
          single: async () => ({ data: null, error: null }),
        })
        q.single = async () => ({ data: singleFor(table), error: null })
        q.maybeSingle = async () => ({ data: singleFor(table), error: null })
        q.update = () => ({ eq: async () => ({ error: null }), in: async () => ({ error: null }) })
        q.upsert = async () => ({ error: null })
        q.insert = () => ({
          select: () => ({ single: async () => ({ data: { id: 'lead-x' }, error: null }) }),
          then: (r: (v: unknown) => void) => r({ error: null }),
        })
        q.then = (r: (v: unknown) => void) => r({ data: [], count: 0, error: null })
        return q
      }
      return {
        db: {
          from: (t: string) => makeQuery(t),
          rpc: async (fn: string, args: Record<string, unknown>) => {
            rpcCalls.push({ fn, args })
            if (fn === 'try_reserve_programme_sourcing') return { data: reserveReturns, error: null }
            if (fn === 'claim_programme_batch') {
              return { data: { id: 'batch-9', programme_id: programmeId, seq: 1 }, error: null }
            }
            return { data: null, error: null }
          },
          auth: { admin: { listUsers: async () => ({ data: { users: [] }, error: null }) } },
        },
      }
    })

    // Pinned for the same reason `provider-boundary.test.ts` pins it: the real resolver reads
    // an auth user list this fixture does not have, and would resolve house as CLIENT.
    vi.doMock('./provider-boundary', async () => {
      const real = await vi.importActual<typeof import('./provider-boundary')>('./provider-boundary')
      return { ...real, audienceForClient: async () => 'house', audienceForClientStrict: async () => 'house', audienceForUser: async () => 'house' }
    })

    vi.doMock('./apollo', () => ({
      searchPeopleWithFallback: async (_i: unknown, _p: number, size: number, _c: unknown, aud: string) => {
        searchCalls.push({ size, audience: aud })
        return { contacts: [], relaxed: false }
      },
      ApolloCreditsExhaustedError: class extends Error {},
      ApolloRateLimitError: class extends Error {},
    }))

    const { runIcpJob } = await import('../routes/icps')
    await runIcpJob('icp-1', 'c1', 'u1', 10)
    return { rpcNames: rpcCalls.map(c => c.fn), rpcCalls, searchCalls }
  }

  it('🛑 ① it RESERVES against the programme — the reservation the live run never made', async () => {
    const { rpcNames, rpcCalls } = await runHouse(PROGRAMME_ID, 10)
    expect(rpcNames, 'the house run makes no programme reservation — 0 used / 0 reserved is back')
      .toContain('try_reserve_programme_sourcing')
    const reserve = rpcCalls.find(c => c.fn === 'try_reserve_programme_sourcing')!
    // The PROGRAMME's id, from the ICP row — not the client's, and not a guess.
    expect(reserve.args).toEqual({ p_programme_id: PROGRAMME_ID, p_requested: 10 })
  })

  it('🛑 ② it OPENS A BATCH — without one nothing downstream can settle or attribute', async () => {
    const { rpcNames, rpcCalls } = await runHouse(PROGRAMME_ID, 10)
    expect(rpcNames, '"No batch has been opened yet" is still what the screen would say')
      .toContain('claim_programme_batch')
    const claim = rpcCalls.find(c => c.fn === 'claim_programme_batch')!
    expect(claim.args.p_programme_id).toBe(PROGRAMME_ID)
    // requested is what the run wanted; granted is what authority allowed. settle_programme_batch
    // releases the difference, so collapsing them would silently burn the remainder.
    expect(claim.args.p_requested).toBe(10)
    expect(claim.args.p_granted).toBe(10)
  })

  it('🛑 ③ and it STILL never calls the PDL cash fence — AR5/AR8 is unchanged', async () => {
    const { rpcNames } = await runHouse(PROGRAMME_ID, 10)
    expect(rpcNames, 'the house is buying PDL records again').not.toContain('try_spend_sourcing')
  })

  it('the search asks for exactly what authority GRANTED, not what the run wanted', async () => {
    const { searchCalls } = await runHouse(PROGRAMME_ID, 4)
    expect(searchCalls).toHaveLength(1)
    expect(searchCalls[0].audience).toBe('house')
    expect(searchCalls[0].size, 'a capped grant no longer caps the provider request').toBe(4)
  })

  it('🛑 a refused reservation reaches NO provider — the ceiling actually stops a run', async () => {
    const { searchCalls, rpcNames } = await runHouse(PROGRAMME_ID, 0)
    expect(rpcNames).toContain('try_reserve_programme_sourcing')
    expect(searchCalls, 'the programme ceiling was reached and Apollo was searched anyway').toHaveLength(0)
    expect(rpcNames, 'a batch was opened for a reservation that was refused').not.toContain('claim_programme_batch')
  })

  it('🛑 ⑤ a house ICP with NO programme is untouched — the fix cannot stop house sourcing', async () => {
    const { rpcNames, searchCalls } = await runHouse(null, 0)
    expect(rpcNames).not.toContain('try_reserve_programme_sourcing')
    expect(rpcNames).not.toContain('try_spend_sourcing')
    expect(searchCalls, 'a house ICP with no programme no longer reaches Apollo').toHaveLength(1)
    expect(searchCalls[0].size).toBe(10)
  })
})

// ── ④ · THE SQL ITSELF — what the reserve does, and does NOT, touch ───────────────────

describe('HOUSE-009 — the authority reserve is entitlement, never money', () => {
  it('🛑 it writes NO sourcing ledger row and touches NO wallet', () => {
    const body = fnBody('try_reserve_programme_sourcing')
    for (const money of ['sourcing_ledger', 'sourcing_allowance', 'money_settings', '0.28']) {
      expect(body, `the house reserve now records ${money} — a fabricated PDL cost for an Apollo record`)
        .not.toContain(money)
    }
  })

  it('it enforces the ceiling AND the batch cap — the two things the live run had neither of', () => {
    const body = fnBody('try_reserve_programme_sourcing')
    expect(body).toContain('sourcing_ceiling')
    expect(body).toContain('v_batch_cap   int := 250')
    expect(body, 'the reservation is no longer ceiling-guarded at the UPDATE')
      .toContain('sourced_used + sourced_reserved + v_granted <= sourcing_ceiling')
  })

  it('🛑 there is ONE implementation of the ceiling — try_spend_sourcing delegates to it', () => {
    const spend = fnBody('try_spend_sourcing')
    expect(spend, 'the PDL fence re-implements the ceiling, so the two can now drift')
      .toContain('public.try_reserve_programme_sourcing(v_open_id, p_requested)')
    // Its own programme branch must no longer carry a second copy of the reserve.
    const programmeBranch = spend.slice(spend.indexOf('IF v_open_id IS NOT NULL THEN'), spend.indexOf('LEGACY') > -1 ? spend.indexOf('LEGACY') : spend.length)
    expect(programmeBranch).not.toContain('sourced_reserved = sourced_reserved +')
  })

  it('the PDL fence still records PDL money for a paying client — nothing was removed', () => {
    const spend = fnBody('try_spend_sourcing')
    expect(spend).toContain('INSERT INTO public.sourcing_ledger (client_id, records, cost_usd, programme_id)')
    expect(spend).toContain('v_rate         numeric := 0.28')
    // The legacy wallet branch is untouched: same allowance decrement, same daily cap.
    expect(spend).toContain('SET sourcing_allowance = sourcing_allowance - v_granted')
  })
})

// ── THE REPAIR · the 246 already delivered ────────────────────────────────────────────

describe('HOUSE-009 — the reconcile accounts for what already happened, and adds only', () => {
  const body = () => fnBody('reconcile_programme_sourcing')

  it('🛑 it DELETES nothing — historical house evidence is preserved, not rewritten', () => {
    expect(body()).not.toContain('DELETE')
    // The only UPDATEs are the batch stamp on leads and the counter on the programme.
    expect(body()).toContain('UPDATE public.leads SET batch_id = v_batch')
    expect(body()).toContain('SET sourced_used = sourced_used + v_orphans')
  })

  // ⚠️ NOT `toContain('delivered_at IS NOT NULL')`. That string appears TWICE — in the count
  // and in the stamp — so deleting it from the count alone left the assertion green while the
  // function counted people we never obtained. The teeth-proof caught exactly that. What has
  // to be true is per-statement, and it is that BOTH statements use the SAME predicate: a
  // count and a stamp that disagree account for one set of leads and mark another.
  it('🛑 it counts only DELIVERED, unbatched leads, and stamps EXACTLY the set it counted', () => {
    const b = body()
    const predicate = (from: string) => {
      const at = b.indexOf(from)
      expect(at, `${from} is gone from the reconcile`).toBeGreaterThan(-1)
      const stmt = b.slice(at, b.indexOf(';', at))
      return { batch: stmt.includes('batch_id IS NULL'), delivered: stmt.includes('delivered_at IS NOT NULL') }
    }
    // An undelivered lead consumed no authority, so counting it would manufacture usage.
    expect(predicate('SELECT COUNT(*) INTO v_orphans'), 'the COUNT no longer restricts to delivered, unbatched leads')
      .toEqual({ batch: true, delivered: true })
    expect(predicate('UPDATE public.leads SET batch_id = v_batch'), 'the stamp covers a different set than the count')
      .toEqual({ batch: true, delivered: true })
  })

  it('🛑 it REFUSES rather than counting a subset — a partial reconcile is a new inconsistency', () => {
    expect(body(), 'the reconcile would stamp more leads than it counts')
      .toContain('IF COALESCE(v_room, 0) < v_orphans THEN')
    expect(body()).toContain('RAISE EXCEPTION')
  })

  it('it is idempotent by construction: the second call finds nothing orphaned', () => {
    const b = body()
    // Stamping batch_id is what makes the orphan query empty next time — there is no flag
    // anybody has to remember to set, which is the failure mode a flag would have.
    expect(b.indexOf('SELECT COUNT(*) INTO v_orphans')).toBeLessThan(b.indexOf('UPDATE public.leads SET batch_id'))
    expect(b).toContain('IF v_orphans <= 0 THEN')
  })

  it('it is operator-invoked for ONE named programme — never a blanket rewrite', () => {
    const b = body()
    expect(b).toContain('p_programme_id')
    // A blanket repair would have to loop or select across programmes. Neither appears.
    expect(b).not.toMatch(/FOR\s+\w+\s+IN\s+SELECT/)
    expect(b).not.toContain('FROM public.programmes WHERE status')
  })
})
