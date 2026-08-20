import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

// ── HC-6 — THE SITE CARRIES NO ANALYTICS, AND privacy.html MUST KEEP SAYING SO ─────────────
//
// Founder-ruled 20 Aug: remove Google Analytics.
//
// ⚠️ WHAT MADE THIS WORTH A GUARD RATHER THAN A COMMIT. GA4 (`G-0BCMTW9HSK`) loaded on ALL 29
// pages, unconditionally, first script in `<head>`, with no consent banner anywhere on the
// site — while `privacy.html` section 9 stated, in writing:
//
//     "We do not use Google Analytics, Facebook Pixel, or any advertising cookies."
//
// A page that DENIES IN TEXT what it is doing while you read it is worse than an omission: a
// regulator or an enterprise security review finds it in one page-load, and it undermines
// every other claim in the same document — including the true ones.
//
// The website freeze (#605) already stops a silent CHANGE. It cannot stop a silent
// CONTRADICTION: re-adding gtag and updating the freeze manifest in the same PR is a green
// gate and a false privacy policy. This file is the half the freeze cannot cover — it asserts
// the RELATIONSHIP between what the site loads and what the site claims.
//
// IF THIS IS RED because a tracker was deliberately added: the privacy policy must be edited
// in the same PR, and a consent gate is a separate question. Never make it green by loosening
// the list.

const WEB = join(__dirname, '../../../website')
const pages = readdirSync(WEB).filter(f => f.endsWith('.html'))
const read = (f: string) => readFileSync(join(WEB, f), 'utf8')

/** Strip HTML comments — our own removal note NAMES the tracker it removed. */
const stripComments = (s: string) => s.replace(/<!--[\s\S]*?-->/g, '')

/**
 * Analytics and advertising hosts. Not an exhaustive list of every tracker on earth — it is
 * the set this site has ever carried plus the ones most likely to be pasted in next.
 */
const TRACKER_HOSTS = [
  'googletagmanager.com', 'google-analytics.com', 'connect.facebook.net',
  'snap.licdn.com', 'static.hotjar.com', 'clarity.ms', 'cdn.segment.com',
  'plausible.io', 'posthog.com', 'mixpanel.com', 'matomo', 'fullstory.com',
]

describe('HC-6 — no analytics or advertising tracker loads on the website', () => {
  it('finds a real set of pages (the guard is not sweeping an empty directory)', () => {
    // Without this, a moved directory makes every assertion below pass vacuously — the #617
    // lesson in its cheapest form.
    expect(pages.length).toBeGreaterThanOrEqual(25)
    expect(pages).toContain('privacy.html')
    expect(pages).toContain('index.html')
  })

  it('no page loads a tracker script', () => {
    const offenders: string[] = []
    for (const f of pages) {
      const body = stripComments(read(f))
      for (const host of TRACKER_HOSTS) {
        if (body.includes(host)) offenders.push(`${f} → ${host}`)
      }
    }
    expect(offenders, 'a tracker was added; privacy.html section 9 must be edited in the SAME PR').toEqual([])
  })

  it('no page defines gtag or dataLayer', () => {
    // The host check alone would miss an inlined or self-hosted copy.
    const offenders = pages.filter(f => {
      const body = stripComments(read(f))
      return /\bgtag\s*\(/.test(body) || /\bdataLayer\b/.test(body)
    })
    expect(offenders).toEqual([])
  })

  it('and the landing app is clean too — it was never in the reported scope', () => {
    // Reported as "29 pages + apps/landing". `apps/landing` turned out to carry no GA at all;
    // pinned so nobody adds one there believing the guard covers the whole site.
    const LANDING = join(__dirname, '../../../landing')
    for (const f of readdirSync(LANDING).filter(x => x.endsWith('.html'))) {
      const body = stripComments(readFileSync(join(LANDING, f), 'utf8'))
      for (const host of TRACKER_HOSTS) {
        expect(body.includes(host), `${f} → ${host}`).toBe(false)
      }
    }
  })
})

describe('HC-6 — privacy.html describes the site that actually exists', () => {
  const privacy = read('privacy.html')

  it('states plainly that there is no analytics', () => {
    expect(privacy).toContain('We run no website analytics')
  })

  it('names the removal and its date rather than quietly deleting the old claim', () => {
    // A privacy policy that silently drops a sentence reads, to anyone who saw the old one, as
    // hiding something. Saying "GA was here until 20 August 2026 and has been removed" is both
    // true and the more trustworthy shape.
    expect(privacy).toContain('until 20 August 2026 and has been removed')
  })

  it('discloses the embeds that ARE on the site', () => {
    // Removing GA does not make the page complete. Calendly and YouTube set their own cookies
    // when they load, and the old section listed neither — so it was wrong in two directions
    // at once: denying what was there, and omitting what still is.
    for (const name of ['Calendly', 'YouTube', 'Supabase']) {
      expect(privacy, `section 9 must disclose ${name}`).toContain(name)
    }
  })

  it('every embed it claims is actually present somewhere on the site, and vice versa', () => {
    // Both directions. A policy that lists a vendor we dropped is as wrong as one that hides a
    // vendor we use — and it is the failure mode a copy-paste rewrite produces.
    const all = pages.map(read).join('\n')
    expect(all.includes('calendly.com'), 'privacy names Calendly, so it must be on the site').toBe(true)
    expect(all.includes('youtube'),      'privacy names YouTube, so it must be on the site').toBe(true)
    for (const gone of ['Facebook Pixel is active', 'we use Google Analytics']) {
      expect(privacy.includes(gone)).toBe(false)
    }
  })

  it('tells the reader our emails carry no tracking pixel', () => {
    // The other half of this ruling. An open pixel is invisible by design, so the ONLY way a
    // recipient could ever know is if we say it — and the old policy said nothing at all.
    expect(privacy).toContain('Our emails do not track you')
    expect(privacy).toContain('invisible tracking pixel')
  })
})
