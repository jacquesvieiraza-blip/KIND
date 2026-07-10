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

const PDL_SEARCH_URL = 'https://api.peopledatalabs.com/v5/person/search'

// ICP company-size label → PDL `job_company_size` bucket.
const PDL_SIZE_MAP: Record<string, string> = {
  '1–10': '1-10', '11–50': '11-50', '51–200': '51-200',
  '201–500': '201-500', '501–1,000': '501-1000', '1,000+': '1001-5000',
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
  'Head of':                ['director'],
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

function buildPdlBody(icp: IcpQuery, size: number) {
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
    must.push({ terms: { location_country: icp.geographies.map(g => g.toLowerCase()) } })
  }
  const sizes = icp.company_sizes.map(s => PDL_SIZE_MAP[s]).filter(Boolean)
  if (sizes.length) must.push({ terms: { job_company_size: sizes } })
  // Only return people we can actually email.
  must.push({ exists: { field: 'work_email' } })
  // NOTE: PDL deprecated `from`-based pagination — sending it 400s the whole request.
  // Page 1 only for now; deeper pages need `scroll_token` (PDL person-search docs).
  return { query: { bool: { must } }, size }
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
  | { kind: 'ok'; contacts: ApolloContact[] }
  | { kind: 'no_credit' }      // 402 — batch too big for remaining credits (or truly empty)
  | { kind: 'rate_limited' }   // 429
  | { kind: 'error' }          // anything else (incl. 404 no-match)

async function pdlSearchOnce(icp: IcpQuery, size: number, key: string): Promise<PdlOutcome> {
  try {
    const res = await fetch(PDL_SEARCH_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': key },
      body:    JSON.stringify(buildPdlBody(icp, size)),
      signal:  AbortSignal.timeout(15000),
    })
    if (res.status === 402) {
      console.warn(`[pdl] search 402 at size ${size} — batch exceeds remaining credits, will retry smaller`)
      return { kind: 'no_credit' }
    }
    if (res.status === 429) return { kind: 'rate_limited' }
    if (!res.ok) {
      console.error(`[pdl] search ${res.status}: ${(await res.text().catch(() => '')).slice(0, 240)}`)
      return { kind: 'error' }
    }
    const json = await res.json() as { data?: PdlPerson[] }
    return {
      kind: 'ok',
      contacts: (json.data ?? []).map(mapPdlToContact).filter((c): c is ApolloContact => c !== null),
    }
  } catch (err) {
    console.error('[pdl] search failed:', err instanceof Error ? err.message : err)
    return { kind: 'error' }
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

/**
 * Search PDL for people matching an ICP. Returns [] when no PDL_API_KEY is set
 * (dormant), on error, or on no matches — never throws, so it's a safe fallback.
 *
 * 402 handling: PDL rejects any batch larger than the credits remaining, so on
 * 402 we retry down a size ladder (50 → 25 → 10 → 5 → 1) and take whatever the
 * remaining balance allows instead of returning nothing. A 402 at size 1 means
 * the account is truly dry → throttled founder alert. Failed calls (402/404/429)
 * consume no PDL credits, so the ladder costs nothing extra.
 */
export async function pdlSearchPeople(icp: IcpQuery, _page = 1, size = 50): Promise<ApolloContact[]> {
  const key = process.env.PDL_API_KEY
  if (!key) return [] // dormant until a key is configured — identical to today

  const ladder = [size, 25, 10, 5, 1].filter((s, i, a) => s >= 1 && s <= size && a.indexOf(s) === i)
  let retriedRateLimit = false

  for (let i = 0; i < ladder.length; i++) {
    const outcome = await pdlSearchOnce(icp, ladder[i], key)
    if (outcome.kind === 'ok') {
      if (i > 0) console.log(`[pdl] size ladder recovered: got ${outcome.contacts.length} at size ${ladder[i]} (asked ${size})`)
      return outcome.contacts
    }
    if (outcome.kind === 'no_credit') continue // step down the ladder
    if (outcome.kind === 'rate_limited' && !retriedRateLimit) {
      // Free-tier rate limits are per-minute and tight; one paced retry at the
      // same size, then give up (the caller treats [] as "source found nothing").
      retriedRateLimit = true
      await new Promise(r => setTimeout(r, 2500))
      i-- // retry the same rung
      continue
    }
    return [] // hard error (or second 429) — logged inside pdlSearchOnce
  }

  // 402 all the way down to size 1 — the account has zero search credits left.
  alertPdlOutOfCredits()
  return []
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
