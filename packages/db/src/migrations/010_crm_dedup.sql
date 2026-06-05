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
