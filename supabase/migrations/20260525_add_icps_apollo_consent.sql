-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add apollo_only_consented column to icps table
-- Date:      2026-05-25
-- Issue:     Column referenced in code but missing from live DB schema cache,
--            causing "Could not find the 'apollo_only_consented' column" error
--            on every ICP save.
--
-- Run in: Supabase SQL Editor → New Query → Paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add column with a safe default (idempotent)
ALTER TABLE public.icps
  ADD COLUMN IF NOT EXISTS apollo_only_consented BOOLEAN NOT NULL DEFAULT true;

-- 2. Backfill any existing rows (already covered by DEFAULT but belt-and-suspenders)
UPDATE public.icps
  SET apollo_only_consented = true
  WHERE apollo_only_consented IS NULL;

-- Verify
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'icps'
  AND column_name  = 'apollo_only_consented';
