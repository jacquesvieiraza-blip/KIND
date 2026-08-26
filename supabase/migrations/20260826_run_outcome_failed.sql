-- ── icp_run_outcomes.status gains 'failed' — a crash is a TERMINAL FACT ─────────
--
-- WHY. `runIcpJob` records an outcome only when it FINISHES. A run that threw recorded
-- nothing at all, so the proof desk had no terminal row to read and sat on "Finding your
-- matches now…" forever. The five existing statuses cannot carry a crash: `no_match`
-- would tell a prospect their targeting matched nobody WHEN WE NEVER ASKED, and
-- `audience_exhausted` would claim they already hold everyone. Both are lies, and both
-- are the class of lie R72 forbids. So the state gets its own value.
--
-- ⚠️ `failed` IS NEVER DERIVED. `deriveRunStatus` cannot return it — it is written only
-- at the crash boundary, by the handler that caught the throw. A run that completes
-- honestly can never be labelled failed, and a run that crashed can never be labelled
-- anything else.
--
-- ⚠️ INTERNAL WORD, NOT A CUSTOMER-FACING ONE. The prospect is never shown "failed";
-- they see the approved recovery copy. This value exists so the SYSTEM can tell the
-- truth to itself.

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'icp_run_outcomes_status_check') then
    alter table public.icp_run_outcomes drop constraint icp_run_outcomes_status_check;
  end if;
end $$;

alter table public.icp_run_outcomes
  add constraint icp_run_outcomes_status_check
  check (status in ('served','no_match','quota_exhausted','demo','audience_exhausted','failed'));

comment on column public.icp_run_outcomes.status is
  'Terminal outcome of one ICP run. served = leads delivered. no_match = the query ran and matched nobody. audience_exhausted = the query ran and we already hold everyone in it. quota_exhausted = refused before it could run. demo = pool-only run. failed = THE RUN CRASHED — written only at the crash boundary, never derived, and never shown to a client as the word "failed" (they see the approved recovery copy). A crash must never be recorded as no_match: that would claim the targeting matched nobody when the query never completed.';
