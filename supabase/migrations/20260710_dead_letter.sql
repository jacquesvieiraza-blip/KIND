-- 20260710_dead_letter.sql
-- M0 · #390 (AR-60) — OBSERVABILITY. There was no dead-letter/retry table, so a failed
-- background job (cron call, send batch) just vanished after a console.error. This table
-- captures failures durably so they can be seen (and later retried) instead of lost.
--
-- Run on STAGING (kind-staging) first, then PRODUCTION.

CREATE TABLE IF NOT EXISTS public.dead_letter (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source          text NOT NULL,          -- e.g. 'cron:/figsy/send-due-all'
  payload         jsonb,
  error           text,
  attempts        integer NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz
);

-- Unresolved-failures scan (the admin "what's broken" view).
CREATE INDEX IF NOT EXISTS dead_letter_unresolved_idx
  ON public.dead_letter (created_at DESC) WHERE resolved_at IS NULL;
