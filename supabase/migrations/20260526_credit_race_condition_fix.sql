-- Fix: Credit race condition
-- Adds unique constraint on credit_transactions.reference to prevent
-- duplicate credits being awarded if the /verify endpoint is called twice
-- simultaneously with the same Paystack reference.
--
-- The application-level idempotency check has a TOCTOU race window.
-- This DB-level constraint makes it impossible to insert two rows
-- with the same reference, regardless of concurrency.

-- Unique constraint on reference (only for non-null references — purchases)
CREATE UNIQUE INDEX IF NOT EXISTS credit_transactions_reference_unique
  ON public.credit_transactions (reference)
  WHERE reference IS NOT NULL;

-- RPC: atomic credit increment — avoids read-modify-write in application code
-- Usage: SELECT increment_client_credits(client_id, amount)
CREATE OR REPLACE FUNCTION increment_client_credits(
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
    SET credit_balance = COALESCE(credit_balance, 0) + p_amount
  WHERE id = p_client_id
  RETURNING credit_balance INTO v_new_balance;

  RETURN v_new_balance;
END;
$$;

-- Grant execute to authenticated users via service role only
REVOKE EXECUTE ON FUNCTION increment_client_credits FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION increment_client_credits TO service_role;
