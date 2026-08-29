import { describe, it, expect } from 'vitest'
import {
  pricePerMeetingUsd, pricePerMeetingCents, programmeTotalCents, recommendedVolume,
  firstPaymentCents, secondPaymentCents, quoteProgramme, programmeStripeAmountCents,
  partnerCommissionCents, ProgrammePricingError,
  LEADS_PER_TARGETED_MEETING, PROGRAMME_PARTNER_COMMISSION_PCT, PROGRAMME_FLOOR_USD,
} from '@kind/shared'

// ── THE PROGRAMME CURVE, PROVED AT ITS ANCHORS AND ITS JOINS ─────────────────────────────
//
// R81 fixes three anchors and two linear segments. Anchors alone do not prove a curve: an
// implementation can hit $450, $437.50 and $400 exactly and still be wrong everywhere
// between them, and *that* is where every real programme is priced. So this file asserts the
// anchors, both interpolations, the floor, and the join points where a segment boundary is
// easiest to get wrong by one meeting.
//
// ⚠️ THE ARITHMETIC IS WRITTEN OUT LONGHAND, NOT RE-DERIVED FROM THE MODULE. A test that
// computes the expected value with the same formula as the code proves only that the formula
// equals itself. Every expectation below is a literal, worked from R81 by hand.

describe('① the three anchors are exact', () => {
  it('1 meeting is $450.00', () => {
    expect(pricePerMeetingUsd(1)).toBe(450)
    expect(pricePerMeetingCents(1)).toBe(45_000)
    expect(programmeTotalCents(1)).toBe(45_000)
  })

  it('10 meetings is $437.50 each', () => {
    expect(pricePerMeetingUsd(10)).toBe(437.5)
    expect(programmeTotalCents(10)).toBe(437_500) // $4,375.00
  })

  it('50 meetings is $400.00 each', () => {
    expect(pricePerMeetingUsd(50)).toBe(400)
    expect(programmeTotalCents(50)).toBe(2_000_000) // $20,000.00
  })
})

describe('② the interpolations, at the points a formula error would survive the anchors', () => {
  // Segment 1: 450 − ((m − 1) × 12.50 / 9)
  it('2 meetings — one step down the first slope', () => {
    // 450 − (1 × 12.5/9) = 450 − 1.388888… = 448.611111…
    expect(pricePerMeetingUsd(2)).toBeCloseTo(448.611111, 6)
    expect(programmeTotalCents(2)).toBe(89_722) // round(897.2222… × 100)
  })

  it('3 meetings', () => {
    // 450 − (2 × 12.5/9) = 447.222222…
    expect(pricePerMeetingUsd(3)).toBeCloseTo(447.222222, 6)
    expect(programmeTotalCents(3)).toBe(134_167) // round(1341.6666… × 100)
  })

  it('7 meetings — the worked example with the ugliest fraction', () => {
    // 450 − (6 × 12.5/9) = 450 − 8.3333… = 441.666666…
    expect(pricePerMeetingUsd(7)).toBeCloseTo(441.666667, 6)
    expect(programmeTotalCents(7)).toBe(309_167) // round(3091.6666… × 100)
  })

  // Segment 2: 437.50 − ((m − 10) × 37.50 / 40)
  it('11 meetings — the FIRST meeting of the second segment', () => {
    // 437.50 − (1 × 37.5/40) = 437.50 − 0.9375 = 436.5625
    expect(pricePerMeetingUsd(11)).toBeCloseTo(436.5625, 6)
    expect(programmeTotalCents(11)).toBe(480_219) // round(4802.1875 × 100)
  })

  it('23 meetings', () => {
    // 437.50 − (13 × 37.5/40) = 437.50 − 12.1875 = 425.3125
    expect(pricePerMeetingUsd(23)).toBeCloseTo(425.3125, 6)
    expect(programmeTotalCents(23)).toBe(978_219) // round(9782.1875 × 100)
  })

  it('⚠️ the two segments MEET at 10 — no discontinuity, no double-applied step', () => {
    // The classic off-by-one: segment 2 starting at m=10 instead of m=11 would make the
    // 10-meeting price $436.5625 and silently under-price every large programme.
    expect(pricePerMeetingUsd(10)).toBe(437.5)
    expect(pricePerMeetingUsd(11)).toBeLessThan(437.5)
    expect(pricePerMeetingUsd(10) - pricePerMeetingUsd(11)).toBeCloseTo(0.9375, 9)
  })

  it('⚠️ the curve never rises as the programme grows', () => {
    // Volume discount is automatic (R74) — a bigger programme can never cost more per meeting.
    for (let m = 2; m <= 120; m++) {
      expect(pricePerMeetingUsd(m), `m=${m}`).toBeLessThanOrEqual(pricePerMeetingUsd(m - 1))
    }
  })
})

describe('③ the floor holds above 50 — it is a floor, not a continuing slope', () => {
  it('51 and 80 meetings both price at $400', () => {
    // Continuing segment 2 past 50 would give $399.0625 at 51 and reach $0 near m=477.
    expect(pricePerMeetingUsd(51)).toBe(PROGRAMME_FLOOR_USD)
    expect(pricePerMeetingUsd(80)).toBe(400)
    expect(programmeTotalCents(51)).toBe(2_040_000)
    expect(programmeTotalCents(80)).toBe(3_200_000)
  })

  it('a very large programme still prices at the floor, never below zero', () => {
    expect(pricePerMeetingUsd(5_000)).toBe(400)
    expect(programmeTotalCents(5_000)).toBe(200_000_000)
  })
})

describe('④ recommended volume is meetings × 250 (R77)', () => {
  it('scales with the meeting target', () => {
    expect(LEADS_PER_TARGETED_MEETING).toBe(250)
    expect(recommendedVolume(1)).toBe(250)
    expect(recommendedVolume(10)).toBe(2_500)
    expect(recommendedVolume(50)).toBe(12_500)
    expect(recommendedVolume(80)).toBe(20_000)
  })
})

describe('⑤ the 50/50 split is exact in integer cents, and the odd cent goes to payment two', () => {
  it('an even total splits evenly', () => {
    expect(firstPaymentCents(45_000)).toBe(22_500)
    expect(secondPaymentCents(45_000)).toBe(22_500)
  })

  it('⚠️ an ODD total gives the extra cent to the SECOND payment (R81)', () => {
    // 134_167 is the real 3-meeting total, and it is odd. Splitting it "evenly" by rounding
    // each half gives 67_084 + 67_084 = 134_168 — one cent charged that nobody agreed to.
    expect(firstPaymentCents(134_167)).toBe(67_083)
    expect(secondPaymentCents(134_167)).toBe(67_084)
    expect(secondPaymentCents(134_167) - firstPaymentCents(134_167)).toBe(1)
  })

  it('⚠️ first + second === total for EVERY meeting target 1…120 — the invariant that matters', () => {
    // If this ever fails, a client is over- or under-charged by a cent on a real programme.
    for (let m = 1; m <= 120; m++) {
      const total = programmeTotalCents(m)
      const a = firstPaymentCents(total)
      const b = secondPaymentCents(total)
      expect(a + b, `m=${m}: ${a} + ${b} !== ${total}`).toBe(total)
      expect(Number.isInteger(a) && Number.isInteger(b), `m=${m} produced a fractional cent`).toBe(true)
      expect(b - a === 0 || b - a === 1, `m=${m}: second must equal or exceed first by exactly 1`).toBe(true)
    }
  })

  it('⚠️ rounding happens ONCE on the total, never per meeting then multiplied', () => {
    // The defect this pins: round(441.666667 × 100) × 7 = 44_167 × 7 = 309_169 cents,
    // which is 2 cents more than the correct 309_167. On a 50-meeting programme the same
    // error compounds. The total is the money; the per-meeting price is presentation.
    const perMeetingThenMultiply = pricePerMeetingCents(7) * 7
    expect(perMeetingThenMultiply).toBe(309_169)
    expect(programmeTotalCents(7)).toBe(309_167)
    expect(programmeTotalCents(7)).not.toBe(perMeetingThenMultiply)
  })
})

describe('⑥ the Stripe amount is the stage amount, in integer minor units', () => {
  it('each stage returns its own half and nothing else', () => {
    expect(programmeStripeAmountCents(3, 'programme_first')).toBe(67_083)
    expect(programmeStripeAmountCents(3, 'programme_second')).toBe(67_084)
    expect(
      programmeStripeAmountCents(3, 'programme_first') + programmeStripeAmountCents(3, 'programme_second'),
    ).toBe(programmeTotalCents(3))
  })

  it('every stage amount is a positive integer — Stripe rejects anything else', () => {
    for (const m of [1, 2, 3, 7, 10, 11, 23, 50, 80]) {
      for (const stage of ['programme_first', 'programme_second'] as const) {
        const c = programmeStripeAmountCents(m, stage)
        expect(Number.isInteger(c) && c > 0, `m=${m} ${stage} → ${c}`).toBe(true)
      }
    }
  })
})

describe('⑦ quoteProgramme is the single derivation every caller uses', () => {
  it('agrees with the individual functions, so nobody needs to re-type the curve', () => {
    const q = quoteProgramme(23)
    expect(q.meetings).toBe(23)
    expect(q.totalCents).toBe(programmeTotalCents(23))
    expect(q.firstPaymentCents).toBe(firstPaymentCents(q.totalCents))
    expect(q.secondPaymentCents).toBe(secondPaymentCents(q.totalCents))
    expect(q.recommendedVolume).toBe(5_750)
    expect(q.firstPaymentCents + q.secondPaymentCents).toBe(q.totalCents)
  })
})

describe('⑧ partner commission is 25% of CONTRIBUTION, never of revenue (R78)', () => {
  it('takes 25% of the contribution it is given', () => {
    expect(PROGRAMME_PARTNER_COMMISSION_PCT).toBe(25)
    expect(partnerCommissionCents(100_000)).toBe(25_000)
    expect(partnerCommissionCents(978_219)).toBe(244_555) // round(244_554.75)
  })

  it('⚠️ a negative contribution pays ZERO, never a clawback', () => {
    // A programme whose direct costs exceeded its revenue must not generate a negative
    // commission row — that is a debt the partner never agreed to.
    expect(partnerCommissionCents(-50_000)).toBe(0)
    expect(partnerCommissionCents(0)).toBe(0)
  })

  it('⚠️ commission on REVENUE would be roughly four times too large — the error this naming prevents', () => {
    // A 23-meeting programme bills $9,782.19. At a ~70% contribution target the contribution
    // is near $2,935 and the commission near $734. Handing revenue to this function instead
    // pays $2,445 — the shape of mistake R68 records in the legacy model.
    const revenue = programmeTotalCents(23)
    const contribution = Math.round(revenue * 0.3)
    expect(partnerCommissionCents(revenue)).toBeGreaterThan(partnerCommissionCents(contribution) * 3)
  })
})

describe('⑨ invalid input is refused at the boundary, not silently coerced', () => {
  it('rejects zero, negative and fractional meeting targets', () => {
    for (const bad of [0, -1, 1.5, NaN, Infinity]) {
      expect(() => pricePerMeetingUsd(bad), `meetings=${bad}`).toThrow(ProgrammePricingError)
      expect(() => programmeTotalCents(bad), `meetings=${bad}`).toThrow(ProgrammePricingError)
      expect(() => recommendedVolume(bad), `meetings=${bad}`).toThrow(ProgrammePricingError)
    }
  })

  it('rejects a fractional or non-positive total at the split', () => {
    // A fractional total reaching the split is the exact bug integer cents exist to prevent.
    for (const bad of [0, -1, 100.5, NaN]) {
      expect(() => firstPaymentCents(bad), `total=${bad}`).toThrow(ProgrammePricingError)
      expect(() => secondPaymentCents(bad), `total=${bad}`).toThrow(ProgrammePricingError)
    }
  })

  it('rejects a fractional contribution at the commission boundary', () => {
    expect(() => partnerCommissionCents(1234.5)).toThrow(ProgrammePricingError)
  })
})
