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
