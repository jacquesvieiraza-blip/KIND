-- #264 (2 Jul 2026): idempotency for the Resend inbound-reply webhook.
--
-- ROOT CAUSE: Resend delivers inbound events through Svix, which RETRIES the same
-- event (same `svix-id`) on any non-2xx or timeout. The signature is verified, so
-- a retried payload is authentic — but without a dedup guard `POST
-- /figsy/replies/inbound` re-runs the whole hot-reply path: a second CRM deal push
-- AND a second Paystack auto-top-up charge_authorization (a real double charge).
--
-- FIX: the route records each delivery's stable Svix message id here and skips any
-- id it has already processed (see apps/api/src/lib/webhook-idempotency.ts).
--
-- FAIL OPEN: until this table exists the route processes as before (the guard only
-- skips on a genuine unique-constraint violation), so deploying the code AHEAD of
-- this migration is safe. Apply to prod via the Supabase SQL editor, like the other
-- pending migrations.

create table if not exists public.processed_webhook_events (
  event_id   text        primary key,
  source     text        not null default 'resend',
  created_at timestamptz not null default now()
);

-- The API uses the service_role key, which BYPASSES RLS; enabling RLS with no
-- policy means no anon/authenticated access to this internal dedup ledger.
alter table if exists public.processed_webhook_events enable row level security;
