-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: clients.outcome_kind / outcome_stated (C03, founder-locked 10 Sep 2026)
--
-- The client said "Book qualified meetings with those founders and CEOs" during
-- onboarding, and Milla Home then showed OUTCOME - not set yet, with NEXT:
-- "Tell Milla the outcome you want". He had just told her.
--
-- Two notions of outcome existed and neither was the client's: the spoken
-- sentence went to icps.campaign_intent (copy input for the sequence writer),
-- and the OUTCOME card read programmes.meeting_target - a number that does not
-- exist until a programme is created, so during Proof the card was always empty.
--
-- These columns are the client-level truth. The outcome is the customer's: stated
-- once, surviving ICP revisions, existing before any programme and outliving each
-- programme that serves it. meeting_target stays separate and commercial.
--
-- Additive, nullable, no defaults, no backfill, idempotent.
--
-- Canonical copy of the PENDING_MIGRATIONS entry
-- `20260910_client_stated_outcome` - the two must stay identical.
-- Run in: Vida -> Command Centre -> System -> migrations
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS outcome_kind   text,
  ADD COLUMN IF NOT EXISTS outcome_stated text;

COMMENT ON COLUMN public.clients.outcome_kind IS
  'What kind of outcome the client asked for: meetings or other. Narrow on purpose - a client who asks for revenue or awareness has NOT asked for meetings, and other routes to a person rather than being reinterpreted. Written once at onboarding from their own answer.';

COMMENT ON COLUMN public.clients.outcome_stated IS
  'The outcome in the client own words, verbatim, captured once at onboarding. Client-level because it survives ICP revisions, exists before any programme and outlives each programme that serves it. It is NOT programmes.meeting_target: that is a commercial number agreed later at recommendation, and reading it as the outcome is why Milla Home showed "not set yet" to a client who had just stated one.';
