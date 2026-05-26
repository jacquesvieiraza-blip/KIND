-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Lead drip system + client delivery controls
-- Date:      2026-05-26
-- What it does:
--   1. Adds delivered_at to leads — NULL = not yet visible to client
--   2. Adds daily_drip_rate to clients — how many leads to deliver per day (default 5)
--   3. Backfills delivered_at = created_at on all existing leads (so existing
--      clients don't lose visibility of leads they already have)
--
-- Run in: Supabase SQL Editor → New Query → Paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add delivered_at to leads (NULL = pending delivery)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Backfill all existing leads as already delivered
--    (so no existing client loses access to their current leads)
UPDATE public.leads
  SET delivered_at = created_at
  WHERE delivered_at IS NULL;

-- 3. Add daily_drip_rate to clients (how many leads drip per day)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS daily_drip_rate INTEGER DEFAULT 5;

-- 4. Index for fast drip queries (undelivered leads per client)
CREATE INDEX IF NOT EXISTS idx_leads_drip
  ON public.leads (client_id, delivered_at)
  WHERE delivered_at IS NULL;

-- Verify
SELECT
  column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('leads', 'clients')
  AND column_name IN ('delivered_at', 'daily_drip_rate')
ORDER BY table_name, column_name;
