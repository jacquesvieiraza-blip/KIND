-- 20260716_pool_integrity.sql
-- The lead pool must contain ONLY genuinely bought records. Before this, the
-- backfill (20260712) swept in ALL emailed leads incl. demo/showcase fakes with
-- source='backfill'. This locks provenance going forward so junk can never re-enter.
--
-- Idempotent + additive. Ordering note: run the clean-slate purge
-- (supabase/maintenance/2026-07-12_clean_slate.sql PHASE C) to remove legacy
-- 'backfill' rows; this migration tolerates them until then via a NOT VALID check.

-- Unknown-provenance rows → 'manual' (NOT 'pdl' — never mislabel unknown as bought).
UPDATE public.lead_pool SET source = 'manual' WHERE source IS NULL;

-- NO default: every writer must state provenance explicitly. A missing source
-- now errors loudly instead of being silently mislabeled as bought.
ALTER TABLE public.lead_pool ALTER COLUMN source DROP DEFAULT;
ALTER TABLE public.lead_pool ALTER COLUMN source SET NOT NULL;

-- Only these three provenances may EVER be written. NOT VALID = enforced on new
-- writes immediately (blocks 'backfill'), legacy rows tolerated until the purge.
ALTER TABLE public.lead_pool DROP CONSTRAINT IF EXISTS lead_pool_source_chk;
ALTER TABLE public.lead_pool ADD CONSTRAINT lead_pool_source_chk
  CHECK (source IN ('pdl','apollo','manual')) NOT VALID;
