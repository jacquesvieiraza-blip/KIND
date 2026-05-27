-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: ABM named-account targeting for ICPs
-- Date:      2026-05-27
-- What it does:
--   Adds organization_names column to icps table — array of company names
--   for ABM (Account-Based Marketing) mode. When set, Apollo search is
--   scoped to contacts at these specific companies only.
-- Run in: Supabase SQL Editor → New Query → Paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.icps
  ADD COLUMN IF NOT EXISTS organization_names text[] DEFAULT '{}';

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'icps'
  AND column_name = 'organization_names';
