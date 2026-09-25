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
// ⚑ 19 Sep (J22-C1) — the smallest primitive that writes the operator row itself, awaited.
// See the note at the classifier-failure branch for why the alert is not what waits.
import { raiseOperatorTask } from './operator-tasks'
import { classifyReply, isRiskyReply, recomputeCampaignCounters } from './figsy'
import { pushDealToCrm } from './crm'
import { logOutcomeEvent } from './outcomes'
import { syncFigsyInterestedToHubspot } from './hubspot'
import { sendPushToClient } from './push'
import { emitSignal } from '../routes/signals'
import {
  isUnusable, findLeadMatches, suppressOptOut, alertDroppedReply, describeBodyFetch,
  REPLY_LOOKUP_STATUSES, resolveInboxOwner, routeReply, unmatchedAtKnownInboxLines,
  // ⚑ 16 Sep (GAP 3) — the originating-send evidence, and the operator exception for a reply
  // no evidence can attribute.
  sentLeadIdsFor, ambiguousReplyLines,
  type InboundReply,
} from './reply-ingest'
// ⚑ 17 Sep — the durable home for a reply we refuse to attribute. See `unattributed-reply.ts`.
import { retainUnattributedReply } from './unattributed-reply'

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
  /**
   * ⚑ 17 Sep — THE OWNER A HUMAN SUPPLIED, for a reply this pipeline previously REFUSED to
   * attribute.
   *
   * 🛑 IT IS NOT A WAY BACK TO THE FAN-OUT, and the mechanism is the reason. It is read at
   * exactly one place — in place of `resolveInboxOwner`'s answer — so the reply then travels
   * the EXISTING `how: 'inbox'` branch of `routeReply`, which filters the matches to that one
   * client and reports the rest as excluded. One client or none; there is no code path from
   * here to two.
   *
   * ⚠️ THE CALLER HAS ALREADY PROVED THE CLIENT WAS A STORED CANDIDATE. This field carries a
   * decision, never permission to make one: the operator route refuses an id outside
   * `candidate_client_ids` before it ever reaches here.
   *
   * ⚠️ AND IT SUPPRESSES RE-RETENTION. The exception already exists — that is where this
   * value came from — so an ambiguous outcome on this path must not mint a second one.
   */
  resolvedOwnerClientId?: string | null
}

export type ReplyResult =
  | { ok: true; clients: number; replyId?: string }
  | { ok: false; dropped: string }

/**
 * The refusals a webhook must NOT be answered 200 for.
 *
 * 🛑 ONE LIST, BECAUSE THERE ARE TWO ROUTES. Resend and Smartlead each serialise their own
 * response, and the 17 Sep exception was written into both by hand. A second one written into
 * only one of them is a reply that is refused correctly from one provider and lost from the
 * other — so the rule lives beside the function that produces the codes.
 *
 * Every other refusal is safe to 200: the reply is written, already known, or genuinely
 * unusable, and the provider has nothing useful to redeliver. These two are not. In both the
 * provider still holds the only remaining copy of something we could not finish, so the dedup
 * claim is handed back and the delivery is refused — which is how a webhook asks to be sent
 * again.
 *
 *   · `ambiguous_owner_unretained` (17 Sep) — we could neither attribute the reply nor retain it.
 *   · `unclassified_untasked` (19 Sep · J22-C1) — the reply is stored unclassified and the
 *     operator task that makes it somebody's job could not be written. A 200 there promises a
 *     human will see it, and nothing would ever tell one.
 */
export const RETRYABLE_DROPS: ReadonlySet<string> = new Set([
  'ambiguous_owner_unretained',
  'unclassified_untasked',
])

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

  // ── ⚑ 25 Sep (R166 ⑥ · P4) — A DELIVERY-FAILURE NOTICE IS A BOUNCE, NEVER A REPLY ───────
  // SMTP sends bounce back to the sending mailbox, which forwards to us like a reply. The dead
  // address is blocklisted as a hard bounce (what the send path and the 3% bounce hold read),
  // and the notice is dropped rather than filed in anyone's Inbox as a "reply".
  {
    const { isBounceNotice, recordBounceNotice } = await import('./bounce-notice')
    if (isBounceNotice(inbound)) {
      const outcome = await recordBounceNotice({ fromEmail: inbound.fromEmail, toEmail: inbound.toEmail ?? null, subject: inbound.subject ?? null, body: inbound.body })
      return { ok: false as const, dropped: `bounce_notice_${outcome}` }
    }
  }

  // R1 — EVERY match, across ALL clients. This was `.maybeSingle()`, which ERRORS on more
  // than one row: two clients prospecting the same person meant `lead` came back null and
  // the reply was dropped forever behind a 200. The reply is now routed into each matching
  // client's thread, because picking one would hand one client's reply to another.
  let matches: { id: string; client_id: string }[]
  try {
    matches = await findLeadMatches(inbound.fromEmail)
  } catch (e) {
    // ── 🛑 ⚑ 18 Sep (J22-C3 · R131) — A FAILED LOOKUP NO LONGER COSTS THE REPLY ──────────
    //
    // ⛓️ WHAT STOOD HERE: ~~an alert and `dropped: 'lookup_failed'`~~ — and the route answers
    // that code with a **200**. So a transient database error while asking *"whose lead is
    // this?"* consumed the delivery: the provider is told we kept it, the dedup claim stays,
    // and the prospect's answer exists nowhere. The reply was never unattributable — we simply
    // failed to ask the question, which is the most recoverable failure of the lot.
    //
    // ⚠️ RETAINED WITH NO CANDIDATES, WHICH IS THE HONEST SHAPE. The ambiguous path retains a
    // reply whose candidates are known and contested; this one retains a reply whose candidates
    // are UNKNOWN. Writing a guessed candidate list would invent the very evidence an operator
    // is about to use.
    //
    // ⚠️ AND IF THE RETENTION ALSO FAILS, THE WEBHOOK IS REFUSED — the same
    // `ambiguous_owner_unretained` path the sibling case uses, because a 200 is a promise we
    // can only keep once the row exists.
    const why = e instanceof Error ? e.message : String(e)
    const retained = await retainUnattributedReply({
      provider: inbound.provider,
      providerEventKey: ctx.eventKey ?? null,
      fromEmail: inbound.fromEmail,
      fromName: inbound.fromName,
      toEmail: inbound.toEmail ?? null,
      subject: inbound.subject,
      body: inbound.body,
      rawPayload: ctx.rawPayload,
      candidateClientIds: [],
      candidateLeadIds: [],
    })
    await alertDroppedReply('the lead lookup failed', inbound, retained.ok
      ? `${why} — the reply is RETAINED IN FULL as unattributed_replies ${retained.id} and is waiting in Vida. Nothing was lost.`
      : `${why} — and it could ALSO not be retained (${retained.detail}), so the webhook was refused and the provider will redeliver it.`)
    if (!retained.ok) return { ok: false as const, dropped: 'ambiguous_owner_unretained' as const }
    return { ok: false as const, dropped: 'lookup_failed' as const }
  }
  if (matches.length === 0) return { ok: true as const, clients: 0, replyId: undefined }

  // #551 — ROUTE BY THE RECEIVING MAILBOX, falling back to the fan-out when it is unknown.
  //
  // With one shared inbox this changes nothing: `resolveInboxOwner` returns null and every
  // match is kept, exactly as R1 intended. Once a client sends from their own mailbox, the
  // reply arrives THERE and only that client's thread receives it — because fanning out at
  // that point would drop one client's inbound mail into another client's unibox.
  //
  // ⚑ 17 Sep — AND A HUMAN'S DECISION OUTRANKS THE LOOKUP. `resolvedOwnerClientId` is set only
  // by the operator resolve route, for a reply this pipeline already refused once; it enters
  // here so the attribution travels the SAME `inbox` branch as a known mailbox rather than
  // through a second reply implementation. The mailbox lookup is skipped, not overridden —
  // asking again would be a wasted read whose answer is already known to be absent.
  const inboxOwner = ctx.resolvedOwnerClientId ?? await resolveInboxOwner(inbound.toEmail)

  // ── 🛑 ⚑ 16 Sep (GAP 3) — THE EVIDENCE, GATHERED ONLY WHEN IT COULD POSSIBLY MATTER ────
  //
  // 🛑 WHAT THIS REPLACES. `routeReply(matches, null)` used to return EVERY match across EVERY
  // client, and the loop below wrote a reply row for each — one external reply becoming two
  // clients' inbound mail. That was the right answer while one shared inbox was the only
  // inbound path; C1 gives clients their own mailboxes, and any provider that does not report
  // `to` still arrives here.
  //
  // ⚠️ THE READ IS CONDITIONAL, so the single-client happy path costs exactly what it did
  // before: no extra query, no extra latency. Only a genuine cross-client collision pays.
  const candidateClients = new Set(matches.map(m => m.client_id))
  const sentLeadIds = (!inboxOwner && candidateClients.size > 1)
    ? await sentLeadIdsFor(matches.map(m => m.id))
    : undefined

  const routed = routeReply(matches, inboxOwner, sentLeadIds)
  if (routed.how === 'inbox' && routed.excluded.length > 0) {
    console.log(`[figsy/replies/inbound] routed by inbox ${inbound.toEmail} → client ${inboxOwner}; ${routed.excluded.length} match(es) at other clients deliberately excluded`)
  }
  if (routed.how === 'originating_send') {
    console.log(`[figsy/replies/inbound] ${candidateClients.size} clients hold ${inbound.fromEmail}; resolved to the one we actually emailed (${routed.matches[0]?.client_id}) from figsy_sent_emails; ${routed.excluded.length} excluded`)
  }

  // ── 🛑 AMBIGUOUS: WRITTEN TO NOBODY, RETAINED IN FULL, AND A PERSON IS TOLD ────────────
  //
  // ⛓️ 17 Sep — THE RETENTION IS NEW, AND IT IS WHAT MAKES THE REFUSAL SAFE RATHER THAN
  // MERELY CORRECT.
  //
  // 🛑 WHAT THIS BRANCH USED TO DO: log, email an alert, return. The inbound content existed
  // only in this function's arguments — Resend's webhook is metadata-only, so the body had
  // been fetched into a local variable — and the dedup claim was already taken, so the
  // provider would never send it again. The reply was GONE. The fan-out was fixed by losing
  // the mail instead, which is a different failure and not a smaller one.
  //
  // ⚠️ NOTHING IS REPORTED UNTIL THE EVIDENCE IS DURABLE. On a retention failure this returns
  // a DIFFERENT code, and the route releases the dedup claim and answers 500 so the provider
  // redelivers. A 200 here is a promise we can only keep once the row exists.
  if (routed.how === 'ambiguous') {
    console.error(`[figsy/replies/inbound] AMBIGUOUS reply from ${inbound.fromEmail} — matches span ${candidateClients.size} clients and no evidence names one. NOT written to any of them.`)

    // ⚠️ SKIPPED ON THE HUMAN-RESOLVED PATH. If an operator-supplied owner somehow reached an
    // ambiguous verdict, the exception it came from already exists; minting a second retention
    // row would split one reply's history across two records.
    let retainedId: string | null = null
    if (!ctx.resolvedOwnerClientId) {
      const retained = await retainUnattributedReply({
        provider: inbound.provider,
        providerEventKey: ctx.eventKey ?? null,
        fromEmail: inbound.fromEmail,
        fromName: inbound.fromName,
        toEmail: inbound.toEmail ?? null,
        subject: inbound.subject,
        body: inbound.body,
        rawPayload: ctx.rawPayload,
        // The candidates AS THEY WERE at ingest — both halves, because the resolve path needs
        // the leads as well as the clients to write the reply against the right rows.
        candidateClientIds: [...candidateClients],
        candidateLeadIds: matches.map(m => m.id),
      })
      if (!retained.ok) {
        console.error(`[figsy/replies/inbound] ⛔ AMBIGUOUS REPLY COULD NOT BE RETAINED — refusing the webhook so it is redelivered: ${retained.detail}`)
        void sendFounderAlert('sends_stalled', 'An unattributable reply could not be retained — the webhook was REFUSED',
          [
            `A reply from ${inbound.fromEmail} matched leads under ${candidateClients.size} clients and could not be attributed.`,
            `It could ALSO not be stored: ${retained.detail}`,
            'Nothing was written to any client, and the webhook was answered with a 500 so the provider redelivers it.',
            'If 20260917_unattributed_replies has not been run, run it from Vida → Engine — until then every ambiguous reply is refused rather than retained.',
          ]).catch(() => {})
        return { ok: false as const, dropped: 'ambiguous_owner_unretained' as const }
      }
      retainedId = retained.id
      console.log(`[figsy/replies/inbound] retained as unattributed_replies ${retainedId}${retained.already ? ' (already retained by an earlier delivery)' : ''} — awaiting an operator decision in Vida.`)
    }

    // ⚠️ THE SAME KIND THE SIBLING CASE USES. `sends_stalled` is what the unmatched-at-a-known-
    // inbox alert below already carries, and widening `AlertKind` for one more reply-routing
    // exception would add a channel nobody configured for a family that already has one.
    //
    // ⚠️ AND THIS ALERT IS NOW SECONDARY. `founder_alerts` has no reader anywhere in the
    // product, which is precisely why it cannot be the recovery mechanism; the authority is
    // the retained row, which Vida's existing operator feed reads. The alert is kept because
    // it costs nothing and it is the only channel that reaches a phone.
    void sendFounderAlert('sends_stalled', 'A reply matched more than one client and could not be attributed',
      [
        ...ambiguousReplyLines({
          fromEmail: inbound.fromEmail,
          toEmail: inbound.toEmail ?? null,
          clientIds: [...candidateClients],
        }),
        ...(retainedId
          ? [`It is RETAINED IN FULL as unattributed_replies ${retainedId} and is waiting for you in Vida — attribute it to one client, or discard it. Nothing was lost.`]
          : []),
      ]).catch(() => {})
    return { ok: false as const, dropped: 'ambiguous_owner' as const }
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
  // ── 🛑 ⚑ 18 Sep (J22-C1 · R132) — THE REPLY SURVIVES A CLASSIFIER THAT DOES NOT ────────
  //
  // ⛓️ WHAT STOOD HERE: ~~`const { classification, reasoning } = await classifyReply(body)`~~,
  // unguarded. `classifyReply` handles a bad PARSE (it falls back to `other`) and nothing at
  // all handles the CALL: a 429, a 5xx, a timeout or a missing key throws straight out of this
  // function.
  //
  // 🛑 AND THAT THROW LOST THE REPLY, PERMANENTLY. The webhook's dedup claim is taken BEFORE
  // processing — that is what stops a Svix retry re-running a hot reply — so the 500 this
  // throw produces is answered by a redelivery that `isDuplicateWebhookEvent` then skips. The
  // provider believes it delivered, we believe we have seen it, and the prospect's answer
  // exists nowhere. A model being busy is not a reason to lose a customer's reply.
  //
  // ⚠️ UNCLASSIFIED IS `null`, NOT `other`. `other` is a real classification — a bounce, spam,
  // something unclear — and a human reading "other" is told we looked and decided. `null` says
  // we did not manage to look, which is the truth, and the UI already renders it as "New
  // reply" rather than inventing a verdict.
  //
  // ⚠️ THE FAILURE IS NEVER DEDUPED. Every unclassified reply is a different person waiting on
  // an answer, so each one needs its own line on somebody's list — the same reasoning that
  // makes `hot_reply` and `support_escalation` never-deduped classes.
  let classification: Awaited<ReturnType<typeof classifyReply>>['classification'] | null = null
  let reasoning = ''
  let classifierFailure: string | null = null
  try {
    const verdict = await classifyReply(inbound.body)
    classification = verdict.classification
    reasoning = verdict.reasoning
  } catch (err) {
    classifierFailure = err instanceof Error ? err.message : String(err)
    console.error(`[figsy/replies/inbound] the classifier failed (${classifierFailure}) — the reply is stored UNCLASSIFIED and a human is asked to read it. Nothing was lost.`)
  }

  // ── 🛑 ⚑ 16 Sep (GAP 3) — THE LAST LINE OF DEFENCE, AND IT IS DELIBERATELY REDUNDANT ──
  //
  // `routeReply` already guarantees one client or none. This asserts it again at the only
  // place the guarantee actually matters: the write. A future change to the routing, or a new
  // caller assembling its own match list, would otherwise reintroduce the exact defect
  // silently — and the cost of being wrong here is one client reading another's inbound mail.
  // ONE CLIENT, OR WE DO NOT WRITE.
  {
    const writing = new Set(matches.map(m => m.client_id))
    if (writing.size > 1) {
      console.error(`[figsy/replies/inbound] REFUSED: the write set spans ${writing.size} clients (${[...writing].join(', ')}). Routing should have made this impossible; nothing was written.`)
      void sendFounderAlert('sends_stalled', 'A reply write was refused for spanning two clients',
        ambiguousReplyLines({
          fromEmail: inbound.fromEmail,
          toEmail: inbound.toEmail ?? null,
          clientIds: [...writing],
        })).catch(() => {})
      // ⛓️ 17 Sep — `ambiguous_owner_unretained`, NOT `ambiguous_owner`, and the difference is
      // deliberate. This branch is unreachable by construction, so reaching it means a
      // assumption has broken — and the one outcome that must NOT follow is a 200 telling the
      // provider we kept a reply that was neither written nor retained. The refusal code sends
      // the route down the release-and-500 path, so the provider redelivers and nothing is lost
      // while the impossible is being investigated.
      return { ok: false as const, dropped: 'ambiguous_owner_unretained' as const }
    }
  }

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

  // ── ⚑ 18 Sep (J22-C1 · R132) — AN UNCLASSIFIED REPLY IS SOMEBODY'S JOB, NOW ────────────
  //
  // 🛑 RAISED AFTER THE WRITE, DELIBERATELY. The task names the stored row, so the person who
  // picks it up opens the reply rather than being told that one exists somewhere. The reply is
  // already durable by this line — which is the whole point of the item.
  //
  // ── 🛑 ⚑ 19 Sep (J22-C1 · R132) — AND THE TASK IS DURABLE BEFORE THE PROVIDER IS ANSWERED ──
  //
  // ⛓️ WHAT STOOD HERE: ~~`void sendFounderAlert('support_escalation', …).catch(() => {})`~~ —
  // fire-and-forget, so the route answered the provider 200 while the operator row was still in
  // flight.
  //
  // 🛑 IT WAS NOT A THEORY, AND IT WAS NOT THE HARNESS. Fable's independent certification run of
  // this same tree failed F-INBOUND — *"THE CLASSIFIER FAILED, THE REPLY WAS KEPT (1 row(s)) AND
  // NOBODY WAS TOLD"* — where the builder's run had seen the task. One SHA, two runs, two
  // answers: the guarantee was a race that a read happening to land after the insert hid.
  //
  // 🛑 AND THE PROCESS DYING IN THAT WINDOW IS THE REAL COST. The webhook's dedup claim is taken
  // BEFORE processing, so a provider that was already told 200 never redelivers: K.I.N.D. would
  // hold an unclassified reply that nobody is ever told about, which is the precise outcome R132
  // exists to forbid. A wait or a retry in the test would have hidden it rather than fixed it.
  //
  // ⚠️ THE TASK IS AWAITED, THE EMAIL IS NOT, AND THAT ORDER IS THE WHOLE POINT.
  // `raiseOperatorTask` is the smallest primitive that writes the row this item requires.
  // `sendFounderAlert` does its Resend and Slack work FIRST and the task LAST, so awaiting it
  // would hang a stranger's reply-acknowledgement on our own email vendor being up. The mirror
  // still goes out — under the SAME dedupe key, so it collapses into the row raised here instead
  // of filing a second one.
  //
  // ⚠️ KEYED ON THE STORED ROW, so two unclassified replies are still two jobs — R132's
  // "every unclassified reply is a different person waiting" is intact — while a REDELIVERY of
  // the same one is not a second job.
  if (classifierFailure) {
    const replyId = (reply as { id?: string } | null)?.id ?? null
    const subjectId = replyId ?? inbound.fromEmail
    const taskKey = `reply-unclassified:${replyId ?? ctx.eventKey ?? inbound.fromEmail}`
    const taskTitle = 'A reply could not be classified — it is stored and needs a human read'
    const taskLines = [
      `Client: ${lead.client_id}`,
      `From: ${inbound.fromEmail}`,
      `Subject: ${inbound.subject ?? '(none)'}`,
      replyId
        ? `Stored as figsy_replies ${replyId}, with no classification — open it in the inbox and answer it by hand.`
        : 'The reply was processed but its stored id could not be read back — find it by the sender address in the inbox.',
      `The classifier itself failed: ${classifierFailure}. Nothing was lost and nothing was guessed.`,
    ]

    const task = await raiseOperatorTask({
      kind: 'support_escalation',
      severity: 'warn',
      title: taskTitle,
      detail: taskLines.join('\n'),
      clientId: lead.client_id,
      subjectKind: 'reply',
      subjectId,
      dedupeKey: taskKey,
      evidence: { classifier_failure: classifierFailure, reply_id: replyId, event_key: ctx.eventKey ?? null },
    })

    // 🛑 NO TASK, NO 2xx — the one honest answer left. The reply row STAYS (it is durable and
    // losing it is the worse failure), and the delivery is refused so the provider sends it
    // again. The redelivery's own insert loses to the idempotency index, and the task it raises
    // carries the same key, so a retry produces one reply and one task rather than two of either.
    if (!task.ok) {
      console.error('[figsy/replies/inbound] the reply is stored but its operator task could NOT be raised'
        + ` (${task.error ?? 'no reason given'}) — refusing this delivery so the provider redelivers it.`
        + ' A reply nobody is told about is the one outcome a 200 must never cover.')
      return { ok: false as const, dropped: 'unclassified_untasked' as const }
    }

    void sendFounderAlert('support_escalation', taskTitle, taskLines,
      { clientId: lead.client_id, subjectKind: 'reply', subjectId, dedupeKey: taskKey },
    ).catch(() => {})
  }

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
