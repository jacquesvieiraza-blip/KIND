import { describe, it, expect } from 'vitest'
import {
  roundUsd,
  RATES,
  landAccelerator,
  aeLandCommission,
  aeRetainCommission,
  aeExpansionCommission,
  aeGuaranteeFloor,
  aeMonthlyPay,
  partnerMonthlyPay,
  collectedMrr,
  isWindfall,
} from './comp-engine'

// Enterprise-tier reference figures (AE-COMP-PLAN / BRIEF §3):
//   quota = $4,500 new-MRR / month · monthly variable = $3,750 · base/12 = $5,625
const QUOTA = 4500
const MONTHLY_VARIABLE = 3750
const MONTHLY_BASE = 5625

describe('roundUsd', () => {
  it('rounds to whole cents, half-up', () => {
    expect(roundUsd(1.005)).toBe(1.01)
    expect(roundUsd(0.1 + 0.2)).toBe(0.3) // defeats float drift
    expect(roundUsd(300)).toBe(300)
  })
})

describe('rate constants (the locked 20/5/5)', () => {
  it('matches the founder-locked plan', () => {
    expect(RATES.LAND).toBe(0.2)
    expect(RATES.RETAIN).toBe(0.05)
    expect(RATES.EXPAND).toBe(0.05)
    expect(RATES.MULTI_SEAT_KICKER).toBe(0.05)
    expect(RATES.PARTNER_ACQUISITION).toBe(0.2)
    expect(RATES.PARTNER_RETENTION).toBe(0.05)
  })
})

describe('landAccelerator — quota attainment tiers', () => {
  it('< 100% of quota → 1.0×', () => {
    expect(landAccelerator(0, QUOTA)).toBe(1.0)
    expect(landAccelerator(4499, QUOTA)).toBe(1.0)
  })
  it('exactly 100% → 1.25×', () => {
    expect(landAccelerator(4500, QUOTA)).toBe(1.25)
  })
  it('120% attainment → 1.25× (the brief example)', () => {
    expect(landAccelerator(5400, QUOTA)).toBe(1.25)
  })
  it('exactly 140% → 1.25× (boundary, not yet 1.5)', () => {
    expect(landAccelerator(6300, QUOTA)).toBe(1.25)
  })
  it('> 140% → 1.5×', () => {
    expect(landAccelerator(6301, QUOTA)).toBe(1.5)
    expect(landAccelerator(9000, QUOTA)).toBe(1.5)
  })
  it('guards a zero/negative quota → 1.0×', () => {
    expect(landAccelerator(1000, 0)).toBe(1.0)
  })
})

describe('aeLandCommission', () => {
  it('a $1,500 single-seat deal under quota → $300 land (20%)', () => {
    const r = aeLandCommission({
      firstMonthMrr: 1500,
      seats: 1,
      periodNewMrr: 1500, // below the $4,500 quota → 1.0×
      quota: QUOTA,
    })
    expect(r.baseRate).toBe(0.2)
    expect(r.accelerator).toBe(1.0)
    expect(r.commission).toBe(300)
  })

  it('multi-seat (2+) deal adds the +5% kicker → 25% land', () => {
    const r = aeLandCommission({
      firstMonthMrr: 1500,
      seats: 6,
      periodNewMrr: 1500,
      quota: QUOTA,
    })
    expect(r.baseRate).toBe(0.25)
    // 1500 × 0.25 × 1.0 = 375
    expect(r.commission).toBe(375)
  })

  it('accelerator at 120% attainment → 1.25× on land', () => {
    // periodNewMrr 5400 = 120% of 4500 → 1.25×; single $1,500 deal, single seat
    const r = aeLandCommission({
      firstMonthMrr: 1500,
      seats: 1,
      periodNewMrr: 5400,
      quota: QUOTA,
    })
    expect(r.accelerator).toBe(1.25)
    // 1500 × 0.20 × 1.25 = 375
    expect(r.commission).toBe(375)
  })

  it('multi-seat + accelerator stack: 25% × 1.5×', () => {
    const r = aeLandCommission({
      firstMonthMrr: 1500,
      seats: 6,
      periodNewMrr: 9000, // 200% → 1.5×
      quota: QUOTA,
    })
    // 1500 × 0.25 × 1.5 = 562.5
    expect(r.commission).toBe(562.5)
  })
})

describe('aeRetainCommission', () => {
  it('5% of the active book', () => {
    expect(aeRetainCommission(10000)).toBe(500)
    expect(aeRetainCommission(0)).toBe(0)
  })
})

describe('aeExpansionCommission', () => {
  it('5% of the MRR increase (new − prior)', () => {
    // upsell $1,000 → $1,500 = $500 increase → $25
    expect(aeExpansionCommission(1000, 1500)).toBe(25)
  })
  it('never negative on a downgrade', () => {
    expect(aeExpansionCommission(1500, 1000)).toBe(0)
  })
})

describe('aeGuaranteeFloor — greater-of ramp (100/100/75/75)', () => {
  it('month 1 (onboarding complete) → 100% of monthly variable', () => {
    expect(aeGuaranteeFloor(1, MONTHLY_VARIABLE, true)).toBe(3750)
  })
  it('month 1 NOT onboarded → 0 (gated)', () => {
    expect(aeGuaranteeFloor(1, MONTHLY_VARIABLE, false)).toBe(0)
  })
  it('month 2 → 100%', () => {
    expect(aeGuaranteeFloor(2, MONTHLY_VARIABLE)).toBe(3750)
  })
  it('months 3 & 4 → 75% ($2,812.50)', () => {
    expect(aeGuaranteeFloor(3, MONTHLY_VARIABLE)).toBe(2812.5)
    expect(aeGuaranteeFloor(4, MONTHLY_VARIABLE)).toBe(2812.5)
  })
  it('month 5+ → 0 (pure performance)', () => {
    expect(aeGuaranteeFloor(5, MONTHLY_VARIABLE)).toBe(0)
    expect(aeGuaranteeFloor(12, MONTHLY_VARIABLE)).toBe(0)
  })
})

describe('aeMonthlyPay — greater-of(earned, guarantee) + base', () => {
  it('month 1: low earnings → guarantee floor wins', () => {
    // one $1,500 single-seat deal → $300 land, tiny book → guarantee $3,750 wins
    const r = aeMonthlyPay({
      month: 1,
      monthlyBase: MONTHLY_BASE,
      monthlyVariable: MONTHLY_VARIABLE,
      landDeals: [
        { firstMonthMrr: 1500, seats: 1, periodNewMrr: 1500, quota: QUOTA },
      ],
      activeBookMrr: 0,
      onboardingComplete: true,
    })
    expect(r.landCommission).toBe(300)
    expect(r.earnedCommission).toBe(300)
    expect(r.guaranteeFloor).toBe(3750)
    expect(r.guaranteeApplied).toBe(true)
    expect(r.variablePaid).toBe(3750)
    expect(r.totalPay).toBe(MONTHLY_BASE + 3750) // 9375
  })

  it('month 6: earned commission beats the (zero) floor', () => {
    // 3 multi-seat $1,500 deals at full quota (4500 = 100% → 1.25×) + book retain
    const r = aeMonthlyPay({
      month: 6,
      monthlyBase: MONTHLY_BASE,
      monthlyVariable: MONTHLY_VARIABLE,
      landDeals: [
        { firstMonthMrr: 1500, seats: 6, periodNewMrr: 4500, quota: QUOTA },
        { firstMonthMrr: 1500, seats: 6, periodNewMrr: 4500, quota: QUOTA },
        { firstMonthMrr: 1500, seats: 6, periodNewMrr: 4500, quota: QUOTA },
      ],
      activeBookMrr: 20000,
      expansions: [{ priorMrr: 1000, newMrr: 1500 }],
    })
    // each land: 1500 × 0.25 × 1.25 = 468.75 ×3 = 1406.25
    expect(r.landCommission).toBe(1406.25)
    // retain: 20000 × 0.05 = 1000
    expect(r.retainCommission).toBe(1000)
    // expansion: 500 × 0.05 = 25
    expect(r.expansionCommission).toBe(25)
    expect(r.earnedCommission).toBe(2431.25)
    expect(r.guaranteeFloor).toBe(0)
    expect(r.guaranteeApplied).toBe(false)
    expect(r.variablePaid).toBe(2431.25)
    expect(r.totalPay).toBe(MONTHLY_BASE + 2431.25)
  })

  it('month 1 not-onboarded with low earnings → only earned commission pays', () => {
    const r = aeMonthlyPay({
      month: 1,
      monthlyBase: MONTHLY_BASE,
      monthlyVariable: MONTHLY_VARIABLE,
      landDeals: [
        { firstMonthMrr: 1500, seats: 1, periodNewMrr: 1500, quota: QUOTA },
      ],
      activeBookMrr: 0,
      onboardingComplete: false,
    })
    expect(r.guaranteeFloor).toBe(0)
    expect(r.variablePaid).toBe(300)
    expect(r.totalPay).toBe(MONTHLY_BASE + 300)
  })
})

describe('partnerMonthlyPay (no base, 20% + 5%)', () => {
  it('a $250 new client → $50 acquisition + 5%/mo retention', () => {
    // first month: one new $250 client, book = $250
    const r = partnerMonthlyPay({ newClientMrr: 250, activeBookMrr: 250 })
    expect(r.acquisitionCommission).toBe(50) // 250 × 0.20
    expect(r.retentionCommission).toBe(12.5) // 250 × 0.05
    expect(r.totalPay).toBe(62.5)
  })

  it('a steady-state month with no new clients → retention only', () => {
    const r = partnerMonthlyPay({ newClientMrr: 0, activeBookMrr: 10000 })
    expect(r.acquisitionCommission).toBe(0)
    expect(r.retentionCommission).toBe(500) // 10000 × 0.05
    expect(r.totalPay).toBe(500)
  })

  it('partner-calculator parity: 10 clients × $250 first month', () => {
    // calculator: newMRR = 10×250 = 2500; book = 2500 (mo1)
    //   pay = 0.20×2500 + 0.05×2500 = 500 + 125 = 625
    const r = partnerMonthlyPay({ newClientMrr: 2500, activeBookMrr: 2500 })
    expect(r.totalPay).toBe(625)
  })
})

describe('collectedMrr — earned-when-collected gate', () => {
  it('counts only collected deals', () => {
    const sum = collectedMrr([
      { mrr: 1500, collected: true },
      { mrr: 700, collected: false }, // not yet collected → excluded
      { mrr: 250, collected: true },
    ])
    expect(sum).toBe(1750)
  })
  it('nothing collected → $0 (nothing paid ahead of cash)', () => {
    expect(collectedMrr([{ mrr: 9999, collected: false }])).toBe(0)
  })
})

describe('isWindfall — single deal > 2× monthly quota', () => {
  it('a deal above ~2× quota (>$9,000) flags for review', () => {
    expect(isWindfall(9001, QUOTA)).toBe(true)
  })
  it('exactly 2× quota does NOT flag', () => {
    expect(isWindfall(9000, QUOTA)).toBe(false)
  })
  it('a normal $1,500 deal does not flag', () => {
    expect(isWindfall(1500, QUOTA)).toBe(false)
  })
  it('honours a custom multiple', () => {
    expect(isWindfall(4501, QUOTA, 1)).toBe(true)
    expect(isWindfall(4500, QUOTA, 1)).toBe(false)
  })
  it('guards a zero quota → never a windfall', () => {
    expect(isWindfall(100000, 0)).toBe(false)
  })
})
