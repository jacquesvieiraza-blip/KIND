-- ═══════════════════════════════════════════════════════════════════════════════════════
-- MVP1 · J6-C3 (PV 02) — THE SET-LEVEL VERDICT, RECORDED WHEN IT HAPPENS.
--
-- `mayRequestStrongerSet` is the one spend gate between a client and their second automatic
-- Proof attempt. It was derived, used and thrown away on every read, so nothing recorded WHY
-- a second set was unlocked at the moment the client was looking at the screen — and no
-- operator surface could answer the question afterwards, because no Vida route reads
-- calibration at all.
--
-- ⚠️ THIS IS AN EVENT, NOT A MIRROR. The live derivation REMAINS the gate; these columns
-- record that it first became true, when, and on what basis. An event cannot drift out of
-- step with a derivation the way a cached boolean can, and nothing reads these to decide
-- whether to spend.
--
-- EXPAND ONLY (XC-11): two nullable columns, no default, NO BACKFILL. A client whose second
-- set was unlocked before today reads NULL, which correctly means "we did not record it",
-- never "it was refused".
-- ═══════════════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS proof_stronger_set_unlocked_at     timestamptz,
  ADD COLUMN IF NOT EXISTS proof_stronger_set_unlocked_reason text;

COMMENT ON COLUMN public.clients.proof_stronger_set_unlocked_at IS
  'MVP1 J6-C3 — when the SET-level verdict first unlocked a second automatic Proof attempt for this client. A historical event; the live derivation in proof-calibration.ts remains the gate. NULL means never recorded, never "refused".';

COMMENT ON COLUMN public.clients.proof_stronger_set_unlocked_reason IS
  'MVP1 J6-C3 — the stable reason code behind that verdict: per_card_feedback | confirmed_refinement. Read by Vida so an operator can answer "why does this client have a second set?".';
