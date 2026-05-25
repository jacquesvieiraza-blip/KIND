// Apollo.io people search — maps ICP criteria to API params and normalises results

const APOLLO_BASE = 'https://api.apollo.io/v1'

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
// Handles both em-dash (–) and regular hyphen (-) variants stored by the portal
const EMPLOYEE_RANGE_MAP: Record<string, string> = {
  '1–10':      '1,10',
  '1-10':      '1,10',
  '11–50':     '11,50',
  '11-50':     '11,50',
  '51–200':    '51,200',
  '51-200':    '51,200',
  '201–500':   '201,500',
  '201-500':   '201,500',
  '501–1,000': '501,1000',
  '501-1,000': '501,1000',
  '501–1000':  '501,1000',
  '501-1000':  '501,1000',
  '1,000+':    '1001,1000000',
  '1000+':     '1001,1000000',
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
}

// ── Build the search body from an ICP record ──────────────────────────────────
// Strategy:
//   1. Job titles, seniority, geography, company size → direct Apollo filters
//   2. tech_stack + free-text keywords → q_keywords (user intent, not industry)
//   3. Industries are NOT put into q_keywords — Apollo q_keywords is AND-based
//      so "SaaS Fintech Healthtech" would match contacts mentioning ALL of them.
//      Industry filtering is handled by Apollo's industry tag system via person_titles
//      and the overall profile match, which is more accurate.
export function buildSearchBody(icp: {
  job_titles:            string[]
  seniority_levels:      string[]
  company_sizes:         string[]
  geographies:           string[]
  industries:            string[]
  tech_stack:            string[]
  keywords:              string[]
  apollo_only_consented: boolean
}, page = 1): ApolloSearchBody {
  const body: ApolloSearchBody = { page, per_page: 50 }

  if (icp.job_titles.length)
    body.person_titles = icp.job_titles

  const seniorities = icp.seniority_levels.flatMap(s => SENIORITY_MAP[s] ?? [])
  if (seniorities.length)
    body.person_seniorities = seniorities

  const employeeRanges = icp.company_sizes
    .map(s => EMPLOYEE_RANGE_MAP[s.trim()] ?? EMPLOYEE_RANGE_MAP[s.replace(/–/g, '-').trim()])
    .filter(Boolean) as string[]
  if (employeeRanges.length)
    body.organization_num_employees_ranges = employeeRanges

  if (icp.geographies.length)
    body.person_locations = icp.geographies

  // Apollo's verified/likely_to_engage emails are the closest proxy for consent
  if (icp.apollo_only_consented)
    body.contact_email_status = ['verified', 'likely_to_engage']

  // Only use tech_stack + free-text keywords in q_keywords — NOT industries
  // Industries as q_keywords creates AND logic that returns 0 results
  const kw = [...icp.tech_stack, ...icp.keywords].filter(Boolean)
  if (kw.length)
    body.q_keywords = kw.join(' ')

  return body
}

// ── Search with automatic fallback ────────────────────────────────────────────
// If the full search returns 0 results, we progressively relax constraints:
//   Pass 1: Full query (all filters)
//   Pass 2: Remove email consent filter (wider pool, still same titles/geo)
//   Pass 3: Remove employee ranges (very broad — titles + geo only)
// Each pass logs what was relaxed so the founder can tune the ICP.
export async function searchPeopleWithFallback(
  icp: Parameters<typeof buildSearchBody>[0],
  page = 1,
): Promise<{ contacts: ApolloContact[]; relaxed: string | null }> {
  // Pass 1 — full query
  const full = buildSearchBody(icp, page)
  const contacts1 = await searchPeople(full)
  if (contacts1.length > 0) return { contacts: contacts1, relaxed: null }

  // Pass 2 — remove consent filter (consent gate was cutting the pool)
  if (icp.apollo_only_consented) {
    const relaxed2 = { ...buildSearchBody(icp, page) }
    delete relaxed2.contact_email_status
    const contacts2 = await searchPeople(relaxed2)
    if (contacts2.length > 0) {
      console.log('[apollo] fallback pass 2: removed consent filter — found', contacts2.length)
      return { contacts: contacts2, relaxed: 'Consent filter relaxed to find results. Apollo-verified emails were too restrictive for this geography.' }
    }
  }

  // Pass 3 — remove employee ranges (geo + titles only)
  const relaxed3 = { ...buildSearchBody(icp, page) }
  delete relaxed3.contact_email_status
  delete relaxed3.organization_num_employees_ranges
  const contacts3 = await searchPeople(relaxed3)
  if (contacts3.length > 0) {
    console.log('[apollo] fallback pass 3: removed size + consent filters — found', contacts3.length)
    return { contacts: contacts3, relaxed: 'Company size + consent filters relaxed to find results. Try widening the company size range in your ICP.' }
  }

  console.log('[apollo] all passes returned 0 — no contacts found for this ICP')
  return { contacts: [], relaxed: 'No contacts found even with relaxed filters. Try broader job titles or add more geographies.' }
}

export async function searchPeople(body: ApolloSearchBody): Promise<ApolloContact[]> {
  const apiKey = process.env.APOLLO_API_KEY
  if (!apiKey) throw new Error('APOLLO_API_KEY env var is not set')

  const res = await fetch(`${APOLLO_BASE}/mixed_people/search`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
    body:    JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Apollo API ${res.status}: ${text}`)
  }

  const data = await res.json() as { contacts?: ApolloContact[]; people?: ApolloContact[] }
  return data.contacts ?? data.people ?? []
}
