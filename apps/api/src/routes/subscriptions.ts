import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { PRODUCTS } from '@kind/shared'
import { requireAuth, AuthRequest } from '../middleware/auth'

export const subscriptionRouter = Router()

subscriptionRouter.use(requireAuth)

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!

// Paystack plan codes — set these after creating plans in Paystack dashboard
const PLAN_CODES: Record<string, Record<string, string>> = {
  lead_gen: {
    starter: process.env.PAYSTACK_PLAN_LEAD_GEN_STARTER || '',
    pro: process.env.PAYSTACK_PLAN_LEAD_GEN_PRO || '',
    enterprise: process.env.PAYSTACK_PLAN_LEAD_GEN_ENTERPRISE || '',
  },
  virtual_assistant: {
    starter: process.env.PAYSTACK_PLAN_VA_STARTER || '',
    pro: process.env.PAYSTACK_PLAN_VA_PRO || '',
    enterprise: process.env.PAYSTACK_PLAN_VA_ENTERPRISE || '',
  },
  chatbot: {
    starter: process.env.PAYSTACK_PLAN_CHATBOT_STARTER || '',
    pro: process.env.PAYSTACK_PLAN_CHATBOT_PRO || '',
    enterprise: process.env.PAYSTACK_PLAN_CHATBOT_ENTERPRISE || '',
  },
  consulting: {
    pro: process.env.PAYSTACK_PLAN_CONSULTING_PRO || '',
    enterprise: process.env.PAYSTACK_PLAN_CONSULTING_ENTERPRISE || '',
  },
}

// GET /subscriptions — get all subscriptions for this client
subscriptionRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const { data: client } = await db
      .from('clients')
      .select('id')
      .eq('user_id', req.userId!)
      .single()

    if (!client) {
      res.status(404).json({ success: false, error: 'Client not found' })
      return
    }

    const { data } = await db
      .from('subscriptions')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })

    res.json({ success: true, data })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to fetch subscriptions' })
  }
})

const initiateSchema = z.object({
  product: z.enum(['lead_gen', 'virtual_assistant', 'chatbot', 'consulting']),
  tier: z.enum(['starter', 'pro', 'enterprise']),
  billing_interval: z.enum(['monthly', 'annual']).default('monthly'),
})

// POST /subscriptions/initiate — create Paystack checkout URL
subscriptionRouter.post('/initiate', async (req: AuthRequest, res) => {
  try {
    const { product, tier, billing_interval } = initiateSchema.parse(req.body)

    const { data: client } = await db
      .from('clients')
      .select('id, user_id')
      .eq('user_id', req.userId!)
      .single()

    if (!client) {
      res.status(404).json({ success: false, error: 'Client not found' })
      return
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const token = req.headers.authorization?.replace('Bearer ', '') || ''
    const { data: { user } } = await supabase.auth.getUser(token)

    const productConfig = PRODUCTS[product]
    const tierConfig = productConfig.tiers[tier as keyof typeof productConfig.tiers] as { price_usd: number }
    const amountUsd = tierConfig.price_usd

    // Convert USD to ZAR (multiply by ~19, fetched from exchange API in production)
    const USD_TO_ZAR = 19
    const amountZarKobo = amountUsd * USD_TO_ZAR * 100

    const planCode = PLAN_CODES[product]?.[tier]

    // Initialize Paystack transaction
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user?.email,
        amount: amountZarKobo,
        currency: 'ZAR',
        plan: planCode || undefined,
        callback_url: `${process.env.PORTAL_URL}/billing/confirm`,
        metadata: {
          client_id: client.id,
          product,
          tier,
          billing_interval,
        },
      }),
    })

    const paystackData = await paystackRes.json() as { status: boolean; data: { authorization_url: string; reference: string } }

    if (!paystackData.status) {
      res.status(500).json({ success: false, error: 'Paystack initialization failed' })
      return
    }

    res.json({
      success: true,
      data: {
        authorization_url: paystackData.data.authorization_url,
        reference: paystackData.data.reference,
      },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors })
      return
    }
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to initiate subscription' })
  }
})

// POST /subscriptions/topup — purchase extra lead quota
subscriptionRouter.post('/topup', async (req: AuthRequest, res) => {
  try {
    const { quantity } = z.object({
      quantity: z.number().int().refine((n) => [20, 40, 60].includes(n), 'Must be 20, 40, or 60'),
    }).parse(req.body)

    const { data: client } = await db
      .from('clients')
      .select('id')
      .eq('user_id', req.userId!)
      .single()

    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const token = req.headers.authorization?.replace('Bearer ', '') || ''
    const { data: { user } } = await supabase.auth.getUser(token)

    // R449 per 20 leads
    const amountZarKobo = (quantity / 20) * 44900

    const { data: topup } = await db
      .from('lead_topups')
      .insert({ client_id: client.id, quantity, amount_zar: Math.round(amountZarKobo / 100), status: 'pending' })
      .select()
      .single()

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user?.email,
        amount: Math.round(amountZarKobo),
        currency: 'ZAR',
        callback_url: `${process.env.PORTAL_URL}/dashboard/leads?topup=success`,
        metadata: { client_id: client.id, topup_id: topup?.id, quantity },
      }),
    })

    const paystackData = await paystackRes.json() as { status: boolean; data: { authorization_url: string; reference: string } }

    if (!paystackData.status) {
      res.status(500).json({ success: false, error: 'Paystack initialization failed' })
      return
    }

    // Store paystack reference
    if (topup) {
      await db.from('lead_topups').update({ paystack_reference: paystackData.data.reference }).eq('id', topup.id)
    }

    res.json({ success: true, data: { authorization_url: paystackData.data.authorization_url, reference: paystackData.data.reference } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to initiate top-up' })
  }
})

// GET /subscriptions/quota — current lead generation quota
subscriptionRouter.get('/quota', async (req: AuthRequest, res) => {
  try {
    const { data: client } = await db.from('clients').select('id').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: sub } = await db
      .from('subscriptions')
      .select('tier, extra_lead_quota')
      .eq('client_id', client.id)
      .eq('product', 'lead_gen')
      .in('status', ['trialing', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const tierLimits: Record<string, number> = { starter: 20, pro: 40, enterprise: 100 }
    const tier = sub?.tier ?? 'starter'
    const base = tierLimits[tier] ?? 20
    const extra = sub?.extra_lead_quota ?? 0

    const { count: leadsThisMonth } = await db
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', client.id)
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

    const used = leadsThisMonth ?? 0
    const total = base + extra
    const remaining = Math.max(0, total - used)

    res.json({ success: true, data: { tier, base, extra, total, used, remaining } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to fetch quota' })
  }
})

// POST /subscriptions/cancel — cancel a subscription
subscriptionRouter.post('/cancel', async (req: AuthRequest, res) => {
  try {
    const { subscription_id } = z.object({ subscription_id: z.string().uuid() }).parse(req.body)

    const { data: client } = await db
      .from('clients')
      .select('id')
      .eq('user_id', req.userId!)
      .single()

    if (!client) {
      res.status(404).json({ success: false, error: 'Client not found' })
      return
    }

    const { data: sub } = await db
      .from('subscriptions')
      .select('*')
      .eq('id', subscription_id)
      .eq('client_id', client.id)
      .single()

    if (!sub) {
      res.status(404).json({ success: false, error: 'Subscription not found' })
      return
    }

    // Cancel on Paystack side if subscription code exists
    if (sub.paystack_subscription_code) {
      await fetch(`https://api.paystack.co/subscription/disable`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: sub.paystack_subscription_code,
          token: sub.paystack_customer_code,
        }),
      })
    }

    await db
      .from('subscriptions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', subscription_id)

    res.json({ success: true, data: { cancelled: true } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Cancel failed' })
  }
})
