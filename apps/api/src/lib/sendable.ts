// ══════════════════════════════════════════════════════════════════════════════════════════
// J12-C3 · SENDABLE IS A FACT, AND IT IS NOT THE SAME FACT AS QUALIFIED (FD-5)
//
// FD-5: *"Verified business email required before send; QUALIFIED ≠ SENDABLE."*
//
// ── WHAT DECIDED WHO GOT EMAILED, AND WHY IT WAS NOT THAT ──────────────────────────────
//
//     (l.apollo_consented === true || l.status === 'consent_given') && not opted_out/rejected
//
// 🛑 `apollo_consented` IS UNRELIABLE IN TWO INDEPENDENT WAYS, AND BOTH ARE WRITTEN DOWN IN
// THIS REPOSITORY ALREADY:
//
//   ① At INSERT it is `email_status === 'verified' || email_status === 'likely_to_engage'`,
//      under a comment that says exactly what that costs: *"`likely_to_engage` is Apollo's
//      PREDICTION that an address will engage, not a verification that it exists. This is the
//      one write that sets the flag on a guess."* So a guessed address was enrolled.
//
//   ② At REVEAL, `lead-delivery.ts` patches `{ email, email_status, apollo_consented: true }`
//      — TRUE unconditionally, whatever status came back. So the flag the send gate reads is
//      forced true on every revealed lead, including the ones the reveal proved unverified.
//
// And nothing anywhere asked whether the address was a BUSINESS address at send time.
// `isBusinessEmail` existed and was consulted only by `finalVerdict`, whose
// `requireVerifiedBusinessEmail` is set for the HOUSE audience alone — so a customer's
// programme could enrol a personal mailbox with a predicted status.
//
// ── SO THE FACT IS DERIVED FROM THE ROW, NOT FROM A FLAG ────────────────────────────────
//
// `email_status` is what Apollo actually said, stored on the lead by both writers that reveal
// one. `sendable` reads THAT, plus the address itself. A flag that something else sets to true
// is not evidence; a status a provider returned is.
//
// ⚠️ QUALIFIED ≠ SENDABLE, AND THE ENTITLEMENT STILL COUNTS QUALIFIED. FD-5 separates the two
// deliberately: a prospect can be a correct, qualified match for the customer's targeting and
// still not be someone we may email today. The programme ceiling is consumed by QUALIFIED —
// `settleBatch(batchId, qualified)` — and nothing here changes that. Counting entitlement on
// sendability would charge a customer's ceiling for our provider's verification rate.
//
// ⚠️ THIS FILE DECIDES ONE THING AND TOUCHES NOTHING. No database, no provider, no send. It is
// pure so the rule that governs every outbound email can be proved without either.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { isBusinessEmail, isPlaceholderEmail } from './email-hygiene'

/** Only the two fields the fact reads. Both are columns on `leads`. */
export interface SendableFacts {
  email?: string | null
  /** `leads.email_status` — what the PROVIDER said, never a flag we set. */
  email_status?: string | null
}

/**
 * 🛑 THE ONE STATUS APOLLO RETURNS THAT COUNTS AS VERIFICATION.
 *
 * ⚠️ `likely_to_engage` IS DELIBERATELY NOT HERE, and it is the whole reason this constant is
 * named rather than inlined. It is Apollo's prediction that an address will engage — not a
 * check that it exists — and treating a prediction as a verification is what put guessed
 * addresses into outbound.
 */
export const SENDABLE_EMAIL_STATUS = 'verified'

export type NotSendable =
  | 'no_email'
  | 'placeholder_email'
  | 'personal_email'
  | 'unverified_email'

/** Founder-plain, operator-facing. Never a score, always the named fact. */
export const NOT_SENDABLE_COPY: Record<NotSendable, string> = {
  no_email:          'no email address has been revealed for this person',
  placeholder_email: 'the address on this person is a placeholder, not a real mailbox',
  personal_email:    'the address is a personal mailbox, not a business one',
  unverified_email:  'the provider has not verified that this address exists',
}

/**
 * Why this person may not be emailed, or `null` when they may.
 *
 * ⚠️ THE REASON IS RETURNED, NOT JUST A BOOLEAN. A shortfall a customer can see needs a
 * sentence — "18 of 40 are sendable" is only answerable if the other 22 can be explained —
 * and a count with no explanation is the unfalsifiable shape this repo refuses everywhere.
 */
export function notSendableReason(l: SendableFacts): NotSendable | null {
  const email = (l.email ?? '').trim()
  if (!email) return 'no_email'
  if (isPlaceholderEmail(email)) return 'placeholder_email'
  if (!isBusinessEmail(email)) return 'personal_email'
  // ⚠️ AN ABSENT STATUS IS NOT A VERIFICATION. A row we never revealed, and a reveal that
  // returned nothing, both read the same way here: we have not been told this address exists.
  if ((l.email_status ?? '').trim() !== SENDABLE_EMAIL_STATUS) return 'unverified_email'
  return null
}

/** May we email this person today? FD-5's fact, in one call. */
export function isSendable(l: SendableFacts): boolean {
  return notSendableReason(l) === null
}

/** How many of a set may be emailed, and why the rest may not. Counts only, never PII. */
export function sendableBreakdown(rows: readonly SendableFacts[]): {
  sendable: number
  total: number
  reasons: Partial<Record<NotSendable, number>>
} {
  const reasons: Partial<Record<NotSendable, number>> = {}
  let sendable = 0
  for (const r of rows) {
    const why = notSendableReason(r)
    if (why === null) { sendable++; continue }
    reasons[why] = (reasons[why] ?? 0) + 1
  }
  return { sendable, total: rows.length, reasons }
}
