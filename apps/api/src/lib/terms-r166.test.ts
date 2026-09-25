// ═══════════════════════════════════════════════════════════════════════════════════════
// 25 Sep (R166 · P12, board #2358) — THE PORTAL TERMS STATE THE NEW TERMS, IN BOTH COPIES.
//
// R166: price per meeting by the client's own company size (Founders 1–50 · Growth 51–200 ·
// Enterprise 200+), no volume discount; ONE payment in full at acceptance; the shortfall credit
// once per client, expiring after 90 days. Programmes already running keep their terms (⑧), so
// the two-payment clause stays, labelled as the earlier terms.
// ⚠️ NO PRICE IS TYPED INTO LEGAL TEXT — the rates live on the Pricing page (rule 7: money
// sentences are interpolated, never typed). The founder's scope for the qualified-meeting
// definition was "not the portals", so that section is deliberately unchanged here.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '../../../portal')
const text = (p: string) => readFileSync(join(ROOT, p), 'utf8')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ').replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&rsquo;/g, '’')
  .replace(/&amp;/g, '&').replace(/\s+/g, ' ')

for (const f of ['public/terms.html', 'src/app/(legal)/terms/page.tsx']) {
  describe(f, () => {
    const t = text(f)
    it('prices by company size, set by us, with no volume discount — and types no price', () => {
      expect(t).toMatch(/Founders \(1–50 employees\), Growth \(51–200\) or Enterprise \(more than 200\)/)
      expect(t).toMatch(/Pricing page/)
      if (f.endsWith('.html')) {
        // ⛓️ 25 Sep (R168 ④ · P13b) — WAS `/you do not choose your band/` (R166 ②: "never chosen by
        // the client"). The founder then ruled that the client TELLS us their size and we check it,
        // and approved this exact sentence for the Terms. The old line is now forbidden, not merely
        // absent.
        expect(t).not.toMatch(/you do not choose your band/)
        expect(t).toMatch(/There is no volume discount/)
      }
      // ⚑ 25 Sep (R168 ④) — the approved size sentence, in both the Terms file and the page.
      expect(t).toContain('You tell us the size of your company when you sign up, and your price is set from it. We check it against company records; if they show your company is larger, our team confirms your band before you pay.')
      expect(t).not.toMatch(/\$\s?\d/)
    })
    it('one payment, in full, when you accept; outreach only after approval', () => {
      expect(t).toMatch(/in one payment, in full/i)
      expect(t).toMatch(/outreach begins only after you approve the prepared package/i)
    })
    it('the credit: once per client, expires 90 days after it is credited', () => {
      expect(t).toMatch(/once per client/i)
      expect(t).toMatch(/expires 90 days after it is credited/i)
    })
    it('⛓️ the earlier two-payment terms are kept, and labelled as the earlier terms', () => {
      expect(t).toMatch(/under our earlier terms/i)
      expect(t).toMatch(/Payment 2 is never charged/)
    })
    it('dated 25 September 2026', () => { expect(t).toMatch(/Last updated: 25 September 2026/) })
  })
}
