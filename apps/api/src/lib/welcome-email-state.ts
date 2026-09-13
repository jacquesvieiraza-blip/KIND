// ═══════════════════════════════════════════════════════════════════════════════════════
// ONE AUTOMATIC WELCOME EMAIL PER CLIENT — the pure decisions. (S1-AUDIT-006 · R120.)
//
// ── THE DEFECT ─────────────────────────────────────────────────────────────────────────
//
// `routes/auth.ts` calls `sendWelcomeEmail(...)` OUTSIDE the `if (!existing)` block that
// guards the founder alert immediately below it, so a second `POST /auth/onboard` for the
// same user takes the UPDATE branch and THE WELCOME EMAIL SENDS AGAIN. Nothing anywhere
// recorded that it had already been sent.
//
// ── WHY THIS FILE IS PURE ──────────────────────────────────────────────────────────────
//
// Every rule below is a decision about provider semantics and a 24-hour window, and each one
// has a wrong answer that sends a duplicate or loses an email for ever. Pure functions can be
// driven through all of it without a database, a client or a network — so the states that
// only happen once in production are the states the tests visit most.
//
// 🛑 THE ONE INVARIANT EVERYTHING ELSE SERVES: NO PROVIDER MESSAGE ID MEANS NO `sent`.
// A 409, a 500, a timeout and a socket drop are not evidence of delivery.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { createHash } from 'crypto'

/**
 * Resend retains an idempotency key for 24 HOURS (provider-documented; verified
 * independently before this build). Inside the window a same-key/same-payload retry returns
 * the original email id and sends nothing further. Outside it the key is gone and a retry
 * would be UNPROTECTED — which is why expiry fails closed rather than resending.
 */
export const WELCOME_IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60 * 1000

/**
 * The six states, and none of them is collapsible into another:
 *   sent               — the provider returned an email id (new or cached). Terminal.
 *   in_progress        — `concurrent_idempotent_requests`: another same-key request is in
 *                        flight RIGHT NOW. NOT a send: no id came back. Retry later, in window.
 *   payload_conflict   — `invalid_idempotent_request`: the same key was used with a DIFFERENT
 *                        payload. The key is spent and we cannot prove delivery. Fail closed.
 *   ambiguous          — a 500, a timeout or a throw. It may or may not have sent. Retry in window.
 *   refused            — the provider definitively refused; nothing was sent, claim released.
 *   unresolved_expired — still unresolved past the 24-hour window. NO automatic resend, the
 *                        claim is NOT released, a human decides.
 */
export type WelcomeOutcome =
  | 'sent' | 'in_progress' | 'payload_conflict' | 'ambiguous' | 'refused' | 'unresolved_expired'

/** The states an operator must be shown. `refused` is absent: the claim was released and the
 *  next legitimate onboarding attempt will simply send. */
export const WELCOME_UNRESOLVED_OUTCOMES = [
  'in_progress', 'payload_conflict', 'ambiguous', 'unresolved_expired',
] as const

/** The stable key. Tied to the DURABLE client identity, never to the email address — an
 *  address can legitimately re-onboard under a new client, and two clients must never share
 *  a key. */
export function welcomeIdempotencyKey(clientId: string): string {
  return `welcome:${clientId}`
}

/** Exactly the fields that reach the provider. Anything not here cannot change the payload. */
export interface WelcomePayload {
  from:    string
  to:      string
  subject: string
  html:    string
  text:    string
}

/**
 * The payload's identity, frozen at the first attempt.
 *
 * ⚠️ THIS IS WHAT MAKES A RETRY DECIDABLE LOCALLY. Resend rejects the same key with a
 * different payload, so a retry after a template edit, an env change or a second onboarding
 * with a different company name would 409. Hashing the rendered payload lets us refuse BEFORE
 * the provider call instead of inferring it from an error code afterwards.
 *
 * ⚠️ THE SEPARATOR IS NUL (U+0000), WRITTEN AS AN ESCAPE. It cannot appear in any of the
 * five fields, so no field's content can forge a boundary and make two different payloads
 * hash the same — "ab" + "c" and "a" + "bc" are distinct.
 *
 * ⚠️ AND IT IS WRITTEN `'\u0000'` RATHER THAN AS A LITERAL BYTE. A raw control character
 * makes git treat the whole file as BINARY, which makes the diff unreviewable — and an
 * unreviewable diff is not a reviewable change.
 */
export function welcomePayloadHash(p: WelcomePayload): string {
  return createHash('sha256')
    .update([p.from, p.to, p.subject, p.html, p.text].join('\u0000'))
    .digest('hex')
}

/** The durable row, as the decisions below see it. */
export interface WelcomeEmailState {
  claimedAt:   string | null
  sentAt:      string | null
  outcome:     WelcomeOutcome | null
  messageId:   string | null
  payloadHash: string | null
}

export type WelcomeDecision =
  /** No claim yet: take the CAS, and only the winner may call the provider. */
  | { action: 'claim_and_send' }
  /** A claim is held, unresolved, in window, and the payload is PROVEN identical. */
  | { action: 'retry_same_key' }
  /** Nothing to do, and nothing is written. */
  | { action: 'skip'; reason: 'already_sent' | 'payload_conflict' | 'expired' }
  /** The payload drifted: record the conflict, call nothing, surface it. */
  | { action: 'mark_payload_conflict' }
  /** Past the provider window with no resolution: record it, call nothing, keep the claim. */
  | { action: 'mark_expired' }

/**
 * 🛑 THE WHOLE FIRST-ATTEMPT / RETRY DECISION, IN ONE PLACE.
 *
 * ⚠️ A CLAIMED ROW IS NOT A PERMANENT "DO NOTHING" — that was the founder's correction, and
 * it is the difference between at-most-once and the rule. A first attempt that died before
 * recording anything leaves a claim with NO outcome, and that client would otherwise never
 * receive a welcome email at all. It is treated exactly like `ambiguous`: it may or may not
 * have reached the provider, so it is retried with the SAME key inside the window.
 *
 * ⚠️ AND AN UNPROVABLE PAYLOAD IS A CONFLICT, NOT A RETRY. A claim with no stored hash (a row
 * from before this build, or a hash write that was lost) cannot be shown to be identical, so
 * it fails closed rather than gambling the key.
 */
export function decideWelcomeAttempt(
  s: WelcomeEmailState, freshHash: string, nowMs: number,
): WelcomeDecision {
  if (!s.claimedAt) return { action: 'claim_and_send' }

  // Terminal: a provider id exists. The constraint `clients_welcome_email_sent_needs_id`
  // means `sent` can never be recorded without one, so this really is a send.
  if (s.sentAt || s.outcome === 'sent') return { action: 'skip', reason: 'already_sent' }

  // Already surfaced for a human; neither state may be acted on automatically.
  if (s.outcome === 'payload_conflict') return { action: 'skip', reason: 'payload_conflict' }
  if (s.outcome === 'unresolved_expired') return { action: 'skip', reason: 'expired' }

  // 🛑 THE WINDOW IS ASKED BEFORE THE PAYLOAD. Past 24 hours the key is gone, so whether the
  // payload still matches is irrelevant — there is no protection left to rely on.
  const heldMs = nowMs - new Date(s.claimedAt).getTime()
  if (heldMs > WELCOME_IDEMPOTENCY_WINDOW_MS) return { action: 'mark_expired' }

  if (!s.payloadHash || s.payloadHash !== freshHash) return { action: 'mark_payload_conflict' }

  // `in_progress`, `ambiguous`, or a claim with no recorded outcome at all.
  return { action: 'retry_same_key' }
}

/**
 * Provider error names that mean THE REQUEST WAS REFUSED AND NOTHING WAS SENT.
 *
 * ⚠️ THE LIST IS A CLOSED ALLOWLIST, NOT A DENYLIST, AND THAT DIRECTION IS THE SAFETY. An
 * unrecognised error is `ambiguous` — we keep the claim and retry — because releasing on an
 * error we do not understand is how a duplicate gets sent.
 *
 * ⚠️ `application_error` AND `internal_server_error` ARE DELIBERATELY ABSENT: a 500 may have
 * sent. `invalid_idempotency_key` IS present — a malformed key is our own bug and the request
 * never reached the send path.
 */
export const WELCOME_DEFINITIVE_REFUSALS = [
  'validation_error', 'invalid_from_address', 'missing_required_field', 'invalid_parameter',
  'invalid_access', 'invalid_region', 'not_found', 'method_not_allowed',
  'missing_api_key', 'invalid_api_Key', 'rate_limit_exceeded',
  'monthly_quota_exceeded', 'daily_quota_exceeded', 'invalid_attachment', 'security_error',
  'invalid_idempotency_key',
] as const

export interface WelcomeSendResult {
  ok: boolean
  id: string | null
  /** The provider's `error.name`, when the failure came from the provider at all. */
  errorName: string | null
}

export interface WelcomeRecord {
  outcome: WelcomeOutcome
  /** False ONLY for a definitive refusal: the claim is released so a later attempt can send. */
  keepClaim: boolean
  /** True only alongside `sent` — and the DB CHECK enforces the same thing. */
  storeSend: boolean
}

/**
 * 🛑 THE PROVIDER OUTCOME MAP. Corrected after the founder caught the first version treating
 * BOTH 409s as `sent`:
 *
 *   · `concurrent_idempotent_requests` means another same-key request is in flight RIGHT NOW.
 *     No id came back, so asserting a send would be a phantom send (#338) — it is
 *     `in_progress`, the claim is kept, and it is safe to retry later inside the window.
 *   · `invalid_idempotent_request` means the same key was used with a DIFFERENT payload. The
 *     key is spent, but that does NOT prove the earlier request was delivered — the earlier
 *     attempt may itself have been a 500. So it is `payload_conflict`: no retry, no `sent`,
 *     and a human looks.
 */
export function recordForSendResult(r: WelcomeSendResult): WelcomeRecord {
  if (r.ok && r.id) return { outcome: 'sent', keepClaim: true, storeSend: true }

  const name = r.errorName
  if (name === 'concurrent_idempotent_requests') {
    return { outcome: 'in_progress', keepClaim: true, storeSend: false }
  }
  if (name === 'invalid_idempotent_request') {
    return { outcome: 'payload_conflict', keepClaim: true, storeSend: false }
  }
  if (name && (WELCOME_DEFINITIVE_REFUSALS as readonly string[]).includes(name)) {
    return { outcome: 'refused', keepClaim: false, storeSend: false }
  }
  // A 500, a timeout, a throw, a missing message id, or an error name we do not recognise.
  return { outcome: 'ambiguous', keepClaim: true, storeSend: false }
}

/** What the operator surface tells a person to do about one unresolved row. */
export function welcomeOperatorAction(
  outcome: string | null, claimedAt: string | null, nowMs: number,
): string {
  const heldMs = claimedAt ? nowMs - new Date(claimedAt).getTime() : 0
  const expired = !!claimedAt && heldMs > WELCOME_IDEMPOTENCY_WINDOW_MS
  switch (outcome) {
    case 'unresolved_expired':
      return 'The 24-hour provider protection has expired and we cannot prove whether this email was delivered. Nothing will be sent automatically. Check the Resend log for this client, then send it by hand if it never arrived.'
    case 'payload_conflict':
      return 'The welcome email was re-rendered differently from the first attempt, so the idempotency key can no longer protect a retry. Nothing will be sent automatically. Check the Resend log, then send it by hand if it never arrived.'
    case 'in_progress':
      return expired
        ? 'The provider reported another attempt in flight and the 24-hour window has now passed. Nothing will be sent automatically — check the Resend log for this client.'
        : 'The provider reported another attempt for the same key in flight. No action needed yet: the next onboarding retry will resolve it safely inside the 24-hour window.'
    case 'ambiguous':
      return expired
        ? 'The outcome was never resolved and the 24-hour window has now passed. Nothing will be sent automatically — check the Resend log for this client.'
        : 'The provider outcome is unknown (a timeout or a 500). No action needed yet: a retry inside the 24-hour window uses the same idempotency key and cannot duplicate.'
    default:
      return 'No action required.'
  }
}
