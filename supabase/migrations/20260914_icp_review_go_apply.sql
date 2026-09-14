-- ═══════════════════════════════════════════════════════════════════════════════════════
-- GO CARRIES THE REVIEW WITH THE TARGETING, OR GO DOES NOT HAPPEN. (S1-PD-05.)
--
-- ── THE DEFECT ─────────────────────────────────────────────────────────────────────────
--
-- "apply_pending_revision" applies a COLUMN WHITELIST, and "icp_review" was not on it. Every
-- step before GO was correct, which is exactly what made the hole invisible:
--
--   1. a LIVE client revises their targeting in their own words;
--   2. the write boundary translates: the canonical half goes to the provider columns, the
--      words we could not map are kept verbatim as a review requirement;
--   3. the ICP is live, so the revision is PARKED in "pending_targeting" and no live column
--      moves. Correct - the live targeting has not changed, so it must not be falsely blocked;
--   4. an operator presses GO;
--   5. the whitelist applies the nine targeting columns and NOT the review;
--   6. the new targeting is live, its canonical half intact, and the unresolved customer
--      constraint has stopped existing as an authority fact;
--   7. "icpNeedsReview" reads the live row, finds no review, and answers "translatable";
--   8. Proof runs. runIcpJob runs. Provider money is spent against a filter set a human was
--      supposed to finish and never did.
--
-- The targeting travelled and its safety state did not.
--
-- ── WHAT CHANGES, AND WHAT DELIBERATELY DOES NOT ───────────────────────────────────────
--
-- ⚠️ THE FUNCTION IS REPLACED, NOT THE TABLE. No column is added, no data is rewritten, no
-- existing row is touched. "create or replace function" swaps one body for another; every
-- signature, grant and caller is unchanged. Re-running this file is a no-op.
--
-- ⚠️ THE TARGETING WHITELIST IS UNCHANGED - still exactly the nine columns a client's own ICP
-- form can set, still field by field so a stray or hostile key in the stored payload cannot
-- reach a column nobody intended.
--
-- ⚠️ THE REVIEW IS CARRIED, NEVER RE-DERIVED, and that needs saying plainly rather than being
-- left as an omission. Re-deriving would need two things this database does not have: the
-- three closed provider vocabularies (a SECOND copy of constants that live in TypeScript -
-- the two-truths defect this whole batch exists to remove), and the client's ORIGINAL words,
-- which are not in the parked targeting at all. The parked provider lists hold only the
-- canonical half; the unmapped words survive nowhere except inside the stored review. So
-- re-deriving from what is there would find nothing unmapped and reproduce the exact bypass
-- above. The stored review is SERVER-AUTHORED - "POST /icps" derives it, and "icpSchema" does
-- not accept the field from a caller - so carrying it forward is carrying OUR derivation.
--
-- ⚠️ AND IT IS VALIDATED FIRST. A shape this code did not write raises, which rolls the whole
-- transaction back: not the brief, not the targeting, not the activation. "Apply the targeting
-- and skip the half I could not read" is the silent widening this design exists to prevent,
-- and it would be indistinguishable from success.
--
-- ── GO MAY APPLY A REVIEW. GO MAY NOT RESOLVE ONE. ─────────────────────────────────────
--
-- "icp_review_resolved_at" and "icp_review_resolved_by" appear below in ONE form only: set to
-- NULL when a new review is applied. That is not GO resolving anything - it is the opposite,
-- and it is required. "icpNeedsReview" answers false the moment the stamp is set, whatever
-- the review says, so an ICP whose PREVIOUS review a human resolved carries that stamp for
-- ever; applying a new unresolved review on top of it would let the old resolution answer for
-- the new constraint. Clearing the stamp can only make an ICP MORE blocked. A non-null stamp
-- is still written by exactly one thing in this product: the Vida operator resolution route,
-- which re-canonicalises every value against the closed vocabularies before it writes one.
--
-- ── THE DECISION IS SPECIFIED IN TYPESCRIPT AND IMPLEMENTED HERE ───────────────────────
--
-- The rule below is "apps/api/src/lib/pending-review-transfer.ts", executed by the gate
-- against every case it has. This body must agree with it exactly; a structural test proves
-- the two have not drifted, and the migration rehearsal executes THIS function against the
-- same cases on a disposable database. The decision lives inside the transaction because it
-- must: the row is read FOR UPDATE here, and a TypeScript pre-check would be a second
-- observation of a row this function re-reads under a lock.
--
-- ⚠️ MIRRORED, STATEMENT-IDENTICAL, into "apps/api/src/lib/pending-migrations.ts" (key
-- '20260914_icp_review_go_apply') and run from Vida -> Engine. Keep the two in step.
--
-- ── 🛑 ORDER: THIS MUST APPLY AFTER '20260914_icp_provider_review' (S1-PD-09) ──────────
--
-- The body names the four icp_review* columns, so they must exist first.
--
-- 🛑 AND THE FILENAME CARRIES THAT DEPENDENCY, rather than a note asking somebody to
-- remember it. This file was first called "20260914_go_applies_icp_review.sql", which sorts
-- BEFORE "20260914_icp_provider_review.sql" ("g" < "i") - the exact OPPOSITE of the order it
-- needs. The Vida/Engine runner applies its own array order and would have been fine, but a
-- migration whose safety depends on nobody ever running the directory in filename order is a
-- trap with a date on it: one "psql -f" loop, one Supabase CLI adoption, one new contributor
-- sorting the folder, and the GO function is created against columns that do not exist.
-- Renamed so "20260914_icp_provider_review" < "20260914_icp_review_go_apply" - the dependency
-- is now true under BOTH executors, and "migration-order.test.ts" fails if that stops being
-- true.
-- ═══════════════════════════════════════════════════════════════════════════════════════

create or replace function public.apply_pending_revision(
  p_icp_id      uuid,
  p_client_id   uuid,
  p_campaign_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_icp          public.icps%rowtype;
  v_t            jsonb;
  v_intent       text;
  v_rows         int;
  v_review       jsonb;
  v_apply_review boolean := false;
begin
  if p_icp_id is null or p_client_id is null then
    -- Nothing written; a clean refusal rather than a raise. This is the shape the probe hits.
    return jsonb_build_object('ok', false, 'reason', 'BAD_ARGS', 'applied', false);
  end if;

  -- FOR UPDATE: two operators pressing GO on the same ICP serialise here, so the second
  -- reads the first's committed row and finds nothing left pending rather than replaying it.
  select * into v_icp from public.icps
    where id = p_icp_id and client_id = p_client_id for update;
  if not found then
    -- Still nothing written. Refuse cleanly: the route turns this into a failed GO.
    return jsonb_build_object('ok', false, 'reason', 'ICP_NOT_FOUND', 'applied', false);
  end if;

  v_t      := v_icp.pending_targeting;
  v_intent := nullif(btrim(coalesce(v_icp.pending_campaign_intent, '')), '');

  -- ── ⓪ THE REVIEW THAT TRAVELS WITH THE TARGETING (S1-PD-05) ────────────────────────
  --
  -- Read and VALIDATED before anything is written, so an unreadable state cannot even
  -- partially apply. (A raise anywhere in this body rolls everything back; deciding it here
  -- as well means the guarantee does not rest on that.)
  v_review := v_t -> 'icp_review';
  if v_review is not null and jsonb_typeof(v_review) <> 'null' then
    if jsonb_typeof(v_review) <> 'object'
       or v_review -> 'requirements' is null
       or jsonb_typeof(v_review -> 'requirements') <> 'array' then
      raise exception 'the held revision carries an unreadable review state; nothing has been applied';
    end if;
    -- An empty requirements list is READABLE and owes nothing: it must not raise, and it must
    -- not clear a review somebody else's resolution still owns.
    v_apply_review := jsonb_array_length(v_review -> 'requirements') > 0;
  end if;

  -- ① THE BRIEF, onto the campaign that already exists. A missing campaign raises rather
  --    than silently skipping: a revision half-applied is the defect this function exists
  --    to make impossible.
  if v_intent is not null then
    if p_campaign_id is null then
      raise exception 'a held brief needs a campaign to apply to';
    end if;
    update public.figsy_campaigns
       set campaign_intent = left(v_intent, 2000), intent_mapped_at = now()
     where id = p_campaign_id and client_id = p_client_id;
    get diagnostics v_rows = row_count;
    if v_rows <> 1 then
      raise exception 'the campaign meant to carry the revised brief was not found for this client';
    end if;
  end if;

  -- ② ONE ACTIVE ICP for this client, exactly as the route did before.
  update public.icps set is_active = false
   where client_id = p_client_id and id <> p_icp_id and is_active;

  -- ③ THE TARGETING, ITS REVIEW, THE ACTIVATION AND THE CLEARING - one statement, one
  --    whitelist. The review is in THIS statement and no other: there is no instant in which
  --    the new targeting is live and its review is absent.
  update public.icps set
    name = case when jsonb_typeof(v_t->'name') = 'string'
                then v_t->>'name' else name end,
    industries = case when jsonb_typeof(v_t->'industries') = 'array'
                then array(select jsonb_array_elements_text(v_t->'industries')) else industries end,
    job_titles = case when jsonb_typeof(v_t->'job_titles') = 'array'
                then array(select jsonb_array_elements_text(v_t->'job_titles')) else job_titles end,
    seniority_levels = case when jsonb_typeof(v_t->'seniority_levels') = 'array'
                then array(select jsonb_array_elements_text(v_t->'seniority_levels')) else seniority_levels end,
    company_sizes = case when jsonb_typeof(v_t->'company_sizes') = 'array'
                then array(select jsonb_array_elements_text(v_t->'company_sizes')) else company_sizes end,
    geographies = case when jsonb_typeof(v_t->'geographies') = 'array'
                then array(select jsonb_array_elements_text(v_t->'geographies')) else geographies end,
    tech_stack = case when jsonb_typeof(v_t->'tech_stack') = 'array'
                then array(select jsonb_array_elements_text(v_t->'tech_stack')) else tech_stack end,
    keywords = case when jsonb_typeof(v_t->'keywords') = 'array'
                then array(select jsonb_array_elements_text(v_t->'keywords')) else keywords end,
    apollo_only_consented = case when jsonb_typeof(v_t->'apollo_only_consented') = 'boolean'
                then (v_t->>'apollo_only_consented')::boolean else apollo_only_consented end,
    -- 🛑 SET-ONLY. "else icp_review end" is what makes a CLEAN revision leave an operator's
    -- open review exactly where it is - a client must not be able to lift their own block by
    -- revising around the word that raised it.
    icp_review = case when v_apply_review then v_review else icp_review end,
    icp_review_at = case when v_apply_review then now() else icp_review_at end,
    -- 🛑 NULL IS THE ONLY VALUE GO MAY EVER WRITE HERE. See the header: this un-resolves, it
    -- never resolves, and it fires only when a NEW review is being applied.
    icp_review_resolved_at = case when v_apply_review then null else icp_review_resolved_at end,
    icp_review_resolved_by = case when v_apply_review then null else icp_review_resolved_by end,
    is_active               = true,
    pending_targeting       = null,
    pending_campaign_intent = null,
    pending_submitted_at    = null,
    updated_at              = now()
  where id = p_icp_id and client_id = p_client_id;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'the icp could not be updated; nothing has been applied';
  end if;

  -- The PDL cursor is NOT cleared here on purpose: decideCursor fingerprints the query and
  -- resets itself on the next run when the targeting changed, so an unchanged revision keeps
  -- its paging rather than re-serving page one.
  select * into v_icp from public.icps where id = p_icp_id;

  return jsonb_build_object(
    'ok',             true,
    'applied',        (v_t is not null or v_intent is not null),
    'applied_intent', (v_intent is not null),
    'applied_review', v_apply_review,
    'icp',            to_jsonb(v_icp)
  );
end;
$$;

revoke execute on function public.apply_pending_revision(uuid, uuid, uuid) from public;
grant  execute on function public.apply_pending_revision(uuid, uuid, uuid) to service_role;
