// P2-5: Waterfall enrichment — Apollo → PDL → Hunter → Clearbit → Claude fallback
// Each provider fills missing fields. First successful hit wins per field.

export interface EnrichmentResult {
  email?: string
  phone?: string
  company_size?: string
  industry?: string
  tech_stack?: string[]
  linkedin_url?: string
  source: 'apollo' | 'pdl' | 'hunter' | 'clearbit' | 'claude' | 'none'
  raw?: Record<string, unknown>
}

export interface LeadProfile {
  first_name: string
  last_name: string
  company?: string | null
  email?: string | null
  linkedin_url?: string | null
  domain?: string | null
}

// Hunter.io: find email by name + domain
async function tryHunter(lead: LeadProfile): Promise<EnrichmentResult | null> {
  const key = process.env.HUNTER_API_KEY
  if (!key) return null

  const domain = lead.domain ?? extractDomain(lead.company)
  if (!domain) return null

  try {
    const url = new URL('https://api.hunter.io/v2/email-finder')
    url.searchParams.set('domain', domain)
    url.searchParams.set('first_name', lead.first_name)
    url.searchParams.set('last_name', lead.last_name)
    url.searchParams.set('api_key', key)

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const json = await res.json() as { data?: { email?: string; score?: number } }
    const email = json.data?.email
    if (!email || (json.data?.score ?? 0) < 50) return null
    return { email, source: 'hunter' }
  } catch {
    return null
  }
}

// People Data Labs: full profile enrichment
async function tryPDL(lead: LeadProfile): Promise<EnrichmentResult | null> {
  const key = process.env.PDL_API_KEY
  if (!key) return null

  try {
    const params: Record<string, string> = {
      first_name: lead.first_name,
      last_name: lead.last_name,
    }
    if (lead.company)      params.company = lead.company
    if (lead.email)        params.email = lead.email
    if (lead.linkedin_url) params.profile = lead.linkedin_url

    const url = new URL('https://api.peopledatalabs.com/v5/person/enrich')
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

    const res = await fetch(url.toString(), {
      headers: { 'X-Api-Key': key },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const json = await res.json() as {
      data?: {
        work_email?: string
        mobile_phone?: string
        industry?: string
        job_company_employee_count?: number
        skills?: string[]
        linkedin_url?: string
      }
      likelihood?: number
    }
    if ((json.likelihood ?? 0) < 6 || !json.data) return null

    const d = json.data
    const result: EnrichmentResult = { source: 'pdl' }
    if (d.work_email)                  result.email = d.work_email
    if (d.mobile_phone)                result.phone = d.mobile_phone
    if (d.industry)                    result.industry = d.industry
    if (d.linkedin_url)                result.linkedin_url = d.linkedin_url
    if (d.job_company_employee_count)  result.company_size = employeeCountToRange(d.job_company_employee_count)
    if (d.skills?.length)              result.tech_stack = d.skills.slice(0, 10)
    return result
  } catch {
    return null
  }
}

// Clearbit: company + person enrichment
async function tryClearbit(lead: LeadProfile): Promise<EnrichmentResult | null> {
  const key = process.env.CLEARBIT_API_KEY
  if (!key) return null
  if (!lead.email) return null

  try {
    const res = await fetch(`https://person.clearbit.com/v2/combined/find?email=${encodeURIComponent(lead.email)}`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const json = await res.json() as {
      person?: { phone?: string; linkedin?: { handle?: string } }
      company?: { metrics?: { employees?: number }; category?: { industry?: string }; tech?: string[] }
    }

    const result: EnrichmentResult = { source: 'clearbit' }
    if (json.person?.phone) result.phone = json.person.phone
    if (json.company?.metrics?.employees) result.company_size = employeeCountToRange(json.company.metrics.employees)
    if (json.company?.category?.industry) result.industry = json.company.category.industry
    if (json.company?.tech?.length) result.tech_stack = json.company.tech.slice(0, 10)
    if (json.person?.linkedin?.handle) result.linkedin_url = `https://linkedin.com/in/${json.person.linkedin.handle}`
    return result
  } catch {
    return null
  }
}

// Waterfall: try each provider, merge non-null fields
export async function waterfallEnrich(lead: LeadProfile): Promise<EnrichmentResult> {
  const merged: EnrichmentResult = { source: 'none' }

  const missingEmail      = !lead.email

  // Run PDL + Hunter + Clearbit in parallel to save time
  const [pdl, hunter, clearbit] = await Promise.all([
    tryPDL(lead),
    missingEmail ? tryHunter(lead) : Promise.resolve(null),
    lead.email   ? tryClearbit(lead) : Promise.resolve(null),
  ])

  // Merge in order of quality: PDL > Clearbit > Hunter
  for (const result of [pdl, clearbit, hunter]) {
    if (!result) continue
    if (!merged.email         && result.email)        { merged.email        = result.email;        merged.source = result.source }
    if (!merged.phone         && result.phone)        { merged.phone        = result.phone;        merged.source = result.source }
    if (!merged.company_size  && result.company_size) { merged.company_size = result.company_size; merged.source = result.source }
    if (!merged.industry      && result.industry)     { merged.industry     = result.industry;     merged.source = result.source }
    if (!merged.tech_stack    && result.tech_stack)   { merged.tech_stack   = result.tech_stack;   merged.source = result.source }
    if (!merged.linkedin_url  && result.linkedin_url) { merged.linkedin_url = result.linkedin_url; merged.source = result.source }
  }

  return merged
}

function extractDomain(company?: string | null): string | null {
  if (!company) return null
  // Very rough heuristic — works for known company names
  return company.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com'
}

function employeeCountToRange(n: number): string {
  if (n <= 10)   return '1-10'
  if (n <= 50)   return '11-50'
  if (n <= 200)  return '51-200'
  if (n <= 1000) return '201-1000'
  return '1001+'
}
