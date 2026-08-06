// REPORT FAILED READS — the counterweight to `.data ?? []`.
//
// supabase-js returns `{ data, error }` and never throws (#349). The idiom
// `for (const row of res.data ?? [])` is therefore a silencer: a query Postgres REJECTED
// and a query that legitimately matched nothing produce the identical empty loop.
//
// That is not a theoretical risk. The client activity feed selected `leads.source`, a column
// that had never been created; the query was rejected on every request for weeks, and because
// the result was read as `.data ?? []` the feed simply stopped showing "N leads added" — which
// reads to a client as a quiet week, not as a bug. Nobody could have noticed.
//
// So where a handler is going to fall back to an empty list, it says so out loud first.
// Deliberately NON-FATAL: a feed missing one of four sections is still worth rendering, and
// throwing would turn a partial outage into a blank page. The job here is that the failure
// leaves a trace, not that it takes the response down.

/** The shape every supabase-js read comes back as. `data` is irrelevant here. */
export type ReadResult = { error?: { message?: string } | null }

/**
 * Names of the reads that failed, in the order given.
 *
 * Pure and returned rather than only logged, so a test can assert on the real behaviour
 * instead of grepping a handler for the word "error" — which is how a check that matched
 * `console.error` in an unrelated catch block passed against code that checked nothing.
 */
export function failedReads(reads: Record<string, ReadResult | null | undefined>): string[] {
  return Object.entries(reads)
    .filter(([, r]) => !!r?.error)
    .map(([name]) => name)
}

/**
 * One line per failed read, naming the read and the reason.
 *
 * The read's NAME is the point. "the query failed" sends you to four candidates; "the leads
 * read failed" sends you to one.
 */
export function failedReadLines(scope: string, reads: Record<string, ReadResult | null | undefined>): string[] {
  return Object.entries(reads)
    .filter(([, r]) => !!r?.error)
    .map(([name, r]) => `[${scope}] the ${name} read failed, so those rows are missing from this response: ${r!.error!.message || '(no message)'}`)
}

/** Log every failed read. Returns the names, so callers can branch if they need to. */
export function reportFailedReads(scope: string, reads: Record<string, ReadResult | null | undefined>): string[] {
  for (const line of failedReadLines(scope, reads)) console.error(line)
  return failedReads(reads)
}
