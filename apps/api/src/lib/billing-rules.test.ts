import { describe, it, expect } from 'vitest'
import {
  normalizePlan,
  deliveryCharge,
  revealCharge,
  canReveal,
  deliveryCapBalance,
  DAILY_BROWSE_CAP,
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

describe('deliveryCharge — delivery is FREE in the per-qualified-lead model (#420)', () => {
  it('NEVER charges at delivery, for either plan — leads arrive masked', () => {
    // The $1 moved to reveal; delivery must never charge. This is the invariant
    // that prevents a regression to charge-at-delivery (which would double-bill
    // alongside the reveal charge).
    expect(deliveryCharge('lead_gen').charge).toBe(false)
    expect(deliveryCharge('figsy').charge).toBe(false)
  })
})

describe('revealCharge — the $1 unmask (#420/#421)', () => {
  it('charges $1 from the reveal (lead_gen) wallet', () => {
    expect(revealCharge()).toEqual({ charge: true, pool: 'lead_gen', amount: 1 })
  })
})

describe('canReveal — the $1 reveal gate', () => {
  it('allows a reveal when there is at least 1 reveal credit', () => {
    expect(canReveal(1)).toBe(true)
    expect(canReveal(50)).toBe(true)
  })
  it('blocks a reveal when the reveal wallet is empty or missing', () => {
    expect(canReveal(0)).toBe(false)
    expect(canReveal(null)).toBe(false)
    expect(canReveal(undefined)).toBe(false)
  })
})

describe('deliveryCapBalance — masked browsing is free, capped by a flat daily allowance', () => {
  it('returns the flat browse allowance regardless of wallet (a $0/trial client can still browse)', () => {
    expect(deliveryCapBalance('lead_gen', 0, 0)).toBe(DAILY_BROWSE_CAP)
    expect(deliveryCapBalance('figsy', 0, 0)).toBe(DAILY_BROWSE_CAP)
    expect(deliveryCapBalance('lead_gen', null, null)).toBe(DAILY_BROWSE_CAP)
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

// ── End-to-end sanity: the two-charge ladder ($1 reveal + $3 work = $4) ────────
describe('two charges, two wallets ($1 reveal → +$3 work = $4)', () => {
  it('delivery is free; reveal takes $1 from the reveal wallet', () => {
    expect(deliveryCharge('lead_gen').charge).toBe(false)
    expect(revealCharge().charge).toBe(true)
    expect(revealCharge().pool).toBe('lead_gen')
  })
  it('FIGSY work is the second, separate charge (enrollment)', () => {
    expect(canEnroll(3)).toBe(true) // $3 from figsy_credits_remaining
  })
})
