// ═══════════════════════════════════════════════════════════════════════════════════════
// APOLLO PEOPLE SEARCH — 100 PER PAGE, SO 250 IS THREE PAGES (founder-locked 7 Sep).
//
// 🛑 THE PRODUCTION FAILURE. The first authenticated HOUSE-008 run returned:
//
//   Apollo API 422: {"error":"Per page not supported","error_details":{
//     "code":"SEARCH_VALIDATION_SEARCH_PARAMS_INVALID", …}}
//
// `searchPeopleWithFallback` asks Apollo for the WHOLE authorised batch in one request:
//
//     const sized = (b) => { b.per_page = size; return b }     // size = 250
//
// Apollo's People Search caps `per_page` at **100** and `page` at **500**
// (docs.apollo.io/reference/people-api-search — "100 records per page, up to 500 pages").
// 250 is out of range, and Apollo's terse "Per page not supported" is its rejection of the
// VALUE, not of the parameter. `per_page` itself is supported and documented.
//
// ⚠️ WHY "JUST DELETE `per_page`" WOULD HAVE BEEN A WORSE BUG THAN THE 422.
// Dropping it leaves Apollo's default page size and ONE request, so an authorised batch of
// 250 would come back as at most 100 — and the run would report success. A 422 is loud; a
// batch that quietly delivers 40% of what a programme authorised is the kind of wrong that
// gets discovered a month later in an attribution review. **The size limit is per PAGE, so
// the fix is to turn one oversized request into the right number of legal ones.**
//
// ⚠️ AND THIS IS NOT A CONTRADICTION OF THE SCOUT PROOF. Scout proved Apollo Basic serves
// `people/bulk_match` (the paid reveal) with this account. That endpoint is untouched here.
// This is `mixed_people/api_search` — the free search step — and the defect is a request
// shape of ours, not an entitlement of Apollo's.
//
// RED PROOF — before the fix:
//   · a 250-record house search sends `per_page: 250`      → the exact 422 above
//   · only ONE page is ever requested                       → 250 can never be fulfilled
//
// Mocks only — `fetch` is stubbed, no network, no provider, no spend, NO SOURCING.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ⚠️ HOISTED. `provider-boundary` imports `@kind/db`, which throws at module scope without
// these — and a static import runs before any `beforeEach`. Nothing here reaches a network:
// the URL is a localhost placeholder and `fetch` is stubbed in every test.
vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})

import { buildSearchBody, searchPeople, searchPeopleWithFallback, APOLLO_MAX_PER_PAGE } from './apollo'
import { searchProviderFor } from './provider-boundary'

const ICP = {
  job_titles: ['Founder', 'CEO'],
  seniority_levels: ['C-Suite'],
  industries: ['B2B services'],
  company_sizes: ['11-50'],
  geographies: ['United Kingdom', 'United States'],
  tech_stack: [],
  keywords: [],
  apollo_only_consented: true,
}

type Sent = { url: string; body: Record<string, unknown> }
let sent: Sent[] = []

/** A stubbed Apollo that hands back `n` people per page, so paging is observable. */
function stubApollo(peoplePerPage: (page: number, perPage: number) => number) {
  sent = []
  vi.stubGlobal('fetch', async (url: string, init: { body: string }) => {
    const body = JSON.parse(init.body) as Record<string, unknown>
    sent.push({ url: String(url), body })
    const perPage = Number(body.per_page ?? 0)
    const n = peoplePerPage(Number(body.page ?? 1), perPage)
    return {
      ok: true,
      status: 200,
      json: async () => ({
        people: Array.from({ length: n }, (_, i) => ({
          id: `p${body.page}-${i}`,
          first_name: 'A', last_name: 'B',
          email: `a${body.page}-${i}@co.test`,
          email_status: 'verified',
        })),
      }),
      text: async () => '',
    }
  })
}

beforeEach(() => { process.env.APOLLO_API_KEY = 'test-key-not-real' })
afterEach(() => { delete process.env.APOLLO_API_KEY; vi.unstubAllGlobals(); sent = [] })

// ── ① THE PARAMETER CONTRACT ──────────────────────────────────────────────────────────

describe('① Apollo People Search accepts per_page, up to 100', () => {
  it('the documented maximum is declared in code, not remembered', () => {
    expect(APOLLO_MAX_PER_PAGE).toBe(100)
  })

  it('🛑 no request ever leaves with per_page above the maximum — the exact 422 cause', async () => {
    stubApollo(() => 100)
    // Handed a deliberately illegal body, the one function that talks to the endpoint must
    // still not send it. This is the belt: no future caller can reintroduce the 422.
    await searchPeople({ ...buildSearchBody(ICP, 1), per_page: 250 })
    expect(sent).toHaveLength(1)
    expect(sent[0].body.per_page).toBeLessThanOrEqual(APOLLO_MAX_PER_PAGE)
  })

  it('the default body is already legal', () => {
    expect(Number(buildSearchBody(ICP, 1).per_page)).toBeLessThanOrEqual(APOLLO_MAX_PER_PAGE)
    expect(Number(buildSearchBody(ICP, 1).per_page)).toBeGreaterThan(0)
  })

  it('no UNSUPPORTED pagination parameter is invented — page/per_page only', async () => {
    stubApollo(() => 100)
    await searchPeople(buildSearchBody(ICP, 1))
    for (const banned of ['limit', 'offset', 'page_size', 'perPage', 'size', 'count', 'max_results']) {
      expect(Object.keys(sent[0].body), `an unsupported pagination parameter is being sent: ${banned}`)
        .not.toContain(banned)
    }
    expect(Object.keys(sent[0].body)).toContain('page')
    expect(Object.keys(sent[0].body)).toContain('per_page')
  })

  it('it is still the documented public search endpoint', async () => {
    stubApollo(() => 1)
    await searchPeople(buildSearchBody(ICP, 1))
    expect(sent[0].url).toBe('https://api.apollo.io/api/v1/mixed_people/api_search')
  })
})

// ── ② A 250 BATCH IS ACTUALLY DELIVERED, NOT QUIETLY CAPPED ───────────────────────────

describe('② an authorised batch of 250 is fulfilled across pages', () => {
  it('🛑 250 requested → 250 returned, and every request is within Apollo\'s limits', async () => {
    stubApollo((_page, perPage) => perPage)              // an abundant audience
    const r = await searchPeopleWithFallback(ICP, 1, 250, null, 'house')

    expect(r.contacts.length, 'the authorised batch was silently capped below 250').toBe(250)
    expect(sent.length, 'a 250 batch cannot be one request — Apollo caps a page at 100')
      .toBeGreaterThanOrEqual(3)
    for (const s of sent) {
      expect(Number(s.body.per_page)).toBeLessThanOrEqual(APOLLO_MAX_PER_PAGE)
      expect(Number(s.body.page)).toBeGreaterThanOrEqual(1)
    }
  })

  it('the pages are consecutive — no page is skipped or re-fetched', async () => {
    stubApollo((_page, perPage) => perPage)
    await searchPeopleWithFallback(ICP, 1, 250, null, 'house')
    const pages = sent.map(s => Number(s.body.page))
    expect(pages.slice(0, 3)).toEqual([1, 2, 3])
    expect(new Set(pages).size, 'the same page was requested twice').toBe(pages.length)
  })

  it('a small batch still takes exactly one request — paging is not busywork', async () => {
    stubApollo((_page, perPage) => perPage)
    const r = await searchPeopleWithFallback(ICP, 1, 20, null, 'house')
    expect(r.contacts).toHaveLength(20)
    expect(sent).toHaveLength(1)
    expect(sent[0].body.per_page).toBe(20)
  })

  it('a SHORT page ends the walk — an exhausted audience is not an infinite loop', async () => {
    // Apollo returning fewer than asked means there is no more. Asking again would be a
    // second identical request for an answer we already have.
    stubApollo((page, perPage) => (page === 1 ? perPage : 12))
    const r = await searchPeopleWithFallback(ICP, 1, 250, null, 'house')
    expect(r.contacts).toHaveLength(112)
    expect(sent).toHaveLength(2)
  })

  it('an audience that runs out on page one returns honestly, not zero-padded', async () => {
    stubApollo(() => 7)
    const r = await searchPeopleWithFallback(ICP, 1, 250, null, 'house')
    expect(r.contacts).toHaveLength(7)
    expect(sent).toHaveLength(1)
  })

  it('never over-delivers — a batch is a ceiling as well as a target', async () => {
    stubApollo((_page, perPage) => perPage)
    const r = await searchPeopleWithFallback(ICP, 1, 150, null, 'house')
    expect(r.contacts.length).toBeLessThanOrEqual(150)
    expect(r.contacts).toHaveLength(150)
  })
})

// ── ③ EVERY EXISTING HOUSE LOCK SURVIVES THIS FIX ─────────────────────────────────────

describe('③ the House locks are untouched', () => {
  it('House still routes to Apollo, and a client still routes to PDL', () => {
    expect(searchProviderFor('house')).toBe('apollo')
    expect(searchProviderFor('client')).toBe('pdl')
  })

  it('verified-only is still asked for on every House page, not just the first', async () => {
    stubApollo((_page, perPage) => perPage)
    await searchPeopleWithFallback(ICP, 1, 250, null, 'house')
    expect(sent.length).toBeGreaterThanOrEqual(3)
    for (const s of sent) {
      expect(s.body.contact_email_status, 'a later page dropped the verified-only filter')
        .toEqual(['verified'])
    }
  })

  it('a non-House caller keeps both statuses — this fix changed nobody else\'s query', () => {
    expect(buildSearchBody(ICP, 1).contact_email_status).toEqual(['verified', 'likely_to_engage'])
  })

  it('the House search reaches Apollo only — PDL is never called on this path', async () => {
    stubApollo((_page, perPage) => perPage)
    await searchPeopleWithFallback(ICP, 1, 250, null, 'house')
    for (const s of sent) {
      expect(s.url, 'the House search reached a non-Apollo host').toContain('api.apollo.io')
    }
  })
})
