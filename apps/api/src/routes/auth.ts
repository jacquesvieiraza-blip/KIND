import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { sendWelcomeEmail } from '../lib/email'

export const authRouter = Router()

const onboardSchema = z.object({
  company_name: z.string().min(2),
  industry:     z.string().optional(),
  country:      z.string().min(2),
  website:      z.string().url().optional(),
  phone:        z.string().optional(),
  referred_by:  z.string().uuid().optional(),
})

authRouter.post('/onboard', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) { res.status(401).json({ success: false, error: 'Missing token' }); return }
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) { res.status(401).json({ success: false, error: 'Invalid token' }); return }
    const { referred_by, ...profileFields } = onboardSchema.parse(req.body)

    // Validate referral code points to a real client
    let resolvedReferredBy: string | undefined
    if (referred_by) {
      const { data: referrer } = await db.from('clients').select('id').eq('id', referred_by).maybeSingle()
      if (referrer) resolvedReferredBy = referrer.id
    }

    const { data, error } = await db.from('clients').upsert(
      { user_id: user.id, ...profileFields, ...(resolvedReferredBy ? { referred_by: resolvedReferredBy } : {}) },
      { onConflict: 'user_id' }
    ).select().single()
    if (error) throw error
    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + 14)
    await db.from('subscriptions').insert({
      client_id: data.id, product: 'lead_gen', tier: 'usage', status: 'trialing',
      amount_zar: 0, trial_ends_at: trialEnd.toISOString(), current_period_end: trialEnd.toISOString(),
    })
    // Auto-create a standard order form so the client can sign immediately — no admin action needed
    const billingStart = new Date(trialEnd)
    billingStart.setDate(billingStart.getDate() + 1)
    await db.from('order_forms').upsert({
      client_id:          data.id,
      products:           [{ product: 'lead_gen', tier: 'usage', price_usd: 100, billing_interval: 'monthly' }],
      total_monthly_usd:  100,
      start_date:         billingStart.toISOString().split('T')[0],
      scope_notes:        'AI Lead Generation — usage-based billing. Minimum $100/mo. First 100 leads included; additional leads charged at $1.00/lead.',
      status:             'sent',
      sent_at:            new Date().toISOString(),
      created_by_email:   'system',
    }, { onConflict: 'client_id' })
    sendWelcomeEmail(user.email!, body.company_name).catch(() => {})
    res.json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err)
    res.status(500).json({ success: false, error: 'Onboarding failed' })
  }
})
