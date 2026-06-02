import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { sendWelcomeEmail } from '../lib/email'

export const authRouter = Router()

// ── SIGNUP — bypass email confirmation via admin SDK ──────────────────────────
authRouter.post('/signup', async (req, res) => {
  try {
    const { email, password } = z.object({
      email:    z.string().email(),
      password: z.string().min(6),
    }).parse(req.body)

    const PORTAL = process.env.PORTAL_URL || 'https://kindportal-production.up.railway.app'

    // Create user with admin API — email is auto-confirmed, no email sent
    const { error: createErr } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createErr) {
      // User already exists — generate sign-in link instead
      if (!createErr.message.includes('already')) {
        res.status(400).json({ success: false, error: createErr.message }); return
      }
    }

    // Generate a magic link so the browser auto-signs them in
    const { data: linkData, error: linkErr } = await db.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${PORTAL}/auth/callback?next=/onboard` },
    })
    if (linkErr || !linkData?.properties?.action_link) {
      res.status(500).json({ success: false, error: linkErr?.message || 'Failed to generate sign-in link' }); return
    }

    res.json({ success: true, data: { redirect_url: linkData.properties.action_link } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors[0].message }); return }
    console.error('[auth/signup]', err)
    res.status(500).json({ success: false, error: 'Signup failed' })
  }
})

const emptyToUndefined = z.string().transform(v => v === '' ? undefined : v)

const onboardSchema = z.object({
  company_name: z.string().min(2),
  industry:     emptyToUndefined.optional(),
  country:      z.string().min(2),
  website:      emptyToUndefined.pipe(z.string().url().optional()),
  phone:        emptyToUndefined.optional(),
  // Accept ANY ref value: a client UUID (client referral) OR an 8-char partner
  // code. Validating as uuid() here used to 400 every partner-link signup.
  referred_by:  emptyToUndefined.optional(),
})

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

authRouter.post('/onboard', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) { res.status(401).json({ success: false, error: 'Missing token' }); return }
    const { data: { user }, error: authError } = await db.auth.getUser(token)
    if (authError || !user) { res.status(401).json({ success: false, error: 'Invalid token' }); return }
    const { referred_by, ...profileFields } = onboardSchema.parse(req.body)

    // A ref can be a client UUID (client referral) or an 8-char partner code.
    let resolvedReferredBy: string | undefined   // client referrer id
    let partnerRef: { partner_id: string; code: string } | undefined
    if (referred_by) {
      if (UUID_RE.test(referred_by)) {
        const { data: referrer } = await db.from('clients').select('id').eq('id', referred_by).maybeSingle()
        if (referrer) resolvedReferredBy = referrer.id
      } else {
        // Treat as a partner referral code — record attribution after client exists.
        const { data: partner } = await db.from('partners')
          .select('id').eq('referral_code', referred_by).maybeSingle()
        if (partner) partnerRef = { partner_id: partner.id, code: referred_by }
      }
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

    // Record partner referral attribution (idempotent — unique(client_id)).
    if (partnerRef) {
      await db.from('partner_referrals').upsert({
        partner_id:    partnerRef.partner_id,
        client_id:     clientId,
        referral_code: partnerRef.code,
        status:        'trial',
      }, { onConflict: 'client_id' }).then(() => {}, () => {})
    }

    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + 14)
    const { data: existingSub } = await db.from('subscriptions')
      .select('id').eq('client_id', clientId).eq('product', 'lead_gen').maybeSingle()
    if (!existingSub) {
      const { error: subErr } = await db.from('subscriptions').insert({
        client_id: clientId, product: 'lead_gen', tier: 'starter', status: 'trialing',
        billing_interval: 'monthly',
        amount_zar: 0,
        trial_ends_at: trialEnd.toISOString(),
        current_period_start: now, current_period_end: trialEnd.toISOString(),
      })
      if (subErr) throw new Error(`Subscription insert failed: ${subErr.message} (${subErr.code})`)

      // Grant 20 free trial credits so new clients can immediately run their first ICP search
      await db.from('clients').update({ credit_balance: 20 }).eq('id', clientId)
      try {
        await db.from('credit_transactions').insert({
          client_id: clientId,
          amount: 20,
          type: 'trial_bonus',
          note: '14-day free trial — 20 starter credits',
          created_at: now,
        })
      } catch { /* non-critical — don't fail signup */ }
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
