-- ════════════════════════════════════════════════════════════════════════════
-- #88 COMPANY ENGINE — per-rep workspaces under an owner-funded company
-- Model: each rep is their own `clients` workspace (own leads/campaigns/FIGSY),
-- linked to a `companies` row by company_id. The owner funds a company credit
-- pool and allocates a per-seat budget to each rep; reps request more, owner
-- approves (credits move pool → rep balance). Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

-- ── COMPANIES — the org the owner funds ─────────────────────────────────────
create table if not exists public.companies (
  id            uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  credit_pool   integer not null default 0,   -- company funds; owner allocates to reps
  seat_cap      integer not null default 25,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists companies_owner_idx on public.companies(owner_user_id);

-- ── CLIENTS — seat columns (each rep + the owner is a clients row) ───────────
-- A rep's workspace exists the moment the owner invites them — before they sign
-- up — so user_id must be nullable (attached when they accept). Safe: Postgres
-- allows many NULLs under unique(user_id), and `where user_id = auth.uid()`
-- never matches an unattached seat.
alter table public.clients alter column user_id drop not null;
alter table public.clients add column if not exists company_id       uuid references public.companies(id) on delete set null;
alter table public.clients add column if not exists seat_role         text default 'owner' check (seat_role in ('owner','manager','rep'));
alter table public.clients add column if not exists seat_active       boolean not null default true;
alter table public.clients add column if not exists seat_budget       integer not null default 0;   -- total credits allocated to this rep
alter table public.clients add column if not exists autonomy          text default 'auto' check (autonomy in ('auto','copilot','off'));
alter table public.clients add column if not exists invited_email     text;
alter table public.clients add column if not exists invite_token      text;
alter table public.clients add column if not exists seat_accepted_at  timestamptz;
create index if not exists clients_company_idx on public.clients(company_id);
create unique index if not exists clients_invite_token_key on public.clients(invite_token) where invite_token is not null;

-- ── SEAT CREDIT REQUESTS — rep asks owner for more budget ───────────────────
create table if not exists public.seat_credit_requests (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  rep_client_id uuid not null references public.clients(id) on delete cascade,
  amount        integer not null check (amount > 0),
  reason        text,
  status        text not null default 'pending' check (status in ('pending','approved','denied')),
  decided_by    uuid,
  decided_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists seat_credit_requests_company_idx on public.seat_credit_requests(company_id, status);
create index if not exists seat_credit_requests_rep_idx     on public.seat_credit_requests(rep_client_id);

-- ── WINNING PLAYS — company-shared sequences/plays ──────────────────────────
create table if not exists public.winning_plays (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  name          text not null,
  note          text,
  sequence      jsonb not null default '{}'::jsonb,
  reply_rate    numeric,
  pushed_to_all boolean not null default false,
  created_by    uuid,
  created_at    timestamptz not null default now()
);
create index if not exists winning_plays_company_idx on public.winning_plays(company_id);

-- ── RLS — service-role API does the heavy lifting; clients read own ──────────
alter table public.companies            enable row level security;
alter table public.seat_credit_requests enable row level security;
alter table public.winning_plays        enable row level security;

drop policy if exists "companies_owner_read"   on public.companies;
drop policy if exists "companies_service"       on public.companies;
drop policy if exists "scr_service"             on public.seat_credit_requests;
drop policy if exists "wp_service"              on public.winning_plays;

create policy "companies_owner_read" on public.companies for select using (owner_user_id = auth.uid());
create policy "companies_service"    on public.companies for all to service_role using (true) with check (true);
create policy "scr_service"          on public.seat_credit_requests for all to service_role using (true) with check (true);
create policy "wp_service"           on public.winning_plays for all to service_role using (true) with check (true);
