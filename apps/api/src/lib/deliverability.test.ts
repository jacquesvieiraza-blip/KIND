import { describe, it, expect } from 'vitest'
import {
  unsubscribeToken,
  verifyUnsubscribeToken,
  htmlToText,
  trackingBaseUrl,
  trackingPixelHtml,
  unsubscribeHeaders,
  warmupRampCap,
} from './deliverability'

describe('warmup ramp schedule', () => {
  const start = '2026-06-09'
  const at = (d: string) => Date.parse(`${d}T09:00:00Z`)

  it('caps low for days 1–3 then steps up to a 50/day ceiling by day 9', () => {
    expect(warmupRampCap(start, at('2026-06-08'))).toBe(10) // pre-start
    expect(warmupRampCap(start, at('2026-06-09'))).toBe(10) // day 1
    expect(warmupRampCap(start, at('2026-06-11'))).toBe(10) // day 3
    expect(warmupRampCap(start, at('2026-06-12'))).toBe(20) // day 4
    expect(warmupRampCap(start, at('2026-06-13'))).toBe(30) // day 5
    expect(warmupRampCap(start, at('2026-06-15'))).toBe(40) // day 7
    expect(warmupRampCap(start, at('2026-06-17'))).toBe(50) // day 9
    expect(warmupRampCap(start, at('2026-06-19'))).toBe(50) // launch day
  })

  it('returns null for an invalid start date', () => {
    expect(warmupRampCap('not-a-date')).toBeNull()
  })
})

describe('unsubscribe tokens (D1)', () => {
  it('round-trips an email, normalised to lowercase', () => {
    const token = unsubscribeToken('Jo@Example.com')
    expect(verifyUnsubscribeToken(token)).toBe('jo@example.com')
  })

  it('rejects a tampered signature', () => {
    const [data] = unsubscribeToken('a@b.com').split('.')
    expect(verifyUnsubscribeToken(`${data}.deadbeefdeadbeefdeadbeef`)).toBeNull()
  })

  it('rejects malformed tokens', () => {
    expect(verifyUnsubscribeToken('')).toBeNull()
    expect(verifyUnsubscribeToken('no-dot')).toBeNull()
  })
})

describe('htmlToText (D2 plain-text alternative)', () => {
  it('converts links to "text (url)" and strips tags', () => {
    const out = htmlToText('<p>Hi <a href="https://x.com">click</a></p>')
    expect(out).toContain('click (https://x.com)')
    expect(out).not.toContain('<')
  })

  it('turns block elements into newlines and trims', () => {
    expect(htmlToText('<div>a</div><div>b</div>')).toBe('a\nb')
  })
})

describe('tracking-domain guard (D3 — anti-phishing)', () => {
  it('refuses a bare platform host (would read as phishing)', () => {
    process.env.TRACKING_URL = 'https://kindapi-production.up.railway.app'
    expect(trackingBaseUrl()).toBeNull()
    expect(trackingPixelHtml('abc')).toBe('')
    delete process.env.TRACKING_URL
  })

  it('⛓️ HC-6 — a branded domain resolves, and the pixel is STILL empty (open tracking is OFF)', () => {
    // WAS: `expect(trackingPixelHtml('abc')).toContain('.../figsy/track/open/abc')`.
    //
    // Founder-ruled 20 Aug: no open tracking. That chains his own 29-Jun ruling which
    // re-enabled the pixel — not a bug fix, a reversal on new grounds: it tracked a NAMED
    // prospect with no notice anywhere in the privacy policy, and it fed the A/B picker that
    // chooses subject lines by open rate while MEETING_BOOKED is the ruled North Star.
    //
    // ⚠️ BOTH HALVES ARE ASSERTED ON PURPOSE. `trackingBaseUrl()` must STILL resolve — the
    // `/figsy/track/open/:emailId` endpoint has to keep answering for pixels already sitting
    // in prospects' inboxes from earlier sends, and this is what proves that machinery is
    // intact rather than ripped out. Only the emitting stopped.
    process.env.TRACKING_URL = 'https://api.get-kind.com'
    expect(trackingBaseUrl(), 'the base URL still resolves — the endpoint stays reachable').toBe('https://api.get-kind.com')
    expect(trackingPixelHtml('abc'), 'but NOTHING is embedded in an email any more').toBe('')
    delete process.env.TRACKING_URL
  })

  it('emits no pixel however the environment is configured', () => {
    // The old gate was environmental — set the right domain and the pixel came back. This is a
    // RULING, so it must not be one env var away from reversing itself.
    for (const url of ['https://api.get-kind.com', 'https://track.gettingkind.com', '']) {
      if (url) process.env.TRACKING_URL = url; else delete process.env.TRACKING_URL
      expect(trackingPixelHtml('abc'), `TRACKING_URL=${url || '(unset)'}`).toBe('')
    }
    delete process.env.TRACKING_URL
  })

  it('the original pixel shape is KEPT, not deleted (CORE-MAP rule 3)', async () => {
    // So that ruling it back on is reading one function, not reconstructing it from a commit.
    const { trackingPixelHtmlDisabled } = await import('./deliverability')
    process.env.TRACKING_URL = 'https://api.get-kind.com'
    expect(trackingPixelHtmlDisabled('abc')).toContain('api.get-kind.com/figsy/track/open/abc')
    delete process.env.TRACKING_URL
  })

  it('and no cold email carries a pixel any more — the real send path, not the helper', async () => {
    // `coldEmailHtml` is what actually goes into a prospect's inbox. Asserting on the helper
    // alone would pass even if something else re-inserted an <img> downstream.
    const { coldEmailHtml } = await import('./deliverability')
    process.env.TRACKING_URL = 'https://api.get-kind.com'
    const html = coldEmailHtml('Hello there.', 'some-email-id')
    expect(html, 'no tracking image reaches the prospect').not.toContain('track/open')
    expect(html, 'no invisible image of any kind').not.toContain('<img')
    expect(html, 'and the actual message is still there').toContain('Hello there.')
    delete process.env.TRACKING_URL
  })
})

describe('unsubscribe headers (D1 one-click)', () => {
  it('sets RFC 8058 one-click + an https unsubscribe URL', () => {
    const h = unsubscribeHeaders('a@b.com')
    expect(h['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
    expect(h['List-Unsubscribe']).toContain('<http')
  })
})
