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
// NOTE: the field/vocab mapping below is built to PDL's documented schema; tune it
// against live responses once a key is configured (it's untestable while dormant).
// Ref: https://docs.peopledatalabs.com/docs/person-search-api
// ─────────────────────────────────────────────────────────────────────────────
import type { ApolloContact } from './apollo'

const PDL_SEARCH_URL = 'https://api.peopledatalabs.com/v5/person/search'

// ICP company-size label → PDL `job_company_size` bucket.
const PDL_SIZE_MAP: Record<string, string> = {
  '1–10': '1-10', '11–50': '11-50', '51–200': '51-200',
  '201–500': '201-500', '501–1,000': '501-1000', '1,000+': '1001-5000',
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
    must.push({ terms: { job_company_industry: icp.industries.map(i => i.toLowerCase()) } })
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
): Promise<{ configured: boolean; ok: boolean; status: number | null; count: number; error: string | null }> {
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
    return { configured: true, ok: true, status: res.status, count: json.total ?? json.data?.length ?? 0, error: null }
  } catch (err) {
    return { configured: true, ok: false, status: null, count: 0, error: err instanceof Error ? err.message : 'request failed' }
  }
}

/**
 * Search PDL for people matching an ICP. Returns [] when no PDL_API_KEY is set
 * (dormant), on error, or on no matches — never throws, so it's a safe fallback.
 */
export async function pdlSearchPeople(icp: IcpQuery, _page = 1, size = 50): Promise<ApolloContact[]> {
  const key = process.env.PDL_API_KEY
  if (!key) return [] // dormant until a key is configured — identical to today

  const body = buildPdlBody(icp, size)

  try {
    const res = await fetch(PDL_SEARCH_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': key },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(15000),
    })
    if (!res.ok) {
      console.error(`[pdl] search ${res.status}: ${(await res.text().catch(() => '')).slice(0, 240)}`)
      return []
    }
    const json = await res.json() as { data?: PdlPerson[] }
    return (json.data ?? [])
      .map(mapPdlToContact)
      .filter((c): c is ApolloContact => c !== null)
  } catch (err) {
    console.error('[pdl] search failed:', err instanceof Error ? err.message : err)
    return []
  }
}

// Normalise a PDL person into the shared ApolloContact shape the pipeline expects.
function mapPdlToContact(p: PdlPerson): ApolloContact | null {
  if (!p.first_name && !p.last_name) return null
  const email = p.work_email ?? p.emails?.find(e => e.address)?.address ?? null
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
