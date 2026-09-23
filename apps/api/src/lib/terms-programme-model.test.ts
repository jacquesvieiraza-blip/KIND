// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 23 Sep — THE PORTAL TERMS DESCRIBE THE PROGRAMME, NOT A MODEL NOBODY IS SOLD (R140)
//
// Founder, asked whether to draft Terms wording for legal: *"dont draft. update."* The two
// portal copies — `public/terms.html` (what the sign-up checkbox links to, so what a client
// actually agrees to) and the `/terms` route — still described $1/$3 credit bundles, top-ups,
// FIGSY tiers, a $299 onboarding pack and a per-approved-lead charge, all retired (R124 · R137).
//
// Every sentence now written comes from a locked ruling: the two 50/50 payments and what each
// authorises, pause-before-go-live, the target-not-a-guarantee (R136 ②), the shortfall as
// account credit toward the first payment of a future programme, never back to the card
// (R136 ④ and Q1), and no subscription (R124). The 400 is never named (R136 ③).
// ⚠️ `apps/website/terms.html` is outside what this repo's agent may change and is untouched.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '../../../portal')
const text = (p: string) => readFileSync(join(ROOT, p), 'utf8')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ').replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&mdash;/g, '—').replace(/&amp;/g, '&').replace(/\s+/g, ' ')

const FILES = ['public/terms.html', 'src/app/(legal)/terms/page.tsx'] as const

describe('the portal Terms describe the programme (R140)', () => {
  for (const f of FILES) {
    const t = text(f)
    it(`🛑 ${f} carries no retired commercial model`, () => {
      for (const banned of [
        /\$\s?1 per credit/i, /\$\s?3 per credit/i, /bundle/i, /top[- ]?up/i, /FIGSY/,
        /onboarding pack/i, /per approved lead/i, /approved leads? included/i, /\$299/, /\$4\b/,
        /Credit System/i, /Downgrade/i, /qualified lead is defined/i,
      ]) expect(t, `${f}: ${banned}`).not.toMatch(banned)
      // Only "no subscription" may mention a subscription.
      expect(t.replace(/no subscription/gi, ''), `${f}: a subscription is described`).not.toMatch(/subscription/i)
    })

    it(`🛑 ${f} states the programme as ruled`, () => {
      expect(t).toMatch(/Payment 1/)
      expect(t).toMatch(/Payment 2/)
      expect(t).toMatch(/pause before your programme goes live, Payment 2 is never charged/i)
      expect(t).toMatch(/credited to your K\.I\.N\.D account/i)
      expect(t).toMatch(/not paid back to your card/i)
      expect(t, `${f} names the internal limit`).not.toMatch(/\b400\b/)
    })
  }

  it('the guarded legal sentences survive (no trial, no outcome guarantee)', () => {
    const pub = readFileSync(join(ROOT, 'public/terms.html'), 'utf8')
    expect(pub).toContain('There is no free trial')
    expect(pub).toContain('No Outcome Guarantee')
    expect(text('public/terms.html')).toMatch(/target we work towards, not a guarantee/i)
  })
})
