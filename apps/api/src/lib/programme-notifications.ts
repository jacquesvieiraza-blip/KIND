// ═══════════════════════════════════════════════════════════════════════════════════════
// WHAT A PROGRAMME CUSTOMER MAY BE EMAILED — one set of rules, executable.
//
// ⚑ 31 Aug (BUILD-004A-2D). The 4A-2D audit found the Settings notification panel telling a
// client that three notifications were coming "Soon" while the crons that send them run every
// day. #326 wrote "Soon" when the toggles genuinely did nothing; the emails were built
// afterwards and nobody came back to the switch. **That is #628's shape exactly — the copy
// outlived the problem and became the opposite lie**, and this time it cost the client an off
// switch they could see but not press.
//
// ⚠️ PLAIN TS, NO ROUTE, NO JSX, ON PURPOSE. "Does this client get this email?" is a decision
// about truth, and the suite has to be able to RUN it. A guard that reads `internal.ts` as a
// string can tell that the word `weekly_digest_enabled` appears near a send; it cannot tell
// whether `false` actually stops the send. Every rule below is a function for that reason.
//
// ⚠️ THIS FILE DECIDES NOTHING ABOUT CONTENT — only about permission. What the digest SAYS is
// still the digest's business (and one of its numbers is a live truth blocker, reported
// separately and deliberately NOT fixed here).
// ═══════════════════════════════════════════════════════════════════════════════════════

// ⚠️ `@kind/db` IS IMPORTED LAZILY, INSIDE THE ONE FUNCTION THAT NEEDS IT — deliberately.
// A top-level import binds Supabase env vars at module load, which would make this file
// unimportable by a plain unit test and force every rule below to be verified by reading
// source instead of running it. That is the failure mode this slice's guards exist to avoid,
// so the rules stay pure and the only impure function fetches its client on the way in.

/**
 * Notifications a client can be sent, named exactly as the Settings panel names them.
 *
 * ⚠️ `low_credits` AND `zero_credits` ARE IN THIS LIST BECAUSE THEY STILL EXIST, not because
 * they are still allowed. They belong to the retired wallet model, and `mayNotify` refuses
 * them for a programme customer. Deleting the names would hide the very thing being fenced.
 */
export type ClientNotification =
  | 'daily_brief'
  | 'campaign_paused'
  | 'weekly_digest'
  | 'reply_received'
  | 'low_credits'
  | 'zero_credits'

/**
 * Notifications built on the retired per-lead wallet — a credit balance, a top-up, running
 * out. A programme customer has none of those things: `/milla/billing` tells them in as many
 * words that there is no wallet, no pack and no per-lead price.
 *
 * ⛓️ FOUNDER-LOCKED 31 Aug (D1): *"Remove Low credits from the Milla programme experience.
 * Milla programme customers must not receive retired low-credit emails."*
 */
export const RETIRED_WALLET_NOTIFICATIONS: ClientNotification[] = ['low_credits', 'zero_credits']

export function isRetiredWalletNotification(kind: ClientNotification): boolean {
  return RETIRED_WALLET_NOTIFICATIONS.includes(kind)
}

/**
 * Is a stored preference an opt-OUT?
 *
 * ⚠️ ONLY AN EXPLICIT `false` TURNS ANYTHING OFF. The columns are added nullable with no
 * DEFAULT (the #599 precedent: a DEFAULT stamps historic rows with a claim nobody checked),
 * so every existing client reads `null` — which means "never chose", which must keep the
 * behaviour they have today rather than silently unsubscribing the whole book.
 */
export function notificationEnabled(pref: boolean | null | undefined): boolean {
  return pref !== false
}

/**
 * 🛑 THE ONE DECISION. May we send `kind` to this client?
 *
 * @param onProgramme `true`/`false` if we know, **`null` if the programme table was
 *   unreadable** — and unreadable is NOT "no". See the refusal below.
 * @param pref the client's stored preference for this notification, if it has one.
 */
export function mayNotify(
  kind: ClientNotification,
  { onProgramme, pref }: { onProgramme: boolean | null; pref?: boolean | null },
): boolean {
  if (isRetiredWalletNotification(kind)) {
    // ⚠️ UNREADABLE FAILS CLOSED, AND THAT IS A DELIBERATE ASYMMETRY. Everywhere else in this
    // codebase `null` means "we could not read it" and we refuse to assert anything. Here the
    // two mistakes are not equal: sending a programme customer a "top up your credits" email
    // is a retired product contradicting their own billing page in their inbox, and it cannot
    // be taken back. Not sending a legacy client a warning delays a nudge. So a failed read
    // withholds the email.
    if (onProgramme !== false) return false
  }
  return notificationEnabled(pref)
}

/**
 * Which of these clients are on a programme?
 *
 * ⚠️ ANY PROGRAMME ROW COUNTS — no status filter, unlike `readCustomerProgramme`, which
 * deliberately ignores COMPLETED and CANCELLED because it is answering "what is your CURRENT
 * programme?". This function answers a different question: "is this person a Milla programme
 * customer?" — and someone whose programme finished last month is still exactly that. A
 * status filter here would let the retired wallet emails back in through the completed door.
 *
 * @returns the set of client ids on a programme, or **`null` when the read FAILED** — which
 *   callers must pass to `mayNotify` as `null` rather than collapsing to an empty set.
 */
export async function programmeClientIds(clientIds: string[]): Promise<Set<string> | null> {
  if (clientIds.length === 0) return new Set()
  const { db } = await import('@kind/db')
  const { data, error } = await db.from('programmes')
    .select('client_id')
    .in('client_id', clientIds)
  // 🛑 supabase-js RETURNS `{ error }` RATHER THAN THROWING. `data ?? []` here would turn a
  // database failure into "nobody is on a programme" — and every programme customer in the
  // batch would then be sent the retired email this function exists to stop.
  if (error) {
    console.error('[programme-notifications] programme read FAILED —', error.message)
    return null
  }
  return new Set((data ?? []).map((r: { client_id: string }) => r.client_id))
}

/** Helper for the loop shape every cron uses: `null` set → `null` verdict, never `false`. */
export function onProgramme(ids: Set<string> | null, clientId: string): boolean | null {
  return ids === null ? null : ids.has(clientId)
}
