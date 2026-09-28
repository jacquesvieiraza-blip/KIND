-- ── UNLIMITED PROOF REFINEMENT MAY ACTUALLY BE WRITTEN — 28 Sep 2026 (end-to-end check, A3) ──
--
-- 22 Sep made automatic Proof refinement unlimited: `claim_proof_authority` now writes
-- 'automatic_' || n for any n, and the pass number n reaches `leads.proof_pass`. Two older rules
-- still stopped at two, so a client's THIRD refinement failed inside the database:
--   · proof_pass_claims.authority  CHECK (authority in ('automatic_1','automatic_2','calibrated_restart'))
--   · leads_proof_pass_check        CHECK (proof_pass IS NULL OR proof_pass IN (1, 2))
-- The 22 Sep header checked the unique index and missed both column rules.
--
-- Both are REPLACED, not removed: an automatic authority is still 'automatic_' + a positive
-- whole number (or the one calibrated restart), and a lead's pass is still a positive number.
-- New names, because one constraint has one owning migration (constraint-ownership.test.ts).
ALTER TABLE public.proof_pass_claims DROP CONSTRAINT IF EXISTS proof_pass_claims_authority_check;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proof_pass_claims_authority_values_check') THEN
    ALTER TABLE public.proof_pass_claims ADD CONSTRAINT proof_pass_claims_authority_values_check
      CHECK (authority = 'calibrated_restart' OR authority ~ '^automatic_[1-9][0-9]*$');
  END IF;
END $$;

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_proof_pass_check;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_proof_pass_positive_check') THEN
    ALTER TABLE public.leads ADD CONSTRAINT leads_proof_pass_positive_check
      CHECK (proof_pass IS NULL OR proof_pass >= 1);
  END IF;
END $$;
