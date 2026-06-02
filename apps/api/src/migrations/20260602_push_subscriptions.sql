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
