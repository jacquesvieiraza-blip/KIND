-- 20260710_double_send_guard.sql
-- M0 · #354 (AR-16) — DOUBLE-SEND. Nothing atomically claimed a sequence step before
-- sending, and there was no uniqueness on (enrollment_id, step) — so a cron run and a
-- manual /send-now (or two overlapping crons) could both read an enrollment at step N-1
-- and both send step N to the same prospect.
--
-- Two-part fix:
--   (app)  sendSequenceEmail() now claims the step atomically — UPDATE current_step = N
--          WHERE current_step = N-1 — and bails if it claimed nothing (someone beat it).
--   (db)   this partial unique index is the backstop: even if two runners raced past the
--          claim, the second figsy_sent_emails insert for the same (enrollment_id, step)
--          fails at the store instead of emailing the prospect twice.
--
-- enrollment_id is NULL for day-1 one-off sends (no sequence enrollment) — those are
-- excluded from the constraint via the partial WHERE.
--
-- NOTE: if staging/prod already holds duplicate (enrollment_id, step) rows this index
-- creation will fail — de-dupe first (keep the earliest per pair). On kind-staging this
-- is expected clean. Run on STAGING first, then PRODUCTION.

CREATE UNIQUE INDEX IF NOT EXISTS figsy_sent_emails_enrollment_step_uniq
  ON public.figsy_sent_emails (enrollment_id, step)
  WHERE enrollment_id IS NOT NULL;
