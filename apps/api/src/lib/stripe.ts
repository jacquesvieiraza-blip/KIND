import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' as any })
  : null

// ── Credit bundle price IDs (one-time payments) ───────────────────────────────
// STRIPE_PRICE_LEADGEN_20  — 20 lead gen credits ($20)
// STRIPE_PRICE_LEADGEN_40  — 40 lead gen credits ($38)
// STRIPE_PRICE_LEADGEN_100 — 100 lead gen credits ($88)
// STRIPE_PRICE_FIGSY_20    — 20 FIGSY credits ($60)
// STRIPE_PRICE_FIGSY_40    — 40 FIGSY credits ($110)
// STRIPE_PRICE_FIGSY_100   — 100 FIGSY credits ($250)

// ── Subscription price IDs (recurring monthly) ───────────────────────────────
// STRIPE_PRICE_MILLA_MONTHLY — Milla VA $49/month
// STRIPE_PRICE_VIDA_MONTHLY  — Vida Chatbot $39/month

export const STRIPE_BUNDLES = {
  lead_gen: [
    { credits: 20,  price: 20,  priceEnvVar: 'STRIPE_PRICE_LEADGEN_20' },
    { credits: 40,  price: 38,  priceEnvVar: 'STRIPE_PRICE_LEADGEN_40' },
    { credits: 100, price: 88,  priceEnvVar: 'STRIPE_PRICE_LEADGEN_100' },
  ],
  figsy: [
    { credits: 20,  price: 60,  priceEnvVar: 'STRIPE_PRICE_FIGSY_20' },
    { credits: 40,  price: 110, priceEnvVar: 'STRIPE_PRICE_FIGSY_40' },
    { credits: 100, price: 250, priceEnvVar: 'STRIPE_PRICE_FIGSY_100' },
  ],
} as const

export const STRIPE_SUBSCRIPTIONS = {
  milla:  { priceEnvVar: 'STRIPE_PRICE_MILLA_MONTHLY',  product: 'virtual_assistant', label: 'Milla — Virtual Assistant',     priceUsd: 49 },
  vida:   { priceEnvVar: 'STRIPE_PRICE_VIDA_MONTHLY',   product: 'chatbot',           label: 'Vida — Chatbot Agent',          priceUsd: 29 },
  denise: { priceEnvVar: 'STRIPE_PRICE_DENISE_MONTHLY', product: 'denise',            label: 'Denise — AI Account Executive', priceUsd: 99 },
} as const

export type SubscriptionProduct = keyof typeof STRIPE_SUBSCRIPTIONS

export function getStripePriceId(creditType: 'lead_gen' | 'figsy', credits: number): string | null {
  const bundle = STRIPE_BUNDLES[creditType].find(b => b.credits === credits)
  if (!bundle) return null
  return process.env[bundle.priceEnvVar] || null
}

export function getStripeSubscriptionPriceId(product: SubscriptionProduct): string | null {
  return process.env[STRIPE_SUBSCRIPTIONS[product].priceEnvVar] || null
}

export function isStripeConfigured(): boolean {
  return stripe !== null
}

// ── One-time credit purchase checkout ────────────────────────────────────────
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
      mode:                 'payment',
      payment_method_types: ['card'],
      customer_email:       params.clientEmail,
      line_items:           [{ price: params.priceId, quantity: 1 }],
      success_url:          params.successUrl,
      cancel_url:           params.cancelUrl,
      metadata: {
        clientId:   params.clientId,
        credits:    String(params.credits),
        creditType: params.creditType,
        type:       'credit_purchase',
      },
    })
    return session.url
  } catch (err) {
    console.error('[Stripe] createCheckoutSession error:', err)
    return null
  }
}

// ── Recurring subscription checkout ──────────────────────────────────────────
export async function createSubscriptionCheckoutSession(params: {
  clientId:    string
  product:     SubscriptionProduct
  priceId:     string
  clientEmail: string
  successUrl:  string
  cancelUrl:   string
}): Promise<string | null> {
  if (!stripe) return null
  try {
    const session = await stripe.checkout.sessions.create({
      mode:                 'subscription',
      payment_method_types: ['card'],
      customer_email:       params.clientEmail,
      line_items:           [{ price: params.priceId, quantity: 1 }],
      success_url:          params.successUrl,
      cancel_url:           params.cancelUrl,
      metadata: {
        clientId: params.clientId,
        product:  params.product,
        type:     'subscription',
      },
      subscription_data: {
        metadata: {
          clientId: params.clientId,
          product:  params.product,
        },
      },
    })
    return session.url
  } catch (err) {
    console.error('[Stripe] createSubscriptionCheckoutSession error:', err)
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
