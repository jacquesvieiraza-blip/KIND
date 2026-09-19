-- ═══════════════════════════════════════════════════════════════════════════════════════
-- MVP1 · J5-C4 (LR 10,12) — icps.target_size: HOW BIG THEY SAID, IN THEIR OWN WORDS.
--
-- `icps.company_sizes` is our CLOSED SIX-BAND LADDER — 1–10 · 11–50 · 51–200 · 201–500 ·
-- 501–1,000 · 1,000+ — and it is to size exactly what `industries` is to category: an Apollo
-- query hint and evidence, never the requirement. 20260911_icp_target_category_and_type made
-- that split for the market; this makes it for the headcount, for the same reason and with
-- the same shape.
--
-- 🛑 WHAT THE LADDER COSTS A CLIENT. "Fifty to a hundred people" cannot be expressed in it, so
-- it is snapped to ['11–50','51–200'] — and the band rule then admits an 11-person company and
-- a 190-person company as matches on a criterion the client stated precisely. "Ten to fifty"
-- is snapped to ['11–50'], which refuses the ten-person company they explicitly asked for.
--
-- ADDITIVE, EXPAND ONLY (XC-11). `company_sizes` is untouched and keeps doing its provider-edge
-- job. Nullable, no default, NO BACKFILL: an existing row reads NULL, which correctly means
-- "never collected", and `proof-fit.ts`'s band rule answers for it exactly as it does today.
--
-- DEPLOYMENT ORDERING: apply this BEFORE shipping the code that writes the column.
-- ═══════════════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.icps
  ADD COLUMN IF NOT EXISTS target_size text;

COMMENT ON COLUMN public.icps.target_size IS
  'MVP1 brief fact 8 — how big the target company should be, in the CLIENT''S OWN WORDS ("50 to 100 people", "under 20 staff"). Authoritative over company_sizes, which is the closed provider band list used as a query hint. Never a provider label; never rewritten by normalisation. NULL means never collected.';
