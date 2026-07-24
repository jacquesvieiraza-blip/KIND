-- #494 / #499 — Vida operator gates: reply qualification + booking no-show state.
-- Idempotent. Run once in Supabase (staging then prod). No money columns here — both
-- markers are non-spend operator state (the $3 hold/capture logic is unchanged and the
-- no-show → rebook×2 → keep money automation is deliberately NOT wired here; that is a
-- separate, flagged founder decision about capture timing).

-- #494 — operator "Mark qualified" on a reply. A human judgement that a reply is a genuine
-- qualified conversation (right person, real interest), distinct from the AI classification.
-- Non-spend; qualified_by records which operator made the call for the audit trail.
alter table public.figsy_replies add column if not exists qualified_at timestamptz;
alter table public.figsy_replies add column if not exists qualified_by text;

create index if not exists figsy_replies_qualified_idx
  on public.figsy_replies (client_id, qualified_at);

-- #499 — a booking can now carry a 'no_show' status. calendar_bookings.status is free text
-- (default 'confirmed', no check constraint), so no schema change is required to store it;
-- this index keeps the Bookings page's per-client status filter fast. Also record WHEN the
-- no-show was marked so the (future, flagged) rebook ladder has a timestamp to work from.
alter table public.calendar_bookings add column if not exists no_show_at timestamptz;
alter table public.calendar_bookings add column if not exists no_show_by text;

create index if not exists calendar_bookings_status_idx
  on public.calendar_bookings (client_id, status, start_time);
