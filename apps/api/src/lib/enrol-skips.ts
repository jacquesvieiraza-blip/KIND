// #620 — WHAT AN ENROL RUN REFUSED, IN WORDS.
//
// Pure and DB-free on purpose, for the same reason `pecr.ts` and `cold-client.ts` are: the
// sentence an operator reads is provable without a database, and a test for it must not need
// Supabase env vars to run. `operator-audit.ts` imports this; nothing here imports that.

/**
 * Turn the raw reason map into the sentence an operator reads. Never a bare count.
 *
 * Biggest cause first — that is the one worth acting on. "3 skipped" with no cause is the exact
 * reading that sends somebody hunting a bug in the wrong place.
 */
export function enrolSkipSummary(reasons: Record<string, number>): string {
  return Object.entries(reasons ?? {})
    .sort((a, b) => b[1] - a[1])
    .map(([reason, n]) => `${reason} × ${n}`)
    .join(' · ')
}
