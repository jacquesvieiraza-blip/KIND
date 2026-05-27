-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: AI lead enrichment table
-- Date:      2026-05-27
-- What it does:
--   Adds lead_enrichment table — stores Claude-researched signals per lead:
--   recent signal, company context, personalised opening line, enrichment score.
--   Used by the "Enrich" button in the leads table (POST /leads/:id/enrich).
-- Run in: Supabase SQL Editor → New Query → Paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lead_enrichment (
  lead_id           text PRIMARY KEY REFERENCES public.leads(id) ON DELETE CASCADE,
  recent_signal     text,
  company_context   text,
  opening_line      text,
  enrichment_score  int CHECK (enrichment_score BETWEEN 1 AND 10),
  enriched_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_enrichment_enriched_at_idx
  ON public.lead_enrichment (enriched_at DESC);

ALTER TABLE public.lead_enrichment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role bypass" ON public.lead_enrichment
  FOR ALL USING (true);

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'lead_enrichment'
ORDER BY column_name;
