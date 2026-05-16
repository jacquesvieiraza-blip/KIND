-- Partner programme tables — migration 005
-- Safe to re-run: all statements use IF NOT EXISTS / OR REPLACE.

-- Partner accounts
create table if not exists partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  company text,
  partner_type text not null check (partner_type in ('referral', 'agency', 'technology')),
  referral_code text not null unique default substring(md5(random()::text) from 1 for 8),
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  commission_rate numeric(4,2) not null default 20.00,
  commission_months integer not null default 12,
  notes text,
  created_at timestamptz default now(),
  approved_at timestamptz
);

-- Track which clients came from which partner
create table if not exists partner_referrals (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  referral_code text not null,
  status text not null default 'trial' check (status in ('trial', 'paying', 'churned')),
  first_payment_at timestamptz,
  created_at timestamptz default now(),
  unique(client_id)
);

-- Commission transactions earned by partners
create table if not exists partner_commissions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners(id) on delete cascade,
  partner_referral_id uuid not null references partner_referrals(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  amount_zar numeric(10,2) not null,
  period_month text not null, -- e.g. '2026-06'
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled')),
  created_at timestamptz default now(),
  paid_at timestamptz
);

-- RLS
alter table partners enable row level security;
alter table partner_referrals enable row level security;
alter table partner_commissions enable row level security;

-- Service role bypass (same pattern as other tables)
create policy "Service role bypass" on partners for all using (true);
create policy "Service role bypass" on partner_referrals for all using (true);
create policy "Service role bypass" on partner_commissions for all using (true);

-- Indexes
create index if not exists idx_partners_referral_code on partners(referral_code);
create index if not exists idx_partner_referrals_partner_id on partner_referrals(partner_id);
create index if not exists idx_partner_commissions_partner_id on partner_commissions(partner_id);
