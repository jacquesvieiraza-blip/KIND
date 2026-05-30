-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: sequence reply-branching bookkeeping
-- Date:      2026-05-30
--
-- Sequence steps carry an `on_reply` setting (stop / skip_next / continue) in
-- figsy_campaigns.settings.steps. The send-due cron now honours it: when a lead
-- replies, the next step branches accordingly.
--
-- This column records the moment we last acted on a reply for an enrollment, so
-- the cron only branches once per reply (and doesn't re-trigger on the same
-- reply on every subsequent run). Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.figsy_enrollments
  ADD COLUMN IF NOT EXISTS reply_branch_handled_at TIMESTAMPTZ;
