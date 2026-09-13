-- ═══════════════════════════════════════════════════════════════════════════════════════
-- DURABLE PROOF AUTHORITY — a claim that can be RELEASED, so infrastructure failure
-- stops consuming the client's free-proof passes.  (S2-AUDIT-001 + the R119 drift.)
--
-- ── THE DEFECT, AND IT IS LIVE ─────────────────────────────────────────────────────────
--
-- `try_claim_proof_pass` increments `clients.proof_passes_done` and stamps
-- `proof_started_at` in one atomic UPDATE. It is correct about races and says nothing
-- about outcomes — and NOTHING ANYWHERE RELEASES THE COUNTER. The only writer of
-- `proof_passes_done` in the whole repo is that `+ 1`; there is no decrement, no reset, no
-- unclaim. The same is true of `proof_calibrated_restart_used_at`, which
-- `claimCalibratedRestart` stamps BEFORE anything is sourced.
--
-- So a run that crashes at the PDL boundary — with `PAID_PROVIDERS_ENABLED` unset, the
-- fail-closed default, THE MOST LIKELY PRODUCTION PATH — leaves the pass spent and the
-- client with nothing. `routes/icps.ts` already says so out loud in its own alert text:
-- "Their proof pass is CONSUMED".
--
-- ── WHY A DECREMENT WAS REJECTED (founder, this session) ───────────────────────────────
--
-- "you proved it still loses one automatic pass when a duplicate/retry claims the next
--  pass before the failed claim releases. That violates the locked requirement:
--  provider/infrastructure failure must not consume Proof authority. Use the DURABLE CLAIM
--  design. Do not knowingly ship the residual."
--
-- A decrement is racy in exactly that way, it cannot restore the calibrated restart (a
-- different column, a different compare-and-set, a different module), and after it lands
-- the row is indistinguishable from a client who never claimed.
--
-- ── THE DESIGN, IN ONE SENTENCE ───────────────────────────────────────────────────────
--
-- Authority is CONSUMED at completion, HELD while a run is in flight, and RETURNED on
-- release. A claim in flight is neither free nor spent — and because nothing else can be
-- claimed while it is held, a duplicate or a retry can never reach the NEXT authority.
-- That single property is what kills the residual the founder refused.
--
-- ⚠️ THIS IS NOT A WORKFLOW FRAMEWORK. One table, two functions, three authority kinds
-- named literally in a CHECK. A fourth door cannot be added without a migration.
--
-- ⚠️ EXPAND-ONLY. Nothing is dropped, nothing is altered, NO DATA IS MUTATED and there is
-- NO BACKFILL. `try_claim_proof_pass` is deliberately LEFT IN PLACE and unchanged, so a
-- partial deployment degrades to today's behaviour rather than to no behaviour. After this
-- build it has zero live callers (see `proof-authority-bypass.test.ts`).
--
-- Also carried as a string in apps/api/src/lib/pending-migrations.ts (key
-- '20260912_proof_pass_claims') and run from Vida -> Engine. Keep the two in step.
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- ── ① THE CLAIM LEDGER ─────────────────────────────────────────────────────────────────
-- One row per claim ATTEMPT. The row is the durable fact; the columns on `clients` become
-- compatibility mirrors of it (see ④).
create table if not exists public.proof_pass_claims (
  id               uuid        primary key default gen_random_uuid(),
  client_id        uuid        not null references public.clients(id) on delete cascade,

  -- 🛑 THREE DOORS, NAMED. Not a generic state machine: the product has exactly two
  -- automatic attempts and one human-authorised restart (R119, AR17), and a fourth kind
  -- must cost a migration rather than a value.
  authority        text        not null
                     check (authority in ('automatic_1','automatic_2','calibrated_restart')),

  -- AUDIT EVIDENCE ONLY — which grant a restart claim spent. DELIBERATELY NOT part of any
  -- unique key: keying on the grant is precisely the per-resolution model R119 forbids.
  restart_grant_at timestamptz,

  status           text        not null default 'open'
                     check (status in ('open','completed','released')),

  icp_id           uuid        references public.icps(id) on delete set null,
  claimed_at       timestamptz not null default now(),
  settled_at       timestamptz,
  release_reason   text,

  -- An open claim has no settlement; a settled claim always has one.
  constraint proof_pass_claims_settled_shape
    check ((status = 'open' and settled_at is null)
        or (status <> 'open' and settled_at is not null)),

  -- A restart claim must name the grant it spent; an automatic claim must not.
  constraint proof_pass_claims_grant_shape
    check ((authority = 'calibrated_restart' and restart_grant_at is not null)
        or (authority <> 'calibrated_restart' and restart_grant_at is null))
);

comment on table public.proof_pass_claims is
  'Durable free-proof AUTHORITY ledger. One row per claim attempt. Authority is consumed at COMPLETION, held while a run is in flight, and returned on RELEASE — so provider/infrastructure failure never consumes a pass. The three unique partial indexes below ARE the authority; clients.proof_passes_done and clients.proof_calibrated_restart_used_at are compatibility mirrors of this table for existing readers.';

comment on column public.proof_pass_claims.restart_grant_at is
  'AUDIT ONLY — the clients.proof_calibrated_restart_at value this restart claim spent. Never part of a unique key: keying completed restarts on the grant is the per-resolution model R119 forbids. Keyed on client_id alone instead.';

comment on column public.proof_pass_claims.release_reason is
  'Why a claim was released, or how a legacy row was classified: run_failed | refused_before_run | structural_gate_no_set | operator_reconciled | legacy_classified_completed | legacy_classified_burned.';

-- ── ② THE THREE UNIQUE KEYS. THESE ARE THE AUTHORITY. ─────────────────────────────────

-- ①  AT MOST ONE CLAIM IN FLIGHT PER CLIENT.
--    This is the whole answer to the rejected decrement's residual: a duplicate or a retry
--    cannot reach the NEXT authority, because it cannot insert a second open row at all.
create unique index if not exists proof_pass_claims_one_open
  on public.proof_pass_claims (client_id) where status = 'open';

-- ②  EACH AUTOMATIC PASS COMPLETES AT MOST ONCE, FOR EVER.
--    The two-pass ceiling now bites on COMPLETED passes rather than attempted ones, which
--    is exactly the locked requirement: a failed attempt is not a used attempt.
create unique index if not exists proof_pass_claims_one_completed_automatic
  on public.proof_pass_claims (client_id, authority)
  where status = 'completed' and authority <> 'calibrated_restart';

-- ③  🛑 EXACTLY ONE CALIBRATED RESTART PER CLIENT, FOR THE CLIENT'S LIFETIME (R119).
--    KEYED ON client_id ALONE. A second grant, a second resolution, a re-opened review and
--    a replay all collide with the one completed row. `main` shipped the per-resolution
--    model and documented it as deliberate; this index is where that stops.
create unique index if not exists proof_pass_claims_one_completed_restart
  on public.proof_pass_claims (client_id)
  where status = 'completed' and authority = 'calibrated_restart';

-- Lookup only.
create index if not exists proof_pass_claims_client_status
  on public.proof_pass_claims (client_id, status);

-- RLS on with no client policy: the service role (the only accessor) bypasses it, and
-- anon/authenticated are denied. Same shape as icp_run_outcomes.
alter table public.proof_pass_claims enable row level security;

-- ── ③ THE LEGACY FLOOR — NULLABLE, NO DEFAULT, NO BACKFILL ─────────────────────────────
--
-- 🛑 THE FOUNDER REFUSED `proof_passes_legacy = proof_passes_done`, AND HE WAS RIGHT:
-- "Blindly snapshotting proof_passes_done would memorialise the defect we are fixing."
--
-- The trace found four historical states that CANNOT be told apart from persisted
-- evidence: `icp_run_outcomes` carries no pass number and no proof flag; `proof_started_at`
-- is overwritten on every claim and did not exist before 26 Aug; `leads.proof_pass` did not
-- exist before 3 Sep; `status='failed'` is written by TWO different code paths with
-- opposite meanings; and an ABSENT outcome row proves nothing because `recordRunOutcome`
-- swallows its own failure. So historical authority is NOT deterministically reconstructible
-- and this migration classifies NOBODY.
--
-- NULL means UNCLASSIFIED, following the `commercial_model` precedent — "NULL here means
-- UNCLASSIFIED and must resolve to the behaviour the product had before the column
-- existed. A default would classify the entire book by assertion."
--
-- `claim_proof_authority` FAILS CLOSED on NULL for any client with claim history, so the
-- migration can neither grant a fresh pass to somebody who legitimately used theirs nor
-- permanently preserve a pass that was only burned by infrastructure. An operator clears it
-- with POST /operator/proof-review/:clientId/classify-passes, from the read-only audit.
alter table public.clients
  add column if not exists proof_passes_legacy int;

comment on column public.clients.proof_passes_legacy is
  'How many automatic Proof passes this client LEGITIMATELY consumed BEFORE the durable claim ledger existed. NULLABLE, no default, NEVER backfilled: NULL means UNCLASSIFIED, and claim_proof_authority refuses to issue any automatic authority to an unclassified client that has claim history. Written only by an audited operator classification, or set to 0 by the claim function for a brand-new client whose proof_passes_done is 0.';

-- ── ④ THE MIRROR — so all twelve existing readers keep working unchanged ───────────────
--
-- `clients.proof_passes_done` has twelve non-test readers (milla-summary, milla-proof-context,
-- current-workspace, programme-lifecycle, proof-calibration{,-io}, routes/icps, routes/leads,
-- routes/operator, portal proof-start, admin vida-lifecycle-copy). Rewriting them all is not
-- a small build, so the column KEEPS ITS EXACT CURRENT MEANING — "how many automatic
-- attempts has this client been given" — and this function maintains it:
--
--     proof_passes_done = proof_passes_legacy
--                       + count(automatic claims with status in ('open','completed'))
--
-- up at CLAIM, down at RELEASE, unmoved at COMPLETE. So an in-flight first run still renders
-- "attempt 1 of 2" on the desk and no reader changes.
--
-- ⚠️ THE DECREMENT IS SAFE HERE AND WAS NOT IN THE REJECTED OPTION, AND THIS IS THE WHOLE
-- DIFFERENCE. There, the counter WAS the authority, so a race against the decrement minted a
-- pass. Here it is a mirror the claim function never consults for authority (it reads the
-- ledger and `proof_passes_legacy`), so a stale mirror can mislead a screen and can never
-- mint a pass.
--
-- ⚠️ `proof_calibrated_restart_used_at` IS MIRRORED THE SAME WAY, and its clearing is safe
-- for the same reason: the ledger row (status='released') keeps the history, and
-- `proof_calibrated_restart_at` — the GRANT — is never cleared, so the audit chain
-- escalation -> resolution -> grant -> claim survives intact.
create or replace function public.refresh_proof_authority_mirror(p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_legacy       int;
  v_auto_live    int;
  v_restart_live timestamptz;
begin
  if p_client_id is null then return; end if;

  select proof_passes_legacy into v_legacy from public.clients where id = p_client_id;
  -- An unclassified client's mirror is left exactly as it is: we do not know the floor, so
  -- we must not compute a total from it. NULL arithmetic is refused, never coerced.
  if v_legacy is null then return; end if;

  select count(*) into v_auto_live
    from public.proof_pass_claims
   where client_id = p_client_id
     and authority <> 'calibrated_restart'
     and status in ('open','completed');

  -- The restart mirror: truthful, and idempotent. A live (open or completed) restart claim
  -- means "claimed", and its own claimed_at is the honest timestamp. No live claim means the
  -- authority is available again and the mirror must say so.
  select min(claimed_at) into v_restart_live
    from public.proof_pass_claims
   where client_id = p_client_id
     and authority = 'calibrated_restart'
     and status in ('open','completed');

  update public.clients
     set proof_passes_done                    = v_legacy + v_auto_live,
         proof_calibrated_restart_used_at     = v_restart_live
   where id = p_client_id;
end;
$$;

revoke execute on function public.refresh_proof_authority_mirror(uuid) from public;
grant  execute on function public.refresh_proof_authority_mirror(uuid) to service_role;

-- ── ⑤ CLAIM AUTHORITY ─────────────────────────────────────────────────────────────────
--
-- Returns jsonb so a refusal can carry its REASON to the route, which turns each reason
-- into the client-facing sentence it already has. Never raises for an ordinary refusal.
--
-- ⚠️ FOR UPDATE ON THE CLIENT ROW serialises two racing requests exactly as
-- `try_claim_proof_pass` has since 22 Aug. The unique indexes are the hard backstop if that
-- lock is ever bypassed by a future caller.
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
  select id into v_open
    from public.proof_pass_claims
   where client_id = p_client_id and status = 'open'
   limit 1;
  if v_open is not null then
    return jsonb_build_object('ok', false, 'reason', 'in_flight', 'claim_id', v_open);
  end if;

  -- ② THE ZERO BASELINE IS ESTABLISHED EXPLICITLY, NEVER ASSUMED.
  --    A brand-new client (no claims ever, counter 0) genuinely has nothing to reconstruct,
  --    so 0 is a FACT rather than a guess and it is WRITTEN DOWN — after this, the client is
  --    classified and no later read has to re-derive it. Any client with claim history and no
  --    classification is refused: there is no arithmetic on NULL anywhere below.
  if v_legacy is null then
    if v_done = 0 then
      update public.clients set proof_passes_legacy = 0 where id = p_client_id;
      v_legacy := 0;
    else
      return jsonb_build_object('ok', false, 'reason', 'unclassified');
    end if;
  end if;

  -- ③ A HISTORICAL RESTART CONSUMPTION WE CANNOT READ MUST NOT BE GUESSED EITHER.
  --    `proof_calibrated_restart_used_at` is written at CLAIM, before any sourcing, so a
  --    non-null value may mean a completed restart OR one burned by infrastructure — and
  --    "zero restart-attributed leads" does not decide it, because a batch whose surfacing
  --    UPDATE failed leaves exactly that signature with the leads sitting invisible.
  if v_grant_used is not null and not exists (
       select 1 from public.proof_pass_claims
        where client_id = p_client_id and authority = 'calibrated_restart') then
    return jsonb_build_object('ok', false, 'reason', 'restart_unclassified');
  end if;

  -- ④ THE TWO AUTOMATIC PASSES. Completed claims, plus the classified legacy floor.
  select count(*) into v_auto_done
    from public.proof_pass_claims
   where client_id = p_client_id
     and status = 'completed'
     and authority <> 'calibrated_restart';

  v_auto_used := v_legacy + v_auto_done;

  if v_auto_used < 2 then
    v_authority := 'automatic_' || (v_auto_used + 1)::text;
    insert into public.proof_pass_claims (client_id, authority, icp_id)
      values (p_client_id, v_authority, p_icp_id)
      returning id into v_claim;
    -- The desk's clock, stamped on every claim exactly as try_claim_proof_pass did.
    update public.clients set proof_started_at = now() where id = p_client_id;
    perform public.refresh_proof_authority_mirror(p_client_id);
    return jsonb_build_object(
      'ok', true, 'claim_id', v_claim, 'authority', v_authority,
      'pass', v_auto_used + 1, 'kind', 'automatic', 'reason', 'granted');
  end if;

  -- ⑤ THE ONE CALIBRATED RESTART (R119). One per client, for the client's lifetime.
  if exists (
       select 1 from public.proof_pass_claims
        where client_id = p_client_id
          and status = 'completed'
          and authority = 'calibrated_restart') then
    return jsonb_build_object('ok', false, 'reason', 'restart_already_used');
  end if;

  if v_grant_at is null then
    return jsonb_build_object('ok', false, 'reason', 'exhausted');
  end if;

  -- Reaching here with a non-null `v_grant_used` means a classification row exists (③) and
  -- it is not `completed` (checked above) — i.e. the earlier attempt was RELEASED and the
  -- one restart is genuinely available again.
  insert into public.proof_pass_claims (client_id, authority, restart_grant_at, icp_id)
    values (p_client_id, 'calibrated_restart', v_grant_at, p_icp_id)
    returning id into v_claim;
  update public.clients set proof_started_at = now() where id = p_client_id;
  perform public.refresh_proof_authority_mirror(p_client_id);
  return jsonb_build_object(
    'ok', true, 'claim_id', v_claim, 'authority', 'calibrated_restart',
    -- ⚠️ THE RESTART IS NOT PASS 3. `leads_proof_pass_check` admits NULL, 1 and 2 only, and a
    -- 3 would read as a third automatic attempt to anything counting passes. It runs
    -- ALONGSIDE pass 2 and is told apart by `leads.proof_batch_kind`.
    'pass', 2, 'kind', 'calibrated_restart', 'reason', 'granted');
end;
$$;

revoke execute on function public.claim_proof_authority(uuid, uuid) from public;
grant  execute on function public.claim_proof_authority(uuid, uuid) to service_role;

-- ── ⑥ SETTLE A CLAIM — COMPLETE or RELEASE, once ──────────────────────────────────────
--
-- ⚠️ THE CONDITIONAL UPDATE IS THE WHOLE IDEMPOTENCY. `where id = $1 and status = 'open'`
-- means a double-settle, a retry and two racing settles produce exactly ONE transition.
-- Same mechanism as `try_charge_wallet`'s `WHERE allowance >= granted`.
--
-- ⚠️ A RELEASE RETURNS THE SAME AUTHORITY, never the next one: the released row holds no
-- `completed` slot, so `claim_proof_authority` re-derives the identical name. That is the
-- property the rejected decrement could not provide.
create or replace function public.settle_proof_claim(
  p_claim_id uuid, p_status text, p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_client uuid;
begin
  if p_claim_id is null or p_status is null then
    return jsonb_build_object('ok', false, 'reason', 'bad_args');
  end if;
  if p_status not in ('completed','released') then
    return jsonb_build_object('ok', false, 'reason', 'bad_status');
  end if;

  update public.proof_pass_claims
     set status         = p_status,
         settled_at     = now(),
         release_reason = p_reason
   where id = p_claim_id
     and status = 'open'
  returning client_id into v_client;

  if v_client is null then
    -- Not an error: the claim was already settled, or never existed. A retry is a no-op.
    return jsonb_build_object('ok', false, 'reason', 'not_open');
  end if;

  perform public.refresh_proof_authority_mirror(v_client);
  return jsonb_build_object('ok', true, 'client_id', v_client, 'status', p_status);
end;
$$;

revoke execute on function public.settle_proof_claim(uuid, text, text) from public;
grant  execute on function public.settle_proof_claim(uuid, text, text) to service_role;

-- ── ⑦ CLASSIFY A LEGACY RESTART — an audited operator act, never an inference ──────────
--
-- Writes the durable classification row the claim function looks for in ③. `completed`
-- shuts the restart door for ever (index ③); `released` returns the one restart because it
-- was burned by infrastructure rather than spent.
--
-- ⚠️ IT REFUSES TO OVERWRITE. A classification already on record is final from here; a
-- correction is a deliberate act with its own evidence, not a second press of this button.
create or replace function public.classify_legacy_restart(
  p_client_id uuid, p_status text, p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_grant_at timestamptz;
  v_used_at  timestamptz;
  v_claim    uuid;
  v_found    boolean := false;
begin
  if p_client_id is null or coalesce(btrim(p_note), '') = '' then
    return jsonb_build_object('ok', false, 'reason', 'note_required');
  end if;
  if p_status not in ('completed','released') then
    return jsonb_build_object('ok', false, 'reason', 'bad_status');
  end if;

  select true, proof_calibrated_restart_at, proof_calibrated_restart_used_at
    into v_found, v_grant_at, v_used_at
    from public.clients where id = p_client_id for update;
  if not v_found then
    return jsonb_build_object('ok', false, 'reason', 'unknown_client');
  end if;
  -- ⚠️ ORDER MATTERS HERE, AND THE FIRST CUT HAD IT WRONG — found by the SQL teeth (T-H4).
  -- `already_classified` MUST be asked before `nothing_to_classify`, because classifying a
  -- restart as `released` clears the `used_at` mirror (the authority is available again). With
  -- the checks the other way round, a second press on an already-classified client answered
  -- "nothing to classify" — telling the operator their earlier decision had never landed.
  if exists (select 1 from public.proof_pass_claims
              where client_id = p_client_id and authority = 'calibrated_restart') then
    return jsonb_build_object('ok', false, 'reason', 'already_classified');
  end if;
  if v_used_at is null then
    -- Nothing historical to classify: no restart was ever consumed on this client.
    return jsonb_build_object('ok', false, 'reason', 'nothing_to_classify');
  end if;

  insert into public.proof_pass_claims
    (client_id, authority, restart_grant_at, status, settled_at, release_reason)
  values
    (p_client_id, 'calibrated_restart',
     -- The grant this historical claim spent. `used_at` is the fallback for the (impossible
     -- under current code, hand-edited otherwise) case of a consumption with no grant.
     coalesce(v_grant_at, v_used_at),
     p_status, now(),
     case p_status when 'completed' then 'legacy_classified_completed'
                   else 'legacy_classified_burned' end)
  returning id into v_claim;

  perform public.refresh_proof_authority_mirror(p_client_id);
  return jsonb_build_object('ok', true, 'claim_id', v_claim, 'status', p_status);
end;
$$;

revoke execute on function public.classify_legacy_restart(uuid, text, text) from public;
grant  execute on function public.classify_legacy_restart(uuid, text, text) to service_role;

-- ── ⑧ CLASSIFY LEGACY AUTOMATIC PASSES — an audited operator act ──────────────────────
--
-- 0, 1 or 2 legitimately consumed automatic passes. Refuses anything else, refuses an empty
-- note, and REFUSES TO SILENTLY OVERWRITE an existing classification: re-classifying is only
-- permitted with an explicit `p_force`, which the route exposes as a separate, separately
-- audited decision rather than a retry of the same press.
create or replace function public.classify_legacy_proof_passes(
  p_client_id uuid, p_passes int, p_note text, p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing int;
  v_found    boolean := false;
begin
  if p_client_id is null or coalesce(btrim(p_note), '') = '' then
    return jsonb_build_object('ok', false, 'reason', 'note_required');
  end if;
  if p_passes is null or p_passes < 0 or p_passes > 2 then
    return jsonb_build_object('ok', false, 'reason', 'out_of_range');
  end if;

  select true, proof_passes_legacy into v_found, v_existing
    from public.clients where id = p_client_id for update;
  if not v_found then
    return jsonb_build_object('ok', false, 'reason', 'unknown_client');
  end if;

  if v_existing is not null and not coalesce(p_force, false) then
    return jsonb_build_object('ok', false, 'reason', 'already_classified', 'existing', v_existing);
  end if;

  update public.clients set proof_passes_legacy = p_passes where id = p_client_id;
  perform public.refresh_proof_authority_mirror(p_client_id);
  return jsonb_build_object('ok', true, 'passes', p_passes,
                            'replaced', v_existing is not null);
end;
$$;

revoke execute on function public.classify_legacy_proof_passes(uuid, int, text, boolean) from public;
grant  execute on function public.classify_legacy_proof_passes(uuid, int, text, boolean) to service_role;
