-- ── leads.category_fit — THE MODEL'S VERDICT ON THE CLIENT'S OWN CATEGORY (MVP1 · J5-C13 · FD-2)
--
-- Canonical copy. The executable copy is the `20260918_lead_category_fit` entry in
-- `apps/api/src/lib/pending-migrations.ts`, which is the only sanctioned way to run it (O3).
--
-- WHAT IT IS FOR. FD-2 makes category fit MODEL-INTERPRETED: adjacent qualifies, vague B2B
-- does not, UNKNOWN is never eligible. A model cannot be called from `proof-fit.ts`, which is
-- a pure synchronous predicate every surface depends on — so the model writes a FACT here and
-- the predicate reads it, which is the shape every other criterion in that file already uses.
--
-- 🛑 AND THE MODEL HAD NEVER BEEN TOLD THE REQUIREMENT. The scoring prompt described the ICP
-- with `Industries:` — the CLOSED sixteen-value provider list — and nothing else, so a client
-- who said "digital marketing agencies" reached the scorer as "Industries: Media" or, more
-- often, "Industries: any". It now carries the client's own words, and returns a verdict
-- against them.
--
-- ⚠️ TWO COLUMNS BECAUSE THE REASON IS EVIDENCE. A verdict an operator cannot interrogate is
-- the unfalsifiable score this whole area exists to replace.
--
-- ⚠️ EXPAND ONLY (XC-11). Both nullable, NO DEFAULT, NO BACKFILL. NULL means "not judged" —
-- every lead scored before today, and every lead whose scoring failed — and `categoryVerdict`
-- falls through to its existing word-overlap rule for those, exactly as it behaves today.
-- ⚠️ THE CHECK ADMITS NULL, so no existing row is invalidated.
-- ⚠️ IDEMPOTENT: `add column if not exists`, and the constraint is added only when absent.

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS category_fit        text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS category_fit_reason text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_category_fit_check'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_category_fit_check
      CHECK (category_fit IS NULL OR category_fit IN ('yes', 'no', 'unknown'));
  END IF;
END $$;

COMMENT ON COLUMN public.leads.category_fit IS
  'MVP1 J5-C13 / FD-2. The scoring model''s verdict on whether this company is the KIND the client asked for, in the client''s own words: yes | no | unknown. Read by proof-fit.ts''s `category` criterion, which prefers it over the word-overlap rule. NULL means not judged (scored before this existed, or scoring failed) and the overlap answers instead.';
