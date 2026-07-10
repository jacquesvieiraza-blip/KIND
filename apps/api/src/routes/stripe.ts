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
  getSessionMetaByPaymentIntent,
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

// ── #336 — client referral bonus on the referred client's FIRST PURCHASE ──────
// A client who was referred by another CLIENT (clients.referred_by) earns their
// referrer 15 spendable FIGSY credits (≈$45) the first time they actually pay.
// This replaces the old "first ICP run" trigger in icps.ts, which was farmable
// (a first run is free) and paid into the retired credit_balance wallet.
//
// Idempotency: a single atomic conditional UPDATE claims clients.
// referral_bonus_paid_at only while it is still null. If the UPDATE returns a
// row we won the claim and pay exactly once; a retried/concurrent webhook or a
// later purchase finds the marker set and no-ops. Never throws — the caller
// runs it fire-and-forget so a payout failure can't break the payment webhook.
const REFERRAL_BONUS_FIGSY_CREDITS = 15
async function payReferrerOnFirstPurchase(referredClientId: string) {
  const { data: client } = await db.from('clients')
    .select('id, company_name, referred_by, referral_bonus_paid_at')
    .eq('id', referredClientId)
    .maybeSingle()

  if (!client?.referred_by || client.referral_bonus_paid_at) return // no referrer, or already paid

  // Atomic claim: only the first winner flips the marker from null.
  const now = new Date().toISOString()
  const { data: claimed } = await db.from('clients')
    .update({ referral_bonus_paid_at: now })
    .eq('id', referredClientId)
    .is('referral_bonus_paid_at', null)
    .select('id')
  if (!claimed || claimed.length === 0) return // lost the race — someone else is paying

  // Ledger row first (audit trail), then the atomic FIGSY credit grant.
  // P3 — the marker is already claimed at this point, so a claim-then-fail here
  // would leave the marker set + the ledger lying + no payout, with NO retry ever.
  // Guard BOTH steps: on any failure, undo whatever was written and reset the
  // marker to NULL so the referrer's NEXT purchase retries the payout cleanly.
  const ledgerRef = `referral_bonus_${referredClientId}`
  const { error: ledgerErr } = await db.from('credit_transactions').insert({
    client_id: client.referred_by,
    type:      'referral_bonus',
    amount:    REFERRAL_BONUS_FIGSY_CREDITS,
    plan:      'figsy',
    reference: ledgerRef,
    note:      `Referral bonus — ${client.company_name ?? 'a referred client'} made their first purchase`,
    created_at: now,
  })
  if (ledgerErr) {
    await db.from('clients').update({ referral_bonus_paid_at: null }).eq('id', referredClientId)
    void sendFounderAlert('payment_failed', 'Referral payout failed', [
      `Referrer: ${client.referred_by}`,
      `Referred client ${referredClientId} made their first purchase, but writing the referral-bonus ledger row failed: ${ledgerErr.message}`,
      'The payout marker was reset — a future purchase will retry. Grant the 15 FIGSY credits manually if needed.',
    ])
    return
  }
  const { error: rpcErr } = await db.rpc('increment_figsy_credits', {
    p_client_id: client.referred_by,
    p_amount:    REFERRAL_BONUS_FIGSY_CREDITS,
  })
  if (rpcErr) {
    await db.from('credit_transactions').delete().eq('reference', ledgerRef)
    await db.from('clients').update({ referral_bonus_paid_at: null }).eq('id', referredClientId)
    void sendFounderAlert('payment_failed', 'Referral payout failed', [
      `Referrer: ${client.referred_by}`,
      `Referred client ${referredClientId} made their first purchase, but the FIGSY credit grant RPC failed: ${rpcErr.message}`,
      'The ledger row was rolled back and the payout marker reset — a future purchase will retry. Grant the 15 FIGSY credits manually if needed.',
    ])
    return
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
          // P1/#333 — a NON-23505 ledger-insert failure means the client PAID but NO
          // ledger row exists and NO credits were granted. Falling through to the
          // handler-wide catch would sendStatus(200) → Stripe never retries → the
          // client paid and got nothing, forever. Alert + 500 so Stripe retries.
          // No ledger row was written, so there's nothing to delete — the retry
          // re-attempts cleanly (23505-skips only once a row genuinely exists).
          console.error('[Stripe] ledger insert failed after payment — returning 500 for retry', ledgerErr.message, 'session', session.id)
          void sendFounderAlert('payment_failed', 'Credit ledger insert failed after payment — Stripe will retry', [
            `Client: ${clientId}`,
            `Purchased: ${credits} ${isFigsy ? 'FIGSY' : 'lead gen'} credits (session ${session.id}).`,
            `The payment succeeded but writing the credit ledger row failed — no credits were granted. Reason: ${ledgerErr.message}`,
            'Action: confirm the client received their credits once Stripe retries; grant manually if the retries exhaust.',
          ])
          res.status(500).json({ error: 'ledger insert failed — retry' })
          return
        }

        const { error: rpcErr } = await db.rpc(
          isFigsy ? 'increment_figsy_credits' : 'increment_client_credits',
          { p_client_id: clientId, p_amount: credits },
        )
        if (rpcErr) {
          // #333 — the client PAID but the credit grant just failed. The ledger row
          // we inserted above (reference = session.id, unique index) would otherwise
          // block Stripe's retry via a 23505 — so the client would have paid and got
          // NOTHING, forever. Delete that ledger row so the replay can re-grant, alert
          // the founder, and return 500 so Stripe retries this webhook. DO NOT fall
          // through to the 200.
          console.error('[Stripe] credit grant RPC failed after payment — deleting ledger row for retry', rpcErr.message, 'session', session.id)
          await db.from('credit_transactions').delete().eq('reference', session.id)
          void sendFounderAlert('payment_failed', 'Credit grant failed after payment — Stripe will retry', [
            `Client: ${clientId}`,
            `Purchased: ${credits} ${isFigsy ? 'FIGSY' : 'lead gen'} credits (session ${session.id}).`,
            `The payment succeeded but the credit grant RPC failed — the ledger row was rolled back so Stripe's retry can re-grant. Reason: ${rpcErr.message}`,
            'Action: confirm the client received their credits once Stripe retries; grant manually if the retries exhaust.',
          ])
          res.status(500).json({ error: 'credit grant failed — retry' })
          return
        }

        // Auto-commission: look up USD price from bundle config
        const bundleList = STRIPE_BUNDLES[creditType as 'lead_gen' | 'figsy'] as readonly { credits: number; price: number }[]
        const bundle = bundleList.find(b => b.credits === credits)
        const amountUsd = bundle?.price ?? 0
        if (amountUsd > 0) void maybeCreatePartnerCommission(clientId, amountUsd)

        // #445 — sourcing-allowance accrual. THIS is the ONLY place a paid client's
        // PDL budget grows: coverage k=2 → +2 records of sourcing allowance per $1
        // collected. Accrue ONLY on real money in (here), never at reveal/work spend —
        // those dollars were already counted when the pack was bought (double-count).
        // Guarded write (#349): a failure must not break the paid webhook, but is logged
        // + alerted so a client can't silently end up unable to source what they funded.
        if (amountUsd > 0) {
          const { error: allowErr } = await db.rpc('add_sourcing_allowance', {
            p_client_id: clientId, p_records: Math.round(amountUsd * 2), p_trial: false,
          })
          if (allowErr) {
            console.error('[Stripe] sourcing-allowance accrual failed for', clientId, allowErr)
            void sendFounderAlert('charge_failed', 'Sourcing allowance NOT accrued after payment', [
              `Client: ${clientId} paid $${amountUsd} (${credits} ${isFigsy ? 'FIGSY' : 'lead gen'} credits).`,
              `Their sourcing allowance (+${Math.round(amountUsd * 2)} records) failed to accrue: ${allowErr.message}`,
              'Credits WERE granted; only the sourcing budget bump failed. Add it manually (admin → Money Path) if needed.',
            ])
          }
        }

        // #336 — pay the referrer on this client's FIRST purchase (see helper).
        // Fire-and-forget: a payout failure must never break the paid webhook.
        void payReferrerOnFirstPurchase(clientId).catch(err =>
          console.error('[Stripe] referral bonus payout failed (non-fatal):', err))
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
      // SPRINT line 5 / #238 — the subscription row MUST carry its monthly USD price,
      // else the revenue report (MRR = sum(amount_usd) of active subs) counts every
      // paid subscriber as $0. Sourced from the locked STRIPE_SUBSCRIPTIONS table.
      const amountUsd          = STRIPE_SUBSCRIPTIONS[product].priceUsd

      // Upsert subscription record
      const { data: existing } = await db.from('subscriptions')
        .select('id').eq('client_id', clientId).eq('product', dbProduct).maybeSingle()

      if (existing) {
        await db.from('subscriptions').update({
          status,
          amount_usd:               amountUsd,
          current_period_end:       currentPeriodEnd,
          stripe_subscription_id:   sub.id,
        }).eq('id', existing.id)
      } else {
        await db.from('subscriptions').insert({
          client_id:                clientId,
          product:                  dbProduct,
          status,
          amount_usd:               amountUsd,
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

    // ── #317 — refund / chargeback: CLAW BACK the granted credits ────────────
    // Policy: on a refund or a dispute, revoke the credits from that purchase (the
    // client got their money back — they shouldn't keep the product). The claw-back
    // is idempotent on `refund_<charge/dispute id>` (unique index on reference), uses
    // the correct wallet, and the atomic RPC clamps at 0 (if they already spent the
    // credits the balance floors at 0 rather than going negative).
    if (event.type === 'charge.refunded' || event.type === 'charge.dispute.created') {
      const obj = event.data.object as { id: string; payment_intent?: string | null }
      const linked = await getSessionMetaByPaymentIntent(obj.payment_intent)
      const meta = linked?.metadata ?? {}
      const credits = parseInt(meta.credits ?? '', 10)
      if (meta.clientId && meta.creditType && Number.isFinite(credits) && credits > 0) {
        const isFigsy = meta.creditType === 'figsy'
        const isDispute = event.type === 'charge.dispute.created'
        const { error: ledgerErr } = await db.from('credit_transactions').insert({
          client_id: meta.clientId,
          type:      'refund',
          amount:    -credits,
          plan:      isFigsy ? 'figsy' : 'kind_ai',
          reference: `refund_${obj.id}`,
          note:      `${isDispute ? 'Chargeback' : 'Refund'}: revoked ${credits} ${isFigsy ? 'FIGSY' : 'lead gen'} credits (${linked?.sessionId ?? 'unknown session'})`,
        })
        if (ledgerErr) {
          if (ledgerErr.code === '23505') { res.sendStatus(200); return } // already clawed back
          throw ledgerErr
        }
        const { error: clawbackErr } = await db.rpc(isFigsy ? 'increment_figsy_credits' : 'increment_client_credits', { p_client_id: meta.clientId, p_amount: -credits })
        if (clawbackErr) {
          // #333 — the ledger row is written but the balance claw-back RPC failed:
          // the client keeps credits they were refunded for. Keep the 200 (correct
          // for Stripe — re-running the webhook is idempotent on the ledger row and
          // would NOT re-attempt the RPC), but never let a failed claw-back be silent.
          console.error('[Stripe] refund claw-back RPC failed — balance not revoked', clawbackErr.message, 'client', meta.clientId)
          void sendFounderAlert('payment_failed', `${isDispute ? 'Chargeback' : 'Refund'} claw-back failed — revoke credits manually`, [
            `Client: ${meta.clientId}`,
            `A ${isDispute ? 'chargeback' : 'refund'} of ${credits} ${isFigsy ? 'FIGSY' : 'lead gen'} credits was recorded, but the balance claw-back RPC failed — the client still holds those credits.`,
            `Reason: ${clawbackErr.message}`,
            'Action: revoke the credits manually in the admin.',
          ])
        }
        // P5 — a refund/chargeback also claws back the REFERRER's 15-credit bonus:
        // the referrer was paid BECAUSE this client purchased, and that purchase was
        // reversed. Fire-and-forget; idempotent on `referral_claw_<clientId>` so a
        // second refund event (dispute after refund) 23505-skips → claws at most once
        // per referred client. The RPC clamps at 0 (fine if already spent).
        const refundedClientId = meta.clientId
        void (async () => {
          const { data: refundedClient } = await db.from('clients')
            .select('referred_by, referral_bonus_paid_at').eq('id', refundedClientId).maybeSingle()
          if (!refundedClient?.referred_by || !refundedClient.referral_bonus_paid_at) return
          const { error: clawLedgerErr } = await db.from('credit_transactions').insert({
            client_id: refundedClient.referred_by,
            type:      'refund',
            amount:    -REFERRAL_BONUS_FIGSY_CREDITS,
            plan:      'figsy',
            reference: `referral_claw_${refundedClientId}`,
            note:      `Referral bonus clawed back — referred client ${refundedClientId} was ${isDispute ? 'charged back' : 'refunded'}`,
          })
          if (clawLedgerErr) return // 23505 = already clawed once (idempotent); any other error handled below
          const { error: clawErr } = await db.rpc('increment_figsy_credits', { p_client_id: refundedClient.referred_by, p_amount: -REFERRAL_BONUS_FIGSY_CREDITS })
          if (clawErr) {
            void sendFounderAlert('payment_failed', 'Referral claw-back failed — revoke 15 credits manually', [
              `Referrer: ${refundedClient.referred_by}`,
              `Referred client ${refundedClientId} was ${isDispute ? 'charged back' : 'refunded'}; the referral-bonus claw-back RPC failed: ${clawErr.message}`,
              'Action: revoke 15 FIGSY credits from the referrer manually.',
            ])
          }
        })().catch(err => console.error('[Stripe] referral claw-back failed (non-fatal):', err))

        void sendFounderAlert('churn_risk', `${isDispute ? 'Chargeback' : 'Refund'} — ${credits} credits clawed back`, [
          `A ${isDispute ? 'chargeback (dispute)' : 'refund'} was processed on Stripe; ${credits} ${isFigsy ? 'FIGSY' : 'lead gen'} credits were revoked from client ${meta.clientId}.`,
          isDispute ? 'Review the dispute in Stripe — you may need to submit evidence.' : 'No action needed unless this was unexpected.',
        ])
      } else {
        console.warn(`[Stripe] ${event.type} — could not resolve a credit grant to claw back (payment_intent ${obj.payment_intent ?? 'none'})`)
      }
    }

  } catch (err) {
    // #379 (AR-54) — do NOT swallow into a 200. A throw here (e.g. mid refund/dispute
    // claw-back) previously still returned 200, so Stripe considered the webhook handled
    // and never retried → credits were never clawed back and the client kept them. Return
    // 500 so Stripe retries; the webhook's idempotency guard makes the replay safe.
    console.error('[Stripe] Webhook handler error:', err)
    res.status(500).json({ error: 'Webhook handler failed — Stripe should retry' })
    return
  }

  res.sendStatus(200)
})
