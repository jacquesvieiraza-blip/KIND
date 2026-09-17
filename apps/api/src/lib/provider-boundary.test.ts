// ═══════════════════════════════════════════════════════════════════════════
// THE AR5 BOUNDARY — regression suite.
//
// A 21-Aug read-only audit found FOUR live doors where provider choice fell out of
// which global API keys happened to exist, crossing PRODUCT-RULES **AR5** in both
// directions: clients consuming K.I.N.D's Apollo, house work consuming the clients'
// PDL. The fix routes every door through `provider-boundary.ts`.
//
// ⚠️ WHAT THESE TESTS ARE FOR. The dangerous case is not "no key set" — it is
// **BOTH KEYS SET**, which is production. So every boundary test below sets
// APOLLO_API_KEY *and* PDL_API_KEY and then asserts the wrong provider is never
// reached. A test that proved the boundary only when a key was missing would prove
// nothing about the machine we actually run.
//
// No network: `fetch` is stubbed and asserted un-called for the forbidden provider.
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// `@kind/db` throws at import time without SUPABASE_* env vars, and the boundary module
// imports it for the audience lookups. Mocked to nothing: these tests exercise the PURE
// decision and the provider wiring, never the database — which also makes "no DB was
// touched" a property of the suite rather than a claim about it.
vi.mock('@kind/db', () => ({
  db: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
    auth: { admin: { listUsers: async () => ({ data: { users: [] }, error: null }) } },
  },
}))

import {
  searchProviderFor, companyNameSearchAllowed,
  isApolloPersonId, apolloRevealableIds,
  COMPANY_SEARCH_UNAVAILABLE, type Audience,
} from './provider-boundary'

// ── The pure decision — the whole boundary in four assertions ────────────────
describe('AR5 — the provider decision is pure and audience-driven', () => {
  it('house searches Apollo; client searches Apollo too, since FD-6', () => {
    // ⛓️ RE-AIMED 17 Sep BY FD-6 — was `'pdl'`. *"PDL IS NOT A PAID/ACTIVE PROVIDER FOR
    // MVP1. We are not paying for PDL."* The property this case guards is UNCHANGED: the
    // decision is pure and depends on nothing but its argument. What changed is the answer.
    expect(searchProviderFor('house')).toBe('apollo')
    expect(searchProviderFor('client')).toBe('apollo')
  })

  // ⚠️ There is deliberately no `revealProviderFor` test — the function was removed on
  // 22 Aug. It had no runtime callers and encoded a rule the founder does not hold:
  // *"no. we have no blocker. if we need hunter we need him."* Hunter serves client
  // reveals AND is permitted as a house reveal fallback. What AR5 constrains is the
  // paid Apollo reveal, and that is tested below against the id's own provenance.

  it('company-name search is house-only (founder, 21 Aug)', () => {
    expect(companyNameSearchAllowed('house')).toBe(true)
    expect(companyNameSearchAllowed('client')).toBe(false)
    expect(COMPANY_SEARCH_UNAVAILABLE).toMatch(/not available/i)
  })

  it('the decision does not read the environment — both keys set changes nothing', () => {
    const prevA = process.env.APOLLO_API_KEY
    const prevP = process.env.PDL_API_KEY
    process.env.APOLLO_API_KEY = 'apollo-key'
    process.env.PDL_API_KEY = 'pdl-key'
    try {
      // THE defect, in one assertion: with both keys present the old code mixed the
      // providers. The decision must be identical to the no-keys case.
      // ⛓️ 17 Sep (FD-6) — and it still is. The answer moved; the independence did not, and
      // this is the case that would catch a key deciding provider choice by the back door.
      expect(searchProviderFor('client')).toBe('apollo')
      expect(searchProviderFor('house')).toBe('apollo')
    } finally {
      process.env.APOLLO_API_KEY = prevA
      process.env.PDL_API_KEY = prevP
    }
  })
})

// ── THE REVEAL DOOR — where the boundary was still open ──────────────────────
//
// Closing the four SEARCH doors was not enough, and independent review (GPT-5.6,
// 22 Aug) was right to reject the argument that it was. A client's lead is now
// sourced from PDL, but it is still STAMPED with a provider id — `pdl_…` — and
// `lead-delivery.ts` selects reveal candidates on `apollo_id` being TRUTHY. A
// `pdl_…` string is truthy. So a brand-new, PDL-sourced, client-owned lead was
// still handed to Apollo's paid bulk_match endpoint.
//
// The argument that this was harmless — "Apollo won't match a PDL id, so no credit
// is charged" — is not the test. AR5 is a PROVIDER BOUNDARY, not a cost ceiling:
// a client's record must not be SENT to K.I.N.D's Apollo account at all. These
// tests assert the request never leaves, not that it comes back cheap.
describe('AR5 — a PDL id can never be sent to Apollo bulk_match', () => {
  it('the id itself carries its provenance', () => {
    expect(isApolloPersonId('5f3a1c2b9d7e4f0a1b2c3d4e')).toBe(true)
    expect(isApolloPersonId('pdl_abc123')).toBe(false)
    expect(isApolloPersonId('')).toBe(false)
    expect(isApolloPersonId(null)).toBe(false)
  })

  it('the filter keeps legacy Apollo ids and drops PDL ids', () => {
    // AR15 (founder, 21 Aug): existing client leads that carry a GENUINE Apollo id
    // were deliberately grandfathered — they finish through the path they were
    // created under. So this filter must be a discriminator, not a cutover.
    expect(apolloRevealableIds(['pdl_a', 'apollo-legacy-1', 'pdl_b', 'apollo-legacy-2']))
      .toEqual(['apollo-legacy-1', 'apollo-legacy-2'])
  })

  describe('bulkMatchEmails', () => {
    const prev = process.env.APOLLO_API_KEY
    let fetchSpy: ReturnType<typeof vi.fn>

    beforeEach(() => {
      // The dangerous shape: the Apollo key IS set. Production.
      process.env.APOLLO_API_KEY = 'apollo-key'
      fetchSpy = vi.fn(async () => ({
        ok: true, status: 200,
        json: async () => ({ matches: [] }),
        text: async () => '{}',
      })) as unknown as ReturnType<typeof vi.fn>
      vi.stubGlobal('fetch', fetchSpy)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
      process.env.APOLLO_API_KEY = prev
    })

    it('a new PDL-sourced client lead never reaches Apollo — no request at all', async () => {
      const { bulkMatchEmails } = await import('./apollo')
      const out = await bulkMatchEmails(['pdl_person_1', 'pdl_person_2'])
      expect(fetchSpy).not.toHaveBeenCalled()
      expect(out.size).toBe(0)
    })

    it('a mixed batch sends ONLY the genuine Apollo ids in the request body', async () => {
      const { bulkMatchEmails } = await import('./apollo')
      await bulkMatchEmails(['pdl_person_1', 'legacy_apollo_id', 'pdl_person_2'])
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      const body = JSON.parse(String((fetchSpy.mock.calls[0][1] as { body: string }).body))
      expect(body.details).toEqual([{ id: 'legacy_apollo_id' }])
    })

    it('AR15 grandfathering still works — a legacy Apollo id is still revealed', async () => {
      fetchSpy.mockImplementation(async () => ({
        ok: true, status: 200,
        json: async () => ({ matches: [{ id: 'legacy_apollo_id', email: 'dana@northwind-logistics.co.uk' }] }),
        text: async () => '{}',
      }))
      const { bulkMatchEmails } = await import('./apollo')
      const out = await bulkMatchEmails(['legacy_apollo_id'])
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      // ⛓️ 7 Sep — `bulkMatchEmails` now returns the revealed PERSON, not a bare string: the
      // reveal is the first moment `email_status` and `country` exist, and throwing them away
      // here is what left the qualification step with nothing to judge. The AR15 fact this
      // test protects — a legacy Apollo id is still revealed — is unchanged.
      expect(out.get('legacy_apollo_id')?.email).toBe('dana@northwind-logistics.co.uk')
    })
  })
})

// ── THE AR8 CASH FENCE IS THE CLIENT'S FENCE, NOT THE HOUSE'S ────────────────
//
// `try_spend_sourcing` (AR8) pre-funds PDL records out of the CLIENT'S collected
// cash — k=2, monthly ceiling, daily cap. It is a fence around buying PDL data.
//
// The first version of this PR resolved the audience SIXTY LINES AFTER that fence
// ran, so the house account operating through Milla was made to pre-fund its own
// Apollo hunting out of a PDL allowance the house never accrues. With a zero
// allowance the grant came back 0 and the run returned "Sourcing paused — add
// reveal credits" — the house never reached Apollo at all.
//
// These tests drive the real `runIcpJob` with an empty pool (so the whole target
// falls to the external remainder) and watch which RPCs it calls.
describe('AR8 — the PDL cash fence is the client\'s, and the house is not gated by it', () => {
  const ICP_ROW = {
    id: 'icp-1', client_id: 'c1',
    geographies: [], job_titles: [], industries: [], seniority_levels: [], company_sizes: [],
  }

  /** Runs the REAL runIcpJob against mocks. Returns what it reached for. */
  async function runSourcing(audience: Audience, grantReturns: number) {
    const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = []
    const searchCalls: Array<{ size: number; audience: string }> = []

    vi.resetModules()

    vi.doMock('@kind/db', () => {
      const singleFor = (table: string) => {
        if (table === 'icps') return ICP_ROW
        if (table === 'clients') return { leads_per_run: null, is_demo: false, user_id: 'u1', commercial_model: null }
        return null
      }
      const makeQuery = (table: string) => {
        const q: Record<string, unknown> = {}
        for (const m of ['select', 'eq', 'in', 'is', 'neq', 'not', 'order', 'or', 'gte', 'lte']) {
          q[m] = () => q
        }
        // `lead_pool` ends its candidate query on `.limit(n)` — an EMPTY pool, so the
        // entire target falls through to the external remainder, which is the path
        // under test.
        // ⛓️ C2 — `.limit()` IS NO LONGER TERMINAL. It used to return the result directly, which
        // modelled only `lead_pool`'s candidate query. `openProgrammeFor` ends on
        // `.limit(1).maybeSingle()`, and the commercial-model resolver calls it, so the mock now
        // returns something that is BOTH awaitable (the empty pool, unchanged) and chainable to
        // `maybeSingle` (no open programme → this client resolves as legacy, which is what
        // every assertion in this block is about). supabase-js supports both; the mock did not.
        q.limit = () => ({
          then: (r: (v: unknown) => void) => r({ data: [], error: null }),
          maybeSingle: async () => ({ data: null, error: null }),
          single:      async () => ({ data: null, error: null }),
        })
        q.single         = async () => ({ data: singleFor(table), error: null })
        q.maybeSingle    = async () => ({ data: singleFor(table), error: null })
        q.update         = () => ({ eq: async () => ({ error: null }) })
        q.upsert         = async () => ({ error: null })
        q.insert         = () => ({
          select: () => ({ single: async () => ({ data: { id: 'lead-x' }, error: null }) }),
          then:   (r: (v: unknown) => void) => r({ error: null }),
        })
        // ⚠️ A PURCHASE ROW, because these tests are about a PAYING client's AR8 fence.
        // From 22 Aug `runIcpJob` asks `fundedVia` whether the account has ever been funded:
        // a never-funded account is a PROSPECT and takes the free-proof authority instead of
        // `try_spend_sourcing`. Without this row the AR8 assertions below would be exercising
        // the proof path and quietly proving nothing about AR8 at all.
        q.then = (r: (v: unknown) => void) => r({
          data: table === 'credit_transactions' ? [{ type: 'purchase', reference: 'cs_live_seed' }] : [],
          count: 0, error: null,
        })
        return q
      }
      return {
        db: {
          from: (t: string) => makeQuery(t),
          rpc:  async (fn: string, args: Record<string, unknown>) => {
            rpcCalls.push({ fn, args })
            if (fn === 'try_spend_sourcing') return { data: grantReturns, error: null }
            return { data: null, error: null }
          },
          auth: { admin: { listUsers: async () => ({ data: { users: [] }, error: null }) } },
        },
      }
    })

    // The audience decision itself is proved by the tests above; here it is pinned so
    // the FENCE ORDERING is what is under test, not the lookup.
    //
    // ⚑ 7 Sep — `audienceForClientStrict` IS PINNED TOO, and it has to be. The sourcing run
    // now resolves the audience strictly (House must never fall silently to PDL), so a mock
    // that pinned only `audienceForClient` let the REAL resolver run — and this fixture's
    // `listUsers` returns an empty set, so the house case resolved as CLIENT and entered the
    // very PDL fence test A exists to prove it never enters. Same pin, same reason.
    vi.doMock('./provider-boundary', async () => {
      const real = await vi.importActual<typeof import('./provider-boundary')>('./provider-boundary')
      return {
        ...real,
        audienceForClient: async () => audience,
        audienceForClientStrict: async () => audience,
        audienceForUser: async () => audience,
      }
    })

    // No provider is ever reached: the search door is recorded, not called.
    vi.doMock('./apollo', () => ({
      searchPeopleWithFallback: async (_icp: unknown, _p: number, size: number, _c: unknown, aud: string) => {
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

  // `middleware/auth.ts:4` calls `createClient(...)` at MODULE SCOPE, and importing
  // `routes/icps` pulls it in — so the import throws "supabaseUrl is required" before a
  // single line of the function under test runs. These are syntactically-valid dummies
  // and no client is ever used: every DB call goes through the mocked `@kind/db`.
  // (`lib/startup-check.ts:98` documents this same module-scope hazard.)
  const prev = {
    anthropic: process.env.ANTHROPIC_API_KEY,
    url:       process.env.SUPABASE_URL,
    anon:      process.env.SUPABASE_ANON_KEY,
  }
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY  = 'test-key'
    process.env.SUPABASE_URL       = 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY  = 'test-anon-key'
  })
  afterEach(() => {
    // ⚠️ NOT `@kind/db` — un-mocking it would drop the HOISTED module-level mock this
    // whole file depends on, and every later suite would try to reach a real Supabase.
    vi.doUnmock('./provider-boundary'); vi.doUnmock('./apollo')
    vi.resetModules()
    process.env.ANTHROPIC_API_KEY = prev.anthropic
    process.env.SUPABASE_URL      = prev.url
    process.env.SUPABASE_ANON_KEY = prev.anon
  })

  it('A — HOUSE with ZERO PDL allowance never calls the fence, and still reaches Apollo', async () => {
    // grantReturns 0 = the house has no PDL allowance, which is the normal state: the
    // house never accrues one. Before the fix this returned "Sourcing paused".
    const { rpcNames, searchCalls } = await runSourcing('house', 0)
    expect(rpcNames).not.toContain('try_spend_sourcing')
    expect(searchCalls).toHaveLength(1)
    expect(searchCalls[0].audience).toBe('house')
    // The volume limit is the remainder that already existed — no new budget rule.
    expect(searchCalls[0].size).toBe(10)
  })

  it('B — NORMAL CLIENT still calls the fence, with AR8\'s arguments unchanged', async () => {
    const { rpcNames, rpcCalls, searchCalls } = await runSourcing('client', 10)
    expect(rpcNames).toContain('try_spend_sourcing')
    const fence = rpcCalls.find(c => c.fn === 'try_spend_sourcing')!
    expect(fence.args).toEqual({ p_client_id: 'c1', p_requested: 10, p_programme_id: null })
    // ⛓️ 28 Aug BUILD-002 — `p_programme_id` joined AR8's argument list. For a client with
    // NO open programme, null is the legacy path and the fence behaves exactly as before:
    // the RPC reads the client's programmes, finds none, and takes the untouched legacy
    // branch. AR8's promise is unchanged — what changed is that the gate now decides which
    // money model applies from the DATABASE instead of trusting the caller.
    expect(searchCalls[0].audience).toBe('client')
  })

  it('B2 — a NORMAL CLIENT with no allowance is still refused, exactly as AR8 says', async () => {
    const { rpcNames, searchCalls } = await runSourcing('client', 0)
    expect(rpcNames).toContain('try_spend_sourcing')
    expect(searchCalls).toHaveLength(0)   // refused — no provider reached
  })
})

// ── ROUTE-LEVEL WIRING — doors 2 and 3, and the money fence on door 3 ────────
//
// Independent review (GPT-5.6, 22 Aug) correctly refused to count
// `companyNameSearchAllowed('client') === false` as proof that the ROUTE refuses. A
// helper returning the right boolean proves nothing about whether anything calls it.
//
// There is no supertest and no route-test harness anywhere in this repo, so rather
// than add a dependency these tests reach into the express router's own layer stack
// and invoke the REGISTERED handler — the same function express would run. That also
// makes "the rate-limit middleware is attached" a checkable property rather than a
// claim about a line of code.
//
// ⚠️ The handler is invoked directly, so the routers' own auth gates (`adminKeyValid`
// on lookalike, `requireAuth` on icps) are NOT exercised here — they are pre-existing,
// unchanged by this PR, and asserted structurally below instead.
describe('AR5/AR8 — the ROUTES, not just the helpers', () => {
  type Rec = { rpc: Array<{ fn: string; args: Record<string, unknown> }>; apollo: number; pdl: number[] }

  function mockRes() {
    const r: Record<string, unknown> = { code: 200 }
    r.status = (c: number) => { r.code = c; return r }
    r.json   = (b: unknown) => { r.body = b; return r }
    return r as { code: number; body?: Record<string, unknown>; status: unknown; json: unknown }
  }

  /** Mounts the real router module and returns the handler registered for a path. */
  async function handlerFor(mod: { default?: unknown; [k: string]: unknown }, exportName: string, path: string) {
    const router = (exportName === 'default' ? mod.default : mod[exportName]) as {
      stack: Array<{ route?: { path: string; stack: Array<{ handle: unknown }> } }>
    }
    const layer = router.stack.find(l => l.route?.path === path)
    if (!layer?.route) throw new Error(`no route registered at ${path}`)
    return {
      handler:      layer.route.stack[layer.route.stack.length - 1].handle as (req: unknown, res: unknown) => Promise<void>,
      handlerCount: layer.route.stack.length,
    }
  }

  async function withMocks(audience: Audience, grant: number, rec: Rec, apolloThrows = false, commercialModel: string | null = null, isDemo = false) {
    vi.resetModules()
    vi.doMock('@kind/db', () => {
      const singleFor = (t: string) => {
        if (t === 'icps')    return { id: 'icp-1', client_id: 'c1', job_titles: [], seniority_levels: [], company_sizes: [], geographies: [], industries: [] }
        // ⛓️ C2 — `commercial_model` ADDED. NULL is the UNCLASSIFIED state the whole live book
        // holds, so every assertion written before C2 keeps the meaning it was written with.
        if (t === 'clients') return { id: 'c1', company_name: 'Acme', user_id: 'u1', leads_per_run: null, is_demo: isDemo, commercial_model: commercialModel }
        return null
      }
      const makeQuery = (t: string) => {
        const q: Record<string, unknown> = {}
        for (const m of ['select', 'eq', 'in', 'is', 'neq', 'not', 'order', 'or']) q[m] = () => q
        q.limit = () => q
        q.single = async () => ({ data: singleFor(t), error: null })
        q.maybeSingle = async () => ({ data: singleFor(t), error: null })
        q.insert = () => ({
          select: () => ({ single: async () => ({ data: { id: 'lead-x' }, error: null }) }),
          then:   (r: (v: unknown) => void) => r({ error: null }),
        })
        q.update = () => ({ eq: async () => ({ error: null }) })
        q.then = (r: (v: unknown) => void) => r({ data: [], count: 0, error: null })
        return q
      }
      return {
        db: {
          from: (t: string) => makeQuery(t),
          rpc: async (fn: string, args: Record<string, unknown>) => {
            rec.rpc.push({ fn, args })
            if (fn === 'try_spend_sourcing') return { data: grant, error: null }
            return { data: null, error: null }
          },
        },
      }
    })
    vi.doMock('./provider-boundary', async () => {
      const real = await vi.importActual<typeof import('./provider-boundary')>('./provider-boundary')
      return { ...real, audienceForClient: async () => audience, audienceForUser: async () => audience }
    })
    vi.doMock('./apollo', () => ({
      buildSearchBody: () => ({ page: 1 } as Record<string, unknown>),
      searchPeople:    async () => {
        rec.apollo++
        if (apolloThrows) throw new Error('apollo 500')
        return []
      },
      previewCount:    async () => ({ count: 0, error: null, debug: {} }),
      searchPeopleWithFallback: async () => ({ contacts: [], relaxed: false }),
      ApolloCreditsExhaustedError: class extends Error {},
      ApolloRateLimitError: class extends Error {},
    }))
    vi.doMock('./pdl-search', () => ({
      pdlSearchPeople: async (_icp: unknown, size: number) => { rec.pdl.push(size); return [] },
      pdlSearchPage: async () => ({ contacts: [], scrollToken: null, exhausted: false }),
      pdlSearchDiagnostic: async () => ({ configured: true, ok: true, status: 200, count: 0, error: null }),
    }))
  }

  // `middleware/auth.ts:4` builds a supabase client at MODULE scope, so importing any
  // route module throws without these. Dummies — every DB call goes through the mock.
  // APOLLO_API_KEY is set because the house lookalike branch legitimately refuses without
  // one (`lookalike.ts`), and these tests are about the FENCE, not about key presence.
  const prev = {
    url: process.env.SUPABASE_URL, anon: process.env.SUPABASE_ANON_KEY,
    an: process.env.ANTHROPIC_API_KEY, ap: process.env.APOLLO_API_KEY,
  }
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

  const emptyRec = (): Rec => ({ rpc: [], apollo: 0, pdl: [] })

  async function runLookalike(audience: Audience, grant: number, commercialModel: string | null = null, isDemo = false) {
    const rec = emptyRec()
    await withMocks(audience, grant, rec, false, commercialModel, isDemo)
    const { handler } = await handlerFor(await import('../routes/lookalike'), 'default', '/generate')
    const res = mockRes()
    await handler({ body: { client_id: 'c1' }, headers: {} }, res)
    return { rec, res }
  }

  // ── 1 + 3 — the client's lookalike is fenced, sized to the grant, and reconciled ──
  it('1 — CLIENT lookalike calls the AR8 fence with the target client id, sizes PDL to the grant, and never calls Apollo', async () => {
    const { rec } = await runLookalike('client', 30)
    const fence = rec.rpc.find(c => c.fn === 'try_spend_sourcing')
    expect(fence).toBeDefined()
    expect(fence!.args).toEqual({ p_client_id: 'c1', p_requested: 50, p_programme_id: null })
    // ⛓️ 28 Aug BUILD-002 — see the note on the AR8 fence assertion above. The lookalike
    // route has no ICP in hand and therefore cannot name a programme, so it passes null
    // explicitly: a legacy client is served exactly as before, and a PROGRAMME client is
    // REFUSED here rather than silently sourcing outside programme authority.
    expect(rec.pdl).toEqual([30])   // asked PDL for EXACTLY the grant, not the 50 target
    expect(rec.apollo).toBe(0)
  })

  it('2 — CLIENT lookalike with grant 0 never touches PDL and refuses honestly', async () => {
    const { rec, res } = await runLookalike('client', 0)
    expect(rec.rpc.map(c => c.fn)).toContain('try_spend_sourcing')
    expect(rec.pdl).toEqual([])
    expect(rec.apollo).toBe(0)
    expect(res.body?.refused).toBe('sourcing_allowance')
    expect(res.body?.inserted).toBe(0)
  })

  it('3 — the UNUSED grant is refunded and ledger-corrected, and only the unused part', async () => {
    // PDL returns 0 of the 30 granted, so all 30 are unused. The refund must be the
    // unused count — never the whole grant blindly, never nothing.
    const { rec } = await runLookalike('client', 30)
    const refund = rec.rpc.find(c => c.fn === 'add_sourcing_allowance')
    expect(refund).toBeDefined()
    expect(refund!.args).toEqual({ p_client_id: 'c1', p_records: 30, p_trial: false })
  })

  it('4 — HOUSE lookalike uses Apollo, never the client cash fence, never PDL', async () => {
    const { rec } = await runLookalike('house', 0)   // grant 0 is irrelevant to the house
    expect(rec.rpc.map(c => c.fn)).not.toContain('try_spend_sourcing')
    expect(rec.rpc.map(c => c.fn)).not.toContain('add_sourcing_allowance')
    expect(rec.pdl).toEqual([])
    expect(rec.apollo).toBe(1)
  })

  // ══════════════════════════════════════════════════════════════════════════════════════
  // ⛓️ 3 Sep (C2) — THE DOOR THAT WAS STILL OPEN
  //
  // 🛑 This route asked "is a programme OPEN" and refused only then. House and MBF are DECLARED
  // programme clients with NO programme open, so the refusal never fired for either — and House
  // skips the AR8 cash fence entirely (Apollo is prepaid), so it reached the provider with no
  // gate of any kind and inserted 50 leads no programme can ever authorise anyone to contact.
  // These four run the REAL handler.
  // ══════════════════════════════════════════════════════════════════════════════════════
  it('🛑 C2-1 — HOUSE on the programme model with NO programme: Apollo is NEVER called', async () => {
    const { rec, res } = await runLookalike('house', 0, 'programme')
    expect(rec.apollo, 'the provider must not be reached at all').toBe(0)
    expect(rec.pdl).toEqual([])
    expect(rec.rpc.map(c => c.fn)).not.toContain('try_spend_sourcing')
    expect(res.body?.refused).toBe('programme_attribution')
    expect(res.body?.inserted).toBe(0)
    expect(res.body?.found).toBe(0)
  })

  it('🛑 C2-2 — a CLIENT on the programme model with NO programme: no PDL, no spend', async () => {
    const { rec, res } = await runLookalike('client', 30, 'programme')
    expect(rec.pdl, 'no records may be bought').toEqual([])
    expect(rec.rpc.map(c => c.fn), 'and the allowance is never touched')
      .not.toContain('try_spend_sourcing')
    expect(rec.apollo).toBe(0)
    expect(res.body?.refused).toBe('programme_attribution')
  })

  it('🛑 C2-MBF — programme + is_demo + no programme: the demo flag buys NO legacy sourcing', async () => {
    // 🛑 FOUNDER-LOCKED 3 Sep: `is_demo` and `commercial_model` are ORTHOGONAL. A demo may make
    // money and provider spend unreal; it may never make the retired commercial workflow legal.
    const { rec, res } = await runLookalike('client', 30, 'programme', true)
    expect(rec.pdl, 'no records bought').toEqual([])
    expect(rec.apollo, 'no provider reached').toBe(0)
    expect(rec.rpc.map(c => c.fn)).not.toContain('try_spend_sourcing')
    expect(res.body?.refused).toBe('programme_attribution')
  })

  it('⚠️ NON-VACUOUS — an UNCLASSIFIED demo client sources exactly as it does today', async () => {
    const { rec } = await runLookalike('client', 30, null, true)
    expect(rec.pdl, 'every demo on the book today is unaffected').toEqual([30])
  })

  it('⚠️ C2-3 NON-VACUOUS — a DECLARED LEGACY client still sources exactly as before', async () => {
    // Without this, both assertions above would pass against a route that refused everybody.
    const { rec } = await runLookalike('client', 30, 'legacy')
    expect(rec.rpc.map(c => c.fn)).toContain('try_spend_sourcing')
    expect(rec.pdl).toEqual([30])
  })

  it('⚠️ C2-4 NON-VACUOUS — and so does an UNCLASSIFIED house account', async () => {
    const { rec } = await runLookalike('house', 0, null)
    expect(rec.apollo).toBe(1)
  })

  // ── 5 + 6 — door 2, at the route ─────────────────────────────────────────────
  async function runFindAtCompanies(audience: Audience) {
    const rec = emptyRec()
    await withMocks(audience, 0, rec)
    const { handler } = await handlerFor(await import('../routes/leads'), 'leadRouter', '/find-at-companies')
    const res = mockRes()
    await handler({ body: { companies: ['Acme'], limit: 50 }, userId: 'u1', headers: {} }, res)
    return { rec, res }
  }

  it('5 — CLIENT /find-at-companies is refused 403 and Apollo is never called', async () => {
    const { rec, res } = await runFindAtCompanies('client')
    expect(res.code).toBe(403)
    expect(String(res.body?.error)).toMatch(/not available/i)
    expect(rec.apollo).toBe(0)
  })

  it('6 — HOUSE /find-at-companies is allowed and the Apollo path stays reachable', async () => {
    const { rec, res } = await runFindAtCompanies('house')
    expect(res.code).not.toBe(403)
    expect(rec.apollo).toBe(1)
  })

  // ── 7 — the preview route keeps its guards ───────────────────────────────────
  it('7 — /icps/preview-count is authenticated, rate-limited, and keeps its cache + audience split', async () => {
    const rec = emptyRec()
    await withMocks('client', 0, rec)
    const mod = await import('../routes/icps')
    const router = (mod as { icpRouter: { stack: Array<{ route?: { path: string; stack: unknown[] } }> } }).icpRouter

    // AUTHENTICATED: `requireAuth` is mounted router-wide, so it appears as a
    // non-route layer in the stack.
    expect(router.stack.some(l => !l.route)).toBe(true)

    // RATE-LIMITED: the route layer carries TWO handlers — the limiter and the
    // handler — where an unguarded route would carry one.
    const { handlerCount, handler } = await handlerFor(mod as never, 'icpRouter', '/preview-count')
    expect(handlerCount).toBe(2)

    // AUDIENCE SPLIT + CACHE: a client preview samples from PDL, and asking the same
    // ICP shape twice costs one provider call, not two (#446).
    const body = { job_titles: ['Founder'], geographies: ['UK'], industries: ['SaaS'] }
    await handler({ body, userId: 'u1', headers: {} }, mockRes())
    await handler({ body, userId: 'u1', headers: {} }, mockRes())
    expect(rec.apollo).toBe(0)
    expect(rec.pdl.length).toBe(1)
  })

  // ── 8 + 9 — the HOUSE preview must never fall through to PDL ─────────────────
  //
  // #243 built PDL as a preview fallback for "Apollo is unusable", and AR5 turned it
  // into the client's PRIMARY. What neither step did was stop the HOUSE using it: the
  // samples branch ran Apollo, swallowed any error to `[]`, and then took the
  // `contacts.length === 0` path straight into PDL. So a house preview with a thin ICP
  // — or a 500 from Apollo — quietly spent the clients' provider.
  async function runPreviewSamples(audience: Audience, apolloThrows: boolean) {
    const rec = emptyRec()
    await withMocks(audience, 0, rec, apolloThrows)
    const mod = await import('../routes/icps')
    const { handler } = await handlerFor(mod as never, 'icpRouter', '/preview-count')
    // A distinct ICP shape per case, or #446's cache answers the second call for free
    // and the test proves nothing about the provider.
    const body = { job_titles: [`T-${audience}-${apolloThrows}`], geographies: ['UK'] }
    await handler({ body, userId: 'u1', headers: {} }, mockRes())
    return rec
  }

  it('8 — HOUSE preview samples with ZERO Apollo results never reach PDL', async () => {
    const rec = await runPreviewSamples('house', false)
    expect(rec.apollo).toBe(1)
    expect(rec.pdl).toEqual([])
  })

  it('9 — HOUSE preview samples with an Apollo ERROR never reach PDL', async () => {
    const rec = await runPreviewSamples('house', true)
    expect(rec.apollo).toBe(1)
    expect(rec.pdl).toEqual([])
  })
})

// ── previewCount itself — the count half of the same boundary ─────────────────
describe('AR5 — the HOUSE preview COUNT never falls back to PDL', () => {
  const prev = { apollo: process.env.APOLLO_API_KEY, pdl: process.env.PDL_API_KEY }
  let fetchSpy: ReturnType<typeof vi.fn>

  const ICP = {
    job_titles: ['Founder'], seniority_levels: ['owner'], company_sizes: ['1,10'],
    geographies: ['UK'], industries: ['SaaS'], tech_stack: [], keywords: [],
    apollo_only_consented: false,
  }

  const hitPdl = () => fetchSpy.mock.calls.some(c => String(c[0]).includes('peopledatalabs'))

  beforeEach(() => {
    fetchSpy = vi.fn(async () => ({
      ok: true, status: 200,
      json: async () => ({ total: 0, pagination: { total_entries: 0 }, data: [] }),
      text: async () => '{}',
    })) as unknown as ReturnType<typeof vi.fn>
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    process.env.APOLLO_API_KEY = prev.apollo
    process.env.PDL_API_KEY    = prev.pdl
  })

  it('NO Apollo key + PDL key present — the house still does not call PDL', async () => {
    delete process.env.APOLLO_API_KEY
    process.env.PDL_API_KEY = 'pdl-key'
    const { previewCount } = await import('./apollo')
    const result = await previewCount(ICP, 'house')
    expect(hitPdl()).toBe(false)
    // …and it says so honestly rather than silently returning a PDL number.
    expect(String(result.error)).toMatch(/APOLLO_API_KEY/)
  })

  it('Apollo returns an ERROR status — the house still does not call PDL', async () => {
    process.env.APOLLO_API_KEY = 'apollo-key'
    process.env.PDL_API_KEY    = 'pdl-key'
    fetchSpy.mockImplementation(async () => ({
      ok: false, status: 500, json: async () => ({}), text: async () => 'upstream boom',
    }))
    const { previewCount } = await import('./apollo')
    const result = await previewCount(ICP, 'house')
    expect(hitPdl()).toBe(false)
    expect(String(result.error)).toMatch(/Apollo 500/)
  })

  it('Apollo THROWS — the house still does not call PDL', async () => {
    process.env.APOLLO_API_KEY = 'apollo-key'
    process.env.PDL_API_KEY    = 'pdl-key'
    fetchSpy.mockImplementation(async () => { throw new Error('socket hang up') })
    const { previewCount } = await import('./apollo')
    const result = await previewCount(ICP, 'house')
    expect(hitPdl()).toBe(false)
    expect(String(result.error)).toMatch(/socket hang up/)
  })

  // ⛓️ INVERTED 17 Sep BY FD-6 — was "a CLIENT still counts on PDL — the boundary cuts one
  // way only". The boundary now cuts the other way and cuts once: NOBODY reaches PDL. The
  // case is kept rather than deleted because it is the one that proves a client preview does
  // not silently fall back to a second vendor, which was the #243 behaviour AR5 inherited.
  it('a CLIENT preview counts on Apollo and never falls back to PDL', async () => {
    process.env.APOLLO_API_KEY = 'apollo-key'
    process.env.PDL_API_KEY    = 'pdl-key'
    const { previewCount } = await import('./apollo')
    await previewCount(ICP, 'client')
    expect(fetchSpy.mock.calls.some(c => String(c[0]).includes('apollo.io'))).toBe(true)
    expect(hitPdl()).toBe(false)
  })
})

// ── The wiring — does the search entry point honour the decision? ────────────
//
// `searchPeopleWithFallback` is the door Milla ICP sourcing and the house CMO both
// use. These tests drive it with BOTH keys set and watch which host it calls.
describe('AR5 — searchPeopleWithFallback routes by audience, not by keys', () => {
  const prev = { apollo: process.env.APOLLO_API_KEY, pdl: process.env.PDL_API_KEY }
  let fetchSpy: ReturnType<typeof vi.fn>

  const ICP = {
    job_titles: ['Founder'], seniority_levels: ['owner'], company_sizes: ['1,10'],
    geographies: ['South Africa'], industries: ['SaaS'], tech_stack: [], keywords: [],
    apollo_only_consented: false,
  }

  const hostsCalled = () =>
    fetchSpy.mock.calls.map(c => String(c[0])).map(u => {
      if (u.includes('apollo.io')) return 'apollo'
      if (u.includes('peopledatalabs')) return 'pdl'
      return u
    })

  beforeEach(() => {
    // BOTH keys present — production shape, and the shape the old code got wrong.
    process.env.APOLLO_API_KEY = 'apollo-key'
    process.env.PDL_API_KEY = 'pdl-key'
    fetchSpy = vi.fn(async () => ({
      ok: true, status: 200,
      json: async () => ({ people: [], contacts: [], data: [], total: 0, pagination: { total_entries: 0 } }),
      text: async () => '{}',
    })) as unknown as ReturnType<typeof vi.fn>
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    process.env.APOLLO_API_KEY = prev.apollo
    process.env.PDL_API_KEY = prev.pdl
  })

  // ⛓️ INVERTED 17 Sep BY FD-6. Was "CLIENT audience never calls Apollo — even with
  // APOLLO_API_KEY set", which was AR5 exactly. The half of this pair that still matters is
  // the one below it, and it is now true of BOTH audiences: nothing calls PDL, with the key
  // set. Keeping both directions is what makes the boundary provable rather than asserted.
  it('CLIENT audience calls Apollo and NEVER PDL — even with PDL_API_KEY set', async () => {
    const { searchPeopleWithFallback } = await import('./apollo')
    await searchPeopleWithFallback(ICP, 1, 5, null, 'client' as Audience)
    expect(hostsCalled()).toContain('apollo')
    expect(hostsCalled()).not.toContain('pdl')
  })

  it('HOUSE audience never calls PDL — even with PDL_API_KEY set', async () => {
    const { searchPeopleWithFallback } = await import('./apollo')
    await searchPeopleWithFallback(ICP, 1, 5, null, 'house' as Audience)
    expect(hostsCalled()).not.toContain('pdl')
  })

  it('no live provider call escapes the stub', async () => {
    const { searchPeopleWithFallback } = await import('./apollo')
    await searchPeopleWithFallback(ICP, 1, 5, null, 'client' as Audience)
    // Every call went through the spy — nothing reached the network by another route.
    expect(fetchSpy).toHaveBeenCalled()
  })
})

// ── previewCount — the fourth door. Free, but still the boundary. ────────────
describe('AR5 — ICP preview counts on the audience provider', () => {
  const prev = { apollo: process.env.APOLLO_API_KEY, pdl: process.env.PDL_API_KEY }
  let fetchSpy: ReturnType<typeof vi.fn>

  const ICP = {
    job_titles: ['Founder'], seniority_levels: ['owner'], company_sizes: ['1,10'],
    geographies: ['South Africa'], industries: ['SaaS'], tech_stack: [], keywords: [],
    apollo_only_consented: false,
  }

  beforeEach(() => {
    process.env.APOLLO_API_KEY = 'apollo-key'
    process.env.PDL_API_KEY = 'pdl-key'
    fetchSpy = vi.fn(async () => ({
      ok: true, status: 200,
      json: async () => ({ total: 0, pagination: { total_entries: 0 }, data: [] }),
      text: async () => '{}',
    })) as unknown as ReturnType<typeof vi.fn>
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    process.env.APOLLO_API_KEY = prev.apollo
    process.env.PDL_API_KEY = prev.pdl
  })

  // ⛓️ INVERTED 17 Sep BY FD-6 — was "CLIENT preview never hits Apollo".
  it('CLIENT preview hits Apollo, and only Apollo', async () => {
    const { previewCount } = await import('./apollo')
    await previewCount(ICP, 'client')
    const urls = fetchSpy.mock.calls.map(c => String(c[0]))
    expect(urls.some(u => u.includes('apollo.io'))).toBe(true)
    expect(urls.some(u => u.includes('peopledatalabs'))).toBe(false)
  })
})
