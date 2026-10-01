// ⚑ 1 Oct (R182 · W-1) — THE LEGAL PAGES SAY WHAT IS TRUE TODAY.
// The founder, on the website check: "all yes". These lines were false and are now fixed:
// AI prompts DO carry business-contact details (operator reply drafting sends name, role,
// company and reply text) · Apollo is the only data provider (R146) · retention is 90 days
// (R145) · a programme is ONE payment (R166) · a free account can be created by anyone ·
// open tracking was removed on 20 Aug · opt-outs are honoured immediately.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '../../../..')
const PAGES = [
  'apps/website/privacy.html', 'apps/website/terms.html', 'apps/website/dpa.html', 'apps/website/dpa-us.html',
  'apps/portal/public/privacy.html', 'apps/portal/src/app/(legal)/privacy/page.tsx',
]
const text = (f: string) => readFileSync(join(ROOT, f), 'utf8')
  .replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ')

describe('R182 — the legal pages carry no false facts', () => {
  for (const f of PAGES) {
    const t = text(f)
    it(`${f}: no "no personal data in AI prompts" claim`, () => {
      expect(t).not.toMatch(/no (identifiable )?personal data in (AI )?prompts|not (send|include) (identifiable )?personal data|no PII in prompts/i)
    })
    it(`${f}: Apollo is the only data provider`, () => {
      expect(t).not.toMatch(/PeopleDataLabs|People Data Labs|\bHunter\b/)
    })
    it(`${f}: retention is 90 days, not 12 or 24 months`, () => {
      expect(t).not.toMatch(/(12|24) months (from|following)|\+ ?(12|24) months|plus (12|24) months|retained for (12|24) months/i)
    })
  }

  it('website Terms: one payment, and anyone can create a free account', () => {
    const t = text('apps/website/terms.html')
    expect(t).not.toMatch(/two instalments/i)
    expect(t).not.toMatch(/no self-serve sign-?up/i)
    expect(t).toContain('You can create a free account yourself')
  })

  it('DPA: no open tracking, and transfers are described truthfully', () => {
    const t = text('apps/website/dpa.html')
    expect(t).not.toMatch(/\(opens,/i)
    expect(t).not.toMatch(/does not transfer personal data outside of the European Union without/i)
  })

  it('US addendum: opt-outs honoured immediately', () => {
    expect(text('apps/website/dpa-us.html')).not.toMatch(/Opt-outs honoured within 10 business days/i)
  })
})
