import { describe, it, expect } from 'vitest'
import {
  computeGrantedSize, monthRoomRecords, dayRoomRecords,
  trialDripAmount, allowanceForUsd,
  PDL_RATE_USD, SOURCING_DAILY_CAP, TRIAL_LIFETIME_CAP,
} from './sourcing-fences'

// #445 — these mirror the LEAST() ladder inside try_spend_sourcing (the RPC is the
// atomic source of truth; this is the same maths, unit-tested without a DB).

describe('computeGrantedSize — the granted-batch ladder', () => {
  const room = { monthRoom: 1000, dayRoom: 100 }

  it('grants the full request when everything has headroom', () => {
    expect(computeGrantedSize({ requested: 20, allowance: 50, ...room })).toBe(20)
  })

  it('is capped by allowance (paid coverage)', () => {
    expect(computeGrantedSize({ requested: 20, allowance: 8, ...room })).toBe(8)
  })

  it('is capped by the daily room', () => {
    expect(computeGrantedSize({ requested: 20, allowance: 50, monthRoom: 1000, dayRoom: 5 })).toBe(5)
  })

  it('is capped by the global monthly room', () => {
    expect(computeGrantedSize({ requested: 20, allowance: 50, monthRoom: 3, dayRoom: 100 })).toBe(3)
  })

  it('takes the LEAST when several limiters bind', () => {
    expect(computeGrantedSize({ requested: 20, allowance: 12, monthRoom: 7, dayRoom: 9 })).toBe(7)
  })

  it('refuses (0) when allowance is exhausted — the trial/paid-out case', () => {
    expect(computeGrantedSize({ requested: 20, allowance: 0, ...room })).toBe(0)
  })

  it('refuses (0) when the global budget is spent — platform pause', () => {
    expect(computeGrantedSize({ requested: 20, allowance: 50, monthRoom: 0, dayRoom: 100 })).toBe(0)
  })

  it('never returns negative or a non-positive request', () => {
    expect(computeGrantedSize({ requested: 0, allowance: 50, ...room })).toBe(0)
    expect(computeGrantedSize({ requested: -5, allowance: 50, ...room })).toBe(0)
    expect(computeGrantedSize({ requested: 20, allowance: -3, ...room })).toBe(0)
  })
})

describe('monthRoomRecords — global ceiling in records', () => {
  it('converts remaining dollars to whole records at the PDL rate', () => {
    // $300 cap, $0 spent → floor(300/0.28) = 1071
    expect(monthRoomRecords(300, 0)).toBe(Math.floor(300 / PDL_RATE_USD))
  })
  it('is 0 when spend has reached the cap', () => {
    expect(monthRoomRecords(300, 300)).toBe(0)
    expect(monthRoomRecords(300, 305)).toBe(0)
  })
  it('floors partial records (never grants a fractional PDL buy)', () => {
    // $0.50 left ÷ $0.28 = 1.78 → 1 record
    expect(monthRoomRecords(300, 299.5)).toBe(1)
  })
})

describe('dayRoomRecords — per-client daily fence', () => {
  it('is the cap minus what was sourced today', () => {
    expect(dayRoomRecords(30)).toBe(SOURCING_DAILY_CAP - 30)
  })
  it('is 0 once the daily cap is hit', () => {
    expect(dayRoomRecords(SOURCING_DAILY_CAP)).toBe(0)
    expect(dayRoomRecords(SOURCING_DAILY_CAP + 50)).toBe(0)
  })
})

describe('trialDripAmount — reveal unlocks +2, capped at 20 lifetime', () => {
  it('grants the full +2 while well under the cap', () => {
    expect(trialDripAmount(10)).toBe(2)
  })
  it('grants only the remainder at the boundary', () => {
    expect(trialDripAmount(19)).toBe(1)
  })
  it('grants nothing once the lifetime trial cap is reached', () => {
    expect(trialDripAmount(TRIAL_LIFETIME_CAP)).toBe(0)
    expect(trialDripAmount(TRIAL_LIFETIME_CAP + 4)).toBe(0)
  })
})

describe('allowanceForUsd — coverage k=2', () => {
  it('is 2 records per $1 collected', () => {
    expect(allowanceForUsd(20)).toBe(40)
    expect(allowanceForUsd(100)).toBe(200)
  })
  it('never negative', () => {
    expect(allowanceForUsd(0)).toBe(0)
    expect(allowanceForUsd(-5)).toBe(0)
  })
})
