-- 20260910_proof_completion
-- Canonical copy of the runner entry in apps/api/src/lib/pending-migrations.ts.
-- Run ONLY through the Vida migration runner. Additive, nullable, no backfill, idempotent.
--
-- WHY: "These are right" wrote nothing — the control was a GET. No column, stage or alert
-- anywhere meant "the client accepted their Proof set", so the happy path ended in silence
-- and only resumed if an operator noticed by other means.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS proof_completed_at timestamptz;

COMMENT ON COLUMN public.clients.proof_completed_at IS
  'When the client said their Proof examples are right, so Proof is finished and the programme calculator is next. Before this column the accept control wrote nothing at all: a satisfied client produced no record, no alert and no stage change, and the journey only resumed if an operator noticed by other means. Client-level because Proof completes BEFORE any programme exists - the calculator is what creates one. NOT a count of attempts (proof_passes_done is how many were spent) and NOT an escalation (proof_review_requested_at is the failed loop). First acceptance wins; the write is idempotent.';
