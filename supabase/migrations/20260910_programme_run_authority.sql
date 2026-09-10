-- 20260910_programme_run_authority
-- Canonical copy of the runner entry in apps/api/src/lib/pending-migrations.ts.
-- Run ONLY through the Vida migration runner. Additive, nullable, no backfill, idempotent.
--
-- WHY: Make Live armed and Run started, but only Make Live existed in the data. OUTREACH
-- authority never asked whether Run had been pressed, so LIVE + kill-switch OFF meant the
-- two-hourly cron would send every live programme with no operator Run. NULL fails closed
-- for every existing row on purpose: a backfill would grant the authority this requires.

ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS run_at       timestamptz,
  ADD COLUMN IF NOT EXISTS run_by       text,
  ADD COLUMN IF NOT EXISTS went_live_by text;

COMMENT ON COLUMN public.programmes.run_at IS
  'When an operator pressed Run - the SECOND of the two operator acts, and the only one that permits external delivery. NULL means never run: no send path may select or deliver for this programme, however LIVE it is. Make Live arms (status LIVE + went_live_at) and sends zero; Run starts. Deliberately never backfilled - a backfill would grant the authority this column exists to require.';

COMMENT ON COLUMN public.programmes.run_by IS
  'Who pressed Run. Audit companion to run_at; the operator audit log carries the full row.';

COMMENT ON COLUMN public.programmes.went_live_by IS
  'Who pressed Make Live. Recorded so arming and starting can be told apart by person as well as by time.';
