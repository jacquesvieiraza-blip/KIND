import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { isRealEmail, normalizeDomain, resolveDomain, waterfallEnrich } from './enrichment'

// ── Pure-guard tests (the 244 bug) ───────────────────────────────────────────
describe('isRealEmail — guards the PDL free-tier boolean', () => {
  it('rejects PDL boolean work_email (the 244 bug: work_email = true)', () => {
    expect(isRealEmail(true)).toBe(false)
    expect(isRealEmail(false)).toBe(false)
  })
  it('rejects non-string / empty', () => {
    expect(isRealEmail(null)).toBe(false)
    expect(isRealEmail(undefined)).toBe(false)
    expect(isRealEmail(123)).toBe(false)
    expect(isRealEmail('')).toBe(false)
    expect(isRealEmail('notanemail')).toBe(false)
  })
  it('accepts a real address', () => {
    expect(isRealEmail('dave@simplepay.co.za')).toBe(true)
  })
})

describe('normalizeDomain — feeds Hunter a real domain', () => {
  it('strips scheme/www/path', () => {
    expect(normalizeDomain('https://www.simplepay.co.za/pricing')).toBe('simplepay.co.za')
    expect(normalizeDomain('http://puzzl.media')).toBe('puzzl.media')
  })
  it('handles empty', () => {
    expect(normalizeDomain(null)).toBeUndefined()
    expect(normalizeDomain('')).toBeUndefined()
  })
})

// ── Waterfall integration (mocked fetch) ─────────────────────────────────────
const realFetch = global.fetch
function mockFetch(handler: (url: string) => { ok: boolean; body: unknown }) {
  global.fetch = vi.fn(async (input: unknown) => {
    const url = String(input)
    const { ok, body } = handler(url)
    return { ok, json: async () => body, text: async () => JSON.stringify(body) } as Response
  }) as unknown as typeof fetch
}

describe('resolveDomain — email-reveal DEPTH (item 243): real domain for Hunter', () => {
  const realFetch2 = global.fetch
  afterEach(() => { global.fetch = realFetch2; vi.restoreAllMocks() })

  it('uses a known domain as-is (no lookup)', async () => {
    expect(await resolveDomain('https://www.simplepay.co.za/x', 'SimplePay')).toBe('simplepay.co.za')
  })
  it('resolves a real domain from the company NAME via Clearbit autocomplete (no key)', async () => {
    global.fetch = vi.fn(async (u: unknown) => {
      expect(String(u)).toContain('autocomplete.clearbit.com')
      return { ok: true, json: async () => ([{ name: 'SimplePay', domain: 'simplepay.co.za' }]) } as Response
    }) as unknown as typeof fetch
    expect(await resolveDomain(null, 'SimplePay')).toBe('simplepay.co.za')  // NOT the wrong "simplepay.com" guess
  })
  it('falls back to the heuristic if autocomplete finds nothing', async () => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ([]) } as Response)) as unknown as typeof fetch
    expect(await resolveDomain(null, 'Acme')).toBe('acme.com')
  })
})

describe('waterfallEnrich — email-reveal (item 243)', () => {
  beforeEach(() => {
    process.env.PDL_API_KEY = 'test'
    process.env.HUNTER_API_KEY = 'test'
    delete process.env.CLEARBIT_API_KEY
  })
  afterEach(() => { global.fetch = realFetch; vi.restoreAllMocks() })

  it('does NOT treat PDL boolean work_email as an email — falls through to Hunter', async () => {
    mockFetch((url) => {
      if (url.includes('peopledatalabs')) {
        // free tier: work_email is the boolean presence flag, NOT the address
        return { ok: true, body: { likelihood: 9, data: { work_email: true, job_company_website: 'https://www.simplepay.co.za' } } }
      }
      if (url.includes('hunter')) {
        return { ok: true, body: { data: { email: 'dave@simplepay.co.za', score: 95 } } }
      }
      return { ok: false, body: {} }
    })

    const out = await waterfallEnrich({ first_name: 'Dave', last_name: 'Ungerer', company: 'SimplePay', email: null, linkedin_url: null, domain: null })

    expect(out.email).toBe('dave@simplepay.co.za')  // revealed by Hunter, NOT `true`
    expect(out.source).toBe('hunter')
    expect((out.email as unknown) === true).toBe(false)  // the 244 bug can never recur
  })

  it('uses PDL real email when the (paid) tier returns one', async () => {
    mockFetch((url) => {
      if (url.includes('peopledatalabs')) {
        return { ok: true, body: { likelihood: 9, data: { work_email: 'dave@simplepay.co.za' } } }
      }
      return { ok: false, body: {} }
    })
    const out = await waterfallEnrich({ first_name: 'Dave', last_name: 'Ungerer', company: 'SimplePay', email: null, linkedin_url: null, domain: null })
    expect(out.email).toBe('dave@simplepay.co.za')
    expect(out.source).toBe('pdl')
  })

  it('returns no email (not a boolean) when nothing reveals one', async () => {
    mockFetch((url) => {
      if (url.includes('peopledatalabs')) {
        return { ok: true, body: { likelihood: 9, data: { work_email: true } } }  // boolean, no domain
      }
      return { ok: false, body: {} }  // hunter fails
    })
    const out = await waterfallEnrich({ first_name: 'Jill', last_name: 'Marais', company: 'Rivonia Premier Lodge', email: null, linkedin_url: null, domain: null })
    expect(out.email).toBeUndefined()  // NOT `true` — the bug is dead
  })
})
