import { Router } from 'express'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { PURCHASE_TX_TYPES } from '../lib/onboarding-pack'

export const creditRouter = Router()
creditRouter.use(requireAuth)

// ── GET balance + transaction history ─────────────────────────────────────────
creditRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const { data: client } = await db.from('clients')
      .select('id, wallet_balance_usd').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: transactions } = await db.from('credit_transactions')
      .select('*').eq('client_id', client.id)
      .order('created_at', { ascending: false }).limit(50)

    // ONE WALLET — totals in dollars over the FULL ledger. Purchased = top-ups in;
    // spent = every debit (the $4 charges) as a positive dollar figure.
    const { data: ledger } = await db.from('credit_transactions')
      .select('amount, type').eq('client_id', client.id)
    const total_purchased_usd = (ledger ?? []).filter(t => PURCHASE_TX_TYPES.includes(t.type as string)).reduce((s, t) => s + (t.amount ?? 0), 0)
    const total_spent_usd     = (ledger ?? []).filter(t => (t.amount ?? 0) < 0).reduce((s, t) => s + Math.abs(t.amount ?? 0), 0)

    res.json({
      success: true,
      data: {
        wallet_balance_usd:  Number(client.wallet_balance_usd ?? 0),
        total_purchased_usd,
        total_spent_usd,
        transactions:        transactions ?? [],
      },
    })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch credits' }) }
})

// #325 — Paystack credit top-up (/topup + /verify) REMOVED. Manual credit
// purchase runs entirely on Stripe (`POST /stripe/checkout` → the Stripe webhook
// grants credits idempotently). There is no longer a Paystack initialise/verify
// credit-grant path.
