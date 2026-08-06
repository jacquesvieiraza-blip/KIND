-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: leads.source — where a lead came from
-- Date:      2026-08-06
-- Item:      #599
--
-- `lib/lead-import.ts:toLeadRow` has written `source: 'csv_import'` since it was
-- authored. This column was never created. So the CSV importer has never worked,
-- on any file — every attempt died with:
--
--     Could not find the 'source' column of 'leads' in the schema cache
--
-- Found by running the importer on a real file for the first time (A18). Two
-- further queries named the same missing column and failed SILENTLY, because
-- supabase-js returns { error } rather than throwing and both read `.data ?? []`:
-- the client activity feed (figsy.ts /activity) dropped every "N leads added"
-- event, which is indistinguishable from a quiet week.
--
-- NULLABLE, NO DEFAULT. Rows written before today have an unknown provenance and
-- must say so. A DEFAULT would stamp every historic row with a claim nobody
-- verified.
--
-- Runnable from Vida → Engine → Database migrations (the Supabase SQL editor is
-- reached via GitHub OAuth, which the founder's flagged account cannot complete).
-- Idempotent — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS source text;

COMMENT ON COLUMN public.leads.source IS
  'Provenance of the row: ''csv_import'' for an operator upload, NULL for anything written before this column existed (August 2026). Never defaulted — an unverified provenance must read as unknown, not as a claim.';

-- Verify
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'leads'
  AND column_name  = 'source';
