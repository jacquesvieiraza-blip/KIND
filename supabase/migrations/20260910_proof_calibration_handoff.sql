-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: the Proof calibration hand-off (C07, founder-locked 10 Sep 2026)
--
-- The automatic Proof loop closes on the SECOND attempt now, instead of waiting
-- for the client to try to spend a third time. Four facts must survive that
-- moment: which condition closed it, that the client confirmed a number, the
-- operator's resolution note, and when the one human-authorised extra pass was
-- granted (which is what makes that grant self-limiting).
--
-- Attempt summaries are NOT stored - surfaced counts, "looks right", "not a fit"
-- and reason tallies all derive from lead_feedback x leads.proof_pass, which are
-- already the truth of record.
--
-- try_claim_proof_pass is deliberately NOT touched: it stays the hard server
-- backstop refusing a third AUTOMATIC pass forever. The calibrated restart is a
-- separate operator-only audited door and needs no exception in it.
--
-- Additive, nullable, no defaults, no backfill, idempotent.
--
-- Canonical copy of the PENDING_MIGRATIONS entry
-- `20260910_proof_calibration_handoff` - the two must stay identical.
-- Run in: Vida -> Command Centre -> System -> migrations
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS proof_escalation_trigger    text,
  ADD COLUMN IF NOT EXISTS proof_phone_confirmed_at    timestamptz,
  ADD COLUMN IF NOT EXISTS proof_calibration_note      text,
  ADD COLUMN IF NOT EXISTS proof_calibrated_restart_at timestamptz;

COMMENT ON COLUMN public.clients.proof_escalation_trigger IS
  'Which condition closed the automatic Proof loop: client_said_still_not_right, second_set_mostly_rejected, or requested_more_after_pass_two. Written once, in the same statement as proof_review_requested_at, so a client can never be escalated without a recorded reason.';

COMMENT ON COLUMN public.clients.proof_phone_confirmed_at IS
  'When the client confirmed the number to reach them on for a calibration call. Distinct from clients.phone, which may hold an unchecked signup value: this records that they were asked and answered.';

COMMENT ON COLUMN public.clients.proof_calibration_note IS
  'The operator note written when a failed Proof calibration is resolved. Required before Restart Proof (calibrated) is offered - a restart pressed on an unexamined client would spend a pass on the same targeting.';

COMMENT ON COLUMN public.clients.proof_calibrated_restart_at IS
  'When the one human-authorised extra Proof pass was granted. A restart is permitted only while proof_review_resolved_at is NEWER than this, so one resolution grants exactly one pass and it never resets the two automatic attempts. try_claim_proof_pass is untouched and still refuses a third automatic claim.';
