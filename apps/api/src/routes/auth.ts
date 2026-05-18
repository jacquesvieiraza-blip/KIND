import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { sendWelcomeEmail } from '../lib/email'

export const authRouter = Router()

const emptyToUndefined = z.string().transform(v => v === '' ? undefined : v)

const onboardSchema = z.object({
  company_name: z.string().min(2),
  industry:     emptyToUndefined.optional(),
  country:      z.string().min(2),
  website:      emptyToUndefined.pipe(z.string().url().optional()),
  phone:        emptyToUndefined.optional(),
  referred_by:  z.string().uuid().optional(),
})

authRouter.post('/onboard', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) { res.status(401).json({ success: false, error: 'Missing token' }); return }
    const { data: { user }, error: authError } = await db.auth.getUser(token)
    if (authError || !user) { res.status(401).json({ success: false, error: 'Invalid token' }); return }
    const { referred_by, ...profileFields } = onboardSchema.parse(req.body)

    let resolvedReferredBy: string | undefined
    if (referred_by) {
      const { data: referrer } = await db.from('clients').select('id').eq('id', referred_by).maybeSingle()
      if (referrer) resolvedReferredBy = referrer.id
    }

    const now = new Date().toISOString()
    const payload = {
      ...profileFields,
      onboarded_at: now,
      ...(resolvedReferredBy ? { referred_by: resolvedReferredBy } : {}),
    }

    // Check if client already exists
    const { data: existing } = await db.from('clients').select('id').eq('user_id', user.id).maybeSingle()

    let clientId: string
    if (existing) {
      // Update existing client
      const { data: updated, error: updateErr } = await db.from('clients')
        .update(payload)
        .eq('user_id', user.id)
        .select()
        .single()
      if (updateErr) throw new Error(`Update failed: ${updateErr.message} (${updateErr.code})`)
      clientId = updated.id
    } else {
      // Insert new client
      const { data: inserted, error: insertErr } = await db.from('clients')
        .insert({ user_id: user.id, ...payload })
        .select()
        .single()
      if (insertErr) throw new Error(`Insert failed: ${insertErr.message} (${insertErr.code})`)
      clientId = inserted.id
    }

    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + 14)
    const { data: existingSub } = await db.from('subscriptions')
      .select('id').eq('client_id', clientId).eq('product', 'lead_gen').maybeSingle()
    if (!existingSub) {
      await db.from('subscriptions').insert({
        client_id: clientId, product: 'lead_gen', tier: 'starter', status: 'trialing',
        amount_usd: 0, amount_zar: 0, trial_ends_at: trialEnd.toISOString(), current_period_end: trialEnd.toISOString(),
      })
    }

    sendWelcomeEmail(user.email!, profileFields.company_name).catch(() => {})
    fetch(`${process.env.API_INTERNAL_URL || `http://localhost:${process.env.PORT || 4000}`}/founder/cs/followup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': process.env.ADMIN_SECRET_KEY || '' },
      body: JSON.stringify({ client_id: clientId, step: 'day1' }),
    }).catch(() => {})

    res.json({ success: true, data: { id: clientId } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[onboard]', err)
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ success: false, error: msg })
  }
})
