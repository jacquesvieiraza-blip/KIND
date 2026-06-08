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

  it('accepts a branded domain and emits the pixel', () => {
    process.env.TRACKING_URL = 'https://api.get-kind.com'
    expect(trackingBaseUrl()).toBe('https://api.get-kind.com')
    expect(trackingPixelHtml('abc')).toContain('api.get-kind.com/figsy/track/open/abc')
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
