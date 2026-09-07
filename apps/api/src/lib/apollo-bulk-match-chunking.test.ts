// ═══════════════════════════════════════════════════════════════════════════════════════
// APOLLO BULK MATCH — TEN PEOPLE PER REQUEST, AND ALL 250 GET ASKED ABOUT (7 Sep).
//
// Apollo's `people/bulk_match` accepts at most 10 people per call. The People Search fix
// (#1649) made a 250-record HOUSE batch reachable for the first time, which means the reveal
// step behind it now receives candidate sets far larger than anything it has been handed
// before. This file exists to prove — not assume — that the chunking already in
// `bulkMatchEmails` holds at that volume:
//
//   · no request ever carries more than 10 people
//   · every candidate is asked about exactly once — chunking drops nobody
//   · the money-safety flags are on every request, not just the first
//
// ⚠️ WHY IT IS WORTH A TEST EVEN THOUGH THE CHUNKING IS ALREADY THERE. `for (i += 10)` is
// four characters away from `i += 100`, nothing anywhere asserted the boundary, and the cost
// of getting it wrong is a 422 on a PAID endpoint mid-batch — with the earlier chunks already
// charged. The search 422 reached production precisely because no test asserted a limit.
//
// Mocks only — `fetch` is stubbed, no network, no provider, no spend, NO SOURCING.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ⚠️ HOISTED. `apollo` reaches `provider-boundary`, which imports `@kind/db` and throws at
// module scope without these. Nothing here reaches a network.
vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})

import { bulkMatchEmails } from './apollo'

/** Apollo's documented maximum for `people/bulk_match`. */
const APOLLO_BULK_MATCH_MAX = 10

type Sent = { url: string; body: Record<string, unknown> }
let sent: Sent[] = []

/** The request's QUERY STRING, where Apollo reads the four safety controls from. */
const qs = (s: Sent) => new URL(s.url).searchParams

/** 250 genuine Apollo ids — no `pdl_` prefix, so AR5 lets every one through. */
const ids250 = Array.from({ length: 250 }, (_, i) => `apollo-person-${i}`)

function stubApollo(opts?: { failChunk?: number }) {
  sent = []
  vi.stubGlobal('fetch', async (url: string, init: { body: string }) => {
    const body = JSON.parse(init.body) as Record<string, unknown>
    sent.push({ url: String(url), body })
    if (opts?.failChunk !== undefined && sent.length - 1 === opts.failChunk) {
      return { ok: false, status: 422, text: async () => 'deliberate chunk failure', json: async () => ({}) }
    }
    const details = (body.details ?? []) as { id: string }[]
    return {
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({ matches: details.map(d => ({ id: d.id, email: `${d.id}@co.test` })) }),
    }
  })
}

beforeEach(() => { process.env.APOLLO_API_KEY = 'test-key-not-real' })
afterEach(() => { delete process.env.APOLLO_API_KEY; vi.unstubAllGlobals(); sent = [] })

describe('bulk_match is chunked to Apollo\'s limit, and nobody is dropped', () => {
  it('🛑 250 candidates → no request carries more than 10 people', async () => {
    stubApollo()
    await bulkMatchEmails(ids250)
    expect(sent.length, 'no bulk_match request was made at all').toBeGreaterThan(0)
    for (const s of sent) {
      const details = (s.body.details ?? []) as unknown[]
      expect(details.length, `a bulk_match request carried ${details.length} people — Apollo accepts ${APOLLO_BULK_MATCH_MAX}`)
        .toBeLessThanOrEqual(APOLLO_BULK_MATCH_MAX)
    }
  })

  it('🛑 250 candidates → exactly 25 requests, and every candidate is asked about ONCE', async () => {
    stubApollo()
    await bulkMatchEmails(ids250)
    expect(sent).toHaveLength(Math.ceil(250 / APOLLO_BULK_MATCH_MAX))

    const asked = sent.flatMap(s => ((s.body.details ?? []) as { id: string }[]).map(d => d.id))
    expect(asked, 'a candidate was silently dropped by chunking').toHaveLength(250)
    expect(new Set(asked).size, 'a candidate was asked about twice').toBe(250)
    expect(asked.sort()).toEqual([...ids250].sort())
  })

  it('every revealed email comes back — the map covers the whole candidate set', async () => {
    stubApollo()
    const out = await bulkMatchEmails(ids250)
    expect(out.size).toBe(250)
  })

  it('it is the documented bulk_match endpoint on every chunk', async () => {
    stubApollo()
    await bulkMatchEmails(ids250)
    for (const s of sent) {
      const u = new URL(s.url)
      expect(`${u.origin}${u.pathname}`).toBe('https://api.apollo.io/api/v1/people/bulk_match')
    }
  })

  it('a chunk that FAILS costs only its own ten — the walk continues', async () => {
    // Not a silent drop: the failure is logged, the other 24 chunks still reveal. The ten in
    // the failed chunk simply have no email and fall through to the ordinary unenriched path.
    stubApollo({ failChunk: 3 })
    const out = await bulkMatchEmails(ids250)
    expect(sent).toHaveLength(25)
    expect(out.size).toBe(240)
  })

  it('a set smaller than one chunk is a single request', async () => {
    stubApollo()
    await bulkMatchEmails(ids250.slice(0, 7))
    expect(sent).toHaveLength(1)
    expect(((sent[0].body.details ?? []) as unknown[]).length).toBe(7)
  })

  it('exactly 10 is one request, and 11 is two — the boundary itself', async () => {
    stubApollo()
    await bulkMatchEmails(ids250.slice(0, 10))
    expect(sent).toHaveLength(1)
    sent = []
    await bulkMatchEmails(ids250.slice(0, 11))
    expect(sent).toHaveLength(2)
  })
})

describe('the money-safety flags are on EVERY chunk, not just the first', () => {
  it('🛑 all four are on the QUERY STRING — that is where Apollo reads them', async () => {
    // ⛓️ CORRECTED 7 Sep. They were put in the JSON BODY, which Apollo's bulk_match does not
    // read them from: its documented contract is `reveal_personal_emails`,
    // `reveal_phone_number`, `run_waterfall_email` and `run_waterfall_phone` as QUERY
    // parameters, with the body carrying `details` alone
    // (docs.apollo.io/reference/bulk-people-enrichment).
    //
    // So the previous fix looked explicit and was still, in fact, relying on Apollo's
    // defaults — a flag in the wrong place is not a flag, it is a comment the server ignores.
    stubApollo()
    await bulkMatchEmails(ids250)
    expect(sent).toHaveLength(25)
    for (const s of sent) {
      const q = qs(s)
      expect(q.get('reveal_personal_emails'), 'personal-email reveal is not on the query string').toBe('false')
      expect(q.get('reveal_phone_number'),    'phone reveal is not on the query string').toBe('false')
      expect(q.get('run_waterfall_email'),    'the email waterfall is not on the query string').toBe('false')
      expect(q.get('run_waterfall_phone'),    'the phone waterfall is not on the query string').toBe('false')
    }
  })

  it('and the BODY carries only `details` — the flags are not smuggled back into it', async () => {
    // A flag present in both places would pass the query assertion while quietly re-teaching
    // the next reader that the body is where these live. One home, and it is the query.
    stubApollo()
    await bulkMatchEmails(ids250.slice(0, 5))
    expect(Object.keys(sent[0].body)).toEqual(['details'])
  })

  it('the four are PRESENT as query keys, not merely absent-and-assumed', async () => {
    stubApollo()
    await bulkMatchEmails(ids250.slice(0, 5))
    const keys = [...qs(sent[0]).keys()]
    for (const flag of ['reveal_personal_emails', 'reveal_phone_number', 'run_waterfall_email', 'run_waterfall_phone']) {
      expect(keys, `${flag} is not sent at all — its value is Apollo's to choose`).toContain(flag)
    }
  })

  it('DELETED — superseded by the query-string assertions above', async () => {
    // ⛓️ TIGHTENED 7 Sep. This first asserted only `not.toBe(true)`, which an OMITTED field
    // satisfies — and three of the four WERE omitted, so the phone-waterfall lock rested on
    // Apollo's default rather than on our request. Scout's proven-good call set all four
    // explicitly, and the handover says in terms: **do not rely purely on provider defaults.**
    //
    // A default is a vendor's decision we do not control and are not told when they change.
    // `undefined` now fails exactly as `true` does.
    stubApollo()
    await bulkMatchEmails(ids250.slice(0, 1))
    expect(sent).toHaveLength(1)
  })

  it('AR5 still holds at volume — a PDL id in the set is refused, not sent to Apollo', async () => {
    stubApollo()
    const mixed = [...ids250.slice(0, 20), 'pdl_not_ours_1', 'pdl_not_ours_2']
    await bulkMatchEmails(mixed)
    const asked = sent.flatMap(s => ((s.body.details ?? []) as { id: string }[]).map(d => d.id))
    expect(asked).toHaveLength(20)
    expect(asked.some(id => id.startsWith('pdl_')), 'a client PDL id was sent to our Apollo account').toBe(false)
  })
})
