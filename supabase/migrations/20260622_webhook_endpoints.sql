-- ═══════════════════════════════════════════════════════════════════════════════
-- CONSOLIDATED HERE 31 Jul 2026 (#273) — original: apps/api/src/migrations/20260622_webhook_endpoints.sql
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

-- OUTBOUND WEBHOOKS + PUBLIC EVENT API (PRODUCT-INVENTORY #182 Zapier/Make, #185).
--
-- ⚠️ FLAGGED — NOT YET APPLIED TO THE LIVE DB. This migration is intentionally
-- un-run. The application code (lib/webhooks.ts, routes/developer.ts) is written
-- to NO-OP safely if this table is absent: delivery silently finds no endpoints,
-- and the registration endpoints return a soft error the UI handles. Apply this
-- migration (Supabase SQL editor / migration runner) BEFORE enabling the
-- outbound-webhook registration UI in production.
--
-- Stores a client's registered outbound webhook endpoints. When a key outcome
-- event fires (lead delivered · reply received · meeting booked · opt-out),
-- lib/webhooks.ts deliverWebhooks() POSTs the stable payload to every matching,
-- active endpoint, signed with HMAC-SHA256(secret) in X-Kind-Signature.

create table if not exists public.webhook_endpoints (
  id          uuid primary key default uuid_generate_v4(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  url         text not null,                         -- receiver URL (Zapier/Make/Slack/own)
  secret      text,                                  -- HMAC signing secret (whsec_...)
  -- subscribed public event names; NULL/empty = receive ALL events.
  -- Values: lead.delivered | reply.received | meeting.booked | opt_out
  event_types text[] not null default '{}',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists webhook_endpoints_client_active_idx
  on public.webhook_endpoints (client_id, active);

alter table public.webhook_endpoints enable row level security;
-- Service role (API) only — all access is scoped by client_id in the API layer,
-- matching the outcome_events pattern. No direct client access path.
