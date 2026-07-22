-- #361b / #368 — Calendar booking goes live. One idempotent file the founder runs once
-- in Supabase (staging then prod) so every column + table the feature touches exists,
-- regardless of which earlier migrations reached prod. Safe to re-run.

-- Client-side Google Calendar connection state (used by /calendar/connect|callback|status).
alter table public.clients add column if not exists calendar_booking_enabled     boolean not null default false;
alter table public.clients add column if not exists google_calendar_access_token  text;
alter table public.clients add column if not exists google_calendar_refresh_token text;
alter table public.clients add column if not exists google_calendar_token_expiry  timestamptz;
alter table public.clients add column if not exists google_calendar_email         text;

-- The bookings table (records a real meeting created on the client's calendar).
create table if not exists public.calendar_bookings (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  lead_id         uuid references public.leads(id) on delete set null,
  enrollment_id   uuid references public.figsy_enrollments(id) on delete set null,
  google_event_id text,
  meeting_title   text,
  start_time      timestamptz,
  end_time        timestamptz,
  meeting_link    text,
  status          text not null default 'confirmed',
  created_at      timestamptz not null default now()
);

create index if not exists calendar_bookings_client_idx on public.calendar_bookings (client_id, start_time);
create index if not exists calendar_bookings_lead_idx   on public.calendar_bookings (lead_id);

-- Fast lookup for the "one active future booking per lead+client" guard (performBooking).
create index if not exists calendar_bookings_active_idx
  on public.calendar_bookings (client_id, lead_id, status, start_time);

alter table public.calendar_bookings enable row level security;
-- Service role (API) only — all access is scoped by client_id in the API layer.
