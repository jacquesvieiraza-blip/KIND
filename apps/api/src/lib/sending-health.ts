// SENDING HEALTH — the one glance that says whether outreach is working right now.
//
// Founder's condition for Client Zero running on our own engine, verbatim: *"yes risk is
// something will break. but we fix the break. and we need a way to monitor the break."*
// Alerts already exist and are loud. What was missing is a screen you can look AT rather
// than an email you wait FOR.
//
// ⚠️ THE HONEST LIMIT, FOUND BY READING THE WRITE PATH RATHER THAN ASSUMING IT:
//
// **Failed sends cannot be counted, because nothing records one.** `sendSequenceEmail`
// inserts the `figsy_sent_emails` row BEFORE the send (it needs the id for the tracking
// pixel) and then, on failure, **DELETES it** (`figsy.ts` — "send FAILED … not advancing
// enrollment"). The enrollment is rolled back so the step retries, the founder is alerted,
// and a `console.error` is written. But no row survives, and no `outcome_events` row is
// written for a failure either.
//
// So `figsy_sent_emails` is a record of SUCCESSES ONLY. A panel that showed "failed: 0"
// from it would be stating a fact it never measured — the exact defect #565 and the System
// screen's NOT-MEASURED state exist to prevent. Failures are therefore reported as
// **NOT-MEASURED, with the reason**, and closing that gap is its own change (a status column
// instead of the delete, or a `send_failures` row) — deliberately not smuggled in here.
//
// Everything else IS derivable from writes that already happen:
//   • sent      → figsy_sent_emails.sent_at              (successes)
//   • replies   → figsy_replies.classification           (hot/warm/cold/opt_out/…)
//   • opt-outs  → opt_out_blocklist.reason='list_unsubscribe'
//   • bounces   → opt_out_blocklist.reason='hard_bounce' | 'spam_complaint'
//
// The bounce/opt-out split is not a guess: `routes/figsy.ts` upserts exactly those three
// reason strings, so the blocklist doubles as the bounce ledger.

/** One measured number, or an honest admission that it was not measured. */
export type Metric =
  | { measured: true; value: number }
  | { measured: false; why: string }

export const NOT_MEASURED = (why: string): Metric => ({ measured: false, why })
export const measured = (value: number): Metric => ({ measured: true, value })

export type WindowCounts = {
  sent: Metric
  failed: Metric
  bounced: Metric
  optOuts: Metric
  replies: Metric
  /** replies broken down by the classifier's own labels */
  repliesByClass: Record<string, number>
}

export type SendingHealth = {
  today: WindowCounts
  last7: WindowCounts
  /** Most recent failures, when a source for them exists. Empty while unmeasurable. */
  recentFailures: { at: string; detail: string }[]
  /** True when today is a day we EXPECT sends — used for the amber-on-zero rule. */
  sendingExpected: boolean
  /** Why sending is or is not expected, in the operator's words. */
  sendingExpectedWhy: string
}

/**
 * WHY FAILURES ARE NOT MEASURED, in one sentence the panel can render.
 *
 * Exported so the UI and the tests quote the same string — a screen explaining a gap in
 * different words from the code that has the gap is how the gap gets misunderstood.
 */
export const FAILED_NOT_MEASURED =
  'No table records a failed send: the row is deleted on failure and the enrollment is rolled ' +
  'back to retry. Failures alert by email instead. Counting them needs a status column or a ' +
  'send_failures row — a change of its own.'

export const BOUNCE_REASONS = ['hard_bounce', 'spam_complaint'] as const
export const OPT_OUT_REASONS = ['list_unsubscribe'] as const

/**
 * Is sending expected right now?
 *
 * Zero sent is only reassuring when nothing was due. With the kill-switch off, or no active
 * campaign, zero is the correct and calm answer. With sending ON and enrollments due, zero is
 * the loudest number on the page — it is what a broken send path looks like from the outside,
 * and it is indistinguishable from a quiet day unless we say which one we are in.
 */
export function isSendingExpected(a: {
  autoOutreachEnabled: boolean
  activeCampaigns: number
  enrollmentsDue: number
}): { expected: boolean; why: string } {
  if (!a.autoOutreachEnabled) {
    return { expected: false, why: 'AUTO_OUTREACH_ENABLED is off — nothing is meant to send yet.' }
  }
  if (a.activeCampaigns === 0) {
    return { expected: false, why: 'No active campaign — there is nothing to send from.' }
  }
  if (a.enrollmentsDue === 0) {
    return { expected: false, why: 'No enrollments are due — the sequences are all waiting on their next step.' }
  }
  return {
    expected: true,
    why: `Sending is on, ${a.activeCampaigns} active campaign(s), ${a.enrollmentsDue} enrollment(s) due.`,
  }
}

export type Severity = 'ok' | 'amber' | 'red' | 'unmeasured'

/**
 * How a single window should READ to an operator.
 *
 * The rule this encodes: **zero sent on a day sending is expected is AMBER, not calm.** A
 * count of 0 rendered in the same grey as a quiet Sunday is how a dead send path goes unnoticed
 * for a week — the same family as a failed load rendering as "nothing to do" (#565).
 */
export function windowSeverity(w: WindowCounts, sendingExpected: boolean): { level: Severity; message: string } {
  if (!w.sent.measured) return { level: 'unmeasured', message: w.sent.why }

  if (w.sent.value === 0) {
    return sendingExpected
      ? { level: 'amber', message: 'Nothing has sent, and sending is expected right now. Check the send cron and the mailbox state before assuming it is a quiet day.' }
      : { level: 'ok', message: 'Nothing sent — and nothing was due, so this is the expected answer.' }
  }

  // Bounces are the number that ends a mailbox. Judged as a RATE, because 5 bounces out of 20
  // is a dying domain and 5 out of 2,000 is Tuesday.
  if (w.bounced.measured && w.bounced.value > 0) {
    const rate = w.bounced.value / w.sent.value
    if (rate >= 0.05) {
      return { level: 'red', message: `${w.bounced.value} bounces on ${w.sent.value} sends (${Math.round(rate * 100)}%). Above 5% the mailbox reputation is burning — pause and investigate before the next run.` }
    }
    if (rate >= 0.02) {
      return { level: 'amber', message: `${w.bounced.value} bounces on ${w.sent.value} sends (${Math.round(rate * 100)}%). Watch it — 5% is where real damage starts.` }
    }
  }
  return { level: 'ok', message: `${w.sent.value} sent.` }
}

/** Fold a list of reply classifications into counts, tolerating nulls from older rows. */
export function tallyClassifications(rows: { classification: string | null }[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of rows) {
    const k = (r.classification ?? 'unclassified').trim() || 'unclassified'
    out[k] = (out[k] ?? 0) + 1
  }
  return out
}
