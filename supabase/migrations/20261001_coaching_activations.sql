-- ── FULL COACHING ACTIVATIONS — 1 Oct 2026 (R180 Q2 · R184 · Coaching F3 · board #2485 / #2521) ──
--
-- Founders and Growth can turn on Full Coaching for the meetings still to come in a programme:
-- ONE payment of uplift × those meetings, taken at activation (R180 Q2); the uplift is locked at
-- $100 per meeting (R184) and lives in @kind/shared. Any of those meetings not delivered returns
-- its uplift with the shortfall credit at settlement — `uplift_returned_cents` records it.
--
-- ONE ROW PER PROGRAMME (programme_id UNIQUE) and ONE PER PAYMENT (payment_ref UNIQUE — the
-- Stripe checkout session id), so a Stripe redelivery can never record a second activation.
-- A refund or dispute switches Coaching off by stamping `deactivated_at`; the row is never deleted.
-- `paid_cents = meetings_covered × uplift_cents_per_meeting` is a column rule, so the money
-- recorded can never disagree with what it covers.
--
-- EXPAND ONLY: one new table, RLS on with no policy (service role only, like the other
-- internal ledgers). No change to any existing table.
CREATE TABLE IF NOT EXISTS public.coaching_activations (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id              uuid NOT NULL UNIQUE REFERENCES public.programmes(id) ON DELETE RESTRICT,
  client_id                 uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  meetings_covered          integer NOT NULL CHECK (meetings_covered > 0),
  delivered_at_activation   integer NOT NULL CHECK (delivered_at_activation >= 0),
  uplift_cents_per_meeting  integer NOT NULL CHECK (uplift_cents_per_meeting > 0),
  paid_cents                integer NOT NULL,
  payment_ref               text NOT NULL UNIQUE,
  payment_intent_id         text,
  activated_at              timestamptz NOT NULL DEFAULT now(),
  deactivated_at            timestamptz,
  deactivated_reason        text,
  uplift_returned_cents     integer NOT NULL DEFAULT 0 CHECK (uplift_returned_cents >= 0),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coaching_activations_paid_matches_check
    CHECK (paid_cents = meetings_covered * uplift_cents_per_meeting),
  CONSTRAINT coaching_activations_returned_within_paid_check
    CHECK (uplift_returned_cents <= paid_cents)
);

CREATE INDEX IF NOT EXISTS coaching_activations_client_idx ON public.coaching_activations (client_id);
CREATE INDEX IF NOT EXISTS coaching_activations_intent_idx ON public.coaching_activations (payment_intent_id);

ALTER TABLE public.coaching_activations ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.coaching_activations IS
  'Full Coaching bought for a programme: one payment of uplift x meetings still to come (R180 Q2, R184). A refund or dispute stamps deactivated_at; never deleted.';
