-- ═══════════════════════════════════════════════════════════════════════════════
-- CONSOLIDATED HERE 31 Jul 2026 (#273) — original: apps/api/src/migrations/20260602_figsy_chat_history.sql
-- ═══════════════════════════════════════════════════════════════════════════════
-- The SQL below this header is BYTE-IDENTICAL to the original. Nothing was rewritten,
-- reordered or "fixed" on the way in: a migration that has (or has not) been applied to
-- production is a historical fact, and editing it while copying would destroy the only
-- record of what was actually run.
--
-- The original file still exists and carries a tombstone header pointing here. A test
-- (`migration-home.test.ts`) asserts the two bodies stay identical, so editing one copy
-- without the other fails the gate — which is the duplication risk turned into a guard.
-- ═══════════════════════════════════════════════════════════════════════════════

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
