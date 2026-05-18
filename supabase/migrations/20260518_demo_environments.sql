-- Demo environment columns on clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS is_demo              BOOLEAN      DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS demo_prospect_name   TEXT,
  ADD COLUMN IF NOT EXISTS demo_created_by      TEXT,
  ADD COLUMN IF NOT EXISTS demo_expires_at      TIMESTAMPTZ;
