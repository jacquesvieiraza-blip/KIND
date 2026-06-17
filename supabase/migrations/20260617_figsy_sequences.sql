-- 20260617_figsy_sequences.sql
-- Item 187 — reusable sequences/templates that can be applied to a campaign.
--
-- A "sequence" is a saved, reusable set of steps (email-first). Each email step
-- carries literal copy (subject + body) with merge tokens like {{first_name}} and
-- {{company}}; when the sequence is applied to a campaign, enrolling a lead writes
-- that copy (token-substituted) into the enrollment's step{1,2,3}_subject/body, and
-- the existing send engine carries it. Non-email channels can be saved for display
-- but do not send yet (greyed "coming soon" in the UI).
--
-- steps shape (jsonb array, in order):
--   { "channel": "email"|"linkedin"|"call"|"whatsapp",
--     "subject": "…",            -- email only
--     "body": "…",               -- the literal copy (merge tokens allowed)
--     "wait_days": 0,            -- delay before this step
--     "on_reply": "stop"|"skip_next"|"continue" }

create table if not exists public.figsy_sequences (
  id          uuid        primary key default gen_random_uuid(),
  client_id   uuid        not null references public.clients(id) on delete cascade,
  name        text        not null,
  steps       jsonb       not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_figsy_sequences_client_id  on public.figsy_sequences(client_id);
create index if not exists idx_figsy_sequences_created_at on public.figsy_sequences(created_at desc);

alter table public.figsy_sequences enable row level security;

drop policy if exists figsy_sequences_client_rw  on public.figsy_sequences;
drop policy if exists figsy_sequences_service_all on public.figsy_sequences;
create policy figsy_sequences_client_rw on public.figsy_sequences
  for all using (client_id in (select id from public.clients where user_id = auth.uid()))
  with check (client_id in (select id from public.clients where user_id = auth.uid()));
create policy figsy_sequences_service_all on public.figsy_sequences
  for all to service_role using (true) with check (true);
