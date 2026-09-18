// ══════════════════════════════════════════════════════════════════════════════════════════
// J11-C1 · A PAYMENT WE CANNOT ATTRIBUTE IS AN EXCEPTION, NOT A 200 (LR 21)
//
// ── WHAT THE WEBHOOK DID WITH MONEY IT COULD NOT PLACE ──────────────────────────────────
//
// `checkout.session.completed` is handled by a chain of branches, each keyed on our own
// metadata: a programme stage WITH a `programmeId`, a subscription WITH a client and product,
// a wallet top-up WITH an amount, a credit purchase WITH credits. Every one of them ends in a
// `200`. An event that matched NONE of them fell out of the chain, reached the handler's final
// `res.sendStatus(200)`, and Stripe recorded the delivery as successful.
//
// 🛑 SO A PROGRAMME PAYMENT WHOSE `programmeId` WAS MISSING WAS ACCEPTED AND FORGOTTEN. The
// client's money is in Stripe, no `programme_payments` row exists, no exception was raised, no
// operator was told, and the event is permanently consumed — Stripe will not send it again
// once it has a 2xx. The only trace is a line in a log nobody reads. This is the stripped
// test-mode event in the contract's RED, and it is also what a truncated metadata write, a
// checkout created by an older deploy, or a session created outside our own code all look like.
//
// ── WHAT IS TRUE INSTEAD ────────────────────────────────────────────────────────────────
//
// ① IT BECOMES A RECORD. `sendFounderAlert` writes the `operator_tasks` row (XC-5) of which
//    the email is a mirror, so the exception lands in Vida Needs-you where the person who has
//    to reconcile it looks — not in an inbox where a miss leaves nothing behind.
//
// ② THE RETRY IS IDEMPOTENT, AND THE DATABASE IS WHAT MAKES IT SO. The task is keyed on the
//    STRIPE EVENT ID, so every redelivery of that same event hits
//    `operator_tasks_one_open_per_key` and is read as "already reported". Twelve retries over
//    three days produce one row, not twelve.
//
// ③ THE EVENT IS NOT BURNED. The route answers non-2xx, so the delivery stays visible in
//    Stripe as unhandled rather than being marked done. ⚠️ THIS IS A DELIBERATE TRADE: the
//    metadata will not improve on retry, so the retries will exhaust — what they buy is that
//    the failure is visible on BOTH sides, in Stripe's own dashboard and on the operator's
//    list, instead of only in a log line.
//
// ── ⚠️ AND NOT ONE METADATA VALUE IS COPIED INTO THE RECORD ─────────────────────────────
//
// An event we cannot attribute is, by definition, one we did not necessarily create. Its
// metadata can hold anything — an email address, a customer's name, somebody's reference. The
// task is read in a console and pasted into resolution notes, so only the KEY NAMES travel,
// plus the ids and the amount. `operator_tasks` redacts secret SHAPES on the way in; that is a
// guard against credentials, not a licence to hand it arbitrary strings.
// ══════════════════════════════════════════════════════════════════════════════════════════

/** Only what the webhook can see about a completed checkout. No client, no database. */
export interface CheckoutFacts {
  /** Stripe's own event id (`evt_…`) — the stable handle every retry of this delivery shares. */
  eventId?: string | null
  sessionId?: string | null
  metadata?: Record<string, unknown> | null
  /** In the smallest currency unit, as Stripe sends it. */
  amountTotal?: number | null
  currency?: string | null
  paymentStatus?: string | null
}

export type UnattributableReason =
  /** Our own programme checkout, with the one field that says WHICH programme missing. */
  | 'programme_stage_without_programme'
  /** No metadata at all — a stripped test-mode event, or a session we did not create. */
  | 'no_metadata'
  /** Metadata that names no product this system sells, or names one without its fields. */
  | 'unrecognised_metadata'

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

/**
 * Why this completed checkout could not be placed — or `null` when it CAN be.
 *
 * 🛑 THE `null` ANSWERS MIRROR THE ROUTE'S BRANCHES EXACTLY, and that is the point of putting
 * them in one function: a branch added to the webhook without a matching case here would file
 * an exception about money the webhook had just handled correctly, and an operator who learns
 * that Needs-you cries wolf stops reading it. The guard for this file asserts both directions.
 */
export function unattributableReason(f: CheckoutFacts): UnattributableReason | null {
  const meta = f.metadata ?? {}
  const type = str(meta.type)

  if (type === 'programme_first' || type === 'programme_second') {
    return str(meta.programmeId) ? null : 'programme_stage_without_programme'
  }
  if (type === 'subscription') {
    return str(meta.clientId) && str(meta.product) ? null : 'unrecognised_metadata'
  }
  if (type === 'wallet_topup') {
    return str(meta.clientId) && str(meta.amountUsd) ? null : 'unrecognised_metadata'
  }
  if (str(meta.credits) && str(meta.creditType) && str(meta.clientId)) return null

  return Object.keys(meta).length === 0 ? 'no_metadata' : 'unrecognised_metadata'
}

/** Founder-plain, one sentence each. What happened, what it means, what to do. */
export const UNATTRIBUTABLE_COPY: Record<UnattributableReason, string> = {
  programme_stage_without_programme:
    'A programme payment arrived without the programme it belongs to, so nothing could be recorded against any programme.',
  no_metadata:
    'A completed Stripe checkout arrived carrying no metadata at all, so there is nothing in it that says who paid or what for.',
  unrecognised_metadata:
    'A completed Stripe checkout arrived whose metadata names no product this system sells, or names one without the fields it needs.',
}

/**
 * The dedupe handle. The STRIPE EVENT ID first, because that is what a retry repeats.
 *
 * ⚠️ THE SESSION IS THE FALLBACK, NOT THE FIRST CHOICE. One checkout session can produce more
 * than one event; keying on it would file the first and swallow the rest. An event with
 * neither id is keyed on its own absence, which dedupes all of them into one row — correct,
 * because without an id we cannot tell two such deliveries apart and must not pretend to.
 */
export function unattributableKey(f: CheckoutFacts): string {
  return str(f.eventId) || str(f.sessionId) || 'stripe_event_without_id'
}

/**
 * The lines the operator reads.
 *
 * ⚠️ KEY NAMES, NEVER VALUES. See the header: we did not necessarily create this event, so its
 * metadata is untrusted content, not our own fields.
 */
export function unattributableLines(f: CheckoutFacts, reason: UnattributableReason): string[] {
  const meta = f.metadata ?? {}
  const keys = Object.keys(meta).sort()
  const amount = typeof f.amountTotal === 'number' && Number.isFinite(f.amountTotal)
    ? `${(f.amountTotal / 100).toFixed(2)} ${str(f.currency).toUpperCase() || 'unknown currency'}`
    : 'an amount Stripe did not state in this event'
  return [
    UNATTRIBUTABLE_COPY[reason],
    `Stripe event ${str(f.eventId) || '(no event id)'} · checkout session ${str(f.sessionId) || '(no session id)'}.`,
    `Amount on the event: ${amount}. Payment status: ${str(f.paymentStatus) || 'not stated'}.`,
    keys.length > 0
      ? `The metadata carried these fields and nothing was read from them: ${keys.join(', ')}.`
      : 'The event carried no metadata fields at all.',
    'NOTHING WAS WRITTEN — no programme payment, no wallet credit, no credits, no work started.',
    'K.I.N.D answered Stripe with a failure rather than accepting the event, so this delivery stays visible in Stripe as unhandled. Reconcile it in the Stripe dashboard, then resolve this task.',
  ]
}
