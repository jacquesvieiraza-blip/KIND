import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { db } from '@kind/db'

export const paystackRouter = Router()

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!

function verifySignature(req: Request): boolean {
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET)
    .update(req.body)
    .digest('hex')
  return hash === req.headers['x-paystack-signature']
}

paystackRouter.post('/', async (req: Request, res: Response) => {
  if (!verifySignature(req)) {
    res.status(401).json({ error: 'Invalid signature' })
    return
  }

  const event = JSON.parse(req.body.toString())

  // Log every event for audit
  await db.from('paystack_events').insert({
    event_type: event.event,
    payload: event,
  })

  try {
    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data)
        break
      case 'subscription.create':
        await handleSubscriptionCreate(event.data)
        break
      case 'subscription.disable':
        await handleSubscriptionDisable(event.data)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data)
        break
      default:
        break
    }

    await db
      .from('paystack_events')
      .update({ processed: true })
      .eq('payload->>id', event.data?.id || '')
  } catch (err) {
    console.error('Webhook processing error:', err)
  }

  res.sendStatus(200)
})

async function handleChargeSuccess(data: Record<string, unknown>) {
  const metadata = data.metadata as Record<string, string> | null
  if (!metadata?.client_id) return

  const { client_id, product, tier, billing_interval } = metadata

  const periodEnd = new Date()
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  // Upsert subscription to active
  await db.from('subscriptions').upsert(
    {
      client_id,
      product,
      tier,
      status: 'active',
      billing_interval: billing_interval || 'monthly',
      amount_zar: (data.amount as number) || 0,
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd.toISOString(),
    },
    { onConflict: 'client_id,product' }
  )
}

async function handleSubscriptionCreate(data: Record<string, unknown>) {
  const customer = data.customer as Record<string, string>
  const plan = data.plan as Record<string, string>

  if (!customer?.email) return

  const { data: client } = await db
    .from('clients')
    .select('id')
    .eq('user_id', customer.email)
    .single()

  if (!client) return

  await db
    .from('subscriptions')
    .update({
      paystack_subscription_code: data.subscription_code as string,
      paystack_customer_code: customer.customer_code,
      paystack_plan_code: plan?.plan_code,
      status: 'active',
    })
    .eq('client_id', client.id)
}

async function handleSubscriptionDisable(data: Record<string, unknown>) {
  const subscriptionCode = data.subscription_code as string
  if (!subscriptionCode) return

  await db
    .from('subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('paystack_subscription_code', subscriptionCode)
}

async function handlePaymentFailed(data: Record<string, unknown>) {
  const subscriptionCode = (data.subscription as Record<string, string>)?.subscription_code
  if (!subscriptionCode) return

  await db
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('paystack_subscription_code', subscriptionCode)
}
