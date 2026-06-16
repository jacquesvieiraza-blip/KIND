-- 20260616_billing_correctness.sql
-- Billing-correctness pass (items 169 + 170). Pairs with the app-layer changes
-- that kill the lead-gen + FIGSY double-charge (item 166) and make delivery
-- pool-aware (item 167).
--
-- Run on STAGING first, then PRODUCTION (confirm the Supabase project name first).

-- ── 169: explicit per-client plan flag ──────────────────────────────────────
-- Tells the single delivery charge which wallet a lead is billed to:
--   lead_gen → clients.credit_balance      (Lead Gen pool, $1/credit)
--   figsy    → clients.figsy_credits_remaining (FIGSY pool, $3/credit)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'lead_gen'
  CHECK (plan IN ('lead_gen', 'figsy'));

-- Backfill: any client that has a FIGSY campaign (any status) or holds FIGSY
-- credits is a FIGSY-plan client; everyone else stays lead_gen.
UPDATE public.clients c
SET plan = 'figsy'
WHERE c.plan <> 'figsy'
  AND (
    COALESCE(c.figsy_credits_remaining, 0) > 0
    OR EXISTS (SELECT 1 FROM public.figsy_campaigns fc WHERE fc.client_id = c.id)
  );

-- ── 170: atomic FIGSY credit decrement ──────────────────────────────────────
-- Mirror of increment_client_credits (20260526). Replaces the read-modify-write
-- in figsy.ts so the balance and the ledger row can't desync under concurrency.
-- Clamps at 0 (a FIGSY balance must never go negative).
CREATE OR REPLACE FUNCTION increment_figsy_credits(
  p_client_id uuid,
  p_amount    integer
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  UPDATE public.clients
    SET figsy_credits_remaining = GREATEST(0, COALESCE(figsy_credits_remaining, 0) + p_amount)
  WHERE id = p_client_id
  RETURNING figsy_credits_remaining INTO v_new_balance;

  RETURN v_new_balance;
END;
$$;

REVOKE EXECUTE ON FUNCTION increment_figsy_credits FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION increment_figsy_credits TO service_role;
