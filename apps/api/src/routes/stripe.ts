// Mount in index.ts: app.use('/stripe', stripeRouter)
// Also add: app.use('/webhooks/stripe', express.raw({ type: 'application/json' })) BEFORE app.use(express.json())

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import {
  isStripeConfigured,
  listInvoicesByEmail,
  createWalletCheckoutSession,
  createSubscriptionCheckoutSession,
  constructWebhookEvent,
  getSessionMetaByPaymentIntent,
  getStripeSubscriptionPriceId,
  annotateSettlement,
  STRIPE_SUBSCRIPTIONS,
  STRIPE_BUNDLES,
  type SubscriptionProduct,
} from '../lib/stripe'
import { sendFounderAlert } from '../lib/alerts'
import { PURCHASE_TX_TYPES, PACK_PRICE_USD, PACK_LEADS } from '../lib/onboarding-pack'
import { mapStripeStatus, isEnumRejection } from '../lib/subscription-status'
// #351 — the commission maths lives in ONE place. Statically imported: it is a pure module
// with no dependencies of its own, and a dynamic import inside the money path adds a tick.
import { RATES, roundUsd } from '../lib/comp-engine'

// ── Auto-commission (#351 + R40) ────────────────────────────────────────────────────
//
// ⚠️ WHAT WAS BROKEN, AND WHY IT MATTERED MORE THAN IT LOOKED:
// This function applied the partner's rate to EVERY payment, so a partner earned 20% of
// everything forever instead of 20% once and their retention rate thereafter — the deal in
// both comp plans and in `comp-engine.ts`, which sat built, tested and never called. On a
// client spending $400/month that is ~$60/month over-paid, silently, per client, forever.
//
// Three further faults went with it, all fixed here:
//   • the idempotency key had no TYPE, so month one could only ever hold ONE row — the
//     landing fee and that month's retention could not both exist;
//   • the check was app-level only, so two concurrent webhooks both passed it (the DB
//     unique index added in 20260815_client_partner_seat.sql is the real guard now);
//   • `commissionZar = commissionUsd * 19` hard-coded an exchange rate into stored money.
//     USD is the currency of record; the rand figure is a DISPLAY concern and is no longer
//     written as though it were a fact (method rule 7).
async function maybeCreatePartnerCommission(clientId: string, amountUsd: number, stripeRef: string) {
  try {
    const { data: referral } = await db
      .from('partner_referrals')
      .select('id, partner_id, first_payment_at, partners(commission_rate, retain_rate, seat_type)')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .single()

    if (!referral) return // Not a referred client

    const partner = Array.isArray(referral.partners) ? referral.partners[0] : referral.partners
    if (!partner) return

    const periodMonth = new Date().toISOString().slice(0, 7) // "2026-06"

    // LAND or RETAIN? The landing fee is earned once, on the client's FIRST payment. Every
    // payment after that earns the seat's retention rate. `first_payment_at` is stamped by
    // the referral flow; a referral with no stamp yet is this client's first money.
    const { data: priorLand } = await db
      .from('partner_commissions')
      .select('id')
      .eq('partner_id', referral.partner_id)
      .eq('client_id', clientId)
      .eq('commission_type', 'land')
      .maybeSingle()
    const commissionType: 'land' | 'retain' = priorLand ? 'retain' : 'land'

    // R40 — the retain rate lives on the SEAT. Never hard-code a person's pay here.
    const seatRetainRate = Number(partner.retain_rate) > 0
      ? Number(partner.retain_rate)
      : RATES.PARTNER_RETENTION
    const landRate = Number(partner.commission_rate) || RATES.PARTNER_ACQUISITION
    const rate = commissionType === 'land' ? landRate : seatRetainRate
    const commissionUsd = roundUsd(amountUsd * rate)

    // ⛓️ Fable verification (16 Aug): the identity of a commission is THE PAYMENT that
    // earned it, not the month — a client tops the wallet up mid-month and every payment
    // after the first must STILL pay her retain. One row per Stripe reference; a replayed
    // webhook is stopped by the partial unique on (partner_id, stripe_ref), and this check
    // is only the fast path in front of it.
    const { data: existing } = await db
      .from('partner_commissions')
      .select('id')
      .eq('partner_id', referral.partner_id)
      .eq('stripe_ref', stripeRef)
      .maybeSingle()

    if (existing) return // This exact payment already earned its commission

    // #349 — a swallowed failure here is a partner who is never paid. Nothing else
    // recreates this row, so the failure is alerted rather than logged and lost.
    const { error: commErr } = await db.from('partner_commissions').insert({
      partner_id: referral.partner_id,
      partner_referral_id: referral.id,
      client_id: clientId,
      amount_usd: commissionUsd,
      commission_type: commissionType,
      period_month: periodMonth,
      stripe_ref: stripeRef,
      status: 'pending',
    })
    if (commErr) {
      // A unique violation here is the guard doing its job against a replayed webhook —
      // expected, not news. Anything else is a partner silently going unpaid.
      const isDuplicate = /duplicate key|unique constraint/i.test(commErr.message)
      if (isDuplicate) return
      console.error('[partner-commission] commission row FAILED — partner will not be paid:', commErr.message)
      void sendFounderAlert('charge_failed', 'Partner commission was NOT recorded', [
        `Client ${clientId} paid $${amountUsd} and partner ${referral.partner_id} earned $${commissionUsd.toFixed(2)} (${commissionType}) for ${periodMonth}.`,
        `The commission row failed to write: ${commErr.message}`,
        'Nothing retries this — the next invoice sees no row for this period and will not backfill it.',
        'Fix: add the commission by hand in Vida → Partners before the payout run.',
      ])
    }
  } catch (err) {
    // Never let a commission failure break a payment webhook — Stripe would retry a
    // payment that already succeeded.
    console.error('[partner-commission]', err)
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
// ONE WALLET (W2) — the referral bonus is paid in wallet dollars, not the retired
// FIGSY credit column. ~$45 (was 15 FIGSY credits × $3).
const REFERRAL_BONUS_USD = 45
async function payReferrerOnFirstPurchase(referredClientId: string) {
  const { data: client } = await db.from('clients')
    .select('id, company_name, referred_by, referral_bonus_paid_at')
    .eq('id', referredClientId)
    .maybeSingle()

  if (!client?.referred_by || client.referral_bonus_paid_at) return // no referrer, or already paid

  // Atomic claim: only the first winner flips the marker from null.
  const now = new Date().toISOString()
  // #349 — THE CLAIM USED TO SWALLOW ITS ERROR, and that is the one failure this whole
  // function is built to prevent. supabase-js RETURNS the error, so an errored UPDATE left
  // `claimed` undefined — indistinguishable from losing the race — and the function returned
  // silently. Everything below alerts loudly on failure; the step that decides whether any of
  // it runs did not. A referrer would simply never be paid, with nothing to notice.
  const { data: claimed, error: claimErr } = await db.from('clients')
    .update({ referral_bonus_paid_at: now })
    .eq('id', referredClientId)
    .is('referral_bonus_paid_at', null)
    .select('id')
  if (claimErr) {
    void sendFounderAlert('payment_failed', 'Referral payout NOT attempted', [
      `Referrer: ${client.referred_by}`,
      `Referred client ${referredClientId} made their first purchase, but claiming the payout marker failed: ${claimErr.message}`,
      `Nothing was written and nobody was paid. The marker is still null, so a future purchase retries — but if this client never buys again, pay the referrer $${REFERRAL_BONUS_USD} by hand.`,
    ])
    return
  }
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
    amount:    REFERRAL_BONUS_USD,
    plan:      'work_model',
    reference: ledgerRef,
    note:      `Referral bonus — ${client.company_name ?? 'a referred client'} made their first purchase`,
    created_at: now,
  })
  if (ledgerErr) {
    // #349 — the reset's own error was swallowed, so the alert below promised "the marker was
    // reset" whether or not it had been. A failed reset leaves the marker SET, which means the
    // payout can never retry — and the operator has been told the opposite. Report what
    // actually happened.
    const { error: resetErr } = await db.from('clients')
      .update({ referral_bonus_paid_at: null }).eq('id', referredClientId)
    void sendFounderAlert('payment_failed', 'Referral payout failed', [
      `Referrer: ${client.referred_by}`,
      `Referred client ${referredClientId} made their first purchase, but writing the referral-bonus ledger row failed: ${ledgerErr.message}`,
      resetErr
        ? `⚠️ AND THE MARKER RESET ALSO FAILED (${resetErr.message}) — it is still set, so NO future purchase will retry this. Clear clients.referral_bonus_paid_at for ${referredClientId} by hand, then pay the referrer $${REFERRAL_BONUS_USD}.`
        : `The payout marker was reset — a future purchase will retry. Add $${REFERRAL_BONUS_USD} to the referrer's wallet manually if needed.`,
    ])
    return
  }
  const { error: rpcErr } = await db.rpc('increment_wallet', {
    p_client_id: client.referred_by,
    p_amount:    REFERRAL_BONUS_USD,
  })
  if (rpcErr) {
    // #349 — both rollbacks swallowed their errors. A failed ledger delete leaves a row
    // claiming a $45 payout that never happened (the ledger lies about money); a failed marker
    // reset stops any retry. Either way the alert must say so rather than assert a clean undo.
    const { error: delErr } = await db.from('credit_transactions').delete().eq('reference', ledgerRef)
    const { error: resetErr } = await db.from('clients')
      .update({ referral_bonus_paid_at: null }).eq('id', referredClientId)
    void sendFounderAlert('payment_failed', 'Referral payout failed', [
      `Referrer: ${client.referred_by}`,
      `Referred client ${referredClientId} made their first purchase, but the wallet grant RPC failed: ${rpcErr.message}`,
      delErr || resetErr
        ? `⚠️ THE ROLLBACK DID NOT FULLY SUCCEED.${delErr ? ` The ledger row ${ledgerRef} could NOT be deleted (${delErr.message}) — it now claims a $${REFERRAL_BONUS_USD} payout that never happened.` : ''}${resetErr ? ` The payout marker could NOT be reset (${resetErr.message}) — no future purchase will retry.` : ''} Fix by hand before trusting the ledger.`
        : `The ledger row was rolled back and the payout marker reset — a future purchase will retry. Add $${REFERRAL_BONUS_USD} to the referrer's wallet manually if needed.`,
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
    // ONE WALLET — a single dollar top-up. First purchase must be $99; later top-ups
    // are any of the presets. Server enforces both (never trust the client).
    const { amount_usd } = z.object({
      amount_usd: z.number().positive(),
    }).parse(req.body)

    const { data: client } = await db.from('clients')
      .select('id').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Has this client PAID US before? PURCHASE_TX_TYPES deliberately, not PAID_TX_TYPES: a
    // manual grant unlocks a client but is not money in, and if it counted here a comped
    // account could skip the $99 pack entirely and start on a $40 top-up.
    const { count: priorPurchases } = await db.from('credit_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', client.id).in('type', PURCHASE_TX_TYPES)
    const isFirst = (priorPurchases ?? 0) === 0

    // ⚠️ DERIVED FROM THE CONSTANT, NEVER TYPED — and this line is why the guard exists.
    // It read `const FIRST_PURCHASE_USD = 99` while the portal's button already derived its
    // amount from `PACK_PRICE_USD` (#563 fixed the client side and left the server side
    // hardcoded). So the 3-Aug move to $299 would have had the portal POST 299 and this
    // route reject it as `first_purchase_must_be_99`: **every first payment would have
    // failed at the till**, on the one request that starts a client, and the only symptom
    // would have been a 400 nobody was watching for. `pack-price-single-source.test.ts`
    // now fails if either side is re-hardcoded.
    const FIRST_PURCHASE_USD = PACK_PRICE_USD
    const TOPUP_PRESETS = [40, 100, 200]
    if (isFirst && amount_usd !== FIRST_PURCHASE_USD) {
      // The code is generic on purpose: `first_purchase_must_be_99` baked a price into an
      // error name, so the name itself went stale the day the price moved.
      res.status(400).json({
        success: false,
        error: 'first_purchase_amount_required',
        // NOT "to load your wallet" — that was false after #562. The pack BUYS the included
        // approvals; it does not credit the wallet.
        message: `Your first purchase is $${FIRST_PURCHASE_USD} — the onboarding pack, which includes your first ${PACK_LEADS} approved leads.`,
      })
      return
    }
    if (!isFirst && !TOPUP_PRESETS.includes(amount_usd) && amount_usd !== FIRST_PURCHASE_USD) {
      res.status(400).json({ success: false, error: 'invalid_topup_amount', message: 'Top up $40, $100, or $200.' })
      return
    }

    const token = req.headers.authorization?.replace('Bearer ', '') || ''
    const { data: { user } } = await db.auth.getUser(token)
    const clientEmail = user?.email || ''

    const portalUrl = process.env.PORTAL_URL || 'https://app.get-kind.com'
    const { url, error } = await createWalletCheckoutSession({
      clientId:   client.id,
      amountUsd:  amount_usd,
      clientEmail,
      // The route already knew this and simply never passed it, which is how the first
      // purchase came to be labelled a wallet top-up on the payment page.
      isFirstPurchase: isFirst,
      successUrl: `${portalUrl}/milla/billing?stripe=success`,
      cancelUrl:  `${portalUrl}/milla/billing?stripe=cancelled`,
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
        metadata?: { clientId?: string; credits?: string; creditType?: string; product?: string; type?: string; amountUsd?: string }
        subscription?: string
      }
      const meta = session.metadata || {}

      if (meta.type === 'subscription' && meta.clientId && meta.product) {
        // Subscription checkout completed — subscription activation handled
        // by customer.subscription.created event below. Nothing to do here.
        console.log(`[Stripe] Subscription checkout complete for ${meta.product} client ${meta.clientId}`)
      } else if (meta.type === 'wallet_topup' && meta.clientId && meta.amountUsd) {
        // ONE WALLET — credit the client's single dollar wallet. Ledger-first
        // (unique reference = session.id) is the idempotency guard, then the atomic
        // increment_wallet RPC. Same paid-safe pattern as the credit path below.
        const clientId  = meta.clientId
        const amountUsd = parseFloat(meta.amountUsd)
        if (!Number.isFinite(amountUsd) || amountUsd <= 0) { res.sendStatus(200); return }

        const { error: ledgerErr } = await db.from('credit_transactions').insert({
          client_id: clientId, type: 'wallet_topup', amount: amountUsd, plan: 'work_model',
          reference: session.id, note: `Wallet top-up $${amountUsd} via Stripe`,
        })

        if (ledgerErr) {
          if (ledgerErr.code === '23505') { res.sendStatus(200); return } // already credited (retry)
          console.error('[Stripe] wallet ledger insert failed after payment — 500 for retry', ledgerErr.message, 'session', session.id)
          void sendFounderAlert('payment_failed', 'Wallet ledger insert failed after payment — Stripe will retry', [
            `Client: ${clientId} paid $${amountUsd} (session ${session.id}).`,
            `The payment succeeded but writing the wallet ledger row failed — no funds were added. Reason: ${ledgerErr.message}`,
          ])
          res.status(500).json({ error: 'ledger insert failed — retry' }); return
        }
        // ── THE FIRST $99 BUYS THE PACK. IT IS NOT WALLET MONEY. ──────────────────
        //
        // It was doing both, and nothing joined the two files that caused it: this one
        // credited the full $99 to the wallet, and `approve-lead.ts` switched the 100-lead
        // pack on from the very same purchase row. So one payment bought **100 free
        // approvals AND $99 of spendable balance** — the client approved 100 for nothing,
        // the wallet sat untouched at $99, and approval 101 onwards spent it: about
        // twenty-four more leads at $4. **$99 bought ~124 leads instead of 100.**
        //
        // `PRODUCT-INVENTORY.md` #541 locked the design in the founder's own terms — the
        // pack is *"a counted quota, NOT a wallet credit"* — because crediting dollars to
        // make "$4 a lead" reach 100 would have made the balance fiction. The quota was
        // added; the wallet credit was never removed.
        //
        // The model, plainly: **$99 once → 100 included leads.** Then **top-ups in bundles
        // → $4 per approved lead**, and those DO credit the wallet, because that is what the
        // wallet is for. `add_sourcing_allowance` below is unaffected either way — it accrues
        // on every payment, including this one, and is what actually funds the sourcing.
        //
        // "First" is decided from the ledger, which is already the source of truth for the
        // pack — so the two can never disagree about which purchase this is.
        const { count: priorPurchases } = await db.from('credit_transactions')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', clientId).in('type', PURCHASE_TX_TYPES)
          .neq('reference', session.id)
        const isPackPurchase = (priorPurchases ?? 0) === 0

        const { error: walletErr } = isPackPurchase
          ? { error: null }
          : await db.rpc('increment_wallet', { p_client_id: clientId, p_amount: amountUsd })
        if (isPackPurchase) {
          console.log(`[stripe] first purchase $${amountUsd} for ${clientId} — pack only, wallet NOT credited (the $${PACK_PRICE_USD} buys the ${PACK_LEADS} included leads)`)
        }
        if (walletErr) {
          // #349 — THIS DELETE SWALLOWED ITS ERROR, and it is the most expensive one in the
          // file. The row is removed precisely so Stripe's webhook retry can re-grant; the
          // replay is idempotent ON THIS REFERENCE, so if the delete fails the row survives,
          // the retry sees it, decides the grant already happened and skips it. The client
          // has PAID and is never credited — permanently, with the alert below cheerfully
          // saying "Stripe will retry".
          const { error: rollbackErr } = await db.from('credit_transactions').delete().eq('reference', session.id)
          console.error('[Stripe] wallet credit failed after payment — deleting ledger row for retry', walletErr.message, 'session', session.id)
          if (rollbackErr) {
            console.error('[Stripe] ROLLBACK FAILED — the retry will skip this grant and the client stays unpaid', rollbackErr.message, 'session', session.id)
            void sendFounderAlert('payment_failed', 'PAID CLIENT WILL NOT BE CREDITED — rollback failed', [
              `Session ${session.id}: the wallet credit failed AND the ledger rollback failed (${rollbackErr.message}).`,
              'The ledger row survives, so Stripe\'s retry will treat this payment as already granted and skip it. The client has paid and will never receive the credit.',
              `Fix NOW: delete the credit_transactions row with reference ${session.id}, then re-run the grant or credit the wallet by hand.`,
            ])
          }
          void sendFounderAlert('payment_failed', 'Wallet credit failed after payment — Stripe will retry', [
            `Client: ${clientId} paid $${amountUsd} (session ${session.id}).`,
            `The payment succeeded but crediting the wallet failed — the ledger row was rolled back so Stripe's retry can re-credit. Reason: ${walletErr.message}`,
          ])
          res.status(500).json({ error: 'wallet credit failed — retry' }); return
        }
        if (amountUsd > 0) void maybeCreatePartnerCommission(clientId, amountUsd, session.id)
        // #445 — sourcing-allowance accrual, k=2: +2 records of PDL budget per $1 collected.
        const { error: allowErr } = await db.rpc('add_sourcing_allowance', { p_client_id: clientId, p_records: Math.round(amountUsd * 2), p_trial: false })
        if (allowErr) {
          console.error('[Stripe] sourcing-allowance accrual failed for', clientId, allowErr)
          void sendFounderAlert('charge_failed', 'Sourcing allowance NOT accrued after wallet top-up', [
            `Client: ${clientId} paid $${amountUsd}.`,
            `Their sourcing allowance (+${Math.round(amountUsd * 2)} records) failed to accrue: ${allowErr.message}`,
          ])
        }
        void payReferrerOnFirstPurchase(clientId).catch(err => console.error('[Stripe] referrer payout failed (non-fatal):', err))

        // ── PAYMENT STARTS THE WORK (flow v2) ──────────────────────────────────────
        // The client approved their ICP on day one and it then sat dormant, because nothing
        // linked "they paid" to "go find people" — an operator had to remember to type it
        // into a chat box. Money is the trigger now: source against the live ICP and put
        // every person we find in front of the client, top 20 marked.
        //
        // ORDER MATTERS. This runs AFTER add_sourcing_allowance, not before: sourcing spends
        // the client's allowance via try_spend_sourcing, and a brand-new client's allowance
        // is 0 until the line above credits it. Fired first, the very payment that was meant
        // to start everything sourced nobody and alerted "Sourced 0".
        //
        // Fire-and-forget: a sourcing failure must never fail the webhook and make Stripe
        // retry a payment that already succeeded. Buying the INBOX stays manual on purpose —
        // it spends real money, so it surfaces as the operator's next action instead.
        void (async () => {
          const { startWorkForClient } = await import('../lib/start-work')
          const r = await startWorkForClient(clientId)
          console.log('[stripe] payment started work for', clientId, JSON.stringify(r))
          void sendFounderAlert('new_signup', `Payment received — work started`, [
            `Client ${clientId} paid $${amountUsd}.`,
            r.started
              ? `Sourced ${r.sourced}, sent ${r.surfaced} to them (top ${r.recommended} recommended).`
              : `Nothing sourced — ${r.reason ?? 'unknown reason'}.`,
            r.started && r.sourced > 0 && r.sourced < 200
              ? `Day-one sourcing is capped at 100 records per client; the nightly top-up finishes the 200.`
              : 'Next: assign their inbox in Vida → Engine. Nothing can go out until they have a sender.',
          ]).catch(() => {})
        })().catch(e => console.error('[stripe] start-work failed (non-fatal):', e))

        // #613 — STAMP WHAT THE BANK ACTUALLY RECEIVED. Runs AFTER the money is credited and
        // after start-work is kicked, so a Stripe read failure costs an annotation and nothing
        // else. `annotateSettlement` never throws; it returns false and logs.
        await annotateSettlement(session.id)

        res.sendStatus(200); return
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
          // #349 — THIS DELETE SWALLOWED ITS ERROR, and it is the most expensive one in the
          // file. The row is removed precisely so Stripe's webhook retry can re-grant; the
          // replay is idempotent ON THIS REFERENCE, so if the delete fails the row survives,
          // the retry sees it, decides the grant already happened and skips it. The client
          // has PAID and is never credited — permanently, with the alert below cheerfully
          // saying "Stripe will retry".
          const { error: rollbackErr } = await db.from('credit_transactions').delete().eq('reference', session.id)
          if (rollbackErr) {
            console.error('[Stripe] ROLLBACK FAILED — the retry will skip this grant and the client stays unpaid', rollbackErr.message, 'session', session.id)
            void sendFounderAlert('payment_failed', 'PAID CLIENT WILL NOT BE CREDITED — rollback failed', [
              `Session ${session.id}: the credit grant failed AND the ledger rollback failed (${rollbackErr.message}).`,
              'The ledger row survives, so Stripe\'s retry will treat this payment as already granted and skip it. The client has paid and will never receive the credit.',
              `Fix NOW: delete the credit_transactions row with reference ${session.id}, then re-run the grant or credit the wallet by hand.`,
            ])
          }
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
        if (amountUsd > 0) void maybeCreatePartnerCommission(clientId, amountUsd, session.id)

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

        // #613 — the same settlement stamp on the credit-purchase path. LAST, after every
        // money write has completed, so a Stripe read failure can cost nothing but a note.
        await annotateSettlement(session.id)
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
      // #340 — THIS LINE USED TO READ:
      //   sub.status === 'active' || sub.status === 'trialing' ? sub.status : 'active'
      // Everything that was NOT already good was written as `active`: a card declined at
      // signup (`incomplete`), dunning (`past_due`, `unpaid`), even `canceled`. Every
      // consumer gates on active/trialing, so that ternary was the entire authorisation
      // decision for the paid product — and it always said yes.
      const mapped             = mapStripeStatus(sub.status)
      // SPRINT line 5 / #238 — the subscription row MUST carry its monthly USD price,
      // else the revenue report (MRR = sum(amount_usd) of active subs) counts every
      // paid subscriber as $0. Sourced from the locked STRIPE_SUBSCRIPTIONS table.
      const amountUsd          = STRIPE_SUBSCRIPTIONS[product].priceUsd

      // Upsert subscription record
      const { data: existing } = await db.from('subscriptions')
        .select('id').eq('client_id', clientId).eq('product', dbProduct).maybeSingle()

      // #340/#342 — WRITE THE FAITHFUL STATUS, AND SURVIVE THE ENUM REJECTING IT.
      //
      // Production's `subscriptions.status` is a Postgres ENUM (the repo schema.sql drifted
      // and claims text+CHECK). Writing `incomplete` before the migration has run fails with
      // *"invalid input value for enum subscription_status"* — the exact failure #190 hit
      // with `paused` and #342 is still living with for `lapsed`. And a failed UPDATE leaves
      // the row on its PREVIOUS value, which for an existing subscription means it stays
      // `active`: the honest fix would have recreated the bug it was fixing.
      //
      // So a rejection retries with a fallback drawn only from values already in the enum,
      // chosen to deny access just as the real status would. The client stays locked either
      // way; only the precision of the label is lost, and the founder is told why.
      const writeStatus = async (value: string) => existing
        ? db.from('subscriptions').update({
            status: value,
            amount_usd:             amountUsd,
            current_period_end:     currentPeriodEnd,
            stripe_subscription_id: sub.id,
          }).eq('id', existing.id)
        : db.from('subscriptions').insert({
            client_id:              clientId,
            product:                dbProduct,
            status: value,
            amount_usd:             amountUsd,
            current_period_end:     currentPeriodEnd,
            stripe_subscription_id: sub.id,
          })

      let stored = mapped.status
      const { error: writeErr } = await writeStatus(mapped.status)
      if (writeErr && isEnumRejection(writeErr)) {
        stored = mapped.fallback
        const { error: fallbackErr } = await writeStatus(mapped.fallback)
        console.error(`[Stripe] enum rejected status "${mapped.status}" — stored "${mapped.fallback}" instead`, writeErr.message)
        void sendFounderAlert('charge_failed', 'Subscription status enum is missing values — run the migration', [
          `Stripe reported "${sub.status}" for client ${clientId}; the database rejected "${mapped.status}".`,
          `Stored "${mapped.fallback}" instead, which still denies access — the client is NOT getting the product free.`,
          'Fix: Vida → Engine → run the pending migrations (20260727_subscription_status).',
          fallbackErr ? `The fallback write ALSO failed: ${fallbackErr.message} — check this client by hand NOW.` : '',
        ].filter(Boolean))
      } else if (writeErr) {
        console.error('[Stripe] subscription status write failed:', writeErr.message)
        void sendFounderAlert('charge_failed', 'Subscription status could not be written', [
          `Stripe reported "${sub.status}" for client ${clientId} and the write failed: ${writeErr.message}`,
          'The subscription row may still show its previous status — check Finance → Billing.',
        ])
      }

      // A status Stripe has invented since this code was written is DENIED, not granted —
      // then reported, so it gets mapped properly rather than sitting as a silent denial.
      if (mapped.unrecognised) {
        console.warn(`[Stripe] unrecognised subscription status "${sub.status}" — denied access and stored as ${stored}`)
        void sendFounderAlert('charge_failed', `Unknown Stripe subscription status: "${sub.status}"`, [
          `Stripe sent a subscription status we do not map: "${sub.status}" (client ${clientId}).`,
          `Access was DENIED and it was stored as "${stored}" — the safe direction, but it may be wrong.`,
          'If this client should have access, fix it in Finance → Billing and map the status in lib/subscription-status.ts.',
        ])
      }

      console.log(`[Stripe] Subscription ${stored} (Stripe said "${sub.status}") for ${product} (${dbProduct}) — client ${clientId}`)
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
        // #349 — Stripe has stopped billing this subscription. If the local row doesn't
        // follow it stays `active`, and every access gate reads active → the client keeps
        // the product forever without paying for it. Stripe will never resend this event.
        const { error: cancelErr } = await db.from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('client_id', clientId)
          .eq('product', dbProduct)
          .eq('stripe_subscription_id', sub.id)
        if (cancelErr) {
          console.error('[Stripe] cancellation write failed:', cancelErr.message)
          void sendFounderAlert('charge_failed', 'Subscription cancelled at Stripe but NOT locally', [
            `Stripe cancelled ${product} for client ${clientId} and the local write failed: ${cancelErr.message}`,
            'The subscription row still reads its previous status — if that was "active", the client keeps the product for free.',
            'Fix: set it to cancelled in Finance → Billing. Stripe does not resend this event.',
          ])
        }
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
        // Re-activate subscription record in case it had lapsed.
        //
        // #340 — this list has to cover every non-access state a renewal can rescue, or a
        // client who pays stays locked out. It used to be ['past_due','cancelled'], written
        // when those were the only two states that ever occurred — because everything else
        // was being coerced to `active` and never reached the database at all. Now that the
        // real states are stored, `unpaid`, `incomplete` and `incomplete_expired` are
        // reachable, and a successful invoice is exactly what clears them.
        //
        // `paused` is deliberately NOT here: a pause is a decision the client made (#190),
        // not a payment failure, and an invoice must not silently undo it.
        // #349 — this is the write that ends a lockout. Swallowed, the client has paid
        // and stays locked out, and nothing retries: the next renewal is a month away.
        const { error: renewErr } = await db.from('subscriptions')
          .update({ status: 'active' })
          .eq('stripe_subscription_id', invoice.subscription)
          // `lapsed` (#342) is here too: a hand-granted subscription that ran out and is
          // later paid for through Stripe must come back, or the client stays locked out
          // forever — the same "access does not match payment" bug pointed the other way.
          .in('status', ['past_due', 'cancelled', 'unpaid', 'incomplete', 'incomplete_expired', 'lapsed'])
        if (renewErr) {
          console.error('[Stripe] renewal re-activation failed:', renewErr.message)
          void sendFounderAlert('charge_failed', 'A client paid but is still locked out', [
            `A renewal invoice succeeded for subscription ${invoice.subscription} (${invoice.customer_email || 'no email'}) and the re-activation write failed: ${renewErr.message}`,
            'They have been charged. If the row was past_due / cancelled / lapsed, they still cannot use the product.',
            'Fix: set the subscription to active in Finance → Billing. The next invoice is a month away — nothing retries this.',
          ])
        }
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
          if (amountUsd > 0) void maybeCreatePartnerCommission(sub.client_id, amountUsd, String((invoice as { id?: string }).id ?? invoice.subscription ?? 'renewal'))
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
      // #349 — the dunning alert below used to state "the subscription is now marked
      // past_due" unconditionally. If this write fails the row stays `active`, the client
      // keeps the product while not paying for it, and the alert tells the founder the
      // opposite. Track the outcome so the alert reports what actually happened.
      let markedPastDue = false
      if (invoice.subscription) {
        const { error: dueErr } = await db.from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', invoice.subscription)
        markedPastDue = !dueErr
        if (dueErr) console.error('[Stripe] past_due write failed:', dueErr.message)
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
        markedPastDue
          ? `The subscription is now marked past_due. Stripe will retry per its dunning schedule.`
          : `⚠️ The subscription could NOT be marked past_due — the row still reads its previous status, so the client may still have full access. Set it by hand in Finance → Billing.`,
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
            amount:    -REFERRAL_BONUS_USD,
            plan:      'work_model',
            reference: `referral_claw_${refundedClientId}`,
            note:      `Referral bonus clawed back — referred client ${refundedClientId} was ${isDispute ? 'charged back' : 'refunded'}`,
          })
          if (clawLedgerErr) return // 23505 = already clawed once (idempotent); any other error handled below
          const { error: clawErr } = await db.rpc('increment_wallet', { p_client_id: refundedClient.referred_by, p_amount: -REFERRAL_BONUS_USD })
          if (clawErr) {
            void sendFounderAlert('payment_failed', `Referral claw-back failed — revoke $${REFERRAL_BONUS_USD} manually`, [
              `Referrer: ${refundedClient.referred_by}`,
              `Referred client ${refundedClientId} was ${isDispute ? 'charged back' : 'refunded'}; the referral-bonus claw-back RPC failed: ${clawErr.message}`,
              `Action: revoke $${REFERRAL_BONUS_USD} from the referrer's wallet manually.`,
            ])
          }
        })().catch(err => console.error('[Stripe] referral claw-back failed (non-fatal):', err))

        void sendFounderAlert('churn_risk', `${isDispute ? 'Chargeback' : 'Refund'} — ${credits} credits clawed back`, [
          `A ${isDispute ? 'chargeback (dispute)' : 'refund'} was processed on Stripe; ${credits} ${isFigsy ? 'FIGSY' : 'lead gen'} credits were revoked from client ${meta.clientId}.`,
          isDispute ? 'Review the dispute in Stripe — you may need to submit evidence.' : 'No action needed unless this was unexpected.',
        ])
      } else if (meta.type === 'wallet_topup' && meta.clientId && meta.amountUsd) {
        // ONE WALLET — a refunded/charged-back top-up claws the dollars back out of the wallet.
        const amountUsd = parseFloat(meta.amountUsd)
        const isDispute = event.type === 'charge.dispute.created'
        if (Number.isFinite(amountUsd) && amountUsd > 0) {
          const { error: ledgerErr } = await db.from('credit_transactions').insert({
            client_id: meta.clientId, type: 'refund', amount: -amountUsd, plan: 'work_model',
            reference: `refund_${obj.id}`,
            note: `${isDispute ? 'Chargeback' : 'Refund'}: revoked $${amountUsd} wallet top-up (${linked?.sessionId ?? 'unknown session'})`,
          })
          if (ledgerErr) {
            if (ledgerErr.code === '23505') { res.sendStatus(200); return }
            throw ledgerErr
          }
          const { error: clawErr } = await db.rpc('increment_wallet', { p_client_id: meta.clientId, p_amount: -amountUsd })
          if (clawErr) console.error('[Stripe] wallet claw-back failed — balance not revoked', clawErr.message, 'client', meta.clientId)
          void sendFounderAlert('churn_risk', `${isDispute ? 'Chargeback' : 'Refund'} — $${amountUsd} wallet clawed back`, [
            `A ${isDispute ? 'chargeback (dispute)' : 'refund'} was processed on Stripe; $${amountUsd} was revoked from client ${meta.clientId}'s wallet.`,
            isDispute ? 'Review the dispute in Stripe — you may need to submit evidence.' : 'No action needed unless this was unexpected.',
          ])
        }
      } else {
        console.warn(`[Stripe] ${event.type} — could not resolve a credit grant to claw back (payment_intent ${obj.payment_intent ?? 'none'})`)
      }

      // STOP THE WORK, not just the money. Clawing the wallet back to $0 blocks the NEXT
      // approval (try_charge_wallet fails), but every enrollment already mid-sequence keeps
      // emailing prospects in this client's name — on our sending reputation, for someone
      // who has just taken their money back. Pause their active campaigns and let the
      // operator decide. Reversible in one click in Vida (Campaign → Run it).
      if (meta.clientId) {
        const { data: paused } = await db.from('figsy_campaigns')
          .update({ status: 'paused' })
          .eq('client_id', meta.clientId).eq('status', 'active')
          .select('id')
        const n = (paused ?? []).length
        if (n > 0) {
          void sendFounderAlert('churn_risk', `Outreach paused — ${event.type === 'charge.dispute.created' ? 'chargeback' : 'refund'} on client ${meta.clientId}`, [
            `${n} active campaign${n === 1 ? '' : 's'} paused for client ${meta.clientId}.`,
            'Their money was reversed, so we stopped sending in their name rather than keep working for free and spending our sending reputation.',
            'Action: if this was expected (a goodwill refund, say), resume them in Vida → Campaign → Run it.',
          ])
        }
      }
    }

    // ── #317b — DISPUTE CLOSED: if WE WON, give the money back ────────────────
    // Without this the claw-back is permanent: a client who paid legitimately, had a card
    // dispute we then WON, is left short — we keep the cash Stripe returned to us AND they
    // never get their wallet back. That is us taking money for nothing, which is the exact
    // thing the money rails exist to prevent.
    //
    // Only 'won' restores. 'lost' means Stripe took the funds — the claw-back was correct and
    // stands. Idempotent on `refund_restore_<dispute id>`, so a replayed webhook restores at
    // most once. Campaigns are deliberately NOT auto-resumed: the operator decides that, and
    // an auto-resume would start sending on a client who may have gone quiet.
    if (event.type === 'charge.dispute.closed') {
      const d = event.data.object as { id: string; status?: string; payment_intent?: string | null }
      if (d.status === 'won') {
        const linked = await getSessionMetaByPaymentIntent(d.payment_intent)
        const meta = linked?.metadata ?? {}
        const credits = parseInt(meta.credits ?? '', 10)
        const topUpUsd = parseFloat(meta.amountUsd ?? '')
        const isWalletTopUp = meta.type === 'wallet_topup' && Number.isFinite(topUpUsd) && topUpUsd > 0
        const isCreditGrant = !!meta.creditType && Number.isFinite(credits) && credits > 0

        if (meta.clientId && (isWalletTopUp || isCreditGrant)) {
          const amount = isWalletTopUp ? topUpUsd : credits
          const isFigsy = meta.creditType === 'figsy'
          const { error: ledgerErr } = await db.from('credit_transactions').insert({
            client_id: meta.clientId,
            // 'manual_grant', not 'adjustment': credit_transactions.type has a CHECK
            // constraint and 'adjustment' is NOT in it — the insert would have thrown, the
            // handler would have 500'd, Stripe would retry forever and the client would
            // never be restored. Allowed values: purchase, credit_purchase, referral,
            // referral_bonus, trial_bonus, consumed, usage, manual_grant, refund.
            type:      'manual_grant',
            amount,
            plan:      isWalletTopUp ? 'work_model' : (isFigsy ? 'figsy' : 'kind_ai'),
            reference: `refund_restore_${d.id}`,
            note:      `Dispute WON — restored ${isWalletTopUp ? `$${amount} wallet top-up` : `${amount} ${isFigsy ? 'FIGSY' : 'lead gen'} credits`} previously clawed back (${linked?.sessionId ?? 'unknown session'})`,
          })
          if (ledgerErr && ledgerErr.code !== '23505') throw ledgerErr
          if (!ledgerErr) {
            const rpc = isWalletTopUp ? 'increment_wallet' : (isFigsy ? 'increment_figsy_credits' : 'increment_client_credits')
            const { error: restoreErr } = await db.rpc(rpc, { p_client_id: meta.clientId, p_amount: amount })
            if (restoreErr) {
              console.error('[Stripe] dispute-won restore RPC failed', restoreErr.message, 'client', meta.clientId)
              void sendFounderAlert('payment_failed', 'Dispute won — restore FAILED, credit them manually', [
                `Client: ${meta.clientId}`,
                `We won the dispute, so the earlier claw-back should be reversed, but the restore RPC failed: ${restoreErr.message}`,
                `Action: credit ${isWalletTopUp ? `$${amount} to their wallet` : `${amount} credits`} manually.`,
              ])
            } else {
              void sendFounderAlert('churn_risk', 'Dispute WON — client restored', [
                `Client ${meta.clientId} disputed a payment, we won, and ${isWalletTopUp ? `$${amount} was restored to their wallet` : `${amount} credits were restored`}.`,
                'Their campaigns are still PAUSED from the dispute — resume them in Vida → Campaign → Run it when you are ready.',
              ])
            }
          }
        } else {
          console.warn(`[Stripe] charge.dispute.closed(won) — nothing to restore (payment_intent ${d.payment_intent ?? 'none'})`)
        }
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
