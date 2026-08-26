-- ── WHEN THE CURRENT PROOF PASS STARTED — durable SERVER truth ─────────────────────────
--
-- WHY. The proof desk has to answer one question to tell "still finding your matches" from
-- the approved recovery copy: HOW LONG HAS THIS RUN BEEN GOING? Nothing on the server could
-- answer it. `try_claim_proof_pass` incremented a counter and stored no time;
-- `icp_run_outcomes` is written only when a run FINISHES, so it is absent for exactly the
-- case that needs it; `proof_ledger` has a row only when PDL was reserved, so a pool-only
-- proof has none at all. The desk was therefore inferring the start from the browser — a
-- `?since=` query stamp and a localStorage mirror — and browser history is the wrong place
-- to keep a fact the FIRST CLIENT depends on:
--
--   · the stamp is written only AFTER the /proof POST returns, so a server that claimed the
--     pass and then lost its response left a claimed run with no recorded start anywhere;
--   · localStorage is browser-profile scoped — another device, another browser or a private
--     window has nothing, and a STALE stamp from an older pass could make the current run
--     look old enough to have failed;
--   · a clean URL with no query string lost the timing entirely, so every reload risked
--     restarting the wait.
--
-- ONE COLUMN IS ENOUGH, and that is the whole change. `proof_started_at` is written in the
-- SAME atomic statement that claims the pass, so it always describes the LATEST claim: pass
-- 1 sets it, pass 2 advances it, and a refused claim never reaches the update at all. The
-- pass number it belongs to is already readable from `proof_passes_done` in the same row —
-- so no second identity column is needed to bind the time to the current pass.
--
-- ⚠️ SERVER-GENERATED, ALWAYS. `now()` inside the function; a browser `Date.now()` is never
-- accepted as authoritative state. The function takes no timestamp argument, so a caller
-- cannot supply one even by mistake.
--
-- ⚠️ EXISTING ROWS STAY NULL, AND NOTHING IS BACKFILLED. There is no truthful historical
-- source to backfill FROM — inventing one would be exactly the fabrication this column
-- exists to end. NULL reads as "we do not know when that started", which the desk already
-- handles honestly: it waits under its bounded poll and then shows recovery, rather than
-- claiming a run is old.

alter table public.clients
  add column if not exists proof_started_at timestamptz;

comment on column public.clients.proof_started_at is
  'When the CURRENT (latest) free-proof pass was claimed, set by try_claim_proof_pass in the same atomic statement that increments proof_passes_done. The authoritative clock for the proof desk''s bounded wait. NULL means no pass has been claimed since this column existed — never backfilled, because no truthful historical source exists.';

-- ── The claim, now recording its own start time ─────────────────────────────────────────
-- IDENTICAL to the 22 Aug original in every control path — the same FOR UPDATE lock, the
-- same fail-closed nulls, the same two-pass ceiling, the same return values. The ONLY change
-- is that the single UPDATE which claims the pass also stamps `proof_started_at`.
--
-- ⚠️ ATOMIC BY CONSTRUCTION, not by convention. The stamp is set in the SAME UPDATE, in the
-- same transaction, under the same row lock that already serialises two racing claims. There
-- is no window in which the counter has moved and the time has not, so a claimed pass can
-- never exist without its start — which was the exact failure the browser stamp had.
--
-- ⚠️ EVERY REFUSAL RETURNS BEFORE THE UPDATE. A null client, an unknown client and a third
-- pass all `return 0` above it, so a refused or duplicate claim cannot advance the clock and
-- cannot make an in-flight run look like it restarted.
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

  -- ONE STATEMENT: the pass is claimed and its start time recorded together, or neither
  -- happens. `now()` is the server's clock and is the only source this value ever has.
  update public.clients
     set proof_passes_done = v_done + 1,
         proof_started_at  = now()
   where id = p_client_id;
  return v_done + 1;
end;
$$;

revoke execute on function public.try_claim_proof_pass(uuid) from public;
grant  execute on function public.try_claim_proof_pass(uuid) to service_role;
