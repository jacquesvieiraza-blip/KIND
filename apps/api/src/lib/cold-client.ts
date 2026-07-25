// COLD CLIENTS — 30 days without an approval and we suspend (founder-locked 25 Jul).
//
// "we not a free service. a client needs to be working with us or we freeze their inbox."
//
// The cost is real and it is ours: a client's sender costs ~$40/month from the day they sign,
// and it keeps costing whether they approve anybody or not. A client who stopped six weeks ago
// is a bill we pay to keep an inbox warm for nobody.
//
// Suspending is NOT deleting. We pause their campaigns — nothing further sends — and say so
// plainly. The moment they approve anyone again they are live, because approving is the
// signal that they are back. Their leads keep waiting for them (no time limit on paid leads),
// and their pack is untouched.
//
// Derived entirely from `leads.revealed_at`, so there is no column to keep in sync and no
// migration to run: a client's last approval IS the last revealed lead.

/** Days without an approval before we suspend. */
export const COLD_DAYS = 30
/** Days at which we warn them it's coming — one week's notice, not a surprise. */
export const WARN_DAYS = 23

export type ColdState = {
  /** Whole days since their last approval. null when they have never approved. */
  daysIdle: number | null
  /** Never approved anything — a different problem (they are still onboarding). */
  neverStarted: boolean
  warn: boolean
  cold: boolean
  /** What Vida shows the operator. */
  label: string
}

/**
 * Where is this client against the 30-day clock?
 *
 * `lastApprovalAt` is the newest `revealed_at` for the client; null if they have never
 * approved anyone. A client who has never approved is NOT cold — they have not started, which
 * is chased in a different place (step 2, the $99), and suspending someone who never got
 * going would be punishing us for our own onboarding.
 */
export function coldState(lastApprovalAt: string | Date | null | undefined, now: Date): ColdState {
  if (!lastApprovalAt) {
    return { daysIdle: null, neverStarted: true, warn: false, cold: false, label: 'Not started yet — no approvals' }
  }
  const then = lastApprovalAt instanceof Date ? lastApprovalAt : new Date(lastApprovalAt)
  if (Number.isNaN(then.getTime())) {
    // An unparseable date must never read as "30 days idle" and suspend a paying client.
    return { daysIdle: null, neverStarted: true, warn: false, cold: false, label: 'Not started yet — no approvals' }
  }
  const daysIdle = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 86_400_000))
  const cold = daysIdle >= COLD_DAYS
  const warn = !cold && daysIdle >= WARN_DAYS

  if (cold) return { daysIdle, neverStarted: false, warn: false, cold: true, label: `Suspended — no approvals in ${daysIdle} days` }
  if (warn) return { daysIdle, neverStarted: false, warn: true, cold: false, label: `Going quiet — ${COLD_DAYS - daysIdle} days until we suspend` }
  return { daysIdle, neverStarted: false, warn: false, cold: false, label: daysIdle === 0 ? 'Approved today' : `Last approval ${daysIdle}d ago` }
}

/** What we say to the client. Plain, no threat, and it says exactly how to undo it. */
export function suspensionMessage(companyName: string | null | undefined): string {
  const who = companyName?.trim() || 'your account'
  return `We've paused sending for ${who}. Nobody has been approved in ${COLD_DAYS} days, and we keep a warmed sender running for you the whole time — so we pause rather than bill you for silence. Approve anyone from your list and you're straight back on; nothing has been lost and your included leads are still yours.`
}
