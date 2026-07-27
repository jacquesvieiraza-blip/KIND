// #343 — ONE PROCESS RUNS EACH SCHEDULED JOB. EXACTLY ONE.
//
// `startCrons()` ran on every API process with no gate of any kind, so scaling the API to
// two replicas doubled **every email, every charge and every digest** — a client billed
// twice, a prospect emailed twice, on a schedule, silently. The System screen has carried
// the warning for weeks: *"Railway → @kind/api → Settings → Replicas. If it is >1, every
// cron in cron.ts double-fires."*
//
// ── WHY THE ENV VAR ALONE IS NOT THE FIX ────────────────────────────────────────────────
//
// The obvious answer is `RUN_CRONS=true` on one service. It is worth having, and it is here.
// But it CANNOT deliver "two replicas can never double-send", because **Railway variables
// are set per SERVICE and every replica of that service inherits them**. Set `RUN_CRONS=true`
// on @kind/api and scale to two, and both replicas read `true` and both fire. There is no
// per-replica override; a process can read its own `RAILWAY_REPLICA_ID` but never how many
// replicas exist, which is why the System screen reports that row as NOT-MEASURED.
//
// So the env var is a KILL SWITCH and a way to keep crons off other services — genuinely
// useful, and not a singleton.
//
// ── WHAT ACTUALLY MAKES IT "NEVER" ──────────────────────────────────────────────────────
//
// The guarantee has to live somewhere both replicas can see, which means the database. Each
// job claims its scheduled minute by INSERTing a row whose primary key is (job, slot). The
// insert is atomic: the first process wins, every other gets a unique violation and stands
// down. Two replicas, ten replicas, a replica plus a manual restart firing the same tick —
// one execution. That is the same shape as the `(enrollment_id, step)` backstop from #354,
// which is already the reason sequence sends survive a race.
//
// ── AND WHAT HAPPENS WHEN THE CLAIM CANNOT BE MADE ──────────────────────────────────────
//
// If the table is missing (the migration has not been run — #558's recurring problem), the
// job RUNS ANYWAY and the founder is alerted. That is a deliberate, uncomfortable choice:
// failing closed would stop every send, digest, drip and charge across the whole business
// the moment a migration lagged a deploy, to prevent a doubling that only occurs above one
// replica. Silent total automation death is the worse failure, and this codebase has been
// bitten by the silent kind repeatedly. It is only safe because it is LOUD.

export type CronsEnabled = { enabled: boolean; reason: string }

/**
 * Should this process schedule the crons at all?
 *
 * UNSET MEANS ON. A missing variable must not stop every send, digest and charge in the
 * business — that is the failure nobody notices until a client asks where their leads went.
 * Doubling is prevented by the claim below, not by this, so defaulting to ON costs nothing
 * in safety and removes a footgun that would otherwise fire on the next deploy.
 *
 * A value we do not understand also means ON, for the same reason: `RUN_CRONS=fasle` should
 * not silently disable the company.
 */
export function cronsEnabled(raw: string | undefined): CronsEnabled {
  if (raw === undefined || raw.trim() === '') {
    return { enabled: true, reason: 'RUN_CRONS is not set — crons run (the default; a missing variable must never silently stop every scheduled job)' }
  }
  const v = raw.trim().toLowerCase()
  if (['false', '0', 'no', 'off'].includes(v)) {
    return { enabled: false, reason: `RUN_CRONS=${raw.trim()} — crons are DISABLED on this process` }
  }
  if (['true', '1', 'yes', 'on'].includes(v)) {
    return { enabled: true, reason: `RUN_CRONS=${raw.trim()} — crons run on this process` }
  }
  return { enabled: true, reason: `RUN_CRONS=${raw.trim()} is not a value I understand — crons run, because guessing "off" from a typo would stop the whole business` }
}

/**
 * The scheduled minute a fire belongs to, as an ISO string — the second half of the claim key.
 *
 * ROUNDED TO THE NEAREST MINUTE, NOT TRUNCATED. Two replicas fire the same schedule from two
 * clocks; truncation puts 07:59:59.8 and 08:00:00.2 into DIFFERENT slots, both claims succeed,
 * and the job runs twice — the exact bug, reintroduced by a rounding choice. Rounding puts any
 * pair within ±30s of each other into the same slot.
 */
export function slotFor(at: Date): string {
  return new Date(Math.round(at.getTime() / 60000) * 60000).toISOString()
}

export type ClaimOutcome =
  /** This process won the slot — run the job. */
  | { kind: 'claimed' }
  /** Another process already has this slot — stand down, and this is NOT an error. */
  | { kind: 'taken' }
  /** The claim could not be made at all. The job runs anyway; see the header. */
  | { kind: 'unavailable'; why: string; missingTable: boolean }

/**
 * Read a Postgres error into one of the three outcomes.
 *
 * Kept pure and separate from the insert so every branch is testable without a database —
 * and because the branch that matters most (a unique violation is SUCCESS, not failure) is
 * exactly the kind of inversion that looks wrong in review and is right in production.
 */
export function readClaimError(error: { code?: string | null; message?: string | null } | null): ClaimOutcome {
  if (!error) return { kind: 'claimed' }
  const code = error.code ?? ''
  const msg = error.message ?? 'unknown error'
  // 23505 = unique_violation. Somebody else claimed this slot first. Working as designed.
  if (code === '23505' || /duplicate key|already exists/i.test(msg)) return { kind: 'taken' }
  // PGRST205 / 42P01 = the table is not there. The migration has not been run.
  const missingTable = code === '42P01' || code === 'PGRST205' ||
    /relation .* does not exist|could not find the table|schema cache/i.test(msg)
  return { kind: 'unavailable', why: msg, missingTable }
}

/** Who claimed it — for the audit trail when two replicas are in play. */
export function claimantId(env: NodeJS.ProcessEnv = process.env): string {
  return env.RAILWAY_REPLICA_ID?.slice(0, 12)
    ?? env.HOSTNAME?.slice(0, 12)
    ?? `pid-${process.pid}`
}
