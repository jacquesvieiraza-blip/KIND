-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Full leads table schema sync
-- Date:      2026-05-28
--
-- The leads table was created from an early version of schema.sql that was
-- missing many columns. This migration adds all columns present in the
-- current schema.sql that may not exist in the live DB.
-- All statements use IF NOT EXISTS — safe to run multiple times.
-- ─────────────────────────────────────────────────────────────────────────────

-- Identity / contact
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS icp_id            UUID REFERENCES public.icps(id);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS phone             TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS job_title         TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company           TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS linkedin_url      TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS country           TEXT;

-- Enrichment
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company_size      TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS industry          TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS seniority         TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tech_stack        TEXT[];
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS apollo_id         TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS apollo_consented  BOOLEAN NOT NULL DEFAULT false;

-- Scoring
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS score             INTEGER CHECK (score >= 0 AND score <= 100);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS score_reasoning   TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS scored_at         TIMESTAMPTZ;

-- Outreach
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ai_email_draft    TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS outreach_sent_at  TIMESTAMPTZ;

-- Consent / POPIA
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS consent_sent_at   TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS consent_given_at  TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS opted_out_at      TIMESTAMPTZ;

-- CRM
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS crm_synced        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS crm_contact_id    TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS exported_at       TIMESTAMPTZ;

-- Pipeline
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS estimated_deal_value_usd INTEGER;

-- Drip delivery gate (added separately but include here for completeness)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS delivered_at      TIMESTAMPTZ DEFAULT NULL;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'leads'
ORDER BY ordinal_position;
