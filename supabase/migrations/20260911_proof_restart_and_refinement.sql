-- ═══════════════════════════════════════════════════════════════════════════════════════
-- ⚑ 11 Sep (C39 / C23) — THE RESTART CAN ACTUALLY BE SPENT, AND A REFINEMENT CAN BE MEANT.
--
-- 🛑 WHAT WAS BROKEN (C39). `20260910_proof_calibration_handoff` added
-- `proof_calibrated_restart_at` — that an operator GRANTED the one human-authorised extra
-- Proof pass. Nothing recorded that the client had SPENT it, and nothing let the pass be
-- claimed: `spendDoors` answered `proof_passes_done < 2` (false at 2, for ever) and
-- `try_claim_proof_pass` refuses at 2 for ever. So the operator pressed a real button, an
-- audit row was written, and the client got nothing. The grant bought a pass that could not
-- be taken.
--
--   proof_calibrated_restart_used_at — when the granted restart was CONSUMED. Granted and
--     used are different facts: with only the first, the grant either buys nothing (the count
--     still refuses) or buys unlimited passes (it never expires). Both were live.
--
-- 🛑 AND WHAT WAS MISSING (C23). Attempt 2 is real paid sourcing against a target the client
-- is supposed to have corrected. Milla may PROPOSE what she thinks they meant; nothing
-- recorded whether they had AGREED to it, so the second and last automatic attempt could be
-- spent on the model's reading of a sentence.
--
--   proof_refinement_text         — the client's own words. Never the interpretation.
--   proof_refinement_proposed_at  — we proposed an interpreted change back to them.
--   proof_refinement_confirmed_at — they confirmed it. THIS is the gate Attempt 2 waits on.
--
-- And the audit half of the human path:
--
--   proof_calibration_resolved_by — who recorded the resolution. The operator audit log
--     already carries the action; this keeps the identity on the row an operator reads.
--
-- ⚠️ `proof_passes_done` IS NOT TOUCHED BY ANY OF THIS, and neither is `try_claim_proof_pass`.
-- The two automatic attempts are spent for ever. The calibrated restart is a separate door,
-- never a wider one, and it closes again the moment it is used.
--
-- Additive, nullable, no defaults, no backfill, idempotent.
-- ═══════════════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS proof_calibrated_restart_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS proof_calibration_resolved_by    text,
  ADD COLUMN IF NOT EXISTS proof_refinement_text            text,
  ADD COLUMN IF NOT EXISTS proof_refinement_proposed_at     timestamptz,
  ADD COLUMN IF NOT EXISTS proof_refinement_confirmed_at    timestamptz;

COMMENT ON COLUMN public.clients.proof_calibrated_restart_used_at IS
  'When the granted calibrated restart was CONSUMED by a Proof claim. A restart is available only while proof_calibrated_restart_at is NEWER than this, so one grant buys exactly one set. It never resets proof_passes_done and try_claim_proof_pass is untouched.';

COMMENT ON COLUMN public.clients.proof_calibration_resolved_by IS
  'The operator who recorded the human calibration resolution. The operator audit log holds the action; this keeps the identity on the row the next operator reads.';

COMMENT ON COLUMN public.clients.proof_refinement_text IS
  'What the client said to refine their targeting, IN THEIR OWN WORDS. Never the models interpretation of it, and never a provider label.';

COMMENT ON COLUMN public.clients.proof_refinement_proposed_at IS
  'When an interpreted refinement was proposed back to the client. A proposal on its own never sources: it CLOSES the improved-set door until they confirm.';

COMMENT ON COLUMN public.clients.proof_refinement_confirmed_at IS
  'When the client confirmed the interpreted refinement. This is the only thing that reopens the door to automatic Attempt 2.';
