// ═══════════════════════════════════════════════════════════════════════════════════════
// THE HOUSE ACCOUNT — the founder's own test login, never revenue, and the only account that
// may be authorised internally (P1 / P2 without money).
//
// ⚑ 24 Sep (R152) — A NEW HOUSE ACCOUNT. Founder: *"i would much rather build a new house
// account. because we have tried fixing this house account to the new ways and it never worked
// and takes weeks of work."* The new login is the House; the old `hello@get-kind.com` stays on
// this list ONLY so its history keeps staying out of every revenue figure. Nothing about the old
// account is repaired or changed.
//
// ⚠️ ONE LIST, BOTH APPS. The API and the admin app each typed their own copy of the address;
// a House that one app recognised and the other did not is how a test account's money leaks
// into revenue. Both now read this file.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** The House login. Lower-cased for compares. */
export const HOUSE_ACCOUNT_EMAIL = 'jacques.vieiraza+house@gmail.com'

/** Retired House logins — still House (their history is never revenue), no longer used. */
export const RETIRED_HOUSE_ACCOUNT_EMAILS: readonly string[] = ['hello@get-kind.com']

export const HOUSE_ACCOUNT_EMAILS: readonly string[] = [HOUSE_ACCOUNT_EMAIL, ...RETIRED_HOUSE_ACCOUNT_EMAILS]

/** Is this auth email a House login? Trimmed and case-insensitive; empty is never House. */
export function isHouseEmail(email: string | null | undefined): boolean {
  const e = (email ?? '').trim().toLowerCase()
  return e !== '' && HOUSE_ACCOUNT_EMAILS.includes(e)
}
