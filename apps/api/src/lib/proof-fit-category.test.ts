import { describe, it, expect } from 'vitest'
import {
  hardFit, structuralVerdict, structurallyEligible, setAsideReason,
  HARD_CRITERIA, type FitIcp, type FitCandidate,
} from './proof-fit'

// ═══════════════════════════════════════════════════════════════════════════════════════
// STRUCTURAL FIT — CATEGORY AND COMPANY TYPE, TWO INDEPENDENT REQUIRED DIMENSIONS.
//
// 🛑 FOUNDER-LOCKED. Target company category and target company type are two separate
// required hard-fit dimensions once the Brief is confirmed. They are NOT one fact wearing
// two names: a client who said "digital marketing" has stated the category and NOT the
// organisational form, and a prospect can satisfy one while contradicting the other.
//
// ── THE VERDICT RULE, VERBATIM ──────────────────────────────────────────────────────────
//   PASS    = prospect evidence SUPPORTS the requirement
//   FAIL    = prospect evidence CONTRADICTS the requirement
//   UNKNOWN = evidence is missing, ambiguous, or insufficient to establish compatibility
//
//   any required FAIL                    → NOT FIT
//   no FAIL, one or more UNKNOWN         → UNKNOWN
//   all required dimensions PASS         → PASS
//
// 🛑 AND UNKNOWN MAY NEVER BE PROMOTED TO PASS TO FILL A PROOF SET. That is the whole point:
// the pressure to show twenty cards is exactly the pressure that turns "we do not know" into
// "we'd start here", which is the card the founder caught on the live canary.
//
// ⚠️ THIS TIGHTENS AN EXISTING CONTRACT, DELIBERATELY. `structurallyEligible` used to mean
// "nothing said no" — so an UNKNOWN candidate counted as eligible and was merely never
// starred. Under the locked rule an UNKNOWN candidate is NOT an eligible Proof match. It is
// still SURFACED, as a set-aside prospect with its reason named (Preview 02 and Preview 08
// both show exactly that: "4 eligible matches + 1 prospect set aside"). Not counted is not
// the same as not shown.
//
// ⚠️ AN UNSTATED REQUIREMENT IS NOT A TEST. A legacy ICP carries NULL for both new columns —
// "not collected", per the founder's legacy-NULL rule — and nothing may be fabricated for it.
// So an absent requirement answers `yes`: there is nothing unknown about a requirement that
// does not exist. Making it UNKNOWN instead would empty every legacy client's Proof set,
// which is a catastrophic regression dressed up as caution.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** The MVP1 client: both dimensions stated, in their own words. */
const ICP: FitIcp = {
  target_category: 'Digital marketing agencies',
  target_company_type: 'agency',
}

const cand = (o: Partial<FitCandidate> = {}): FitCandidate => ({ ...o })

describe('① the two dimensions are required criteria in their own right', () => {
  it('both appear in the canonical criteria list', () => {
    expect(HARD_CRITERIA).toContain('category')
    expect(HARD_CRITERIA).toContain('company_type')
  })

  it('🛑 they are SEPARATE — neither is an alias of the other or of industry', () => {
    expect(new Set(HARD_CRITERIA).size).toBe(HARD_CRITERIA.length)
    expect(HARD_CRITERIA).toContain('industry')
  })
})

describe('② category — semantic and tolerant, never exact equality', () => {
  it('1 · a semantic match passes', () => {
    const f = hardFit(cand({
      company: 'Fathom Digital', industry: 'Marketing & Advertising',
      company_description: 'Full-service digital performance agency',
    }), ICP)
    expect(f.category).toBe('yes')
  })

  it('2 · exact wording is NOT required — the stored phrase is plural and capitalised', () => {
    const f = hardFit(cand({ industry: 'digital marketing' }), ICP)
    expect(f.category).toBe('yes')
  })

  it('3 · a definite mismatch fails', () => {
    // A management consultancy tagged "Consulting" shares nothing with the requirement.
    // This is the founder's own live-canary card.
    const f = hardFit(cand({ company: 'Northgate Partners', industry: 'Consulting' }), ICP)
    expect(f.category).toBe('no')
  })

  it('4 · evidence that neither supports nor contradicts is UNKNOWN, never a pass', () => {
    // ⚠️ THE FOUNDER'S OWN EXAMPLE. "Marketing & Advertising" alone is adjacent to "Digital
    // marketing agencies" — it does not establish it and it does not contradict it.
    const f = hardFit(cand({ industry: 'Marketing & Advertising' }), ICP)
    expect(f.category).toBe('unknown')
  })

  it('4b · no evidence at all is UNKNOWN', () => {
    expect(hardFit(cand({}), ICP).category).toBe('unknown')
  })

  it('an unstated requirement is not a test — a legacy ICP is unaffected', () => {
    expect(hardFit(cand({ industry: 'Consulting' }), {}).category).toBe('yes')
  })
})

describe('③ company type — an independent structural requirement', () => {
  it('5 · a definite match passes', () => {
    expect(hardFit(cand({ company: 'Fathom Digital Agency', industry: 'Marketing & Advertising' }), ICP)
      .company_type).toBe('yes')
  })

  it('5b · the organisational word may come from any evidence field', () => {
    expect(hardFit(cand({ company_description: 'an independent creative agency' }), ICP)
      .company_type).toBe('yes')
  })

  it('6 · a definite mismatch fails — agency required, consultancy evidenced', () => {
    const f = hardFit(cand({
      company: 'Northgate Consultancy', company_description: 'A management consultancy',
    }), ICP)
    expect(f.company_type).toBe('no')
  })

  it('7 · evidence that establishes no organisational form is UNKNOWN', () => {
    // 🛑 DO NOT INFER PASS FROM A BROAD PROVIDER CATEGORY. "Marketing & Advertising" says
    // nothing about whether this is an agency, an in-house team or a software vendor.
    expect(hardFit(cand({ industry: 'Marketing & Advertising' }), ICP).company_type).toBe('unknown')
  })

  it('7b · no evidence at all is UNKNOWN', () => {
    expect(hardFit(cand({}), ICP).company_type).toBe('unknown')
  })

  it('an unstated requirement is not a test', () => {
    expect(hardFit(cand({ industry: 'Consulting' }), { target_category: 'x' }).company_type).toBe('yes')
  })
})

describe('④ the overall verdict', () => {
  const AGENCY = cand({
    company: 'Fathom Digital', industry: 'Marketing & Advertising',
    company_description: 'Full-service digital performance agency',
    country: 'United Kingdom', company_size: '11–50', job_title: 'Managing Director',
  })
  const FULL: FitIcp = {
    ...ICP, geographies: ['United Kingdom'], company_sizes: ['11–50'],
    job_titles: ['Managing Director'],
  }

  it('10 · all required dimensions PASS → an eligible pass', () => {
    const f = hardFit(AGENCY, FULL)
    expect(structuralVerdict(f)).toBe('pass')
    expect(structurallyEligible(f)).toBe(true)
  })

  it('8 · category PASS + company type UNKNOWN → overall UNKNOWN', () => {
    const f = hardFit({ ...AGENCY, company: 'Fathom Digital', company_description: 'Digital marketing for brands' }, FULL)
    expect(f.category).toBe('yes')
    expect(f.company_type).toBe('unknown')
    expect(structuralVerdict(f)).toBe('unknown')
  })

  it('9 · category PASS + company type FAIL → NOT FIT', () => {
    const f = hardFit({
      ...AGENCY, company: 'Fathom Consultancy',
      company_description: 'Digital marketing consultancy',
    }, FULL)
    expect(f.category).toBe('yes')
    expect(f.company_type).toBe('no')
    expect(structuralVerdict(f)).toBe('not_fit')
  })

  it('a FAIL anywhere outranks every UNKNOWN', () => {
    const f = hardFit({ company: 'Northgate', industry: 'Consulting' }, FULL)
    expect(structuralVerdict(f)).toBe('not_fit')
  })
})

describe('⑤ 11 · an UNKNOWN prospect is NOT an eligible Proof match', () => {
  it('🛑 structurallyEligible is false for UNKNOWN — it is not "nothing said no"', () => {
    const f = hardFit(cand({ industry: 'Marketing & Advertising' }), ICP)
    expect(structuralVerdict(f)).toBe('unknown')
    expect(structurallyEligible(f), 'UNKNOWN must never count as an eligible match').toBe(false)
  })

  it('…and it is still SURFACED, with its reason named', () => {
    // Not counted is not the same as not shown. Preview 02 and 08 both show set-aside
    // prospects with the reason printed on the card.
    const reason = setAsideReason(hardFit(cand({ industry: 'Marketing & Advertising' }), ICP))
    expect(reason).toBeTruthy()
    expect(String(reason)).toMatch(/could not be confirmed|not the kind of company/)
  })

  it('a genuine refusal still reads as a refusal, not as "unconfirmed"', () => {
    const reason = setAsideReason(hardFit(cand({ industry: 'Consulting' }), ICP))
    expect(String(reason)).toContain('not the kind of company you asked for')
  })
})

describe('⑥ 12 · provider taxonomy cannot overwrite stored client wording', () => {
  it('the requirement read is the CLIENT column, never `industries`', () => {
    // `industries` is the closed sixteen-value provider list. If it could satisfy the
    // category requirement, a provider label would be deciding client intent.
    const providerOnly: FitIcp = { industries: ['Consulting'] }
    expect(hardFit(cand({ industry: 'Consulting' }), providerOnly).category)
      .toBe('yes')   // unstated CLIENT requirement — not a test at all
    const bothStated: FitIcp = { ...ICP, industries: ['Consulting'] }
    // The client asked for digital marketing agencies; a provider tag saying Consulting
    // cannot make a consultancy satisfy that.
    expect(hardFit(cand({ industry: 'Consulting' }), bothStated).category).toBe('no')
  })

  it('hardFit is pure — it never writes back to the icp it was given', () => {
    const icp: FitIcp = { ...ICP, industries: ['Consulting'] }
    const before = JSON.stringify(icp)
    hardFit(cand({ industry: 'Marketing & Advertising' }), icp)
    expect(JSON.stringify(icp), 'the stored client wording was mutated').toBe(before)
  })
})
