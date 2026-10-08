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

// ⛓️ 8 Oct (precision model, founder GO) — WAS "the size lines": the price was set by company size, so
// the site said "you tell us your size; we check it". There is now one price for every client, so no
// page may ask for or check a company size to set a price, and the band sentence must not return.
describe('one price for every client — no page sets a price by company size', () => {
  it('Pricing: one price for every client, and no size note or band section', () => {
    const p = site('pricing.html')
    expect(p).toContain('One price for every client.')
    expect(p).not.toContain('<p class="calc-help">You tell us your company’s size when you sign up; we check it.</p>')
    expect(p).not.toMatch(/Your band is set by the size of your company/)
    expect(p).not.toMatch(/you don’t choose it/)
  })

  it('FAQs: no size line', () => {
    const f = site('faqs.html')
    expect(f).not.toContain('You tell us your company’s size when you sign up; we check it.')
    expect(f).not.toContain('We confirm your company’s size ourselves')
  })

  it('Terms: no band sentence — the price is not set from a size', () => {
    const t = site('terms.html')
    expect(t).not.toContain('your price is set from it')
    expect(t).not.toContain('confirms your band before you pay')
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
