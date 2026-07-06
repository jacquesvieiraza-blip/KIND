import { Router } from 'express'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'

export const creditRouter = Router()
creditRouter.use(requireAuth)

// ── GET balance + transaction history ─────────────────────────────────────────
creditRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const { data: client } = await db.from('clients')
      .select('id, credit_balance, figsy_credits_remaining').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: transactions } = await db.from('credit_transactions')
      .select('*').eq('client_id', client.id)
      .order('created_at', { ascending: false }).limit(50)

    // Totals must be computed over the FULL ledger, not the 50-row display slice —
    // otherwise "Credits purchased / used" on the usage page silently cap at ~50
    // and never reconcile with the balance (fixes #55d demo incoherence).
    const { data: ledger } = await db.from('credit_transactions')
      .select('amount, type').eq('client_id', client.id)
    const total_purchased = (ledger ?? []).filter(t => t.type === 'purchase').reduce((s, t) => s + (t.amount ?? 0), 0)
    const total_used       = (ledger ?? []).filter(t => (t.amount ?? 0) < 0).reduce((s, t) => s + Math.abs(t.amount ?? 0), 0)

    res.json({
      success: true,
      data: {
        balance:                  client.credit_balance ?? 0,
        figsy_credits_remaining:  client.figsy_credits_remaining ?? 0,
        total_purchased,
        total_used,
        transactions:             transactions ?? [],
      },
    })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch credits' }) }
})

// #325 — Paystack credit top-up (/topup + /verify) REMOVED. Manual credit
// purchase runs entirely on Stripe (`POST /stripe/checkout` → the Stripe webhook
// grants credits idempotently). There is no longer a Paystack initialise/verify
// credit-grant path.
