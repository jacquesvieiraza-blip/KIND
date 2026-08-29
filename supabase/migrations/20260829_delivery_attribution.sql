-- ═══════════════════════════════════════════════════════════════════════════════════════
-- BUILD-003 · DELIVERY ATTRIBUTION — which programme, and which batch, put this person
-- into a sequence
--
-- ⚠️ NOT GATED BY R2 — split out from delivery_rls so PR 2's foundation is not held behind
-- the browser-access gate. Two nullable columns and two partial indexes; it grants nothing.
--
-- WHY IT EXISTS. BUILD-002 gave a programme its authority (`try_spend_sourcing` carries
-- `p_programme_id`) and its sourcing ledger, so we can say what a programme SOURCED. Nothing
-- records what it DELIVERED: `figsy_enrollments` is where a lead becomes an outreach
-- sequence, and it carries no programme. Without these two columns, PR 2 cannot enforce
-- Go-Live or a coordinated pause on delivery, because delivery cannot say which programme's
-- authority it is spending — and a programme could never be judged on the meetings it
-- actually produced.
--
-- ⚠️ ADDITIVE AND INERT. Both columns are nullable with no default and no backfill. Every
-- existing enrolment keeps `NULL`, which is the legacy $299/$4 path, and nothing reads these
-- columns until PR 2 does. Applying this file changes no behaviour.
--
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- SET NULL, not CASCADE: deleting a programme must never delete the record that a person was
-- enrolled and emailed. The attribution goes; the delivery history stays.
ALTER TABLE public.figsy_enrollments
  ADD COLUMN IF NOT EXISTS programme_id uuid REFERENCES public.programmes(id) ON DELETE SET NULL;

ALTER TABLE public.figsy_enrollments
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.programme_batches(id) ON DELETE SET NULL;

-- Partial, because the overwhelming majority of rows are legacy and carry NULL — indexing
-- those would be paying for a value nothing queries.
CREATE INDEX IF NOT EXISTS figsy_enrollments_programme_idx
  ON public.figsy_enrollments (programme_id) WHERE programme_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS figsy_enrollments_batch_idx
  ON public.figsy_enrollments (batch_id) WHERE batch_id IS NOT NULL;

COMMENT ON COLUMN public.figsy_enrollments.programme_id IS
  'The programme whose authority paid for this enrolment. NULL = legacy $299/$4 path (BUILD-003).';
COMMENT ON COLUMN public.figsy_enrollments.batch_id IS
  'The controlled ~250 batch this enrolment belongs to. NULL = legacy path (BUILD-003).';
