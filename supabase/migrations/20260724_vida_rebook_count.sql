-- ═══════════════════════════════════════════════════════════════════════════════
-- CONSOLIDATED HERE 31 Jul 2026 (#273) — original: apps/api/src/migrations/20260724_vida_rebook_count.sql
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

-- #499m — no-show → rebook×2 → keep the $3. Idempotent. Run once in Supabase
-- (staging → prod). NON-MONEY: the $3 is captured at booking (calendar.ts:198) and is
-- KEPT on a no-show — no refund path fires. This column only tracks how many goodwill
-- rebooks a client has been given so the operator console can stop offering more after 2.
alter table public.calendar_bookings add column if not exists rebook_count int not null default 0;
