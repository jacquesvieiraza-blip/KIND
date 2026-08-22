-- ── FREE REAL-LEAD PROOF — THE ACQUISITION FENCE (22 Aug 2026, corrected same day) ──────
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
-- ⚠️ THE FOUR RACES THIS EXISTS TO CLOSE. Two were found in review before any code was
-- written, two more by independent review of the first implementation:
--   1. PER CLIENT. read spent -> compute remaining -> call PDL -> increment is NOT a fence:
--      two overlapping runs both read the same remaining budget and both spend it. Fixed by
--      deciding and committing inside one transaction under a row lock.
--   2. ACROSS CLIENTS. Locking client A's row does nothing to serialise client B. With 50
--      records of monthly room, A and B could each be authorised 40 -- 80 total. Fixed by
--      taking the lock on the SINGLETON money_settings row FIRST, so every proof
--      reservation in the system passes through one critical section.
--   3. RECONCILIATION REPLAY. The first release took a client id and a count and
--      decremented the AGGREGATE. Reserve 40, consume 25, release 15 -> committed 25; retry
--      the SAME reconciliation -> committed 10, though 25 real records were bought. A
--      retried job literally manufactured acquisition authority -- and with two
--      reservations for one client, reconciling one could release the other's. Fixed:
--      every reservation is its own ledger row, reconciliation addresses THAT row by id,
--      and a row reconciles exactly once. A replay is a true no-op.
--   4. MONTH-END LEAK. Sums keyed on created_at push an August reservation's September
--      correction into September, so September opened with negative spend and more than
--      the configured budget of real authority. Fixed: every reservation carries a FIXED
--      budget_month stamped at creation; its correction inherits that month; and the
--      monthly room is summed over budget_month, never over when a row happened to land.
--
-- Lock order is always money_settings (global) then clients (per client); the release path
-- locks its reservation row then the client, and never money_settings. One order per path,
-- no cycle, so proof callers cannot deadlock each other. try_spend_sourcing reads
-- money_settings with a plain SELECT and never locks it, so the paid path is not blocked.
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

-- ── 3. The proof ledger — every RESERVATION is a row, and the row is the token ──────────
-- Separate from sourcing_ledger on purpose (see header). A positive row IS a reservation:
-- its id is the identity a reconciliation must name, budget_month pins which month's
-- ceiling it consumed, and reconciled_at makes reconciliation once-only. Negative rows are
-- corrections, carry reservation_id back to the row they correct, and inherit its
-- budget_month -- so a late reconciliation can never leak authority into a newer month.
create table if not exists public.proof_ledger (
  id               uuid primary key default uuid_generate_v4(),
  client_id        uuid not null references public.clients(id) on delete cascade,
  records          int  not null,
  cost_usd         numeric not null,
  -- The month whose ceiling this row counts against. Stamped at creation, inherited by the
  -- correction, NEVER derived from when a later event happened to run.
  budget_month     date not null default (date_trunc('month', now()))::date,
  -- Corrections only: the reservation row this negative row reconciles.
  reservation_id   uuid references public.proof_ledger(id),
  -- Reservations only: set exactly once, by the one reconciliation this row may ever have.
  reconciled_at    timestamptz,
  released_records int not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists proof_ledger_budget_month_idx on public.proof_ledger (budget_month);
create index if not exists proof_ledger_client_idx on public.proof_ledger (client_id, created_at desc);

alter table public.proof_ledger enable row level security;

comment on table public.proof_ledger is
  'Free-proof acquisition PDL spend. A positive row IS a reservation (made BEFORE the provider call) and its id is the token a reconciliation must name; a negative row is that reservation''s once-only correction and inherits its budget_month. The month sum of cost_usd over budget_month is the authority for the free-acquisition ceiling. Never mixed with sourcing_ledger, which fences paid delivery.';

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
-- Returns jsonb: { "granted": n, "reservation_id": uuid, "reason": text }. granted is the
-- LEAST of what was asked for, the prospect's remaining 40, and the month's remaining room;
-- 0 = refused and reservation_id is null. The caller MUST carry reservation_id to the
-- reconciliation: a release addresses one reservation, never a client aggregate.
--
-- ⚠️ WHY THE REASON IS RETURNED RATHER THAN INFERRED BY THE CALLER (round 3).
-- A granted of 0 on its own says only "you got nothing". It does not say whether THIS
-- prospect has used their own 40 lifetime records -- routine, expected, and costing K.I.N.D
-- nothing -- or whether the MONTH'S $300 ACQUISITION CEILING is gone, which is rare, urgent
-- and needs the founder. The first implementation could not tell them apart, so it raised
-- "the free-proof acquisition budget is spent" on every zero, including the common one. An
-- alert that fires on a routine event is an alert nobody reads on the day it is true.
--
-- The reason is computed INSIDE the same locked section, from the same numbers that decided
-- the grant, so it can never disagree with the decision it explains and is never re-derived
-- by a second query reading a different instant. Values:
--   GRANTED                       records were reserved (possibly fewer than requested).
--   CLIENT_PROOF_LIMIT_REACHED    this prospect has committed all 40 of their records.
--   MONTHLY_PROOF_BUDGET_REACHED  the month's acquisition ceiling has no room left.
--   FAIL_CLOSED_BAD_ARGS          nothing was asked for; nothing reserved, nothing spent.
--   FAIL_CLOSED_NO_MONEY_SETTINGS the singleton settings row is missing -> refuse.
--   FAIL_CLOSED_UNKNOWN_CLIENT    no such client row -> refuse.
--
-- ⚠️ ORDER MATTERS: the CLIENT'S own limit is tested FIRST. A prospect sitting at 40 tells
-- you nothing whatsoever about the $300, so reporting that case as a budget exhaustion
-- would be a false statement about company money.
create or replace function public.try_reserve_proof_records(p_client_id uuid, p_requested int)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rate        numeric := 0.28;   -- PDL $/record, verified 10 Jul (sourcing-fences.ts:6)
  v_client_cap  int     := 40;     -- founder-set lifetime proof records per prospect
  v_committed   int;
  v_client_room int;
  v_cap_usd     numeric;
  v_month_usd   numeric;
  v_month       date := (date_trunc('month', now()))::date;
  v_room        int;
  v_grant       int;
  v_res_id      uuid;
begin
  if p_client_id is null or p_requested is null or p_requested <= 0 then
    return jsonb_build_object('granted', 0, 'reservation_id', null, 'reason', 'FAIL_CLOSED_BAD_ARGS');
  end if;

  -- ① GLOBAL LOCK FIRST. The singleton money_settings row is the one object every proof
  --    reservation must pass through, which is what serialises DIFFERENT clients. Locking
  --    per-client rows alone would let two prospects each read the same monthly room.
  select coalesce(proof_monthly_cap_usd, 300) into v_cap_usd
    from public.money_settings where id = 1 for update;
  if v_cap_usd is null then
    return jsonb_build_object('granted', 0, 'reservation_id', null, 'reason', 'FAIL_CLOSED_NO_MONEY_SETTINGS');
  end if;

  -- ② then the prospect's own row. Always this order, so proof callers cannot deadlock.
  select coalesce(proof_records_committed, 0) into v_committed
    from public.clients where id = p_client_id for update;
  if v_committed is null then
    return jsonb_build_object('granted', 0, 'reservation_id', null, 'reason', 'FAIL_CLOSED_UNKNOWN_CLIENT');
  end if;

  -- THE PROSPECT'S OWN CEILING, ANSWERED BEFORE THE COMPANY'S. This is the common refusal
  -- and it is not a money event: the prospect has had their two passes' worth of records.
  v_client_room := greatest(0, v_client_cap - v_committed);
  if v_client_room <= 0 then
    return jsonb_build_object('granted', 0, 'reservation_id', null, 'reason', 'CLIENT_PROOF_LIMIT_REACHED');
  end if;

  -- THIS month's authority: summed over budget_month, so an old month's late correction
  -- can never inflate the current month's room. Outstanding reservations are already in
  -- the sum, because the reservation IS a ledger row.
  select coalesce(sum(cost_usd), 0) into v_month_usd
    from public.proof_ledger where budget_month = v_month;

  v_room := greatest(0, floor((v_cap_usd - v_month_usd) / v_rate))::int;
  if v_room <= 0 then
    -- THE ONE THAT IS ACTUALLY A COMPANY EVENT. Free acquisition has stopped for everybody
    -- until the founder raises the ceiling, so this -- and only this -- raises the alert.
    return jsonb_build_object('granted', 0, 'reservation_id', null, 'reason', 'MONTHLY_PROOF_BUDGET_REACHED');
  end if;

  v_grant := least(p_requested, v_client_room, v_room);
  if v_grant <= 0 then
    -- Unreachable: all three inputs are > 0 above. Kept as a fail-closed floor so a future
    -- edit to any of them can only ever under-allow.
    return jsonb_build_object('granted', 0, 'reservation_id', null, 'reason', 'FAIL_CLOSED_BAD_ARGS');
  end if;

  update public.clients
     set proof_records_committed = v_committed + v_grant
   where id = p_client_id;

  insert into public.proof_ledger (client_id, records, cost_usd, budget_month)
    values (p_client_id, v_grant, v_grant * v_rate, v_month)
    returning id into v_res_id;

  return jsonb_build_object('granted', v_grant, 'reservation_id', v_res_id, 'reason', 'GRANTED');
end;
$$;

revoke execute on function public.try_reserve_proof_records(uuid, int) from public;
grant  execute on function public.try_reserve_proof_records(uuid, int) to service_role;

-- ── 6. Reconcile ONE reservation — once, by id, in its own month ────────────────────────
-- Reserve 40, PDL returns 25 -> release 15 AGAINST THAT RESERVATION. The row is marked
-- reconciled and can never release again: a replayed job, a double webhook or a second
-- reconciliation is a true no-op, so authority can never be recreated after the records
-- were genuinely bought. The correction inherits the reservation's budget_month, so an
-- August reservation reconciled on 1 Sep corrects AUGUST -- September opens with exactly
-- its configured budget.
--
-- If this never runs, the reservation simply stands: the prospect and the month are both
-- under-allocated by the unused amount, and neither ceiling can be exceeded. That is the
-- fail-closed behaviour, and it is why the reservation is taken before the provider call.
create or replace function public.release_proof_records(p_reservation_id uuid, p_records int)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row       public.proof_ledger%rowtype;
  v_rate      numeric;
  v_committed int;
  v_release   int;
begin
  if p_reservation_id is null or p_records is null or p_records <= 0 then return 0; end if;

  -- Lock THE reservation row. Everything below is scoped to it and nothing else.
  select * into v_row from public.proof_ledger where id = p_reservation_id for update;
  if not found then return 0; end if;
  if v_row.records <= 0 then return 0; end if;             -- corrections are not reservations
  if v_row.reconciled_at is not null then return 0; end if; -- ONCE. A replay is a no-op.

  -- Clamp to THIS reservation's size: reconciling A can never release B's authority.
  v_release := least(p_records, v_row.records);
  v_rate    := v_row.cost_usd / v_row.records;             -- the rate this reservation was booked at

  update public.proof_ledger
     set reconciled_at = now(), released_records = v_release
   where id = p_reservation_id;

  select coalesce(proof_records_committed, 0) into v_committed
    from public.clients where id = v_row.client_id for update;
  update public.clients
     set proof_records_committed = greatest(0, v_committed - v_release)
   where id = v_row.client_id;

  -- The correction lands in the RESERVATION'S month. Never the current one.
  insert into public.proof_ledger (client_id, records, cost_usd, budget_month, reservation_id)
    values (v_row.client_id, -v_release, -(v_release * v_rate), v_row.budget_month, v_row.id);

  return v_release;
end;
$$;

revoke execute on function public.release_proof_records(uuid, int) from public;
grant  execute on function public.release_proof_records(uuid, int) to service_role;
