// ═══════════════════════════════════════════════════════════════════════════════════════
// IS THIS CANDIDATE THE PERSON THE CUSTOMER DESCRIBED? — asked twice, on purpose.
//
// 🛑 THE PRODUCTION ZERO THIS EXISTS TO END (7 Sep). The first clean House run searched
// Apollo, got 250 candidates, and delivered nothing. Two record-level gates inside
// `runIcpJob` rejected all 250 before a lead was inserted:
//
//     poolCountryMatches(contact.country, ['United Kingdom','United States'])   → false
//     contact.email_status !== 'verified'                                       → true
//
// Apollo's People Search returns NEITHER field. It gives `id`, `first_name`,
// `last_name_obfuscated`, `title`, and BOOLEANS about availability — `has_email`,
// `has_country` — never the values, and *"this endpoint doesn't return email addresses or
// phone numbers"* (docs.apollo.io/reference/people-api-search). Both fields were `undefined`,
// and `undefined` failed both tests. 250 → 0, deterministically.
//
// ── THE RULE, IN THE FOUNDER'S WORDS ────────────────────────────────────────────────────
// A customer describes their ICP in normal language and M&V must interpret ALL of it. A field
// missing at SEARCH stage means **UNKNOWN / NEED MORE DATA**. It does not mean FAIL THE ICP.
//
//     search      → reject only what is KNOWN-BAD; carry unknowns forward
//     enrichment  → go and get the missing facts
//     final gate  → unknown is NOW a failure; the whole ICP is enforced, or it is not a lead
//
// ⚠️ THESE ARE TWO DIFFERENT QUESTIONS, NOT ONE GATE WITH A FLAG.
//   · `preRevealVerdict` asks: **do we already know this candidate is wrong?**
//     Its job is to avoid paying to enrich somebody we can already rule out.
//   · `finalVerdict` asks: **have we PROVED this candidate is right?**
//     Its job is to let nothing unproven become a usable lead.
// Collapsing them produces one of the two failures this file is bracketed by: fail unknowns
// early and you get the zero; pass unknowns late and an unverified address reaches a prospect.
//
// ⚠️ AND THIS IS NOT AN ENRICHMENT SYSTEM. It is a predicate. M&V's enrichment flow lives in
// `lead-delivery.ts`; Apollo's paid reveal is ONE provider step inside it. Nothing here calls
// a provider, and nothing here should ever start.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { isPlaceholderEmail, isBusinessEmail } from './email-hygiene'
import { poolCountryMatches } from './pool-sourcing'

/** The customer's criteria, as the saved ICP expresses them. */
export interface IcpCriteria {
  /** Empty ⇒ the customer named no geography ⇒ nothing to enforce. */
  geographies: readonly (string | null | undefined)[]
  /** House, MVP: only a provider-VERIFIED business address is usable. */
  requireVerifiedBusinessEmail: boolean
}

/** What we currently know about a candidate. `null`/blank means NOT YET KNOWN. */
export interface CandidateFacts {
  email?: string | null
  emailStatus?: string | null
  country?: string | null
}

export type QualificationRefusal =
  | 'geography_mismatch'
  | 'geography_unknown'
  | 'no_email'
  | 'unverified_email'
  | 'personal_email'

export type QualificationVerdict =
  | { ok: true }
  | { ok: false; reason: QualificationRefusal; detail: string }

const PASS: QualificationVerdict = { ok: true }
const fail = (reason: QualificationRefusal, detail: string): QualificationVerdict =>
  ({ ok: false, reason, detail })

/** A value we actually received. A blank string is a provider saying nothing, not a value. */
const known = (v: string | null | undefined): v is string =>
  typeof v === 'string' && v.trim() !== ''

/**
 * BEFORE enrichment — reject only what we can already prove wrong.
 *
 * Every unknown passes, because the entire point of the enrichment step that follows is to
 * turn unknowns into facts. Rejecting here on an absent field is the defect that produced
 * the 250 → 0 run.
 *
 * ⚠️ IT IS STILL A REAL GATE. A candidate whose country we DO have and which does not match
 * the customer's geography is refused now, so we never spend a reveal credit on somebody we
 * have already ruled out.
 */
export function preRevealVerdict(facts: CandidateFacts, icp: IcpCriteria): QualificationVerdict {
  const geos = icp.geographies.filter(known)
  if (geos.length > 0 && known(facts.country) && !poolCountryMatches(facts.country, geos)) {
    return fail('geography_mismatch', `country ${facts.country} is outside the ICP's geographies`)
  }
  if (icp.requireVerifiedBusinessEmail && known(facts.emailStatus) && facts.emailStatus !== 'verified') {
    return fail('unverified_email', `email status ${facts.emailStatus} is not "verified"`)
  }
  return PASS
}

/**
 * AFTER enrichment — the hard gate. Only a candidate PROVED to match becomes a usable lead.
 *
 * ⚠️ UNKNOWN IS A FAILURE HERE, and that inversion is the whole design. We have now asked the
 * provider for the missing facts; if they still are not present, the candidate is not proved
 * and must not be delivered, approved or sent.
 */
export function finalVerdict(facts: CandidateFacts, icp: IcpCriteria): QualificationVerdict {
  // ① An address at all. Without one there is no lead, whatever else is true.
  if (!known(facts.email) || isPlaceholderEmail(facts.email)) {
    return fail('no_email', 'no usable email address was revealed for this candidate')
  }

  // ② A BUSINESS address. `reveal_personal_emails=false` asks the provider never to send a
  // personal one; this is the record check behind that request, for every audience.
  if (!isBusinessEmail(facts.email)) {
    return fail('personal_email', 'the revealed address is a personal mailbox, not a business one')
  }

  // ③ Verified, where the audience requires it. An absent status is not a verification.
  if (icp.requireVerifiedBusinessEmail && facts.emailStatus !== 'verified') {
    return fail('unverified_email', known(facts.emailStatus)
      ? `email status ${facts.emailStatus} is not "verified"`
      : 'no email status was returned, so the address is not proved verified')
  }

  // ④ The customer's geography, enforced on the revealed country.
  const geos = icp.geographies.filter(known)
  if (geos.length > 0) {
    if (!known(facts.country)) {
      return fail('geography_unknown', 'no country was revealed, so the ICP geography cannot be proved')
    }
    if (!poolCountryMatches(facts.country, geos)) {
      return fail('geography_mismatch', `country ${facts.country} is outside the ICP's geographies`)
    }
  }

  return PASS
}
