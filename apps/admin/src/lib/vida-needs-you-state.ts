// ══════════════════════════════════════════════════════════════════════════════════════════
// J7-C1 · WHAT THE CLIENTS RAIL SAYS WHEN IT HAS NOTHING TO SHOW
//
// ── THE ONE INVERSION THIS FILE EXISTS TO PREVENT ───────────────────────────────────────
//
// **A BROKEN READ MUST NEVER RENDER AS A CLEAR BOARD.** `vida-operator-tasks.ts` already
// states it for the task queue and keeps `failed` as a state distinct from `empty` for exactly
// this reason. The Clients rail — the other half of the same answer — did not:
//
//     const needsYou = (id: string) => lifecycle[id]?.needs_you === true
//
// 🛑 ABSENT IS NOT FALSE. The board read's `.catch` deliberately leaves `lifecycle` empty (the
// stage word must never be guessed, which is right), and that same emptiness made this
// predicate answer `false` for every client in the book — so the Needs-you filter emptied and
// the rail printed *"Nothing needs you right now. 🎉"*. The most reassuring sentence the
// console has, with a party emoji, as the output of blindness.
//
// ── WHY IT IS A PURE FUNCTION AND NOT AN INLINE TERNARY ─────────────────────────────────
//
// The rule has four inputs and three of the combinations are wrong in different ways (calm
// over a failure, an alarm over an empty book, either sentence over a list that has rows). A
// ternary in JSX cannot be tested against a hostile combination; this can, and is.
// ══════════════════════════════════════════════════════════════════════════════════════════

/**
 * How the lifecycle-board read went.
 *
 * ⚠️ THREE STATES, NOT TWO. `ok: 'pending'` is a read still in flight, and it is neither a
 * failure nor a clear board — resolving it to either is how a console comes to make a claim
 * about a question it has not asked yet.
 */
export type BoardRead =
  | { ok: true }
  | { ok: 'pending' }
  | { ok: false; error: string }

export type NeedsYouEmpty =
  /** Nothing to say: there are rows on screen, or there are no clients at all. */
  | { kind: 'silent'; message?: undefined; trustworthy?: undefined }
  /** The read has not come back. Say so; claim nothing. */
  | { kind: 'loading'; message: string; trustworthy: false }
  /** The board could not be read, so the empty list is UNKNOWN, not clear. */
  | { kind: 'board_unreadable'; message: string; trustworthy: false }
  /** Genuinely nothing pending, from a read that worked. */
  | { kind: 'needs_you_empty'; message: string; trustworthy: true }

/** The calm sentence. It may only ever be returned from a trustworthy read. */
export const NEEDS_YOU_EMPTY_COPY = 'Nothing needs you right now. 🎉'

/**
 * The sentence for a Needs-you list with nothing in it.
 *
 * ⚠️ `visibleCount > 0` WINS FIRST. Whatever the board did, if there are rows on screen the
 * operator is reading them and neither sentence belongs anywhere near the list.
 *
 * ⚠️ AND AN EMPTY BOOK IS SILENT. A console nobody has signed up to yet is not "nothing needs
 * you" (there is nothing it could be about) and not "unreadable" (nothing failed). Both
 * sentences would be about the wrong thing, which is why this is checked before the read state.
 */
export function needsYouEmptyState(i: {
  board: BoardRead
  clientCount: number
  visibleCount: number
}): NeedsYouEmpty {
  if (i.visibleCount > 0) return { kind: 'silent' }
  if (i.clientCount <= 0) return { kind: 'silent' }

  if (i.board.ok === false) {
    return {
      kind: 'board_unreadable',
      // The `panelView` standard: what it could NOT do, that the absence proves nothing, and
      // the reason. Never "nothing to do".
      message:
        `Couldn't read the lifecycle board — this is NOT "nothing needs you". `
        + `${i.board.error} · ${i.clientCount} client${i.clientCount === 1 ? '' : 's'} are unchecked.`,
      trustworthy: false,
    }
  }

  if (i.board.ok === 'pending') {
    return { kind: 'loading', message: 'Checking which clients need you…', trustworthy: false }
  }

  return { kind: 'needs_you_empty', message: NEEDS_YOU_EMPTY_COPY, trustworthy: true }
}
