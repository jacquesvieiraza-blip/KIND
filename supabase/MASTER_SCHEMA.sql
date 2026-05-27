-- ═══════════════════════════════════════════════════════════════════════════════
-- K.I.N.D — MASTER SCHEMA MIGRATIONS
-- Run this in Supabase SQL Editor to apply ALL pending schema changes.
-- All statements are idempotent (safe to re-run).
-- Last updated: 2026-05-27
-- ═══════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════════
-- SECTION 0 — FOUNDER MORNING CHECKLIST (run before anything else)
-- Date: 2026-05-28 morning
-- ════════════════════════════════════════════════════════════════════════════════
--
-- STEP 1 — Run this entire file in Supabase SQL Editor
--   Go to: https://app.supabase.com → your project → SQL Editor → New Query
--   Paste this entire file → Run
--   Expected: all CREATE TABLE / ALTER TABLE statements succeed (green ticks)
--   Tables created: credit_transactions, figsy_campaigns, figsy_enrollments,
--                   figsy_replies, figsy_calls, lead_enrichment, webhook_triggers,
--                   icps (org_names column), subscriptions (stripe_subscription_id)
--
-- STEP 2 — Railway: add SUPABASE_SERVICE_ROLE_KEY to admin service
--   Railway → kind/admin → Variables → + New Variable
--   Name:  SUPABASE_SERVICE_ROLE_KEY
--   Value: [your Supabase service role key — Project Settings → API → service_role]
--   Click Deploy — admin dashboard will load live data once deployed
--
-- STEP 3 — Stripe setup (portal billing)
--   a) Create products in Stripe Dashboard for: Lead Gen credits, FIGSY credits,
--      Milla ($49/mo), Vida ($29/mo), Bundle ($69/mo)
--   b) Copy each Price ID → add to Railway portal Variables:
--      STRIPE_PRICE_LEAD_20, STRIPE_PRICE_LEAD_40, STRIPE_PRICE_LEAD_100
--      STRIPE_PRICE_FIGSY_20, STRIPE_PRICE_FIGSY_40, STRIPE_PRICE_FIGSY_100
--      STRIPE_PRICE_MILLA, STRIPE_PRICE_VIDA, STRIPE_PRICE_BUNDLE
--   c) Set up Stripe Webhook → endpoint: https://kindapi-production-e64c.up.railway.app/webhooks/stripe
--      Events: checkout.session.completed, invoice.paid, customer.subscription.deleted
--      Copy webhook secret → add STRIPE_WEBHOOK_SECRET to Railway API Variables
--
-- STEP 4 — HubSpot CRM
--   a) Create free HubSpot account at hubspot.com
--   b) Settings → Integrations → Private Apps → Create → copy API key
--   c) Add to Railway API Variables: HUBSPOT_API_KEY=your_key
--
-- STEP 5 — Resend inbound email (for FIGSY reply tracking)
--   a) Resend Dashboard → Domains → verify get-kind.com (add DNS records in GoDaddy)
--   b) Resend → Inbound → Create webhook: https://kindapi-production-e64c.up.railway.app/webhooks/resend
--   c) All replies to figsy@get-kind.com will be auto-classified and appear in Inbox
--
-- STEP 6 — DNS (if app.get-kind.com still not resolving)
--   Check GoDaddy → DNS → CNAME record: app → gvnfyf41.up.railway.app
--   If propagated: portal will load at https://app.get-kind.com
--   If not: use https://kindportal-production.up.railway.app directly
--
-- STEP 7 — Client logo for W6 social proof
--   Add your first client's logo to: apps/portal/public/logos/client-w6.png
--   It will appear on the login page social proof strip automatically
--
-- ════════════════════════════════════════════════════════════════════════════════

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


-- ════════════════════════════════════════════════════════════════════════════════
-- 2026-05-27 ADDITIONS — Built from Alta competitive analysis + audit fixes
-- Last updated: 2026-05-27
-- ════════════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- 20260527_stripe_subscription_id.sql
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

CREATE INDEX IF NOT EXISTS subscriptions_stripe_id_idx
  ON public.subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────────────
-- ABM named-account targeting in ICP builder
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.icps
  ADD COLUMN IF NOT EXISTS organization_names text[] DEFAULT '{}';

-- ────────────────────────────────────────────────────────────────────────────
-- Lead enrichment (AI research columns per lead)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lead_enrichment (
  lead_id           text PRIMARY KEY REFERENCES public.leads(id) ON DELETE CASCADE,
  recent_signal     text,
  company_context   text,
  opening_line      text,
  enrichment_score  int CHECK (enrichment_score BETWEEN 1 AND 10),
  enriched_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_enrichment_enriched_at_idx
  ON public.lead_enrichment (enriched_at DESC);

ALTER TABLE public.lead_enrichment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role bypass" ON public.lead_enrichment
  FOR ALL USING (true);

-- ────────────────────────────────────────────────────────────────────────────
-- FIGSY voice calls (006_voice_calls.sql — from packages/db/migrations)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.figsy_calls (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id     uuid NOT NULL REFERENCES public.figsy_enrollments(id) ON DELETE CASCADE,
  lead_id           uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  campaign_id       uuid NOT NULL REFERENCES public.figsy_campaigns(id) ON DELETE CASCADE,
  client_id         uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  vapi_call_id      text,
  status            text NOT NULL DEFAULT 'initiated'
                      CHECK (status IN ('initiated','ringing','in_progress','ended','failed')),
  outcome           text
                      CHECK (outcome IN ('answered','voicemail','no_answer','failed') OR outcome IS NULL),
  duration_seconds  integer,
  transcript        text,
  recording_url     text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  ended_at          timestamptz
);

CREATE INDEX IF NOT EXISTS idx_figsy_calls_enrollment_id ON public.figsy_calls(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_figsy_calls_lead_id       ON public.figsy_calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_figsy_calls_campaign_id   ON public.figsy_calls(campaign_id);
CREATE INDEX IF NOT EXISTS idx_figsy_calls_client_id     ON public.figsy_calls(client_id);
CREATE INDEX IF NOT EXISTS idx_figsy_calls_vapi_call_id  ON public.figsy_calls(vapi_call_id);

ALTER TABLE public.figsy_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role bypass" ON public.figsy_calls
  FOR ALL USING (true);

-- ────────────────────────────────────────────────────────────────────────────
-- Webhook trigger log (audit trail for webhook-enrolled leads)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.webhook_triggers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_id  uuid NOT NULL REFERENCES public.figsy_campaigns(id) ON DELETE CASCADE,
  email        text NOT NULL,
  payload      jsonb,
  status       text DEFAULT 'received' CHECK (status IN ('received','enrolled','failed')),
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_triggers_client_id
  ON public.webhook_triggers (client_id, created_at DESC);

ALTER TABLE public.webhook_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role bypass" ON public.webhook_triggers
  FOR ALL USING (true);

-- Verify new columns and tables
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('icps','lead_enrichment','figsy_calls','webhook_triggers','subscriptions')
  AND column_name IN ('organization_names','lead_id','vapi_call_id','stripe_subscription_id','email')
ORDER BY table_name, column_name;

-- ════════════════════════════════════════════════════════════════════════════════
-- ALTA CROSS REFERENCE — What Alta has vs K.I.N.D build status
-- Last updated: 2026-05-27
-- All non-Tier-3 features completed as of this date.
-- ════════════════════════════════════════════════════════════════════════════════
--
-- FEATURE                              | ALTA HAD IT  | K.I.N.D STATUS
-- ─────────────────────────────────────|──────────────|────────────────────────────────────────────────
-- Live contact preview in ICP builder  | YES (highest) | ✅ BUILT W1/W13 — names populate real-time
-- Proactive home "Who to target today?"| YES (high)    | ✅ BUILT W8 — purple card on dashboard
-- Campaign templates library           | YES (high)    | ✅ BUILT W9 — 4 templates
-- Editable AI prompt per campaign      | YES (medium)  | ✅ BUILT W10
-- Daily send quota slider              | YES (medium)  | ✅ BUILT W11
-- Quality gate / co-pilot toggle       | YES (medium)  | ✅ BUILT W12
-- Email style training                 | YES (high)    | ✅ BUILT W14 — localStorage; Gmail later
-- Revival as named campaign type       | YES (medium)  | ✅ BUILT W15
-- Signal tokens in outreach            | YES (high)    | ✅ BUILT W2
-- Intent filters (funded/hiring/etc.)  | YES (medium)  | ✅ BUILT W3
-- LinkedIn URL column on leads         | YES (medium)  | ✅ BUILT W5
-- CRM integration (HubSpot)           | YES (medium)  | ✅ BUILT — add HUBSPOT_API_KEY in Railway
-- Social proof on login page           | YES (medium)  | ✅ BUILT W6 — add client logo to /public/logos/
-- Unified inbox (all channels)         | YES (high)    | ✅ BUILT 2026-05-27 — /dashboard/inbox
--                                      |               |   Left panel: reply list with priority sort
--                                      |               |   Right panel: thread + AI draft + send
-- Persistent prospect database         | YES (medium)  | ✅ BUILT 2026-05-27 — /dashboard/prospects
--                                      |               |   Cross-campaign view, score badges, CSV export
-- AI-assisted reply drafting           | YES (medium)  | ✅ BUILT 2026-05-27 — inside inbox page
--                                      |               |   Calls /figsy/leads/:id/signal-preview
-- Suggest Campaigns AI                 | YES (medium)  | ✅ BUILT 2026-05-27 — FIGSY page modal
--                                      |               |   Analyses leads+campaigns, recommends next run
-- Conditional branching in sequences   | YES (medium)  | ✅ BUILT — on_reply dropdown in sequence steps
--                                      |               |   Branch pills between steps (if replied / no reply)
-- ABM named account targeting          | YES (medium)  | ✅ BUILT 2026-05-27 — ICP builder ABM toggle
--                                      |               |   Enter company names → Apollo scopes to them
--                                      |               |   DB: icps.organization_names text[]
-- Webhook-triggered campaigns          | YES (low SMB) | ✅ BUILT 2026-05-27 — /dashboard/figsy/webhooks
--                                      |               |   Endpoint docs, copy button, live test form
-- Rep-level analytics                  | YES (medium)  | ✅ BUILT 2026-05-27 — admin /analytics page
--                                      |               |   Cross-client campaign table, reply rates, hot leads
-- 9-metric time-series analytics       | YES (medium)  | ✅ BUILT 2026-05-27 — Recharts LineChart upgrade
--                                      |               |   9 toggleable metrics, PieChart, BarChart
-- AI enrichment columns (research)     | YES (high)    | ✅ BUILT 2026-05-27 — Enrich button on each lead
--                                      |               |   Claude Haiku researches: recent signal,
--                                      |               |   company context, personalised opening line,
--                                      |               |   enrichment score 1-10
--                                      |               |   DB: lead_enrichment table
-- AI voice calls                       | YES (medium)  | ✅ BUILT (backend) — VAPI integration in
--                                      |               |   apps/api/src/routes/voice.ts
--                                      |               |   DB: figsy_calls table
--                                      |               |   Needs: VAPI_API_KEY in Railway API vars
-- ─────────────────────────────────────|──────────────|────────────────────────────────────────────────
-- LinkedIn outreach channel            | YES (high)    | 🚫 TIER 3 — deliberate. LinkedIn ToS risk.
-- Social signals audience source       | YES (high)    | 🚫 TIER 3 — deliberate
-- Visual sequence builder (node tree)  | YES (high)    | 🚫 TIER 3 — deliberate. Build when funding.
-- ════════════════════════════════════════════════════════════════════════════════
--
-- SUMMARY: K.I.N.D now matches or exceeds Alta on all non-Tier-3 features.
-- Alta price: $1,250+/mo quarterly. K.I.N.D price: $60–$300 pay-as-you-go.
-- Alta: USA-first, LinkedIn-heavy. K.I.N.D: Africa-first, email-first, owned data.
-- ════════════════════════════════════════════════════════════════════════════════
