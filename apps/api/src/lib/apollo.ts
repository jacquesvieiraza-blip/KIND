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
const EMPLOYEE_RANGE_MAP: Record<string, string> = {
  '1–10':      '1,10',
  '11–50':     '11,50',
  '51–200':    '51,200',
  '201–500':   '201,500',
  '501–1,000': '501,1000',
  '1,000+':    '1001,1000000',
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
}, page = 1): ApolloSearchBody {
  const body: ApolloSearchBody = { page, per_page: 50 }

  if (icp.job_titles.length)
    body.person_titles = icp.job_titles

  const seniorities = icp.seniority_levels.flatMap(s => SENIORITY_MAP[s] ?? [])
  if (seniorities.length)
    body.person_seniorities = seniorities

  const employeeRanges = icp.company_sizes.map(s => EMPLOYEE_RANGE_MAP[s]).filter(Boolean)
  if (employeeRanges.length)
    body.organization_num_employees_ranges = employeeRanges

  if (icp.geographies.length)
    body.person_locations = icp.geographies

  // Apollo's verified/likely_to_engage emails are the closest proxy for consent
  if (icp.apollo_only_consented)
    body.contact_email_status = ['verified', 'likely_to_engage']

  const kw = [...icp.industries, ...icp.tech_stack, ...icp.keywords].filter(Boolean)
  if (kw.length)
    body.q_keywords = kw.join(' ')

  return body
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
