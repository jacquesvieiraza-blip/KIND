// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CLIENT RAIL REFRESHES — AND A FAILED REFRESH NEVER BLANKS IT (C20).
//
// 🛑 WHAT WAS BROKEN. Every read behind the Vida client rail ran in a `useEffect(…, [])` —
// once, on mount, and never again. A client who signed up while an operator had Vida open
// simply did not exist on that screen until somebody reloaded the page. Preview 07 is
// literally that moment: "Redmayne & Co. signed up 14 minutes ago and Milla is collecting
// their brief", on a rail the operator did not refresh.
//
// ⚠️ A REFRESH INTRODUCES ITS OWN DEFECT, AND THIS MODULE EXISTS FOR THAT HALF. A poll that
// overwrites state with whatever the last response said will, on the first transient 500,
// replace a working rail with an empty one — under an operator's cursor, for no reason they
// can see, and then fill back in fifteen seconds later. A console that flickers to empty is
// worse than one that is stale, because stale is at least steady.
//
// So the rule is: A SUCCESSFUL READ REPLACES. A FAILED READ CHANGES NOTHING.
//
// ⚠️ WITH ONE EXCEPTION — THE FIRST LOAD. Before anything has ever loaded there is nothing to
// protect, and a silent failure there would leave the operator looking at an empty rail with
// no error. So a failure with no previous value surfaces; a failure after a good load does
// not. `null` is "never loaded", which is deliberately not the same as "loaded and empty".
//
// ⚠️ NO NEW INFRASTRUCTURE. No realtime, no socket, no subscription, no library. The effect
// that consumes this polls on an interval and on tab focus, which is the simplest thing that
// makes a new signup appear — and the pure decisions live here so they can be tested without
// a DOM this repo does not have a harness for.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** How often the rail re-reads while the tab is visible. */
export const RAIL_REFRESH_MS = 60_000

/**
 * What a refreshed read should become.
 *
 * @param previous what is on screen now — `null` means nothing has ever loaded
 * @param incoming the result of the read just attempted
 */
export type RefreshResult<T> =
  | { ok: true; value: T }
  | { ok: false }

export function nextRailValue<T>(previous: T | null, incoming: RefreshResult<T>): T | null {
  // A good read is the new truth, including when it is empty: a client genuinely removed
  // from the book must be able to leave the rail.
  if (incoming.ok) return incoming.value
  // A failed read changes nothing. On the very first load there is nothing to keep, and the
  // caller surfaces the error instead — see `shouldSurfaceError`.
  return previous
}

/**
 * Does this failure deserve the operator's attention?
 *
 * ⚠️ ONLY WHEN THERE IS NOTHING TO SHOW. A banner that appears every time a poll blips would
 * train the operator to ignore banners, which is how the one that mattered gets ignored too.
 * A failure over good data is invisible; a failure over nothing is named.
 */
export function shouldSurfaceError(previous: unknown | null): boolean {
  return previous === null
}

/**
 * Should the interval actually read right now?
 *
 * ⚠️ A HIDDEN TAB READS NOTHING. An operator with Vida parked in a background tab for a day
 * would otherwise put 1,440 rounds of four endpoints through the proxy for a screen nobody is
 * looking at. The focus handler covers the moment they come back, which is the only moment
 * the answer matters.
 */
export function shouldPollNow(documentHidden: boolean): boolean {
  return documentHidden !== true
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ MVP1 — ONE PERSON, ONE ROW: RECONCILING TWO SOURCES INTO ONE RAIL.
//
// 🛑 THE RAIL NOW MERGES TWO READS. `/operator/clients` answers with confirmed clients (and
// House), `/operator/brief-drafts` with people who have signed up and not confirmed. They are
// separate endpoints refreshed in one round, and each can succeed or fail on its own — so
// between two rounds the SAME PERSON can legitimately appear in both answers: the clients read
// has just picked up their brand-new row while the drafts read still holds the one from before
// promotion, or the drafts read failed and kept it.
//
// A person rendered twice on an operator's rail is not a cosmetic bug. It reads as two
// prospects, it double-counts the pipeline by eye, and the operator cannot tell which row is
// the real one.
//
// ⚠️ DEDUPLICATED ON DURABLE IDENTITY, NEVER ON A DISPLAY NAME. `user_id` is the same auth
// user on both sides of promotion and is what the `clients` row is created against. Matching
// on company name would silently merge two genuinely different companies that happen to share
// one — and would fail to merge the same person whose draft said "Redmayne" and whose client
// row says "Redmayne & Co."
// ═══════════════════════════════════════════════════════════════════════════════════════

/** The only fields these decisions read. Both rails carry far more; none of it belongs here. */
export type HasUser = { user_id?: string | null }

/**
 * The drafts that should actually be rendered, given the clients already on the rail.
 *
 * ⚠️ A DRAFT WHOSE PERSON IS NOW A CLIENT IS DROPPED, whichever read is the stale one. That
 * is what makes the transition "one draft row → one client row" rather than "draft + client"
 * for a round, and it holds even when the drafts read failed and kept a row the server has
 * already stopped returning.
 */
export function visibleDrafts<D extends HasUser, C extends HasUser>(
  drafts: D[] | null, clients: C[] | null,
): D[] {
  if (!drafts) return []
  const promoted = new Set((clients ?? []).map(c => c.user_id).filter((u): u is string => !!u))
  return drafts.filter(d => !d.user_id || !promoted.has(d.user_id))
}

/**
 * What the draft list should become after a round of reads.
 *
 * 🛑 THE OTHER HALF OF THE TRANSITION, AND THE ONE THAT IS EASY TO MISS. `nextRailValue`
 * alone handles "the drafts read failed" correctly. It does not handle the opposite partial
 * round: the drafts read SUCCEEDS and the person is gone from it — they were promoted — while
 * the clients read in that same round FAILED, so the rail's client list does not have them
 * yet. Both answers are individually correct and the person is on neither, so they vanish from
 * the operator's rail entirely until the next good clients read.
 *
 * ⚠️ SO A DEPARTED DRAFT IS ONLY LET GO WHEN SOMETHING CAN HAVE REPLACED IT. When the clients
 * read failed in the same round, a draft that disappeared is KEPT — not invented, kept — and
 * `visibleDrafts` removes it the moment a good clients read shows the client. This is the same
 * rule as `nextRailValue`, applied to the seam between two sources rather than within one.
 *
 * ⚠️ AND IT IS NOT A CACHE THAT GROWS. Only rows that were already on screen survive, only
 * while the clients read is failing, and any of them can still leave on a round where both
 * reads succeed.
 */
export function reconcileDrafts<D extends { id: string }>(
  previous: D[] | null,
  incoming: RefreshResult<D[]>,
  clientsOk: boolean,
): D[] | null {
  if (!incoming.ok) return previous
  if (clientsOk || !previous) return incoming.value
  const present = new Set(incoming.value.map(d => d.id))
  const vanished = previous.filter(d => !present.has(d.id))
  return vanished.length === 0 ? incoming.value : [...incoming.value, ...vanished]
}
