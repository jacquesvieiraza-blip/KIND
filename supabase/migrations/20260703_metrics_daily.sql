-- #287 — MRR waterfall + MoM trend.
-- Daily snapshot of the money truth so movement (new / churned / expansion /
-- contraction) can be diffed between any two days. Written once/day by the
-- /internal/metrics/snapshot cron; read by the admin revenue page.
-- NOT auto-applied — the founder runs this by hand.
create table if not exists public.metrics_daily (
  date         date primary key,
  mrr_usd      numeric      not null default 0,
  active_subs  integer      not null default 0,
  trial_subs   integer      not null default 0,
  -- Array of { client_id, amount_usd } for every ACTIVE subscription on this
  -- day. Diffing two days' arrays yields the movement waterfall.
  subs_json    jsonb        not null default '[]'::jsonb,
  created_at   timestamptz  not null default now()
);
