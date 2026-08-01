-- ═══════════════════════════════════════════════════════════════════════════════
-- CONSOLIDATED HERE 31 Jul 2026 (#273) — original: apps/api/src/migrations/20260722_review_gate_producer.sql
-- ═══════════════════════════════════════════════════════════════════════════════
-- The SQL below this header is BYTE-IDENTICAL to the original. Nothing was rewritten,
-- reordered or "fixed" on the way in: a migration that has (or has not) been applied to
-- production is a historical fact, and editing it while copying would destroy the only
-- record of what was actually run.
--
-- The original file still exists and carries a tombstone header pointing here. A test
-- (`migration-home.test.ts`) asserts the two bodies stay identical, so editing one copy
-- without the other fails the gate — which is the duplication risk turned into a guard.
-- ═══════════════════════════════════════════════════════════════════════════════

-- #15 — wire the co-pilot (review_required) gate to a real producer + approval send.
-- The approval queue previously had no producer and no send-on-approve; the send path
-- now enqueues drafts here when a campaign is in co-pilot mode, and the approve endpoint
-- re-enters the send path to actually deliver. That re-entry needs the enrollment +
-- sequence context, so the queue row must carry it.
ALTER TABLE public.figsy_approval_queue
  ADD COLUMN IF NOT EXISTS enrollment_id  UUID,
  ADD COLUMN IF NOT EXISTS total_steps    INTEGER,
  ADD COLUMN IF NOT EXISTS wait_days_next INTEGER;

-- One PENDING review row per enrollment-step: a re-run of the same step (overlapping
-- cron / manual send-now) must not pile up duplicate drafts. Partial unique index over
-- pending rows only, so approved/sent/rejected history is unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS uq_approval_pending_enrollment_step
  ON public.figsy_approval_queue(enrollment_id, sequence_step)
  WHERE status = 'pending';
