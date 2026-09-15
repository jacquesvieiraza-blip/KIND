-- 20260710_founder_alerts.sql
-- M0 · #339 (AR-02) — BLIND ALARM: sendFounderAlert() was itself a phantom sender.
-- resend.emails.send() RETURNS { error } instead of throwing, so an API-level failure
-- (bad recipient, rate limit, rotated key) was swallowed by a try/catch that only
-- catches network throws. It is the stated mitigation for ~15 money-failure paths, so
-- a silently-dead alarm means those failures go unseen.
--
-- Fix: EVERY alert is now written to this durable table regardless of push outcome, so
-- the founder can see it in admin even if both email + Slack fail. email_ok/slack_ok
-- record whether each push channel actually delivered.
--
-- Run on STAGING (kind-staging) first, then PRODUCTION.

CREATE TABLE IF NOT EXISTS public.founder_alerts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL,
  subject     text NOT NULL,
  body        text,
  email_ok    boolean NOT NULL DEFAULT false,
  slack_ok    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Newest-first admin reads + "unseen failures" scans.
CREATE INDEX IF NOT EXISTS founder_alerts_created_idx ON public.founder_alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS founder_alerts_kind_idx    ON public.founder_alerts (kind, created_at DESC);

-- ⚑ 14 Sep (F8) — RLS ON, NO POLICY. Added when this migration finally entered
-- PENDING_MIGRATIONS and the repo's own guard caught that the table would be created
-- readable by anyone holding the public anon key, which apps/portal ships to every browser.
-- Every founder alert body lands here: support escalations in a client's own words, their
-- email address, payment failures. The API reaches it with the service role, which bypasses
-- RLS; the anon key must reach it with nothing.
ALTER TABLE public.founder_alerts ENABLE ROW LEVEL SECURITY;
