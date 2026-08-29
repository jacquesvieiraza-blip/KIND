// ═══════════════════════════════════════════════════════════════════════════════════════
// THE SEND GATE — the last question asked before a real person is contacted.
//
// FOUNDER RULING, 29 Aug — SUPPRESSION EFFECT IS GLOBAL:
//
//   "If an email address is legitimately suppressed / opted out anywhere in K.I.N.D, every
//    K.I.N.D send path must treat that address as blocked. A later client cannot cause
//    K.I.N.D to contact the same person again."
//
// ⚠️ A PRODUCT RULE. It makes no claim of legal sufficiency and asserts no PECR compliance
// on its own — PECR is a separate verdict, applied separately (`pecrVerdict`).
//
// TWO LISTS, NOT ONE, AND THEY ANSWER DIFFERENT QUESTIONS:
//
//   isSuppressed()      the DO-NOT-CONTACT floor — the founder's employer and its sister
//                       brands, hard-coded so it cannot be switched off by a missing env var.
//                       Nobody there is ever contacted, whether or not they ever heard from us.
//
//   opt_out_blocklist   a PERSON who told us to stop. Global in effect: their reply, their
//                       unsubscribe, their STOP. It outlives the client who first mailed them.
//
// WHY ONE FUNCTION. Before this, each send path asked its own subset of the question and two
// asked neither — `instantly-push.ts` and `lib/whatsapp.ts` could both reach a real person
// with no suppression check at all. A rule enforced by convention across N modules is a rule
// that holds until the (N+1)th module is written by someone who did not know.
//
// ⚠️ FAIL-CLOSED, ALWAYS. An unreadable blocklist is a REFUSAL, never a pass. The asymmetry
// is deliberate and it is not close: refusing a send that would have been fine costs one
// delayed email; sending to someone who told us to stop is the thing we promised not to do,
// and it cannot be taken back.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import { isSuppressed } from './suppression'
import { normalizeRevealEmail } from './billing-rules'

export type SendRefusalReason =
  /** On the do-not-contact floor — employer/sister brands. Never contacted, ever. */
  | 'do_not_contact'
  /** This person opted out. Global: it does not matter which client is asking. */
  | 'opted_out'
  /** We could not establish whether they opted out. Refused rather than risked. */
  | 'suppression_unreadable'

export type SendVerdict =
  | { allowed: true }
  | { allowed: false; reason: SendRefusalReason; message: string }

export interface SendSubject {
  email?: string | null
  /** E.164 or raw — matched against opt_out_blocklist.whatsapp_number. */
  phone?: string | null
  company?: string | null
  linkedin?: string | null
  website?: string | null
  /**
   * A seeded demo row. Demo addresses are `.invalid` and can never reach a person, and
   * refusing them would make the demo read as broken while protecting nobody.
   */
  isDemo?: boolean
}

/**
 * May we contact this person, on any channel?
 *
 * Every send path calls this. `send-paths.test.ts` fails the build if one does not — and
 * fails if its list of send paths is ever empty, because a sweep over zero paths proves
 * nothing at all.
 */
export async function checkSendAllowed(subject: SendSubject): Promise<SendVerdict> {
  if (subject.isDemo) return { allowed: true }

  // ── 1 · The do-not-contact floor ─────────────────────────────────────────────────────
  // Checked first and without touching the database: it cannot fail, cannot be switched off,
  // and costs nothing. A network problem must never be the reason we mail the employer.
  if (isSuppressed({
    email:    subject.email,
    company:  subject.company,
    linkedin: subject.linkedin,
    website:  subject.website,
  })) {
    return {
      allowed: false,
      reason: 'do_not_contact',
      message: 'This contact is on the do-not-contact list and is never contacted on any channel.',
    }
  }

  // ── 2 · The global opt-out list ──────────────────────────────────────────────────────
  const emailKey = normalizeRevealEmail(subject.email ?? null)
  const phoneKey = normalizePhone(subject.phone)
  if (!emailKey && !phoneKey) return { allowed: true }

  // ⚠️ NO CLIENT FILTER, AND THAT IS THE RULING. The row is keyed by whoever recorded the
  // opt-out (`blocked_by_client_id`), but the EFFECT is global: a later client cannot cause
  // us to contact someone who already told us to stop. Adding `.eq('blocked_by_client_id',
  // …)` here would quietly turn a global promise into a per-tenant one.
  let q = db.from('opt_out_blocklist').select('id').is('opted_back_in_at', null)
  q = emailKey && phoneKey
    ? q.or(`email.eq.${emailKey},whatsapp_number.eq.${phoneKey}`)
    : emailKey ? q.eq('email', emailKey) : q.eq('whatsapp_number', phoneKey!)

  const { data, error } = await q.limit(1).maybeSingle()

  if (error) {
    // FAIL CLOSED. See the header: an unanswerable question is treated as a NO.
    console.error('[send-gate] blocklist read FAILED — refusing the send (fail-closed):', error.message)
    return {
      allowed: false,
      reason: 'suppression_unreadable',
      message: `Could not establish whether this person has opted out (${error.message}). Refused rather than risked.`,
    }
  }

  if (data) {
    return {
      allowed: false,
      reason: 'opted_out',
      message: 'This person has opted out of contact from K.I.N.D. Suppression is global and permanent unless they opt back in.',
    }
  }

  return { allowed: true }
}

/**
 * Digits only, so a number stored as "+27 82 555 1234" matches one sent as "27825551234".
 * Returns null for anything too short to be a real number — a partial match on three digits
 * would suppress half the world.
 */
export function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null
  const digits = String(phone).replace(/\D+/g, '')
  return digits.length >= 7 ? digits : null
}
