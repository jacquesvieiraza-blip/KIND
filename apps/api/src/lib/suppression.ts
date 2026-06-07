// ── DO-NOT-CONTACT SUPPRESSION ───────────────────────────────────────────────
// Hard compliance guard: K.I.N.D must NEVER source or contact anyone connected to
// the founder's employer (Smartsheet) — by email, LinkedIn, or any other channel.
// This is checked at BOTH ends (drop at sourcing, refuse at send) so a single
// miss can never leak through.
//
// The floor list is hard-coded so it can never be accidentally removed. Extra
// domains can be added via the SUPPRESSED_DOMAINS env var (comma-separated) with
// no code change.

const SUPPRESSED_FLOOR = [
  'smartsheet.com',
  'brandfolder.com',
  'outfit.io',
  'slopeapp.com',
]

export function suppressedDomains(): string[] {
  const extra = (process.env.SUPPRESSED_DOMAINS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
  return Array.from(new Set([...SUPPRESSED_FLOOR, ...extra]))
}

/**
 * True if this person is on the do-not-contact list — matched broadly on purpose
 * (better to over-block than ever contact them): the email domain, OR the company
 * / LinkedIn / website containing a suppressed domain or its brand name.
 */
export function isSuppressed(opts: {
  email?:    string | null
  company?:  string | null
  linkedin?: string | null
  website?:  string | null
}): boolean {
  const domains = suppressedDomains()
  const emailDomain = opts.email?.split('@')[1]?.toLowerCase().trim() ?? ''
  const blob = [opts.company, opts.linkedin, opts.website]
    .filter(Boolean).join(' ').toLowerCase()

  return domains.some(d => {
    const brand = d.split('.')[0]                       // e.g. "smartsheet"
    return emailDomain === d
        || emailDomain.endsWith('.' + d)                 // sub.smartsheet.com
        || blob.includes(d)                              // domain anywhere in text
        || blob.includes(brand)                          // brand name in company/linkedin
  })
}
