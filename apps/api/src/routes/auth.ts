import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { sendWelcomeEmail } from '../lib/email'
import { sendFounderAlert } from '../lib/alerts'
import { rateLimit } from '../lib/rate-limit'

export const authRouter = Router()

// ── SIGNUP — bypass email confirmation via admin SDK ──────────────────────────
authRouter.post('/signup', rateLimit({ limit: 10, windowMs: 60_000, key: 'signup' }), async (req, res) => {
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

    // Email is auto-confirmed above (email_confirm: true) → no email sent. The
    // portal signs the user in directly with the password. We deliberately do NOT
    // generate an admin magic link: server-generated links can't be PKCE-exchanged
    // by /auth/callback (exchangeCodeForSession needs a client-side code_verifier
    // that doesn't exist) → every signup hit "confirmation_failed" (the T1 bug).
    res.json({ success: true, data: { redirect_url: `${PORTAL}/onboard` } })
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
  // Item 186 — the signup T&C tick. Stored as a binding consent record at account
  // creation so even a trial user who never pays has proof of acceptance.
  terms_accepted: z.boolean().optional(),
})

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

authRouter.post('/onboard', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) { res.status(401).json({ success: false, error: 'Missing token' }); return }
    const { data: { user }, error: authError } = await db.auth.getUser(token)
    if (authError || !user) { res.status(401).json({ success: false, error: 'Invalid token' }); return }
    const { referred_by, terms_accepted, ...profileFields } = onboardSchema.parse(req.body)

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

    // Check if client already exists (and whether signup consent is already on record).
    const { data: existing } = await db.from('clients')
      .select('id, signup_terms_accepted_at').eq('user_id', user.id).maybeSingle()

    // P4 — self-referral loophole: a client can never be their own referrer. Ignore
    // the ref when it resolves to the caller's own client row.
    if (resolvedReferredBy && existing && resolvedReferredBy === existing.id) {
      resolvedReferredBy = undefined
    }

    // Item 186 — record the signup T&C tick once, at account creation. Never overwrite
    // an existing consent timestamp (the first acceptance is the binding one).
    const recordSignupTerms = terms_accepted === true && !existing?.signup_terms_accepted_at
    const signupTermsFields = recordSignupTerms
      ? {
          signup_terms_accepted_at: now,
          signup_terms_accepted_ip:
            req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || '',
        }
      : {}

    // P4 — referred_by is attribution set ONCE, at creation. Never in the shared
    // payload: an existing client re-onboarding must NEVER change/overwrite who
    // referred them (that would let a client rewrite attribution after the fact).
    const payload = {
      ...profileFields,
      onboarded_at: now,
      ...signupTermsFields,
    }

    let clientId: string
    if (existing) {
      // Update existing client — deliberately WITHOUT referred_by (see P4 above).
      const { data: updated, error: updateErr } = await db.from('clients')
        .update(payload)
        .eq('user_id', user.id)
        .select()
        .single()
      if (updateErr) throw new Error(`Update failed: ${updateErr.message} (${updateErr.code})`)
      clientId = updated.id
    } else {
      // Insert new client. plan='figsy' — the single live product (#284; lead_gen
      // retired). Set on INSERT only, so a re-onboarding legacy lead_gen client is
      // never silently re-planned. referred_by is likewise set ONLY here (P4).
      const { data: inserted, error: insertErr } = await db.from('clients')
        .insert({ user_id: user.id, ...payload, ...(resolvedReferredBy ? { referred_by: resolvedReferredBy } : {}), plan: 'figsy' })
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
    // The subscriptions.product column is the product_type ENUM — its FIGSY value is
    // 'lead_gen_figsy' (NOT 'figsy', which isn't in the enum → 22P02 on insert). This
    // is also the value hasFigsy reads (isLive('lead_gen_figsy')), so the trialing row
    // grants access. (clients.plan + credit_transactions.plan are separate TEXT fields
    // where 'figsy' is correct — only this enum column uses 'lead_gen_figsy'.)
    const { data: existingSub } = await db.from('subscriptions')
      .select('id').eq('client_id', clientId).eq('product', 'lead_gen_figsy').maybeSingle()
    if (!existingSub) {
      const { error: subErr } = await db.from('subscriptions').insert({
        client_id: clientId, product: 'lead_gen_figsy', tier: 'starter', status: 'trialing',
        billing_interval: 'monthly',
        amount_usd: 0,
        amount_zar: 0,
        trial_ends_at: trialEnd.toISOString(),
        current_period_start: now, current_period_end: trialEnd.toISOString(),
      })
      if (subErr) throw new Error(`Subscription insert failed: ${subErr.message} (${subErr.code})`)

      // #425 — signup credit MIX for the two-charge model: under $1-reveal + $3-work
      // a FIGSY-only grant is useless (the client can't reveal anything). Grant
      // 20 reveal credits ($20 value) + 5 FIGSY work credits ($15 value) so a new
      // client can experience the full ladder end-to-end: browse masked → reveal →
      // FIGSY works the lead. (The legacy `subscriptions` trialing row above is
      // #431 retirement scope — the grant itself no longer expires.)
      // #349 (AR-12) — check the balance write. If the grant silently fails but the
      // ledger rows below still insert, the ledger says "25 credits granted" while the
      // wallet holds 0 — a drift that reads as free credits the client can't spend.
      // Only write the ledger when the balance actually changed; alert on failure.
      // #445 — seed the TRIAL sourcing pool alongside the welcome credits: 10 records
      // at signup (trial_sourcing_granted tracks the 20-record lifetime cap; reveals
      // drip +2 up to it). This is the ONLY non-purchase allowance grant — a never-paid
      // client can source at most 20 records EVER (~$5.60 max exposure per free signup).
      // NO FREEBIES (founder-locked 24 Jul) — a new client starts with a $0 wallet and
      // $0 sourcing. Nothing can be sourced or approved until they make their $99 first
      // purchase; that payment's Stripe webhook credits the wallet AND accrues the
      // sourcing budget (k=2). This is how we guarantee the $99 lands before any cost to us.
      void now // (no signup grant — intentional)
    }

    sendWelcomeEmail(user.email!, profileFields.company_name).catch(() => {})
    // #285 alerting — tell the founder a new client just onboarded (new clients only).
    if (!existing) {
      void sendFounderAlert('new_signup', `New signup — ${profileFields.company_name}`, [
        `${profileFields.company_name} just completed onboarding (${user.email}).`,
        profileFields.country ? `Country: ${profileFields.country}.` : '',
        `No freebies — they start at $0 and must load $99 to begin. Assign a pooled inbox once they've paid.`,
      ])
    }
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
