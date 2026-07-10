-- 20260710_grant_first_run_credits.sql
-- M0 · #371 (AR-34) — RACY WELCOME/TRIAL GRANTS. The first-run credit grants read
-- credit_balance, then wrote `(balance ?? 0) + N` (or an absolute `= 20`) in a separate
-- statement. Two concurrent ICP runs both see first_icp_run_at = null → double grant; and
-- the write clobbers a purchase that landed between the read and the write. This RPC does
-- the whole thing in ONE atomic conditional UPDATE:
--   * grants only when first_icp_run_at IS NULL (so exactly one caller wins → no double),
--   * increments ADDITIVELY against the current row (so a concurrent purchase survives),
--   * optionally stamps first_icp_run_at (claim the first run),
--   * optionally gates on balance < p_max_balance (the legacy "only if empty" top-up),
--   * returns whether THIS call actually granted, so the ledger row is written once.
--
-- Run on STAGING (kind-staging) first, then PRODUCTION.

CREATE OR REPLACE FUNCTION public.grant_first_run_credits(
  p_client_id       uuid,
  p_amount          integer,
  p_max_balance     integer,   -- grant only when current balance < this (use a huge value for "always")
  p_claim_first_run boolean    -- also stamp first_icp_run_at when true
) RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.clients
     SET credit_balance    = COALESCE(credit_balance, 0) + p_amount,
         first_icp_run_at  = CASE WHEN p_claim_first_run
                                  THEN COALESCE(first_icp_run_at, now())
                                  ELSE first_icp_run_at END
   WHERE id = p_client_id
     AND first_icp_run_at IS NULL
     AND COALESCE(credit_balance, 0) < p_max_balance;
  RETURN FOUND;
END $$;
