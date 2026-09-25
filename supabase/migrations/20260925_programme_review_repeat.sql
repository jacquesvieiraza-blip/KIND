-- ── THE NO-MEETING REVIEW REPEATS — 25 Sep 2026 (R166 ⑥ · board #2349, P3a) ────────────
--
-- The review hold (250 people delivered with no booked meeting → the next batch waits for a
-- person) fired ONCE per programme: after a person resolved it, review_required_at stayed set,
-- the raise is guarded on it being null, and the programme could source to its full limit with
-- no meeting and no further check. The founder: "the barriers need to be there."
--
-- These two columns remember where the programme stood when the review was last resolved, so
-- the hold fires again after every further 250 people without a NEW meeting.
--
-- EXPAND ONLY: two nullable integers, no default, no backfill. Null = never resolved.
ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS review_baseline_used   integer,
  ADD COLUMN IF NOT EXISTS review_baseline_booked integer;

COMMENT ON COLUMN public.programmes.review_baseline_used IS
  'sourced_used when the no-meeting review was last resolved (or when a new meeting moved the baseline). The review fires again 250 people later without a new meeting.';
COMMENT ON COLUMN public.programmes.review_baseline_booked IS
  'Booked meetings for this programme at that same moment. A higher count later means a new meeting arrived.';
