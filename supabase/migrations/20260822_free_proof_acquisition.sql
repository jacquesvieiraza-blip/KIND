-- ── FREE REAL-LEAD PROOF — THE ACQUISITION FENCE (22 Aug 2026) ──────────────────────────
--
-- An unpaid prospect is shown REAL masked leads before they pay: up to 20, one refinement
-- of the same core ICP, up to 20 more, then a human conversation. That costs K.I.N.D real
-- money at PDL, so it needs a fence -- and the fence has to be a different fence from the
-- one that protects paying clients.
--
-- ⚠️ WHY THIS DOES NOT REUSE clients.sourcing_allowance OR try_spend_sourcing.
-- An unpaid prospect's sourcing_allowance is 0, so try_spend_sourcing grants 0 and could
-- never fund proof at all. Granting into that shared integer instead would be worse: SIX
-- current paths spend it (ICP create/activate/run, the nightly top-up, start-work, operator
-- sourcing, admin and partner routes, and /lookalike/generate directly), so a proof budget
-- placed there could be drained by any of them. Proof therefore gets its own authority,
-- and paid AR8 is left byte-for-byte alone.
--
-- ⚠️ WHY PROOF DOES NOT WRITE TO sourcing_ledger.
-- That ledger is the sum behind the PAID monthly PDL ceiling. Writing proof spend into it
-- would make free acquisition compete with paid delivery for the same $300 -- a busy
-- acquisition month could refuse a paying client's sourcing. Founder-ruled 22 Aug: free
-- acquisition and paid delivery are SEPARATE budget controls. So proof gets proof_ledger,
-- and money_settings gets its own proof cap beside the paid one.
--
-- ⚠️ THE TWO RACES THIS EXISTS TO CLOSE, both found in review before any code was written:
--   1. PER CLIENT. read spent -> compute remaining -> call PDL -> increment is NOT a fence:
--      two overlapping runs both read the same remaining budget and both spend it. Fixed by
--      deciding and committing inside one transaction under a row lock.
--   2. ACROSS CLIENTS. Locking client A's row does nothing to serialise client B. With 50
--      records of monthly room, A and B could each be authorised 40 -- 80 total. Fixed by
--      taking the lock on the SINGLETON money_settings row FIRST, so every proof
--      reservation in the system passes through one critical section.
--
-- Lock order is always money_settings (global) then clients (per client). One order, so
-- proof callers cannot deadlock each other. try_spend_sourcing reads money_settings with a
-- plain SELECT and never locks it, so the paid path is not blocked by any of this.
--
-- Reservation is PESSIMISTIC: the records are committed BEFORE PDL is called and released
-- afterwards if fewer came back. Every failure therefore under-allows rather than
-- overspends -- a temporary under-allocation is recoverable, an overspend is not.
--
-- Additive only. No existing table, function or money rule is modified.

-- ── 1. Per-client proof state ───────────────────────────────────────────────────────────
-- proof_records_committed: PDL records reserved for this prospect across BOTH passes,
--   capped at 40 for life (founder-set, 22 Aug: $11.20 at the verified $0.28 rate).
-- proof_passes_done: automatic proof batches already claimed. Max 2, then a human.
alter table public.clients
  add column if not exists proof_records_committed int not null default 0,
  add column if not exists proof_passes_done       int not null default 0;

-- ── 2. The free-acquisition monthly ceiling, beside the paid one ────────────────────────
-- Deliberately a SECOND column rather than a shared one: paid delivery keeps
-- pdl_monthly_cap_usd untouched, and neither budget can starve the other.
alter table public.money_settings
  add column if not exists proof_monthly_cap_usd numeric not null default 300;

comment on column public.money_settings.proof_monthly_cap_usd is
  'Free-proof ACQUISITION PDL ceiling per calendar month, separate from pdl_monthly_cap_usd which fences PAID delivery. Founder-set 22 Aug at $300: the most he is initially prepared to fund to win clients, raised deliberately when demand justifies it. Never raised automatically.';

-- ── 3. The proof ledger — proof spend, and ONLY proof spend ─────────────────────────────
-- Separate from sourcing_ledger on purpose (see header). The reservation IS the ledger row,
-- so outstanding reservations are already inside the monthly sum and no second counter can
-- drift out of step with it. An under-return writes a negative correction row, exactly as
-- the paid path already does for an unused grant.
create table if not exists public.proof_ledger (
  id         uuid primary key default uuid_generate_v4(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  records    int  not null,
  cost_usd   numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists proof_ledger_month_idx on public.proof_ledger (created_at desc);
create index if not exists proof_ledger_client_idx on public.proof_ledger (client_id, created_at desc);

alter table public.proof_ledger enable row level security;

comment on table public.proof_ledger is
  'Free-proof acquisition PDL spend. Positive rows are reservations made BEFORE the provider call; negative rows reconcile an under-return. The month sum of cost_usd is the authority for the free-acquisition ceiling. Never mixed with sourcing_ledger, which fences paid delivery.';

-- ── 4. Claim a proof pass — atomic, and independent of PDL ──────────────────────────────
-- Claimed BEFORE the batch starts, so a POOL-ONLY batch consumes a pass exactly as a
-- PDL-backed one does. Returns the pass number claimed (1 or 2), or 0 when refused.
--
-- If a technical failure happens after a claim, the pass is spent and there is NO automatic
-- retry: an automatic retry is precisely the race that would produce a third free batch.
-- Recovery is human, which is the model the founder already chose for a second miss.
create or replace function public.try_claim_proof_pass(p_client_id uuid)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_done int;
begin
  if p_client_id is null then return 0; end if;

  -- FOR UPDATE serialises two requests racing for the same pass: the loser reads the
  -- winner's committed value, not a stale one, and is refused.
  select coalesce(proof_passes_done, 0) into v_done
    from public.clients where id = p_client_id for update;

  if v_done is null then return 0; end if;     -- unknown client: fail closed
  if v_done >= 2 then return 0; end if;        -- two passes used: a human takes over

  update public.clients set proof_passes_done = v_done + 1 where id = p_client_id;
  return v_done + 1;
end;
$$;

revoke execute on function public.try_claim_proof_pass(uuid) from public;
grant  execute on function public.try_claim_proof_pass(uuid) to service_role;

-- ── 5. Reserve proof records — atomic per client AND across clients ─────────────────────
-- Returns how many PDL records this proof run may buy: the LEAST of what it asked for, the
-- prospect's remaining 40, and the free-acquisition month's remaining room. 0 = refused.
create or replace function public.try_reserve_proof_records(p_client_id uuid, p_requested int)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rate       numeric := 0.28;   -- PDL $/record, verified 10 Jul (sourcing-fences.ts:6)
  v_client_cap int     := 40;     -- founder-set lifetime proof records per prospect
  v_committed  int;
  v_cap_usd    numeric;
  v_month_usd  numeric;
  v_room       int;
  v_grant      int;
begin
  if p_client_id is null or p_requested is null or p_requested <= 0 then return 0; end if;

  -- ① GLOBAL LOCK FIRST. The singleton money_settings row is the one object every proof
  --    reservation must pass through, which is what serialises DIFFERENT clients. Locking
  --    per-client rows alone would let two prospects each read the same monthly room.
  select coalesce(proof_monthly_cap_usd, 300) into v_cap_usd
    from public.money_settings where id = 1 for update;
  if v_cap_usd is null then return 0; end if;   -- no settings row: fail closed

  -- ② then the prospect's own row. Always this order, so proof callers cannot deadlock.
  select coalesce(proof_records_committed, 0) into v_committed
    from public.clients where id = p_client_id for update;
  if v_committed is null then return 0; end if;

  -- The month sum already includes every outstanding reservation, because the reservation
  -- IS a ledger row. No second counter exists to disagree with it.
  select coalesce(sum(cost_usd), 0) into v_month_usd
    from public.proof_ledger where created_at >= date_trunc('month', now());

  v_room  := greatest(0, floor((v_cap_usd - v_month_usd) / v_rate))::int;
  v_grant := least(p_requested, greatest(0, v_client_cap - v_committed), v_room);
  if v_grant <= 0 then return 0; end if;

  update public.clients
     set proof_records_committed = v_committed + v_grant
   where id = p_client_id;

  insert into public.proof_ledger (client_id, records, cost_usd)
    values (p_client_id, v_grant, v_grant * v_rate);

  return v_grant;
end;
$$;

revoke execute on function public.try_reserve_proof_records(uuid, int) from public;
grant  execute on function public.try_reserve_proof_records(uuid, int) to service_role;

-- ── 6. Release an unused reservation ────────────────────────────────────────────────────
-- Reserve 40, PDL returns 25 -> release 15. ONE call frees both fences: the prospect's
-- lifetime count and the month's room, the latter automatically because the negative
-- ledger row lowers the same sum the reservation raised.
--
-- If this never runs, the reservation simply stands: the prospect and the month are both
-- under-allocated by the unused amount, and neither ceiling can be exceeded. That is the
-- fail-closed behaviour, and it is why the reservation is taken before the provider call.
create or replace function public.release_proof_records(p_client_id uuid, p_records int)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rate      numeric := 0.28;
  v_committed int;
  v_release   int;
begin
  if p_client_id is null or p_records is null or p_records <= 0 then return 0; end if;

  select coalesce(proof_records_committed, 0) into v_committed
    from public.clients where id = p_client_id for update;
  if v_committed is null then return 0; end if;

  -- Never release more than was committed: a double release must not create budget.
  v_release := least(p_records, v_committed);
  if v_release <= 0 then return 0; end if;

  update public.clients
     set proof_records_committed = v_committed - v_release
   where id = p_client_id;

  insert into public.proof_ledger (client_id, records, cost_usd)
    values (p_client_id, -v_release, -(v_release * v_rate));

  return v_release;
end;
$$;

revoke execute on function public.release_proof_records(uuid, int) from public;
grant  execute on function public.release_proof_records(uuid, int) to service_role;
