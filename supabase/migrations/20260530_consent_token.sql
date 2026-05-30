-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Secure consent tokens
-- Date:      2026-05-30
--
-- Security fix: the public POPIA consent link previously used the lead's UUID
-- primary key as its token (…/consent?lead=<id>&token=<id>), so anyone who knew
-- or guessed a lead id could give/decline consent on their behalf.
--
-- This adds a dedicated, unguessable `consent_token` column. The API now
-- generates it with crypto.randomBytes(32) (64 hex chars) and looks leads up by
-- token instead of by id. This migration backfills existing rows so the column
-- is always populated and resends work; new tokens are minted by the app.
--
-- Idempotent — safe to run multiple times.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS consent_token TEXT;

-- Backfill any rows without a token. Two concatenated UUIDs give 64 hex chars
-- (≈32 bytes) from Postgres' CSPRNG, evaluated per-row — mirrors the runtime
-- crypto.randomBytes(32).toString('hex') format with no extra extension needed.
UPDATE public.leads
SET consent_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE consent_token IS NULL;

-- Enforce uniqueness and provide a fast lookup path for token validation.
-- (NULLs are allowed and ignored by a unique index, so new rows may stay NULL
--  until their first consent email is sent.)
CREATE UNIQUE INDEX IF NOT EXISTS leads_consent_token_key ON public.leads (consent_token);
