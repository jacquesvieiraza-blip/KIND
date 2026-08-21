// ── THE A/B WINNER OPTIMISES MEETINGS, NEVER OPENS (P27, 21 Aug) ───────────────────────────
//
// Founder doctrine: *"the winner is decided by MEETINGS BOOKED per variant; where every
// variant has zero meetings, fall back to POSITIVE REPLIES per variant; opens are never the
// deciding signal."*
//
// ⚠️ WHAT THIS REPLACES, AND WHY IT MATTERED. `POST /figsy/ab-winner-check` ranked variants by
// OPEN RATE — `emails.filter(e => e.opened_at).length / emails.length`, highest wins — and then
// wrote `ab_test_resolved: true` IRREVERSIBLY. So the subject line every future lead received
// was chosen by which one got looked at, on a product whose North Star is a booked meeting.
// A curiosity-gap subject beats an honest one on opens and loses on meetings; the old rule
// picked the curiosity gap and locked it in forever.
//
// ⚠️ AND THE OPEN THRESHOLD HAD TO GO WITH IT. `MIN_OPENS_TO_RESOLVE = 5` was a correct guard
// for an open-rate ranking (#392: without it, zero-tracking meant variant A "won" at rate 0 >
// -1). Kept alongside a meetings ranking it becomes the opposite of a guard: a campaign with
// twenty booked meetings and no pixel would never resolve at all. The threshold now counts the
// signal the decision actually uses.
//
// ⚠️ EXTRACTED FROM THE HANDLER ON PURPOSE. The ranking lived inline in an Express handler that
// made its own database calls, so nothing could call it in a test and no red proof was possible
// — the founder's clause asked for exactly that proof. Pure in, pure out: this file touches no
// database and no network, and the handler keeps every query it had.

/** One variant's outcomes for a campaign, already grouped by the handler. */
export type VariantOutcome = {
  /** 'a' | 'b' | 'c' | 'd' | 'e' — the label written back as `ab_test_winner`. */
  label: string
  /** Step-1 emails sent under this variant's subject. */
  sends: number
  /** Meetings booked by the leads this variant wrote to. THE deciding signal. */
  meetings: number
  /** Replies classified 'interested' from those leads. The tie-break when meetings are 0. */
  positiveReplies: number
  /** Opens. CARRIED FOR REPORTING ONLY — never read by the ranking below. */
  opens: number
}

export type AbDecision =
  | { resolved: true; winner: string; basis: 'meetings' | 'positive_replies' }
  | { resolved: false; reason: 'no_signal_yet' }

/**
 * The minimum outcome signal before a winner is crowned.
 *
 * Deliberately small: a meeting is a rare, expensive event, and demanding many of them would
 * leave every test open forever. One real meeting beats any number of opens as evidence.
 */
export const MIN_MEETINGS_TO_RESOLVE = 1
/** When no variant has booked, this many positive replies across the test will do instead. */
export const MIN_POSITIVE_REPLIES_TO_RESOLVE = 3

/**
 * Decide the winning variant.
 *
 * Meetings first. Positive replies only when EVERY variant has zero meetings. Opens never.
 * Returns `resolved: false` when neither signal has accrued, so the caller leaves the test open
 * rather than locking in a winner chosen from nothing — the #392 lesson, moved to the new signal.
 *
 * Ties break on the EARLIER label ('a' before 'b'), matching the previous behaviour: the old
 * loop kept the first `>` winner, so an equal-scoring later variant never displaced an earlier
 * one. Worth preserving deliberately — a coin-flip on a tie would make the winner unstable
 * between runs on the same data.
 */
export function pickAbWinner(variants: readonly VariantOutcome[]): AbDecision {
  if (variants.length < 2) return { resolved: false, reason: 'no_signal_yet' }

  const totalMeetings = variants.reduce((n, v) => n + v.meetings, 0)
  if (totalMeetings >= MIN_MEETINGS_TO_RESOLVE) {
    return { resolved: true, winner: best(variants, v => v.meetings), basis: 'meetings' }
  }

  const totalPositive = variants.reduce((n, v) => n + v.positiveReplies, 0)
  if (totalPositive >= MIN_POSITIVE_REPLIES_TO_RESOLVE) {
    return { resolved: true, winner: best(variants, v => v.positiveReplies), basis: 'positive_replies' }
  }

  // Neither signal yet. The test stays open — and opens, however many, cannot resolve it.
  return { resolved: false, reason: 'no_signal_yet' }
}

/** Highest score wins; the first variant in order keeps a tie. */
function best(variants: readonly VariantOutcome[], score: (v: VariantOutcome) => number): string {
  let winner = variants[0].label
  let top = score(variants[0])
  for (const v of variants.slice(1)) {
    if (score(v) > top) { top = score(v); winner = v.label }
  }
  return winner
}
