import { describe, it, expect } from 'vitest'
import {
  packState, sourceTarget, packLabel, sourcingTarget,
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

describe('sourceTarget — keeps the DESK stocked, not a lifetime cap', () => {
  // THE ARGUMENT CHANGED MEANING, and that change is the fix.
  //
  // It used to be handed "every lead this client has ever held", which made 200 a LIFETIME
  // CAP: a client who worked through their desk — approved 100, passed the rest — and then
  // topped up $200 to approve fifty more got 0, because they had "already had" 200. They had
  // paid and there was nobody left to approve. Sourcing stopped for that client, permanently,
  // with no error anywhere.
  //
  // It is now handed only the leads still AWAITING A DECISION. An approved or passed lead is
  // finished business and must not hold a slot open against them forever.
  it('a brand-new client with an empty desk needs the full 200', () => {
    expect(sourceTarget(0)).toBe(200)
  })

  it('tops the desk back up rather than adding another fixed batch', () => {
    // Adding a batch each run would quietly buy the same people twice, and that cost lands
    // on us, not the client.
    expect(sourceTarget(120)).toBe(80)
    expect(sourceTarget(199)).toBe(1)
  })

  it('asks for nothing while the desk is already full', () => {
    expect(sourceTarget(200)).toBe(0)
    expect(sourceTarget(640)).toBe(0)
  })

  it('THE FIX: a client who worked through their desk gets more people', () => {
    // 200 sourced, 100 approved, 60 passed → 40 still awaiting a decision. Under the old
    // lifetime reading this was sourceTarget(200) = 0 and their top-up bought nothing.
    expect(sourceTarget(40)).toBe(160)
  })

  it('a client who has approved EVERYTHING gets a full desk again', () => {
    // The case that made a top-up worthless: nothing left undecided.
    expect(sourceTarget(0)).toBe(200)
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

describe('sourcingTarget — an explicit request is a decision, not a suggestion', () => {
  it('honours the $99 pack target of 200 even when the client preference is 20', () => {
    // THE BUG: Math.min(200, 20) = 20. The $99 sourced a fifth of what it paid for, and a
    // client could then only approve twenty against a pack promising a hundred.
    expect(sourcingTarget(PACK_SOURCE_TARGET, 20)).toBe(200)
  })

  it('honours an operator asking for a specific number', () => {
    expect(sourcingTarget(75, 20)).toBe(75)
    expect(sourcingTarget(5, 500)).toBe(5)
  })

  it('falls back to the client preference when nobody said how many', () => {
    expect(sourcingTarget(undefined, 50)).toBe(50)
  })

  it('falls back to 20 when there is no preference either', () => {
    expect(sourcingTarget(undefined, null)).toBe(20)
    expect(sourcingTarget(undefined, 0)).toBe(20)
    expect(sourcingTarget(undefined, undefined)).toBe(20)
  })

  it('never returns a negative or fractional target', () => {
    expect(sourcingTarget(-5, 20)).toBe(0)
    expect(sourcingTarget(12.9, 20)).toBe(12)
  })

  it('an explicit zero means zero — not "fall back to the preference"', () => {
    // sourceTarget() returns 0 for an already-stocked client; that must not become 20.
    expect(sourcingTarget(0, 20)).toBe(0)
  })
})
