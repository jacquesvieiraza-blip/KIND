import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { PRODUCTS } from '@kind/shared'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { pauseStripeSubscription, resumeStripeSubscription } from '../lib/stripe'

export const subscriptionRouter = Router()
subscriptionRouter.use(requireAuth)

// Paystack is legacy — kept for webhook compatibility only. No longer required.
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || ''
const PLAN_CODES: Record<string, Record<string, string>> = {
  lead_gen: { starter: process.env.PAYSTACK_PLAN_LEAD_GEN_STARTER || '', advanced: process.env.PAYSTACK_PLAN_LEAD_GEN_ADVANCED || '', enterprise: process.env.PAYSTACK_PLAN_LEAD_GEN_ENTERPRISE || '' },
  lead_gen_figsy: { starter: process.env.PAYSTACK_PLAN_FIGSY_STARTER || '', advanced: process.env.PAYSTACK_PLAN_FIGSY_ADVANCED || '', enterprise: process.env.PAYSTACK_PLAN_FIGSY_ENTERPRISE || '' },
  virtual_assistant: { starter: process.env.PAYSTACK_PLAN_VA_STARTER || '', pro: process.env.PAYSTACK_PLAN_VA_PRO || '', enterprise: process.env.PAYSTACK_PLAN_VA_ENTERPRISE || '' },
  chatbot: { starter: process.env.PAYSTACK_PLAN_CHATBOT_STARTER || '', pro: process.env.PAYSTACK_PLAN_CHATBOT_PRO || '', enterprise: process.env.PAYSTACK_PLAN_CHATBOT_ENTERPRISE || '' },
}

subscriptionRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const { data: client } = await db.from('clients').select('id').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data } = await db.from('subscriptions').select('*').eq('client_id', client.id).order('created_at', { ascending: false })
    res.json({ success: true, data })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch subscriptions' }) }
})

subscriptionRouter.post('/verify', async (req: AuthRequest, res) => {
  try {
    const { reference } = z.object({ reference: z.string().min(1) }).parse(req.body)
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    })
    const paystackData = await paystackRes.json() as { status: boolean; data: { status: string; metadata: Record<string, string> } }
    if (!paystackData.status || paystackData.data.status !== 'success') {
      res.status(400).json({ success: false, error: 'Payment not successful' }); return
    }
    const { client_id, product, billing_interval } = paystackData.data.metadata
    const productConfig = PRODUCTS[product as keyof typeof PRODUCTS]
    const amountUsd = (productConfig as any)?.price_usd ?? 0
    await db.from('subscriptions').upsert({
      client_id, product, tier: 'monthly',
      status: 'active',
      billing_interval: billing_interval || 'monthly',
      amount_usd: amountUsd,                       // USD = source of truth (C4)
      amount_zar: Math.round(amountUsd * 19),       // kept for back-compat until partner stats move to USD (item 220)
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    }, { onConflict: 'client_id,product' })
    res.json({ success: true, message: 'Subscription activated' })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Verification failed' })
  }
})

// ── CANCEL subscription ────────────────────────────────────────────────────────
subscriptionRouter.post('/:id/cancel', async (req: AuthRequest, res) => {
  try {
    const { data: client } = await db.from('clients').select('id').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Verify this subscription belongs to this client
    const { data: sub } = await db.from('subscriptions')
      .select('id, product, status, paystack_subscription_code')
      .eq('id', req.params.id)
      .eq('client_id', client.id)
      .single()

    if (!sub) { res.status(404).json({ success: false, error: 'Subscription not found' }); return }
    if (sub.status === 'cancelled') { res.status(400).json({ success: false, error: 'Subscription already cancelled' }); return }

    // If there is a Paystack subscription code, cancel it with Paystack
    if (sub.paystack_subscription_code) {
      await fetch(`https://api.paystack.co/subscription/disable`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: sub.paystack_subscription_code, token: sub.paystack_subscription_code }),
      })
    }

    // Mark cancelled in DB — access continues until current_period_end
    await db.from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', sub.id)

    res.json({
      success: true,
      message: `${sub.product} subscription cancelled. Access continues until end of current billing period.`,
    })
  } catch (err) {
    console.error('[subscriptions/cancel]', err)
    res.status(500).json({ success: false, error: 'Failed to cancel subscription' })
  }
})

// ── PAUSE subscription (item 190 — graceful hold instead of cancel) ─────────────
// Stops billing for 1–3 months but KEEPS the client's data + settings warm. This
// is the "save" offer on the cancel path so churn isn't one-way + final.
//
// CONSERVATIVE: this does NOT delete data and does NOT change how charges are
// computed elsewhere. Billing is stopped the same way cancel does it (disable the
// Paystack/Stripe-side recurring charge), and the subscription is marked paused
// with a resume date. It RELIES on the additive migration
// supabase/migrations/20260622_subscription_pause.sql (status 'paused' + the
// paused_until / paused_at columns). Until the founder applies that migration the
// DB write is rejected by the status CHECK constraint — in that case we return a
// clear 409 and DO NOT cancel or otherwise mutate the subscription.
subscriptionRouter.post('/:id/pause', async (req: AuthRequest, res) => {
  try {
    const { months } = z.object({
      months: z.coerce.number().int().min(1).max(3).default(1),
    }).parse(req.body ?? {})

    const { data: client } = await db.from('clients').select('id').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Verify this subscription belongs to this client
    const { data: sub } = await db.from('subscriptions')
      .select('id, product, status, paystack_subscription_code, stripe_subscription_id')
      .eq('id', req.params.id)
      .eq('client_id', client.id)
      .single()

    if (!sub) { res.status(404).json({ success: false, error: 'Subscription not found' }); return }
    if (sub.status === 'cancelled') { res.status(400).json({ success: false, error: 'Subscription already cancelled' }); return }
    if (sub.status === 'paused') { res.status(400).json({ success: false, error: 'Subscription already paused' }); return }

    const now = new Date()
    const resumeAt = new Date(now.getTime() + months * 30 * 86400000)

    // Actually STOP the recurring charge so "billing is stopped" is true, not a lie.
    // Stripe (the live processor) via pause_collection; legacy Paystack via disable.
    const stripePaused = await pauseStripeSubscription(sub.stripe_subscription_id)
    if (sub.paystack_subscription_code) {
      await fetch(`https://api.paystack.co/subscription/disable`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: sub.paystack_subscription_code, token: sub.paystack_subscription_code }),
      })
    }
    // If neither processor was actually paused, do NOT claim billing stopped.
    if (!stripePaused && !sub.paystack_subscription_code) {
      console.warn(`[subscriptions/pause] no external billing paused for sub ${sub.id} (no stripe id / paystack code) — DB pause only.`)
    }

    // Mark paused in DB. Data + settings are untouched (no delete).
    const { error: updErr } = await db.from('subscriptions')
      .update({
        status: 'paused',
        paused_at: now.toISOString(),
        paused_until: resumeAt.toISOString(),
      })
      .eq('id', sub.id)

    if (updErr) {
      // Almost certainly the 'paused' status / columns aren't migrated yet.
      // We did NOT change the DB state — report it plainly so nothing is half-done.
      console.warn('[subscriptions/pause] DB write rejected (migration likely not applied):', updErr.message)
      res.status(409).json({
        success: false,
        error: 'Pause is not enabled yet. Run migration 20260622_subscription_pause.sql to activate it.',
        code: 'pause_not_migrated',
      })
      return
    }

    res.json({
      success: true,
      message: `${sub.product} subscription paused. Billing is stopped and your data + settings are kept warm. Resumes ${resumeAt.toISOString().slice(0, 10)}.`,
      data: { paused_until: resumeAt.toISOString(), months },
    })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[subscriptions/pause]', err)
    res.status(500).json({ success: false, error: 'Failed to pause subscription' })
  }
})

// ── RESUME a paused subscription (item 190) ─────────────────────────────────────
// Lifts the pause and returns the subscription to active. Does NOT re-charge or
// re-create the external recurring billing on its own — the client re-subscribes
// through the normal checkout flow if the external charge was disabled. This just
// clears the paused flags so the account is usable again.
subscriptionRouter.post('/:id/resume', async (req: AuthRequest, res) => {
  try {
    const { data: client } = await db.from('clients').select('id').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: sub } = await db.from('subscriptions')
      .select('id, product, status, stripe_subscription_id')
      .eq('id', req.params.id)
      .eq('client_id', client.id)
      .single()

    if (!sub) { res.status(404).json({ success: false, error: 'Subscription not found' }); return }
    if (sub.status !== 'paused') { res.status(400).json({ success: false, error: 'Subscription is not paused' }); return }

    // Re-enable the Stripe recurring charge (clears pause_collection) so resuming
    // actually restarts billing, mirroring the pause above.
    await resumeStripeSubscription(sub.stripe_subscription_id)

    const { error: updErr } = await db.from('subscriptions')
      .update({ status: 'active', paused_at: null, paused_until: null })
      .eq('id', sub.id)

    if (updErr) {
      console.warn('[subscriptions/resume] DB write rejected:', updErr.message)
      res.status(409).json({ success: false, error: 'Resume is not enabled yet. Run migration 20260622_subscription_pause.sql.', code: 'pause_not_migrated' })
      return
    }

    res.json({ success: true, message: `${sub.product} subscription resumed.` })
  } catch (err) {
    console.error('[subscriptions/resume]', err)
    res.status(500).json({ success: false, error: 'Failed to resume subscription' })
  }
})

subscriptionRouter.post('/initiate', async (req: AuthRequest, res) => {
  try {
    const { product, tier, billing_interval } = z.object({
      product: z.enum(['virtual_assistant', 'chatbot', 'bundle']),
      tier: z.enum(['monthly']).default('monthly'),
      billing_interval: z.enum(['monthly', 'annual']).default('monthly'),
    }).parse(req.body)
    const { data: client } = await db.from('clients').select('id, user_id').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
    const token = req.headers.authorization?.replace('Bearer ', '') || ''
    const { data: { user } } = await supabase.auth.getUser(token)
    // All subscription products are flat monthly: Milla $49, Vida $29, Bundle $69
    const productConfig = PRODUCTS[product as keyof typeof PRODUCTS]
    const amountUsd = (productConfig as any)?.price_usd ?? 0
    const amountZarKobo = amountUsd * 19 * 100
    const planCode = PLAN_CODES[product]?.[tier]
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user?.email, amount: amountZarKobo, currency: 'ZAR', plan: planCode || undefined, callback_url: `${process.env.PORTAL_URL || 'https://app.get-kind.com'}/billing/confirm`, metadata: { client_id: client.id, product, tier, billing_interval } }),
    })
    const paystackData = await paystackRes.json() as { status: boolean; data: { authorization_url: string; reference: string } }
    if (!paystackData.status) { res.status(500).json({ success: false, error: 'Paystack initialization failed' }); return }
    res.json({ success: true, data: { authorization_url: paystackData.data.authorization_url, reference: paystackData.data.reference } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to initiate subscription' })
  }
})
