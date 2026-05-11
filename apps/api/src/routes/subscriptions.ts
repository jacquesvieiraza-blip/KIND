import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { PRODUCTS } from '@kind/shared'
import { requireAuth, AuthRequest } from '../middleware/auth'

export const subscriptionRouter = Router()
subscriptionRouter.use(requireAuth)

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!
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
    const { client_id, product, tier, billing_interval } = paystackData.data.metadata
    const tierConfig = PRODUCTS[product as keyof typeof PRODUCTS]?.tiers[tier as keyof object] as { price_usd: number } | undefined
    if (!tierConfig) { res.status(400).json({ success: false, error: 'Invalid product/tier' }); return }
    const amountUsd = tierConfig.price_usd
    await db.from('subscriptions').upsert({
      client_id, product, tier,
      status: 'active',
      billing_interval: billing_interval || 'monthly',
      amount_usd: amountUsd,
      amount_zar: amountUsd * 19,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    }, { onConflict: 'client_id' })
    res.json({ success: true, message: 'Subscription activated' })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Verification failed' })
  }
})

subscriptionRouter.post('/initiate', async (req: AuthRequest, res) => {
  try {
    const { product, tier, billing_interval } = z.object({
      product: z.enum(['lead_gen', 'lead_gen_figsy', 'virtual_assistant', 'chatbot']),
      tier: z.enum(['starter', 'advanced', 'pro', 'enterprise']),
      billing_interval: z.enum(['monthly', 'annual']).default('monthly'),
    }).parse(req.body)
    const { data: client } = await db.from('clients').select('id, user_id').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
    const token = req.headers.authorization?.replace('Bearer ', '') || ''
    const { data: { user } } = await supabase.auth.getUser(token)
    const tierConfig = PRODUCTS[product].tiers[tier as keyof typeof PRODUCTS[typeof product]['tiers']] as { price_usd: number }
    const amountZarKobo = tierConfig.price_usd * 19 * 100
    const planCode = PLAN_CODES[product]?.[tier]
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user?.email, amount: amountZarKobo, currency: 'ZAR', plan: planCode || undefined, callback_url: `${process.env.PORTAL_URL}/billing/confirm`, metadata: { client_id: client.id, product, tier, billing_interval } }),
    })
    const paystackData = await paystackRes.json() as { status: boolean; data: { authorization_url: string; reference: string } }
    if (!paystackData.status) { res.status(500).json({ success: false, error: 'Paystack initialization failed' }); return }
    res.json({ success: true, data: { authorization_url: paystackData.data.authorization_url, reference: paystackData.data.reference } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to initiate subscription' })
  }
})
