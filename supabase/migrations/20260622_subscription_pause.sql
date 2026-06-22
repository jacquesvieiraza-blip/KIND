-- Item 190 — graceful PAUSE on the cancel path (1–3 month hold instead of cancel).
-- Adds a 'paused' subscription status and pause/resume timestamps, so we can STOP
-- billing while KEEPING the client's data + settings warm (no delete, no churn).
--
-- ⚠️ LIVE SCHEMA = ENUM. Production `subscriptions.status` is a Postgres enum
--   type (`subscription_status`), NOT a text+CHECK column (the repo schema.sql
--   drifted from prod). A new status is therefore added with `ALTER TYPE ... ADD
--   VALUE`, not by widening a CHECK constraint. The earlier CHECK-based version
--   failed in prod with: invalid input value for enum subscription_status: "paused".
--
-- Additive + idempotent. Does NOT touch billing/charge logic.

-- 1) Add 'paused' to the existing enum type.
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'paused';

-- 2) Pause/resume timestamps.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS paused_until timestamptz;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS paused_at timestamptz;

-- 3) Index so the resume sweep (founder cron) can find subscriptions due to resume.
--    No `WHERE status = 'paused'` predicate: referencing a just-added enum value in
--    the same transaction is unsafe in Postgres, so the index is unfiltered.
CREATE INDEX IF NOT EXISTS subscriptions_paused_until_idx
  ON public.subscriptions (paused_until);
