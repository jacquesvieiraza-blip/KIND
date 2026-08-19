-- ============================================================================
-- HC-7 — THE FOUR CRITICAL FINDINGS SUPABASE'S OWN SECURITY ADVISOR REPORTED
-- ON PRODUCTION, 19 Aug 2026. Found by the founder's own dashboard check, not
-- by any test we own — which is the point of the guard added alongside this.
--
-- The advisor's four errors resolve to THREE objects:
--
--   ① Exposed Auth Users    → public.lead_pool_pnl (view)
--   ② Security Definer View → public.lead_pool_pnl (the same view)
--   ③ RLS Disabled in Public → public.partner_ramp_contacts
--   ④ RLS Disabled in Public → public.partner_signed_documents
--
-- ── WHY THIS IS REAL AND NOT THEORETICAL ────────────────────────────────────
-- `apps/portal/src/lib/supabase/client.ts` ships NEXT_PUBLIC_SUPABASE_ANON_KEY
-- to every browser that loads Milla — that is normal and by design. Anything
-- exposed to PostgREST with RLS off is therefore readable by anyone who lifts
-- that key out of the bundle. `lead_pool_pnl` selects `email_norm`, company,
-- title, `acquisition_cost`, reveals, works, `revenue_usd` and `roi`: prospect
-- email addresses AND our own per-record margins.
--
-- ⛓️ CORRECTED 19 Aug, SAME DAY, BY 20260819_pool_pnl_service_role_grant.
-- The sentence below about the service role keeping "every underlying right
-- (including auth.users)" under `security_invoker` IS FALSE. It was reasoned
-- from how Supabase roles usually behave and never verified against this
-- database. Turning on invoker rights made the view run as `service_role`,
-- which has NO SELECT on `auth.users` — and the view joins that table twice —
-- so Vida → Money Path's pool section broke within minutes of the deploy. The
-- RLS half of this migration was correct and is untouched; the grant migration
-- restores the view. Kept verbatim, struck rather than rewritten, because this
-- is what actually ran in production.
--
-- ── WHY ENABLING RLS CANNOT BREAK THE PRODUCT ───────────────────────────────
-- `packages/db/src/client.ts` builds the API's only client with
-- SUPABASE_SERVICE_ROLE_KEY, and throws at boot without it. The service role
-- bypasses RLS entirely. Every reader of these objects is server-side on that
-- client — `money-path.ts:240` for the view, `routes/partners.ts` for the two
-- tables. Adding RLS with NO policies removes access from anon and
-- authenticated and changes nothing for the product. Same reasoning, same
-- shape, as `20260727_rls_live_findings`.
--
-- ── error_events IS HERE FOR A DIFFERENT REASON (founder-approved, 19 Aug) ──
-- The advisor did NOT flag it, so production most likely has RLS on it already
-- by a route no file records. But the runner CREATEs it (`20260703_error_events`)
-- and never enables RLS, so the systemic guard shipped with this migration
-- counts it as a violation — correctly. Enabling it here is idempotent: a no-op
-- if production already has it, a real fix if the advisor is simply not
-- surfacing it. The founder chose this over allowlisting an unverified belief.
--
-- ── THE ONE RISK, STATED OUT LOUD ───────────────────────────────────────────
-- `ALTER VIEW ... SET (security_invoker = true)` requires PostgreSQL 15+.
-- `runPendingMigrations` sends each entry as ONE multi-statement query, which
-- Postgres treats as one implicit transaction — so on PG14 that line would
-- fail and roll back the RLS lines with it. It would NOT be silent: the runner
-- records {key, ok:false, error} per migration and Vida renders it. If the run
-- reports an error naming security_invoker, split this entry — the REVOKE and
-- the three ALTER TABLEs stand on their own.
-- ============================================================================

-- ① ② The view. REVOKE removes the grant; security_invoker stops it running
--     with its creator's rights (which is how a view over auth.users reaches
--     anon at all). The SELECT itself is untouched — 20260717's definition
--     stays byte-identical, because a redefinition here could silently undo
--     the house/demo revenue exclusion it exists to enforce.
ALTER VIEW public.lead_pool_pnl SET (security_invoker = true);
REVOKE ALL ON public.lead_pool_pnl FROM anon, authenticated;

-- ③ The seller's own network contacts. Real people, typed by her. The
--    migration that created it (20260817_seller_ramp) says in its own title
--    "personal data: the operator console shows counts only, never names" —
--    and then left the table readable with the public key.
ALTER TABLE IF EXISTS public.partner_ramp_contacts ENABLE ROW LEVEL SECURITY;

-- ④ The frozen, verbatim signed partner contracts (R42) — address, country,
--    mobile and payout details, once a real seat signs. Empty today, which is
--    the only reason this is a near-miss rather than a breach.
ALTER TABLE IF EXISTS public.partner_signed_documents ENABLE ROW LEVEL SECURITY;

-- ⑤ Not advisor-flagged; see the header. Idempotent either way.
ALTER TABLE IF EXISTS public.error_events ENABLE ROW LEVEL SECURITY;
