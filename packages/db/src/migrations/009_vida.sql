-- Vida — Embeddable Chatbot Agent — migration 009
-- Safe to re-run: all statements use IF NOT EXISTS.

-- ─────────────────────────────────────────────
-- VIDA CONFIGS
-- ─────────────────────────────────────────────
create table if not exists public.vida_configs (
  id              uuid        primary key default gen_random_uuid(),
  client_id       uuid        not null references public.clients(id) on delete cascade unique,
  bot_name        text        not null default 'Vida',
  greeting        text        not null default 'Hi! How can I help you today?',
  system_prompt   text,
  primary_color   text        not null default '#0066FF',
  collect_email   boolean     not null default true,
  collect_phone   boolean     not null default false,
  notify_email    text,
  active          boolean     not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_vida_configs_client_id on public.vida_configs(client_id);

-- ─────────────────────────────────────────────
-- VIDA SESSIONS
-- ─────────────────────────────────────────────
create table if not exists public.vida_sessions (
  id              uuid        primary key default gen_random_uuid(),
  client_id       uuid        not null references public.clients(id),
  visitor_name    text,
  visitor_email   text,
  visitor_phone   text,
  channel         text        not null default 'web',  -- 'web' or 'whatsapp'
  lead_score      integer,                             -- 0-100
  outcome         text,                               -- 'browsing', 'interested', 'hot_lead', 'spam'
  created_at      timestamptz not null default now(),
  ended_at        timestamptz
);

create index if not exists idx_vida_sessions_client_id  on public.vida_sessions(client_id);
create index if not exists idx_vida_sessions_created_at on public.vida_sessions(created_at desc);

-- ─────────────────────────────────────────────
-- VIDA MESSAGES
-- ─────────────────────────────────────────────
create table if not exists public.vida_messages (
  id          uuid        primary key default gen_random_uuid(),
  session_id  uuid        not null references public.vida_sessions(id) on delete cascade,
  client_id   uuid        not null references public.clients(id),
  role        text        not null,  -- 'user' or 'assistant'
  content     text        not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_vida_messages_session_id on public.vida_messages(session_id);
create index if not exists idx_vida_messages_client_id  on public.vida_messages(client_id);

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────
alter table public.vida_configs   enable row level security;
alter table public.vida_sessions  enable row level security;
alter table public.vida_messages  enable row level security;

-- Service role bypass (used by API)
create policy if not exists "service role bypass vida_configs"
  on public.vida_configs for all to service_role using (true) with check (true);

create policy if not exists "service role bypass vida_sessions"
  on public.vida_sessions for all to service_role using (true) with check (true);

create policy if not exists "service role bypass vida_messages"
  on public.vida_messages for all to service_role using (true) with check (true);
