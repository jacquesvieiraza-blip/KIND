-- 20260709_reveal_charge.sql
-- M0 Phase 2 · money path #420/#421 — the $1 REVEAL charge.
--
-- The per-qualified-lead model has TWO charges on TWO wallets:
--   • $1 reveal  → decrements clients.credit_balance        (the "database" tier)
--   • $3 FIGSY   → decrements clients.figsy_credits_remaining (try_charge_figsy_credit)
--
-- This adds the reveal-side twin of try_charge_figsy_credit. The decrement IS the
-- gate: a SINGLE atomic conditional UPDATE that only decrements when the balance is
-- still >= 1, reporting via FOUND whether it actually charged. No credit → no charge
-- → caller must abort the reveal (do NOT call Hunter, do NOT expose the email).
--
-- ⚠️ Do NOT reuse increment_client_credits for charging — it has no balance gate and
-- clamps, so a decrement at balance 0 silently "succeeds" (the #376 class of bug).
--
-- Run on STAGING (kind-staging) first, then PRODUCTION.

CREATE OR REPLACE FUNCTION try_charge_reveal_credit(
  p_client_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.clients
    SET credit_balance = COALESCE(credit_balance, 0) - 1
  WHERE id = p_client_id
    AND COALESCE(credit_balance, 0) >= 1;

  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION try_charge_reveal_credit FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION try_charge_reveal_credit TO service_role;
