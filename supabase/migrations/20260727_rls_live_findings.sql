-- #554b — WHAT THE LIVE RLS AUDIT ACTUALLY FOUND IN PRODUCTION (27 Jul 2026, 11:12 UTC).
--
-- The repo-based verdict in docs/RLS-AUDIT.md predicted five exposed tables. The live run
-- against production returned THREE, and none of the five. The file verdict was wrong in
-- BOTH directions: it named five tables that are fine, and it missed the most sensitive
-- table in the product. That is the justification for reading pg_catalog instead of files.
--
--   1. client_inboxes — RLS OFF, NO POLICIES.
--      Holds smtp_pass_enc, smtp_host, smtp_user and email: how we log in to send as each
--      client. RLS was never enabled anywhere in the repo — 20260725_client_inboxes created
--      the table and simply never included the line, so there was nothing for a file-based
--      audit to read. With RLS off, anyone holding the PUBLIC anon key could read every
--      client's mailbox configuration. The passwords are AES-256-GCM ciphertext
--      (lib/inbox-secret.ts) so this was never plaintext credentials, but the hosts,
--      usernames and addresses are plain and the ciphertext should not have been fetchable.
--
--   2. app_migrations_applied — RLS OFF.
--      Created as a SIDE EFFECT of apps/api/src/migrations/20260724_one_wallet.sql via
--      CREATE TABLE IF NOT EXISTS, so it never passed through a review that would have
--      asked about RLS. Low sensitivity, but internal bookkeeping no browser should read.
--
--   3. agreement_templates.agreement_templates_admin_write — A POLICY THAT EXISTS ONLY IN
--      PRODUCTION. The repo has never contained it; it knows only agreement_templates_read.
--      Someone created it by hand. FOR ALL USING (true) on a browser-reachable role grants
--      read AND write on the contract templates to anyone with the public key.
--      This is #558 pointing the other way: production carries policies no file can show
--      you, so an audit that reads only the repo is blind to them.
--
-- WHY THIS IS SAFE. Nothing in a browser touches any of these three tables. Re-derived from
-- CLIENT COMPONENTS ONLY — the earlier pass wrongly counted Next.js server route handlers,
-- which build their client with SUPABASE_SERVICE_ROLE_KEY and bypass RLS entirely. The real
-- browser-read set is five tables: clients, leads, figsy_campaigns, figsy_replies,
-- figsy_sent_emails. Every path that touches the three below is server-side on the service
-- role, which RLS does not apply to.
--
-- NOTHING IS DELETED. Two ENABLEs and one DROP POLICY — no data, no columns, no tables.
-- Idempotent throughout.
--
-- Also carried as a string in apps/api/src/lib/pending-migrations.ts (key
-- '20260727_rls_live_findings') and run from Vida -> Engine. Keep the two in step.

-- ① The mailbox table. This is the one that matters.
ALTER TABLE IF EXISTS public.client_inboxes ENABLE ROW LEVEL SECURITY;

-- ② Migration bookkeeping, created as a side effect and never reviewed.
ALTER TABLE IF EXISTS public.app_migrations_applied ENABLE ROW LEVEL SECURITY;

-- ③ A production-only policy the repo has never contained. FOR ALL USING (true) on a
--    browser-reachable role = read and write on the contract templates for anyone holding
--    the public key. Dropped; RLS stays on, and every real caller is server-side on the
--    service role.
DROP POLICY IF EXISTS agreement_templates_admin_write ON public.agreement_templates;
ALTER TABLE IF EXISTS public.agreement_templates ENABLE ROW LEVEL SECURITY;
