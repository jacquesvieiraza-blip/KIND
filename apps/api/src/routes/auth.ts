import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { sendWelcomeEmail } from '../lib/email'
import { sendFounderAlert } from '../lib/alerts'
import { rateLimit } from '../lib/rate-limit'
import { signupSubscriptionRow, signupSubscriptionRowCompat, isPeriodEndNotNullRejection, SIGNUP_SUBSCRIPTION_PRODUCT } from '../lib/signup-subscription'
import { PACK_PRICE_USD } from '@kind/shared'

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
    // ⚑ 24 Aug — A NEW CLIENT GOES STRAIGHT INTO K.I.N.D, NOT INTO AN INTERVIEW. This
    // pointed at /onboard, a six-question scripted form that ran BEFORE the client had
    // entered the product, asked what their business does (a question Milla then asked
    // again inside), and wore FIGSY's face over copy that read "Hi — I'm Milla". The
    // account facts are Milla's now, so authentication hands straight over to her.
    res.json({ success: true, data: { redirect_url: `${PORTAL}/milla/welcome` } })
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
  // Who we're speaking to (flow v2 step 0). Deliberately NOT signer_name, which is who
  // signs the outgoing emails — they are often different people.
  contact_name: emptyToUndefined.optional(),
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
    // contact_name is pulled OUT of the shared payload on purpose: the column ships in
    // 20260726_client_contact_name.sql and may not be applied yet. Inside the payload a
    // missing column fails the whole insert — i.e. it would break every signup. It is
    // written separately, best-effort, below.
    const { referred_by, terms_accepted, contact_name, ...profileFields } = onboardSchema.parse(req.body)

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
      //
      // 🛑 commercial_model='programme' — THE ONE PLACE A NEW M&V CUSTOMER IS CLASSIFIED.
      // Every new client is a PROGRAMME client: the per-lead $299/$4 model is retired and
      // nobody signing up today is on it. Leaving the column NULL would make a brand-new
      // customer resolve as `compat_legacy` for as long as they have no programme open —
      // i.e. from signup until their first programme — and that is exactly the window in
      // which the wallet gate, the per-lead approve/reveal routes and the low-credit
      // emails would treat them as a legacy account.
      //
      // ⚠️ ON THE INSERT, NOT BEST-EFFORT AFTERWARDS (unlike contact_name above). If the
      // column were missing the insert fails and the signup fails — loudly — instead of
      // quietly creating the NULL client this line exists to prevent. C1's migration is
      // applied in production; expand/contract means this build cannot deploy before it.
      //
      // ⚠️ INSERT ONLY, for the same reason as `plan`: an existing client re-onboarding
      // goes through the update branch above and is NEVER reclassified by this route.
      // Reclassification is a deliberate operator act in Vida, by client id.
      const { data: inserted, error: insertErr } = await db.from('clients')
        .insert({ user_id: user.id, ...payload, ...(resolvedReferredBy ? { referred_by: resolvedReferredBy } : {}), plan: 'figsy', commercial_model: 'programme' })
        .select()
        .single()
      if (insertErr) throw new Error(`Insert failed: ${insertErr.message} (${insertErr.code})`)
      clientId = inserted.id
    }

    // Who we're speaking to. Best-effort: an un-migrated database must never cost us a
    // signup, so a failure here is logged and swallowed rather than thrown.
    if (contact_name && contact_name.trim()) {
      const { error: nameErr } = await db.from('clients')
        .update({ contact_name: contact_name.trim().slice(0, 120) }).eq('id', clientId)
      if (nameErr) console.warn('[onboard] contact_name not stored (run 20260726_client_contact_name):', nameErr.message)
    }

    // Record partner referral attribution (idempotent — unique(client_id)).
    if (partnerRef) {
      // #349 — this used to end in `.then(() => {}, () => {})`, which discarded the error
      // AND the returned one. This row is the ONLY record that the partner sent us this
      // client: without it maybeCreatePartnerCommission finds no referral and the partner
      // is never paid a cent for them, forever. Nothing else writes it.
      // Still non-fatal — a failed attribution must not cost us the signup — so it is
      // reported rather than thrown.
      const { error: refErr } = await db.from('partner_referrals').upsert({
        partner_id:    partnerRef.partner_id,
        client_id:     clientId,
        referral_code: partnerRef.code,
        status:        'trial',
      }, { onConflict: 'client_id' })
      if (refErr) {
        console.error('[onboard] partner referral NOT attributed:', refErr.message)
        void sendFounderAlert('new_signup', 'Partner referral was NOT attributed', [
          `Client ${clientId} signed up through partner code "${partnerRef.code}" (partner ${partnerRef.partner_id}) and the attribution row failed: ${refErr.message}`,
          'The signup went through. But this partner will never earn commission on this client — commissions are looked up through this row.',
          'Fix: add the referral by hand in Vida → Partners.',
        ])
      }
    }

    // #607 — THE ROW IS AN ENTITLEMENT, NOT A TRIAL. It used to be written with
    // `status:'trialing'` and `trial_ends_at` 14 days out; two crons then acted on that every
    // morning, one of them emailing the client "your trial ends in 4 days — subscribe now",
    // about a product we do not sell. The money model has one event: $99, then $4 a lead.
    // The row still exists and still carries the entitlement — it is now DORMANT until they
    // pay. Full reasoning, and why `paused` rather than an invented value, in
    // `lib/signup-subscription.ts`. (The subscriptions.product column is the product_type
    // ENUM — its FIGSY value is 'lead_gen_figsy', NOT 'figsy', which isn't in the enum →
    // 22P02 on insert. clients.plan + credit_transactions.plan are separate TEXT fields where
    // 'figsy' is correct — only this enum column uses 'lead_gen_figsy'.)
    const { data: existingSub } = await db.from('subscriptions')
      .select('id').eq('client_id', clientId).eq('product', SIGNUP_SUBSCRIPTION_PRODUCT).maybeSingle()
    if (!existingSub) {
      const { error: subErr } = await db.from('subscriptions').insert(signupSubscriptionRow(clientId, now))
      // 4 Aug — the live schema has NOT NULL on current_period_end and the relaxing migration
      // cannot run, so the honest null bounced with 23502 and EVERY signup failed here for two
      // days until the founder hit it himself. Honest write first, sentinel retry second: the
      // day the constraint is relaxed, the first insert succeeds and this branch goes dormant.
      if (isPeriodEndNotNullRejection(subErr)) {
        const { error: retryErr } = await db.from('subscriptions').insert(signupSubscriptionRowCompat(clientId, now))
        if (retryErr) throw new Error(`Subscription insert failed after sentinel retry: ${retryErr.message} (${retryErr.code})`)
      } else if (subErr) {
        throw new Error(`Subscription insert failed: ${subErr.message} (${subErr.code})`)
      }

      // NO FREEBIES, AND NO GRANT HERE — founder-locked 24 Jul. A new client starts with a
      // $0 wallet and $0 sourcing allowance. Nothing can be sourced, approved or sent until
      // their $99 first purchase lands; that payment's Stripe webhook credits the wallet AND
      // accrues the sourcing budget. This is what guarantees the $99 arrives before we spend
      // a cent on them, and it is why the row above can be dormant without gating anything
      // twice — the wallet already refuses every spend.
      //
      // #607 — the paragraph that stood here described the #425 trial credit MIX (20 reveal +
      // 5 work credits) as though it ran. It has not run since 24 Jul: the line below is the
      // whole branch. #425 was tombstoned by founder decision on 1 Aug (#606) along with the
      // rest of the two-wallet ladder, so the description outlived the design it described.
      void now // (no signup grant — intentional)
    }

    sendWelcomeEmail(user.email!, profileFields.company_name).catch(() => {})
    // #285 alerting — tell the founder a new client just onboarded (new clients only).
    if (!existing) {
      void sendFounderAlert('new_signup', `New signup — ${profileFields.company_name}`, [
        `${profileFields.company_name} just completed onboarding (${user.email}).`,
        profileFields.country ? `Country: ${profileFields.country}.` : '',
        `No freebies — they start at $0 and must load $${PACK_PRICE_USD} to begin. Assign a pooled inbox once they've paid.`,
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
