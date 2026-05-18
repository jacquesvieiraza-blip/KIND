import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'

export const creditRouter = Router()
creditRouter.use(requireAuth)

if (!process.env.PAYSTACK_SECRET_KEY) throw new Error('PAYSTACK_SECRET_KEY is required')
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY

const BUNDLES: Record<'kind_ai' | 'figsy', Record<number, number>> = {
  kind_ai: { 10: 12, 20: 20, 40: 38, 75: 68, 100: 88, 200: 160, 500: 375 },
  figsy:   { 10: 35, 20: 60, 40: 110, 75: 195, 100: 250, 200: 460, 500: 1100 },
}

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
    const { plan, bundle_size, terms_accepted } = z.object({
      plan:           z.enum(['kind_ai', 'figsy']),
      bundle_size:    z.number().int().positive(),
      terms_accepted: z.boolean().optional(),
    }).parse(req.body)

    const amountUsd = BUNDLES[plan][bundle_size]
    if (!amountUsd) { res.status(400).json({ success: false, error: 'Invalid bundle size' }); return }

    const { data: client } = await db.from('clients')
      .select('id, terms_accepted_at').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Record T&C acceptance on first purchase if ticked
    if (terms_accepted && !client.terms_accepted_at) {
      const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || ''
      await db.from('clients').update({
        terms_accepted_at: new Date().toISOString(),
        terms_accepted_ip: ip,
      }).eq('id', client.id)
    }

    const token = req.headers.authorization?.replace('Bearer ', '') || ''
    const { data: { user } } = await db.auth.getUser(token)
    const amountZarKobo = Math.round(amountUsd * 19 * 100)

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:        user?.email,
        amount:       amountZarKobo,
        currency:     'ZAR',
        callback_url: `${process.env.PORTAL_URL || 'https://app.get-kind.com'}/billing/confirm?type=credit`,
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
      data: { status: string; metadata: { client_id: string; plan: string; bundle_size: number; amount_usd: number; type: string }; authorization?: { reusable: boolean; authorization_code: string } }
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

    // Store auth code for auto top-up if present
    if (paystackData.data.authorization?.reusable && paystackData.data.authorization?.authorization_code) {
      await db.from('clients').update({
        auto_topup_paystack_auth: paystackData.data.authorization.authorization_code,
      }).eq('id', client_id)
    }

    res.json({ success: true, data: { credits_added: Number(bundle_size), new_balance: newBalance } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Verification failed' })
  }
})
