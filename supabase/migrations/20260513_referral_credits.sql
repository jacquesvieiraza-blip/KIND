-- Phase 2: Referral system + credit balance
-- Run in Supabase SQL Editor

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS referred_by      uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS credit_balance   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_icp_run_at timestamptz;
