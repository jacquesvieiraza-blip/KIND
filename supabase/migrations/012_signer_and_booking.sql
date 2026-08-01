-- ═══════════════════════════════════════════════════════════════════════════════
-- CONSOLIDATED HERE 31 Jul 2026 (#273) — original: packages/db/src/migrations/012_signer_and_booking.sql
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

-- Migration 012 — configurable email sign-off name (P-a) + booking link field (CAL-min)
-- Run once against Supabase (SQL Editor). Additive + idempotent — safe to re-run.
--
-- P-a: clients can set the exact name FIGSY signs outreach as, instead of FIGSY
--      inventing a South-African-sounding first name. NULL = keep old behaviour.
-- CAL-min: booking_url already exists in most environments; added here defensively
--      so non-Google clients can paste any booking link (Calendly/Zoho/etc.).

alter table public.clients
  add column if not exists signer_name text,
  add column if not exists booking_url text;
