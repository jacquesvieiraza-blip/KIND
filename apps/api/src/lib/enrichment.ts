// P2-5: Waterfall enrichment — Apollo → PDL → Hunter → Clearbit → Claude fallback
// Each provider fills missing fields. First successful hit wins per field.

export interface EnrichmentResult {
  email?: string
  phone?: string
  company_size?: string
  industry?: string
  tech_stack?: string[]
  linkedin_url?: string
  domain?: string
  source: 'apollo' | 'pdl' | 'hunter' | 'clearbit' | 'claude' | 'none'
  raw?: Record<string, unknown>
}

// A real, usable email address — NOT PDL's free-tier boolean presence flag
// (the 244 bug: PDL returns `work_email: true` when the address is gated, which
// must never be treated as an email). Anything that isn't a string with '@' is rejected.
export function isRealEmail(v: unknown): v is string {
  return typeof v === 'string' && v.includes('@') && v.length > 3
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
        work_email?: unknown        // free tier returns boolean `true` (presence), paid returns the address
        mobile_phone?: string
        industry?: string
        job_company_employee_count?: number
        job_company_website?: string
        skills?: string[]
        linkedin_url?: string
      }
      likelihood?: number
    }
    if ((json.likelihood ?? 0) < 6 || !json.data) return null

    const d = json.data
    const result: EnrichmentResult = { source: 'pdl' }
    if (isRealEmail(d.work_email))     result.email = d.work_email   // guard: never accept the boolean flag
    if (d.mobile_phone)                result.phone = d.mobile_phone
    if (d.industry)                    result.industry = d.industry
    if (d.linkedin_url)                result.linkedin_url = d.linkedin_url
    if (d.job_company_website)         result.domain = normalizeDomain(d.job_company_website)  // feed Hunter a REAL domain
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

// Fill any field on `merged` that is still empty from `result`. Email is guarded so a
// provider's non-string (PDL boolean) can never land as the address.
function mergeInto(merged: EnrichmentResult, result: EnrichmentResult | null): void {
  if (!result) return
  if (!merged.email        && isRealEmail(result.email))  { merged.email        = result.email;        merged.source = result.source }
  if (!merged.phone        && result.phone)               { merged.phone        = result.phone;        merged.source = result.source }
  if (!merged.company_size && result.company_size)        { merged.company_size = result.company_size; merged.source = result.source }
  if (!merged.industry     && result.industry)            { merged.industry     = result.industry;     merged.source = result.source }
  if (!merged.tech_stack   && result.tech_stack)          { merged.tech_stack   = result.tech_stack;   merged.source = result.source }
  if (!merged.linkedin_url && result.linkedin_url)        { merged.linkedin_url = result.linkedin_url; merged.source = result.source }
  if (!merged.domain       && result.domain)              { merged.domain       = result.domain }
}

// Waterfall EMAIL-REVEAL (item 243): PDL first (profile + maybe a real email + a real
// company domain) → if the email is still missing, Hunter reveals it by name + that
// domain → Clearbit enriches once we have an email. The old version ran all three in
// parallel, so Hunter never had PDL's domain and PDL's boolean flag was treated as an
// email — both fixed here.
export async function waterfallEnrich(lead: LeadProfile): Promise<EnrichmentResult> {
  const merged: EnrichmentResult = { source: 'none' }
  if (isRealEmail(lead.email)) merged.email = lead.email

  // 1. PDL — profile, possibly a real work_email, and (key) the real company domain.
  mergeInto(merged, await tryPDL(lead))

  // 2. Still no email? Reveal it via Hunter — but Hunter needs a REAL domain.
  //    Resolve the best one we can (this is the email-reveal DEPTH fix, item 243).
  if (!merged.email) {
    const domain = await resolveDomain(lead.domain ?? merged.domain, lead.company)
    if (domain) {
      merged.domain = merged.domain ?? domain
      mergeInto(merged, await tryHunter({ ...lead, domain }))
    }
  }

  // 3. Clearbit — enrich phone/firmographics once we have any email to key on.
  const email = isRealEmail(lead.email) ? lead.email : merged.email
  if (email) mergeInto(merged, await tryClearbit({ ...lead, email }))

  return merged
}

// Resolve a REAL company domain for Hunter's email-finder (the email-reveal DEPTH fix,
// item 243). Priority: a known domain (caller / PDL website) → Clearbit's FREE company
// autocomplete (name → domain, NO api key) → a rough last-resort guess. The Clearbit
// step is what turns "SimplePay" into "simplepay.co.za" instead of a wrong ".com" guess.
export async function resolveDomain(known?: string | null, company?: string | null): Promise<string | undefined> {
  const n = normalizeDomain(known)
  if (n) return n

  if (company && company.trim()) {
    try {
      const url = `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(company.trim())}`
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
      if (res.ok) {
        const arr = await res.json() as Array<{ domain?: string; name?: string }>
        const hit = arr.find((c) => typeof c.domain === 'string' && c.domain.includes('.'))
        if (hit?.domain) return normalizeDomain(hit.domain)
      }
    } catch { /* fall through to the heuristic */ }
  }

  return extractDomain(company) ?? undefined
}

// Turn a PDL company website ("https://www.simplepay.co.za/pricing") into a bare
// domain ("simplepay.co.za") that Hunter's email-finder accepts.
export function normalizeDomain(website?: string | null): string | undefined {
  if (!website) return undefined
  let d = website.trim().toLowerCase()
  d = d.replace(/^https?:\/\//, '').replace(/^www\./, '')
  d = d.split('/')[0].split('?')[0].trim()
  return d || undefined
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
