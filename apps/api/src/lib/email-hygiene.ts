// Pure email-hygiene helpers — NO db/network imports so they stay unit-testable in
// isolation (the send/source modules that use these pull in @kind/db).

// #375 (AR-38) — Apollo returns SYNTHETIC placeholder addresses for people whose real
// email is locked/unknown (e.g. `email_not_unlocked@domain.com`, `email_not_found@...`,
// the literal `@domain.com`). Cold-emailing these = hard bounces to fake mailboxes,
// which erodes OUR sending-domain reputation — and on the self-outreach path they were
// also inserted + charged. A single guard used everywhere a sourced email is consumed.
export function isPlaceholderEmail(email: string | null | undefined): boolean {
  const e = (email || '').trim().toLowerCase()
  if (!e || !e.includes('@')) return true
  const [local, domain = ''] = e.split('@')
  if (local.startsWith('email_not_') || local.includes('not_unlocked') || local.includes('notunlocked')) return true
  if (domain === 'domain.com' || domain === 'example.com' || domain === 'email.com') return true
  return false
}

// ⚑ 7 Sep — IS THIS A BUSINESS MAILBOX, OR SOMEBODY'S PERSONAL ONE?
//
// The House path asks Apollo for business addresses only (`reveal_personal_emails=false` on
// every bulk_match request). This is the RECORD check behind that request: a query parameter
// is what we asked for, and the address that comes back is the fact. It applies to every
// audience — a personal mailbox is not a B2B lead for anybody.
//
// ⚠️ ONE HOME FOR THIS LIST. `crm.ts` needed the same set to decide when a domain match means
// anything (everybody has a gmail), and two copies of a domain list is how they drift. It is
// declared here, beside the placeholder guard, because both answer "is this address usable?".
const GENERIC_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
  'aol.com', 'protonmail.com', 'gmx.com', 'live.com', 'mail.com',
])

/** The free/consumer mailbox domains — exported so there is exactly one such list. */
export function isGenericEmailDomain(domain: string | null | undefined): boolean {
  return GENERIC_EMAIL_DOMAINS.has((domain || '').trim().toLowerCase())
}

/**
 * A usable BUSINESS address: real (not a provider placeholder) and not a consumer mailbox.
 *
 * ⚠️ FALSE FOR AN ABSENT ADDRESS. "We have no email" is not "we have a business email", and
 * a predicate that answered true for `null` would let an unrevealed candidate through the
 * final qualification gate.
 */
export function isBusinessEmail(email: string | null | undefined): boolean {
  const e = (email || '').trim().toLowerCase()
  if (!e || isPlaceholderEmail(e)) return false
  const domain = e.split('@')[1] ?? ''
  if (!domain) return false
  return !isGenericEmailDomain(domain)
}
