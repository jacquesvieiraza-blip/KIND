-- #366 — PDL scroll_token paging, so a client's SECOND MONTH finds new people.
--
-- `pdlSearchPeople(icp, _page = 1, size)` accepted a page number and ignored it. Every run
-- therefore asked PDL for the same first page; run two deduped every returned person against
-- leads the client already held and inserted nothing. The client was shown "No leads matched
-- this ICP" — a sentence about their targeting that was actually about our paging.
--
-- PDL v5 pages with `scroll_token` (its `from` parameter is deprecated and now 400s). The
-- token has to survive between runs, so it lives here on the ICP row.
--
-- `pdl_scroll_query` is a fingerprint of the query the token belongs to. A scroll token is
-- only meaningful for the exact query that produced it — replaying one after the ICP was
-- edited would return people from an audience the client no longer targets, which reads as
-- a working search delivering irrelevant leads. When the fingerprints differ the token is
-- discarded and paging starts again from the (new) first page.
--
-- IDEMPOTENT. Additive columns via IF NOT EXISTS, and nothing else — re-running is harmless.
--
-- NOTE: this file is ALSO carried as a string in apps/api/src/lib/pending-migrations.ts
-- (key '20260727_pdl_cursor') and is run from Vida → Engine, because the Supabase SQL editor
-- is unreachable. Keep the two in step.
--
-- ═══════════════════════════════════════════════════════════════════════════════════════
-- ⛓️ 29 Aug — THE CONSTRAINT BLOCK WAS REMOVED FROM THIS FILE (R3). READ BEFORE RESTORING IT.
--
-- This migration used to end by dropping `icp_run_outcomes_status_check` and re-adding it
-- with FIVE values, to introduce `audience_exhausted`. That was correct in July, when this
-- file was the constraint's only writer. It stopped being correct on 26 Aug, when
-- `20260826_run_outcome_failed` added a SIXTH value, `failed`.
--
-- 🛑 WHY IT BROKE THE DEPLOY. `PENDING_MIGRATIONS` is executed in ARRAY ORDER, not date
-- order, and this entry sits at #15 while `20260826_run_outcome_failed` sits at #2. So the
-- OLDER file ran LAST and re-asserted the NARROWER definition over the newer one. Once
-- production held a single `status = 'failed'` row — and it does, because the crash boundary
-- at routes/icps.ts writes one — `add constraint` validated that row, failed, and took the
-- whole migration down with it.
--
-- 🛑 AND THE SILENT FAILURE WAS WORSE THAN THE LOUD ONE. The runner passes each migration as
-- ONE multi-statement string, which Postgres wraps in an implicit transaction, so the failure
-- rolled back cleanly and the six-value constraint survived. That was luck, not design: in any
-- environment where `icp_run_outcomes` happens to hold no `failed` row — a fresh database,
-- staging, a pruned table — this block would SUCCEED and narrow the constraint to five. From
-- then on every crashed run's `recordRunOutcome(..., 'failed', ...)` is rejected by the
-- database, supabase-js returns `{ error }` rather than throwing, nothing surfaces, and the
-- proof desk spins on "Finding your matches now…" forever. That is #342's failure mode and
-- exactly the R72 lie `20260826_run_outcome_failed` exists to prevent.
--
-- ⚠️ NOTHING WAS LOST BY DELETING IT. The value this block existed to add,
-- `audience_exhausted`, is already inside the six-value definition that now owns the
-- constraint. This file was re-declaring a constraint it no longer owned.
--
-- ✅ ONE CONSTRAINT, ONE OWNER: `20260826_run_outcome_failed` owns
-- `icp_run_outcomes_status_check` and is the ONLY migration permitted to add it.
-- `constraint-ownership.test.ts` fails the build if a second one ever does — this file
-- included. Do not "restore" the block below; adding a seventh status means editing the
-- owner, not re-declaring the constraint here.
-- ═══════════════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.icps
  ADD COLUMN IF NOT EXISTS pdl_scroll_token text,
  ADD COLUMN IF NOT EXISTS pdl_scroll_query text,
  ADD COLUMN IF NOT EXISTS pdl_exhausted_at timestamptz;

COMMENT ON COLUMN public.icps.pdl_scroll_token IS
  'PDL v5 scroll_token — where the last run stopped. Sent back on the next run so it returns the NEXT people, not the same page again (#366).';
COMMENT ON COLUMN public.icps.pdl_scroll_query IS
  'Fingerprint of the ICP query the scroll_token belongs to. A token is only valid for the query that produced it; when these differ the token is discarded and paging restarts.';
COMMENT ON COLUMN public.icps.pdl_exhausted_at IS
  'When the data source last reported it has nobody left matching this exact query. Cleared automatically when the ICP is widened.';

-- The honesty half of #366 — `audience_exhausted` — is NOT declared here any more.
--
-- It has not been dropped from the product: it is one of the six values in the constraint
-- owned by `20260826_run_outcome_failed`, and `constraint-ownership.test.ts` fails the build
-- if it ever disappears from there. The distinction this file introduced still stands —
-- `audience_exhausted` says "your ICP was right, we found all of them, and you already have
-- every one", which is the opposite instruction to `no_match`'s "your ICP is too narrow".
-- Only the DECLARATION moved, so that one constraint has one owner. See the block above.
