-- ═══════════════════════════════════════════════════════════════════════════════
-- CONSOLIDATED HERE 31 Jul 2026 (#273) — original: apps/api/src/migrations/20260602_calendar_bookings.sql
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

-- Calendar bookings — records a real meeting created on a client's connected
-- Google Calendar via POST /calendar/book. Without this table that endpoint
-- 500s on insert. Also the anchor for tying a booking back to the lead and
-- the FIGSY enrollment that produced it.

create table if not exists public.calendar_bookings (
  id              uuid primary key default uuid_generate_v4(),
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

create index if not exists calendar_bookings_client_idx
  on public.calendar_bookings (client_id, start_time);
create index if not exists calendar_bookings_lead_idx
  on public.calendar_bookings (lead_id);

alter table public.calendar_bookings enable row level security;
-- Service role (API) only — all access scoped by client_id in the API layer.
