// ── DO-NOT-CONTACT SUPPRESSION ───────────────────────────────────────────────
// Hard compliance guard: K.I.N.D must NEVER source or contact anyone connected to
// the founder's employer — by email, LinkedIn, or any other channel. This is
// checked at BOTH ends (drop at sourcing, refuse at send) so a single miss can
// never leak through.
//
// The floor list is hard-coded so the protection can NEVER be accidentally removed
// or disabled (it does not depend on any env var being set). The entries are
// base64-encoded — not for secrecy, only to keep the employer's name out of
// plaintext source — and decoded once at load. Extra domains can be added via the
// SUPPRESSED_DOMAINS env var (comma-separated) with no code change.

// base64-encoded employer + sister domains. Decoded at load; protection is identical.
const SUPPRESSED_FLOOR_B64 = [
  'c21hcnRzaGVldC5jb20=',
  'YnJhbmRmb2xkZXIuY29t',
  'b3V0Zml0Lmlv',
  'c2xvcGVhcHAuY29t',
]

const SUPPRESSED_FLOOR = SUPPRESSED_FLOOR_B64.map(b64 =>
  Buffer.from(b64, 'base64').toString('utf8').toLowerCase(),
)

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
    const brand = d.split('.')[0]                       // e.g. the company brand
    return emailDomain === d
        || emailDomain.endsWith('.' + d)                 // sub.domain.com
        || blob.includes(d)                              // domain anywhere in text
        || blob.includes(brand)                          // brand name in company/linkedin
  })
}
