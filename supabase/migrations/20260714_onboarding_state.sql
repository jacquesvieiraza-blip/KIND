-- 20260714_onboarding_state.sql
-- Guided onboarding tour (#454) — per-client tour state.
--
-- RUN ORDER: apply to STAGING (kind-staging) first, verify the tour resumes across
-- a browser close, THEN apply to PROD. Idempotent + additive only — every column is
-- ADD COLUMN IF NOT EXISTS with a safe default, so re-running is a no-op and existing
-- rows are untouched. Mirrors the money-fence columns added this session.
--
-- State model (matches the API + portal step machine):
--   onboarding_status: not_started | in_progress | skipped | completed
--   onboarding_step:   current step id (null = not started)
--   onboarding_completed: array of completed step ids

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS onboarding_version      int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS onboarding_step         text,
  ADD COLUMN IF NOT EXISTS onboarding_completed    text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS onboarding_status       text DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS onboarding_started_at   timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;
