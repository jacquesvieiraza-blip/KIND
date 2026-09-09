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

// ── ⛓️ AUTO-COMMISSION ON STRIPE PAYMENTS — REMOVED 19 Aug 2026 ─────────────────────
//
// `maybeCreatePartnerCommission` lived here and paid a partner a share of EVERY Stripe
// payment: 20% of the client's first (the $299 pack) and their seat's retain rate on each
// one after. Founder-locked 19 Aug, that is the exact inverse of the deal:
//
//   *"no 25% does not include the $299 nor the 100 leads we give. its everything after this
//     or above this"*
//   *"she earns on leads purchased not when they top up. because our calulators on leads not
//     money in. we earn money when they buy leads. so thye need to be managing their
//     customers to buy leads."*
//
// So the commission moved to the event it is actually paid for — the $4 approval — and lives
// in `lib/lead-sale-commission.ts`. Its three call sites here (pack checkout, credit-bundle
// top-up, subscription renewal) are gone, marked ⛓️ where each stood.
//
// DELETED RATHER THAN LEFT UNCALLED. An intact function nobody calls reads as live to the
// next person and to every grep — that is #383's shape exactly (an RPC that existed on disk,
// was never in the runner, and silently did nothing for 33 days).
//
// Nothing needed unwinding: no client has ever paid, so this never wrote a single row. The
// R40 seat rates (`partners.retain_rate`) and `comp-engine.ts` are untouched — they model the
// legacy MRR plan, which the current money model does not use.

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
// ⛓️ 31 Aug (D2) — THIS CONSTANT NO LONGER PAYS ANYBODY. Its only remaining reader is the
// refund/chargeback claw-back at the bottom of this file, which must still be able to reverse
// a $45 bonus that was genuinely paid before today. It is not a live reward.
const REFERRAL_BONUS_USD = 45

// ⛓️ 31 Aug (BUILD-004A-2D, FOUNDER DECISION D2) — THE AUTOMATIC PAYOUT IS RETIRED. THE
// REFERRAL IS NOT.
//
// The founder's ruling: *"MVP REFERRAL MODEL: HUMAN-HANDLED … no $45 promise, no wallet, no
// 11 approved leads, no $299 onboarding, no credits, no automatic monetary reward. The
// existing backend automatic $45 wallet-credit side effect must NOT execute for the new Milla
// referral journey. Do not delete historical referral evidence."*
//
// 🛑 WHAT WAS ACTUALLY WRONG, AND IT WAS NOT THE CODE. Everything below this comment used to
// work exactly as written: `REFERRAL_BONUS_USD = 45` really did credit the referrer's wallet
// on a referred client's first purchase, and the audit confirmed it. The defect was that
// `/milla/billing` tells a programme customer there is **no wallet**, while `/milla/referral`,
// two rail items away, promised to put $45 into it and called that "11 approved leads on us".
// Both sentences were true against different halves of a product mid-migration. A customer
// cannot hold both.
//
// ⚠️ SO THE MONEY PATH IS GONE AND THE EVIDENCE PATH STAYS. No wallet RPC, no ledger row, no
// promise. What replaces it is the founder being TOLD, because "human-handled" is only a
// model if a human actually hears about it — the alternative is a referral that silently
// reaches nobody, which is worse than the wrong reward.
//
// ⚠️ AND `referral_bonus_paid_at` IS DELIBERATELY LEFT ALONE — a NEW column marks the handoff.
// That marker is what the refund path at the bottom of this file reads to decide whether to
// claw $45 back out of a wallet. If this function set it without paying, the first refund
// would take $45 that was never given, from a wallet the customer's own billing page says
// does not exist. Historic referrals that WERE paid keep their marker and keep clawing back
// correctly; new ones never set it, so the claw-back correctly no-ops.
async function handOffReferralToFounder(referredClientId: string) {
  const { data: client } = await db.from('clients')
    .select('id, company_name, referred_by, referral_handoff_at')
    .eq('id', referredClientId)
    .maybeSingle()

  if (!client?.referred_by || client.referral_handoff_at) return // no referrer, or already raised

  const now = new Date().toISOString()

  // Atomic claim on the HANDOFF marker — same idempotency shape the payout used, for the same
  // reason: a retried or concurrent webhook must raise this with the founder exactly once.
  const { data: handed, error: handErr } = await db.from('clients')
    .update({ referral_handoff_at: now })
    .eq('id', referredClientId)
    .is('referral_handoff_at', null)
    .select('id')
  if (handErr) {
    // #349's lesson, kept: the claim's own error must never be swallowed. An errored UPDATE
    // is indistinguishable from losing the race unless we read it, and a referral nobody is
    // told about is precisely the failure the human-handled model cannot absorb.
    void sendFounderAlert('payment_failed', 'Referral NOT raised — claim failed', [
      `Referrer: ${client.referred_by}`,
      `Referred client ${referredClientId} made their first purchase, but claiming the handoff marker failed: ${handErr.message}`,
      'Nobody was paid (the automatic bonus is retired — D2) and nothing was written. Handle this referral by hand.',
    ])
    return
  }
  if (!handed || handed.length === 0) return // lost the race — someone else raised it

  void sendFounderAlert('churn_risk', 'Referral to handle — a referred client just paid', [
    `Referrer: ${client.referred_by}`,
    `Referred client: ${client.company_name ?? referredClientId} (${referredClientId})`,
    'The automatic $45 wallet credit is RETIRED (founder decision D2, 31 Aug) — nothing was paid and nothing was promised on the referral page.',
    'MVP referral is handled personally: decide what, if anything, this referrer receives and arrange it directly with them.',
  ])
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

    // ── 🛑 3 Sep (C2) · THE RETIRED PACK IS NOT SOLD TO A PROGRAMME CLIENT ────────────────
    //
    // This route sells the LEGACY commercial model and nothing else: the $299 onboarding pack
    // with its included approvals, and the $40/$100/$200 wallet top-ups that feed the $4
    // per-approved-lead charge. A programme client pays for a programme, at P1 and P2, through
    // its own route — so a checkout here would take real money for a product they are not on
    // and cannot use. The retired `/dashboard/billing` page still renders these buttons, and a
    // page is not a gate: the fence has to be here, where the money is.
    //
    // ⚠️ AND IT REFUSES ON `unreadable` TOO. If we cannot resolve which model governs this
    // client, the honest answer is not to take their card. Charging is the one act where
    // "we could not tell" must never resolve in our favour.
    const { clientCommercialModel, mayUseLegacyCommercialPath } = await import('../lib/commercial-model')
    const model = await clientCommercialModel(client.id)
    if (!mayUseLegacyCommercialPath(model)) {
      res.status(409).json({
        success: false,
        error: 'not_on_this_model',
        message: model.model === 'unreadable'
          ? 'We could not confirm your plan, so nothing has been charged. Please contact us and we will sort it out.'
          : 'Your programme is paid for separately — there is no pack or top-up to buy on your plan. Nothing has been charged.',
      })
      return
    }

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
        metadata?: { clientId?: string; credits?: string; creditType?: string; product?: string; type?: string; amountUsd?: string; programmeId?: string; meetings?: string }
        subscription?: string
      }
      const meta = session.metadata || {}

      // ── PROGRAMME PAYMENTS (BUILD-002) ────────────────────────────────────────────
      //
      // ⚠️ FIRST, BECAUSE PROGRAMME MONEY MUST NEVER FALL THROUGH INTO A LEGACY BRANCH. A
      // programme stage that reached the wallet handler would credit a wallet the programme
      // model does not use and call `startWorkForClient` — turning "authorise sourcing" into
      // "start sourcing now", which is precisely the coupling the programme breaks.
      //
      // ⚠️ AND THE CHECKOUT URL IS NOT AUTHORITY. Both handlers RE-READ programme state
      // (`recordFirstPayment` / `recordSecondPayment`): a session created while APPROVED can
      // be paid after the client pauses, and arrival order must never override state.
      const programmeStage = meta.type === 'programme_first' || meta.type === 'programme_second'
        ? meta.type : null
      if (programmeStage && meta.programmeId) {
        const { recordFirstPayment, recordSecondPayment } = await import('../lib/programme')
        // Kept as a refund/dispute handle: those events arrive keyed on the payment intent,
        // not the checkout session, and #317 already had to resolve one from the other.
        const rawIntent = (session as unknown as { payment_intent?: unknown }).payment_intent
        const intentId = typeof rawIntent === 'string' ? rawIntent : null

        if (programmeStage === 'programme_first') {
          const r = await recordFirstPayment({ programmeId: meta.programmeId, sessionId: session.id, paymentIntentId: intentId })
          if (!r.ok) {
            // The money arrived and we could not record it. 500 so Stripe retries — the
            // ref-based idempotency makes the retry safe.
            console.error(`[Stripe] programme first payment could not be recorded — 500 for retry. ${r.reason}`)
            void sendFounderAlert('payment_failed', 'Programme FIRST payment could not be recorded', [
              `Programme ${meta.programmeId} (client ${meta.clientId}) paid session ${session.id}.`,
              `Reason: ${r.reason}`,
              'The client has paid. Stripe will retry; if the retries exhaust, record it by hand.',
            ])
            res.status(500).json({ error: 'programme first payment record failed — retry' }); return
          }
          // ⚠️ NO startWorkForClient CALL HERE, DELIBERATELY. The first 50% buys AUTHORITY to
          // source up to the full recommended volume, executed in controlled ~250 batches
          // under K.I.N.D's GO — not an immediate run (founder lock 4).
          console.log(`[Stripe] programme ${meta.programmeId} first payment ${r.alreadyRecorded ? 'already recorded (replay)' : 'recorded'} — sourcing authorised, NOT started.`)
          res.sendStatus(200); return
        }

        const r = await recordSecondPayment({ programmeId: meta.programmeId, sessionId: session.id, paymentIntentId: intentId })
        if (!r.ok) {
          console.error(`[Stripe] programme second payment could not be recorded — 500 for retry. ${r.reason}`)
          void sendFounderAlert('payment_failed', 'Programme SECOND payment could not be recorded', [
            `Programme ${meta.programmeId} (client ${meta.clientId}) paid session ${session.id}.`,
            `Reason: ${r.reason}`,
            'The client has paid. Stripe will retry; if the retries exhaust, record it by hand.',
          ])
          res.status(500).json({ error: 'programme second payment record failed — retry' }); return
        }
        console.log(r.recordedNotLive
          ? `[Stripe] programme ${meta.programmeId} second payment RECORDED but NOT taken live — state refused it. Founder alerted.`
          : `[Stripe] programme ${meta.programmeId} second payment ${r.alreadyRecorded ? 'already recorded (replay)' : 'recorded'} — programme is LIVE.`)
        res.sendStatus(200); return
      }

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

        // ── IS THIS A PROGRAMME CLIENT? ASKED FIRST, BEFORE ANYTHING IS WRITTEN ──────────
        //
        // ⚠️ THE POSITION OF THIS READ IS THE WHOLE FIX, AND IT USED TO BE IN THE WRONG PLACE.
        // It lived inside the fire-and-forget `void (async () => {…})()` further down, so a
        // storage failure could only `return` out of that IIFE — the outer handler carried on
        // to `res.sendStatus(200)` and Stripe was told the event was handled. The event is
        // then permanently consumed while we never determined whether this client was on a
        // programme.
        //
        // ⚠️ AND MOVING IT MERELY *EARLIER* WOULD NOT HAVE BEEN ENOUGH — it had to move BEFORE
        // THE LEDGER INSERT. A non-2xx returned after the wallet was credited is retried by
        // Stripe, the retry hits the ledger's 23505 unique-reference guard, and that branch
        // answers 200 and returns — skipping start-work entirely. The retry would look
        // successful and do nothing. Asking here, before any row is written, means a retry
        // re-runs this branch cleanly from the top.
        const { data: openProg, error: progErr } = await db.from('programmes')
          .select('id, status').eq('client_id', clientId)
          .not('status', 'in', '(COMPLETED,CANCELLED)').limit(1).maybeSingle()

        if (progErr) {
          // FAIL CLOSED, AND ASK STRIPE TO COME BACK. Nothing has been written: no ledger
          // row, no wallet credit, no allowance, no work. 503 keeps the event eligible for
          // retry rather than burning it on an answer we could not determine.
          console.error(`[Stripe] programme state unreadable for client ${clientId} — refusing the event so Stripe retries (nothing written):`, progErr)
          void sendFounderAlert('payment_failed', 'Payment received but programme state was unreadable — event REFUSED for retry', [
            `Client ${clientId} paid $${amountUsd} (session ${session.id}), and K.I.N.D could not determine whether they are on a programme.`,
            `Reason: ${progErr.message}`,
            'NOTHING was written — no wallet credit, no sourcing allowance, no work started — and Stripe was given a 503 so it will retry the event.',
            'If the retries exhaust, the payment exists in Stripe and must be reconciled by hand.',
          ])
          res.status(503).json({ error: 'programme state unreadable — retry' })
          return
        }

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
        // ⛓️ COMMISSION REMOVED HERE 19 Aug 2026 — founder: *"she earns on leads purchased
        // not when they top up."* This is money ARRIVING (the pack / a wallet top-up), which
        // the ruling exempts. The 25% is now taken on the $4 approval itself, in
        // lib/lead-sale-commission.ts. Removed rather than left dead: a call that looks live
        // and pays nobody is the #383 shape.
        // #445 — sourcing-allowance accrual, k=2: +2 records of PDL budget per $1 collected.
        const { error: allowErr } = await db.rpc('add_sourcing_allowance', { p_client_id: clientId, p_records: Math.round(amountUsd * 2), p_trial: false })
        if (allowErr) {
          console.error('[Stripe] sourcing-allowance accrual failed for', clientId, allowErr)
          void sendFounderAlert('charge_failed', 'Sourcing allowance NOT accrued after wallet top-up', [
            `Client: ${clientId} paid $${amountUsd}.`,
            `Their sourcing allowance (+${Math.round(amountUsd * 2)} records) failed to accrue: ${allowErr.message}`,
          ])
        }
        void handOffReferralToFounder(clientId).catch(err => console.error('[Stripe] referral handoff failed (non-fatal):', err))

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
          // ── PROGRAMME CLIENTS DO NOT START WORK FROM A LEGACY PAYMENT (BUILD-002) ──────
          //
          // ⚠️ THIS IS THE ONE EXECUTABLE `startWorkForClient` CALLER IN THE PRODUCT, and it
          // is the legacy coupling "money arrived → start sourcing". A client who is on a
          // programme but tops up a legacy wallet would otherwise enter sourcing and sending
          // through this door, entirely outside programme authority and before Go Live.
          //
          // The sourcing gate would refuse their PDL spend (a programme client passed a NULL
          // programme id gets 0) — but `startWorkForClient` also reaches campaign activation,
          // and relying on a downstream refusal to protect an upstream door is how the
          // AR8 lookalike hole survived. Refuse at the door, and say so.
          //
          // ⚠️ NO SECOND READ. `openProg` was resolved at the TOP of this branch, before
          // anything was written, and a storage failure there already refused the event with
          // a 503 so Stripe retries. Re-reading here would reintroduce the exact defect:
          // this IIFE is fire-and-forget, so an error inside it cannot change the response
          // Stripe has already been given.
          if (openProg) {
            console.log(`[stripe] client ${clientId} is on programme ${(openProg as { id: string }).id} — legacy payment did NOT start work. Programme sourcing is authorised by the programme's own first payment.`)
            void sendFounderAlert('new_signup', 'Legacy payment received from a PROGRAMME client — work NOT started', [
              `Client ${clientId} paid $${amountUsd} through the legacy wallet path while holding an open programme.`,
              'No sourcing and no campaign were started: a programme is authorised by its own first payment and goes live only at its second.',
              'Decide whether this money belongs to the programme or is a genuine legacy top-up.',
            ])
            return
          }
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

        // ⛓️ COMMISSION REMOVED HERE 19 Aug 2026 — a credit-bundle purchase is a TOP-UP, and
        // the founder's ruling pays on leads bought, not on money in: *"we earn money when
        // they buy leads. so thye need to be managing their customers to buy leads."* A client
        // who tops up $400 and approves nothing now earns the partner nothing, which is the
        // whole point of the change.
        //
        // ⚠️ `amountUsd` STAYS. It was derived for the commission call AND is still read by
        // the sourcing-allowance accrual below — removing it with the commission broke the
        // type-check, which is the cheap version of this lesson.
        const bundleList = STRIPE_BUNDLES[creditType as 'lead_gen' | 'figsy'] as readonly { credits: number; price: number }[]
        const bundle = bundleList.find(b => b.credits === credits)
        const amountUsd = bundle?.price ?? 0

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

        // #336 → D2 (31 Aug) — RAISE the referral with the founder on this client's FIRST
        // purchase. No wallet credit: the automatic bonus is retired and referral is
        // human-handled. Fire-and-forget for the same reason as before — nothing about a
        // referral may break the paid webhook.
        void handOffReferralToFounder(clientId).catch(err =>
          console.error('[Stripe] referral handoff failed (non-fatal):', err))

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

        // ⛓️ COMMISSION REMOVED HERE 19 Aug 2026 — a renewal is money arriving, not a lead
        // being bought. Same ruling as the two sites above; the 25% is taken on the $4
        // approval in lib/lead-sale-commission.ts.
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
      // ── ⛓️ 9 Sep — A PROGRAMME PAYMENT REVERSAL MUST REACH THE PROGRAMME ────────────────
      //
      // 🛑 WHAT WAS UNSAFE. This handler paused the client's ACTIVE CAMPAIGNS and stopped
      // there. The programme row itself was untouched: no `disputed_at`, no `paused_at`, and
      // `checkProgrammeAuthority` therefore still granted OUTREACH. So the money was reversed,
      // the campaigns were paused — and any legacy activation path could wake them straight
      // back up, because the authority that decides whether this programme may send at all
      // still said yes. Pausing the symptom while the authority stays live is not a stop.
      //
      // ⚠️ IT REVERSES NOTHING AND DELETES NOTHING. `recordDispute` stamps `disputed_at` and
      // pauses; the programme, its batches, its payment timestamps and its ledger rows are all
      // preserved as evidence. No refund accounting is fabricated here — Stripe is the record
      // of the money, and this is the record of the delivery stopping.
      //
      // ⚠️ IDEMPOTENT. Stripe redelivers; `recordDispute` keeps the FIRST stamp and alerts once.
      if (meta.programmeId && typeof meta.programmeId === 'string') {
        const { recordDispute } = await import('../lib/programme')
        const kind = event.type === 'charge.dispute.created' ? 'dispute' as const : 'refund' as const
        const r = await recordDispute(
          meta.programmeId,
          `Stripe ${event.type} on charge ${obj.id}${meta.type ? ` (${meta.type})` : ''}.`,
          kind,
        )
        if (!r.ok) {
          console.error(`[Stripe] ${event.type} — programme ${meta.programmeId} could not be stopped: ${r.reason}`)
          void sendFounderAlert('payment_failed', 'A programme payment was reversed and the programme could NOT be stopped', [
            `Programme ${meta.programmeId}, client ${meta.clientId ?? 'unknown'}.`,
            `Reason: ${r.reason}`,
            'Pause this programme by hand in Vida — its outreach authority may still be live.',
          ])
        }
      }

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
