// Apollo.io people search — maps ICP criteria to API params and normalises results
// ⛓️ 17 Sep (FD-6) — WAS: `import { pdlSearchPage, pdlSearchDiagnostic, type PdlPage, … }`.
// PDL is not a provider of ours any more ("We are not paying for PDL"), so nothing here
// calls it. `PdlSearchOptions` is still imported for its `proofMode` flag, which selects a
// FENCE rather than a vendor; `pdl-search.ts` itself stays on disk, uncalled, because
// historic `pdl_…` provenance is still read at the reveal door (AR15).
import { type PdlSearchOptions } from './pdl-search'
import type { ProviderPage } from './provider-page'
import { assertPaidProviderAllowed, rethrowIfProviderBlocked } from './paid-provider-guard'
import { sourcingProviderFor, apolloRevealableIds, type Audience } from './provider-boundary'
import { sendFounderAlert } from './alerts'
import { isPlaceholderEmail } from './email-hygiene'

// #375 (AR-38) — re-exported so existing importers of apollo.ts keep working; the
// implementation lives in the dependency-free email-hygiene module (unit-testable).
export { isPlaceholderEmail }

// #337④ — dedup the "lead discovery is down" founder alert to at most once per 6h.
// Only fires when a REAL source error left us with zero contacts (Apollo threw and
// PDL is unconfigured or also errored to nothing) — never on a genuinely-narrow ICP
// that returns 0 without any source error.
let lastSourceDownAlertAt = 0
const SOURCE_DOWN_ALERT_INTERVAL_MS = 6 * 60 * 60 * 1000
function alertSourceDown(lines: string[]): void {
  const now = Date.now()
  if (now - lastSourceDownAlertAt < SOURCE_DOWN_ALERT_INTERVAL_MS) return
  lastSourceDownAlertAt = now
  void sendFounderAlert('source_down', 'Lead discovery is down — clients are getting zero leads', lines)
}

// Apollo's PUBLIC REST API is under /api/v1. The bare /v1 host is Apollo's internal
// web API (session/OAuth) — calling it with an X-Api-Key is accepted but runs
// without account context, returning HTTP 200 with zero results. Must be /api/v1.
const APOLLO_BASE = 'https://api.apollo.io/api/v1'
// People search endpoint. /mixed_people/search is deprecated for API callers (422);
// the supported path is /mixed_people/api_search (no-credit, net-new prospecting).
// Ref: https://docs.apollo.io/reference/people-api-search
const APOLLO_PEOPLE_SEARCH = `${APOLLO_BASE}/mixed_people/api_search`

// ── APOLLO'S PAGINATION LIMITS, DECLARED RATHER THAN REMEMBERED (7 Sep) ─────────────────
//
// 🛑 THE PRODUCTION 422 THIS CLOSES. The first authenticated House run asked for its whole
// authorised batch in ONE request — `per_page: 250` — and Apollo answered:
//
//   422 {"error":"Per page not supported","error_details":{
//        "code":"SEARCH_VALIDATION_SEARCH_PARAMS_INVALID", …}}
//
// The message is terse enough to mislead: `per_page` IS supported and documented. What is not
// supported is that VALUE. Apollo's People Search serves "100 records per page, up to 500
// pages" (docs.apollo.io/reference/people-api-search), so 250 is simply out of range.
//
// ⚠️ AND DELETING `per_page` WOULD HAVE BEEN A WORSE BUG THAN THE 422. Without it Apollo
// returns its default page and the run makes ONE request, so a programme that authorised 250
// records would receive at most 100 — and report success. A 422 is loud; a batch that quietly
// delivers 40% of what was authorised is the kind of wrong that surfaces a month later in an
// attribution review. The limit is per PAGE, so the fix is to turn one illegal request into
// the right number of legal ones.
const APOLLO_MAX_PER_PAGE = 100
/** Apollo stops paginating at 500 pages; nothing here should ever approach it. */
const APOLLO_MAX_PAGE = 500
export { APOLLO_MAX_PER_PAGE, APOLLO_MAX_PAGE }

// ── Seniority mapping ─────────────────────────────────────────────────────────
const SENIORITY_MAP: Record<string, string[]> = {
  'C-Suite':                ['c_suite'],
  'VP / Director':          ['vp', 'director'],
  'Head of':                ['head'],
  'Manager':                ['manager'],
  'Senior':                 ['senior'],
  'Individual Contributor': ['entry'],
}

// ── Company size mapping (Apollo uses "min,max" ranges) ───────────────────────
const EMPLOYEE_RANGE_MAP: Record<string, string> = {
  '1–10':      '1,10',
  '11–50':     '11,50',
  '51–200':    '51,200',
  '201–500':   '201,500',
  '501–1,000': '501,1000',
  '1,000+':    '1001,1000000',
}

// Resolve a company-size label to an Apollo "min,max" range. Tolerant of dash type
// (– vs -), thousands separators, and lower-bound drift — the conversational ICP
// builder is an LLM and emits variants like "2–10" that won't hit the exact map.
// Without this, an unmatched label was silently dropped from the search.
function toEmployeeRange(size: string): string | null {
  if (EMPLOYEE_RANGE_MAP[size]) return EMPLOYEE_RANGE_MAP[size]
  const cleaned = size.replace(/,/g, '').trim()
  const nums = cleaned.match(/\d+/g)?.map(Number) ?? []
  if (/\+\s*$/.test(cleaned) && nums.length >= 1) return `${nums[0]},1000000`
  if (nums.length >= 2) return `${nums[0]},${nums[1]}`
  if (nums.length === 1) return `${nums[0]},${nums[0]}`
  return null
}

export interface ApolloContact {
  id: string
  first_name: string
  last_name:  string
  email:      string | null
  email_status: string | null   // 'verified' | 'unverified' | 'likely_to_engage' | etc.
  linkedin_url: string | null
  title:       string | null
  seniority:   string | null
  country:     string | null
  organization_name: string | null
  organization: {
    name:              string | null
    num_employees:     number | null
    industry:          string | null
    technology_names:  string[]
  } | null
}

interface ApolloSearchBody {
  page:     number
  per_page: number
  person_titles?:                      string[]
  person_seniorities?:                 string[]
  organization_num_employees_ranges?:  string[]
  person_locations?:                   string[]
  contact_email_status?:               string[]
  q_keywords?:                         string
  organization_latest_funding_stage_cd?: string[]
  q_organization_keyword_tags?:          string[]
  organization_names?:                   string[]
}

/**
 * ⚑ 7 Sep — HOUSE TAKES `verified` AND NOTHING ELSE (founder-locked).
 *
 * `likely_to_engage` is Apollo's "probably reachable", not a verified business address. For
 * a client it is an acceptable proxy and is unchanged; for House the founder ruled only
 * `verified` is usable, so the request narrows to one status.
 *
 * ⚠️ A QUERY FILTER IS A REQUEST, NOT A GUARANTEE. The record that comes back is re-checked
 * at insert (`runIcpJob`), because a provider that ignores a filter is exactly the case a
 * filter cannot cover.
 */
export type ApolloSearchOptions = { verifiedEmailOnly?: boolean }

// Build the search body from an ICP record
export function buildSearchBody(icp: {
  job_titles:            string[]
  seniority_levels:      string[]
  company_sizes:         string[]
  geographies:           string[]
  industries:            string[]
  tech_stack:            string[]
  keywords:              string[]
  apollo_only_consented: boolean
  intent_signals?:       string[]
  organization_names?:   string[]
}, page = 1, apolloOpts?: ApolloSearchOptions): ApolloSearchBody {
  const body: ApolloSearchBody = { page, per_page: 50 }

  if (icp.job_titles.length)
    body.person_titles = icp.job_titles

  const seniorities = icp.seniority_levels.flatMap(s => SENIORITY_MAP[s] ?? [])
  if (seniorities.length)
    body.person_seniorities = seniorities

  const employeeRanges = icp.company_sizes.map(toEmployeeRange).filter((r): r is string => r !== null)
  if (employeeRanges.length)
    body.organization_num_employees_ranges = employeeRanges

  if (icp.geographies.length)
    body.person_locations = icp.geographies

  // Apollo's verified/likely_to_engage emails are the closest proxy for consent.
  // ⚑ 7 Sep — House narrows this to `verified` alone; every other caller is unchanged.
  if (icp.apollo_only_consented)
    body.contact_email_status = apolloOpts?.verifiedEmailOnly ? ['verified'] : ['verified', 'likely_to_engage']

  // Industries → Apollo's organization keyword-tag field (OR semantics across tags).
  // These MUST NOT go into q_keywords: that field is a literal full-text match, so
  // space-joining industries collapses the result set to near-zero (e.g.
  // "SaaS Consulting" returns 1 person, vs 65k via q_organization_keyword_tags).
  //
  // ⚑ 10 Sep — THIS GENEROSITY IS NOW BACKED BY A GATE, AND THAT IS WHY IT MAY STAY.
  // OR-semantics across tags means a request for "digital marketing" returns companies tagged
  // with EITHER word — which is how a UK-digital-marketing-agency target came back holding
  // management consultancies. The fix is NOT to narrow this field (the strict industry field
  // is documented above as returning ~1 result): it is that `proof-fit.ts` re-decides industry
  // ON THE ROW, deterministically, before anything is scored or surfaced. Fetch generously,
  // refuse precisely. Titles, seniority, size and geography above are already strict filters.
  if (icp.industries.length)
    body.q_organization_keyword_tags = icp.industries

  // tech_stack is deliberately NOT sent to Apollo. It is auto-generated by the
  // conversational ICP builder as free text (e.g. "Email outreach tools", "CRM"),
  // which are not valid Apollo technology UIDs — applying them as a technology
  // filter zeroes the search. A validated tech picker can reintroduce this later.

  // icp.keywords is deliberately NOT sent to Apollo. q_keywords is a LITERAL
  // full-text match across the whole profile, so multi-word values collapse the
  // result set to ~0 (e.g. the conversational builder emits prose like
  // "manual outreach pipeline building sales scaling…", which matches nobody).
  // The structured filters above (titles, seniority, industry tags, geo, size)
  // are what actually target. Keyword/intent targeting belongs in the OR-based
  // q_organization_keyword_tags, handled for intent signals below.

  // Intent signals
  if (icp.intent_signals && icp.intent_signals.length > 0) {
    const fundingStages: string[] = []
    const orgKwTags: string[] = []

    for (const signal of icp.intent_signals) {
      if (signal === 'recently_funded') {
        fundingStages.push('seed', 'series_a', 'series_b', 'series_c', 'series_d')
      }
      if (signal === 'hiring_sdrs') {
        orgKwTags.push('hiring sales development')
      }
      if (signal === 'headcount_growth') {
        orgKwTags.push('growing team')
      }
      if (signal === 'new_executive') {
        orgKwTags.push('new ceo new cto new vp')
      }
    }

    if (fundingStages.length) body.organization_latest_funding_stage_cd = fundingStages
    // Intent keyword tags OR into the org keyword-tag field (NOT literal q_keywords),
    // so they widen rather than collapse the search.
    if (orgKwTags.length)
      body.q_organization_keyword_tags = [...(body.q_organization_keyword_tags ?? []), ...orgKwTags]
  }

  // ABM — named account targeting
  if (icp.organization_names && icp.organization_names.length > 0)
    body.organization_names = icp.organization_names

  return body
}

// Returns total matching leads for an ICP (uses per_page:1 to minimise credit use).
// Returns a diagnostic envelope — NOT a bare 0 — so a silent failure (missing key,
// 401, throttle, unexpected response shape) is visible instead of masquerading as
// "no matches". `debug.sentBody` echoes the exact Apollo query that was built.
export interface PreviewCountResult {
  count: number
  error: string | null
  debug: {
    keyConfigured: boolean
    keyTail: string | null       // last 4 chars of the key, to identify WHICH key is in use
    endpoint: string             // the exact URL hit — verifies which build is running
    httpStatus: number | null
    rawCountField: string | null
    sentBody: unknown
  }
}

export async function previewCount(
  icp: Parameters<typeof buildSearchBody>[0],
  // ⚠️ KEPT AFTER FD-6, AND STILL REQUIRED READING. It no longer selects a VENDOR — every
  // audience previews on Apollo now — but it is the parameter that made the boundary
  // explicit at every call site, and `verifiedEmailOnly` elsewhere still rides on the same
  // fact. Removing it would delete the record of a distinction the product still makes.
  // The preview spends no Apollo CREDITS: People Search is free; the reveal is the cost.
  audience: Audience = 'client',
): Promise<PreviewCountResult> {
  void audience   // see the note on the parameter: documented, no longer a vendor switch
  const apiKey = process.env.APOLLO_API_KEY
  const body = buildSearchBody(icp, 1)
  body.per_page = 1
  const baseDebug = {
    keyConfigured: !!apiKey,
    keyTail: apiKey ? apiKey.slice(-4) : null,
    endpoint: APOLLO_PEOPLE_SEARCH,
    httpStatus: null as number | null,
    rawCountField: null as string | null,
    sentBody: body,
  }

  // ── 🪦 REMOVED 17 Sep BY FD-6 — THE PDL PREVIEW FALLBACK ────────────────────────
  //
  // #243 added `pdlFallback` so the ICP preview would work "Apollo-free once PDL_API_KEY is
  // set", and AR5 then made it the CLIENT'S primary preview path. FD-6 ends both: **"PDL IS
  // NOT A PAID/ACTIVE PROVIDER FOR MVP1. We are not paying for PDL."**
  //
  // ⚠️ THE HONEST ANSWER WHEN APOLLO CANNOT ANSWER IS APOLLO'S OWN ERROR, NOT A SECOND
  // VENDOR'S NUMBER. Returning PDL's count as an Apollo preview would state a size for an
  // audience we cannot actually source from — a preview is a promise about what a run will
  // find, and a promise measured against a provider we do not pay is not one.
  //
  // Three call sites used it (`!apiKey`, a non-OK response and the catch). All three now
  // return Apollo's own zero-or-error, which is what the House audience already got.

  if (!apiKey) {
    return { count: 0, error: 'APOLLO_API_KEY is not set on the API service', debug: baseDebug }
  }

  // ⚠️ OUTSIDE THE `try` (R66) — the catch below degrades to a count of 0, which reads as
  // "no matches" rather than "we refused to spend". A blocked call must stop the run.
  assertPaidProviderAllowed('apollo', 'previewCount')
  try {
    const res = await fetch(APOLLO_PEOPLE_SEARCH, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
      body:    JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { count: 0, error: `Apollo ${res.status}: ${text.slice(0, 240)}`, debug: { ...baseDebug, httpStatus: res.status } }
    }
    // Apollo returns the match count as a top-level `total_entries` on the current
    // API; older/other shapes nest it under `pagination.total_entries`. Read both,
    // or the preview banner reports 0 for every ICP no matter how broad the query.
    const data = await res.json() as {
      total_entries?: number
      pagination?: { total_entries?: number }
    }
    const fromPagination = data.pagination?.total_entries
    const fromTop = data.total_entries
    const count = fromPagination ?? fromTop ?? 0
    const rawCountField = fromPagination != null ? 'pagination.total_entries' : fromTop != null ? 'total_entries' : 'none-found'
    return { count, error: null, debug: { ...baseDebug, httpStatus: res.status, rawCountField } }
  } catch (e) {
    return { count: 0, error: e instanceof Error ? e.message : 'preview request failed', debug: baseDebug }
  }
}

// Dedup key for cross-source merge: prefer a verified-stable identity (lowercased
// email); fall back to lowercased name+company when no email is present. PDL and
// Apollo can legitimately surface the same person, so merging without this would
// double-count and inflate (and double-charge) the run.
function contactDedupKey(c: ApolloContact): string {
  if (c.email) return `email:${c.email.toLowerCase().trim()}`
  const name    = `${c.first_name} ${c.last_name}`.toLowerCase().trim()
  const company = (c.organization?.name ?? c.organization_name ?? '').toLowerCase().trim()
  return `nc:${name}|${company}`
}

// ── 🪦 UNUSED SINCE 17 Sep (FD-6) — there is only one contact list to return ─────────
// This merged Apollo's results with a PDL supplement. With one provider there is nothing to
// merge. Kept (CORE-MAP rule 3: nothing gets deleted) and exported so the compiler stops
// calling it dead without anybody deleting a tested function.
export function mergeContacts(primary: ApolloContact[], extra: ApolloContact[]): ApolloContact[] {
  const seen = new Set(primary.map(contactDedupKey))
  const out  = [...primary]
  for (const c of extra) {
    const k = contactDedupKey(c)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(c)
  }
  return out
}

export async function searchPeopleWithFallback(
  icp: Parameters<typeof buildSearchBody>[0],
  page = 1,
  size = 50,   // #445 — ask each source for exactly what we may KEEP (the granted
               // sourcing-budget batch), not a fixed 50. Kills the buy-50-keep-20 waste.
  // #366 — where the PROVIDER got to last run for THIS ICP. Null on a first run. The caller
  // stores the returned `providerPage.cursor` on the ICP row and hands it back next time,
  // which is what makes a client's second month find people their first month did not.
  // ⛓️ 17 Sep — OPAQUE TO EVERY CALLER. PDL issued a scroll token; Apollo pages by number, so
  // this now carries a page number as a string. A stored PDL-era token is not a number and is
  // ignored rather than coerced — `Number('eyJ…')` is NaN, and a NaN page reaches Apollo as
  // garbage.
  providerCursor: string | null = null,
  // ⚠️ REQUIRED, and required ON PURPOSE (AR5, 21 Aug). Optional-with-a-default would let a
  // future call site inherit whatever that default was and silently re-open the boundary —
  // the exact failure this parameter exists to close. It sits after `pdlCursor` (which keeps
  // its default) so the compiler forces every caller to state the cursor explicitly too:
  // that is deliberate, and the two existing call sites already pass one.
  audience: Audience,
  // ⚑ 24 Aug — FREE PROOF PROVES FIT, NOT DELIVERABILITY (founder-ruled). Optional and
  // fail-safe: omitted, or `proofMode` anything but `true`, is today's paid behaviour.
  // ⚠️ IT REACHES THE PDL BRANCH ONLY. Apollo's body builder is not given it and does not
  // take it — this is a change to one clause of one provider's query, not to provider
  // selection, order, or anything Apollo does.
  opts?: PdlSearchOptions,
): Promise<{ contacts: ApolloContact[]; relaxed: string | null; providerPage: ProviderPage | null }> {
  // ── THE AR5 BOUNDARY (21 Aug) ─────────────────────────────────────────────────────
  // This function used to run **Apollo ∪ PDL for everyone**, with the mix decided by
  // which global keys existed. That is the defect: a paying client's sourcing consumed
  // K.I.N.D's Apollo, and house hunting consumed the clients' PDL, in both directions,
  // silently. Provider now follows the AUDIENCE and nothing else.
  //
  // The union is gone rather than made conditional: it only ever existed because the two
  // audiences shared one function. `searchProviderFor` is the single decision — see
  // lib/provider-boundary.ts for why it does not live at the call sites.
  // ⛓️ 15 Sep (S2-RT-001A) — `sourcingProviderFor`, NOT `searchProviderFor`. AR5 still decides
  // every ordinary run; the ONE exception is FREE PROOF, which the founder locked onto Apollo
  // after Northstar's Proof was sent to a PDL account with no search credits left. `opts` is
  // the same object the PDL branch already reads `proofMode` from — no new parameter, no new
  // call-site contract, and a non-proof client run is byte-identical to before.
  const provider = sourcingProviderFor(audience, { proofMode: opts?.proofMode === true })

  // ⚑ 7 Sep — DERIVED FROM THE AUDIENCE, NEVER PASSED IN. A `verifiedEmailOnly` parameter
  // would have to be remembered at every call site, and the one that forgot it would relax
  // House's founder-locked requirement silently. The audience is already the single input
  // provider choice is allowed to have; the email-status floor rides on the same fact.
  const verifiedEmailOnly = audience === 'house'

  // Every exit point must report the page, so a stored cursor can never silently stop
  // advancing. Threading it by hand through nine returns is exactly how one gets missed.
  const out = (contacts: ApolloContact[], relaxed: string | null, providerPage: ProviderPage | null) =>
    ({ contacts, relaxed, providerPage })

  // ── 🪦 REMOVED 17 Sep BY FD-6 — THE CLIENT → PDL BRANCH ───────────────────────────
  //
  // This block called `pdlSearchPage` for every client audience, which was AR5 exactly as
  // written. The founder's ruling ends it: **"PDL IS NOT A PAID/ACTIVE PROVIDER FOR MVP1.
  // We are not paying for PDL."** A branch pointing at an unpaid provider does not fail
  // over; it just fails, and it fails while reporting "no matches for this profile yet" to
  // a client whose profile was never searched.
  //
  // `sourcingProviderFor` now answers `'apollo'` for every audience and every mode, so this
  // branch became unreachable the moment the boundary changed. It is deleted rather than
  // left behind a condition nothing satisfies: dead policy code reads as policy.
  //
  // `pdl-search.ts` STAYS ON DISK, untouched — CORE-MAP rule 3 (founder-locked 26 Jul:
  // "nothing gets deleted"), and historic `pdl_…` provenance is still read by
  // `apolloRevealableIds`. Nothing on any MVP1 path calls it, which
  // `one-provider-apollo.test.ts` proves behaviourally WITH BOTH KEYS SET.
  if (provider !== 'apollo') {
    // Unreachable by construction, and loud rather than silent if that ever stops being
    // true. A guard that cannot fire costs nothing; a silent fall-through to the Apollo
    // walk under a non-Apollo decision would be the boundary breaking quietly.
    throw new Error(
      `provider-boundary returned "${provider}" for audience "${audience}" — FD-6 admits only apollo. ` +
      'Nothing was searched.',
    )
  }

  // ── APOLLO, THE ONLY PROVIDER (FD-6) ─────────────────────────────────────────────
  //
  // ⛓️ 17 Sep — WAS "HOUSE AUDIENCE → APOLLO ONLY", with `pdlConfigured = false` and a
  // `pdlSupplement` hardcoded to null: three merge branches and a fail-over branch that had
  // already been reduced to dead weight by AR5 and were still being awaited on every pass.
  // FD-6 removes the second vendor entirely, so the merge, the supplement and the fail-over
  // are gone. What replaces them is the thing their presence was hiding: **Apollo now has to
  // answer the questions the PDL page used to answer.**
  //
  // ── WHY THE PAGE MATTERS MORE THAN THE CONTACTS ──────────────────────────────────
  //
  // `icps.ts` does not only count rows. It reads `completed`, `exhausted` and
  // `matchedNothing` to decide whether a ZERO is evidence:
  //
  //   · `completed` — did the search actually happen? A run with no key, a timeout or a 5xx
  //     returns zero and proves nothing. Telling a client "nobody matches your profile" on
  //     that basis is a false statement about their market, and `searchTrust` exists to stop
  //     it. The Apollo branch used to return `pdlPage: null` for every run, so **no client
  //     run could ever reach `searchTrust = 'proven'`** — every honest empty looked identical
  //     to an outage, and the widening ladder could not tell them apart either.
  //   · `exhausted` — Apollo had more pages and we walked to the end of them. A fact about
  //     this ICP, not about us.
  //   · `matchedNothing` — the FIRST page matched nobody, from a cold start. Never paged,
  //     nothing ever sourced. Distinct from `exhausted` by construction, and collapsing the
  //     two is what once told a client that "every matching person our data source holds has
  //     already been sourced for you" about an audience nobody had ever sourced from.
  //   · `cursor` — where to resume. Apollo pages by NUMBER, so the cursor is the next page
  //     number as a string. That is what makes a client's second month find people their
  //     first month did not.
  const perPage = Math.max(1, Math.min(size, APOLLO_MAX_PER_PAGE))
  const sized = (b: ApolloSearchBody): ApolloSearchBody => { b.per_page = perPage; return b }

  // ⛓️ THE CURSOR IS A PAGE NUMBER NOW. PDL issued an opaque scroll token; Apollo takes
  // `page`. A stored token from a PDL era run is not a number, so it is ignored rather than
  // coerced — `Number('eyJ…')` is NaN and a NaN page would be sent to Apollo as garbage.
  const resumeFrom = (() => {
    const n = Number(providerCursor)
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : page
  })()

  /**
   * Walk Apollo's pages until `size` records are gathered or the audience runs out.
   *
   * `makeBody` is called per page so every request is built by the SAME builder the
   * single-page version used — the verified-only filter, the consent proxy and every other
   * clause ride onto page 2 and page 3 rather than being set once and forgotten.
   *
   * ⚠️ THE STOP CONDITION IS A SHORT PAGE, NOT AN ERROR. Apollo returning fewer records than
   * asked for means the audience is exhausted; asking again would be an identical request
   * for an answer we already have. And it never over-delivers: an authorised batch is a
   * ceiling as well as a target, so the walk stops the moment `size` is reached.
   */
  const searchPaged = async (
    makeBody: (p: number) => ApolloSearchBody,
  ): Promise<{ contacts: ApolloContact[]; lastPage: number; shortPage: boolean; pagesWalked: number }> => {
    const gathered: ApolloContact[] = []
    let lastPage = resumeFrom
    let shortPage = false
    let pagesWalked = 0
    for (let p = resumeFrom; p < resumeFrom + APOLLO_MAX_PAGE && gathered.length < size; p++) {
      const batch = await searchPeople(sized(makeBody(p)))
      pagesWalked += 1
      lastPage = p
      gathered.push(...batch)
      if (batch.length < perPage) { shortPage = true; break }   // Apollo has no more for this query
    }
    return { contacts: gathered.slice(0, size), lastPage, shortPage, pagesWalked }
  }

  /** A page that records a COMPLETED search — Apollo answered, whatever the count. */
  const answered = (
    w: { contacts: ApolloContact[]; lastPage: number; shortPage: boolean; pagesWalked: number },
    coldStart: boolean,
  ): ProviderPage => ({
    provider: 'apollo',
    contacts: w.contacts,
    // No next page when Apollo ran short; otherwise resume after the last page we read.
    cursor: w.shortPage ? null : String(w.lastPage + 1),
    // Exhausted requires having PAGED to the end — the mutually exclusive partner of
    // `matchedNothing`, which requires never having paged at all.
    exhausted: w.shortPage && w.contacts.length > 0,
    matchedNothing: coldStart && w.contacts.length === 0 && w.pagesWalked > 0,
    error: null,
    completed: true,
  })

  /** A page that records a search that did NOT happen. Zero here proves nothing. */
  const didNotAnswer = (why: string): ProviderPage => ({
    provider: 'apollo',
    contacts: [],
    // ⚠️ THE CURSOR IS PRESERVED, NOT CLEARED. An outage must not lose a client's place in
    // their own audience; clearing it would silently restart them from page 1 next month and
    // re-source people they already have.
    cursor: providerCursor,
    exhausted: false,
    matchedNothing: false,
    error: why,
    completed: false,
  })

  const coldStart = resumeFrom <= 1

  try {
    // Pass 1 — the full query, exactly as the client's ICP states it.
    const w1 = await searchPaged(p => buildSearchBody(icp, p, { verifiedEmailOnly }))
    if (w1.contacts.length > 0) return out(w1.contacts, null, answered(w1, coldStart))

    // Pass 2 — remove the consent proxy (the consent gate was cutting the pool).
    // ⚑ 7 Sep — HOUSE NEVER RELAXES THE EMAIL-STATUS FILTER. Thin results are an answer; for
    // House they are not a reason to accept an unverified address. Pass 2 exists to widen the
    // CONSENT proxy, so for House it has nothing left to widen and is skipped entirely.
    //
    // ⚠️ AND FD-5 MAKES THAT FLOOR MATTER FOR EVERY AUDIENCE AT SEND TIME, not here: a
    // relaxed search may QUALIFY somebody it may not make SENDABLE. Separating those two is
    // the send gate's job (`email_status = 'verified'`), and relaxing this filter never
    // relaxes that one.
    if (icp.apollo_only_consented && !verifiedEmailOnly) {
      const w2 = await searchPaged(p => {
        const relaxed2 = { ...buildSearchBody(icp, p, { verifiedEmailOnly }) }
        delete relaxed2.contact_email_status
        return relaxed2
      })
      if (w2.contacts.length > 0) {
        console.log('[apollo] fallback pass 2: removed consent filter — found', w2.contacts.length)
        return out(
          w2.contacts,
          'Consent filter relaxed to find results. Apollo-verified emails were too restrictive for this geography.',
          answered(w2, coldStart),
        )
      }
    }

    // Pass 3 — remove employee ranges (geography + titles only).
    const w3 = await searchPaged(p => {
      const relaxed3 = { ...buildSearchBody(icp, p, { verifiedEmailOnly }) }
      // ⚑ 7 Sep — the SIZE widening still applies to House; the email-status floor does not move.
      if (!verifiedEmailOnly) delete relaxed3.contact_email_status
      delete relaxed3.organization_num_employees_ranges
      return relaxed3
    })
    if (w3.contacts.length > 0) {
      console.log('[apollo] fallback pass 3: removed size + consent filters — found', w3.contacts.length)
      return out(
        w3.contacts,
        'Company size + consent filters relaxed to find results. Try widening the company size range in your ICP.',
        answered(w3, coldStart),
      )
    }

    // 🛑 EVERY PASS ANSWERED AND EVERY PASS WAS EMPTY. That is a TRUSTWORTHY zero — the one
    // kind of zero a client may be told about, because the search demonstrably happened.
    console.log('[apollo] all passes returned 0 — no contacts found for this ICP')
    return out(
      [],
      'No contacts found even with relaxed filters. Try broader job titles or add more geographies.',
      answered(w3, coldStart),
    )
  } catch (apolloErr) {
    // ── THERE IS NOWHERE TO FAIL OVER TO, AND THAT IS THE POINT (FD-6) ──────────────
    //
    // ⛓️ WAS: "if PDL is configured, fail over to it". PDL is not a provider of ours, so an
    // Apollo failure is now the whole answer. It FAILS CLOSED: the error propagates to the
    // caller, which releases the batch, records the run and raises an operator task. What it
    // must never do is return an empty list that reads as "nobody matches".
    const errMsg = apolloErr instanceof Error ? apolloErr.message : String(apolloErr)

    // ⚠️ A CREDIT/RATE/BLOCK ERROR IS RE-THROWN UNWRAPPED. The caller classifies on the
    // error's TYPE (ApolloCreditsExhaustedError, ApolloRateLimitError, the zero-spend block)
    // to choose between `quota_exhausted` and `failed`, and flattening them into one generic
    // failure would erase the distinction the run outcome depends on.
    rethrowIfProviderBlocked(apolloErr)

    // #337④ — discovery is completely down: there is one source and it errored.
    alertSourceDown([
      'Apollo lead search errored. Apollo is the ONLY lead source (FD-6) — there is no secondary provider.',
      `Apollo error: ${errMsg}`,
      'Every client ICP run is returning zero leads until this recovers.',
    ])

    // The page records that the search did not complete, so no caller can derive "no
    // matches" from the empty list — and then the error propagates.
    void didNotAnswer(errMsg)
    throw apolloErr
  }
}
export class ApolloCreditsExhaustedError extends Error {
  constructor() { super('Apollo credits exhausted — upgrade plan or wait for monthly reset') }
}

export class ApolloRateLimitError extends Error {
  constructor() { super('Apollo rate limit hit — try again in a few minutes') }
}

export async function searchPeople(body: ApolloSearchBody): Promise<ApolloContact[]> {
  const apiKey = process.env.APOLLO_API_KEY
  if (!apiKey) throw new Error('APOLLO_API_KEY env var is not set')

  assertPaidProviderAllowed('apollo', 'searchPeople')

  // ⚠️ THE BELT, AND IT IS NOT REDUNDANT. `searchPeopleWithFallback` now pages correctly, but
  // this is the ONE function that reaches the endpoint — clamping here means no present or
  // future caller can reproduce the 422, whatever it believes about page sizes. Completeness
  // is the pager's job; legality is this function's.
  const perPage = Math.max(1, Math.min(Number(body.per_page) || APOLLO_MAX_PER_PAGE, APOLLO_MAX_PER_PAGE))
  if (Number(body.per_page) > APOLLO_MAX_PER_PAGE) {
    console.warn(`[apollo] per_page ${body.per_page} exceeds Apollo's maximum of ${APOLLO_MAX_PER_PAGE} — clamped. The caller should be paging.`)
  }
  const legalBody: ApolloSearchBody = { ...body, per_page: perPage }

  const res = await fetch(APOLLO_PEOPLE_SEARCH, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
    body:    JSON.stringify(legalBody),
  })

  if (res.status === 429) throw new ApolloRateLimitError()

  if (!res.ok) {
    const text = await res.text()
    // Apollo returns 422 with "credits" in the message when plan is exhausted
    if (res.status === 422 && text.toLowerCase().includes('credit')) throw new ApolloCreditsExhaustedError()
    if (res.status === 402) throw new ApolloCreditsExhaustedError()
    throw new Error(`Apollo API ${res.status}: ${text}`)
  }

  const data = await res.json() as { contacts?: ApolloContact[]; people?: ApolloContact[]; error?: string }
  // Apollo free plan returns error in body with 200 when credits run out
  if (data.error?.toLowerCase().includes('credit')) throw new ApolloCreditsExhaustedError()
  // ⚑ 26 Aug (final gate) — AN UNRECOGNISED 200 IS NOT A ZERO. `?? []` here meant a 200
  // whose body carried NEITHER key — a proxy error page, a schema change, an HTML body
  // that happened to parse — came back as "Apollo completed and found nobody", the one
  // soft path in a function whose every other failure throws. For the HOUSE audience that
  // false zero would have been promoted to a trusted `no_match`. A genuine zero always
  // carries the key with an empty array; a body with neither key is an answer we do not
  // understand, and an answer we do not understand is not evidence of anything.
  if (!Array.isArray(data.contacts) && !Array.isArray(data.people)) {
    throw new Error(`Apollo API 200 with unrecognised body — neither "contacts" nor "people" present (${JSON.stringify(data).slice(0, 160)})`)
  }
  const list = data.contacts ?? data.people ?? []

  // ── ⚑ 27 Aug — THE COUNTRY-CONTRACT TRIPWIRE. This `as`-cast is compile-time only: no
  // runtime mapper exists on this path, so any per-person field Apollo does not supply
  // under EXACTLY the property name `ApolloContact` declares silently becomes `undefined`.
  // Production carries the consequence already — pooled rows whose `country` is NULL while
  // `title` survived, through this same cast. The true Apollo person→country field name is
  // UNPROVEN in this repository (no fixture, no captured payload, no doc quotes one), and
  // guessing a mapping here would be a second silent miss wearing a fix — so this does NOT
  // remap anything. It makes the loss LOUD instead: geography-constrained runs will reject
  // country-less contacts (hard invariant, icps.ts), and this line says why, at the moment
  // it happens, in counts only. Prove the real field against ONE captured response body,
  // then map it explicitly; until then this is the honest boundary.
  const missingCountry = list.filter(c => {
    const v = (c as { country?: unknown }).country
    return typeof v !== 'string' || v.trim() === ''
  }).length
  if (missingCountry > 0) {
    console.warn(`[apollo] stage=provider_geo_missing — ${missingCountry} of ${list.length} contact(s) arrived with no usable "country" property. The Apollo person→country mapping is UNPROVEN (raw cast, no runtime mapper): geography-constrained sourcing will reject these contacts rather than serve unknown geography. Capture one real response body and map the field explicitly.`)
  }
  return list
}

// People Bulk Match — the PAID enrichment step that reveals work emails.
// The search endpoint (/mixed_people/api_search) returns NO email and MASKS the
// last name (e.g. "La***n"); the only strong identifier it gives is Apollo's
// internal person id. So we enrich by that id — passing it as the match key
// reliably returns the full record incl. a verified work email. Matching by name
// fails (the name is masked). Cost: 1 Apollo credit per matched person, 0 if
// unmatched. Apollo caps each request at 10, so we batch. Returns a Map of
// apollo_id → revealed email, for matched + emailable people only.
const APOLLO_BULK_MATCH = `${APOLLO_BASE}/people/bulk_match`

// ── THE FOUR MONEY CONTROLS, WHERE APOLLO ACTUALLY READS THEM (7 Sep) ───────────────────
//
// 🛑 THEY WERE IN THE JSON BODY, AND THE BODY IS NOT WHERE bulk_match LOOKS. Apollo's
// documented contract puts `reveal_personal_emails`, `reveal_phone_number`,
// `run_waterfall_email` and `run_waterfall_phone` on the QUERY STRING, and the body carries
// `details` alone (docs.apollo.io/reference/bulk-people-enrichment).
//
// ⚠️ SO THE PREVIOUS FIX LOOKED EXPLICIT AND WAS STILL RELYING ON THE DEFAULT. A flag in the
// wrong place is not a flag — it is a comment the server ignores, and it reads to the next
// person as a control that is being enforced. That is worse than the omission it replaced,
// because omission at least looks like what it is.
//
// This is the PAID endpoint on the House path: a personal email, a direct dial or a waterfall
// each cost credits per record, and at 25 chunks a default flip is 250 records of unauthorised
// spend. Scout's controlled 2-Sep test set all four, and the handover is explicit — do not
// rely purely on provider defaults.
const APOLLO_BULK_MATCH_SAFETY = {
  reveal_personal_emails: 'false',
  reveal_phone_number:    'false',
  run_waterfall_email:    'false',
  run_waterfall_phone:    'false',
} as const

/** The bulk_match URL, with the four controls stated on every single request. */
function bulkMatchUrl(): string {
  return `${APOLLO_BULK_MATCH}?${new URLSearchParams(APOLLO_BULK_MATCH_SAFETY).toString()}`
}

/**
 * What the PAID reveal actually tells us about one person.
 *
 * ⚑ 7 Sep — IT USED TO BE JUST THE EMAIL, and that is why the House run could not qualify
 * anybody. People Search returns no `email_status` and no `country`; bulk_match returns both
 * (docs.apollo.io/reference/bulk-people-enrichment). Throwing them away here left M&V's
 * qualification step with nothing to judge geography or verification on, so the only place
 * those facts could be tested was BEFORE they existed — which is the 250 → 0 defect.
 *
 * `last_name` rides along for the same reason: search returns `last_name_obfuscated`
 * ("La***n"), so the real surname first exists at this step.
 */
export interface RevealedPerson {
  email: string
  email_status: string | null
  country: string | null
  last_name: string | null
}

export async function bulkMatchEmails(apolloIds: string[]): Promise<Map<string, RevealedPerson>> {
  const out = new Map<string, RevealedPerson>()
  const apiKey = process.env.APOLLO_API_KEY

  // ── AR5 AT THE REVEAL DOOR (22 Aug) ───────────────────────────────────────
  // This used to be `apolloIds.filter(Boolean)`, which let anything truthy through.
  // A client's PDL-sourced lead carries `apollo_id = 'pdl_…'` — truthy — so
  // `lead-delivery.ts` was handing a client's record to K.I.N.D's Apollo account.
  // Apollo would not have MATCHED it, but AR5 is a boundary, not a cost ceiling:
  // the record must not be sent. Legacy client leads holding a genuine Apollo id
  // still pass, which is AR15's grandfathering, intact.
  const ids = apolloRevealableIds(apolloIds)
  const refused = apolloIds.filter(Boolean).length - ids.length
  if (refused > 0) {
    console.log(`[apollo] bulk_match: AR5 refused ${refused} non-Apollo id(s) — routed to the Hunter waterfall instead`)
  }
  if (!apiKey || ids.length === 0) return out

  for (let i = 0; i < ids.length; i += 10) {
    const batch = ids.slice(i, i + 10)
    // ⚠️ OUTSIDE THE `try` (R66) — a swallowed block would silently return unenriched
    // rows and look like a provider miss.
    assertPaidProviderAllowed('apollo', 'bulkMatch')
    try {
      const res = await fetch(bulkMatchUrl(), {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
        // ⚠️ `details` ALONE. The four safety controls ride on the query string above — see
        // APOLLO_BULK_MATCH_SAFETY. Putting them here too would pass a query-string test while
        // teaching the next reader that the body is where they live.
        body: JSON.stringify({
          details: batch.map(id => ({ id })),   // match by Apollo person id
        }),
      })
      if (!res.ok) {
        console.error(`[apollo] bulk_match ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`)
        continue
      }
      // Apollo returns `matches` aligned to input order; each entry echoes the id
      // and carries the enriched person (with `email`), or null when unmatched.
      const data = await res.json() as {
        matches?: Array<{
          id?: string; email?: string | null; email_status?: string | null
          country?: string | null; last_name?: string | null
        } | null>
      }
      ;(data.matches ?? []).forEach((m, idx) => {
        const apolloId = m?.id ?? batch[idx]
        const email    = m?.email
        if (apolloId && email && !isPlaceholderEmail(email)) {
          // ⚠️ THE FACTS TRAVEL WITH THE ADDRESS. Qualification happens downstream, in M&V's
          // enrichment flow — this step's job is to REPORT what the provider said, not to
          // decide whether the person qualifies.
          out.set(apolloId, {
            email,
            email_status: m?.email_status ?? null,
            country:      m?.country ?? null,
            last_name:    m?.last_name ?? null,
          })
        }
      })
    } catch (err) {
      console.error('[apollo] bulk_match batch failed:', err)
    }
  }
  console.log(`[apollo] bulk_match: revealed ${out.size} email(s) from ${ids.length} apollo id(s)`)
  return out
}
