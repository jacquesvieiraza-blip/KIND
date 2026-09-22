-- ══════════════════════════════════════════════════════════════════════════════════════════
-- 🛑 REFINEMENT IS UNLIMITED — founder-locked 22 Sep
--
--     "2. unlimited now."
--     "if Milla cant answer we then say to the client please use drop down boxes on right
--      mannually. we never assume."
--     "we cant guess peoples way of speaking ever"
--
-- ── WHAT THIS CHANGES: ONE LINE ─────────────────────────────────────────────────────────
--
-- `claim_proof_authority` granted an automatic pass only while `v_auto_used < 2`. That
-- ceiling is the whole of the two-pass rule; everything else about the ledger stays exactly
-- as it is. This migration replaces the function with the same body and no ceiling.
--
-- ── WHY THE INDEXES DO NOT MOVE, WHICH IS THE PART WORTH CHECKING ───────────────────────
--
-- `proof_pass_claims_one_completed_automatic` is unique on `(client_id, authority)` where the
-- authority is `automatic_1`, `automatic_2`, … So `automatic_3` and `automatic_9` are simply
-- new values under the SAME index: each pass still completes at most once, for ever, and a
-- failed attempt is still not a used attempt. Had that index enumerated the two names this
-- migration would have needed to rebuild it; it does not, so nothing about the authority
-- guarantees is being relaxed here — only how many of them a client may earn.
--
-- ⚠️ `proof_pass_claims_one_open` IS UNTOUCHED AND IS NOW DOING MORE WORK. One open claim per
-- client, for ever: unlimited passes means unlimited SEQUENTIAL passes, never concurrent
-- ones. A client cannot start a second refinement while the first is in flight, which is the
-- property that stops "unlimited" becoming a way to fan out provider work.
--
-- ── WHAT UNLIMITED COSTS, STATED RATHER THAN DISCOVERED LATER ───────────────────────────
--
-- Apollo's People Search is free and the reveal is not reached at Proof, so the CLIENT pays
-- nothing however many times they refine — which is the point. Each pass does insert rows and
-- run scoring, and scoring is model spend. That cost is OURS and it is uncapped by this
-- change. Founder-ruled with the cost named: a client who refines forty times is a client who
-- is still trying to get their targeting right, and capping that is the opposite of the
-- product. It can be paced later without another migration — the pacing would live in the
-- route, not here.
--
-- ── AND THE CALIBRATED RESTART STOPS BEING A WALL ───────────────────────────────────────
--
-- 🛑 R119's one restart existed BECAUSE there were exactly two automatic passes: both fail →
-- a person steps in. With no ceiling there is no moment where the client is forced into a
-- queue, so the restart is no longer the thing that rescues them — the fields on the right
-- are. The grant is deliberately LEFT IN PLACE rather than removed: it is still a legitimate
-- operator act, it still has its lifetime uniqueness, and ripping a working authority path
-- out of a money-adjacent ledger to tidy up a rule that no longer fires would be a much
-- larger change than this one. What ends is its role as the only way forward.
--
-- ⚠️ NOTHING IS BACKFILLED AND NOTHING IS RESET. `proof_passes_legacy`, the unclassified
-- refusal, the in-flight refusal and the restart-unclassified refusal are all byte-identical
-- to the shipped function. A client mid-anything is unaffected; the next claim they make is
-- simply granted where it would previously have answered `exhausted`.
-- ══════════════════════════════════════════════════════════════════════════════════════════

create or replace function public.claim_proof_authority(p_client_id uuid, p_icp_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_done          int;
  v_legacy        int;
  v_grant_at      timestamptz;
  v_grant_used    timestamptz;
  v_open          uuid;
  v_auto_done     int;
  v_auto_used     int;
  v_authority     text;
  v_claim         uuid;
  v_found         boolean := false;
begin
  if p_client_id is null then
    return jsonb_build_object('ok', false, 'reason', 'bad_args');
  end if;

  select true, coalesce(proof_passes_done, 0), proof_passes_legacy,
         proof_calibrated_restart_at, proof_calibrated_restart_used_at
    into v_found, v_done, v_legacy, v_grant_at, v_grant_used
    from public.clients where id = p_client_id for update;

  if not v_found then
    return jsonb_build_object('ok', false, 'reason', 'unknown_client');
  end if;

  -- ① IN FLIGHT. Grants nothing and advances nothing — the retry safety property.
  --   ⚠️ LOAD-BEARING UNDER "UNLIMITED": passes are unlimited but STRICTLY SEQUENTIAL.
  select id into v_open
    from public.proof_pass_claims
   where client_id = p_client_id and status = 'open'
   limit 1;
  if v_open is not null then
    return jsonb_build_object('ok', false, 'reason', 'in_flight', 'claim_id', v_open);
  end if;

  -- ② THE ZERO BASELINE IS ESTABLISHED EXPLICITLY, NEVER ASSUMED.
  if v_legacy is null then
    if v_done = 0 then
      update public.clients set proof_passes_legacy = 0 where id = p_client_id;
      v_legacy := 0;
    else
      return jsonb_build_object('ok', false, 'reason', 'unclassified');
    end if;
  end if;

  -- ③ A HISTORICAL RESTART CONSUMPTION WE CANNOT READ MUST NOT BE GUESSED EITHER.
  if v_grant_used is not null and not exists (
       select 1 from public.proof_pass_claims
        where client_id = p_client_id and authority = 'calibrated_restart') then
    return jsonb_build_object('ok', false, 'reason', 'restart_unclassified');
  end if;

  -- ④ 🛑 THE AUTOMATIC PASSES — UNLIMITED (22 Sep).
  --
  -- ⛓️ WAS: ~~`if v_auto_used < 2 then`~~, with the ⑤ calibrated-restart branch and the
  -- `exhausted` refusal below it as the only ways past. The count is still taken, because
  -- `automatic_N` has to number itself and `pass` is read by the desk and by Milla's context.
  -- What is gone is the comparison.
  select count(*) into v_auto_done
    from public.proof_pass_claims
   where client_id = p_client_id
     and status = 'completed'
     and authority <> 'calibrated_restart';

  v_auto_used := v_legacy + v_auto_done;

  -- ⑤ 🛑 AN OPERATOR'S GRANTED RESTART IS STILL HONOURED, AND IT IS PREFERRED (R119/R134).
  --
  -- 🛑 THE FIRST VERSION OF THIS MIGRATION DELETED THIS BRANCH BY ACCIDENT — with the
  -- automatic grant unconditional, nothing below it could ever be reached, and the calibrated
  -- restart became dead code. Journey 8 caught it. The header above says the grant is
  -- "deliberately LEFT IN PLACE"; the body has to actually leave it there.
  --
  -- ⚠️ IT IS ASKED *BEFORE* THE AUTOMATIC PASS, which is the only ordering that works now.
  -- A restart is a human act with its OWN 20-record allowance (R134); an automatic pass has
  -- none. Granting the automatic one first would silently consume the client's next turn on
  -- the fence the operator had just lifted for them, and the grant would sit unused for ever
  -- because nothing else claims it.
  --
  -- ⚠️ THE LIFETIME UNIQUENESS IS UNCHANGED. Once a restart claim has COMPLETED, this falls
  -- through to the automatic path — which is now always available, so a client who has used
  -- their restart is never refused. That is the whole change: no client is ever exhausted.
  if v_grant_at is not null and not exists (
       select 1 from public.proof_pass_claims
        where client_id = p_client_id
          and status = 'completed'
          and authority = 'calibrated_restart') then
    insert into public.proof_pass_claims (client_id, authority, restart_grant_at, icp_id)
      values (p_client_id, 'calibrated_restart', v_grant_at, p_icp_id)
      returning id into v_claim;
    update public.clients set proof_started_at = now() where id = p_client_id;
    perform public.refresh_proof_authority_mirror(p_client_id);
    return jsonb_build_object(
      'ok', true, 'claim_id', v_claim, 'authority', 'calibrated_restart',
      -- ⚠️ THE RESTART IS NOT PASS 3. `leads_proof_pass_check` admits NULL, 1 and 2 only, and
      -- a 3 would read as a third automatic attempt to anything counting passes. It runs
      -- ALONGSIDE pass 2 and is told apart by `leads.proof_batch_kind`. Unchanged.
      'pass', 2, 'kind', 'calibrated_restart', 'reason', 'granted');
  end if;

  -- ⑥ THE AUTOMATIC PASS — always available, however many have gone before.
  v_authority := 'automatic_' || (v_auto_used + 1)::text;
  insert into public.proof_pass_claims (client_id, authority, icp_id)
    values (p_client_id, v_authority, p_icp_id)
    returning id into v_claim;
  -- The desk's clock, stamped on every claim exactly as before.
  update public.clients set proof_started_at = now() where id = p_client_id;
  perform public.refresh_proof_authority_mirror(p_client_id);
  return jsonb_build_object(
    'ok', true, 'claim_id', v_claim, 'authority', v_authority,
    'pass', v_auto_used + 1, 'kind', 'automatic', 'reason', 'granted');
end;
$$;

comment on function public.claim_proof_authority(uuid, uuid) is
  'Issues free-proof authority. UNLIMITED automatic passes (founder-locked 22 Sep) — strictly sequential, enforced by proof_pass_claims_one_open. Each pass still completes at most once (proof_pass_claims_one_completed_automatic on (client_id, authority)); a failed attempt is still not a used attempt. The calibrated restart grant remains a legitimate operator act but is no longer the only way past an exhausted client, because no client is exhausted.';
