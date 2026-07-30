// SMARTLEAD INBOUND — the reply feeder for the CLIENTS' sending provider (#551, #577).
//
// The third and last provider adapter. Its ONLY job is to turn a Smartlead webhook body into
// an `InboundReply`; everything after that — matching, routing by receiving mailbox, opt-out
// suppression, the hot path — is `lib/reply-pipeline.ts`, shared with Resend. That split is
// #589's whole point: five reply defects fixed once, not once per provider.
//
// ⚠️⚠️ THE PAYLOAD SHAPE BELOW IS **UNVERIFIED**. ⚠️⚠️
//
// It could not be checked against reality: `SMARTLEAD_API_KEY` returns **401** (the board
// carries this on #550) and Smartlead's own docs **403** us. So the field names here are
// inferred from their campaign/lead API and from what every ESP webhook carries, not read off
// a real delivery.
//
// **CHECK IT IN SMARTLEAD'S UI AFTER THE FIRST PUSH** — the same instruction #550 already
// carries for the sequence step shape. That is why the shape lives in ONE function with a
// tolerant field-alias list: when a real payload arrives, this is the single place to correct,
// and `routeReply`/`processInboundReply` behaviour is tested against this parser's OUTPUT so
// none of it has to be revisited.
//
// FAIL-SAFE BY DESIGN, in both directions:
//   • a payload we cannot read returns null and the route answers 200 with a reason — it never
//     throws, because a webhook that 500s gets retried forever and helps nobody
//   • a reply we CAN read but cannot attribute is never dropped: the pipeline alerts and the
//     founder is the record (`unmatchedAtKnownInboxLines`)

import type { InboundReply } from './reply-ingest'
import { parseFromAddress } from './reply-ingest'

/**
 * Field aliases, widest first.
 *
 * Every ESP names these differently and Smartlead's shape is unconfirmed, so each value is
 * looked up across the plausible names rather than one guessed key. Reading a reply from the
 * wrong field name costs us the reply; reading it from a list costs nothing.
 */
const FIELDS = {
  from:    ['from_email', 'from', 'sender_email', 'lead_email', 'email'],
  to:      ['to_email', 'to', 'recipient_email', 'sent_from', 'from_email_account', 'email_account'],
  subject: ['subject', 'email_subject'],
  body:    ['reply_body', 'body_text', 'text', 'email_body', 'body', 'message', 'html'],
  id:      ['message_id', 'stats_id', 'email_message_id', 'id', 'reply_id'],
} as const

/** Pull the first present, non-empty string across a list of candidate keys. */
function pick(o: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
    // Some providers wrap the mailbox as { email: "..." } rather than a bare string.
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const inner = (v as Record<string, unknown>).email
      if (typeof inner === 'string' && inner.trim()) return inner.trim()
    }
    if (Array.isArray(v) && typeof v[0] === 'string' && v[0].trim()) return v[0].trim()
  }
  return null
}

/** Strip HTML when the only body we were given is markup. */
function textFrom(raw: string): string {
  return /<[a-z][\s\S]*>/i.test(raw) ? raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : raw
}

/**
 * Turn a Smartlead webhook body into an `InboundReply`, or null if it is not a readable reply.
 *
 * Accepts both a flat body and one nested under `data` / `event_data` / `reply`, because which
 * of those Smartlead uses is exactly what is unverified.
 */
export function parseSmartleadInbound(raw: unknown): InboundReply | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const top = raw as Record<string, unknown>

  // Unwrap one level if the reply sits under a nested envelope.
  let o: Record<string, unknown> = top
  for (const wrapper of ['data', 'event_data', 'reply', 'payload']) {
    const w = top[wrapper]
    if (w && typeof w === 'object' && !Array.isArray(w)) {
      const cand = w as Record<string, unknown>
      // Only unwrap when the nested object actually carries a sender — otherwise a `data`
      // envelope holding campaign metadata would hide the real fields at the top level.
      if (pick(cand, FIELDS.from)) { o = { ...top, ...cand }; break }
    }
  }

  const rawFrom = pick(o, FIELDS.from)
  if (!rawFrom) return null

  // `parseFromAddress` is the spine's own parser — shared so "Name <a@b>" is read identically
  // for every provider. A second copy here is how the three feeders start disagreeing.
  const { email: fromEmail, name: fromName } = parseFromAddress(rawFrom)
  if (!fromEmail || !fromEmail.includes('@')) return null

  const rawTo = pick(o, FIELDS.to)
  const rawBody = pick(o, FIELDS.body) ?? ''

  return {
    fromEmail,
    fromName,
    subject: pick(o, FIELDS.subject),
    body: textFrom(rawBody),
    providerMessageId: pick(o, FIELDS.id),
    provider: 'smartlead',
    // THE FIELD #551 IS ABOUT. This is the client's own mailbox, which is the only unambiguous
    // answer to "whose reply is this" — two clients can legitimately be emailing the same
    // person. Null when Smartlead does not tell us, which routes by fan-out exactly as today
    // rather than dropping anything.
    toEmail: rawTo ? parseFromAddress(rawTo).email.toLowerCase() : null,
  }
}

/**
 * Is this Smartlead event a REPLY at all?
 *
 * Their webhooks cover opens, clicks, bounces and sends too. Processing a `SENT` event as a
 * reply would insert a fake inbound message against a real lead and could classify our OWN
 * copy as a hot reply — so anything not recognisably a reply is skipped, loudly, rather than
 * guessed at.
 */
export function isSmartleadReplyEvent(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false
  const o = raw as Record<string, unknown>
  const kind = String(o.event_type ?? o.event ?? o.type ?? o.webhook_type ?? '').toUpperCase()
  if (!kind) {
    // No event type at all: treat it as a reply only if it carries a body AND a sender. A
    // metadata-only ping must not become a blank reply row.
    const parsed = parseSmartleadInbound(raw)
    return !!parsed && parsed.body.length > 0
  }
  return kind.includes('REPLY') || kind.includes('EMAIL_REPLY')
}
