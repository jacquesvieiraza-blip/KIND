-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add all missing clients table columns
-- Date:      2026-05-25
--
-- These columns are referenced throughout the API codebase but were never
-- added via migration, causing silent failures or schema cache errors on
-- any feature that touches them.
--
-- Safe to run multiple times (ADD COLUMN IF NOT EXISTS).
-- Run in: Supabase SQL Editor → New Query → Paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Auto Top-up (credit auto-refill via Paystack) ─────────────────────────────
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS auto_topup_enabled       boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_topup_threshold     integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_topup_plan          text        CHECK (auto_topup_plan IN ('kind_ai', 'figsy')),
  ADD COLUMN IF NOT EXISTS auto_topup_bundle_size   integer,
  ADD COLUMN IF NOT EXISTS auto_topup_paystack_auth text;

-- ── Google Calendar Integration ───────────────────────────────────────────────
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS calendar_booking_enabled        boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS google_calendar_access_token    text,
  ADD COLUMN IF NOT EXISTS google_calendar_refresh_token   text,
  ADD COLUMN IF NOT EXISTS google_calendar_token_expiry    timestamptz,
  ADD COLUMN IF NOT EXISTS google_calendar_email           text;

-- ── FIGSY credits (Stripe top-up pathway, separate from KIND AI credits) ──────
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS figsy_credits_remaining integer NOT NULL DEFAULT 0;

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'clients'
  AND column_name  IN (
    'auto_topup_enabled', 'auto_topup_threshold', 'auto_topup_plan',
    'auto_topup_bundle_size', 'auto_topup_paystack_auth',
    'calendar_booking_enabled', 'google_calendar_access_token',
    'google_calendar_refresh_token', 'google_calendar_token_expiry',
    'google_calendar_email', 'figsy_credits_remaining'
  )
ORDER BY column_name;
