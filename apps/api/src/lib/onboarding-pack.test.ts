import { describe, it, expect } from 'vitest'
import {
  packState, sourceTarget, packLabel,
  PACK_LEADS, PACK_PRICE_USD, PACK_SOURCE_TARGET, LEAD_PRICE_USD,
  PURCHASE_TX_TYPES, PAID_TX_TYPES,
} from './onboarding-pack'

describe('the numbers are the founder-locked ones', () => {
  it('100 leads for $99, then $4, sourcing 200', () => {
    // Changing any of these changes what a client is owed — they are pinned deliberately.
    expect(PACK_LEADS).toBe(100)
    expect(PACK_PRICE_USD).toBe(99)
    expect(PACK_SOURCE_TARGET).toBe(200)
    expect(LEAD_PRICE_USD).toBe(4)
  })
})

describe('what counts as paid', () => {
  it('a manual grant unlocks a client but is not revenue', () => {
    // These were inlined in six places and one disagreed: the Vida board counted manual_grant
    // as paid while every money path did not, so a comped client read as funded and then got
    // a 402 the moment anyone sourced for them.
    expect(PAID_TX_TYPES).toContain('manual_grant')
    expect(PURCHASE_TX_TYPES).not.toContain('manual_grant')
  })

  it('every real payment type counts as both', () => {
    for (const t of PURCHASE_TX_TYPES) expect(PAID_TX_TYPES).toContain(t)
  })

  it('a refund is never a reason to unlock anyone', () => {
    expect(PAID_TX_TYPES).not.toContain('refund')
    expect(PURCHASE_TX_TYPES).not.toContain('refund')
  })
})

describe('packState', () => {
  it('no purchase = no pack, and the $99 is what starts everything', () => {
    const s = packState(false, 0)
    expect(s.active).toBe(false)
    expect(s.left).toBe(0)
  })

  it('fresh purchase = 100 included, none used, approvals free', () => {
    const s = packState(true, 0)
    expect(s).toEqual({ active: true, included: 100, used: 0, left: 100, nextLeadCostUsd: 0 })
  })

  it('counts down as they approve', () => {
    expect(packState(true, 28).left).toBe(72)
    expect(packState(true, 99).left).toBe(1)
  })

  it('the 100th approval is still free; the 101st costs $4', () => {
    // Off-by-one here is a client being charged for a lead they were promised.
    expect(packState(true, 99).left).toBe(1)
    expect(packState(true, 99).nextLeadCostUsd).toBe(0)
    expect(packState(true, 100).left).toBe(0)
    expect(packState(true, 100).nextLeadCostUsd).toBe(4)
  })

  it('never goes negative once they are well past the pack', () => {
    const s = packState(true, 250)
    expect(s.used).toBe(100)
    expect(s.left).toBe(0)
    expect(s.nextLeadCostUsd).toBe(4)
  })

  it('an unpurchased client is never given free approvals', () => {
    // The pack is what the $99 buys. No purchase must never read as "100 free".
    expect(packState(false, 0).left).toBe(0)
    expect(packState(false, 50).left).toBe(0)
    expect(packState(false, 50).nextLeadCostUsd).toBe(LEAD_PRICE_USD)
  })

  it('tolerates junk counts rather than handing out free leads', () => {
    expect(packState(true, -5).used).toBe(0)
    expect(packState(true, 12.7).used).toBe(12)
  })
})

describe('sourceTarget — tops up, never re-buys', () => {
  it('a brand-new client needs the full 200', () => {
    expect(sourceTarget(0)).toBe(200)
  })

  it('tops back up to 200 rather than adding another 200', () => {
    // Adding a fixed batch each run would quietly buy the same people twice, and that cost
    // lands on us, not the client.
    expect(sourceTarget(120)).toBe(80)
    expect(sourceTarget(199)).toBe(1)
  })

  it('asks for nothing once they are at or past the target', () => {
    expect(sourceTarget(200)).toBe(0)
    expect(sourceTarget(640)).toBe(0)
  })

  it('treats junk as "source the full amount" rather than a negative', () => {
    expect(sourceTarget(-10)).toBe(200)
  })
})

describe('packLabel — what the client reads', () => {
  it('before they pay', () => {
    expect(packLabel(packState(false, 0))).toBe('Load $99 to start — 100 leads included')
  })

  it('mid-pack, in plain words', () => {
    expect(packLabel(packState(true, 28))).toBe('72 of your 100 included leads left')
  })

  it('once it is used, it says what happens next', () => {
    expect(packLabel(packState(true, 100))).toBe('Pack used · $4 per approved lead from here')
  })

  it('never shows a bare number', () => {
    for (const n of [0, 1, 50, 99, 100, 300]) {
      expect(/^\d+$/.test(packLabel(packState(true, n)))).toBe(false)
    }
  })
})
