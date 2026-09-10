// ═══════════════════════════════════════════════════════════════════════════════════════
// 🛑 THE CARD THE FOUNDER CAUGHT ON 10 Sep, AND EVERY WAY IT COULD COME BACK.
//
// He targeted UK digital marketing agencies, 10–50 staff, Founder or CEO. Proof showed him
// management consultancies scored **70–75** and starred **"We'd start here"**, above a reason
// that read *"no evidence of digital marketing or agency focus."*
//
// The canary target below is his, verbatim, and the first case is the exact card. Everything
// after it is a way the same defect returns while somebody fixes something else.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import {
  hardFit, structurallyEligible, firstHardFailure, unknownCriteria, setAsideReason,
  fitBand, displayScore, isStarred, BAND_LABEL,
  START_HERE_MIN_SCORE, UNKNOWN_SCORE_CAP, NOT_A_FIT_SCORE_CAP,
  HARD_CRITERIA, type FitCandidate, type FitIcp,
} from './proof-fit'

/** The founder's own canary targeting, 10 Sep. */
const CANARY: FitIcp = {
  geographies: ['United Kingdom'],
  company_sizes: ['11–50'],
  industries: ['Digital Marketing'],
  job_titles: ['Founder', 'CEO'],
  seniority_levels: ['founder', 'c_suite'],
}

/** A person who genuinely is what he asked for. */
const GOOD: FitCandidate = {
  country: 'United Kingdom',
  company_size: '11–50',
  industry: 'Digital Marketing Agency',
  job_title: 'Founder',
  seniority: 'founder',
}

describe('🛑 ① the exact card he caught', () => {
  it('a management consultancy is NOT a fit, whatever the model scored it', () => {
    const consultancy: FitCandidate = { ...GOOD, industry: 'Management Consulting' }
    const f = hardFit(consultancy, CANARY)

    expect(f.industry).toBe('no')
    expect(structurallyEligible(f)).toBe(false)
    expect(firstHardFailure(f)).toBe('industry')

    // 🛑 THE THREE THINGS THAT MADE THE CARD, ALL THREE NOW IMPOSSIBLE.
    expect(fitBand(f, 72)).toBe('not_a_fit')                 // was "We'd start here"
    expect(isStarred(fitBand(f, 72))).toBe(false)            // was starred
    expect(displayScore(f, 72)).toBeLessThanOrEqual(NOT_A_FIT_SCORE_CAP)  // was 72
  })

  it('…and it is set aside with a reason an operator can answer', () => {
    const f = hardFit({ ...GOOD, industry: 'Management Consulting' }, CANARY)
    const reason = setAsideReason(f)
    expect(reason).toBe('industry: not the kind of company you asked for')
    // Never our vocabulary: no score, no provider, no column names.
    for (const leak of ['score', 'apollo', 'pdl', 'null', 'icp_id']) {
      expect(String(reason).toLowerCase().includes(leak), `the reason leaks "${leak}"`).toBe(false)
    }
  })

  it('the person he actually asked for passes every criterion and can be starred', () => {
    const f = hardFit(GOOD, CANARY)
    expect(f).toEqual({ geography: 'yes', size: 'yes', industry: 'yes', seniority: 'yes' })
    expect(fitBand(f, 82)).toBe('start_here')
    expect(isStarred(fitBand(f, 82))).toBe(true)
    expect(displayScore(f, 82)).toBe(82)
  })
})

describe('🛑 ② each hard criterion refuses on its own', () => {
  const cases: [string, FitCandidate, string][] = [
    ['a German agency', { ...GOOD, country: 'Germany' }, 'geography'],
    ['a 500-person agency', { ...GOOD, company_size: '201–500' }, 'size'],
    ['a procurement firm', { ...GOOD, industry: 'Procurement' }, 'industry'],
    ['a marketing intern', { ...GOOD, job_title: 'Marketing Intern', seniority: 'entry' }, 'seniority'],
  ]
  for (const [what, candidate, criterion] of cases) {
    it(`${what} fails on ${criterion} and never surfaces`, () => {
      const f = hardFit(candidate, CANARY)
      expect(firstHardFailure(f)).toBe(criterion)
      expect(structurallyEligible(f)).toBe(false)
      expect(fitBand(f, 99)).toBe('not_a_fit')
    })
  }

  it('every criterion is capable of refusing — none is decorative', () => {
    // A criterion that can never return `no` is a filter that does nothing, which is the
    // state this whole file replaces. Proved per criterion rather than asserted.
    const refusable = HARD_CRITERIA.filter(k =>
      cases.some(([, cand]) => hardFit(cand, CANARY)[k] === 'no'))
    expect(refusable.sort()).toEqual([...HARD_CRITERIA].sort())
  })
})

describe('🛑 ③ the substring accidents that are already in this repo\'s history', () => {
  // ⛓️ `pool-sourcing.ts` compared countries with `includes`, so a US target matched
  // Australia, Austria, Belarus, Cyprus and Mauritius, and `'ukraine'.includes('uk')`
  // matched the UK. That bug must not be reintroduced by a different file.
  it('a UK target is NOT satisfied by Ukraine', () => {
    expect(hardFit({ ...GOOD, country: 'Ukraine' }, CANARY).geography).toBe('no')
  })

  it('a US target is NOT satisfied by Australia or Mauritius', () => {
    const us: FitIcp = { ...CANARY, geographies: ['United States'] }
    expect(hardFit({ ...GOOD, country: 'Australia' }, us).geography).toBe('no')
    expect(hardFit({ ...GOOD, country: 'Mauritius' }, us).geography).toBe('no')
  })

  it('…and GB / England DO satisfy a "United Kingdom" target', () => {
    // The other direction of the same bug: owned inventory made invisible by spelling.
    for (const spelling of ['GB', 'England', 'united kingdom', 'UK']) {
      expect(hardFit({ ...GOOD, country: spelling }, CANARY).geography,
        `${spelling} was refused as the UK`).toBe('yes')
    }
  })

  it('🛑 "marketing" alone does not satisfy "digital marketing"', () => {
    // THE KEYWORD-TAG LEAK. The provider is asked for industries as keyword TAGS, so a
    // request for "digital marketing" returns anything tagged either word. This is the check
    // that stops that generosity reaching the client.
    expect(hardFit({ ...GOOD, industry: 'Marketing Technology' }, CANARY).industry).toBe('no')
    expect(hardFit({ ...GOOD, industry: 'Digital Transformation' }, CANARY).industry).toBe('no')
    // …and a real digital marketing agency still passes, however it is worded.
    //
    // ⚠️ THE LAST TWO ARE THE ONES THAT MAKE THIS GUARD BITE. A substring compare of the
    // requested phrase gets the refusals above right by accident — "management consulting"
    // does not contain "digital marketing" either way. Where it FAILS is the other
    // direction: a provider that words the same industry with the terms reordered or
    // separated is a genuine match that `includes` throws away. A mutation to
    // `value.includes(r)` is red on these two and on nothing else.
    for (const ok of [
      'Digital Marketing', 'Digital Marketing Agency', 'digital marketing & advertising',
      'Marketing and Digital Services', 'Marketing (Digital)',
    ]) {
      expect(hardFit({ ...GOOD, industry: ok }, CANARY).industry, `${ok} was refused`).toBe('yes')
    }
  })

  it('size is a band, not a string — 11-50 and "11 – 50" are the same size', () => {
    for (const spelling of ['11-50', '11 – 50', '11–50']) {
      expect(hardFit({ ...GOOD, company_size: spelling }, CANARY).size, `${spelling} was refused`).toBe('yes')
    }
  })
})

describe('🛑 ④ unknown is admissible, and never starred', () => {
  it('a blank industry is unknown — not a refusal', () => {
    const f = hardFit({ ...GOOD, industry: null }, CANARY)
    expect(f.industry).toBe('unknown')
    expect(structurallyEligible(f)).toBe(true)     // it may still be the right company
    expect(unknownCriteria(f)).toEqual(['industry'])
  })

  it('🛑 …but it can never be "We\'d start here", at any score', () => {
    const f = hardFit({ ...GOOD, industry: null }, CANARY)
    for (const score of [75, 88, 99, 100]) {
      expect(fitBand(f, score), `a ${score} with an unknown criterion was starred`).toBe('worth_a_look')
      expect(isStarred(fitBand(f, score))).toBe(false)
      expect(displayScore(f, score)).toBeLessThanOrEqual(UNKNOWN_SCORE_CAP)
    }
  })

  it('a criterion the client never asked for is `yes`, not `unknown`', () => {
    // Nothing is unknown about a requirement that does not exist — and treating it as
    // unknown would mean a client who named only a country could never see a starred card.
    const geoOnly: FitIcp = { geographies: ['United Kingdom'] }
    const f = hardFit({ country: 'United Kingdom' }, geoOnly)
    expect(f).toEqual({ geography: 'yes', size: 'yes', industry: 'yes', seniority: 'yes' })
    expect(fitBand(f, 90)).toBe('start_here')
  })

  it('an unrecognised size band is unknown, not a refusal — our vocabulary gap, not their fault', () => {
    const f = hardFit({ ...GOOD, company_size: '7 people' }, CANARY)
    expect(f.size).toBe('unknown')
    expect(structurallyEligible(f)).toBe(true)
    expect(isStarred(fitBand(f, 95))).toBe(false)
  })

  it('seniority is satisfied by the title when the level is silent, and vice versa', () => {
    expect(hardFit({ ...GOOD, seniority: null, job_title: 'Founder' }, CANARY).seniority).toBe('yes')
    expect(hardFit({ ...GOOD, job_title: null, seniority: 'founder' }, CANARY).seniority).toBe('yes')
    expect(hardFit({ ...GOOD, job_title: null, seniority: null }, CANARY).seniority).toBe('unknown')
  })
})

describe('🛑 ⑤ the star is fit, never rank, and never a guess', () => {
  it(`${START_HERE_MIN_SCORE} is the floor, and 74 is not a star`, () => {
    const f = hardFit(GOOD, CANARY)
    expect(fitBand(f, START_HERE_MIN_SCORE)).toBe('start_here')
    expect(fitBand(f, START_HERE_MIN_SCORE - 1)).toBe('worth_a_look')
  })

  it('🛑 an UNSCORED lead is never starred — a missing judgement is not a good one', () => {
    // #358's rule extended to the label: we never fabricate a score, so we never imply one.
    const f = hardFit(GOOD, CANARY)
    for (const score of [null, undefined, NaN]) {
      expect(fitBand(f, score as number | null), `${String(score)} was starred`).toBe('worth_a_look')
      expect(displayScore(f, score as number | null)).toBeNull()
    }
  })

  it('🛑 the band asks about ONE candidate — twenty good cards do not dilute each other', () => {
    // THE DEFECT THIS REPLACES was `slice(0, 20)` — the top 20 BY SCORE, on a pass that
    // surfaces exactly 20, so every card was starred including the worst. A band cannot be
    // inflated or deflated by the company it keeps.
    const f = hardFit(GOOD, CANARY)
    const set = [95, 91, 88, 85, 80, 78, 76, 75].map(s => fitBand(f, s))
    expect(set.every(b => b === 'start_here')).toBe(true)
    const weak = [74, 60, 51, 50].map(s => fitBand(f, s))
    expect(weak.every(b => b === 'worth_a_look')).toBe(true)
  })

  it('the displayed number can never claim more than the structure supports', () => {
    const refused = hardFit({ ...GOOD, industry: 'Management Consulting' }, CANARY)
    const unsure = hardFit({ ...GOOD, industry: null }, CANARY)
    expect(displayScore(refused, 100)).toBe(NOT_A_FIT_SCORE_CAP)
    expect(displayScore(unsure, 100)).toBe(UNKNOWN_SCORE_CAP)
    expect(displayScore(hardFit(GOOD, CANARY), 100)).toBe(100)
  })

  it('the three band labels are the founder\'s words', () => {
    expect(BAND_LABEL.start_here).toBe("We'd start here")
    expect(BAND_LABEL.worth_a_look).toBe('Worth a look')
    expect(BAND_LABEL.not_a_fit).toBe('Not a fit')
  })
})

describe('⑥ the judgement is total — no input throws, nothing is silently admitted', () => {
  it('an empty candidate against a full ICP is unknown on every asked criterion', () => {
    const f = hardFit({}, CANARY)
    expect(unknownCriteria(f).sort()).toEqual([...HARD_CRITERIA].sort())
    expect(structurallyEligible(f)).toBe(true)
    expect(isStarred(fitBand(f, 100))).toBe(false)   // admissible, never confident
  })

  it('an empty ICP admits everyone — there is nothing to fail', () => {
    const f = hardFit(GOOD, {})
    expect(structurallyEligible(f)).toBe(true)
    expect(setAsideReason(f)).toBeNull()
  })

  it('null-ish ICP arrays behave exactly as absent ones', () => {
    const f = hardFit(GOOD, { geographies: null, industries: [], job_titles: null, company_sizes: [] })
    expect(structurallyEligible(f)).toBe(true)
  })
})
