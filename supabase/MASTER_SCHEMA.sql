-- ═══════════════════════════════════════════════════════════════════════════════
-- K.I.N.D — MASTER SCHEMA MIGRATIONS
-- Run this in Supabase SQL Editor to apply all pending schema changes.
-- All statements are idempotent (safe to re-run).
-- Last updated: 2026-05-26
-- ═══════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 20260513_credit_transactions.sql
-- ────────────────────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────────────────────
-- 20260513_referral_credits.sql
-- ────────────────────────────────────────────────────────────────────────────
-- Phase 2: Referral system + credit balance
-- Run in Supabase SQL Editor

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS referred_by      uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS credit_balance   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_icp_run_at timestamptz;

-- ────────────────────────────────────────────────────────────────────────────
-- 20260514_founder_agent.sql
-- ────────────────────────────────────────────────────────────────────────────
-- Founder agent activity log
create table if not exists founder_agent_logs (
  id          uuid primary key default gen_random_uuid(),
  agent       text not null,  -- 'support' | 'cs' | 'ae'
  action      text not null,
  payload     jsonb,
  created_at  timestamptz default now()
);

create index if not exists idx_founder_agent_logs_agent on founder_agent_logs(agent);
create index if not exists idx_founder_agent_logs_created_at on founder_agent_logs(created_at desc);

-- ────────────────────────────────────────────────────────────────────────────
-- 20260514_terms_acceptance.sql
-- ────────────────────────────────────────────────────────────────────────────
-- Replace order_forms-based agreement tracking with T&C acceptance at payment
-- Clients accept T&Cs by ticking a checkbox before their first Paystack credit purchase

alter table public.clients
  add column if not exists terms_accepted_at  timestamptz,
  add column if not exists terms_accepted_ip  text;

-- ────────────────────────────────────────────────────────────────────────────
-- 20260517_contact_requests.sql
-- ────────────────────────────────────────────────────────────────────────────
-- Contact requests (demo bookings, general enquiries)
CREATE TABLE IF NOT EXISTS contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  company text,
  message text,
  type text DEFAULT 'demo', -- 'demo' | 'general' | 'enterprise'
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_contact" ON contact_requests
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "service_read_contact" ON contact_requests
  FOR SELECT TO service_role USING (true);

-- Partner applications
CREATE TABLE IF NOT EXISTS partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  company text,
  website text,
  partner_type text,
  message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE partner_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_partner" ON partner_applications
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "service_read_partner" ON partner_applications
  FOR SELECT TO service_role USING (true);

-- ────────────────────────────────────────────────────────────────────────────
-- 20260517_product_waitlist.sql
-- ────────────────────────────────────────────────────────────────────────────
-- Product waitlist for coming-soon products (Virtual Assistant, Chatbot Agent)
CREATE TABLE IF NOT EXISTS product_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  company text,
  product text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_waitlist" ON product_waitlist
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "service_read_waitlist" ON product_waitlist
  FOR SELECT TO service_role USING (true);

-- ────────────────────────────────────────────────────────────────────────────
-- 20260518_company_registration.sql
-- ────────────────────────────────────────────────────────────────────────────
-- Add company registration fields to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS company_registration TEXT,
  ADD COLUMN IF NOT EXISTS vat_number TEXT;

-- ────────────────────────────────────────────────────────────────────────────
-- 20260518_credit_transactions_rls.sql
-- ────────────────────────────────────────────────────────────────────────────
-- CRITICAL: Enable RLS on credit_transactions (was missing from original migration)
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY credit_transactions_own ON public.credit_transactions
  FOR ALL USING (client_id = public.current_client_id());

-- ────────────────────────────────────────────────────────────────────────────
-- 20260518_demo_environments.sql
-- ────────────────────────────────────────────────────────────────────────────
-- Demo environment columns on clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS is_demo              BOOLEAN      DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS demo_prospect_name   TEXT,
  ADD COLUMN IF NOT EXISTS demo_created_by      TEXT,
  ADD COLUMN IF NOT EXISTS demo_expires_at      TIMESTAMPTZ;

-- ────────────────────────────────────────────────────────────────────────────
-- 20260518_enable_rls.sql
-- ────────────────────────────────────────────────────────────────────────────
-- Re-enable RLS on clients and icps tables
-- These were disabled during debugging. Policies already exist from schema.sql.
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.icps    ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────────────────
-- 20260519_figsy_memory.sql
-- ────────────────────────────────────────────────────────────────────────────
-- FIGSY agent memory: one row per client, updated after each campaign analysis
create table if not exists figsy_memory (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients(id) on delete cascade,
  best_subject_lines   text[]   default '{}',
  avg_reply_rate_30d   numeric  default 0,
  total_sent_all_time  integer  default 0,
  total_replies_all_time integer default 0,
  top_performing_icp   text,
  last_updated         timestamptz default now(),
  constraint figsy_memory_client_unique unique (client_id)
);

alter table figsy_memory enable row level security;

create policy "Clients can read own memory"
  on figsy_memory for select
  using (client_id = (select id from clients where user_id = auth.uid()));

-- ────────────────────────────────────────────────────────────────────────────
-- 20260525_fix_subscriptions_schema.sql
-- ────────────────────────────────────────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Fix subscriptions schema drift
-- Date:      2026-05-25
-- Issue:     Live DB is missing amount_usd column and amount_zar has no DEFAULT.
--            This caused all new signups to fail (NOT NULL violation on amount_zar).
--            Paid subscription activation and MRR calculations also broken.
--
-- Run in: Supabase SQL Editor → New Query → Paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Remove amount_usd if it somehow partially exists (idempotent)
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS amount_usd;

-- 2. Ensure amount_zar has a DEFAULT so inserts without it don't blow up
ALTER TABLE public.subscriptions
  ALTER COLUMN amount_zar SET DEFAULT 0;

-- 3. Backfill any NULLs that slipped through (shouldn't be any, but safe)
UPDATE public.subscriptions
  SET amount_zar = 0
  WHERE amount_zar IS NULL;

-- 4. Enforce NOT NULL now that defaults are set
ALTER TABLE public.subscriptions
  ALTER COLUMN amount_zar SET NOT NULL;

-- Verify
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'subscriptions'
  AND column_name  IN ('amount_zar', 'amount_usd')
ORDER BY column_name;

-- ────────────────────────────────────────────────────────────────────────────
-- 20260526_drip_and_controls.sql
-- ────────────────────────────────────────────────────────────────────────────
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Lead drip system + client delivery controls
-- Date:      2026-05-26
-- What it does:
--   1. Adds delivered_at to leads — NULL = not yet visible to client
--   2. Adds daily_drip_rate to clients — how many leads to deliver per day (default 5)
--   3. Backfills delivered_at = created_at on all existing leads (so existing
--      clients don't lose visibility of leads they already have)
--
-- Run in: Supabase SQL Editor → New Query → Paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add delivered_at to leads (NULL = pending delivery)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Backfill all existing leads as already delivered
--    (so no existing client loses access to their current leads)
UPDATE public.leads
  SET delivered_at = created_at
  WHERE delivered_at IS NULL;

-- 3. Add daily_drip_rate to clients (how many leads drip per day)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS daily_drip_rate INTEGER DEFAULT 5;

-- 4. Index for fast drip queries (undelivered leads per client)
CREATE INDEX IF NOT EXISTS idx_leads_drip
  ON public.leads (client_id, delivered_at)
  WHERE delivered_at IS NULL;

-- Verify
SELECT
  column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('leads', 'clients')
  AND column_name IN ('delivered_at', 'daily_drip_rate')
ORDER BY table_name, column_name;

