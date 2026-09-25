-- ── THE QUALIFIED MEETING RECORD — 25 Sep 2026 (R141 · R166 · board #2351, P5a) ──────────
--
-- The website Terms sell a QUALIFIED meeting with seven conditions (R141), and the product
-- recorded none of them: "qualified" lived on the reply, not the meeting, and no acceptance
-- evidence was kept with the meeting. At the new prices a meeting we cannot evidence is a
-- meeting we cannot defend.
--
-- A person in Vida now confirms the seven conditions on each meeting, links the reply in which
-- the prospect accepted, and the 3-business-day challenge window (R141) is stamped from when the
-- meeting was booked.
--
-- EXPAND ONLY: nullable columns, no default, no backfill. A meeting with qualified_at null has
-- simply not been qualified yet.
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS qualification         jsonb,
  ADD COLUMN IF NOT EXISTS qualified_at          timestamptz,
  ADD COLUMN IF NOT EXISTS qualified_by          text,
  ADD COLUMN IF NOT EXISTS evidence_reply_id     uuid REFERENCES public.figsy_replies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS evidence_note         text,
  ADD COLUMN IF NOT EXISTS challenge_deadline_at timestamptz;

COMMENT ON COLUMN public.meetings.qualification IS
  'The seven R141 conditions as confirmed by a person: icp_fit, role_fit, agreed_to_meet, date_time_set, genuine_relevance, not_existing_customer, acceptance_evidenced.';
COMMENT ON COLUMN public.meetings.evidence_reply_id IS
  'The prospect''s reply in which they accepted the meeting — the evidence condition 7 requires.';
COMMENT ON COLUMN public.meetings.challenge_deadline_at IS
  'booked_at + 3 business days. A client challenge after this is out of time (R141).';
