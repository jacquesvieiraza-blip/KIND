-- Migration 004: Order forms and terms documents

-- Terms documents: T&C library uploaded once by admin, referenced by all order forms
create table if not exists public.terms_documents (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  document_type   text not null check (document_type in ('msa', 'offer', 'sla', 'service_order', 'popia', 'other')),
  file_path       text not null,
  file_size       bigint,
  version         text not null default '1.0',
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Order forms: one per client, created by admin, signed by client
create table if not exists public.order_forms (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  products        text[] not null default '{}',
  pricing_zar     numeric(10,2),
  billing_interval text not null default 'monthly' check (billing_interval in ('monthly', 'annual', 'once')),
  scope           text,
  start_date      date,
  notes           text,
  status          text not null default 'draft' check (status in ('draft', 'sent', 'signed')),
  sent_at         timestamptz,
  signed_at       timestamptz,
  signed_by_name  text,
  signed_ip       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_order_forms_client_id on public.order_forms(client_id);
create index if not exists idx_order_forms_status on public.order_forms(status);

create trigger set_order_forms_updated_at
  before update on public.order_forms
  for each row execute function public.set_updated_at();

-- RLS: clients can only read their own order forms (admin writes via service role)
alter table public.order_forms enable row level security;
alter table public.terms_documents enable row level security;

create policy "clients_read_own_order_forms" on public.order_forms
  for select using (
    client_id in (select id from public.clients where user_id = auth.uid())
  );

-- Terms documents are publicly readable by authenticated users
create policy "authenticated_read_terms" on public.terms_documents
  for select using (auth.role() = 'authenticated');
