import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'

export const creditRouter = Router()
creditRouter.use(requireAuth)

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!

const BUNDLES = {
  kind_ai: { 20: 20, 40: 40, 100: 100 },
  figsy:   { 20: 60, 40: 120, 100: 300 },
} as const

// ── GET balance + transaction history ─────────────────────────────────────────
creditRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const { data: client } = await db.from('clients')
      .select('id, credit_balance').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: transactions } = await db.from('credit_transactions')
      .select('*').eq('client_id', client.id)
      .order('created_at', { ascending: false }).limit(50)

    res.json({ success: true, data: { balance: client.credit_balance ?? 0, transactions: transactions ?? [] } })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch credits' }) }
})

// ── INITIATE top-up ────────────────────────────────────────────────────────────
creditRouter.post('/topup', async (req: AuthRequest, res) => {
  try {
    const { plan, bundle_size } = z.object({
      plan:        z.enum(['kind_ai', 'figsy']),
      bundle_size: z.union([z.literal(20), z.literal(40), z.literal(100)]),
    }).parse(req.body)

    const { data: client } = await db.from('clients')
      .select('id').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
    const token = req.headers.authorization?.replace('Bearer ', '') || ''
    const { data: { user } } = await supabase.auth.getUser(token)

    const amountUsd = BUNDLES[plan][bundle_size]
    const amountZarKobo = amountUsd * 19 * 100

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:        user?.email,
        amount:       amountZarKobo,
        currency:     'ZAR',
        callback_url: `${process.env.PORTAL_URL}/billing/confirm?type=credit`,
        metadata:     { client_id: client.id, type: 'credit_purchase', plan, bundle_size, amount_usd: amountUsd },
      }),
    })

    const paystackData = await paystackRes.json() as { status: boolean; data: { authorization_url: string; reference: string } }
    if (!paystackData.status) { res.status(500).json({ success: false, error: 'Paystack initialization failed' }); return }

    res.json({ success: true, data: { authorization_url: paystackData.data.authorization_url } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to initiate top-up' })
  }
})

// ── VERIFY + apply credits ─────────────────────────────────────────────────────
creditRouter.post('/verify', async (req: AuthRequest, res) => {
  try {
    const { reference } = z.object({ reference: z.string().min(1) }).parse(req.body)

    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    })
    const paystackData = await paystackRes.json() as {
      status: boolean
      data: { status: string; metadata: { client_id: string; plan: string; bundle_size: number; amount_usd: number; type: string } }
    }

    if (!paystackData.status || paystackData.data.status !== 'success') {
      res.status(400).json({ success: false, error: 'Payment not successful' }); return
    }

    const { client_id, plan, bundle_size } = paystackData.data.metadata

    // Idempotency: skip if reference already processed
    const { data: existing } = await db.from('credit_transactions')
      .select('id').eq('reference', reference).maybeSingle()
    if (existing) { res.json({ success: true, message: 'Already processed' }); return }

    const { data: client } = await db.from('clients')
      .select('id, credit_balance').eq('id', client_id).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const newBalance = (client.credit_balance ?? 0) + Number(bundle_size)

    await Promise.all([
      db.from('clients').update({ credit_balance: newBalance }).eq('id', client_id),
      db.from('credit_transactions').insert({
        client_id,
        type:      'purchase',
        amount:    Number(bundle_size),
        plan:      plan || null,
        reference,
        note:      `Purchased ${bundle_size} credits (${plan})`,
      }),
    ])

    res.json({ success: true, data: { credits_added: Number(bundle_size), new_balance: newBalance } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Verification failed' })
  }
})
