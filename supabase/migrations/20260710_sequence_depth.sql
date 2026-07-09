-- 20260710_sequence_depth.sql
-- M0 · #212 / #426 — SEQUENCE DEPTH: the send engine was hard-wired to 3 steps
-- (step1-3_subject/body columns) while the live site sells "client-built follow-up
-- (up to 10 steps)". This adds a jsonb `steps` array to figsy_enrollments so a
-- sequence of up to 10 steps is stored + walked in full.
--
-- Shape:  steps = [ { "subject": "...", "body": "...", "wait_days": 4 }, ... ]  (≤10)
-- Back-compat: step1-3_subject/body columns are STILL written (first 3 steps) for
-- the legacy readers (voice.ts, the A/B step1 view). Legacy enrollments with no
-- `steps` array fall back to the step1-3 columns (3-step behaviour, unchanged).
--
-- Run on STAGING (kind-staging) first, then PRODUCTION.

ALTER TABLE public.figsy_enrollments
  ADD COLUMN IF NOT EXISTS steps jsonb;

-- Optional cache of the sequence length (= jsonb_array_length(steps)); the send
-- loop reads it to know when a sequence is complete without re-parsing the array.
ALTER TABLE public.figsy_enrollments
  ADD COLUMN IF NOT EXISTS total_steps integer;
