// Mount in index.ts: app.use('/stripe', stripeRouter)
// Also add: app.use('/webhooks/stripe', express.raw({ type: 'application/json' })) BEFORE app.use(express.json())

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import {
  isStripeConfigured,
  listInvoicesByEmail,
  createCheckoutSession,
  createSubscriptionCheckoutSession,
  constructWebhookEvent,
  getStripePriceId,
  getStripeSubscriptionPriceId,
  STRIPE_SUBSCRIPTIONS,
  STRIPE_BUNDLES,
  type SubscriptionProduct,
} from '../lib/stripe'
import { sendFounderAlert } from '../lib/alerts'

// ── Auto-commission: if this client was referred by a partner, create a commission record ──
async function maybeCreatePartnerCommission(clientId: string, amountUsd: number) {
  try {
    // Find if this client has a partner referral
    const { data: referral } = await db
      .from('partner_referrals')
      .select('id, partner_id, partners(commission_rate, tier)')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .single()

    if (!referral) return // Not a referred client

    const partner = Array.isArray(referral.partners) ? referral.partners[0] : referral.partners
    if (!partner) return

    const commissionRate = Number(partner.commission_rate) || 0.20
    const commissionUsd = amountUsd * commissionRate
    const commissionZar = commissionUsd * 19 // ~R19 per $1

    const periodMonth = new Date().toISOString().slice(0, 7) // "2026-06"

    // Check if commission already recorded for this period (idempotency)
    const { data: existing } = await db
      .from('partner_commissions')
      .select('id')
      .eq('partner_id', referral.partner_id)
      .eq('client_id', clientId)
      .eq('period_month', periodMonth)
      .single()

    if (existing) return // Already recorded

    await db.from('partner_commissions').insert({
      partner_id: referral.partner_id,
      partner_referral_id: referral.id,
      client_id: clientId,
      amount_zar: commissionZar,
      amount_usd: commissionUsd,
      period_month: periodMonth,
      status: 'pending',
    })

    // Update first_payment_at if not set
    await db.from('partner_referrals')
      .update({ first_payment_at: new Date().toISOString() })
      .eq('id', referral.id)
      .is('first_payment_at', null)

  } catch (err) {
    console.error('[partner-commission]', err) // non-blocking — never throws
  }
}

export const stripeRouter = Router()

// ── GET /stripe/status ────────────────────────────────────────────────────────
stripeRouter.get('/status', requireAuth, (_req: Request, res: Response) => {
  res.json({ configured: isStripeConfigured() })
})

// ── GET /stripe/invoices — client's Stripe-issued invoices (#136a) ───────────
// Read-only. Stripe ISSUES the receipt; we only pull & display it (USD, no VAT
// until a benchmark — we surface whatever Stripe returns). Resolves the Stripe
// customer from the caller's auth email (we don't store stripe_customer_id), and
// returns an empty list gracefully when Stripe isn't configured or the client has
// no Stripe customer / no invoices yet.
stripeRouter.get('/invoices', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || ''
    const { data: { user } } = await db.auth.getUser(token)
    const email = user?.email || null

    const invoices = await listInvoicesByEmail(email)
    res.json({ success: true, data: { invoices, configured: isStripeConfigured() } })
  } catch (err) {
    console.error('[Stripe] /invoices error:', err)
    res.status(500).json({ success: false, error: 'Failed to load invoices' })
  }
})

// ── POST /stripe/checkout — one-time credit purchase ─────────────────────────
stripeRouter.post('/checkout', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!isStripeConfigured()) {
    res.status(200).json({ error: 'Stripe not configured', configured: false })
    return
  }

  try {
    const { priceId, credits, creditType } = z.object({
      priceId:    z.string().min(1),
      credits:    z.number().int().positive(),
      creditType: z.enum(['lead_gen', 'figsy']),
    }).parse(req.body)

    // #313 — fail CLOSED. The old guard `if (expectedPriceId && …)` skipped validation
    // entirely whenever getStripePriceId returned null — i.e. for any `credits` value
    // that isn't a configured bundle, OR when the bundle's price env var is unset. A
    // client could then POST a real cheap priceId with `credits: 999999`; the webhook
    // trusts the metadata `credits` and grants them all. Now an unresolvable/mismatched
    // bundle is a hard 400 — never a silent pass. `credits` must map to a real bundle.
    const expectedPriceId = getStripePriceId(creditType, credits)
    if (!expectedPriceId || expectedPriceId !== priceId) {
      res.status(400).json({ success: false, error: 'Price ID does not match credit type and quantity' })
      return
    }

    const { data: client } = await db.from('clients')
      .select('id').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const token = req.headers.authorization?.replace('Bearer ', '') || ''
    const { data: { user } } = await db.auth.getUser(token)
    const clientEmail = user?.email || ''

    const portalUrl = process.env.PORTAL_URL || 'https://app.get-kind.com'
    const { url, error } = await createCheckoutSession({
      clientId:   client.id,
      priceId,
      credits,
      creditType,
      clientEmail,
      successUrl: `${portalUrl}/dashboard/billing?stripe=success`,
      cancelUrl:  `${portalUrl}/dashboard/billing?stripe=cancelled`,
    })

    if (!url) { res.status(500).json({ success: false, error: error || 'Failed to create Stripe Checkout session' }); return }
    res.json({ success: true, url })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[Stripe] /checkout error:', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// ── POST /stripe/subscribe — recurring subscription (Milla / Vida) ────────────
stripeRouter.post('/subscribe', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!isStripeConfigured()) {
    res.status(200).json({ error: 'Stripe not configured', configured: false })
    return
  }

  try {
    const { product } = z.object({
      product: z.enum(['milla', 'vida', 'denise']),
    }).parse(req.body)

    const priceId = getStripeSubscriptionPriceId(product)
    if (!priceId) {
      res.status(400).json({ success: false, error: `Stripe price not configured for ${product}. Add ${STRIPE_SUBSCRIPTIONS[product].priceEnvVar} to Railway.` })
      return
    }

    const { data: client } = await db.from('clients')
      .select('id').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Check if already subscribed
    const dbProduct = STRIPE_SUBSCRIPTIONS[product].product
    const { data: existing } = await db.from('subscriptions')
      .select('id, status')
      .eq('client_id', client.id)
      .eq('product', dbProduct)
      .in('status', ['active', 'trialing'])
      .maybeSingle()

    if (existing) {
      res.status(400).json({ success: false, error: `Already subscribed to ${product}` })
      return
    }

    const token = req.headers.authorization?.replace('Bearer ', '') || ''
    const { data: { user } } = await db.auth.getUser(token)
    const clientEmail = user?.email || ''

    const portalUrl = process.env.PORTAL_URL || 'https://app.get-kind.com'
    const successPage = product === 'milla' ? 'assistant' : product === 'denise' ? 'denise' : 'chatbot'

    const { url, error } = await createSubscriptionCheckoutSession({
      clientId:   client.id,
      product,
      priceId,
      clientEmail,
      successUrl: `${portalUrl}/dashboard/${successPage}?subscribed=1`,
      cancelUrl:  `${portalUrl}/dashboard/${successPage}`,
    })

    if (!url) { res.status(500).json({ success: false, error: error || 'Failed to create subscription checkout' }); return }
    res.json({ success: true, url })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[Stripe] /subscribe error:', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// ── POST /stripe/webhook — raw body, public endpoint ─────────────────────────
stripeRouter.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature']
  if (!sig || typeof sig !== 'string') {
    res.status(400).json({ error: 'Missing stripe-signature header' }); return
  }

  const event = constructWebhookEvent(req.body as Buffer, sig)
  if (!event) {
    res.status(400).json({ error: 'Webhook signature verification failed' }); return
  }

  try {
    // ── One-time payment completed ──────────────────────────────────────────
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as {
        id: string
        metadata?: { clientId?: string; credits?: string; creditType?: string; product?: string; type?: string }
        subscription?: string
      }
      const meta = session.metadata || {}

      if (meta.type === 'subscription' && meta.clientId && meta.product) {
        // Subscription checkout completed — subscription activation handled
        // by customer.subscription.created event below. Nothing to do here.
        console.log(`[Stripe] Subscription checkout complete for ${meta.product} client ${meta.clientId}`)
      } else if (meta.clientId && meta.credits && meta.creditType) {
        // Credit purchase
        const credits    = parseInt(meta.credits, 10)
        const clientId   = meta.clientId
        const creditType = meta.creditType

        if (isNaN(credits) || credits <= 0) { res.sendStatus(200); return }

        // #265 idempotency + atomicity (mirrors the Paystack path in credits.ts):
        // insert the ledger row FIRST — the unique index on credit_transactions.
        // reference (migration 20260526) is the true idempotency guard, so a
        // retried/concurrent webhook hits a unique-violation (23505) and stops
        // instead of double-granting. Then increment via the atomic RPC (no
        // read-modify-write race). Previously this SELECT-checked then ran a
        // Promise.all balance-update + ledger-insert — non-atomic + TOCTOU.
        const isFigsy = creditType === 'figsy'
        const { error: ledgerErr } = await db.from('credit_transactions').insert({
          client_id: clientId,
          type:      'purchase',
          amount:    credits,
          plan:      isFigsy ? 'figsy' : 'kind_ai',
          reference: session.id,
          note:      `Purchased ${credits} ${isFigsy ? 'FIGSY' : 'lead gen'} credits via Stripe`,
        })
        if (ledgerErr) {
          if (ledgerErr.code === '23505') { // unique_violation — already credited (retry/race)
            console.log(`[Stripe] Duplicate webhook for session ${session.id} — already credited, skipping`)
            res.sendStatus(200); return
          }
          throw ledgerErr
        }

        const { error: rpcErr } = await db.rpc(
          isFigsy ? 'increment_figsy_credits' : 'increment_client_credits',
          { p_client_id: clientId, p_amount: credits },
        )
        if (rpcErr) throw rpcErr

        // Auto-commission: look up USD price from bundle config
        const bundleList = STRIPE_BUNDLES[creditType as 'lead_gen' | 'figsy'] as readonly { credits: number; price: number }[]
        const bundle = bundleList.find(b => b.credits === credits)
        const amountUsd = bundle?.price ?? 0
        if (amountUsd > 0) void maybeCreatePartnerCommission(clientId, amountUsd)
      }
    }

    // ── Subscription created / activated ───────────────────────────────────
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const sub = event.data.object as {
        id: string
        status: string
        current_period_end: number
        metadata?: { clientId?: string; product?: string }
      }

      const clientId = sub.metadata?.clientId
      const product  = sub.metadata?.product as SubscriptionProduct | undefined

      if (!clientId || !product || !STRIPE_SUBSCRIPTIONS[product]) {
        console.log('[Stripe] subscription event missing metadata — skipping')
        res.sendStatus(200); return
      }

      const dbProduct          = STRIPE_SUBSCRIPTIONS[product].product
      const currentPeriodEnd   = new Date(sub.current_period_end * 1000).toISOString()
      const status             = sub.status === 'active' || sub.status === 'trialing' ? sub.status : 'active'

      // Upsert subscription record
      const { data: existing } = await db.from('subscriptions')
        .select('id').eq('client_id', clientId).eq('product', dbProduct).maybeSingle()

      if (existing) {
        await db.from('subscriptions').update({
          status,
          current_period_end:       currentPeriodEnd,
          stripe_subscription_id:   sub.id,
        }).eq('id', existing.id)
      } else {
        await db.from('subscriptions').insert({
          client_id:                clientId,
          product:                  dbProduct,
          status,
          current_period_end:       currentPeriodEnd,
          stripe_subscription_id:   sub.id,
        })
      }

      console.log(`[Stripe] Subscription ${status} for ${product} (${dbProduct}) — client ${clientId}`)
    }

    // ── Subscription cancelled / deleted ───────────────────────────────────
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as {
        id: string
        metadata?: { clientId?: string; product?: string }
      }

      const clientId = sub.metadata?.clientId
      const product  = sub.metadata?.product as SubscriptionProduct | undefined

      if (clientId && product && STRIPE_SUBSCRIPTIONS[product]) {
        const dbProduct = STRIPE_SUBSCRIPTIONS[product].product
        await db.from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('client_id', clientId)
          .eq('product', dbProduct)
          .eq('stripe_subscription_id', sub.id)
        console.log(`[Stripe] Subscription cancelled for ${product} — client ${clientId}`)
      }
    }

    // ── Subscription invoice paid (recurring renewal) ──────────────────────
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as {
        subscription?: string
        billing_reason?: string
        customer_email?: string
        lines?: { data?: { metadata?: { clientId?: string; product?: string } }[] }
      }
      // Only act on subscription cycle renewals (not the initial checkout payment)
      if (invoice.billing_reason === 'subscription_cycle' && invoice.subscription) {
        // Re-activate subscription record in case it had lapsed
        await db.from('subscriptions')
          .update({ status: 'active' })
          .eq('stripe_subscription_id', invoice.subscription)
          .in('status', ['past_due', 'cancelled'])
        console.log(`[Stripe] Subscription renewed — ${invoice.subscription} — ${invoice.customer_email}`)

        // Auto-commission: find client via subscriptions table and fire commission
        const { data: sub } = await db.from('subscriptions')
          .select('client_id, product')
          .eq('stripe_subscription_id', invoice.subscription)
          .single()
        if (sub?.client_id) {
          // Look up USD price from STRIPE_SUBSCRIPTIONS by product name
          const subConfig = Object.values(STRIPE_SUBSCRIPTIONS).find(s => s.product === sub.product)
          const amountUsd = subConfig?.priceUsd ?? 0
          if (amountUsd > 0) void maybeCreatePartnerCommission(sub.client_id, amountUsd)
        }
      }
    }

    // ── Payment failed on subscription ─────────────────────────────────────
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as {
        subscription?: string
        customer_email?: string
        metadata?: { clientId?: string }
      }
      // Mark subscription past_due so the portal can surface a payment warning
      let failedClientName = invoice.customer_email || 'a client'
      if (invoice.subscription) {
        await db.from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', invoice.subscription)
        // Look up the client name for a useful alert.
        const { data: sub } = await db.from('subscriptions')
          .select('client_id, product, clients(company_name)')
          .eq('stripe_subscription_id', invoice.subscription).maybeSingle()
        const cname = (sub as { clients?: { company_name?: string } } | null)?.clients?.company_name
        if (cname) failedClientName = cname
      }
      console.warn(`[Stripe] Invoice payment failed — subscription ${invoice.subscription} — ${invoice.customer_email}`)
      // #286 dunning — a failed payment must not silently sit. Alert the founder.
      void sendFounderAlert('payment_failed', `Payment failed — ${failedClientName}`, [
        `A subscription payment just failed for ${failedClientName} (${invoice.customer_email || 'no email'}).`,
        `The subscription is now marked past_due. Stripe will retry per its dunning schedule.`,
        `Action: check Finance → Billing, and send a card-update nudge (or offer a short pause).`,
      ])
    }

  } catch (err) {
    console.error('[Stripe] Webhook handler error:', err)
  }

  res.sendStatus(200)
})
