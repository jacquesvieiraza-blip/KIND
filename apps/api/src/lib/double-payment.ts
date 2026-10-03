// ═══════════════════════════════════════════════════════════════════════════════════════
// A CLIENT PAID TWICE FOR ONE STAGE — the founder is told, and nothing is refunded by code.
//
// ⛓️ FOUNDER-RULED 2 Oct (R191): asked what should happen when a client pays the same stage
// twice, he chose *"Alert me, I refund by hand"*. The code never refunds; the founder gets an
// alert naming the client, the amount and the Stripe payment, on top of Vida (a critical
// `payment_failed` task) and by email.
//
// 🛑 WHAT HAPPENED BEFORE. The second payment reached `recordFirstPayment` /
// `recordSecondPayment`, which refused it ("a different payment recorded"), and the webhook
// answered 500 — so Stripe retried a payment that can never be recorded, for days, and every
// retry said "Stripe will retry; record it by hand", which is the wrong instruction: the money
// must go back, not in.
//
// ⚠️ PLAIN TS, NO DB — the words and the link are RUN by the test, not grepped.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** The Stripe dashboard page for a payment — test-mode payments live under `/test`. */
export function stripePaymentLink(paymentIntentId: string | null, livemode: boolean): string | null {
  if (!paymentIntentId) return null
  return `https://dashboard.stripe.com/${livemode ? '' : 'test/'}payments/${paymentIntentId}`
}

export function formatPaid(amountCents: number | null | undefined, currency: string | null | undefined): string {
  if (typeof amountCents !== 'number') return 'an amount Stripe did not report'
  const cur = (currency || 'usd').toUpperCase()
  return `${(amountCents / 100).toFixed(2)} ${cur}`
}

export function doublePaymentAlert(args: {
  companyName: string | null
  clientId: string | null
  programmeId: string
  stage: 'first' | 'second'
  sessionId: string
  paymentIntentId: string | null
  amountCents: number | null | undefined
  currency: string | null | undefined
  livemode: boolean
}) {
  const who = args.companyName?.trim() || `client ${args.clientId ?? 'unknown'}`
  const paid = formatPaid(args.amountCents, args.currency)
  const link = stripePaymentLink(args.paymentIntentId, args.livemode)
  return {
    subject: `${who} paid twice — refund ${paid} in Stripe`,
    lines: [
      `${who} paid the ${args.stage} payment for their programme a second time: ${paid}.`,
      'The first payment is the one on record. This one was NOT recorded and nothing was started with it.',
      link ? `Refund it in Stripe: ${link}` : `Refund it in Stripe — find checkout session ${args.sessionId}.`,
      `Programme ${args.programmeId} · Stripe session ${args.sessionId}.`,
      'Nothing is refunded automatically.',
    ],
    // One alert per paid session: a redelivery of the same webhook files nothing new.
    dedupeKey: `double_payment:${args.sessionId}`,
  }
}

/**
 * ⚑ 3 Oct (#2561 · R191 ④) — IS A REFUND OR DISPUTE ABOUT THE PAYMENT ON RECORD, OR THE DUPLICATE?
 *
 * 🛑 WHAT THIS CLOSES. The duplicate's checkout carries the same `programmeId` as the real one,
 * so refunding it — exactly what the alert above tells the founder to do — reached the
 * "payment reversed" path: the client's live, paid programme was paused and marked disputed,
 * its wallet credit returned and its campaigns paused. Only a reversal of a payment the
 * programme RECORDED may stop the programme.
 *
 * ⚠️ UNKNOWN STOPS, AS BEFORE. No intent on the event, or a programme that recorded no intent
 * (paid before intents were kept), cannot be told apart from the real payment — so it keeps the
 * old behaviour, which stops the work. Only a provable duplicate is let through untouched.
 */
export function reversalTarget(
  paymentIntentId: string | null | undefined,
  recorded: { first_payment_intent_id?: string | null; second_payment_intent_id?: string | null } | null,
): 'recorded' | 'duplicate' | 'unknown' {
  if (!paymentIntentId || !recorded) return 'unknown'
  const known = [recorded.first_payment_intent_id, recorded.second_payment_intent_id].filter((v): v is string => !!v)
  if (known.length === 0) return 'unknown'
  return known.includes(paymentIntentId) ? 'recorded' : 'duplicate'
}

export function duplicateRefundAlert(args: { programmeId: string; clientId: string | null; paymentIntentId: string; dispute: boolean }) {
  return {
    subject: args.dispute
      ? 'A client disputed their duplicate payment — their programme keeps running'
      : 'Duplicate payment refunded — the programme keeps running',
    lines: [
      `Programme ${args.programmeId} (client ${args.clientId ?? 'unknown'}): Stripe payment ${args.paymentIntentId} was ${args.dispute ? 'disputed' : 'refunded'}.`,
      'It is not the payment this programme recorded, so nothing was paused, no credit was returned and no campaign was stopped.',
      args.dispute ? 'Answer the dispute in Stripe: this payment was a duplicate.' : 'No action needed.',
    ],
    dedupeKey: `duplicate_reversal:${args.paymentIntentId}:${args.dispute ? 'dispute' : 'refund'}`,
  }
}
