// EMPTY IS NOT BROKEN (#565).
//
// Vida loaded the worklist, the status header and the alerts with three `.catch(() => {})`.
// A failed load left the state at its initial empty value — so the console rendered a calm,
// confident **"nothing to do"** over an endpoint that was down. The operator's whole job is
// deciding what to work on next, from that screen.
//
// It is the same failure shape as every expensive bug this week: `count-inventory --check`
// exiting 0 without running (#581), the schema section green over a missing column (#585),
// the activity row counting seeded rows as revenue (#586). **A thing that could not be
// established must never render as a thing that was established and found fine.**
//
// It lives in `@kind/shared` because it is the ONE place both consoles can import from:
// `apps/admin` resolves only `@/*` and `@kind/shared`, and `apps/api` depends on the same
// package — so the rule is written once and unit-tested from the API suite (the admin app has
// no test runner of its own). A second copy in the admin app is how the two would drift.

export type PanelState = 'loading' | 'ready' | 'empty' | 'failed'

export type PanelView = {
  state: PanelState
  /** What to render. `null` when there is nothing to say. */
  message: string | null
  /** True only when the panel genuinely has nothing in it AND we know that for a fact. */
  trustworthy: boolean
}

/**
 * Decide what a panel should say.
 *
 * The rule that matters: **`failed` is never `empty`.** A caller that cannot tell the two
 * apart will always pick the reassuring one, because that is what an unhandled `catch`
 * produces by default.
 */
export function panelView(a: {
  loading: boolean
  /** The load's error, if it failed. */
  error: string | null
  /** How many rows came back. Ignored when `error` is set — a failed load has no count. */
  count: number
  /** What this panel is, in the operator's words: "the worklist", "alerts". */
  label: string
}): PanelView {
  if (a.loading) return { state: 'loading', message: `Loading ${a.label}…`, trustworthy: false }
  if (a.error) {
    return {
      state: 'failed',
      // Says what it could NOT do, and that the absence proves nothing. Never "nothing to do".
      message: `Couldn't load ${a.label} — this is NOT "nothing to do". ${a.error}`,
      trustworthy: false,
    }
  }
  if (a.count === 0) {
    return { state: 'empty', message: `Nothing in ${a.label} right now.`, trustworthy: true }
  }
  return { state: 'ready', message: null, trustworthy: true }
}

/** Turn whatever a fetch threw into a sentence an operator can act on. */
export function loadError(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'string' && e.trim()) return e
  return 'The request failed and gave no reason. Check the API is up.'
}
