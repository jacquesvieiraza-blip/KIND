import Stripe from 'stripe'
import { stripeSdkHostOptions } from './provider-hosts'
import { PRICING, PACK_LEADS } from '@kind/shared'

// ⛓️ 18 Sep (Batch 1b) — `stripeSdkHostOptions()` SPREADS TO `{}` WHEN UNSET, so this client is
// byte-identical to today's in production. The SDK takes host/port/protocol rather than a URL,
// which is why it needs a helper instead of a base string.
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' as any, ...stripeSdkHostOptions() })
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


// ── #613 — READ WHAT STRIPE ACTUALLY SETTLED ─────────────────────────────────────────────
//
// The ledger records the price we quoted. This reads the other number: gross, Stripe's fee,
// and the net that reaches the bank — in the SETTLEMENT currency, which for a UK account
// selling in USD is GBP, so the two figures are not even in the same money.
//
// ⚠️ RETURNS NULL RATHER THAN THROWING, ALWAYS. Every caller runs AFTER the client's money has
// been credited. A Stripe outage, a rate limit or an expand that comes back shallow must cost
// us an annotation, never a payment.
export async function readSettlement(sessionId: string): Promise<import('./stripe-settlement').BalanceTxLike | null> {
  if (!stripe) return null
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent.latest_charge.balance_transaction'],
    })
    const pi = (session as any)?.payment_intent
    const charge = pi && typeof pi === 'object' ? pi.latest_charge : null
    const bt = charge && typeof charge === 'object' ? charge.balance_transaction : null
    if (!bt || typeof bt !== 'object') return null
    return bt as import('./stripe-settlement').BalanceTxLike
  } catch (err) {
    // LOUD, because a persistent failure here means the reconcile panel is blind and nobody
    // would otherwise find out — but never rethrown.
    console.error('[stripe/settlement] could not read settlement for', sessionId, err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Stamp the settlement facts onto a ledger row that has ALREADY been written.
 *
 * Best-effort by construction: reads the row, appends, writes back. Idempotent — a webhook
 * retry finds "[settled:" already present and leaves it alone.
 */
export async function annotateSettlement(reference: string): Promise<boolean> {
  try {
    const { settlementNote, appendSettlement } = await import('./stripe-settlement')
    const bt = await readSettlement(reference)
    const note = settlementNote(bt)
    if (!note) return false

    const { db } = await import('@kind/db')
    const { data: row, error: readErr } = await db.from('credit_transactions')
      .select('id, note').eq('reference', reference).limit(1).maybeSingle()
    if (readErr || !row) return false

    const next = appendSettlement((row as { note: string | null }).note, note)
    if (next === (row as { note: string | null }).note) return false

    const { error: wErr } = await db.from('credit_transactions')
      .update({ note: next }).eq('id', (row as { id: string }).id)
    if (wErr) { console.error('[stripe/settlement] annotation write failed', reference, wErr.message); return false }
    return true
  } catch (err) {
    console.error('[stripe/settlement] annotation threw (payment unaffected)', reference, err instanceof Error ? err.message : err)
    return false
  }
}

/** Recent checkout sessions with their settlement, for the operator reconcile panel. ONE API call. */
export async function listRecentSettlements(limit: number): Promise<Array<{ sessionId: string; bt: import('./stripe-settlement').BalanceTxLike | null; created: number; currencyPaid: string | null; amountPaidMinor: number | null }> | null> {
  if (!stripe) return null
  try {
    const list = await stripe.checkout.sessions.list({
      limit: Math.max(1, Math.min(50, limit)),
      expand: ['data.payment_intent.latest_charge.balance_transaction'],
    })
    return (list.data ?? []).map((s: any) => {
      const pi = s?.payment_intent
      const charge = pi && typeof pi === 'object' ? pi.latest_charge : null
      const bt = charge && typeof charge === 'object' ? charge.balance_transaction : null
      return {
        sessionId: String(s.id),
        bt: (bt && typeof bt === 'object' ? bt : null) as import('./stripe-settlement').BalanceTxLike | null,
        created: Number(s.created ?? 0),
        currencyPaid: s.currency ? String(s.currency) : null,
        amountPaidMinor: s.amount_total != null ? Number(s.amount_total) : null,
      }
    })
  } catch (err) {
    console.error('[stripe/settlement] list failed', err instanceof Error ? err.message : err)
    return null
  }
}

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

// Pull a human-readable reason out of a Stripe error so the founder/customer can
// SEE why checkout failed (e.g. "No such price: price_xxx" = test/live mismatch,
// or "price is recurring" = bundle created with the wrong type) instead of a
// generic "Failed to create…". Stripe SDK errors carry .message and .code.
function stripeErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { message?: unknown; code?: unknown }
    const msg = typeof e.message === 'string' ? e.message : ''
    const code = typeof e.code === 'string' ? ` (${e.code})` : ''
    if (msg) return `Stripe: ${msg}${code}`
  }
  return 'Stripe rejected the request for an unknown reason'
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
}): Promise<{ url: string | null; error?: string }> {
  if (!stripe) return { url: null, error: 'Stripe not configured' }
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
    return { url: session.url }
  } catch (err) {
    console.error('[Stripe] createCheckoutSession error:', err)
    return { url: null, error: stripeErrorMessage(err) }
  }
}

// ── ONE WALLET top-up checkout (dynamic amount, no pre-made SKU) ──────────────
// The work model: a single dollar wallet. First purchase is $99; later top-ups are
// any amount. We use Stripe price_data so we never need per-amount price IDs.
/**
 * What the client reads on the Stripe page, one click before their card is charged.
 *
 * ⚠️ THIS STRING WAS `'K.I.N.D wallet top-up'` FOR EVERY PURCHASE INCLUDING THE FIRST, and it
 * was the last surviving copy of the #562 lie. The first purchase does NOT credit the wallet —
 * it buys the included approvals outright — and `website-money-claims.test.ts` FORCES the
 * website and the Terms to say *"not a wallet top-up"* in those words. So the site was guarded
 * into honesty while the checkout, the very next screen, called it the one thing it is not.
 *
 * ⚠️ AND IT CORRECTS #414's PREMISE. #414 is filed as *"no code change can reach the checkout —
 * it renders the Stripe dashboard product"*. That is true of `createSubscriptionCheckoutSession`
 * below, which passes a dashboard `priceId`. **It is not true here.** This function builds the
 * line item with inline `price_data`, so the name is ours and always was. Confirmed 4 Aug
 * against the live dashboard: the catalogue holds nine products and **not one of them is the
 * onboarding pack** — there is no dashboard product to edit, because this path never used one.
 */
export function checkoutLineName(isFirstPurchase: boolean, packLeads: number): string {
  return isFirstPurchase
    ? `K.I.N.D onboarding pack — ${packLeads} approved leads included`
    : 'K.I.N.D wallet top-up'
}

export async function createWalletCheckoutSession(params: {
  clientId:    string
  amountUsd:   number
  successUrl:  string
  cancelUrl:   string
  clientEmail: string
  /** First purchase buys the pack; later ones really are wallet top-ups. Changes the line name. */
  isFirstPurchase?: boolean
}): Promise<{ url: string | null; error?: string }> {
  if (!stripe) return { url: null, error: 'Stripe not configured' }
  try {
    const session = await stripe.checkout.sessions.create({
      mode:                 'payment',
      payment_method_types: ['card'],
      customer_email:       params.clientEmail,
      line_items: [{
        quantity: 1,
        price_data: {
          currency:     'usd',
          unit_amount:  Math.round(params.amountUsd * 100), // dollars → cents
          product_data: { name: checkoutLineName(params.isFirstPurchase === true, PACK_LEADS) },
        },
      }],
      success_url: params.successUrl,
      cancel_url:  params.cancelUrl,
      metadata: {
        clientId:  params.clientId,
        amountUsd: String(params.amountUsd),
        type:      'wallet_topup',
      },
    })
    return { url: session.url }
  } catch (err) {
    console.error('[Stripe] createWalletCheckoutSession error:', err)
    return { url: null, error: stripeErrorMessage(err) }
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
}): Promise<{ url: string | null; error?: string }> {
  if (!stripe) return { url: null, error: 'Stripe not configured' }
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
    return { url: session.url }
  } catch (err) {
    console.error('[Stripe] createSubscriptionCheckoutSession error:', err)
    return { url: null, error: stripeErrorMessage(err) }
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

// #317 — resolve a checkout session's metadata from a payment_intent. A refund /
// dispute webhook carries the charge + payment_intent, NOT the checkout session id
// that the original credit grant was keyed on — so we look the session up here to
// recover { clientId, credits, creditType } and claw those credits back.
export async function getSessionMetaByPaymentIntent(
  paymentIntentId: string | null | undefined,
): Promise<{ sessionId: string; metadata: Record<string, string> } | null> {
  if (!stripe || !paymentIntentId) return null
  try {
    const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 })
    const s = sessions.data[0]
    if (!s) return null
    return { sessionId: s.id, metadata: (s.metadata ?? {}) as Record<string, string> }
  } catch (err) {
    console.error('[Stripe] getSessionMetaByPaymentIntent', err)
    return null
  }
}

// ── Pause / resume the recurring charge (item 190 / M2) ──────────────────────
// Stripe `pause_collection` STOPS invoicing while keeping the subscription, so a
// paused client is genuinely not charged — not just flagged "paused" in our DB.
// Resume clears it. Both no-op safely if Stripe isn't configured or the sub has
// no Stripe id (e.g. a Paystack/legacy sub). Returns whether Stripe was touched.
export async function pauseStripeSubscription(subscriptionId: string | null | undefined): Promise<boolean> {
  if (!stripe || !subscriptionId) return false
  try {
    await stripe.subscriptions.update(subscriptionId, { pause_collection: { behavior: 'void' } })
    return true
  } catch (err) {
    console.error('[Stripe] pause_collection failed:', err)
    return false
  }
}

export async function resumeStripeSubscription(subscriptionId: string | null | undefined): Promise<boolean> {
  if (!stripe || !subscriptionId) return false
  try {
    await stripe.subscriptions.update(subscriptionId, { pause_collection: null })
    return true
  } catch (err) {
    console.error('[Stripe] resume (clear pause_collection) failed:', err)
    return false
  }
}
