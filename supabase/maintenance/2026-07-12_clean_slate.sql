-- ============================================================================
-- CLEAN SLATE — wipe every test/junk account, keep ONLY hello@get-kind.com,
--               and purge every non-bought record from the lead pool.
--
-- ⚠️  DESTRUCTIVE. Run each PHASE separately, in order, in the Supabase SQL
--     editor against PRODUCTION. Read PHASE A output BEFORE running PHASE B.
--     This is NOT a migration — it is a one-time founder-run maintenance script.
--
-- Why it's safe to cascade from clients: clients.user_id → auth.users is
-- ON DELETE CASCADE, and every dependent table (leads, campaigns, enrollments,
-- reveals, sourcing_ledger, credit_transactions, icps, members, …) references
-- clients(id) ON DELETE CASCADE. So deleting a client removes its entire tree.
-- The one exception (opt_out_blocklist.blocked_by_client_id, no cascade) is
-- nulled defensively in PHASE B before the delete.
-- ============================================================================


-- ┌────────────────────────────────────────────────────────────────────────┐
-- │ PHASE A — PREVIEW (read-only, deletes NOTHING). Run this first.          │
-- │ Confirm the "survivor" query returns EXACTLY your hello@get-kind.com     │
-- │ account. If it returns 0 rows, STOP — do not run PHASE B.                │
-- └────────────────────────────────────────────────────────────────────────┘

-- A1 · Every client that PHASE B will DELETE (everyone except hello@):
select c.id, c.company_name, u.email, c.is_demo, c.created_at,
       (select count(*) from public.leads l              where l.client_id = c.id) as leads,
       (select count(*) from public.figsy_enrollments e  where e.client_id = c.id) as enrollments
from public.clients c
left join auth.users u on u.id = c.user_id
where lower(coalesce(u.email, '')) <> 'hello@get-kind.com'
order by c.created_at;

-- A2 · The ONE survivor (MUST be exactly your account — if empty, STOP):
select c.id, c.company_name, u.email
from public.clients c
join auth.users u on u.id = c.user_id
where lower(u.email) = 'hello@get-kind.com';

-- A3 · Pool composition today (only 'pdl' rows survive PHASE C):
select coalesce(source, '(null)') as source, count(*)
from public.lead_pool group by 1 order by 2 desc;

-- A4 · How many auth logins PHASE B will remove (owners of doomed clients):
select count(distinct c.user_id) as auth_users_to_delete
from public.clients c
left join auth.users u on u.id = c.user_id
where lower(coalesce(u.email, '')) <> 'hello@get-kind.com';

-- A5 · Orphan auth users (signed up, never became a client). The script does NOT
--      touch these (an admin-only login could live here). Review and delete
--      manually via Supabase → Authentication if you want them gone.
select u.id, u.email, u.created_at
from auth.users u
where not exists (select 1 from public.clients c where c.user_id = u.id)
  and lower(u.email) <> 'hello@get-kind.com'
order by u.created_at;


-- ┌────────────────────────────────────────────────────────────────────────┐
-- │ PHASE B — CLIENT PURGE. Deletes every client except hello@get-kind.com,  │
-- │ their whole data tree (via cascade), and their auth logins. One          │
-- │ transaction: if anything errors, NOTHING is deleted. Re-run safe.        │
-- └────────────────────────────────────────────────────────────────────────┘
begin;

  -- The doomed set: every client whose owning auth email is not hello@.
  create temp table _doomed on commit drop as
  select c.id as client_id, c.user_id
  from public.clients c
  left join auth.users u on u.id = c.user_id
  where lower(coalesce(u.email, '')) <> 'hello@get-kind.com';

  -- Guard: never let the survivor query be empty (would mean we're deleting
  -- everything incl. hello@). Abort if hello@ has no client row.
  do $$
  begin
    if not exists (
      select 1 from public.clients c
      join auth.users u on u.id = c.user_id
      where lower(u.email) = 'hello@get-kind.com'
    ) then
      raise exception 'ABORT: hello@get-kind.com has no client row — refusing to delete every account. Fix the survivor first.';
    end if;
  end $$;

  -- Defensive: null the non-cascading references before deleting.
  update public.opt_out_blocklist
     set blocked_by_client_id = null
   where blocked_by_client_id in (select client_id from _doomed);

  -- client_members.invited_by references auth.users with NO cascade — if a
  -- surviving member row was invited by a doomed user, the auth delete would
  -- fail and roll everything back. Null it first.
  update public.client_members
     set invited_by = null
   where invited_by in (select user_id from _doomed where user_id is not null);

  -- Delete the doomed clients → cascades to their entire data tree.
  delete from public.clients where id in (select client_id from _doomed);

  -- Delete their auth logins (skip nulls; never hello@).
  delete from auth.users
   where id in (select user_id from _doomed where user_id is not null)
     and lower(email) <> 'hello@get-kind.com';

commit;

-- Proof (run after commit): should show ~1 client and only your account.
select count(*) as clients_remaining from public.clients;
select c.company_name, u.email
from public.clients c join auth.users u on u.id = c.user_id;


-- ┌────────────────────────────────────────────────────────────────────────┐
-- │ PHASE C — POOL PURGE. Keep only genuinely BOUGHT records (source='pdl'). │
-- │ Removes 'backfill' (swept-in / fabricated) and any other provenance.     │
-- └────────────────────────────────────────────────────────────────────────┘
delete from public.lead_pool where source is distinct from 'pdl';

-- Proof: the pool now contains ONLY bought records. This count is the truth.
select coalesce(source, '(null)') as source, count(*)
from public.lead_pool group by 1 order by 2 desc;
select count(*) as pool_total_after from public.lead_pool;
