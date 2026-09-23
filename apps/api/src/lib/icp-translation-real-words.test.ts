// ══════════════════════════════════════════════════════════════════════════════════════════
// THE TRANSLATOR ACCEPTS THE WORDS REAL CLIENTS ACTUALLY USE (19 Sep)
//
// 🛑 WHAT EARNED THIS FILE, AND IT WAS MEASURED ON PRODUCTION, NOT IMAGINED. Northstar
// Operations Studio completed their Brief, was promoted to a client, and never got a single
// lead. The production row:
//
//     awaiting_human_translation : true
//     proof_passes_done          : 0        ← no attempt was ever claimed
//     proof_records_committed    : 0        ← nothing was ever bought
//     records_requested          : 20
//     total_inserted             : 0
//     leads_total                : 0
//
// No search was ever made. `deriveProviderReview` matched their words EXACTLY against three
// closed lists; *"professional services"* is not one of the sixteen industry strings,
// *"Managing Directors"* is not one of the six seniority strings, and *"20-200"* is not one of
// the six size bands. Three unmapped values ⇒ a review is owed ⇒ `icp_review` is set ⇒
// `POST /icps/:id/proof` refuses at `icps.ts:7105` before claiming anything. The client was
// told a human would look. No human was told anything, because a client with no refused leads
// never reaches Vida's Needs-you rail.
//
// 🛑 SEVEN OF THE LAST SEVEN ATTEMPTS ENDED THIS WAY. That is the signature of a rule that
// refuses everybody, not of a client who described themselves oddly: businesses say
// professional services, operations consultancy, recruitment, accountancy, construction. The
// conversation was never the problem — Milla captured their words correctly. The translator
// downstream threw them away.
//
// ⚠️ WHAT THIS DOES NOT DO. It does not widen what may reach a provider: every alias resolves
// to a value ALREADY in the closed vocabulary, and every span expands to bands already in it.
// S1-PD-03 — no client sentence in a provider column — is exactly as strong as it was. And a
// word we still cannot place is still a review, in the client's own spelling, which is what
// that state was built for.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import {
  deriveProviderReview, translateProviderList, expandSizeSpan,
  PROVIDER_VOCABULARIES,
} from './icp-provider-translation'

const industries = PROVIDER_VOCABULARIES.industries
const seniority = PROVIDER_VOCABULARIES.seniority_levels
const sizes = PROVIDER_VOCABULARIES.company_sizes

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① THE EXACT PRODUCTION CASE — Northstar Operations Studio, as they described themselves
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('the client who got nothing', () => {
  it('🛑 NORTHSTAR IS SOURCEABLE — their targeting answers translate, so no review is owed', () => {
    // ⚠️ INDUSTRY IS NOT IN THIS CASE, DELIBERATELY. The industries column is fed from the
    // client's free-text `target_category`, which `j5c10-icp-review-is-a-task.test.ts` locks
    // as never becoming a provider filter and never owing a review (FD-2 enforces it
    // semantically instead). Northstar was parked on the two fields that ARE provider
    // filters — seniority and size — and those are what this repairs.
    const decision = deriveProviderReview({
      seniority_levels: ['Managing Directors', 'COO', 'senior operations leaders'],
      company_sizes: ['around 20-200 employees'],
    }, PROVIDER_VOCABULARIES)

    expect(decision.review, 'their brief still parks them for a human, so Proof stays frozen').toBeNull()
    expect(decision.values.seniority_levels).toContain('C-Suite')
    expect(decision.values.company_sizes).toEqual(['11–50', '51–200'])
  })

  it('🛑 AND THE INDUSTRY RULE IS UNTOUCHED — a free-text category still translates to nothing', () => {
    // The guarantee j5c10 holds, asserted here too so this file can never quietly erode it.
    const out = translateProviderList(['marketing agencies', 'professional services'], industries, 6)
    expect(out.canonical, 'an industry alias crept back in and now filters Apollo').toEqual([])
  })

  it('🛑 AND A SPAN IS BOTH BANDS — 20-200 is not 11–50 alone and not 51–200 alone', () => {
    // Snapping to one band would silently narrow or widen who they asked for. They were precise.
    expect(expandSizeSpan('around 20-200 employees', sizes)).toEqual(['11–50', '51–200'])
    expect(expandSizeSpan('50 to 500 people', sizes)).toEqual(['11–50', '51–200', '201–500'])
    expect(expandSizeSpan('1000+', sizes)).toEqual(['501–1,000', '1,000+'])
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② THE WORDS BUSINESSES ACTUALLY USE
//
// ⚠️ SENIORITY ONLY, AND THAT IS THE RULE RATHER THAN AN OMISSION. Industry aliasing was
// written here first and removed: the industries column is fed from the client's free-text
// `target_category`, which `j5c10-icp-review-is-a-task.test.ts` locks as never becoming a
// provider filter and never owing a review. FD-2 enforces category semantically instead.
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('real seniority reaches a canonical value', () => {
  const cases: [string, string][] = [
    ['Managing Director', 'C-Suite'],
    ['COO', 'C-Suite'],
    // ⛓️ 23 Sep (R142) — WAS `['Founder', 'C-Suite']` and `['VP', 'VP / Director']`: an exact
    // Apollo seniority was widened into one of OUR bands. Founder and VP are Apollo's own values
    // now, so the client's word is kept exactly — no assumption about what else they meant.
    ['Founder', 'Founder'],
    ['Chief Operating Officer', 'C-Suite'],
    ['Operations Director', 'VP / Director'],
    ['VP', 'VP'],
    ['Head of Operations', 'Head of'],
    ['senior operations leaders', 'Senior'],
  ]
  for (const [said, expected] of cases) {
    it(`"${said}" → ${expected}`, () => {
      const out = translateProviderList([said], seniority, 6)
      expect(out.unmapped, `"${said}" still goes to a human`).toEqual([])
      expect(out.canonical).toEqual([expected])
    })
  }
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ③ THE GUARANTEES THAT MUST NOT HAVE MOVED
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('nothing was loosened', () => {
  it('🛑 EVERY ALIAS RESOLVES INTO THE CLOSED LIST — a provider column can gain nothing new', () => {
    // The whole S1-PD-03 guarantee in one assertion, over every alias at once.
    for (const field of ['industries', 'seniority_levels', 'company_sizes'] as const) {
      const vocab = PROVIDER_VOCABULARIES[field]
      const probes = field === 'industries'
        ? ['professional services', 'healthcare', 'construction', 'nonsense-xyzzy']
        : field === 'seniority_levels'
          ? ['Managing Director', 'Founder', 'nonsense-xyzzy']
          : ['20-200', 'enterprise', 'nonsense-xyzzy']
      const out = translateProviderList(probes, vocab, 6)
      for (const v of out.canonical) {
        expect(vocab, `${field} produced "${v}", which is not in the closed vocabulary`).toContain(v)
      }
    }
  })

  it('🛑 A WORD WE GENUINELY CANNOT PLACE IS STILL A REVIEW, IN THEIR OWN SPELLING', () => {
    const out = translateProviderList(['Quantum Basket Weaving'], industries, 6)
    expect(out.canonical).toEqual([])
    expect(out.unmapped, 'the review queue must keep the exact words a human will read').toEqual(['Quantum Basket Weaving'])

    const decision = deriveProviderReview(
      { industries: ['Quantum Basket Weaving'] }, PROVIDER_VOCABULARIES)
    expect(decision.review, 'an untranslatable answer must still stop and ask').not.toBeNull()
  })

  it('an exact canonical value is untouched, and an empty answer owes nothing', () => {
    expect(translateProviderList(['SaaS', 'Fintech'], industries, 6).canonical).toEqual(['SaaS', 'Fintech'])
    expect(deriveProviderReview({ industries: [] }, PROVIDER_VOCABULARIES).review).toBeNull()
    expect(deriveProviderReview({}, PROVIDER_VOCABULARIES).review).toBeNull()
  })

  it('duplicates collapse — two words meaning one band are one band', () => {
    const out = translateProviderList(['consultancy', 'professional services', 'Consulting'], industries, 6)
    expect(out.canonical).toEqual(['Consulting'])
  })
})
