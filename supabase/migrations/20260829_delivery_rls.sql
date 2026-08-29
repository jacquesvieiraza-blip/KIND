-- ═══════════════════════════════════════════════════════════════════════════════════════
-- BUILD-003 · item 1 — TENANT ISOLATION ON THE NINE DELIVERY TABLES
--
-- ⚠️ R2 GATES APPLYING THIS FILE, AND ONLY THIS FILE. It is split out from meetings,
-- reply idempotency and delivery attribution precisely so the runtime gate on browser
-- access does not also hold those three hostage. Nothing here is applied until the founder
-- has verified what production actually serves on the anon/authenticated role.
--
-- The API connects with SUPABASE_SERVICE_ROLE_KEY (packages/db/src/client.ts:16), which
-- BYPASSES RLS entirely. So none of this touches the backend. This is exactly and only the
-- boundary for what a signed-in client's BROWSER may read on the anon key.
--
-- FOUR STATES WERE FOUND, NOT ONE, so this migration does four different things:
--   · leads, icps                       RLS on, correct policy      → PRESERVED untouched
--   · figsy_campaigns, figsy_enrollments,
--     figsy_replies, figsy_sent_emails  RLS on, ZERO policies       → policies ADDED
--   · opt_out_blocklist                 RLS on, DEFECTIVE policies  → REPLACED
--   · lead_pool, sourcing_ledger        RLS off                     → ENABLED, browser denied
--
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- The helper already exists (packages/db/src/schema.sql:256). Restated with the hardening
-- the rest of BUILD-003 uses, and not loosened: SECURITY INVOKER so it resolves as the
-- caller and can never become a privilege ladder, and an empty search_path so no
-- attacker-controlled schema can shadow `clients` or `auth.uid`.
CREATE OR REPLACE FUNCTION public.current_client_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT c.id FROM public.clients c WHERE c.user_id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_client_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_client_id() TO authenticated;

-- ── 1 · THE FOUR RLS-ON, ZERO-POLICY TABLES ─────────────────────────────────────────────
--
-- ⚠️ THIS IS A RESTORATION, NOT A TIGHTENING. RLS with no policy denies every row to the
-- authenticated role, and PostgREST reports that denial as an EMPTY SUCCESS — `{data: [],
-- error: null}`, `count: 0`. The client dashboard reads all four of these from the browser
-- (DashboardLive.tsx) and takes the empty result as truth: `if (count !== null)
-- setTotalSent(count)` writes ZERO. So these tables do not leak today — they silently answer
-- nothing, and the dashboard's own server-rendered figures are overwritten with zeros on
-- hydration. The policy is what lets a client see their own data again while still denying
-- it to everyone else.
--
-- CODE VERIFIED. Whether production has 002_figsy.sql's RLS statements applied is R2 and is
-- RUNTIME UNVERIFIED — it is not asserted here.

ALTER TABLE public.figsy_campaigns   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.figsy_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.figsy_replies     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.figsy_sent_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "figsy_campaigns_own"   ON public.figsy_campaigns;
DROP POLICY IF EXISTS "figsy_enrollments_own" ON public.figsy_enrollments;
DROP POLICY IF EXISTS "figsy_replies_own"     ON public.figsy_replies;
DROP POLICY IF EXISTS "figsy_sent_emails_own" ON public.figsy_sent_emails;

-- ⚠️ SELECT ONLY, DELIBERATELY — "no unnecessary browser mutation rights". These four are
-- delivery RECORDS: what we sent, who replied, what a campaign did. A client editing their
-- own reply history or send log would be editing the evidence behind their own invoice.
-- Every writer in the repo is already server-side on the service role.
CREATE POLICY "figsy_campaigns_own" ON public.figsy_campaigns
  FOR SELECT TO authenticated USING (client_id = public.current_client_id());

CREATE POLICY "figsy_enrollments_own" ON public.figsy_enrollments
  FOR SELECT TO authenticated USING (client_id = public.current_client_id());

CREATE POLICY "figsy_replies_own" ON public.figsy_replies
  FOR SELECT TO authenticated USING (client_id = public.current_client_id());

-- #637 added figsy_sent_emails.client_id so this table could be attributed at all, and the
-- dashboard's sent counter filters on it. Without that column this policy could only be a
-- two-hop join through enrollments.
CREATE POLICY "figsy_sent_emails_own" ON public.figsy_sent_emails
  FOR SELECT TO authenticated USING (client_id = public.current_client_id());

-- ── 2 · opt_out_blocklist — THE DEFECTIVE POLICIES, REPLACED ────────────────────────────
--
-- 🔴 DISCOVERED DEFECT (BUILD-003 item 1, found by the Builder while scoping, recorded as
-- founder-directed evidence). packages/db/src/schema.sql:288-291 shipped:
--
--     create policy "blocklist_read"  on public.opt_out_blocklist
--       for select using (auth.role() = 'authenticated');
--     create policy "blocklist_write" on public.opt_out_blocklist
--       for insert with check (auth.role() = 'authenticated');
--
-- Neither carries a tenant predicate, on a table that HAS `blocked_by_client_id`. Any
-- signed-in client could read EVERY suppressed address on the platform — other clients'
-- prospects, by email — and could INSERT arbitrary addresses.
--
-- FOUNDER RULING, 29 Aug — suppression EFFECT is global, blocklist VISIBILITY is not:
--   · a legitimately suppressed address is blocked on every K.I.N.D send path, and a later
--     client cannot cause us to contact that person again;
--   · no client may browse, enumerate or infer another client's suppressed addresses — the
--     raw global list is operational infrastructure, not shared client data;
--   · a browser must not write global suppression AT ALL. Scoping the write to
--     `blocked_by_client_id = current_client_id()` is NOT sufficient: the row would still be
--     globally effective, so a malicious client could submit any person's address and
--     suppress them everywhere while looking perfectly well-behaved.
--
-- ⚠️ A PRODUCT RULE. This says nothing about legal sufficiency and claims no PECR compliance.
--
-- Verified before removing the INSERT policy, per the founder's stop-condition: NO browser or
-- portal code writes this table. Every writer is server-side on the service role —
-- routes/leads.ts:71,776 · routes/figsy.ts:81,241 · routes/whatsapp.ts:103,112. Removing the
-- browser write breaks no existing workflow.

DROP POLICY IF EXISTS "blocklist_read"  ON public.opt_out_blocklist;
DROP POLICY IF EXISTS "blocklist_write" ON public.opt_out_blocklist;
DROP POLICY IF EXISTS "blocklist_own"   ON public.opt_out_blocklist;

-- Customer visibility is TENANT-LOCAL: a client sees only what their own activity produced,
-- never the global list and never a global row carrying another tenant's address. Backend
-- enforcement stays GLOBAL — the service role bypasses this policy and every send gate reads
-- the whole table.
CREATE POLICY "blocklist_own" ON public.opt_out_blocklist
  FOR SELECT TO authenticated USING (blocked_by_client_id = public.current_client_id());

-- No INSERT/UPDATE/DELETE policy for `authenticated` exists, by design. A suppression
-- request goes through the API, which verifies the caller and that the address belongs to a
-- contact that client is entitled to act on, and only then writes the globally-effective row.

-- ── 3 · THE TWO RLS-OFF TABLES — BROWSER DENIED OUTRIGHT ────────────────────────────────
--
-- Neither is client-facing and neither gets a policy: RLS enabled with no policy IS the deny
-- for `authenticated`, while the service role bypasses it. That is exactly the boundary.
--
-- lead_pool has NO tenant column at all — it is the shared pool by design, so no per-tenant
-- predicate could be written even if we wanted one; exposing it would expose every other
-- client's pooled identities.
--
-- sourcing_ledger DOES have client_id and is still denied, because it carries `cost_usd` —
-- our provider cost per record. A per-tenant read policy would hand every client our internal
-- economics on their own leads.

ALTER TABLE public.lead_pool       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sourcing_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_pool_no_browser"       ON public.lead_pool;
DROP POLICY IF EXISTS "sourcing_ledger_no_browser" ON public.sourcing_ledger;

-- leads and icps are deliberately NOT touched: `leads_own` and `icps_own` already carry the
-- correct `client_id = public.current_client_id()` predicate. Re-issuing them here would risk
-- narrowing a working policy for the sake of tidiness.
