// #445 — money-fence maths, extracted pure so the granted-size ladder is unit-tested
// without a DB. This MIRRORS the LEAST() logic inside the try_spend_sourcing RPC
// (20260711_sourcing_fences.sql); the RPC is the atomic source of truth, this is the
// same computation for tests + any client-side estimate. Keep the two in sync.

export const PDL_RATE_USD = 0.28          // PDL $/record (verified 10 Jul: $280/1000)
export const SOURCING_DAILY_CAP = 100     // records/client/day (second fence)
export const TRIAL_SEED = 10              // records granted at signup
export const TRIAL_LIFETIME_CAP = 20      // hard cap on total trial records granted
export const REVEAL_DRIP = 2              // trial records unlocked per reveal
export const COVERAGE_K = 2               // paid records of allowance per $1 collected

/** Remaining global budget expressed in records. */
export function monthRoomRecords(capUsd: number, monthSpentUsd: number, rate = PDL_RATE_USD): number {
  return Math.max(0, Math.floor((capUsd - monthSpentUsd) / rate))
}

/** Remaining daily per-client budget in records. */
export function dayRoomRecords(recordsSourcedToday: number, dailyCap = SOURCING_DAILY_CAP): number {
  return Math.max(0, dailyCap - recordsSourcedToday)
}

/** The granted batch size — LEAST of every limiter. 0 = refused. */
export function computeGrantedSize(input: {
  requested: number
  allowance: number
  monthRoom: number
  dayRoom: number
}): number {
  const { requested, allowance, monthRoom, dayRoom } = input
  if (!(requested > 0)) return 0
  const granted = Math.min(requested, Math.max(0, allowance), monthRoom, dayRoom)
  return granted > 0 ? granted : 0
}

/** Trial drip amount: +2 per reveal, capped so lifetime trial grants never exceed 20. */
export function trialDripAmount(trialGrantedSoFar: number): number {
  return Math.min(REVEAL_DRIP, Math.max(0, TRIAL_LIFETIME_CAP - trialGrantedSoFar))
}

/** Records of paid allowance earned by a collected USD amount (coverage k=2). */
export function allowanceForUsd(usd: number): number {
  return Math.max(0, Math.round(usd * COVERAGE_K))
}
