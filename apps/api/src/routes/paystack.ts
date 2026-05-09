import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { db } from '@kind/db'

export const paystackRouter = Router()
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!

function verifySignature(req: Request): boolean {
  const hash = crypto.createHmac('sha512', PAYSTACK_SECRET).update(req.body).digest('hex')
  return hash === req.headers['x-paystack-signature']
}

paystackRouter.post('/', async (req: Request, res: Response) => {
  if (!verifySignature(req)) { res.status(401).json({ error: 'Invalid signature' }); return }
  const event = JSON.parse(req.body.toString())
  await db.from('paystack_events').insert({ event_type: event.event, payload: event })
  try {
    switch (event.event) {
      case 'charge.success': await handleChargeSuccess(event.data); break
      case 'subscription.disable': await handleSubscriptionDisable(event.data); break
      case 'invoice.payment_failed': await handlePaymentFailed(event.data); break
    }
  } catch (err) { console.error('Webhook error:', err) }
  res.sendStatus(200)
})

async function handleChargeSuccess(data: Record<string, unknown>) {
  const metadata = data.metadata as Record<string, string> | null
  if (!metadata?.client_id) return
  const periodEnd = new Date()
  periodEnd.setMonth(periodEnd.getMonth() + 1)
  await db.from('subscriptions').upsert({ client_id: metadata.client_id, product: metadata.product, tier: metadata.tier, status: 'active', billing_interval: metadata.billing_interval || 'monthly', amount_zar: (data.amount as number) || 0, current_period_start: new Date().toISOString(), current_period_end: periodEnd.toISOString() }, { onConflict: 'client_id,product' })
}

async function handleSubscriptionDisable(data: Record<string, unknown>) {
  const code = data.subscription_code as string
  if (!code) return
  await db.from('subscriptions').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('paystack_subscription_code', code)
}

async function handlePaymentFailed(data: Record<string, unknown>) {
  const code = (data.subscription as Record<string, string>)?.subscription_code
  if (!code) return
  await db.from('subscriptions').update({ status: 'past_due' }).eq('paystack_subscription_code', code)
}
