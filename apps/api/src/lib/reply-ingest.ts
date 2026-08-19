// REPLY INGESTION — the shared spine every inbound reply flows through.
//
// Resend delivers replies today. Instantly (our own outreach) and Smartlead (the clients')
// will deliver them by API next, per the three-tier architecture locked 26 Jul (#577). So the
// matching and opt-out logic lives HERE, provider-agnostic, rather than inside the Resend
// webhook — otherwise each of the three providers grows its own copy of the same five bugs,
// and they diverge silently the way the demo seed diverged from the product path (#587).
//
// A provider adapter's only job is to produce an `InboundReply`. Everything downstream —
// who it belongs to, whether it is an opt-out, whether the writes actually landed — is the
// same code for all three.
//
// THE FIVE DEFECTS THIS EXISTS TO FIX (found by reading the chain end to end):
//
//   R1  A reply matching leads at TWO clients was DROPPED FOREVER. `maybeSingle()` errors on
//       more than one row, so `lead` came back null and the handler returned a silent 200.
//       Two clients prospecting the same person is normal, not exotic.
//   R2  An empty body was discarded with a silent 200 — a real reply, gone, no trace.
//   R3  If the Resend body fetch failed, the same silent 200 swallowed it.
//   R6  A SECOND reply from someone who had already replied got no hot handling at all: the
//       enrollment lookup filtered to ['enrolled','in_progress'], and a hot reply sets status
//       to 'replied'. So "yes, let's talk" after "not right now" was invisible.
//   R7  The three opt-out writes were unchecked. A failed blocklist write means we KEEP
//       EMAILING SOMEONE WHO SAID STOP — the one failure in this file with a legal edge.
//
// The judgement is pure and unit-tested; the writes are checked and alert on failure.

import { db } from '@kind/db'
import { sendFounderAlert } from './alerts'
import { normalizeRevealEmail } from './billing-rules'

/** What every provider adapter must produce. Nothing below cares which one it was. */
export type InboundReply = {
  fromEmail: string
  fromName: string | null
  subject: string | null
  body: string
  /** The provider's own id, so a dropped reply can be found again in their dashboard. */
  providerMessageId: string | null
  provider: ReplyProvider
  /**
   * #551 — THE MAILBOX THAT RECEIVED IT. The address the prospect replied TO.
   *
   * Today every reply lands at one shared Resend inbox, so this carries no information and
   * routing falls back to matching on the prospect's address alone. The moment a client sends
   * from their OWN mailbox, replies arrive THERE — and this becomes the only unambiguous
   * answer to *whose reply is this*.
   *
   * Null when the provider does not tell us, which must behave exactly as today rather than
   * dropping anything.
   */
  toEmail: string | null
}

export type ReplyProvider = 'resend' | 'instantly' | 'smartlead' | 'manual'

/**
 * Enrollment states a reply may attach to.
 *
 * **R6.** This used to be `['enrolled', 'in_progress']` only — but a hot reply sets the
 * enrollment to `replied`, so the SECOND reply from that prospect matched nothing, arrived
 * with `enrollment = null`, and skipped every hot path: no client push, no founder alert, no
 * CRM deal, no campaign counter. The most valuable reply in the funnel is usually the second
 * one — *"actually, yes, let's talk"* — and it was the one guaranteed to be missed.
 */
export const REPLY_LOOKUP_STATUSES = ['enrolled', 'in_progress', 'replied'] as const

/** Statuses that mean the sequence is still actively sending. */
export const REPLY_ACTIVE_STATUSES = ['enrolled', 'in_progress'] as const

/** Pull a bare address out of `Name <a@b.com>`, `<a@b.com>` or `a@b.com`. */
export function parseFromAddress(raw: string): { email: string; name: string | null } {
  const s = String(raw ?? '')
  const m = s.match(/<([^>]+)>/) || s.match(/^([^\s]+@[^\s]+)/)
  const email = (m?.[1] ?? s).toLowerCase().trim()
  const name = s.includes('<') ? (s.split('<')[0].trim().replace(/^["']|["']$/g, '') || null) : null
  return { email, name }
}

/**
 * Is this reply unusable as delivered — and therefore something a HUMAN must see?
 *
 * **R2 + R3.** Both used to end in `res.status(200).json({ received: true })` with nothing
 * logged anywhere a person looks. A prospect replied, we said "received", and it vanished.
 * The reply still exists in the provider's inbox; nobody knew to go and get it.
 */
export function isUnusable(r: Pick<InboundReply, 'fromEmail' | 'body'>): false | 'no_sender' | 'no_body' {
  if (!r.fromEmail) return 'no_sender'
  if (!r.body || !r.body.trim()) return 'no_body'
  return false
}

export type LeadMatch = { id: string; client_id: string }

/**
 * Every lead this address matches — across ALL clients.
 *
 * **R1, and it is the worst of the five.** The old code was
 * `.eq('email', fromEmail).maybeSingle()`. PostgREST returns an error, not a row, when more
 * than one matches — so `lead` was null, the handler returned a silent 200, and the reply was
 * **gone forever**. Two clients prospecting the same person is ordinary; the pool is shared.
 *
 * Returns an array on purpose. The caller routes the reply into EACH matching client's
 * thread, because the alternative — picking one — silently gives one client's reply to
 * another, which is worse than dropping it.
 */
export async function findLeadMatches(email: string): Promise<LeadMatch[]> {
  const { data, error } = await db.from('leads')
    .select('id, client_id').eq('email', email).limit(50)
  if (error) throw error
  return (data ?? []) as LeadMatch[]
}

export type OptOutResult = { ok: boolean; failures: string[] }

/**
 * Suppress an address that asked to stop — and PROVE each write landed.
 *
 * **R7.** All three writes were unchecked. The blocklist is the single suppression source the
 * send path consults, so a silent failure there means **we keep emailing someone who told us
 * to stop** — the one failure in this chain with a legal edge, and the one most likely to
 * arrive as a complaint rather than a bug report.
 *
 * The blocklist goes FIRST and its failure is fatal to the result: the enrollment pause and
 * the lead status are bookkeeping, but the blocklist is what actually stops mail. If it
 * fails, the founder is alerted with the address so it can be added by hand — an alert that
 * names the person is actionable; "an opt-out write failed" is not.
 */
export async function suppressOptOut(
  email: string,
  enrollmentIds: string[],
  reason = 'replied_opt_out',
): Promise<OptOutResult> {
  const failures: string[] = []

  // HC-1 — NORMALISE BEFORE WRITING. This is the reply-STOP path: the address arrives as the
  // sending server wrote it in the From header, and mail servers preserve the case the sender
  // typed. Someone who replied "STOP" from `John@Acme.com` used to get a raw row that no
  // send-path probe matched — the single worst instance of this defect, because replying STOP
  // is the clearest opt-out a person can give us.
  const blockKey = normalizeRevealEmail(email)
  const { error: blockErr } = await db.from('opt_out_blocklist')
    .upsert({ email: blockKey, reason }, { onConflict: 'email', ignoreDuplicates: false })
  if (blockErr) failures.push(`blocklist: ${blockErr.message}`)

  if (enrollmentIds.length > 0) {
    const { error: enrolErr } = await db.from('figsy_enrollments')
      .update({ status: 'opted_out' }).in('id', enrollmentIds)
    if (enrolErr) failures.push(`enrollments: ${enrolErr.message}`)
  }

  const { error: leadErr } = await db.from('leads')
    .update({ status: 'opted_out', opted_out_at: new Date().toISOString() })
    .eq('email', email)
  if (leadErr) failures.push(`leads: ${leadErr.message}`)

  if (failures.length > 0) {
    await sendFounderAlert('support_escalation',
      `🛑 OPT-OUT NOT FULLY APPLIED — ${email}`, [
        `${email} asked to stop, and ${failures.length} of the suppression write(s) FAILED.`,
        blockErr
          ? `THE BLOCKLIST WRITE FAILED. This address is NOT suppressed — the send path will keep mailing them. Add ${email} to opt_out_blocklist by hand NOW.`
          : `The blocklist write succeeded, so no further mail will go out. The rest is bookkeeping.`,
        '',
        ...failures.map(f => `• ${f}`),
      ]).catch(() => {})
  }

  return { ok: failures.length === 0, failures }
}

/**
 * Why is this reply's body missing — and say it accurately.
 *
 * **P2-2.** The alert used to say *"the body arrived empty… the follow-up fetch returned
 * nothing"* for FOUR different situations, three of which it was describing wrongly:
 *
 *   • the fetch returned **HTTP 500** — the status sat in `console.error` and nowhere a
 *     person looks
 *   • the fetch **threw** (network, DNS, timeout) — same
 *   • **`RESEND_API_KEY` was not set**, so the fetch *never ran at all* — and the alert still
 *     claimed it had returned nothing
 *   • the fetch genuinely succeeded and the body genuinely was empty — the only case the
 *     old wording actually fitted
 *
 * Telling the founder "the prospect sent an empty email" when the truth is "Resend returned
 * 500" points them at the wrong thing entirely: one is a prospect quirk to ignore, the other
 * is our pipeline down and every reply being lost.
 *
 * Pure, so each of the four readings is assertable.
 */
export function describeBodyFetch(a: {
  /** The provider's message id, if we have one. */
  messageId: string | null
  /** Whether the fetch was even attempted (false when the key is missing). */
  attempted: boolean
  /** The real failure, verbatim, if it failed. */
  failure: string | null
}): { why: string; detail: string } {
  if (a.failure && !a.attempted) {
    return {
      why: 'the reply body could NOT be fetched — we never asked',
      detail: `${a.failure} The prospect's reply is intact in Resend; we simply could not retrieve it. Every reply will be affected until this is fixed.`,
    }
  }
  if (a.failure) {
    return {
      why: 'the reply body could NOT be fetched from Resend',
      detail: `${a.failure} This is OUR pipeline failing, not an empty email from the prospect — the message is intact in Resend. If this repeats, every reply is being lost.`,
    }
  }
  return {
    why: 'the body arrived empty',
    detail: `Resend delivered the metadata and the follow-up body fetch${a.messageId ? ` for ${a.messageId}` : ''} succeeded but returned nothing. This one may genuinely be an empty message.`,
  }
}

/**
 * A reply we could not process — tell the founder, never a silent 200.
 *
 * **R2 / R3 / R1's error path.** The reply is still sitting in the provider's inbox; the only
 * thing missing is that anyone knows. The provider id is included so it can be found.
 */
export async function alertDroppedReply(
  why: string,
  r: Partial<InboundReply>,
  detail?: string,
): Promise<void> {
  await sendFounderAlert('support_escalation',
    `📭 A reply could not be processed — ${why}`, [
      `A prospect replied and the system could NOT handle it. The message is still in the ${r.provider ?? 'provider'} inbox — nothing is lost, but nobody would have known.`,
      '',
      `Reason:   ${why}`,
      `From:     ${r.fromEmail || '(no sender could be parsed)'}`,
      `Subject:  ${r.subject ?? '(none)'}`,
      `Provider: ${r.provider ?? 'unknown'}${r.providerMessageId ? ` · id ${r.providerMessageId}` : ''}`,
      detail ? `\nDetail:   ${detail}` : '',
      '',
      'Open it in the provider and reply by hand.',
    ]).catch(() => {})
}

// ── #551 — REPLIES LAND BACK AGAINST THE RIGHT INBOX ────────────────────────────────────
//
// THE DEFECT, and it does not bite until the first client sends from their own mailbox.
//
// `findLeadMatches` matches on the PROSPECT'S address across every client, and the handler
// fans the reply out to all of them. That is CORRECT today: every reply arrives at one shared
// Resend inbox, so the prospect's address is genuinely the only information we have, and two
// clients working the same person both deserve to see it (R1).
//
// The moment a client sends from their own mailbox, the reply arrives AT THAT MAILBOX — and
// the fan-out becomes actively wrong. Client A's prospect replies to Client A's mailbox, and
// we would also drop that reply into Client B's thread because B happens to have sourced the
// same person. That is one client reading another client's inbound mail.
//
// The receiving mailbox answers it exactly. `client_inboxes.email` maps address → client, so
// the chain is **inbox → client → lead → thread**, and the prospect's address stops being the
// routing key and becomes only the lead lookup.
//
// FALLS BACK TO TODAY'S BEHAVIOUR when the inbox is unknown — a shared inbox, a provider that
// does not report `to`, a mailbox not yet recorded. Unknown must never mean dropped.

export type ReplyRouting = {
  /** The matches this reply should actually be written to. */
  matches: LeadMatch[]
  /** How it was decided — for the log, and for the alert when nothing matched. */
  how: 'inbox' | 'fanout'
  /** Matches deliberately EXCLUDED because they belong to another client. */
  excluded: LeadMatch[]
}

/**
 * Decide which matches a reply belongs to.
 *
 * `ownerClientId` is the client who owns the receiving mailbox, or null when we cannot tell.
 *
 * **Null falls through to the fan-out** — today's behaviour, unchanged, because with one
 * shared inbox that IS the right answer and a stricter rule would start dropping replies the
 * day it shipped.
 *
 * When the owner IS known, only that client's matches are kept. An empty result is a real
 * outcome, not an error: somebody replied to a client's mailbox who is not in that client's
 * leads. The caller must report it rather than fall back to the fan-out, because falling back
 * is precisely the harm — handing one client's inbound mail to another.
 */
export function routeReply(matches: LeadMatch[], ownerClientId: string | null): ReplyRouting {
  if (!ownerClientId) return { matches, how: 'fanout', excluded: [] }
  const mine = matches.filter(m => m.client_id === ownerClientId)
  const excluded = matches.filter(m => m.client_id !== ownerClientId)
  return { matches: mine, how: 'inbox', excluded }
}

/**
 * Which client owns the mailbox this reply arrived at?
 *
 * Returns null when the address is unknown — a shared inbox, or one not yet recorded — which
 * routes by fan-out exactly as today.
 *
 * Deliberately does NOT filter by inbox status. A released or retired mailbox still receives
 * mail for weeks afterwards, and a reply to a mailbox we have stopped sending from still
 * belongs to the client it was bought for. Filtering to active would silently orphan the tail
 * of every switched-over client — the pooled→branded handover is designed to overlap.
 */
export async function resolveInboxOwner(toEmail: string | null | undefined): Promise<string | null> {
  const addr = (toEmail ?? '').toLowerCase().trim()
  if (!addr) return null
  const { data, error } = await db.from('client_inboxes')
    .select('client_id').ilike('email', addr).limit(1).maybeSingle()
  if (error) {
    // Fail OPEN to the fan-out. A lookup outage must never drop a reply — it must only cost
    // us the precision of the routing.
    console.error('[reply-ingest] inbox owner lookup failed (routing by fan-out):', error.message)
    return null
  }
  return (data as { client_id?: string } | null)?.client_id ?? null
}

/**
 * The idempotency key for one inbound reply.
 *
 * **#551's second clause: idempotent on the PROVIDER MESSAGE ID.** Today the guard keys on
 * `svix-id`, which is a RESEND DELIVERY id — Instantly and Smartlead have no such thing, so
 * the moment a second provider delivers replies the guard would key on an empty string,
 * `isDuplicateWebhookEvent` would fail open on every event, and a retried hot reply would
 * re-run the whole path: a second CRM deal, a second alert, a second counter bump.
 *
 * The provider message id is namespaced by provider, because two providers can legitimately
 * issue the same id and one must never suppress the other's reply.
 */
export function replyEventKey(reply: Pick<InboundReply, 'provider' | 'providerMessageId'>, deliveryId?: string | null): string | null {
  const pid = (reply.providerMessageId ?? '').trim()
  if (pid) return `${reply.provider}:${pid}`
  const d = (deliveryId ?? '').trim()
  // No provider id — fall back to the transport's delivery id (Resend's svix-id today).
  // Returning null rather than an empty string keeps `isDuplicateWebhookEvent` failing OPEN,
  // which is right: unable to dedup must mean process, never drop.
  return d ? `${reply.provider}:delivery:${d}` : null
}

/** The alert body for a reply that reached a KNOWN client mailbox but matched no lead. */
export function unmatchedAtKnownInboxLines(a: {
  toEmail: string
  fromEmail: string
  companyName: string | null
  excludedCount: number
}): string[] {
  return [
    `A reply arrived at ${a.companyName ?? 'a client'}'s mailbox (${a.toEmail}) from ${a.fromEmail}, and that address is not one of their leads.`,
    a.excludedCount > 0
      ? `${a.excludedCount} other client(s) DO have this person as a lead — deliberately NOT routed there, because a reply to this client's mailbox is this client's mail.`
      : 'No client has this person as a lead at all.',
    'It has not been dropped: this alert is the record. Most likely a forwarded thread, a colleague replying, or someone they emailed outside the product.',
  ]
}
