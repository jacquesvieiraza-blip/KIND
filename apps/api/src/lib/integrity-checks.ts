// WHAT HAS ALREADY GONE WRONG — the retroactive half of the gate.
//
// Founder, 26 Jul: *"[the gate] only covers what is about to be shipped. but what about what
// has already been shipped because these have errors."* Exactly right, and it needs a
// different tool:
//
//   • `scripts/check.sh` reads the CODE and stops the NEXT broken thing shipping.
//   • This reads the DATABASE and says what the ALREADY-shipped bugs actually did, to whom.
//
// A test can only tell you a bug is fixed. It cannot tell you whether it fired last Tuesday
// and left a client short. Every question below is a defect found by reading code, turned
// into a question about real rows — so "did this hurt anyone?" stops being a guess.
//
// READ-ONLY BY CONSTRUCTION. Nothing here writes, updates or deletes. An integrity report
// that repairs things is one you cannot run twice, and the first thing you want to do with a
// damage list is look at it before touching anything.
//
// Every check names WHO is affected, not just a count: "3 leads are broken" is not
// actionable; "these 3, for that client" is.
//
// This file is split in two on purpose. The VERDICT LOGIC is pure and unit-tested — given
// counts, what does it mean and how bad is it. The QUERIES live in `integrity.ts`. The draft
// that preceded this mixed them, imported a module that did not exist, and never compiled;
// it was reported to the founder as a working tool. Splitting them means the judgement half
// can be proven without a database.

/** How bad is it. `unknown` is for a check that could not run — never silently "clean". */
export type Severity = 'critical' | 'high' | 'medium' | 'clean' | 'unknown'

export type CheckResult = {
  key: string
  /** What this looks for, in a sentence the founder can act on. */
  question: string
  severity: Severity
  /** Rows or clients affected. */
  count: number
  /** Who — ids, capped so a huge result cannot blow up the response. */
  affected: string[]
  /** What it means and what to do. Written for the founder, not a developer. */
  verdict: string
  /** The defect this exists because of. */
  defect: string
}

/** Ids returned per check — enough to act on, small enough to render. */
export const SHOW_LIMIT = 25

/** The included-pack size and lead price, mirrored so this module needs no DB import. */
export const PACK_LEADS = 100
export const LEAD_PRICE_USD = 4

export type Finding = {
  key: string
  question: string
  defect: string
  /** Ids of affected rows/clients. Empty = nothing found. */
  affected: string[]
  /** Total affected, which may exceed `affected.length` if the query capped. */
  total?: number
  /** Wording when the count is zero — proof we asked, rather than silence. */
  cleanVerdict: string
  /** Wording when the count is non-zero. Receives the count. */
  badVerdict: (n: number) => string
  /** How bad a non-zero count is. */
  severity: Exclude<Severity, 'clean' | 'unknown'>
}

/**
 * Turn a raw finding into a result.
 *
 * The rule that matters: **zero is reported, not hidden.** A check that finds nothing still
 * renders, saying so — because "we asked and the answer was no" is the entire point of an
 * integrity report. Silence reads as "not checked".
 */
export function toResult(f: Finding): CheckResult {
  const total = f.total ?? f.affected.length
  if (total === 0) {
    return {
      key: f.key, question: f.question, defect: f.defect,
      severity: 'clean', count: 0, affected: [], verdict: f.cleanVerdict,
    }
  }
  return {
    key: f.key, question: f.question, defect: f.defect,
    severity: f.severity, count: total,
    affected: f.affected.slice(0, SHOW_LIMIT),
    verdict: f.badVerdict(total),
  }
}

/**
 * A check that threw.
 *
 * Deliberately `unknown`, never `clean`. A failed check that renders green is worse than no
 * check at all — it is the exact shape of every bug we have spent two days finding: a silent
 * failure that reads as success.
 */
export function toUnanswered(key: string, question: string, defect: string, err: unknown): CheckResult {
  return {
    key, question, defect,
    severity: 'unknown', count: 0, affected: [],
    verdict: `UNANSWERED — this check could not run, so do NOT read it as clean. ${err instanceof Error ? err.message : String(err)}`,
  }
}

export type Summary = {
  critical: number; high: number; medium: number; clean: number; unknown: number
}

/** Count the results by severity. */
export function summarise(results: CheckResult[]): Summary {
  return {
    critical: results.filter(r => r.severity === 'critical').length,
    high:     results.filter(r => r.severity === 'high').length,
    medium:   results.filter(r => r.severity === 'medium').length,
    clean:    results.filter(r => r.severity === 'clean').length,
    unknown:  results.filter(r => r.severity === 'unknown').length,
  }
}

/**
 * The one-line headline.
 *
 * An unanswered check outranks "all clean", because a report that cannot see everything must
 * not claim everything is fine — that is how "no issues found" became a meaningless phrase.
 */
export function headline(s: Summary): string {
  if (s.critical > 0) return `${s.critical} CRITICAL problem(s) in live data — clients are affected.`
  if (s.high > 0)     return `${s.high} problem(s) in live data. Nothing critical.`
  if (s.unknown > 0)  return `No damage found — but ${s.unknown} check(s) could not run, so the answer is incomplete.`
  if (s.medium > 0)   return `${s.medium} thing(s) to tidy. No client is affected.`
  return 'No damage found in live data. Every bug we fixed was caught before it hurt anyone.'
}

// ── THE THREE DECISIONS THAT GOT IT WRONG ───────────────────────────────────────
//
// The first live run of the integrity check produced three findings that were not real. All
// three were judgement inlined in a query, where nothing could test it. They are pure
// functions now, for the same reason the verdict logic already was.

/**
 * Should this client be counted in "paid but cannot send"?
 *
 * **No, if they are a demo.** A demo cannot send BY DESIGN — `is_demo` is a hard stop inside
 * the send path and every address is `.invalid`. Counting one reported a CRITICAL *"a client
 * has paid and cannot be delivered"* about the demo account, which is the system working
 * exactly as intended. A check that cries wolf is a check nobody reads.
 */
export function countsAsCannotSend(isDemo: boolean): boolean {
  return !isDemo
}

/**
 * Is this the pack-and-wallet double-grant?
 *
 * It needs **an actual purchase**, not merely a wallet balance. The signature is *"they paid
 * us, and got both the 100 free leads and the dollars"*. Checking only for a balance flagged
 * a client credited by a manual grant — who never paid us anything — as the victim of a bug
 * that could not have touched them.
 */
export function countsAsDoubleGrant(purchaseCount: number, approvalCount: number): boolean {
  return purchaseCount > 0 && approvalCount < PACK_LEADS
}

/**
 * Is this account the MBF demo?
 *
 * Matched on the NAME CONTAINING "MBF", not on the exact string `MBF Holdings`. The live
 * account is called "MBF Demo", so an exact match reported *"the MBF demo account does not
 * exist"* while it sat in the client list. The conclusion was accidentally useful — it does
 * have no leads — but the stated reason was false, and a report that is right by accident is
 * not a report.
 */
export function isMbfAccount(companyName: string | null | undefined): boolean {
  return typeof companyName === 'string' && /mbf/i.test(companyName)
}

/** Worst first; a clean check still appears, at the end. */
export function rank(results: CheckResult[]): CheckResult[] {
  const order: Record<Severity, number> = { critical: 0, high: 1, unknown: 2, medium: 3, clean: 4 }
  return [...results].sort((a, b) => order[a.severity] - order[b.severity])
}
