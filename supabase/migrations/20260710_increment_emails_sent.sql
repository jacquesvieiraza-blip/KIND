-- 20260710_increment_emails_sent.sql
-- M0 · #383 (AR-45) — MISSING SEND-COUNTER RPC. sendSequenceEmail() calls
-- db.rpc('increment_figsy_emails_sent', { campaign_id }) to bump the campaign's
-- emails_sent counter atomically, but the function was never defined in any schema —
-- so every send fell through to the racy read-then-write fallback (two concurrent
-- sends both read N and both write N+1, losing a count). This defines the atomic RPC
-- so the fallback becomes the rare exception it was meant to be.
--
-- Returns the new count (so the caller's .maybeSingle() gets a scalar, not an empty set).
-- Run on STAGING (kind-staging) first, then PRODUCTION.

CREATE OR REPLACE FUNCTION public.increment_figsy_emails_sent(campaign_id uuid)
RETURNS integer
LANGUAGE sql
AS $$
  UPDATE public.figsy_campaigns
     SET emails_sent = COALESCE(emails_sent, 0) + 1
   WHERE id = campaign_id
  RETURNING emails_sent;
$$;
