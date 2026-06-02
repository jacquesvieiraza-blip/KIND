-- FIGSY chat history — server-side persistence for the AskFigsyButton thread.
-- Without this table the chat still works (localStorage), but the thread is
-- lost on cache-clear or a different device. With it, the thread follows the
-- user everywhere. The API degrades gracefully if this table is absent.

create table if not exists public.figsy_chat_messages (
  id         uuid primary key default uuid_generate_v4(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  role       text not null check (role in ('user','assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists figsy_chat_messages_client_idx
  on public.figsy_chat_messages (client_id, created_at);

alter table public.figsy_chat_messages enable row level security;

-- Service role (API) bypasses RLS. No direct client access — all reads/writes
-- go through the authenticated API which scopes by client_id.
