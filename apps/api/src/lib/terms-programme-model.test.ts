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

// ⛓️ 8 Oct (precision model, founder GO) — the portal Terms now describe the precision model, not the
// programme: a setup fee by card, then one price per held meeting charged to the card on file, nothing for
// a meeting that does not happen, no credit and no Payment 1 / Payment 2. The bans on every RETIRED model
// stay; the only change to them is that "not a wallet top-up model" is a denial, like "no subscription".
describe('the portal Terms describe the model being sold (R140, amended 8 Oct)', () => {
  for (const f of FILES) {
    const t = text(f)
    it(`🛑 ${f} carries no retired commercial model`, () => {
      const denials = t.replace(/this is not a wallet top-up model/gi, '')
      for (const banned of [
        /\$\s?1 per credit/i, /\$\s?3 per credit/i, /bundle/i, /top[- ]?up/i, /FIGSY/,
        /onboarding pack/i, /per approved lead/i, /approved leads? included/i, /\$299/, /\$4\b/,
        /Credit System/i, /Downgrade/i, /qualified lead is defined/i,
      ]) expect(denials, `${f}: ${banned}`).not.toMatch(banned)
      // Only "no subscription" may mention a subscription.
      expect(t.replace(/no subscription/gi, ''), `${f}: a subscription is described`).not.toMatch(/subscription/i)
    })

    it(`🛑 ${f} states the precision model as ruled`, () => {
      expect(t).toMatch(/held meeting/)
      expect(t).toMatch(/card (you keep )?on file/i)
      expect(t).toMatch(/If a meeting doesn[’'&rsquo;]+t happen, you don[’'&rsquo;]+t pay for it/)
      expect(t, `${f} still sells the two payments`).not.toMatch(/Payment 1|Payment 2/)
      expect(t, `${f} still promises account credit`).not.toMatch(/credited to your K\.I\.N\.D account/i)
      expect(t, `${f} names the internal limit`).not.toMatch(/\b400\b/)
    })
  }

  it('the guarded legal sentences survive (no trial, no outcome guarantee)', () => {
    const pub = readFileSync(join(ROOT, 'public/terms.html'), 'utf8')
    expect(pub).toContain('There is no free trial')
    // ⛓️ 8 Oct — the portal Terms are the website's text: "No guarantee of results", and no number of
    // meetings is promised (WAS "No Outcome Guarantee" / "a target we work towards, not a guarantee").
    expect(pub).toContain('No guarantee of results')
    expect(text('public/terms.html')).toMatch(/We do not guarantee any number of meetings/)
  })
})
