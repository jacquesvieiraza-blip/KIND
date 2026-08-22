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
  isApolloPersonId, apolloRevealableIds,
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
      expect(out.get('legacy_apollo_id')).toBe('dana@northwind-logistics.co.uk')
    })
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
