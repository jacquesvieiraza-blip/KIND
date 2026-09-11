-- ═══════════════════════════════════════════════════════════════════════════════════════
-- ⚑ 11 Sep — THE CALIBRATED RESTART IS PROVENANCE ON THE ROW, NOT A THIRD PASS NUMBER.
--
-- 🛑 WHAT THIS REPLACES, AND IT COULD NOT HAVE WORKED. An earlier cut encoded the one
-- human-authorised calibrated restart as `leads.proof_pass = 3`, with rendering code
-- special-casing 3 into "Calibrated restart". Two things were wrong with it:
--
--   ① THE DATABASE WOULD HAVE REFUSED IT. `20260903_lead_proof_attribution` declares
--      CHECK (proof_pass IS NULL OR proof_pass IN (1, 2)). Every restart insert would have
--      failed on the constraint. The value was unreachable, not merely unwise.
--   ② IT PUT AMBIGUOUS TRUTH IN THE ROW and asked presentation code to repair it. Anything
--      reading max(proof_pass), counting attempts, guarding spend or building analytics would
--      reasonably have read 3 as a third automatic attempt — the exact product rule the
--      restart exists to respect. A special case in a label does not make persisted data
--      honest, and the next reader will not know to write one.
--
-- ⚠️ AUTOMATIC PROOF PASS IDENTITY STAYS 1 AND 2, FOR EVER, and so does the CHECK above.
-- `clients.proof_passes_done` stays 2 after both attempts AND after the restart, and
-- `try_claim_proof_pass` is untouched.
--
-- ⚠️ THE RESTART'S ROWS CARRY THE PASS THEY RAN ALONGSIDE (2) AND THIS KIND. So three history
-- events are readable — Automatic attempt 1, Automatic attempt 2, Calibrated restart — while
-- only the first two are automatic proof passes.
--
-- ⚠️ NULL MEANS 'automatic', WHICH IS THE HONEST READING OF EVERY EXISTING ROW. No default is
-- written and nothing is backfilled: a row sourced before this column existed was an
-- automatic pass, and saying so by absence is truthful rather than stamped.
--
-- Additive, nullable, no default, no backfill, idempotent.
-- ═══════════════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS proof_batch_kind text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.leads'::regclass
       AND conname  = 'leads_proof_batch_kind_check'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_proof_batch_kind_check CHECK (
        proof_batch_kind IS NULL OR proof_batch_kind IN ('automatic', 'calibrated_restart')
      ) NOT VALID;
  END IF;
END $$;

COMMENT ON COLUMN public.leads.proof_batch_kind IS
  'What produced this Proof row: automatic (one of the two automatic attempts) or calibrated_restart (the one human-authorised set granted after a real calibration resolution). NULL reads as automatic, which is the honest answer for every row written before this column existed. It is the ONLY thing that tells a restart from an automatic attempt - proof_pass stays 1 or 2 for both, and clients.proof_passes_done stays 2.';

CREATE INDEX IF NOT EXISTS leads_proof_batch_kind_idx
  ON public.leads (client_id, proof_batch_kind)
  WHERE proof_batch_kind IS NOT NULL;
