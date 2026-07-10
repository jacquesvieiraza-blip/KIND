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
