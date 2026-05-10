const APOLLO_API = 'https://api.apollo.io/api/v1'

const COMPANY_SIZE_MAP: Record<string, string> = {
  '1–10': '1,10',
  '11–50': '11,50',
  '51–200': '51,200',
  '201–500': '201,500',
  '500+': '500,10000',
  // plain-dash fallbacks
  '1-10': '1,10',
  '11-50': '11,50',
  '51-200': '51,200',
  '201-500': '201,500',
}

export interface ApolloContact {
  first_name: string
  last_name: string
  email: string | null
  title: string | null
  linkedin_url: string | null
  organization: { name: string | null } | null
  city: string | null
  country: string | null
}

export async function searchApollo(
  icp: {
    job_titles: string[]
    industries: string[]
    locations: string[]
    company_sizes: string[]
    keywords: string[]
  },
  perPage = 25
): Promise<ApolloContact[]> {
  const apiKey = process.env.APOLLO_API_KEY
  if (!apiKey) throw new Error('APOLLO_API_KEY not configured')

  const body: Record<string, unknown> = {
    api_key: apiKey,
    page: 1,
    per_page: Math.min(perPage, 100),
    person_titles: icp.job_titles,
    person_locations: icp.locations.length ? icp.locations : undefined,
    organization_num_employees_ranges: icp.company_sizes
      .map((s) => COMPANY_SIZE_MAP[s])
      .filter(Boolean),
    q_keywords: [...icp.industries, ...icp.keywords].filter(Boolean).join(' ') || undefined,
  }

  const res = await fetch(`${APOLLO_API}/mixed_people/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Apollo API ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json() as { people?: ApolloContact[] }
  return data.people ?? []
}
