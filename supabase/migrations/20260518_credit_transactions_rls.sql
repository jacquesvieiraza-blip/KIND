-- CRITICAL: Enable RLS on credit_transactions (was missing from original migration)
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY credit_transactions_own ON public.credit_transactions
  FOR ALL USING (client_id = public.current_client_id());
