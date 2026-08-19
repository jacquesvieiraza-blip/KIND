// ─────────────────────────────────────────────────────────────────────────────
// PARTNER COMMISSION ON A LEAD SALE — founder-locked 19 Aug 2026.
//
// THE RULING, in his words:
//   • *"no 25% does not include the $299 nor the 100 leads we give. its everything after
//      this or above this"*
//   • *"lifetime. if they looking after their client its theirs."*
//   • *"she earns on leads purchased not when they top up. because our calulators on leads
//      not money in. we earn money when they buy leads. so thye need to be managing their
//      customers to buy leads."*
//
// ⚠️ WHAT THIS REPLACED, AND WHY IT WAS NOT A RATE CHANGE.
//
// Reading `comp-engine.ts`, `20260815_client_partner_seat.sql` and `routes/stripe.ts` end to
// end found the code doing the EXACT INVERSE of the ruling:
//
//   • commission fired on THREE Stripe events — the pack checkout, credit-bundle top-ups and
//     subscription renewals — i.e. on money arriving;
//   • the $299 pack paid 20% (the largest commission event that existed);
//   • the $4 approval paid NOTHING, and could not — it is a wallet deduction
//     (`try_charge_wallet`), never a Stripe payment, so it never reached the writer at all.
//
// So this is new plumbing, not a number. `comp-engine.ts` models an MRR business (20% of
// first-month MRR, 5%/8% of active book) and has no concept of a lead sale; it is left
// untouched and uncalled rather than bent into a shape it was not built for.
//
// Nothing needed unwinding: no client has ever paid, so no commission row has ever existed.
//
// ── THE THREE INVARIANTS ─────────────────────────────────────────────────────
//
// 1. ONLY WHEN MONEY MOVED. A pack-covered approval writes a $0 ledger row and never calls
//    `try_charge_wallet` — so the "100 included pay nothing" rule is STRUCTURAL, not a filter
//    bolted on here. The caller passes `moneyMoved`; this refuses without it.
//
// 2. ONCE PER LEAD, EVER. The idempotency key is `lead:<leadId>` — the SAME reference the $4
//    ledger row uses — written into `partner_commissions.stripe_ref`, whose partial unique
//    index `(partner_id, stripe_ref)` is the database-level double-pay guard (#351's real
//    fix). A retried approval loses at the database, not at an app-level check.
//
// 3. NEVER BEFORE THE CHARGE STUCK. The caller invokes this only after the $4 ledger row is
//    written, which is after every reversal branch has already returned (a dead email refunds
//    the $4 and never reaches here). Commission OBSERVES a charge; it never causes, alters or
//    blocks one — and a commission failure can never fail an approval.
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '@kind/db'
import { sendFounderAlert } from './alerts'
import { PARTNER_COMMISSION_PCT, LEAD_PRICE_USD } from '@kind/shared'

/** Round a USD amount to whole cents, half-up. Mirrors comp-engine's roundUsd. */
export function roundUsd(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

/**
 * What one lead sale pays the partner, in USD — derived from the constants, never typed.
 *
 * GROSS: 25% of what the client pays, before card fees (founder chose gross, 19 Aug).
 */
export function leadSaleCommissionUsd(leadPriceUsd: number = LEAD_PRICE_USD): number {
  return roundUsd((leadPriceUsd * PARTNER_COMMISSION_PCT) / 100)
}

/** The idempotency key for a lead's commission — the same reference the $4 ledger row uses. */
export function leadCommissionRef(leadId: string): string {
  return `lead:${leadId}`
}

/**
 * Record the partner's 25% on a lead that was actually paid for.
 *
 * Fire-and-forget by design: the caller does not await a failure into the approval path.
 * A client's approval must never fail because a commission row did not write — but the
 * founder IS alerted, because nothing else recreates this row (#349's lesson: a swallowed
 * commission failure is a partner who is silently never paid).
 *
 * @param clientId    the client whose approval charged $4
 * @param leadId      the lead approved — becomes the once-per-lead idempotency key
 * @param moneyMoved  false for a pack-covered (included) approval; this then does nothing
 */
export async function recordLeadSaleCommission(
  clientId: string,
  leadId: string,
  moneyMoved: boolean,
): Promise<void> {
  // INVARIANT 1 — the included 100 never pay. A pack approval moved no money.
  if (!moneyMoved) return

  try {
    // Is this client attributed to a partner at all? A house/direct client is not, and
    // earns nobody anything — `.maybeSingle()` rather than `.single()` so "no referral"
    // is an ordinary answer rather than an error thrown into the approval path.
    const { data: referral } = await db
      .from('partner_referrals')
      .select('id, partner_id')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .maybeSingle()

    if (!referral?.partner_id) return // house client — no commission, by design

    const amountUsd = leadSaleCommissionUsd()
    const ref = leadCommissionRef(leadId)

    const { error } = await db.from('partner_commissions').insert({
      partner_id:          referral.partner_id,
      partner_referral_id: referral.id,
      client_id:           clientId,
      amount_usd:          amountUsd,
      commission_type:     'lead_sale',
      period_month:        new Date().toISOString().slice(0, 7), // "2026-08"
      stripe_ref:          ref,
      status:              'pending',
    })

    if (error) {
      // INVARIANT 2 — a duplicate here is the unique index doing its job against a retried
      // approval. Expected, not news; alerting on it would page the founder on every retry.
      if (/duplicate key|unique constraint/i.test(error.message) || error.code === '23505') return

      console.error('[lead-commission] commission row FAILED — partner will not be paid:', error.message)
      void sendFounderAlert('charge_failed', 'Partner commission was NOT recorded on a lead sale', [
        `Client ${clientId} was charged $${LEAD_PRICE_USD} for lead ${leadId}, earning $${amountUsd.toFixed(2)} commission.`,
        `The commission row failed to write: ${error.message}`,
        'Nothing retries this — the approval succeeded and will not run again for this lead.',
        'Fix: add the commission by hand in Vida → Partners before the payout run.',
      ]).catch(() => {})
    }
  } catch (err) {
    // INVARIANT 3 — never let a commission failure surface in the approval path. The client
    // has paid and been served; this is our bookkeeping problem, not theirs.
    console.error('[lead-commission]', err)
  }
}
