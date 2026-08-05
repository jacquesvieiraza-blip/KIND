-- #627 — app_settings: THE TABLE EVERY READER ASSUMED AND NOBODY CREATED.
--
-- The System check has read `app_settings` for months (key `pdl_monthly_cap_usd`, the monthly
-- sourcing ceiling) and reported "no usable setting exists — set it". That instruction pointed
-- at a table that DOES NOT EXIST, anywhere: not in this directory, not in the runner, not in
-- production. The read returned an error, the probe treated it as "no row", and the screen said
-- something false in a calm voice.
--
-- It surfaced on 6 Aug the first time anything WROTE to it: the founder pressed Save on the new
-- PDL-cap card (#626) and got "Could not find the table 'public.app_settings' in the schema
-- cache" — because that write is CHECKED rather than swallowed (#349). The rule earned its keep:
-- a swallowed error would have left him believing sourcing was capped while nothing was.
--
-- Idempotent and safe to re-run. Applied from Vida → Engine → Run migrations, which needs
-- DATABASE_URL to be Supabase's SESSION POOLER string first (runlist A15).

CREATE TABLE IF NOT EXISTS public.app_settings (
  key        text        PRIMARY KEY,
  value      text        NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.app_settings IS
  'Operator-set global settings, one row per key. Written by Vida (operator, admin-gated) and read by the System check. First key: pdl_monthly_cap_usd — the monthly PDL sourcing ceiling (#626/#627).';

-- RLS on with no policies denies anon/authenticated outright; the service role (the API)
-- bypasses RLS and is the only accessor. Same posture as cron_claims and icp_run_outcomes.
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
