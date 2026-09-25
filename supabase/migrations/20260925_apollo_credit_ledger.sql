-- ── THE APOLLO CREDIT LEDGER — 25 Sep 2026 (R166 ⑥ · board #2348, P2) ─────────────────
--
-- Every paid Apollo reveal (people/bulk_match, one credit per matched person) is recorded:
-- how many credits, and what it was for (proof_geography · lead_delivery ·
-- programme_qualification). Since the move off PDL nothing recorded what a reveal spent.
-- The budget reads Apollo's own usage first; this ledger is its record and its fallback when
-- a manual APOLLO_MONTHLY_CREDIT_LIMIT is set.
--
-- EXPAND ONLY: one new table, RLS on with no policy (service role only, like the other
-- internal ledgers). No change to any existing table.
CREATE TABLE IF NOT EXISTS public.apollo_credit_ledger (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  credits      integer NOT NULL CHECK (credits >= 0),
  purpose      text NOT NULL DEFAULT 'unspecified'
);

CREATE INDEX IF NOT EXISTS apollo_credit_ledger_occurred_idx ON public.apollo_credit_ledger (occurred_at);

ALTER TABLE public.apollo_credit_ledger ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.apollo_credit_ledger IS
  'Every paid Apollo reveal and the credits it used (R166: paid reveals stop at 80% of the plan).';
