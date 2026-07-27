-- #343 (AR-06) — THE CRON SINGLETON.
--
-- `startCrons()` ran on every API process with no lock and no gate, so scaling @kind/api to
-- two replicas doubled EVERY email, EVERY charge and EVERY digest — a client billed twice, a
-- prospect emailed twice, silently, on a schedule.
--
-- WHY AN ENV VAR IS NOT ENOUGH. The obvious fix is `RUN_CRONS=true` on one service, and it
-- is worth having as a kill switch. But it cannot deliver "two replicas can never double-
-- send", because Railway sets variables per SERVICE and every replica of that service
-- inherits them: both replicas read `true` and both fire. There is no per-replica override —
-- a process can read its own RAILWAY_REPLICA_ID but never how many replicas exist, which is
-- why the System screen reports that row as NOT-MEASURED.
--
-- So the guarantee has to live where both processes can see it: here.
--
-- (job, slot) AS THE PRIMARY KEY *IS* THE LOCK. Each fire INSERTs a claim for its scheduled
-- minute. The first process wins; every other gets a unique violation and stands down. No
-- advisory lock to leak on a crashed connection, no leader election, no heartbeat — just a
-- constraint the database already enforces perfectly. Same shape as the (enrollment_id, step)
-- backstop from #354 that already stops sequence sends doubling.
--
-- `slot` is the fire time ROUNDED to the nearest minute, not truncated — two replicas run off
-- two clocks, and truncation would put 07:59:59.8 and 08:00:00.2 into different slots, both
-- claims succeeding, the job running twice. See lib/cron-guard.ts.
--
-- IDEMPOTENT. Safe to re-run.
--
-- NOTE: also carried as a string in apps/api/src/lib/pending-migrations.ts (key
-- '20260727_cron_claims') and run from Vida → Engine, because the Supabase SQL editor is
-- unreachable. Keep the two in step.

CREATE TABLE IF NOT EXISTS public.cron_claims (
  job        text        NOT NULL,
  slot       timestamptz NOT NULL,
  claimed_by text,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (job, slot)
);

COMMENT ON TABLE public.cron_claims IS
  'One row per (job, scheduled minute). The INSERT is the lock: the first process to claim a slot runs the job, every other gets a unique violation and stands down (#343).';

-- Supports the daily prune (rows older than 14 days are dropped by the
-- maintenance:prune-cron-claims job — a scheduled job rather than a database function,
-- because a function nothing calls is dead code that reads like housekeeping).
CREATE INDEX IF NOT EXISTS cron_claims_claimed_at_idx ON public.cron_claims (claimed_at);

-- RLS on with no policies denies anon/authenticated outright; the service role (the API)
-- bypasses RLS and is the only accessor. Same posture as icp_run_outcomes.
ALTER TABLE public.cron_claims ENABLE ROW LEVEL SECURITY;
