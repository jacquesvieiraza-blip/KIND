// ═══════════════════════════════════════════════════════════════════════════════════════
// 25 Sep (R168 ④ ⑥ · P13b) — THE WEBSITE SAYS WHAT MILLA NOW DOES: YOU TELL US YOUR SIZE; WE CHECK IT.
//
// Founder-approved wording (25 Sep, "approve"), replacing "we confirm it, you don't choose it"
// on the Pricing page (twice), the FAQs and the Terms; and the retired per-lead line on the
// "vs hiring an SDR" page ("yes and go").
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const site = (f: string) => readFileSync(join(__dirname, '../../../website', f), 'utf8')
  .replace(/&rsquo;/g, '’').replace(/&mdash;/g, '—').replace(/\s+/g, ' ')

describe('the size lines', () => {
  it('Pricing: the calculator note and the band section', () => {
    const p = site('pricing.html')
    expect(p).toContain('<p class="calc-help">You tell us your company’s size when you sign up; we check it.</p>')
    expect(p).toContain('Your band is set by the size of your company — you tell us your company’s size when you sign up; we check it.')
    expect(p).not.toMatch(/you don’t choose it/)
  })

  it('FAQs', () => {
    const f = site('faqs.html')
    expect(f).toContain('You tell us your company’s size when you sign up; we check it.')
    expect(f).not.toContain('We confirm your company’s size ourselves')
  })

  it('Terms: the same sentence as the portal Terms', () => {
    const t = site('terms.html')
    expect(t).toContain('You tell us the size of your company when you sign up, and your price is set from it. We check it against company records; if they show your company is larger, our team confirms your band before you pay.')
    expect(t).not.toContain('you do not choose your band')
  })
})

describe('the retired per-lead line', () => {
  it('"vs hiring an SDR" no longer says we charge per approved lead', () => {
    const v = site('vs-hiring-an-sdr.html')
    expect(v).not.toMatch(/only charge when you approve a lead/i)
    expect(v).toContain('We charge a flat price per qualified meeting, and if we deliver fewer than your target, the difference is credited toward your next programme.')
  })
})
