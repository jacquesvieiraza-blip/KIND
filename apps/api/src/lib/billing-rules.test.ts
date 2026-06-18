import { describe, it, expect } from 'vitest'
import {
  normalizePlan,
  deliveryCharge,
  deliveryCapBalance,
  canEnroll,
} from './billing-rules'

describe('normalizePlan', () => {
  it('keeps a valid figsy plan', () => {
    expect(normalizePlan('figsy')).toBe('figsy')
  })
  it('keeps a valid lead_gen plan', () => {
    expect(normalizePlan('lead_gen')).toBe('lead_gen')
  })
  it('defaults missing / null / garbage to lead_gen (fail safe)', () => {
    expect(normalizePlan(null)).toBe('lead_gen')
    expect(normalizePlan(undefined)).toBe('lead_gen')
    expect(normalizePlan('')).toBe('lead_gen')
    expect(normalizePlan('FIGSY')).toBe('lead_gen') // case-sensitive on purpose
    expect(normalizePlan('whatever')).toBe('lead_gen')
  })
})

describe('deliveryCharge — the double-charge guard (item 166)', () => {
  it('charges a lead_gen client at delivery, from the lead-gen pool', () => {
    expect(deliveryCharge('lead_gen')).toEqual({ charge: true, pool: 'lead_gen' })
  })

  it('NEVER charges a figsy client at delivery (charge happens at enrollment)', () => {
    // This is the invariant that kills the lead-gen + FIGSY double-charge.
    expect(deliveryCharge('figsy').charge).toBe(false)
  })

  it('only ever touches the lead-gen pool at delivery — never the FIGSY pool', () => {
    expect(deliveryCharge('lead_gen').pool).toBe('lead_gen')
    expect(deliveryCharge('figsy').pool).toBe('lead_gen')
  })
})

describe('deliveryCapBalance — pool-aware delivery (item 167)', () => {
  it('lead_gen clients are capped by the lead-gen balance', () => {
    expect(deliveryCapBalance('lead_gen', 7, 999)).toBe(7)
  })

  it('figsy clients are capped by the FIGSY pool (NOT lead-gen)', () => {
    // A FIGSY-only client (0 lead-gen credits) must still be able to deliver.
    expect(deliveryCapBalance('figsy', 0, 5)).toBe(5)
  })

  it('treats null/undefined balances as 0 and never returns negative', () => {
    expect(deliveryCapBalance('lead_gen', null, null)).toBe(0)
    expect(deliveryCapBalance('figsy', undefined, undefined)).toBe(0)
    expect(deliveryCapBalance('lead_gen', -3, 0)).toBe(0)
  })
})

describe('canEnroll — no free FIGSY outreach', () => {
  it('allows enrollment when there is at least 1 FIGSY credit', () => {
    expect(canEnroll(1)).toBe(true)
    expect(canEnroll(50)).toBe(true)
  })
  it('blocks enrollment when the FIGSY pool is empty or missing', () => {
    expect(canEnroll(0)).toBe(false)
    expect(canEnroll(null)).toBe(false)
    expect(canEnroll(undefined)).toBe(false)
  })
})

// ── End-to-end sanity: a FIGSY lead costs ONE FIGSY credit, never $4 ──────────
describe('one lead = one charge = one wallet (end-to-end rule check)', () => {
  it('figsy: delivery charges nothing, enrollment is the single charge', () => {
    const plan = normalizePlan('figsy')
    expect(deliveryCharge(plan).charge).toBe(false)   // not charged at delivery
    expect(canEnroll(3)).toBe(true)                    // charged once at enrollment
  })
  it('lead_gen: delivery is the single charge, no FIGSY pool involved', () => {
    const plan = normalizePlan('lead_gen')
    expect(deliveryCharge(plan).charge).toBe(true)
    expect(deliveryCharge(plan).pool).toBe('lead_gen')
  })
})
