-- #453 — DEMO MODE. A client flagged is_demo costs us $0 (pool-only sourcing, free
-- off-ledger reveals, sandboxed FIGSY work) and can NEVER email a real prospect, and
-- the admin Money Path excludes it from real economics. This migration owns ONLY the
-- column; the founder tags accounts himself from the admin Money Path toggle (no
-- name-matching here — that risks mislabeling a real client). Idempotent; the column
-- already exists on most environments (20260518_demo_environments.sql created it as a
-- nullable default-false flag) — this hardens the contract to NOT NULL DEFAULT false.
-- Run on staging first, then prod.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- Harden pre-existing nullable installs: backfill any NULLs, then enforce NOT NULL.
UPDATE public.clients SET is_demo = false WHERE is_demo IS NULL;

DO $$
BEGIN
  ALTER TABLE public.clients ALTER COLUMN is_demo SET DEFAULT false;
  ALTER TABLE public.clients ALTER COLUMN is_demo SET NOT NULL;
EXCEPTION WHEN others THEN
  -- Already NOT NULL / default set on a prior run — safe to ignore (idempotent).
  NULL;
END $$;
