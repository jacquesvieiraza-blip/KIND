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
