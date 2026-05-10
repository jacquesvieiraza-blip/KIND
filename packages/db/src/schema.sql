-- ============================================================
-- KIND AI Platform — Supabase Database Schema
-- Run this in the Supabase SQL editor (Dashboard > SQL Editor)
-- ============================================================

-- ─── Week 2 Additions ────────────────────────────────────────────────────────
-- Run these ALTER statements in Supabase SQL Editor if upgrading an existing DB

-- Lead generation jobs table
create table if not exists public.lead_generation_jobs (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid not null references public.clients(id) on delete cascade,
  icp_id              uuid not null references public.icps(id) on delete cascade,
  status              text not null default 'running' check (status in ('running', 'completed', 'failed')),
  total_found         integer not null default 0,
  total_scored        integer not null default 0,
  total_consent_sent  integer not null default 0,
  error_message       text,
  created_at          timestamptz not null default now(),
  completed_at        timestamptz
);

alter table public.lead_generation_jobs enable row level security;
create policy "clients_own_jobs" on public.lead_generation_jobs
  for all using (
    client_id in (select id from public.clients where user_id = auth.uid())
  );

-- Add consent_token and source_job_id to leads (safe if columns already exist)
alter table public.leads
  add column if not exists consent_token text unique,
  add column if not exists source_job_id uuid references public.lead_generation_jobs(id);

create index if not exists idx_leads_consent_token on public.leads(consent_token);
create index if not exists idx_jobs_icp_id on public.lead_generation_jobs(icp_id);
create index if not exists idx_jobs_client_id on public.lead_generation_jobs(client_id);

-- ─── Waitlist ────────────────────────────────────────────────────────────────
create table if not exists public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  first_name  text not null,
  email       text not null,
  product     text not null,
  created_at  timestamptz default now(),
  unique(email, product)
);

alter table public.waitlist enable row level security;

-- Anyone can insert (public signup)
create policy "waitlist_insert" on public.waitlist
  for insert with check (true);

-- Only service role can read (admin only)
create policy "waitlist_select" on public.waitlist
  for select using (false);

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── Clients ─────────────────────────────────────────────────────────────────
-- Extends Supabase auth.users with business profile data

create table if not exists public.clients (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  company_name  text not null,
  industry      text,
  country       text not null default 'South Africa',
  website       text,
  phone         text,
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(user_id)
);

-- ─── Subscriptions ───────────────────────────────────────────────────────────

create type subscription_status as enum (
  'trialing', 'active', 'past_due', 'cancelled', 'inactive'
);

create type product_type as enum (
  'lead_gen', 'virtual_assistant', 'chatbot', 'consulting'
);

create type product_tier as enum ('starter', 'pro', 'enterprise');

create type billing_interval as enum ('monthly', 'annual');

create table if not exists public.subscriptions (
  id                          uuid primary key default uuid_generate_v4(),
  client_id                   uuid not null references public.clients(id) on delete cascade,
  product                     product_type not null,
  tier                        product_tier not null default 'starter',
  status                      subscription_status not null default 'trialing',
  paystack_subscription_code  text,
  paystack_customer_code      text,
  paystack_plan_code          text,
  amount_zar                  integer not null,         -- stored in kobo (ZAR cents)
  billing_interval            billing_interval not null default 'monthly',
  trial_ends_at               timestamptz,
  current_period_start        timestamptz not null default now(),
  current_period_end          timestamptz not null default now() + interval '1 month',
  cancelled_at                timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- ─── ICP (Ideal Customer Profile) ────────────────────────────────────────────

create table if not exists public.icps (
  id            uuid primary key default uuid_generate_v4(),
  client_id     uuid not null references public.clients(id) on delete cascade,
  name          text not null default 'Default ICP',
  industries    text[] not null default '{}',
  job_titles    text[] not null default '{}',
  company_sizes text[] not null default '{}',
  locations     text[] not null default '{}',
  keywords      text[] not null default '{}',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── Leads ───────────────────────────────────────────────────────────────────

create type lead_status as enum (
  'pending', 'scored', 'consent_sent', 'consent_given', 'exported', 'rejected'
);

create table if not exists public.leads (
  id                uuid primary key default uuid_generate_v4(),
  client_id         uuid not null references public.clients(id) on delete cascade,
  icp_id            uuid references public.icps(id) on delete set null,
  first_name        text not null,
  last_name         text not null,
  email             text,
  phone             text,
  job_title         text,
  company           text,
  linkedin_url      text,
  country           text,
  score             smallint check (score >= 0 and score <= 100),
  score_reasoning   text,
  status            lead_status not null default 'pending',
  consent_sent_at   timestamptz,
  consent_given_at  timestamptz,
  exported_at       timestamptz,
  crm_synced        boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ─── POPIA Consent Log ────────────────────────────────────────────────────────

create table if not exists public.consent_log (
  id          uuid primary key default uuid_generate_v4(),
  lead_id     uuid not null references public.leads(id) on delete cascade,
  client_id   uuid not null references public.clients(id) on delete cascade,
  event       text not null,             -- 'sent' | 'opened' | 'given' | 'withdrawn'
  channel     text not null default 'email',
  ip_address  text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

-- ─── Knowledge Base (for VA & Chatbot RAG) ───────────────────────────────────

create table if not exists public.knowledge_documents (
  id          uuid primary key default uuid_generate_v4(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  title       text not null,
  content     text not null,
  source_url  text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

-- ─── Chatbot Configs ──────────────────────────────────────────────────────────

create table if not exists public.chatbot_configs (
  id                  uuid primary key default uuid_generate_v4(),
  client_id           uuid not null references public.clients(id) on delete cascade,
  name                text not null default 'My Assistant',
  system_prompt       text not null default 'You are a helpful assistant.',
  whatsapp_enabled    boolean not null default false,
  web_enabled         boolean not null default true,
  escalation_email    text,
  widget_color        text not null default '#0066FF',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique(client_id)
);

-- ─── Conversations (VA & Chatbot) ────────────────────────────────────────────

create type conversation_channel as enum ('whatsapp', 'email', 'web');

create table if not exists public.conversations (
  id          uuid primary key default uuid_generate_v4(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  channel     conversation_channel not null default 'web',
  contact_id  text,                      -- phone number or email of the end-user
  created_at  timestamptz not null default now()
);

create table if not exists public.messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant', 'system')),
  content         text not null,
  created_at      timestamptz not null default now()
);

-- ─── Usage Metrics ────────────────────────────────────────────────────────────

create table if not exists public.usage_metrics (
  id                      uuid primary key default uuid_generate_v4(),
  client_id               uuid not null references public.clients(id) on delete cascade,
  period_start            timestamptz not null,
  period_end              timestamptz not null,
  leads_sourced           integer not null default 0,
  leads_scored            integer not null default 0,
  leads_exported          integer not null default 0,
  va_messages             integer not null default 0,
  chatbot_conversations   integer not null default 0,
  voice_minutes           integer not null default 0,
  created_at              timestamptz not null default now(),
  unique(client_id, period_start)
);

-- ─── Paystack Webhook Events (audit log) ─────────────────────────────────────

create table if not exists public.paystack_events (
  id          uuid primary key default uuid_generate_v4(),
  event_type  text not null,
  payload     jsonb not null,
  processed   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ─── Referrals ────────────────────────────────────────────────────────────────

create table if not exists public.referrals (
  id              uuid primary key default uuid_generate_v4(),
  referrer_id     uuid not null references public.clients(id) on delete cascade,
  referred_email  text not null,
  referred_id     uuid references public.clients(id) on delete set null,
  status          text not null default 'pending' check (status in ('pending', 'converted', 'rewarded')),
  reward_months   integer not null default 1,
  created_at      timestamptz not null default now(),
  converted_at    timestamptz
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists idx_leads_client_id on public.leads(client_id);
create index if not exists idx_leads_status on public.leads(status);
create index if not exists idx_leads_score on public.leads(score desc);
create index if not exists idx_subscriptions_client_id on public.subscriptions(client_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);
create index if not exists idx_conversations_client_id on public.conversations(client_id);
create index if not exists idx_messages_conversation_id on public.messages(conversation_id);
create index if not exists idx_consent_log_lead_id on public.consent_log(lead_id);

-- ─── Updated_at Trigger ───────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create trigger set_icps_updated_at
  before update on public.icps
  for each row execute function public.set_updated_at();

create trigger set_leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

create trigger set_chatbot_configs_updated_at
  before update on public.chatbot_configs
  for each row execute function public.set_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table public.clients enable row level security;
alter table public.subscriptions enable row level security;
alter table public.icps enable row level security;
alter table public.leads enable row level security;
alter table public.consent_log enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.chatbot_configs enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.usage_metrics enable row level security;
alter table public.referrals enable row level security;

-- Clients can only see their own data
create policy "clients_own_data" on public.clients
  for all using (auth.uid() = user_id);

create policy "clients_own_subscriptions" on public.subscriptions
  for all using (
    client_id in (select id from public.clients where user_id = auth.uid())
  );

create policy "clients_own_icps" on public.icps
  for all using (
    client_id in (select id from public.clients where user_id = auth.uid())
  );

create policy "clients_own_leads" on public.leads
  for all using (
    client_id in (select id from public.clients where user_id = auth.uid())
  );

create policy "clients_own_consent_log" on public.consent_log
  for all using (
    client_id in (select id from public.clients where user_id = auth.uid())
  );

create policy "clients_own_knowledge" on public.knowledge_documents
  for all using (
    client_id in (select id from public.clients where user_id = auth.uid())
  );

create policy "clients_own_chatbot" on public.chatbot_configs
  for all using (
    client_id in (select id from public.clients where user_id = auth.uid())
  );

create policy "clients_own_conversations" on public.conversations
  for all using (
    client_id in (select id from public.clients where user_id = auth.uid())
  );

create policy "clients_own_messages" on public.messages
  for all using (
    conversation_id in (
      select id from public.conversations
      where client_id in (select id from public.clients where user_id = auth.uid())
    )
  );

create policy "clients_own_usage" on public.usage_metrics
  for all using (
    client_id in (select id from public.clients where user_id = auth.uid())
  );

create policy "clients_own_referrals" on public.referrals
  for all using (
    referrer_id in (select id from public.clients where user_id = auth.uid())
  );

-- ─── Service role bypass (for API server) ────────────────────────────────────
-- The API uses the service_role key which bypasses RLS — no additional policies needed.

-- ─── Week 3 Additions ────────────────────────────────────────────────────────
-- Run in Supabase SQL Editor when upgrading an existing database

-- Feature 1: Document Management
-- Also run in Supabase Storage console: create a private bucket named "client-documents"
create table if not exists public.client_documents (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients(id) on delete cascade,
  name          text not null,
  file_path     text not null,
  file_size     bigint,
  mime_type     text,
  document_type text not null default 'other'
    check (document_type in ('offer', 'msa', 'sla', 'playbook', 'service_order', 'other')),
  uploaded_by   text not null default 'admin'
    check (uploaded_by in ('admin', 'client')),
  created_at    timestamptz not null default now()
);

alter table public.client_documents enable row level security;
create policy "clients_read_own_docs" on public.client_documents
  for select using (
    client_id in (select id from public.clients where user_id = auth.uid())
  );

-- Feature 2: In-Platform Messaging (separate from chatbot messages)
create table if not exists public.client_messages (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  sender_type text not null check (sender_type in ('client', 'admin')),
  content     text not null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.client_messages enable row level security;
create policy "clients_own_platform_messages" on public.client_messages
  for all using (
    client_id in (select id from public.clients where user_id = auth.uid())
  );

create index if not exists idx_client_messages_client_id on public.client_messages(client_id);

-- Feature 3: Lead Top-ups
alter table public.subscriptions
  add column if not exists extra_lead_quota integer not null default 0;

create table if not exists public.lead_topups (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid not null references public.clients(id) on delete cascade,
  quantity            integer not null,
  amount_zar          integer not null,
  paystack_reference  text,
  status              text not null default 'pending'
    check (status in ('pending', 'completed', 'failed')),
  created_at          timestamptz not null default now()
);

alter table public.lead_topups enable row level security;
create policy "clients_own_topups" on public.lead_topups
  for all using (
    client_id in (select id from public.clients where user_id = auth.uid())
  );

-- Feature 4: ICP Approval Flow
alter table public.icps
  add column if not exists status text not null default 'draft'
    check (status in ('draft', 'pending_review', 'approved', 'rejected')),
  add column if not exists review_notes text,
  add column if not exists reviewed_at timestamptz;
