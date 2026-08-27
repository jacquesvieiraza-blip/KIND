// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 27 Aug — PROOF WITH PAID PROVIDERS OFF, THROUGH THE REAL runIcpJob.
//
// THE PRODUCTION FAILURE. With PAID_PROVIDERS_ENABLED unset (the fail-closed default R66
// shipped) and a real PDL key present, every proof pass whose pool serve came up short hit
// the zero-spend guard inside the provider call, and the deliberate PaidProviderBlockedError
// propagated straight OUT of runIcpJob.
//
// ⚠️ OBSERVED vs REPRODUCED, kept apart. USER-OBSERVED: proof started, "Finding your
// matches now…" for minutes, then the neutral snag card, no usable proof, more than once.
// CODE-REPRODUCED (here): the three consequences below, each driven through the real
// runIcpJob and the real route. No production log, row or provider response was read.
// The three consequences:
//   1. pool-served leads were already inserted but the surfacing stamp never ran — the desk
//      requires delivered_at AND surfaced_for_approval_at, so it shows NOTHING even when
//      the pool has matches;
//   2. the proof reservation is never reconciled (the F1 refund lives below the throw) —
//      up to 20 of the prospect's lifetime-40 records burn per blocked attempt;
//   3. the crash boundary records failed/0/0 — false counts — or, where the `failed` CHECK
//      constraint is missing, nothing at all, leaving the desk to its 240s failsafe, which
//      is what the founder saw.
//
// ⚠️ WHY THE OLD SUITE MISSED IT, both halves: vitest.setup.ts deletes every provider key
// (so `pdlSearchPage` exits at its no-key branch before the guard) AND sets
// PAID_PROVIDERS_ENABLED='true' for the whole suite, making the guard inert in tests by
// design. These tests unset that flag around the call, exactly as that file instructs. These tests inject the block AT the search boundary, which is exactly where
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
  /** ⚑ 27 Aug — provenance capture: every row upserted into lead_pool / acquisition_memory,
   *  so the tests can read the SOURCE and COST the run actually recorded. */
  poolWrites: Array<Record<string, unknown>>; memoryWrites: Array<Record<string, unknown>>
  /** every row inserted into `leads`, so tests can read the source stamp the run wrote */
  leadRows: Array<Record<string, unknown>>
}
const fresh = (): Rec => ({ searches: 0, rpcs: [], outcomes: [], surfacings: 0, leadInserts: 0, alerts: [], poolWrites: [], memoryWrites: [], leadRows: [] })

/** Drive the REAL runIcpJob with: N safe pool candidates, and a provider boundary that
 *  either serves, throws the DELIBERATE spend block, or throws an ordinary error. */
type ProofOpts = {
  pool: number
  provider: 'blocked' | 'serves' | 'crashes'
  providerCount?: number
  audience?: 'client' | 'house'
  /** ⚑ 27 Aug — the country the provider stamps on every contact it serves. `undefined`
   *  keeps the healthy default ('united kingdom', matching the ICP); `null` simulates a
   *  provider/mapping that lost geography entirely (the Apollo-cast failure mode). */
  providerCountry?: string | null
  /** ⚑ 27 Aug (merge-gate) — the stored `source` on the pool fixtures, so the READ fence can
   *  be driven: 'pdl'/'apollo' are R73-eligible; anything else must never serve. */
  poolSource?: string | null
  /** rows of an INELIGIBLE source placed BEFORE the eligible ones, to prove they cannot
   *  consume the bounded candidate window. */
  poolDecoys?: number
  poolDecoySource?: string | null
}

/** Install every mock the proof runtime needs. Shared by BOTH harnesses — the direct
 *  `runIcpJob` one and the route-boundary one — so they cannot drift apart. */
/** Mirrors the runtime candidate window: max(cap*5, 50); a proof run caps at 20 → 100. */
const poolWindow = 100
/** The real DB query applies `.in('source', POOL_ELIGIBLE_SOURCES)` before `.limit()`.
 *  Flipped to false only by the red-proof that removes the DB prefilter. */
const poolSourceFilterApplied = true

async function buildProofModules(opts: ProofOpts, rec: Rec) {
  vi.resetModules()

  const icpRow = {
    id: 'icp-1', client_id: 'c1', name: 'ICP', is_active: true, pending_targeting: null,
    ...ICP, pdl_scroll_token: null, pdl_scroll_query: null, pdl_exhausted_at: null,
  }
  const poolRows = Array.from({ length: opts.pool }, (_, i) => ({
    email_norm: `pool${i}@safe.example`, first_name: 'P', last_name: `${i}`,
    title: 'CEO', seniority: 'C-Suite', company: `Co${i}`, industry: 'SaaS',
    company_size: '201–500', country: 'United Kingdom', linkedin_url: null,
    // ⚑ 27 Aug (merge-gate) — real pooled inventory carries its K.I.N.D-acquired provenance.
    // The read fence refuses NULL/unlisted sources cross-client, so a fixture without one is
    // not a realistic pool row; it is an unowned row the fence is right to reject.
    source: opts.poolSource === undefined ? 'pdl' : opts.poolSource,
  }))
  // Ineligible-source decoys FIRST in storage order — the starvation shape.
  const decoyRows = Array.from({ length: opts.poolDecoys ?? 0 }, (_, i) => ({
    email_norm: `decoy${i}@nope.example`, first_name: 'D', last_name: `${i}`,
    title: 'CEO', seniority: 'C-Suite', company: `Decoy${i}`, industry: 'SaaS',
    company_size: '201–500', country: 'United Kingdom', linkedin_url: null,
    source: opts.poolDecoySource === undefined ? 'csv_import' : opts.poolDecoySource,
  }))

  vi.doMock('@kind/db', () => {
    const q = (table: string) => {
      const chain: Record<string, unknown> = {
        select() { return chain }, eq() { return chain }, in() { return chain },
        is() { return chain }, not() { return chain }, neq() { return chain },
        or() { return chain }, order() { return chain }, limit() { return chain },
        gte() { return chain },
        async upsert(rows: unknown) {
          const list = Array.isArray(rows) ? rows : [rows]
          if (table === 'lead_pool') rec.poolWrites.push(...(list as Record<string, unknown>[]))
          if (table === 'acquisition_memory') rec.memoryWrites.push(...(list as Record<string, unknown>[]))
          return { error: null }
        },
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
          if (table === 'leads') { rec.leadInserts += list.length; rec.leadRows.push(...(list as Record<string, unknown>[])) }
          const data = list.map((_, i) => ({ id: `lead-${rec.leadInserts}-${i}` }))
          const c2: Record<string, unknown> = {
            select() { return c2 }, async single() { return { data: data[0], error: null } },
            then(r: (v: unknown) => unknown) { return r({ data, error: null }) },
          }
          return c2
        },
        then(resolve: (v: unknown) => unknown) {
          if (table === 'lead_pool') {
            // The real query filters by source IN (...) and caps with .limit(); this mock
            // reproduces BOTH so a decoy crowd genuinely tests the window.
            const all = [...decoyRows, ...poolRows]
            const allowed = ['pdl', 'apollo']
            const filtered = poolSourceFilterApplied ? all.filter(r => allowed.includes(String(r.source))) : all
            return resolve({ data: filtered.slice(0, poolWindow), error: null })
          }
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
        // ⚑ 27 Aug — THE REAL GUARD, NOT A FABRICATED SHAPE. An earlier version of this
        // harness hand-built `{ code: 'SAFE_TEST_MODE_BLOCKED' }` with Object.assign, which
        // was circular: the test manufactured the exact property the code under test looks
        // for, so it would have kept passing even if production stopped emitting it. This
        // now runs the REAL `assertPaidProviderAllowed` under the REAL production
        // environment (no PAID_PROVIDERS_ENABLED), so the error is whatever the guard
        // genuinely throws — and `runIcpJob` has to recognise that.
        //
        // ⚠️ AND THIS IS THE SECOND HALF OF "WHY THE SUITE MISSED IT". `vitest.setup.ts`
        // sets `PAID_PROVIDERS_ENABLED = 'true'` for the whole suite — deliberately, so
        // that dozens of tests can exercise provider code against a mocked `fetch` (the
        // API keys are deleted, so nothing can reach a provider anyway). The consequence
        // is that the guard is INERT in tests by default: no ordinary test could ever
        // observe the refusal production hits. A test that wants the real block must set
        // its own env, exactly as `vitest.setup.ts` instructs — so this one does, and
        // restores it immediately.
        const saved = process.env.PAID_PROVIDERS_ENABLED
        delete process.env.PAID_PROVIDERS_ENABLED   // production's fail-closed default
        try {
          const { assertPaidProviderAllowed } = await import('./paid-provider-guard')
          assertPaidProviderAllowed('pdl', 'runtime-test')
        } finally {
          if (saved === undefined) delete process.env.PAID_PROVIDERS_ENABLED
          else process.env.PAID_PROVIDERS_ENABLED = saved
        }
        throw new Error('unreachable: the guard did not refuse with paid providers off')
      }
      if (opts.provider === 'crashes') throw new Error('ECONNRESET: socket hang up')
      const n = Math.min(opts.providerCount ?? size, size)
      return {
        contacts: Array.from({ length: n }, (_, i) => ({
          id: `pdl_${i}`, first_name: 'A', last_name: `B${i}`, email: `a${i}@b.example`,
          email_status: 'verified', linkedin_url: null, title: 'CEO', seniority: 'C-Suite',
          country: opts.providerCountry === undefined ? 'united kingdom' : opts.providerCountry,
          organization_name: 'Acme', organization: null,
        })),
        relaxed: null,
        pdlPage: { contacts: [], scrollToken: null, exhausted: false, matchedNothing: n === 0, error: null, completed: true },
      }
    },
    ApolloCreditsExhaustedError: class extends Error {},
    ApolloRateLimitError: class extends Error {},
  }))

}

/** EXECUTION → OUTCOME: the run itself, called directly. */
async function runProofJob(opts: ProofOpts, rec: Rec) {
  await buildProofModules(opts, rec)
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

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 27 Aug — THE ERROR CONTRACT ITSELF, PROVED AGAINST THE REAL GUARD.
//
// The absorb in `runIcpJob` turns on ONE property. If a test manufactures that property it
// proves nothing: it would keep passing while production quietly stopped emitting it. So the
// shape is read off the real class and the real `assertPaidProviderAllowed`, and the
// canonical predicate is proved to be the thing that recognises it.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('the deliberate-block error contract, read from the real guard', () => {
  it('the REAL class carries the discriminator the run absorbs on', async () => {
    const { PaidProviderBlockedError, PAID_PROVIDER_BLOCKED_CODE, isPaidProviderBlocked } =
      await import('./paid-provider-guard')
    const real = new PaidProviderBlockedError('pdl', 'unit')
    expect(real).toBeInstanceOf(Error)
    expect(real.code, 'the property runIcpJob keys on').toBe(PAID_PROVIDER_BLOCKED_CODE)
    expect(real.name).toBe('PaidProviderBlockedError')
    expect(isPaidProviderBlocked(real)).toBe(true)
  })

  it('the REAL assertPaidProviderAllowed throws exactly that, with providers off', async () => {
    const saved = { ...process.env }
    delete process.env.PAID_PROVIDERS_ENABLED     // production's fail-closed default
    delete process.env.SAFE_TEST_MODE
    try {
      const { assertPaidProviderAllowed, isPaidProviderBlocked } = await import('./paid-provider-guard')
      let thrown: unknown
      try { assertPaidProviderAllowed('pdl', 'runtime-test') } catch (e) { thrown = e }
      expect(thrown, 'the guard must refuse').toBeDefined()
      expect(isPaidProviderBlocked(thrown), 'and it is recognisable as a block').toBe(true)
    } finally {
      for (const k of ['PAID_PROVIDERS_ENABLED', 'SAFE_TEST_MODE']) {
        if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]
      }
    }
  })

  it('the predicate does NOT recognise an ordinary error — the absorb stays narrow', async () => {
    const { isPaidProviderBlocked } = await import('./paid-provider-guard')
    for (const e of [new Error('ECONNRESET'), null, undefined, {}, { code: 'OTHER' }, 'string']) {
      expect(isPaidProviderBlocked(e), String(e)).toBe(false)
    }
  })

  it('⚑ it survives a DUPLICATED module graph — where instanceof alone fails', async () => {
    // The latent bug the canonical predicate closes: a second copy of the module has a
    // different class object, so `instanceof` is false and the block would be swallowed.
    const a = await import('./paid-provider-guard')
    const errFromA = new a.PaidProviderBlockedError('pdl', 'graph-a')
    vi.resetModules()
    const b = await import('./paid-provider-guard')
    expect(errFromA instanceof b.PaidProviderBlockedError, 'instanceof across graphs').toBe(false)
    expect(b.isPaidProviderBlocked(errFromA), 'the code discriminator still recognises it').toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 27 Aug — CLAIM → DISPATCH → OUTCOME, THROUGH THE REAL ROUTE.
//
// The harness above proves EXECUTION → OUTCOME by calling `runIcpJob` directly. That skips
// the boundary the client actually crosses: `POST /icps/:id/proof` claims the pass and then
// dispatches the run FIRE-AND-FORGET, answering 200 immediately. Two things can only be
// proved here — that a deliberate block inside the background run never reaches the route's
// synchronous answer, and that an ordinary crash still lands on the crash boundary's
// `failed` rather than leaving the claimed run with no terminal state at all.
// ═══════════════════════════════════════════════════════════════════════════════════════
type RouteOut = { code: number; payload: Record<string, unknown> }

async function postProof(opts: { pool: number; provider: 'blocked' | 'crashes' | 'serves' }, rec: Rec) {
  await buildProofModules({ pool: opts.pool, provider: opts.provider, audience: 'client' }, rec)

  const { icpRouter } = await import('../routes/icps')
  const layer = (icpRouter as unknown as {
    stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>
  }).stack.find(l => l.route?.path === '/:id/proof' && l.route?.methods.post)
  if (!layer?.route) throw new Error('POST /:id/proof not found on the icp router')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle

  const out: RouteOut = { code: 200, payload: {} }
  const res = {
    status(c: number) { out.code = c; return res },
    json(p: Record<string, unknown>) { out.payload = p; return res },
  }
  await handler({ params: { id: 'icp-1' }, body: {}, headers: {}, query: {}, userId: 'u1' }, res, () => {})
  return out
}

/** The background run is fire-and-forget; wait for its effect, bounded. */
async function waitFor(fn: () => boolean, label: string) {
  for (let i = 0; i < 200; i++) {
    if (fn()) return
    await new Promise(r => setTimeout(r, 5))
  }
  throw new Error(`timed out waiting for: ${label}`)
}

describe('EXECUTED · claim → dispatch → outcome, across the real route boundary', () => {
  it('⚑ a blocked paid remainder never reaches the route answer, and the run still completes', async () => {
    const rec = fresh()
    const out = await postProof({ pool: 6, provider: 'blocked' }, rec)

    // ① THE CLAIM SUCCEEDED and the route answered immediately — the block happens inside
    //    the background run and must never turn the client's request into a failure.
    expect(out.code).toBe(200)
    expect((out.payload.data as Record<string, unknown>).finding).toBe(true)
    expect(rec.rpcs.some(r => r.fn === 'try_claim_proof_pass'), 'the pass was claimed').toBe(true)

    // ② THE RUN WAS DISPATCHED and ran to completion despite the deliberate block.
    await waitFor(() => rec.outcomes.length > 0, 'the background run to persist an outcome')

    // ③ ONE honest terminal outcome, with real counts.
    expect(rec.outcomes).toHaveLength(1)
    expect(rec.outcomes[0].status).toBe('served')
    expect(rec.outcomes[0].pool_served).toBe(6)
    expect(rec.outcomes[0].total_inserted).toBe(6)
    // ④ The pool leads are VISIBLE — the desk needs the surfacing stamp.
    expect(rec.surfacings).toBeGreaterThan(0)
    // ⑤ And the unused reservation came back to the lifetime-40.
    expect(released(rec)).toHaveLength(1)
    expect(released(rec)[0].args.p_records).toBe(14)
  })

  it('a claimed run that crashes ordinarily lands on the crash boundary’s `failed` — never stranded', async () => {
    const rec = fresh()
    const out = await postProof({ pool: 0, provider: 'crashes' }, rec)
    expect(out.code).toBe(200)                                   // the claim still succeeded
    await waitFor(() => rec.outcomes.length > 0, 'the crash boundary to record failed')
    expect(rec.outcomes[0].status, 'a claimed run always terminates deliberately').toBe('failed')
  })

  it('a pool-zero blocked run terminates as failed through the route too — never no_match', async () => {
    const rec = fresh()
    await postProof({ pool: 0, provider: 'blocked' }, rec)
    await waitFor(() => rec.outcomes.length > 0, 'the outcome')
    expect(rec.outcomes[0].status).toBe('failed')
    expect(rec.outcomes[0].status).not.toBe('no_match')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 27 Aug — THE HARD GEOGRAPHY INVARIANT, EXECUTED ON FRESH PROVIDER CONTACTS.
//
// Milla asks the client where they want to target, and the confirmed geography is a HARD
// product constraint. The pool path enforces it (pool-country-contract.test.ts); these
// tests drive the REAL `runIcpJob` — Milla-saved ICP (geographies: ['United Kingdom']) →
// mocked provider boundary → the real gates → lead persistence → outcome — and prove the
// SAME rule holds for freshly sourced contacts:
//
//   · GB               → served (canonical alias of the client's own choice)
//   · United Kingdom   → served
//   · NULL             → rejected — unknown geography is never a wildcard
//   · Australia        → rejected — wrong country, and specifically the substring trap
//                        ('australia' contains 'us') that must never serve again
//
// The rejection is BEFORE insert: the contact never becomes a lead row at all, so it can
// never reach surfacing, approval, reveal or send eligibility — those all read `leads`.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('EXECUTED · fresh provider contacts obey the hard geography invariant', () => {
  it('⚑ provider says GB → canonically the client’s UK → SERVED', async () => {
    const rec = fresh()
    await runProofJob({ pool: 0, provider: 'serves', providerCount: 5, providerCountry: 'GB' }, rec)
    expect(rec.leadInserts, 'all five inserted').toBe(5)
    expect(rec.outcomes[0]?.status).toBe('served')
    expect(rec.outcomes[0]?.total_inserted).toBe(5)
  })

  it('provider says United Kingdom (exact) → SERVED, unchanged', async () => {
    const rec = fresh()
    await runProofJob({ pool: 0, provider: 'serves', providerCount: 5, providerCountry: 'United Kingdom' }, rec)
    expect(rec.leadInserts).toBe(5)
    expect(rec.outcomes[0]?.status).toBe('served')
  })

  it('⚑ provider lost the country (NULL) → NOT ONE lead row is created', async () => {
    const rec = fresh()
    await runProofJob({ pool: 0, provider: 'serves', providerCount: 5, providerCountry: null }, rec)
    expect(rec.leadInserts, 'no lead may exist with unverifiable geography').toBe(0)
    // And the outcome is the NEUTRAL review state — the search completed, K.I.N.D's own
    // gate emptied it, so targeting is never blamed and no_match is never claimed.
    expect(rec.outcomes[0]?.status).toBe('failed')
    expect(rec.outcomes[0]?.status).not.toBe('no_match')
  })

  it('⚑ provider returned the WRONG country (Australia vs a UK target) → rejected', async () => {
    const rec = fresh()
    await runProofJob({ pool: 0, provider: 'serves', providerCount: 5, providerCountry: 'Australia' }, rec)
    expect(rec.leadInserts).toBe(0)
    expect(rec.outcomes[0]?.status).toBe('failed')
  })

  it('pool leads still surface when the provider batch is geo-rejected — the partial rule holds', async () => {
    const rec = fresh()
    await runProofJob({ pool: 4, provider: 'serves', providerCount: 5, providerCountry: null }, rec)
    expect(rec.outcomes[0]?.pool_served, 'the 4 safe pool matches survive').toBe(4)
    expect(rec.outcomes[0]?.total_inserted, 'and nothing geo-unverifiable joins them').toBe(4)
    expect(rec.surfacings, 'the safe leads reached the desk').toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 27 Aug (R73) — PROVENANCE AND COST ARE THE ACTUAL PROVIDER'S, EXECUTED.
//
// The shared insert loop used to hard-code `source: 'pdl'` into BOTH provenance writers —
// `acquisition_memory` and the pool — and book every contact at PDL_RATE_USD. On a HOUSE run
// the contacts come from APOLLO (AR5: house → Apollo, client → PDL), so both tables recorded
// a false provider and a false cost. These tests drive the REAL runIcpJob for each audience
// and read what the run ACTUALLY wrote.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('EXECUTED · provider provenance and cost are truthful, per audience', () => {
  it('⚑ CLIENT run → PDL provenance everywhere, PDL cost', async () => {
    const rec = fresh()
    await runProofJob({ pool: 0, provider: 'serves', providerCount: 5, audience: 'client' }, rec)
    expect(rec.memoryWrites.length, 'acquisition memory was written').toBeGreaterThan(0)
    for (const m of rec.memoryWrites) {
      expect(m.source, 'memory provenance').toBe('pdl')
      expect(Number(m.acquisition_cost_usd), 'memory cost is the PDL rate').toBeCloseTo(0.28)
    }
    expect(rec.poolWrites.length, 'the pool was written').toBeGreaterThan(0)
    for (const p of rec.poolWrites) {
      expect(p.source, 'pool provenance').toBe('pdl')
      expect(Number(p.acquisition_cost), 'pool cost is the PDL rate').toBeCloseTo(0.28)
      expect(p.country, 'country stored canonically').toBe('united kingdom')
    }
  })

  it('⚑ HOUSE run → APOLLO provenance everywhere — NEVER pdl, NEVER PDL cost', async () => {
    const rec = fresh()
    await buildProofModules({ pool: 0, provider: 'serves', providerCount: 5, audience: 'house' }, rec)
    const { runIcpJob } = await import('../routes/icps')
    await runIcpJob('icp-1', 'c1', 'u1', 20)   // an ordinary house run, not a proof claim
    expect(rec.memoryWrites.length, 'acquisition memory was written').toBeGreaterThan(0)
    for (const m of rec.memoryWrites) {
      expect(m.source, 'an Apollo person must be remembered as Apollo').toBe('apollo')
      expect(Number(m.acquisition_cost_usd),
        'no fake PDL cost: api_search is Apollo’s no-credit endpoint, and the 11-Jul promotion booked owned Apollo records at 0').toBe(0)
    }
    expect(rec.poolWrites.length, 'R73: K.I.N.D-acquired Apollo records now reach the pool').toBeGreaterThan(0)
    for (const p of rec.poolWrites) {
      expect(p.source, 'pool provenance is the ACTUAL provider').toBe('apollo')
      expect(Number(p.acquisition_cost)).toBe(0)
      expect(p.country).toBe('united kingdom')
    }
  })

  it('a house Apollo batch passes the same hard geography gate — wrong country never pools', async () => {
    const rec = fresh()
    await buildProofModules({ pool: 0, provider: 'serves', providerCount: 5, audience: 'house', providerCountry: 'Australia' }, rec)
    const { runIcpJob } = await import('../routes/icps')
    await runIcpJob('icp-1', 'c1', 'u1', 20)
    expect(rec.leadInserts, 'geo-rejected: no lead rows').toBe(0)
    expect(rec.poolWrites, 'and nothing reaches the shared pool').toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 27 Aug (evidence pass) — public.leads ITSELF carries the truthful provider.
// acquisition_memory and the pool were fixed first; the lead row was the remaining
// untagged store, which is exactly what made historical provenance unprovable row-by-row.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('EXECUTED · the lead row records which provider produced it', () => {
  it('⚑ a fresh CLIENT/PDL acquisition stamps leads.source = pdl', async () => {
    const rec = fresh()
    await runProofJob({ pool: 0, provider: 'serves', providerCount: 4, audience: 'client' }, rec)
    const providerRows = rec.leadRows.filter(r => r.apollo_id)
    expect(providerRows.length).toBeGreaterThan(0)
    for (const r of providerRows) expect(r.source, 'the lead row itself says PDL').toBe('pdl')
  })

  it('⚑ a fresh HOUSE/Apollo acquisition stamps leads.source = apollo — never pdl', async () => {
    const rec = fresh()
    await buildProofModules({ pool: 0, provider: 'serves', providerCount: 4, audience: 'house' }, rec)
    const { runIcpJob } = await import('../routes/icps')
    await runIcpJob('icp-1', 'c1', 'u1', 20)
    const providerRows = rec.leadRows.filter(r => r.apollo_id)
    expect(providerRows.length).toBeGreaterThan(0)
    for (const r of providerRows) expect(r.source, 'the lead row itself says Apollo').toBe('apollo')
  })

  it('a POOL-SERVED copy is NOT presented as a new provider acquisition', async () => {
    const rec = fresh()
    await runProofJob({ pool: 5, provider: 'serves', providerCount: 0 }, rec)
    const poolCopies = rec.leadRows.filter(r => !r.apollo_id)
    expect(poolCopies.length, 'the pool serve inserted copies').toBeGreaterThan(0)
    for (const r of poolCopies) {
      expect(r.source ?? null, 'a copy carries no provider-acquisition stamp').toBeNull()
      expect(r.apollo_id ?? null).toBeNull()
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 27 Aug (merge-gate) — R73 IS ENFORCED ON THE POOL **READ**, NOT ONLY THE WRITE.
// The write tripwire governs what may enter the shared pool; it says nothing about what is
// already in it. A historical SQL import bypasses the TypeScript writer entirely — that is
// how the 85 production rows arrived — so without a read fence a customer/inbound or
// unknown-provenance row could be served CROSS-CLIENT. These drive the REAL runIcpJob.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('EXECUTED · the pool READ fence (R73)', () => {
  it('a PDL pool row serves', async () => {
    const rec = fresh()
    await runProofJob({ pool: 6, provider: 'blocked', poolSource: 'pdl' }, rec)
    expect(rec.outcomes[0]?.pool_served).toBe(6)
  })

  it('⚑ an APOLLO pool row serves — R73, not a PDL-only regression', async () => {
    const rec = fresh()
    await runProofJob({ pool: 6, provider: 'blocked', poolSource: 'apollo' }, rec)
    expect(rec.outcomes[0]?.pool_served).toBe(6)
  })

  for (const bad of ['csv_import', 'web_form', 'company_csv', 'vida_chat', 'milla_onboarding']) {
    it(`⚠️ a ${bad} pool row is NEVER served cross-client`, async () => {
      const rec = fresh()
      await runProofJob({ pool: 6, provider: 'blocked', poolSource: bad }, rec)
      expect(rec.outcomes[0]?.pool_served, 'customer data must not be served to another client').toBe(0)
    })
  }

  it('⚠️ an UNKNOWN or NULL source is refused — fail closed', async () => {
    for (const bad of [null, 'mystery_source', '']) {
      const rec = fresh()
      await runProofJob({ pool: 6, provider: 'blocked', poolSource: bad }, rec)
      expect(rec.outcomes[0]?.pool_served, String(bad)).toBe(0)
    }
  })

  it('⚑ 250 ineligible-source rows AHEAD of the eligible ones cannot starve the window', async () => {
    // The DB prefilter runs BEFORE .limit(100): the decoys never enter the window at all,
    // so all 10 owned rows stay reachable. Filtering in JS afterwards would serve zero.
    const rec = fresh()
    await runProofJob({ pool: 10, provider: 'blocked', poolSource: 'pdl',
                        poolDecoys: 250, poolDecoySource: 'csv_import' }, rec)
    expect(rec.outcomes[0]?.pool_served, 'every owned row remains reachable').toBe(10)
  })
})
