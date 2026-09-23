// ═══════════════════════════════════════════════════════════════════════════════════════
// 🛑 THE POOL-FIRST GATE — the two routes that were buying what we already owned.
//
// ── WHAT THIS GUARDS, AND WHY IT IS BEHAVIOURAL ─────────────────────────────────────────
//
// The founder's rule, locked 12 Sep: every MVP1 prospect-acquisition path checks reusable
// pooled inventory first, applies the normal ICP/geography/suppression/eligibility rules,
// serves every eligible pooled record, computes the remainder, buys ONLY that remainder, and
// writes newly acquired Apollo/PDL records back — so we never pay externally for an eligible
// reusable identity we already have.
//
// A verification on 12 Sep found two paths that did none of it:
//   ① `POST /lookalike/generate` — Apollo/PDL for 50 records, no `lead_pool` read at all,
//      no write-back, and no opt-out/DNC/placeholder check on the provider results either.
//   ② `POST /internal/cmo/prospect` + `/cmo/self-outreach` — Apollo for 20 House prospects,
//      emailed to the founder, nothing retained.
//
// ⚠️ EVERY TEST BELOW COUNTS REAL CALLS. Not one of them asserts that a line of source exists.
// #I is the lesson: a guard that checks a string is present cannot see a branch being switched
// off — the refusal text stays in the file when the `if` around it is disabled. So the provider
// boundary is a SPY, and "pool first" means the spy was called with the remainder, or not at
// all. Each test below states the injection that must turn it red.
//
// Mocks only. No provider, no network, no database. `fetch` is never called.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ⚑ 23 Sep (R137) — 🧪 LEGACY-ERA FIXTURE. Production no longer resolves any client to the retired
// per-lead model (founder: *"the 299/4 is retired/ this must go."*), so the code this file tests
// is unreachable from production and is removed, with these tests, by its own follow-up PR.
// Until then it runs against the resolver exactly as it stood before R137 — the only state in
// which it was reachable — rather than being deleted or skipped (R131). See
// `apps/api/test-support/legacy-era-commercial-model.ts`; production's behaviour is proven in
// `commercial-model.test.ts`, which does not use it.
vi.mock('./commercial-model', async (importOriginal) =>
  (await import('../../test-support/legacy-era-commercial-model'))
    .legacyEraCommercialModel(await importOriginal()))

// ── FIXTURES ────────────────────────────────────────────────────────────────────────────
//
// The ICP and the pooled row are the SAME shapes `proof-pool-hard-fit.test.ts` uses, so a row
// that is reusable there is reusable here. A fixture that quietly failed hard fit would make
// every "pool served N" assertion pass for the wrong reason — it would prove the provider was
// called because the pool was empty, not because the code asked it to be.
const ICP_ROW = {
  id: 'icp-1', client_id: 'c1', name: 'Lookalike ICP', is_active: true,
  geographies: ['United Kingdom'], company_sizes: ['11–50'],
  industries: ['Digital Marketing'], job_titles: ['Founder', 'CEO'],
  seniority_levels: ['founder', 'c_suite'], tech_stack: [], keywords: [],
  apollo_only_consented: false, intent_signals: [],
}

/** An owned row that genuinely matches ICP_ROW — country, size, industry and seniority. */
const poolRow = (i: number, over: Record<string, unknown> = {}) => ({
  email_norm: `pool${i}@agency.co.uk`, first_name: 'P', last_name: `${i}`,
  title: 'Founder', seniority: 'founder', company: `Agency ${i}`,
  industry: 'Digital Marketing Agency', company_size: '11–50',
  country: 'United Kingdom', linkedin_url: null, source: 'pdl',
  acquisition_cost: 0.28, sourced_at: new Date().toISOString(), last_verified_at: null,
  ...over,
})

/**
 * An owned row that matches K.I.N.D's OWN hunting profile (`KIND_BRAND.target_icp`) — a
 * different ICP from the lookalike fixture, so a House test cannot pass on a client's row.
 */
const housePoolRow = (i: number, over: Record<string, unknown> = {}) =>
  poolRow(i, { industry: 'Fintech', country: 'South Africa', title: 'CEO', seniority: 'c_suite', company_size: '11–50', ...over })

/** A provider contact in the shape both Apollo and PDL return. */
const providerContact = (i: number, over: Record<string, unknown> = {}) => ({
  id: `apollo-${i}`, first_name: 'X', last_name: `${i}`,
  email: `bought${i}@agency.co.uk`, title: 'Founder', seniority: 'founder',
  country: 'United Kingdom', linkedin_url: null,
  organization_name: `Bought ${i}`, organization: { name: `Bought ${i}`, industry: 'Digital Marketing Agency', num_employees: 25 },
  ...over,
})

type Rec = {
  /** Every provider search, with the SIZE it was asked for. Length 0 = never contacted. */
  apollo: number[]
  pdl:    number[]
  /** Rows upserted into lead_pool. */
  poolWrites: Record<string, unknown>[]
  /** Rows inserted into leads. */
  leadRows: Record<string, unknown>[]
  rpc: { fn: string; args: Record<string, unknown> }[]
}
const emptyRec = (): Rec => ({ apollo: [], pdl: [], poolWrites: [], leadRows: [], rpc: [] })

interface Scenario {
  pool?:        Record<string, unknown>[]
  provider?:    Record<string, unknown>[]
  blocklist?:   string[]
  /** emails this client already holds in `leads` */
  owned?:       string[]
  grant?:       number
  audience?:    'client' | 'house'
  /**
   * ⚠️ ADDED AFTER THE TEETH RUN FAILED TO BITE, and this is the whole reason it exists.
   *
   * Deleting the JS `isPoolSourceEligible` check left every test GREEN, because this mock was
   * reproducing the DATABASE prefilter (`.in('source', POOL_ELIGIBLE_SOURCES)`) — so the JS
   * check never had an ineligible row to refuse and could be removed unnoticed. That is the
   * shape of a test that proves nothing.
   *
   * R73 is deliberately enforced at BOTH boundaries because a historical SQL import or
   * backfill bypasses the TypeScript writer entirely — that is not hypothetical, it is how the
   * 85 production rows arrived. Set this false to model exactly that: rows sitting in
   * `lead_pool` that the prefilter would have caught if it had been the one to put them there.
   */
  poolDbPrefilter?: boolean
}

async function withMocks(sc: Scenario, rec: Rec) {
  vi.resetModules()
  const pool      = sc.pool ?? []
  const provider  = sc.provider ?? []
  const blocklist = sc.blocklist ?? []
  const owned     = sc.owned ?? []
  const grant     = sc.grant ?? 50

  vi.doMock('@kind/db', () => {
    const makeQuery = (t: string) => {
      const q: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'in', 'is', 'neq', 'not', 'order', 'or', 'gte', 'limit']) q[m] = () => q
      q.single      = async () => ({ data: t === 'icps' ? ICP_ROW : t === 'clients' ? { id: 'c1', company_name: 'Acme', user_id: 'u1', is_demo: false, commercial_model: null } : null, error: null })
      q.maybeSingle = q.single
      q.insert = (rows: unknown) => {
        const list = Array.isArray(rows) ? rows : [rows]
        if (t === 'leads') rec.leadRows.push(...(list as Record<string, unknown>[]))
        const data = list.map((_, i) => ({ id: `lead-${i}` }))
        const c: Record<string, unknown> = {
          select: () => c, single: async () => ({ data: data[0], error: null }),
          then: (r: (v: unknown) => void) => r({ data, error: null }),
        }
        return c
      }
      q.upsert = async (rows: unknown) => {
        const list = Array.isArray(rows) ? rows : [rows]
        if (t === 'lead_pool') rec.poolWrites.push(...(list as Record<string, unknown>[]))
        return { error: null }
      }
      q.update = () => ({ eq: async () => ({ error: null }), in: () => ({ is: async () => ({ error: null }) }) })
      q.then = (r: (v: unknown) => void) => {
        // The real lead_pool query applies `.in('source', POOL_ELIGIBLE_SOURCES)` before
        // `.limit()`; the mock reproduces that so an ineligible fixture genuinely cannot serve.
        if (t === 'lead_pool') {
          const prefiltered = (sc.poolDbPrefilter ?? true)
            ? pool.filter(p => ['pdl', 'apollo'].includes(String(p.source)))
            : pool
          return r({ data: prefiltered, error: null })
        }
        if (t === 'opt_out_blocklist') return r({ data: blocklist.map(email => ({ email })), error: null })
        if (t === 'leads') return r({ data: owned.map(email => ({ email })), error: null })
        return r({ data: [], count: 0, error: null })
      }
      return q
    }
    return {
      db: {
        from: (t: string) => makeQuery(t),
        rpc: async (fn: string, args: Record<string, unknown>) => {
          rec.rpc.push({ fn, args })
          // ⚠️ THE REAL RPC NEVER GRANTS MORE THAN WAS REQUESTED, so neither does this. A mock
          // that returns a flat number regardless would hide the very defect these tests exist
          // for: asking the provider for the TARGET after the pool already covered part of it.
          // ⛓️ 17 Sep (XC-13 / FD-6) — the client sourcing gate is the programme AUTHORITY
          // reserve now, not `try_spend_sourcing`: that function books a $0.28-a-record PDL cost
          // we no longer incur. Both are answered here so the harness keeps working whichever
          // path a case drives.
          if (fn === 'try_reserve_programme_sourcing') return { data: Math.min(grant, Number(args.p_requested ?? grant)), error: null }
          if (fn === 'try_spend_sourcing') return { data: Math.min(grant, Number(args.p_requested ?? grant)), error: null }
          return { data: null, error: null }
        },
      },
    }
  })

  vi.doMock('./provider-boundary', async () => {
    const real = await vi.importActual<typeof import('./provider-boundary')>('./provider-boundary')
    return { ...real, audienceForClient: async () => sc.audience ?? 'client', audienceForUser: async () => sc.audience ?? 'client' }
  })

  // ⚠️ THE SPIES. Every provider entry point records the SIZE it was asked for. "Zero provider
  // calls" is `rec.apollo.length === 0`, which no amount of surviving refusal text can fake.
  vi.doMock('./apollo', () => ({
    buildSearchBody: () => ({ page: 1 } as Record<string, unknown>),
    searchPeople: async (body: { per_page?: number }) => { rec.apollo.push(body?.per_page ?? -1); return provider },
    searchPeopleWithFallback: async (_icp: unknown, _p: number, size: number) => { rec.apollo.push(size); return { contacts: provider, relaxed: false } },
    previewCount: async () => ({ count: 0, error: null, debug: {} }),
    ApolloCreditsExhaustedError: class extends Error {},
    ApolloRateLimitError: class extends Error {},
  }))
  vi.doMock('./pdl-search', () => ({
    pdlSearchPeople: async (_icp: unknown, size: number) => { rec.pdl.push(size); return provider },
    pdlSearchPage: async () => ({ contacts: [], scrollToken: null, exhausted: false }),
    pdlSearchDiagnostic: async () => ({ configured: true, ok: true, status: 200, count: 0, error: null }),
  }))
}

function mockRes() {
  const r: Record<string, unknown> = { code: 200 }
  r.status = (c: number) => { r.code = c; return r }
  r.json   = (b: unknown) => { r.body = b; return r }
  return r as { code: number; body?: Record<string, unknown>; status: unknown; json: unknown }
}

/** Mount the real router module and return the handler express itself would run. */
async function lookalikeHandler() {
  const mod = await import('../routes/lookalike')
  const router = mod.default as { stack: Array<{ route?: { path: string; stack: Array<{ handle: unknown }> } }> }
  const layer = router.stack.find(l => l.route?.path === '/generate')
  if (!layer?.route) throw new Error('no /generate route registered')
  return layer.route.stack[layer.route.stack.length - 1].handle as (req: unknown, res: unknown) => Promise<void>
}

async function runLookalike(sc: Scenario) {
  const rec = emptyRec()
  await withMocks(sc, rec)
  const handler = await lookalikeHandler()
  const res = mockRes()
  await handler({ body: { client_id: 'c1' }, headers: {} }, res)
  return { rec, res }
}

async function runCmo(sc: Scenario) {
  const rec = emptyRec()
  await withMocks(sc, rec)
  const { findKindProspects } = await import('./cmo')
  const contacts = await findKindProspects()
  return { rec, contacts }
}

const prev = { url: process.env.SUPABASE_URL, anon: process.env.SUPABASE_ANON_KEY, an: process.env.ANTHROPIC_API_KEY, ap: process.env.APOLLO_API_KEY }
beforeEach(() => {
  process.env.SUPABASE_URL      = 'http://localhost:54321'
  process.env.SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.ANTHROPIC_API_KEY = 'test-key'
  process.env.APOLLO_API_KEY    = 'apollo-key'
})
afterEach(() => {
  vi.doUnmock('./provider-boundary'); vi.doUnmock('./apollo'); vi.doUnmock('./pdl-search')
  vi.resetModules()
  process.env.SUPABASE_URL = prev.url; process.env.SUPABASE_ANON_KEY = prev.anon
  process.env.ANTHROPIC_API_KEY = prev.an; process.env.APOLLO_API_KEY = prev.ap
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ① /lookalike/generate
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('① /lookalike/generate is Pool First', () => {
  it('1 — the pool is read, and it is read BEFORE the provider', async () => {
    // RED: delete the `selectPoolCandidates` call and the run buys all 50 — from_pool is 0.
    const { rec, res } = await runLookalike({ pool: Array.from({ length: 10 }, (_, i) => poolRow(i)), provider: [] })
    expect(res.body?.from_pool, 'owned inventory was served').toBe(10)
    // ⛓️ 17 Sep (FD-6) — the provider is Apollo, so the size is recorded in `rec.apollo`.
    expect(rec.apollo[0], 'and the provider was asked for the shortfall, not the target').toBe(40)
  })

  it('2 — a FULL pool means the provider is never contacted at all', async () => {
    // 🛑 THE CLAUSE-7 TEST. Not "a smaller request" — NO request. RED: restore
    // `searchBody.per_page = LOOKALIKE_TARGET` and remove the `remainder <= 0` return, and
    // both spies fire.
    const { rec, res } = await runLookalike({ pool: Array.from({ length: 50 }, (_, i) => poolRow(i)) })
    expect(rec.pdl, 'PDL was never called').toHaveLength(0)
    expect(rec.apollo, 'Apollo was never called').toHaveLength(0)
    expect(res.body?.from_pool).toBe(50)
    expect(res.body?.from_provider).toBe(0)
    // And no money was reserved for records nobody bought.
    expect(rec.rpc.filter(r => r.fn === 'try_spend_sourcing'), 'no grant was taken').toHaveLength(0)
  })

  it('3 — a PARTIAL pool sends the provider the remainder and nothing more', async () => {
    // RED: pass LOOKALIKE_TARGET instead of `remainder` and this reads 50.
    const { rec } = await runLookalike({ pool: Array.from({ length: 18 }, (_, i) => poolRow(i)), provider: [] })
    expect(rec.apollo[0]).toBe(32)
    // ⛓️ RE-AIMED 17 Sep (FD-6) — there is no grant call on this route any more. The rule the
    // second assertion guarded is UNCHANGED and is now carried entirely by the first one: a
    // pool row is free, so only the remainder is ever asked of a provider. What is gone is
    // the PDL money fence that used to pre-fund that remainder in a currency we no longer buy.
    expect(rec.rpc.map(r => r.fn), 'the retired PDL fence must not be consulted').not.toContain('try_spend_sourcing')
  })

  it('4 — provider-acquired records are written back to lead_pool, tagged with the real provider', async () => {
    // RED: delete the upsert and the next run buys these same identities again.
    const { rec } = await runLookalike({ pool: [], provider: [providerContact(1), providerContact(2)] })
    expect(rec.poolWrites).toHaveLength(2)
    expect(rec.poolWrites.every(r => r.source === 'pdl'), 'a client run is PDL (AR5)').toBe(true)
    expect(rec.poolWrites.map(r => r.email_norm)).toEqual(['bought1@agency.co.uk', 'bought2@agency.co.uk'])
  })

  it('4b — a HOUSE run tags its write-back apollo, never pdl (AR5 unchanged)', async () => {
    const { rec } = await runLookalike({ audience: 'house', pool: [], provider: [providerContact(1)] })
    expect(rec.apollo.length, 'House buys from Apollo').toBeGreaterThan(0)
    expect(rec.pdl, 'House never spends the clients’ PDL').toHaveLength(0)
    expect(rec.poolWrites[0]?.source).toBe('apollo')
  })

  it('8 — provider results are refused by opt-out, do-not-contact and unmailable address', async () => {
    // 🛑 THE FOUNDER'S AMENDMENT (12 Sep). Before this, the provider half of this route
    // inserted straight into a client's pipeline with none of these checks.
    // RED: drop the `filterProviderContacts` call and all four land as leads.
    const { rec } = await runLookalike({
      pool: [],
      provider: [
        providerContact(1),                                                   // clean
        providerContact(2, { email: 'optedout@agency.co.uk' }),               // on the blocklist
        providerContact(3, { email: 'email_not_unlocked@agency.co.uk' }),     // placeholder
        providerContact(4, { email: 'ghost@mbf-demo.invalid' }),              // unmailable domain
      ],
      blocklist: ['optedout@agency.co.uk'],
    })
    const emails = rec.leadRows.map(r => r.email)
    expect(emails, 'only the clean contact became client inventory').toEqual(['bought1@agency.co.uk'])
    // And the refused ones are not quietly pooled either.
    expect(rec.poolWrites.map(r => r.email_norm)).toEqual(['bought1@agency.co.uk'])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ② House prospecting (/internal/cmo/prospect · /cmo/self-outreach)
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('② House prospecting is Pool First', () => {
  it('5 — owned inventory is served before Apollo is asked', async () => {
    // RED: remove the `selectPoolCandidates` call; Apollo is asked for 20 and nothing is reused.
    const { rec, contacts } = await runCmo({ pool: Array.from({ length: 6 }, (_, i) => housePoolRow(i)), provider: [] })
    expect(contacts).toHaveLength(6)
    expect(rec.apollo[0], 'Apollo was asked for the shortfall only').toBe(14)
  })

  it('6 — a FULL pool means Apollo is never called', async () => {
    // RED: remove the `remainder <= 0` early return.
    const { rec, contacts } = await runCmo({ pool: Array.from({ length: 20 }, (_, i) => housePoolRow(i)) })
    expect(rec.apollo, 'zero Apollo calls').toHaveLength(0)
    expect(contacts).toHaveLength(20)
  })

  it('7 — a PARTIAL pool sends Apollo the remainder only', async () => {
    const { rec } = await runCmo({ pool: Array.from({ length: 13 }, (_, i) => housePoolRow(i)), provider: [] })
    expect(rec.apollo[0]).toBe(7)
  })

  it('8 — Apollo-acquired records are RETAINED as reusable inventory', async () => {
    // 🛑 THE ONE THAT COST MONEY FOR NOTHING. This function bought twenty records a run and
    // kept none of them, so the next run could buy the same people again.
    // RED: delete the upsert; poolWrites is empty and clause 6 is broken by omission.
    const { rec, contacts } = await runCmo({ pool: [], provider: [providerContact(1), providerContact(2)] })
    expect(rec.poolWrites).toHaveLength(2)
    expect(rec.poolWrites.every(r => r.source === 'apollo'), 'House hunting is Apollo — AR5 unchanged').toBe(true)
    expect(contacts).toHaveLength(2)
  })

  it('and House prospecting still never spends the clients’ PDL', async () => {
    const { rec } = await runCmo({ pool: [], provider: [providerContact(1)] })
    expect(rec.pdl).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ③ Pool-read hygiene
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('③ what the pool will and will not serve', () => {
  it('9 — a STALE record is still SERVED, and counted (founder decision S1, 12 Sep)', async () => {
    // 🛑 THIS ASSERTS A DECISION, NOT AN OVERSIGHT. Excluding a six-month-old record shrinks
    // owned inventory, which GROWS the paid remainder — the opposite of clause 7. The reveal
    // flow already re-verifies via Hunter and refunds on a dead address. What was missing was
    // the VISIBILITY, and that is the log line.
    //
    // RED: turn `isPoolRecordStale` into a filter and this serves 0 while the provider is
    // asked for 50 — spending money to replace inventory we own.
    const old = new Date(Date.now() - 400 * 24 * 3600 * 1000).toISOString()
    const logs: string[] = []
    const spy = vi.spyOn(console, 'log').mockImplementation(m => { logs.push(String(m)) })
    try {
      const { rec, res } = await runLookalike({
        pool: Array.from({ length: 5 }, (_, i) => poolRow(i, { sourced_at: old, last_verified_at: null })),
        provider: [],
      })
      expect(res.body?.from_pool, 'stale inventory is still inventory').toBe(5)
      expect(rec.apollo[0], 'and it still reduces what we buy').toBe(45)
      expect(logs.some(l => l.includes('stage=pool_stale')), 'the count is reported').toBe(true)
    } finally { spy.mockRestore() }
  })

  it('10 — placeholder and unmailable pool records are NOT served', async () => {
    // ⚠️ THE GAP THAT WAS REAL. A `email_not_unlocked@…` or `.invalid` row consumed a slot AND
    // shrank the external ask by one — a free row that can never be mailed costs money twice.
    // RED: remove the `isPoolEmailUsable` guard and all three serve.
    const { res } = await runLookalike({
      pool: [
        poolRow(1),
        poolRow(2, { email_norm: 'email_not_unlocked@agency.co.uk' }),
        poolRow(3, { email_norm: 'ghost@mbf-demo.invalid' }),
      ],
      provider: [],
    })
    expect(res.body?.from_pool).toBe(1)
  })

  it('10b — a HARD-BOUNCED record is not served (protection that already existed, now pinned)', async () => {
    // Bounces and spam complaints are written to `opt_out_blocklist` with
    // `reason='hard_bounce' | 'spam_complaint'`, and the pool read queries that table with NO
    // reason filter — so they have always been refused. This test exists so that stays true.
    const { res } = await runLookalike({
      pool: [poolRow(1), poolRow(2)],
      blocklist: ['pool2@agency.co.uk'],
      provider: [],
    })
    expect(res.body?.from_pool).toBe(1)
  })

  it('11 — opt-out, source rights and already-held exclusions are unchanged', async () => {
    const { res } = await runLookalike({
      pool: [
        poolRow(1),                                   // servable
        poolRow(2),                                   // opted out
        poolRow(3, { source: 'csv_import' }),         // not K.I.N.D-acquired (R73, fail closed)
        poolRow(4, { source: null }),                 // untagged — fails closed
        poolRow(5),                                   // this client already holds it
        poolRow(6, { country: 'Ukraine' }),           // wrong geography
        poolRow(7, { company_size: '1,000+' }),       // wrong size — hard fit
        // ⛓️ 22 Sep — ~~"wrong industry — hard fit"~~. IT IS REUSABLE NOW, AND DELIBERATELY.
        // The client's category stopped removing anybody on 22 Sep (`RANKING_ONLY_CRITERIA`),
        // because judging their words against a vocabulary we invented is what emptied the
        // Proof screen. The founder then ruled the pool must work the same way — *"Treat our
        // Pool as Apollo way always"* — so a company Apollo's copy of would be KEPT and ranked
        // can no longer be thrown away just because we happen to own it already.
        //
        // ⚠️ IT IS NOT PRETENDED TO FIT. `hardFit` still answers `no` on its industry,
        // `fitBand` still bands it "Not a fit" and `displayScore` still caps it at 30 — it is
        // served, ranked to the bottom, and the client sees why.
        poolRow(8, { industry: 'Management Consulting' }), // wrong industry — RANKED, not removed
      ],
      blocklist: ['pool2@agency.co.uk'],
      owned:     ['pool5@agency.co.uk'],
      provider:  [],
    })
    // ⛓️ 22 Sep — 1 → 2. Rows 2–7 are all still refused, and each for a reason that genuinely
    // removes somebody: opted out, no source rights, untagged, already held, wrong country,
    // wrong size. Only the industry row moved, which is the whole of the change.
    expect(res.body?.from_pool, 'the reusable set changed beyond the industry row').toBe(2)
  })

  it('🛑 R73 is decided in JS too — a row the database prefilter never saw is still refused', async () => {
    // ⚠️ THIS TEST EXISTS BECAUSE THE TEETH RUN FOUND THE OLD ONE TOOTHLESS. With the mock
    // reproducing the DB prefilter, deleting the JS `isPoolSourceEligible` check changed
    // nothing and all sixteen tests stayed green.
    //
    // Both boundaries are load-bearing: the prefilter stops ineligible rows consuming the
    // bounded candidate window, and the JS check is what refuses a row that entered the pool
    // outside the guarded writer. `poolDbPrefilter: false` models the second case, so the JS
    // check is now the ONLY thing standing between a customer-inbound row and a cross-client
    // serve. RED: delete `if (!isPoolSourceEligible(c.source))` and this serves all four.
    const { res } = await runLookalike({
      poolDbPrefilter: false,
      pool: [
        poolRow(1),                            // pdl — reusable
        poolRow(2, { source: 'csv_import' }),  // customer data — never cross-client
        poolRow(3, { source: null }),          // untagged — fails closed
        poolRow(4, { source: 'lookalike' }),   // not a K.I.N.D-acquired provider record
      ],
      provider: [],
    })
    expect(res.body?.from_pool, 'only the pdl row may be reused across clients').toBe(1)
  })

  it('and House prospecting applies the same exclusions, minus the one that needs a client', async () => {
    // There is no per-client `owned` question for House — it has no pipeline to duplicate.
    // Every other rule still decides.
    const { contacts } = await runCmo({
      pool: [
        housePoolRow(1),
        housePoolRow(2, { source: 'web_form' }),
        housePoolRow(3, { email_norm: 'x@thing.invalid' }),
      ],
      provider: [],
    })
    expect(contacts).toHaveLength(1)
  })
})
