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
  /**
   * Set when a provider reported a data-subject objection for this identity. When present the
   * result is deliberately EMPTY — see `waterfallEnrich`. Callers that ignore it behave exactly
   * as they do for any other "no email found", which is the correct outcome.
   */
  refusal?: ProviderRefusal
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

// ── UPSTREAM PRIVACY REFUSALS — PER PROVIDER, NEVER GENERIC ────────────────────────────────
//
// A data provider can tell us that a person has asked to stop being processed. That is not an
// API error; it is a DATA-SUBJECT SIGNAL arriving through an error channel, and it is the only
// route by which an upstream deletion request ever reaches this product.
//
// ⚠️ THE RULE THIS TABLE EXISTS TO ENFORCE: **A STATUS CODE HAS NO INHERENT PRIVACY MEANING.**
//
// HTTP 451 means "unavailable for legal reasons" — a copyright takedown, a geo-block and a
// data-subject erasure request all live under it. Hunter's 451 means do-not-process ONLY
// because Hunter's own documentation says so, in those words. A future provider's 451 might
// mean a court order about a company, or a sanctions block, or nothing about a person at all.
//
// So the meaning is keyed on the PROVIDER and carries the quotation that justifies it. Adding
// a provider here means reading THAT provider's documentation and pasting what it actually
// says — never inheriting a mapping because the number matches. `enrichment-dsr.test.ts`
// fails the build if an entry has no quoted basis.
//
// ⚠️ THIS IS AN INBOUND SIGNAL ONLY. It tells us to stop processing what we ASK FOR. It is not
// an opt-out from our sending (that is `opt_out_blocklist`, and nothing here writes to it) and
// it does not reach backwards into `lead_pool` rows we cached before the person objected.
// That gap is real, is the reason `docs/compliance/UPSTREAM-DSR-PROPAGATION.md` exists, and is
// covered by a MANUAL rule there until tooling exists.

export type ProviderRefusal = {
  provider: 'hunter'
  /** Machine-readable class, in the `enrol_skips` shape an operator already reads. */
  code: string
  /** The provider's OWN words. Never a paraphrase — a paraphrase is how a mapping drifts. */
  basis: string
  /** Where that wording came from, so the next reader can re-check it. */
  source: string
}

/**
 * Hunter.io — VERIFIED 20 Aug 2026 by fetching their live API reference (HTTP 200), not from
 * memory and not from the prompt that asked for this.
 *
 * Their documentation, verbatim:
 *
 *   451 claimed_email — "The person owning the email address asked us directly or indirectly
 *   to stop the processing of their personal data. For this reason, you shouldn't process it
 *   yourself in any way."
 *
 * ⚠️ NOTE THE LAST CLAUSE. Hunter is not merely declining to answer — they are instructing us
 * about OUR OWN processing. That is what makes discarding the whole enrichment the correct
 * response rather than an over-reaction.
 *
 * ⚠️ A SECOND HUNTER SIGNAL EXISTS AND IS DELIBERATELY NOT HANDLED. Their `400 invalid_domain`
 * reads: "The domain name is invalid, has no MX record **or its owner has asked us to stop the
 * processing of the associated data**" — a domain-level suppression request conflated with an
 * ordinary bad domain, in one code. The two are indistinguishable from outside, so mapping it
 * would suppress every typo'd domain as a legal refusal. Founder-ruled 20 Aug: document only.
 * It is written up in UPSTREAM-DSR-PROPAGATION.md rather than left as folklore.
 */
export const HUNTER_CLAIMED_EMAIL: ProviderRefusal = {
  provider: 'hunter',
  code: 'provider_refusal:hunter:claimed_email',
  basis:
    'The person owning the email address asked us directly or indirectly to stop the ' +
    "processing of their personal data. For this reason, you shouldn't process it yourself in any way.",
  source: 'hunter.io/api-documentation/v2 — 451 claimed_email (fetched live 20 Aug 2026)',
}

/**
 * Does THIS provider's response carry a documented privacy refusal?
 *
 * Keyed on the provider by construction: there is no `if (status === 451)` anywhere outside a
 * provider's own branch, so a new provider's 451 cannot inherit Hunter's meaning by accident.
 */
export function hunterRefusal(status: number, body: unknown): ProviderRefusal | null {
  if (status !== 451) return null
  // Hunter returns the class in `errors[].id`. Accept the 451 alone as sufficient — their
  // top-level 451 is documented as "We have been requested not to process personal
  // identifiable information linked to this person", so both forms are the same signal — but
  // read the id when present so the log says which one arrived.
  const id = (body as { errors?: { id?: string }[] } | null)?.errors?.[0]?.id
  return id && id !== 'claimed_email'
    ? { ...HUNTER_CLAIMED_EMAIL, code: `provider_refusal:hunter:${id}` }
    : HUNTER_CLAIMED_EMAIL
}

// Hunter.io: find email by name + domain
async function tryHunter(lead: LeadProfile): Promise<EnrichmentResult | ProviderRefusal | null> {
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
    if (!res.ok) {
      // ⚠️ A 451 IS NOT AN ERROR. It is a person's erasure request arriving through an error
      // channel, and this line used to flatten it into the same `null` as a 404, a 429 and a
      // 500 — so the one response in this whole file that carries a legal instruction was the
      // one we discarded most completely.
      //
      // Read only on THIS branch, from Hunter's own documented meaning. No other provider's
      // non-OK path consults it (see the table above).
      const refusal = hunterRefusal(res.status, await res.json().catch(() => null))
      if (refusal) return refusal
      return null
    }
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
      const hunter = await tryHunter({ ...lead, domain })

      // ── THE UPSTREAM ERASURE SIGNAL, AND WHY IT DISCARDS EVERYTHING ──────────────────────
      //
      // Hunter has told us this person asked to stop being processed, and their documentation
      // says in terms: "you shouldn't process it yourself in any way."
      //
      // ⚠️ DISCARDING ONLY HUNTER'S CONTRIBUTION WOULD MISS THE POINT ENTIRELY, and it is the
      // obvious wrong fix. **PDL runs at step 1, BEFORE this.** So by the time the refusal
      // arrives we are already holding a PDL profile — job title, company, domain, sometimes
      // an address — for the very person we have just been told not to process. Returning
      // that, minus Hunter's email, would be honouring the letter of the refusal while
      // handing back a dossier on the same human.
      //
      // So the whole merged result is dropped and `{ source: 'none' }` is returned. Every
      // caller already handles "no email" as an ordinary outcome — `approve-lead.ts` reverses
      // the $4 and returns `no_email`, which is the correct commercial answer too: the client
      // is not charged for a lead nobody may contact.
      //
      // Founder-ruled 20 Aug: *"1. discard all."*
      //
      // ⚠️ WHAT THIS DOES NOT DO, stated so nobody believes more is covered than is. It does
      // NOT write to `opt_out_blocklist` (that is OUR sending suppression, a different
      // register with a different meaning), and it does NOT reach backwards into `lead_pool`
      // rows cached before the person objected. Both gaps are real; both are documented with
      // an interim MANUAL rule in `docs/compliance/UPSTREAM-DSR-PROPAGATION.md`.
      if (hunter && 'provider' in hunter) {
        console.warn(
          `[enrichment] ${hunter.code} — ${lead.first_name} ${lead.last_name} @ ${domain}: ` +
          `upstream provider reports a data-subject objection. Enrichment DISCARDED, nothing persisted. ` +
          `Basis (${hunter.source}): ${hunter.basis}`,
        )
        return { source: 'none', refusal: hunter }
      }
      mergeInto(merged, hunter)
    }
  }

  // 3. Clearbit — enrich phone/firmographics once we have any email to key on.
  const email = isRealEmail(lead.email) ? lead.email : merged.email
  if (email) mergeInto(merged, await tryClearbit({ ...lead, email }))

  return merged
}

// DIAGNOSTIC (item 243): runs the same email-reveal path but SURFACES every step —
// did PDL return a website, what domain did we resolve, did Hunter run, what did it
// say — so we can see WHY an email is/isn't found instead of guessing. Admin-only.
export async function revealTrace(lead: LeadProfile): Promise<Record<string, unknown>> {
  const t: Record<string, unknown> = { company: lead.company ?? null }
  const pdl = await tryPDL(lead)
  t.pdl_returned   = !!pdl
  t.pdl_website    = pdl?.domain ?? null
  t.pdl_email_real = isRealEmail(pdl?.email)

  const domain = await resolveDomain(lead.domain ?? pdl?.domain, lead.company)
  t.resolvedDomain = domain ?? null
  t.domain_source  = lead.domain ? 'caller' : pdl?.domain ? 'pdl_website' : domain ? 'autocomplete_or_heuristic' : 'none'

  const key = process.env.HUNTER_API_KEY
  if (!key)        { t.hunter = 'HUNTER_API_KEY not set'; return t }
  if (!domain)     { t.hunter = 'skipped — no domain resolved'; return t }
  try {
    const url = new URL('https://api.hunter.io/v2/email-finder')
    url.searchParams.set('domain', domain)
    url.searchParams.set('first_name', lead.first_name)
    url.searchParams.set('last_name', lead.last_name)
    url.searchParams.set('api_key', key)
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
    const j = await res.json().catch(() => null) as { data?: { email?: string; score?: number }; errors?: unknown } | null
    // NAME the refusal here too. This is the admin diagnostic, and an operator reading a bare
    // `status: 451` alongside a `502` and a `429` has no way to know that ONE of those three is
    // a person's erasure request rather than a flaky upstream. The trace itself is NOT stripped
    // — hiding data from the tool whose only job is to explain what happened would make it
    // useless — but the label makes the meaning unmissable, and it says the enrichment path
    // discards this identity so nobody "retries" it as a transient failure.
    const refusal = hunterRefusal(res.status, j)
    t.hunter = {
      status: res.status,
      email:  j?.data?.email ?? null,
      score:  j?.data?.score ?? null,
      error:  res.ok ? null : JSON.stringify(j?.errors ?? j ?? '').slice(0, 200),
      ...(refusal ? {
        privacy_refusal: refusal.code,
        meaning: `${refusal.basis} (${refusal.source})`,
        note: 'waterfallEnrich DISCARDS the whole enrichment for this identity — do not retry, this is not a transient failure.',
      } : {}),
    }
  } catch (e) {
    t.hunter = { error: e instanceof Error ? e.message : 'hunter request failed' }
  }
  return t
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
