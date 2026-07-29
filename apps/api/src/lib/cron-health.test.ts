import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  shouldAlertFailure, staleJobs, medianGapHours, failureAlertLines, staleAlertLines,
  ALERTED_MARKER, type CronRunRow,
} from './cron-health'

// #491 — A DEAD CRON IS SILENT, AND WITH REAL CLIENTS SENDING THAT IS A CLIENT WHO STOPPED
// BEING WORKED WITH NOBODY KNOWING.
//
// `callInternal` already wrote every run to `cron_runs` and dead-lettered every failure, and
// neither of those is a signal — both are PULL surfaces, true the moment they are written and
// read only when somebody thinks to look.
//
// The hard part is NOT sending an alert. It is the throttle: the send job runs every two
// hours, so alerting on each failure sends twelve identical emails a day, and an alert that
// arrives twelve times is an alert that gets filtered — which is how the next REAL one is
// missed. That is the same reasoning that keeps `smartleadRefusalIsNews` quiet on the five
// expected refusals.

const HOUR = 3600_000
const at = (hoursAgo: number, ok: boolean, note = ''): CronRunRow => ({
  job: '/figsy/send-due-all',
  started_at: new Date(Date.now() - hoursAgo * HOUR).toISOString(),
  ok,
  note,
})
const NOW = () => new Date()

describe('the three rules the throttle has to hold at once', () => {
  it('① A FAILURE ALERTS — nothing recorded before it', () => {
    expect(shouldAlertFailure([], NOW()).alert).toBe(true)
  })

  it('② A SECOND FAILURE THE SAME DAY DOES NOT — the alert already went out', () => {
    // Twelve emails a day trains the founder to ignore the channel.
    const prior = [at(2, false, `${ALERTED_MARKER} HTTP 500`)]
    const d = shouldAlertFailure(prior, NOW())
    expect(d.alert).toBe(false)
    expect(d.why).toContain('within the last 24 hours')
  })

  it('③ RECOVERY THEN A NEW FAILURE ALERTS AGAIN — even inside the same 24h', () => {
    // THE ONE THAT MAKES THIS MORE THAN A TIMER. The job broke, was fixed, and broke again.
    // A naive "one per 24h" throttle stays silent here and the second outage is invisible.
    const prior = [
      at(1, true),                                   // recovered
      at(3, false, `${ALERTED_MARKER} HTTP 500`),    // the original outage, alerted
    ]
    const d = shouldAlertFailure(prior, NOW())
    expect(d.alert).toBe(true)
    expect(d.why).toContain('SUCCEEDED')
  })
})

describe('a job that stays broken', () => {
  it('nags again once the 24h marker has aged out — silence must not read as recovery', () => {
    const prior = [at(3, false), at(26, false, `${ALERTED_MARKER} HTTP 500`)]
    const d = shouldAlertFailure(prior, NOW())
    expect(d.alert).toBe(true)
    expect(d.why).toContain('more than 24 hours ago')
  })

  it('stays quiet while an alert from within the window exists, however many failures follow', () => {
    const prior = [at(1, false), at(3, false), at(5, false), at(7, false, `${ALERTED_MARKER} boom`)]
    expect(shouldAlertFailure(prior, NOW()).alert).toBe(false)
  })

  it('an UNMARKED failure history still alerts — a row nobody alerted on is not an alert', () => {
    // The marker means "somebody was told". Failures alone never suppress.
    const prior = [at(2, false), at(4, false)]
    expect(shouldAlertFailure(prior, NOW()).alert).toBe(true)
  })

  it('a marker OLDER than 24h does not suppress', () => {
    expect(shouldAlertFailure([at(30, false, `${ALERTED_MARKER} x`)], NOW()).alert).toBe(true)
  })

  it('survives a null/garbage timestamp rather than suppressing on it', () => {
    // Suppressing because a date failed to parse would be a silent dead cron — the exact
    // failure this item exists to remove.
    const prior: CronRunRow[] = [{ job: 'j', started_at: null, ok: false, note: `${ALERTED_MARKER} x` }]
    expect(shouldAlertFailure(prior, NOW()).alert).toBe(true)
  })
})

describe('measuring a job\'s own cadence instead of listing it', () => {
  it('reads the median gap, so one deploy-sized outlier does not move it', () => {
    const rows = [at(0, true), at(2, true), at(4, true), at(30, true)]
    expect(medianGapHours(rows, NOW())).toBeCloseTo(2, 1)
  })

  it('needs two runs to have a gap at all', () => {
    expect(medianGapHours([at(1, true)], NOW())).toBeNull()
  })
})

describe('the scheduler-death detector — the job that never ran', () => {
  const daily = (lastRunHoursAgo: number): CronRunRow[] => [
    at(lastRunHoursAgo, true), at(lastRunHoursAgo + 24, true),
    at(lastRunHoursAgo + 48, true), at(lastRunHoursAgo + 72, true),
  ]

  it('flags a daily job silent for more than 36h', () => {
    const out = staleJobs({ '/leads/drip': daily(40) }, NOW())
    expect(out).toHaveLength(1)
    expect(out[0].job).toBe('/leads/drip')
    expect(out[0].hoursSince).toBeGreaterThanOrEqual(39)
  })

  it('does NOT flag the same job when it ran this morning', () => {
    expect(staleJobs({ '/leads/drip': daily(6) }, NOW())).toHaveLength(0)
  })

  it('NEVER flags a weekly job — the four false alarms that would kill the channel', () => {
    // /digest/weekly, /cro/weekly-digest, /cmo/self-outreach and /data-moat/aggregate all
    // legitimately go 168h between runs. A hardcoded "daily jobs" list would fire on every
    // one of them, and four false alarms is how an alert channel dies. The cadence is
    // measured from the job's own history instead, so they exclude themselves.
    const weekly = [at(50, true), at(218, true), at(386, true), at(554, true)]
    expect(staleJobs({ '/digest/weekly': weekly }, NOW())).toHaveLength(0)
  })

  it('ignores a job with too little history to have a cadence', () => {
    // Two runs give ONE gap, and a single gap spanning a deploy is a coincidence with a
    // number attached, not a schedule.
    expect(staleJobs({ '/new/job': [at(40, true), at(64, true)] }, NOW())).toHaveLength(0)
  })

  it('catches an hourly job that stopped, with no configuration', () => {
    const hourly = [at(40, true), at(41, true), at(42, true), at(43, true)]
    expect(staleJobs({ '/figsy/rescore-stranded': hourly }, NOW())).toHaveLength(1)
  })

  it('reports the worst offender first', () => {
    const out = staleJobs({ '/a': daily(40), '/b': daily(100) }, NOW())
    expect(out.map(s => s.job)).toEqual(['/b', '/a'])
  })

  it('a FAILING job that still runs is not stale — that is the other detector\'s job', () => {
    const failingButAlive = [at(1, false), at(25, false), at(49, false), at(73, false)]
    expect(staleJobs({ '/x': failingButAlive }, NOW())).toHaveLength(0)
  })
})

describe('what the founder actually receives', () => {
  it('the failure alert NAMES the job — "a cron failed" is not actionable', () => {
    const body = failureAlertLines('/figsy/send-due-all', 'HTTP 500', 'it was healthy before').join(' ')
    expect(body).toContain('/figsy/send-due-all')
    expect(body).toContain('HTTP 500')
  })

  it('it says why it arrived now, so the throttle is not mistaken for a fault', () => {
    expect(failureAlertLines('/j', 'x', 'the previous run SUCCEEDED').join(' ')).toContain('previous run SUCCEEDED')
  })

  it('it says nothing retries by itself', () => {
    expect(failureAlertLines('/j', 'x', 'y').join(' ')).toContain('Nothing retries automatically')
  })

  it('the stale alert distinguishes NOT RUNNING from failing, and names the claim-crash cause', () => {
    const body = staleAlertLines([{ job: '/leads/drip', lastRunAt: null, hoursSince: 40, typicalGapHours: 24 }]).join(' ')
    expect(body).toContain('/leads/drip')
    expect(body).toContain('NOT RUNNING is different from failing')
    expect(body).toContain('claimed the slot and then died')
    expect(body).toContain('RUN_CRONS')
  })
})

// ── THE WIRING ───────────────────────────────────────────────────────────────────────────
// A judgement nothing calls is not a feature. Prompt 4 shipped a client and a mapping and
// wired neither into anything, and the grep for callers returned tests only.
describe('it is actually wired into the cron', () => {
  const src = readFileSync(join(__dirname, '../cron.ts'), 'utf8')

  it('the failure path alerts', () => {
    expect(src).toContain('alertOnCronFailure')
    expect(src).toMatch(/ok \? note : await alertOnCronFailure/)
  })

  it('the marker is written INTO the recorded row, or the throttle remembers nothing', () => {
    expect(src).toContain('noteToRecord')
    expect(src).toContain('ALERTED_MARKER')
  })

  it('the stale check runs inside the existing daily job, not a new timer', () => {
    // A new scheduled process is one more thing that can itself die silently.
    const i = src.indexOf('async function pruneCronClaims')
    expect(src.slice(i, i + 900)).toContain('checkStaleJobs')
  })

  it('a history read failure ALERTS rather than staying quiet', () => {
    // Unable to evaluate the throttle must mean "tell them", never "say nothing".
    const i = src.indexOf('async function alertOnCronFailure')
    expect(src.slice(i, i + 1600)).toContain('alerting without the throttle')
  })
})
