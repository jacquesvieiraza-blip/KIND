// ═══════════════════════════════════════════════════════════════════════════════════════
// J12 · THE ACCOUNTING CLOSES — EVERY RESERVATION A RUN TAKES IS RELEASED BY A SETTLE
//
// 🛑 WHAT THE FULL-STACK WALK FOUND (18 Sep). Journey 12 is "automatic sourcing / enrichment
// / qualification / ACCOUNTING". It ended green with the programme reading
// `used=5 · reserved=20 · ceiling=1250`, and the 20 never came back. Twenty records of a
// client's PAID volume, gone, with no error, no `stranded` row and nothing to find it by.
//
// TWO DIFFERENT PATHS PRODUCE THAT, and they are fixed in two different places:
//
//   ① THE JOINER (`claim_programme_batch`, proven in
//      apps/api/src/realdb/programme-authority.realdb.test.ts ⑥, against real PostgreSQL).
//      `try_reserve_programme_sourcing` raises `sourced_reserved` on every call;
//      `settle_programme_batch` releases `programme_batches.granted`. A second run that joined
//      an open batch had its grant recorded nowhere, so the settle released 250 of 270.
//      What is asserted HERE is only that the repo's two copies of that function — the
//      canonical migration and the runner that actually executes on production — carry the
//      same executable fix. The BEHAVIOUR is a database fact and is proven against a database.
//
//   ② THE EMPTY RUN (`routes/icps.ts`, ① and ② below). Every settle in that function lives
//      inside a block gated on `insertedIds.length > 0`. A run that reserved volume, opened a
//      batch and then inserted NOBODY — every provider contact refused by the client's own
//      hard criteria before the spend, a pool serve that wrote nothing, a dedupe that removed
//      the page — reached the end holding a reservation that no batch event could ever
//      release. Founder lock 6: unused programme value never expires.
//
// ⚠️ ② IS NOT "SETTLE WHENEVER NOTHING WAS INSERTED". A batch is SHARED — the claim hands an
// in-flight batch to a second run — and the first run's candidates may be sitting in it
// unjudged, deliberately left open for the operator re-run ("the reservation stays open;
// re-run qualification"). Releasing there would throw away a recovery the code chose on
// purpose, so the release is conditional on the batch holding NOBODY AT ALL. Case ② is that
// distinction, and without it this fix would be a regression wearing a fix's clothes.
//
// RED PROOF (measured, this session):
//   · ① fails on the baseline — no `settle_programme_batch` call is made at all.
//   · ② fails if the attributed-count guard is removed — the settle fires on a batch that
//     holds another run's candidates.
//   · ③ fails if either copy of the migration is left un-updated.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const PROGRAMME_ID = '11111111-2222-3333-4444-555555555555'
const BATCH_ID = 'batch-9'

// ── ① / ② · THE RUNTIME PATH, DRIVING THE REAL `runIcpJob` ─────────────────────────────

describe('J12 · a programme run that created no candidate still settles its batch', () => {
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
   * Runs the REAL `runIcpJob` against mocks, with Apollo returning NOBODY — the shape of a run
   * whose whole page was refused before the spend.
   *
   * `attributedToBatch` is what `count(leads where batch_id = …)` answers: 0 is a batch that
   * bought nobody, and a positive number is a batch that already holds another run's
   * candidates. Only queries that actually filter on `batch_id` see it, so no other read in
   * the run is disturbed by it.
   */
  async function runEmpty(attributedToBatch: number) {
    const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = []
    vi.resetModules()

    vi.doMock('@kind/db', () => {
      const singleFor = (table: string) => {
        if (table === 'icps') return {
          id: 'icp-1', client_id: 'c1', programme_id: PROGRAMME_ID,
          geographies: [], job_titles: [], industries: [], seniority_levels: [], company_sizes: [],
        }
        if (table === 'programmes') return {
          id: PROGRAMME_ID, client_id: 'c1', status: 'SOURCING_AUTHORISED', paused_at: null,
          sourcing_ceiling: 2500, sourced_used: 0, sourced_reserved: 0,
          first_authorised_at: '2026-09-01T00:00:00Z', second_authorised_at: null,
          approved_at: null, went_live_at: null, completed_at: null, cancelled_at: null,
        }
        if (table === 'clients') return { leads_per_run: null, is_demo: false, user_id: 'u1', commercial_model: null }
        return null
      }
      const makeQuery = (table: string) => {
        const q: Record<string, unknown> = {}
        let byBatch = false
        q.eq = (col: string) => { if (col === 'batch_id') byBatch = true; return q }
        for (const m of ['select', 'in', 'is', 'neq', 'not', 'order', 'or', 'gte', 'lte']) q[m] = () => q
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
        q.then = (r: (v: unknown) => void) => r({
          data: [], error: null,
          count: table === 'leads' && byBatch ? attributedToBatch : 0,
        })
        return q
      }
      return {
        db: {
          from: (t: string) => makeQuery(t),
          rpc: async (fn: string, args: Record<string, unknown>) => {
            rpcCalls.push({ fn, args })
            if (fn === 'try_reserve_programme_sourcing') return { data: 10, error: null }
            if (fn === 'claim_programme_batch') {
              return { data: { id: BATCH_ID, programme_id: PROGRAMME_ID, seq: 1 }, error: null }
            }
            return { data: null, error: null }
          },
          auth: { admin: { listUsers: async () => ({ data: { users: [] }, error: null }) } },
        },
      }
    })

    // Pinned for the same reason `house-programme-accounting.test.ts` pins it: the real
    // resolver reads an auth user list this fixture does not have.
    vi.doMock('./provider-boundary', async () => {
      const real = await vi.importActual<typeof import('./provider-boundary')>('./provider-boundary')
      return { ...real, audienceForClient: async () => 'house', audienceForClientStrict: async () => 'house', audienceForUser: async () => 'house' }
    })

    vi.doMock('./apollo', () => ({
      searchPeopleWithFallback: async () => ({ contacts: [], relaxed: false }),
      ApolloCreditsExhaustedError: class extends Error {},
      ApolloRateLimitError: class extends Error {},
    }))

    const { runIcpJob } = await import('../routes/icps')
    await runIcpJob('icp-1', 'c1', 'u1', 10)
    return { rpcNames: rpcCalls.map(c => c.fn), rpcCalls }
  }

  it('🛑 ① it SETTLES AT ZERO — the whole grant goes back to the client’s ceiling', async () => {
    const { rpcNames, rpcCalls } = await runEmpty(0)
    // The run really did reserve and really did open a batch — otherwise there would be
    // nothing to strand and this case would pass vacuously.
    expect(rpcNames).toContain('try_reserve_programme_sourcing')
    expect(rpcNames).toContain('claim_programme_batch')

    expect(rpcNames, 'the run reserved volume, opened a batch, bought nobody and released nothing')
      .toContain('settle_programme_batch')
    const settle = rpcCalls.find(c => c.fn === 'settle_programme_batch')!
    expect(settle.args).toEqual({ p_batch_id: BATCH_ID, p_delivered: 0 })
  })

  it('🛑 ② and it does NOT settle a batch that holds another run’s candidates', async () => {
    const { rpcNames } = await runEmpty(7)
    expect(rpcNames).toContain('claim_programme_batch')
    expect(rpcNames,
      'seven candidates another run is still to qualify had their reservation released and their recovery thrown away')
      .not.toContain('settle_programme_batch')
  })
})

// ── ③ · ONE FIX, TWO COPIES, AND PRODUCTION RUNS THE SECOND ONE ────────────────────────

describe('J12 · claim_programme_batch carries the join fix in BOTH of its copies', () => {
  const REPO = join(__dirname, '../../../..')
  const CANON = readFileSync(join(REPO, 'supabase/migrations/20260829_programme_delivery_control.sql'), 'utf8')
  const RUNNER = readFileSync(join(REPO, 'apps/api/src/lib/pending-migrations.ts'), 'utf8')

  /**
   * Executable SQL only.
   *
   * ⚠️ THE COMMENT STRIP IS NOT OPTIONAL, and this repo has made the mistake it prevents five
   * times: every paragraph above the function names `sourced_reserved` and `granted`, so a
   * scanner reading raw text finds the fix in the prose that DESCRIBES it and passes on a
   * repo where the statement was never written.
   */
  const executable = (s: string) => s.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')

  /** The body of `claim_programme_batch` in one file, comments removed, whitespace collapsed. */
  function claimBody(src: string): string {
    const at = src.indexOf('CREATE OR REPLACE FUNCTION public.claim_programme_batch(')
    expect(at, 'claim_programme_batch is not defined in this file').toBeGreaterThan(-1)
    const rest = src.slice(at)
    const end = rest.indexOf('\n$$;')
    return executable(rest.slice(0, end > -1 ? end : rest.length)).replace(/\s+/g, ' ').trim()
  }

  it('the canonical migration reconciles the batch to what the programme actually holds', () => {
    const body = claimBody(CANON)
    // The joiner's grant is recorded against the batch that absorbed it …
    expect(body).toContain('UPDATE public.programme_batches')
    expect(body).toMatch(/granted\s*=\s*GREATEST\(granted, LEAST\(granted \+ p_granted, COALESCE\(v_reserved, granted\)\)\)/)
    // … and the number it is reconciled to is the one the other two functions move.
    expect(body).toContain('SELECT sourced_reserved INTO v_reserved')
  })

  it('and the RUNNER copy — the one production executes — is the same statement', () => {
    // 🛑 THE .sql FILE ON DISK RUNS NOWHERE. `PENDING_MIGRATIONS` is the only sanctioned
    // execution path (O3), so a fix that lands only in the canonical copy is a fix production
    // never receives — and the two files would disagree with nothing to notice it.
    expect(claimBody(RUNNER)).toBe(claimBody(CANON))
  })
})
