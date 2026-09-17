// ═══════════════════════════════════════════════════════════════════════════════════════
// BATCH 1b · AN UNSET ENVIRONMENT IS PRODUCTION, BYTE FOR BYTE
//
// Base-URL injection is the ONE product-code behaviour change Batch 1b is permitted, and the
// whole permission rests on a single property: **with nothing set, every provider call goes
// exactly where it went before.** If that is not airtight, a harness convenience has become a
// way to silently repoint a live provider.
//
// 🛑 WHY THE DEFAULTS ARE ASSERTED AS LITERALS. Each one below is the string that used to be
// inlined at the call site. A test that read the default from the module would pass for any
// value the module happened to hold — including a typo — so the expected strings are written
// out here, independently, and a mismatch is the failure.
//
// ⚠️ AND THE ENVIRONMENT IS RESTORED AROUND EVERY CASE. `vitest.setup.ts` deletes provider
// KEYS before the suite runs but says nothing about these; a leaked `APOLLO_BASE_URL` would
// make some later suite's Apollo test address a fake that is not listening.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  apolloBase, resendBase, stripeBase, googleApiBase,
  stripeSdkHostOptions, redirectedProviders, PROVIDER_BASE_URL_VARS,
} from './provider-hosts'

// ⚠️ ONE PRECEDENT WORTH NAMING: `SMARTLEAD_BASE_URL` has existed for months
// (`lib/smartlead.ts:26`, `|| 'https://server.smartlead.ai/api/v1'`), so provider base-URL
// injection is not a new idea in this repo — Batch 1b applies the pattern Smartlead already
// used to the five providers the full-stack run needs, and gives them one home instead of a
// literal per call site. Smartlead itself is left exactly as it is: no Batch 1b check calls it.

/** The literal each call site used to contain, before Batch 1b. */
const PRODUCTION: Record<string, string> = {
  APOLLO_BASE_URL: 'https://api.apollo.io/api/v1',
  RESEND_BASE_URL: 'https://api.resend.com',
  STRIPE_BASE_URL: 'https://api.stripe.com',
  GOOGLE_API_BASE_URL: 'https://www.googleapis.com',
}

describe('Batch 1b · unset is production', () => {
  const prev: Record<string, string | undefined> = {}
  beforeEach(() => {
    for (const v of PROVIDER_BASE_URL_VARS) { prev[v] = process.env[v]; delete process.env[v] }
  })
  afterEach(() => {
    for (const v of PROVIDER_BASE_URL_VARS) {
      if (prev[v] === undefined) delete process.env[v]; else process.env[v] = prev[v]
    }
  })

  it('every default is the exact literal the call site used to hold', () => {
    expect(apolloBase()).toBe(PRODUCTION.APOLLO_BASE_URL)
    expect(resendBase()).toBe(PRODUCTION.RESEND_BASE_URL)
    expect(stripeBase()).toBe(PRODUCTION.STRIPE_BASE_URL)
    expect(googleApiBase()).toBe(PRODUCTION.GOOGLE_API_BASE_URL)
  })

  it('Apollo keeps /api/v1 — the bare host is a silent-empty-page failure', () => {
    // 🛑 THE ONE DEFAULT THAT CANNOT BE SHORTENED. Apollo's bare `/v1` is its internal web API:
    // it ACCEPTS an X-Api-Key, runs with no account context and returns HTTP 200 with zero
    // results. The comment this replaced said exactly that, and the default has to carry it.
    expect(apolloBase()).toMatch(/\/api\/v1$/)
    expect(apolloBase()).not.toBe('https://api.apollo.io/v1')
  })

  it('an EMPTY or whitespace value is also production, not an empty base', () => {
    // A shell that exports `APOLLO_BASE_URL=` (the shape a half-written harness produces) must
    // not build `/mixed_people/api_search` against no host at all.
    for (const bad of ['', '   ', '\t']) {
      process.env.APOLLO_BASE_URL = bad
      expect(apolloBase(), JSON.stringify(bad)).toBe(PRODUCTION.APOLLO_BASE_URL)
    }
  })

  it('a trailing slash is stripped, so no call site can build a double slash', () => {
    process.env.RESEND_BASE_URL = 'http://127.0.0.1:58511/'
    expect(resendBase()).toBe('http://127.0.0.1:58511')
    process.env.APOLLO_BASE_URL = 'http://127.0.0.1:58501/api/v1//'
    expect(apolloBase()).toBe('http://127.0.0.1:58501/api/v1')
  })

  it('the Stripe SDK gets NO host options when unset — the client is identical to today\'s', () => {
    expect(stripeSdkHostOptions()).toEqual({})
  })

  it('and a full host/port/protocol triple when set, because the SDK defaults to 443/https', () => {
    // ⚠️ A fake on a plaintext local port needs all three. Supplying only `host` makes the SDK
    // dial 443 over TLS against it, and the failure then looks like a network fault.
    process.env.STRIPE_BASE_URL = 'http://127.0.0.1:58510'
    expect(stripeSdkHostOptions()).toEqual({ host: '127.0.0.1', port: 58510, protocol: 'http' })
    process.env.STRIPE_BASE_URL = 'https://api.stripe.com'
    expect(stripeSdkHostOptions()).toEqual({ host: 'api.stripe.com', port: 443, protocol: 'https' })
  })

  it('a MALFORMED value falls back to production and never throws at module scope', () => {
    // Throwing here would take the whole API down at boot over a mistyped harness variable.
    process.env.STRIPE_BASE_URL = 'not a url at all'
    expect(() => stripeSdkHostOptions()).not.toThrow()
    expect(stripeSdkHostOptions()).toEqual({})
  })

  it('nothing is reported as redirected when nothing is set', () => {
    expect(redirectedProviders()).toEqual([])
  })

  it('each set variable IS reported, so boot can shout about it', () => {
    process.env.APOLLO_BASE_URL = 'http://127.0.0.1:58501/api/v1'
    process.env.ANTHROPIC_BASE_URL = 'http://127.0.0.1:58507'
    expect(redirectedProviders().sort()).toEqual(['ANTHROPIC_BASE_URL', 'APOLLO_BASE_URL'])
  })
})

describe('Batch 1b · the seam is wired where it has to be, and nowhere it must not be', () => {
  const read = (p: string) => readFileSync(join(__dirname, p), 'utf8')
  /** Whole-line comments removed — a guard a comment can satisfy is not a guard. */
  const code = (s: string) => s.split('\n').filter(l => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n')

  it('no provider host survives as a literal on a live call path', () => {
    for (const [file, hosts] of [
      ['apollo.ts', [/https:\/\/api\.apollo\.io/]],
      ['system-probes.ts', [/https:\/\/api\.apollo\.io/, /https:\/\/api\.resend\.com/, /https:\/\/api\.stripe\.com/]],
      ['../routes/figsy.ts', [/https:\/\/api\.resend\.com/]],
    ] as const) {
      const src = code(read(file))
      for (const h of hosts) expect(src, `${file} still hardcodes ${h}`).not.toMatch(h)
    }
  })

  it('the Stripe SDK constructors both take the host options', () => {
    for (const f of ['stripe.ts', 'programme-checkout.ts']) {
      expect(code(read(f)), f).toMatch(/stripeSdkHostOptions\(\)/)
    }
  })

  it('🛑 gcal.ts OAUTH SCOPES ARE UNTOUCHED — they are identifiers, not addresses', () => {
    // Rewriting a scope string would break consent for every connected client: Google matches
    // them exactly. They are pinned by `gcal-scopes.test.ts` and must never be injected.
    //
    // ⛓️ AMENDED BY C-11 (founder-approved 17 Sep). This test used to also assert that gcal.ts
    // does not import `provider-hosts` AT ALL — a blunt way to keep injection away from the
    // scopes, and correct while Google was not redirected. C-11 requires the Calendar DATA
    // endpoints to be redirectable, so the import now exists and the protection has to be
    // precise instead of absolute: the four scope literals are still asserted verbatim here,
    // and the test below proves the injection reaches `rootUrl` and nothing else.
    const src = read('gcal.ts')
    for (const scope of [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.freebusy',
      'https://www.googleapis.com/auth/calendar.calendars.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ]) expect(src, `a Google OAuth scope was altered: ${scope}`).toContain(scope)

    // 🛑 AND NO SCOPE IS BUILT FROM THE BASE URL. This is the assertion that replaces the
    // blanket ban: a scope must never be interpolated, because `${googleApiBase()}/auth/...`
    // would silently rewrite consent for every connected client the moment a base URL is set.
    expect(code(src), 'a Google OAuth scope is being interpolated from the base URL')
      .not.toMatch(/\$\{googleApiBase\(\)\}\/auth/)
    expect(code(src)).not.toMatch(/googleApiBase\(\)[^\n]*auth\/(calendar|userinfo)/)
  })

  // ══════════════════════════════════════════════════════════════════════════════════════
  // C-11 · GOOGLE CALENDAR'S DATA ENDPOINTS ARE REDIRECTABLE (founder-approved 17 Sep)
  //
  // The Batch 1b scope card listed Google among the five providers requiring base-URL
  // injection, and it was the one left incomplete: `GOOGLE_API_BASE_URL` reached the
  // `system-probes.ts` probe surface but not the runtime Calendar client, because that client
  // takes its endpoint from its OWN options rather than from `fetch`. So a harness could
  // redirect the probe and still have a real Calendar call leave the box.
  //
  // `googleapis`'s generated client resolves every URL as `options.rootUrl || 'https://
  // www.googleapis.com/'` — verified against the installed package
  // (`node_modules/googleapis/build/src/apis/calendar/v3.js`) — so `rootUrl` is the supported
  // injection point and no URL is hand-built.
  //
  // ⚠️ CODE VERIFIED ONLY. No Batch 1b check exercises Google Calendar, and none was added.
  // This asserts the seam exists and defaults to production; it does not claim a runtime proof.
  // ══════════════════════════════════════════════════════════════════════════════════════
  it('C-11 · all THREE google.calendar() sites take rootUrl: googleApiBase()', () => {
    const src = code(read('gcal.ts'))
    const sites = src.match(/google\.calendar\(\{[^}]*\}\)/g) ?? []
    expect(sites, 'gcal.ts should build exactly three Calendar clients').toHaveLength(3)
    for (const [i, s] of sites.entries()) {
      expect(s, `calendar client #${i + 1} does not take rootUrl: googleApiBase()`)
        .toMatch(/rootUrl:\s*googleApiBase\(\)/)
    }
    // Not a hand-built URL anywhere: the SDK owns the path, we only move the host.
    expect(src).not.toMatch(/googleapis\.com\/calendar\/v3/)
  })

  it('C-11 · GOOGLE_API_BASE_URL unset still resolves to production googleapis.com', () => {
    // The default is the whole safety property: an unset variable must change nothing.
    delete process.env.GOOGLE_API_BASE_URL
    expect(googleApiBase()).toBe('https://www.googleapis.com')
    process.env.GOOGLE_API_BASE_URL = 'http://127.0.0.1:58511'
    expect(googleApiBase()).toBe('http://127.0.0.1:58511')
  })

  it('C-11 · the OAuth2 TOKEN exchange is deliberately NOT redirected', () => {
    // 🛑 EXPLICITLY OUT OF SCOPE, and recorded as a decision rather than an omission. The
    // token exchange lives in `google-auth-library` and talks to `oauth2.googleapis.com`,
    // which is an auth handshake rather than a data call and is reached by no Batch 1 check.
    // `new google.auth.OAuth2(...)` therefore takes no base URL, and this asserts it stays
    // that way so nobody "completes" the injection without a ruling.
    const src = code(read('gcal.ts'))
    const oauth = src.match(/new google\.auth\.OAuth2\([^)]*\)/g) ?? []
    expect(oauth.length, 'gcal.ts should build the OAuth2 client').toBeGreaterThanOrEqual(1)
    for (const o of oauth) expect(o, 'the OAuth2 client must not take a base URL').not.toMatch(/googleApiBase|rootUrl/)
  })

  it('the boot check shouts when a provider is redirected', () => {
    const src = code(read('startup-check.ts'))
    expect(src).toContain('redirectedProviders()')
    expect(src).toMatch(/REDIRECTED AWAY FROM PRODUCTION/)
  })

  it('the tier rows and PROVIDER_BASE_URL_VARS agree — one truth, enforced by this test', () => {
    // The rows in `startup-check.ts` are written as literals because a static sweep reads that
    // file's text. This is what keeps the two lists from drifting apart.
    const src = read('startup-check.ts')
    for (const v of PROVIDER_BASE_URL_VARS) {
      expect(src, `${v} has no tier row in startup-check.ts`).toContain(`key: '${v}'`)
    }
    // ⚠️ THE REGEX IS ANCHORED TO THE FIVE PROVIDER NAMES, and it caught itself on the way:
    // `[A-Z0-9_]*BASE_URL` matches `DATABASE_URL` (DATA + BASE_URL), `SUPABASE_URL` and
    // `NEXT_PUBLIC_SUPABASE_URL`. A guard that sweeps by shape rather than by name pulls in
    // whatever happens to share the shape.
    const rows = [...src.matchAll(/key: '((?:APOLLO|RESEND|STRIPE|GOOGLE_API|ANTHROPIC)_BASE_URL)'/g)]
      .map(m => m[1]).sort()
    expect(rows).toEqual([...PROVIDER_BASE_URL_VARS].sort())
  })

  it('ANTHROPIC_BASE_URL needs no code change — the SDK reads it itself', () => {
    // Verified against the INSTALLED SDK rather than remembered: if a future upgrade dropped
    // that behaviour, the model harness would silently call the real Anthropic API, and 34
    // constructor sites would each need changing. This is the tripwire for that day.
    const sdk = readFileSync(join(__dirname, '../../../../node_modules/@anthropic-ai/sdk/index.js'), 'utf8')
    expect(sdk, 'the Anthropic SDK no longer reads ANTHROPIC_BASE_URL').toMatch(
      /baseURL = Core\.readEnv\('ANTHROPIC_BASE_URL'\)/,
    )
  })
})
