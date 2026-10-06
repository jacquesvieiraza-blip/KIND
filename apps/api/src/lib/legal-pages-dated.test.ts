// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct — EVERY LEGAL PAGE SHOWS THE DATE IT LAST CHANGED. Founder: "yes fix the dates".
//
// W-1a (#2526) and W-6 (#2527) changed the Privacy Policy, Terms and both DPAs on 1 Oct, but the
// pages still showed 19–25 September, May and June — and the Privacy Policy promises "the date at
// the top of this page always reflects the current version". A page that changes must change its
// date in the same PR; this pins the current one on every copy a reader can open.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const APPS = join(__dirname, '../../..')
const CURRENT = /Last updated:? 1 October 2026/
// ⛓️ 6 Oct (11b · founder "3 yes", "4 not material") — the three Privacy Policy copies gained the
// Google Calendar / Limited Use section, so their date moved; the other pages did not change.
const PRIVACY_CURRENT = /Last updated:? 6 October 2026/
const PRIVACY = ['website/privacy.html', 'portal/public/privacy.html', 'portal/src/app/(legal)/privacy/page.tsx']

const PAGES = [
  'website/terms.html', 'website/dpa.html', 'website/dpa-us.html',
  'portal/public/terms.html', 'portal/src/app/(legal)/terms/page.tsx',
]

describe('every legal page carries its current date', () => {
  for (const p of PAGES) {
    it(`${p} says "Last updated 1 October 2026"`, () => {
      expect(readFileSync(join(APPS, p), 'utf8')).toMatch(CURRENT)
    })
  }
  for (const p of PRIVACY) {
    it(`${p} says "Last updated 6 October 2026" and carries Google's Limited Use disclosure`, () => {
      const page = readFileSync(join(APPS, p), 'utf8')
      expect(page).toMatch(PRIVACY_CURRENT)
      expect(page).toContain('Google Calendar')
      expect(page).toContain('Google API Services User Data Policy')
      expect(page).toContain('including the Limited Use requirements')
      expect(page).toContain('not used to train AI models')
    })
  }
})
