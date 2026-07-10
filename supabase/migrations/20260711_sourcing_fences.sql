-- 20260711_sourcing_fences.sql
-- #445 — THE MONEY FENCES (founder-locked 10 Jul). PDL bills $0.28/record at
-- SOURCING — BEFORE any client charge. Sourcing is the ONLY moment our money is at
-- risk (reveal $1 and FIGSY work $3 are both charge-first with trivial cost). Today
-- a client can burn PDL indefinitely with zero revenue. These fences make every PDL
-- dollar PRE-FUNDED by cash already collected:
--
--   • coverage k=2  — a paid client's sourcing allowance grows by 2 records per $1
--                     COLLECTED (accrued at the payment webhook, NOT at spend — a
--                     reveal/work dollar was already counted when the pack was
--                     bought; counting it again would double-grant).
--   • trial pool    — a never-paid client is seeded 10 records at signup and drips
--                     +2 per reveal, HARD-CAPPED at 20 records lifetime.
--   • global cap    — a platform-wide monthly PDL budget ($300 default, admin-
--                     editable) that no amount of client activity can exceed.
--   • daily cap     — the existing 100 records/client/day stays as a second fence
--                     (now counted from the sourcing_ledger, not the leads table).
--
-- The spendable pool is a SINGLE integer `clients.sourcing_allowance`. Seeded 10 at
-- signup; += 2×USD at each purchase; += 2 per trial reveal (capped via
-- trial_sourcing_granted ≤ 20). try_spend_sourcing() decrements it atomically and
-- records the batch in sourcing_ledger. The trial 20-record lifetime cap is enforced
-- at the reveal drip site, not here. (NOTE: a client who later pays keeps up to their
-- residual 10-record trial seed on top of 2×USD — a one-time ≤$2.80 marketing cost;
-- worst-case paid margin ~30% instead of the theoretical 39%, still safely positive.)
--
-- Run on STAGING (kind-staging) first, then PRODUCTION.

-- ── 1. Client allowance columns ──────────────────────────────────────────────
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS sourcing_allowance     int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trial_sourcing_granted int NOT NULL DEFAULT 0;

-- ── 2. Sourcing ledger — one row per PDL batch actually purchased ─────────────
-- The audit trail + the source of the daily and monthly spend sums. records = the
-- GRANTED batch size (what we asked PDL for = what we may keep); cost_usd = records ×
-- the per-record rate at spend time.
CREATE TABLE IF NOT EXISTS public.sourcing_ledger (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  uuid        NOT NULL,
  records    int         NOT NULL,
  cost_usd   numeric     NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sourcing_ledger_client_time_idx
  ON public.sourcing_ledger (client_id, created_at);
CREATE INDEX IF NOT EXISTS sourcing_ledger_time_idx
  ON public.sourcing_ledger (created_at);

-- ── 3. Money settings — the single-row global config (admin-editable) ─────────
CREATE TABLE IF NOT EXISTS public.money_settings (
  id                  int         PRIMARY KEY DEFAULT 1,
  pdl_monthly_cap_usd numeric     NOT NULL DEFAULT 300,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT money_settings_singleton CHECK (id = 1)
);
INSERT INTO public.money_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ── 4. try_spend_sourcing — the atomic, fail-closed sourcing gate ────────────
-- Returns the GRANTED batch size (0 = refused). granted = LEAST of: what was asked,
-- the client's spendable allowance, the remaining global monthly budget in records,
-- and the remaining daily per-client records. Decrement + ledger insert happen in the
-- SAME statement-set so two concurrent runs can never both pass the same budget (the
-- UPDATE ... WHERE allowance >= granted is the atomic gate, mirroring
-- try_charge_reveal_credit / try_charge_figsy_credit). Never partial: it computes the
-- grant, then commits exactly that many.
CREATE OR REPLACE FUNCTION public.try_spend_sourcing(
  p_client_id uuid,
  p_requested int
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rate         numeric := 0.28;         -- PDL $/record
  v_daily_cap    int     := 100;          -- per-client records/day (second fence)
  v_cap_usd      numeric;
  v_month_usd    numeric;
  v_month_room   int;
  v_day_used     int;
  v_day_room     int;
  v_allowance    int;
  v_granted      int;
BEGIN
  IF p_requested IS NULL OR p_requested <= 0 THEN
    RETURN 0;
  END IF;

  -- Global monthly ceiling → remaining records this calendar month.
  SELECT pdl_monthly_cap_usd INTO v_cap_usd FROM public.money_settings WHERE id = 1;
  v_cap_usd := COALESCE(v_cap_usd, 300);
  SELECT COALESCE(SUM(cost_usd), 0) INTO v_month_usd
    FROM public.sourcing_ledger
    WHERE created_at >= date_trunc('month', now());
  v_month_room := GREATEST(0, floor((v_cap_usd - v_month_usd) / v_rate))::int;

  -- Daily per-client ceiling → remaining records today.
  SELECT COALESCE(SUM(records), 0) INTO v_day_used
    FROM public.sourcing_ledger
    WHERE client_id = p_client_id
      AND created_at >= date_trunc('day', now());
  v_day_room := GREATEST(0, v_daily_cap - v_day_used);

  -- Spendable allowance (paid 2×USD + residual trial seed).
  SELECT COALESCE(sourcing_allowance, 0) INTO v_allowance
    FROM public.clients WHERE id = p_client_id;

  v_granted := LEAST(p_requested, COALESCE(v_allowance, 0), v_month_room, v_day_room);
  IF v_granted <= 0 THEN
    RETURN 0;
  END IF;

  -- Atomic decrement — the WHERE guard prevents a concurrent run from over-spending
  -- the same allowance (if it lost the race, allowance < v_granted → 0 rows → retry-safe 0).
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

REVOKE EXECUTE ON FUNCTION public.try_spend_sourcing FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.try_spend_sourcing TO service_role;

-- ── 5. add_sourcing_allowance — accrual helper (guarded, service-role) ────────
-- Called from the payment webhook (p_records = 2 × usd) and the trial reveal drip
-- (p_records = 2, only while under the 20-record lifetime trial cap — the caller
-- passes p_trial := true so we bump trial_sourcing_granted and refuse over-cap).
CREATE OR REPLACE FUNCTION public.add_sourcing_allowance(
  p_client_id uuid,
  p_records   int,
  p_trial     boolean DEFAULT false
) RETURNS int                       -- records actually added
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_granted_so_far int;
  v_add            int := p_records;
BEGIN
  IF p_records IS NULL OR p_records <= 0 THEN RETURN 0; END IF;

  IF p_trial THEN
    SELECT COALESCE(trial_sourcing_granted, 0) INTO v_granted_so_far
      FROM public.clients WHERE id = p_client_id;
    v_add := LEAST(p_records, GREATEST(0, 20 - v_granted_so_far));  -- 20 lifetime cap
    IF v_add <= 0 THEN RETURN 0; END IF;
    UPDATE public.clients
      SET sourcing_allowance     = COALESCE(sourcing_allowance, 0) + v_add,
          trial_sourcing_granted = COALESCE(trial_sourcing_granted, 0) + v_add
      WHERE id = p_client_id;
  ELSE
    UPDATE public.clients
      SET sourcing_allowance = COALESCE(sourcing_allowance, 0) + v_add
      WHERE id = p_client_id;
  END IF;

  RETURN v_add;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_sourcing_allowance FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.add_sourcing_allowance TO service_role;

-- ── 6. Backfill — existing PAYING clients get 2 × lifetime USD collected ──────
-- allowance = 2 × (sum of purchase-dollar value) − records already sourced (floor 0).
-- Purchase dollars are derived from the credit_transactions ledger: 'purchase' rows
-- carry the credit count; lead_gen credits = $1 each, figsy credits = $3 each. We
-- only have credit counts here, so value = lead_gen_credits×1 + figsy_credits×3.
-- (Trial/bonus rows are type 'trial_bonus'/'referral' → excluded: no money collected.)
WITH paid AS (
  SELECT client_id,
         SUM(CASE WHEN plan = 'figsy' THEN amount * 3 ELSE amount * 1 END) AS usd
  FROM public.credit_transactions
  WHERE type = 'purchase' AND amount > 0
  GROUP BY client_id
)
UPDATE public.clients c
  SET sourcing_allowance = GREATEST(0, (paid.usd * 2)::int - COALESCE((
        SELECT SUM(records) FROM public.sourcing_ledger sl WHERE sl.client_id = c.id
      ), 0))
  FROM paid
  WHERE c.id = paid.client_id;
