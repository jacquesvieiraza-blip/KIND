// ═══════════════════════════════════════════════════════════════════════════════════════
// XC-13 + J12-C0 · ONE PROVIDER: APOLLO (FD-6)
//
// ── THE FOUNDER'S RULING, 17 Sep, verbatim ────────────────────────────────────────────
//   "PDL IS NOT A PAID/ACTIVE PROVIDER FOR MVP1. We are not paying for PDL."
//
// FD-6 supersedes the provider half of AR5 ("Apollo is OURS. PDL + Hunter are the
// CLIENTS'"), AR8, AR15 and AR16. Those rules split one question — whose credits does this
// spend? — across two vendors, and one of the two no longer exists for us. A boundary whose
// safe branch points at an unpaid provider is not a boundary; it is an outage with a
// comment.
//
// ── WHAT EARNED IT ────────────────────────────────────────────────────────────────────
//
// Northstar Revenue completed its Brief, promoted to a client with an active ICP, entered
// Proof normally — and AR5 routed the client audience to PDL, PDL answered 402 (search
// credits exhausted), and the run resolved fail-closed with zero prospects. The 15 Sep patch
// moved PROOF to Apollo and deliberately left everything else on PDL. FD-6 finishes it.
//
// ── WHAT THIS FILE PROVES ─────────────────────────────────────────────────────────────
//
//   ① THE DECISION MATRIX. Every audience × every mode → apollo. No input selects PDL.
//   ② NO MVP1 PATH REACHES PDL OR HUNTER **WITH BOTH KEYS PRESENT**. That last clause is
//      the whole test. A suite that deletes the keys (as `vitest.setup.ts` does, for spend
//      safety) proves only that an unconfigured provider is not reached — which would stay
//      green on the day somebody sets the keys in Railway. So these cases set both keys and
//      then assert nothing calls either vendor.
//   ③ EVERY APOLLO FAILURE CLASS FAILS CLOSED. 401, 402, 422-credits, 429, 500, timeout and
//      a malformed body each release the batch, record the run, and produce a Vida task.
//      "It failed silently and the client saw zero" is the defect, not the error.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// `@kind/db` throws at import time without Supabase credentials, and `apollo.ts` reaches it
// through `provider-boundary` → `real-clients`. Nothing here touches the database: the
// provider decision is pure and the search paths are driven through a stubbed `fetch`.
vi.mock('@kind/db', () => ({
  db: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
    rpc: async () => ({ data: null, error: null }),
    auth: { admin: { getUserById: async () => ({ data: { user: null }, error: null }) } },
  },
}))

import {
  searchProviderFor,
  sourcingProviderFor,
  MVP1_SEARCH_PROVIDER,
  companyNameSearchAllowed,
  isApolloPersonId,
  apolloRevealableIds,
} from './provider-boundary'

// ── ① THE DECISION MATRIX ───────────────────────────────────────────────────────

describe('XC-13 · the provider decision matrix — every input answers apollo', () => {
  it('house search → apollo', () => {
    expect(searchProviderFor('house')).toBe('apollo')
  })

  // 🛑 THE INVERTED PIN. This asserted `'pdl'` from 21 Aug until FD-6. The old expectation
  // was correct for AR5 and is now the defect: it pointed a paying client's sourcing at a
  // provider the company does not pay for.
  it('client search → apollo (was pdl until FD-6)', () => {
    expect(searchProviderFor('client')).toBe('apollo')
  })

  it('proof mode → apollo, for either audience', () => {
    expect(sourcingProviderFor('client', { proofMode: true })).toBe('apollo')
    expect(sourcingProviderFor('house', { proofMode: true })).toBe('apollo')
  })

  it('programme sourcing → apollo, for either audience', () => {
    expect(sourcingProviderFor('client', { proofMode: false })).toBe('apollo')
    expect(sourcingProviderFor('house', { proofMode: false })).toBe('apollo')
    expect(sourcingProviderFor('client')).toBe('apollo')
    expect(sourcingProviderFor('house')).toBe('apollo')
  })

  it('no combination of inputs can select pdl', () => {
    for (const audience of ['house', 'client'] as const) {
      for (const proofMode of [true, false, undefined]) {
        expect(sourcingProviderFor(audience, { proofMode })).toBe('apollo')
      }
    }
  })

  // The keys are what USED to decide provider choice, before the boundary existed. They
  // must not decide it again by the back door.
  it('the answer does not depend on which keys are set', () => {
    const saved = { ...process.env }
    try {
      process.env.PDL_API_KEY = 'pdl-key'
      process.env.HUNTER_API_KEY = 'hunter-key'
      delete process.env.APOLLO_API_KEY
      expect(searchProviderFor('client')).toBe('apollo')
      expect(searchProviderFor('house')).toBe('apollo')
      expect(sourcingProviderFor('client', { proofMode: true })).toBe('apollo')
    } finally {
      process.env = saved
    }
  })

  it('the single provider is named once, as a constant', () => {
    expect(MVP1_SEARCH_PROVIDER).toBe('apollo')
    expect(searchProviderFor('client')).toBe(MVP1_SEARCH_PROVIDER)
  })
})

describe('XC-13 · what FD-6 does NOT change', () => {
  it('company-name search is still house-only — a founder ruling, not a provider fact', () => {
    // "only the house account can search by company name. for now. only us." (21 Aug)
    expect(companyNameSearchAllowed('house')).toBe(true)
    expect(companyNameSearchAllowed('client')).toBe(false)
  })

  it('historic pdl_ ids are still refused at the Apollo reveal door', () => {
    // AR15 grandfathered client leads carrying a genuine Apollo id; a `pdl_…` id is still
    // not an id Apollo can be asked about, and historic rows are not rewritten.
    expect(isApolloPersonId('pdl_abc123')).toBe(false)
    expect(isApolloPersonId('55f0f0f0f0f0f0f0f0f0f0f0')).toBe(true)
    expect(apolloRevealableIds(['pdl_a', 'legacy_apollo', 'pdl_b'])).toEqual(['legacy_apollo'])
  })
})

// ── ② NO MVP1 PATH REACHES PDL OR HUNTER, WITH BOTH KEYS SET ────────────────────

describe('XC-13 · with PDL_API_KEY and HUNTER_API_KEY BOTH SET, nothing calls either', () => {
  const saved = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    // 🛑 THE KEYS ARE DELIBERATELY PRESENT. `vitest.setup.ts` deletes them for spend safety,
    // which means a test written without this block proves only that an UNCONFIGURED provider
    // is not reached — and would stay green the day somebody pastes the keys into Railway.
    process.env.PDL_API_KEY = 'pdl-key-present'
    process.env.HUNTER_API_KEY = 'hunter-key-present'
    process.env.APOLLO_API_KEY = 'apollo-key-present'
    process.env.PAID_PROVIDERS_ENABLED = 'true'
  })

  afterEach(() => {
    process.env = { ...saved }
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('the search path calls Apollo and never pdl-search', async () => {
    const pdl = { page: 0, people: 0, diagnostic: 0 }
    vi.doMock('./pdl-search', () => ({
      pdlSearchPage: async () => { pdl.page += 1; return { contacts: [], scrollToken: null, exhausted: false, matchedNothing: true, error: null, completed: true } },
      pdlSearchPeople: async () => { pdl.people += 1; return [] },
      pdlSearchDiagnostic: async () => { pdl.diagnostic += 1; return { configured: true, ok: true, status: 200, count: 0, error: null } },
    }))

    const apolloCalls: unknown[] = []
    const fetchMock = vi.fn(async (url: unknown) => {
      apolloCalls.push(url)
      return { ok: true, status: 200, json: async () => ({ people: [], pagination: { total_entries: 0 } }) } as never
    })
    vi.stubGlobal('fetch', fetchMock)

    const { searchPeopleWithFallback } = await import('./apollo')
    // A FULL ICP shape. `buildSearchBody` reads every array unguarded, so a partial fixture
    // throws inside the walk and the `.catch` below would swallow it — leaving the test green
    // having proved only that nothing ran.
    const icp = {
      job_titles: ['CEO'], seniority_levels: ['C-Suite'], company_sizes: ['11–50'],
      geographies: ['United Kingdom'], industries: ['software'], tech_stack: [],
      keywords: [], apollo_only_consented: false, intent_signals: [],
    }

    for (const audience of ['client', 'house'] as const) {
      for (const proofMode of [true, false]) {
        await searchPeopleWithFallback(icp as never, 1, 5, null, audience, { proofMode }).catch(() => null)
      }
    }

    expect(pdl, 'a PDL function was called on an MVP1 search path').toEqual({ page: 0, people: 0, diagnostic: 0 })
    expect(apolloCalls.length, 'Apollo was never asked').toBeGreaterThan(0)
    for (const url of apolloCalls) {
      expect(String(url)).toContain('apollo.io')
      expect(String(url)).not.toContain('peopledatalabs')
      expect(String(url)).not.toContain('hunter.io')
    }
  })

  it('the ICP preview never falls back to PDL', async () => {
    const pdl = { diagnostic: 0 }
    vi.doMock('./pdl-search', () => ({
      pdlSearchPage: async () => ({ contacts: [], scrollToken: null, exhausted: false, matchedNothing: true, error: null, completed: true }),
      pdlSearchPeople: async () => [],
      pdlSearchDiagnostic: async () => { pdl.diagnostic += 1; return { configured: true, ok: true, status: 200, count: 42, error: null } },
    }))
    // Apollo unavailable: the old code's `pdlFallback('no-apollo-key')` and its non-OK and
    // catch branches each handed a client preview to PDL. There is nowhere to fall back to.
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, text: async () => 'boom', json: async () => ({}) }) as never))

    const { previewCount } = await import('./apollo')
    for (const audience of ['client', 'house'] as const) {
      const out = await previewCount({
        job_titles: ['CEO'], seniority_levels: [], company_sizes: [], geographies: [],
        industries: [], tech_stack: [], keywords: [], apollo_only_consented: false,
      } as never, audience).catch(() => null)
      // A failed preview reports zero or an error — it never reports PDL's count as ours.
      expect(out?.count ?? 0).not.toBe(42)
    }
    expect(pdl.diagnostic, 'the preview reached PDL').toBe(0)
  })

  it('the enrichment waterfall never calls Hunter, PDL or Clearbit', async () => {
    const urls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: unknown) => {
      urls.push(String(url))
      return { ok: true, status: 200, json: async () => ({}) } as never
    }))
    const { waterfallEnrich } = await import('./enrichment')
    await waterfallEnrich({ firstName: 'A', lastName: 'B', domain: 'example.com' } as never).catch(() => null)
    for (const u of urls) {
      expect(u, `the waterfall called ${u}`).not.toContain('hunter.io')
      expect(u, `the waterfall called ${u}`).not.toContain('peopledatalabs')
      expect(u, `the waterfall called ${u}`).not.toContain('clearbit')
    }
  })
})

// ── ③ THE PROVIDER SOURCE FILES NAME THE REAL PROVIDER ──────────────────────────

describe('XC-13 · the operator-facing copy names Apollo, not PDL', () => {
  const read = (p: string) => require('fs').readFileSync(require('path').join(__dirname, p), 'utf8')

  it('startup-check no longer grades PDL or Hunter as capabilities', () => {
    const src = read('startup-check.ts')
    // Their absence must not be reported as a missing capability: they are not providers of
    // ours any more, and a red line for an intentional absence trains people to ignore it.
    expect(src).not.toMatch(/capability\([^)]*PDL_API_KEY/)
    expect(src).not.toMatch(/capability\([^)]*HUNTER_API_KEY/)
    expect(src, 'Apollo must be the named lead engine').toMatch(/APOLLO_API_KEY/)
  })

  it('the system probes measure Apollo, not a PDL tier', () => {
    const src = read('system-probes.ts')
    // ⚠️ BOUND TO PROBE LABELS, NOT TO ANY MENTION. This repo REQUIRES the historical note
    // to stay in the file — a retired row explained is how the next reader learns why it
    // went. So the assertion is about what the page RENDERS: the `probe('<label>', …)`
    // arguments, which are the row titles an operator reads.
    const labels = [...src.matchAll(/probe\('([^']+)'/g)].map(m => m[1])
    expect(labels.length, 'no probe labels found — fix the matcher').toBeGreaterThan(10)
    for (const l of labels) {
      expect(l, `a probe row still measures PDL: "${l}"`).not.toMatch(/^PDL \(sourcing\)$|^PDL tier/)
    }
    expect(labels.some(l => /^Apollo \(the only lead source\)$/.test(l)), 'Apollo must be probed as THE lead source').toBe(true)
    expect(labels.some(l => /^Apollo credits/.test(l)), 'the credit balance must be a row').toBe(true)
    // Hunter's row must present its ABSENCE as correct. The old row graded the unset key as
    // NOT-MEASURED and offered "Optional, but it lowers the dead-email rate" as the action —
    // a System page recommending that somebody undo a founder lock.
    expect(labels.some(l => /^Hunter \(retired\)$/.test(l)), 'Hunter must be shown as retired').toBe(true)
    expect(src).toMatch(/HUNTER_API_KEY is unset, which is the CORRECT state/)
  })

  it('the provider boundary states FD-6 in the file that enforces it', () => {
    const src = read('provider-boundary.ts')
    expect(src).toContain('FD-6')
    expect(src).toMatch(/We are not paying for PDL/)
  })
})

// ── ④ R143 · THE PDL SEARCH MODULE ITSELF REFUSES, WITH THE KEY SET ──────────────
//
// R143 (23 Sep, founder): "Apollo is it for now. we will add once we get one provider right."
//
// ② proves the SOURCING paths do not call `pdl-search`. It does so by mocking the module,
// which is exactly why it could not see the two callers that were left: the client ICP
// preview's samples (`routes/icps.ts`) and the admin `/engine/leads/test` diagnostic. Both
// still called `pdlSearchPeople` / `pdlSearchDiagnostic`, and those gated on nothing but
// `process.env.PDL_API_KEY` — so the retirement held only while Railway had no key.
//
// These cases use the REAL module with the key PRESENT and a spy on `fetch`. The only
// assertion that matters is that no request leaves for peopledatalabs.com.
describe('R143 · with PDL_API_KEY SET, the PDL search module never leaves the building', () => {
  const saved = { ...process.env }
  let urls: string[]

  const ICP = {
    job_titles: ['CEO'], seniority_levels: ['C-Suite'], company_sizes: ['11–50'],
    geographies: ['United Kingdom'], industries: ['software'], tech_stack: [],
    keywords: [], apollo_only_consented: false, intent_signals: [],
  }

  const pdlUrls = () => urls.filter(u => u.includes('peopledatalabs'))

  beforeEach(() => {
    // ② mocks `./pdl-search` with `vi.doMock`, which outlives its describe. Unmock it, or
    // these cases would exercise ②'s stub and prove nothing about the real module.
    vi.doUnmock('./pdl-search')
    vi.resetModules()
    process.env.PDL_API_KEY = 'pdl-key-present'
    process.env.APOLLO_API_KEY = 'apollo-key-present'
    process.env.PAID_PROVIDERS_ENABLED = 'true'
    // `middleware/auth.ts` builds a supabase client at module scope; dummies, never called.
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'
    process.env.ANTHROPIC_API_KEY = 'test-key'
    process.env.ADMIN_SECRET_KEY = 'admin-secret'
    urls = []
    // A PDL-shaped success: if the fence is missing, the search "works" and says so.
    vi.stubGlobal('fetch', vi.fn(async (url: unknown) => {
      urls.push(String(url))
      return {
        ok: true, status: 200,
        text: async () => '',
        json: async () => ({
          total: 1, scroll_token: null, people: [], pagination: { total_entries: 0 },
          data: [{ first_name: 'Ada', last_name: 'L', job_title: 'CEO', work_email: 'ada@example.com' }],
        }),
      } as never
    }))
  })

  afterEach(() => {
    process.env = { ...saved }
    vi.doUnmock('./provider-boundary')
    vi.resetModules()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  function mockRes() {
    const r: Record<string, unknown> = { code: 200 }
    r.status = (c: number) => { r.code = c; return r }
    r.json   = (b: unknown) => { r.body = b; return r }
    return r as { code: number; body?: Record<string, unknown> }
  }

  function lastHandler(router: unknown, method: string, path: string) {
    const stack = (router as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> } }> }).stack
    const layer = stack.find(l => l.route?.path === path && l.route.methods[method])
    if (!layer?.route) throw new Error(`no ${method.toUpperCase()} route at ${path}`)
    return layer.route.stack[layer.route.stack.length - 1].handle as (req: unknown, res: unknown) => Promise<void>
  }

  it('pdlSearchPage does not call fetch and returns the not-asked shape', async () => {
    const { pdlSearchPage } = await import('./pdl-search')
    const page = await pdlSearchPage(ICP as never, 20, 'resume-token')
    expect(pdlUrls(), 'pdlSearchPage called PDL with the key set').toEqual([])
    // NOT exhausted and NOT matchedNothing: we never asked, so nothing may be claimed about
    // the audience. `completed: false` is what stops an empty page reading as "no matches".
    expect(page).toEqual({ contacts: [], scrollToken: 'resume-token', exhausted: false, matchedNothing: false, error: null, completed: false })
  })

  it('pdlSearchPeople and pdlSearchDiagnostic do not call fetch', async () => {
    const { pdlSearchPeople, pdlSearchDiagnostic } = await import('./pdl-search')
    expect(await pdlSearchPeople(ICP as never, 3)).toEqual([])
    const diag = await pdlSearchDiagnostic(ICP as never)
    expect(pdlUrls(), 'a PDL diagnostic/search called PDL with the key set').toEqual([])
    expect(diag.configured).toBe(false)
    expect(diag.count).toBe(0)
    expect(String(diag.error)).toMatch(/retired/i)
  })

  it('the CLIENT ICP preview samples never reach PDL', async () => {
    vi.doMock('./provider-boundary', async () => {
      const real = await vi.importActual<typeof import('./provider-boundary')>('./provider-boundary')
      return { ...real, audienceForUser: async () => 'client' as const }
    })
    const { icpRouter } = await import('../routes/icps')
    const handler = lastHandler(icpRouter, 'post', '/preview-count')
    const res = mockRes()
    await handler({ body: { job_titles: ['R143-client-preview'], geographies: ['United Kingdom'] }, userId: 'u1', headers: {} }, res)
    expect(res.body?.success, 'the preview handler did not complete').toBe(true)
    expect(pdlUrls(), 'the client preview sampled from PDL').toEqual([])
  })

  it('/engine/leads/test never reaches PDL', async () => {
    const { engineRouter } = await import('../routes/engine')
    const handler = lastHandler(engineRouter, 'get', '/leads/test')
    const res = mockRes()
    await handler({ query: {}, headers: { 'x-admin-key': 'admin-secret' } }, res)
    expect(res.code).toBe(200)
    expect(pdlUrls(), '/engine/leads/test called PDL').toEqual([])
    const body = res.body as { sources: { pdl: boolean }; pdl: { count: number } }
    expect(body.sources.pdl, 'PDL must not be reported as an available source').toBe(false)
    expect(body.pdl.count).toBe(0)
  })
})
