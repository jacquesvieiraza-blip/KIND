-- ═══════════════════════════════════════════════════════════════════════════════
-- CONSOLIDATED HERE 31 Jul 2026 (#273) — original: packages/db/src/migrations/003_crm_integration.sql
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

-- CRM integration fields on clients table
alter table public.clients
  add column if not exists crm_type       text check (crm_type in ('hubspot','pipedrive','none')),
  add column if not exists crm_api_key    text,
  add column if not exists crm_sync_enabled boolean not null default false;
