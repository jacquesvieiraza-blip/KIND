-- Google Calendar integration for FIGSY AI SDR — migration 007
-- Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE.

-- ─────────────────────────────────────────────
-- ADD CALENDAR COLUMNS TO CLIENTS
-- ─────────────────────────────────────────────
alter table public.clients
  add column if not exists google_calendar_access_token  text,
  add column if not exists google_calendar_refresh_token text,
  add column if not exists google_calendar_token_expiry  timestamptz,
  add column if not exists google_calendar_email         text,
  add column if not exists calendar_booking_enabled      boolean not null default false;

-- ─────────────────────────────────────────────
-- CALENDAR BOOKINGS
-- ─────────────────────────────────────────────
create table if not exists public.calendar_bookings (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  lead_id         uuid not null references public.leads(id) on delete cascade,
  enrollment_id   uuid references public.figsy_enrollments(id) on delete set null,
  google_event_id text,
  meeting_title   text,
  start_time      timestamptz,
  end_time        timestamptz,
  meeting_link    text,          -- Google Meet link
  status          text not null default 'pending'
                    check (status in ('pending', 'confirmed', 'cancelled')),
  created_at      timestamptz not null default now()
);

create index if not exists idx_calendar_bookings_client_id    on public.calendar_bookings(client_id);
create index if not exists idx_calendar_bookings_lead_id      on public.calendar_bookings(lead_id);
create index if not exists idx_calendar_bookings_enrollment_id on public.calendar_bookings(enrollment_id);

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────
alter table public.calendar_bookings enable row level security;

-- Service role bypass (used by API)
create policy if not exists "service role bypass calendar_bookings"
  on public.calendar_bookings for all to service_role using (true) with check (true);
