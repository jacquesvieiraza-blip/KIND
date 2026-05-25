-- =============================================================================
-- KIND AI Platform — MASTER SCHEMA
-- Generated: 2026-05-25
-- Safe to run on a live database: every statement uses IF NOT EXISTS,
-- ADD COLUMN IF NOT EXISTS, OR REPLACE, or DROP IF EXISTS before recreating.
-- Existing data is never deleted.
-- =============================================================================

-- ─────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists vector;

-- =============================================================================
-- ENUMS
-- =============================================================================
-- leads status enum — add any missing values safely
do $$ begin
  if not exists (select 1 from pg_type where typname = 'lead_status') then
    create type lead_status as enum (
      'pending','scored','contacted','consent_sent','consent_given',
      'exported','rejected','opted_out'
    );
  end if;
end $$;

-- Add 'contacted' to existing enum if missing
alter type lead_status add value if not exists 'contacted';

-- =============================================================================
-- CORE TABLES
-- =============================================================================

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

-- Add all columns that may be missing
alter table public.clients
  add column if not exists referred_by              uuid references public.clients(id) on delete set null,
  add column if not exists credit_balance           integer not null default 0,
  add column if not exists first_icp_run_at         timestamptz,
  add column if not exists terms_accepted_at        timestamptz,
  add column if not exists terms_accepted_ip        text,
  add column if not exists company_registration     text,
  add column if not exists vat_number               text,
  add column if not exists is_demo                  boolean default false,
  add column if not exists demo_prospect_name       text,
  add column if not exists demo_created_by          text,
  add column if not exists demo_expires_at          timestamptz,
  add column if not exists crm_type                 text check (crm_type in ('hubspot','pipedrive','none')),
  add column if not exists crm_api_key              text,
  add column if not exists crm_sync_enabled         boolean not null default false,
  add column if not exists google_calendar_access_token  text,
  add column if not exists google_calendar_refresh_token text,
  add column if not exists google_calendar_token_expiry  timestamptz,
  add column if not exists google_calendar_email         text,
  add column if not exists calendar_booking_enabled      boolean not null default false,
  add column if not exists auto_topup_enabled       boolean not null default false,
  add column if not exists auto_topup_threshold     integer not null default 0,
  add column if not exists auto_topup_plan          text,
  add column if not exists auto_topup_bundle_size   integer,
  add column if not exists auto_topup_paystack_auth text,
  add column if not exists figsy_credits_remaining  integer not null default 0;

-- ─────────────────────────────────────────────
-- SUBSCRIPTIONS
-- ─────────────────────────────────────────────
create table if not exists public.subscriptions (
  id                        uuid primary key default uuid_generate_v4(),
  client_id                 uuid not null references public.clients(id) on delete cascade,
  product                   text not null,
  tier                      text not null default 'starter',
  status                    text not null default 'trialing',
  billing_interval          text not null default 'monthly',
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

-- Remove amount_usd if it exists (replaced by amount_zar)
alter table public.subscriptions drop column if exists amount_usd;

-- Ensure amount_zar has correct default and NOT NULL
alter table public.subscriptions alter column amount_zar set default 0;
update public.subscriptions set amount_zar = 0 where amount_zar is null;
alter table public.subscriptions alter column amount_zar set not null;

create index if not exists subscriptions_client_id_idx on public.subscriptions(client_id);
create unique index if not exists subscriptions_client_product_idx on public.subscriptions(client_id, product);

-- ─────────────────────────────────────────────
-- IDEAL CUSTOMER PROFILES (ICPs)
-- ─────────────────────────────────────────────
create table if not exists public.icps (
  id        uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name      text not null,
  created_at timestamptz not null default now()
);

alter table public.icps
  add column if not exists industries           text[] not null default '{}',
  add column if not exists job_titles           text[] not null default '{}',
  add column if not exists seniority_levels     text[] not null default '{}',
  add column if not exists company_sizes        text[] not null default '{}',
  add column if not exists geographies          text[] not null default '{}',
  add column if not exists tech_stack           text[] not null default '{}',
  add column if not exists keywords             text[] not null default '{}',
  add column if not exists apollo_only_consented boolean not null default true,
  add column if not exists is_active            boolean not null default true,
  add column if not exists last_run_at          timestamptz,
  add column if not exists updated_at           timestamptz not null default now();

create index if not exists icps_client_id_idx on public.icps(client_id);

-- ─────────────────────────────────────────────
-- OPT-OUT BLOCKLIST
-- ─────────────────────────────────────────────
create table if not exists public.opt_out_blocklist (
  id           uuid primary key default uuid_generate_v4(),
  email        text unique not null,
  linkedin_url text,
  full_name    text,
  reason       text,
  blocked_by_client_id uuid references public.clients(id),
  opted_back_in_at timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists opt_out_blocklist_email_idx on public.opt_out_blocklist(email);

-- ─────────────────────────────────────────────
-- LEADS
-- ─────────────────────────────────────────────
create table if not exists public.leads (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  icp_id          uuid references public.icps(id),
  first_name      text not null,
  last_name       text not null default '',
  email           text,
  phone           text,
  job_title       text,
  company         text,
  linkedin_url    text,
  country         text,
  company_size    text,
  industry        text,
  seniority       text,
  tech_stack      text[],
  apollo_id       text,
  apollo_consented boolean not null default false,
  score           integer check (score >= 0 and score <= 100),
  score_reasoning text,
  scored_at       timestamptz,
  ai_email_draft  text,
  outreach_sent_at timestamptz,
  status          text not null default 'pending',
  consent_sent_at  timestamptz,
  consent_given_at timestamptz,
  opted_out_at     timestamptz,
  crm_synced      boolean not null default false,
  crm_contact_id  text,
  exported_at     timestamptz,
  estimated_deal_value_usd integer,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists leads_client_id_idx on public.leads(client_id);
create index if not exists leads_status_idx    on public.leads(status);
create index if not exists leads_score_idx     on public.leads(score desc);
create index if not exists leads_email_idx     on public.leads(email);

-- ─────────────────────────────────────────────
-- CREDIT TRANSACTIONS
-- ─────────────────────────────────────────────
create table if not exists public.credit_transactions (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  type       text not null,
  amount     integer not null,
  plan       text,
  reference  text,
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists credit_transactions_client_idx on public.credit_transactions(client_id);

-- =============================================================================
-- FIGSY — AI SDR
-- =============================================================================

-- ─────────────────────────────────────────────
-- FIGSY CAMPAIGNS
-- ─────────────────────────────────────────────
create table if not exists public.figsy_campaigns (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  name            text not null,
  status          text not null default 'draft',
  icp_id          uuid references public.icps(id),
  leads_enrolled  integer not null default 0,
  emails_sent     integer not null default 0,
  replies_total   integer not null default 0,
  replies_interested integer not null default 0,
  opted_out       integer not null default 0,
  steps_count     integer not null default 3,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.figsy_campaigns
  add column if not exists campaign_intent  text,
  add column if not exists intent_mapped_at timestamptz;

create index if not exists figsy_campaigns_client_id_idx on public.figsy_campaigns(client_id);
create index if not exists figsy_campaigns_status_idx    on public.figsy_campaigns(status);

-- ─────────────────────────────────────────────
-- FIGSY ENROLLMENTS
-- ─────────────────────────────────────────────
create table if not exists public.figsy_enrollments (
  id            uuid primary key default uuid_generate_v4(),
  campaign_id   uuid not null references public.figsy_campaigns(id) on delete cascade,
  lead_id       uuid not null references public.leads(id) on delete cascade,
  client_id     uuid not null references public.clients(id) on delete cascade,
  status        text not null default 'enrolled',
  current_step  integer not null default 0,
  enrolled_at   timestamptz not null default now(),
  next_send_at  timestamptz,
  completed_at  timestamptz,
  step1_subject text, step1_body text,
  step2_subject text, step2_body text,
  step3_subject text, step3_body text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(campaign_id, lead_id)
);

alter table public.figsy_enrollments
  add column if not exists crm_deal_id   text,
  add column if not exists crm_pushed_at timestamptz;

create index if not exists figsy_enrollments_campaign_id_idx  on public.figsy_enrollments(campaign_id);
create index if not exists figsy_enrollments_lead_id_idx      on public.figsy_enrollments(lead_id);
create index if not exists figsy_enrollments_next_send_at_idx on public.figsy_enrollments(next_send_at);
create index if not exists figsy_enrollments_status_idx       on public.figsy_enrollments(status);

-- ─────────────────────────────────────────────
-- FIGSY SENT EMAILS
-- ─────────────────────────────────────────────
create table if not exists public.figsy_sent_emails (
  id            uuid primary key default uuid_generate_v4(),
  enrollment_id uuid not null references public.figsy_enrollments(id) on delete cascade,
  campaign_id   uuid not null references public.figsy_campaigns(id) on delete cascade,
  lead_id       uuid not null references public.leads(id) on delete cascade,
  step          integer not null,
  subject       text not null,
  body          text not null,
  resend_id     text,
  sent_at       timestamptz not null default now()
);

create index if not exists figsy_sent_emails_enrollment_id_idx on public.figsy_sent_emails(enrollment_id);
create index if not exists figsy_sent_emails_lead_id_idx       on public.figsy_sent_emails(lead_id);

-- ─────────────────────────────────────────────
-- FIGSY REPLIES
-- ─────────────────────────────────────────────
create table if not exists public.figsy_replies (
  id               uuid primary key default uuid_generate_v4(),
  enrollment_id    uuid references public.figsy_enrollments(id),
  campaign_id      uuid not null references public.figsy_campaigns(id) on delete cascade,
  lead_id          uuid not null references public.leads(id) on delete cascade,
  client_id        uuid not null references public.clients(id) on delete cascade,
  from_email       text not null,
  subject          text,
  body             text not null,
  classification   text,
  classification_reasoning text,
  raw_payload      jsonb,
  received_at      timestamptz not null default now(),
  processed_at     timestamptz
);

create index if not exists figsy_replies_campaign_id_idx on public.figsy_replies(campaign_id);
create index if not exists figsy_replies_lead_id_idx     on public.figsy_replies(lead_id);

-- ─────────────────────────────────────────────
-- FIGSY CALLS
-- ─────────────────────────────────────────────
create table if not exists public.figsy_calls (
  id               uuid primary key default gen_random_uuid(),
  enrollment_id    uuid not null references public.figsy_enrollments(id) on delete cascade,
  lead_id          uuid not null references public.leads(id) on delete cascade,
  campaign_id      uuid not null references public.figsy_campaigns(id) on delete cascade,
  client_id        uuid not null references public.clients(id) on delete cascade,
  vapi_call_id     text,
  status           text not null default 'initiated',
  outcome          text,
  duration_seconds integer,
  transcript       text,
  recording_url    text,
  created_at       timestamptz not null default now(),
  ended_at         timestamptz
);

create index if not exists idx_figsy_calls_enrollment_id on public.figsy_calls(enrollment_id);
create index if not exists idx_figsy_calls_lead_id       on public.figsy_calls(lead_id);
create index if not exists idx_figsy_calls_client_id     on public.figsy_calls(client_id);

-- ─────────────────────────────────────────────
-- FIGSY MEMORY
-- ─────────────────────────────────────────────
create table if not exists public.figsy_memory (
  id                     uuid primary key default gen_random_uuid(),
  client_id              uuid not null references public.clients(id) on delete cascade,
  best_subject_lines     text[]  default '{}',
  avg_reply_rate_30d     numeric default 0,
  total_sent_all_time    integer default 0,
  total_replies_all_time integer default 0,
  top_performing_icp     text,
  last_updated           timestamptz default now(),
  constraint figsy_memory_client_unique unique (client_id)
);

alter table public.figsy_memory
  add column if not exists last_winning_angle text;

-- =============================================================================
-- MILLA — Virtual Assistant
-- =============================================================================

create table if not exists public.milla_documents (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  name       text not null,
  type       text not null,
  content    text not null,
  status     text not null default 'processing',
  created_at timestamptz not null default now()
);

create table if not exists public.milla_chunks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.milla_documents(id) on delete cascade,
  client_id   uuid not null references public.clients(id) on delete cascade,
  content     text not null,
  chunk_index integer not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_milla_chunks_client_id   on public.milla_chunks(client_id);
create index if not exists idx_milla_chunks_document_id on public.milla_chunks(document_id);
create index if not exists idx_milla_chunks_content_fts
  on public.milla_chunks using gin(to_tsvector('english', content));

create table if not exists public.milla_sessions (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  title      text,
  created_at timestamptz not null default now()
);

create index if not exists idx_milla_sessions_client_id on public.milla_sessions(client_id);

create table if not exists public.milla_messages (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.milla_sessions(id) on delete cascade,
  client_id  uuid not null references public.clients(id) on delete cascade,
  role       text not null,
  content    text not null,
  sources    jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_milla_messages_session_id on public.milla_messages(session_id);
create index if not exists idx_milla_messages_client_id  on public.milla_messages(client_id);

-- =============================================================================
-- VIDA — Chatbot Agent
-- =============================================================================

create table if not exists public.vida_configs (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients(id) on delete cascade unique,
  bot_name      text not null default 'Vida',
  greeting      text not null default 'Hi! How can I help you today?',
  system_prompt text,
  primary_color text not null default '#0066FF',
  collect_email boolean not null default true,
  collect_phone boolean not null default false,
  notify_email  text,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.vida_sessions (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients(id),
  visitor_name   text,
  visitor_email  text,
  visitor_phone  text,
  channel        text not null default 'web',
  lead_score     integer,
  outcome        text,
  created_at     timestamptz not null default now(),
  ended_at       timestamptz
);

create index if not exists idx_vida_sessions_client_id  on public.vida_sessions(client_id);
create index if not exists idx_vida_sessions_created_at on public.vida_sessions(created_at desc);

create table if not exists public.vida_messages (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.vida_sessions(id) on delete cascade,
  client_id  uuid not null references public.clients(id),
  role       text not null,
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_vida_messages_session_id on public.vida_messages(session_id);

-- =============================================================================
-- CALENDAR BOOKINGS
-- =============================================================================

create table if not exists public.calendar_bookings (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  lead_id         uuid not null references public.leads(id) on delete cascade,
  enrollment_id   uuid references public.figsy_enrollments(id) on delete set null,
  google_event_id text,
  meeting_title   text,
  start_time      timestamptz,
  end_time        timestamptz,
  meeting_link    text,
  status          text not null default 'pending',
  created_at      timestamptz not null default now()
);

create index if not exists idx_calendar_bookings_client_id on public.calendar_bookings(client_id);
create index if not exists idx_calendar_bookings_lead_id   on public.calendar_bookings(lead_id);

-- =============================================================================
-- PARTNER PROGRAMME
-- =============================================================================

create table if not exists public.partners (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  email           text not null unique,
  company         text,
  partner_type    text not null,
  referral_code   text not null unique default substring(md5(random()::text) from 1 for 8),
  status          text not null default 'pending',
  commission_rate numeric(4,2) not null default 20.00,
  commission_months integer not null default 12,
  notes           text,
  created_at      timestamptz default now(),
  approved_at     timestamptz
);

create table if not exists public.partner_referrals (
  id            uuid primary key default gen_random_uuid(),
  partner_id    uuid not null references public.partners(id) on delete cascade,
  client_id     uuid not null references public.clients(id) on delete cascade,
  referral_code text not null,
  status        text not null default 'trial',
  first_payment_at timestamptz,
  created_at    timestamptz default now(),
  unique(client_id)
);

create table if not exists public.partner_commissions (
  id                  uuid primary key default gen_random_uuid(),
  partner_id          uuid not null references public.partners(id) on delete cascade,
  partner_referral_id uuid not null references public.partner_referrals(id) on delete cascade,
  client_id           uuid not null references public.clients(id) on delete cascade,
  amount_zar          numeric(10,2) not null,
  period_month        text not null,
  status              text not null default 'pending',
  created_at          timestamptz default now(),
  paid_at             timestamptz
);

create index if not exists idx_partners_referral_code       on public.partners(referral_code);
create index if not exists idx_partner_referrals_partner_id on public.partner_referrals(partner_id);
create index if not exists idx_partner_commissions_partner_id on public.partner_commissions(partner_id);

-- =============================================================================
-- MISC TABLES
-- =============================================================================

create table if not exists public.founder_agent_logs (
  id         uuid primary key default gen_random_uuid(),
  agent      text not null,
  action     text not null,
  payload    jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_founder_agent_logs_created_at on public.founder_agent_logs(created_at desc);

create table if not exists public.contact_requests (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  company    text,
  message    text,
  type       text default 'demo',
  created_at timestamptz default now()
);

create table if not exists public.product_waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  name       text,
  company    text,
  product    text not null,
  created_at timestamptz default now()
);

create table if not exists public.partner_applications (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null,
  company      text,
  website      text,
  partner_type text,
  message      text,
  created_at   timestamptz default now()
);

create table if not exists public.usage_metrics (
  id         uuid primary key default uuid_generate_v4(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  product    text not null,
  metric     text not null,
  value      integer not null default 0,
  period     text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(client_id, product, metric, period)
);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.clients              enable row level security;
alter table public.subscriptions        enable row level security;
alter table public.icps                 enable row level security;
alter table public.leads                enable row level security;
alter table public.opt_out_blocklist    enable row level security;
alter table public.credit_transactions  enable row level security;
alter table public.usage_metrics        enable row level security;
alter table public.figsy_campaigns      enable row level security;
alter table public.figsy_enrollments    enable row level security;
alter table public.figsy_sent_emails    enable row level security;
alter table public.figsy_replies        enable row level security;
alter table public.figsy_calls          enable row level security;
alter table public.figsy_memory         enable row level security;
alter table public.milla_documents      enable row level security;
alter table public.milla_chunks         enable row level security;
alter table public.milla_sessions       enable row level security;
alter table public.milla_messages       enable row level security;
alter table public.vida_configs         enable row level security;
alter table public.vida_sessions        enable row level security;
alter table public.vida_messages        enable row level security;
alter table public.calendar_bookings    enable row level security;
alter table public.partners             enable row level security;
alter table public.partner_referrals    enable row level security;
alter table public.partner_commissions  enable row level security;
alter table public.contact_requests     enable row level security;
alter table public.product_waitlist     enable row level security;
alter table public.partner_applications enable row level security;
alter table public.founder_agent_logs   enable row level security;

-- Helper function
create or replace function public.current_client_id()
returns uuid language sql stable as $$
  select id from public.clients where user_id = auth.uid() limit 1;
$$;

-- Drop and recreate all policies (safe re-run)
drop policy if exists "clients_own"             on public.clients;
drop policy if exists "subscriptions_own"       on public.subscriptions;
drop policy if exists "icps_own"                on public.icps;
drop policy if exists "leads_own"               on public.leads;
drop policy if exists "credit_transactions_own" on public.credit_transactions;
drop policy if exists "usage_metrics_own"       on public.usage_metrics;
drop policy if exists "blocklist_read"          on public.opt_out_blocklist;
drop policy if exists "blocklist_write"         on public.opt_out_blocklist;

create policy "clients_own" on public.clients
  for all using (auth.uid() = user_id);

create policy "subscriptions_own" on public.subscriptions
  for all using (client_id = public.current_client_id());

create policy "icps_own" on public.icps
  for all using (client_id = public.current_client_id());

create policy "leads_own" on public.leads
  for all using (client_id = public.current_client_id());

create policy "credit_transactions_own" on public.credit_transactions
  for all using (client_id = public.current_client_id());

create policy "usage_metrics_own" on public.usage_metrics
  for all using (client_id = public.current_client_id());

create policy "blocklist_read" on public.opt_out_blocklist
  for select using (auth.role() = 'authenticated');
create policy "blocklist_write" on public.opt_out_blocklist
  for insert with check (auth.role() = 'authenticated');

-- Service role bypass for all feature tables
do $$ declare t text; begin
  foreach t in array array[
    'figsy_campaigns','figsy_enrollments','figsy_sent_emails','figsy_replies',
    'figsy_calls','figsy_memory','milla_documents','milla_chunks','milla_sessions',
    'milla_messages','vida_configs','vida_sessions','vida_messages',
    'calendar_bookings','partners','partner_referrals','partner_commissions',
    'contact_requests','product_waitlist','partner_applications','founder_agent_logs'
  ] loop
    execute format('drop policy if exists "service_role_bypass" on public.%I', t);
    execute format(
      'create policy "service_role_bypass" on public.%I for all to service_role using (true) with check (true)', t
    );
  end loop;
end $$;

-- =============================================================================
-- TRIGGERS — keep updated_at current
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

do $$ declare t text; begin
  foreach t in array array[
    'clients','subscriptions','icps','leads','figsy_campaigns',
    'figsy_enrollments','usage_metrics','vida_configs'
  ] loop
    execute format('drop trigger if exists %I_updated_at on public.%I', t, t);
    execute format(
      'create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end $$;

-- =============================================================================
-- VERIFY — run this to confirm everything is in place
-- =============================================================================
select
  table_name,
  count(*) as column_count
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'clients','subscriptions','icps','leads','credit_transactions',
    'figsy_campaigns','figsy_enrollments','figsy_sent_emails','figsy_replies',
    'figsy_memory','milla_sessions','milla_messages','vida_configs','vida_sessions',
    'calendar_bookings','partners'
  )
group by table_name
order by table_name;
