-- ─────────────────────────────────────────────────────────────────────────────────────────
-- THE CALIBRATED RESTART GETS ITS OWN 20 RECORDS — FOUNDER RULING, 19 Sep 2026
--
-- 🛑 WHAT WAS BROKEN, MEASURED BY THE CANONICAL JOURNEY 8. An operator resolved a client's
-- escalation, recorded the note and granted the one human-authorised calibrated restart. The
-- client's run claimed it — `claim_proof_authority` answered `kind = calibrated_restart` — and
-- then sourced NOTHING: `try_reserve_proof_records` refused with `CLIENT_PROOF_LIMIT_REACHED`
-- because the prospect had already committed 40 of 40 records across their two automatic
-- attempts, and the authority was correctly returned. A real button, a real audit row, and a
-- client who could not get a set.
--
-- ⛓️ TWO FOUNDER RULES DISAGREED, AND NEITHER WAS WRONG:
--   · AR17 (22 Aug) fences the prospect at "40 PDL records per prospect across BOTH passes" —
--     its own words scope the 40 to the two AUTOMATIC attempts — and adds that the ceiling "is
--     a funding decision, never a business ceiling, and it is never raised automatically."
--   · R119 (10–11 Sep) grants a THIRD, human-authorised set after a real resolution, with
--     seven enforcement layers — none of which is this record fence.
-- The fence knew nothing about authority kind, so R119's grant was unusable by construction.
-- Raising it is a funding decision, so it went to the founder as a §1 STOP.
--
-- ── THE RULING, 19 Sep 2026, VERBATIM ────────────────────────────────────────────────────
--
--   "APPROVED: OPTION A. The ONE human-authorised calibrated restart receives its own
--    additional allowance of: 20 RECORDS."
--
--   · "The original automatic Proof fence remains 40 records across those two automatic
--     attempts." · "The two automatic attempts remain USED. They are NOT reset." · "There is
--     NO automatic attempt 3." · "Once — and only once — a valid `calibrated_restart` authority
--     has been granted, that restart may reserve/source up to an additional 20 records."
--   · "The extra 20 MUST NOT be available before the calibrated restart is granted." · "It MUST
--     NOT be available to ordinary automatic Proof." · "It MUST NOT be reusable after the
--     calibrated restart has been successfully consumed." · "A second calibrated restart remains
--     forbidden." · "`proof_passes_done` remains 2."
--
-- ── HOW THE THREE CONDITIONS ARE ENFORCED, AND WHY EACH IS A DATABASE FACT ───────────────
--
--   ① NOT AVAILABLE TO AUTOMATIC PROOF → `p_kind` must be 'calibrated_restart'. The caller
--     passes the kind it was GRANTED by `claim_proof_authority`, never a kind it chose: the
--     route takes `opts.proofKind` from the claim's own `authority.kind`. An automatic pass
--     cannot name itself a restart without the ledger having said so first.
--
--   ② NOT AVAILABLE BEFORE THE GRANT → `clients.proof_calibrated_restart_at IS NOT NULL`. That
--     column transitions from NULL exactly once, enforced by the grant route's own
--     `.is('proof_calibrated_restart_at', null)` write (R119).
--
--   ③ NOT REUSABLE AFTER IT IS CONSUMED → no `proof_pass_claims` row with
--     `authority = 'calibrated_restart' AND status = 'completed'`. That is the durable ledger's
--     own definition of consumed, and `proof_pass_claims_one_completed_restart` (unique on
--     client_id) makes at most one such row possible for the client's lifetime. A FAILED or
--     RELEASED run leaves no completed row, so a retry of the same one restart still has its
--     allowance — which is exactly the existing claim/release semantics the ruling preserves,
--     and is not a second restart: the second GRANT is refused by R119 and the second COMPLETED
--     CLAIM is refused by that unique index.
--
-- ⚠️ IT RAISES THE CEILING FOR NOBODY ELSE. The default is unchanged in every other case: the
-- parameter defaults to 'automatic', so every existing caller — and every automatic pass —
-- still meets `v_client_cap := 40`. The monthly company ceiling is untouched: it is a separate
-- fence, read from `money_settings`, and the restart's 20 pass through it exactly as any other
-- records do.
--
-- ⚠️ EXPAND ONLY AND REVERSIBLE: one function replaced by `CREATE OR REPLACE`, one new
-- defaulted parameter. No column, no index, no CHECK, no backfill, no row touched. The old
-- two-argument signature is DROPPED after the new one exists, because leaving both would let a
-- caller reach the pre-ruling behaviour by arity alone.
--
-- Canonical copy of the PENDING_MIGRATIONS entry `20260919_calibrated_restart_record_allowance`.
-- ─────────────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.try_reserve_proof_records(
  p_client_id uuid,
  p_requested int,
  p_kind      text DEFAULT 'automatic'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
declare
  v_client_cap    int := 40;
  v_restart_bonus int := 20;
  v_committed     int;
  v_client_room   int;
  v_cap_records   int;
  v_month_records int;
  v_month         date := (date_trunc('month', now()))::date;
  v_room          int;
  v_grant         int;
  v_res_id        uuid;
  v_granted_at    timestamptz;
  v_consumed      boolean;
begin
  if p_client_id is null or p_requested is null or p_requested <= 0 then
    return jsonb_build_object('granted', 0, 'reservation_id', null, 'reason', 'FAIL_CLOSED_BAD_ARGS');
  end if;

  select coalesce(proof_monthly_cap_records, 1071)
    into v_cap_records
    from public.money_settings where id = 1 for update;

  if v_cap_records is null then
    return jsonb_build_object('granted', 0, 'reservation_id', null, 'reason', 'FAIL_CLOSED_NO_MONEY_SETTINGS');
  end if;

  select coalesce(proof_records_committed, 0), proof_calibrated_restart_at
    into v_committed, v_granted_at
    from public.clients where id = p_client_id for update;
  if v_committed is null then
    return jsonb_build_object('granted', 0, 'reservation_id', null, 'reason', 'FAIL_CLOSED_UNKNOWN_CLIENT');
  end if;

  -- ── THE ONE HUMAN-AUTHORISED RESTART'S OWN 20 RECORDS (founder ruling, 19 Sep 2026) ────
  --
  -- All three conditions must hold together, and every one of them is a durable fact written
  -- by somebody else: the kind comes from the claim ledger, the grant from the operator's
  -- one-time write, and "not yet consumed" from the completed-claim row the ledger settles.
  if p_kind = 'calibrated_restart' and v_granted_at is not null then
    select exists (
      select 1 from public.proof_pass_claims
       where client_id = p_client_id
         and authority = 'calibrated_restart'
         and status    = 'completed'
    ) into v_consumed;

    if not v_consumed then
      v_client_cap := v_client_cap + v_restart_bonus;
    end if;
  end if;

  v_client_room := greatest(0, v_client_cap - v_committed);
  if v_client_room <= 0 then
    return jsonb_build_object('granted', 0, 'reservation_id', null, 'reason', 'CLIENT_PROOF_LIMIT_REACHED');
  end if;

  select coalesce(sum(records), 0) into v_month_records
    from public.proof_ledger where budget_month = v_month;

  v_room := greatest(0, v_cap_records - v_month_records);
  if v_room <= 0 then
    return jsonb_build_object('granted', 0, 'reservation_id', null, 'reason', 'MONTHLY_PROOF_BUDGET_REACHED');
  end if;

  v_grant := least(p_requested, v_client_room, v_room);
  if v_grant <= 0 then
    return jsonb_build_object('granted', 0, 'reservation_id', null, 'reason', 'FAIL_CLOSED_BAD_ARGS');
  end if;

  update public.clients
     set proof_records_committed = v_committed + v_grant
   where id = p_client_id;

  insert into public.proof_ledger (client_id, records, cost_usd, budget_month)
    values (p_client_id, v_grant, 0, v_month)
    returning id into v_res_id;

  return jsonb_build_object('granted', v_grant, 'reservation_id', v_res_id, 'reason', 'GRANTED');
end;
$$;

-- 🛑 THE OLD TWO-ARGUMENT SIGNATURE IS REMOVED. PostgreSQL keeps overloads side by side, so
-- leaving it would mean a caller could reach the pre-ruling fence by passing two arguments —
-- a second definition of the same rule, which is the drift this repo keeps paying for. Every
-- caller either omits the kind (and gets the default 'automatic') or names it.
DROP FUNCTION IF EXISTS public.try_reserve_proof_records(uuid, int);

REVOKE EXECUTE ON FUNCTION public.try_reserve_proof_records(uuid, int, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.try_reserve_proof_records(uuid, int, text) TO service_role;

COMMENT ON FUNCTION public.try_reserve_proof_records(uuid, int, text) IS
  'The free-proof ENTITLEMENT fence, counted in RECORDS: 40 per prospect across the two AUTOMATIC attempts (AR17), plus a monthly company ceiling. FOUNDER RULING 19 Sep 2026: the ONE human-authorised calibrated restart (R119) carries its own additional 20 records — available only when p_kind = calibrated_restart (the kind claim_proof_authority granted), only once clients.proof_calibrated_restart_at is set, and only while no completed calibrated_restart claim exists. proof_passes_done remains 2 and there is no automatic attempt 3.';
