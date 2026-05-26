/**
 * Flutterwave payment routes — Phase 2 African payments
 * Mount in index.ts: app.use('/flutterwave', flutterwaveRouter)
 *
 * Endpoints:
 *   POST /flutterwave/initiate  — auth-protected, creates a hosted payment link
 *   POST /flutterwave/webhook   — public, handles charge.completed events
 */

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { createFlutterwavePaymentLink, verifyFlutterwavePayment } from '../lib/flutterwave'

export const flutterwaveRouter = Router()

// Plan config ─────────────────────────────────────────────────────────────────
const PLAN_CONFIG = {
  leadgen_20:  { credits: 20,  amount_usd: 20,  plan: 'kind_ai' as const },
  leadgen_100: { credits: 100, amount_usd: 100, plan: 'kind_ai' as const },
  figsy_20:    { credits: 20,  amount_usd: 60,  plan: 'figsy'   as const },
  figsy_100:   { credits: 100, amount_usd: 300, plan: 'figsy'   as const },
} as const

type PlanKey = keyof typeof PLAN_CONFIG

const initiateSchema = z.object({
  plan: z.enum(['leadgen_20', 'leadgen_100', 'figsy_20', 'figsy_100']),
  currency: z.enum(['ZAR', 'NGN', 'KES', 'GHS', 'USD', 'GBP']),
})

// ── POST /flutterwave/initiate ────────────────────────────────────────────────
flutterwaveRouter.post('/initiate', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!process.env.FLUTTERWAVE_SECRET_KEY) {
    res.status(200).json({ error: 'Flutterwave not configured', configured: false })
    return
  }

  try {
    const { plan, currency } = initiateSchema.parse(req.body)
    const planConf = PLAN_CONFIG[plan as PlanKey]

    // Resolve client record
    const { data: client } = await db
      .from('clients')
      .select('id')
      .eq('user_id', req.userId!)
      .single()

    if (!client) {
      res.status(404).json({ success: false, error: 'Client not found' })
      return
    }

    // Resolve client email via Supabase auth
    const token = req.headers.authorization?.replace('Bearer ', '') || ''
    const { data: authData } = await db.auth.getUser(token)
    const email = authData?.user?.email || ''
    const name  = authData?.user?.user_metadata?.full_name || email

    const portalUrl = process.env.PORTAL_URL || 'https://app.get-kind.com'
    const tx_ref    = `kind-${plan}-${client.id}-${Date.now()}`

    const result = await createFlutterwavePaymentLink({
      email,
      name,
      amount_usd: planConf.amount_usd,
      currency,
      tx_ref,
      redirect_url: `${portalUrl}/dashboard/billing?flutterwave=success`,
      meta: {
        client_id: client.id,
        plan,
        credits: planConf.credits,
        credit_type: planConf.plan,
      },
    })

    if (!result) {
      res.status(500).json({ success: false, error: 'Failed to create Flutterwave payment link' })
      return
    }

    res.json({ success: true, link: result.link })
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors })
      return
    }
    console.error('[Flutterwave] /initiate error:', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// ── POST /flutterwave/webhook ─────────────────────────────────────────────────
flutterwaveRouter.post('/webhook', async (req: Request, res: Response) => {
  // Verify webhook hash
  const webhookHash = process.env.FLUTTERWAVE_WEBHOOK_HASH
  const receivedHash = req.headers['verif-hash']

  if (webhookHash && receivedHash !== webhookHash) {
    console.warn('[Flutterwave] Webhook: invalid verif-hash, ignoring')
    res.sendStatus(200) // always 200 to avoid retries
    return
  }

  try {
    const event = req.body as {
      event?: string
      data?: {
        id?: number | string
        status?: string
        meta?: Record<string, string | number>
      }
    }

    if (event.event === 'charge.completed' && event.data?.status === 'successful') {
      const transactionId = String(event.data.id || '')
      const meta = event.data.meta as Record<string, string | number> | undefined

      const clientId   = meta?.client_id   ? String(meta.client_id)   : null
      const plan       = meta?.plan        ? String(meta.plan)         : null
      const credits    = meta?.credits     ? Number(meta.credits)      : null
      const creditType = meta?.credit_type ? String(meta.credit_type)  : 'kind_ai'

      if (!clientId || !plan || !credits || credits <= 0) {
        console.error('[Flutterwave] Webhook: missing or invalid meta', meta)
        res.sendStatus(200)
        return
      }

      // Optionally verify the transaction via API (adds extra assurance)
      if (transactionId && process.env.FLUTTERWAVE_SECRET_KEY) {
        const verified = await verifyFlutterwavePayment(transactionId)
        if (!verified || verified.status !== 'successful') {
          console.error('[Flutterwave] Webhook: transaction verification failed', transactionId)
          res.sendStatus(200)
          return
        }
      }

      // Update credit balance
      const { data: clientRow } = await db
        .from('clients')
        .select('id, credit_balance, figsy_credits_remaining')
        .eq('id', clientId)
        .single()

      if (!clientRow) {
        console.error('[Flutterwave] Webhook: client not found:', clientId)
        res.sendStatus(200)
        return
      }

      if (creditType === 'figsy') {
        const newBalance = (clientRow.figsy_credits_remaining ?? 0) + credits
        await Promise.all([
          db.from('clients')
            .update({ figsy_credits_remaining: newBalance })
            .eq('id', clientId),
          db.from('credit_transactions').insert({
            client_id: clientId,
            type:      'purchase',
            amount:    credits,
            plan:      'figsy',
            reference: transactionId,
            note:      `Purchased ${credits} FIGSY credits via Flutterwave (${plan})`,
          }),
        ])
      } else {
        const newBalance = (clientRow.credit_balance ?? 0) + credits
        await Promise.all([
          db.from('clients')
            .update({ credit_balance: newBalance })
            .eq('id', clientId),
          db.from('credit_transactions').insert({
            client_id: clientId,
            type:      'purchase',
            amount:    credits,
            plan:      'kind_ai',
            reference: transactionId,
            note:      `Purchased ${credits} lead gen credits via Flutterwave (${plan})`,
          }),
        ])
      }

      // Update subscription if applicable
      try {
        const periodEnd = new Date()
        periodEnd.setMonth(periodEnd.getMonth() + 1)
        await db.from('subscriptions').upsert(
          {
            client_id:            clientId,
            product:              creditType === 'figsy' ? 'figsy' : 'kind_ai',
            tier:                 plan,
            status:               'active',
            billing_interval:     'monthly',
            amount_zar:           0, // amount in local currency not stored here
            current_period_start: new Date().toISOString(),
            current_period_end:   periodEnd.toISOString(),
          },
          { onConflict: 'client_id,product' },
        )
      } catch (subErr) {
        // Non-fatal: subscription upsert failures should not block credit grant
        console.error('[Flutterwave] Webhook: subscription upsert error:', subErr)
      }

      console.log(`[Flutterwave] Webhook: credited ${credits} (${creditType}) to client ${clientId}`)
    }
  } catch (err) {
    console.error('[Flutterwave] Webhook handler error:', err)
  }

  res.sendStatus(200)
})
