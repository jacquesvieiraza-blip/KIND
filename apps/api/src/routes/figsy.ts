import { pecrVerdict, pecrSkipReason } from '../lib/pecr'
import { isLaunchSendCountry, launchHoldReason } from '@kind/shared'
import { recordEnrolSkips } from '../lib/operator-audit'
import { Router } from 'express'
import crypto from 'crypto'
import { normalizeRevealEmail, normalizeRevealEmails } from '../lib/billing-rules'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { generateSequence, getClientKnowledgeForOutreach, sendSequenceEmail, enrollmentStep, autoEnrollLead, applyReplyBranching, campaignReadyLeadIds, recomputeCampaignCounters, personalizationSignals, chargeFigsyEnroll, refundFigsyEnroll, updateEnrollmentState } from '../lib/figsy'
import type { Lead, SendOutcome } from '../lib/figsy'
// BUILD-003 item 2 — meeting counts come from public.meetings, never from reply timestamps.
import { campaignMeetingCounts } from '../lib/meeting-truth'
import { bookingUrlForLead } from '../lib/booking-token'
import { canEnroll } from '../lib/billing-rules'
import { isDemoClient } from '../lib/demo'
import { buildDraftFromSequence, buildDraftStepsFromSequence, draftToSteps, emailSteps, MAX_SEQUENCE_STEPS, type SequenceStep } from '../lib/sequence-apply'
import { enrolDraftGate } from '../lib/sequence-quality'
import { logOutcomeEvent } from '../lib/outcomes'
import { verifyUnsubscribeToken, warmupRampCap, spamScore } from '../lib/deliverability'
import { emitSignal } from './signals'
import { rateLimit } from '../lib/rate-limit'
import { isDuplicateWebhookEvent } from '../lib/webhook-idempotency'
import { processInboundReply } from '../lib/reply-pipeline'
import { parseSmartleadInbound, isSmartleadReplyEvent } from '../lib/smartlead-inbound'
import { sendFounderAlert } from '../lib/alerts'
// The provider-agnostic reply spine (#589). Resend feeds it today; Instantly and Smartlead
// feed the same functions next, so the five reply defects are fixed once, not three times.
import { replyEventKey } from '../lib/reply-ingest'

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

// #612 Part B — a skip must SAY WHY. "3 skipped" with no cause reads as a data problem and
// sends the reader hunting in the wrong place; `copy_rejected:no_opt_out` sends them to the
// sequence. Counted by reason so one bad template does not look like thirty separate faults.
function noteSkip(into: Record<string, number>, reason: string): void {
  into[reason] = (into[reason] ?? 0) + 1
}

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
  // #349 — ALL THREE WRITES ARE CHECKED. This is the one-click unsubscribe (RFC 8058) and the
  // footer link: somebody has told us to stop. A swallowed failure here is not a cosmetic gap,
  // it is us continuing to email a person who used the mechanism the law requires us to honour
  // — and the whole path ran on bare `await`s that discarded their error.
  //
  // The BLOCKLIST row is the one that actually stops the sending (every send re-checks it), so
  // its failure is the loudest: alert. The other two keep the product's own state honest.
  const { error: blockErr } = await db.from('opt_out_blocklist').upsert(
    { email: addr, reason: 'list_unsubscribe' },
    { onConflict: 'email', ignoreDuplicates: false },
  )
  if (blockErr) {
    console.error('[figsy/unsubscribe] BLOCKLIST WRITE FAILED — this person is NOT suppressed', addr, blockErr.message)
    void sendFounderAlert('sends_stalled', 'An unsubscribe was NOT recorded — we may keep emailing them', [
      `Address: ${addr}`,
      'They used the one-click unsubscribe and the blocklist write failed, so the send path will not see them as opted out.',
      `Reason: ${blockErr.message}`,
      'Add them to opt_out_blocklist by hand. Every send re-checks that table, so until it is there they remain contactable.',
    ]).catch(() => {})
  }

  const { error: leadErr } = await db.from('leads')
    .update({ status: 'opted_out', opted_out_at: new Date().toISOString() })
    .eq('email', addr)
  if (leadErr) console.error('[figsy/unsubscribe] lead status not updated', addr, leadErr.message)

  const { data: leadRows } = await db.from('leads').select('id').eq('email', addr)
  const leadIds = ((leadRows ?? []) as { id: string }[]).map(l => l.id)
  if (leadIds.length > 0) {
    const { error: enrolErr } = await db.from('figsy_enrollments')
      .update({ status: 'opted_out' })
      .in('lead_id', leadIds)
    if (enrolErr) {
      console.error('[figsy/unsubscribe] enrollments not marked opted_out', addr, enrolErr.message)
      void sendFounderAlert('sends_stalled', 'An unsubscribed contact still has live enrollments', [
        `Address: ${addr} (${leadIds.length} lead row(s)).`,
        'They are on the blocklist — the send path re-checks it, so this should not send — but their enrollments still read as live and will keep being processed.',
        `Reason: ${enrolErr.message}`,
      ]).catch(() => {})
    }
  }
  // HC-3 — OUR BLOCKLIST DOES NOT STOP SMARTLEAD, and this is the one-click path.
  //
  // Somebody pressed the unsubscribe button the law requires us to honour. That writes the
  // blocklist row, which stops OUR sends — and does nothing whatsoever to Smartlead, which
  // holds its own copy of the lead and keeps mailing them from its own engine. Alerts naming
  // the person and the campaign so they can be removed by hand in the Smartlead dashboard.
  //
  // The SAME helper as the reply-STOP path (`reply-ingest.ts`'s `suppressOptOut`) rather than a
  // second copy here, so the two doors into suppression cannot word the same refusal — or,
  // worse, cover different cases — the way three PECR gates would have without `pecrSkipReason`.
  //
  // Founder-ruled 20 Aug (*"yes alert not api"*): the remove endpoint is unverified from this
  // environment and is registered in NOT_POSSIBLE rather than guessed.
  const { alertSmartleadStillSending } = await import('../lib/smartlead-send')
  await alertSmartleadStillSending(addr, 'list_unsubscribe')

  // Both suppression doors raise the blocker, not just one. An opt-out that is tracked on
  // reply-STOP and untracked on one-click unsubscribe is a hole shaped exactly like the
  // door people actually use.
  const { propagateSuppressionToProviders } = await import('../lib/provider-eviction')
  await propagateSuppressionToProviders(addr, 'list_unsubscribe')

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
  // #551 — key on the PROVIDER MESSAGE ID, not just Resend's svix delivery id.
  //
  // `svix-id` is a Resend transport id. Instantly and Smartlead have no such header, so the
  // moment a second provider delivers replies this guard would key on an empty string, fail
  // open on every event, and a retried hot reply would re-run the whole path — a second CRM
  // deal, a second alert, a second counter bump. `replyEventKey` prefers the provider's own
  // message id and namespaces it, because two providers can issue the same id and neither
  // must ever suppress the other's reply.
  const rawPeek = (() => { try { return JSON.parse(rawBuf.toString('utf8') || '{}') as Record<string, unknown> } catch { return {} } })()
  const peekData = (rawPeek.data && typeof rawPeek.data === 'object') ? rawPeek.data as Record<string, unknown> : rawPeek
  const dedupKey = replyEventKey(
    { provider: 'resend', providerMessageId: (peekData.email_id as string) || (peekData.id as string) || null },
    Array.isArray(req.headers['svix-id']) ? req.headers['svix-id'][0] : req.headers['svix-id'],
  )
  if (await isDuplicateWebhookEvent(db, dedupKey, 'resend')) {
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
          // #349 — a HARD BOUNCE or SPAM COMPLAINT just arrived. If this write fails and we
          // swallow it, the enrollment stays live and we keep sending to an address that has
          // already bounced or reported us — from the client's own mailbox, against their own
          // domain reputation. Not an enrollment id here (it is a bulk update by lead), so it
          // is checked inline rather than through updateEnrollmentState.
          const { error: suppressErr } = await db.from('figsy_enrollments').update({ status: 'opted_out' })
            .in('lead_id', ids).in('status', ['enrolled', 'in_progress'])
          if (suppressErr) {
            console.error('[figsy/webhook] SUPPRESSION WRITE FAILED after a bounce/complaint —', bounceEmail, suppressErr.message)
            void sendFounderAlert('sends_stalled', 'A bounced/complained address was NOT suppressed', [
              `Address: ${bounceEmail} (${isComplaint ? 'spam complaint' : 'hard bounce'}).`,
              'It is on the opt-out blocklist, but its enrollments were not marked opted_out.',
              `Reason: ${suppressErr.message}`,
              'The send path re-checks the blocklist, so this should not send again — but the enrollments are wrong and will keep being processed.',
            ]).catch(() => {})
          }
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
    // P2-2 — the failure REASON is carried out of this block, not just logged.
    //
    // A non-OK status and a thrown error both used to end in `console.error`, and the alert
    // downstream then told the founder *"the body arrived empty"*. That points at the wrong
    // thing entirely: an empty email is a prospect quirk to ignore, while HTTP 500 is our
    // pipeline down and EVERY reply being lost.
    const emailId = (payload.email_id as string) || (payload.id as string) || ''
    let fetchAttempted = false
    let fetchFailure: string | null = null

    if (!body && emailId) {
      if (!process.env.RESEND_API_KEY) {
        // The fetch never runs — and the old alert still claimed it "returned nothing".
        fetchFailure = 'RESEND_API_KEY is not set, so the body fetch was never attempted.'
      } else {
        fetchAttempted = true
        try {
          const r = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
            headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
          })
          if (r.ok) {
            const full = await r.json() as { text?: string; html?: string }
            body = (full.text || full.html?.replace(/<[^>]+>/g, ' ') || '').trim()
            console.log(`[figsy/replies/inbound] fetched received email ${emailId} — body length ${body.length}`)
          } else {
            const t = (await r.text().catch(() => '')).slice(0, 200)
            fetchFailure = `Resend returned HTTP ${r.status} for ${emailId}. ${t}`
            console.error(`[figsy/replies/inbound] ${fetchFailure}`)
          }
        } catch (e) {
          fetchFailure = `The request to Resend for ${emailId} failed: ${e instanceof Error ? e.message : String(e)}`
          console.error(`[figsy/replies/inbound] ${fetchFailure}`)
        }
      }
    }

    // #551 — the mailbox that RECEIVED this. Today it is our one shared Resend inbox and
    // carries no information; the moment a client sends from their own mailbox it becomes the
    // only unambiguous answer to *whose reply is this*.
    const toRawIn = payload.to
    const toEmail = ((Array.isArray(toRawIn) ? toRawIn[0] : toRawIn) as string | undefined)?.toLowerCase().trim() ?? null

    const inbound = {
      fromEmail, fromName, body,
      subject: (payload.subject as string) ?? null,
      providerMessageId: emailId || null,
      provider: 'resend' as const,
      toEmail,
    }

    // #551 — EVERYTHING FROM HERE IS PROVIDER-AGNOSTIC and now lives in `lib/reply-pipeline.ts`.
    //
    // It used to be 256 lines inline. Adding the Smartlead feeder meant either duplicating
    // them or moving them, and duplicating is exactly what #589 forbids — R7 alone (a failed
    // blocklist write means we keep emailing someone who said stop) is not a thing to own two
    // copies of. This route's remaining job is Resend's: authenticate, dedup, fetch the body
    // its metadata-only webhook omits, and hand over an `InboundReply`.
    const result = await processInboundReply(inbound, {
      rawPayload: payload,
      // Resend's `email.received` is metadata-only, so an empty body here means a FAILED
      // FETCH rather than an empty reply — and the alert has to be able to say which.
      bodyFetchAttempted: fetchAttempted,
      bodyFetchFailure: fetchFailure,
      // BUILD-003 item 7 — the exact key this route deduped on, so the database's unique
      // index protects the same identity rather than a second opinion about it.
      eventKey: dedupKey,
    })
    if (!result.ok) { res.status(200).json({ received: true, dropped: result.dropped }); return }
    res.status(200).json({ received: true, id: result.replyId, clients: result.clients })
  } catch (err) {
    console.error('[figsy/inbound]', err)
    res.status(200).json({ received: true }) // Always 200 to webhook provider
  }
})

// ── #551 — SMARTLEAD INBOUND REPLIES — the CLIENTS' sending provider ─────────────────
//
// Founder-locked 26 Jul (#577): **Instantly is OURS, Smartlead is the CLIENTS'.** So the
// moment a client sends from their own Smartlead mailbox, their prospects reply THERE and not
// to our shared Resend inbox — and without this route the unibox goes silent for every paying
// client, and we miss the meeting we already charged $4 for.
//
// Deliberately thin. Authenticate, dedup, parse, delegate — the 256 lines that decide what a
// reply MEANS are `lib/reply-pipeline.ts`, shared with Resend (#589).
//
// ⚠️ SHIPS INERT. Without `SMARTLEAD_WEBHOOK_SECRET` this fails closed with a 503, so merging
// it changes nothing until the founder sets the secret and points Smartlead at the URL. That
// is the right default for a public endpoint that can suppress leads: a forged reply could
// opt-out a client's prospects or inject a fake hot reply.
//
// ⚠️ AND THE PAYLOAD SHAPE IS UNVERIFIED — the key 401s and the docs 403 us, so the field
// names in `parseSmartleadInbound` are inferred. CHECK IT IN SMARTLEAD'S UI AFTER THE FIRST
// PUSH (same instruction #550 carries for the sequence step shape). The shape is isolated in
// that one function precisely so this route never needs revisiting.
figsyRouter.post('/replies/smartlead', unsubscribeLimiter, async (req, res) => {
  const secret = process.env.SMARTLEAD_WEBHOOK_SECRET
  if (!secret) {
    console.error('[figsy/replies/smartlead] SMARTLEAD_WEBHOOK_SECRET not set — rejecting. Set it on this deploy before pointing Smartlead here.')
    res.status(503).json({ error: 'Webhook not configured' }); return
  }
  // Smartlead has no signature scheme we can verify (docs unreachable), so authentication is a
  // shared secret in a header or the query string — whichever their UI allows. Compared with
  // timing-safe equality rather than `===`, because this is a public endpoint.
  const offered = (req.headers['x-smartlead-secret'] as string | undefined)
    ?? (req.headers['x-webhook-secret'] as string | undefined)
    ?? (typeof req.query.secret === 'string' ? req.query.secret : undefined)
  const ok = !!offered
    && offered.length === secret.length
    && crypto.timingSafeEqual(Buffer.from(offered), Buffer.from(secret))
  if (!ok) { res.status(401).json({ error: 'Unauthorized' }); return }

  try {
    const raw = (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body))
      ? req.body as Record<string, unknown>
      : (() => { try { return JSON.parse(Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '{}') as Record<string, unknown> } catch { return {} } })()

    // Their webhooks cover opens, clicks, bounces and sends too. Treating a SENT event as a
    // reply would insert a fake inbound message against a real lead — and could classify our
    // OWN email as a hot reply. Skip anything not recognisably a reply.
    if (!isSmartleadReplyEvent(raw)) {
      res.status(200).json({ received: true, skipped: 'not_a_reply' }); return
    }

    const inbound = parseSmartleadInbound(raw)
    if (!inbound) {
      // Unreadable, which given the unverified shape is a REAL possibility — so it is a
      // finding, not a silent 200. The alert carries the payload keys so the parser's alias
      // list can be corrected from the evidence rather than from another guess.
      console.error('[figsy/replies/smartlead] payload not readable as a reply — keys:', Object.keys(raw).join(', '))
      void sendFounderAlert('sends_stalled', 'A Smartlead reply arrived in a shape we could not read', [
        'A client\'s prospect replied and we could not extract the sender, so it was NOT processed.',
        `Payload keys: ${Object.keys(raw).join(', ') || '(none)'}`,
        'The reply is still in Smartlead — nothing is lost. Fix the field aliases in lib/smartlead-inbound.ts (FIELDS) using these keys.',
        'This is the UNVERIFIED shape the PR flagged: the API key 401s and their docs 403 us, so the names were inferred.',
      ]).catch(() => {})
      res.status(200).json({ received: true, dropped: 'unreadable' }); return
    }

    // #551 — dedup on the PROVIDER MESSAGE ID, namespaced by provider. Smartlead has no
    // svix-style delivery header, which is exactly why `replyEventKey` exists: keying on an
    // empty string would fail open on every event and a retried hot reply would re-run the
    // whole path — a second CRM deal, a second alert, a second counter bump.
    const dedupKey = replyEventKey(inbound)
    if (await isDuplicateWebhookEvent(db, dedupKey, 'smartlead')) {
      res.status(200).json({ received: true, deduped: true }); return
    }

    // Smartlead delivers the body inline, so there is no fetch to diagnose — the Resend-only
    // body-fetch fields stay at their defaults.
    // BUILD-003 item 7 — the exact key this route deduped on, passed through so the database
    // backstop protects the same identity the application reasons about.
    const result = await processInboundReply(inbound, { rawPayload: raw, eventKey: dedupKey })
    if (!result.ok) { res.status(200).json({ received: true, dropped: result.dropped }); return }
    res.status(200).json({ received: true, id: result.replyId, clients: result.clients })
  } catch (err) {
    console.error('[figsy/replies/smartlead]', err)
    res.status(200).json({ received: true })   // never 500 at a webhook — it retries forever
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


    // ── 🛑 3 Sep (C2) · THE PER-LEAD COMMERCIAL FENCE, ON THE ENROL DOOR TOO ───────────────
    //
    // ⛓️ PR B fenced the per-lead COMMERCIAL paths at the client level — approve, reveal and
    // approve-batch, through `batchGate` and inside `approveLead`. THIS DOOR WAS MISSED. It
    // calls `chargeFigsyEnroll` directly, which takes a flat $4 from the wallet per lead, so a
    // client PR B had already ruled off the per-lead model could still be charged here, one
    // lead at a time, by the route next door.
    //
    // 🛑 AND C2 IS WHY IT MATTERS NOW. House and MBF are declared programme clients with no
    // programme open; before the commercial model existed they resolved as legacy everywhere,
    // so this route charging them looked like every other legacy charge. It is not: their
    // programme is what they paid for, and there is no per-lead price on it.
    //
    // ⛓️ CORRECTED 3 Sep — ~~the fence was skipped for a demo client.~~ FOUNDER-RULED:
    // **`is_demo` AND `commercial_model` ARE ORTHOGONAL.** The first cut reasoned "a demo
    // charges nothing, so the money fence need not run" — and that quietly turned the demo flag
    // into a grant of LEGACY COMMERCIAL WORKFLOW. MBF is both a demo and a programme client;
    // under that version it would still have enrolled down the retired per-lead path the moment
    // it was declared `programme`, which is the exact inference C2 exists to end, wearing a
    // different flag.
    //
    // ⚠️ WHAT DEMO STILL DECIDES, AND ALL IT DECIDES: whether real money and real provider spend
    // happen. `chargeFigsyEnroll` returns off-ledger for a demo and charges nothing — untouched.
    // Demo never decides WHICH COMMERCIAL MODEL governs the workflow.
    //
    // ⚠️ AND THE MBF DEMO IS NOT BROKEN BY THIS. `seedMbf` writes `figsy_enrollments` directly;
    // it has never called this route or `autoEnrollLead`. What refuses after MBF is declared
    // `programme` is a human trying to work it down the legacy path — which is the point.
    //
    // ⚠️ THE LIVE BOOK IS UNTOUCHED. `commercial_model` is NULL for every existing client, and
    // an unclassified client with no open programme resolves to legacy and passes straight
    // through, exactly as today — demo accounts included.
    {
      const { checkLegacyPerLeadAuthority } = await import('../lib/programme-authority')
      const fence = await checkLegacyPerLeadAuthority(clientId)
      if (!fence.allowed) {
        console.warn(`[figsy] enrol REFUSED for client ${clientId} — ${fence.code}. Nothing enrolled, nothing charged.`)
        res.status(409).json({ success: false, error: fence.code, message: fence.message })
        return
      }
    }
    // Item 187 — a saved sequence/template applied to this campaign (literal copy).
    const appliedSequence = ((campaign.settings as { sequence?: SequenceStep[] } | null)?.sequence) ?? undefined

    const { data: client } = await db.from('clients')
      .select('company_name, industry, booking_url, calendar_booking_enabled').eq('id', clientId).maybeSingle()
    const { data: clientSigner } = await db.from('clients').select('signer_name').eq('id', clientId).maybeSingle()
    const senderName: string | null = (clientSigner?.signer_name as string | null) ?? null

    // Leads must belong to the SAME client — cross-tenant enrol is impossible.
    const { data: leads } = await db.from('leads')
      .select('id, first_name, last_name, email, job_title, company, industry, seniority, country, tech_stack, score, score_reasoning')
      .in('id', lead_ids).eq('client_id', clientId)

    // POPIA: never enrol anyone on the opt-out blocklist.
    // HC-1 — normalise BOTH sides. The probe list was raw `leads.email` values, so a
    // blocklisted person with a mixed-case address was enrolled anyway.
    const batchEmails = normalizeRevealEmails((leads ?? []).map((l: { email: string | null }) => l.email))
    const blocked = new Set<string>()
    if (batchEmails.length > 0) {
      const { data: blockRows } = await db.from('opt_out_blocklist')
        .select('email').in('email', batchEmails).is('opted_back_in_at', null)
      for (const r of blockRows ?? []) {
        const k = normalizeRevealEmail((r as { email: string }).email)
        if (k) blocked.add(k)
      }
    }

    // #310 — charge + gate the webhook enrol path too (it enrolled + sent for free).
    const { data: balRow } = await db.from('clients')
      .select('figsy_credits_remaining').eq('id', clientId).maybeSingle()
    let figsyRemaining = (balRow?.figsy_credits_remaining as number | null) ?? 0
    // #453 — DEMO MODE: demo enrolls are free + drafted-only (no send). Bypass the
    // credit gate and the balance decrement below; chargeFigsyEnroll returns true
    // (off-ledger) for demo and the drafted enrollment is stored inert (no next_send_at).
    const isDemo = await isDemoClient(clientId)

    // #335 — fetch the client's business-knowledge digest ONCE (bounded), reused
    // for every lead's generated sequence so the solution half is grounded.
    const clientKnowledge = await getClientKnowledgeForOutreach(clientId)

    let enrolled = 0
    let skipped  = 0
    const skipReasons: Record<string, number> = {}
    let insufficientCredits = false

    for (const lead of leads ?? []) {
      if (!lead.email) { skipped++; continue }
      if (blocked.has(lead.email)) { skipped++; continue }

      // Out of FIGSY credits — stop; never give away free outreach. (Demo bypasses
      // the credit gate — #453 demo enrolls are free + drafted-only.)
      if (!isDemo && !canEnroll(figsyRemaining)) { insufficientCredits = true; break }

      // Idempotency guard (mirrors the authed path): skip if already enrolled in
      // this campaign — a retried webhook is a safe no-op, never a double-enrol.
      const { data: existing } = await db.from('figsy_enrollments')
        .select('id').eq('campaign_id', campaign.id).eq('lead_id', lead.id).maybeSingle()
      if (existing) { skipped++; continue }

      let didCharge = false
      try {
        const bookingUrl = bookingUrlForLead(client, lead.id, clientId)
        let draft = (appliedSequence && buildDraftFromSequence(appliedSequence, lead as any, client?.company_name ?? null))
          || await generateSequence(lead as any, client?.company_name ?? '', client?.industry ?? null, undefined, bookingUrl, senderName, clientKnowledge)

        // #212 — full ≤7-step sequence (client copy carries its own cadence; AI is 3-step).
        let fullSteps = appliedSequence
          ? buildDraftStepsFromSequence(appliedSequence, lead as any, client?.company_name ?? null)
          : draftToSteps(draft)

        // ⚠️ #612 PART B — THE COPY THAT ACTUALLY SENDS IS GATED HERE, BEFORE THE CHARGE.
        //
        // Part A gated templates and the drafts an operator reads. It did not gate THIS: with no
        // applied sequence, `generateSequence` writes fresh copy per lead and it went straight
        // onto the enrollment, which is the row the send loop emails from. A gate that covers
        // every path except the one that sends is not a gate.
        //
        // BEFORE `chargeFigsyEnroll` on purpose. #332's "charge first" means the charge gates the
        // ENROL; it was never a reason to take a credit for a lead we are about to refuse. A
        // charge-then-refuse would be correct-looking money that churns the ledger for nothing.
        //
        // ONE retry, then skip. The draft is non-deterministic, so a second attempt is worth
        // having; a loop is not — it would burn AI spend per lead with no bound. A skip here is
        // NAMED in `skipReasons`, never silent: "3 skipped" with no cause is the reading that
        // sends somebody hunting a bug in the wrong place.
        // ⚠️ #617 PECR — WHO THE SUBSCRIBER IS, ASKED BEFORE THE CHARGE.
        //
        // UK PECR reg. 22 bans unsolicited marketing email to INDIVIDUAL subscribers. A limited
        // company is exempt — that exemption is the whole legal basis for B2B cold email — but a
        // UK SOLE TRADER is an individual subscriber, and nothing above this line ever asked
        // whether "Sarah Jones Consulting" is a company or one person. Every other gate here is
        // about the COPY or the CONTACT; this is the only one about WHO WE ARE ALLOWED TO WRITE TO.
        //
        // BEFORE `chargeFigsyEnroll`, for the same reason #612's gate is: a charge for a lead we
        // are about to refuse is correct-looking money churning the ledger for nothing (#332).
        //
        // FAILS SAFE — a UK lead we cannot PROVE is corporate is refused. That is the opposite
        // direction from #618's fail-open, deliberately: a wrongly-paused campaign is one click
        // to undo, a wrongly-sent email is a breach that cannot be unsent.
        const pecr = pecrVerdict({ country: lead.country, companyName: lead.company, isDemo })
        if (!pecr.allow) {
          noteSkip(skipReasons, pecrSkipReason(pecr))
          skipped++
          continue
        }
        if (pecr.class === 'unknown_country') {
          // Named, not refused. Suppressing every lead with a missing country would delete most
          // of the book on an enrichment gap — so it sends, and the count is visible.
          console.warn(`[figsy] #617 enrolling ${lead.email} with no country — ${pecr.reason}`)
        }

        // ⚠️ LAUNCH COUNTRY HOLD — AT LAUNCH WE SEND TO THE US AND THE UK, AND NOWHERE ELSE.
        //
        // Directly under the PECR gate because it is the same shape of question, and BEFORE
        // `chargeFigsyEnroll` for the same reason: a credit taken for a lead we are about to
        // refuse is correct-looking money churning the ledger for nothing (#332).
        //
        // ⚠️ IT IS NOT THE SAME QUESTION AS PECR, AND MERGING THEM WOULD BE WRONG. PECR asks
        // whether UK law forbids this send; a Nigerian lead passes it happily. This asks whether
        // the founder has opened the country — and holds that same lead. Two tests, one after
        // the other, on purpose (see `packages/shared/src/launch-countries.ts`).
        //
        // ⚠️ AND IT INVERTS PECR ON THE BLANK COUNTRY, DELIBERATELY. Three lines above, an
        // unknown country ENROLS and is merely counted, because refusing on a missing field
        // would delete most of the book on a legal test that may not even apply. Here it is
        // HELD: we cannot claim a lead is in the US or the UK when nothing on the row says so,
        // and an unknown country is not evidence of an allowed one. The founder took that cost
        // knowingly on 20 Aug. Held, never deleted — this lead enrols the day its country opens.
        //
        // `isDemo` is handled by `pecrVerdict` above for PECR; here it is explicit, because the
        // entire demo book is South African and a demo that stops drafting is a broken demo.
        if (!isDemo && !isLaunchSendCountry(lead.country)) {
          noteSkip(skipReasons, launchHoldReason(lead.country))
          skipped++
          continue
        }

        if (!appliedSequence) {
          let verdict = enrolDraftGate({ steps: fullSteps, renderedFor: lead as any, isDemo })
          if (!verdict.allow) {
            draft = await generateSequence(lead as any, client?.company_name ?? '', client?.industry ?? null, undefined, bookingUrl, senderName, clientKnowledge)
            fullSteps = draftToSteps(draft)
            verdict = enrolDraftGate({ steps: fullSteps, renderedFor: lead as any, isDemo })
          }
          if (!verdict.allow) {
            noteSkip(skipReasons, verdict.reason)
            skipped++
            continue
          }
        }

        // #332 — charge FIRST (the charge is the real gate). A mid-batch charge
        // failure means the balance is gone — stop enrolling further leads. (F1) didCharge is
        // TRUE only when a credit was actually taken ('charged') — a 'skipped' result (demo, or
        // the $3 already held for this lead) enrols WITHOUT charging and must NEVER be refunded.
        const chargeResult = await chargeFigsyEnroll(clientId, lead)
        if (chargeResult === 'failed') { insufficientCredits = true; break }
        didCharge = chargeResult === 'charged'

        const { error } = await db.from('figsy_enrollments').insert({
          campaign_id:    campaign.id,
          lead_id:        lead.id,
          client_id:      clientId,
          status:         'enrolled',
          current_step:   0,
          // #453 — demo enrollments never send; leave next_send_at null so the cron
          // never fires them (drafted-only for the portal).
          next_send_at:   isDemo ? null : new Date().toISOString(),
          steps:          fullSteps.length > 0 ? fullSteps : null,
          total_steps:    fullSteps.length > 0 ? fullSteps.length : null,
          step1_subject:  draft.step1.subject,
          step1_body:     draft.step1.body,
          step2_subject:  draft.step2.subject,
          step2_body:     draft.step2.body,
          step3_subject:  draft.step3.subject,
          step3_body:     draft.step3.body,
        })
        if (error) { if (didCharge) await refundFigsyEnroll(clientId, lead.id); skipped++; continue }
        if (didCharge) figsyRemaining -= 1
        enrolled++
      } catch {
        // P8 — a THROW after a successful charge (e.g. the insert throws) would leak
        // the credit into this catch with no refund. Return it ONLY if we actually charged.
        if (didCharge) await refundFigsyEnroll(clientId, lead.id)
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

    // #620 — PERSIST THE REFUSALS. The response below already carried them and nothing rendered
    // it, so a systematic refusal was indistinguishable from an idle run. No-ops on a clean run.
    await recordEnrolSkips({
      operatorEmail: 'system:figsy-enrol', clientId, campaignId: campaign.id,
      enrolled, skipped, reasons: skipReasons,
    })
    res.json({ success: true, data: { enrolled, skipped, skip_reasons: skipReasons, insufficient_credits: insufficientCredits } })
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

    // #349 — CHECKED, NOT SWALLOWED. Both reads are consumed as `.data ?? []` below, which
    // makes a REJECTED query indistinguishable from a genuinely empty one. That is not
    // hypothetical: the duplicate of this handler deleted further down selected a `leads`
    // column that never existed, and the only reason nobody ever saw the error is that a
    // rejected query and a quiet week render identically. A client concludes nothing
    // happened. Non-fatal on purpose — half a feed still beats a blank panel.
    const { reportFailedReads } = await import('../lib/read-errors')
    reportFailedReads('figsy/activity', { sent: sentRes, replies: repliesRes })

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

    // ── 🛑 4 Sep (D5) — THESE ARE CUSTOMER-VISIBLE ACTIVITY NUMBERS ───────────────────────
    //
    // ⛓️ EVERY COUNT BELOW WAS `client_id` (or the client's whole campaign list) WITH NO
    // BOUNDARY, and the default `period` is 'all' — so `since` is null and nothing bounds them
    // at all. `/milla/teams` re-renders `dashboard/team`, which reads `emails_sent` from here
    // into a customer-facing "Team Analytics" panel: a programme customer was shown the
    // retired book's send volume as their activity.
    //
    // ⚠️ FAIL-CLOSED TO ZERO on `none` and `unreadable`, unlike the list surfaces. A number is
    // an assertion about work we did; a list that goes quiet is not.
    //
    // ⚠️ LEGACY IS UNCHANGED — `mode: 'client'` keeps `getClientCampaignIds` and the identical
    // client-scoped counts the $299 book has always seen.
    const { currentOutreachLeads, currentOutreachCampaigns, safeIn } = await import('../lib/current-outreach')
    const scope = await currentOutreachLeads(clientId)
    const campScope = await currentOutreachCampaigns(clientId, scope)
    if (scope.mode === 'unreadable') console.error('[figsy/kpis] outreach scope unreadable for', clientId, scope.reason)
    if (campScope.mode === 'unreadable') console.error('[figsy/kpis] campaign scope unreadable for', clientId, campScope.reason)
    const zeroed = scope.mode === 'none' || scope.mode === 'unreadable' || campScope.mode === 'unreadable'

    // figsy_sent_emails has no client_id — scope it via the client's campaigns. For a
    // programme customer those are the PROGRAMME's campaigns, derived through its ICPs.
    const campaignIds = campScope.mode === 'ids'
      ? safeIn(campScope.ids)
      : await getClientCampaignIds(clientId)
    /** Tenancy + THE BOUNDARY on a reply count, applied identically everywhere below. */
    const replyBase = () => {
      const q = db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', clientId)
      return scope.mode === 'ids' ? q.in('lead_id', safeIn(scope.ids)) : q
    }
    const none = () => Promise.resolve({ count: 0, data: null })

    let sentQuery = db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).in('campaign_id', campaignIds)
    if (since !== null) sentQuery = sentQuery.gte('sent_at', since)

    let repliesQuery = replyBase()
    if (since !== null) repliesQuery = repliesQuery.gte('received_at', since)

    let interestedQuery = replyBase().eq('classification', 'hot')
    if (since !== null) interestedQuery = interestedQuery.gte('received_at', since)

    let optOutQuery = replyBase().eq('classification', 'opt_out')
    if (since !== null) optOutQuery = optOutQuery.gte('received_at', since)

    let opensQuery = db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).in('campaign_id', campaignIds).not('opened_at', 'is', null)
    if (since !== null) opensQuery = opensQuery.gte('sent_at', since)

    const totalLeadsQ = db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId)
    const avgScoreQ   = db.from('leads').select('score').eq('client_id', clientId).not('score', 'is', null)

    const [
      sentRes, repliesRes, interestedRes, optOutRes,
      activeCampaignsRes, totalLeadsRes, leadsContactedRes, avgScoreRes,
      meetingsRes, opensRes,
    ] = await Promise.all([
      zeroed ? none() : sentQuery,
      zeroed ? none() : repliesQuery,
      zeroed ? none() : interestedQuery,
      zeroed ? none() : optOutQuery,
      // ⚠️ "Campaigns live" IS A CURRENT CLAIM, so it takes the boundary too — a retired
      // campaign left at status 'active' is not a programme customer's live campaign.
      zeroed ? none()
        : campScope.mode === 'ids'
          ? db.from('figsy_campaigns').select('id', { count: 'exact', head: true }).eq('client_id', clientId).in('id', safeIn(campScope.ids)).eq('status', 'active')
          : db.from('figsy_campaigns').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('status', 'active'),
      zeroed ? none() : (scope.mode === 'ids' ? totalLeadsQ.in('id', safeIn(scope.ids)) : totalLeadsQ),
      // "Contacted" = leads actually put into outreach (enrolled), scoped via campaigns —
      // NOT status='consent_sent' (which over-counted, e.g. 19 contacted while 0 sent).
      zeroed ? none() : db.from('figsy_enrollments').select('id', { count: 'exact', head: true }).in('campaign_id', campaignIds),
      zeroed ? none() : (scope.mode === 'ids' ? avgScoreQ.in('id', safeIn(scope.ids)) : avgScoreQ),
      // Meetings = real booked replies (meeting_booked_at set), NOT the driftable
      // figsy_campaigns.meetings_booked counter.
      zeroed ? none() : replyBase().not('meeting_booked_at', 'is', null),
      zeroed ? none() : opensQuery,
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
  for (const r of (repliesRes.data ?? []) as { campaign_id: string | null; classification: string | null; meeting_booked_at: string | null }[]) {
    if (!r.campaign_id) continue
    repliesTotal[r.campaign_id] = (repliesTotal[r.campaign_id] ?? 0) + 1
    if (r.classification === 'hot' || r.classification === 'interested') repliesInterested[r.campaign_id] = (repliesInterested[r.campaign_id] ?? 0) + 1
    if (r.classification === 'opt_out' || r.classification === 'unsubscribe') optedOut[r.campaign_id] = (optedOut[r.campaign_id] ?? 0) + 1
    // ⛓️ `if (r.meeting_booked_at) meetings[...]++` USED TO BE HERE (BUILD-003 item 2).
    // The number now comes from public.meetings, below, through the one module that knows
    // the counting rules — this loop could not exclude a duplicate or a spam booking, and
    // counted a reschedule twice.
  }
  const enrolled: Record<string, number> = {}
  for (const r of (enrollRes.data ?? []) as { campaign_id: string | null }[]) {
    if (r.campaign_id) enrolled[r.campaign_id] = (enrolled[r.campaign_id] ?? 0) + 1
  }
  const n = (v: unknown) => (typeof v === 'number' ? v : 0)

  // BUILD-003 item 2 — the meeting number comes from public.meetings, never from replies.
  const meetings = await campaignMeetingCounts(campaigns.map(c => c.id as string))

  for (const c of campaigns) {
    c.emails_sent        = Math.max(sent[c.id] ?? 0,              n(c.emails_sent))
    c.replies_total      = Math.max(repliesTotal[c.id] ?? 0,      n(c.replies_total))
    c.replies_interested = Math.max(repliesInterested[c.id] ?? 0, n(c.replies_interested))
    c.opted_out          = Math.max(optedOut[c.id] ?? 0,          n(c.opted_out))
    // ⚠️ NOT Math.max — and that is the fix, the same one recomputeCampaignCounters needed.
    // Every other counter here ratchets so a partial recount cannot lose data. Ratcheting
    // the meeting number would make it one-way: excluding a spam or duplicate booking could
    // never bring it DOWN, so the exclusion feature would be silently inert on the one
    // number the commercial model is judged on.
    // A null map means the query FAILED — the cached value is left alone rather than
    // overwritten with 0, because "unreadable" must never render as "none".
    c.meetings_booked    = meetings === null ? n(c.meetings_booked) : (meetings[c.id as string] ?? 0)
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

    // PR-B — report the TRUTH up front. Every enrollment charges one $3 FIGSY work
    // credit (demo is free/off-ledger), so cap what we claim + attempt by the wallet.
    // Without this the client saw "Enrolling N" then silently 0 enrolled when credits
    // ran out. autoEnrollLead still fail-closes per lead, so this never over-charges;
    // it just stops us over-promising. (Reveal credits for any unrevealed lead are a
    // separate cheaper wallet handled fail-closed inside chargeFigsyEnroll.)
    const isDemo = await isDemoClient(clientId)
    let fundedCount = toEnroll.length
    if (!isDemo && toEnroll.length) {
      const { data: creditRow } = await db.from('clients')
        .select('figsy_credits_remaining').eq('id', clientId).maybeSingle()
      const credits = Math.max(0, creditRow?.figsy_credits_remaining ?? 0)
      fundedCount = Math.min(toEnroll.length, credits)
    }
    const fundedLeads = toEnroll.slice(0, fundedCount)
    const insufficient = fundedCount < toEnroll.length

    res.json({ success: true, data: {
      enrolled: fundedCount,
      requested: toEnroll.length,
      skipped: leadIds.length - toEnroll.length,
      insufficient_credits: insufficient,
      message: toEnroll.length === 0
        ? 'All eligible leads are already enrolled.'
        : insufficient
          ? `Enrolling ${fundedCount} of ${toEnroll.length} — FIGSY credits ran out.`
          : 'Enrolling in background…',
    } })

    // Fire-and-forget — respond immediately, enroll async. Only the FUNDED leads.
    ;(async () => {
      for (const leadId of fundedLeads) {
        try { await autoEnrollLead(leadId, clientId) } catch (e) { console.error('[figsy] enroll-consented', leadId, e) }
      }
      console.log(`[figsy] enroll-consented: enrolled=${fundedLeads.length} requested=${toEnroll.length} already=${alreadySet.size} insufficient=${insufficient} campaign=${campaign.id}`)
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
      // #212 — walk the full ≤7-step sequence via enrollmentStep (jsonb `steps`,
      // else legacy step1-3 columns). null = past the last usable step.
      const nextStep = enrollment.current_step + 1
      const stepView = enrollmentStep(enrollment, nextStep)
      if (!stepView) {
        // End of the sequence — complete it so it doesn't stay perpetually due.
        // #349 — checked: if this write fails the enrollment stays due forever and every
        // subsequent cron run re-processes it, which is the exact state the line prevents.
        await updateEnrollmentState(enrollment.id, {
          status: 'completed', completed_at: new Date().toISOString(), next_send_at: null,
        }, 'a finished sequence was not marked completed — it stays due and will be re-processed on every cron run')
        continue
      }
      try {
        // #15 — only a real 'sent' counts; 'queued' means the draft went to review.
        const outcome = await sendSequenceEmail(enrollment.id, lead, nextStep, stepView.subject, stepView.body, req.params.id, { totalSteps: stepView.total, waitDaysNext: stepView.wait_days })
        if (outcome === 'sent') sent++
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

    // ── ⛓️ 9 Sep — KEEP THE CANONICAL STORE IN STEP WITH THE SENDING STORE ────────────────
    //
    // 🛑 THIS ROUTE UPDATED ONLY THE SENDING STORE, AND THAT IS WHY NO PAYING CLIENT COULD
    // REACH READY_FOR_APPROVAL. `settings.sequence` + `applied_sequence_id` (written above) are
    // what the legacy send seam reads. Programme work reads the CANONICAL store —
    // `figsy_sequences.campaign_id` — and nothing generic ever wrote it, so
    // `resolveProgrammeChain` found no sequence for any programme but House.
    //
    // ⚠️ ONLY FOR A PROGRAMME CAMPAIGN, and that is deliberate rather than cautious. A legacy
    // client's campaign has no programme to be canonical for, and writing a per-campaign copy
    // for one would put a second row in their sequence library with no way to tell it from a
    // template they saved. Programme-ness is proved positively, through the campaign's own ICP.
    //
    // ⚠️ THE LIBRARY ROW IS NOT MOVED. `applyProgrammeSequence` copies the steps onto the
    // campaign's own canonical row; the template keeps `campaign_id` NULL and can still be
    // applied elsewhere.
    let canonical: { linked: boolean; reason?: string } = { linked: false }
    const { data: campIcp } = await db.from('figsy_campaigns')
      .select('icp_id').eq('id', campaignId).eq('client_id', clientId).maybeSingle()
    const icpId = (campIcp as { icp_id?: string | null } | null)?.icp_id ?? null
    if (icpId) {
      const { data: icpRow } = await db.from('icps')
        .select('programme_id').eq('id', icpId).eq('client_id', clientId).maybeSingle()
      const programmeId = (icpRow as { programme_id?: string | null } | null)?.programme_id ?? null
      if (programmeId) {
        const { applyProgrammeSequence } = await import('../lib/programme-sequence')
        const applied = await applyProgrammeSequence(programmeId, steps as never, sequence.name ?? 'Programme sequence')
        // ⚠️ REPORTED, NEVER SWALLOWED. The campaign settings write above already succeeded, so
        // a failure here is a HALF-APPLIED state the operator has to know about: the words are
        // on the campaign and the programme still cannot resolve them.
        canonical = applied.ok ? { linked: true } : { linked: false, reason: applied.reason }
      }
    }

    res.json({ success: true, data: { campaign_id: campaignId, created, email_steps: emails.length, canonical } })
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
    // #349 — this endpoint used to write and then return `{ success: true }` unconditionally,
    // so a rejected write told the caller their change had been saved. The console then shows
    // the old status on the next load and looks like it "forgot" the click.
    const moved = await updateEnrollmentState(enrollment.id, { status },
      `an operator set this enrollment to "${status}" and the write was rejected — the console reported success`)
    if (!moved) {
      res.status(500).json({ success: false, error: 'The status could not be saved — it is unchanged.' }); return
    }
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


    // ── 🛑 3 Sep (C2) · THE PER-LEAD COMMERCIAL FENCE, ON THE ENROL DOOR TOO ───────────────
    //
    // ⛓️ PR B fenced the per-lead COMMERCIAL paths at the client level — approve, reveal and
    // approve-batch, through `batchGate` and inside `approveLead`. THIS DOOR WAS MISSED. It
    // calls `chargeFigsyEnroll` directly, which takes a flat $4 from the wallet per lead, so a
    // client PR B had already ruled off the per-lead model could still be charged here, one
    // lead at a time, by the route next door.
    //
    // 🛑 AND C2 IS WHY IT MATTERS NOW. House and MBF are declared programme clients with no
    // programme open; before the commercial model existed they resolved as legacy everywhere,
    // so this route charging them looked like every other legacy charge. It is not: their
    // programme is what they paid for, and there is no per-lead price on it.
    //
    // ⛓️ CORRECTED 3 Sep — ~~the fence was skipped for a demo client.~~ FOUNDER-RULED:
    // **`is_demo` AND `commercial_model` ARE ORTHOGONAL.** The first cut reasoned "a demo
    // charges nothing, so the money fence need not run" — and that quietly turned the demo flag
    // into a grant of LEGACY COMMERCIAL WORKFLOW. MBF is both a demo and a programme client;
    // under that version it would still have enrolled down the retired per-lead path the moment
    // it was declared `programme`, which is the exact inference C2 exists to end, wearing a
    // different flag.
    //
    // ⚠️ WHAT DEMO STILL DECIDES, AND ALL IT DECIDES: whether real money and real provider spend
    // happen. `chargeFigsyEnroll` returns off-ledger for a demo and charges nothing — untouched.
    // Demo never decides WHICH COMMERCIAL MODEL governs the workflow.
    //
    // ⚠️ AND THE MBF DEMO IS NOT BROKEN BY THIS. `seedMbf` writes `figsy_enrollments` directly;
    // it has never called this route or `autoEnrollLead`. What refuses after MBF is declared
    // `programme` is a human trying to work it down the legacy path — which is the point.
    //
    // ⚠️ THE LIVE BOOK IS UNTOUCHED. `commercial_model` is NULL for every existing client, and
    // an unclassified client with no open programme resolves to legacy and passes straight
    // through, exactly as today — demo accounts included.
    {
      const { checkLegacyPerLeadAuthority } = await import('../lib/programme-authority')
      const fence = await checkLegacyPerLeadAuthority(clientId)
      if (!fence.allowed) {
        console.warn(`[figsy] enrol REFUSED for client ${clientId} — ${fence.code}. Nothing enrolled, nothing charged.`)
        res.status(409).json({ success: false, error: fence.code, message: fence.message })
        return
      }
    }
    // Item 187 — a saved sequence/template applied to this campaign (literal copy).
    const appliedSequence = ((campaign.settings as { sequence?: SequenceStep[] } | null)?.sequence) ?? undefined

    const { data: client } = await db.from('clients')
      .select('company_name, industry, booking_url, calendar_booking_enabled').eq('id', clientId).maybeSingle()
    // P-a: configurable sign-off name (guarded — null if column missing pre-migration).
    const { data: clientSigner } = await db.from('clients').select('signer_name').eq('id', clientId).maybeSingle()
    const senderName: string | null = (clientSigner?.signer_name as string | null) ?? null

    const { data: leads } = await db.from('leads')
      .select('id, first_name, last_name, email, job_title, company, industry, seniority, country, tech_stack, score, score_reasoning')
      .in('id', lead_ids).eq('client_id', clientId)

    // POPIA: never enrol anyone on the opt-out blocklist. Pull the blocklisted
    // emails for this batch up front so we can skip them.
    // HC-1 — normalise BOTH sides. The probe list was raw `leads.email` values, so a
    // blocklisted person with a mixed-case address was enrolled anyway.
    const batchEmails = normalizeRevealEmails((leads ?? []).map((l: { email: string | null }) => l.email))
    const blocked = new Set<string>()
    if (batchEmails.length > 0) {
      const { data: blockRows } = await db.from('opt_out_blocklist')
        .select('email').in('email', batchEmails).is('opted_back_in_at', null)
      for (const r of blockRows ?? []) {
        const k = normalizeRevealEmail((r as { email: string }).email)
        if (k) blocked.add(k)
      }
    }

    // #310 — FIGSY is charged at enrollment (1 credit = 1 lead enrolled). Read the
    // client's FIGSY balance up front and gate + deduct PER lead, mirroring
    // autoEnrollLead. Previously this route enrolled + sent for free at any balance.
    const { data: balRow } = await db.from('clients')
      .select('figsy_credits_remaining').eq('id', clientId).maybeSingle()
    let figsyRemaining = (balRow?.figsy_credits_remaining as number | null) ?? 0
    // #453 — DEMO MODE: demo enrolls are free + drafted-only (no send). Bypass the
    // credit gate + balance decrement below; chargeFigsyEnroll returns true off-ledger.
    const isDemo = await isDemoClient(clientId)

    // #335 — fetch the client's business-knowledge digest ONCE (bounded), reused
    // for every lead's generated sequence so the solution half is grounded.
    const clientKnowledge = await getClientKnowledgeForOutreach(clientId)

    let enrolled = 0
    let skipped  = 0
    const skipReasons: Record<string, number> = {}
    let insufficientCredits = false

    for (const lead of leads ?? []) {
      if (!lead.email) { skipped++; continue }
      if (blocked.has(lead.email)) { skipped++; continue }   // opted out — never email

      // Out of FIGSY credits — stop; never give away free outreach. (Demo bypasses
      // the credit gate — #453 demo enrolls are free + drafted-only.)
      if (!isDemo && !canEnroll(figsyRemaining)) { insufficientCredits = true; break }

      // Skip if already enrolled (idempotent — no charge)
      const { data: existing } = await db.from('figsy_enrollments')
        .select('id').eq('campaign_id', campaign.id).eq('lead_id', lead.id).maybeSingle()
      if (existing) { skipped++; continue }

      let didCharge = false
      try {
        const bookingUrl = bookingUrlForLead(client, lead.id, clientId)
        let draft = (appliedSequence && buildDraftFromSequence(appliedSequence, lead as any, client?.company_name ?? null))
          || await generateSequence(lead as any, client?.company_name ?? '', client?.industry ?? null, undefined, bookingUrl, senderName, clientKnowledge)

        // #212 — full ≤7-step sequence (client copy carries its own cadence; AI is 3-step).
        let fullSteps = appliedSequence
          ? buildDraftStepsFromSequence(appliedSequence, lead as any, client?.company_name ?? null)
          : draftToSteps(draft)

        // ⚠️ #612 PART B — THE COPY THAT ACTUALLY SENDS IS GATED HERE, BEFORE THE CHARGE.
        //
        // Part A gated templates and the drafts an operator reads. It did not gate THIS: with no
        // applied sequence, `generateSequence` writes fresh copy per lead and it went straight
        // onto the enrollment, which is the row the send loop emails from. A gate that covers
        // every path except the one that sends is not a gate.
        //
        // BEFORE `chargeFigsyEnroll` on purpose. #332's "charge first" means the charge gates the
        // ENROL; it was never a reason to take a credit for a lead we are about to refuse. A
        // charge-then-refuse would be correct-looking money that churns the ledger for nothing.
        //
        // ONE retry, then skip. The draft is non-deterministic, so a second attempt is worth
        // having; a loop is not — it would burn AI spend per lead with no bound. A skip here is
        // NAMED in `skipReasons`, never silent: "3 skipped" with no cause is the reading that
        // sends somebody hunting a bug in the wrong place.
        // ⚠️ #617 PECR — WHO THE SUBSCRIBER IS, ASKED BEFORE THE CHARGE.
        //
        // UK PECR reg. 22 bans unsolicited marketing email to INDIVIDUAL subscribers. A limited
        // company is exempt — that exemption is the whole legal basis for B2B cold email — but a
        // UK SOLE TRADER is an individual subscriber, and nothing above this line ever asked
        // whether "Sarah Jones Consulting" is a company or one person. Every other gate here is
        // about the COPY or the CONTACT; this is the only one about WHO WE ARE ALLOWED TO WRITE TO.
        //
        // BEFORE `chargeFigsyEnroll`, for the same reason #612's gate is: a charge for a lead we
        // are about to refuse is correct-looking money churning the ledger for nothing (#332).
        //
        // FAILS SAFE — a UK lead we cannot PROVE is corporate is refused. That is the opposite
        // direction from #618's fail-open, deliberately: a wrongly-paused campaign is one click
        // to undo, a wrongly-sent email is a breach that cannot be unsent.
        const pecr = pecrVerdict({ country: lead.country, companyName: lead.company, isDemo })
        if (!pecr.allow) {
          noteSkip(skipReasons, pecrSkipReason(pecr))
          skipped++
          continue
        }
        if (pecr.class === 'unknown_country') {
          // Named, not refused. Suppressing every lead with a missing country would delete most
          // of the book on an enrichment gap — so it sends, and the count is visible.
          console.warn(`[figsy] #617 enrolling ${lead.email} with no country — ${pecr.reason}`)
        }

        // ⚠️ LAUNCH COUNTRY HOLD — AT LAUNCH WE SEND TO THE US AND THE UK, AND NOWHERE ELSE.
        //
        // Directly under the PECR gate because it is the same shape of question, and BEFORE
        // `chargeFigsyEnroll` for the same reason: a credit taken for a lead we are about to
        // refuse is correct-looking money churning the ledger for nothing (#332).
        //
        // ⚠️ IT IS NOT THE SAME QUESTION AS PECR, AND MERGING THEM WOULD BE WRONG. PECR asks
        // whether UK law forbids this send; a Nigerian lead passes it happily. This asks whether
        // the founder has opened the country — and holds that same lead. Two tests, one after
        // the other, on purpose (see `packages/shared/src/launch-countries.ts`).
        //
        // ⚠️ AND IT INVERTS PECR ON THE BLANK COUNTRY, DELIBERATELY. Three lines above, an
        // unknown country ENROLS and is merely counted, because refusing on a missing field
        // would delete most of the book on a legal test that may not even apply. Here it is
        // HELD: we cannot claim a lead is in the US or the UK when nothing on the row says so,
        // and an unknown country is not evidence of an allowed one. The founder took that cost
        // knowingly on 20 Aug. Held, never deleted — this lead enrols the day its country opens.
        //
        // `isDemo` is handled by `pecrVerdict` above for PECR; here it is explicit, because the
        // entire demo book is South African and a demo that stops drafting is a broken demo.
        if (!isDemo && !isLaunchSendCountry(lead.country)) {
          noteSkip(skipReasons, launchHoldReason(lead.country))
          skipped++
          continue
        }

        if (!appliedSequence) {
          let verdict = enrolDraftGate({ steps: fullSteps, renderedFor: lead as any, isDemo })
          if (!verdict.allow) {
            draft = await generateSequence(lead as any, client?.company_name ?? '', client?.industry ?? null, undefined, bookingUrl, senderName, clientKnowledge)
            fullSteps = draftToSteps(draft)
            verdict = enrolDraftGate({ steps: fullSteps, renderedFor: lead as any, isDemo })
          }
          if (!verdict.allow) {
            noteSkip(skipReasons, verdict.reason)
            skipped++
            continue
          }
        }

        // #332 — charge FIRST (the charge is the real gate). A mid-batch charge
        // failure means the balance is gone — stop enrolling further leads. (F1) didCharge is
        // TRUE only when a credit was actually taken ('charged') — a 'skipped' result (demo, or
        // the $3 already held for this lead) enrols WITHOUT charging and must NEVER be refunded.
        const chargeResult = await chargeFigsyEnroll(clientId, lead)
        if (chargeResult === 'failed') { insufficientCredits = true; break }
        didCharge = chargeResult === 'charged'

        const { error } = await db.from('figsy_enrollments').insert({
          campaign_id:    campaign.id,
          lead_id:        lead.id,
          client_id:      clientId,
          status:         'enrolled',
          current_step:   0,
          // #453 — demo enrollments never send; leave next_send_at null so the cron
          // never fires them (drafted-only for the portal).
          next_send_at:   isDemo ? null : new Date().toISOString(),
          steps:          fullSteps.length > 0 ? fullSteps : null,
          total_steps:    fullSteps.length > 0 ? fullSteps.length : null,
          step1_subject:  draft.step1.subject,
          step1_body:     draft.step1.body,
          step2_subject:  draft.step2.subject,
          step2_body:     draft.step2.body,
          step3_subject:  draft.step3.subject,
          step3_body:     draft.step3.body,
        })
        if (error) { if (didCharge) await refundFigsyEnroll(clientId, lead.id); skipped++; continue }
        if (didCharge) figsyRemaining -= 1
        enrolled++
      } catch {
        // P8 — a THROW after a successful charge (e.g. the insert throws) would leak
        // the credit into this catch with no refund. Return it ONLY if we actually charged.
        if (didCharge) await refundFigsyEnroll(clientId, lead.id)
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

    // #620 — PERSIST THE REFUSALS. The response below already carried them and nothing rendered
    // it, so a systematic refusal was indistinguishable from an idle run. No-ops on a clean run.
    await recordEnrolSkips({
      operatorEmail: 'system:figsy-enrol', clientId, campaignId: campaign.id,
      enrolled, skipped, reasons: skipReasons,
    })
    res.json({ success: true, data: { enrolled, skipped, skip_reasons: skipReasons, insufficient_credits: insufficientCredits } })
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
      .select('company_name, industry, booking_url, calendar_booking_enabled').eq('id', clientId).maybeSingle()
    const { data: clientSigner } = await db.from('clients').select('signer_name').eq('id', clientId).maybeSingle()
    const senderName: string | null = (clientSigner?.signer_name as string | null) ?? null

    const clientKnowledge = await getClientKnowledgeForOutreach(clientId)
    const draft = await generateSequence(lead as any, client?.company_name ?? '', client?.industry ?? null, undefined, bookingUrlForLead(client, lead.id, clientId), senderName, clientKnowledge)
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

    // ══ 🛑 THE KILL-SWITCH GOVERNS THIS TOO, AND THE ANSWER MUST BE HONEST ══════════════
    //
    // ⛓️ TWO THINGS WERE WRONG HERE (corrected 9 Sep). `isPreview: true` used to EXEMPT this
    // path from the kill-switch inside the send core — and the recipient is `to_email`, an
    // arbitrary address from the request body, not "the founder's own inbox". So the one path
    // described as too small to matter was the one that could reach anybody.
    //
    // And the reply below said "Test email sent to X" whatever came back. A deferred send
    // reported as a sent one is how somebody concludes the switch is broken, or worse,
    // concludes mail is leaving when it is not.
    const outcome = await sendSequenceEmail('test-preview', fakeLead as any, 1, step1.subject, step1.body, req.params.id, { isPreview: true })
    if (outcome !== 'sent') {
      const { KILL_SWITCH_REFUSAL, outreachDeliveryPermitted } = await import('../lib/outreach-kill-switch')
      res.status(outreachDeliveryPermitted() ? 502 : 503).json({
        success: false,
        error: outreachDeliveryPermitted()
          ? `The test email was not sent (${outcome}). Nothing reached ${toEmail}.`
          : KILL_SWITCH_REFUSAL,
      })
      return
    }
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
      // #212 — walk the full ≤7-step sequence via enrollmentStep (jsonb `steps`,
      // else legacy step1-3 columns). null = past the last usable step.
      const nextStep = enrollment.current_step + 1
      const stepView = enrollmentStep(enrollment, nextStep)
      if (!stepView) {
        // End of the sequence — complete it so it doesn't stay perpetually due.
        // #349 — checked: if this write fails the enrollment stays due forever and every
        // subsequent cron run re-processes it, which is the exact state the line prevents.
        await updateEnrollmentState(enrollment.id, {
          status: 'completed', completed_at: new Date().toISOString(), next_send_at: null,
        }, 'a finished sequence was not marked completed — it stays due and will be re-processed on every cron run')
        continue
      }

      // Honour the step's on_reply setting if the lead has replied since last send
      try {
        if (await applyReplyBranching(enrollment, stepsCache) === 'skip') continue
      } catch (err) {
        console.error('[figsy/send-due] branching', enrollment.id, ':', err)
      }

      try {
        // #15 — only a real 'sent' counts; 'queued' means the draft went to review.
        const outcome = await sendSequenceEmail(enrollment.id, lead, nextStep, stepView.subject, stepView.body, enrollment.campaign_id, { totalSteps: stepView.total, waitDaysNext: stepView.wait_days })
        if (outcome === 'sent') sent++
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
    const { body: replyBody } = z.object({ body: z.string().min(1).max(5000) }).parse(req.body)

    // Shared with the operator's per-client Inbox (lib/manual-reply) so the demo,
    // opt-out and kill-switch gates can never drift between the two paths.
    const { sendManualReply } = await import('../lib/manual-reply')
    const r = await sendManualReply(req.params.id, clientId, replyBody)
    if (!r.ok) { res.status(r.status).json({ success: false, error: r.error }); return }
    res.json({ success: true, data: r.sent ? { sent: true, resend_id: r.resendId } : { sent: false, demo: true } })
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

// Unified inbox — the replies this client's CURRENT work has produced.
//
// ── 🛑 4 Sep (D1) — THE RAIL WAS BOUNDED AND THIS PAGE WAS NOT ─────────────────────────
//
// ⛓️ THIS READ `figsy_replies` BY `client_id` AND TOOK THE NEWEST 200. On 3 Sep
// `recentRepliesFor` bounded the Home rail over the SAME TABLE, and the founder confirmed on
// his own screen that House's historical reply had gone. It had gone from the rail. The
// Replies PAGE — one click away in that same rail, reached by the badge that now correctly
// read zero — still returned it in full.
//
// 🛑 THAT IS THE PROOF THAT A PER-SURFACE FIX IS NOT A FIX. Two surfaces over one table, one
// bounded and one not, is worse than neither being bounded: the badge and the page contradict
// each other, and the page wins because it is the one with the words in it.
//
// ⚠️ THE BOUNDARY IS THE SHARED ONE, not a second interpretation — `currentOutreachLeads`,
// which is `currentWorkspaceScope` plus the one derivation every outreach surface needs.
// `figsy_replies` carries no `programme_id`, so attribution is DERIVED through `lead_id`,
// exactly as the rail derives it. No column, no migration, no backfill.
//
// ⚠️ FAIL-SOFT ON UNREADABLE, AND THAT MATCHES THE RAIL DELIBERATELY. Blanking a paying
// client's inbox over a transient read error is a worse lie than showing it, and the rail
// already made that call for this table. One table, one degradation.
figsyRouter.get('/replies/all', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { currentOutreachLeads, safeIn } = await import('../lib/current-outreach')
    const scope = await currentOutreachLeads(clientId)

    // 🛑 NO CURRENT OUTREACH MEANS NO CURRENT REPLIES. Returned positively as an empty inbox
    // rather than as a query nobody can read — a calibration workspace has sent nobody an
    // email, so a reply here could only be an earlier motion's.
    if (scope.mode === 'none') { res.json({ success: true, data: [] }); return }

    // ── 🛑 4 Sep (FOUNDER-REJECTED, CORRECTED) — UNREADABLE FAILS **CLOSED** ──────────────
    //
    // ⛓️ THIS FELL THROUGH TO THE CLIENT-SCOPED INBOX, matching the Home rail's fail-soft. The
    // founder refused it: *"unreadable current-work scope → return whole historical client
    // inbox … recreates the historical-bleed class when authority resolution fails."* He is
    // right, and the reasoning I copied was written for a different question. The rail's
    // fail-soft dates from when the alternative was a blank rail on a LEGACY client; once the
    // fallback can expose a programme customer's retired book, "avoid an empty screen" stops
    // being a kindness and becomes the defect itself.
    //
    // 🛑 A TRANSIENT AUTHORITY FAILURE IS NOT A LICENCE TO SHOW HISTORY. We do not know which
    // model governs this client, so we cannot know that anything we return is theirs to see
    // as current — and an empty screen is recoverable where a false one is not.
    //
    // ⚠️ AND IT IS AN ERROR, NOT AN EMPTY LIST. Returning `[]` would say "you have no replies",
    // which is a claim; 503 says "we could not read this", which is the truth. The inbox
    // renders that state rather than an empty inbox — see its `loadError` branch.
    if (scope.mode === 'unreadable') {
      console.error('[figsy/replies/all] outreach scope unreadable for', clientId, scope.reason)
      res.status(503).json({ success: false, error: 'We could not confirm your current work, so your replies were not loaded. Nothing has changed.' })
      return
    }

    // Include lead id + linkedin_url so the inbox can link reply→lead and show
    // the LinkedIn chip (both were impossible because these weren't selected).
    let q = db.from('figsy_replies')
      .select('*, leads(id,first_name,last_name,job_title,company,linkedin_url)')
      .eq('client_id', clientId)
    // ⚠️ APPLIED AFTER TENANCY AND BEFORE THE ORDER. The boundary only ever ADDS a filter;
    // `client_id` is unconditional, so no scope can widen what another client may see.
    if (scope.mode === 'ids') q = q.in('lead_id', safeIn(scope.ids))
    const { data, error } = await q
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

    // #365 (AR-27) — this endpoint fabricates a 'hot' reply + meeting into REAL stats.
    // Guarded only by requireAuth, any client could inject fake KPIs into their own
    // dashboard in production. Allow only outside production, or for a demo client.
    if (process.env.NODE_ENV === 'production') {
      const { data: c } = await db.from('clients').select('is_demo').eq('id', clientId).maybeSingle()
      if (!(c as { is_demo?: boolean } | null)?.is_demo) {
        res.status(403).json({ success: false, error: 'Demo seeding is disabled for live accounts.' }); return
      }
    }

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

    // ⚠️ NO provider_event_key, DELIBERATELY. This is demo seeding: it fabricates a reply
    // that no provider ever delivered, so there is no message id and no delivery id to key
    // on. That is exactly the fail-open case the partial unique index is built for — see
    // 20260829_reply_idempotency.sql.
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
// GET /figsy/campaigns/:id/pending-drafts — the portal's per-campaign Pending Approvals
// panel. #15 (Fable fix) — this used to read figsy_sent_emails status='draft', a queue
// NOTHING ever wrote to (the column defaults to 'sent'; no producer existed), so the
// panel was permanently empty while its approve button pretend-approved phantom rows.
// It now reads the REAL co-pilot queue (figsy_approval_queue, fed by sendSequenceEmail's
// review gate), same response shape the portal already renders.
figsyRouter.get('/campaigns/:id/pending-drafts', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data: campaign } = await db.from('figsy_campaigns')
      .select('id').eq('id', req.params.id).eq('client_id', clientId).maybeSingle()
    if (!campaign) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }
    const { data, error } = await db.from('figsy_approval_queue')
      .select('id, lead_id, subject, body, created_at, leads(first_name, last_name, company)')
      .eq('campaign_id', req.params.id)
      .eq('client_id', clientId)
      .eq('status', 'pending')
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

// POST /figsy/emails/:id/approve — the portal's Approve button. #15 (Fable fix) — this
// used to flip a phantom figsy_sent_emails row to 'approved' WITHOUT sending (the exact
// pretend-send #268 bans). It is now a second door onto the real approval-send.
figsyRouter.post('/emails/:id/approve', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const r = await approveQueuedDraft(clientId, req.params.id)
    res.status(r.http).json(r.body)
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to approve email' }) }
})

// DELETE /figsy/emails/:id/draft — the portal's Reject button. #15 (Fable fix) — now
// rejects the real queue row. The enrollment stays paused (next_send_at null): a human
// said "don't send this" — nothing further fires for it unless re-enrolled.
figsyRouter.delete('/emails/:id/draft', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data, error } = await db.from('figsy_approval_queue')
      .update({ status: 'rejected' })
      .eq('id', req.params.id)
      .eq('client_id', clientId)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()
    if (error) throw error
    if (!data) { res.status(404).json({ success: false, error: 'Not found or already processed' }); return }
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

// ── ACTIVITY FEED — REMOVED (was a SHADOWED DUPLICATE) ───────────────────────
//
// A second `figsyRouter.get('/activity')` lived here, ~110 lines, registered AFTER the real
// one at the top of this file. Express matches the FIRST route that matches and this one
// always responded, so the second was UNREACHABLE — every request has always been served by
// the handler above.
//
// It was found while fixing a query in it that selected `leads.source`, a column that has
// never existed. The bug was real; the code was dead. That is the trap a shadowed route
// sets: it reads as live, it can be edited, tested and reasoned about, and none of it
// reaches production. `no-duplicate-routes.test.ts` now fails the build if a path is
// registered twice on the same router and method, so this cannot recur silently.
//
// Nothing is lost by deleting it. Its extra event types (campaign_created, lead_added) were
// never rendered anywhere, because no response ever carried them.

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
    // #638 — `description` is not a column on icps (schema.sql:59-75) and never has been.
    // The select was rejected, `icps` came back undefined, and suggest-campaign has been
    // prompting Claude with NO ICP context at all — producing a generic campaign suggestion
    // that looks personalised. Removed rather than created: nothing writes it.
    const { data: icps } = await db.from('icps')
      .select('name, industries, job_titles, geographies, seniority_levels')
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
        leads ( first_name, last_name, company, job_title ),
        figsy_campaigns ( name )`)
      .eq('client_id', clientId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    res.json({ queue: data })
  } catch (err: unknown) { res.status(500).json({ error: (err as Error).message }) }
})

// #15 / #268 — SHARED approval-send. Approving a co-pilot draft performs the REAL send,
// and NEVER pretends. The producer (sendSequenceEmail's review gate) enqueues drafts with
// their enrollment + sequence context. On approve we atomically claim the row
// (pending→approved so a double-click can't double-send), reload the lead, then re-enter
// sendSequenceEmail with skipReview=true — the SAME charged, logged, atomically-claimed
// send the auto path runs. The row becomes 'sent' ONLY when that call actually reports
// 'sent'. Every other outcome is reported honestly (#268 — never look delivered when
// nothing left): retryable ones (deferred/failed) return the row to 'pending'; a
// 'suppressed' lead (DNC / opted-out) is terminal → the row is 'rejected' so it can't be
// re-approved forever. A THROW mid-send also restores 'pending' — otherwise the row
// strands as approved-but-unsent, invisible to the queue and impossible to retry.
// Used by BOTH approve doors: the portal's /emails/:id/approve and /approval-queue/:id/approve.
// Exported so Vida's operator console can release a draft on a client's behalf through the
// EXACT same charged, logged, atomically-claimed send path (no parallel implementation).
export async function approveQueuedDraft(clientId: string | null, queueId: string): Promise<{ http: number; body: Record<string, unknown> }> {
  const { data: row, error } = await db
    .from('figsy_approval_queue')
    .update({ status: 'approved' })
    .eq('id', queueId)
    .eq('client_id', clientId)
    .eq('status', 'pending')
    .select('id, enrollment_id, campaign_id, lead_id, sequence_step, subject, body, total_steps, wait_days_next')
    .single()
  if (error || !row) return { http: 404, body: { success: false, error: 'Not found or already processed' } }

  const restorePending = () => db.from('figsy_approval_queue').update({ status: 'pending' }).eq('id', row.id)

  // Reload the lead for the send (the draft only stored to_email/subject/body).
  const { data: lead } = await db.from('leads').select('*').eq('id', row.lead_id).maybeSingle()
  if (!lead) {
    await restorePending()
    return { http: 404, body: { success: false, sent: false, error: 'Lead not found — cannot send. The draft stays pending.' } }
  }

  let outcome: SendOutcome
  try {
    outcome = await sendSequenceEmail(
      row.enrollment_id as string,
      lead as Lead,
      row.sequence_step as number,
      row.subject as string,
      row.body as string,
      row.campaign_id as string,
      {
        totalSteps:   (row.total_steps as number | null) ?? undefined,
        waitDaysNext: (row.wait_days_next as number | null) ?? undefined,
        skipReview:   true,
      },
    )
  } catch (err) {
    await restorePending()
    return { http: 500, body: { success: false, sent: false, error: `Send failed: ${err instanceof Error ? err.message : 'unknown error'}. The draft stays pending.` } }
  }

  if (outcome === 'sent') {
    await db.from('figsy_approval_queue').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', row.id)
    return { http: 200, body: { success: true, approved: true, sent: true } }
  }

  if (outcome === 'suppressed') {
    // Terminal: DNC / opted-out / demo — this draft can never send. Reject it so it
    // stops reappearing as approvable.
    await db.from('figsy_approval_queue').update({ status: 'rejected' }).eq('id', row.id)
    return { http: 200, body: { success: true, approved: true, sent: false, outcome, note: 'This lead is on a do-not-contact / opted-out list, so nothing was sent and the draft was closed.' } }
  }

  // Retryable (deferred / failed) — be honest and return the row to pending.
  await restorePending()
  const notes: Record<string, string> = {
    deferred: 'Send deferred (daily cap reached, outreach switch off, or email service unset). The draft stays pending — approve again shortly.',
    failed:   'The email service rejected the send. The draft stays pending — try again shortly.',
    queued:   'Unexpected re-queue. The draft stays pending.',
  }
  return { http: 200, body: { success: true, approved: true, sent: false, outcome, note: notes[outcome] ?? 'Not sent — the draft stays pending.' } }
}

// POST /api/figsy/approval-queue/:id/approve
figsyRouter.post('/approval-queue/:id/approve', requireAuth, async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    const r = await approveQueuedDraft(clientId, req.params.id)
    res.status(r.http).json(r.body)
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
