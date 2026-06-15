-- R20 (Apollo) — Job-change alerts on leads.
-- A lead who's changed jobs is a strong re-engagement signal (new company, new
-- budget, warm relationship). These columns record a detected change so it can
-- be surfaced and re-engaged. Automated detection lights up when enrichment keys
-- (PDL/Apollo) are active; until then the record endpoint can be called manually
-- or from a reply ("I've moved to X").
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS job_changed_at   timestamptz,
  ADD COLUMN IF NOT EXISTS previous_company text;
