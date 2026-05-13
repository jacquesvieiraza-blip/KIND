-- CRM integration fields on clients table
alter table public.clients
  add column if not exists crm_type       text check (crm_type in ('hubspot','pipedrive','none')),
  add column if not exists crm_api_key    text,
  add column if not exists crm_sync_enabled boolean not null default false;
