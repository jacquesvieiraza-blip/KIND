-- #511 NEXUS · Phase 0 — the per-client learning brain's store. Idempotent. Run once in
-- Supabase (staging → prod). NON-MONEY: pure derived analytics, recomputed nightly from
-- this client's own outcomes. FENCED BY client_id — one row per client, never shared across
-- clients (the fence is the product). Service-role only (RLS on; API scopes every read).
create table if not exists public.nexus_profiles (
  client_id       uuid primary key references public.clients(id) on delete cascade,
  reply_rate      numeric not null default 0,   -- replied leads / worked leads
  meeting_rate    numeric not null default 0,   -- booked leads / worked leads
  best_subjects   jsonb   not null default '[]'::jsonb,  -- send subjects that won replies (top few)
  winning_angle   text,                          -- mirrored from figsy_memory.last_winning_angle
  top_persona     jsonb   not null default '{}'::jsonb,  -- {seniority, industry, job_title} that BOOKS
  objections      jsonb   not null default '[]'::jsonb,  -- [{class, count}] of non-positive replies
  sample_worked   integer not null default 0,
  sample_replies  integer not null default 0,
  sample_meetings integer not null default 0,
  confidence      text    not null default 'learning', -- learning | emerging | confident
  computed_at     timestamptz not null default now()
);

alter table public.nexus_profiles enable row level security;
-- No client/anon policy: this is operator/engine-internal, read through the admin-key API only.
