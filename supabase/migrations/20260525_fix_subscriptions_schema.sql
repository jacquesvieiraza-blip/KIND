-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Fix subscriptions schema drift
-- Date:      2026-05-25
-- Issue:     Live DB is missing amount_usd column and amount_zar has no DEFAULT.
--            This caused all new signups to fail (NOT NULL violation on amount_zar).
--            Paid subscription activation and MRR calculations also broken.
--
-- Run in: Supabase SQL Editor → New Query → Paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Remove amount_usd if it somehow partially exists (idempotent)
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS amount_usd;

-- 2. Ensure amount_zar has a DEFAULT so inserts without it don't blow up
ALTER TABLE public.subscriptions
  ALTER COLUMN amount_zar SET DEFAULT 0;

-- 3. Backfill any NULLs that slipped through (shouldn't be any, but safe)
UPDATE public.subscriptions
  SET amount_zar = 0
  WHERE amount_zar IS NULL;

-- 4. Enforce NOT NULL now that defaults are set
ALTER TABLE public.subscriptions
  ALTER COLUMN amount_zar SET NOT NULL;

-- Verify
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'subscriptions'
  AND column_name  IN ('amount_zar', 'amount_usd')
ORDER BY column_name;
