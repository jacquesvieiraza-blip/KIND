// ═══════════════════════════════════════════════════════════════════════════════════════
// "AROUND 20 PEOPLE" IS NOT "EXACTLY 20 PEOPLE" (21 Sep)
//
// 🛑 WHAT EARNED THIS, MEASURED ON PRODUCTION, AND IT IS WHY NO CLIENT HAS EVER RECEIVED A
// LEAD. AAA Operations Studio: Brief 11/11, ICP built, Proof ran, Apollo returned **twenty
// real people** — and Vida reported *"Every sourced prospect failed a hard criterion: size
// 20. Nothing was shown to the client."* Twenty sourced, zero eligible, twenty set aside.
// GREAT Studio produced the identical 20 / 0 / 20 on size days earlier.
//
// ── THE CHAIN, END TO END ──────────────────────────────────────────────────────────────
//
//   ① `promotion.ts:178` writes `target_size` from the brief's FREE TEXT — the client's own
//      words, deliberately (*"the client's words are authoritative, the closed list is the
//      provider hint"*). So a client who said "around 20 people" has that sentence stored.
//   ② `sizeVerdict` (J5-C4, 18 Sep) makes the STATED range OUTRANK the bands.
//   ③ `statedSizeRange("around 20 people")` returned **{ min: 20, max: 20 }** — an EXACT
//      match — because the single-number branch ended:
//
//          // A bare number is that number — "about 50 people". Not a range invented around it.
//          return { min: Math.max(1, n), max: Math.max(1, n) }
//
//      That comment names the exact phrasing a person uses and pins it anyway.
//
// 🛑 SO THE SEARCH WORKED AND THE GATE KILLED IT. Apollo is asked for the BAND (11–50) and
// returns genuinely in-band people — then our own gate sets aside every one of them that is
// not precisely twenty. Measured on the real functions before this fix: of ten in-band
// companies (12, 15, 18, 19, 20, 21, 25, 30, 40, 50 people), **one** survived.
//
// ⚠️ AND A HEADCOUNT IS AN ESTIMATE, WHICH MAKES EXACT MATCHING UNSATISFIABLE BY CONSTRUCTION.
// Apollo sends `estimated_num_employees`. Demanding that an estimate equal a number a client
// said conversationally is not a strict filter, it is an impossible one.
//
// 🛑 THE FOUNDER'S RULE THIS BREAKS (R135, verbatim): *"the natural conversation a client has
// has got to match our requirements. and or we then interpret the clients conversation and
// mould the icp to get them leads."* · *"go with the best widest possible outcome."* Reading
// "around 20" as "exactly 20" is the narrowest possible outcome, taken from the friendliest
// possible answer.
//
// ── WHAT CHANGES, AND WHAT DELIBERATELY DOES NOT ───────────────────────────────────────
//
// ✅ A SINGLE number becomes THE LADDER BAND THAT CONTAINS IT — "around 20 people" → 11–50.
//    That is the band we ALREADY asked Apollo for, so the gate stops contradicting the search.
// ❌ A stated RANGE is untouched: "10 to 50 people" still means exactly 10–50. They gave
//    bounds; bounds are honoured. J5-C4's rule that their words outrank our band survives in
//    full — a client who says "200 to 300" still gets 200–300, not the 201–500 band.
// ❌ "under 20" / "over 20" are untouched. Those already read the qualifier, and this never
//    reaches them.
// ❌ Nothing is widened when the client gave no size at all.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { statedSizeRange, hardFit, structurallyAdmissible, type FitIcp } from './proof-fit'

/** A real in-band prospect, exactly as `runIcpJob` writes the row. */
const prospect = (headcount: string | null) => ({
  country: 'United Kingdom', job_title: 'Chief Operating Officer', seniority: 'c_suite',
  company: 'Acme Ops Ltd', industry: 'management consulting', company_size: headcount,
})

/** The ICP a normal client ends up with: Milla's band, plus their own words (J5-C4). */
const icpSaying = (said: string): FitIcp =>
  ({ geographies: ['United Kingdom'], company_sizes: ['11–50'], target_size: said }) as FitIcp

const admits = (icp: FitIcp, headcount: string | null) =>
  structurallyAdmissible(hardFit(prospect(headcount), icp))

describe('🛑 the founder\'s own failing client — "around 20 people"', () => {
  it('🛑 IS A BAND, NOT A PIN — this is the line that set aside twenty of twenty', () => {
    expect(statedSizeRange('around 20 people')).toEqual({ min: 11, max: 50 })
  })

  it('🛑 AND EVERY IN-BAND PROSPECT APOLLO RETURNED IS NOW KEPT', () => {
    // Before this fix exactly ONE of these ten survived. Apollo was asked for 11–50 and
    // returned 11–50; the gate rejected nine of them for not being precisely twenty.
    const icp = icpSaying('around 20 people')
    for (const headcount of ['12', '15', '18', '19', '20', '21', '25', '30', '40', '50']) {
      expect(admits(icp, headcount), `a ${headcount}-person company was set aside`).toBe(true)
    }
  })

  it('🛑 AND A COMPANY GENUINELY OUTSIDE THEIR BAND IS STILL REFUSED', () => {
    // The anti-vacuity case. If this fix simply stopped refusing, it would have traded an
    // impossible filter for no filter — which is the silent widening R72 ⑦ forbids, and the
    // client would be sold four-thousand-person corporates they never asked for.
    const icp = icpSaying('around 20 people')
    for (const headcount of ['3', '9', '75', '400', '4000']) {
      expect(admits(icp, headcount), `a ${headcount}-person company slipped through`).toBe(false)
    }
  })
})

describe('the phrasing people actually use', () => {
  // Every one of these is a single number, which is how most people answer "how big?".
  for (const [said, expected] of [
    ['around 20 people', { min: 11, max: 50 }],
    ['about 50 staff', { min: 11, max: 50 }],
    ['roughly 200 employees', { min: 51, max: 200 }],
    ['~30', { min: 11, max: 50 }],
    ['20', { min: 11, max: 50 }],
    ['circa 8 people', { min: 1, max: 10 }],
    ['about 2,000 people', { min: 1001, max: null }],
  ] as const) {
    it(`"${said}" → ${JSON.stringify(expected)}`, () => {
      expect(statedSizeRange(said)).toEqual(expected)
    })
  }
})

describe('🛑 what this fix deliberately does NOT touch', () => {
  it('a stated RANGE still means exactly what they said — J5-C4 survives in full', () => {
    // They gave bounds. Bounds are honoured, and are NOT rounded out to our ladder: a client
    // who says "200 to 300" gets 200–300, never 201–500. Their words still outrank our band.
    expect(statedSizeRange('10 to 50 people')).toEqual({ min: 10, max: 50 })
    expect(statedSizeRange('200 to 300')).toEqual({ min: 200, max: 300 })
    expect(statedSizeRange('between 5 and 15 staff')).toEqual({ min: 5, max: 15 })
  })

  it('a stated range still refuses what falls outside it', () => {
    const icp = icpSaying('30 to 45 people')
    expect(admits(icp, '35')).toBe(true)
    expect(admits(icp, '12'), 'below their stated floor').toBe(false)
    expect(admits(icp, '48'), 'above their stated ceiling').toBe(false)
  })

  it('"under" and "over" keep their directional meaning — the qualifier is still read', () => {
    expect(statedSizeRange('under 20 people')).toEqual({ min: 1, max: 20 })
    expect(statedSizeRange('over 500')).toEqual({ min: 500, max: null })
    expect(statedSizeRange('at least 100 staff')).toEqual({ min: 100, max: null })
    expect(statedSizeRange('up to 50')).toEqual({ min: 1, max: 50 })
  })

  it('no stated size invents nothing, and no number invents nothing', () => {
    expect(statedSizeRange(null)).toBeNull()
    expect(statedSizeRange('')).toBeNull()
    expect(statedSizeRange('small')).toBeNull()
    expect(statedSizeRange('whatever feels right')).toBeNull()
  })

  it('🛑 AND AN UNREADABLE HEADCOUNT IS STILL `unknown`, never a pass by accident', () => {
    // A row with no headcount must stay honestly unknown. Widening the STATED range must not
    // quietly change what an absent fact means.
    const icp = icpSaying('around 20 people')
    const fit = hardFit(prospect(null), icp)
    expect(fit.size).toBe('unknown')
  })
})
