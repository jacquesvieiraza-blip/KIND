-- ═══════════════════════════════════════════════════════════════════════════════════════
-- 🛑 HELD OUT OF THE RUNNER ON PURPOSE — DO NOT ADD A PENDING_MIGRATIONS ENTRY FOR THIS.
--
-- This file is COMPLETE and reviewed. It is deliberately absent from
-- `apps/api/src/lib/pending-migrations.ts`, which is the list Vida applies, because Vida
-- applies ALL pending migrations together and this one must not go out with the other four.
-- It stays held until R2 is fully closed — the four production policy names below were read
-- off pg_policies by hand, and applying on a name that has since changed would silently
-- WIDEN access instead of narrowing it.
-- `delivery-rls-held.test.ts` fails the build if an entry appears.
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- BUILD-003 · item 1 — TENANT ISOLATION, RECONCILED AGAINST ACTUAL PRODUCTION
--
-- ⛓️ THIS FILE WAS REWRITTEN 29 Aug. The first version was built from the REPO's migration
-- history and got production wrong in two ways that mattered:
--
--   · It said `figsy_campaigns`, `figsy_enrollments`, `figsy_replies` and
--     `figsy_sent_emails` had ZERO policies. They have four, created outside the migration
--     record, named "clients see own campaigns" and so on — all command ALL.
--   · It therefore DROPPED policy names I had invented. Those DROPs would have matched
--     nothing, the CREATEs would have ADDED a second policy beside each real one, and
--     because PostgreSQL ORs permissive policies together the result would have been
--     STRICTLY MORE access, not less — while the PR claimed the tables were now SELECT-only.
--
-- A migration that runs without error and achieves the opposite of its description is worse
-- than one that fails, so the whole file is rebuilt against the state the founder read off
-- production directly.
--
-- ⚠️ WHY THIS IS SAFE TO NARROW ALL → SELECT. Verified before writing a line: NO portal
-- browser code writes any of these four tables. Every reference in `apps/portal/src` is a
-- `.select(...)` — seven of them, six inside the retired `(dashboard)` route group that the
-- portal middleware redirects to `/milla` for every signed-in client, and one under `/v2`,
-- which is gated behind the `V2_PREVIEW_EMAILS` allowlist (unset = nobody). The live Milla
-- console reads through the API on the service role, which bypasses RLS entirely.
--
-- WHAT IS DELIBERATELY NOT TOUCHED, because production is already correct:
--   leads, icps            tenant-scoped policies already exist
--   lead_pool              RLS on, zero policies — browser already denied
--   sourcing_ledger        RLS on, zero policies — browser already denied
--   service_role bypasses  "service role bypass campaigns" and its three siblings
--                          (002_figsy.sql:150-161). The API depends on them. Not referenced.
--   current_client_id()    already exists and is already used by leads_own/icps_own, so it
--                          works and `authenticated` can execute it. This migration needs no
--                          correction to it and makes none — replacing a function that live
--                          policies depend on, to change nothing, is risk bought for nothing.
--
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════════════


-- ── 1 · THE FOUR REAL POLICIES: ALL → SELECT ────────────────────────────────────────────
--
-- ⚠️ DROPPED BY THEIR REAL PRODUCTION NAMES. This is the whole correction. A DROP that names
-- a policy which does not exist is a silent no-op, and the CREATE that follows then ADDS to
-- whatever was already there — permissive policies are ORed, so narrowing by addition is
-- impossible. Only a DROP that actually bites can narrow anything.
--
-- WHY NARROW AT ALL. These are delivery RECORDS: what we sent, who replied, what a campaign
-- did. `FOR ALL` lets a signed-in client UPDATE and DELETE them — the evidence behind their
-- own invoice, and the source of the outcome numbers the commercial model is judged on. No
-- product feature has ever used that write access; it was granted by default rather than by
-- decision.

DROP POLICY IF EXISTS "clients see own campaigns"   ON public.figsy_campaigns;
DROP POLICY IF EXISTS "clients see own enrollments" ON public.figsy_enrollments;
DROP POLICY IF EXISTS "clients see own replies"     ON public.figsy_replies;
DROP POLICY IF EXISTS "clients see own sent emails" ON public.figsy_sent_emails;

-- Re-created under the SAME NAMES, so this migration is idempotent against its own result
-- and so anyone reading pg_policies sees the name they expect with a narrower command.
CREATE POLICY "clients see own campaigns" ON public.figsy_campaigns
  FOR SELECT TO authenticated USING (client_id = public.current_client_id());

CREATE POLICY "clients see own enrollments" ON public.figsy_enrollments
  FOR SELECT TO authenticated USING (client_id = public.current_client_id());

CREATE POLICY "clients see own replies" ON public.figsy_replies
  FOR SELECT TO authenticated USING (client_id = public.current_client_id());

CREATE POLICY "clients see own sent emails" ON public.figsy_sent_emails
  FOR SELECT TO authenticated USING (client_id = public.current_client_id());


-- ── 2 · opt_out_blocklist — THE ONE REAL DEFECT ────────────────────────────────────────
--
-- 🔴 PRODUCTION CARRIES BOTH OF THESE, CONFIRMED BY DIRECT INSPECTION:
--     "blocklist_read"   FOR SELECT USING (auth.role() = 'authenticated')
--     "blocklist_write"  FOR INSERT WITH CHECK (auth.role() = 'authenticated')
--
-- Neither has a tenant predicate, on a table that HAS `blocked_by_client_id`. So today any
-- signed-in client can read EVERY suppressed address on the platform — other clients'
-- prospects, by email — and can INSERT arbitrary addresses. Suppression takes effect across
-- every K.I.N.D send path, so that insert is globally effective: a client could silence
-- anyone they chose, and it would look like ordinary use.
--
-- FOUNDER RULING, 29 Aug — suppression EFFECT is global, blocklist VISIBILITY is not, and a
-- browser must not write global suppression at all. Scoping the write to
-- `blocked_by_client_id = current_client_id()` would NOT be sufficient: the row would still
-- suppress that person for every client.
--
-- ⚠️ NO REPLACEMENT SELECT POLICY, AND THAT IS A DECISION. The first draft kept a
-- tenant-local read. Checked before writing this: `apps/portal/src` contains ZERO references
-- to `opt_out_blocklist` — no live customer path reads it. A policy granting access nobody
-- uses is attack surface with no product behind it, so the raw list stays backend-only. RLS
-- on with no policy IS the deny for `authenticated`; the service role bypasses it, and every
-- send gate reads the whole table exactly as before.
--
-- If a client-facing suppression view is ever wanted, it comes back as a controlled API
-- surface, not as direct table access.
--
-- ⚠️ A PRODUCT RULE. No claim of legal sufficiency, and no PECR compliance asserted.

DROP POLICY IF EXISTS "blocklist_read"  ON public.opt_out_blocklist;
DROP POLICY IF EXISTS "blocklist_write" ON public.opt_out_blocklist;
-- Defensive: the earlier draft of this migration created "blocklist_own". If any environment
-- ran that version, remove it too so the end state is the same everywhere.
DROP POLICY IF EXISTS "blocklist_own"   ON public.opt_out_blocklist;


-- ── 3 · NOTHING ELSE ───────────────────────────────────────────────────────────────────
--
-- No statements for leads, icps, lead_pool or sourcing_ledger. Production is already in the
-- intended state for all four, and the previous draft's ALTER/DROP lines for them were pure
-- no-ops that made the migration look like it was doing nine tables' worth of work.
--
-- ⚠️ RUNTIME UNVERIFIED. Written against the founder's direct inspection of production on
-- 29 Aug. The policy names above are the load-bearing detail: if any differs, its DROP
-- silently misses and its CREATE adds rather than replaces — the exact failure this rewrite
-- exists to remove. Confirm the four names in pg_policies before applying.
