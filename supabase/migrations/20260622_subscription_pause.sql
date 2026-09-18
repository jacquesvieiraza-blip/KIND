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

-- ── ⛓️ 18 Sep 2026 (P6 §8.2 · journey 1) — THE SAME STEP, FOR BOTH SHAPES ───────────
--
-- 🛑 THIS MIGRATION REPORTED "applied" AND CHANGED NOTHING WHERE IT MATTERED. The enum
-- type `subscription_status` exists in the repo's baseline snapshot, so `ALTER TYPE …
-- ADD VALUE` SUCCEEDS — but `subscriptions.status` there is a TEXT column carrying
-- `subscriptions_status_check` (staging-schema.sql:38), which still permitted only
-- active/inactive/trialing/past_due/cancelled. Widening a type the column does not use
-- is a no-op wearing a success.
--
-- 🛑 WHAT IT COST: `/auth/onboard` writes the dormant entitlement row at status
-- 'paused' (signup-subscription.ts), so on any database built from this repo's own
-- replay every new signup failed with `subscriptions_status_check (23514)` — HTTP 500,
-- AFTER the client row had been created, leaving a half-made account. Found by walking
-- journey 1 against a real PostgreSQL; the unit suite cannot see it, because a mocked
-- client has no constraints.
--
-- ⚠️ PRODUCTION IS UNCHANGED BY THE NEW BRANCH. Where the column really is the enum —
-- which the note below records as prod's shape — the first branch runs and does exactly
-- what it always did. The second branch only fires where a CHECK is what constrains the
-- column, and it PRESERVES every value already listed rather than replacing the list.
--
-- ⚠️ LIVE SCHEMA = ENUM. Production `subscriptions.status` is a Postgres enum
--   type (`subscription_status`), NOT a text+CHECK column (the repo schema.sql
--   drifted from prod). A new status is therefore added with `ALTER TYPE ... ADD
--   VALUE`, not by widening a CHECK constraint. The earlier CHECK-based version
--   failed in prod with: invalid input value for enum subscription_status: "paused".

-- 1) Add 'paused' wherever this database keeps the allowed statuses.
DO $$
DECLARE
  col_type text;
  existing  text;
BEGIN
  -- The enum, when one exists — unchanged behaviour, and harmless when it is unused.
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'paused';
  END IF;

  SELECT data_type INTO col_type
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'status';

  -- The CHECK, when the column is text and a constraint is what limits it.
  IF col_type IN ('text', 'character varying') THEN
    SELECT pg_get_constraintdef(oid) INTO existing
      FROM pg_constraint
     WHERE conrelid = 'public.subscriptions'::regclass AND conname = 'subscriptions_status_check';

    IF existing IS NOT NULL AND position('''paused''' in existing) = 0 THEN
      ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_status_check;
      ALTER TABLE public.subscriptions
        ADD CONSTRAINT subscriptions_status_check
          CHECK (status IN ('active', 'inactive', 'trialing', 'past_due', 'cancelled', 'paused'));
    END IF;
  END IF;
END $$;

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
