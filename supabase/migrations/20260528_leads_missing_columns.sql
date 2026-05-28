-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add missing columns to leads table
-- Date:      2026-05-28
--
-- These columns are in schema.sql and used throughout the API (icps.ts inserts
-- them on every ICP run) but were never added via migration, so every real
-- ICP lead insert would silently fail once Apollo is activated.
--
-- Run in: Supabase SQL Editor → New Query → Paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. apollo_consented — tracks whether Apollo marked the lead as opted-in
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS apollo_consented BOOLEAN NOT NULL DEFAULT false;

-- 2. company_size — Apollo employee range string (e.g. "51–200")
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS company_size TEXT;

-- Verify
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'leads'
  AND column_name  IN ('apollo_consented', 'company_size')
ORDER BY column_name;
