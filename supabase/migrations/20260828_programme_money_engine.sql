-- ── BUILD-002 · THE PROGRAMME COMMERCIAL + MONEY ENGINE ──────────────────────────────────
--
-- The founder-approved commercial destination (PRODUCT-RULES R74 · R77 · R78 · R81): a client
-- buys BOOKED MEETINGS, pays 50% up front to authorise sourcing, approves once, pays the
-- second 50% at Go Live, and the campaign runs. Contribution is measured per programme and a
-- partner is paid 25% of that (R78).
--
-- ⚠️ ADDITIVE AND INERT. Every statement here is `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`.
-- Nothing is dropped, nothing is renamed, nothing is backfilled, and no existing row changes.
-- With no programme rows written, `try_spend_sourcing` behaves EXACTLY as it does today —
-- which is the property the legacy fence depends on and which the tests prove directly.
--
-- ⚠️ THE LEGACY MODEL KEEPS RUNNING. $299 pack · first 100 approvals included · $4 per
-- approved lead is still live commercial truth and is untouched by this migration.
--
-- ── WHY THE AUTHORITY GATE LIVES IN THE DATABASE, NOT IN TYPESCRIPT ──────────────────────
--
-- `try_spend_sourcing` is the ONLY chokepoint where paid provider records are granted. Four
-- callers reach sourcing (icps.ts, lookalike.ts, start-work.ts, the operator run) and each of
-- them has, at some point in this repo's history, been the one that forgot a fence — AR8's
-- own history is a route that spent PDL with no fence at all. A gate that only exists in the
-- callers is a gate that a fifth caller silently skips.
--
-- ⚠️ AND `DEFAULT NULL` ALONE IS NOT SAFE. If an omitted programme id simply fell through to
-- legacy behaviour, a programme-owned run that forgot to pass its id would source against the
-- CLIENT'S legacy allowance, outside programme authority, and nothing would notice. So the
-- function decides which regime applies from the DATABASE — does this client have an open
-- programme? — and not from what the caller happened to send:
--
--   open programme + NULL id      → 0  (fail closed: a programme client must declare)
--   open programme + WRONG id     → 0  (fail closed: mismatch is never a fallback)
--   NO programme   + id supplied  → 0  (fail closed: legacy client cannot borrow authority)
--   NO programme   + NULL id      → legacy behaviour, byte-for-byte unchanged
--   open programme + MATCHING id  → programme authority (ceiling, not wallet allowance)
--
-- ⚠️ THE FREE-PROOF PATH IS NOT TOUCHED. Proof reserves through `try_reserve_proof_records`
-- against its own acquisition budget and never calls this function (R72 — proof is not
-- activation). Nothing below changes that separation.

-- ── 1 · programmes ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.programmes (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                 uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  status                    text        NOT NULL DEFAULT 'DRAFT',

  -- What was sold. `meeting_target` is the client's choice; the rest is derived from the
  -- curve by @kind/shared and STORED, because a price quoted to a client must not silently
  -- change if the curve is ever amended.
  meeting_target            int         NOT NULL,
  recommended_volume        int         NOT NULL,
  price_per_meeting_cents   int         NOT NULL,
  price_total_cents         int         NOT NULL,
  first_payment_cents       int         NOT NULL,
  second_payment_cents      int         NOT NULL,

  -- Payment identity. `*_ref` is the Stripe checkout session id and is the idempotency key.
  -- `*_intent_id` is kept separately because refunds and disputes arrive keyed on the
  -- payment intent, not the session, and #317 already had to resolve one from the other.
  first_payment_ref         text,
  second_payment_ref        text,
  first_payment_intent_id   text,
  second_payment_intent_id  text,
  first_paid_at             timestamptz,
  second_paid_at            timestamptz,

  -- Sourcing authority. `ceiling` is set from `recommended_volume` when the first payment
  -- lands. `reserved` is volume granted but not yet delivered by a provider; `used` is
  -- volume actually delivered. See the reserve/release note on programme_batches.
  sourcing_ceiling          int         NOT NULL DEFAULT 0,
  sourced_used              int         NOT NULL DEFAULT 0,
  sourced_reserved          int         NOT NULL DEFAULT 0,

  approved_at               timestamptz,
  went_live_at              timestamptz,

  -- Pause is ORTHOGONAL to status, not a status of its own: a paused programme is still
  -- SOURCING or APPROVED, and collapsing that into a PAUSED status would lose what it must
  -- return to. `pause_reason` is client | quality | icp_change.
  paused_at                 timestamptz,
  pause_reason              text,

  -- Unused value. A programme may only COMPLETE when its ceiling is consumed OR the value
  -- has been deliberately settled — no job may silently expire what a client paid for.
  value_settled_at          timestamptz,
  make_whole_cents          int         NOT NULL DEFAULT 0,

  -- Contribution is NULL while the programme is live: a provisional figure persisted as if
  -- final is how a partner gets paid on a number that later moved.
  contribution_cents        int,
  contribution_finalised_at timestamptz,

  disputed_at               timestamptz,

  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- Status vocabulary. PAUSED is deliberately absent — see the pause note above.
ALTER TABLE public.programmes DROP CONSTRAINT IF EXISTS programmes_status_check;
ALTER TABLE public.programmes ADD CONSTRAINT programmes_status_check CHECK (status IN (
  'DRAFT', 'RECOMMENDED', 'AWAITING_FIRST_PAYMENT', 'SOURCING_AUTHORISED', 'SOURCING',
  'READY_FOR_APPROVAL', 'APPROVED', 'LIVE', 'COMPLETED', 'CANCELLED'
));

ALTER TABLE public.programmes DROP CONSTRAINT IF EXISTS programmes_pause_reason_check;
ALTER TABLE public.programmes ADD CONSTRAINT programmes_pause_reason_check
  CHECK (pause_reason IS NULL OR pause_reason IN ('client', 'quality', 'icp_change'));

-- Money integrity. The 50/50 split must partition the total exactly (R81) — if these two
-- ever fail to sum, a client is over- or under-charged, so the database refuses the row.
ALTER TABLE public.programmes DROP CONSTRAINT IF EXISTS programmes_payment_split_check;
ALTER TABLE public.programmes ADD CONSTRAINT programmes_payment_split_check
  CHECK (first_payment_cents + second_payment_cents = price_total_cents);

ALTER TABLE public.programmes DROP CONSTRAINT IF EXISTS programmes_positive_check;
ALTER TABLE public.programmes ADD CONSTRAINT programmes_positive_check CHECK (
  meeting_target > 0 AND recommended_volume > 0
  AND price_per_meeting_cents > 0 AND price_total_cents > 0
  AND first_payment_cents > 0 AND second_payment_cents > 0
  AND sourcing_ceiling >= 0 AND sourced_used >= 0 AND sourced_reserved >= 0
  AND make_whole_cents >= 0
);

-- ⚠️ THE CEILING INVARIANT, ENFORCED BY THE DATABASE. Used + reserved may never exceed the
-- authorised ceiling. This is what makes "sourcing beyond programme authority" impossible
-- rather than merely unlikely: two concurrent batches that would both fit individually
-- cannot both commit, because the second UPDATE violates this CHECK and rolls back.
ALTER TABLE public.programmes DROP CONSTRAINT IF EXISTS programmes_ceiling_check;
ALTER TABLE public.programmes ADD CONSTRAINT programmes_ceiling_check
  CHECK (sourced_used + sourced_reserved <= sourcing_ceiling);

-- Payment references are the webhook idempotency key. Partial, because most rows have NULL.
CREATE UNIQUE INDEX IF NOT EXISTS programmes_first_ref_uidx
  ON public.programmes (first_payment_ref) WHERE first_payment_ref IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS programmes_second_ref_uidx
  ON public.programmes (second_payment_ref) WHERE second_payment_ref IS NOT NULL;

-- ⚠️ ONE OPEN PROGRAMME PER CLIENT. Two open programmes would make "which programme does
-- this ICP's sourcing draw on?" ambiguous at the exact moment money moves. Terminal states
-- are excluded so a client can buy again after completing or cancelling.
CREATE UNIQUE INDEX IF NOT EXISTS programmes_one_open_per_client_uidx
  ON public.programmes (client_id) WHERE status NOT IN ('COMPLETED', 'CANCELLED');

CREATE INDEX IF NOT EXISTS programmes_client_idx ON public.programmes (client_id);
CREATE INDEX IF NOT EXISTS programmes_status_idx ON public.programmes (status);

-- ── 2 · programme_batches — controlled ~250-lead execution ───────────────────────────────
--
-- The first 50% authorises the FULL recommended volume, but execution happens in controlled
-- batches of ~250 (founder lock 4). Each batch records what was asked, what authority was
-- granted, and what a provider actually delivered — three different numbers, and conflating
-- them is how client entitlement gets stranded.
CREATE TABLE IF NOT EXISTS public.programme_batches (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id   uuid        NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  seq            int         NOT NULL,
  requested      int         NOT NULL,
  granted        int         NOT NULL DEFAULT 0,
  delivered      int,
  status         text        NOT NULL DEFAULT 'running',
  reservation_id uuid,
  created_at     timestamptz NOT NULL DEFAULT now(),
  settled_at     timestamptz
);

ALTER TABLE public.programme_batches DROP CONSTRAINT IF EXISTS programme_batches_status_check;
ALTER TABLE public.programme_batches ADD CONSTRAINT programme_batches_status_check
  CHECK (status IN ('running', 'served', 'released', 'stranded'));

ALTER TABLE public.programme_batches DROP CONSTRAINT IF EXISTS programme_batches_positive_check;
ALTER TABLE public.programme_batches ADD CONSTRAINT programme_batches_positive_check
  CHECK (requested > 0 AND granted >= 0 AND (delivered IS NULL OR delivered >= 0));

CREATE UNIQUE INDEX IF NOT EXISTS programme_batches_seq_uidx
  ON public.programme_batches (programme_id, seq);
CREATE INDEX IF NOT EXISTS programme_batches_programme_idx
  ON public.programme_batches (programme_id, created_at);
-- 'stranded' is the dead-letter state: a release that itself failed. Indexed because it is
-- an alert queue, and an entitlement nobody can find is an entitlement nobody restores.
CREATE INDEX IF NOT EXISTS programme_batches_stranded_idx
  ON public.programme_batches (status) WHERE status = 'stranded';

-- ── 3 · additive columns on existing tables ─────────────────────────────────────────────
--
-- programme_id on ICPS, not on clients: a programme may contain SEVERAL ICPs, and
-- `runIcpJob` already loads the ICP row with select('*'), so the programme is deterministic
-- from the row the job is already holding. Deriving it from the client instead would guess
-- when a client has more than one.
ALTER TABLE public.icps
  ADD COLUMN IF NOT EXISTS programme_id uuid;
ALTER TABLE public.icps DROP CONSTRAINT IF EXISTS icps_programme_fk;
ALTER TABLE public.icps ADD CONSTRAINT icps_programme_fk
  FOREIGN KEY (programme_id) REFERENCES public.programmes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS icps_programme_idx ON public.icps (programme_id);

-- The sourcing ledger gains programme attribution so contribution can be computed from
-- ACTUAL cost rather than an estimate. SET NULL, never CASCADE: deleting a programme must
-- never delete the record of money we spent.
ALTER TABLE public.sourcing_ledger
  ADD COLUMN IF NOT EXISTS programme_id uuid;
ALTER TABLE public.sourcing_ledger DROP CONSTRAINT IF EXISTS sourcing_ledger_programme_fk;
ALTER TABLE public.sourcing_ledger ADD CONSTRAINT sourcing_ledger_programme_fk
  FOREIGN KEY (programme_id) REFERENCES public.programmes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS sourcing_ledger_programme_idx
  ON public.sourcing_ledger (programme_id) WHERE programme_id IS NOT NULL;

-- Partner commissions gain a BASIS, because there are now two of them and a row that does
-- not say which one it used cannot be audited. Legacy rows stay NULL and keep meaning
-- 'lead_sale' by their history — no backfill, because inventing a basis for a historical
-- row is a claim about a payment nobody re-checked.
ALTER TABLE public.partner_commissions
  ADD COLUMN IF NOT EXISTS programme_id uuid;
ALTER TABLE public.partner_commissions
  ADD COLUMN IF NOT EXISTS basis text;
ALTER TABLE public.partner_commissions DROP CONSTRAINT IF EXISTS partner_commissions_programme_fk;
ALTER TABLE public.partner_commissions ADD CONSTRAINT partner_commissions_programme_fk
  FOREIGN KEY (programme_id) REFERENCES public.programmes(id) ON DELETE SET NULL;
ALTER TABLE public.partner_commissions DROP CONSTRAINT IF EXISTS partner_commissions_basis_check;
ALTER TABLE public.partner_commissions ADD CONSTRAINT partner_commissions_basis_check
  CHECK (basis IS NULL OR basis IN ('lead_sale', 'programme_contribution'));
CREATE INDEX IF NOT EXISTS partner_commissions_programme_idx
  ON public.partner_commissions (programme_id) WHERE programme_id IS NOT NULL;

-- ── 4 · the authority gate, inside the atomic function ──────────────────────────────────
--
-- ⚠️ THE LEGACY BRANCH BELOW IS BYTE-FOR-BYTE THE EXISTING FUNCTION BODY. It is reproduced
-- rather than refactored so a reader can diff it against 20260711_sourcing_fences.sql and
-- see that no legacy client's behaviour moved. The programme branch is new code beside it.
CREATE OR REPLACE FUNCTION public.try_spend_sourcing(
  p_client_id uuid,
  p_requested int,
  p_programme_id uuid DEFAULT NULL
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rate         numeric := 0.28;
  v_daily_cap    int     := 100;
  v_cap_usd      numeric;
  v_month_usd    numeric;
  v_month_room   int;
  v_day_used     int;
  v_day_room     int;
  v_allowance    int;
  v_granted      int;
  v_open_id      uuid;
  v_open_status  text;
  v_room         int;
BEGIN
  IF p_requested IS NULL OR p_requested <= 0 THEN
    RETURN 0;
  END IF;

  -- WHICH REGIME APPLIES IS DECIDED HERE, FROM THE DATABASE — never from what the caller
  -- sent. This is the whole point of putting the gate inside the function.
  SELECT id, status INTO v_open_id, v_open_status
    FROM public.programmes
    WHERE client_id = p_client_id AND status NOT IN ('COMPLETED', 'CANCELLED')
    LIMIT 1;

  -- FAIL CLOSED ①: a legacy client can never borrow programme authority.
  IF v_open_id IS NULL AND p_programme_id IS NOT NULL THEN
    RETURN 0;
  END IF;

  -- FAIL CLOSED ②: a programme client must declare its programme. Omission is not a
  -- fallback to the legacy wallet — it is a caller that forgot, and it returns 0.
  IF v_open_id IS NOT NULL AND p_programme_id IS NULL THEN
    RETURN 0;
  END IF;

  -- FAIL CLOSED ③: a mismatched id is never treated as "close enough".
  IF v_open_id IS NOT NULL AND p_programme_id <> v_open_id THEN
    RETURN 0;
  END IF;

  IF v_open_id IS NOT NULL THEN
    -- ── PROGRAMME AUTHORITY ───────────────────────────────────────────────────────────
    -- Sourcing is authorised by the first payment, so the programme must have reached at
    -- least SOURCING_AUTHORISED and must not be paused. Money is already collected; the
    -- constraint here is entitlement, not wallet balance.
    IF v_open_status NOT IN ('SOURCING_AUTHORISED', 'SOURCING', 'READY_FOR_APPROVAL', 'APPROVED', 'LIVE') THEN
      RETURN 0;
    END IF;
    IF EXISTS (SELECT 1 FROM public.programmes WHERE id = v_open_id AND paused_at IS NOT NULL) THEN
      RETURN 0;
    END IF;

    -- RESERVE, do not consume: `sourced_reserved` rises now and is converted to
    -- `sourced_used` only when a provider actually delivers. The CHECK constraint makes
    -- two concurrent batches unable to exceed the ceiling — the loser's UPDATE violates it.
    SELECT GREATEST(0, sourcing_ceiling - sourced_used - sourced_reserved) INTO v_room
      FROM public.programmes WHERE id = v_open_id;

    v_granted := LEAST(p_requested, COALESCE(v_room, 0));
    IF v_granted <= 0 THEN
      RETURN 0;
    END IF;

    UPDATE public.programmes
      SET sourced_reserved = sourced_reserved + v_granted, updated_at = now()
      WHERE id = v_open_id
        AND sourced_used + sourced_reserved + v_granted <= sourcing_ceiling;
    IF NOT FOUND THEN
      RETURN 0;
    END IF;

    -- Provider spend is still recorded pessimistically at grant time — the existing
    -- spend-safety model, unchanged. Attribution lets contribution use ACTUAL cost.
    INSERT INTO public.sourcing_ledger (client_id, records, cost_usd, programme_id)
      VALUES (p_client_id, v_granted, v_granted * v_rate, v_open_id);

    RETURN v_granted;
  END IF;

  -- ── LEGACY BEHAVIOUR — unchanged from 20260711_sourcing_fences.sql ──────────────────
  SELECT pdl_monthly_cap_usd INTO v_cap_usd FROM public.money_settings WHERE id = 1;
  v_cap_usd := COALESCE(v_cap_usd, 300);
  SELECT COALESCE(SUM(cost_usd), 0) INTO v_month_usd
    FROM public.sourcing_ledger
    WHERE created_at >= date_trunc('month', now());
  v_month_room := GREATEST(0, floor((v_cap_usd - v_month_usd) / v_rate))::int;

  SELECT COALESCE(SUM(records), 0) INTO v_day_used
    FROM public.sourcing_ledger
    WHERE client_id = p_client_id
      AND created_at >= date_trunc('day', now());
  v_day_room := GREATEST(0, v_daily_cap - v_day_used);

  SELECT COALESCE(sourcing_allowance, 0) INTO v_allowance
    FROM public.clients WHERE id = p_client_id;

  v_granted := LEAST(p_requested, COALESCE(v_allowance, 0), v_month_room, v_day_room);
  IF v_granted <= 0 THEN
    RETURN 0;
  END IF;

  UPDATE public.clients
    SET sourcing_allowance = sourcing_allowance - v_granted
    WHERE id = p_client_id
      AND COALESCE(sourcing_allowance, 0) >= v_granted;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  INSERT INTO public.sourcing_ledger (client_id, records, cost_usd)
    VALUES (p_client_id, v_granted, v_granted * v_rate);

  RETURN v_granted;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.try_spend_sourcing(uuid, int, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.try_spend_sourcing(uuid, int, uuid) TO service_role;

-- ── 5 · settle a batch — reserve → used, or release ─────────────────────────────────────
--
-- Called once a provider has returned. Converts reservation into consumption for what was
-- actually delivered and RELEASES the remainder, so a provider returning 0 does not
-- permanently burn a client's paid entitlement.
CREATE OR REPLACE FUNCTION public.settle_programme_batch(
  p_batch_id  uuid,
  p_delivered int
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prog    uuid;
  v_granted int;
  v_status  text;
  v_deliver int;
BEGIN
  SELECT programme_id, granted, status INTO v_prog, v_granted, v_status
    FROM public.programme_batches WHERE id = p_batch_id FOR UPDATE;
  IF v_prog IS NULL THEN
    RETURN 0;
  END IF;
  -- Idempotent: a settled batch settles once. A webhook or retry replaying this must not
  -- release the same reservation twice and hand the client volume they already consumed.
  IF v_status <> 'running' THEN
    RETURN 0;
  END IF;

  v_deliver := LEAST(GREATEST(COALESCE(p_delivered, 0), 0), v_granted);

  UPDATE public.programmes
    SET sourced_reserved = GREATEST(0, sourced_reserved - v_granted),
        sourced_used     = sourced_used + v_deliver,
        status           = CASE WHEN status = 'SOURCING_AUTHORISED' THEN 'SOURCING' ELSE status END,
        updated_at       = now()
    WHERE id = v_prog;

  UPDATE public.programme_batches
    SET delivered = v_deliver,
        status    = CASE WHEN v_deliver > 0 THEN 'served' ELSE 'released' END,
        settled_at = now()
    WHERE id = p_batch_id;

  RETURN v_deliver;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.settle_programme_batch(uuid, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.settle_programme_batch(uuid, int) TO service_role;

-- ── 6 · RLS ─────────────────────────────────────────────────────────────────────────────
--
-- ON with NO policies, matching the `acquisition_memory` precedent (20260826). Supabase RLS
-- is off by default and `apps/portal` ships the anon key to every browser. Nothing
-- client-facing reads these tables — every legitimate caller is server-side on the service
-- role, which bypasses RLS — so the correct policy set is EMPTY. A policy added here later
-- is a deliberate decision to expose programme money to a browser.
ALTER TABLE IF EXISTS public.programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.programme_batches ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.programmes IS
  'BUILD-002 · the targeted booked-meeting programme (R74/R77/R78/R81). Money in integer cents. Pause is orthogonal to status. Contribution stays NULL until the programme is terminal and settled.';
COMMENT ON TABLE public.programme_batches IS
  'Controlled ~250-lead execution batches. reserve at grant, convert to used on delivery, release on provider failure. status=stranded is the dead-letter queue for a release that itself failed.';
