-- 20260710_visitor_sessions_rls.sql
-- M0 · #350 (AR-28) — visitor_sessions ANON-READABLE. The RLS policy `admin_read_visits`
-- was defined as a {public} SELECT USING (true) — so anyone holding the public anon key
-- could read EVERY visitor row (IPs + enrichment). Confirmed in prod. The backend reads
-- this table with the service-role key (which bypasses RLS), and no client/browser role
-- should ever read it — so the policy is pure exposure. Drop it. RLS stays enabled with
-- no permissive SELECT policy → anon/authenticated get nothing; service-role unaffected.
--
-- Run on STAGING (kind-staging) first, then PRODUCTION.

DROP POLICY IF EXISTS admin_read_visits ON public.visitor_sessions;
