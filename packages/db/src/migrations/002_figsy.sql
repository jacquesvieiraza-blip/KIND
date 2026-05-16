-- FIGSY Phase 1 — AI SDR tables
-- Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE.

-- ─────────────────────────────────────────────
-- FIGSY CAMPAIGNS
-- ─────────────────────────────────────────────
create table if not exists public.figsy_campaigns (
  id           uuid primary key default uuid_generate_v4(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  name         text not null,
  status       text not null default 'draft'
                 check (status in ('draft','active','paused','completed','archived')),
  -- targeting
  icp_id       uuid references public.icps(id),
  -- stats (denormalised for fast dashboard reads)
  leads_enrolled  integer not null default 0,
  emails_sent     integer not null default 0,
  replies_total   integer not null default 0,
  replies_interested integer not null default 0,
  opted_out       integer not null default 0,
  -- sequence template
  steps_count  integer not null default 3,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists figsy_campaigns_client_id_idx on public.figsy_campaigns(client_id);
create index if not exists figsy_campaigns_status_idx    on public.figsy_campaigns(status);

-- ─────────────────────────────────────────────
-- FIGSY SEQUENCE ENROLLMENTS
-- One row per lead per campaign — tracks where each lead is in the sequence
-- ─────────────────────────────────────────────
create table if not exists public.figsy_enrollments (
  id            uuid primary key default uuid_generate_v4(),
  campaign_id   uuid not null references public.figsy_campaigns(id) on delete cascade,
  lead_id       uuid not null references public.leads(id) on delete cascade,
  client_id     uuid not null references public.clients(id) on delete cascade,
  -- state
  status        text not null default 'enrolled'
                  check (status in ('enrolled','in_progress','replied','paused','opted_out','completed','bounced')),
  current_step  integer not null default 0,   -- 0 = not started, 1 = step 1 sent, etc.
  -- timestamps
  enrolled_at   timestamptz not null default now(),
  next_send_at  timestamptz,
  completed_at  timestamptz,
  -- AI-generated email drafts for each step (stored on enroll)
  step1_subject text,
  step1_body    text,
  step2_subject text,
  step2_body    text,
  step3_subject text,
  step3_body    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(campaign_id, lead_id)
);

create index if not exists figsy_enrollments_campaign_id_idx  on public.figsy_enrollments(campaign_id);
create index if not exists figsy_enrollments_lead_id_idx      on public.figsy_enrollments(lead_id);
create index if not exists figsy_enrollments_next_send_at_idx on public.figsy_enrollments(next_send_at);
create index if not exists figsy_enrollments_status_idx       on public.figsy_enrollments(status);

-- ─────────────────────────────────────────────
-- FIGSY SENT EMAILS
-- One row per email actually sent
-- ─────────────────────────────────────────────
create table if not exists public.figsy_sent_emails (
  id             uuid primary key default uuid_generate_v4(),
  enrollment_id  uuid not null references public.figsy_enrollments(id) on delete cascade,
  campaign_id    uuid not null references public.figsy_campaigns(id) on delete cascade,
  lead_id        uuid not null references public.leads(id) on delete cascade,
  step           integer not null,           -- 1, 2, or 3
  subject        text not null,
  body           text not null,
  resend_id      text,                       -- Resend message ID for tracking
  sent_at        timestamptz not null default now()
);

create index if not exists figsy_sent_emails_enrollment_id_idx on public.figsy_sent_emails(enrollment_id);
create index if not exists figsy_sent_emails_lead_id_idx       on public.figsy_sent_emails(lead_id);

-- ─────────────────────────────────────────────
-- FIGSY REPLIES
-- Inbound replies — classified by Claude
-- ─────────────────────────────────────────────
create table if not exists public.figsy_replies (
  id             uuid primary key default uuid_generate_v4(),
  enrollment_id  uuid references public.figsy_enrollments(id),
  campaign_id    uuid not null references public.figsy_campaigns(id) on delete cascade,
  lead_id        uuid not null references public.leads(id) on delete cascade,
  client_id      uuid not null references public.clients(id) on delete cascade,
  -- content
  from_email     text not null,
  subject        text,
  body           text not null,
  -- AI classification
  classification text check (classification in ('interested','not_interested','opt_out','out_of_office','other')),
  classification_reasoning text,
  -- metadata
  raw_payload    jsonb,
  received_at    timestamptz not null default now(),
  processed_at   timestamptz
);

create index if not exists figsy_replies_campaign_id_idx on public.figsy_replies(campaign_id);
create index if not exists figsy_replies_lead_id_idx     on public.figsy_replies(lead_id);

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────
alter table public.figsy_campaigns    enable row level security;
alter table public.figsy_enrollments  enable row level security;
alter table public.figsy_sent_emails  enable row level security;
alter table public.figsy_replies      enable row level security;

-- Clients can only see their own data
create policy "clients see own campaigns"
  on public.figsy_campaigns for all
  using (client_id = public.current_client_id());

create policy "clients see own enrollments"
  on public.figsy_enrollments for all
  using (client_id = public.current_client_id());

create policy "clients see own sent emails"
  on public.figsy_sent_emails for all
  using (campaign_id in (
    select id from public.figsy_campaigns where client_id = public.current_client_id()
  ));

create policy "clients see own replies"
  on public.figsy_replies for all
  using (client_id = public.current_client_id());

-- Service role bypass (used by API)
create policy "service role bypass campaigns"
  on public.figsy_campaigns for all to service_role using (true) with check (true);

create policy "service role bypass enrollments"
  on public.figsy_enrollments for all to service_role using (true) with check (true);

create policy "service role bypass sent emails"
  on public.figsy_sent_emails for all to service_role using (true) with check (true);

create policy "service role bypass replies"
  on public.figsy_replies for all to service_role using (true) with check (true);
