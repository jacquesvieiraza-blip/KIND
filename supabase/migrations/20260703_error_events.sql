-- #290 — lightweight error tracking (no-dep option; real Sentry is the alternative).
-- The Express error-handler records every unhandled route error here + alerts the
-- founder on 500s. Read by the admin Engine/health page (recent errors).
-- NOT auto-applied — the founder runs this by hand.
create table if not exists public.error_events (
  id         uuid primary key default gen_random_uuid(),
  route      text,
  method     text,
  status     integer,
  message    text,
  stack      text,
  created_at timestamptz not null default now()
);

create index if not exists error_events_created_at_idx on public.error_events(created_at desc);
