-- 20260710_figsy_merge_settings.sql
-- M0 · #391 (AR-61) — CRON JSONB CLOBBER. The adaptive-send and A/B-winner crons read
-- a campaign's `settings` jsonb, then later write `{ ...settings, oneKey: val }` back
-- WHOLESALE. Any key a concurrent UI save (or a founder-set pause) wrote in between is
-- silently dropped by that stale-blob overwrite — which is how a founder pause gets
-- resurrected and sends resume unexpectedly.
--
-- Fix: merge only the changed keys at the DB, against the CURRENT row value, in one
-- atomic statement. `settings || patch` is jsonb concat — it overwrites just the keys
-- present in `patch` and leaves every other key exactly as last committed.
--
-- Run on STAGING (kind-staging) first, then PRODUCTION.

CREATE OR REPLACE FUNCTION public.figsy_merge_settings(p_campaign_id uuid, p_patch jsonb)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.figsy_campaigns
     SET settings = COALESCE(settings, '{}'::jsonb) || p_patch
   WHERE id = p_campaign_id;
$$;
