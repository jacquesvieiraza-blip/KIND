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
-- IDEMPOTENT. Additive columns via IF NOT EXISTS; the constraint is dropped and re-added
-- inside a DO block, so re-running is harmless.
--
-- NOTE: this file is ALSO carried as a string in apps/api/src/lib/pending-migrations.ts
-- (key '20260727_pdl_cursor') and is run from Vida → Engine, because the Supabase SQL editor
-- is unreachable. Keep the two in step.

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

-- The honesty half of #366: an exhausted audience must be recordable as such.
--
-- `audience_exhausted` is NOT `no_match`. no_match says "your ICP is too narrow — nobody
-- like this exists". audience_exhausted says "your ICP was right, we found all of them, and
-- you already have every one". They are opposite instructions to the client, and the status
-- column is where that difference becomes visible.
--
-- Widening the CHECK is not optional: supabase-js RETURNS a constraint rejection instead of
-- throwing, so without this the outcome row would silently never be written and the portal
-- would keep rendering the previous run's message (#342's failure mode).
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'icp_run_outcomes_status_check') then
    alter table public.icp_run_outcomes drop constraint icp_run_outcomes_status_check;
  end if;
end $$;

alter table public.icp_run_outcomes
  add constraint icp_run_outcomes_status_check
  check (status in ('served','no_match','quota_exhausted','demo','audience_exhausted'));
