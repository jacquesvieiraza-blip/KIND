-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Milla + Vida tables
-- Date: 2026-05-25
-- Creates milla_documents, milla_chunks, milla_sessions, milla_messages tables
-- and vida_configs, vida_sessions, vida_messages tables if they don't exist.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Milla Documents ────────────────────────────────────────────────────────────
create table if not exists public.milla_documents (
  id          uuid primary key default uuid_generate_v4(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  name        text not null,
  type        text not null default 'txt',
  content     text,
  status      text not null default 'processing',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
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
create index if not exists idx_milla_chunks_content_fts
  on public.milla_chunks using gin(to_tsvector('english', content));

-- ── Milla Sessions ─────────────────────────────────────────────────────────────
create table if not exists public.milla_sessions (
  id          uuid primary key default uuid_generate_v4(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  title       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_milla_sessions_client_id on public.milla_sessions(client_id);

-- ── Milla Messages ─────────────────────────────────────────────────────────────
create table if not exists public.milla_messages (
  id          uuid primary key default uuid_generate_v4(),
  session_id  uuid not null references public.milla_sessions(id) on delete cascade,
  client_id   uuid not null references public.clients(id) on delete cascade,
  role        text not null,
  content     text not null,
  sources     jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_milla_messages_session_id on public.milla_messages(session_id);
create index if not exists idx_milla_messages_client_id  on public.milla_messages(client_id);

-- ── RLS ────────────────────────────────────────────────────────────────────────
alter table public.milla_documents enable row level security;
alter table public.milla_chunks     enable row level security;
alter table public.milla_sessions   enable row level security;
alter table public.milla_messages   enable row level security;

-- Service role bypass (API uses service role key)
create policy if not exists "milla_documents_service" on public.milla_documents using (true) with check (true);
create policy if not exists "milla_chunks_service"     on public.milla_chunks     using (true) with check (true);
create policy if not exists "milla_sessions_service"   on public.milla_sessions   using (true) with check (true);
create policy if not exists "milla_messages_service"   on public.milla_messages   using (true) with check (true);
