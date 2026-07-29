// #491 — A DEAD CRON IS CURRENTLY SILENT.
//
// `callInternal` already records every run into `cron_runs` and dead-letters the failures.
// Both are PULL surfaces: they are true the moment they are written and nobody reads them
// until someone thinks to look. So a job that starts failing — a rotated key, a 500 on the
// internal route, a provider outage — keeps failing on schedule, and the first person to
// find out is the client whose leads stopped arriving. With real clients sending, a dead
// cron is a client who stopped being worked and nobody knew.
//
// There are exactly two ways a scheduled job can stop happening, and they need different
// detectors, which is why this file has two functions rather than one:
//
//   ① IT RAN AND FAILED. There is a `cron_runs` row with ok=false. `shouldAlertFailure`
//      decides whether that failure is worth waking the founder for.
//
//   ② IT NEVER RAN AT ALL. There is no row, so ① can never fire — nothing happened. This is
//      the CLAIM-THEN-CRASH path #343 introduced: a process claims the slot (the claim is an
//      INSERT, so the slot is now taken), then dies before finishing. Every other replica
//      correctly stands down, and the job simply does not happen — the single-run guard
//      working exactly as designed and producing a silent miss. It is also what a dead
//      scheduler, a crash-looping deploy or a `RUN_CRONS=false` left on by accident look
//      like. `staleJobs` is the detector: a job that used to run daily and has not run for
//      36 hours.
//
// Both are pure functions over rows, for the reason `cron-guard.ts` gives: the branch that
// matters most is the one that decides NOT to alert, and a throttle that cannot be tested
// without a database is a throttle nobody proves until it floods the founder's inbox.

/** A `cron_runs` row as this module needs it. Mirrors the table written by `recordCronRun`. */
export type CronRunRow = {
  job: string
  started_at: string | null
  ok: boolean | null
  note?: string | null
}

/**
 * Stamped into `cron_runs.note` when an alert actually went out.
 *
 * THE THROTTLE HAS TO REMEMBER SOMEWHERE, and the brief was no new infra. The `note` column
 * is already written on every run and already read by the admin health page, so the marker
 * rides along in a column that exists — no table, no migration, no in-memory counter that a
 * restart would reset (and this process restarts on every deploy, which is precisely when a
 * cron is most likely to be broken).
 */
export const ALERTED_MARKER = '[alerted]'

const HOUR = 3600_000
const DAY = 24 * HOUR

function ageMs(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  return Number.isFinite(t) ? now.getTime() - t : null
}

export type AlertDecision = { alert: boolean; why: string }

/**
 * A job just failed. Is it worth telling the founder?
 *
 * `prior` is this job's runs BEFORE the one that just failed, newest first.
 *
 * Three rules, and the second and third pull against each other on purpose:
 *
 *   ① A NEW OUTAGE ALWAYS ALERTS. If the previous run succeeded, this failure is news even
 *      if something else alerted an hour ago — a job that was working and now is not is the
 *      single most actionable signal here.
 *   ② AN ONGOING OUTAGE STAYS QUIET FOR 24H. The send job runs every two hours; alerting on
 *      each failure would send twelve identical emails a day, and an alert that arrives
 *      twelve times is an alert that gets filtered — which is how the NEXT real one is
 *      missed. This is the same reasoning as `smartleadRefusalIsNews`.
 *   ③ …BUT IT NAGS AGAIN AFTER 24H. Silence must never be mistaken for recovery. Once the
 *      marker ages out, the next failure alerts again, so a job broken for a week produces
 *      a daily reminder rather than one email on day one and then nothing.
 */
export function shouldAlertFailure(prior: CronRunRow[], now: Date): AlertDecision {
  const previous = prior[0]

  // Nothing before this: either the first run ever recorded, or the first since the table
  // was created. Either way nobody has been told.
  if (!previous) return { alert: true, why: 'no previous run is recorded for this job, so nothing has been reported yet' }

  // ① Healthy last time → this is a new failure. Always news.
  if (previous.ok === true) {
    return { alert: true, why: 'the previous run of this job SUCCEEDED, so this is a new failure rather than a continuing one' }
  }

  // ②/③ Already failing. Did an alert actually go out in the last 24 hours?
  const alertedRecently = prior.some(r => {
    const age = ageMs(r.started_at, now)
    return age !== null && age >= 0 && age < DAY && (r.note ?? '').includes(ALERTED_MARKER)
  })
  if (alertedRecently) {
    return { alert: false, why: 'this job is already failing and an alert for it went out within the last 24 hours' }
  }
  return { alert: true, why: 'this job is still failing and the last alert was more than 24 hours ago' }
}

/** Median, because one pathological gap (a deploy, an outage) must not move the estimate. */
export function medianGapHours(runsNewestFirst: CronRunRow[], now: Date): number | null {
  const times = runsNewestFirst
    .map(r => (r.started_at ? Date.parse(r.started_at) : NaN))
    .filter(t => Number.isFinite(t))
    .sort((a, b) => b - a)
  if (times.length < 2) return null
  const gaps: number[] = []
  for (let i = 0; i < times.length - 1; i++) gaps.push(times[i] - times[i + 1])
  gaps.sort((a, b) => a - b)
  const mid = Math.floor(gaps.length / 2)
  const median = gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2
  void now
  return median / HOUR
}

export type StaleJob = { job: string; lastRunAt: string | null; hoursSince: number; typicalGapHours: number }

/**
 * Jobs that USED TO run at least daily and have not run for 36 hours.
 *
 * THE CADENCE IS MEASURED, NOT LISTED. The obvious implementation is a hardcoded list of
 * daily job names — and it would be wrong within a week, because the list lives in one file
 * and the schedule in another, and nobody updates two places. Worse, it would fire on every
 * legitimately weekly job (`/digest/weekly`, `/cro/weekly-digest`, `/cmo/self-outreach`,
 * `/data-moat/aggregate`), and four false alarms is how an alert channel dies.
 *
 * So the expected cadence comes from the job's OWN history: the median gap between its recent
 * runs. A weekly job has a ~168h median and is excluded automatically; a job that ran hourly
 * and stopped is caught by the same rule with no configuration at all.
 *
 * Three runs minimum, deliberately: two runs give one gap, and a single gap spanning a deploy
 * or an outage is not a cadence — it is a coincidence with a number attached.
 */
export function staleJobs(
  runsByJob: Record<string, CronRunRow[]>,
  now: Date,
  opts?: { staleAfterHours?: number; minRuns?: number },
): StaleJob[] {
  const staleAfter = opts?.staleAfterHours ?? 36
  const minRuns = opts?.minRuns ?? 3
  const out: StaleJob[] = []

  for (const [job, rows] of Object.entries(runsByJob)) {
    const sorted = [...(rows ?? [])]
      .filter(r => r?.started_at)
      .sort((a, b) => Date.parse(b.started_at!) - Date.parse(a.started_at!))
    if (sorted.length < minRuns) continue

    const gap = medianGapHours(sorted, now)
    // Only jobs that ran at least daily. A weekly job silent for 36h is a weekly job.
    if (gap === null || gap > 24) continue

    const age = ageMs(sorted[0].started_at, now)
    if (age === null || age < staleAfter * HOUR) continue

    out.push({
      job,
      lastRunAt: sorted[0].started_at,
      hoursSince: Math.round(age / HOUR),
      typicalGapHours: Math.round(gap * 10) / 10,
    })
  }
  return out.sort((a, b) => b.hoursSince - a.hoursSince)
}

/** The failure alert body. Names the job, because "a cron failed" is not actionable. */
export function failureAlertLines(job: string, note: string, decisionWhy: string): string[] {
  return [
    `The scheduled job "${job}" failed.`,
    `What it reported: ${note.slice(0, 400)}`,
    `Why you are being told now: ${decisionWhy}.`,
    'Nothing retries automatically — the job runs again at its next scheduled time, and will keep failing until the cause is fixed.',
    'The failure is also in dead_letter and on the Engine health page (last-run-per-job).',
    'While this persists, whatever that job does is NOT happening: sends, digests, charges and watchdogs each have their own job.',
  ]
}

/** The scheduler-death alert body. */
export function staleAlertLines(stale: StaleJob[]): string[] {
  return [
    `${stale.length} scheduled job${stale.length === 1 ? '' : 's'} that used to run at least daily ${stale.length === 1 ? 'has' : 'have'} not run at all.`,
    ...stale.map(s => `• ${s.job} — last ran ${s.hoursSince}h ago (it normally runs about every ${s.typicalGapHours}h)`),
    '',
    'NOT RUNNING is different from failing: a failing job leaves a row and an alert, this one left nothing.',
    'The usual causes, in the order worth checking:',
    '  1. The API process is not running the scheduler at all — check RUN_CRONS on @kind/api, and that the service is up.',
    '  2. A process claimed the slot and then died before finishing (#343). The claim is an INSERT, so every other replica correctly stood down and the job simply did not happen.',
    '  3. The job was removed from cron.ts deliberately — in which case this alert is expected once and then stops.',
  ]
}
