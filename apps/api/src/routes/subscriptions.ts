import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { PRODUCTS } from '@kind/shared'
import { requireAuth, AuthRequest } from '../middleware/auth'

export const subscriptionRouter = Router()
subscriptionRouter.use(requireAuth)

if (!process.env.PAYSTACK_SECRET_KEY) throw new Error('PAYSTACK_SECRET_KEY is required')
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY
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
      amount_zar: Math.round(amountUsd * 19),
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
