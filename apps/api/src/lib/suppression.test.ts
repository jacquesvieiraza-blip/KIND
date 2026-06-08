import { describe, it, expect } from 'vitest'
import { isSuppressed, suppressedDomains } from './suppression'

// Derive the protected domains at runtime (decoded from the base64 floor) so the
// employer's name is never written into committed source — see the scrub policy.
const floor = suppressedDomains()
const employerDomain = floor[0]
const employerBrand = employerDomain.split('.')[0]

describe('do-not-contact suppression guard', () => {
  it('blocks the employer email domain', () => {
    expect(isSuppressed({ email: `someone@${employerDomain}` })).toBe(true)
  })

  it('blocks a subdomain of the employer', () => {
    expect(isSuppressed({ email: `x@eu.${employerDomain}` })).toBe(true)
  })

  it('blocks when the brand appears in company / linkedin text', () => {
    expect(isSuppressed({ company: `${employerBrand} EMEA` })).toBe(true)
    expect(isSuppressed({ linkedin: `linkedin.com/company/${employerBrand}` })).toBe(true)
  })

  it('blocks every sister domain in the hard floor', () => {
    for (const d of floor) {
      expect(isSuppressed({ email: `a@${d}` })).toBe(true)
    }
  })

  it('allows unrelated contacts', () => {
    expect(isSuppressed({ email: 'someone@randomco.com', company: 'Random Co' })).toBe(false)
  })

  it('honours SUPPRESSED_DOMAINS env additions', () => {
    process.env.SUPPRESSED_DOMAINS = 'acme.com'
    expect(isSuppressed({ email: 'z@acme.com' })).toBe(true)
    delete process.env.SUPPRESSED_DOMAINS
  })
})
