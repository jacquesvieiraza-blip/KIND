// #615 — THE COMPANY DETAILS THAT DECIDE HOW A CLIENT IS INVOICED.
//
// Founder-ruled 4 Aug: *"as part of onboarding we capture their company information in
// documents section… I would say all clients."*
//
// ⚠️ WHY THIS IS A TAX QUESTION, NOT A FORM-FIELD QUESTION. We are a UK Ltd selling a service.
// For a **business** customer the place of supply is where the CUSTOMER belongs, so an overseas
// business is outside UK VAT and an EU business self-accounts under the reverse charge. But the
// evidence rule is unforgiving: **you must hold proof the customer is a business** — a VAT or
// tax registration number, or equivalent. **With no proof, they are treated as a consumer and
// VAT is charged.**
//
// Today `company_registration` and `vat_number` exist on `clients` as OPTIONAL fields on a
// Settings page nobody is required to visit. So the default state of every client is
// *"undocumented"*, which is the state that costs 20%.
//
// ── THE SOLE-TRADER PROBLEM, AND WHY A CHECKBOX RATHER THAN A BLANK ──────────────────────
//
// A legitimate client may genuinely have no VAT number — a sole trader under the threshold, or
// a company in a country without one. Forcing a value would make them invent one, and an
// invented tax ID is **worse than a blank**: it looks like evidence, so nobody chases it, and
// it is the thing an auditor reads.
//
// So "not registered" is an EXPLICIT, RECORDED answer rather than an empty field. Blank means
// *nobody asked*; the sentinel means *we asked and this is the answer*. Those are different
// facts and the invoice treatment differs, so they must be different values.
//
// ⚠️ A SENTINEL, NOT A COLUMN — the schema is frozen (no dashboard, no password,
// `DATABASE_URL` is a placeholder), so a `vat_registered boolean` cannot be added. Same shape
// as `PERIOD_END_SENTINEL` in `signup-subscription.ts`: a reserved value in an existing column,
// documented loudly, replaced by a real column the day migrations return.

/** Stored in `clients.vat_number` to mean "we asked; they are not VAT-registered". */
export const NOT_VAT_REGISTERED = 'NOT_REGISTERED'

export type CompanyDetailsInput = {
  company_name?: unknown
  company_registration?: unknown
  vat_number?: unknown
  /** True when the client ticked "we are not VAT/tax registered". */
  not_vat_registered?: unknown
}

export type CompanyDetails = {
  company_name: string
  company_registration: string
  /** Either a real number, or NOT_VAT_REGISTERED. Never empty on a completed record. */
  vat_number: string
}

/**
 * Validate the onboarding company step, returning EVERY problem at once.
 *
 * A form that reveals its objections one at a time is a form you fill in four times — the same
 * rule `parseMailboxInput` follows.
 */
export function parseCompanyDetails(a: CompanyDetailsInput): { ok: true; value: CompanyDetails } | { ok: false; errors: string[] } {
  const errors: string[] = []

  const company_name = String(a.company_name ?? '').trim()
  if (company_name.length < 2) {
    errors.push('Your company\'s legal name is required — the name on your registration, not a trading name.')
  }

  const company_registration = String(a.company_registration ?? '').trim()
  if (company_registration.length < 2) {
    errors.push('Your company registration number is required. It is what proves you are a business rather than an individual, and it is what keeps VAT off your invoice.')
  }

  const notRegistered = a.not_vat_registered === true || a.not_vat_registered === 'true'
  const rawVat = String(a.vat_number ?? '').trim()

  let vat_number: string
  if (notRegistered) {
    // ⚠️ THE TICK WINS, and it is checked FIRST. If someone ticks the box AND leaves a stale
    // number in the field, honouring the number would record a registration they have just
    // told us they do not have.
    vat_number = NOT_VAT_REGISTERED
    if (rawVat && rawVat !== NOT_VAT_REGISTERED) {
      errors.push('You have ticked "not VAT registered" but also entered a VAT number. Clear one of them — we record what you tell us, and those two things cannot both be true.')
    }
  } else if (!rawVat) {
    errors.push('Enter your VAT or tax registration number — or tick "we are not VAT/tax registered" if you do not have one. A blank means nobody asked; the tick means you answered.')
    vat_number = ''
  } else if (rawVat === NOT_VAT_REGISTERED) {
    // Typing the sentinel by hand would forge the answer.
    errors.push('That is a reserved value. Tick "we are not VAT/tax registered" instead.')
    vat_number = ''
  } else {
    vat_number = rawVat
  }

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, value: { company_name, company_registration, vat_number } }
}

/** A client record, reduced to the fields this module judges. */
export type CompanyDetailsRow = {
  company_name?: string | null
  company_registration?: string | null
  vat_number?: string | null
}

/**
 * Has this client given us what we need to invoice them correctly?
 *
 * ⚠️ READ-ONLY JUDGEMENT. It gates ONE thing — whether the onboarding step is complete. It must
 * never gate an approval, a payment or a send: an existing client who signed up before this
 * existed has empty fields, and locking them out of the product they pay for because of a form
 * would be a far worse bug than the one this fixes. Enforcement beyond onboarding is a founder
 * decision, deliberately not taken here.
 */
export function hasCompanyDetails(c: CompanyDetailsRow | null | undefined): boolean {
  if (!c) return false
  return String(c.company_name ?? '').trim().length >= 2
    && String(c.company_registration ?? '').trim().length >= 2
    && String(c.vat_number ?? '').trim().length > 0
}

/** Is this client VAT-registered, as far as we have been told? */
export function vatStatus(c: CompanyDetailsRow | null | undefined): 'registered' | 'not_registered' | 'unknown' {
  const v = String(c?.vat_number ?? '').trim()
  if (!v) return 'unknown'
  return v === NOT_VAT_REGISTERED ? 'not_registered' : 'registered'
}

/** One founder-plain line for the Vida operator badge. */
export function vatBadge(c: CompanyDetailsRow | null | undefined): { label: string; tone: 'ok' | 'amber' | 'grey' } {
  switch (vatStatus(c)) {
    case 'registered':     return { label: 'tax ID on file', tone: 'ok' }
    case 'not_registered': return { label: 'not VAT registered (declared)', tone: 'grey' }
    default:               return { label: 'no tax ID', tone: 'amber' }
  }
}
