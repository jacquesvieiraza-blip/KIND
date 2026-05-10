import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'

export const authRouter = Router()

const onboardSchema = z.object({
  company_name: z.string().min(2),
  industry: z.string().optional(),
  country: z.string().min(2),
  website: z.string().url().optional(),
  phone: z.string().optional(),
})

// Called after Supabase sign-up to create the client profile
authRouter.post('/onboard', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      res.status(401).json({ success: false, error: 'Missing token' })
      return
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      res.status(401).json({ success: false, error: 'Invalid token' })
      return
    }

    const body = onboardSchema.parse(req.body)

    const { data, error } = await db
      .from('clients')
      .upsert({ user_id: user.id, ...body }, { onConflict: 'user_id' })
      .select()
      .single()

    if (error) throw error

    // Start 14-day trial for lead gen by default
    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + 14)

    await db.from('subscriptions').insert({
      client_id: data.id,
      product: 'lead_gen',
      tier: 'starter',
      status: 'trialing',
      amount_zar: 0,
      trial_ends_at: trialEnd.toISOString(),
      current_period_end: trialEnd.toISOString(),
    })

    res.json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors })
      return
    }
    console.error(err)
    res.status(500).json({ success: false, error: 'Onboarding failed' })
  }
})
