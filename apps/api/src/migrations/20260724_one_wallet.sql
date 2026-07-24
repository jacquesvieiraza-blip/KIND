-- ONE WALLET — the work model (founder-locked 24 Jul, supersedes #492).
--
-- The client's 👍 charges a flat $4 per approved lead, FINAL. No $1/$3 split shown,
-- no hold, no capture-on-booking, no release, no TTL. A dead email is never charged
-- (the $4 is reversed in-flow). Meetings are reported, not a money condition.
--
-- This migration introduces a single dollar wallet + two atomic RPCs. The old
-- credit_balance / figsy_credits_remaining columns and the credit_holds table are
-- KEPT for history (no data destroyed) — the code simply stops writing to them.
--
-- Single-step, idempotent (IF NOT EXISTS throughout). Safe to re-run.

-- ── the single wallet, in US dollars ──────────────────────────────────────────
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS wallet_balance_usd numeric NOT NULL DEFAULT 0;

-- One-time backfill: fold the two old balances into dollars — reveal credits were $1
-- each, FIGSY work credits $3 each. Runs once (guarded so a re-run can't double it).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.app_migrations_applied WHERE key = 'one_wallet_backfill') THEN
    UPDATE public.clients
      SET wallet_balance_usd = wallet_balance_usd
        + COALESCE(credit_balance, 0) * 1
        + COALESCE(figsy_credits_remaining, 0) * 3;
    INSERT INTO public.app_migrations_applied (key) VALUES ('one_wallet_backfill');
  END IF;
EXCEPTION WHEN undefined_table THEN
  -- app_migrations_applied doesn't exist → create it, then backfill once.
  CREATE TABLE IF NOT EXISTS public.app_migrations_applied (
    key text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now()
  );
  UPDATE public.clients
    SET wallet_balance_usd = wallet_balance_usd
      + COALESCE(credit_balance, 0) * 1
      + COALESCE(figsy_credits_remaining, 0) * 3;
  INSERT INTO public.app_migrations_applied (key) VALUES ('one_wallet_backfill');
END $$;

-- ── atomic charge: the decrement IS the gate (fail-closed) ─────────────────────
-- Returns true only when the wallet had at least p_amount and was debited. A caller
-- must treat false as "insufficient funds" (402) and NOT proceed.
CREATE OR REPLACE FUNCTION public.try_charge_wallet(p_client_id uuid, p_amount numeric)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE v_ok boolean;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN false; END IF;
  UPDATE public.clients
    SET wallet_balance_usd = wallet_balance_usd - p_amount
    WHERE id = p_client_id
      AND wallet_balance_usd >= p_amount;
  GET DIAGNOSTICS v_ok = ROW_COUNT;
  RETURN v_ok > 0;
END $$;

-- ── change the wallet: top-ups + dead-email reversal (positive), refund/chargeback
-- claw-back (negative). Clamps at 0 so a claw-back can never drive the wallet
-- negative (mirrors the old increment_*_credits clamp behaviour). ────────────────
CREATE OR REPLACE FUNCTION public.increment_wallet(p_client_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_amount IS NULL OR p_amount = 0 THEN RETURN; END IF;
  UPDATE public.clients
    SET wallet_balance_usd = GREATEST(0, wallet_balance_usd + p_amount)
    WHERE id = p_client_id;
END $$;

-- ── ledger types: keep 'usage'/'purchase'/'refund'; the old 'hold'/'release' rows
-- stay valid for history but are no longer written. Idempotent re-create. ────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credit_transactions_type_check') THEN
    ALTER TABLE public.credit_transactions DROP CONSTRAINT credit_transactions_type_check;
  END IF;
END $$;

ALTER TABLE public.credit_transactions
  ADD CONSTRAINT credit_transactions_type_check
  CHECK (type IN (
    'purchase','credit_purchase',
    'referral','referral_bonus',
    'trial_bonus',
    'consumed','usage',
    'manual_grant','refund',
    'hold','release',         -- retired (#492 history) — kept so old rows validate
    'wallet_topup','wallet_charge','wallet_reverse'  -- one-wallet lifecycle
  ));
