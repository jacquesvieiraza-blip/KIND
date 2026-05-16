-- Voice call tracking for FIGSY AI SDR — migration 006
-- Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE.

create table if not exists public.figsy_calls (
  id                uuid primary key default gen_random_uuid(),
  enrollment_id     uuid not null references public.figsy_enrollments(id) on delete cascade,
  lead_id           uuid not null references public.leads(id) on delete cascade,
  campaign_id       uuid not null references public.figsy_campaigns(id) on delete cascade,
  client_id         uuid not null references public.clients(id) on delete cascade,
  vapi_call_id      text,
  status            text not null default 'initiated'
                      check (status in ('initiated', 'ringing', 'in_progress', 'ended', 'failed')),
  outcome           text
                      check (outcome in ('answered', 'voicemail', 'no_answer', 'failed') or outcome is null),
  duration_seconds  integer,
  transcript        text,
  recording_url     text,
  created_at        timestamptz not null default now(),
  ended_at          timestamptz
);

create index if not exists idx_figsy_calls_enrollment_id on public.figsy_calls(enrollment_id);
create index if not exists idx_figsy_calls_lead_id       on public.figsy_calls(lead_id);
create index if not exists idx_figsy_calls_campaign_id   on public.figsy_calls(campaign_id);
create index if not exists idx_figsy_calls_client_id     on public.figsy_calls(client_id);
create index if not exists idx_figsy_calls_vapi_call_id  on public.figsy_calls(vapi_call_id);

-- RLS
alter table public.figsy_calls enable row level security;

-- Service role bypass (same pattern as other tables)
create policy "Service role bypass" on public.figsy_calls for all using (true);
