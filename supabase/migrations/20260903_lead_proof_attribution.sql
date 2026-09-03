-- ═══════════════════════════════════════════════════════════════════════════════════════
-- WHICH LEAD IS FREE-PROOF WORK? — the one question no existing column could answer
--
-- ── WHY THIS COLUMN HAD TO EXIST ────────────────────────────────────────────────────────
--
-- A declared programme client with NO open programme is TWO different accounts:
--
--   A. a genuine new customer running FREE PROOF — their cards are CURRENT work;
--   B. an account whose leads are the retired per-lead desk — that is HISTORY.
--
-- Milla presented both the same way, so House rendered its retired desk as a current
-- workspace. Every candidate for telling them apart was traced to its write, its storage and
-- its read before this column was written, and every one of them failed:
--
--   leads.source          the PROVIDER name (pdl | apollo), written identically by a proof
--                         run and a paid run, and NULL on every pool-served copy and on
--                         every row written before Aug 2026. Says who sold us the person,
--                         never which commercial motion asked for them.
--   leads.programme_id    NULL for a proof lead AND NULL for every legacy lead. An absence
--                         shared by both answers is not an answer.
--   icp_run_outcomes      icp_id, client_id, status, three counts, a message, created_at.
--                         No lead ids and NO PROOF FLAG — a proof run and a paid run write
--                         the identical row shape, so it cannot even classify itself.
--   sourcing_ledger       client_id, records, cost_usd, created_at. No lead ids. Proof PDL
--                         spend deliberately never lands here (it uses proof_ledger), but a
--                         pool-only PROOF serve does write a zero-cost row here — so it is
--                         not even a clean negative marker.
--   proof_ledger          a MONEY reservation: client, records, cost, budget_month. No
--                         icp_id, no lead ids, and a pool-only proof pass creates NO ROW AT
--                         ALL, so the leads it produced would be unattributable.
--   acquisition_memory    keyed (source, provider_id) — an identity ledger with no lead id,
--                         no run id and no proof flag, written the same way for paid runs.
--   clients.proof_passes_done / proof_started_at
--                         CUMULATIVE CLIENT STATE. "has this account ever claimed a pass" is
--                         a different question from "does THIS ROW belong to that pass", and
--                         substituting one for the other is exactly the defect: a programme
--                         client with old legacy rows who later runs a legitimate proof
--                         would have had its whole history reopened as current work.
--   icps.proof_widened_candidate
--                         THE ONLY EXISTING PROOF-BATCH-TO-LEADS LINK: it stores proof_pass
--                         and batch_at, the exact surfaced_for_approval_at of the batch it
--                         produced. But it is written ONLY for a pass-2 WIDENED fallback and
--                         is NULL for pass 1 and for every exact pass. It covers a corner,
--                         never the motion.
--
-- So the distinction is stored ONCE, positively, on the row it describes.
--
-- ── WHAT THIS IS NOT ────────────────────────────────────────────────────────────────────
--
-- ⚠️ NULLABLE, NO DEFAULT, NO BACKFILL — the #599 lesson, applied deliberately. A DEFAULT
-- would stamp every historical row with a claim nobody verified, and a backfill would invent
-- proof provenance for people sourced by a completely different motion. Every existing row
-- reads NULL, which means exactly what it says: THIS ROW IS NOT KNOWN TO BE PROOF WORK.
-- Nothing is deleted, nothing is moved, nothing is rewritten.
--
-- ⚠️ IT IS NOT A CLOCK. It is the pass number the proof route ATOMICALLY CLAIMED before the
-- run (try_claim_proof_pass), stamped on the rows that run created, and never rewritten. A
-- second pass stamps its own rows with 2 and cannot touch pass 1 rows — which is what keeps
-- "two labelled proof sets, nothing deleted or filtered away" true without a time bound.
-- clients.proof_started_at is rewritten on EVERY claim and is therefore unusable here.
--
-- ⚠️ IT IS NOT A COMMERCIAL STATE. Nothing about money, reveal, charging, sending, consent or
-- delivery reads this column. It answers one question: which motion produced this row.
--
-- ⚠️ NOT ON clients, NOT ON icps. The question is per-ROW; a per-client or per-ICP answer is
-- precisely what could not tell A from B above.
--
-- ADDITIVE AND IDEMPOTENT — one nullable column and one guarded CHECK. Safe to re-run: the
-- migration runner has no ledger and executes every entry on every run.
-- ═══════════════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS proof_pass smallint;

COMMENT ON COLUMN public.leads.proof_pass IS
  'The FREE-PROOF pass number that produced this row (1 or 2), stamped by runIcpJob on exactly the ids it inserted, from the pass try_claim_proof_pass atomically granted before the run. NULL means this row is NOT known to be free-proof work — the honest answer for every legacy, programme and pool-served lead, and for everyone sourced before this column existed. Never defaulted, never backfilled, never rewritten, and never read by money, sending, reveal or delivery.';

-- ── THE CHECK, CREATED ONLY IF MISSING ───────────────────────────────────────────────────
--
-- Guarded on pg_constraint rather than written as DROP + ADD, for the reason the
-- commercial_model entry records: ADD CONSTRAINT ... CHECK takes an ACCESS EXCLUSIVE lock and
-- revalidates the whole table, so DROP/ADD would pay that on every run AND leave a window
-- with no constraint at all, during which a concurrent write could insert the very row that
-- then makes the re-ADD fail.
--
-- SAFE ON A POPULATED TABLE: the column is added NULL with no default and no backfill, so
-- proof_pass IS NULL short-circuits the OR for every existing row and validation cannot fail
-- against the book as it stands.
--
-- TWO IS THE CEILING BECAUSE try_claim_proof_pass REFUSES A THIRD (v_done >= 2 -> return 0).
-- The constraint states the product rule rather than trusting the caller to remember it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.leads'::regclass
       AND conname  = 'leads_proof_pass_check'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_proof_pass_check CHECK (
        proof_pass IS NULL OR proof_pass IN (1, 2)
      );
  END IF;
END $$;

-- The customer desk reads "this client, proof-attributed" on every Milla poll. Partial,
-- because the overwhelming majority of leads are not proof work and never will be.
CREATE INDEX IF NOT EXISTS leads_proof_pass_idx
  ON public.leads (client_id, proof_pass)
  WHERE proof_pass IS NOT NULL;
