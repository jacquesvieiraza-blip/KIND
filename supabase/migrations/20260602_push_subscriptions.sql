-- ═══════════════════════════════════════════════════════════════════════════════
-- CONSOLIDATED HERE 31 Jul 2026 (#273) — original: apps/api/src/migrations/20260602_push_subscriptions.sql
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

-- Web Push subscriptions — one row per browser/device a client has opted in on.
-- Used by the API to send PWA push notifications (hot reply, low credits, etc.).
-- The API degrades gracefully (no push sent) if VAPID keys are not configured.

create table if not exists public.push_subscriptions (
  id          uuid primary key default uuid_generate_v4(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now(),
  unique (endpoint)
);

create index if not exists push_subscriptions_client_idx
  on public.push_subscriptions (client_id);

alter table public.push_subscriptions enable row level security;
-- Service role (API) only. No direct client access.
