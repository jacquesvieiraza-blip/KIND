-- #554 — CLOSE THE {public} USING(true) POLICIES #350 LEFT BEHIND.
--
-- #350 found `visitor_sessions.admin_read_visits` shipped as a {public} SELECT USING (true):
-- every visitor IP and enrichment row readable by anyone holding the PUBLIC anon key,
-- confirmed in production. It dropped that ONE policy. Nobody swept for the pattern.
-- This is the sweep, and it found five more.
--
-- TWO FACTS ABOUT POSTGRES RLS MAKE THIS SHAPE SO DANGEROUS:
--
--   1. A policy with no `TO` clause applies to PUBLIC — every role, including the `anon`
--      role that the public Supabase key authenticates as. So
--      `CREATE POLICY "Service role bypass" ON t FOR ALL USING (true)` restricts NOTHING to
--      the service role, despite its name. The name is the trap: reviewers read names, not
--      missing clauses.
--
--   2. Permissive policies combine with OR. One `USING (true)` makes every careful
--      `client_id = current_client_id()` policy on the same table irrelevant. The weakest
--      policy on a table IS the policy.
--
-- EACH POLICY BELOW WAS CREATED BY A MIGRATION IN THE PRODUCTION PATH AND IS DROPPED NOWHERE
-- IN THAT PATH. The only DROP statements for them live in `supabase/staging-schema.sql`,
-- which is a STAGING snapshot. So unless somebody removed them by hand, they are live.
--
--   lead_enrichment     <- supabase/migrations/20260527_lead_enrichment.sql (enrichment on real people)
--   figsy_calls         <- packages/db/src/migrations/006_voice_calls.sql
--   webhook_triggers    <- supabase/MASTER_SCHEMA.sql
--   partners            <- packages/db/src/migrations/005_partners.sql
--   partner_commissions <- packages/db/src/migrations/005_partners.sql  (commission amounts)
--   partner_referrals   <- packages/db/src/migrations/005_partners.sql
--
-- WHY THIS IS SAFE. Dropping a permissive policy only ever REMOVES access. The API talks to
-- Postgres with the service-role key, which bypasses RLS entirely, so nothing the product
-- does is affected. No browser code reads any of these tables directly — verified by reading
-- every `.from('...')` call in the portal, website and admin apps. After the drop, RLS stays
-- ON with no permissive policy, so anon and authenticated get nothing.
--
-- NOTHING IS DELETED. These statements remove POLICY DEFINITIONS — not a row of data, not a
-- column, not a table (NOTHING GETS DELETED, founder-locked 26 Jul).
--
-- Idempotent: IF EXISTS throughout, and ENABLE ROW LEVEL SECURITY is a no-op when already on.
--
-- Also carried as a string in apps/api/src/lib/pending-migrations.ts (key
-- '20260727_rls_close_public_policies') and run from Vida -> Engine. Keep the two in step.

DROP POLICY IF EXISTS "Service role bypass" ON public.lead_enrichment;
DROP POLICY IF EXISTS "Service role bypass" ON public.figsy_calls;
DROP POLICY IF EXISTS "Service role bypass" ON public.webhook_triggers;
DROP POLICY IF EXISTS "Service role bypass" ON public.partners;
DROP POLICY IF EXISTS "Service role bypass" ON public.partner_commissions;
DROP POLICY IF EXISTS "Service role bypass" ON public.partner_referrals;

-- Belt: RLS must be ON, or dropping the policy achieves nothing (a table with RLS off is
-- readable regardless of what policies exist — the worst state of all, and the one with no
-- pg_policies row to give it away).
ALTER TABLE IF EXISTS public.lead_enrichment      ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.figsy_calls          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.webhook_triggers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.partners             ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.partner_commissions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.partner_referrals    ENABLE ROW LEVEL SECURITY;
