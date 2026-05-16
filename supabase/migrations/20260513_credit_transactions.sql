-- Phase 3: Credit transaction ledger
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type        text        NOT NULL CHECK (type IN ('purchase', 'referral', 'consumed', 'manual_grant', 'refund')),
  amount      integer     NOT NULL,  -- positive = added, negative = consumed
  plan        text,                  -- 'kind_ai' | 'figsy'
  reference   text,                  -- Paystack reference for purchases
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS credit_transactions_client_idx ON public.credit_transactions(client_id);
