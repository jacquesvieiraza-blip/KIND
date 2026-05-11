-- KIND AI Platform — Supabase Schema
-- Run this in full in the Supabase SQL editor.
-- Safe to re-run: all statements use IF NOT EXISTS.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- CLIENTS
-- ─────────────────────────────────────────────
create table if not exists public.clients (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  industry     text,
  country      text not null default 'South Africa',
  website      text,
  phone        text,
  onboarded_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique(user_id)
);

-- ─────────────────────────────────────────────
-- SUBSCRIPTIONS
-- ─────────────────────────────────────────────
create table if not exists public.subscriptions (
  id                        uuid primary key default uuid_generate_v4(),
  client_id                 uuid not null references public.clients(id) on delete cascade,
  product                   text not null check (product in ('lead_gen','virtual_assistant','chatbot')),
  tier                      text not null check (tier in ('starter','pro','enterprise')),
  status                    text not null default 'trialing'
                              check (status in ('active','inactive','trialing','past_due','cancelled')),
  billing_interval          text not null default 'monthly' check (billing_interval in ('monthly','annual')),
  amount_usd                integer not null default 0,
  amount_zar                integer not null default 0,
  paystack_subscription_code text,
  paystack_customer_code    text,
  paystack_plan_code        text,
  trial_ends_at             timestamptz,
  current_period_start      timestamptz not null default now(),
  current_period_end        timestamptz not null default now() + interval '30 days',
  cancelled_at              timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists subscriptions_client_id_idx on public.subscriptions(client_id);

-- ─────────────────────────────────────────────
-- IDEAL CUSTOMER PROFILES (ICPs)
-- ─────────────────────────────────────────────
create table if not exists public.icps (
  id                uuid primary key default uuid_generate_v4(),
  client_id         uuid not null references public.clients(id) on delete cascade,
  name              text not null,
  industries        text[] not null default '{}',
  job_titles        text[] not null default '{}',
  seniority_levels  text[] not null default '{}',
  company_sizes     text[] not null default '{}',
  geographies       text[] not null default '{}',
  tech_stack        text[] not null default '{}',
  keywords          text[] not null default '{}',
  apollo_only_consented boolean not null default true,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists icps_client_id_idx on public.icps(client_id);

-- ─────────────────────────────────────────────
-- OPT-OUT BLOCKLIST (permanent, cross-client)
-- ─────────────────────────────────────────────
create table if not exists public.opt_out_blocklist (
  id           uuid primary key default uuid_generate_v4(),
  email        text unique not null,
  linkedin_url text,
  full_name    text,
  reason       text,                        -- e.g. 'replied_opt_out', 'manual_block'
  blocked_by_client_id uuid references public.clients(id),
  opted_back_in_at timestamptz,             -- null = still blocked
  created_at   timestamptz not null default now()
);

create index if not exists opt_out_blocklist_email_idx on public.opt_out_blocklist(email);

-- ─────────────────────────────────────────────
-- LEADS
-- ─────────────────────────────────────────────
create table if not exists public.leads (
  id                uuid primary key default uuid_generate_v4(),
  client_id         uuid not null references public.clients(id) on delete cascade,
  icp_id            uuid references public.icps(id),
  -- identity
  first_name        text not null,
  last_name         text not null default '',
  email             text,
  phone             text,
  job_title         text,
  company           text,
  linkedin_url      text,
  country           text,
  -- enrichment
  company_size      text,
  industry          text,
  seniority         text,
  tech_stack        text[],
  apollo_id         text,                   -- Apollo.io record id
  apollo_consented  boolean not null default false,
  -- scoring
  score             integer check (score >= 0 and score <= 100),
  score_reasoning   text,
  scored_at         timestamptz,
  -- outreach
  ai_email_draft    text,                   -- AI-generated personalised outreach
  outreach_sent_at  timestamptz,
  -- consent / POPIA
  status            text not null default 'pending'
                      check (status in ('pending','scored','consent_sent','consent_given','exported','rejected','opted_out')),
  consent_sent_at   timestamptz,
  consent_given_at  timestamptz,
  opted_out_at      timestamptz,
  -- CRM
  crm_synced        boolean not null default false,
  crm_contact_id    text,
  exported_at       timestamptz,
  -- pipeline value
  estimated_deal_value_usd integer,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists leads_client_id_idx  on public.leads(client_id);
create index if not exists leads_status_idx      on public.leads(status);
create index if not exists leads_score_idx       on public.leads(score desc);
create index if not exists leads_email_idx       on public.leads(email);

-- ─────────────────────────────────────────────
-- ASSISTANT MESSAGES (Virtual Assistant chat history)
-- ─────────────────────────────────────────────
create table if not exists public.assistant_messages (
  id         uuid primary key default uuid_generate_v4(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  role       text not null check (role in ('user','assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists assistant_messages_client_id_idx on public.assistant_messages(client_id);

-- ─────────────────────────────────────────────
-- CHATBOT CONFIGS
-- ─────────────────────────────────────────────
create table if not exists public.chatbot_configs (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  bot_name        text not null default 'Assistant',
  persona         text not null default 'helpful and professional',
  welcome_message text not null default 'Hi! How can I help you today?',
  primary_color   text not null default '#0066FF',
  website_url     text,
  system_prompt   text,
  is_active       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(client_id)
);

-- ─────────────────────────────────────────────
-- USAGE METRICS
-- ─────────────────────────────────────────────
create table if not exists public.usage_metrics (
  id         uuid primary key default uuid_generate_v4(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  product    text not null,
  metric     text not null,   -- e.g. 'leads_generated', 'messages_sent', 'conversations'
  value      integer not null default 0,
  period     text not null,   -- e.g. '2026-05' (YYYY-MM)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(client_id, product, metric, period)
);

create index if not exists usage_metrics_client_id_idx on public.usage_metrics(client_id);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
-- Enable RLS on all tables. Each client can only see their own data.

alter table public.clients          enable row level security;
alter table public.subscriptions    enable row level security;
alter table public.icps             enable row level security;
alter table public.leads            enable row level security;
alter table public.opt_out_blocklist enable row level security;
alter table public.assistant_messages enable row level security;
alter table public.chatbot_configs  enable row level security;
alter table public.usage_metrics    enable row level security;

-- Clients: own row only
create policy if not exists "clients_own" on public.clients
  for all using (auth.uid() = user_id);

-- Helper: resolve current user's client id
create or replace function public.current_client_id()
returns uuid language sql stable as $$
  select id from public.clients where user_id = auth.uid() limit 1;
$$;

-- Subscriptions: own client only
create policy if not exists "subscriptions_own" on public.subscriptions
  for all using (client_id = public.current_client_id());

-- ICPs: own client only
create policy if not exists "icps_own" on public.icps
  for all using (client_id = public.current_client_id());

-- Leads: own client only
create policy if not exists "leads_own" on public.leads
  for all using (client_id = public.current_client_id());

-- Opt-out blocklist: readable by all authenticated (needed for cross-client check), writable by own client
create policy if not exists "blocklist_read" on public.opt_out_blocklist
  for select using (auth.role() = 'authenticated');
create policy if not exists "blocklist_write" on public.opt_out_blocklist
  for insert with check (auth.role() = 'authenticated');

-- Assistant messages: own client only
create policy if not exists "assistant_messages_own" on public.assistant_messages
  for all using (client_id = public.current_client_id());

-- Chatbot configs: own client only
create policy if not exists "chatbot_configs_own" on public.chatbot_configs
  for all using (client_id = public.current_client_id());

-- Usage metrics: own client only
create policy if not exists "usage_metrics_own" on public.usage_metrics
  for all using (client_id = public.current_client_id());

-- ─────────────────────────────────────────────
-- UPDATED_AT TRIGGER
-- ─────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

create or replace trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create or replace trigger icps_updated_at
  before update on public.icps
  for each row execute function public.set_updated_at();

create or replace trigger leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

create or replace trigger chatbot_configs_updated_at
  before update on public.chatbot_configs
  for each row execute function public.set_updated_at();

create or replace trigger usage_metrics_updated_at
  before update on public.usage_metrics
  for each row execute function public.set_updated_at();
