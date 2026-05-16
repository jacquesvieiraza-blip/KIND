// Mount in index.ts: app.use('/stripe', stripeRouter)
// Also add: app.use('/webhooks/stripe', express.raw({ type: 'application/json' })) BEFORE app.use(express.json())

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import {
  isStripeConfigured,
  createCheckoutSession,
  constructWebhookEvent,
  getStripePriceId,
} from '../lib/stripe'

export const stripeRouter = Router()

// ── GET /stripe/status — is Stripe configured? ────────────────────────────────
stripeRouter.get('/status', requireAuth, (_req: Request, res: Response) => {
  res.json({ configured: isStripeConfigured() })
})

// ── POST /stripe/checkout — initiate a Stripe Checkout session ────────────────
stripeRouter.post('/checkout', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!isStripeConfigured()) {
    res.status(200).json({ error: 'Stripe not configured', configured: false })
    return
  }

  try {
    const { priceId, credits, creditType } = z.object({
      priceId:    z.string().min(1),
      credits:    z.number().int().positive(),
      creditType: z.enum(['lead_gen', 'figsy']),
    }).parse(req.body)

    // Validate that priceId matches our known configured price IDs
    const expectedPriceId = getStripePriceId(creditType, credits)
    if (expectedPriceId && expectedPriceId !== priceId) {
      res.status(400).json({ success: false, error: 'Price ID does not match credit type and quantity' })
      return
    }

    const { data: client } = await db.from('clients')
      .select('id').eq('user_id', req.userId!).single()
    if (!client) {
      res.status(404).json({ success: false, error: 'Client not found' })
      return
    }

    const token = req.headers.authorization?.replace('Bearer ', '') || ''
    const { data: { user } } = await db.auth.getUser(token)
    const clientEmail = user?.email || ''

    const portalUrl = process.env.PORTAL_URL || 'https://app.get-kind.com'
    const url = await createCheckoutSession({
      clientId:   client.id,
      priceId,
      credits,
      creditType,
      clientEmail,
      successUrl: `${portalUrl}/dashboard/billing?stripe=success`,
      cancelUrl:  `${portalUrl}/dashboard/billing?stripe=cancelled`,
    })

    if (!url) {
      res.status(500).json({ success: false, error: 'Failed to create Stripe Checkout session' })
      return
    }

    res.json({ success: true, url })
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors })
      return
    }
    console.error('[Stripe] /checkout error:', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// ── POST /stripe/webhook — raw body, public endpoint ─────────────────────────
stripeRouter.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature']
  if (!sig || typeof sig !== 'string') {
    res.status(400).json({ error: 'Missing stripe-signature header' })
    return
  }

  const event = constructWebhookEvent(req.body as Buffer, sig)
  if (!event) {
    res.status(400).json({ error: 'Webhook signature verification failed' })
    return
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as {
        metadata?: { clientId?: string; credits?: string; creditType?: string }
      }
      const { clientId, credits: creditsStr, creditType } = session.metadata || {}

      if (!clientId || !creditsStr || !creditType) {
        console.error('[Stripe] Webhook: missing metadata', session.metadata)
        res.sendStatus(200)
        return
      }

      const credits = parseInt(creditsStr, 10)
      if (isNaN(credits) || credits <= 0) {
        console.error('[Stripe] Webhook: invalid credits in metadata:', creditsStr)
        res.sendStatus(200)
        return
      }

      const { data: client } = await db.from('clients')
        .select('id, credit_balance, figsy_credits_remaining')
        .eq('id', clientId)
        .single()

      if (!client) {
        console.error('[Stripe] Webhook: client not found:', clientId)
        res.sendStatus(200)
        return
      }

      if (creditType === 'figsy') {
        const newBalance = (client.figsy_credits_remaining ?? 0) + credits
        await Promise.all([
          db.from('clients').update({ figsy_credits_remaining: newBalance }).eq('id', clientId),
          db.from('credit_transactions').insert({
            client_id: clientId,
            type:      'purchase',
            amount:    credits,
            plan:      'figsy',
            reference: (event.data.object as { id: string }).id,
            note:      `Purchased ${credits} FIGSY credits via Stripe`,
          }),
        ])
      } else {
        // lead_gen
        const newBalance = (client.credit_balance ?? 0) + credits
        await Promise.all([
          db.from('clients').update({ credit_balance: newBalance }).eq('id', clientId),
          db.from('credit_transactions').insert({
            client_id: clientId,
            type:      'purchase',
            amount:    credits,
            plan:      'kind_ai',
            reference: (event.data.object as { id: string }).id,
            note:      `Purchased ${credits} lead gen credits via Stripe`,
          }),
        ])
      }
    }
  } catch (err) {
    console.error('[Stripe] Webhook handler error:', err)
  }

  res.sendStatus(200)
})
