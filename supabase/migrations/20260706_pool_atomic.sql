-- #316 — atomic company credit-pool moves.
--
-- The pool↔rep credit moves in routes/company.ts were non-atomic read-then-write
-- (read pool, check, then Promise.all the two updates). Concurrent operations —
-- double-clicking "approve", or allocate racing a rep deactivation/drip — could
-- read the same stale pool and both write, minting or losing credits. These
-- plpgsql functions perform each move in a single statement / locked transaction
-- so the guard and the write can't be interleaved.
--
-- ⚠️ 13 Aug — THIS FILE IS NOW IN `PENDING_MIGRATIONS` (apps/api/src/lib/pending-migrations.ts),
-- the only list that executes. It said "NOT auto-applied — the founder runs this by hand in
-- the Supabase SQL editor" for five weeks, and the Supabase editor has been unreachable that
-- whole time (the GitHub OAuth flag), so "by hand" meant "never". Both call sites fail soft,
-- so a missing function returned `false`/`0` and the owner was told "Not enough in the
-- company pool, or seat not found" — a wrong answer, indistinguishable from a real refusal.
-- Same shape as #383, which shipped a broken send counter for 33 days on exactly this gap.
-- The runner copy is the executable one; this file stays the canonical source (CORE-MAP).

-- Move `p_amount` from the company pool → a rep's seat_budget + credit_balance.
-- The deduction is a single GUARDED update (only succeeds if the pool has enough),
-- so two concurrent calls can never both pass a stale balance check. Returns true
-- on success, false if the pool was short (or the company/amount was invalid).
--
-- ⚠️ #372 FIXED 13 Aug — POOL CREDITS COULD BE DESTROYED.
-- The rep UPDATE had no row-count check and the function returned `true` regardless. A bad
-- or cross-company seat id therefore debited the pool, credited NOBODY, and reported success:
-- the credits simply vanished, and the owner's screen said it had worked. Returning `false`
-- alone would NOT have been enough — the pool debit is already written by then, and a plain
-- RETURN keeps it. So the two writes are now ONE unit: the inner `begin ... exception` block
-- is a SUBTRANSACTION, and raising inside it rolls the pool debit back before the handler
-- returns false. The caller already renders false as "pool short or seat not found", which is
-- the honest message for this case too.
create or replace function allocate_pool_to_rep(p_company_id uuid, p_rep_id uuid, p_amount int)
returns boolean
language plpgsql
as $$
declare
  v_rows int;
begin
  if p_amount is null or p_amount <= 0 then
    return false;
  end if;

  begin
    update companies
       set credit_pool = credit_pool - p_amount
     where id = p_company_id
       and coalesce(credit_pool, 0) >= p_amount;
    get diagnostics v_rows = row_count;

    if v_rows = 0 then
      return false;  -- insufficient pool, or company not found — nothing was written
    end if;

    update clients
       set seat_budget    = coalesce(seat_budget, 0)    + p_amount,
           credit_balance = coalesce(credit_balance, 0) + p_amount
     where id = p_rep_id and company_id = p_company_id;
    get diagnostics v_rows = row_count;

    if v_rows = 0 then
      -- #372: the seat does not exist, or belongs to another company. Raising here
      -- rolls back the pool debit above (subtransaction), so the credits survive.
      raise exception 'allocate_pool_to_rep: seat % is not a member of company %', p_rep_id, p_company_id
        using errcode = 'KIND1';
    end if;

    return true;
  exception when sqlstate 'KIND1' then
    -- The subtransaction is already rolled back: pool restored, nobody credited.
    return false;
  end;
end;
$$;

-- Move a rep's remaining credit_balance back into the company pool and zero the
-- seat. Locks the rep row FOR UPDATE so a concurrent deactivate/allocate can't
-- double-count. Returns the amount reclaimed (0 if none).
create or replace function return_rep_to_pool(p_company_id uuid, p_rep_id uuid)
returns int
language plpgsql
as $$
declare
  v_amount int := 0;
begin
  select coalesce(credit_balance, 0) into v_amount
    from clients
   where id = p_rep_id and company_id = p_company_id
   for update;

  if v_amount is null or v_amount <= 0 then
    return 0;
  end if;

  update clients  set credit_balance = 0                                   where id = p_rep_id and company_id = p_company_id;
  update companies set credit_pool   = coalesce(credit_pool, 0) + v_amount where id = p_company_id;

  return v_amount;
end;
$$;
