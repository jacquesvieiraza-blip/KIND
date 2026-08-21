import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ── THE DOMAIN MOVE MUST BE A VARIABLE CHANGE, NOT A CODE CHANGE (P47, 21 Aug) ─────────────
//
// The founder's Google walk hit a wall that had nothing to do with our code: the OAuth client
// is registered on `kindapi-production-….railway.app`, a domain **nobody can verify**, because
// Google requires proof of ownership and nobody owns a railway.app subdomain. The fix is to
// move the API to `api.get-kind.com` — DNS, a Railway custom domain, and new console values.
//
// ⚠️ THAT MOVE MUST NOT NEED A DEPLOY. If any host were baked into the calendar path, changing
// domain would mean editing code, shipping it, and hoping the console values matched — during a
// launch week, on the one flow a client actually watches. This guard makes the move a Railway
// variable edit and nothing else.
//
// ⚠️ WHAT THIS GUARD CANNOT SEE, said plainly. It reads three files. It cannot prove a host is
// absent from a file it does not read, and it cannot prove the RUNTIME values are right — a
// perfectly portable codebase still breaks if `GOOGLE_REDIRECT_URI` in Railway disagrees with
// the console's registered URI. That check is a founder step in
// `docs/runbooks/GOOGLE-VERIFICATION.md`, not something a test can do.

const FILES = ['lib/gcal.ts', 'routes/calendar.ts', 'lib/booking-token.ts'] as const
const read = (rel: string) =>
  readFileSync(join(__dirname, rel.startsWith('lib/') ? rel.slice(4) : `../${rel}`), 'utf8')
/** Comments stripped — a comment naming a domain is documentation, not a hardcoded host. */
const codeOf = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/([^:])\/\/.*$/gm, '$1')

describe('the guard is reading the real calendar path', () => {
  it('finds all three files, non-trivial', () => {
    // Without this, a moved or renamed file leaves every assertion below scanning an empty
    // string and passing — a green that proves nothing.
    for (const f of FILES) expect(read(f).length, f).toBeGreaterThan(1_000)
  })
})

describe('① NO HARDCODED HOST anywhere in the calendar path', () => {
  const HOSTS = [
    [/railway\.app/i,   'the domain Google cannot verify — the exact thing this move escapes'],
    [/get-kind\.com/i,  'even the RIGHT domain hardcoded makes the next move a code change'],
  ] as const

  for (const [pattern, why] of HOSTS) {
    it(`no file hardcodes /${pattern.source}/`, () => {
      const offenders = FILES.filter(f => pattern.test(codeOf(read(f))))
      expect(offenders, `${offenders.join(', ')} — ${why}`).toEqual([])
    })
  }

  it('⚠️ AND THE REDIRECT URI COMES FROM ENV, not from a literal', () => {
    // The specific value Google matches against. If this is ever a string, the console and the
    // code drift apart silently and the callback 400s with `redirect_uri_mismatch`.
    const gcal = codeOf(read('lib/gcal.ts'))
    expect(gcal).toMatch(/process\.env\.GOOGLE_REDIRECT_URI/)
    expect(gcal, 'and its fallback is also env-derived').toMatch(/process\.env\.PORTAL_URL/)
  })

  it('the callback redirects follow PORTAL_URL, not a literal origin', () => {
    const cal = codeOf(read('routes/calendar.ts'))
    expect(cal).toMatch(/process\.env\.PORTAL_URL/)
    // Every res.redirect in this file must interpolate, never hardcode an origin.
    for (const m of cal.match(/res\.redirect\(`[^`]*`\)/g) ?? []) {
      expect(m, `hardcoded origin in ${m}`).not.toMatch(/https?:\/\/(?!\$\{)/)
    }
  })

  it('the prospect booking link is built from PORTAL_URL', () => {
    expect(codeOf(read('lib/booking-token.ts'))).toMatch(/process\.env\.PORTAL_URL/)
  })
})

describe('② NO-TOUCH — #683\'s narrowed scopes are exactly as they were', () => {
  it('the four scopes stand, and calendar.readonly is still absent', () => {
    // The founder's NO-TOUCH, asserted rather than promised. #683 removed the scope that let us
    // read every event body; a domain move must not quietly widen it back.
    const gcal = read('lib/gcal.ts')
    const scopes = [...gcal.matchAll(/'(https:\/\/www\.googleapis\.com\/auth\/[^']+)'/g)].map(m => m[1])
    expect(scopes).toEqual([
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.freebusy',
      'https://www.googleapis.com/auth/calendar.calendars.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ])
    expect(scopes).not.toContain('https://www.googleapis.com/auth/calendar.readonly')
  })
})

describe('③ THE 7-DAY RULE IS RECORDED WHERE SOMEBODY WILL READ IT', () => {
  const RUNBOOK = readFileSync(join(__dirname, '../../../../docs/runbooks/GOOGLE-VERIFICATION.md'), 'utf8')

  it('the runbook exists and states the 7-day expiry as fact, with the exemption that does NOT save us', () => {
    // Settled from Google's own page (HTTP 200 from this container, 21 Aug), not inferred:
    // Testing-mode projects are issued a refresh token expiring in 7 days UNLESS the only
    // scopes are name/email/profile. We request calendar scopes, so the exemption misses us.
    expect(RUNBOOK).toMatch(/expiring in 7 days/)
    expect(RUNBOOK, 'and why the exemption does not apply to us').toMatch(/calendar\.events/)
    expect(RUNBOOK, 'cited, not asserted').toMatch(/developers\.google\.com\/identity\/protocols\/oauth2/)
  })

  it('the founder\'s own connection date and its expiry date are both written down', () => {
    // "My own connection is live from 20 Aug" — the check ritual needs both ends or it is a
    // reminder with no deadline.
    expect(RUNBOOK).toMatch(/20 Aug/)
    expect(RUNBOOK).toMatch(/27 Aug/)
  })
})
