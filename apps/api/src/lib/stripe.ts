import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' as any })
  : null

// Price IDs — configure via environment variables
// STRIPE_PRICE_LEADGEN_20  — 20 lead gen credits (~$20)
// STRIPE_PRICE_LEADGEN_100 — 100 lead gen credits (~$100)
// STRIPE_PRICE_FIGSY_20    — 20 FIGSY outreach credits (~$60)
// STRIPE_PRICE_FIGSY_100   — 100 FIGSY outreach credits (~$300)

export function getStripePriceId(creditType: 'lead_gen' | 'figsy', credits: number): string | null {
  if (creditType === 'lead_gen') {
    if (credits === 20)  return process.env.STRIPE_PRICE_LEADGEN_20  || null
    if (credits === 100) return process.env.STRIPE_PRICE_LEADGEN_100 || null
  }
  if (creditType === 'figsy') {
    if (credits === 20)  return process.env.STRIPE_PRICE_FIGSY_20    || null
    if (credits === 100) return process.env.STRIPE_PRICE_FIGSY_100   || null
  }
  return null
}

export function isStripeConfigured(): boolean {
  return stripe !== null
}

export async function createCheckoutSession(params: {
  clientId:    string
  priceId:     string
  credits:     number
  creditType:  'lead_gen' | 'figsy'
  successUrl:  string
  cancelUrl:   string
  clientEmail: string
}): Promise<string | null> {
  if (!stripe) return null
  try {
    const session = await stripe.checkout.sessions.create({
      mode:               'payment',
      payment_method_types: ['card'],
      customer_email:     params.clientEmail,
      line_items: [{ price: params.priceId, quantity: 1 }],
      success_url:        params.successUrl,
      cancel_url:         params.cancelUrl,
      metadata: {
        clientId:   params.clientId,
        credits:    String(params.credits),
        creditType: params.creditType,
      },
    })
    return session.url
  } catch (err) {
    console.error('[Stripe] createCheckoutSession error:', err)
    return null
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function constructWebhookEvent(payload: Buffer, sig: string): any | null {
  if (!stripe) return null
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error('[Stripe] STRIPE_WEBHOOK_SECRET not set')
    return null
  }
  try {
    return stripe.webhooks.constructEvent(payload, sig, secret)
  } catch (err) {
    console.error('[Stripe] Webhook signature verification failed:', err)
    return null
  }
}
