-- ── THE CLIENT'S CHALLENGE TO A MEETING — 25 Sep 2026 (R141 · R166 · board #2351, P5b) ──────
--
-- The Terms (R141) give the client 3 business days from a meeting being booked to challenge
-- whether it was qualified, naming which of the seven conditions was not met. Until now a
-- challenge had nowhere to go but an email. Milla now takes it, on the meeting itself, and a
-- person in Vida upholds or rejects it.
--
-- EXPAND ONLY: nullable columns, no default, no backfill. A meeting with challenged_at null has
-- not been challenged. `challenge_outcome` is null while the challenge is open.
--
-- ⚠️ AN UPHELD CHALLENGE DOES NOT TOUCH `excluded_reason` HERE. Which meetings count toward the
-- target is P6's change (settlement counts qualified meetings); this migration only records the
-- challenge and its outcome so that P6 has something true to count.
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS challenged_at          timestamptz,
  ADD COLUMN IF NOT EXISTS challenge_condition    text,
  ADD COLUMN IF NOT EXISTS challenge_note         text,
  ADD COLUMN IF NOT EXISTS challenge_outcome      text,
  ADD COLUMN IF NOT EXISTS challenge_resolved_at  timestamptz,
  ADD COLUMN IF NOT EXISTS challenge_resolved_by  text,
  ADD COLUMN IF NOT EXISTS challenge_resolution_note text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meetings_challenge_outcome_values') THEN
    ALTER TABLE public.meetings ADD CONSTRAINT meetings_challenge_outcome_values
      CHECK (challenge_outcome IS NULL OR challenge_outcome IN ('upheld', 'rejected'));
  END IF;
  -- A challenge names its condition, and an outcome only exists for a challenge that was raised.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meetings_challenge_is_complete') THEN
    ALTER TABLE public.meetings ADD CONSTRAINT meetings_challenge_is_complete
      CHECK ((challenged_at IS NULL) = (challenge_condition IS NULL)
         AND (challenge_outcome IS NULL OR challenged_at IS NOT NULL)
         AND ((challenge_outcome IS NULL) = (challenge_resolved_at IS NULL)));
  END IF;
END $$;

COMMENT ON COLUMN public.meetings.challenge_condition IS
  'The one R141 condition the client says was not met (a key from the seven).';
COMMENT ON COLUMN public.meetings.challenge_outcome IS
  'upheld (the meeting was not qualified) | rejected (it stands). Null while open.';
