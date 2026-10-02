// ── PROGRAMME CHECKOUT (BUILD-002) — its own module, and that is the point ───────────────
//
// This lives apart from `lib/stripe.ts` deliberately. That file imports `PACK_LEADS` and
// `PRICING` — legacy money — and the legacy fence is only worth having if it is a clean
// partition rather than a partition with an exception carved for the one file that would
// have broken it. So programme checkout gets its own module, imports the programme curve and
// nothing legacy, and `programme-legacy-fence.test.ts` can assert a rule with no exceptions.
//
// Two stages, one programme: `programme_first` authorises sourcing, `programme_second` is
// paid at Approve & Go Live (R81 · founder locks 4 and 5).

import Stripe from 'stripe'
import { stripeSdkHostOptions } from './provider-hosts'
import { meetingsPhrase, type ProgrammeStage } from '@kind/shared'

const key = process.env.STRIPE_SECRET_KEY
// ⛓️ 18 Sep (Batch 1b) — spreads to `{}` when `STRIPE_BASE_URL` is unset: production unchanged.
const stripe = key ? new Stripe(key, { ...stripeSdkHostOptions() }) : null

function stripeErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Stripe request failed'
}

/**
 * Create a checkout session for one stage of a programme.
 *
 * ⚠️ INLINE `price_data`, NOT A STRIPE PRICE OBJECT — deliberately, and for the same reason
 * the wallet path uses it. The curve produces a different amount for every meeting target, so
 * a price object per programme would mean creating and reconciling thousands of them in the
 * Stripe catalogue; #414 already records that this checkout path renders no dashboard product
 * at all.
 *
 * ⛓️ 1 Oct (#2226 · MONEY-003) — 🛑 THE AMOUNT IS THE ONE STORED ON THE PROGRAMME WHEN IT WAS
 * QUOTED, NEVER A FRESH PRICE. ~~"The amount comes from the shared curve"~~ — `programmeStripeAmountCents`
 * re-priced the programme at the moment of checkout, so a price change between the quote the
 * client accepted and the moment they pressed Pay would have charged a number they never saw
 * (and the webhook's B8 check would then refuse to start the programme — money taken, nothing
 * delivered). `first_payment_cents` / `second_payment_cents` are written once, at quote time,
 * and are what the client agreed to. Stripe takes integer minor units, so the stored cents
 * figure IS the Stripe amount — no float multiplication at the money boundary.
 */
export function quotedStageCents(
  p: { first_payment_cents?: number | null; second_payment_cents?: number | null },
  stage: ProgrammeStage,
): number {
  const v = Number(stage === 'programme_first' ? p.first_payment_cents : p.second_payment_cents)
  return Number.isFinite(v) ? Math.floor(v) : 0
}
export async function createProgrammeCheckoutSession(params: {
  clientId:    string
  programmeId: string
  meetings:    number
  stage:       ProgrammeStage
  /**
   * ⚑ 1 Oct (#2226) — the amount stored on the programme for THIS stage when it was quoted
   * (`quotedStageCents`). Required: there is no fallback to a fresh price, so a caller that
   * forgets it charges nothing rather than the wrong amount.
   */
  quotedCents: number
  successUrl:  string
  cancelUrl:   string
  clientEmail: string
  /**
   * Wallet credit to apply, in integer cents. P1 only (R136 ④, founder-ruled 23 Sep).
   *
   * ⚠️ AN INTENTION, NOT A DRAW — nothing has left the wallet when this session is created.
   * The money moves only when the payment is CONFIRMED, because an abandoned checkout that had
   * already spent a client's credit would take their money and deliver nothing.
   */
  walletCreditCents?: number
  /**
   * ⚑ 25 Sep (R166 · P9) — the programme's size band (`programmes.size_band`). A band programme
   * is charged ITS OWN quote (the whole total at P1, nothing at P2); none is the curve's 50/50.
   */
  band?: import('@kind/shared').SizeBand | null
}): Promise<{ url: string | null; sessionId?: string; error?: string }> {
  if (!stripe) return { url: null, error: 'Stripe not configured' }
  // ⚑ 25 Sep — 🛑 A DEMO ACCOUNT IS NEVER CHARGED. Before this, only House was refused (and only
  // at the client door): a demo account pressing "Pay" would have opened a LIVE Stripe checkout.
  // Refused here, where the only Stripe session is created, so every door is covered.
  const { isDemoClient } = await import('./demo')
  if (await isDemoClient(params.clientId)) {
    return { url: null, error: 'This is a demo account, so nothing is ever charged.' }
  }
  try {
    const owedCents = Number.isFinite(params.quotedCents) ? Math.floor(params.quotedCents) : 0
    // ⚑ 25 Sep (P9) — nothing is owed at this stage (a programme paid in full has no second
    // payment). Refused before Stripe, which would reject a zero amount anyway.
    if (owedCents < 1) return { url: null, error: 'Nothing is owed at this stage — this programme was paid in full.' }
    const isFirst = params.stage === 'programme_first'

    // 🛑 CREDIT IS P1 ONLY, ENFORCED HERE AND NOT ONLY AT THE CALLER. Founder-ruled: P1
    // authorises sourcing, so a credit reduces the cost of starting the next run; P2 is going
    // live, which is a different promise. A caller passing credit on P2 is a bug, and it is
    // refused rather than quietly discounted.
    const credit = isFirst ? Math.max(0, Math.floor(params.walletCreditCents ?? 0)) : 0
    const amountCents = owedCents - credit
    if (amountCents < 1) {
      // Unreachable while `walletCreditForPayment` caps the credit, and asserted anyway: a
      // zero or negative Stripe amount is rejected by Stripe, and the failure would arrive as
      // a checkout error rather than as the rule violation it actually is.
      return { url: null, error: 'Wallet credit cannot cover the whole payment.' }
    }
    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode:                 'payment',
      payment_method_types: ['card'],
      customer_email:       params.clientEmail,
      line_items: [{
        quantity: 1,
        price_data: {
          currency:    'usd',
          unit_amount: amountCents,
          product_data: {
            // ⛓️ 28 Sep (R172 · B2) — ~~"N targeted booked meetings (first 50%)"~~ on a one-payment
            // programme's receipt. The Terms sell QUALIFIED meetings; a band programme is paid in full.
            name: isFirst
              ? `K.I.N.D programme — ${meetingsPhrase(params.meetings)} (${params.band ? 'paid in full' : 'first 50%'})${credit > 0 ? ' — wallet credit applied' : ''}`
              : `K.I.N.D programme — ${meetingsPhrase(params.meetings)} (second 50%, Go Live)`,
          },
        },
      }],
      success_url: params.successUrl,
      cancel_url:  params.cancelUrl,
      // ⚠️ BOTH STAGES CARRY programmeId. The webhook resolves the programme from metadata
      // and then RE-READS its state — the checkout URL is never authority (see
      // `recordSecondPayment`), so this is identity, not permission.
      metadata: {
        clientId:    params.clientId,
        programmeId: params.programmeId,
        meetings:    String(params.meetings),
        type:        params.stage,
        // ⚠️ THE INTENDED CREDIT TRAVELS WITH THE SESSION, and the webhook draws against it
        // when the payment lands. It is the INTENTION — the webhook re-reads the live balance
        // and never draws more than is actually there.
        walletCreditCents: String(credit),
      },
    }
    // ── ⚑ 2 Oct (#2561) — ONE PAY PRESS, ONE CHECKOUT ──────────────────────────────────────
    // ~~A new checkout on every press~~ — a double click, a second tab or a back-and-press left
    // two open checkouts for one programme stage, and both could be paid ("money taken, not
    // recorded"). The same request now carries the same idempotency key, so Stripe returns the
    // SAME checkout (its keys last 24 hours, as long as a checkout stays open). Anything different
    // — stage, programme, amount, wallet credit, return addresses — hashes to a different key and
    // is never blocked. The key holds no personal detail: the email is inside the hash only.
    const { createHash } = await import('node:crypto')
    const idempotencyKey = `programme-checkout:${params.programmeId}:${params.stage}:${createHash('sha256').update(JSON.stringify(sessionParams)).digest('hex').slice(0, 32)}`
    const session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey })
    return { url: session.url, sessionId: session.id }
  } catch (err) {
    console.error('[Stripe] createProgrammeCheckoutSession error:', err)
    return { url: null, error: stripeErrorMessage(err) }
  }
}
