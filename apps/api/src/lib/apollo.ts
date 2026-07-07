// Apollo.io people search — maps ICP criteria to API params and normalises results
import { pdlSearchPeople, pdlSearchDiagnostic } from './pdl-search'
import { sendFounderAlert } from './alerts'

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
}, page = 1): ApolloSearchBody {
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

  // Apollo's verified/likely_to_engage emails are the closest proxy for consent
  if (icp.apollo_only_consented)
    body.contact_email_status = ['verified', 'likely_to_engage']

  // Industries → Apollo's organization keyword-tag field (OR semantics across tags).
  // These MUST NOT go into q_keywords: that field is a literal full-text match, so
  // space-joining industries collapses the result set to near-zero (e.g.
  // "SaaS Consulting" returns 1 person, vs 65k via q_organization_keyword_tags).
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

export async function previewCount(icp: Parameters<typeof buildSearchBody>[0]): Promise<PreviewCountResult> {
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

  // #243: when Apollo is unusable (no key / error), fall back to a PDL count so the
  // ICP preview works Apollo-free once PDL_API_KEY is set. Returns null if PDL isn't
  // configured or also fails → caller keeps Apollo's original 0/error.
  const pdlFallback = async (reason: string): Promise<PreviewCountResult | null> => {
    if (!process.env.PDL_API_KEY) return null
    const d = await pdlSearchDiagnostic(icp)
    return d.ok ? { count: d.count, error: null, debug: { ...baseDebug, rawCountField: `pdl:${reason}` } } : null
  }

  if (!apiKey) {
    return (await pdlFallback('no-apollo-key')) ?? { count: 0, error: 'APOLLO_API_KEY is not set on the API service', debug: baseDebug }
  }

  try {
    const res = await fetch(APOLLO_PEOPLE_SEARCH, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
      body:    JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return (await pdlFallback(`apollo-${res.status}`)) ?? { count: 0, error: `Apollo ${res.status}: ${text.slice(0, 240)}`, debug: { ...baseDebug, httpStatus: res.status } }
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
    return (await pdlFallback('apollo-exception')) ?? { count: 0, error: e instanceof Error ? e.message : 'preview request failed', debug: baseDebug }
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

// Merge two contact lists, deduped by contactDedupKey. `primary` wins on collision
// (Apollo is the primary source — its ids drive the downstream bulk_match reveal).
function mergeContacts(primary: ApolloContact[], extra: ApolloContact[]): ApolloContact[] {
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
): Promise<{ contacts: ApolloContact[]; relaxed: string | null }> {
  // SECOND SOURCE (dormant unless PDL_API_KEY is set): when configured, PDL is used
  // two ways — (1) as a PARALLEL SUPPLEMENT that is MERGED (deduped) with a successful
  // Apollo result so a run returns Apollo ∪ PDL rather than Apollo-only; and (2) as a
  // FALLBACK when Apollo fails (dead key / exhausted credits / rate limit) or returns 0
  // across all passes. With no key set, behaviour is byte-identical to before — Apollo
  // errors propagate, 0 = relaxed msg, no supplement, no extra calls.
  const pdlConfigured = !!process.env.PDL_API_KEY

  // Fetch the PDL supplement once, in parallel with the Apollo pass below, but only
  // when configured. Never throws (pdlSearchPeople returns [] on any error), so it
  // can only ever ADD leads — it cannot break the Apollo path. We always supplement
  // (not just when Apollo under-fills): PDL surfaces a distinct pool of contacts that
  // carry a real work_email directly, so merging widens reach on every run. Cost is
  // bounded — one extra PDL search per run, deduped against Apollo before use.
  const pdlSupplement: Promise<ApolloContact[]> = pdlConfigured
    ? pdlSearchPeople(icp, page).catch(() => [])
    : Promise.resolve([])

  try {
    // Pass 1 — full query
    const full = buildSearchBody(icp, page)
    const contacts1 = await searchPeople(full)
    if (contacts1.length > 0) {
      const pdl = await pdlSupplement
      if (pdl.length > 0) {
        const merged = mergeContacts(contacts1, pdl)
        const added  = merged.length - contacts1.length
        if (added > 0) console.log(`[apollo] merged PDL supplement: +${added} net-new (Apollo ${contacts1.length} ∪ PDL ${pdl.length} = ${merged.length})`)
        return { contacts: merged, relaxed: null }
      }
      return { contacts: contacts1, relaxed: null }
    }

    // Pass 2 — remove consent filter (consent gate was cutting the pool)
    if (icp.apollo_only_consented) {
      const relaxed2 = { ...buildSearchBody(icp, page) }
      delete relaxed2.contact_email_status
      const contacts2 = await searchPeople(relaxed2)
      if (contacts2.length > 0) {
        console.log('[apollo] fallback pass 2: removed consent filter — found', contacts2.length)
        return { contacts: mergeContacts(contacts2, await pdlSupplement), relaxed: 'Consent filter relaxed to find results. Apollo-verified emails were too restrictive for this geography.' }
      }
    }

    // Pass 3 — remove employee ranges (geo + titles only)
    const relaxed3 = { ...buildSearchBody(icp, page) }
    delete relaxed3.contact_email_status
    delete relaxed3.organization_num_employees_ranges
    const contacts3 = await searchPeople(relaxed3)
    if (contacts3.length > 0) {
      console.log('[apollo] fallback pass 3: removed size + consent filters — found', contacts3.length)
      return { contacts: mergeContacts(contacts3, await pdlSupplement), relaxed: 'Company size + consent filters relaxed to find results. Try widening the company size range in your ICP.' }
    }
  } catch (apolloErr) {
    // Apollo unavailable. If PDL is configured, fail over to it; else preserve the
    // original behaviour (let the credits/rate/other error propagate to the caller).
    const errMsg = apolloErr instanceof Error ? apolloErr.message : String(apolloErr)
    if (!pdlConfigured) {
      // #337④ — discovery is COMPLETELY down: Apollo errored and there is no second
      // source configured. Clients are getting zero leads. Alert, then propagate.
      alertSourceDown([
        'Apollo lead search errored and no secondary provider (PDL) is configured.',
        `Apollo error: ${errMsg}`,
        'Every client ICP run is returning zero leads until this recovers.',
      ])
      throw apolloErr
    }
    console.warn('[apollo] search failed — failing over to PDL:', errMsg)
    // Reuse the in-flight supplement fetch rather than calling PDL twice.
    const pdl = await pdlSupplement
    if (pdl.length > 0) return { contacts: pdl, relaxed: 'Sourced via the secondary data provider (Apollo was unavailable).' }
    // #337④ — both sources are down: Apollo errored AND PDL returned nothing.
    alertSourceDown([
      'Apollo lead search errored and the secondary provider (PDL) returned zero.',
      `Apollo error: ${errMsg}`,
      'Every client ICP run is returning zero leads until at least one source recovers.',
    ])
    return { contacts: [], relaxed: 'No contacts found — Apollo was unavailable and the secondary provider returned none.' }
  }

  // Apollo returned 0 across all passes — use the second source before giving up.
  if (pdlConfigured) {
    const pdl = await pdlSupplement
    if (pdl.length > 0) {
      console.log('[apollo] 0 from Apollo — PDL second-source found', pdl.length)
      return { contacts: pdl, relaxed: 'Apollo found nobody for this ICP — sourced from the secondary provider instead.' }
    }
  }

  console.log('[apollo] all passes returned 0 — no contacts found for this ICP')
  return { contacts: [], relaxed: 'No contacts found even with relaxed filters. Try broader job titles or add more geographies.' }
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

  const res = await fetch(APOLLO_PEOPLE_SEARCH, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
    body:    JSON.stringify(body),
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
  return data.contacts ?? data.people ?? []
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

export async function bulkMatchEmails(apolloIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const apiKey = process.env.APOLLO_API_KEY
  const ids = apolloIds.filter(Boolean)
  if (!apiKey || ids.length === 0) return out

  for (let i = 0; i < ids.length; i += 10) {
    const batch = ids.slice(i, i + 10)
    try {
      const res = await fetch(APOLLO_BULK_MATCH, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
        body: JSON.stringify({
          reveal_personal_emails: false,
          details: batch.map(id => ({ id })),   // match by Apollo person id
        }),
      })
      if (!res.ok) {
        console.error(`[apollo] bulk_match ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`)
        continue
      }
      // Apollo returns `matches` aligned to input order; each entry echoes the id
      // and carries the enriched person (with `email`), or null when unmatched.
      const data = await res.json() as { matches?: Array<{ id?: string; email?: string | null } | null> }
      ;(data.matches ?? []).forEach((m, idx) => {
        const apolloId = m?.id ?? batch[idx]
        const email    = m?.email
        if (apolloId && email && email.includes('@') && !email.includes('email_not_unlocked')) {
          out.set(apolloId, email)
        }
      })
    } catch (err) {
      console.error('[apollo] bulk_match batch failed:', err)
    }
  }
  console.log(`[apollo] bulk_match: revealed ${out.size} email(s) from ${ids.length} apollo id(s)`)
  return out
}
