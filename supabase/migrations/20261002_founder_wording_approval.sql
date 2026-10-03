-- ── THE FOUNDER'S APPROVAL OF A PROGRAMME'S WORDING — 2 Oct 2026 (board #2542 · R186 ③) ────
--
-- R186 ③: no sequence or campaign wording goes out, for any client including House, until the
-- founder approves it in Vida — once per sequence, as a whole, founder first. One row per
-- version he approved: `snapshot_hash` is the programme's frozen preparation (emails + people);
-- `wording_hash` is the emails alone, so follow-ups to people already emailed keep going when
-- only the audience changed (Batch 2).
--
-- EXPAND ONLY: one new table. Nothing existing changes.
CREATE TABLE IF NOT EXISTS public.founder_wording_approvals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id  uuid NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  snapshot_hash text NOT NULL,
  wording_hash  text NOT NULL,
  approved_by   text,
  approved_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (programme_id, snapshot_hash)
);
CREATE INDEX IF NOT EXISTS founder_wording_approvals_programme_idx ON public.founder_wording_approvals (programme_id);
ALTER TABLE public.founder_wording_approvals ENABLE ROW LEVEL SECURITY;
