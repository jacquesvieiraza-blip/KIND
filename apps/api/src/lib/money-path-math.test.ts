import { describe, it, expect } from 'vitest'
import {
  creditTxUsd,
  netContribution,
  sourceRevealRatio,
  namesPerApproval,
  effectiveCostPerRecord,
  round2,
  PDL_RATE_USD,
  REVEAL_MARGINAL_COST_USD,
  WORK_MARGINAL_COST_USD,
} from './money-path-math'

// SPRINT 8a·③ (#448/#449) — the Money Path arithmetic, unit-tested without a DB.

describe('creditTxUsd — valuing a purchase credit row', () => {
  it('values figsy credits at $3 each', () => {
    expect(creditTxUsd('figsy', 4)).toBe(12)
  })
  it('values lead-gen (non-figsy) credits at $1 each', () => {
    expect(creditTxUsd('lead_gen', 10)).toBe(10)
    expect(creditTxUsd(null, 5)).toBe(5)
    expect(creditTxUsd(undefined, 5)).toBe(5)
  })
  it('ignores non-positive / non-finite amounts', () => {
    expect(creditTxUsd('figsy', 0)).toBe(0)
    expect(creditTxUsd('figsy', -3)).toBe(0)
    expect(creditTxUsd('figsy', null)).toBe(0)
    expect(creditTxUsd('figsy', Number.NaN)).toBe(0)
  })
})

describe('netContribution — collected minus what we spent for the client', () => {
  it('is positive when collected covers sourcing + reveal + work COGS', () => {
    // $100 collected; 100 records sourced ($28) + 20 reveals ($0.20) + 10 works ($0.60)
    const net = netContribution({ collectedUsd: 100, recordsSourced: 100, reveals: 20, works: 10 })
    expect(net).toBeCloseTo(100 - (28 + 0.2 + 0.6), 6)
    expect(net).toBeGreaterThan(0)
  })
  it('goes negative when a client burns sourcing without paying', () => {
    // Never paid ($0 collected) but 50 records sourced on trial.
    const net = netContribution({ collectedUsd: 0, recordsSourced: 50, reveals: 0, works: 0 })
    expect(net).toBeCloseTo(-(50 * PDL_RATE_USD), 6)
    expect(net).toBeLessThan(0)
  })
  it('uses the documented per-unit rates', () => {
    const net = netContribution({ collectedUsd: 0, recordsSourced: 1, reveals: 1, works: 1 })
    expect(net).toBeCloseTo(-(PDL_RATE_USD + REVEAL_MARGINAL_COST_USD + WORK_MARGINAL_COST_USD), 6)
  })
  it('is exactly collected when nothing was sourced/revealed/worked', () => {
    expect(netContribution({ collectedUsd: 42, recordsSourced: 0, reveals: 0, works: 0 })).toBe(42)
  })
})

describe('sourceRevealRatio — records sourced per lead revealed', () => {
  it('divides records by reveals', () => {
    expect(sourceRevealRatio(100, 25)).toBe(4)
  })
  it('is null (undefined ratio) when nothing was revealed — no divide-by-zero', () => {
    expect(sourceRevealRatio(100, 0)).toBeNull()
    expect(sourceRevealRatio(0, 0)).toBeNull()
  })
})

describe('effectiveCostPerRecord — blended $/record', () => {
  it('divides total cost by total records', () => {
    expect(effectiveCostPerRecord(28, 100)).toBeCloseTo(0.28, 6)
  })
  it('guards the zero-records divide', () => {
    expect(effectiveCostPerRecord(0, 0)).toBe(0)
    expect(effectiveCostPerRecord(5, 0)).toBe(0)
  })
})

describe('round2 — cents rounding for display', () => {
  it('rounds a raw PDL float to cents', () => {
    expect(round2(2.8000000000000003)).toBe(2.8)
    expect(round2(1.005)).toBe(1.01)
  })
})

describe('namesPerApproval — the ratio the money model rests on, measured not assumed', () => {
  it('says nothing rather than divide by zero', () => {
    const r = namesPerApproval(200, 0)
    expect(r.ratio).toBeNull()
    expect(r.confident).toBe(false)
    expect(r.label).toBe('No approvals yet — nothing to measure')
  })

  it('shows the number but refuses to call it real too early', () => {
    // Three approvals is noise. The danger is the founder typing it into the cashflow lab
    // and re-pricing the product off six data points.
    const r = namesPerApproval(21, 3)
    expect(r.ratio).toBe(7)
    expect(r.confident).toBe(false)
    expect(r.label).toContain('too early to trust')
    expect(r.label).toContain('3 of 20')
  })

  it('becomes confident exactly at the threshold', () => {
    expect(namesPerApproval(40, 19).confident).toBe(false)
    expect(namesPerApproval(40, 20).confident).toBe(true)
    expect(namesPerApproval(40, 20).label).toBe('2 names per approval')
  })

  it('measures the two numbers that are actually in dispute', () => {
    // flow v2 plans for 2; #415 measured nearer 7. Both must read cleanly.
    expect(namesPerApproval(200, 100).ratio).toBe(2)
    expect(namesPerApproval(700, 100).ratio).toBe(7)
  })

  it('rounds to cents so a raw float never reaches the console', () => {
    expect(namesPerApproval(100, 30).ratio).toBe(3.33)
  })

  it('treats junk as zero rather than throwing on the operator front door', () => {
    expect(namesPerApproval(-5, 20).sourced).toBe(0)
    expect(namesPerApproval(NaN, 20).sourced).toBe(0)
    expect(namesPerApproval(40.9, 20).sourced).toBe(40)
  })
})
