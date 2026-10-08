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
// ⛓️ 1 Oct (R182 · W-6): the founder then ruled the portals too ("all yes") — the qualified-meeting
// section is now pinned by `portal-terms-qualified-meeting.test.ts`.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '../../../portal')
const text = (p: string) => readFileSync(join(ROOT, p), 'utf8')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ').replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&rsquo;/g, '’')
  .replace(/&amp;/g, '&').replace(/\s+/g, ' ')

// ⛓️ 8 Oct (precision model, founder GO: "give me a PR to merge to make live"; "Yes, card on file";
// "24 hours") — R166's bands, one programme payment and shortfall credit are replaced for new clients.
// Both portal copies now state the precision model: a £1,000 setup fee by card before work begins, then
// £500 for each held meeting, charged to the card on file after it takes place, the same for every
// client, and nothing for a meeting that does not happen. Programmes agreed before 8 October keep the
// terms agreed at the time. The static file types the figures (no build step), held to the constants;
// the route interpolates them and types none.
// ⛓️ 8 Oct (later, R201 ⑥) — in US dollars now: $1,500 setup, $700 per held meeting. A pound price is the regression.
import { PRECISION_SETUP_FEE_USD, PRECISION_PER_HELD_MEETING_USD, formatUsdWhole } from '@kind/shared'
const raw = (p: string) => readFileSync(join(ROOT, p), 'utf8')

for (const f of ['public/terms.html', 'src/app/(legal)/terms/page.tsx']) {
  describe(f, () => {
    const t = text(f)
    it('one setup fee and one price per held meeting, the same for every client — no band, no other price, no pounds', () => {
      if (f.endsWith('.html')) {
        // text() turns each tag into a space, so "<strong>£1,000</strong>," reads "£1,000 ,".
        const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        expect(t).toMatch(new RegExp(`a one-off setup fee of ${esc(formatUsdWhole(PRECISION_SETUP_FEE_USD))}\\s*, paid before we start, and ${esc(formatUsdWhole(PRECISION_PER_HELD_MEETING_USD))}\\s+for each meeting that is held`))
      } else {
        expect(raw(f)).toContain('formatUsdWhole(PRECISION_SETUP_FEE_USD)')
        expect(raw(f)).toContain('formatUsdWhole(PRECISION_PER_HELD_MEETING_USD)')
        expect(t, 'a price is typed into what the route renders').not.toMatch(/[£$]\s?\d/)
      }
      expect(t, 'the size band is back').not.toMatch(/Founders \(1–50 employees\)|your price is set from it|confirms your band/)
      const allowed = [formatUsdWhole(PRECISION_SETUP_FEE_USD), formatUsdWhole(PRECISION_PER_HELD_MEETING_USD)]
      const dollars = [...t.matchAll(/\$\s?[\d,]*\d/g)].map(m => m[0].replace(/\s/g, ''))
      expect(dollars.filter(d => !allowed.includes(d)), 'a dollar figure other than the two prices').toEqual([])
      expect(t, 'a pound price is back').not.toMatch(/£\s?\d/)
    })
    it('the setup fee by card before work begins; each held meeting charged to the card on file; nothing sent before approval', () => {
      expect(t).toMatch(/paid by card/i)
      expect(t).toMatch(/card (you keep )?on file/i)
      expect(t).toMatch(/nothing is sent until you have approved it|No email is sent until you have approved it/i)
      expect(t, 'the one programme payment is back').not.toMatch(/in one payment, in full, when you accept/i)
    })
    it('no credit: a meeting that does not happen is not charged', () => {
      expect(t).toMatch(/If a meeting doesn[’']t happen, you don[’']t pay for it/)
      expect(t, 'the shortfall credit is back').not.toMatch(/once per client|expires 90 days after it is credited/i)
    })
    it('agreements made before 8 October 2026 keep the terms agreed at the time', () => {
      expect(t).toMatch(/before (these terms were updated on )?8 October 2026 continues on the terms agreed at the time/)
      expect(t, 'the halves are back as the current model').not.toMatch(/Payment 2 is never charged/)
    })
    // ⛓️ 8 Oct — WAS 'dated 1 October 2026'; `legal-pages-dated.test.ts` pins the date on every page.
    it('dated 8 October 2026', () => { expect(t).toMatch(/Last updated: 8 October 2026/) })
  })
}
