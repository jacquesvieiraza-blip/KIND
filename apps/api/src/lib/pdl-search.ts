// ─────────────────────────────────────────────────────────────────────────────
// SECOND DISCOVERY SOURCE — People Data Labs (PDL) Person Search
//
// The "eggs in one basket" hedge. Lead DISCOVERY is otherwise Apollo-only — if
// Apollo's key dies, lead-gen stops for every client at once. This adds PDL as a
// fallback discovery source behind `searchPeopleWithFallback` in lib/apollo.ts.
//
// DORMANT BY DEFAULT: with no `PDL_API_KEY` set, `pdlSearchPeople` returns [] and
// nothing changes. Drop a (free-tier) PDL key into the API env to activate it.
//
// PDL's search returns a real `work_email` directly (unlike Apollo, whose search
// masks it and needs a paid bulk_match reveal) — so PDL-sourced leads carry their
// email through and skip the Apollo reveal step downstream. Results are normalised
// into the shared `ApolloContact` shape so the rest of the pipeline is unchanged.
//
// Vocab mapping tuned against live responses on the first funded run (10 Jul) —
// see PDL_INDUSTRY_MAP below. Ref: https://docs.peopledatalabs.com/docs/person-search-api
// ─────────────────────────────────────────────────────────────────────────────
import type { ApolloContact } from './apollo'
import { sendFounderAlert } from './alerts'
// The SAME alias knowledge the launch send fence uses — imported, never re-declared here.
import { canonicalLaunchCountry } from '@kind/shared'

const PDL_SEARCH_URL = 'https://api.peopledatalabs.com/v5/person/search'

// ICP company-size label → PDL `job_company_size` bucket(s).
//
// ⚑ 24 Aug — `'1,000+'` MAPPED TO `'1001-5000'` AND STOPPED THERE. The K.I.N.D band is
// unbounded above; PDL's bucket is not. So every company over 5,000 employees was silently
// excluded from the one band a client picks precisely BECAUSE they want enterprise — and
// nothing said so. The repo's own Apollo map already got this right (`apollo.ts:50`:
// `'1,000+': '1001,1000000'`), so the two providers disagreed about the same product label.
//
// ⚠️ THE VALUE TYPE IS NOW AN ARRAY, and that is the smallest change that fixes it: the
// clause is already `terms`, which is OR, so a band that means "1,000 and up" simply names
// every bucket at or above 1,000. Every OTHER band keeps exactly one bucket — this widens
// one label, not the search. There is no second size table; this IS the table.
const PDL_SIZE_MAP: Record<string, readonly string[]> = {
  '1–10': ['1-10'], '11–50': ['11-50'], '51–200': ['51-200'],
  '201–500': ['201-500'], '501–1,000': ['501-1000'],
  '1,000+': ['1001-5000', '5001-10000', '10001+'],
}

// ICP industry label → PDL `job_company_industry` vocab (the LinkedIn industry
// taxonomy, lowercase). The portal's 18 checkbox labels ('SaaS', 'Fintech'…) are
// NOT PDL values — sent raw they exact-match nothing, so any ticked industry used
// to hard-zero the whole query (first live run, 10 Jul: every search with an
// industry returned 404 no-records). `terms` is OR semantics, so mapping a label
// to several candidate values is safe — extra values that match nobody just
// don't match; they can't narrow the result.
const PDL_INDUSTRY_MAP: Record<string, string[]> = {
  'Fintech':          ['financial services'],
  'Healthtech':       ['hospital & health care', 'medical devices', 'health, wellness and fitness'],
  'E-commerce':       ['internet', 'retail'],
  'SaaS':             ['computer software', 'information technology and services', 'internet'],
  'Logistics':        ['logistics and supply chain', 'transportation/trucking/railroad', 'package/freight delivery'],
  'Agriculture':      ['farming', 'dairy', 'ranching'],
  'Education':        ['education management', 'higher education', 'e-learning', 'primary/secondary education'],
  'Manufacturing':    ['machinery', 'mechanical or industrial engineering', 'electrical/electronic manufacturing', 'industrial automation'],
  'Real Estate':      ['real estate', 'commercial real estate'],
  'Media':            ['media production', 'online media', 'broadcast media', 'publishing', 'marketing and advertising'],
  'Consulting':       ['management consulting'],
  'Retail':           ['retail'],
  'Banking':          ['banking', 'financial services'],
  'Insurance':        ['insurance'],
  'Telecoms':         ['telecommunications'],
  'Energy':           ['oil & energy', 'renewables & environment', 'utilities'],
  'NGO / Non-profit': ['non-profit organization management', 'nonprofit organization management', 'civic & social organization'],
  'Government':       ['government administration', 'government relations'],
}

// ICP seniority label → PDL `job_title_levels` vocab.
const PDL_LEVEL_MAP: Record<string, string[]> = {
  'C-Suite':                ['cxo', 'owner'],
  'VP / Director':          ['vp', 'director'],
  // ⚑ 24 Aug (founder-ruled) — WAS `['director']`, and that was narrower than the words.
  // "Head of" is a TITLE CONVENTION, not a level: PDL levels a real Head of Operations as
  // `manager`, `director` or `vp` depending on company size and reporting line — a Head of X
  // at a 40-person firm often levels `manager`, at a 2,000-person firm often `vp`. Pinning
  // one value excluded the other two, and because seniority AND-s with the title clause,
  // every excluded level was a HARD exclusion. `terms` is OR and overlapping the neighbouring
  // labels costs nothing (see the industry-map note above), so all three are named.
  'Head of':                ['manager', 'director', 'vp'],
  'Manager':                ['manager'],
  'Senior':                 ['senior'],
  'Individual Contributor': ['entry'],
}

interface PdlPerson {
  id?: string | null
  first_name?: string | null
  last_name?: string | null
  job_title?: string | null
  job_title_levels?: string[] | null
  job_company_name?: string | null
  job_company_industry?: string | null
  job_company_size?: string | null
  location_country?: string | null
  linkedin_url?: string | null
  work_email?: string | null
  emails?: Array<{ address?: string | null }> | null
  skills?: string[] | null
}

type IcpQuery = {
  job_titles:       string[]
  seniority_levels: string[]
  company_sizes:    string[]
  geographies:      string[]
  industries:       string[]
}

/** Exported for the mapping guards ONLY — nothing else calls it from outside this file.
 *  A targeting map that is asserted by reading source strings proves the map was TYPED;
 *  executing the builder proves the query a client's words actually produce. */
export function buildPdlBody(icp: IcpQuery, size: number, scrollToken?: string | null) {
  const must: unknown[] = []
  if (icp.job_titles.length) {
    must.push({ bool: { should: icp.job_titles.map(t => ({ match: { job_title: t } })) } })
  }
  const levels = icp.seniority_levels.flatMap(s => PDL_LEVEL_MAP[s] ?? [])
  if (levels.length) must.push({ terms: { job_title_levels: levels } })
  if (icp.industries.length) {
    // Map labels → PDL vocab; keep the raw lowercase alongside for any label that
    // already IS a PDL value. If nothing maps at all, drop the filter entirely —
    // a broader search beats a guaranteed zero.
    const industryTerms = [...new Set(icp.industries.flatMap(i => [
      ...(PDL_INDUSTRY_MAP[i] ?? []),
      i.toLowerCase(),
    ]))]
    if (industryTerms.length) must.push({ terms: { job_company_industry: industryTerms } })
  }
  if (icp.geographies.length) {
    // ⚑ 24 Aug — WAS `g.toLowerCase()` AND THAT WAS A LATENT HARD-ZERO. PDL indexes
    // `location_country` as a canonical full name in lowercase, so a client who typed "US"
    // produced `terms: { location_country: ['us'] }` — a clause matching nobody. Sitting in
    // `bool.must`, it took the ENTIRE query to zero, silently, and the client read that as
    // "K.I.N.D found nobody in my market".
    //
    // Canonicalised through the launch-country alias table that already existed for the send
    // fence — ONE alias source, restructured so both read it. An unrecognised term still
    // lowercases and passes through exactly as before: dropping it would quietly widen the
    // client's targeting from one country to the world, which is worse than not matching.
    const countries = [...new Set(icp.geographies.map(g => canonicalLaunchCountry(g)).filter(Boolean))]
    if (countries.length) must.push({ terms: { location_country: countries } })
  }
  // `flatMap`, because one K.I.N.D band may legitimately mean several PDL buckets ('1,000+').
  const sizes = [...new Set(icp.company_sizes.flatMap(s => PDL_SIZE_MAP[s] ?? []))]
  if (sizes.length) must.push({ terms: { job_company_size: sizes } })
  // Only return people we can actually email.
  must.push({ exists: { field: 'work_email' } })
  // PAGINATION IS `scroll_token`, NOT `from` (#366).
  //
  // PDL deprecated `from`-based paging — sending it 400s the whole request, which is why
  // this was page-1-only. The response carries a `scroll_token`; passing it back returns the
  // NEXT batch. A null token, or a 404, means there is nothing after this page.
  //
  // Why it mattered: every run returned the same page 1, we deduped against the emails the
  // client already held, and the run therefore produced **zero, silently**. A client's second
  // month found nobody new — and the cashflow says the repeat IS the business.
  return { query: { bool: { must } }, size, ...(scrollToken ? { scroll_token: scrollToken } : {}) }
}

/**
 * DIAGNOSTIC ONLY (item 244 test) — runs the same PDL search but SURFACES the
 * outcome instead of swallowing it: HTTP status, PDL's error text, and the match
 * count. Lets the read-only /engine/leads/test endpoint report "works / no-data /
 * errored (reason)" instead of an ambiguous 0. Never throws.
 */
export async function pdlSearchDiagnostic(
  icp: IcpQuery,
): Promise<{ configured: boolean; ok: boolean; status: number | null; count: number; error: string | null; rawFirst?: unknown }> {
  const key = process.env.PDL_API_KEY
  if (!key) return { configured: false, ok: false, status: null, count: 0, error: 'PDL_API_KEY not set' }
  try {
    const res = await fetch(PDL_SEARCH_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': key },
      body:    JSON.stringify(buildPdlBody(icp, 1)), // size 1 — cheap; PDL still returns `total` match count
      signal:  AbortSignal.timeout(15000),
    })
    if (!res.ok) {
      const text = (await res.text().catch(() => '')).slice(0, 300)
      return { configured: true, ok: false, status: res.status, count: 0, error: text || `HTTP ${res.status}` }
    }
    const json = await res.json() as { data?: PdlPerson[]; total?: number }
    const f = json.data?.[0]
    // Surface the RAW shape of the key fields so we can see exactly what PDL returns
    // (esp. how work_email comes back) without guessing. Admin-only diagnostic.
    const rawFirst = f
      ? {
          name:            `${f.first_name ?? ''} ${f.last_name ?? ''}`.trim(),
          job_title:       f.job_title ?? null,
          company:         f.job_company_name ?? null,
          country:         f.location_country ?? null,
          work_email:      f.work_email ?? null,
          work_email_type: typeof f.work_email,
          emails:          f.emails ?? null,
        }
      : null
    return { configured: true, ok: true, status: res.status, count: json.total ?? json.data?.length ?? 0, error: null, rawFirst }
  } catch (err) {
    return { configured: true, ok: false, status: null, count: 0, error: err instanceof Error ? err.message : 'request failed' }
  }
}

// One raw PDL search call. Distinguishes outcomes so the caller can react:
// PDL returns 402 when the account has fewer credits REMAINING than the `size`
// requested — it refuses the whole batch rather than part-filling it (live
// finding, 10 Jul: 32 credits left + size 50 → 402 "all matches used" on every
// run, i.e. zero leads while credits sat unspent). 404 = query matched nobody.
type PdlOutcome =
  | { kind: 'ok'; contacts: ApolloContact[]; scrollToken: string | null }
  | { kind: 'no_credit' }      // 402 — batch too big for remaining credits (or truly empty)
  | { kind: 'rate_limited' }   // 429
  // 404 means PDL has NOTHING LEFT for this query — either it never matched anyone, or we
  // have paged to the end. That is a fact about the ICP, not a fault, and it used to be
  // folded into `error` and returned as a bare `[]` (#366).
  | { kind: 'exhausted' }
  | { kind: 'error'; detail: string }

async function pdlSearchOnce(icp: IcpQuery, size: number, key: string, scrollToken?: string | null): Promise<PdlOutcome> {
  try {
    const res = await fetch(PDL_SEARCH_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': key },
      body:    JSON.stringify(buildPdlBody(icp, size, scrollToken)),
      signal:  AbortSignal.timeout(15000),
    })
    if (res.status === 404) return { kind: 'exhausted' }
    if (res.status === 402) {
      console.warn(`[pdl] search 402 at size ${size} — batch exceeds remaining credits, will retry smaller`)
      return { kind: 'no_credit' }
    }
    if (res.status === 429) return { kind: 'rate_limited' }
    if (!res.ok) {
      const detail = `HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 240)}`
      console.error(`[pdl] search ${detail}`)
      return { kind: 'error', detail }
    }
    const json = await res.json() as { data?: PdlPerson[]; scroll_token?: string | null }
    const contacts = (json.data ?? []).map(mapPdlToContact).filter((c): c is ApolloContact => c !== null)
    // A null/absent token is PDL saying "that was the last page".
    return { kind: 'ok', contacts, scrollToken: json.scroll_token ?? null }
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'request failed'
    console.error('[pdl] search failed:', detail)
    return { kind: 'error', detail }
  }
}

// Out-of-credits founder alert, deduped to once per 6h (same pattern as the
// source_down alert in lib/apollo.ts) — a busy day must not send 40 emails.
let lastPdlCreditAlertAt = 0
const PDL_CREDIT_ALERT_INTERVAL_MS = 6 * 60 * 60 * 1000
function alertPdlOutOfCredits(): void {
  const now = Date.now()
  if (now - lastPdlCreditAlertAt < PDL_CREDIT_ALERT_INTERVAL_MS) return
  lastPdlCreditAlertAt = now
  void sendFounderAlert('source_down', 'PDL is out of search credits — lead sourcing is returning zero', [
    'Every ICP run is failing with PDL 402 "account maximum for search (all matches used)" — even a batch of 1.',
    'Fix: top up / upgrade the Person Search plan at dashboard.peopledatalabs.com → Plans & Billing.',
    'Until then clients get zero leads from every run.',
  ])
}

/** One page of PDL results, plus where to resume and whether there IS a next page. */
export type PdlPage = {
  contacts: ApolloContact[]
  /** Send this back next run to get the FOLLOWING people. Null = no more pages. */
  scrollToken: string | null
  /** PDL has nobody left for this query — a fact about the ICP, not a fault (#366). */
  exhausted: boolean
  /** Set when the page could not be fetched at all. Distinct from an empty page. */
  error: string | null
}

/**
 * Fetch ONE page of PDL results, resuming from `scrollToken` when given (#366).
 *
 * This is the honest version of the search: it distinguishes the four things a zero can
 * mean — a page that legitimately held nobody, the END of the audience (`exhausted`), a
 * failed request (`error`), and PDL not being configured at all. `pdlSearchPeople` below
 * flattens all four back to `[]` for the callers that only ever wanted a list.
 *
 * 402 handling (unchanged): PDL rejects any batch larger than the credits remaining, so on
 * 402 we retry down a size ladder (50 → 25 → 10 → 5 → 1) and take whatever the remaining
 * balance allows instead of returning nothing. A 402 at size 1 means the account is truly
 * dry → throttled founder alert. Failed calls (402/404/429) consume no PDL credits, so the
 * ladder costs nothing extra.
 */
export async function pdlSearchPage(icp: IcpQuery, size = 50, scrollToken: string | null = null): Promise<PdlPage> {
  const key = process.env.PDL_API_KEY
  // Dormant until a key is configured. NOT `exhausted` — we never asked, so we cannot claim
  // the audience is finished; that would tell a client to widen an ICP that is fine.
  if (!key) return { contacts: [], scrollToken, exhausted: false, error: null }

  const ladder = [size, 25, 10, 5, 1].filter((s, i, a) => s >= 1 && s <= size && a.indexOf(s) === i)
  let retriedRateLimit = false

  for (let i = 0; i < ladder.length; i++) {
    const outcome = await pdlSearchOnce(icp, ladder[i], key, scrollToken)
    if (outcome.kind === 'ok') {
      if (i > 0) console.log(`[pdl] size ladder recovered: got ${outcome.contacts.length} at size ${ladder[i]} (asked ${size})`)
      return { contacts: outcome.contacts, scrollToken: outcome.scrollToken, exhausted: false, error: null }
    }
    if (outcome.kind === 'exhausted') {
      // 404. Either the query never matched anybody, or we have walked it to the end. Both
      // are "there is nobody left here" — and both must be SAID, never returned as a bare [].
      console.log(`[pdl] query exhausted (404)${scrollToken ? ' — paged to the end of this audience' : ' — matched nobody at all'}`)
      return { contacts: [], scrollToken: null, exhausted: true, error: null }
    }
    if (outcome.kind === 'no_credit') continue // step down the ladder
    if (outcome.kind === 'rate_limited' && !retriedRateLimit) {
      // Free-tier rate limits are per-minute and tight; one paced retry at the
      // same size, then give up.
      retriedRateLimit = true
      await new Promise(r => setTimeout(r, 2500))
      i-- // retry the same rung
      continue
    }
    // Hard error (or second 429) — logged inside pdlSearchOnce. Keep the token: the page was
    // never served, so resuming from it next run loses nobody.
    const detail = outcome.kind === 'error' ? outcome.detail : 'rate limited twice'
    return { contacts: [], scrollToken, exhausted: false, error: detail }
  }

  // 402 all the way down to size 1 — the account has zero search credits left. Emphatically
  // NOT exhausted: the audience is fine, our wallet is not.
  alertPdlOutOfCredits()
  return { contacts: [], scrollToken, exhausted: false, error: 'PDL is out of search credits' }
}

/**
 * Search PDL for people matching an ICP. Returns [] when no PDL_API_KEY is set (dormant),
 * on error, or on no matches — never throws, so it's a safe fallback.
 *
 * Thin wrapper over `pdlSearchPage` for the callers that only want a list (the read-only
 * diagnostics in routes/engine.ts and routes/icps.ts). Anything that pages across runs must
 * use `pdlSearchPage` directly — a caller that cannot carry the token forward is a caller
 * that will re-serve page 1 forever, which is the bug this file exists to fix.
 */
export async function pdlSearchPeople(icp: IcpQuery, size = 50): Promise<ApolloContact[]> {
  return (await pdlSearchPage(icp, size, null)).contacts
}

// Normalise a PDL person into the shared ApolloContact shape the pipeline expects.
function mapPdlToContact(p: PdlPerson): ApolloContact | null {
  if (!p.first_name && !p.last_name) return null
  // Defensive: PDL can return work_email as a non-string (e.g. a boolean presence
  // flag on the free search tier, where the real address is gated). Only accept a
  // real string address; otherwise leave null and let the waterfall enrich it.
  const emailCandidates: unknown[] = [
    p.work_email,
    ...(Array.isArray(p.emails) ? p.emails.map(e => e?.address) : []),
  ]
  const email = (emailCandidates.find(v => typeof v === 'string' && v.includes('@')) as string | undefined) ?? null
  // Prefix the id so PDL-sourced leads are distinguishable from Apollo ids and are
  // never sent to Apollo's bulk_match (which matches by Apollo's internal id).
  const id = `pdl_${p.id ?? p.linkedin_url ?? `${p.first_name}_${p.last_name}_${p.job_company_name}`}`
  return {
    id,
    first_name:        p.first_name ?? '',
    last_name:         p.last_name ?? '',
    email,
    // PDL work_email is a real, deliverable address — treat as verified-equivalent
    // so Option A (verified → campaign-ready) applies, same as Apollo verified.
    email_status:      email ? 'verified' : null,
    linkedin_url:      p.linkedin_url ?? null,
    title:             p.job_title ?? null,
    seniority:         p.job_title_levels?.[0] ?? null,
    country:           p.location_country ?? null,
    organization_name: p.job_company_name ?? null,
    organization:      p.job_company_name
      ? { name: p.job_company_name, num_employees: null, industry: p.job_company_industry ?? null, technology_names: p.skills?.slice(0, 10) ?? [] }
      : null,
  }
}
