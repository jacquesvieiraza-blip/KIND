-- 20260710_trial_expiry_once.sql
-- M0 · #353 (AR-15) — TRIAL-EXPIRY SPAM. The trial-expiry cron's "Your trial has ended"
-- branch fires for every subscription still status='trialing' with a past trial_ends_at
-- — so once a trial lapses the client is emailed the SAME "it ended" message EVERY day,
-- forever, with no terminal state. This adds a one-shot marker the cron stamps after the
-- ended-email goes out, so it sends exactly once.
--
-- Run on STAGING (kind-staging) first, then PRODUCTION.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_expiry_notified_at timestamptz;
