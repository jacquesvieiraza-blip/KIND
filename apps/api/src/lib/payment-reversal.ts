// ═══════════════════════════════════════════════════════════════════════════════════════
// MAY A PROGRAMME WHOSE PAYMENT WAS REVERSED BE RESUMED?
//
// ⛓️ FOUNDER-RULED 2 Oct (R191): *"Refuse until it's settled"*. A refunded programme can never
// resume; a disputed one is refused while the dispute is open, and can resume once the dispute
// is won. The founder sees why in Vida (the refusal is the Resume button's answer).
//
// 🛑 WHAT HAPPENED BEFORE. `recordDispute` paused the programme and stamped `disputed_at`, and
// `resumeProgramme` cleared the pause with no question asked — one press in Vida and a client
// who had taken their money back was being worked for again.
//
// ⚠️ STRIPE IS ASKED AT RESUME TIME, not remembered. A dispute is won or lost days after the
// webhook that paused it, and Stripe is the record of the money; a column we stamped once would
// go stale the day the bank decides. An unreadable answer refuses.
//
// ⚠️ PLAIN TS, NO STRIPE CLIENT — the rule is RUN by the test.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** Stripe dispute statuses that mean the money is still in question. */
const OPEN_DISPUTE = new Set([
  'warning_needs_response', 'warning_under_review', 'needs_response', 'under_review',
])

export type ReversalVerdict =
  | { mayResume: true; state: 'none' | 'dispute_won' }
  | { mayResume: false; state: 'refunded' | 'dispute_open' | 'dispute_lost' | 'unreadable' | 'no_payment_on_record'; reason: string }

export function reversalVerdict(
  read: { refunds: { status: string | null }[]; disputes: { status: string }[] } | null,
  hasPaymentOnRecord = true,
): ReversalVerdict {
  if (!hasPaymentOnRecord) {
    return { mayResume: false, state: 'no_payment_on_record',
      reason: 'This programme\'s payment was reversed, but no Stripe payment is on record to check. Check it in Stripe by hand — it was not resumed.' }
  }
  if (read === null) {
    return { mayResume: false, state: 'unreadable',
      reason: 'This programme\'s payment was reversed, and Stripe could not be read to check whether that is settled. It was not resumed — try again in a minute.' }
  }
  // A refund that went through, or is going through, is final.
  if (read.refunds.some(r => r.status !== 'failed' && r.status !== 'canceled')) {
    return { mayResume: false, state: 'refunded',
      reason: 'This programme\'s payment was refunded, so it cannot be resumed. A new programme needs a new payment.' }
  }
  if (read.disputes.some(d => d.status === 'lost')) {
    return { mayResume: false, state: 'dispute_lost',
      reason: 'The client\'s card dispute was lost, so the money went back to them. This programme cannot be resumed.' }
  }
  if (read.disputes.some(d => OPEN_DISPUTE.has(d.status))) {
    return { mayResume: false, state: 'dispute_open',
      reason: 'The client has an open card dispute on this programme\'s payment. It cannot be resumed until the dispute is won.' }
  }
  return { mayResume: true, state: read.disputes.some(d => d.status === 'won') ? 'dispute_won' : 'none' }
}
