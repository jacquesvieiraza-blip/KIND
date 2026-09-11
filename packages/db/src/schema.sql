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
  unique(user_id),
  -- ⚑ 10 Sep (C07) — the Proof calibration hand-off. Migration:
  -- 20260910_proof_calibration_handoff.
  proof_escalation_trigger text,
  proof_phone_confirmed_at timestamptz,
  proof_calibration_note text,
  proof_calibrated_restart_at timestamptz,
  -- ⚑ 10 Sep (C03) — what the client said they want, stated once. Client-level: it
  -- survives ICP revisions and predates any programme. NOT meeting_target.
  -- Migration: 20260910_client_stated_outcome.
  outcome_kind text,
  outcome_stated text
);

-- ─────────────────────────────────────────────
-- SUBSCRIPTIONS
-- ─────────────────────────────────────────────
create table if not exists public.subscriptions (
  id                        uuid primary key default uuid_generate_v4(),
  client_id                 uuid not null references public.clients(id) on delete cascade,
  product                   text not null check (product in ('lead_gen','lead_gen_figsy','figsy_addon','virtual_assistant','chatbot','denise','denise_addon')),
  tier                      text not null check (tier in ('starter','advanced','pro','enterprise')),
  status                    text not null default 'trialing'
                              check (status in ('active','inactive','trialing','past_due','cancelled','paused')),
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
  -- Item 190 — graceful pause (1–3 mo hold instead of cancel). See migration
  -- 20260622_subscription_pause.sql. NOT YET APPLIED to the live DB.
  paused_at                 timestamptz,
  paused_until              timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists subscriptions_client_id_idx on public.subscriptions(client_id);
create unique index if not exists subscriptions_client_product_idx on public.subscriptions(client_id, product);

-- ─────────────────────────────────────────────
-- IDEAL CUSTOMER PROFILES (ICPs)
-- ─────────────────────────────────────────────
create table if not exists public.icps (
  id                uuid primary key default uuid_generate_v4(),
  client_id         uuid not null references public.clients(id) on delete cascade,
  name              text not null,
  -- MVP1 (C04/C21) — the client's own words for the target market, and the target's
  -- organisational form. TWO facts, founder-locked: one utterance may supply both, but a
  -- client who said only "digital marketing" has the category and not the type. `industries`
  -- below stays the CLOSED sixteen-value provider-edge hint and is never their words.
  target_category     text,
  target_company_type text,
  industries        text[] not null default '{}',
  job_titles        text[] not null default '{}',
  seniority_levels  text[] not null default '{}',
  company_sizes     text[] not null default '{}',
  geographies       text[] not null default '{}',
  tech_stack        text[] not null default '{}',
  keywords          text[] not null default '{}',
  apollo_only_consented boolean not null default true,
  is_active         boolean not null default true,
  last_run_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists icps_client_id_idx on public.icps(client_id);

-- ─────────────────────────────────────────────
-- MVP1 — THE BRIEF BEFORE THERE IS A CLIENT (Preview 07)
--
-- Signup creates an auth user; the clients row is created by the CONFIRM click. This is where
-- the partial Brief lives in between, so a closed tab does not destroy it and so Vida can see
-- "signed up 14 minutes ago, 10 of 11 facts, confirmation pending" at all.
--
-- NOT a second Brief model: the eleven facts are defined once, in
-- packages/shared/src/brief-facts.ts, and every reader counts through that. Authoritative and
-- writable until promotion; evidence only afterwards.
-- ─────────────────────────────────────────────
create table if not exists public.onboarding_brief_drafts (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null unique references auth.users(id) on delete cascade,
  facts              jsonb not null default '{}'::jsonb,
  conversation       jsonb,
  -- Confirmation is a SEPARATE gate and is never one of the eleven facts.
  confirmed_at       timestamptz,
  promoted_client_id uuid references public.clients(id) on delete set null,
  promoted_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists onboarding_brief_drafts_open_idx
  on public.onboarding_brief_drafts(created_at desc)
  where promoted_client_id is null;

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
  -- ⚠️ THE NAME IS A LIE, AND THIS IS THE COLUMN'S ONE HOME FOR SAYING SO.
  -- apollo_consented = provider-VERIFIED email, treated as a legitimate-interest contact.
  -- It is NOT a consent record. Naming predates the pivot; do not build consent logic on
  -- this flag. Recorded consent lives on `status` ('consent_given') + `consent_given_at`
  -- + `consent_token` a few lines below — those are the evidence, this is not.
  -- Renaming the column is the real fix and is deliberately NOT done in launch week.
  apollo_consented  boolean not null default false,
  -- ── 9 Sep · THE PROVIDER'S VERIFICATION STATUS (20260909_programme_qualification) ───────
  -- NOT apollo_consented. That flag is true for BOTH 'verified' and 'likely_to_engage' and is
  -- written unconditionally by the drip path, so it cannot prove the VERIFIED business address
  -- House's ICP requires. `finalVerdict` needs this fact; without a column to hold it, every
  -- candidate would need a paid reveal on every pass because the answer had nowhere to live.
  email_status      text,
  -- ── 9 Sep · THE M&V QUALIFICATION VERDICT (20260909_programme_qualification) ────────────
  -- Programme entitlement is consumed by QUALIFIED prospects, never by `delivered_at` — which
  -- is the legacy self-serve visibility stamp, capped at a constant 25 per run and ~5/day, and
  -- would have settled a 250-candidate batch at 25 used. Exactly one of these two is ever set;
  -- both NULL means CANDIDATE (sourced, not yet judged). A disqualified candidate consumes
  -- nothing, is never surfaced, never enrolled, and is never revealed again.
  qualified_at      timestamptz,
  disqualified_at   timestamptz,
  disqualify_reason text,
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
  updated_at        timestamptz not null default now(),
  -- ⚑ 10 Sep — why this candidate was never shown: one of the four hard criteria
  -- (geography, size, industry, seniority) in plain words, written by the deterministic
  -- structural gate in proof-fit.ts. NULL = never set aside. Migration:
  -- 20260910_lead_set_aside_reason.
  set_aside_reason text
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
-- AGREEMENT TEMPLATES (admin uploads once — 5 PDFs)
-- ─────────────────────────────────────────────
create table if not exists public.agreement_templates (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,          -- e.g. "Master Services Agreement"
  description text,
  file_path   text not null,          -- Supabase storage path
  file_url    text not null,          -- public URL
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- ORDER FORMS (one per client, created by admin)
-- ─────────────────────────────────────────────
create table if not exists public.order_forms (
  id                  uuid primary key default uuid_generate_v4(),
  client_id           uuid not null references public.clients(id) on delete cascade,
  products            jsonb not null default '[]',
  -- e.g. [{"product":"lead_gen","tier":"starter","price_usd":500,"billing_interval":"monthly"}]
  total_monthly_usd   integer not null default 0,
  start_date          date,
  scope_notes         text,
  status              text not null default 'draft'
                        check (status in ('draft','sent','signed','cancelled')),
  sent_at             timestamptz,
  signed_at           timestamptz,
  signed_by           text,           -- full name typed by client
  signed_ip           text,
  created_by_email    text,           -- admin who created it
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique(client_id)                   -- one active order form per client
);

create index if not exists order_forms_client_id_idx on public.order_forms(client_id);
create index if not exists order_forms_status_idx    on public.order_forms(status);

-- ─────────────────────────────────────────────
-- PROVIDER-EVICTION BLOCKER  (BUILD-003 item 6, 29 Aug)
-- ─────────────────────────────────────────────
-- A person suppressed AFTER they were already pushed into a provider that sends from its own
-- copy of the lead. Our send gate cannot reach them; only a human, in the provider's own
-- dashboard, can. Raised automatically at suppression and cleared only on a NAMED
-- confirmation. ⚠️ A raised blocker means delivery may STILL be happening — it records the
-- risk, it does not close it.
alter table public.leads add column if not exists provider_eviction_required_at timestamptz;
alter table public.leads add column if not exists provider_eviction_provider text;
alter table public.leads add column if not exists provider_eviction_reason text;
alter table public.leads add column if not exists provider_evicted_at timestamptz;
alter table public.leads add column if not exists provider_evicted_by text;

create index if not exists leads_provider_eviction_pending_idx
  on public.leads (provider_eviction_required_at)
  where provider_eviction_required_at is not null and provider_evicted_at is null;

-- ─────────────────────────────────────────────
-- MEETINGS  (BUILD-003, 29 Aug)
-- ─────────────────────────────────────────────
-- The SOLE source of meeting state and count truth. Replaces
-- `figsy_replies.meeting_booked_at` — a nullable timestamp on a REPLY row that six call sites
-- each re-counted, and which could not tell HELD from NO_SHOW, exclude a duplicate, or record
-- a failed calendar write. MEETING_BOOKED is the hard product-outcome boundary (P v1 r21).
--
-- ⚠️ CANONICAL TRUTH FOR EXECUTION IS supabase/migrations/20260829_meetings.sql, which also
-- carries the erasure trigger on public.leads. This snapshot reflects the TABLE, as the
-- accepted file map requires — it is not a second place to change the schema.

create table if not exists public.meetings (
  id                   uuid primary key default gen_random_uuid(),
  -- RESTRICT: a client with meeting history is not deleted out from under the outcome record.
  client_id            uuid not null references public.clients(id) on delete restrict,
  -- The prospect by REFERENCE ONLY — no name, email or phone is stored here, so erasing the
  -- lead leaves no second copy of the person behind.
  lead_id              uuid references public.leads(id)             on delete set null,
  campaign_id          uuid references public.figsy_campaigns(id)   on delete set null,
  enrollment_id        uuid references public.figsy_enrollments(id) on delete set null,
  programme_id         uuid references public.programmes(id)        on delete set null,
  state                text not null
                         check (state in ('BOOKED', 'BOOKED_UNVERIFIED', 'HELD', 'NO_SHOW')),
  google_event_id      text,
  scheduled_at         timestamptz not null,
  booked_at            timestamptz not null default now(),
  verified_at          timestamptz,
  held_confirmed_at    timestamptz,
  no_show_confirmed_at timestamptz,
  confirmed_by         text,
  rescheduled_from     uuid references public.meetings(id) on delete set null,
  superseded_by        uuid references public.meetings(id) on delete set null,
  excluded_reason      text check (excluded_reason in ('duplicate', 'spam', 'outside_icp')),
  excluded_at          timestamptz,
  excluded_note        text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  -- HELD and NO_SHOW are never inferred from the clock — a meeting whose time has passed is
  -- not evidence that anyone attended it.
  constraint meetings_held_requires_confirmation
    check (state <> 'HELD' or held_confirmed_at is not null),
  constraint meetings_no_show_requires_confirmation
    check (state <> 'NO_SHOW' or no_show_confirmed_at is not null),
  constraint meetings_held_stamp_matches_state
    check (held_confirmed_at is null or state = 'HELD'),
  constraint meetings_no_show_stamp_matches_state
    check (no_show_confirmed_at is null or state = 'NO_SHOW'),
  constraint meetings_not_both_outcomes
    check (held_confirmed_at is null or no_show_confirmed_at is null),
  -- BOOKED requires verified_at and NOT google_event_id: erasure clears the event pointer
  -- while the booking stays verified, because that a booking WAS verified is historical
  -- outcome evidence.
  constraint meetings_booked_requires_verification
    check (state <> 'BOOKED' or verified_at is not null),
  constraint meetings_unverified_carries_no_proof
    check (state <> 'BOOKED_UNVERIFIED' or verified_at is null),
  -- No orphan event pointer. A google_event_id resolves inside Google to an invitee's
  -- address, so an event id with no lead points back at a person this row must not identify.
  -- This also backstops the erasure trigger: lead_id is ON DELETE SET NULL, so if that
  -- trigger is dropped, deleting a lead fails HERE rather than leaving the pointer behind.
  constraint meetings_no_orphan_event_pointer
    check (google_event_id is null or lead_id is not null),
  constraint meetings_exclusion_is_complete
    check ((excluded_reason is null) = (excluded_at is null)),
  constraint meetings_not_rescheduled_from_self
    check (rescheduled_from is null or rescheduled_from <> id)
);

create unique index if not exists meetings_google_event_id_key
  on public.meetings (google_event_id) where google_event_id is not null;

-- One live booking per lead, enforced by the DATABASE: two replies arriving at once would
-- otherwise each read "no meeting yet" and each insert one, inflating the single number the
-- commercial model is judged on.
create unique index if not exists meetings_one_live_booking_per_lead
  on public.meetings (lead_id)
  where lead_id is not null
    and state in ('BOOKED', 'BOOKED_UNVERIFIED')
    and superseded_by is null
    and excluded_reason is null;

create index if not exists meetings_client_idx    on public.meetings (client_id, scheduled_at desc);
create index if not exists meetings_programme_idx on public.meetings (programme_id) where programme_id is not null;
create index if not exists meetings_lead_idx      on public.meetings (lead_id) where lead_id is not null;
create index if not exists meetings_state_idx     on public.meetings (client_id, state);

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
alter table public.usage_metrics         enable row level security;
alter table public.agreement_templates   enable row level security;
alter table public.order_forms           enable row level security;
-- ⚠️ meetings gets NO policy, deliberately: RLS on with no policy IS the deny for
-- `authenticated`, and the service role bypasses it. Meeting truth reaches a client through
-- the API, which applies the counting rules (exclusions, supersessions, the four states),
-- rather than handing a browser raw rows it would have to interpret — which is precisely how
-- six call sites each grew their own definition of "does this count".
alter table public.meetings              enable row level security;

-- Helper: resolve current user's client id
create or replace function public.current_client_id()
returns uuid language sql stable as $$
  select id from public.clients where user_id = auth.uid() limit 1;
$$;

-- Policies (drop first so re-runs are safe)
drop policy if exists "clients_own"           on public.clients;
drop policy if exists "subscriptions_own"     on public.subscriptions;
drop policy if exists "icps_own"              on public.icps;
drop policy if exists "leads_own"             on public.leads;
drop policy if exists "blocklist_read"        on public.opt_out_blocklist;
drop policy if exists "blocklist_write"       on public.opt_out_blocklist;
drop policy if exists "assistant_messages_own" on public.assistant_messages;
drop policy if exists "chatbot_configs_own"   on public.chatbot_configs;
drop policy if exists "usage_metrics_own"     on public.usage_metrics;
drop policy if exists "agreement_templates_read" on public.agreement_templates;
drop policy if exists "order_forms_own"       on public.order_forms;
drop policy if exists "order_forms_sign"      on public.order_forms;

create policy "clients_own" on public.clients
  for all using (auth.uid() = user_id);

create policy "subscriptions_own" on public.subscriptions
  for all using (client_id = public.current_client_id());

create policy "icps_own" on public.icps
  for all using (client_id = public.current_client_id());

create policy "leads_own" on public.leads
  for all using (client_id = public.current_client_id());

create policy "blocklist_read" on public.opt_out_blocklist
  for select using (auth.role() = 'authenticated');
create policy "blocklist_write" on public.opt_out_blocklist
  for insert with check (auth.role() = 'authenticated');

create policy "assistant_messages_own" on public.assistant_messages
  for all using (client_id = public.current_client_id());

create policy "chatbot_configs_own" on public.chatbot_configs
  for all using (client_id = public.current_client_id());

create policy "usage_metrics_own" on public.usage_metrics
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

create or replace trigger order_forms_updated_at
  before update on public.order_forms
  for each row execute function public.set_updated_at();

create policy "agreement_templates_read" on public.agreement_templates
  for select using (auth.role() = 'authenticated');

create policy "order_forms_own" on public.order_forms
  for select using (client_id = public.current_client_id());
create policy "order_forms_sign" on public.order_forms
  for update using (client_id = public.current_client_id());

-- Supabase Storage: create bucket 'agreement-templates' (run separately in Storage tab)
-- Bucket should be: private, max file size 10MB, allowed types: application/pdf

-- ═══════════════════════════════════════════════════════════════════════════════
-- RECONCILIATION — columns added by later migrations (#558, 30 Jul 2026)
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- WHY THIS BLOCK EXISTS. The four tables above were written in May and never updated,
-- while 126 migration files went on adding columns to them. The gap is not cosmetic:
-- this file did not declare `clients.wallet_balance_usd`, `clients.is_demo`,
-- `leads.delivered_at` or `leads.revealed_at` — the money column, the demo flag and
-- the two timestamps the entire approve → surface → charge loop turns on. Anyone who
-- ran this file to stand up a database got one the product could not use.
--
-- HOW IT WAS BUILT. Derived, not remembered: every column below is one the repo's own
-- migrations add and this file did not declare, and each carries the migration it came
-- from. `apps/api/src/lib/schema-drift.ts` re-derives the set; `schema-drift.test.ts`
-- fails the gate if this file falls behind the migrations again.
--
-- ⚠️ WHAT THIS DOES NOT CLAIM. It does not say production HAS these columns — the
-- Supabase dashboard is unreachable and DATABASE_URL is mangled, so nothing here was
-- checked against the live database. It says the REPO now agrees with itself. The
-- queries that would settle the rest are in docs/SCHEMA-DRIFT.md, ready to paste into
-- Vida → Engine.
--
-- Idempotent and non-destructive: ADD COLUMN IF NOT EXISTS only. Nothing is dropped.


-- ── CLIENTS ──────────────────────────────────────────────────────────────
alter table public.clients
  add column if not exists auto_topup_bundle_size           integer,
  add column if not exists auto_topup_enabled               boolean NOT NULL DEFAULT false,
  add column if not exists auto_topup_paystack_auth         text,
  add column if not exists auto_topup_plan                  text,  -- CHECK constraint lives in 20260525_add_missing_clients_columns.sql
  add column if not exists auto_topup_threshold             integer NOT NULL DEFAULT 0,
  add column if not exists autonomy                         text default 'auto',  -- CHECK constraint lives in 20260612_company_engine.sql
  add column if not exists booking_url                      text,
  add column if not exists calendar_booking_enabled         boolean NOT NULL DEFAULT false,
  add column if not exists company_id                       uuid,  -- FK to public.companies omitted: that table is not declared in this file
  add column if not exists company_registration             TEXT,
  add column if not exists contact_email                    text,
  add column if not exists contact_name                     text,
  add column if not exists credit_balance                   integer NOT NULL DEFAULT 0,
  add column if not exists crm_api_key                      text,
  add column if not exists crm_dedup_enabled                boolean not null default false,
  add column if not exists crm_sync_enabled                 boolean not null default false,
  add column if not exists crm_type                         text,  -- CHECK constraint lives in 003_crm_integration.sql
  add column if not exists daily_brief_enabled              BOOLEAN DEFAULT TRUE,
  add column if not exists daily_drip_rate                  INTEGER DEFAULT 5,
  add column if not exists demo_created_by                  TEXT,
  add column if not exists demo_expires_at                  TIMESTAMPTZ,
  add column if not exists demo_prospect_name               TEXT,
  add column if not exists enabled_agents                   text[] not null default array['figsy']::text[],
  add column if not exists figsy_credits_remaining          integer NOT NULL DEFAULT 0,
  add column if not exists first_icp_run_at                 timestamptz,
  add column if not exists google_calendar_access_token     text,
  add column if not exists google_calendar_email            text,
  add column if not exists google_calendar_refresh_token    text,
  add column if not exists google_calendar_token_expiry     timestamptz,
  add column if not exists invite_token                     text,
  add column if not exists invited_email                    text,
  add column if not exists is_demo                          BOOLEAN DEFAULT FALSE,
  add column if not exists last_low_credit_email_at         timestamptz,
  add column if not exists last_seen_at                     timestamptz,
  add column if not exists leads_per_run                    integer,
  add column if not exists low_credit_warned_at             timestamptz,
  add column if not exists milla_understanding_confirmed_at timestamptz,
  add column if not exists nexus_autotune_enabled           boolean not null default false,
  add column if not exists onboarding_completed             text[] DEFAULT '{}',
  add column if not exists onboarding_completed_at          timestamptz,
  add column if not exists onboarding_started_at            timestamptz,
  add column if not exists onboarding_status                text DEFAULT 'not_started',
  add column if not exists onboarding_step                  text,
  add column if not exists onboarding_version               int NOT NULL DEFAULT 1,
  add column if not exists plan                             text NOT NULL DEFAULT 'lead_gen',  -- CHECK constraint lives in 20260616_billing_correctness.sql
  -- ⚑ 3 Sep (PR C1) — which COMMERCIAL MODEL governs this client. NULLABLE with NO DEFAULT and
  -- no backfill: NULL means unclassified and resolves to the behaviour the product had before
  -- the column existed. Values are 'programme' or 'legacy'; the CHECK lives in
  -- 20260903_client_commercial_model.sql. NOT the same question as `plan` above, which selects
  -- a WALLET POOL (lead_gen | figsy) and is read by normalizePlan, canEnroll and
  -- deliveryCapBalance.
  add column if not exists commercial_model                 text,
  add column if not exists referral_bonus_paid_at           timestamptz,
  -- BUILD-004A-2D (31 Aug) — mirrors 20260831_notification_prefs_and_referral_handoff.
  -- NULLABLE WITH NO DEFAULT, unlike daily_brief_enabled above: null means "never chose",
  -- which the send paths read as "keep doing what we do today". A DEFAULT here would stamp
  -- every historic row with a preference nobody made (#599).
  add column if not exists campaign_paused_emails_enabled   boolean,
  add column if not exists weekly_digest_enabled            boolean,
  -- The automatic $45 referral bonus is retired (D2); referrals are handled by a human. This
  -- marks that one was RAISED, and is deliberately NOT referral_bonus_paid_at, which the
  -- refund claw-back reads to reverse money that was actually paid.
  add column if not exists referral_handoff_at              timestamptz,
  add column if not exists referred_by                      uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  add column if not exists seat_accepted_at                 timestamptz,
  add column if not exists seat_active                      boolean not null default true,
  add column if not exists seat_budget                      integer not null default 0,
  add column if not exists seat_role                        text default 'owner',  -- CHECK constraint lives in 20260612_company_engine.sql
  add column if not exists share_token                      TEXT,  -- DEFAULT expression lives in 20260530_client_share_token.sql
  add column if not exists signer_name                      text,
  add column if not exists signup_terms_accepted_at         timestamptz,
  add column if not exists signup_terms_accepted_ip         text,
  add column if not exists sourcing_allowance               int NOT NULL DEFAULT 0,
  add column if not exists proof_passes_done                int NOT NULL DEFAULT 0,
  add column if not exists proof_records_committed          int NOT NULL DEFAULT 0,
  add column if not exists proof_started_at                 timestamptz,  -- set by try_claim_proof_pass in the SAME update as proof_passes_done; NULL = unknown, never backfilled
  -- 🛑 10 Sep — THE CLIENT SAID THE EXAMPLES ARE RIGHT, so Proof is finished and the calculator
  -- is next. Before this column the accept control wrote nothing: a satisfied client produced no
  -- record and no stage change. Client-level because Proof completes BEFORE any programme exists.
  add column if not exists proof_completed_at               timestamptz,  -- 20260910_proof_completion; first acceptance wins, never backfilled
  add column if not exists proof_review_requested_at        timestamptz,  -- set ONLY when a prospect who has used both passes asks for another (20260827_proof_review_handoff)
  add column if not exists proof_review_resolved_at         timestamptz,  -- stamped by an operator in Vida; non-null clears it from the unresolved feed
  add column if not exists proof_review_icp_id              uuid,         -- which ICP they were looking at when they asked — a pointer, not the identity of the review
  add column if not exists terms_accepted_at                timestamptz,
  add column if not exists terms_accepted_ip                text,
  add column if not exists trial_sourcing_granted           int NOT NULL DEFAULT 0,
  add column if not exists vat_number                       TEXT,
  add column if not exists wallet_balance_usd               numeric NOT NULL DEFAULT 0;
-- sources: 003_crm_integration.sql, 010_crm_dedup.sql, 012_signer_and_booking.sql, 20260513_referral_credits.sql, 20260514_terms_acceptance.sql, 20260518_company_registration.sql, 20260518_demo_environments.sql, 20260525_add_missing_clients_columns.sql, 20260526_drip_and_controls.sql, 20260530_client_share_token.sql, 20260603_schema_reconcile.sql, 20260611_daily_brief_pref.sql, 20260612_company_engine.sql, 20260616_billing_correctness.sql, 20260617_signup_terms.sql, 20260707_money_integrity.sql, 20260711_sourcing_fences.sql, 20260714_onboarding_state.sql, 20260724_nexus_autotune_flag.sql, 20260724_one_wallet.sql, 20260726_client_contact_name.sql, 20260822_free_proof_acquisition.sql, 20260826_proof_started_at.sql

-- ── SUBSCRIPTIONS ──────────────────────────────────────────────────────────────
alter table public.subscriptions
  add column if not exists stripe_subscription_id           text,
  add column if not exists trial_expiry_notified_at         timestamptz;
-- sources: 20260527_stripe_subscription_id.sql, 20260710_trial_expiry_once.sql

-- ── ICPS ──────────────────────────────────────────────────────────────
alter table public.icps
  add column if not exists intent_signals                   jsonb not null default '[]'::jsonb,
  add column if not exists organization_names               text[] DEFAULT '{}',
  add column if not exists pdl_exhausted_at                 timestamptz,
  add column if not exists pdl_scroll_query                 text,
  add column if not exists pdl_scroll_token                 text,
  add column if not exists pending_campaign_intent          text,
  add column if not exists pending_submitted_at             timestamptz,
  add column if not exists pending_targeting                jsonb,
  add column if not exists proof_widened_candidate          jsonb,
  add column if not exists settings                         jsonb;
-- sources: 20260527_icp_abm_organization_names.sql, 20260601_social_signals.sql, 20260603_schema_reconcile.sql, 20260727_pdl_cursor.sql, 20260825_proof_widened_candidate.sql

-- ── LEADS ──────────────────────────────────────────────────────────────
alter table public.leads
  add column if not exists approval_expires_at              timestamptz,
  add column if not exists consent_auto_fired               boolean default false,
  add column if not exists consent_token                    TEXT,
  add column if not exists crm_existing                     boolean not null default false,
  add column if not exists crm_match_reason                 text,
  add column if not exists delivered_at                     TIMESTAMPTZ DEFAULT NULL,
  add column if not exists job_changed_at                   timestamptz,
  add column if not exists passed_at                        timestamptz,
  add column if not exists previous_company                 text,
  add column if not exists research_summary                 jsonb,
  add column if not exists revealed_at                      timestamptz,
  add column if not exists smartlead_campaign_id            text,
  add column if not exists source                           text,
  add column if not exists surfaced_for_approval_at         timestamptz;
-- sources: 010_crm_dedup.sql, 20260526_drip_and_controls.sql, 20260530_consent_token.sql, 20260531_auto_consent.sql, 20260531_lead_research.sql, 20260611_lead_job_change.sql, 20260709_reveal_charge.sql, 20260723_money_retime.sql, 20260723_operator_audit_log.sql, 20260806_leads_source.sql, 20260820_smartlead_campaign_membership.sql

-- ── acquisition_memory — company memory of every PAID provider identity (R67) ──
-- Retention is NOT contactability: nothing in the send/consent/reveal/scoring path
-- reads this table. Keyed on (source, provider_id) so EMAILLESS paid records are
-- retained — lead_pool cannot hold them, its email_norm is the PRIMARY KEY.
-- ON CONFLICT DO NOTHING on that key means acquisition cost is written once, never
-- double-counted on reuse or dedupe.
-- ── acquisition_memory — every identity K.I.N.D PAID a provider to acquire ──────
--
-- WHY THIS IS NOT lead_pool. `lead_pool.email_norm` is the PRIMARY KEY, so a paid
-- record with no email cannot be stored there at all — not a policy choice, a schema
-- impossibility. And the pool write in `runIcpJob` sits BELOW every client gate: a
-- record dropped for this client's budget cap, this client's duplicate, a DNC hit or
-- an opt-out hit was paid for and then forgotten, so the next run buys the same person
-- again. This table is the company's memory; `lead_pool` stays the CONTACTABLE
-- inventory. Founder rule (R67, 25 Aug): RETENTION IS NOT CONTACTABILITY.
--
-- ⚠️ THIS TABLE NEVER MAKES ANYONE CONTACTABLE. Nothing in the send, consent, reveal
-- or scoring path reads it. `contactable` is stored as a FACT ABOUT THE RECORD, never
-- as permission: suppression, opt-out and DNC always win, and a row here exists so we
-- remember we have already seen and paid for a person we must not contact.
--
-- ⚠️ COST IS WRITTEN ONCE. The unique key is (source, provider_id) and every write is
-- ON CONFLICT DO NOTHING, so a person re-encountered on a later run — for this client
-- or any other — never rewrites acquisition_cost_usd and never double-counts it.
--
-- ⚠️ REMEMBERING SOMEONE DOES NOT STOP A PROVIDER BILLING FOR THEM AGAIN. `buildPdlBody`
-- emits `bool.must` only — zero `must_not` — so PDL decides what to return before we
-- see it. Provider-id exclusion is OPEN RESEARCH, not something this table delivers.

CREATE TABLE IF NOT EXISTS public.acquisition_memory (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Provenance: who we bought it from, and their stable id for the person. This pair
  -- is the identity key precisely so an EMAILLESS record still has one.
  source               text        NOT NULL,
  provider_id          text        NOT NULL,

  -- What we paid, once, the first time we ever saw this identity.
  acquisition_cost_usd numeric     NOT NULL DEFAULT 0,
  acquired_at          timestamptz NOT NULL DEFAULT now(),

  -- Minimum useful identity for recognition and dedupe. Email is NULLABLE by design:
  -- a relevant person with no email is still proof of targeting fit and still cost money.
  email_norm           text,
  first_name           text,
  last_name            text,
  title                text,
  seniority            text,
  company              text,
  industry             text,
  company_size         text,
  country              text,
  linkedin_url         text,

  -- Contactability recorded SEPARATELY from retention, and never read as permission.
  -- false = we know we must not contact this person; the row still exists so we do not
  -- treat them as unknown and re-buy them.
  contactable          boolean     NOT NULL DEFAULT true,
  -- Why they are not contactable, when we know: 'suppressed' | 'opt_out' | 'dnc' | NULL.
  suppression_reason   text,

  -- Which run first paid for them. NOT ownership — this table is company-wide, and a
  -- client rejecting a record must never destroy the company's asset.
  first_seen_client_id uuid,

  notes                text
);

-- The identity key. Emailless records get one because it is (source, provider_id).
CREATE UNIQUE INDEX IF NOT EXISTS acquisition_memory_provider_key
  ON public.acquisition_memory (source, provider_id);

-- Recognise a person we already own by email, when they have one.
CREATE INDEX IF NOT EXISTS acquisition_memory_email_idx
  ON public.acquisition_memory (email_norm) WHERE email_norm IS NOT NULL;

CREATE INDEX IF NOT EXISTS acquisition_memory_acquired_idx
  ON public.acquisition_memory (acquired_at DESC);

COMMENT ON TABLE public.acquisition_memory IS
  'Company acquisition memory: every identity K.I.N.D paid a provider to acquire, retained BEFORE any client-specific gate can discard it (founder rule R67, 25 Aug). RETENTION IS NOT CONTACTABILITY — nothing in the send, consent, reveal or scoring path reads this table, and a row here never makes anyone contactable. Suppression, opt-out and DNC always override serving and contact. Identity key is (source, provider_id) so emailless paid records are retained; every write is ON CONFLICT DO NOTHING so acquisition_cost_usd is written once and never double-counted on reuse or dedupe. Client rejection does not delete rows here. OPEN: remembering an identity does NOT prove a provider will not bill for it again — provider-id exclusion is unresolved research, and retention period, privacy-policy wording and DSR treatment for retained suppressed identities are all still open.';

COMMENT ON COLUMN public.acquisition_memory.contactable IS
  'A FACT ABOUT THE RECORD, NEVER A PERMISSION. false means we know this person must not be contacted; the row is kept so we remember we have already paid for them. Serving and sending decisions are made by the suppression list, the opt-out blocklist and the send path — never by this column.';

COMMENT ON COLUMN public.acquisition_memory.acquisition_cost_usd IS
  'What we paid the FIRST time this identity was acquired. Never rewritten: the unique index on (source, provider_id) plus ON CONFLICT DO NOTHING means a re-encounter is ignored, so reuse and dedupe cannot double-count acquisition cost.';

-- ⚠️ RLS ON, NO POLICIES — DENY BY DEFAULT. Caught by `schema-drift.test.ts` before this
-- ever shipped: a table exposed to PostgREST with RLS off is readable by anyone holding
-- the public anon key, and `apps/portal` ships that key to every browser. Nothing
-- client-facing reads this table — every legitimate caller is server-side on the service
-- role, which bypasses RLS — so the correct policy set is EMPTY. A policy added here
-- later is a decision to expose company acquisition memory to a browser.
ALTER TABLE IF EXISTS public.acquisition_memory ENABLE ROW LEVEL SECURITY;

-- ── icp_run_outcomes.status gains 'failed' (R72) — a crash is a terminal fact ──
-- ── icp_run_outcomes.status gains 'failed' — a crash is a TERMINAL FACT ─────────
--
-- WHY. `runIcpJob` records an outcome only when it FINISHES. A run that threw recorded
-- nothing at all, so the proof desk had no terminal row to read and sat on "Finding your
-- matches now…" forever. The five existing statuses cannot carry a crash: `no_match`
-- would tell a prospect their targeting matched nobody WHEN WE NEVER ASKED, and
-- `audience_exhausted` would claim they already hold everyone. Both are lies, and both
-- are the class of lie R72 forbids. So the state gets its own value.
--
-- ⚠️ `failed` IS NEVER DERIVED. `deriveRunStatus` cannot return it — it is written only
-- at the crash boundary, by the handler that caught the throw. A run that completes
-- honestly can never be labelled failed, and a run that crashed can never be labelled
-- anything else.
--
-- ⚠️ INTERNAL WORD, NOT A CUSTOMER-FACING ONE. The prospect is never shown "failed";
-- they see the approved recovery copy. This value exists so the SYSTEM can tell the
-- truth to itself.

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'icp_run_outcomes_status_check') then
    alter table public.icp_run_outcomes drop constraint icp_run_outcomes_status_check;
  end if;
end $$;

alter table public.icp_run_outcomes
  add constraint icp_run_outcomes_status_check
  check (status in ('served','no_match','quota_exhausted','demo','audience_exhausted','failed'));

comment on column public.icp_run_outcomes.status is
  'Terminal outcome of one ICP run. served = leads delivered. no_match = the query ran and matched nobody. audience_exhausted = the query ran and we already hold everyone in it. quota_exhausted = refused before it could run. demo = pool-only run. failed = THE RUN CRASHED — written only at the crash boundary, never derived, and never shown to a client as the word "failed" (they see the approved recovery copy). A crash must never be recorded as no_match: that would claim the targeting matched nobody when the query never completed.';

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- BUILD-002 · THE PROGRAMME COMMERCIAL + MONEY ENGINE (28 Aug 2026)
-- Canonical migration: supabase/migrations/20260828_programme_money_engine.sql
--
-- ⚠️ DECLARED HERE BECAUSE schema.sql MUST NOT FALL BEHIND ITS OWN MIGRATIONS. The drift
-- guard exists because a column that lives only in a migration is a column no reader of this
-- file knows about — and supabase-js returns { error } rather than throwing, so a query
-- against a column this file never declared renders exactly like an empty result.
--
-- ⚠️ NOT LIVE COMMERCIAL TRUTH. $299 pack · first 100 approvals included · $4 per approved
-- lead is what runs. These tables are inert until a programme row exists.
-- ═══════════════════════════════════════════════════════════════════════════════════════

create table if not exists public.programmes (
  id                        uuid primary key default gen_random_uuid(),
  client_id                 uuid not null references public.clients(id) on delete cascade,
  status                    text not null default 'DRAFT',
  meeting_target            int  not null,
  recommended_volume        int  not null,        -- meeting_target × 250 (R77)
  price_per_meeting_cents   int  not null,        -- from the R81 curve, stored at creation
  price_total_cents         int  not null,
  first_payment_cents       int  not null,        -- floor(total/2)
  second_payment_cents      int  not null,        -- total − first; the odd cent lands here
  first_payment_ref         text,                 -- Stripe session id = webhook idempotency key
  second_payment_ref        text,
  first_payment_intent_id   text,                 -- refunds/disputes key on the intent, not the session
  second_payment_intent_id  text,
  first_paid_at             timestamptz,
  second_paid_at            timestamptz,
  sourcing_ceiling          int  not null default 0,   -- set to recommended_volume by the first payment
  sourced_used              int  not null default 0,   -- provider actually delivered
  sourced_reserved          int  not null default 0,   -- granted, not yet delivered
  approved_at               timestamptz,
  -- ── 7 Sep · WHAT was approved, not just when (20260907_preparation_snapshot) ─────────
  -- `approved_at` records the moment and nothing about the work, so a sequence rewritten, a
  -- cadence retimed, a sender swapped or an enrolment set replaced afterwards carried the old
  -- consent forward in silence. These three hold the canonical preparation snapshot the
  -- customer actually approved and its sha256, so OUTREACH authority can compare the current
  -- preparation against it and refuse when they differ. NOT a version history: exactly one
  -- snapshot, replaced only by a re-approval. Written ONLY in the same conditional UPDATE as
  -- status = APPROVED, so nothing is ever stamped approved before an approval happens.
  approved_preparation_hash     text,
  approved_preparation_snapshot jsonb,
  approved_preparation_at       timestamptz,
  -- ── 8 Sep · the REVIEW freeze, and when outbound may leave (20260908_review_freeze_and_schedule)
  -- Freezing only at APPROVED proved what was approved and nothing about what was READ: work
  -- could change underneath a client mid-review and the approval would faithfully record the
  -- new state. The snapshot is therefore taken at the REVIEW boundary too, and approval copies
  -- the reviewed one rather than taking a fresh one.
  review_preparation_hash       text,
  review_preparation_snapshot   jsonb,
  review_preparation_at         timestamptz,
  -- When outbound may leave, in the RECIPIENT's OWN local time — a persisted zone, else a
  -- region, else the intersection of every zone their country spans, else REFUSED. There was no
  -- schedule anywhere in the send path before this, and the first fix judged every American in
  -- New York, which is 05:30 in Los Angeles. NULL = not configured = REFUSE for programme work.
  send_schedule                 jsonb,
  went_live_at              timestamptz,
  paused_at                 timestamptz,          -- pause is ORTHOGONAL to status, not a status
  pause_reason              text,                 -- client | quality | icp_change
  value_settled_at          timestamptz,          -- unused value never expires; a human settles it
  make_whole_cents          int  not null default 0,
  contribution_cents        int,                  -- NULL while live: never persist a provisional figure
  contribution_finalised_at timestamptz,
  disputed_at               timestamptz,
  -- ── BUILD-003 PR2 · the review hold (20260829_programme_delivery_control) ────────────
  -- REVIEW IS NOT PAUSE and is deliberately NOT a status: a programme under review must keep
  -- the state it returns to, exactly as `paused_at` is orthogonal rather than a status value.
  -- It holds the NEXT NEW BATCH only — in-flight sequences finish, replies and meetings keep
  -- ingesting. 250 leads per targeted meeting is a PLANNING BENCHMARK (R77), not a guarantee:
  -- these columns promise no meeting, no refund and no credit.
  review_required_at        timestamptz,
  review_reason             text,
  review_resolved_at        timestamptz,
  review_resolution         text,
  -- ── PR A1 · internal authority (20260902_programme_internal_authority) ───────────────
  -- House is Client Zero and walks the SAME lifecycle a paying client walks while paying
  -- nothing. Authority and PAYMENT are separate facts, and only payment is money:
  -- `computeContribution` reads `first_paid_at`/`second_paid_at` and nothing else, so a
  -- programme authorised through these columns produces £0 revenue and £0 commission.
  -- PER STAGE, not per programme — a House programme authorised internally at P1 may take a
  -- genuine payment at P2, and one programme-level column could not describe that row.
  -- Two DB CHECKs (`programmes_p1_authority_xor`, `programmes_p2_authority_xor`) enforce that
  -- a single stage never holds both a payment and internal authority.
  first_authorised_at       timestamptz,
  second_authorised_at      timestamptz,
  -- 🛑 10 Sep — RUN IS THE SECOND OPERATOR ACT, AND IT IS THE ONLY ONE THAT PERMITS DELIVERY.
  -- Make Live ARMS (status LIVE + `went_live_at`) and sends zero; Run STARTS. `run_at IS NULL`
  -- means no send path may select or deliver for this programme, however live it is — which is
  -- every existing row, deliberately un-backfilled. See 20260910_programme_run_authority.
  run_at                    timestamptz,
  run_by                    text,
  went_live_by              text,
  -- ⚑ 10 Sep — WHAT THE CLIENT CHOSE IN THE MILLA CALCULATOR, and that they agreed to it.
  -- The COMMITTED figures are the typed columns above (meeting_target, recommended_volume,
  -- price_total_cents, the two halves); these are the client's own ILLUSTRATIVE assumptions
  -- and the acceptance that is separate from paying. See 20260910_programme_calculator_choice.
  calculator_assumptions     jsonb,
  recommendation_accepted_at timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create table if not exists public.programme_batches (
  id             uuid primary key default gen_random_uuid(),
  programme_id   uuid not null references public.programmes(id) on delete cascade,
  seq            int  not null,
  requested      int  not null,
  granted        int  not null default 0,
  -- ⚑ 9 Sep — candidates this attempt actually OBTAINED. requested = authority asked for,
  -- granted = authority reserved, inserted = what the provider produced, delivered = what
  -- QUALIFIED and therefore consumed entitlement. `delivered` keeps its name until a
  -- post-launch rename; its meaning is USED.
  inserted       int,
  delivered      int,
  status         text not null default 'running',  -- running | served | released | stranded
  reservation_id uuid,
  created_at     timestamptz not null default now(),
  settled_at     timestamptz
);

alter table public.icps
  add column if not exists programme_id uuid;

-- ── BUILD-003 PR2 · attribution at its source (20260829_programme_delivery_control) ──────
-- Without these the PR-1 attribution columns on `figsy_enrollments` had nothing to read FROM:
-- `leads` recorded who we bought and never which programme or batch bought them. Resolving an
-- enrollment's programme from "whatever the client's programme is today" would silently
-- re-attribute a lead sourced under batch 1 to batch 7 — confidently wrong, which is worse
-- than null. Nullable and never backfilled: legacy leads belong to no programme, and a guessed
-- batch is worse than an honest absence.
alter table public.leads
  add column if not exists programme_id uuid,
  add column if not exists batch_id     uuid;

-- ── 3 Sep · WHICH MOTION MADE THIS ROW (20260903_lead_proof_attribution) ─────────────────
-- A free-proof lead and a retired legacy delivered lead were byte-identical: both carry
-- `delivered_at`, `surfaced_for_approval_at`, a null `programme_id` and a provider name in
-- `source`. So a declared programme client between programmes could not be told apart from a
-- new customer mid proof, and House rendered its retired desk as a current workspace. Every
-- other store was traced first — icp_run_outcomes, sourcing_ledger, proof_ledger,
-- acquisition_memory, the client proof counters — and none answers per row.
-- Nullable, no default, never backfilled: NULL means "not known to be proof work", which is
-- the honest reading of every row written before this column existed.
alter table public.leads
  add column if not exists proof_pass smallint;

-- ⚠️ `sourcing_ledger.programme_id`, `partner_commissions.programme_id` and
-- `partner_commissions.basis` are ADDED BY THE MIGRATION AND ARE DELIBERATELY NOT DECLARED
-- HERE. Neither table is declared in this file at all — they live in supabase/migrations —
-- and `schema-drift.test.ts` reads an ALTER as a declaration: naming them here would put
-- both tables in this file's scope and demand every one of their eighteen columns, which is
-- a schema-consolidation job, not part of BUILD-002. The migration is their home.

comment on table public.programmes is
  'BUILD-002 · the targeted booked-meeting programme (R74/R77/R78/R81). Money in integer cents. Pause is orthogonal to status. contribution_cents stays NULL until the programme is terminal AND its value is settled — a partner is never paid from a provisional figure.';
comment on table public.programme_batches is
  'Controlled ~250-lead execution batches. Authority is RESERVED at grant and converted to used only on delivery, so a provider returning zero cannot burn paid entitlement. status=stranded is the dead-letter queue for a release that itself failed.';
