-- 20260910_programme_calculator_choice
-- Canonical copy of the runner entry in apps/api/src/lib/pending-migrations.ts.
-- Run ONLY through the Vida migration runner. Additive, nullable, no backfill, idempotent.
--
-- WHY: the committed money figures were already stored; the client's own assumptions and
-- their acceptance were not. Accepting WAS paying, so a client who agreed and then hesitated
-- at checkout left no record of having agreed to anything.

ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS calculator_assumptions      jsonb,
  ADD COLUMN IF NOT EXISTS recommendation_accepted_at  timestamptz;

COMMENT ON COLUMN public.programmes.calculator_assumptions IS
  'The client own assumptions from the Milla programme calculator, exactly as they stood when the recommendation was accepted: leadsPerMeeting, averageClientValue, meetingToClientPct. A SNAPSHOT for reproducing what they were shown - never queried across programmes and never aggregated. The COMMITTED figures are the typed columns (meeting_target, recommended_volume, price_total_cents, first/second_payment_cents) and are priced by the shared curve; these are the ILLUSTRATIVE inputs and we stand behind none of them.';

COMMENT ON COLUMN public.programmes.recommendation_accepted_at IS
  'When the client accepted the recommendation in Milla - a fact SEPARATE from paying. Before this column accepting WAS paying, because the only client control was the Stripe button, so a client who agreed and then hesitated at checkout left no record of having agreed. NOT approved_at: that is the later approval of the prepared programme (R108).';
