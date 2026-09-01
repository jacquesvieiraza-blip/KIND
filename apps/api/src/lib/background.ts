// ═══════════════════════════════════════════════════════════════════════════════════════
// FIRE-AND-FORGET WORK, WITH AN OWNER.
//
// ⚑ 1 Sep. The founder's `ship.sh` run went red on ONE test in 4,762:
//
//     proof-review-handoff.test.ts › the third attempt is refused 409 and persists ONE open
//     review  —  expected client().proof_passes_done to be 2, received 0
//
// 🛑 THE ROOT CAUSE IS NOT "A FLAKY TEST", IT IS AN UNOWNED PROMISE. `POST /icps/:id/proof`
// answers the prospect immediately and starts `runIcpJob` WITHOUT awaiting it — deliberately,
// and that UX is correct: nobody should watch a spinner while a batch is sourced. But nothing
// held a reference to the job, so **no caller could ever know it was still running.**
//
// ⚠️ WHY THAT BECOMES A WRONG NUMBER RATHER THAN A SLOW TEST. `runIcpJob` performs FOUR
// dynamic `await import(...)` calls inside its body (`../lib/onboarding-pack` at icps.ts:657,
// `../lib/programme` twice, `../lib/programme-authority`). The first lands early, right where
// the sourcing target is computed. A leaked job from test A is therefore very likely to be
// sitting inside a dynamic import at the exact moment test B runs `vi.resetModules()` and
// re-imports `routes/icps`. Those two operations touch the same module registry, and the
// re-import can resolve against a graph the leaked job is still holding open — so test B's
// route ends up bound to test A's `@kind/db` mock, and every write lands in the PREVIOUS
// test's store.
//
// That is precisely the observed failure: `proof_passes_done` read **0**, not 1 and not 3.
// Nothing decremented it. All three requests incremented a store the assertion was no longer
// looking at. A count that is short would be a race in the counter; a count of zero is a race
// in the WIRING.
//
// ⚠️ SO THE FIX IS OWNERSHIP, NOT WAITING. Production behaviour is unchanged — the route
// still does not await the job, and the prospect still gets an instant answer. What changes
// is that the promise is now REGISTERED, so a caller that needs a boundary (a test, a
// shutdown hook) can ask "is anything still running?" and get a truthful answer.
//
// ⚠️ NO TIMERS, NO SLEEPS, NO POLLING ANYWHERE IN THIS FILE. A sleep would swap one race for
// a slower one; the drain below waits on the actual promises.
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Everything started and not yet finished.
 *
 * ⛓️ 1 Sep — THIS WAS MODULE-SCOPED IN THE FIRST DRAFT AND THAT WAS WRONG, for a reason worth
 * writing down because it is the same trap the bug itself springs.
 *
 * 🛑 A module-scoped `Set` is DESTROYED BY `vi.resetModules()` — the exact call whose race
 * this file exists to close. A drain running after a reset would import a FRESH module,
 * find an EMPTY set, report "nothing outstanding" and return immediately, while the leaked
 * job carried on. It would have looked like a boundary and been a no-op: precisely the shape
 * of defect this repo keeps logging, and it would have passed every green run.
 *
 * ⚠️ SO THE REGISTRY OUTLIVES THE MODULE GRAPH, on `globalThis` behind a Symbol. That is not
 * cross-test leakage: vitest isolates each test FILE in its own environment, so this is
 * per-file in exactly the way the boundary needs, and it survives the resets inside a file.
 *
 * ⚠️ `Symbol.for`, NOT A STRING KEY — a string could collide with anything else on the
 * global, and a shared registry silently merging with a stranger's is worse than none.
 */
const REGISTRY = Symbol.for('kind.background.inflight')
type Global = typeof globalThis & { [REGISTRY]?: Set<Promise<unknown>> }
const g = globalThis as Global
const inflight: Set<Promise<unknown>> = g[REGISTRY] ?? (g[REGISTRY] = new Set())

/**
 * Register a fire-and-forget promise and hand it straight back.
 *
 * ⚠️ THIS DOES NOT MAKE THE WORK AWAITED. It changes nothing about when the caller responds.
 * Wrapping is the whole contract: `trackBackground(job().catch(handleIt))`.
 *
 * ⚠️ PASS AN ALREADY-HANDLED PROMISE. The tracked promise is never awaited by the runtime, so
 * a rejection reaching this function unhandled stays unhandled. Every call site attaches its
 * `.catch` FIRST, which is also why the drain below can never reject.
 */
export function trackBackground<T>(work: Promise<T>): Promise<T> {
  // `.finally` returns a NEW promise, and it is that one we track and return — otherwise the
  // deletion key and the tracked key are different objects and the set never empties.
  const tracked: Promise<T> = work.finally(() => { inflight.delete(tracked) })
  // Synchronous, so it always precedes the `finally` microtask even for an already-settled
  // promise. Deleting a key that was never added is a no-op, so the ordering is safe either
  // way — this comment records that it was checked rather than assumed.
  inflight.add(tracked)
  return tracked
}

/** How much background work is outstanding right now. */
export function backgroundCount(): number {
  return inflight.size
}

/**
 * Wait until nothing is outstanding.
 *
 * ⚠️ A LOOP, NOT A SINGLE `Promise.all`. Background work can start more background work —
 * `runIcpJob` does exactly that — and a one-shot await would return while the second
 * generation was still in flight, which is the same leak with an extra step.
 *
 * ⚠️ `allSettled`, NEVER `all`. A drain must not adopt a rejection: these promises are
 * already handled by their call sites, and re-throwing here would turn tidy-up into a
 * failure in whatever test happened to be draining.
 *
 * ⚠️ BOUNDED, SO A RUNAWAY FAILS LOUDLY INSTEAD OF HANGING. Work that endlessly respawns
 * would otherwise spin here until the test timeout, reported as "timed out" with no cause
 * named. The ceiling is generous enough that no honest chain reaches it.
 */
export async function settleBackgroundWork(maxGenerations = 50): Promise<void> {
  for (let gen = 0; gen < maxGenerations; gen++) {
    if (inflight.size === 0) return
    await Promise.allSettled([...inflight])
  }
  throw new Error(
    `settleBackgroundWork: still ${inflight.size} task(s) after ${maxGenerations} generations — ` +
    'background work is respawning without end.',
  )
}
