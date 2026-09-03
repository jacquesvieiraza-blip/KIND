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

    // ⚑ 3 Sep (C2) — DOES THE WALLET GOVERN THIS CLIENT AT ALL? The wallet endpoint is the
    // right place to answer it: every caller of this route is about to render a balance, a
    // top-up button or a per-lead price, and all three are legacy-model statements. A
    // programme client reading them is being shown a product they are not on.
    //
    // ⚠️ THE BALANCE IS STILL RETURNED. It is a real stored number and hiding it would make
    // this route lie in the other direction; what is added is whether it applies.
    const { clientCommercialModel, mayUseLegacyCommercialPath } = await import('../lib/commercial-model')
    const model = await clientCommercialModel(client.id)

    res.json({
      success: true,
      data: {
        wallet_balance_usd:  Number(client.wallet_balance_usd ?? 0),
        total_purchased_usd,
        total_spent_usd,
        transactions:        transactions ?? [],
        // `false` for a programme client AND for an unresolvable one: a surface that cannot
        // be told the model must not present the pack, the top-ups or the $4 price.
        wallet_applies:      mayUseLegacyCommercialPath(model),
        commercial_model:    model.model,
      },
    })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch credits' }) }
})

// #325 — Paystack credit top-up (/topup + /verify) REMOVED. Manual credit
// purchase runs entirely on Stripe (`POST /stripe/checkout` → the Stripe webhook
// grants credits idempotently). There is no longer a Paystack initialise/verify
// credit-grant path.
