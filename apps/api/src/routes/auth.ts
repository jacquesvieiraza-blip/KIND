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
  // ── ⚑ 10 Sep (C03) — WHAT THEY SAID THEY WANT, IN THEIR OWN WORDS ──────────────────
  //
  // 🛑 OPTIONAL AT THE SCHEMA, REQUIRED BY THE SCREEN. A client mid-onboarding who cannot
  // answer this must still get an account — refusing the whole signup over one sentence
  // would be the worst possible trade. When it is absent, `shouldAskForOutcome` is true and
  // Milla asks; when it is present she never asks again.
  outcome_stated: emptyToUndefined.optional(),
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
    const { referred_by, terms_accepted, contact_name, outcome_stated, ...profileFields } = onboardSchema.parse(req.body)
    // ── ⚑ 10 Sep (C03) — THE KIND IS DERIVED HERE, NEVER SENT ─────────────────────────
    //
    // ⚠️ THE REQUEST SUPPLIES THE SENTENCE AND NOTHING ELSE. If the body could name the
    // `kind`, a client (or a screen) could declare a "meetings" outcome for an answer that
    // never mentioned one — and a meeting target would later be agreed against it. The
    // classification is ours, from their words, in one place.
    const { readStatedOutcome } = await import('../lib/client-outcome')
    const outcome = readStatedOutcome(outcome_stated)
    const outcomeFields = outcome
      ? { outcome_kind: outcome.kind, outcome_stated: outcome.stated }
      : {}

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

    // ── ⚑ MVP1 — PROMOTION IS GATED ON THE ELEVEN, SERVER-SIDE ────────────────────────
    //
    // 🛑 A DISABLED BUTTON IS NOT A GATE. This handler is what turns a draft Brief into a
    // client, an ICP and a Proof run, and it must refuse a brief that is short of the facts
    // Proof will be sourced against. The portal checks too; this is the check that counts.
    //
    // ⚠️ IT REFUSES BEFORE ANYTHING IS CREATED. Ordering is the whole safety: a partial state
    // where the client row exists, promotion is stamped and the brief was never complete is
    // worse than a clean refusal, because the draft is then sealed and the person has no
    // editable Brief and no working account.
    //
    // ⚠️ ONLY WHEN A DRAFT EXISTS. A legacy client re-onboarding, an operator-created account
    // and every path that predates the draft table have no draft at all — `briefDraftFor`
    // answers null and this gate stands aside. It never invents a requirement for a journey
    // that did not go through Milla.
    const { briefDraftFor, mayConfirmBrief, markBriefDraftPromoted } = await import('../lib/brief-draft')
    const { BRIEF_FACT_LABEL } = await import('@kind/shared')
    const draft = await briefDraftFor(user.id)
    if (draft && !draft.promotedClientId) {
      const gate = mayConfirmBrief(draft)
      if (!gate.ok) {
        res.status(400).json({
          success: false,
          error: `Milla still needs ${gate.missing.map(id => BRIEF_FACT_LABEL[id as keyof typeof BRIEF_FACT_LABEL]).join(', ')} before this brief can be confirmed.`,
          missing: gate.missing,
        })
        return
      }
    }

    const now = new Date().toISOString()

    // Check if client already exists (and whether signup consent is already on record).
    // ⚑ MVP1 (C27) — `contact_email` is read here so the writer below can fill it ONLY when
    // it is empty. See that block for why it is never overwritten.
    const { data: existing } = await db.from('clients')
      .select('id, signup_terms_accepted_at, contact_email').eq('user_id', user.id).maybeSingle()

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
      ...outcomeFields,
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

    // ── ⚑ MVP1 — THE DRAFT IS SEALED, AND ONLY NOW ───────────────────────────────────
    //
    // ⚠️ AFTER THE CLIENT ROW EXISTS, NEVER BEFORE. If promotion were stamped first and the
    // insert then failed, the draft would be closed to further writes and the person left
    // with no client and no editable Brief — every answer they gave stranded behind a door
    // that will not open again.
    //
    // ⚠️ BEST-EFFORT, DELIBERATELY. By this line the client exists; failing the whole
    // onboarding because the evidence row could not be stamped would throw away a successful
    // promotion over bookkeeping. It is logged loudly inside `markBriefDraftPromoted`.
    if (draft && !draft.promotedClientId) await markBriefDraftPromoted(user.id, clientId)

    // ── ⚑ MVP1 (C27) — THE ADDRESS CHECKOUT REFUSES TO WORK WITHOUT ───────────────────
    //
    // 🛑 `clients.contact_email` HAD NO WRITER ANYWHERE IN THE REPO. The column has existed
    // since 20260710 and TWO money routes fail closed on it before they will mint a Stripe
    // session — `routes/programme.ts:49` and `routes/my-programme.ts:247` — because Stripe
    // accepts a session with no `customer_email` and the client would simply never get a
    // receipt. Both were right to refuse. Nothing ever filled the column, so Payment 1 was
    // unreachable for every client who has ever signed up, and with it every stage after it.
    //
    // ⚠️ THIS IS NOT A NEW FACT TO COLLECT. It is the address they authenticated with,
    // already in hand at the top of this handler, and it is the correct address to receipt
    // to — a client cannot receive mail at an account they cannot sign in to.
    //
    // ⚠️ FILL WHEN EMPTY, NEVER OVERWRITE. The login address is the DEFAULT, not an
    // override. An operator who corrected a billing address by hand in Vida must not have it
    // silently undone the next time the client touches onboarding — that is the same
    // class of defect as the pool country overwrite (`.is('country', null)`), and the same
    // answer applies.
    //
    // ⚠️ BEST-EFFORT, LIKE `contact_name` ABOVE AND FOR THE SAME REASON. Inside the insert
    // payload a missing column fails the whole insert — i.e. it would break every signup on
    // a database where 20260710 has not run. Written separately, logged, swallowed.
    const authEmail = (user.email ?? '').trim().slice(0, 320)
    if (authEmail && !(existing as { contact_email?: string | null } | null)?.contact_email) {
      const { error: mailErr } = await db.from('clients')
        .update({ contact_email: authEmail }).eq('id', clientId)
      if (mailErr) {
        console.warn('[onboard] contact_email not stored (run 20260710_client_contact_email):', mailErr.message)
        // ⚠️ LOUD, because the consequence is silent. Without this column the client reaches
        // Programme, sees a price, presses pay and is refused — and nothing in that journey
        // tells anybody why. A warning in a log nobody reads is how C27 survived this long.
        void sendFounderAlert('new_signup', 'A client was created who cannot reach checkout', [
          `Client ${clientId} (${authEmail}) has no contact_email stored: ${mailErr.message}`,
          'Both programme checkout routes refuse without it, so this client cannot make Payment 1.',
          'Fix: apply the clients.contact_email migration, then set the address in Vida.',
        ])
      }
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
    // ── ⚑ MVP1 (C22) — ONE ONBOARDING EMAIL, NOT TWO ──────────────────────────────────
    //
    // 🛑 REMOVED: a fire-and-forget POST to `/founder/cs/followup` with `step: 'day1'`, which
    // generated a CS follow-up with a model and sent it to the client who had just received
    // `sendWelcomeEmail` above. Two onboarding emails from one signup, the second written by
    // nobody and chosen by nobody. The MVP1 rule is one.
    //
    // ⚠️ THE ROUTE IS NOT DELETED, and deliberately so. `/founder/cs/followup` remains a
    // real operator surface — an operator may still send a follow-up on purpose, by client
    // id, having decided to. What is gone is the automatic call at signup.
    //
    // ⚠️ AND IT WAS A `fetch` FROM THE API TO ITSELF. Fire-and-forget, `.catch(() => {})`,
    // through `API_INTERNAL_URL` or a guessed localhost port — so on any host where that
    // guess was wrong it failed silently every single time and nobody could have known.
    // Guarded by `onboard-brief.route.test.ts`, which asserts the handler makes NO outbound
    // HTTP call at signup.

    res.json({ success: true, data: { id: clientId } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[onboard]', err)
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ success: false, error: msg })
  }
})
