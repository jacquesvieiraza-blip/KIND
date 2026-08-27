import cron from 'node-cron'
import { db } from '@kind/db'
import { sendFounderAlert } from './lib/alerts'
import { cronsEnabled, slotFor, readClaimError, claimantId, type ClaimOutcome } from './lib/cron-guard'

const PORT       = process.env.PORT || 4000
const API_BASE   = `http://localhost:${PORT}`
const ADMIN_KEY  = process.env.ADMIN_SECRET_KEY

// #343 — CLAIM THE SLOT, OR STAND DOWN.
//
// Every replica of the API schedules the same jobs and fires them at the same instant. The
// only place two processes can agree on which of them goes ahead is the database: the claim
// is an INSERT whose primary key is (job, slot), so the first one wins and every other gets
// a unique violation. See lib/cron-guard.ts for why the env var alone cannot do this.
// Exported for the test that proves the RACE is actually settled — a source scan can show
// the claim is called, never that a second caller stands down.
export async function claimCronSlot(job: string, at: Date): Promise<ClaimOutcome> {
  const slot = slotFor(at)
  try {
    const { error } = await db.from('cron_claims').insert({
      job, slot, claimed_by: claimantId(),
    })
    return readClaimError(error)
  } catch (err) {
    return { kind: 'unavailable', why: err instanceof Error ? err.message : String(err), missingTable: false }
  }
}

// The claim table missing means the migration has not been run. The job RUNS ANYWAY —
// failing closed would stop every send, digest, drip and charge across the business to
// prevent a doubling that only happens above one replica — so this alert is the entire
// safety net and must actually arrive. Deduped to once per process, like the admin-key one.
let alertedClaimUnavailable = false
function reportClaimUnavailable(job: string, outcome: Extract<ClaimOutcome, { kind: 'unavailable' }>): void {
  console.error(`[cron] could not claim a slot for ${job} — RUNNING ANYWAY. ${outcome.why}`)
  if (alertedClaimUnavailable) return
  alertedClaimUnavailable = true
  void sendFounderAlert('api_down', 'Cron single-run guard is NOT protecting anything', [
    `The scheduled job "${job}" could not claim its slot: ${outcome.why}`,
    outcome.missingTable
      ? 'The cron_claims table does not exist — run the pending migrations from Vida → Engine (20260727_cron_claims).'
      : 'The database could not be reached for the claim.',
    'Jobs are still running, deliberately — stopping every send and charge is worse than the risk.',
    'BUT while this persists, if @kind/api has more than one replica, every email and every charge fires TWICE.',
    'Check Railway → @kind/api → Settings → Replicas until this is resolved.',
  ])
}

// Run-history: record one row per cron execution into cron_runs so the admin
// Engine/health page can show a real last-run-per-job panel. Best-effort — never
// throws into the job, and if the table doesn't exist yet (migration not run) the
// insert simply errors and is swallowed.
async function recordCronRun(job: string, startedAt: string, ok: boolean, note: string): Promise<void> {
  try {
    await db.from('cron_runs').insert({
      job,
      started_at:  startedAt,
      finished_at: new Date().toISOString(),
      ok,
      note: note.slice(0, 500),
    })
  } catch (err) {
    console.error(`[cron] failed to record run for ${job}:`, err instanceof Error ? err.message : err)
  }
}

// #491 — THE FAILURE ALERT. `cron_runs` and `dead_letter` are both PULL surfaces: true the
// moment they are written, and read only when somebody thinks to look. So a job that starts
// failing keeps failing on schedule and the first person to find out is the client whose
// leads stopped arriving.
//
// The throttle rides in `cron_runs.note` (see ALERTED_MARKER) rather than in memory,
// because this process restarts on every deploy — which is exactly when a cron is most
// likely to be broken, so an in-memory counter would reset at the worst possible moment.
// Every judgement lives in `lib/cron-health.ts` and is unit-tested; this half only fetches.
//
// Returns the note to record, with the marker appended when an alert actually went out —
// so the throttle records the truth (an alert was sent) rather than an intention.
async function alertOnCronFailure(job: string, note: string): Promise<string> {
  try {
    const { shouldAlertFailure, failureAlertLines, ALERTED_MARKER } = await import('./lib/cron-health')
    // This job's recent history, newest first. 20 rows is far more than the 24h window needs
    // even for the every-2-hours send job, and it is one indexed read per FAILURE only.
    const { data, error } = await db.from('cron_runs')
      .select('job, started_at, ok, note')
      .eq('job', job)
      .order('started_at', { ascending: false })
      .limit(20)
    if (error) {
      // Cannot read the history → cannot evaluate the throttle. ALERT ANYWAY: a duplicate
      // alert is an annoyance, a silent dead cron is the bug this item exists to remove.
      console.error(`[cron] could not read run history for ${job} — alerting without the throttle:`, error.message)
      await sendFounderAlert('api_down', `Scheduled job failed — ${job}`,
        failureAlertLines(job, note, 'the run history could not be read, so this alert is not throttled'))
      return `${ALERTED_MARKER} ${note}`
    }

    const decision = shouldAlertFailure((data ?? []) as never, new Date())
    if (!decision.alert) {
      console.warn(`[cron] ${job} failed — not alerting: ${decision.why}`)
      return note
    }
    await sendFounderAlert('api_down', `Scheduled job failed — ${job}`, failureAlertLines(job, note, decision.why))
    console.warn(`[cron] ${job} failed — founder alerted: ${decision.why}`)
    return `${ALERTED_MARKER} ${note}`
  } catch (err) {
    // The alert path must never take the cron down with it.
    console.error(`[cron] failure-alert path threw for ${job}:`, err instanceof Error ? err.message : err)
    return note
  }
}

// #491 — THE OTHER WAY A JOB STOPS: it never runs at all, so there is no failed row to
// alert on. That is the claim-then-crash path #343 introduced — a process claims the slot
// (an INSERT, so the slot is taken), then dies before finishing; every other replica
// correctly stands down and the job simply does not happen. It is also what a dead
// scheduler or a stray RUN_CRONS=false looks like.
//
// Runs inside the existing daily prune job rather than as a new scheduled process: one more
// timer is one more thing that can itself die silently, and this check is cheap.
async function checkStaleJobs(): Promise<void> {
  try {
    const { staleJobs, staleAlertLines } = await import('./lib/cron-health')
    const { data, error } = await db.from('cron_runs')
      .select('job, started_at, ok, note')
      .order('started_at', { ascending: false })
      .limit(1000)
    if (error || !data) return   // no history (migration not run) → nothing provable to say

    const byJob: Record<string, { job: string; started_at: string | null; ok: boolean | null; note?: string | null }[]> = {}
    for (const row of data as { job: string; started_at: string | null; ok: boolean | null; note: string | null }[]) {
      (byJob[row.job] ??= []).push(row)
    }
    const stale = staleJobs(byJob, new Date())
    if (stale.length === 0) return
    console.error(`[cron] ${stale.length} job(s) have not run:`, stale.map(s => `${s.job} (${s.hoursSince}h)`).join(', '))
    await sendFounderAlert('api_down', `${stale.length} scheduled job(s) have stopped running`, staleAlertLines(stale))
  } catch (err) {
    console.error('[cron] stale-job check failed:', err instanceof Error ? err.message : err)
  }
}

// #390 (AR-60) — record a failed background job durably (dead-letter) so it doesn't just
// vanish after a console.error. Best-effort; never throws into the cron.
async function recordDeadLetter(source: string, error: string, payload?: unknown): Promise<void> {
  try {
    await db.from('dead_letter').insert({ source, error: error.slice(0, 1000), payload: payload ?? null })
  } catch (err) {
    console.error(`[cron] failed to record dead_letter for ${source}:`, err instanceof Error ? err.message : err)
  }
}

// #390 (AR-60) — alert the founder ONCE if the admin key is unset: previously every cron
// silently skipped (console.warn only, no cron_runs row, no signal) → all automation
// dead and nobody knew. Deduped to one alert per process.
let alertedMissingAdminKey = false

async function callInternal(path: string, method: 'GET' | 'POST' = 'POST'): Promise<void> {
  // #343 — claim the slot BEFORE anything else. Cheapest possible check, and it has to come
  // before the admin-key branch: otherwise two replicas with no key would each raise the
  // "all crons are disabled" alert, which is the same duplication one layer over.
  const claim = await claimCronSlot(path, new Date())
  if (claim.kind === 'taken') {
    console.log(`[cron] ${path} — another process already claimed this slot; standing down.`)
    return
  }
  if (claim.kind === 'unavailable') reportClaimUnavailable(path, claim)

  if (!ADMIN_KEY) {
    console.warn(`[cron] ADMIN_SECRET_KEY not set — skipping ${path}`)
    if (!alertedMissingAdminKey) {
      alertedMissingAdminKey = true
      void sendFounderAlert('api_down', 'ALL crons are disabled — ADMIN_SECRET_KEY is not set', [
        `The scheduled jobs (FIGSY sends, digests, credit checks, alerts) cannot run without ADMIN_SECRET_KEY.`,
        `No sends, no digests, no watchdogs are firing. Set ADMIN_SECRET_KEY on the API service.`,
      ])
    }
    return
  }
  const startedAt = new Date().toISOString()
  let ok   = false
  let note = ''
  try {
    const res  = await fetch(`${API_BASE}/internal${path}`, {
      method,
      headers: { 'x-admin-key': ADMIN_KEY, 'content-type': 'application/json' },
    })
    const data = await res.json() as Record<string, unknown>
    ok   = res.ok && data?.success !== false
    note = `HTTP ${res.status} · ${JSON.stringify(data)}`
    console.log(`[cron] ${path} →`, JSON.stringify(data))
  } catch (err) {
    ok   = false
    note = err instanceof Error ? err.message : String(err)
    console.error(`[cron] ${path} failed:`, err)
  } finally {
    // #491 — alert BEFORE recording, so the row we write can carry the marker that says an
    // alert went out. Recording first and updating after would leave a window where a
    // restart loses the marker and the next failure re-alerts.
    const noteToRecord = ok ? note : await alertOnCronFailure(path, note)
    await recordCronRun(path, startedAt, ok, noteToRecord)
    // #390 — a failed run is dead-lettered so it's visible/retryable, not just logged.
    if (!ok) await recordDeadLetter(`cron:${path}`, note)
  }
}

// #285 — sends-stalled watchdog. FIGSY sending runs on /figsy/send-due-all every 2h;
// if that pipeline silently dies (bad API key, crashed worker, DB error) enrollments
// pile up "due" while nothing goes out. This detects that: enrollments that SHOULD have
// sent (enrolled/in_progress with next_send_at in the past) but ZERO real sends in the
// last 6 hours → alert the founder. Guarded to avoid false alarms — it never alerts when
// there is simply nothing due to send. Best-effort; a failure here must not crash the cron.
async function checkSendsStalled(): Promise<void> {
  try {
    // #343 — this one does NOT go through callInternal, so it needs its own claim. Without
    // it two replicas mail the founder the same stall every hour, and an alert that arrives
    // twice is an alert that gets filtered.
    const claim = await claimCronSlot('watchdog:sends-stalled', new Date())
    if (claim.kind === 'taken') return
    if (claim.kind === 'unavailable') reportClaimUnavailable('watchdog:sends-stalled', claim)

    const now      = new Date()
    const sixHrAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString()

    // How many enrollments are overdue right now (should have sent already)?
    const { count: dueCount } = await db.from('figsy_enrollments')
      .select('id', { count: 'exact', head: true })
      .in('status', ['enrolled', 'in_progress'])
      .lte('next_send_at', now.toISOString())

    // Nothing is due — nothing to send, so a lack of sends is NOT a stall. Skip.
    if (!dueCount || dueCount <= 0) return

    // Real sends in the last 6 hours.
    const { count: recentSends } = await db.from('figsy_sent_emails')
      .select('id', { count: 'exact', head: true })
      .gte('sent_at', sixHrAgo)

    if ((recentSends ?? 0) > 0) return  // pipeline is moving — healthy.

    await sendFounderAlert('sends_stalled', 'FIGSY sending has stalled', [
      `${dueCount} enrollment(s) are past due to send, but 0 emails have gone out in the last 6 hours.`,
      'The FIGSY send pipeline (/figsy/send-due-all) may be failing silently — check the API/worker logs and the send provider (Resend) key.',
    ])
    console.warn(`[cron] sends-stalled alert fired — ${dueCount} due, 0 sent in 6h`)
  } catch (err) {
    console.error('[cron] sends-stalled check failed:', err)
  }
}

// #343 — housekeeping for the claims table. Claimed like any other job, so two replicas do
// not both run the delete.
async function pruneCronClaims(): Promise<void> {
  const claim = await claimCronSlot('maintenance:prune-cron-claims', new Date())
  if (claim.kind === 'taken') return
  if (claim.kind === 'unavailable') { reportClaimUnavailable('maintenance:prune-cron-claims', claim); return }
  const cutoff = new Date(Date.now() - 14 * 864e5).toISOString()
  const { error } = await db.from('cron_claims').delete().lt('claimed_at', cutoff)
  if (error) console.error('[cron] pruning cron_claims failed (non-fatal):', error.message)

  // #491 — the scheduler-death detector rides on this daily job. It is already claimed
  // above, so it cannot double-alert across replicas, and it needs no timer of its own.
  await checkStaleJobs()
}

export function startCrons(): void {
  // #343 — the kill switch. This is NOT what stops two replicas doubling (Railway variables
  // are per-service, so every replica reads the same value — the claim above is what does
  // that); it is how crons are kept off a service that should not run them, and how they are
  // switched off in an emergency without a code change. UNSET MEANS ON, deliberately: a
  // missing variable must never silently stop every send, digest and charge in the business.
  const gate = cronsEnabled(process.env.RUN_CRONS)
  console.log(`[cron] ${gate.reason}`)
  if (!gate.enabled) {
    console.warn('[cron] NO JOBS SCHEDULED on this process — no sends, no digests, no drip, no watchdogs.')
    return
  }

  // #607 — RETIRED 1 Aug: the 06:00 trial-nurture and 07:00 trial-expiry schedules are gone.
  // Both drove client-facing email about a 14-day trial that the money model has not had
  // since 24 Jul ($99 pack + $4 per approved lead, one money event). The expiry one was the
  // worse of the two — it emailed real people "your trial ends in 4 days… Subscribe now".
  // The handlers still exist and now refuse with 410 (see routes/internal.ts), so a stale
  // scheduler or a hand-rolled POST cannot resurrect the sequence either.
  // The PAID onboarding activation sequence below is NOT a trial and is untouched.

  // Daily 06:05 UTC — onboarding activation sequence for paid clients (days 0/3/7)
  cron.schedule('5 6 * * *', () => callInternal('/onboarding/activation-sequence'), { timezone: 'UTC' })

  // Daily 06:15 UTC — at-risk client alert
  cron.schedule('15 6 * * *', () => callInternal('/ae/at-risk'), { timezone: 'UTC' })

  // (07:00 trial-expiry retired — see the #607 note above.)

  // Daily 07:15 UTC — zero credits warning
  cron.schedule('15 7 * * *', () => callInternal('/ae/zero-credits'), { timezone: 'UTC' })

  // Every 2 hours — FIGSY send due emails across all clients
  cron.schedule('0 */2 * * *', () => callInternal('/figsy/send-due-all'), { timezone: 'UTC' })

  // Hourly — #358 (F4): re-score leads left UNSCORED by a transient AI-scoring failure
  cron.schedule('20 * * * *', () => callInternal('/figsy/rescore-stranded'), { timezone: 'UTC' })

  // Daily 03:30 UTC — E1: reclaim any $3 work-credit held past its TTL (fail-safe backstop
  // so a client's credit can never be trapped by a stalled/ambiguous enrollment).
  cron.schedule('30 3 * * *', () => callInternal('/figsy/sweep-stale-holds'), { timezone: 'UTC' })

  // Daily 04:00 UTC — #511 Nexus: recompute each client's private learning profile from the
  // day's outcomes (per-client, deterministic, no LLM, no money).
  cron.schedule('0 4 * * *', () => callInternal('/nexus/recompute-all'), { timezone: 'UTC' })

  // Monday 07:00 UTC — weekly client leads digest
  cron.schedule('0 7 * * 1', () => callInternal('/digest/weekly'), { timezone: 'UTC' })

  // Friday 16:00 UTC — weekly founder digest
  cron.schedule('0 16 * * 5', () => callInternal('/cro/weekly-digest'), { timezone: 'UTC' })

  // Daily 08:00 UTC — check FIGSY campaign performance
  cron.schedule('0 8 * * *', () => callInternal('/figsy/check-performance'), { timezone: 'UTC' })

  // Daily 05:00 UTC — FIGSY auto-replenish: alert on campaigns running low
  cron.schedule('0 5 * * *', () => callInternal('/figsy/auto-replenish'), { timezone: 'UTC' })

  // Daily 07:30 UTC — Milla morning brief to all active clients
  cron.schedule('30 7 * * *', () => callInternal('/milla/morning-brief-all'), { timezone: 'UTC' })

  // Daily 08:30 UTC — Milla proactive anomaly detection
  cron.schedule('30 8 * * *', () => callInternal('/milla/check-anomalies'), { timezone: 'UTC' })

  // Monday 06:00 UTC — K.I.N.D self-outreach (FIGSY finds new K.I.N.D prospects)
  cron.schedule('0 6 * * 1', () => callInternal('/cmo/self-outreach'), { timezone: 'UTC' })

  // Daily 08:10 UTC — deliver drip leads (staggered from /figsy/check-performance at 08:00)
  cron.schedule('10 8 * * *', () => callInternal('/leads/drip'), { timezone: 'UTC' })

  // Daily 09:50 UTC — nudge clients whose ICP is approved but unpaid (day 1, 3 and 7 only).
  cron.schedule('50 9 * * *', () => callInternal('/clients/chase-unpaid'), { timezone: 'UTC' })

  // Daily 08:40 UTC — suspend clients who haven't approved anyone in 30 days (we carry a
  // warmed sender for them the whole time), warning them a week out.
  cron.schedule('40 8 * * *', () => callInternal('/clients/cold-check'), { timezone: 'UTC' })

  // ── 🪦 RETIRED 27 Aug 2026 — THE NIGHTLY PAID SOURCING TOP-UP (PR1A) ────────────
  //
  // This line used to read:
  //   cron.schedule('20 8 * * *', () => callInternal('/leads/top-up'), { timezone: 'UTC' })
  //
  // It fired daily at 08:20 UTC, walked EVERY client with a paid transaction and a positive
  // `sourcing_allowance`, and topped their desk back up to 200 undecided leads. Nobody asked
  // for those leads. Every lead a client passed on was replaced the next morning at
  // ~$0.28 a record, and the loop only stopped when the client's allowance ran out.
  //
  // Under the new locked commercial model, sourcing spend requires explicit PROGRAMME
  // AUTHORITY: a client states the outcome they want, approves a quantity and a price, and
  // K.I.N.D sources inside that authorisation. An unattended scheduler holds no such
  // authority, so this trigger cannot exist — not "should be smaller", cannot exist.
  //
  // ⚠️ THIS IS A LATENT BLOCKER, NOT A LIVE FIRE. Paid providers are OFF (R66,
  // `paid-provider-guard.ts` is fail-closed), so this loop is not spending money TODAY. It
  // would begin spending the first morning after PDL is enabled, which is exactly why it is
  // removed BEFORE that switch rather than after.
  //
  // The programme-authority model is NOT built yet and is deliberately not part of this
  // change. Until it exists, paid sourcing happens only on paths a human explicitly
  // triggers: the Stripe payment webhook, the client's own Run button and operator sourcing.
  // `startWorkForClient` itself is untouched — those callers still use it.
  //
  // The endpoint is retired alongside the schedule (see `/leads/top-up` in
  // `routes/internal.ts`), for the reason the trial-retirement precedent above already
  // records: removing a cron line alone leaves a live endpoint any stale scheduler,
  // run-book entry or hand-rolled POST can still fire.

  // Daily 07:40 UTC — low credit warning (staggered from /milla/morning-brief-all at 07:30)
  cron.schedule('40 7 * * *', () => callInternal('/ae/low-credits'), { timezone: 'UTC' })

  // Daily 09:00 UTC — mark lapsed subscriptions (active but period ended)
  cron.schedule('0 9 * * *', () => callInternal('/subscriptions/check-lapsed'), { timezone: 'UTC' })

  // Daily 09:30 UTC — adaptive send volume: auto-adjust limits based on campaign health
  cron.schedule('30 9 * * *', () => callInternal('/figsy/adaptive-send-check'), { timezone: 'UTC' })

  // Daily 10:00 UTC — P2-2 A/B subject line winner check
  cron.schedule('0 10 * * *', () => callInternal('/figsy/ab-winner-check'), { timezone: 'UTC' })

  // P2-6: Daily 11:00 UTC — check intent signals (job change / funding / growth) and auto-enroll
  cron.schedule('0 11 * * *', () => callInternal('/figsy/check-intent-signals'), { timezone: 'UTC' })

  // P3-13: Weekly Sunday 02:00 UTC — aggregate anonymised lead data into African data moat
  cron.schedule('0 2 * * 0', () => callInternal('/data-moat/aggregate'), { timezone: 'UTC' })

  // Daily 05:05 UTC — founder morning brief (07:05 SAST)
  cron.schedule('5 5 * * *', () => callInternal('/founder-brief'), { timezone: 'UTC' })

  // 3× daily status snapshots — writes to platform_status table → admin /status page
  cron.schedule('10 5 * * *', () => callInternal('/status/snapshot'), { timezone: 'UTC' })  // 07:10 SAST
  cron.schedule('0 10 * * *', () => callInternal('/status/snapshot'), { timezone: 'UTC' }) // 12:00 SAST
  cron.schedule('0 17 * * *', () => callInternal('/status/snapshot'), { timezone: 'UTC' }) // 19:00 SAST

  // Daily 08:30 UTC — P3-6 churn risk scoring
  cron.schedule('30 8 * * *', () => callInternal('/ae/churn-risk-check'), { timezone: 'UTC' })

  // #285: Hourly (:20) — sends-stalled watchdog. Alerts the founder if FIGSY sending
  // has stalled (enrollments overdue but zero sends in the last 6 hours).
  cron.schedule('20 * * * *', () => { void checkSendsStalled() }, { timezone: 'UTC' })

  // #343 — Daily 02:30 UTC: drop claim rows older than 14 days. The claims table only needs
  // enough history to settle a race that lasts milliseconds; keeping it forever would grow
  // a row per job per day with nothing ever reading it. Written as a scheduled job rather
  // than a database function because a function nothing calls is not housekeeping, it is
  // dead code that reads like housekeeping.
  cron.schedule('30 2 * * *', () => { void pruneCronClaims() }, { timezone: 'UTC' })

  // Daily 04:00 UTC — #287 MRR daily snapshot → metrics_daily (MRR-over-time + movement)
  cron.schedule('0 4 * * *', () => callInternal('/metrics/snapshot'), { timezone: 'UTC' })

  // COUNTED, NOT TYPED. This line read "25 jobs scheduled" while 33 were scheduled — a
  // number nobody recounts after adding a job, printed at startup with total confidence.
  // node-cron's task registry is the only thing that actually knows.
  console.log(`[cron] ${cron.getTasks().size} jobs scheduled · claimed per-slot in cron_claims, so extra replicas stand down`)
}
