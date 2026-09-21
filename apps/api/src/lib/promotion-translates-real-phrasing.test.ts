// ═══════════════════════════════════════════════════════════════════════════════════════
// THE PROMOTION BOUNDARY, MEASURED — WHAT ACTUALLY PARKS A CLIENT AND WHAT DOES NOT
//
// 🛑 THIS FILE EXISTS BECAUSE I GOT THIS WRONG AND THE FENCE CAUGHT ME. The diagnosis going
// into this build was that `POST /icps` parks clients by overwriting Milla's enum-constrained
// proposal with the confirmed draft's raw words:
//
//     const siz = list(f.company_sizes);       if (siz) body.company_sizes = siz
//
// That override is real. **It does not park anybody**, because it is not the last word:
// `deriveProviderReview` runs at the write boundary — the last line before the values become
// a row — and canonicalises whatever `body` holds. Measured on the real functions:
//
//     "about 10 to 50 staff"             → ["1–10","11–50"]   no review
//     "around 10 to 50 people"           → ["1–10","11–50"]   no review
//     "10-50 employees"                  → ["1–10","11–50"]   no review
//     "mid market"                       → ["201–500"]        no review
//     "whatever size feels right to you" → []                 REVIEW RAISED
//
// ⛓️ R135 (19 Sep, already merged) IS WHAT MADE THAT TRUE — `PROVIDER_ALIASES` and
// `expandSizeSpan` are why a sentence a person would really say now reads as bands. The seven
// clients who sat parked were parked BEFORE it shipped, and their stale `icp_review` rows are
// cleared by an operator, not by another translation build. That is the `resolve_icp_review`
// button, which until today did nothing.
//
// 🛑 AND THE LAST CASE MUST KEEP PARKING, WHICH IS WHY THE "FIX" I NEARLY SHIPPED WAS WRONG.
// I had promotion fall back to Milla's proposal when the client's words would not translate.
// `s1-predeploy-authority.test.ts` refused it in three places, correctly: **S1-PD-02
// (founder-locked 14 Sep)** says a fact the gate accepted may not vanish into an empty filter
// — and a phrase we cannot read must reach a HUMAN, not be quietly replaced by the model's
// guess at what they meant. *"Picking one for them is inventing their targeting."* A client
// who said "whatever size feels right to you" has not chosen a size, and shipping leads
// against a guess is worse than asking.
//
// ⚠️ SO THIS FILE GUARDS THE BOUNDARY AS IT ACTUALLY IS: the phrasing real people use reaches
// the provider as vocabulary, the phrasing nobody could place reaches a person, and neither
// ever becomes an empty filter nobody was told about.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { deriveProviderReview, PROVIDER_VOCABULARIES } from './icp-provider-translation'

const V = PROVIDER_VOCABULARIES
const VOCAB = {
  industries: V.industries,
  seniority_levels: V.seniority_levels,
  company_sizes: V.company_sizes,
}

/** Exactly what the write boundary in `POST /icps` computes, on the real functions. */
const atWriteBoundary = (over: { company_sizes?: string[]; seniority_levels?: string[] }) =>
  deriveProviderReview(
    { industries: [], company_sizes: [], seniority_levels: [], ...over },
    VOCAB,
  )

describe('the phrasing real people use reaches Apollo as vocabulary', () => {
  // 🛑 THE FOUNDER'S OWN CLIENT SAID THE FIRST OF THESE. If any of them ever stops reading as
  // bands, a client is parked on an answer they gave perfectly well — which is the defect this
  // whole batch exists to end.
  for (const said of [
    'about 10 to 50 staff',
    'around 10 to 50 people',
    '10-50 employees',
    'mid market',
    '11–50',
  ]) {
    it(`🛑 "${said}" is searchable, and raises no review`, () => {
      const d = atWriteBoundary({ company_sizes: [said] })
      expect(d.values.company_sizes.length, 'the client is parked on their own answer').toBeGreaterThan(0)
      expect(d.review, 'a translatable phrase raised a review').toBeNull()
      for (const v of d.values.company_sizes) {
        expect(V.company_sizes, `"${v}" is not provider vocabulary`).toContain(v)
      }
    })
  }

  it('🛑 AND A SPAN IS WIDENED, NOT NARROWED — the founder ruled "the widest possible outcome"', () => {
    // `expandSizeSpan` reads "10 to 50" as covering BOTH bands it touches, because a client
    // who says that really does mean to include ten-person companies. Pinning it to one band
    // would quietly re-narrow exactly what he asked to be widened.
    expect(atWriteBoundary({ company_sizes: ['about 10 to 50 staff'] }).values.company_sizes)
      .toEqual(['1–10', '11–50'])
  })

  it('spoken seniority reaches the provider as vocabulary too', () => {
    const d = atWriteBoundary({ seniority_levels: ['managing director'] })
    expect(d.values.seniority_levels.length).toBeGreaterThan(0)
    expect(d.review).toBeNull()
  })
})

describe('🛑 the phrasing nobody could place reaches a PERSON — S1-PD-02, unmoved', () => {
  it('an unplaceable size raises the review and never reaches the column', () => {
    // ⚠️ THIS IS THE CASE I NEARLY BROKE. Falling back to the model's proposal here would
    // ship leads against a guess at what the client meant, and S1-PD-02 forbids exactly that.
    const d = atWriteBoundary({ company_sizes: ['whatever size feels right to you'] })
    expect(d.values.company_sizes, "the client's sentence is not a filter value").toEqual([])
    expect(d.review).toEqual({
      requirements: [{ field: 'company_sizes', said: ['whatever size feels right to you'] }],
    })
  })

  it('an unplaceable seniority does the same on the other closed list', () => {
    const d = atWriteBoundary({ seniority_levels: ['the person who owns the budget'] })
    expect(d.values.seniority_levels).toEqual([])
    expect(d.review).not.toBeNull()
  })

  it('🛑 THEIR EXACT WORDS SURVIVE FOR THE HUMAN WHO HAS TO READ THEM', () => {
    // Not normalised, not stemmed, not nearest-matched: a tidied version of an answer is a
    // worse input to a person's decision than the answer.
    const said = 'small independent studios, nothing corporate'
    const d = atWriteBoundary({ company_sizes: [said] })
    expect(JSON.stringify(d.review)).toContain(said)
  })

  it('a MIXED list keeps the half that translated and flags only the half that did not', () => {
    const d = atWriteBoundary({ company_sizes: ['11–50', 'whatever size feels right to you'] })
    expect(d.values.company_sizes, 'the readable half was thrown away with the unreadable one')
      .toContain('11–50')
    expect(d.review, 'the unreadable half vanished silently').not.toBeNull()
  })
})

describe('🛑 readiness is always backed — searchable, or visibly under review, never neither', () => {
  it('no input ever produces an empty filter with nobody told', () => {
    // The founder's ruling #3 — *"we should not present readiness to a client and let them
    // progress to the next screen if we do not have the information"* — held as an invariant
    // over the real boundary rather than as a new refusal path that could never fire.
    for (const said of [
      [], ['11–50'], ['about 10 to 50 staff'], ['mid market'],
      ['whatever size feels right to you'], ['11–50', 'whatever size feels right to you'],
    ]) {
      const d = atWriteBoundary({ company_sizes: said })
      if (said.length === 0) continue
      const searchable = d.values.company_sizes.length > 0
      const flagged = d.review !== null
      expect(searchable || flagged, `${JSON.stringify(said)} is neither searchable nor flagged`).toBe(true)
    }
  })
})
