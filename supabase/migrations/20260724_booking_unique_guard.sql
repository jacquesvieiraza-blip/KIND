-- ═══════════════════════════════════════════════════════════════════════════════
-- CONSOLIDATED HERE 31 Jul 2026 (#273) — original: apps/api/src/migrations/20260724_booking_unique_guard.sql
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

-- Audit fix (M6) — enforce the "one active confirmed booking per (client, lead)" invariant at
-- the DB level so two concurrent /book requests can't both insert a confirmed row (the app-level
-- read-then-insert check is TOCTOU-racy). Idempotent. Run once in Supabase (staging → prod).
-- NON-MONEY (capture is already idempotent); this just stops duplicate calendar_bookings rows.
--
-- NOTE: if legacy duplicate confirmed rows already exist this index creation will fail — dedupe
-- them first (keep the earliest per client+lead). Safe/no-op on a clean table.
create unique index if not exists calendar_bookings_one_confirmed_per_lead
  on public.calendar_bookings (client_id, lead_id)
  where status = 'confirmed';
