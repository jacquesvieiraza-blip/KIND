-- ═══════════════════════════════════════════════════════════════════════════════
-- CONSOLIDATED HERE 31 Jul 2026 (#273) — original: packages/db/src/migrations/010_crm_dedup.sql
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

-- CRM dedup: never cold-email a client's existing customers / known contacts.
-- Read-only check against the client's own CRM (HubSpot/Pipedrive) before FIGSY
-- enrolls a lead. Reuses crm_type + crm_api_key from 003_crm_integration.

-- Per-client toggle (separate from crm_sync_enabled: dedup is READ, sync is WRITE).
alter table public.clients
  add column if not exists crm_dedup_enabled boolean not null default false;

-- Flag + reason on leads so the dedup result is visible in the portal and we
-- never re-spend credits re-checking the same lead.
alter table public.leads
  add column if not exists crm_existing     boolean not null default false,
  add column if not exists crm_match_reason text;

-- Fast lookup of already-flagged leads.
create index if not exists idx_leads_crm_existing
  on public.leads (client_id) where crm_existing = true;
