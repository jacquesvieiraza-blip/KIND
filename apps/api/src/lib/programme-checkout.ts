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
import { programmeStripeAmountCents, type ProgrammeStage } from '@kind/shared'

const key = process.env.STRIPE_SECRET_KEY
const stripe = key ? new Stripe(key) : null

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
 * ⚠️ THE AMOUNT COMES FROM THE SHARED CURVE IN INTEGER CENTS AND IS NOT RE-DERIVED HERE.
 * Re-computing the half locally is exactly the two-places-one-number defect R68 records.
 * Stripe takes integer minor units, so the cents figure IS the Stripe amount — no float
 * multiplication at the money boundary.
 */
export async function createProgrammeCheckoutSession(params: {
  clientId:    string
  programmeId: string
  meetings:    number
  stage:       ProgrammeStage
  successUrl:  string
  cancelUrl:   string
  clientEmail: string
}): Promise<{ url: string | null; sessionId?: string; error?: string }> {
  if (!stripe) return { url: null, error: 'Stripe not configured' }
  try {
    const amountCents = programmeStripeAmountCents(params.meetings, params.stage)
    const isFirst = params.stage === 'programme_first'
    const session = await stripe.checkout.sessions.create({
      mode:                 'payment',
      payment_method_types: ['card'],
      customer_email:       params.clientEmail,
      line_items: [{
        quantity: 1,
        price_data: {
          currency:    'usd',
          unit_amount: amountCents,
          product_data: {
            name: isFirst
              ? `K.I.N.D programme — ${params.meetings} targeted booked meetings (first 50%)`
              : `K.I.N.D programme — ${params.meetings} targeted booked meetings (second 50%, Go Live)`,
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
      },
    })
    return { url: session.url, sessionId: session.id }
  } catch (err) {
    console.error('[Stripe] createProgrammeCheckoutSession error:', err)
    return { url: null, error: stripeErrorMessage(err) }
  }
}
