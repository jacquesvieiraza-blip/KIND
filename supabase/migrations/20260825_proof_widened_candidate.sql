-- 20260825_proof_widened_candidate.sql
--
-- FREE-PROOF PASS-2 WIDENED-FALLBACK ACCEPTANCE STATE (founder-approved 25 Aug).
--
-- WHY THIS COLUMN EXISTS. Pass 2 runs the targeting the client explicitly confirmed. When
-- that exact query matches nobody, ONE widened search runs — same job titles, industries and
-- countries, with seniority and company size dropped. If it finds people, the client is shown
-- them, and the saved ICP is NOT touched: the widened targeting is search-time only until the
-- client says "Looks right" about that batch.
--
-- The gap that made this column necessary: at the moment the client accepts, the server has
-- to prove WHICH batch they accepted and WHAT targeting produced it, and nothing durable said
-- so. Without it a client could accept a widened proof and then pay for an ICP whose paid
-- sourcing immediately re-runs the query that already returned zero.
--
-- WHY NOT AN EXISTING FIELD (each ruled out on its own evidence):
--   · icps.pending_targeting  — a LIVE client's revision awaiting K.I.N.D review. The GO
--                               function applies it field-by-field onto this row, so a proof
--                               candidate parked there could be applied by an operator GO
--                               that meant something else; and proofRefinementVerdict treats
--                               any non-null value as a conflict, refusing the client's own
--                               next refinement.
--   · icps.pdl_scroll_query   — the cursor's validity fingerprint (#366). Overwriting it
--                               restarts paging.
--   · icp_run_outcomes        — no jsonb column; `status` is CHECK-constrained; `message` is
--                               the client-facing string, which is not authority.
--   · icps.updated_at         — nothing in this repository maintains it on the proof path.
--
-- ADDITIVE AND IDEMPOTENT. One nullable column, no default, no backfill, no constraint, no
-- index. Every existing row reads NULL, which means exactly what it says: this ICP has no
-- widened proof awaiting acceptance. RLS on public.icps is unchanged — the column is written
-- and read only by the API's service role, like every other column on this table.

alter table public.icps
  add column if not exists proof_widened_candidate jsonb;

comment on column public.icps.proof_widened_candidate is
  'Free-proof pass-2 widened-fallback acceptance state. Server-owned only: never accepted from a browser, never read by sourcing, scoring or sending, and never applied by an operator GO. Shape: {version, state: pending|accepted, proof_pass, batch_at, basis:{job_titles, seniority_levels, industries, company_sizes, geographies}, accepted_at?}. batch_at is the surfaced_for_approval_at stamp of the batch it produced; basis is the saved ICP targeting the widened search was derived from, BEFORE seniority and size were removed. Only ''pending'' may change targeting, and the transition to ''accepted'' happens in the same conditional UPDATE that clears seniority_levels and company_sizes — so a replayed click cannot mutate twice. NULL for every paying client and for every proof that did not widen.';
