-- ════════════════════════════════════════════════════════════════════════════
-- K.I.N.D — STAGING DATABASE SCHEMA (COMPLETE, CONSOLIDATED, IDEMPOTENT)
-- Paste this entire file into your NEW Supabase project → SQL Editor → Run
-- Safe to re-run: every statement uses IF NOT EXISTS / OR REPLACE / DROP IF
-- Generated: 2026-06-12
-- ════════════════════════════════════════════════════════════════════════════

-- ── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ════════════════════════════════════════════════════════════════════════════
-- BASE TABLES (from packages/db/src/schema.sql)
-- ════════════════════════════════════════════════════════════════════════════

-- ── CLIENTS ─────────────────────────────────────────────────────────────────
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

-- ── SUBSCRIPTIONS ───────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id                         uuid primary key default uuid_generate_v4(),
  client_id                  uuid not null references public.clients(id) on delete cascade,
  product                    text not null,
  tier                       text not null check (tier in ('starter','advanced','pro','enterprise')),
  status                     text not null default 'trialing'
                               check (status in ('active','inactive','trialing','past_due','cancelled')),
  billing_interval           text not null default 'monthly' check (billing_interval in ('monthly','annual')),
  amount_usd                 integer not null default 0,
  amount_zar                 integer not null default 0,
  paystack_subscription_code text,
  paystack_customer_code     text,
  paystack_plan_code         text,
  stripe_subscription_id     text,
  trial_ends_at              timestamptz,
  current_period_start       timestamptz not null default now(),
  current_period_end         timestamptz not null default now() + interval '30 days',
  cancelled_at               timestamptz,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create index if not exists subscriptions_client_id_idx on public.subscriptions(client_id);
create unique index if not exists subscriptions_client_product_idx on public.subscriptions(client_id, product);
create index if not exists subscriptions_stripe_id_idx on public.subscriptions(stripe_subscription_id) where stripe_subscription_id is not null;

-- Widen product check to include all valid values (011_denise + figsy_addon)
alter table public.subscriptions drop constraint if exists subscriptions_product_check;
alter table public.subscriptions
  add constraint subscriptions_product_check
  check (product in (
    'lead_gen', 'lead_gen_figsy', 'figsy_addon',
    'virtual_assistant', 'chatbot', 'denise', 'denise_addon'
  ));

-- ── IDEAL CUSTOMER PROFILES (ICPs) ─────────────────────────────────────────
create table if not exists public.icps (
  id                    uuid primary key default uuid_generate_v4(),
  client_id             uuid not null references public.clients(id) on delete cascade,
  name                  text not null,
  industries            text[] not null default '{}',
  job_titles            text[] not null default '{}',
  seniority_levels      text[] not null default '{}',
  company_sizes         text[] not null default '{}',
  geographies           text[] not null default '{}',
  tech_stack            text[] not null default '{}',
  keywords              text[] not null default '{}',
  apollo_only_consented boolean not null default true,
  is_active             boolean not null default true,
  last_run_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists icps_client_id_idx on public.icps(client_id);

-- ICP extra columns from migrations
alter table public.icps add column if not exists organization_names jsonb not null default '[]'::jsonb;
alter table public.icps add column if not exists settings           jsonb not null default '{}'::jsonb;
alter table public.icps add column if not exists intent_signals     jsonb not null default '[]'::jsonb;

-- ── OPT-OUT BLOCKLIST ───────────────────────────────────────────────────────
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

-- ── LEADS ────────────────────────────────────────────────────────────────────
create table if not exists public.leads (
  id                       uuid primary key default uuid_generate_v4(),
  client_id                uuid not null references public.clients(id) on delete cascade,
  icp_id                   uuid references public.icps(id) on delete set null,
  first_name               text not null,
  last_name                text not null default '',
  email                    text,
  phone                    text,
  job_title                text,
  company                  text,
  linkedin_url             text,
  country                  text,
  company_size             text,
  industry                 text,
  seniority                text,
  tech_stack               text[],
  apollo_id                text,
  apollo_consented         boolean not null default false,
  score                    integer check (score >= 0 and score <= 100),
  score_reasoning          text,
  scored_at                timestamptz,
  ai_email_draft           text,
  outreach_sent_at         timestamptz,
  status                   text not null default 'pending'
                             check (status in (
                               'pending','scored','contacted',
                               'consent_sent','consent_given',
                               'exported','rejected','opted_out'
                             )),
  consent_sent_at          timestamptz,
  consent_given_at         timestamptz,
  opted_out_at             timestamptz,
  consent_token            text,
  consent_auto_fired       boolean default false,
  crm_synced               boolean not null default false,
  crm_contact_id           text,
  crm_existing             boolean not null default false,
  crm_match_reason         text,
  exported_at              timestamptz,
  estimated_deal_value_usd integer,
  delivered_at             timestamptz default null,
  research_summary         jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists leads_client_id_idx on public.leads(client_id);
create index if not exists leads_status_idx     on public.leads(status);
create index if not exists leads_score_idx      on public.leads(score desc);
create index if not exists leads_email_idx      on public.leads(email);
create index if not exists idx_leads_drip       on public.leads(client_id, delivered_at) where delivered_at is null;
create index if not exists idx_leads_crm_existing on public.leads(client_id) where crm_existing = true;
create unique index if not exists leads_consent_token_key on public.leads(consent_token);

-- ── ASSISTANT MESSAGES ──────────────────────────────────────────────────────
create table if not exists public.assistant_messages (
  id         uuid primary key default uuid_generate_v4(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  role       text not null check (role in ('user','assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists assistant_messages_client_id_idx on public.assistant_messages(client_id);

-- ── CHATBOT CONFIGS ─────────────────────────────────────────────────────────
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

-- ── USAGE METRICS ───────────────────────────────────────────────────────────
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

create index if not exists usage_metrics_client_id_idx on public.usage_metrics(client_id);

-- ── AGREEMENT TEMPLATES ─────────────────────────────────────────────────────
create table if not exists public.agreement_templates (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  description text,
  file_path   text not null,
  file_url    text not null,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ── ORDER FORMS ─────────────────────────────────────────────────────────────
create table if not exists public.order_forms (
  id                uuid primary key default uuid_generate_v4(),
  client_id         uuid not null references public.clients(id) on delete cascade,
  products          jsonb not null default '[]',
  total_monthly_usd integer not null default 0,
  start_date        date,
  scope_notes       text,
  status            text not null default 'draft'
                      check (status in ('draft','sent','signed','cancelled')),
  sent_at           timestamptz,
  signed_at         timestamptz,
  signed_by         text,
  signed_ip         text,
  created_by_email  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique(client_id)
);

create index if not exists order_forms_client_id_idx on public.order_forms(client_id);
create index if not exists order_forms_status_idx    on public.order_forms(status);

-- ════════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTION + RLS (base schema)
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.current_client_id()
returns uuid language sql stable as $$
  select id from public.clients where user_id = auth.uid() limit 1;
$$;

alter table public.clients              enable row level security;
alter table public.subscriptions        enable row level security;
alter table public.icps                 enable row level security;
alter table public.leads                enable row level security;
alter table public.opt_out_blocklist    enable row level security;
alter table public.assistant_messages   enable row level security;
alter table public.chatbot_configs      enable row level security;
alter table public.usage_metrics        enable row level security;
alter table public.agreement_templates  enable row level security;
alter table public.order_forms          enable row level security;

drop policy if exists "clients_own"             on public.clients;
drop policy if exists "subscriptions_own"       on public.subscriptions;
drop policy if exists "icps_own"                on public.icps;
drop policy if exists "leads_own"               on public.leads;
drop policy if exists "blocklist_read"          on public.opt_out_blocklist;
drop policy if exists "blocklist_write"         on public.opt_out_blocklist;
drop policy if exists "assistant_messages_own"  on public.assistant_messages;
drop policy if exists "chatbot_configs_own"     on public.chatbot_configs;
drop policy if exists "usage_metrics_own"       on public.usage_metrics;
drop policy if exists "agreement_templates_read" on public.agreement_templates;
drop policy if exists "order_forms_own"         on public.order_forms;
drop policy if exists "order_forms_sign"        on public.order_forms;

create policy "clients_own"            on public.clients          for all using (auth.uid() = user_id);
create policy "subscriptions_own"      on public.subscriptions    for all using (client_id = public.current_client_id());
create policy "icps_own"               on public.icps             for all using (client_id = public.current_client_id());
create policy "leads_own"              on public.leads            for all using (client_id = public.current_client_id());
create policy "blocklist_read"         on public.opt_out_blocklist for select using (auth.role() = 'authenticated');
create policy "blocklist_write"        on public.opt_out_blocklist for insert with check (auth.role() = 'authenticated');
create policy "assistant_messages_own" on public.assistant_messages for all using (client_id = public.current_client_id());
create policy "chatbot_configs_own"    on public.chatbot_configs  for all using (client_id = public.current_client_id());
create policy "usage_metrics_own"      on public.usage_metrics    for all using (client_id = public.current_client_id());
create policy "agreement_templates_read" on public.agreement_templates for select using (auth.role() = 'authenticated');
create policy "order_forms_own"        on public.order_forms      for select using (client_id = public.current_client_id());
create policy "order_forms_sign"       on public.order_forms      for update using (client_id = public.current_client_id());

-- ════════════════════════════════════════════════════════════════════════════
-- TRIGGERS (updated_at)
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists clients_updated_at        on public.clients;
drop trigger if exists subscriptions_updated_at  on public.subscriptions;
drop trigger if exists icps_updated_at           on public.icps;
drop trigger if exists leads_updated_at          on public.leads;
drop trigger if exists chatbot_configs_updated_at on public.chatbot_configs;
drop trigger if exists usage_metrics_updated_at  on public.usage_metrics;
drop trigger if exists order_forms_updated_at    on public.order_forms;

create trigger clients_updated_at       before update on public.clients       for each row execute function public.set_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();
create trigger icps_updated_at          before update on public.icps          for each row execute function public.set_updated_at();
create trigger leads_updated_at         before update on public.leads         for each row execute function public.set_updated_at();
create trigger chatbot_configs_updated_at before update on public.chatbot_configs for each row execute function public.set_updated_at();
create trigger usage_metrics_updated_at before update on public.usage_metrics for each row execute function public.set_updated_at();
create trigger order_forms_updated_at   before update on public.order_forms   for each row execute function public.set_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
-- FIGSY TABLES (002_figsy.sql + schema_reconcile fixes)
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.figsy_campaigns (
  id                    uuid primary key default uuid_generate_v4(),
  client_id             uuid not null references public.clients(id) on delete cascade,
  name                  text not null,
  status                text not null default 'draft',
  icp_id                uuid references public.icps(id),
  leads_enrolled        integer not null default 0,
  emails_sent           integer not null default 0,
  replies_total         integer not null default 0,
  replies_interested    integer not null default 0,
  opted_out             integer not null default 0,
  steps_count           integer not null default 3,
  settings              jsonb not null default '{}'::jsonb,
  campaign_intent       text,
  intent_mapped_at      timestamptz,
  meetings_booked       integer not null default 0,
  copilot_mode          boolean default false,
  approve_before_send   boolean not null default false,
  model_preference      text default 'haiku' check (model_preference in ('haiku','sonnet')),
  personalized_images_enabled boolean default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Widen status check to include paused_low_performance
alter table public.figsy_campaigns drop constraint if exists figsy_campaigns_status_check;
alter table public.figsy_campaigns
  add constraint figsy_campaigns_status_check
  check (status in ('draft','active','paused','paused_low_performance','completed','archived'));

create index if not exists figsy_campaigns_client_id_idx on public.figsy_campaigns(client_id);
create index if not exists figsy_campaigns_status_idx    on public.figsy_campaigns(status);

create table if not exists public.figsy_enrollments (
  id                  uuid primary key default uuid_generate_v4(),
  campaign_id         uuid not null references public.figsy_campaigns(id) on delete cascade,
  lead_id             uuid not null references public.leads(id) on delete cascade,
  client_id           uuid not null references public.clients(id) on delete cascade,
  status              text not null default 'enrolled'
                        check (status in ('enrolled','in_progress','replied','paused','opted_out','completed','bounced')),
  current_step        integer not null default 0,
  enrolled_at         timestamptz not null default now(),
  next_send_at        timestamptz,
  completed_at        timestamptz,
  step1_subject       text,
  step1_body          text,
  step2_subject       text,
  step2_body          text,
  step3_subject       text,
  step3_body          text,
  crm_deal_id         text,
  crm_pushed_at       timestamptz,
  reply_branch_handled_at timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique(campaign_id, lead_id)
);

create index if not exists figsy_enrollments_campaign_id_idx  on public.figsy_enrollments(campaign_id);
create index if not exists figsy_enrollments_lead_id_idx      on public.figsy_enrollments(lead_id);
create index if not exists figsy_enrollments_next_send_at_idx on public.figsy_enrollments(next_send_at);
create index if not exists figsy_enrollments_status_idx       on public.figsy_enrollments(status);

create table if not exists public.figsy_sent_emails (
  id            uuid primary key default uuid_generate_v4(),
  enrollment_id uuid references public.figsy_enrollments(id) on delete cascade,
  campaign_id   uuid references public.figsy_campaigns(id) on delete cascade,
  lead_id       uuid not null references public.leads(id) on delete cascade,
  step          integer not null,
  subject       text not null,
  body          text not null,
  resend_id     text,
  status        text not null default 'sent',
  opened_at     timestamptz default null,
  sent_at       timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index if not exists figsy_sent_emails_enrollment_id_idx on public.figsy_sent_emails(enrollment_id);
create index if not exists figsy_sent_emails_lead_id_idx       on public.figsy_sent_emails(lead_id);
create index if not exists figsy_sent_emails_opened_at_idx     on public.figsy_sent_emails(campaign_id, opened_at) where opened_at is not null;

create table if not exists public.figsy_replies (
  id                         uuid primary key default uuid_generate_v4(),
  enrollment_id              uuid references public.figsy_enrollments(id),
  campaign_id                uuid references public.figsy_campaigns(id) on delete cascade,
  lead_id                    uuid not null references public.leads(id) on delete cascade,
  client_id                  uuid not null references public.clients(id) on delete cascade,
  from_email                 text not null,
  from_name                  text,
  subject                    text,
  body                       text not null,
  body_text                  text,
  classification             text,
  classification_reasoning   text,
  meeting_booked_at          timestamptz,
  raw_payload                jsonb,
  received_at                timestamptz not null default now(),
  processed_at               timestamptz
);

-- Widen classification check to match all values the code writes
alter table public.figsy_replies drop constraint if exists figsy_replies_classification_check;
alter table public.figsy_replies
  add constraint figsy_replies_classification_check
  check (classification is null or classification in (
    'hot','warm','cold',
    'interested','not_interested',
    'opt_out','unsubscribe',
    'out_of_office','wrong_person','referral','other'
  ));

create index if not exists figsy_replies_campaign_id_idx on public.figsy_replies(campaign_id);
create index if not exists figsy_replies_lead_id_idx     on public.figsy_replies(lead_id);

-- RLS on figsy tables
alter table public.figsy_campaigns    enable row level security;
alter table public.figsy_enrollments  enable row level security;
alter table public.figsy_sent_emails  enable row level security;
alter table public.figsy_replies      enable row level security;

drop policy if exists "clients see own campaigns"    on public.figsy_campaigns;
drop policy if exists "clients see own enrollments"  on public.figsy_enrollments;
drop policy if exists "clients see own sent emails"  on public.figsy_sent_emails;
drop policy if exists "clients see own replies"      on public.figsy_replies;
drop policy if exists "service role bypass campaigns"   on public.figsy_campaigns;
drop policy if exists "service role bypass enrollments" on public.figsy_enrollments;
drop policy if exists "service role bypass sent emails" on public.figsy_sent_emails;
drop policy if exists "service role bypass replies"     on public.figsy_replies;

create policy "clients see own campaigns"    on public.figsy_campaigns   for all using (client_id = public.current_client_id());
create policy "clients see own enrollments"  on public.figsy_enrollments for all using (client_id = public.current_client_id());
create policy "clients see own sent emails"  on public.figsy_sent_emails for all using (campaign_id in (select id from public.figsy_campaigns where client_id = public.current_client_id()));
create policy "clients see own replies"      on public.figsy_replies     for all using (client_id = public.current_client_id());
create policy "service role bypass campaigns"   on public.figsy_campaigns   for all to service_role using (true) with check (true);
create policy "service role bypass enrollments" on public.figsy_enrollments for all to service_role using (true) with check (true);
create policy "service role bypass sent emails" on public.figsy_sent_emails for all to service_role using (true) with check (true);
create policy "service role bypass replies"     on public.figsy_replies     for all to service_role using (true) with check (true);

-- ── FIGSY MEMORY ─────────────────────────────────────────────────────────────
create table if not exists public.figsy_memory (
  id                     uuid primary key default gen_random_uuid(),
  client_id              uuid not null references public.clients(id) on delete cascade,
  best_subject_lines     text[] default '{}',
  avg_reply_rate_30d     numeric default 0,
  total_sent_all_time    integer default 0,
  total_replies_all_time integer default 0,
  top_performing_icp     text,
  last_winning_angle     text,
  episodic_memory        jsonb null,
  longterm_memory        jsonb null,
  preference_memory      jsonb null,
  last_updated           timestamptz default now(),
  constraint figsy_memory_client_unique unique (client_id)
);

alter table public.figsy_memory enable row level security;
drop policy if exists "Clients can read own memory" on public.figsy_memory;
create policy "Clients can read own memory" on public.figsy_memory for select using (client_id = (select id from public.clients where user_id = auth.uid()));

-- ── FIGSY CALLS ──────────────────────────────────────────────────────────────
create table if not exists public.figsy_calls (
  id               uuid primary key default gen_random_uuid(),
  enrollment_id    uuid not null references public.figsy_enrollments(id) on delete cascade,
  lead_id          uuid not null references public.leads(id) on delete cascade,
  campaign_id      uuid not null references public.figsy_campaigns(id) on delete cascade,
  client_id        uuid not null references public.clients(id) on delete cascade,
  vapi_call_id     text,
  status           text not null default 'initiated'
                     check (status in ('initiated','ringing','in_progress','ended','failed')),
  outcome          text check (outcome in ('answered','voicemail','no_answer','failed') or outcome is null),
  duration_seconds integer,
  transcript       text,
  recording_url    text,
  created_at       timestamptz not null default now(),
  ended_at         timestamptz
);

create index if not exists idx_figsy_calls_enrollment_id on public.figsy_calls(enrollment_id);
create index if not exists idx_figsy_calls_lead_id       on public.figsy_calls(lead_id);
create index if not exists idx_figsy_calls_client_id     on public.figsy_calls(client_id);
alter table public.figsy_calls enable row level security;
drop policy if exists "Service role bypass" on public.figsy_calls;
create policy "Service role bypass" on public.figsy_calls for all using (true);

-- ════════════════════════════════════════════════════════════════════════════
-- CREDIT TRANSACTIONS
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.credit_transactions (
  id         uuid        primary key default gen_random_uuid(),
  client_id  uuid        not null references public.clients(id) on delete cascade,
  type       text        not null,
  amount     integer     not null,
  plan       text,
  reference  text,
  note       text,
  created_at timestamptz not null default now()
);

-- Widen type check to all values the code writes
alter table public.credit_transactions drop constraint if exists credit_transactions_type_check;
alter table public.credit_transactions
  add constraint credit_transactions_type_check
  check (type in (
    'purchase','credit_purchase',
    'referral','referral_bonus',
    'trial_bonus',
    'consumed','usage',
    'manual_grant','refund'
  ));

create index if not exists credit_transactions_client_idx on public.credit_transactions(client_id);
create unique index if not exists credit_transactions_reference_unique on public.credit_transactions(reference) where reference is not null;

alter table public.credit_transactions enable row level security;
drop policy if exists credit_transactions_own on public.credit_transactions;
create policy credit_transactions_own on public.credit_transactions for all using (client_id = public.current_client_id());

-- Atomic credit increment RPC
create or replace function increment_client_credits(p_client_id uuid, p_amount integer)
returns integer language plpgsql security definer as $$
declare v_new_balance integer;
begin
  update public.clients set credit_balance = coalesce(credit_balance, 0) + p_amount
  where id = p_client_id returning credit_balance into v_new_balance;
  return v_new_balance;
end;
$$;
revoke execute on function increment_client_credits from public;
grant  execute on function increment_client_credits to service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- CLIENTS EXTRA COLUMNS (from migrations)
-- ════════════════════════════════════════════════════════════════════════════

alter table public.clients add column if not exists referred_by           uuid references public.clients(id) on delete set null;
alter table public.clients add column if not exists credit_balance        integer not null default 0;
alter table public.clients add column if not exists first_icp_run_at      timestamptz;
alter table public.clients add column if not exists terms_accepted_at     timestamptz;
alter table public.clients add column if not exists terms_accepted_ip     text;
alter table public.clients add column if not exists company_registration  text;
alter table public.clients add column if not exists vat_number            text;
alter table public.clients add column if not exists is_demo               boolean default false;
alter table public.clients add column if not exists demo_prospect_name    text;
alter table public.clients add column if not exists demo_created_by       text;
alter table public.clients add column if not exists demo_expires_at       timestamptz;
alter table public.clients add column if not exists auto_topup_enabled    boolean not null default false;
alter table public.clients add column if not exists auto_topup_threshold  integer not null default 0;
alter table public.clients add column if not exists auto_topup_plan       text check (auto_topup_plan in ('kind_ai','figsy'));
alter table public.clients add column if not exists auto_topup_bundle_size integer;
alter table public.clients add column if not exists auto_topup_paystack_auth text;
alter table public.clients add column if not exists calendar_booking_enabled boolean not null default false;
alter table public.clients add column if not exists google_calendar_access_token text;
alter table public.clients add column if not exists google_calendar_refresh_token text;
alter table public.clients add column if not exists google_calendar_token_expiry  timestamptz;
alter table public.clients add column if not exists google_calendar_email text;
alter table public.clients add column if not exists figsy_credits_remaining integer not null default 0;
alter table public.clients add column if not exists daily_drip_rate        integer default 5;
alter table public.clients add column if not exists share_token            text default (replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''));
alter table public.clients add column if not exists crm_type              text check (crm_type in ('hubspot','pipedrive','none'));
alter table public.clients add column if not exists crm_api_key           text;
alter table public.clients add column if not exists crm_sync_enabled      boolean not null default false;
alter table public.clients add column if not exists crm_dedup_enabled     boolean not null default false;
alter table public.clients add column if not exists signer_name           text;
alter table public.clients add column if not exists booking_url           text;

create unique index if not exists clients_share_token_key on public.clients(share_token);

-- Backfill share_token for any rows without one
update public.clients set share_token = replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','') where share_token is null;

-- ════════════════════════════════════════════════════════════════════════════
-- FOUNDER AGENT LOGS
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.founder_agent_logs (
  id         uuid primary key default gen_random_uuid(),
  agent      text not null,
  action     text not null,
  payload    jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_founder_agent_logs_agent      on public.founder_agent_logs(agent);
create index if not exists idx_founder_agent_logs_created_at on public.founder_agent_logs(created_at desc);

-- ════════════════════════════════════════════════════════════════════════════
-- CONTACT REQUESTS / PARTNER APPLICATIONS / PRODUCT WAITLIST
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.contact_requests (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  company    text,
  message    text,
  type       text default 'demo',
  created_at timestamptz default now()
);

alter table public.contact_requests enable row level security;
drop policy if exists "anon_insert_contact"   on public.contact_requests;
drop policy if exists "service_read_contact"  on public.contact_requests;
create policy "anon_insert_contact"  on public.contact_requests for insert to anon with check (true);
create policy "service_read_contact" on public.contact_requests for select to service_role using (true);

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

alter table public.partner_applications enable row level security;
drop policy if exists "anon_insert_partner"   on public.partner_applications;
drop policy if exists "service_read_partner"  on public.partner_applications;
create policy "anon_insert_partner"  on public.partner_applications for insert to anon with check (true);
create policy "service_read_partner" on public.partner_applications for select to service_role using (true);

create table if not exists public.product_waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  name       text,
  company    text,
  product    text not null,
  created_at timestamptz default now()
);

alter table public.product_waitlist enable row level security;
drop policy if exists "anon_insert_waitlist"   on public.product_waitlist;
drop policy if exists "service_read_waitlist"  on public.product_waitlist;
create policy "anon_insert_waitlist"  on public.product_waitlist for insert to anon with check (true);
create policy "service_read_waitlist" on public.product_waitlist for select to service_role using (true);

-- ════════════════════════════════════════════════════════════════════════════
-- MILLA TABLES
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.milla_documents (
  id         uuid primary key default uuid_generate_v4(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  name       text not null,
  type       text not null default 'txt',
  content    text,
  status     text not null default 'processing',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.milla_chunks (
  id           uuid primary key default uuid_generate_v4(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  document_id  uuid not null references public.milla_documents(id) on delete cascade,
  content      text not null,
  chunk_index  integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists idx_milla_chunks_client_id   on public.milla_chunks(client_id);
create index if not exists idx_milla_chunks_document_id on public.milla_chunks(document_id);
create index if not exists idx_milla_chunks_content_fts on public.milla_chunks using gin(to_tsvector('english', content));

create table if not exists public.milla_sessions (
  id         uuid primary key default uuid_generate_v4(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  title      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_milla_sessions_client_id on public.milla_sessions(client_id);

create table if not exists public.milla_messages (
  id         uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.milla_sessions(id) on delete cascade,
  client_id  uuid not null references public.clients(id) on delete cascade,
  role       text not null,
  content    text not null,
  sources    jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_milla_messages_session_id on public.milla_messages(session_id);
create index if not exists idx_milla_messages_client_id  on public.milla_messages(client_id);

alter table public.milla_documents enable row level security;
alter table public.milla_chunks     enable row level security;
alter table public.milla_sessions   enable row level security;
alter table public.milla_messages   enable row level security;

drop policy if exists "milla_documents_service" on public.milla_documents;
drop policy if exists "milla_chunks_service"    on public.milla_chunks;
drop policy if exists "milla_sessions_service"  on public.milla_sessions;
drop policy if exists "milla_messages_service"  on public.milla_messages;

create policy "milla_documents_service" on public.milla_documents using (true) with check (true);
create policy "milla_chunks_service"    on public.milla_chunks     using (true) with check (true);
create policy "milla_sessions_service"  on public.milla_sessions   using (true) with check (true);
create policy "milla_messages_service"  on public.milla_messages   using (true) with check (true);

-- ════════════════════════════════════════════════════════════════════════════
-- VIDA TABLES
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.vida_configs (
  id            uuid        primary key default gen_random_uuid(),
  client_id     uuid        not null references public.clients(id) on delete cascade unique,
  bot_name      text        not null default 'Vida',
  greeting      text        not null default 'Hi! How can I help you today?',
  system_prompt text,
  primary_color text        not null default '#7C3AED',
  collect_email boolean     not null default true,
  collect_phone boolean     not null default false,
  notify_email  text,
  active        boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.vida_sessions (
  id            uuid        primary key default gen_random_uuid(),
  client_id     uuid        not null references public.clients(id),
  visitor_name  text,
  visitor_email text,
  visitor_phone text,
  channel       text        not null default 'web',
  lead_score    integer,
  outcome       text,
  created_at    timestamptz not null default now(),
  ended_at      timestamptz
);

create index if not exists idx_vida_sessions_client_id  on public.vida_sessions(client_id);
create index if not exists idx_vida_sessions_created_at on public.vida_sessions(created_at desc);

create table if not exists public.vida_messages (
  id         uuid        primary key default gen_random_uuid(),
  session_id uuid        not null references public.vida_sessions(id) on delete cascade,
  client_id  uuid        not null references public.clients(id),
  role       text        not null,
  content    text        not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_vida_messages_session_id on public.vida_messages(session_id);
create index if not exists idx_vida_messages_client_id  on public.vida_messages(client_id);

alter table public.vida_configs  enable row level security;
alter table public.vida_sessions enable row level security;
alter table public.vida_messages enable row level security;

drop policy if exists "service role bypass vida_configs"   on public.vida_configs;
drop policy if exists "service role bypass vida_sessions"  on public.vida_sessions;
drop policy if exists "service role bypass vida_messages"  on public.vida_messages;

create policy "service role bypass vida_configs"  on public.vida_configs  for all to service_role using (true) with check (true);
create policy "service role bypass vida_sessions" on public.vida_sessions for all to service_role using (true) with check (true);
create policy "service role bypass vida_messages" on public.vida_messages for all to service_role using (true) with check (true);

-- ════════════════════════════════════════════════════════════════════════════
-- PLATFORM STATUS
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.platform_status (
  id           uuid primary key default gen_random_uuid(),
  generated_at timestamptz not null default now(),
  session      text not null check (session in ('morning','lunch','evening')),
  summary      text not null,
  data         jsonb not null,
  created_at   timestamptz not null default now()
);

alter table public.platform_status enable row level security;
drop policy if exists "service role only" on public.platform_status;
create policy "service role only" on public.platform_status using (false) with check (false);

-- ════════════════════════════════════════════════════════════════════════════
-- LEAD ENRICHMENT
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.lead_enrichment (
  lead_id          uuid primary key references public.leads(id) on delete cascade,
  recent_signal    text,
  company_context  text,
  opening_line     text,
  enrichment_score int check (enrichment_score between 1 and 10),
  enriched_at      timestamptz default now()
);

create index if not exists lead_enrichment_enriched_at_idx on public.lead_enrichment(enriched_at desc);
alter table public.lead_enrichment enable row level security;
drop policy if exists "Service role bypass" on public.lead_enrichment;
create policy "Service role bypass" on public.lead_enrichment for all using (true);

-- ════════════════════════════════════════════════════════════════════════════
-- AFRICAN DATA MOAT
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.african_data_moat (
  id                uuid primary key default gen_random_uuid(),
  country           text not null,
  industry          text,
  seniority         text,
  company_size      text,
  job_title         text,
  score             integer,
  replied           boolean not null default false,
  reply_type        text,
  opened            boolean not null default false,
  meeting_booked    boolean not null default false,
  sequence_step     integer,
  icp_keywords      text[],
  enrichment_source text,
  created_at        timestamptz not null default now(),
  aggregated_at     timestamptz not null default now()
);

create index if not exists adm_country_idx  on public.african_data_moat(country);
create index if not exists adm_industry_idx on public.african_data_moat(industry);

-- ════════════════════════════════════════════════════════════════════════════
-- CLIENT MEMBERS (team model)
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.client_members (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  email       text not null,
  role        text not null default 'member' check (role in ('owner','admin','member','viewer')),
  invited_by  uuid references auth.users(id),
  invited_at  timestamptz default now(),
  accepted_at timestamptz,
  invite_token text unique,
  unique(client_id, user_id),
  unique(client_id, email)
);

alter table public.client_members enable row level security;

drop policy if exists "members_select" on public.client_members;
drop policy if exists "members_insert" on public.client_members;
drop policy if exists "members_update" on public.client_members;
drop policy if exists "members_delete" on public.client_members;

create policy "members_select" on public.client_members for select using (
  client_id in (select client_id from public.client_members where user_id = auth.uid())
  or client_id in (select id from public.clients where user_id = auth.uid())
);
create policy "members_insert" on public.client_members for insert with check (
  client_id in (select cm.client_id from public.client_members cm where cm.user_id = auth.uid() and cm.role in ('owner','admin'))
  or client_id in (select id from public.clients where user_id = auth.uid())
);
create policy "members_update" on public.client_members for update using (
  user_id = auth.uid()
  or client_id in (select cm.client_id from public.client_members cm where cm.user_id = auth.uid() and cm.role in ('owner','admin'))
  or client_id in (select id from public.clients where user_id = auth.uid())
);
create policy "members_delete" on public.client_members for delete using (
  client_id in (select cm.client_id from public.client_members cm where cm.user_id = auth.uid() and cm.role in ('owner','admin'))
  or client_id in (select id from public.clients where user_id = auth.uid())
);

create index if not exists client_members_client_id_idx  on public.client_members(client_id);
create index if not exists client_members_user_id_idx    on public.client_members(user_id);
create index if not exists client_members_invite_token_idx on public.client_members(invite_token) where invite_token is not null;

-- Seed any existing clients as owner (idempotent)
insert into public.client_members (client_id, user_id, email, role, accepted_at)
select c.id, c.user_id, u.email, 'owner', now()
from public.clients c
join auth.users u on u.id = c.user_id
on conflict (client_id, user_id) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- CLIENT MESSAGES
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.client_messages (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  content     text not null,
  sender_type text not null check (sender_type in ('client','admin')),
  read_at     timestamptz null,
  created_at  timestamptz not null default now()
);

create index if not exists client_messages_client_id_idx on public.client_messages(client_id);
create index if not exists client_messages_created_at_idx on public.client_messages(created_at desc);

alter table public.client_messages enable row level security;
drop policy if exists "clients_own_messages" on public.client_messages;
create policy "clients_own_messages" on public.client_messages for all using (
  client_id in (select id from public.clients where user_id = auth.uid())
);

-- ════════════════════════════════════════════════════════════════════════════
-- FIGSY TASKS
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.figsy_tasks (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  title       text not null,
  description text,
  status      text not null default 'pending' check (status in ('pending','in_progress','done','escalated')),
  result      text,
  assigned_by text not null default 'client',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.figsy_tasks enable row level security;
drop policy if exists "clients read own tasks"   on public.figsy_tasks;
drop policy if exists "clients insert own tasks" on public.figsy_tasks;
drop policy if exists "service role full access" on public.figsy_tasks;

create policy "clients read own tasks"   on public.figsy_tasks for select  using (client_id in (select id from public.clients where user_id = auth.uid()));
create policy "clients insert own tasks" on public.figsy_tasks for insert  with check (client_id in (select id from public.clients where user_id = auth.uid()));
create policy "service role full access" on public.figsy_tasks for all     using (auth.role() = 'service_role');

-- ════════════════════════════════════════════════════════════════════════════
-- AGENT SIGNALS
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.agent_signals (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  agent      text not null check (agent in ('figsy','milla','vida')),
  signal_type text not null,
  payload    jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_signals_client on public.agent_signals(client_id, created_at desc);
create index if not exists idx_agent_signals_agent  on public.agent_signals(agent, signal_type);

alter table public.agent_signals enable row level security;
drop policy if exists "clients read own signals"   on public.agent_signals;
drop policy if exists "service role full access"   on public.agent_signals;

create policy "clients read own signals" on public.agent_signals for select using (client_id in (select id from public.clients where user_id = auth.uid()));
create policy "service role full access" on public.agent_signals for all   using (auth.role() = 'service_role');

-- ════════════════════════════════════════════════════════════════════════════
-- DEVELOPER KEYS
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.developer_keys (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid references public.clients(id) on delete cascade,
  key_prefix     text not null,
  key_hash       text not null,
  name           text not null default 'My API Key',
  created_at     timestamptz default now(),
  last_used_at   timestamptz,
  total_requests integer default 0,
  revoked_at     timestamptz
);

alter table public.developer_keys enable row level security;
drop policy if exists "client_own_keys" on public.developer_keys;
create policy "client_own_keys" on public.developer_keys for all using (client_id = (select id from public.clients where user_id = auth.uid()));

-- ════════════════════════════════════════════════════════════════════════════
-- PROPOSALS
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.proposals (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid references public.clients(id) on delete cascade,
  title           text not null,
  content         jsonb not null default '{}',
  status          text not null default 'draft' check (status in ('draft','sent','viewed','signed')),
  recipient_email text,
  recipient_name  text,
  sign_token      text unique default encode(gen_random_bytes(32),'hex'),
  sent_at         timestamptz,
  viewed_at       timestamptz,
  signed_at       timestamptz,
  created_at      timestamptz default now()
);

alter table public.proposals enable row level security;
drop policy if exists "client_own_proposals" on public.proposals;
create policy "client_own_proposals" on public.proposals for all using (client_id = (select id from public.clients where user_id = auth.uid()));

-- ════════════════════════════════════════════════════════════════════════════
-- VISITOR SESSIONS
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.visitor_sessions (
  id                uuid primary key default gen_random_uuid(),
  ip                text,
  company_name      text,
  company_domain    text,
  company_country   text,
  company_size_range text,
  page_url          text,
  referrer          text,
  user_agent        text,
  intent_score      integer default 0,
  visited_at        timestamptz default now()
);

alter table public.visitor_sessions enable row level security;
drop policy if exists "public_insert_visits" on public.visitor_sessions;
drop policy if exists "admin_read_visits"    on public.visitor_sessions;
create policy "public_insert_visits" on public.visitor_sessions for insert with check (true);
create policy "admin_read_visits"    on public.visitor_sessions for select using (true);

-- ════════════════════════════════════════════════════════════════════════════
-- PARTNERS
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.partners (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  email              text not null unique,
  company            text,
  country            text,
  partner_type       text not null default 'referral' check (partner_type in ('referral','agency','technology')),
  tier               text not null default 'referral' check (tier in ('referral','agency','white_label')),
  commission_rate    numeric(5,4) not null default 0.2000,
  status             text not null default 'pending' check (status in ('pending','active','suspended')),
  referral_code      text unique,
  demo_env_id        uuid,
  notes              text,
  contract_signed_at timestamptz,
  contract_version   text default 'v1.0',
  approved_at        timestamptz,
  created_at         timestamptz not null default now()
);

create table if not exists public.partner_referrals (
  id               uuid primary key default gen_random_uuid(),
  partner_id       uuid not null references public.partners(id) on delete cascade,
  client_id        uuid not null references public.clients(id) on delete cascade,
  status           text not null default 'active' check (status in ('active','churned','paused')),
  first_payment_at timestamptz,
  created_at       timestamptz not null default now(),
  unique(partner_id, client_id)
);

create table if not exists public.partner_commissions (
  id                  uuid primary key default gen_random_uuid(),
  partner_id          uuid not null references public.partners(id) on delete cascade,
  partner_referral_id uuid references public.partner_referrals(id),
  client_id           uuid not null references public.clients(id) on delete cascade,
  amount_zar          numeric(10,2) not null,
  amount_usd          numeric(10,2),
  period_month        text not null,
  status              text not null default 'pending' check (status in ('pending','approved','paid','cancelled')),
  paid_at             timestamptz,
  wise_reference      text,
  created_at          timestamptz not null default now()
);

create table if not exists public.deal_registrations (
  id              uuid primary key default gen_random_uuid(),
  partner_id      uuid not null references public.partners(id) on delete cascade,
  company_name    text not null,
  contact_name    text not null,
  contact_email   text not null,
  company_size    text,
  industry        text,
  country         text,
  estimated_value numeric(10,2),
  notes           text,
  status          text not null default 'pending' check (status in ('pending','approved','won','lost','expired')),
  protected_until timestamptz not null default (now() + interval '60 days'),
  won_at          timestamptz,
  lost_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_partner_referrals_partner     on public.partner_referrals(partner_id);
create index if not exists idx_partner_commissions_partner   on public.partner_commissions(partner_id, period_month);
create index if not exists idx_deal_registrations_partner    on public.deal_registrations(partner_id, status);
create index if not exists idx_deal_registrations_email      on public.deal_registrations(contact_email);

alter table public.partners             enable row level security;
alter table public.partner_referrals    enable row level security;
alter table public.partner_commissions  enable row level security;
alter table public.deal_registrations   enable row level security;

drop policy if exists "partners read own record"                   on public.partners;
drop policy if exists "service role full access on partners"       on public.partners;
drop policy if exists "partners read own referrals"                on public.partner_referrals;
drop policy if exists "service role full access on partner_referrals" on public.partner_referrals;
drop policy if exists "partners read own commissions"              on public.partner_commissions;
drop policy if exists "service role full access on partner_commissions" on public.partner_commissions;
drop policy if exists "partners read own deals"                    on public.deal_registrations;
drop policy if exists "partners insert own deals"                  on public.deal_registrations;
drop policy if exists "service role full access on deal_registrations" on public.deal_registrations;

create policy "partners read own record"             on public.partners            for select using (email = (select email from auth.users where id = auth.uid()));
create policy "service role full access on partners" on public.partners            for all    using (auth.role() = 'service_role');
create policy "partners read own referrals"          on public.partner_referrals   for select using (partner_id in (select id from public.partners where email = (select email from auth.users where id = auth.uid())));
create policy "service role full access on partner_referrals" on public.partner_referrals for all using (auth.role() = 'service_role');
create policy "partners read own commissions"        on public.partner_commissions for select using (partner_id in (select id from public.partners where email = (select email from auth.users where id = auth.uid())));
create policy "service role full access on partner_commissions" on public.partner_commissions for all using (auth.role() = 'service_role');
create policy "partners read own deals"   on public.deal_registrations for select using (partner_id in (select id from public.partners where email = (select email from auth.users where id = auth.uid())));
create policy "partners insert own deals" on public.deal_registrations for insert with check (partner_id in (select id from public.partners where email = (select email from auth.users where id = auth.uid())));
create policy "service role full access on deal_registrations" on public.deal_registrations for all using (auth.role() = 'service_role');

-- ════════════════════════════════════════════════════════════════════════════
-- CALENDAR BOOKINGS
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.calendar_bookings (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  lead_id         uuid references public.leads(id) on delete set null,
  enrollment_id   uuid references public.figsy_enrollments(id) on delete set null,
  google_event_id text,
  meeting_title   text,
  start_time      timestamptz,
  end_time        timestamptz,
  meeting_link    text,
  status          text not null default 'confirmed',
  created_at      timestamptz not null default now()
);

create index if not exists calendar_bookings_client_idx on public.calendar_bookings(client_id, start_time);
create index if not exists calendar_bookings_lead_idx   on public.calendar_bookings(lead_id);
alter table public.calendar_bookings enable row level security;

-- ════════════════════════════════════════════════════════════════════════════
-- FIGSY CHAT MESSAGES
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.figsy_chat_messages (
  id         uuid primary key default uuid_generate_v4(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  role       text not null check (role in ('user','assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists figsy_chat_messages_client_idx on public.figsy_chat_messages(client_id, created_at);
alter table public.figsy_chat_messages enable row level security;

-- ════════════════════════════════════════════════════════════════════════════
-- FIGSY APPROVAL QUEUE (human-in-loop)
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.figsy_approval_queue (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  campaign_id  uuid not null references public.figsy_campaigns(id) on delete cascade,
  lead_id      uuid not null references public.leads(id) on delete cascade,
  sequence_step integer not null default 1,
  to_email     text not null,
  subject      text not null,
  body         text not null,
  status       text not null default 'pending' check (status in ('pending','approved','rejected','sent','expired')),
  expires_at   timestamptz not null default (now() + interval '48 hours'),
  sent_at      timestamptz,
  created_at   timestamptz default now()
);

create index if not exists idx_approval_client on public.figsy_approval_queue(client_id);
create index if not exists idx_approval_status on public.figsy_approval_queue(status);

-- ════════════════════════════════════════════════════════════════════════════
-- FIGSY LINKEDIN QUEUE
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.figsy_linkedin_queue (
  id                     uuid primary key default gen_random_uuid(),
  client_id              uuid not null references public.clients(id) on delete cascade,
  campaign_id            uuid references public.figsy_campaigns(id) on delete cascade,
  lead_id                uuid not null references public.leads(id) on delete cascade,
  linkedin_url           text not null,
  connection_note        text not null,
  status                 text not null default 'pending' check (status in ('pending','approved','sent','failed','skipped')),
  phantombuster_launch_id text,
  sent_at                timestamptz,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

create index if not exists idx_li_queue_client on public.figsy_linkedin_queue(client_id);
create index if not exists idx_li_queue_status on public.figsy_linkedin_queue(status);

-- ════════════════════════════════════════════════════════════════════════════
-- PUSH SUBSCRIPTIONS
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.push_subscriptions (
  id         uuid primary key default uuid_generate_v4(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now(),
  unique(endpoint)
);

create index if not exists push_subscriptions_client_idx on public.push_subscriptions(client_id);
alter table public.push_subscriptions enable row level security;

-- ════════════════════════════════════════════════════════════════════════════
-- OUTCOME EVENTS
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.outcome_events (
  id            uuid primary key default uuid_generate_v4(),
  client_id     uuid references public.clients(id) on delete cascade,
  campaign_id   uuid,
  lead_id       uuid,
  enrollment_id uuid,
  event_type    text not null,
  channel       text,
  payload       jsonb not null default '{}'::jsonb,
  occurred_at   timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index if not exists outcome_events_client_type_idx on public.outcome_events(client_id, event_type, occurred_at);
create index if not exists outcome_events_campaign_idx    on public.outcome_events(campaign_id);
create index if not exists outcome_events_lead_idx        on public.outcome_events(lead_id);
alter table public.outcome_events enable row level security;

-- ════════════════════════════════════════════════════════════════════════════
-- DENISE DRAFTS
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.denise_drafts (
  id         uuid        primary key default gen_random_uuid(),
  client_id  uuid        not null references public.clients(id) on delete cascade,
  kind       text        not null check (kind in ('follow_up','proposal')),
  input      jsonb       not null default '{}'::jsonb,
  output     text        not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_denise_drafts_client_id  on public.denise_drafts(client_id);
create index if not exists idx_denise_drafts_created_at on public.denise_drafts(created_at desc);
alter table public.denise_drafts enable row level security;

drop policy if exists denise_drafts_client_read  on public.denise_drafts;
drop policy if exists denise_drafts_service_all  on public.denise_drafts;
create policy denise_drafts_client_read on public.denise_drafts for select using (client_id in (select id from public.clients where user_id = auth.uid()));
create policy denise_drafts_service_all on public.denise_drafts for all to service_role using (true) with check (true);

-- ════════════════════════════════════════════════════════════════════════════
-- END OF SCHEMA
-- ════════════════════════════════════════════════════════════════════════════
-- All tables created. Run staging-seed.sql next to populate test data.
