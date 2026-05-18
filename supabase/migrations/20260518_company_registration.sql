-- Add company registration fields to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS company_registration TEXT,
  ADD COLUMN IF NOT EXISTS vat_number TEXT;
