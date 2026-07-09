import { Router } from 'express'
import crypto from 'crypto'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { generateSequence, getClientKnowledgeForOutreach, classifyReply, sendSequenceEmail, enrollmentStep, autoEnrollLead, applyReplyBranching, campaignReadyLeadIds, recomputeCampaignCounters, personalizationSignals, chargeFigsyEnroll, refundFigsyEnroll } from '../lib/figsy'
import { canEnroll } from '../lib/billing-rules'
import { buildDraftFromSequence, buildDraftStepsFromSequence, draftToSteps, emailSteps, MAX_SEQUENCE_STEPS, type SequenceStep } from '../lib/sequence-apply'
import { pushDealToCrm } from '../lib/crm'
import { logOutcomeEvent } from '../lib/outcomes'
import { verifyUnsubscribeToken, COLD_FROM, COLD_REPLY_TO, warmupRampCap, spamScore } from '../lib/deliverability'
import { syncFigsyInterestedToHubspot } from '../lib/hubspot'
import { sendPushToClient } from '../lib/push'
import { emitSignal } from './signals'
import { rateLimit } from '../lib/rate-limit'
import { isDuplicateWebhookEvent } from '../lib/webhook-idempotency'
import { sendFounderAlert } from '../lib/alerts'

// Generous DoS backstop for the public, token-gated unsubscribe routes. The limit
// is high on purpose: an unsubscribe must NEVER be blocked for a legitimate
// recipient (that would breach opt-out obligations), and Gmail/Yahoo one-click
// proxies can batch many POSTs from a shared IP. This only trips on clear abuse.
const unsubscribeLimiter = rateLimit({ limit: 100, windowMs: 60_000, key: 'unsubscribe' })

export const figsyRouter = Router()

// ── OPEN TRACKING PIXEL — no auth, must be before requireAuth ─────────────────
// Called when recipient opens an email containing the tracking pixel.
// Returns a 1×1 transparent GIF and records opened_at on figsy_sent_emails.
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
  'base64'
)
figsyRouter.get('/track/open/:emailId', async (req, res) => {
  res.set('Content-Type', 'image/gif')
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.set('Pragma', 'no-cache')
  res.send(TRANSPARENT_GIF)

  // Record open asynchronously (don't block the image response)
  const { emailId } = req.params
  if (emailId && /^[0-9a-f-]{36}$/.test(emailId)) {
    void db.from('figsy_sent_emails')
      .update({ opened_at: new Date().toISOString() })
      .eq('id', emailId)
      .is('opened_at', null) // only record first open
  }
})

// ── UNSUBSCRIBE (D1) — no auth, must be before requireAuth ────────────────────
// Recipients of cold outreach reach this via the List-Unsubscribe header (one-click
// POST per RFC 8058) or the visible footer link (GET). Both add the address to the
// opt-out blocklist — the same chokepoint every send funnels through.
async function recordUnsubscribe(email: string): Promise<void> {
  const addr = email.trim().toLowerCase()
  await db.from('opt_out_blocklist').upsert(
    { email: addr, reason: 'list_unsubscribe' },
    { onConflict: 'email', ignoreDuplicates: false },
  )
  await db.from('leads')
    .update({ status: 'opted_out', opted_out_at: new Date().toISOString() })
    .eq('email', addr)
  await db.from('figsy_enrollments')
    .update({ status: 'opted_out' })
    .in('lead_id',
      (await db.from('leads').select('id').eq('email', addr)).data?.map((l: any) => l.id) ?? [])
  void logOutcomeEvent({
    client_id: null, campaign_id: null, lead_id: null, enrollment_id: null,
    event_type: 'opt_out', channel: 'email',
    payload: { via: 'list_unsubscribe', email: addr },
  })
}

// One-click unsubscribe (Gmail/Yahoo POST to the List-Unsubscribe URL).
figsyRouter.post('/unsubscribe/:token', unsubscribeLimiter, async (req, res) => {
  const email = verifyUnsubscribeToken(req.params.token)
  if (!email) return res.status(400).send('Invalid unsubscribe link.')
  try { await recordUnsubscribe(email) } catch (err) { console.error('[figsy/unsubscribe] POST failed:', err) }
  return res.status(200).send('You have been unsubscribed.')
})

// Footer link click — confirm in the browser.
figsyRouter.get('/unsubscribe/:token', unsubscribeLimiter, async (req, res) => {
  const email = verifyUnsubscribeToken(req.params.token)
  if (!email) {
    return res.status(400).type('html').send(
      '<div style="font-family:sans-serif;max-width:480px;margin:64px auto;text-align:center;color:#111">' +
      '<h2>Invalid unsubscribe link</h2><p style="color:#666">This link is no longer valid.</p></div>')
  }
  try { await recordUnsubscribe(email) } catch (err) { console.error('[figsy/unsubscribe] GET failed:', err) }
  return res.status(200).type('html').send(
    '<div style="font-family:sans-serif;max-width:480px;margin:64px auto;text-align:center;color:#111">' +
    `<h2>You're unsubscribed</h2><p style="color:#666">${email} will no longer receive these emails.</p></div>`)
})

// Verify a Resend (Svix) webhook signature over the raw body. Resend signs each
// webhook with svix-id / svix-timestamp / svix-signature using the endpoint's
// signing secret (whsec_…). signedContent = `${id}.${ts}.${body}`, HMAC-SHA256,
// base64. The signature header is a space-separated list of `v1,<sig>`.
function verifySvixSignature(body: Buffer, headers: Record<string, string | string[] | undefined>, secret: string): boolean {
  try {
    const id  = headers['svix-id']
    const ts  = headers['svix-timestamp']
    const sig = headers['svix-signature']
    if (!id || !ts || !sig) return false
    const key = secret.startsWith('whsec_') ? Buffer.from(secret.slice(6), 'base64') : Buffer.from(secret)
    const signedContent = `${id}.${ts}.${body.toString('utf8')}`
    const expected = crypto.createHmac('sha256', key).update(signedContent).digest('base64')
    const provided = String(sig).split(' ').map(p => p.split(',')[1]).filter(Boolean)
    return provided.some(p => {
      try { return crypto.timingSafeEqual(Buffer.from(p), Buffer.from(expected)) } catch { return false }
    })
  } catch { return false }
}

// ── INBOUND REPLY WEBHOOK — must be registered BEFORE requireAuth ─────────────
// Called by Resend when a prospect replies to a FIGSY sequence email.
// Authenticated by the Resend/Svix signature (or a plain x-webhook-secret header
// for manual callers). Raw body is captured via express.raw in index.ts.
// Resend `email.received` payload: { type, data: { email_id, from, to, subject } }.
figsyRouter.post('/replies/inbound', async (req, res) => {
  // FAIL CLOSED. Without the secret we cannot authenticate, so reject — a forged
  // reply could opt-out leads, inject fake hot replies, or trigger charges.
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.error('[figsy/replies/inbound] RESEND_WEBHOOK_SECRET not set — rejecting inbound. Set it on this deploy.')
    res.status(503).json({ error: 'Webhook not configured' }); return
  }
  // req.body is the raw Buffer (express.raw for this route). Accept a valid Resend
  // signature OR a matching x-webhook-secret header.
  const rawBuf: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}))
  if (!verifySvixSignature(rawBuf, req.headers, secret) && req.headers['x-webhook-secret'] !== secret) {
    res.status(401).json({ error: 'Unauthorized' }); return
  }

  // #264 — replay idempotency. Svix retries redeliver the same (authentic) event;
  // without this guard a retried hot reply re-pushes the CRM deal AND re-fires the
  // Paystack auto-top-up (double charge). Key on the stable `svix-id`; a delivery we
  // have already recorded is a no-op. Fails open (see lib/webhook-idempotency).
  if (await isDuplicateWebhookEvent(db, req.headers['svix-id'], 'resend')) {
    res.status(200).json({ received: true, deduped: true }); return
  }

  try {
    // Handle both Resend webhook format { type, data: {...} } and flat { from, subject, text }
    const raw = JSON.parse(rawBuf.toString('utf8') || '{}') as Record<string, unknown>

    // #267 — hard bounces + spam complaints: suppress the address so we stop mailing
    // dead/hostile inboxes (wasted credits + reputation damage). Resend delivers these
    // as email.bounced / email.complained on this same Svix webhook. The blocklist is
    // the single suppression source the send path already checks, so adding here stops
    // all future sends; we also pause any active enrollment for that address now.
    if (raw.type === 'email.bounced' || raw.type === 'email.complained') {
      const d = (raw.data && typeof raw.data === 'object') ? raw.data as Record<string, unknown> : {}
      const toRaw = d.to
      const to = Array.isArray(toRaw) ? toRaw[0] : toRaw
      const bounceEmail = (typeof to === 'string' ? to : '').toLowerCase().trim()
      const bounceType = String((d.bounce as Record<string, unknown> | undefined)?.type ?? d.type ?? '').toLowerCase()
      const isComplaint = raw.type === 'email.complained'
      const isTransient = /transient|soft|temporary/.test(bounceType)
      // Complaints always suppress; bounces suppress unless clearly transient/soft.
      if (bounceEmail && (isComplaint || !isTransient)) {
        await db.from('opt_out_blocklist').upsert(
          { email: bounceEmail, reason: isComplaint ? 'spam_complaint' : 'hard_bounce' },
          { onConflict: 'email', ignoreDuplicates: false },
        )
        const { data: bounced } = await db.from('leads').select('id').eq('email', bounceEmail)
        const ids = (bounced ?? []).map((l: { id: string }) => l.id)
        if (ids.length) {
          await db.from('figsy_enrollments').update({ status: 'opted_out' })
            .in('lead_id', ids).in('status', ['enrolled', 'in_progress'])
        }
        console.log(`[figsy/webhook] ${raw.type} → suppressed ${bounceEmail}${bounceType ? ` (${bounceType})` : ''}`)
      }
      res.status(200).json({ received: true }); return
    }

    const payload = (raw.type === 'email.received' && raw.data && typeof raw.data === 'object')
      ? raw.data as Record<string, unknown>
      : raw

    // Extract just the email address from "Name <email@domain.com>" or plain "email@domain.com"
    const rawFrom = (payload.from as string) ?? ''
    const emailMatch = rawFrom.match(/<([^>]+)>/) || rawFrom.match(/^([^\s]+@[^\s]+)/)
    const fromEmail = (emailMatch?.[1] ?? rawFrom).toLowerCase().trim()

    // Extract name from "Name <email>" format
    const fromName = rawFrom.includes('<') ? rawFrom.split('<')[0].trim().replace(/^["']|["']$/g, '') : null

    let body = (payload.text as string) || ((payload.html as string)?.replace(/<[^>]+>/g, ' ') ?? '') || ''

    // Resend's `email.received` webhook is METADATA-ONLY — it carries email_id but
    // NOT the body. Without this fetch, every real reply classifies on an empty
    // string and is dropped. Pull the full message from Resend's API by email_id.
    // (Flat inbound payloads that already include text skip this.) The raw status
    // is logged so we can confirm/correct the exact endpoint against the first live
    // reply.
    const emailId = (payload.email_id as string) || (payload.id as string) || ''
    if (!body && emailId && process.env.RESEND_API_KEY) {
      try {
        const r = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        })
        if (r.ok) {
          const full = await r.json() as { text?: string; html?: string }
          body = (full.text || full.html?.replace(/<[^>]+>/g, ' ') || '').trim()
          console.log(`[figsy/replies/inbound] fetched received email ${emailId} — body length ${body.length}`)
        } else {
          console.error(`[figsy/replies/inbound] fetch received email ${emailId} failed: ${r.status} ${(await r.text().catch(() => '')).slice(0, 200)}`)
        }
      } catch (e) {
        console.error('[figsy/replies/inbound] fetch received email error:', e)
      }
    }

    if (!fromEmail || !body) { res.status(200).json({ received: true }); return }

    // Find lead by email
    const { data: lead } = await db.from('leads')
      .select('id, client_id').eq('email', fromEmail).maybeSingle()
    if (!lead) { res.status(200).json({ received: true }); return }

    // Find active enrollment
    const { data: enrollment } = await db.from('figsy_enrollments')
      .select('id, campaign_id')
      .eq('lead_id', lead.id)
      .in('status', ['enrolled', 'in_progress'])
      .order('enrolled_at', { ascending: false })
      .limit(1).maybeSingle()

    // Classify reply
    const { classification, reasoning } = await classifyReply(body)

    // Store reply
    const { data: reply } = await db.from('figsy_replies').insert({
      enrollment_id:               enrollment?.id ?? null,
      campaign_id:                 enrollment?.campaign_id ?? null,
      lead_id:                     lead.id,
      client_id:                   lead.client_id,
      from_email:                  fromEmail,
      from_name:                   fromName,
      subject:                     (payload.subject as string) ?? null,
      body,
      body_text:                   body,
      classification,
      classification_reasoning:    reasoning,
      raw_payload:                 payload,
      processed_at:                new Date().toISOString(),
      received_at:                 new Date().toISOString(),
    }).select('id').single()

    // THE DATA FLOOR (#17b) — append-only raw outcome log. Fire-and-forget.
    void logOutcomeEvent({
      client_id:     lead.client_id,
      campaign_id:   enrollment?.campaign_id ?? null,
      lead_id:       lead.id,
      enrollment_id: enrollment?.id ?? null,
      event_type:    (classification === 'opt_out' || classification === 'unsubscribe') ? 'opt_out' : 'reply',
      channel:       'email',
      payload:       { classification, reasoning, subject: (payload.subject as string) ?? null, body, from_email: fromEmail },
    })

    // Handle opt-out — pause enrollment and add to blocklist. #312: the classifier
    // can tag a reply 'unsubscribe' as well as 'opt_out' ("please unsubscribe me" →
    // 'unsubscribe'); previously only 'opt_out' was suppressed, so an 'unsubscribe'
    // reply kept receiving steps 2/3 (POPIA violation). Treat both identically.
    if (classification === 'opt_out' || classification === 'unsubscribe') {
      if (enrollment) {
        await db.from('figsy_enrollments')
          .update({ status: 'opted_out' }).eq('id', enrollment.id)
      }
      await db.from('opt_out_blocklist').upsert({
        email:  fromEmail,
        reason: 'replied_opt_out',
      }, { onConflict: 'email', ignoreDuplicates: false })
      await db.from('leads').update({
        status: 'opted_out', opted_out_at: new Date().toISOString(),
      }).eq('email', fromEmail)

      if (enrollment?.campaign_id) await recomputeCampaignCounters(enrollment.campaign_id)
    }

    // Handle hot — pause sequence, bump stats, push deal to CRM
    if (classification === 'hot' && enrollment) {
      await db.from('figsy_enrollments')
        .update({ status: 'replied' }).eq('id', enrollment.id)

      // Web push — alert the client instantly on a hot reply (no-op if VAPID unset)
      sendPushToClient(lead.client_id, {
        title: '🔥 Hot reply',
        body: `${fromEmail} replied positively to your outreach.`,
        url: '/dashboard/figsy',
        tag: 'hot-reply',
      }).catch(() => {})

      if (enrollment.campaign_id) await recomputeCampaignCounters(enrollment.campaign_id)

      // F2-2 — push deal/opportunity to client's CRM
      const { data: leadFull } = await db.from('leads')
        .select('id, first_name, last_name, email, job_title, company, linkedin_url, country, score')
        .eq('id', lead.id).maybeSingle()
      const { data: client } = await db.from('clients')
        .select('crm_type, crm_api_key, crm_sync_enabled').eq('id', lead.client_id).maybeSingle()

      if (client?.crm_sync_enabled && client?.crm_type && client?.crm_api_key && leadFull) {
        const leadName = `${leadFull.first_name} ${leadFull.last_name}`.trim()
        pushDealToCrm(client.crm_type, client.crm_api_key, {
          ...leadFull,
          phone: null,
        }, {
          lead_name:     leadName,
          company:       leadFull.company,
          reply_snippet: body.slice(0, 300),
        }).then(result => {
          if (result.success && result.deal_id && enrollment) {
            db.from('figsy_enrollments').update({
              crm_deal_id:   result.deal_id,
              crm_pushed_at: new Date().toISOString(),
            }).eq('id', enrollment.id).then(() => {})
          }
        }).catch(console.error)
      }

      // Sync interested reply to HubSpot (no-op if HUBSPOT_API_KEY not set)
      syncFigsyInterestedToHubspot({
        lead_email:    fromEmail,
        lead_name:     leadFull ? `${leadFull.first_name} ${leadFull.last_name}`.trim() : '',
        company:       leadFull?.company ?? '',
        client_id:     lead.client_id,
        reply_snippet: body.slice(0, 300),
      }).catch(console.error)

      // Emit cross-agent signal: hot reply received
      void emitSignal(lead.client_id, 'figsy', 'reply_received', {
        lead_id:   lead.id,
        sentiment: 'hot',
        from:      fromEmail,
      })

      // Auto top-up check — #315 hardened: correct wallet per plan, atomic grant,
      // cooldown so two near-simultaneous hot replies can't both charge the card, and
      // canonical bundle pricing.
      try {
        const { data: clientForTopup } = await db.from('clients')
          .select('id, user_id, credit_balance, figsy_credits_remaining, auto_topup_enabled, auto_topup_threshold, auto_topup_plan, auto_topup_bundle_size, auto_topup_paystack_auth')
          .eq('id', lead.client_id).maybeSingle()

        const plan = clientForTopup?.auto_topup_plan ?? 'kind_ai'
        const isFigsy = plan === 'figsy'
        // Threshold + grant must use the SAME wallet the plan spends from: figsy outreach
        // draws figsy_credits_remaining; lead_gen draws credit_balance. The old code always
        // read + wrote credit_balance, so a figsy client paid real money and received
        // lead-gen credits while their figsy pool stayed empty (and never crossed threshold).
        const currentBalance = isFigsy
          ? (clientForTopup?.figsy_credits_remaining ?? 0)
          : (clientForTopup?.credit_balance ?? 0)

        if (clientForTopup?.auto_topup_enabled &&
            clientForTopup.auto_topup_paystack_auth &&
            currentBalance < (clientForTopup.auto_topup_threshold ?? 0)) {

          // Anti-double-charge cooldown: the svix idempotency guard only stops IDENTICAL
          // event replays; two DISTINCT hot replies close together would otherwise each
          // charge the card. Skip if this client was auto-topped-up in the last 30 min.
          const cooldownAgo = new Date(Date.now() - 30 * 60_000).toISOString()
          const { count: recentTopups } = await db.from('credit_transactions')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', clientForTopup.id).eq('type', 'purchase')
            .ilike('note', 'Auto top-up%').gte('created_at', cooldownAgo)

          const bundleSize = clientForTopup.auto_topup_bundle_size ?? 20
          // Canonical pricing — lead_gen $1/credit, figsy $3/credit (no volume discounts).
          const BUNDLES: Record<string, Record<number, number>> = {
            kind_ai: { 10: 10, 20: 20, 40: 40, 75: 75, 100: 100, 200: 200, 500: 500 },
            figsy:   { 10: 30, 20: 60, 40: 120, 75: 225, 100: 300, 200: 600, 500: 1500 },
          }
          const amountUsd = BUNDLES[plan]?.[bundleSize]

          if ((recentTopups ?? 0) > 0) {
            console.log(`[auto-topup] client ${clientForTopup.id} topped up within 30 min — skipping (cooldown)`)
          } else if (amountUsd) {
            const { data: { user } } = await db.auth.admin.getUserById(clientForTopup.user_id)
            const topupEmail = user?.email
            if (!topupEmail) throw new Error('No email for auto-topup client')
            const amountZarKobo = Math.round(amountUsd * 19 * 100)
            const chargeRes = await fetch('https://api.paystack.co/transaction/charge_authorization', {
              method: 'POST',
              headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                authorization_code: clientForTopup.auto_topup_paystack_auth,
                email: topupEmail,
                amount: amountZarKobo,
                currency: 'ZAR',
                metadata: { client_id: clientForTopup.id, type: 'credit_purchase', plan, bundle_size: bundleSize, amount_usd: amountUsd, auto_topup: true },
              }),
            })
            const chargeData = await chargeRes.json() as { status: boolean; data: { status: string; reference?: string } }
            if (chargeData.status && chargeData.data?.status === 'success') {
              // Atomic grant to the CORRECT wallet (was a read-modify-write on credit_balance).
              const rpc = isFigsy ? 'increment_figsy_credits' : 'increment_client_credits'
              const { error: grantErr } = await db.rpc(rpc, { p_client_id: clientForTopup.id, p_amount: bundleSize })
              if (grantErr) {
                console.error('[auto-topup] grant RPC failed after successful charge', grantErr.message)
                // P11 — the card was CHARGED but the credit grant failed: the client
                // paid and got nothing. Don't let that sit console-only — alert so it
                // can be granted manually. (Landmine: unreachable until a Paystack auth
                // exists, but a silent charge-without-grant must never ship.)
                void sendFounderAlert('payment_failed', 'Auto-topup charged but grant failed', [
                  `Client: ${clientForTopup.id}`,
                  `Auto top-up charged ${bundleSize} ${plan} credits (ref ${chargeData.data?.reference ?? 'unknown'}) but the grant RPC failed: ${grantErr.message}`,
                  'Action: grant the credits manually — the client was billed.',
                ])
              } else {
                await db.from('credit_transactions').insert({
                  client_id: clientForTopup.id,
                  type: 'purchase',
                  amount: bundleSize,
                  plan,
                  reference: chargeData.data?.reference ?? undefined,
                  note: `Auto top-up: ${bundleSize} credits (${plan})`,
                }).then(() => {}, () => {})
              }
            }
          }
        }
      } catch (autoErr) { console.error('[auto-topup]', autoErr) }
    }

    res.status(200).json({ received: true, id: reply?.id })
  } catch (err) {
    console.error('[figsy/inbound]', err)
    res.status(200).json({ received: true }) // Always 200 to webhook provider
  }
})

// ── #250 — INBOUND ENROLMENT WEBHOOK — API-key auth, must be BEFORE requireAuth ──
// Lets a client's own system (a form, a CRM, an inbound funnel) enrol leads into a
// FIGSY campaign WITHOUT a user session. Auth is a per-client developer key
// (`kind_...`, X-Api-Key / Authorization: Bearer) — the SAME sha256 scheme as
// /developer, so no new secret store is introduced. The key resolves to a
// client_id; the campaign must belong to THAT client (ownership check). Enrolment
// mirrors the authed POST /campaigns/:id/enroll EXACTLY, including the
// skip-if-already-enrolled idempotency guard — so a retried webhook never
// double-enrols (and therefore never double-sends / double-charges downstream).
//
// MONEY-PATH NOTE (P12): enrolment CHARGES one FIGSY credit per lead, charge-FIRST
// (#310/#332) — chargeFigsyEnroll runs BEFORE the figsy_enrollments insert, and the
// enroll aborts if the charge fails (no credit / RPC error). A failed insert after a
// successful charge refunds the credit. The idempotency guard skips a lead already
// enrolled in this campaign, so a retried webhook never double-charges.
//
// The client-facing enrolment PAGE / nav is a SEPARATE preview-gated follow-up —
// NOT restored here. This is the API endpoint only.
const figsyWebhookLimiter = rateLimit({ limit: 60, windowMs: 60_000, key: 'figsy-webhook-enrol' })

async function resolveClientIdFromApiKey(req: { headers: Record<string, unknown> }): Promise<string | null> {
  const rawHeader = (req.headers['x-api-key'] as string | undefined)
    ?? (typeof req.headers['authorization'] === 'string'
        ? (req.headers['authorization'] as string).replace(/^Bearer\s+/i, '')
        : undefined)
  if (!rawHeader || !rawHeader.startsWith('kind_')) return null
  const keyHash = crypto.createHash('sha256').update(rawHeader).digest('hex')
  const { data } = await db.from('developer_keys')
    .select('id, client_id, revoked_at')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .maybeSingle()
  if (!data) return null
  // Best-effort usage stamp — never blocks the request.
  void db.from('developer_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id)
  return data.client_id as string
}

figsyRouter.post('/webhook/enrol', figsyWebhookLimiter, async (req, res) => {
  try {
    const clientId = await resolveClientIdFromApiKey(req)
    if (!clientId) { res.status(401).json({ success: false, error: 'Missing or invalid API key' }); return }

    const { campaign_id, lead_ids } = z.object({
      campaign_id: z.string().uuid(),
      lead_ids:    z.array(z.string().uuid()).min(1).max(50),
    }).parse(req.body)

    // Ownership: the campaign MUST belong to the client that owns the API key.
    const { data: campaign } = await db.from('figsy_campaigns')
      .select('id, status, settings').eq('id', campaign_id).eq('client_id', clientId).maybeSingle()
    if (!campaign) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }

    // Item 187 — a saved sequence/template applied to this campaign (literal copy).
    const appliedSequence = ((campaign.settings as { sequence?: SequenceStep[] } | null)?.sequence) ?? undefined

    const { data: client } = await db.from('clients')
      .select('company_name, industry, booking_url').eq('id', clientId).maybeSingle()
    const { data: clientSigner } = await db.from('clients').select('signer_name').eq('id', clientId).maybeSingle()
    const senderName: string | null = (clientSigner?.signer_name as string | null) ?? null

    // Leads must belong to the SAME client — cross-tenant enrol is impossible.
    const { data: leads } = await db.from('leads')
      .select('id, first_name, last_name, email, job_title, company, industry, seniority, country, tech_stack, score, score_reasoning')
      .in('id', lead_ids).eq('client_id', clientId)

    // POPIA: never enrol anyone on the opt-out blocklist.
    const batchEmails = (leads ?? []).map((l: { email: string | null }) => l.email).filter(Boolean) as string[]
    const blocked = new Set<string>()
    if (batchEmails.length > 0) {
      const { data: blockRows } = await db.from('opt_out_blocklist')
        .select('email').in('email', batchEmails).is('opted_back_in_at', null)
      for (const r of blockRows ?? []) blocked.add((r as { email: string }).email)
    }

    // #310 — charge + gate the webhook enrol path too (it enrolled + sent for free).
    const { data: balRow } = await db.from('clients')
      .select('figsy_credits_remaining').eq('id', clientId).maybeSingle()
    let figsyRemaining = (balRow?.figsy_credits_remaining as number | null) ?? 0

    // #335 — fetch the client's business-knowledge digest ONCE (bounded), reused
    // for every lead's generated sequence so the solution half is grounded.
    const clientKnowledge = await getClientKnowledgeForOutreach(clientId)

    let enrolled = 0
    let skipped  = 0
    let insufficientCredits = false

    for (const lead of leads ?? []) {
      if (!lead.email) { skipped++; continue }
      if (blocked.has(lead.email)) { skipped++; continue }

      // Out of FIGSY credits — stop; never give away free outreach.
      if (!canEnroll(figsyRemaining)) { insufficientCredits = true; break }

      // Idempotency guard (mirrors the authed path): skip if already enrolled in
      // this campaign — a retried webhook is a safe no-op, never a double-enrol.
      const { data: existing } = await db.from('figsy_enrollments')
        .select('id').eq('campaign_id', campaign.id).eq('lead_id', lead.id).maybeSingle()
      if (existing) { skipped++; continue }

      let didCharge = false
      try {
        const draft = (appliedSequence && buildDraftFromSequence(appliedSequence, lead as any, client?.company_name ?? null))
          || await generateSequence(lead as any, client?.company_name ?? '', client?.industry ?? null, undefined, client?.booking_url ?? null, senderName, clientKnowledge)

        // #212 — full ≤10-step sequence (client copy carries its own cadence; AI is 3-step).
        const fullSteps = appliedSequence
          ? buildDraftStepsFromSequence(appliedSequence, lead as any, client?.company_name ?? null)
          : draftToSteps(draft)

        // #332 — charge FIRST (the charge is the real gate). A mid-batch charge
        // failure means the balance is gone — stop enrolling further leads.
        didCharge = await chargeFigsyEnroll(clientId, lead)
        if (!didCharge) { insufficientCredits = true; break }

        const { error } = await db.from('figsy_enrollments').insert({
          campaign_id:    campaign.id,
          lead_id:        lead.id,
          client_id:      clientId,
          status:         'enrolled',
          current_step:   0,
          next_send_at:   new Date().toISOString(),
          steps:          fullSteps.length > 0 ? fullSteps : null,
          total_steps:    fullSteps.length > 0 ? fullSteps.length : null,
          step1_subject:  draft.step1.subject,
          step1_body:     draft.step1.body,
          step2_subject:  draft.step2.subject,
          step2_body:     draft.step2.body,
          step3_subject:  draft.step3.subject,
          step3_body:     draft.step3.body,
        })
        if (error) { await refundFigsyEnroll(clientId); skipped++; continue }
        figsyRemaining -= 1
        enrolled++
      } catch {
        // P8 — a THROW after a successful charge (e.g. the insert throws) would leak
        // the credit into this catch with no refund. Return it before skipping.
        if (didCharge) await refundFigsyEnroll(clientId)
        skipped++
      }
    }

    // Bump enrolled count on the campaign (same as the authed path).
    const { data: camp } = await db.from('figsy_campaigns')
      .select('leads_enrolled').eq('id', campaign.id).maybeSingle()
    if (camp && enrolled > 0) {
      await db.from('figsy_campaigns')
        .update({ leads_enrolled: (camp.leads_enrolled ?? 0) + enrolled })
        .eq('id', campaign.id)
    }

    res.json({ success: true, data: { enrolled, skipped, insufficient_credits: insufficientCredits } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[figsy/webhook/enrol]', err)
    res.status(500).json({ success: false, error: 'Failed to enrol leads' })
  }
})

figsyRouter.use(requireAuth)

async function getClientId(userId: string): Promise<string | null> {
  const { data } = await db.from('clients').select('id').eq('user_id', userId).maybeSingle()
  return data?.id ?? null
}

// figsy_sent_emails is keyed by campaign_id (no client_id column). Returns the
// client's campaign IDs, with a non-matching sentinel when there are none so
// `.in('campaign_id', ids)` returns zero rows instead of erroring on [].
async function getClientCampaignIds(clientId: string): Promise<string[]> {
  const { data } = await db.from('figsy_campaigns').select('id').eq('client_id', clientId)
  const ids = (data ?? []).map((c: { id: string }) => c.id)
  return ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000']
}

// ── PULSE (#104 status bar) ───────────────────────────────────────────────────
// Lightweight, real, client-scoped signals for the sidebar status bar:
//   • active_campaigns — campaigns currently running
//   • sent_today       — emails sent so far this UTC day
//   • warmup_cap       — today's cold-send ceiling (null = no cap configured)
//   • credit_balance   — current credit balance
// All numbers are real reads — no fabricated values. Cheap (HEAD counts).
figsyRouter.get('/pulse', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const campaignIds = await getClientCampaignIds(clientId)
    const todayUTC = new Date()
    todayUTC.setUTCHours(0, 0, 0, 0)

    // Warmup cap mirrors lib/figsy coldDailyCap(): explicit override wins, else
    // auto-ramp from FIGSY_WARMUP_START, else no cap.
    const explicit = parseInt(process.env.FIGSY_COLD_DAILY_CAP ?? '', 10)
    const warmupStart = process.env.FIGSY_WARMUP_START
    const warmupCap = Number.isFinite(explicit) && explicit > 0
      ? explicit
      : warmupStart ? warmupRampCap(warmupStart) : null

    const [activeCampaignsRes, sentTodayRes, clientRes] = await Promise.all([
      db.from('figsy_campaigns').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('status', 'active'),
      db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).in('campaign_id', campaignIds).gte('sent_at', todayUTC.toISOString()),
      db.from('clients').select('credit_balance').eq('id', clientId).maybeSingle(),
    ])

    res.json({
      success: true,
      data: {
        active_campaigns: activeCampaignsRes.count ?? 0,
        sent_today:       sentTodayRes.count ?? 0,
        warmup_cap:       warmupCap,
        credit_balance:   (clientRes.data as { credit_balance?: number } | null)?.credit_balance ?? 0,
        as_of:            new Date().toISOString(),
      },
    })
  } catch (err) { console.error('[figsy/pulse]', err); res.status(500).json({ success: false, error: 'Failed to fetch pulse' }) }
})

// ── ACTIVITY FEED (#102) ──────────────────────────────────────────────────────
// A unified, real, client-scoped timeline of recent events — sends, replies,
// meetings — merged and sorted newest-first. Powers the live activity panel.
// All real reads (no fabricated events). Cheap: two capped queries, merged.
figsyRouter.get('/activity', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const limit = Math.min(Math.max(parseInt((req.query.limit as string) ?? '30', 10) || 30, 1), 100)
    const campaignIds = await getClientCampaignIds(clientId)

    const [sentRes, repliesRes] = await Promise.all([
      db.from('figsy_sent_emails')
        .select('lead_id, subject, step, sent_at, leads(first_name, last_name, company)')
        .in('campaign_id', campaignIds)
        .order('sent_at', { ascending: false })
        .limit(limit),
      db.from('figsy_replies')
        .select('from_name, from_email, classification, meeting_booked_at, received_at')
        .eq('client_id', clientId)
        .order('received_at', { ascending: false })
        .limit(limit),
    ])

    type Event = { type: 'sent' | 'reply' | 'meeting'; title: string; subtitle: string; at: string; tone: 'neutral' | 'positive' | 'warn' }
    const events: Event[] = []

    for (const s of (sentRes.data ?? []) as any[]) {
      const lead = Array.isArray(s.leads) ? s.leads[0] : s.leads
      const who = lead ? `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim() || lead.company || 'a lead' : 'a lead'
      events.push({
        type: 'sent',
        title: `FIGSY sent to ${who}`,
        subtitle: `Step ${s.step}${s.subject ? ` · ${s.subject}` : ''}`,
        at: s.sent_at,
        tone: 'neutral',
      })
    }

    for (const r of (repliesRes.data ?? []) as any[]) {
      const who = r.from_name || (r.from_email ? r.from_email.split('@')[0] : 'a lead')
      if (r.meeting_booked_at) {
        events.push({ type: 'meeting', title: `Meeting booked with ${who}`, subtitle: 'FIGSY closed a booking', at: r.meeting_booked_at, tone: 'positive' })
      }
      const hot = r.classification === 'hot' || r.classification === 'interested'
      events.push({
        type: 'reply',
        title: `${hot ? '🔥 ' : ''}Reply from ${who}`,
        subtitle: r.classification ? `Classified: ${r.classification}` : 'New reply',
        at: r.received_at,
        tone: hot ? 'positive' : r.classification === 'opt_out' ? 'warn' : 'neutral',
      })
    }

    events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    res.json({ success: true, data: events.slice(0, limit) })
  } catch (err) { console.error('[figsy/activity]', err); res.status(500).json({ success: false, error: 'Failed to fetch activity' }) }
})

// ── KPIs ──────────────────────────────────────────────────────────────────────
figsyRouter.get('/kpis', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const period = (req.query.period as string) ?? 'all'
    const since = period === '7d'  ? new Date(Date.now() - 7  * 86400000).toISOString()
                : period === '30d' ? new Date(Date.now() - 30 * 86400000).toISOString()
                : period === '90d' ? new Date(Date.now() - 90 * 86400000).toISOString()
                : null

    // figsy_sent_emails has no client_id — scope it via the client's campaigns.
    const campaignIds = await getClientCampaignIds(clientId)

    let sentQuery = db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).in('campaign_id', campaignIds)
    if (since !== null) sentQuery = sentQuery.gte('sent_at', since)

    let repliesQuery = db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', clientId)
    if (since !== null) repliesQuery = repliesQuery.gte('received_at', since)

    let interestedQuery = db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('classification', 'hot')
    if (since !== null) interestedQuery = interestedQuery.gte('received_at', since)

    let optOutQuery = db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('classification', 'opt_out')
    if (since !== null) optOutQuery = optOutQuery.gte('received_at', since)

    let opensQuery = db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).in('campaign_id', campaignIds).not('opened_at', 'is', null)
    if (since !== null) opensQuery = opensQuery.gte('sent_at', since)

    const [
      sentRes, repliesRes, interestedRes, optOutRes,
      activeCampaignsRes, totalLeadsRes, leadsContactedRes, avgScoreRes,
      meetingsRes, opensRes,
    ] = await Promise.all([
      sentQuery,
      repliesQuery,
      interestedQuery,
      optOutQuery,
      db.from('figsy_campaigns').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('status', 'active'),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
      // "Contacted" = leads actually put into outreach (enrolled), scoped via campaigns —
      // NOT status='consent_sent' (which over-counted, e.g. 19 contacted while 0 sent).
      db.from('figsy_enrollments').select('id', { count: 'exact', head: true }).in('campaign_id', campaignIds),
      db.from('leads').select('score').eq('client_id', clientId).not('score', 'is', null),
      // Meetings = real booked replies (meeting_booked_at set), NOT the driftable
      // figsy_campaigns.meetings_booked counter.
      db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', clientId).not('meeting_booked_at', 'is', null),
      opensQuery,
    ])

    const totalSent        = sentRes.count ?? 0
    const totalReplied     = repliesRes.count ?? 0
    const interested       = interestedRes.count ?? 0
    const optOuts          = optOutRes.count ?? 0
    const activeCampaigns  = activeCampaignsRes.count ?? 0
    const totalLeads       = totalLeadsRes.count ?? 0
    const leadsContacted   = leadsContactedRes.count ?? 0

    const scores = (avgScoreRes.data ?? []) as { score: number }[]
    const avgScore = scores.length
      ? Math.round(scores.reduce((sum, l) => sum + (l.score || 0), 0) / scores.length)
      : 0

    const meetingsBooked = meetingsRes.count ?? 0
    const totalOpened   = opensRes.count ?? 0

    const replyRate     = totalSent > 0 ? totalReplied / totalSent : 0
    const interestedRate = totalSent > 0 ? interested / totalSent : 0
    const openRate      = totalSent > 0 ? totalOpened / totalSent : 0

    res.json({
      success: true,
      data: {
        totalSent,
        totalReplied,
        replyRate,
        interested,
        interestedRate,
        optOuts,
        activeCampaigns,
        totalLeads,
        leadsContacted,
        avgScore,
        meetingsBooked,
        totalOpened,
        openRate,
        period,
      },
    })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch KPIs' }) }
})

// ── DAILY SENDS TIME SERIES (for the KPIs sparkline) ─────────────────────────
// GET /figsy/sends-daily?days=7 → [{ date: 'YYYY-MM-DD', count }] oldest→newest
figsyRouter.get('/sends-daily', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const days = Math.min(Math.max(parseInt((req.query.days as string) ?? '7', 10) || 7, 1), 90)
    const since = new Date(Date.now() - (days - 1) * 86400000)
    since.setUTCHours(0, 0, 0, 0)

    const campaignIds = await getClientCampaignIds(clientId)
    const { data, error } = await db.from('figsy_sent_emails')
      .select('sent_at')
      .in('campaign_id', campaignIds)
      .gte('sent_at', since.toISOString())
    if (error) throw error

    // Pre-seed one bucket per day (UTC) so days with zero sends still appear.
    const buckets: Record<string, number> = {}
    for (let i = 0; i < days; i++) {
      const d = new Date(since.getTime() + i * 86400000)
      buckets[d.toISOString().split('T')[0]] = 0
    }
    for (const row of data ?? []) {
      const key = (row.sent_at as string).split('T')[0]
      if (key in buckets) buckets[key]++
    }

    const series = Object.entries(buckets).map(([date, count]) => ({ date, count }))
    res.json({ success: true, data: series })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch daily sends' }) }
})

// ── CAMPAIGNS ────────────────────────────────────────────────────────────────

// Reconcile the denormalised campaign counters against the real source tables.
// Those counters (emails_sent, replies_total, replies_interested, opted_out,
// meetings_booked, leads_enrolled) drift — usually DOWN to 0 — because their
// increments are unchecked read-modify-writes and several paths never bump them
// (e.g. warm/cold replies, one-click unsubscribes). We correct each displayed
// number UP to the real row count, so the portal never shows less than reality.
async function reconcileCampaignCounters(
  campaigns: Array<Record<string, unknown> & { id: string }>,
): Promise<void> {
  const ids = campaigns.map(c => c.id)
  if (!ids.length) return
  const [sentRes, repliesRes, enrollRes] = await Promise.all([
    db.from('figsy_sent_emails').select('campaign_id').in('campaign_id', ids),
    db.from('figsy_replies').select('campaign_id, classification, meeting_booked_at').in('campaign_id', ids),
    db.from('figsy_enrollments').select('campaign_id').in('campaign_id', ids),
  ])
  const sent: Record<string, number> = {}
  for (const r of (sentRes.data ?? []) as { campaign_id: string | null }[]) {
    if (r.campaign_id) sent[r.campaign_id] = (sent[r.campaign_id] ?? 0) + 1
  }
  const repliesTotal: Record<string, number> = {}
  const repliesInterested: Record<string, number> = {}
  const optedOut: Record<string, number> = {}
  const meetings: Record<string, number> = {}
  for (const r of (repliesRes.data ?? []) as { campaign_id: string | null; classification: string | null; meeting_booked_at: string | null }[]) {
    if (!r.campaign_id) continue
    repliesTotal[r.campaign_id] = (repliesTotal[r.campaign_id] ?? 0) + 1
    if (r.classification === 'hot' || r.classification === 'interested') repliesInterested[r.campaign_id] = (repliesInterested[r.campaign_id] ?? 0) + 1
    if (r.classification === 'opt_out' || r.classification === 'unsubscribe') optedOut[r.campaign_id] = (optedOut[r.campaign_id] ?? 0) + 1
    if (r.meeting_booked_at) meetings[r.campaign_id] = (meetings[r.campaign_id] ?? 0) + 1
  }
  const enrolled: Record<string, number> = {}
  for (const r of (enrollRes.data ?? []) as { campaign_id: string | null }[]) {
    if (r.campaign_id) enrolled[r.campaign_id] = (enrolled[r.campaign_id] ?? 0) + 1
  }
  const n = (v: unknown) => (typeof v === 'number' ? v : 0)
  for (const c of campaigns) {
    c.emails_sent        = Math.max(sent[c.id] ?? 0,              n(c.emails_sent))
    c.replies_total      = Math.max(repliesTotal[c.id] ?? 0,      n(c.replies_total))
    c.replies_interested = Math.max(repliesInterested[c.id] ?? 0, n(c.replies_interested))
    c.opted_out          = Math.max(optedOut[c.id] ?? 0,          n(c.opted_out))
    c.meetings_booked    = Math.max(meetings[c.id] ?? 0,          n(c.meetings_booked))
    c.leads_enrolled     = Math.max(enrolled[c.id] ?? 0,          n(c.leads_enrolled))
  }
}

figsyRouter.get('/campaigns', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data, error } = await db.from('figsy_campaigns')
      .select('*').eq('client_id', clientId).order('created_at', { ascending: false })
    if (error) throw error
    const campaigns = (data ?? []) as Array<Record<string, unknown> & { id: string }>
    await reconcileCampaignCounters(campaigns)
    res.json({ success: true, data: campaigns })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch campaigns' }) }
})

figsyRouter.get('/campaigns/:id', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data, error } = await db.from('figsy_campaigns')
      .select('*').eq('id', req.params.id).eq('client_id', clientId).single()
    if (error || !data) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }
    await reconcileCampaignCounters([data as Record<string, unknown> & { id: string }])
    res.json({ success: true, data })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch campaign' }) }
})

figsyRouter.post('/campaigns', async (req: AuthRequest, res) => {
  try {
    const body = z.object({
      name:   z.string().min(1),
      icp_id: z.string().uuid().optional(),
    }).parse(req.body)
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data, error } = await db.from('figsy_campaigns')
      .insert({ ...body, client_id: clientId }).select().single()
    if (error) throw error
    res.status(201).json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to create campaign' })
  }
})

// ── KILL-SWITCH — pause ALL of this client's active campaigns at once ──────────
// Account-wide panic button for runaway-send / compromised-account protection.
// Reuses the exact per-campaign pause mechanism (status → 'paused'), client-scoped
// and idempotent (re-clicking pauses nothing more, returns paused: 0).
figsyRouter.post('/campaigns/pause-all', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data, error } = await db.from('figsy_campaigns')
      .update({ status: 'paused' })
      .eq('client_id', clientId)
      .eq('status', 'active')
      .select('id')
    if (error) throw error
    res.json({ success: true, data: { paused: (data ?? []).length } })
  } catch (err) {
    console.error('[figsy] pause-all failed', err)
    res.status(500).json({ success: false, error: 'Failed to pause campaigns' })
  }
})

figsyRouter.patch('/campaigns/:id', async (req: AuthRequest, res) => {
  try {
    const body = z.object({
      name:             z.string().min(1).optional(),
      status:           z.enum(['draft','active','paused','completed','archived']).optional(),
      system_prompt:    z.string().max(2000).nullable().optional(),
      daily_send_limit: z.number().int().min(0).max(500).nullable().optional(),
      review_required:  z.boolean().optional(),
      model_preference: z.enum(['haiku', 'sonnet']).optional(),
      ab_subject_b:          z.string().max(200).nullable().optional(),
      ab_subject_c:          z.string().max(200).nullable().optional(),
      ab_subject_d:          z.string().max(200).nullable().optional(),
      ab_subject_e:          z.string().max(200).nullable().optional(),
      steps:                 z.array(z.object({ step: z.number(), on_reply: z.enum(['stop','skip_next','continue']) })).optional(),
      send_days:             z.array(z.string()).optional(),
      send_hour_utc:         z.number().int().min(0).max(23).optional(),
      intent_signal_enroll:  z.boolean().optional(),
      intent_signal_types:   z.array(z.string()).optional(),
      personalized_images_enabled: z.boolean().optional(),
    }).parse(req.body)
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Build update payload — merge settings fields into existing settings JSONB
    const dbUpdate: Record<string, unknown> = {}
    if (body.name !== undefined) dbUpdate.name = body.name
    if (body.status !== undefined) dbUpdate.status = body.status
    if (body.model_preference !== undefined) dbUpdate.model_preference = body.model_preference

    const settingsUpdate: Record<string, unknown> = {}
    if (body.system_prompt !== undefined) settingsUpdate.system_prompt = body.system_prompt
    if (body.daily_send_limit !== undefined) settingsUpdate.daily_send_limit = body.daily_send_limit
    if (body.review_required !== undefined) settingsUpdate.review_required = body.review_required
    if (body.ab_subject_b !== undefined)         settingsUpdate.ab_subject_b = body.ab_subject_b
    if (body.ab_subject_c !== undefined)         settingsUpdate.ab_subject_c = body.ab_subject_c
    if (body.ab_subject_d !== undefined)         settingsUpdate.ab_subject_d = body.ab_subject_d
    if (body.ab_subject_e !== undefined)         settingsUpdate.ab_subject_e = body.ab_subject_e
    if (body.steps !== undefined)                settingsUpdate.steps = body.steps
    if (body.send_days !== undefined)            settingsUpdate.send_days = body.send_days
    if (body.send_hour_utc !== undefined)        settingsUpdate.send_hour_utc = body.send_hour_utc
    if (body.intent_signal_enroll !== undefined) settingsUpdate.intent_signal_enroll = body.intent_signal_enroll
    if (body.intent_signal_types !== undefined)  settingsUpdate.intent_signal_types = body.intent_signal_types
    if (body.personalized_images_enabled !== undefined) {
      dbUpdate.personalized_images_enabled = body.personalized_images_enabled
    }

    if (Object.keys(settingsUpdate).length > 0) {
      const { data: existing } = await db.from('figsy_campaigns')
        .select('settings').eq('id', req.params.id).eq('client_id', clientId).maybeSingle()
      dbUpdate.settings = { ...(existing?.settings ?? {}), ...settingsUpdate }
    }

    const { data, error } = await db.from('figsy_campaigns')
      .update(dbUpdate).eq('id', req.params.id).eq('client_id', clientId).select().single()
    if (error) throw error
    if (!data) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }
    res.json({ success: true, data })

    // Auto-enroll all campaign-ready (verified or consented) leads on activation
    // (fire-and-forget). Option A — see campaignReadyLeadIds.
    if (body.status === 'active') {
      ;(async () => {
        try {
          const leadIds = await campaignReadyLeadIds(clientId)
          for (const leadId of leadIds) {
            await autoEnrollLead(leadId, clientId)
          }
        } catch (e) { console.error('[figsy] auto-enroll on activation failed', e) }
      })()
    }
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to update campaign' })
  }
})

// ── ENROLL ALL CONSENTED LEADS ────────────────────────────────────────────────
figsyRouter.post('/campaigns/:id/enroll-consented', rateLimit({ limit: 30, windowMs: 60_000, key: 'figsy-enroll-consented', byUser: true }), async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: campaign } = await db.from('figsy_campaigns')
      .select('id, status').eq('id', req.params.id).eq('client_id', clientId).maybeSingle()
    if (!campaign) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }

    // Option A — campaign-ready = verified or consented (minus opted-out/rejected).
    const leadIds = await campaignReadyLeadIds(clientId)

    // Compute the ACCURATE count up front: only leads not already enrolled in this
    // campaign. Avoids over-reporting the same number on a repeat click.
    const { data: already } = leadIds.length
      ? await db.from('figsy_enrollments').select('lead_id').eq('campaign_id', campaign.id).in('lead_id', leadIds)
      : { data: [] as { lead_id: string }[] }
    const alreadySet = new Set((already ?? []).map((e: { lead_id: string }) => e.lead_id))
    const toEnroll = leadIds.filter(id => !alreadySet.has(id))

    res.json({ success: true, data: {
      enrolled: toEnroll.length,
      skipped: leadIds.length - toEnroll.length,
      message: toEnroll.length ? 'Enrolling in background…' : 'All eligible leads are already enrolled.',
    } })

    // Fire-and-forget — respond immediately, enroll async
    ;(async () => {
      for (const leadId of toEnroll) {
        try { await autoEnrollLead(leadId, clientId) } catch (e) { console.error('[figsy] enroll-consented', leadId, e) }
      }
      console.log(`[figsy] enroll-consented: enrolled=${toEnroll.length} already=${alreadySet.size} campaign=${campaign.id}`)
    })()
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, error: 'Failed to start enrollment' })
  }
})

// ── SAVE AUDIENCE SETTINGS ───────────────────────────────────────────────────
figsyRouter.put('/campaigns/:id/audience', async (req: AuthRequest, res) => {
  try {
    const { min_score, max_score, daily_limit } = z.object({
      min_score:   z.number().min(0).max(100).optional(),
      max_score:   z.number().min(0).max(100).optional(),
      daily_limit: z.number().min(1).max(500).optional(),
    }).parse(req.body)
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data: existing } = await db.from('figsy_campaigns')
      .select('settings').eq('id', req.params.id).eq('client_id', clientId).maybeSingle()
    if (existing === null) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }
    const updated = {
      ...(existing?.settings ?? {}),
      ...(min_score   !== undefined ? { min_score }   : {}),
      ...(max_score   !== undefined ? { max_score }   : {}),
      ...(daily_limit !== undefined ? { daily_limit } : {}),
    }
    const { data, error } = await db.from('figsy_campaigns')
      .update({ settings: updated }).eq('id', req.params.id).eq('client_id', clientId).select().maybeSingle()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to save audience settings' })
  }
})

// ── SEND DUE EMAILS NOW (manual trigger for a single campaign) ────────────────
figsyRouter.post('/campaigns/:id/send-now', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data: campaign } = await db.from('figsy_campaigns')
      .select('id, status').eq('id', req.params.id).eq('client_id', clientId).maybeSingle()
    if (!campaign) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }

    const now = new Date().toISOString()
    const { data: due } = await db.from('figsy_enrollments')
      .select('*, leads(id,first_name,last_name,email,job_title,company,industry,seniority,country,tech_stack,score,score_reasoning)')
      .eq('campaign_id', req.params.id)
      .in('status', ['enrolled', 'in_progress'])
      .lte('next_send_at', now)
      .limit(50)

    const { sendSequenceEmail, enrollmentStep } = await import('../lib/figsy')
    let sent = 0
    for (const enrollment of due ?? []) {
      const lead = Array.isArray(enrollment.leads) ? enrollment.leads[0] : enrollment.leads
      if (!lead?.email) continue
      // #212 — walk the full ≤10-step sequence via enrollmentStep (jsonb `steps`,
      // else legacy step1-3 columns). null = past the last usable step.
      const nextStep = enrollment.current_step + 1
      const stepView = enrollmentStep(enrollment, nextStep)
      if (!stepView) {
        // End of the sequence — complete it so it doesn't stay perpetually due.
        await db.from('figsy_enrollments').update({
          status: 'completed', completed_at: new Date().toISOString(), next_send_at: null,
        }).eq('id', enrollment.id)
        continue
      }
      try {
        await sendSequenceEmail(enrollment.id, lead, nextStep, stepView.subject, stepView.body, req.params.id, { totalSteps: stepView.total, waitDaysNext: stepView.wait_days })
        sent++
      } catch (err) { console.error('[send-now] enrollment', enrollment.id, ':', err) }
    }
    res.json({ success: true, data: { sent, due_count: (due ?? []).length } })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, error: 'Failed to send emails' })
  }
})

// ── SAVE SEQUENCE STEPS ───────────────────────────────────────────────────────
figsyRouter.put('/campaigns/:id/sequence', async (req: AuthRequest, res) => {
  try {
    const { steps } = z.object({ steps: z.array(z.any()).min(1) }).parse(req.body)
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: existing } = await db.from('figsy_campaigns')
      .select('settings').eq('id', req.params.id).eq('client_id', clientId).maybeSingle()
    if (existing === null) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }

    const { data, error } = await db.from('figsy_campaigns')
      .update({ settings: { ...(existing.settings ?? {}), steps } })
      .eq('id', req.params.id).eq('client_id', clientId).select().maybeSingle()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to save sequence' })
  }
})

// ── SEQUENCE LIBRARY (item 187) ───────────────────────────────────────────────
// Reusable sequences/templates (email-first, literal copy with merge tokens) that
// can be saved once and applied to any campaign (new or existing). Email steps send;
// non-email channels are stored for display but don't send yet.

const sequenceStepSchema = z.object({
  channel:   z.enum(['email', 'linkedin', 'call', 'whatsapp']),
  subject:   z.string().max(300).optional(),
  body:      z.string().max(8000).optional(),
  wait_days: z.number().int().min(0).max(120).optional(),
  on_reply:  z.enum(['stop', 'skip_next', 'continue']).optional(),
})

// GET /figsy/sequences — the client's saved sequence library
figsyRouter.get('/sequences', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data, error } = await db.from('figsy_sequences')
      .select('id, name, steps, created_at, updated_at')
      .eq('client_id', clientId).order('created_at', { ascending: false }).limit(100)
    if (error) throw error
    res.json({ success: true, data: data ?? [] })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to load sequences' }) }
})

// POST /figsy/sequences — save a new sequence to the library
figsyRouter.post('/sequences', async (req: AuthRequest, res) => {
  try {
    const { name, steps } = z.object({
      name:  z.string().min(1).max(160),
      steps: z.array(sequenceStepSchema).min(1).max(20),
    }).parse(req.body)
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const emailCount = emailSteps(steps as SequenceStep[]).length
    if (emailCount === 0) {
      res.status(400).json({ success: false, error: 'A sequence needs at least one email step (email-first).' }); return
    }
    // #426 — the send engine walks up to MAX_SEQUENCE_STEPS email steps. Reject a
    // longer sequence at save time (honest hard cap, not a silent truncation).
    if (emailCount > MAX_SEQUENCE_STEPS) {
      res.status(400).json({ success: false, error: `A sequence can have at most ${MAX_SEQUENCE_STEPS} email steps.` }); return
    }
    const { data, error } = await db.from('figsy_sequences')
      .insert({ client_id: clientId, name, steps }).select('id, name, steps, created_at, updated_at').single()
    if (error) throw error
    res.status(201).json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to save sequence' })
  }
})

// PUT /figsy/sequences/:id — rename / edit a saved sequence
figsyRouter.put('/sequences/:id', async (req: AuthRequest, res) => {
  try {
    const { name, steps } = z.object({
      name:  z.string().min(1).max(160).optional(),
      steps: z.array(sequenceStepSchema).min(1).max(20).optional(),
    }).parse(req.body)
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    if (steps) {
      const emailCount = emailSteps(steps as SequenceStep[]).length
      if (emailCount === 0) {
        res.status(400).json({ success: false, error: 'A sequence needs at least one email step (email-first).' }); return
      }
      if (emailCount > MAX_SEQUENCE_STEPS) {
        res.status(400).json({ success: false, error: `A sequence can have at most ${MAX_SEQUENCE_STEPS} email steps.` }); return
      }
    }
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined)  update.name = name
    if (steps !== undefined) update.steps = steps
    const { data, error } = await db.from('figsy_sequences')
      .update(update).eq('id', req.params.id).eq('client_id', clientId)
      .select('id, name, steps, created_at, updated_at').maybeSingle()
    if (error) throw error
    if (!data) { res.status(404).json({ success: false, error: 'Sequence not found' }); return }
    res.json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to update sequence' })
  }
})

// DELETE /figsy/sequences/:id
figsyRouter.delete('/sequences/:id', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { error } = await db.from('figsy_sequences')
      .delete().eq('id', req.params.id).eq('client_id', clientId)
    if (error) throw error
    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to delete sequence' }) }
})

// POST /figsy/sequences/:id/apply — apply a saved sequence to a campaign.
// Body: { campaign_id }                → set the sequence on an EXISTING campaign
//   or: { new_campaign_name, icp_id? } → create a NEW campaign with the sequence
// Stores the steps on campaign.settings.sequence (the enrollment seam reads this) and
// mirrors the per-step on_reply rules into settings.steps for reply branching.
figsyRouter.post('/sequences/:id/apply', async (req: AuthRequest, res) => {
  try {
    const body = z.object({
      campaign_id:       z.string().uuid().optional(),
      new_campaign_name: z.string().min(1).max(160).optional(),
      icp_id:            z.string().uuid().optional(),
    }).refine(b => !!b.campaign_id || !!b.new_campaign_name, {
      message: 'Provide either campaign_id (existing) or new_campaign_name (new).',
    }).parse(req.body)
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: sequence } = await db.from('figsy_sequences')
      .select('id, name, steps').eq('id', req.params.id).eq('client_id', clientId).maybeSingle()
    if (!sequence) { res.status(404).json({ success: false, error: 'Sequence not found' }); return }

    const steps = (sequence.steps as SequenceStep[]) ?? []
    const emails = emailSteps(steps)
    if (emails.length === 0) {
      res.status(400).json({ success: false, error: 'This sequence has no email steps to send.' }); return
    }
    // #426 — cap at MAX_SEQUENCE_STEPS email steps (a library sequence saved before the
    // cap could still carry more). Reject rather than silently truncate the send.
    if (emails.length > MAX_SEQUENCE_STEPS) {
      res.status(400).json({ success: false, error: `A sequence can have at most ${MAX_SEQUENCE_STEPS} email steps.` }); return
    }
    // #212 — reply-branching rules, one per email step, across the FULL depth (was
    // capped at 3). The send engine reads settings.steps for on_reply handling.
    const branchingSteps = emails.slice(0, MAX_SEQUENCE_STEPS).map((s, i) => ({ step: i + 1, on_reply: s.on_reply ?? 'stop' }))

    let campaignId: string
    let created = false
    if (body.campaign_id) {
      const { data: existing } = await db.from('figsy_campaigns')
        .select('id, settings').eq('id', body.campaign_id).eq('client_id', clientId).maybeSingle()
      if (!existing) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }
      const { error } = await db.from('figsy_campaigns').update({
        settings: { ...(existing.settings ?? {}), sequence: steps, steps: branchingSteps, applied_sequence_id: sequence.id },
        steps_count: Math.min(MAX_SEQUENCE_STEPS, emails.length),
      }).eq('id', body.campaign_id).eq('client_id', clientId)
      if (error) throw error
      campaignId = body.campaign_id
    } else {
      const { data: newCamp, error } = await db.from('figsy_campaigns').insert({
        client_id: clientId,
        name:      body.new_campaign_name!,
        ...(body.icp_id ? { icp_id: body.icp_id } : {}),
        status:    'draft',
        steps_count: Math.min(MAX_SEQUENCE_STEPS, emails.length),
        settings:  { sequence: steps, steps: branchingSteps, applied_sequence_id: sequence.id },
      }).select('id').single()
      if (error) throw error
      campaignId = newCamp.id
      created = true
    }

    res.json({ success: true, data: { campaign_id: campaignId, created, email_steps: emails.length } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to apply sequence' })
  }
})

// ── CLONE CAMPAIGN ────────────────────────────────────────────────────────────
figsyRouter.post('/campaigns/:campaignId/clone', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: original, error: fetchErr } = await db.from('figsy_campaigns')
      .select('name, icp_id, status, settings')
      .eq('id', req.params.campaignId)
      .eq('client_id', clientId)
      .single()

    if (fetchErr || !original) {
      res.status(404).json({ success: false, error: 'Campaign not found' }); return
    }

    const { data: newCampaign, error: insertErr } = await db.from('figsy_campaigns')
      .insert({
        name:      `${original.name} (copy)`,
        icp_id:    original.icp_id ?? null,
        status:    'draft',
        settings:  original.settings ?? null,
        client_id: clientId,
      })
      .select()
      .single()

    if (insertErr) throw insertErr
    res.status(201).json({ success: true, campaign: newCampaign })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, error: 'Failed to clone campaign' })
  }
})

figsyRouter.delete('/campaigns/:id', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { error } = await db.from('figsy_campaigns')
      .delete().eq('id', req.params.id).eq('client_id', clientId)
    if (error) throw error
    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to delete campaign' }) }
})

// ── P2-8 KANBAN VIEW ─────────────────────────────────────────────────────────
figsyRouter.get('/campaigns/:id/kanban', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: campaign } = await db.from('figsy_campaigns')
      .select('id, name').eq('id', req.params.id).eq('client_id', clientId).maybeSingle()
    if (!campaign) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }

    const { data: enrollments } = await db.from('figsy_enrollments')
      .select('id, lead_id, current_step, status, enrolled_at, next_send_at, leads(first_name,last_name,company,job_title)')
      .eq('campaign_id', req.params.id)
      .order('enrolled_at', { ascending: false })
      .limit(500)

    const columns: Record<string, object[]> = {
      enrolled: [], step1_sent: [], step2_sent: [], step3_sent: [], replied: [], completed: []
    }

    for (const e of enrollments ?? []) {
      const lead = {
        id: e.lead_id,
        enrollment_id: e.id,
        first_name: (e.leads as any)?.first_name ?? '',
        last_name: (e.leads as any)?.last_name ?? '',
        company: (e.leads as any)?.company ?? null,
        job_title: (e.leads as any)?.job_title ?? null,
        current_step: e.current_step,
        status: e.status,
        enrolled_at: e.enrolled_at,
        next_send_at: e.next_send_at,
      }
      if (e.status === 'replied') columns.replied.push(lead)
      else if (e.status === 'completed') columns.completed.push(lead)
      else if (e.current_step === 0) columns.enrolled.push(lead)
      else if (e.current_step === 1) columns.step1_sent.push(lead)
      else if (e.current_step === 2) columns.step2_sent.push(lead)
      else columns.step3_sent.push(lead)
    }

    res.json({ success: true, data: { campaign, columns } })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to load kanban' }) }
})

figsyRouter.patch('/enrollments/:enrollmentId/status', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { status } = req.body as { status: string }
    if (!['replied', 'completed'].includes(status)) {
      res.status(400).json({ success: false, error: 'Status must be replied or completed' }); return
    }
    // Verify ownership through campaign
    const { data: enrollment } = await db.from('figsy_enrollments')
      .select('id, campaign_id')
      .eq('id', req.params.enrollmentId)
      .maybeSingle()
    if (!enrollment) { res.status(404).json({ success: false, error: 'Enrollment not found' }); return }
    const { data: campaign } = await db.from('figsy_campaigns')
      .select('id').eq('id', enrollment.campaign_id).eq('client_id', clientId).maybeSingle()
    if (!campaign) { res.status(403).json({ success: false, error: 'Forbidden' }); return }
    await db.from('figsy_enrollments').update({ status }).eq('id', enrollment.id)
    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to update status' }) }
})

// ── ENROLLMENTS ───────────────────────────────────────────────────────────────

figsyRouter.get('/campaigns/:id/enrollments', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data: campaign } = await db.from('figsy_campaigns')
      .select('id').eq('id', req.params.id).eq('client_id', clientId).maybeSingle()
    if (!campaign) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }
    const { data, error } = await db.from('figsy_enrollments')
      .select('*, leads(first_name,last_name,email,job_title,company,score)')
      .eq('campaign_id', req.params.id)
      .order('enrolled_at', { ascending: false })
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch enrollments' }) }
})

// Enroll one or more leads into a campaign
figsyRouter.post('/campaigns/:id/enroll', rateLimit({ limit: 30, windowMs: 60_000, key: 'figsy-enroll', byUser: true }), async (req: AuthRequest, res) => {
  try {
    const { lead_ids } = z.object({
      lead_ids: z.array(z.string().uuid()).min(1).max(50),
    }).parse(req.body)
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: campaign } = await db.from('figsy_campaigns')
      .select('id, status, settings').eq('id', req.params.id).eq('client_id', clientId).maybeSingle()
    if (!campaign) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }

    // Item 187 — a saved sequence/template applied to this campaign (literal copy).
    const appliedSequence = ((campaign.settings as { sequence?: SequenceStep[] } | null)?.sequence) ?? undefined

    const { data: client } = await db.from('clients')
      .select('company_name, industry, booking_url').eq('id', clientId).maybeSingle()
    // P-a: configurable sign-off name (guarded — null if column missing pre-migration).
    const { data: clientSigner } = await db.from('clients').select('signer_name').eq('id', clientId).maybeSingle()
    const senderName: string | null = (clientSigner?.signer_name as string | null) ?? null

    const { data: leads } = await db.from('leads')
      .select('id, first_name, last_name, email, job_title, company, industry, seniority, country, tech_stack, score, score_reasoning')
      .in('id', lead_ids).eq('client_id', clientId)

    // POPIA: never enrol anyone on the opt-out blocklist. Pull the blocklisted
    // emails for this batch up front so we can skip them.
    const batchEmails = (leads ?? []).map((l: { email: string | null }) => l.email).filter(Boolean) as string[]
    const blocked = new Set<string>()
    if (batchEmails.length > 0) {
      const { data: blockRows } = await db.from('opt_out_blocklist')
        .select('email').in('email', batchEmails).is('opted_back_in_at', null)
      for (const r of blockRows ?? []) blocked.add((r as { email: string }).email)
    }

    // #310 — FIGSY is charged at enrollment (1 credit = 1 lead enrolled). Read the
    // client's FIGSY balance up front and gate + deduct PER lead, mirroring
    // autoEnrollLead. Previously this route enrolled + sent for free at any balance.
    const { data: balRow } = await db.from('clients')
      .select('figsy_credits_remaining').eq('id', clientId).maybeSingle()
    let figsyRemaining = (balRow?.figsy_credits_remaining as number | null) ?? 0

    // #335 — fetch the client's business-knowledge digest ONCE (bounded), reused
    // for every lead's generated sequence so the solution half is grounded.
    const clientKnowledge = await getClientKnowledgeForOutreach(clientId)

    let enrolled = 0
    let skipped  = 0
    let insufficientCredits = false

    for (const lead of leads ?? []) {
      if (!lead.email) { skipped++; continue }
      if (blocked.has(lead.email)) { skipped++; continue }   // opted out — never email

      // Out of FIGSY credits — stop; never give away free outreach.
      if (!canEnroll(figsyRemaining)) { insufficientCredits = true; break }

      // Skip if already enrolled (idempotent — no charge)
      const { data: existing } = await db.from('figsy_enrollments')
        .select('id').eq('campaign_id', campaign.id).eq('lead_id', lead.id).maybeSingle()
      if (existing) { skipped++; continue }

      let didCharge = false
      try {
        // Item 187 — applied sequence's literal copy if present, else AI-generated.
        const draft = (appliedSequence && buildDraftFromSequence(appliedSequence, lead as any, client?.company_name ?? null))
          || await generateSequence(lead as any, client?.company_name ?? '', client?.industry ?? null, undefined, client?.booking_url ?? null, senderName, clientKnowledge)

        // #212 — full ≤10-step sequence (client copy carries its own cadence; AI is 3-step).
        const fullSteps = appliedSequence
          ? buildDraftStepsFromSequence(appliedSequence, lead as any, client?.company_name ?? null)
          : draftToSteps(draft)

        // #332 — charge FIRST (the charge is the real gate). A mid-batch charge
        // failure means the balance is gone — stop enrolling further leads.
        didCharge = await chargeFigsyEnroll(clientId, lead)
        if (!didCharge) { insufficientCredits = true; break }

        const { error } = await db.from('figsy_enrollments').insert({
          campaign_id:    campaign.id,
          lead_id:        lead.id,
          client_id:      clientId,
          status:         'enrolled',
          current_step:   0,
          next_send_at:   new Date().toISOString(),
          steps:          fullSteps.length > 0 ? fullSteps : null,
          total_steps:    fullSteps.length > 0 ? fullSteps.length : null,
          step1_subject:  draft.step1.subject,
          step1_body:     draft.step1.body,
          step2_subject:  draft.step2.subject,
          step2_body:     draft.step2.body,
          step3_subject:  draft.step3.subject,
          step3_body:     draft.step3.body,
        })
        if (error) { await refundFigsyEnroll(clientId); skipped++; continue }
        figsyRemaining -= 1
        enrolled++
      } catch {
        // P8 — a THROW after a successful charge (e.g. the insert throws) would leak
        // the credit into this catch with no refund. Return it before skipping.
        if (didCharge) await refundFigsyEnroll(clientId)
        skipped++
      }
    }

    // Bump enrolled count on campaign
    const { data: camp } = await db.from('figsy_campaigns')
      .select('leads_enrolled').eq('id', campaign.id).maybeSingle()
    if (camp && enrolled > 0) {
      await db.from('figsy_campaigns')
        .update({ leads_enrolled: (camp.leads_enrolled ?? 0) + enrolled })
        .eq('id', campaign.id)
    }

    res.json({ success: true, data: { enrolled, skipped, insufficient_credits: insufficientCredits } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to enroll leads' })
  }
})

// Preview AI-generated sequence for a single lead (no send)
figsyRouter.post('/campaigns/:id/preview-sequence', async (req: AuthRequest, res) => {
  try {
    const { lead_id } = z.object({ lead_id: z.string().uuid() }).parse(req.body)
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: lead } = await db.from('leads')
      .select('id, first_name, last_name, email, job_title, company, industry, seniority, country, tech_stack, score, score_reasoning')
      .eq('id', lead_id).eq('client_id', clientId).maybeSingle()
    if (!lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    const { data: client } = await db.from('clients')
      .select('company_name, industry, booking_url').eq('id', clientId).maybeSingle()
    const { data: clientSigner } = await db.from('clients').select('signer_name').eq('id', clientId).maybeSingle()
    const senderName: string | null = (clientSigner?.signer_name as string | null) ?? null

    const clientKnowledge = await getClientKnowledgeForOutreach(clientId)
    const draft = await generateSequence(lead as any, client?.company_name ?? '', client?.industry ?? null, undefined, client?.booking_url ?? null, senderName, clientKnowledge)
    res.json({ success: true, data: draft })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to generate sequence preview' })
  }
})

// ── SEND TEST EMAIL ───────────────────────────────────────────────────────────
figsyRouter.post('/campaigns/:id/test-email', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: campaign } = await db.from('figsy_campaigns')
      .select('*').eq('id', req.params.id).eq('client_id', clientId).maybeSingle()
    if (!campaign) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }

    const { data: client } = await db.from('clients')
      .select('company_name, industry, signer_name').eq('id', clientId).maybeSingle()

    // Optional recipient override — lets the founder fire a REAL cold-path test (pixel,
    // List-Unsubscribe, cold FROM, generated copy) at any inbox: mail-tester.com for a
    // deliverability score, or a personal Gmail/Outlook to check Primary-vs-Promotions.
    // Defaults to the signed-in user's own email when omitted.
    const toOverride = z.object({ to_email: z.string().email().optional() }).parse(req.body ?? {}).to_email
    const { data: { user } } = await db.auth.admin.getUserById(req.userId!)
    const toEmail = toOverride || user?.email
    if (!toEmail) { res.status(400).json({ success: false, error: 'Could not resolve a recipient email address' }); return }

    // Generate sequence using a placeholder lead representing the sender
    const fakeLead = {
      id: 'test', first_name: 'You', last_name: '(Test)', email: toEmail,
      job_title: 'Decision Maker', company: 'Your Company',
      industry: client?.industry ?? null, seniority: 'senior',
      country: 'ZA', tech_stack: [], score: 85, score_reasoning: 'Test preview',
    }
    // Pass the configured signer so the test reflects the real campaign sign-off,
    // plus the client's knowledge digest so the test copy is grounded like production.
    const clientKnowledge = await getClientKnowledgeForOutreach(clientId)
    const sequence = await generateSequence(fakeLead as any, client?.company_name ?? '', client?.industry ?? null, undefined, undefined, (client as { signer_name?: string | null })?.signer_name ?? null, clientKnowledge)
    const step1 = sequence?.step1
    if (!step1?.subject || !step1?.body) {
      res.status(500).json({ success: false, error: 'Failed to generate email preview' }); return
    }

    await sendSequenceEmail('test-preview', fakeLead as any, 1, step1.subject, step1.body, req.params.id, { isPreview: true })
    res.json({ success: true, message: `Test email sent to ${toEmail}` })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, error: 'Failed to send test email' })
  }
})

// ── SEND NEXT STEP (manual trigger or cron) ───────────────────────────────────
figsyRouter.post('/send-due', rateLimit({ limit: 30, windowMs: 60_000, key: 'figsy-send-due', byUser: true }), async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Domain warming cap — FIGSY_DAILY_SEND_LIMIT env var limits total sends per day across all clients
    const dailyLimit = process.env.FIGSY_DAILY_SEND_LIMIT ? parseInt(process.env.FIGSY_DAILY_SEND_LIMIT, 10) : null
    let remaining = 20 // default batch size
    if (dailyLimit !== null && !isNaN(dailyLimit)) {
      const todayUTC = new Date()
      todayUTC.setUTCHours(0, 0, 0, 0)
      const { count } = await db.from('figsy_sent_emails')
        .select('id', { count: 'exact', head: true })
        .gte('sent_at', todayUTC.toISOString())
      const sentToday = count ?? 0
      remaining = Math.max(0, dailyLimit - sentToday)
      if (remaining === 0) {
        res.json({ success: true, data: { sent: 0, capped: true, daily_limit: dailyLimit } })
        return
      }
    }

    // Only send for this client's ACTIVE campaigns — paused/archived must stop.
    const { data: activeCamps } = await db.from('figsy_campaigns')
      .select('id').eq('client_id', clientId).eq('status', 'active')
    const activeCampaignIds = (activeCamps ?? []).map((c: { id: string }) => c.id)
    if (activeCampaignIds.length === 0) {
      res.json({ success: true, data: { sent: 0, no_active_campaigns: true } })
      return
    }

    const now = new Date().toISOString()
    const { data: due } = await db.from('figsy_enrollments')
      .select('*, leads(id,first_name,last_name,email,job_title,company,industry,seniority,country,tech_stack,score,score_reasoning)')
      .eq('client_id', clientId)
      .in('campaign_id', activeCampaignIds)
      .in('status', ['enrolled', 'in_progress'])
      .lte('next_send_at', now)
      .limit(remaining)

    const stepsCache = new Map<string, { step: number; on_reply?: 'stop' | 'skip_next' | 'continue' }[] | null>()
    let sent = 0
    for (const enrollment of due ?? []) {
      const lead = Array.isArray(enrollment.leads) ? enrollment.leads[0] : enrollment.leads
      if (!lead?.email) continue
      // #212 — walk the full ≤10-step sequence via enrollmentStep (jsonb `steps`,
      // else legacy step1-3 columns). null = past the last usable step.
      const nextStep = enrollment.current_step + 1
      const stepView = enrollmentStep(enrollment, nextStep)
      if (!stepView) {
        // End of the sequence — complete it so it doesn't stay perpetually due.
        await db.from('figsy_enrollments').update({
          status: 'completed', completed_at: new Date().toISOString(), next_send_at: null,
        }).eq('id', enrollment.id)
        continue
      }

      // Honour the step's on_reply setting if the lead has replied since last send
      try {
        if (await applyReplyBranching(enrollment, stepsCache) === 'skip') continue
      } catch (err) {
        console.error('[figsy/send-due] branching', enrollment.id, ':', err)
      }

      try {
        await sendSequenceEmail(enrollment.id, lead, nextStep, stepView.subject, stepView.body, enrollment.campaign_id, { totalSteps: stepView.total, waitDaysNext: stepView.wait_days })
        sent++
      } catch (err) {
        console.error('[figsy/send-due]', err)
      }
    }

    res.json({ success: true, data: { sent, ...(dailyLimit !== null ? { daily_limit: dailyLimit } : {}) } })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to send due emails' }) }
})

// ── REPLIES ───────────────────────────────────────────────────────────────────

figsyRouter.get('/campaigns/:id/replies', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data: campaign } = await db.from('figsy_campaigns')
      .select('id').eq('id', req.params.id).eq('client_id', clientId).maybeSingle()
    if (!campaign) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }
    const { data, error } = await db.from('figsy_replies')
      .select('*').eq('campaign_id', req.params.id).order('received_at', { ascending: false })
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch replies' }) }
})

// ── AI FOLLOW-UP DRAFT ────────────────────────────────────────────────────────
figsyRouter.post('/replies/:id/draft-followup', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: reply } = await db.from('figsy_replies')
      .select('id, body, from_email, classification, lead_id')
      .eq('id', req.params.id)
      .eq('client_id', clientId)
      .maybeSingle()
    if (!reply) { res.status(404).json({ success: false, error: 'Reply not found' }); return }

    const { data: lead } = await db.from('leads')
      .select('first_name, last_name, job_title, company')
      .eq('id', reply.lead_id).maybeSingle()

    const { data: client } = await db.from('clients')
      .select('company_name').eq('id', clientId).maybeSingle()

    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `You are an AI sales assistant. Draft a concise, professional follow-up reply to this interested lead.

Lead: ${lead?.first_name} ${lead?.last_name}, ${lead?.job_title} at ${lead?.company}
Our company: ${client?.company_name}
Their reply: "${reply.body.slice(0, 600)}"

Write a warm, brief reply (3-5 sentences) that:
1. Thanks them for their interest
2. Proposes a short call to learn about their needs
3. Offers 2-3 specific times or asks for their availability
4. Keeps it conversational and not salesy

Output ONLY the email body, no subject line, no sign-off.`,
      }],
    })

    const draft = (response.content[0] as { type: string; text: string }).text
    res.json({ success: true, data: { draft } })
  } catch (err) {
    console.error('[figsy/draft-followup]', err)
    res.status(500).json({ success: false, error: 'Failed to generate draft' })
  }
})

// ── AI REPLY SUGGESTION (F2-3) ────────────────────────────────────────────────
figsyRouter.post('/replies/:replyId/suggest', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: reply } = await db.from('figsy_replies')
      .select('id, body, classification, leads(first_name, last_name, job_title, company)')
      .eq('id', req.params.replyId)
      .eq('client_id', clientId)
      .maybeSingle()
    if (!reply) { res.status(404).json({ success: false, error: 'Reply not found' }); return }

    if (reply.classification !== 'hot' && reply.classification !== 'interested') {
      res.status(400).json({ error: 'Only available for hot/interested replies' }); return
    }

    const lead = Array.isArray(reply.leads) ? reply.leads[0] : reply.leads

    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `You are writing a short follow-up reply on behalf of a sales professional (the client). The prospect has replied to a cold outreach email and expressed interest.

Prospect: ${lead?.first_name ?? ''} ${lead?.last_name ?? ''}, ${lead?.job_title ?? 'unknown role'} at ${lead?.company ?? 'unknown company'}
Their reply: "${reply.body.slice(0, 600)}"

Write a suggested follow-up reply (50-80 words) that:
- Acknowledges their interest warmly but directly
- Proposes a specific next step: a 15-minute call, and mentions sending a calendar link
- Sounds like a real person, not a bot or a template
- Uses no buzzwords, no em-dashes
- Ends with "Best," on its own line, then "[Your name]" on the next line

Output ONLY the email body. No subject line. No preamble.`,
      }],
    })

    const suggestion = (response.content[0] as { type: string; text: string }).text.trim()
    res.json({ success: true, suggestion })
  } catch (err) {
    console.error('[figsy/replies/suggest]', err)
    res.status(500).json({ success: false, error: 'Failed to generate suggestion' })
  }
})

// R7 (Alta) — "✨ Help me reply": a real, context-aware AI draft for the inbox.
// Reads the prospect's actual inbound message + lead context and drafts a
// tailored response, instead of the portal's keyword-template fallback.
figsyRouter.post('/replies/:id/ai-draft', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: reply } = await db.from('figsy_replies')
      .select('id, from_email, from_name, subject, body, body_text, classification, client_id, lead_id')
      .eq('id', req.params.id)
      .eq('client_id', clientId)
      .maybeSingle()
    if (!reply) { res.status(404).json({ success: false, error: 'Reply not found' }); return }

    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(503).json({ success: false, error: 'AI drafting not configured' }); return
    }

    // Lead + sender context for a tailored reply.
    let leadCtx = ''
    if (reply.lead_id) {
      const { data: lead } = await db.from('leads')
        .select('first_name, last_name, job_title, company, industry')
        .eq('id', reply.lead_id).maybeSingle()
      if (lead) leadCtx = [lead.first_name && `Name: ${lead.first_name} ${lead.last_name ?? ''}`.trim(),
        lead.job_title && `Role: ${lead.job_title}`, lead.company && `Company: ${lead.company}`,
        lead.industry && `Industry: ${lead.industry}`].filter(Boolean).join('; ')
    }

    // Client's own signer name, if set.
    const { data: client } = await db.from('clients')
      .select('company_name, signer_name').eq('id', clientId).maybeSingle()
    const signer = (client as { signer_name?: string } | null)?.signer_name
      || (client as { company_name?: string } | null)?.company_name || ''

    const inbound = (reply.body_text || reply.body || '').slice(0, 2000)
    const senderName = reply.from_name || reply.from_email?.split('@')[0] || 'there'

    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const system = [
      'You draft short, warm, professional replies to inbound sales replies on behalf of the user.',
      'Reference what the prospect actually said. One clear, easy next step (usually a quick call).',
      'No pressure, no fluff, no fabricated facts or figures. 3-6 short sentences.',
      signer ? `Sign off as: ${signer}.` : 'End with a simple sign-off (no placeholder brackets).',
      'Return ONLY the email body — no subject line, no preamble.',
    ].join(' ')

    const userPrompt = [
      `The prospect (${senderName}) replied:`,
      `"""${inbound}"""`,
      leadCtx ? `Prospect context: ${leadCtx}.` : '',
      reply.classification ? `Their reply was classified as: ${reply.classification}.` : '',
      'Write the best reply to move this forward.',
    ].filter(Boolean).join('\n')

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const draft = response.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text).join('').trim()

    res.json({ success: true, data: { draft } })
  } catch (err) {
    console.error('[figsy/ai-draft]', err)
    res.status(500).json({ success: false, error: 'Failed to draft reply' })
  }
})

// ── SEND MANUAL REPLY FROM UNIBOX ─────────────────────────────────────────────
figsyRouter.post('/replies/:id/send-reply', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { body: replyBody } = z.object({
      body: z.string().min(1).max(5000),
    }).parse(req.body)

    const { data: reply } = await db.from('figsy_replies')
      .select('id, from_email, subject, lead_id, client_id')
      .eq('id', req.params.id)
      .eq('client_id', clientId)
      .maybeSingle()

    if (!reply) { res.status(404).json({ success: false, error: 'Reply not found' }); return }

    const { Resend: ResendCls } = await import('resend')
    const resendInst = process.env.RESEND_API_KEY ? new ResendCls(process.env.RESEND_API_KEY) : null

    if (!resendInst) {
      res.status(503).json({ success: false, error: 'Email sending not configured' })
      return
    }

    const reSubject = reply.subject?.startsWith('Re:') ? reply.subject : `Re: ${reply.subject ?? 'Your enquiry'}`
    // D4: reply from the cold domain the prospect's thread is on — keep threading
    // intact and never leak the transactional domain into a cold conversation.
    const fromAddr  = COLD_FROM

    const { data: sendResult, error: sendError } = await resendInst.emails.send({
      from:     fromAddr,
      reply_to: COLD_REPLY_TO,
      to:       reply.from_email,
      subject:  reSubject,
      text:     replyBody,
    })

    if (sendError) throw sendError

    // Log the sent reply
    await db.from('figsy_replies').insert({
      client_id:      clientId,
      from_email:     fromAddr,
      subject:        reSubject,
      body:           replyBody,
      classification: 'sent_reply',
      processed_at:   new Date().toISOString(),
      lead_id:        reply.lead_id,
    })

    res.json({ success: true, data: { sent: true, resend_id: (sendResult as any)?.id } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[figsy/send-reply]', err)
    res.status(500).json({ success: false, error: 'Failed to send reply' })
  }
})

// ── MARK AS BOOKED ────────────────────────────────────────────────────────────
figsyRouter.post('/replies/:id/mark-booked', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: reply } = await db.from('figsy_replies')
      .select('id, campaign_id, meeting_booked_at')
      .eq('id', req.params.id)
      .eq('client_id', clientId)
      .maybeSingle()
    if (!reply) { res.status(404).json({ success: false, error: 'Reply not found' }); return }

    if (reply.meeting_booked_at) {
      res.json({ success: true, data: { already_booked: true } }); return
    }

    await db.from('figsy_replies').update({
      meeting_booked_at: new Date().toISOString(),
    }).eq('id', req.params.id)

    // THE DATA FLOOR (#17b) — the outcome that matters most for credits-per-meeting.
    void logOutcomeEvent({
      client_id:   clientId,
      campaign_id: reply.campaign_id ?? null,
      event_type:  'meeting_booked',
      channel:     'email',
      payload:     { reply_id: reply.id },
    })

    if (reply.campaign_id) await recomputeCampaignCounters(reply.campaign_id)

    // Emit cross-agent signal: meeting booked
    void emitSignal(clientId, 'figsy', 'meeting_booked', {
      reply_id:    req.params.id,
      campaign_id: reply.campaign_id ?? null,
    })

    res.json({ success: true, data: { booked: true } })
  } catch (err) {
    console.error('[figsy/mark-booked]', err)
    res.status(500).json({ success: false, error: 'Failed to mark as booked' })
  }
})

// Unified inbox — all replies across all campaigns for this client
figsyRouter.get('/replies/all', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    // Include lead id + linkedin_url so the inbox can link reply→lead and show
    // the LinkedIn chip (both were impossible because these weren't selected).
    const { data, error } = await db.from('figsy_replies')
      .select('*, leads(id,first_name,last_name,job_title,company,linkedin_url)')
      .eq('client_id', clientId)
      .order('processed_at', { ascending: false })
      .limit(200)
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch replies' }) }
})

// ── DEMO SEED REPLY (dev/demo only) ──────────────────────────────────────────
figsyRouter.post('/replies/seed-demo', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Pick the most recent active campaign
    const { data: campaign } = await db.from('figsy_campaigns')
      .select('id').eq('client_id', clientId).eq('status', 'active')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()

    // Pick a real lead from this client's pool (scored/consent_given)
    const { data: lead } = await db.from('leads')
      .select('id, first_name, last_name, email, job_title, company')
      .eq('client_id', clientId)
      .in('status', ['scored', 'consent_given', 'exported'])
      .order('score', { ascending: false }).limit(1).maybeSingle()

    const fromEmail = lead?.email ?? `demo.prospect@example.com`
    const fromName  = lead ? `${lead.first_name} ${lead.last_name}` : 'Demo Prospect'
    const jobTitle  = lead?.job_title ?? 'CEO'
    const company   = lead?.company ?? 'Acme Corp'

    const { data: reply, error } = await db.from('figsy_replies').insert({
      campaign_id:              campaign?.id ?? null,
      lead_id:                  lead?.id ?? null,
      client_id:                clientId,
      from_email:               fromEmail,
      from_name:                fromName,
      subject:                  'Re: Exploring a partnership',
      body:                     `Hi,\n\nThanks for reaching out — this actually looks interesting. We've been looking at ways to improve our outbound. Can we jump on a quick call this week?\n\nBest,\n${fromName}\n${jobTitle} at ${company}`,
      body_text:                `Hi,\n\nThanks for reaching out — this actually looks interesting. We've been looking at ways to improve our outbound. Can we jump on a quick call this week?\n\nBest,\n${fromName}\n${jobTitle} at ${company}`,
      classification:           'hot',
      classification_reasoning: 'Prospect expressed clear interest and requested a call.',
      processed_at:             new Date().toISOString(),
      received_at:              new Date().toISOString(),
    }).select('id').single()

    if (error) throw error

    // Bump campaign stats from source (race-free, error-checked)
    if (campaign?.id) await recomputeCampaignCounters(campaign.id)

    res.json({ success: true, data: { reply_id: reply?.id, from: fromName } })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, error: 'Failed to seed demo reply' })
  }
})

// ── FIGSY MEMORY ─────────────────────────────────────────────────────────────

figsyRouter.post('/memory/refresh', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: campaigns, error } = await db.from('figsy_campaigns')
      .select('name, emails_sent, replies_total, replies_interested')
      .eq('client_id', clientId)
      .gt('emails_sent', 0)

    if (error) throw error

    const rows = campaigns ?? []
    const total_sent_all_time    = rows.reduce((sum, c) => sum + (c.emails_sent   ?? 0), 0)
    const total_replies_all_time = rows.reduce((sum, c) => sum + (c.replies_total ?? 0), 0)
    const avg_reply_rate_30d     = rows.length > 0
      ? rows.reduce((sum, c) => sum + ((c.replies_total ?? 0) / (c.emails_sent ?? 1)), 0) / rows.length
      : 0

    const { error: upsertError } = await db.from('figsy_memory')
      .upsert({
        client_id:             clientId,
        best_subject_lines:    [],
        avg_reply_rate_30d,
        total_sent_all_time,
        total_replies_all_time,
        last_updated:          new Date().toISOString(),
      }, { onConflict: 'client_id' })
      .select()
      .single()

    if (upsertError) throw upsertError

    res.json({
      success: true,
      data: { avg_reply_rate_30d, total_sent_all_time, total_replies_all_time },
    })
  } catch (err) {
    console.error('[figsy/memory/refresh]', err)
    res.status(500).json({ success: false, error: 'Failed to refresh FIGSY memory' })
  }
})

figsyRouter.get('/memory', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data, error } = await db.from('figsy_memory')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle()

    if (error) throw error

    res.json({ success: true, data: data ?? null })
  } catch (err) {
    console.error('[figsy/memory]', err)
    res.status(500).json({ success: false, error: 'Failed to fetch FIGSY memory' })
  }
})

// R15 (Learning Engine ①) — Train-FIGSY knowledge store. The Knowledge page
// persists seven kinds of training data here. One row per (client, kind); the
// payload is stored verbatim as JSONB and returned spread at the top level so
// the frontend reads e.g. res.pitch directly.
const KNOWLEDGE_KINDS = new Set(['pitch', 'keywords', 'signals', 'dnc', 'messaging', 'context', 'prompts'])

figsyRouter.get('/knowledge/:kind', async (req: AuthRequest, res) => {
  try {
    const { kind } = req.params
    if (!KNOWLEDGE_KINDS.has(kind)) { res.status(404).json({ success: false, error: 'Unknown knowledge kind' }); return }
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data } = await db.from('figsy_knowledge')
      .select('data').eq('client_id', clientId).eq('kind', kind).maybeSingle()
    // Spread the stored payload at the top level (or {} when nothing saved yet).
    res.json({ ...((data as { data?: Record<string, unknown> } | null)?.data ?? {}) })
  } catch (err) {
    console.error('[figsy/knowledge GET]', err)
    res.status(500).json({ success: false, error: 'Failed to load knowledge' })
  }
})

figsyRouter.post('/knowledge/:kind', async (req: AuthRequest, res) => {
  try {
    const { kind } = req.params
    if (!KNOWLEDGE_KINDS.has(kind)) { res.status(404).json({ success: false, error: 'Unknown knowledge kind' }); return }
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Store the posted body verbatim. Cap the serialized size so one client
    // can't stuff the row (256KB is generous for text knowledge).
    const payload = (req.body && typeof req.body === 'object') ? req.body : {}
    if (JSON.stringify(payload).length > 256_000) {
      res.status(413).json({ success: false, error: 'Knowledge payload too large' }); return
    }

    const { error } = await db.from('figsy_knowledge')
      .upsert({ client_id: clientId, kind, data: payload, updated_at: new Date().toISOString() }, { onConflict: 'client_id,kind' })
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    console.error('[figsy/knowledge POST]', err)
    res.status(500).json({ success: false, error: 'Failed to save knowledge' })
  }
})

// R17 (#43/#44) — pre-send spam check. Scores a subject + body for the things
// that hurt cold deliverability, so the client can fix it before it sends.
figsyRouter.post('/spam-check', async (req: AuthRequest, res) => {
  try {
    const { subject, body } = z.object({
      subject: z.string().max(500).optional().default(''),
      body:    z.string().max(20000),
    }).parse(req.body)
    res.json({ success: true, data: spamScore(subject, body) })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: 'Invalid input' }); return }
    console.error('[figsy/spam-check]', err)
    res.status(500).json({ success: false, error: 'Spam check failed' })
  }
})

// R20 (Apollo) — Job-change alerts. A lead changing jobs is a strong
// re-engagement signal. This records a detected change, emits a signal, and
// re-opens the lead so it can be contacted fresh. (Automated detection runs off
// enrichment keys; this endpoint is also callable when a reply reveals a move.)
figsyRouter.post('/leads/:leadId/mark-job-change', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { new_company, new_title } = z.object({
      new_company: z.string().max(200).optional(),
      new_title:   z.string().max(200).optional(),
    }).parse(req.body)

    const { data: lead } = await db.from('leads')
      .select('id, first_name, last_name, company, job_title')
      .eq('id', req.params.leadId).eq('client_id', clientId).maybeSingle()
    if (!lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    const update: Record<string, unknown> = {
      job_changed_at:   new Date().toISOString(),
      previous_company: lead.company ?? null,
      // Re-open for re-engagement — a moved contact is a fresh opportunity.
      status:           'scored',
    }
    if (new_company) update.company = new_company
    if (new_title)   update.job_title = new_title

    const { error } = await db.from('leads').update(update).eq('id', lead.id)
    if (error) throw error

    void emitSignal(clientId, 'figsy', 'job_change', {
      lead_id: lead.id,
      name: `${lead.first_name} ${lead.last_name}`.trim(),
      from_company: lead.company ?? null,
      to_company: new_company ?? lead.company ?? null,
    })

    res.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: 'Invalid input' }); return }
    console.error('[figsy/mark-job-change]', err)
    res.status(500).json({ success: false, error: 'Failed to record job change' })
  }
})

// GET /figsy/job-changes — leads with a recent detected job change (alerts feed).
figsyRouter.get('/job-changes', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data } = await db.from('leads')
      .select('id, first_name, last_name, job_title, company, previous_company, job_changed_at')
      .eq('client_id', clientId)
      .not('job_changed_at', 'is', null)
      .order('job_changed_at', { ascending: false })
      .limit(50)
    res.json({ success: true, data: data ?? [] })
  } catch (err) {
    console.error('[figsy/job-changes]', err)
    res.status(500).json({ success: false, error: 'Failed to load job changes' })
  }
})

// Preview the signal that FIGSY would use for a lead (for display in leads table)
figsyRouter.get('/leads/:leadId/signal-preview', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: lead } = await db.from('leads')
      .select('tech_stack, industry, score_reasoning, company')
      .eq('id', req.params.leadId)
      .eq('client_id', clientId)
      .maybeSingle()

    if (!lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    const signals: string[] = []
    if (lead.tech_stack && Array.isArray(lead.tech_stack) && lead.tech_stack.length > 0) {
      signals.push(`Uses ${(lead.tech_stack as string[]).slice(0, 2).join(' and ')}`)
    }
    if (lead.score_reasoning) signals.push(lead.score_reasoning)
    if (lead.industry) signals.push(`${lead.industry} sector`)

    res.json({ success: true, data: { signal: signals[0] ?? null, all_signals: signals } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to get signal preview' })
  }
})

// R9 (Apollo) — "Why FIGSY wrote this": AI transparency. Returns the exact
// personalization hooks FIGSY uses for a lead, via the same helper the generator
// uses, plus a plain-English explanation. Lets clients see — and trust — that the
// outreach is genuinely tailored, not spray-and-pray.
figsyRouter.get('/leads/:leadId/why-email', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: lead } = await db.from('leads')
      .select('first_name, job_title, company, tech_stack, industry, score, score_reasoning')
      .eq('id', req.params.leadId)
      .eq('client_id', clientId)
      .maybeSingle()
    if (!lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    const signals = personalizationSignals(lead as any)
    const bestSignal = signals[0] ?? null
    const who = [lead.job_title, lead.company].filter(Boolean).join(' at ') || 'this prospect'
    const explanation = bestSignal
      ? `FIGSY opens the email with a specific observation about ${lead.first_name || 'them'} — "${bestSignal}" — then connects it to what you do. ${signals.length > 1 ? `It also factored in: ${signals.slice(1).join('; ')}.` : ''}`
      : `FIGSY didn't find a strong personalization hook for ${who}, so it leads with your value proposition and keeps the email short. Enriching this lead (tech stack / industry) would let FIGSY personalize harder.`

    res.json({ success: true, data: { signals, bestSignal, score: lead.score ?? null, explanation } })
  } catch (err) {
    console.error('[figsy/why-email]', err)
    res.status(500).json({ success: false, error: 'Failed to explain personalization' })
  }
})

// ── P2-9: PENDING DRAFTS ──────────────────────────────────────────────────────
// GET /figsy/campaigns/:id/pending-drafts — returns draft emails awaiting approval
figsyRouter.get('/campaigns/:id/pending-drafts', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data: campaign } = await db.from('figsy_campaigns')
      .select('id').eq('id', req.params.id).eq('client_id', clientId).maybeSingle()
    if (!campaign) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }
    const { data, error } = await db.from('figsy_sent_emails')
      .select('id, lead_id, subject, body, created_at, leads(first_name, last_name, company)')
      .eq('campaign_id', req.params.id)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
    if (error) throw error
    const result = (data ?? []).map((row: any) => {
      const lead = Array.isArray(row.leads) ? row.leads[0] : row.leads
      return {
        id:         row.id,
        lead_id:    row.lead_id,
        subject:    row.subject,
        body:       row.body,
        created_at: row.created_at,
        first_name: lead?.first_name ?? null,
        last_name:  lead?.last_name ?? null,
        company:    lead?.company ?? null,
      }
    })
    res.json({ success: true, data: result })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch pending drafts' }) }
})

// POST /figsy/emails/:id/approve — approve a draft email for sending
figsyRouter.post('/emails/:id/approve', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    // figsy_sent_emails has no client_id — scope via the email's campaign.
    const { data: email } = await db.from('figsy_sent_emails')
      .select('id, campaign_id').eq('id', req.params.id).maybeSingle()
    if (!email) { res.status(404).json({ success: false, error: 'Email not found' }); return }
    // Verify campaign belongs to client — this is the real ownership check
    const { data: campaign } = await db.from('figsy_campaigns')
      .select('id').eq('id', email.campaign_id).eq('client_id', clientId).maybeSingle()
    if (!campaign) { res.status(403).json({ success: false, error: 'Forbidden' }); return }
    const { error } = await db.from('figsy_sent_emails')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', req.params.id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to approve email' }) }
})

// DELETE /figsy/emails/:id/draft — reject a draft email
figsyRouter.delete('/emails/:id/draft', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    // figsy_sent_emails has no client_id — scope via the email's campaign.
    const { data: email } = await db.from('figsy_sent_emails')
      .select('id, campaign_id').eq('id', req.params.id).maybeSingle()
    if (!email) { res.status(404).json({ success: false, error: 'Email not found' }); return }
    const { data: campaign } = await db.from('figsy_campaigns')
      .select('id').eq('id', email.campaign_id).eq('client_id', clientId).maybeSingle()
    if (!campaign) { res.status(403).json({ success: false, error: 'Forbidden' }); return }
    const rejection_reason = (req.body as { reason?: string })?.reason ?? null
    const { error } = await db.from('figsy_sent_emails')
      .update({ status: 'rejected', rejection_reason })
      .eq('id', req.params.id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to reject draft' }) }
})

// ── FIGSY CHAT — conversational AI assistant for lead gen and pipeline advice ──
// FIGSY chat agent — real action: enrol the client's campaign-ready leads into
// their active campaign (Option A). Enrolment generates a sequence per lead (slow),
// so it runs in the background and we return the count immediately for a fast reply.
async function runEnrollLeadsTool(clientId: string | null): Promise<string> {
  if (!clientId) return 'No client account found, so I could not enrol anyone.'
  const { data: campaign } = await db.from('figsy_campaigns')
    .select('id, name').eq('client_id', clientId).eq('status', 'active')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!campaign) {
    return 'There is no ACTIVE campaign yet. Tell the user to create a campaign and click Activate first — then their verified leads enrol into it.'
  }
  const leadIds = await campaignReadyLeadIds(clientId)
  if (leadIds.length === 0) {
    return 'There are no campaign-ready (Apollo-verified) leads to enrol right now — the user may need to source verified leads first.'
  }
  ;(async () => {
    for (const leadId of leadIds) {
      try {
        const { data: existing } = await db.from('figsy_enrollments')
          .select('id').eq('campaign_id', campaign.id).eq('lead_id', leadId).maybeSingle()
        if (existing) continue
        await autoEnrollLead(leadId, clientId)
      } catch (e) { console.error('[figsy/chat] enrol', leadId, e) }
    }
  })()
  return `Started enrolling ${leadIds.length} verified leads into "${campaign.name}". Outreach begins under the warmup cap (10/day to start, ramping up). Opted-out and do-not-contact leads were excluded automatically.`
}

figsyRouter.post('/chat', async (req: AuthRequest, res) => {
  try {
    const { messages, mode } = z.object({
      messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })).min(1).max(20),
      mode:     z.enum(['full', 'lead_gen']).default('lead_gen'),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)

    // Fetch client context for a personalised reply
    let clientContext = ''
    if (clientId) {
      const { data: client } = await db.from('clients')
        .select('company_name, industry, credit_balance').eq('id', clientId).maybeSingle()
      const { data: icps } = await db.from('icps')
        .select('name, industries, job_titles, geographies').eq('client_id', clientId).limit(3)
      if (client) {
        clientContext = `\nClient: ${client.company_name ?? 'Unknown'} | Industry: ${client.industry ?? 'Unknown'} | Credits: ${client.credit_balance ?? 0}`
        if (icps?.length) {
          clientContext += `\nICPs: ${icps.map(i => i.name).join(', ')}`
        }
      }
    }

    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const system = mode === 'full'
      ? `You are FIGSY, an expert AI SDR and sales strategist for K.I.N.D — a B2B lead generation platform.${clientContext}
You help the user with: campaign strategy, reply rate improvement, lead scoring, ICP refinement, outreach copy, and pipeline advice.
Keep replies concise (2-4 sentences max). Be direct, specific, and actionable. No fluff.`
      : `You are FIGSY, an AI lead generation assistant for K.I.N.D — a B2B platform.${clientContext}
You help the user understand their ICP, lead scoring, and who to target first. You can advise on lead gen strategy.
For campaign management features (sequences, email sends, inbox), mention they can upgrade to full FIGSY.
Keep replies concise (2-4 sentences max). Be direct and helpful.`

    const model = 'claude-haiku-4-5-20251001'
    const tools = [{
      name: 'enroll_leads',
      description: 'Enrol the user\'s campaign-ready (Apollo-verified) leads into their active FIGSY campaign and begin outreach. Call this when the user asks to enrol, launch, start, send, or activate outreach to their leads. Only verified leads are enrolled; opted-out and do-not-contact leads are always excluded automatically.',
      input_schema: { type: 'object' as const, properties: {}, required: [] as string[] },
    }]
    const systemWithAction = `${system}

You can ACT, not just advise: when the user asks to enrol, launch, start, or activate outreach to their leads, call the enroll_leads tool to actually do it (do not just describe it). Verified-only; opted-out / DNC leads are always excluded.`

    const aiMessages: any[] = messages.map(m => ({ role: m.role, content: m.content }))
    let response = await ai.messages.create({ model, max_tokens: 400, system: systemWithAction, tools, messages: aiMessages })

    // One tool round is enough for enroll_leads.
    if (response.stop_reason === 'tool_use') {
      const toolUse = response.content.find((b: any) => b.type === 'tool_use') as any
      const result = toolUse?.name === 'enroll_leads'
        ? await runEnrollLeadsTool(clientId)
        : 'Unknown tool.'
      aiMessages.push({ role: 'assistant', content: response.content })
      aiMessages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUse?.id, content: result }] })
      response = await ai.messages.create({ model, max_tokens: 400, system: systemWithAction, tools, messages: aiMessages })
    }

    const textBlock = response.content.find((b: any) => b.type === 'text') as { text?: string } | undefined
    const reply = (textBlock?.text ?? 'Done.').trim()

    // Persist the latest user turn + this reply so the thread survives reloads,
    // cache-clears, and device switches. Degrades silently if the table is absent.
    if (clientId) {
      const lastUser = messages[messages.length - 1]
      const rows = [
        ...(lastUser?.role === 'user' ? [{ client_id: clientId, role: 'user', content: lastUser.content }] : []),
        { client_id: clientId, role: 'assistant', content: reply },
      ]
      await db.from('figsy_chat_messages').insert(rows).then(
        () => {},
        () => {}, // table may not exist yet — chat still works via localStorage
      )
    }

    res.json({ success: true, data: { reply } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[figsy/chat]', err)
    res.status(500).json({ success: false, error: 'Failed to generate response' })
  }
})

// GET /figsy/chat/history — load the persisted chat thread (last 50 turns).
// Returns an empty list if the table isn't there yet, so the UI falls back to
// localStorage without erroring.
figsyRouter.get('/chat/history', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.json({ success: true, data: [] }); return }
    const { data, error } = await db.from('figsy_chat_messages')
      .select('role, content, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true })
      .limit(50)
    if (error) { res.json({ success: true, data: [] }); return }
    res.json({ success: true, data: data ?? [] })
  } catch {
    res.json({ success: true, data: [] })
  }
})

// DELETE /figsy/chat/history — clear the persisted thread (user "clear chat").
figsyRouter.delete('/chat/history', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (clientId) {
      await db.from('figsy_chat_messages').delete().eq('client_id', clientId).then(() => {}, () => {})
    }
    res.json({ success: true })
  } catch {
    res.json({ success: true })
  }
})

// ── ACTIVITY FEED ─────────────────────────────────────────────────────────────
figsyRouter.get('/activity', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const limit = Math.min(parseInt(String(req.query.limit ?? '20')), 50)
    const campaignIds = await getClientCampaignIds(clientId)

    const [sentRes, repliesRes, campaignsRes, leadsRes] = await Promise.all([
      db.from('figsy_sent_emails')
        .select('id, sent_at, step, leads(first_name, last_name, company)')
        .in('campaign_id', campaignIds)
        .order('sent_at', { ascending: false })
        .limit(limit),
      db.from('figsy_replies')
        .select('id, processed_at, received_at, classification, from_name, from_email, leads(first_name, last_name)')
        .eq('client_id', clientId)
        .order('processed_at', { ascending: false })
        .limit(limit),
      db.from('figsy_campaigns')
        .select('id, name, created_at, status')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(10),
      db.from('leads')
        .select('id, created_at, source')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(limit),
    ])

    type ActivityEvent = {
      id: string
      type: 'email_sent' | 'reply_received' | 'campaign_created' | 'lead_added'
      description: string
      timestamp: string
    }

    const events: ActivityEvent[] = []

    for (const row of sentRes.data ?? []) {
      const lead = (row as any).leads
      const name = lead ? `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim() : 'a lead'
      const company = lead?.company ? ` at ${lead.company}` : ''
      events.push({
        id: `sent-${row.id}`,
        type: 'email_sent',
        description: `FIGSY sent Day ${row.step ?? 1} email to ${name}${company}`,
        timestamp: row.sent_at ?? new Date().toISOString(),
      })
    }

    for (const row of repliesRes.data ?? []) {
      const lead = (row as any).leads
      const name = lead ? `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim()
        : (row.from_name ?? row.from_email ?? 'Unknown')
      const label = row.classification === 'hot' ? 'Hot reply' :
        row.classification === 'warm' ? 'Warm reply' :
        row.classification === 'opt_out' ? 'Opt-out' : 'Reply'
      events.push({
        id: `reply-${row.id}`,
        type: 'reply_received',
        description: `${label} from ${name}`,
        timestamp: row.received_at ?? row.processed_at ?? new Date().toISOString(),
      })
    }

    for (const row of campaignsRes.data ?? []) {
      events.push({
        id: `campaign-${row.id}`,
        type: 'campaign_created',
        description: `Campaign "${row.name}" created`,
        timestamp: row.created_at ?? new Date().toISOString(),
      })
    }

    // Group leads by day to avoid 25 separate "lead added" events
    const leadsByDay: Record<string, number> = {}
    for (const row of leadsRes.data ?? []) {
      const day = (row.created_at ?? '').slice(0, 10)
      if (day) leadsByDay[day] = (leadsByDay[day] ?? 0) + 1
    }
    for (const [day, count] of Object.entries(leadsByDay)) {
      events.push({
        id: `leads-${day}`,
        type: 'lead_added',
        description: `${count} lead${count === 1 ? '' : 's'} added`,
        timestamp: `${day}T12:00:00.000Z`,
      })
    }

    // Sort by timestamp descending, cap at limit
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    res.json({ success: true, data: events.slice(0, limit) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to fetch activity' })
  }
})

// Export for use in icps.ts (S5 — FIGSY auto-start)
export { autoEnrollLead }

// ── SUGGEST CAMPAIGN (P1-15) ──────────────────────────────────────────────────
// POST /figsy/suggest-campaign
// Calls Claude Haiku with ICP data to suggest a campaign
figsyRouter.post('/suggest-campaign', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Fetch ICP data for context
    const { data: icps } = await db.from('icps')
      .select('name, description, industries, job_titles, geographies, seniority_levels')
      .eq('client_id', clientId)
      .limit(1)

    const { data: leadStats } = await db.from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)

    const icp = icps?.[0]
    const leadCount = leadStats ?? 0

    const icpDescription = icp
      ? `ICP Name: ${icp.name}. Industries: ${(icp.industries ?? []).join(', ')}. Job Titles: ${(icp.job_titles ?? []).join(', ')}. Geographies: ${(icp.geographies ?? []).join(', ')}. Seniority: ${(icp.seniority_levels ?? []).join(', ')}.`
      : 'No ICP defined yet — general B2B outreach.'

    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `You are FIGSY, an AI SDR. Based on this client's ICP: ${icpDescription}, with approximately ${leadCount} leads in their database, suggest a campaign. Return ONLY valid JSON with no markdown: { "name": "string", "target": "string", "subjects": ["string", "string", "string"], "rationale": "string" }`,
      }],
    })

    const text = (response.content[0] as { type: string; text: string }).text.trim()
    let parsed: { name: string; target: string; subjects: string[]; rationale: string }
    try {
      // Strip markdown code fences if present
      const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      // Fallback if Claude returns non-JSON
      parsed = {
        name: 'ICP Outreach Campaign',
        target: icp?.job_titles?.[0] ?? 'Decision makers',
        subjects: [
          'Quick question about your growth strategy',
          'How companies like yours are winning in 2026',
          'Last touch — worth a quick call?',
        ],
        rationale: 'Based on your ICP, a value-led cold outreach sequence will drive the best results.',
      }
    }

    res.json({ success: true, data: parsed })
  } catch (err) {
    console.error('[figsy/suggest-campaign]', err)
    res.status(500).json({ success: false, error: 'Failed to generate campaign suggestion' })
  }
})

// ── SCORE EMAIL (P0-8) ────────────────────────────────────────────────────────
// POST /figsy/score-email
// Heuristic scoring — no Claude needed
figsyRouter.post('/score-email', async (req: AuthRequest, res) => {
  try {
    const { subject, body } = z.object({
      subject: z.string(),
      body:    z.string(),
    }).parse(req.body)

    const issues: string[] = []
    const suggestions: string[] = []
    let score = 0

    // Subject line length 30–60 chars: +20
    if (subject.length >= 30 && subject.length <= 60) {
      score += 20
    } else if (subject.length < 30) {
      issues.push('Subject line is too short (aim for 30–60 characters)')
      suggestions.push('Lengthen your subject line to give more context')
    } else {
      issues.push('Subject line is too long (aim for 30–60 characters)')
      suggestions.push('Shorten your subject line — mobile clients truncate after ~60 chars')
    }

    // No spam words: +20 (check common ones)
    const spamWords = ['free', 'guarantee', 'act now', 'limited time', 'buy now', 'click here', 'special offer', 'congratulations', 'winner']
    const bodyLower = body.toLowerCase()
    const subjectLower = subject.toLowerCase()
    const foundSpam = spamWords.filter(w => bodyLower.includes(w) || subjectLower.includes(w))
    if (foundSpam.length === 0) {
      score += 20
    } else {
      issues.push(`Spam trigger words detected: ${foundSpam.join(', ')}`)
      suggestions.push('Remove spam trigger words to improve deliverability')
    }

    // Body length 50–150 words: +20
    const wordCount = body.trim().split(/\s+/).filter(Boolean).length
    if (wordCount >= 50 && wordCount <= 150) {
      score += 20
    } else if (wordCount < 50) {
      issues.push(`Email is too short (${wordCount} words — aim for 50–150)`)
      suggestions.push('Add more context or value proposition to your email')
    } else {
      issues.push(`Email is too long (${wordCount} words — aim for 50–150)`)
      suggestions.push('Trim your email — shorter emails get more replies in cold outreach')
    }

    // Contains personalisation token: +20
    const hasPersonalisation = /\{first_name\}|\{company\}|\{job_title\}|\{name\}/i.test(body + subject)
    if (hasPersonalisation) {
      score += 20
    } else {
      issues.push('No personalisation tokens found ({first_name}, {company})')
      suggestions.push('Add {first_name} or {company} to personalise each email automatically')
    }

    // No all-caps words (3+ chars): +10
    const allCapsWords = body.match(/\b[A-Z]{3,}\b/g) ?? []
    const capsFiltered = allCapsWords.filter(w => !['ICP', 'CEO', 'CFO', 'CTO', 'AI', 'API', 'ROI', 'B2B', 'SaaS', 'KPI', 'CRM', 'SDR', 'MQL', 'SQL', 'ACV', 'ARR', 'MRR'].includes(w))
    if (capsFiltered.length === 0) {
      score += 10
    } else {
      issues.push(`All-caps words detected: ${capsFiltered.slice(0, 3).join(', ')}`)
      suggestions.push('Avoid ALL CAPS — it reads as shouting and triggers spam filters')
    }

    // Has clear CTA: +10
    const ctaPatterns = /call\?|meeting\?|chat\?|catch up\?|15.?min|quick call|book|schedule|calendly|reply|let me know|worth a/i
    if (ctaPatterns.test(body)) {
      score += 10
    } else {
      issues.push('No clear call-to-action detected')
      suggestions.push('End with a single, low-friction CTA like "Worth a quick 15-min call?"')
    }

    res.json({ success: true, data: { score: Math.min(100, Math.max(0, score)), issues, suggestions } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[figsy/score-email]', err)
    res.status(500).json({ success: false, error: 'Failed to score email' })
  }
})

// ── FIGSY PROACTIVE INSIGHTS (Learning Agent Phase 2) ─────────────────────────
// Analyses campaign patterns and surfaces 2-3 actionable insights.
// Rule-based — no AI cost. Refreshes on every call (fast enough for a KPI page).
figsyRouter.get('/insights', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const [campsRes, repliesRes, leadsRes] = await Promise.all([
      db.from('figsy_campaigns')
        .select('id, name, emails_sent, replies_total, replies_interested, opted_out, meetings_booked, status')
        .eq('client_id', clientId)
        .gt('emails_sent', 0),
      db.from('figsy_replies')
        .select('classification, received_at')
        .eq('client_id', clientId),
      db.from('leads')
        .select('score, industry, seniority')
        .eq('client_id', clientId)
        .not('score', 'is', null),
    ])

    const campaigns = campsRes.data ?? []
    const replies   = repliesRes.data ?? []
    const leads     = leadsRes.data ?? []

    const insights: { icon: string; title: string; body: string; action?: string; priority: number }[] = []

    // ── Pattern 1: Best performing campaign ──────────────────────────
    if (campaigns.length >= 2) {
      const withRate = campaigns.map(c => ({
        ...c,
        rate: (c.emails_sent ?? 0) > 0 ? (c.replies_total ?? 0) / (c.emails_sent ?? 1) : 0,
      }))
      const best  = withRate.reduce((a, b) => a.rate > b.rate ? a : b)
      const worst = withRate.reduce((a, b) => a.rate < b.rate ? a : b)
      if (best.id !== worst.id && best.rate > 0) {
        const diff = Math.round((best.rate - worst.rate) * 100)
        insights.push({
          icon: '🔥',
          title: `"${best.name}" is your top performer`,
          body: `${Math.round(best.rate * 100)}% reply rate — ${diff}pp above your lowest campaign. Consider reusing its messaging or ICP targeting in new campaigns.`,
          action: `View campaign`,
          priority: 1,
        })
      }
    }

    // ── Pattern 2: Hot reply concentration ───────────────────────────
    const hotCount  = replies.filter(r => r.classification === 'hot' || r.classification === 'interested').length
    const totalReplies = replies.length
    if (totalReplies >= 5) {
      const hotRate = hotCount / totalReplies
      if (hotRate >= 0.30) {
        insights.push({
          icon: '📈',
          title: `${Math.round(hotRate * 100)}% of replies are positive`,
          body: `Your targeting is precise — nearly 1 in 3 replies shows buying intent. Industry benchmark is 15–20%. Time to scale volume.`,
          priority: 2,
        })
      } else if (hotRate < 0.10 && totalReplies >= 20) {
        insights.push({
          icon: '🎯',
          title: `Replies are coming in, but few show buying intent`,
          body: `Only ${Math.round(hotRate * 100)}% of replies are positive. I'd recommend tightening the ICP — narrower targeting usually lifts intent quality even if volume drops slightly.`,
          action: `Review ICP`,
          priority: 2,
        })
      }
    }

    // ── Pattern 3: Opt-out signal ─────────────────────────────────────
    const totalSent    = campaigns.reduce((s, c) => s + (c.emails_sent ?? 0), 0)
    const totalOptOuts = campaigns.reduce((s, c) => s + (c.opted_out    ?? 0), 0)
    if (totalSent >= 50 && totalOptOuts > 0) {
      const optRate = totalOptOuts / totalSent
      if (optRate > 0.05) {
        insights.push({
          icon: '⚠️',
          title: `Opt-out rate is above average`,
          body: `${(optRate * 100).toFixed(1)}% of contacts have opted out — the threshold to watch is 3%. This usually means the ICP or opening message needs to be more specific and less generic.`,
          action: `Review messaging`,
          priority: 1,
        })
      }
    }

    // ── Pattern 4: Lead scoring spread ───────────────────────────────
    if (leads.length >= 10) {
      const highScore = leads.filter(l => (l.score ?? 0) >= 70).length
      const highPct   = Math.round((highScore / leads.length) * 100)
      if (highPct >= 40) {
        insights.push({
          icon: '⭐',
          title: `${highPct}% of your leads score 70+`,
          body: `Strong ICP match — your targeting filters are pulling the right people. Leads with score ≥ 70 typically convert at 2× the rate of the broader pool.`,
          priority: 3,
        })
      }
    }

    // ── Pattern 5: Volume nudge ───────────────────────────────────────
    if (totalSent === 0 && campaigns.length === 0) {
      insights.push({
        icon: '🚀',
        title: `Ready to launch`,
        body: `You have leads scored and ready. Create your first campaign and I'll write sequences, handle replies, and book meetings — all automatically.`,
        action: `Create campaign`,
        priority: 1,
      })
    } else if (totalSent > 0 && campaigns.filter(c => c.status === 'active').length === 0) {
      insights.push({
        icon: '⏸️',
        title: `No active campaigns running`,
        body: `You have ${totalSent.toLocaleString()} emails sent historically but nothing running now. Activate a campaign to keep pipeline moving.`,
        action: `Go to campaigns`,
        priority: 2,
      })
    }

    // ── Recent reply velocity ─────────────────────────────────────────
    const recentReplies = replies.filter(r => {
      const age = Date.now() - new Date(r.received_at).getTime()
      return age < 7 * 86400000
    })
    if (recentReplies.length >= 3) {
      insights.push({
        icon: '💬',
        title: `${recentReplies.length} replies in the last 7 days`,
        body: `${recentReplies.filter(r => r.classification === 'hot' || r.classification === 'interested').length} are positive. Check your inbox — quick follow-ups within 24h convert at 4× the rate of delayed responses.`,
        action: `Go to inbox`,
        priority: 2,
      })
    }

    // Return top 3 by priority, then recency
    const top = insights
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3)
      .map(({ priority: _p, ...i }) => i)

    res.json({ success: true, data: top })
  } catch (err) {
    console.error('[figsy/insights]', err)
    res.status(500).json({ success: false, error: 'Failed to generate insights' })
  }
})

// ── HUMAN-IN-THE-LOOP APPROVAL QUEUE ─────────────────────────────────────────

// GET /api/figsy/approval-queue — list pending approvals
figsyRouter.get('/approval-queue', requireAuth, async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    const { data, error } = await db
      .from('figsy_approval_queue')
      .select(`id, sequence_step, to_email, subject, body, status, created_at, expires_at,
        figsy_leads ( first_name, last_name, company, job_title ),
        figsy_campaigns ( name )`)
      .eq('client_id', clientId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    res.json({ queue: data })
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }) }
})

// POST /api/figsy/approval-queue/:id/approve
// #268: records the human's approval — but must NEVER pretend an email was sent.
// The old code silently set status='sent' WITHOUT calling sendSequenceEmail, so an
// approved draft looked delivered while nothing left. This queue also has no producer
// yet (nothing enqueues drafts) and real sends run on the standard enrollment/cron
// path (which keys off `leads` + the enrollment step counter, not this table). So the
// honest, fail-closed behaviour is: mark the row approved, report sent:false. Wiring
// the charged send path here is a separate scoped build (producer + UI + validated send).
figsyRouter.post('/approval-queue/:id/approve', requireAuth, async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    const { data, error } = await db
      .from('figsy_approval_queue')
      .update({ status: 'approved' })
      .eq('id', req.params.id)
      .eq('client_id', clientId)
      .eq('status', 'pending')
      .select('id')
      .single()
    if (error || !data) { res.status(404).json({ error: 'Not found or already processed' }); return }
    res.json({
      approved: true,
      sent: false,
      note: 'Approval recorded. Sending from the approval queue is not enabled — sequences send on the standard scheduler; this queue has no producer yet.',
    })
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }) }
})

// POST /api/figsy/approval-queue/:id/reject
figsyRouter.post('/approval-queue/:id/reject', requireAuth, async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    await db.from('figsy_approval_queue').update({ status: 'rejected' }).eq('id', req.params.id).eq('client_id', clientId)
    res.json({ rejected: true })
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }) }
})
