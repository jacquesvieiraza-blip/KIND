-- Milla — Virtual Assistant (document Q&A) — migration 008
-- Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE.
-- Uses Supabase full-text search (no pgvector/OpenAI embeddings needed).

-- ─────────────────────────────────────────────
-- PGVECTOR (kept for future use, not used by FTS approach)
-- ─────────────────────────────────────────────
create extension if not exists vector;

-- ─────────────────────────────────────────────
-- MILLA DOCUMENTS
-- ─────────────────────────────────────────────
create table if not exists public.milla_documents (
  id         uuid        primary key default gen_random_uuid(),
  client_id  uuid        not null references public.clients(id) on delete cascade,
  name       text        not null,
  type       text        not null,  -- 'pdf', 'docx', 'txt', 'url'
  content    text        not null,
  status     text        not null default 'processing',  -- 'processing', 'ready', 'error'
  created_at timestamptz not null default now()
);

create index if not exists idx_milla_documents_client_id on public.milla_documents(client_id);

-- ─────────────────────────────────────────────
-- MILLA CHUNKS
-- ─────────────────────────────────────────────
create table if not exists public.milla_chunks (
  id            uuid        primary key default gen_random_uuid(),
  document_id   uuid        not null references public.milla_documents(id) on delete cascade,
  client_id     uuid        not null references public.clients(id) on delete cascade,
  content       text        not null,
  chunk_index   integer     not null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_milla_chunks_client_id   on public.milla_chunks(client_id);
create index if not exists idx_milla_chunks_document_id on public.milla_chunks(document_id);

-- Full-text search index on chunk content
create index if not exists idx_milla_chunks_content_fts
  on public.milla_chunks using gin(to_tsvector('english', content));

-- ─────────────────────────────────────────────
-- MILLA SESSIONS
-- ─────────────────────────────────────────────
create table if not exists public.milla_sessions (
  id         uuid        primary key default gen_random_uuid(),
  client_id  uuid        not null references public.clients(id) on delete cascade,
  title      text,
  created_at timestamptz not null default now()
);

create index if not exists idx_milla_sessions_client_id on public.milla_sessions(client_id);

-- ─────────────────────────────────────────────
-- MILLA MESSAGES
-- ─────────────────────────────────────────────
create table if not exists public.milla_messages (
  id         uuid        primary key default gen_random_uuid(),
  session_id uuid        not null references public.milla_sessions(id) on delete cascade,
  client_id  uuid        not null references public.clients(id) on delete cascade,
  role       text        not null,  -- 'user' or 'assistant'
  content    text        not null,
  sources    jsonb,                 -- array of {document_name, chunk_content}
  created_at timestamptz not null default now()
);

create index if not exists idx_milla_messages_session_id on public.milla_messages(session_id);
create index if not exists idx_milla_messages_client_id  on public.milla_messages(client_id);

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────
alter table public.milla_documents enable row level security;
alter table public.milla_chunks    enable row level security;
alter table public.milla_sessions  enable row level security;
alter table public.milla_messages  enable row level security;

-- Service role bypass (used by API)
create policy if not exists "service role bypass milla_documents"
  on public.milla_documents for all to service_role using (true) with check (true);

create policy if not exists "service role bypass milla_chunks"
  on public.milla_chunks for all to service_role using (true) with check (true);

create policy if not exists "service role bypass milla_sessions"
  on public.milla_sessions for all to service_role using (true) with check (true);

create policy if not exists "service role bypass milla_messages"
  on public.milla_messages for all to service_role using (true) with check (true);
