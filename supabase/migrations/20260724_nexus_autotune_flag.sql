-- ═══════════════════════════════════════════════════════════════════════════════
-- CONSOLIDATED HERE 31 Jul 2026 (#273) — original: apps/api/src/migrations/20260724_nexus_autotune_flag.sql
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

-- #511 NEXUS · Phase 3 — the per-client auto-tune KILL-SWITCH. Idempotent. Run once in
-- Supabase (staging → prod). NON-MONEY (a boolean flag), but it GOVERNS money-sensitive
-- Phase-2 sourcing tuning: auto-tune is OFF by default for every client — the founder
-- explicitly enables it per client once they trust that client's Nexus. Default-deny.
alter table public.clients add column if not exists nexus_autotune_enabled boolean not null default false;
