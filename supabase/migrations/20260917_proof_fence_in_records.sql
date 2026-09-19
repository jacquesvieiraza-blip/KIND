-- ═════════════════════════════════════════════════════════════════════════════════════════
-- J5-C9 · THE FREE-PROOF FENCE IS COUNTED IN RECORDS, NOT IN PDL DOLLARS
--
-- ── EXPAND / CONTRACT ───────────────────────────────────────────────────────────────────
-- **PHASE: EXPAND, plus two `CREATE OR REPLACE FUNCTION` bodies.**
--
-- ADDS one nullable column (`money_settings.proof_monthly_cap_records`) and a ONE-TIME unit
-- translation into it. Drops nothing, renames nothing, and leaves `proof_monthly_cap_usd`
-- exactly where it is — a historic figure, still readable, describing the ledger rows that
-- were genuinely booked in dollars.
--
-- **THE CONTRACT PHASE IS A LATER, SEPARATE MIGRATION**: dropping `proof_monthly_cap_usd`
-- and the `cost_usd` column on `proof_ledger` once nothing reads them. Nothing here does
-- that, because rows already written in dollars are the only record of money genuinely spent.
--
-- **ABSENT-COLUMN TOLERANCE IS IN BOTH DIRECTIONS.** `try_reserve_proof_records` below reads
-- the new column with a COALESCE onto a translation of the old one, so it behaves correctly
-- whether or not the `ADD COLUMN` has been applied. `icps.ts`'s alert reads whichever column
-- answers and says which. Neither treats a missing column as a zero ceiling — that would
-- refuse all free Proof, which is the loud-but-wrong direction.
--
-- ── WHAT EARNED IT (FD-6) ───────────────────────────────────────────────────────────────
--
-- The fence was denominated in PDL money. `v_rate numeric := 0.28` — "PDL $/record, verified
-- 10 Jul" — converted a $300 monthly ceiling into a number of records, and every reservation
-- wrote `records * 0.28` into `proof_ledger.cost_usd`.
--
-- The founder's ruling of 17 Sep: **"PDL IS NOT A PAID/ACTIVE PROVIDER FOR MVP1. We are not
-- paying for PDL."** So every part of that arithmetic became fiction:
--
--   ① **THE RATE IS FOR A VENDOR WE DO NOT BUY FROM.** Apollo's People Search costs nothing;
--      the credit is the email reveal, and a free Proof set shows MASKED cards precisely so
--      it reveals nobody. A Proof run's true provider cost is $0.
--   ② **SO THE CEILING STOPPED BINDING.** With `cost_usd` telling the truth ($0), the room
--      calculation `floor((cap - month_spend) / rate)` divides an untouched budget by a rate
--      that buys nothing — an unbounded fence. Leaving the fiction in place is what kept it
--      bounded, which is the worst of both: a limit that works only while the number is wrong.
--   ③ **AND IT MISREPORTED THE REFUSAL.** `MONTHLY_PROOF_BUDGET_REACHED` told the founder a
--      $300 acquisition budget was spent. Under FD-6 no dollars are spent at all, so the
--      operator was sent to raise a budget that was not the constraint.
--
-- ── THE TRANSLATION, AND WHY IT IS NOT A NEW DECISION ───────────────────────────────────
--
-- AR17 fences the PROSPECT at 40 records for life, and that is already counted in records —
-- untouched here. The MONTHLY ceiling is the half that was in dollars, and it is translated
-- once, at the rate the dollars were always divided by:
--
--     floor(proof_monthly_cap_usd / 0.28)  →  floor(300 / 0.28)  =  1071 records
--
-- So the operative limit on the day this applies is the SAME limit as the day before. The
-- unit becomes honest; the number does not move. **Choosing a different monthly record
-- ceiling is the founder's decision and is not made here** — this migration only stops the
-- product from expressing his existing decision in a currency it no longer spends.
--
-- ⚠️ THE 0.28 IN THIS FILE IS HISTORIC ARITHMETIC, NOT A LIVE RATE. It appears exactly once,
-- in the one-time backfill, to reproduce a limit that was set in dollars. No function body
-- below multiplies by it, and nothing at runtime reads it.
--
-- ── WHAT APOLLO CREDIT TRUTH MEANS HERE ─────────────────────────────────────────────────
--
-- A database function cannot ask Apollo how many credits are left, and it must not pretend
-- to. The credit fence therefore lives where the provider answers: a 402 or a credit-bearing
-- 422 is classified by `classifyProviderFailure`, releases the reservation, records
-- `quota_exhausted`, and raises a Vida task naming the top-up. This function's job is the
-- ENTITLEMENT — 40 per prospect for life, and a monthly company ceiling in records.
--
-- ⚠️ IDEMPOTENT. `ADD COLUMN IF NOT EXISTS`, a backfill guarded on `IS NULL`, and
-- `CREATE OR REPLACE` bodies. Nothing here tracks what has been applied, so every statement
-- must survive a re-run.
-- ═════════════════════════════════════════════════════════════════════════════════════════


-- ── ① THE MONTHLY CEILING, IN RECORDS ───────────────────────────────────────────────────

ALTER TABLE public.money_settings
  ADD COLUMN IF NOT EXISTS proof_monthly_cap_records int;

COMMENT ON COLUMN public.money_settings.proof_monthly_cap_records IS
  'J5-C9 / FD-6: the free-proof ACQUISITION ceiling per calendar month, counted in RECORDS. Replaces proof_monthly_cap_usd, which denominated the same limit in PDL dollars at $0.28 a record — a rate for a provider we no longer buy from, which made the fence unbounded the moment the cost told the truth. Founder-set; never raised automatically. The per-prospect lifetime cap (40, AR17) is separate and was always counted in records.';

-- THE ONE-TIME UNIT TRANSLATION. Guarded on NULL, so a re-run cannot overwrite a value the
-- founder has since set by hand.
UPDATE public.money_settings
   SET proof_monthly_cap_records = GREATEST(1, FLOOR(COALESCE(proof_monthly_cap_usd, 300) / 0.28)::int)
 WHERE id = 1
   AND proof_monthly_cap_records IS NULL;

COMMENT ON COLUMN public.money_settings.proof_monthly_cap_usd IS
  'HISTORIC (J5-C9, 17 Sep): the free-proof acquisition ceiling as it was expressed while PDL was the provider — $300/month at $0.28 a record. Kept because proof_ledger rows written before FD-6 record dollars genuinely committed, and a ceiling with no unit makes them unreadable. NOT the live fence: that is proof_monthly_cap_records.';


-- ── ② THE RESERVATION, WITH NO RATE IN IT ───────────────────────────────────────────────
--
-- Same name, same signature, same return shape, same reason strings — so every existing
-- caller, guard and test reads it identically. Three things change inside:
--   · the monthly room is a count of RECORDS, summed from `proof_ledger.records`;
--   · nothing is multiplied by a rate;
--   · a new row books `cost_usd = 0`, because that is what an Apollo-sourced record costs.

CREATE OR REPLACE FUNCTION public.try_reserve_proof_records(p_client_id uuid, p_requested int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
declare
  -- AR17, founder-set: lifetime proof records per prospect. Unchanged, and it was always
  -- counted in records rather than money.
  v_client_cap    int := 40;
  v_committed     int;
  v_client_room   int;
  v_cap_records   int;
  v_month_records int;
  v_month         date := (date_trunc('month', now()))::date;
  v_room          int;
  v_grant         int;
  v_res_id        uuid;
begin
  if p_client_id is null or p_requested is null or p_requested <= 0 then
    return jsonb_build_object('granted', 0, 'reservation_id', null, 'reason', 'FAIL_CLOSED_BAD_ARGS');
  end if;

  -- ① GLOBAL LOCK FIRST. The singleton money_settings row is the one object every proof
  --    reservation must pass through, which is what serialises DIFFERENT clients. Locking
  --    per-client rows alone would let two prospects each read the same monthly room.
  --
  -- ⚠️ ABSENT-VALUE TOLERANCE, IN THE SAFE DIRECTION, AND WITH NO RATE IN THE BODY.
  --
  -- The column cannot be missing when this body is live: the `ADD COLUMN` above is in the
  -- same file, and both the Vida runner and `psql --single-transaction` send a file as ONE
  -- transaction, so either both landed or neither did. What CAN be null is the value — a
  -- `money_settings` row created after the backfill ran.
  --
  -- ⚠️ SO THE DEFAULT IS A LITERAL, NOT ARITHMETIC. `DEFAULT_CAP_RECORDS` is the translation
  -- of the historic $300-at-$0.28 ceiling, computed ONCE in this file's backfill and written
  -- here as the number it produced. Dividing by 0.28 at runtime would leave a rate for a
  -- provider we do not buy from inside the deployed fence — which is the whole thing J5-C9
  -- removes, and a test reads `pg_get_functiondef` to prove it is gone.
  --
  -- A missing ceiling is NEVER read as zero: that would refuse all free Proof, which is loud
  -- but wrong.
  select coalesce(proof_monthly_cap_records, 1071)
    into v_cap_records
    from public.money_settings where id = 1 for update;

  if v_cap_records is null then
    return jsonb_build_object('granted', 0, 'reservation_id', null, 'reason', 'FAIL_CLOSED_NO_MONEY_SETTINGS');
  end if;

  -- ② then the prospect's own row. Always this order, so proof callers cannot deadlock.
  select coalesce(proof_records_committed, 0) into v_committed
    from public.clients where id = p_client_id for update;
  if v_committed is null then
    return jsonb_build_object('granted', 0, 'reservation_id', null, 'reason', 'FAIL_CLOSED_UNKNOWN_CLIENT');
  end if;

  -- THE PROSPECT'S OWN CEILING, ANSWERED BEFORE THE COMPANY'S. This is the common refusal
  -- and it is not a company event: the prospect has had their two passes' worth of records.
  v_client_room := greatest(0, v_client_cap - v_committed);
  if v_client_room <= 0 then
    return jsonb_build_object('granted', 0, 'reservation_id', null, 'reason', 'CLIENT_PROOF_LIMIT_REACHED');
  end if;

  -- THIS month's authority, IN RECORDS. Summed over budget_month, so an old month's late
  -- correction can never inflate the current month's room. Outstanding reservations are
  -- already in the sum, because the reservation IS a ledger row — and a release writes a
  -- NEGATIVE records row, so the sum self-corrects without a rate anywhere in it.
  select coalesce(sum(records), 0) into v_month_records
    from public.proof_ledger where budget_month = v_month;

  v_room := greatest(0, v_cap_records - v_month_records);
  if v_room <= 0 then
    -- THE ONE THAT IS ACTUALLY A COMPANY EVENT. Free acquisition has stopped for everybody
    -- until the founder raises the ceiling, so this — and only this — raises the alert. The
    -- reason string is UNCHANGED so no caller has to learn a new one; what changed is that
    -- it is now true about a record count rather than about dollars nobody spent.
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

  -- ⚠️ `cost_usd = 0`, AND THAT IS THE HONEST FIGURE. An Apollo People Search costs nothing;
  -- the credit is the email reveal, and a free Proof set shows masked cards precisely so it
  -- reveals nobody. The column is kept so historic rows stay readable — see its comment.
  insert into public.proof_ledger (client_id, records, cost_usd, budget_month)
    values (p_client_id, v_grant, 0, v_month)
    returning id into v_res_id;

  return jsonb_build_object('granted', v_grant, 'reservation_id', v_res_id, 'reason', 'GRANTED');
end;
$$;

REVOKE EXECUTE ON FUNCTION public.try_reserve_proof_records(uuid, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.try_reserve_proof_records(uuid, int) TO service_role;

COMMENT ON FUNCTION public.try_reserve_proof_records(uuid, int) IS
  'J5-C9 / FD-6. The free-proof ENTITLEMENT fence, counted in RECORDS: 40 per prospect for life (AR17) and a monthly company ceiling in records. No provider rate appears in it. Apollo credit exhaustion is not this function''s business and it does not pretend otherwise — a 402 or credit-bearing 422 is classified at the caller, releases the reservation, records quota_exhausted and raises a Vida task.';


-- ── ③ THE RELEASE, WITH NO RATE EITHER ──────────────────────────────────────────────────
--
-- ⛓️ WHY IT HAD TO CHANGE TOO. It computed `v_rate := v_row.cost_usd / v_row.records` — "the
-- rate this reservation was booked at" — and wrote `-(v_release * v_rate)`. Against a
-- reservation booked at $0 that is a division yielding 0, which is harmless; against a
-- reservation with ZERO records it is a division by zero, and the `v_row.records <= 0` guard
-- above it is the only thing that has ever stood between this function and that. Removing
-- the rate removes the hazard with it.
--
-- The RECORDS half — which is the authority — is unchanged: clamp to this reservation, mark
-- it reconciled once, give the prospect their committed records back, and write the negative
-- row in the RESERVATION'S month rather than the current one.

CREATE OR REPLACE FUNCTION public.release_proof_records(p_reservation_id uuid, p_records int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
declare
  v_row       public.proof_ledger%rowtype;
  v_committed int;
  v_release   int;
begin
  if p_reservation_id is null or p_records is null or p_records <= 0 then return 0; end if;

  -- Lock THE reservation row. Everything below is scoped to it and nothing else.
  select * into v_row from public.proof_ledger where id = p_reservation_id for update;
  if not found then return 0; end if;
  if v_row.records <= 0 then return 0; end if;              -- corrections are not reservations
  if v_row.reconciled_at is not null then return 0; end if;  -- ONCE. A replay is a no-op.

  -- Clamp to THIS reservation's size: reconciling A can never release B's authority.
  v_release := least(p_records, v_row.records);

  update public.proof_ledger
     set reconciled_at = now(), released_records = v_release
   where id = p_reservation_id;

  select coalesce(proof_records_committed, 0) into v_committed
    from public.clients where id = v_row.client_id for update;
  update public.clients
     set proof_records_committed = greatest(0, v_committed - v_release)
   where id = v_row.client_id;

  -- ⚠️ `cost_usd = 0` — NOT a rate-derived figure. A correction to a reservation that cost
  -- nothing is a correction of nothing, and inventing one would put fabricated money back
  -- into a ledger this migration exists to stop fabricating money in.
  --
  -- ⚠️ A HISTORIC RESERVATION, BOOKED IN DOLLARS, IS STILL CORRECTED IN RECORDS. Its own
  -- `cost_usd` stays exactly as it was written; only the release row is zero. The month's
  -- authority is summed from `records`, so the release corrects the authority in full.
  insert into public.proof_ledger (client_id, records, cost_usd, budget_month, reservation_id)
    values (v_row.client_id, -v_release, 0, v_row.budget_month, v_row.id);

  return v_release;
end;
$$;

REVOKE EXECUTE ON FUNCTION public.release_proof_records(uuid, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.release_proof_records(uuid, int) TO service_role;
