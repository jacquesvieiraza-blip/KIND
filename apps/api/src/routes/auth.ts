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
  // ── 🛑 ⚑ 13 Sep (S1-AUDIT-002) — THE KEY IS OPTIONAL; THE VALUE IS VALIDATED AS BEFORE ──
  //
  // ⛓️ WHAT STOOD HERE: ~~`emptyToUndefined.pipe(z.string().url().optional())`~~
  //
  // The `.optional()` sat INSIDE the pipe, so the outer `z.string()` was REQUIRED: a body
  // that omitted the key entirely 400'd the whole promotion, while `''` parsed fine. That
  // made the BROWSER a precondition for a fact the SERVER already owns — a confirmed brief
  // holding a website, or an explicit "we have none", could not be persisted at all unless
  // the browser remembered to send a key it has no say over. The server-owned Brief rule
  // cannot depend on the courier still being in the room.
  //
  // ⚠️ VALIDATION OF A SUPPLIED VALUE IS UNCHANGED, DELIBERATELY. The outer `.optional()`
  // short-circuits ONLY on an absent key; `''` still becomes undefined, a valid URL still
  // passes, and `'not-a-url'`, `'acme.com'` and `null` are still rejected exactly as they
  // were. This widens what may be OMITTED, never what may be SENT.
  website:      emptyToUndefined.pipe(z.string().url().optional()).optional(),
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

/** A brief fact that is present and non-blank, or undefined. Blank is NEVER a value: a draft
 *  that holds nothing for a fact must fall back rather than blank what the caller had. */
function text2(v: string | null | undefined): string | undefined {
  const t = (v ?? '').trim()
  return t === '' ? undefined : t
}

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
    // ⚠️ THE SENTENCE IS RESOLVED BELOW, AFTER THE CONFIRMED DRAFT HAS HAD ITS SAY (S1-AUDIT-002).
    // The classification still happens here and is still never sent — only WHICH sentence is
    // classified moved, from the browser's copy to the server's.

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
    const { briefDraftFor, mayConfirmBrief } = await import('../lib/brief-draft')
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
      // ── 🛑 ⚑ MVP1 — AND ELEVEN FACTS ARE STILL NOT PERMISSION TO PROMOTE ──────────────
      //
      // ⚠️ CONFIRMATION IS A SEPARATE GATE AND IT IS THE CLIENT'S. Holding all eleven means
      // Milla has stopped asking; it says nothing about whether the client read what she
      // understood and agreed to it. Proof is sourced against this brief and the $299 is
      // asked for on the strength of it, so agreement has to be an ACT — never inferred from
      // a count, from silence, or from a screen having got as far as showing a button.
      //
      // ⚠️ AND IT IS NEVER INFERRED FROM THIS CALL EITHER. A browser reaching `/auth/onboard`
      // is not evidence of consent; `POST /milla/brief-draft/confirm` is where the client
      // gives it, and changing the brief afterwards clears it (see `saveBriefDraft`).
      if (!draft.confirmedAt) {
        res.status(400).json({
          success: false,
          error: 'This brief has not been confirmed yet. Confirm it with Milla and we will open your account.',
          needs_confirmation: true,
        })
        return
      }

      // ── 🛑 ⚑ 14 Sep (S1-RT-006) — AND WE DO NOT OPEN AN ACCOUNT WE CANNOT SERVE ──────
      //
      // 🛑 THE LINE BELOW THIS ONE CREATES THE CANONICAL CLIENT. `confirmBriefDraft` already
      // refuses an unsupported market, so in the normal journey this can never fire — which
      // is exactly why it is here. A draft CONFIRMED BEFORE this build shipped carries a
      // stamp taken under the old rule, and without this it would walk straight through the
      // confirmed-check above and create the client the whole correction exists to prevent.
      //
      // ⚠️ THE SAME SPLIT AND THE SAME SENTENCE as the confirm route — one decision, imported,
      // never a second copy of the country rule. Two gates that could disagree about where we
      // operate is worse than one gate in the wrong place.
      //
      // ⚠️ AND IT CREATES NOTHING ON THE WAY OUT. A refusal here writes no client, no ICP, no
      // welcome email and spends no Proof authority — all of them are below this line.
      const { splitGeographies, unsupportedGeographyAsk } = await import('@kind/shared')
      // ⚠️ OPTIONAL, BECAUSE A THROW HERE WOULD BE A 500 ON A HEALTHY SIGNUP. `briefDraftFor`
      // always defaults `facts` to an object, so this cannot be undefined in production — but
      // a gate that can throw on an unexpected shape is a gate that takes the whole account
      // creation down with it, and `splitGeographies` already reads an absent list as "no
      // objection". Caught by `onboard-brief.route.test.ts`, whose draft fixture carries no
      // facts at all.
      const geoSplit = splitGeographies(draft.facts?.geographies)
      if (geoSplit.unsupported.length > 0) {
        res.status(409).json({
          success: false,
          code: 'unsupported_geography',
          error: unsupportedGeographyAsk(geoSplit),
          ask: unsupportedGeographyAsk(geoSplit),
          unsupported: geoSplit.unsupported,
          supported: geoSplit.supported,
        })
        return
      }
    }

    // ── 🛑 ⚑ 12 Sep (S1-AUDIT-002) — THE CONFIRMED DRAFT IS THE SOURCE OF TRUTH ─────────
    //
    // 🛑 THE DEFECT. Every fact below arrived in the REQUEST BODY. The browser was the
    // courier: it read the draft, held the values in component state across a four-call
    // promotion, and re-sent them. Three things follow from that, and all three were live:
    //
    //   · a body that OMITS `outcome_stated` created a client with no stated outcome, even
    //     though the client had answered the question and the answer was on the server;
    //   · a body that sends something DIFFERENT from the confirmed draft wins, so the client
    //     row can disagree with the brief they were shown and agreed to;
    //   · the eleven-fact gate above reads the DRAFT while the write below read the BODY —
    //     two different sources for one decision, which is the shape of every drift bug.
    //
    // ⚠️ THE DRAFT WINS, AND IT WINS SILENTLY. There is nothing to reconcile: the client
    // confirmed THESE words, `mayConfirmBrief` has just proved all eleven are present, and a
    // browser value that disagrees is stale or wrong by definition.
    //
    // ⚠️ ONLY THE FACTS THE DRAFT ACTUALLY HOLDS ARE OVERRIDDEN. `country`, `industry` and
    // `phone` are NOT brief facts (the brief's `geography` is who the client wants to REACH,
    // not where they are), so they still come from the body — unchanged, deliberately, and
    // not silently widened into something the draft cannot answer.
    //
    // ⚠️ AND IT APPLIES ONLY TO A CONFIRMED, UNPROMOTED DRAFT. A legacy client re-onboarding,
    // an operator-created account and every pre-draft journey have no draft at all; they take
    // exactly today's path.
    const draftFacts = draft && !draft.promotedClientId && draft.confirmedAt ? draft.facts : null
    if (draftFacts) {
      const text = (v: string | null | undefined) => {
        const t = (v ?? '').trim()
        return t === '' ? undefined : t
      }
      const company = text(draftFacts.company_name)
      if (company) profileFields.company_name = company
      const country = text(draftFacts.country)
      if (country) profileFields.country = country
      const phone = text(draftFacts.phone)
      if (phone) profileFields.phone = phone
    }
    // ── 🛑 ⚑ 13 Sep (S1-AUDIT-002 correction) — WEBSITE IS RESOLVED, NOT NUDGED ─────────
    //
    // ⛓️ WHAT STOOD INSIDE THE BLOCK ABOVE, AND WHY IT WAS NOT ENOUGH:
    // ~~`const site = text(draftFacts.website)`~~
    // ~~`if (site && /^https?:\/\//i.test(site)) profileFields.website = site`~~
    //
    // It recognised that `website_none` exists and then did nothing with it. Two live holes:
    //
    //   ① A confirmed brief saying "WE HAVE NO WEBSITE" set nothing at all, so a stale or
    //      contradictory `website` in the REQUEST BODY survived and was written to the
    //      promoted client. The client confirmed "none"; the row said otherwise.
    //   ② A confirmed brief holding a BARE DOMAIN ("redmayne.co.uk") failed the `^https?://`
    //      test, so the body's different value won there too — even though the locked fact is
    //      "website/DOMAIN or explicit none" and the canonical counter holds that fact.
    //
    // Both are the browser being the authority for a fact the client already confirmed, which
    // is the exact defect S1-AUDIT-002 exists to close. The decision now lives in one pure
    // function and is driven through every combination behaviourally.
    //
    // ⚠️ WRITTEN AS ITS OWN PAYLOAD FRAGMENT, NEVER BACK INTO `profileFields`. An explicit
    // none must persist as `null`, and `profileFields.website` is typed `string | undefined`
    // by the schema — `undefined` is dropped by JSON serialisation, which on the UPDATE branch
    // of a re-onboarding leaves a stale website exactly where it is. `null` clears it.
    const { resolveOwnedWebsite } = await import('../lib/brief-promotion')
    const ownedWebsite = resolveOwnedWebsite(draftFacts, profileFields.website)
    // `body` means no draft, or a draft silent on this fact: `profileFields.website` already
    // carries the caller's own value and today's path is taken untouched.
    const websiteFields: { website?: string | null } =
      ownedWebsite.source === 'body' ? {} : { website: ownedWebsite.website ?? null }
    // ⚠️ `contact_name` AND `outcome_stated` WERE DESTRUCTURED OUT OF `profileFields` ABOVE,
    // so they are owned as their own locals rather than through the payload. In both cases the
    // body is now only a FALLBACK for a journey that has no draft at all.
    const contactNameOwned = text2(draftFacts?.contact_name) ?? contact_name
    const outcomeStatedOwned = text2(draftFacts?.desired_outcome) ?? outcome_stated

    const outcome = readStatedOutcome(outcomeStatedOwned)
    const outcomeFields = outcome
      ? { outcome_kind: outcome.kind, outcome_stated: outcome.stated }
      : {}

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
      // AFTER `profileFields`, deliberately: this is the resolved owner of fact #3 and it must
      // be able to overwrite the body's copy — including with `null` for an explicit none.
      ...websiteFields,
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
    if (contactNameOwned && contactNameOwned.trim()) {
      const { error: nameErr } = await db.from('clients')
        .update({ contact_name: contactNameOwned.trim().slice(0, 120) }).eq('id', clientId)
      if (nameErr) console.warn('[onboard] contact_name not stored (run 20260726_client_contact_name):', nameErr.message)
    }

    // ── 🛑 ⚑ 12 Sep (S1-AUDIT-003) — THE SEAL IS NOT HERE ANY MORE ───────────────────
    //
    // ⛓️ WHAT STOOD HERE, AND WHY IT WAS WRONG:
    // ~~`if (draft && !draft.promotedClientId) await markBriefDraftPromoted(user.id, clientId)`~~
    //
    // The reasoning above it was right as far as it went — seal AFTER the client row exists,
    // never before — but the client row is only HALF of what promotion has to produce. The
    // other half is the core ICP, and that is a SEPARATE browser call. So this exact
    // sequence was reachable, and it strands a real person:
    //
    //     /auth/onboard succeeds  ->  client row exists  ->  DRAFT SEALED
    //       ->  the browser never reaches POST /icps (tab closed, network drop, crash)
    //       ->  a client with NO ICP and an UNWRITABLE Brief.
    //
    // Every answer they gave is now behind a door that will not open again, and there is no
    // targeting to run Proof against. `writableBriefDraft` refuses a promoted row by design,
    // which is correct — the row is evidence — so nothing in the product could recover it.
    //
    // 🛑 THE SEAL IS THE LAST DURABLE STEP OF PROMOTION, so it now lives where the LAST piece
    // of durable state is created: `POST /icps` with `from_brief_draft: true`, immediately
    // after the core ICP is written. Until both halves exist the draft stays WRITABLE, so an
    // interrupted promotion is resumable rather than stranded — and a replay of either call
    // completes it instead of finding a locked door.
    //
    // ⚠️ PROOF START DELIBERATELY STAYS OUTSIDE THAT BOUNDARY. A Proof run is a provider
    // call with its own authority ledger; making it part of the promotion transaction would
    // mean a provider outage could block an account from ever being created. Promotion is
    // client + ICP + seal. Proof is what happens next.

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

    // ── 🛑 ⚑ 12 Sep (S1-AUDIT-006 · R120) — ONE AUTOMATIC WELCOME EMAIL ─────────────────
    //
    // 🛑 THIS LINE SAT OUTSIDE THE `if (!existing)` BLOCK BELOW, AND THAT WAS THE DEFECT. A
    // second POST here takes the UPDATE branch, the draft gate stands aside because the draft
    // is already promoted, and the welcome email SENT AGAIN. A double-click, a refresh, an
    // offline retry and two concurrent tabs all land on this line.
    //
    // ⚠️ IT IS STILL CALLED UNCONDITIONALLY, ON PURPOSE. The guard does NOT belong here: an
    // `if (!existing)` would make the FIRST attempt the only attempt, so a client whose first
    // send died before recording anything would never receive a welcome email at all. The
    // authority is the durable claim inside `sendWelcomeEmail` — which both refuses a
    // duplicate and permits a proven-safe retry inside Resend's 24-hour window.
    //
    // ⚠️ `clientId` IS THE DURABLE IDENTITY THE CLAIM AND THE IDEMPOTENCY KEY HANG ON. The
    // email address is not safe for either: an address can legitimately re-onboard under a
    // new client, and two clients must never share a key.
    sendWelcomeEmail(user.email!, profileFields.company_name, clientId).catch(() => {})
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
