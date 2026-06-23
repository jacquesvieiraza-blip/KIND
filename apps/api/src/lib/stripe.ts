import Stripe from 'stripe'
import { PRICING } from '@kind/shared'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' as any })
  : null

// ── Credit bundle price IDs (one-time payments) — prices LOCKED to @kind/shared ──
// Lead Gen: $1/credit flat  → $20 / $40 / $100
// FIGSY:    $3/credit flat   → $60 / $120 / $300
// The price NUMBERS are derived from PRICING (single source of truth, item 168);
// the env vars below hold the matching Stripe Price object IDs — recreate those in
// Stripe at the same locked values:
//   STRIPE_PRICE_LEADGEN_20 / _40 / _100   ·   STRIPE_PRICE_FIGSY_20 / _40 / _100

// ── Subscription price IDs (recurring monthly) ───────────────────────────────
// STRIPE_PRICE_MILLA_MONTHLY  — Milla VA $49/month
// STRIPE_PRICE_VIDA_MONTHLY   — Vida Chatbot $29/month
// STRIPE_PRICE_DENISE_MONTHLY — Denise AI Account Executive $39/month

// Built FROM the locked pricing constants so the three price tables can never
// drift apart again (item 168). credits → env var holding the Stripe Price ID.
export const STRIPE_BUNDLES = {
  lead_gen: PRICING.lead_gen.bundles.map(b => ({
    credits: b.credits, price: b.price_usd, priceEnvVar: `STRIPE_PRICE_LEADGEN_${b.credits}`,
  })),
  figsy: PRICING.figsy.bundles.map(b => ({
    credits: b.credits, price: b.price_usd, priceEnvVar: `STRIPE_PRICE_FIGSY_${b.credits}`,
  })),
} as const

export const STRIPE_SUBSCRIPTIONS = {
  milla:  { priceEnvVar: 'STRIPE_PRICE_MILLA_MONTHLY',  product: 'virtual_assistant', label: 'Milla — Virtual Assistant',     priceUsd: 49 },
  vida:   { priceEnvVar: 'STRIPE_PRICE_VIDA_MONTHLY',   product: 'chatbot',           label: 'Vida — Chatbot Agent',          priceUsd: 29 },
  denise: { priceEnvVar: 'STRIPE_PRICE_DENISE_MONTHLY', product: 'denise',            label: 'Denise — AI Account Executive', priceUsd: 39 },
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

// ── Client invoices (#136a) ──────────────────────────────────────────────────
// Stripe ISSUES the receipt; we only pull & display it. USD billing, no VAT until
// a benchmark — VAT (if any) is whatever Stripe already put on the invoice, so we
// surface the raw amounts Stripe returns. Read-only.
export interface ClientInvoice {
  id:                string
  number:            string | null
  date:              number          // Unix seconds — invoice creation date
  amount_usd:        number          // dollars (Stripe amounts are in cents)
  currency:          string
  status:            string | null   // paid · open · void · uncollectible · draft
  hosted_invoice_url: string | null
  invoice_pdf:       string | null
}

// List a client's invoices by their Stripe customer email. We don't store a
// stripe_customer_id (checkout uses customer_email), so we resolve the customer
// from their email at read-time. Returns [] gracefully when Stripe is not
// configured, the email is missing, or the customer has never been billed.
export async function listInvoicesByEmail(email: string | null | undefined): Promise<ClientInvoice[]> {
  if (!stripe || !email) return []
  try {
    const customers = await stripe.customers.list({ email, limit: 100 })
    if (customers.data.length === 0) return []

    const all: ClientInvoice[] = []
    for (const customer of customers.data) {
      const invoices = await stripe.invoices.list({ customer: customer.id, limit: 100 })
      for (const inv of invoices.data) {
        all.push({
          id:                 inv.id,
          number:             inv.number ?? null,
          date:               inv.created,
          amount_usd:         (inv.amount_paid || inv.amount_due || inv.total || 0) / 100,
          currency:           (inv.currency || 'usd').toUpperCase(),
          status:             inv.status ?? null,
          hosted_invoice_url: inv.hosted_invoice_url ?? null,
          invoice_pdf:        inv.invoice_pdf ?? null,
        })
      }
    }
    // Newest first.
    all.sort((a, b) => b.date - a.date)
    return all
  } catch (err) {
    console.error('[Stripe] listInvoicesByEmail error:', err)
    return []
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
