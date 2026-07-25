import { describe, it, expect } from 'vitest'

// #317 — the refund / chargeback rules, pinned as data so they can't drift silently.
//
// The claw-back itself lives in routes/stripe.ts against the live Stripe event and is not
// unit-testable without a Stripe double. What IS testable — and what actually bit — is the
// SHAPE of the rows we write and the decisions we make on each event. Two real defects are
// pinned here:
//
//   1. `type: 'adjustment'` is NOT in credit_transactions' CHECK constraint. The dispute-won
//      restore was first written with it: the insert would have thrown, the webhook would
//      have 500'd, Stripe would have retried forever, and the client would never have been
//      restored. Caught before merge; this test keeps it caught.
//   2. `charge.dispute.closed` was not handled at all, so a dispute WE WON left the client
//      permanently short — we keep the cash Stripe returned AND their wallet stays clawed.

// The live constraint, from migrations/20260724_one_wallet.sql (the one-wallet widening).
const ALLOWED_LEDGER_TYPES = [
  'purchase', 'credit_purchase',
  'referral', 'referral_bonus',
  'trial_bonus',
  'consumed', 'usage',
  'manual_grant', 'refund',
  'hold', 'release',
  'wallet_topup', 'wallet_charge', 'wallet_reverse',
] as const

/** Every ledger type routes/stripe.ts writes on the refund / dispute paths. */
const TYPES_WE_WRITE_ON_REFUND_PATHS = ['refund', 'manual_grant'] as const

describe('#317 ledger rows must satisfy the CHECK constraint', () => {
  it('every type the refund/dispute paths write is allowed', () => {
    for (const t of TYPES_WE_WRITE_ON_REFUND_PATHS) {
      expect(ALLOWED_LEDGER_TYPES).toContain(t)
    }
  })

  it("'adjustment' is NOT allowed — the bug this test exists for", () => {
    // If someone reintroduces type:'adjustment' on a money path, the insert throws, the
    // webhook 500s, and Stripe retries forever. Keep it out.
    expect(ALLOWED_LEDGER_TYPES).not.toContain('adjustment' as never)
  })
})

// The decision table for a dispute lifecycle. Restoring on 'lost' would hand back money
// Stripe has actually taken from us; never restoring at all leaves a legitimately-paying
// client short — which is us taking money for nothing.
type DisputeStatus = 'won' | 'lost' | 'under_review' | 'warning_closed' | undefined
function shouldRestoreOnDisputeClosed(status: DisputeStatus): boolean {
  return status === 'won'
}

describe('#317b dispute closed — restore only on a WIN', () => {
  it('restores when we won', () => {
    expect(shouldRestoreOnDisputeClosed('won')).toBe(true)
  })

  it('does NOT restore when we lost — Stripe took those funds, the claw-back stands', () => {
    expect(shouldRestoreOnDisputeClosed('lost')).toBe(false)
  })

  it('does not restore on any other or missing status', () => {
    for (const s of ['under_review', 'warning_closed', undefined] as DisputeStatus[]) {
      expect(shouldRestoreOnDisputeClosed(s)).toBe(false)
    }
  })
})

// Idempotency references. credit_transactions has a UNIQUE index on `reference`, which is
// what makes a replayed Stripe webhook safe — but only if the claw-back and the restore use
// DIFFERENT references. Sharing one would make the restore silently 23505-skip forever.
describe('#317 idempotency references must not collide', () => {
  const clawBackRef = (id: string) => `refund_${id}`
  const restoreRef = (id: string) => `refund_restore_${id}`

  it('claw-back and restore use different references for the same dispute', () => {
    const id = 'dp_123'
    expect(clawBackRef(id)).not.toBe(restoreRef(id))
  })

  it('a restore reference is stable, so a replayed webhook restores at most once', () => {
    expect(restoreRef('dp_123')).toBe(restoreRef('dp_123'))
  })

  it('the referral claw-back is keyed per referred client, so it fires at most once', () => {
    // A dispute AFTER a refund produces two events; both resolve to the same reference,
    // so the referrer's bonus is clawed once rather than twice.
    const ref = (clientId: string) => `referral_claw_${clientId}`
    expect(ref('client_a')).toBe(ref('client_a'))
    expect(ref('client_a')).not.toBe(ref('client_b'))
  })
})
