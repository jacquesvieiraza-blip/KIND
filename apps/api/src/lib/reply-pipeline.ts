// REPLY PIPELINE — everything that happens to an inbound reply AFTER a provider adapter
// has produced an `InboundReply`.
//
// #551 — WHY THIS FILE EXISTS. `lib/reply-ingest.ts` already made the *judgement* provider-
// agnostic (matching, routing, opt-out, the dedup key). But the ~260 lines that ACT on those
// judgements — store the reply, classify once, suppress opt-outs, escalate risky replies, run
// the hot path, push to CRM — lived inside the Resend Express handler in `routes/figsy.ts`.
//
// So adding the Smartlead feeder had exactly two options: duplicate those 260 lines, or move
// them here. Duplicating is precisely what #589 exists to prevent — "otherwise each of the
// three providers grows its own copy of the same five bugs, and they diverge silently". R7
// alone (a failed blocklist write meaning WE KEEP EMAILING SOMEONE WHO SAID STOP) is not a
// thing to own two copies of.
//
// This is a MOVE, not a rewrite. The body below is the Resend handler's own code, with four
// mechanical changes and no behavioural ones:
//   • the four `res.status(200).json(...); return` exits became returned result objects, so
//     each provider's route serialises its own response
//   • `fromEmail` / `fromName` / `body` / `subject` now read off `inbound`, which already
//     carried all four
//   • `payload` (Resend's parsed webhook object) became `ctx.rawPayload`, kept because
//     `figsy_replies.raw_payload` stores it verbatim for forensics
//   • the body-fetch diagnostics became `ctx.bodyFetchAttempted` / `ctx.bodyFetchFailure`,
//     which only Resend sets — its `email.received` webhook is metadata-only
//
// `reply-fanout.route.test.ts` drives the real Express handler and pins the classify-once
// shape; it stayed green across the move, which is the proof that nothing changed.

import { db } from '@kind/db'
import { sendFounderAlert } from './alerts'
import { classifyReply, isRiskyReply, recomputeCampaignCounters } from './figsy'
import { pushDealToCrm } from './crm'
import { logOutcomeEvent } from './outcomes'
import { syncFigsyInterestedToHubspot } from './hubspot'
import { sendPushToClient } from './push'
import { emitSignal } from '../routes/signals'
import {
  isUnusable, findLeadMatches, suppressOptOut, alertDroppedReply, describeBodyFetch,
  REPLY_LOOKUP_STATUSES, resolveInboxOwner, routeReply, unmatchedAtKnownInboxLines,
  type InboundReply,
} from './reply-ingest'

/** Provider-specific extras the pipeline needs but cannot derive from `InboundReply`. */
export type ReplyContext = {
  /**
   * The provider's parsed webhook object, stored verbatim on `figsy_replies.raw_payload`.
   * Forensics only — nothing downstream branches on it.
   */
  rawPayload: Record<string, unknown>
  /**
   * Resend only: whether we tried to fetch the body, and why it failed if we did. Its
   * `email.received` webhook is metadata-only, so an empty body there means a FAILED FETCH
   * rather than an empty reply — and the alert has to say which. Providers that deliver the
   * body inline leave these at their defaults.
   */
  bodyFetchAttempted?: boolean
  bodyFetchFailure?: string | null
  /**
   * The provider event key this webhook already deduped on — `replyEventKey`'s output:
   * provider message id, else the transport's delivery id, else null, namespaced by provider.
   *
   * ⚠️ THE KEY, NOT THE RAW DELIVERY ID, AND THAT IS THE POINT. The route computes it once
   * and hands it over, so the database's partial unique index protects EXACTLY the value
   * `isDuplicateWebhookEvent` compared. Recomputing it here from parts would create two
   * places that decide what "the same reply" means, which is the drift this build keeps
   * removing rather than adding.
   *
   * null when no provider event exists at all — an operator's typed reply, demo seeding.
   * That is the deliberate fail-open case; see 20260829_reply_idempotency.sql.
   */
  eventKey?: string | null
}

export type ReplyResult =
  | { ok: true; clients: number; replyId?: string }
  | { ok: false; dropped: string }

/**
 * Process one inbound reply. Never throws for an ordinary bad-input case — every refusal is a
 * returned `dropped` reason plus an alert, because a reply that vanishes behind a silent 200
 * is the defect this whole spine was built to end.
 */
export async function processInboundReply(
  inbound: InboundReply,
  ctxIn: ReplyContext,
): Promise<ReplyResult> {
  const ctx = { bodyFetchAttempted: false, bodyFetchFailure: null as string | null, ...ctxIn }

  // R2 / R3 — an unusable reply is a FINDING, not a silent 200. The message is still in
  // the provider's inbox; the only thing that was ever missing is that anyone knew.
  const unusable = isUnusable(inbound)
  if (unusable) {
    if (unusable === 'no_sender') {
      await alertDroppedReply('the sender address could not be read', inbound)
    } else {
      // P2-2 — the alert now carries WHY the body is missing: the HTTP status, the thrown
      // error, or "we never asked because the key is unset". Each reads differently and
      // needs a different response.
      const { why, detail } = describeBodyFetch({ messageId: inbound.providerMessageId, attempted: ctx.bodyFetchAttempted, failure: ctx.bodyFetchFailure })
      await alertDroppedReply(why, inbound, detail)
    }
    return { ok: false as const, dropped: unusable }
  }

  // R1 — EVERY match, across ALL clients. This was `.maybeSingle()`, which ERRORS on more
  // than one row: two clients prospecting the same person meant `lead` came back null and
  // the reply was dropped forever behind a 200. The reply is now routed into each matching
  // client's thread, because picking one would hand one client's reply to another.
  let matches: { id: string; client_id: string }[]
  try {
    matches = await findLeadMatches(inbound.fromEmail)
  } catch (e) {
    await alertDroppedReply('the lead lookup failed', inbound, e instanceof Error ? e.message : String(e))
    return { ok: false as const, dropped: 'lookup_failed' as const }
  }
  if (matches.length === 0) return { ok: true as const, clients: 0, replyId: undefined }

  // #551 — ROUTE BY THE RECEIVING MAILBOX, falling back to the fan-out when it is unknown.
  //
  // With one shared inbox this changes nothing: `resolveInboxOwner` returns null and every
  // match is kept, exactly as R1 intended. Once a client sends from their own mailbox, the
  // reply arrives THERE and only that client's thread receives it — because fanning out at
  // that point would drop one client's inbound mail into another client's unibox.
  const inboxOwner = await resolveInboxOwner(inbound.toEmail)
  const routed = routeReply(matches, inboxOwner)
  if (routed.how === 'inbox' && routed.excluded.length > 0) {
    console.log(`[figsy/replies/inbound] routed by inbox ${inbound.toEmail} → client ${inboxOwner}; ${routed.excluded.length} match(es) at other clients deliberately excluded`)
  }
  if (routed.matches.length === 0) {
    // A real person replied to a real client mailbox and is not one of their leads. NOT
    // dropped silently, and NOT handed to whichever other client happens to hold the lead —
    // that is the exact harm this routing exists to prevent.
    const { data: ownerRow } = await db.from('clients').select('company_name').eq('id', inboxOwner!).maybeSingle()
    void sendFounderAlert('sends_stalled', 'A reply arrived at a client mailbox with no matching lead',
      unmatchedAtKnownInboxLines({
        toEmail: inbound.toEmail ?? 'unknown',
        fromEmail: inbound.fromEmail,
        companyName: (ownerRow as { company_name?: string } | null)?.company_name ?? null,
        excludedCount: routed.excluded.length,
      })).catch(() => {})
    return { ok: false as const, dropped: 'no_lead_at_this_inbox' as const }
  }
  matches = routed.matches

  // CLASSIFY ONCE, BEFORE THE LOOP.
  //
  // `classifyReply` is an LLM call that takes ONLY the body — nothing about the client
  // enters it. R1's per-client loop put it inside, so a reply matching two clients was
  // classified TWICE. Two costs, and worse: the model is not deterministic, so the same
  // email could come back `hot` for one client and `warm` for the other. One would get the
  // founder alert and the CRM deal; the other would not. For the same email.
  //
  // Found by reading the handler end to end after the founder pointed out that grepping
  // off the last action never shows what is missing (P10).
  const { classification, reasoning } = await classifyReply(inbound.body)

  let lastReplyId: string | undefined
  for (const lead of matches) {
  // R6 — includes 'replied'. A hot reply sets the enrollment to `replied`, so the SECOND
  // reply from that prospect matched nothing and skipped every hot path — no alert, no CRM
  // deal, no counter. The most valuable reply in the funnel is usually the second one.
  const { data: enrollment } = await db.from('figsy_enrollments')
    .select('id, campaign_id')
    .eq('lead_id', lead.id)
    .in('status', [...REPLY_LOOKUP_STATUSES])
    .order('enrolled_at', { ascending: false })
    .limit(1).maybeSingle()

  // Store reply
  const { data: reply } = await db.from('figsy_replies').insert({
    enrollment_id:               enrollment?.id ?? null,
    campaign_id:                 enrollment?.campaign_id ?? null,
    lead_id:                     lead.id,
    client_id:                   lead.client_id,
    from_email:                  inbound.fromEmail,
    from_name:                   inbound.fromName,
    subject:                     inbound.subject,
    body:                        inbound.body,
    body_text:                   inbound.body,
    classification,
    classification_reasoning:    reasoning,
    raw_payload:                 ctx.rawPayload,
    // ── IDEMPOTENCY BACKSTOP (BUILD-003 item 7) ───────────────────────────────────────
    // The same key the application already reasons about: provider message id, else the
    // transport's delivery id, else NULL — namespaced by provider so two vendors' counters
    // cannot collide. A partial unique index on this column makes a redelivered webhook lose
    // at COMMIT, which is the only place it can be caught: application dedupe protects the
    // insert sites its author remembered, and there are three of them.
    // ⚠️ NULL stays deliberately fail-open — see 20260829_reply_idempotency.sql.
    provider_event_key:          ctx.eventKey ?? null,
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
    payload:       { classification, reasoning, subject: inbound.subject, body: inbound.body, from_email: inbound.fromEmail },
  })

  // E7 — RISKY REPLY → ESCALATE. The classifier tags intent (hot/cold/opt_out/…) but not
  // LEGAL/reputational risk. A reply threatening legal action, a data-protection complaint,
  // or an abuse report needs a human NOW — never an automated follow-up. Detect on keywords,
  // escalate to the founder, and log an outcome event so it surfaces in the record (#517).
  // Best-effort + fire-and-forget: never blocks or fails the inbound webhook.
  if (isRiskyReply(inbound.body)) {
    void logOutcomeEvent({
      client_id: lead.client_id, campaign_id: enrollment?.campaign_id ?? null, lead_id: lead.id,
      enrollment_id: enrollment?.id ?? null, event_type: 'risk_escalation', channel: 'email',
      payload: { from_email: inbound.fromEmail, subject: inbound.subject, snippet: (inbound.body ?? '').replace(/\s+/g, ' ').trim().slice(0, 300) },
    })
    void (async () => {
      const { data: c } = await db.from('clients').select('company_name').eq('id', lead.client_id).maybeSingle()
      await sendFounderAlert('support_escalation', `⚠️ Risky reply — ${c?.company_name ?? 'a client'} (needs a human)`, [
        `Client: ${c?.company_name ?? lead.client_id}`,
        `From: ${inbound.fromEmail}`,
        `Subject: ${inbound.subject ?? '(none)'}`,
        `Reply: ${(inbound.body ?? '').replace(/\s+/g, ' ').trim().slice(0, 300)}`,
        `This reply tripped the legal/complaint risk filter — review and respond by hand; do not let it auto-follow-up.`,
      ])
    })().catch(() => {})
  }

  // Handle opt-out — pause enrollment and add to blocklist. #312: the classifier
  // can tag a reply 'unsubscribe' as well as 'opt_out' ("please unsubscribe me" →
  // 'unsubscribe'); previously only 'opt_out' was suppressed, so an 'unsubscribe'
  // reply kept receiving steps 2/3 (POPIA violation). Treat both identically.
  if (classification === 'opt_out' || classification === 'unsubscribe') {
    // R7 — all three writes were UNCHECKED. The blocklist is the single suppression source
    // the send path consults, so a silent failure there means we keep emailing someone who
    // told us to stop. `suppressOptOut` checks each write and alerts with the address, so
    // it can be added by hand — an alert that names the person is actionable.
    await suppressOptOut(inbound.fromEmail, enrollment ? [enrollment.id] : [])

    // ONE WALLET: a terminal opt-out moves no money — the $4 was final at approve.
    if (enrollment?.campaign_id) await recomputeCampaignCounters(enrollment.campaign_id)
  }

  // Handle hot — pause sequence, bump stats, push deal to CRM
  if (classification === 'hot' && enrollment) {
    // #349 — unchecked, and the consequence is the one a prospect actually feels. This is
    // what stops the sequence: if it fails silently the enrollment stays active and the next
    // send cron mails somebody who has ALREADY REPLIED — the single most damaging thing cold
    // outreach can do, to a person who has just engaged with our client.
    const { error: repliedErr } = await db.from('figsy_enrollments')
      .update({ status: 'replied' }).eq('id', enrollment.id)
    if (repliedErr) {
      console.error('[reply-pipeline] REPLY NOT RECORDED — this prospect will be emailed again', enrollment.id, repliedErr.message)
      void sendFounderAlert('sends_stalled', 'A prospect who replied is still in sequence', [
        `Enrollment ${enrollment.id}: the reply was received but marking it 'replied' failed (${repliedErr.message}).`,
        'The sequence is still active, so the next send cron will email someone who has already replied to our client.',
        'Fix: set that figsy_enrollments row to status=replied now.',
      ])
    }

    // Web push — alert the client instantly on a hot reply (no-op if VAPID unset)
    sendPushToClient(lead.client_id, {
      title: '🔥 Hot reply',
      body: `${inbound.fromEmail} replied positively to your outreach.`,
      url: '/dashboard/figsy',
      tag: 'hot-reply',
    }).catch(() => {})

    // PR-C — the FOUNDER also needs to know. The client push above is a no-op without
    // VAPID + a subscribed device, and at n=1 clients a hot reply is the whole game.
    // Best-effort, fire-and-forget — never blocks or fails the inbound webhook.
    void (async () => {
      const { data: c } = await db.from('clients').select('company_name').eq('id', lead.client_id).maybeSingle()
      const snippet = (inbound.body ?? '').replace(/\s+/g, ' ').trim().slice(0, 200)
      await sendFounderAlert('hot_reply', `🔥 Hot reply — ${c?.company_name ?? 'a client'}`, [
        `Client: ${c?.company_name ?? lead.client_id}`,
        `From: ${inbound.fromEmail}`,
        `Subject: ${inbound.subject ?? '(none)'}`,
        snippet ? `Reply: ${snippet}` : '',
      ])
    })().catch(() => {})

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
        reply_snippet: inbound.body.slice(0, 300),
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
      lead_email:    inbound.fromEmail,
      lead_name:     leadFull ? `${leadFull.first_name} ${leadFull.last_name}`.trim() : '',
      company:       leadFull?.company ?? '',
      client_id:     lead.client_id,
      reply_snippet: inbound.body.slice(0, 300),
    }).catch(console.error)

    // Emit cross-agent signal: hot reply received
    void emitSignal(lead.client_id, 'figsy', 'reply_received', {
      lead_id:   lead.id,
      sentiment: 'hot',
      from:      inbound.fromEmail,
    })

    // ── #352 (AR-14) — THE AUTO-TOP-UP CARD CHARGE USED TO LIVE HERE. IT IS GONE.
    //    Founder-confirmed 27 Jul: "I confirm: yes, remove."
    //
    // A hot reply landing here would charge the client's card through
    // `api.paystack.co/transaction/charge_authorization`. Four faults at once:
    //
    //   ① IT CHARGED IN ZAR AT A RATE WE INVENTED. `Math.round(amountUsd * 19 * 100)` —
    //     a hardcoded USD→ZAR rate of 19 inside a live card charge, so a $20 bundle
    //     billed R380 regardless of what the rate actually was.
    //   ② CHECK-THEN-ACT — the AR-14 headline. The "cooldown" COUNTED recent top-up rows
    //     and then charged. Two hot replies arriving together both counted zero and both
    //     charged: a real double card charge (the one 20260702_webhook_idempotency
    //     describes; svix idempotency only ever stopped IDENTICAL event replays).
    //   ③ IT COULD NEVER SUCCEED ANYWAY. The gate required `auto_topup_paystack_auth`,
    //     and Paystack was pulled from the billing UI in #325, so no client could obtain
    //     one. The code admitted it: "Landmine: unreachable until a Paystack auth exists."
    //   ④ NOTHING RECEIVED THE RESULT. `index.ts` mounted raw-body parsing for
    //     `/webhooks/paystack` and no route was ever registered behind it.
    //
    // Removing it settles AR-14 outright rather than hardening it: there is no charge
    // left to race. And it takes a payment out of a webhook ANY PROSPECT CAN TRIGGER by
    // replying to an email — which is the property worth keeping long after the Paystack
    // detail is forgotten.
    //
    // DELIBERATELY NOT REMOVED: the client's stored `auto_topup_*` preferences, the
    // columns behind them, and every historical Paystack reference in
    // `credit_transactions`. The founder authorised removing the CHARGE PATH, not billing
    // history or a client's saved settings (NOTHING GETS DELETED, founder-locked 26 Jul).
    // Milla's billing page already tells clients the truth — auto top-up reads
    // "coming soon", display-only, since #325.
    //
    // To bring auto top-up back it has to be rebuilt on Stripe: an off-session
    // PaymentIntent against a saved payment method, in USD, with the charge claimed
    // atomically BEFORE it is made rather than counted after.
  }

  lastReplyId = reply?.id
  }  // ← end of the per-client loop (R1)

  return { ok: true as const, clients: matches.length, replyId: lastReplyId }
}
