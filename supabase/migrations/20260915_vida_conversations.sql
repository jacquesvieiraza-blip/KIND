-- ═══════════════════════════════════════════════════════════════════════════════════════
-- VIDA REMEMBERS THE CLIENT SHE IS WORKING ON. (R121, BUILD 3.)
--
-- ── WHAT THIS FIXES ────────────────────────────────────────────────────────────────────
--
-- Vida's transcript lived in React state (cmdLog in VidaConversation.tsx) and nowhere
-- else. An operator who reloaded the console, opened another client, or came back after
-- lunch was talking to somebody with no memory of the last twenty minutes — while the
-- CLIENT'S OWN Milla thread, three feet away in the same product, had been persisted since
-- 14 Sep. She could not be a colleague because she could not remember being one.
--
-- ── THE SHAPE, AND WHY IT IS THIS SHAPE ────────────────────────────────────────────────
--
-- 🛑 ONE ROW PER OPERATOR PER CLIENT. Two operators working the same client are having two
-- different conversations and must not read each other's — an operator who asked "what did
-- they say about pricing?" should not receive somebody else's half-finished thought as
-- context. And one operator across two clients must never carry A's context into B, which is
-- the cross-client leak this build is tested against.
--
-- ⚠️ THE TRANSCRIPT IS A JSONB ARRAY, not a row per message. It is read whole, written
-- whole, bounded to the most recent turns in application code, and never queried BY message
-- — exactly like onboarding_brief_drafts.conversation, which this deliberately mirrors
-- rather than inventing a second shape for the same job.
--
-- ⚠️ NO RLS POLICY, AND THAT IS THE SECURE CHOICE HERE. Every client-facing table in this
-- schema is reached by an authenticated client through RLS; this one is reached ONLY by the
-- service role, behind the admin-key proxy, and a client must never read it under any
-- policy. RLS is enabled with no policy at all, so an anon or authenticated role sees
-- nothing — the deny is structural rather than a rule somebody has to get right.
--
-- ⚠️ ADDITIVE AND IDEMPOTENT. Creates one table and one index; touches nothing that exists.
-- ═══════════════════════════════════════════════════════════════════════════════════════

create table if not exists public.vida_conversations (
  id            uuid primary key default uuid_generate_v4(),
  -- The VERIFIED operator email, as the proxy forwards it and operator_audit_log records
  -- it. Text rather than a user id because operators are an allowlist, not a table.
  operator      text not null,
  client_id     uuid not null references public.clients(id) on delete cascade,
  -- [{ role: 'operator' | 'vida', text: string, at: iso }] — bounded in application code.
  conversation  jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 🛑 THE UNIQUENESS IS THE ISOLATION. Without it a second row for the same pair would make
-- "the conversation" ambiguous, and whichever row a query happened to return would be the
-- memory — which is how one operator's words start appearing in another's thread.
create unique index if not exists vida_conversations_operator_client_idx
  on public.vida_conversations (operator, client_id);

-- Enabled with NO policy: the service role bypasses RLS, every other role is denied by
-- default. A client can never read what an operator said about them.
alter table public.vida_conversations enable row level security;
