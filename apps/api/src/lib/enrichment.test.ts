import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { isRealEmail, normalizeDomain, resolveDomain, waterfallEnrich } from './enrichment'

// ── ⛓️ 17 Sep (FD-6 / FD-5) — THE PROVIDERS THE WATERFALL CASES EXERCISE ARE RETIRED ──
//
// `retired-providers.ts` refuses PDL, Hunter and Clearbit in CODE rather than by a key
// check, so `waterfallEnrich` stands down before any request. That is MVP1's behaviour and
// it is asserted at the bottom of this file, WITHOUT this mock.
//
// ⚠️ THE MOCK KEEPS THE COVERAGE, IT DOES NOT WEAKEN THE FENCE. What these cases prove is
// the #243/#244 depth fix — a boolean `work_email` is not an email, Hunter needs a REAL
// domain, and the order of the stages matters. That knowledge is what a future approved
// provider inherits, so deleting the cases would delete it. Mocking a module in a test is
// not a production bypass: no runtime path changes the fence, which the un-mocked block
// below is there to prove.
vi.mock('./retired-providers', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>
  // BOTH exports must be stubbed: `refuseRetiredProvider` is what each stage asks, and
  // `providerRetired` is what the waterfall asks before doing preparatory work for a stage.
  return { ...actual, refuseRetiredProvider: () => false as unknown as true, providerRetired: () => false }
})

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

// ── ⛓️ 17 Sep — THE REAL FENCE, UNMOCKED ────────────────────────────────────────────
describe('FD-6 / FD-5 · with the real retired-providers module, nothing is called', () => {
  it('returns no source and issues no request, with all three keys set', async () => {
    vi.doUnmock('./retired-providers')
    vi.resetModules()
    const prev = { ...process.env }
    const urls: string[] = []
    vi.stubGlobal('fetch', async (u: unknown) => {
      urls.push(String(u))
      return { ok: true, status: 200, json: async () => ({}) } as never
    })
    process.env.PDL_API_KEY = 'pdl-key'
    process.env.HUNTER_API_KEY = 'hunter-key'
    process.env.CLEARBIT_API_KEY = 'clearbit-key'
    try {
      const { waterfallEnrich: real } = await import('./enrichment')
      const out = await real({ first_name: 'Dave', last_name: 'Ungerer', company: 'SimplePay', email: null, linkedin_url: null, domain: null })
      expect(out.source).toBe('none')
      expect(out.email).toBeUndefined()
      // 🛑 A key being present must not re-enable a retired provider.
      for (const u of urls) {
        expect(u).not.toContain('peopledatalabs')
        expect(u).not.toContain('hunter.io')
        expect(u).not.toContain('clearbit')
      }
    } finally {
      process.env = prev
      vi.unstubAllGlobals()
      vi.resetModules()
    }
  })
})
