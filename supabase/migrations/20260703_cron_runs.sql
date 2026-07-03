-- Engine cron run-history — one row per cron job execution so the admin
-- Engine/health page can show a real last-run-per-job panel (was a 🔴 shell that
-- "needs a reporting endpoint"). Written by the instrumented callInternal() in
-- apps/api/src/cron.ts. NOT auto-applied — the founder runs this by hand.
create table if not exists public.cron_runs (
  id          uuid primary key default gen_random_uuid(),
  job         text not null,
  started_at  timestamptz,
  finished_at timestamptz,
  ok          boolean,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists cron_runs_job_started_idx on public.cron_runs(job, started_at desc);
