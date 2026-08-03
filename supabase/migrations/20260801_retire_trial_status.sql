-- #607 — RETIRE THE TRIAL STATE: grandfather the rows that already carry it.
--
-- From 1 Aug a signup writes `status='paused'` (dormant until the $99 pack lands) instead of
-- `status='trialing'` with a 14-day `trial_ends_at`. See apps/api/src/lib/signup-subscription.ts
-- for why `paused` and not an invented value: `subscriptions.status` is a Postgres ENUM, and
-- writing a value it has never heard of raises 22P02 — which is #342, still live elsewhere in
-- this repo (the lapse cron writes 'lapsed', a value in no migration, and 500s daily).
--
-- The founder's instruction was that existing rows are grandfathered EXPLICITLY, never
-- silently. This file is the explicit half. Until it runs:
--   • `statusGrantsAccess()` still returns true for 'trialing', so nothing an existing account
--     can reach is withdrawn the moment the code deploys;
--   • `/internal/status/snapshot` reports the remaining count as `legacy_trialing`, so the
--     number is watched to zero rather than assumed.
--
-- IDEMPOTENT: re-running it is a no-op once no 'trialing' rows remain.
--
-- ⚠️ RECORDING A MIGRATION IS NOT RUNNING ONE. The product applies `PENDING_MIGRATIONS` in
-- apps/api/src/lib/pending-migrations.ts, never this directory (.sql is not copied into dist/).
-- This migration is registered there too — run it from Vida → Engine → Run migrations.

BEGIN;

-- Convert the legacy trial rows to dormant. `trial_ends_at` is cleared in the same statement:
-- a trial end date on a row that is not a trial is exactly what fed the retired expiry cron
-- its "4 days left" arithmetic, so leaving it behind would keep that sentence computable.
UPDATE subscriptions
   SET status         = 'paused',
       trial_ends_at  = NULL
 WHERE status = 'trialing';

-- `current_period_end` is deliberately NOT cleared here. It is history — when the row's period
-- was believed to end — and no live query reads it for a paused row (the /status at-risk check
-- now filters on status='active'). Blanking it would destroy the only record of what the trial
-- had been set to, which is the opposite of grandfathering.

COMMIT;
