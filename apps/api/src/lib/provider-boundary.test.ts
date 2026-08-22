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
  searchProviderFor, revealProviderFor, companyNameSearchAllowed,
  COMPANY_SEARCH_UNAVAILABLE, type Audience,
} from './provider-boundary'

// ── The pure decision — the whole boundary in four assertions ────────────────
describe('AR5 — the provider decision is pure and audience-driven', () => {
  it('house searches Apollo; client searches PDL', () => {
    expect(searchProviderFor('house')).toBe('apollo')
    expect(searchProviderFor('client')).toBe('pdl')
  })

  it('house reveals via Apollo; client reveals via Hunter', () => {
    expect(revealProviderFor('house')).toBe('apollo')
    expect(revealProviderFor('client')).toBe('hunter')
  })

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
      expect(searchProviderFor('client')).toBe('pdl')
      expect(searchProviderFor('house')).toBe('apollo')
    } finally {
      process.env.APOLLO_API_KEY = prevA
      process.env.PDL_API_KEY = prevP
    }
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

  it('CLIENT audience never calls Apollo — even with APOLLO_API_KEY set', async () => {
    const { searchPeopleWithFallback } = await import('./apollo')
    await searchPeopleWithFallback(ICP, 1, 5, null, 'client' as Audience)
    expect(hostsCalled()).not.toContain('apollo')
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

  it('CLIENT preview never hits Apollo', async () => {
    const { previewCount } = await import('./apollo')
    await previewCount(ICP, 'client')
    const urls = fetchSpy.mock.calls.map(c => String(c[0]))
    expect(urls.some(u => u.includes('apollo.io'))).toBe(false)
  })
})
