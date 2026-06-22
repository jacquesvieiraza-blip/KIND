-- Item 190 — graceful PAUSE on the cancel path (1–3 month hold instead of cancel).
-- Adds a 'paused' subscription status and a resume date, so we can STOP billing
-- while KEEPING the client's data + settings warm (no delete, no churn).
--
-- ⚠️ NOT YET APPLIED TO THE LIVE DB. Flagged for the founder to run.
--   This migration is additive + idempotent and does NOT touch billing/charge logic.
--   The `status` CHECK constraint must be widened to include 'paused' before the
--   POST /subscriptions/:id/pause endpoint can write the paused state.

-- 1) Resume date — when a paused subscription should automatically resume billing.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS paused_until timestamptz;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS paused_at timestamptz;

-- 2) Widen the status CHECK constraint to allow 'paused'.
--    Drop the old constraint (name is the Postgres default) and re-add it.
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active','inactive','trialing','past_due','cancelled','paused'));

-- 3) Index so the resume sweep (founder cron) can find subscriptions due to resume.
CREATE INDEX IF NOT EXISTS subscriptions_paused_until_idx
  ON public.subscriptions (paused_until)
  WHERE status = 'paused';
