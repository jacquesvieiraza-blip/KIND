// PENDING MIGRATIONS — the only sanctioned way to execute schema changes, run from Vida.
//
// ⛓️ THE ORIGINAL HEADLINE — was true until 19 Aug 2026:
//     "runnable from Vida, because the Supabase SQL editor is unreachable."
// It is no longer the reason. See the correction below the next paragraph.
//
// ⛓️ WAS TRUE UNTIL 19 AUG 2026:
// Supabase login is GitHub OAuth and the founder's GitHub account is flagged ("cannot
// authorize a third party application"), so the dashboard cannot be opened at all. No psql,
// no Homebrew, and deliberately no new tooling. What we DO have is this API — which already
// holds DATABASE_URL — and Vida, which already talks to it behind the admin key.
//
// ── THE CURRENT TRUTH (19 Aug 2026) ──────────────────────────────────────────
//
// THE DASHBOARD IS REACHABLE. The founder opened it repeatedly on 19 Aug and screenshotted
// it — the Advisor, the Table Editor, and the `app_migrations_applied` rows. The paragraph
// above describes a constraint that no longer holds.
//
// Stated precisely, because this file is the wrong place to guess: what is PROVEN is that the
// dashboard opens. Whether the GitHub account flag was lifted, or Supabase login simply
// works by another route, is NOT established here — GitHub Actions remains dead from that
// same flag. So this comment claims the dashboard, and nothing about the vendor's account.
//
// ⚠️ NOTHING ABOUT THE DESIGN CHANGES, AND THE REASON IS NOT THE ONE ABOVE.
//
// The runner remains the ONLY sanctioned way to execute a migration. O3 stands: no ad-hoc
// SQL, ever — not in the dashboard's SQL editor, not anywhere. A reachable SQL editor is a
// place to LOOK, never a place to RUN.
//
// This design is kept because these statements are REVIEWED, COMMITTED and IDEMPOTENT —
// not because the dashboard is unreachable. That was always the real justification; the
// unreachable dashboard was only what forced us to notice it. SQL typed into an editor is
// unreviewed, uncommitted, unrepeatable and invisible to every check in this repo, and it
// would be exactly as forbidden if the dashboard had been reachable the whole time.
//
// So the SQL lives here as a string constant (NOT read from disk: .sql files are not copied
// into dist/ by tsc, so a file read would work locally and fail in production), and an
// admin-gated endpoint executes it. Arbitrary SQL is never accepted over HTTP — only these
// reviewed, committed, IDEMPOTENT statements, which is why re-running is harmless.

export type PendingMigration = { key: string; title: string; sql: string }

export const PENDING_MIGRATIONS: PendingMigration[] = [
  {
    key: '20260831_notification_prefs_and_referral_handoff',
    title: 'clients gains two real notification switches and a referral handoff marker (BUILD-004A-2D)',
    sql: `
-- ── NOTIFICATION PREFERENCES + REFERRAL HANDOFF — canonical copy:
--    supabase/migrations/20260831_notification_prefs_and_referral_handoff.sql
--
-- WHAT WAS BROKEN (the 4A-2D audit). The Settings notification panel showed three rows badged
-- "Soon" with DISABLED switches — and the crons behind them ran anyway: /digest/weekly every
-- Monday and /figsy/check-performance every morning. A client was receiving email the product
-- told them did not exist yet, with no way to stop it. #326 wrote "Soon" when those toggles
-- genuinely did nothing; the emails were built afterwards and nobody returned to the switch.
--
-- ⚠️ THE PREFERENCE MUST BE A COLUMN, NOT localStorage. The other panel rows stored their
-- state in the browser, which is exactly why they never worked: the thing that has to obey a
-- notification preference is a cron, and a cron cannot read a browser. \`daily_brief_enabled\`
-- is already a column for this precise reason (R2/#27) — these two join it.
--
-- ⚠️ NULLABLE, NO DEFAULT — the #599 precedent. A DEFAULT would stamp every historic row with
-- a preference nobody chose. NULL means "never chose", and the code reads NULL as "keep doing
-- what we do today", so applying this migration changes nobody's mail on its own.
--
-- ⚠️ \`referral_handoff_at\` IS A NEW COLUMN AND NOT A REUSE OF \`referral_bonus_paid_at\`,
-- WHICH IS THE WHOLE POINT. The automatic $45 wallet credit is retired (founder decision D2),
-- but the refund path still reads \`referral_bonus_paid_at\` to decide whether to claw $45
-- back out of a wallet. Marking new, unpaid referrals with that column would make the first
-- refund reclaim money that was never granted. Historic paid referrals keep their marker and
-- keep reversing correctly; new ones are marked here instead.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS campaign_paused_emails_enabled boolean,
  ADD COLUMN IF NOT EXISTS weekly_digest_enabled          boolean,
  ADD COLUMN IF NOT EXISTS referral_handoff_at            timestamptz;
`.trim(),
  },
  {
    key: '20260827_proof_review_handoff',
    title: 'clients gains a proof-review handoff — the exhausted prospect becomes real work, not a promise',
    sql: `
-- ── PROOF REVIEW HANDOFF — canonical copy: supabase/migrations/20260827_proof_review_handoff.sql
--
-- WHAT WAS BROKEN. A prospect who had used both free proof passes and asked for another was
-- told *"K.I.N.D will review this with you."* Nobody at K.I.N.D was told. No row, no alert,
-- no operator surface. The sentence was true about our intent and false about our system.
--
-- ⚠️ ON \`clients\`, NOT \`icps\`, because that is where the proof state already lives
-- (\`proof_passes_done\`, \`proof_records_committed\` — 20260822_free_proof_acquisition.sql)
-- and because the two-pass ceiling is counted PER PROSPECT. A flag on \`icps\` would let one
-- prospect hold several unresolved reviews at once — the exact duplicate this prevents.
--
-- ⚠️ THE TRIGGER IS THE ASK, NOT THE PASS COUNT. \`proof_passes_done >= 2\` alone means both
-- passes were merely GENERATED — the healthy end of a proof that worked. The review is owed
-- when the client has used both AND come back for another. Only the refused third attempt
-- writes these columns.
--
--   requested_at IS NOT NULL AND resolved_at IS NULL  ->  a human review is OWED
--   resolved_at IS NOT NULL                           ->  an operator handled it
--   both NULL                                         ->  nothing owed (the normal state)
--
-- Additive only. Every existing row reads as "nothing owed" without being touched.

alter table public.clients
  add column if not exists proof_review_requested_at timestamptz,
  add column if not exists proof_review_resolved_at  timestamptz,
  add column if not exists proof_review_icp_id       uuid;

create index if not exists clients_proof_review_open_idx
  on public.clients (proof_review_requested_at)
  where proof_review_requested_at is not null
    and proof_review_resolved_at is null;
`,
  },
  {
    key: '20260826_run_outcome_failed',
    title: "icp_run_outcomes.status gains 'failed' — a crashed proof run is a terminal fact, not a silent spinner (R72)",
    sql: `
-- ── icp_run_outcomes.status gains 'failed' — a crash is a TERMINAL FACT ─────────
--
-- WHY. \`runIcpJob\` records an outcome only when it FINISHES. A run that threw recorded
-- nothing at all, so the proof desk had no terminal row to read and sat on "Finding your
-- matches now…" forever. The five existing statuses cannot carry a crash: \`no_match\`
-- would tell a prospect their targeting matched nobody WHEN WE NEVER ASKED, and
-- \`audience_exhausted\` would claim they already hold everyone. Both are lies, and both
-- are the class of lie R72 forbids. So the state gets its own value.
--
-- ⚠️ \`failed\` IS NEVER DERIVED. \`deriveRunStatus\` cannot return it — it is written only
-- at the crash boundary, by the handler that caught the throw. A run that completes
-- honestly can never be labelled failed, and a run that crashed can never be labelled
-- anything else.
--
-- ⚠️ INTERNAL WORD, NOT A CUSTOMER-FACING ONE. The prospect is never shown "failed";
-- they see the approved recovery copy. This value exists so the SYSTEM can tell the
-- truth to itself.

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'icp_run_outcomes_status_check') then
    alter table public.icp_run_outcomes drop constraint icp_run_outcomes_status_check;
  end if;
end $$;

alter table public.icp_run_outcomes
  add constraint icp_run_outcomes_status_check
  check (status in ('served','no_match','quota_exhausted','demo','audience_exhausted','failed'));

comment on column public.icp_run_outcomes.status is
  'Terminal outcome of one ICP run. served = leads delivered. no_match = the query ran and matched nobody. audience_exhausted = the query ran and we already hold everyone in it. quota_exhausted = refused before it could run. demo = pool-only run. failed = THE RUN CRASHED — written only at the crash boundary, never derived, and never shown to a client as the word "failed" (they see the approved recovery copy). A crash must never be recorded as no_match: that would claim the targeting matched nobody when the query never completed.';
`.trim(),
  },
  {
    key: '20260826_acquisition_memory',
    title: 'acquisition_memory — every identity K.I.N.D paid a provider to acquire, retained before any client gate can discard it (R67). Retention is NOT contactability.',
    sql: `
-- ── acquisition_memory — every identity K.I.N.D PAID a provider to acquire ──────
--
-- WHY THIS IS NOT lead_pool. \`lead_pool.email_norm\` is the PRIMARY KEY, so a paid
-- record with no email cannot be stored there at all — not a policy choice, a schema
-- impossibility. And the pool write in \`runIcpJob\` sits BELOW every client gate: a
-- record dropped for this client's budget cap, this client's duplicate, a DNC hit or
-- an opt-out hit was paid for and then forgotten, so the next run buys the same person
-- again. This table is the company's memory; \`lead_pool\` stays the CONTACTABLE
-- inventory. Founder rule (R67, 25 Aug): RETENTION IS NOT CONTACTABILITY.
--
-- ⚠️ THIS TABLE NEVER MAKES ANYONE CONTACTABLE. Nothing in the send, consent, reveal
-- or scoring path reads it. \`contactable\` is stored as a FACT ABOUT THE RECORD, never
-- as permission: suppression, opt-out and DNC always win, and a row here exists so we
-- remember we have already seen and paid for a person we must not contact.
--
-- ⚠️ COST IS WRITTEN ONCE. The unique key is (source, provider_id) and every write is
-- ON CONFLICT DO NOTHING, so a person re-encountered on a later run — for this client
-- or any other — never rewrites acquisition_cost_usd and never double-counts it.
--
-- ⚠️ REMEMBERING SOMEONE DOES NOT STOP A PROVIDER BILLING FOR THEM AGAIN. \`buildPdlBody\`
-- emits \`bool.must\` only — zero \`must_not\` — so PDL decides what to return before we
-- see it. Provider-id exclusion is OPEN RESEARCH, not something this table delivers.

CREATE TABLE IF NOT EXISTS public.acquisition_memory (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Provenance: who we bought it from, and their stable id for the person. This pair
  -- is the identity key precisely so an EMAILLESS record still has one.
  source               text        NOT NULL,
  provider_id          text        NOT NULL,

  -- What we paid, once, the first time we ever saw this identity.
  acquisition_cost_usd numeric     NOT NULL DEFAULT 0,
  acquired_at          timestamptz NOT NULL DEFAULT now(),

  -- Minimum useful identity for recognition and dedupe. Email is NULLABLE by design:
  -- a relevant person with no email is still proof of targeting fit and still cost money.
  email_norm           text,
  first_name           text,
  last_name            text,
  title                text,
  seniority            text,
  company              text,
  industry             text,
  company_size         text,
  country              text,
  linkedin_url         text,

  -- Contactability recorded SEPARATELY from retention, and never read as permission.
  -- false = we know we must not contact this person; the row still exists so we do not
  -- treat them as unknown and re-buy them.
  contactable          boolean     NOT NULL DEFAULT true,
  -- Why they are not contactable, when we know: 'suppressed' | 'opt_out' | 'dnc' | NULL.
  suppression_reason   text,

  -- Which run first paid for them. NOT ownership — this table is company-wide, and a
  -- client rejecting a record must never destroy the company's asset.
  first_seen_client_id uuid,

  notes                text
);

-- The identity key. Emailless records get one because it is (source, provider_id).
CREATE UNIQUE INDEX IF NOT EXISTS acquisition_memory_provider_key
  ON public.acquisition_memory (source, provider_id);

-- Recognise a person we already own by email, when they have one.
CREATE INDEX IF NOT EXISTS acquisition_memory_email_idx
  ON public.acquisition_memory (email_norm) WHERE email_norm IS NOT NULL;

CREATE INDEX IF NOT EXISTS acquisition_memory_acquired_idx
  ON public.acquisition_memory (acquired_at DESC);

COMMENT ON TABLE public.acquisition_memory IS
  'Company acquisition memory: every identity K.I.N.D paid a provider to acquire, retained BEFORE any client-specific gate can discard it (founder rule R67, 25 Aug). RETENTION IS NOT CONTACTABILITY — nothing in the send, consent, reveal or scoring path reads this table, and a row here never makes anyone contactable. Suppression, opt-out and DNC always override serving and contact. Identity key is (source, provider_id) so emailless paid records are retained; every write is ON CONFLICT DO NOTHING so acquisition_cost_usd is written once and never double-counted on reuse or dedupe. Client rejection does not delete rows here. OPEN: remembering an identity does NOT prove a provider will not bill for it again — provider-id exclusion is unresolved research, and retention period, privacy-policy wording and DSR treatment for retained suppressed identities are all still open.';

COMMENT ON COLUMN public.acquisition_memory.contactable IS
  'A FACT ABOUT THE RECORD, NEVER A PERMISSION. false means we know this person must not be contacted; the row is kept so we remember we have already paid for them. Serving and sending decisions are made by the suppression list, the opt-out blocklist and the send path — never by this column.';

COMMENT ON COLUMN public.acquisition_memory.acquisition_cost_usd IS
  'What we paid the FIRST time this identity was acquired. Never rewritten: the unique index on (source, provider_id) plus ON CONFLICT DO NOTHING means a re-encounter is ignored, so reuse and dedupe cannot double-count acquisition cost.';

-- ⚠️ RLS ON, NO POLICIES — DENY BY DEFAULT. Caught by \`schema-drift.test.ts\` before this
-- ever shipped: a table exposed to PostgREST with RLS off is readable by anyone holding
-- the public anon key, and \`apps/portal\` ships that key to every browser. Nothing
-- client-facing reads this table — every legitimate caller is server-side on the service
-- role, which bypasses RLS — so the correct policy set is EMPTY. A policy added here
-- later is a decision to expose company acquisition memory to a browser.
ALTER TABLE IF EXISTS public.acquisition_memory ENABLE ROW LEVEL SECURITY;
`.trim(),
  },
  {
    // #547/#548 — the sending spine. Option B (founder-locked 26 Jul): the provider warms
    // the mailbox, WE press send through it, so the product needs somewhere to keep the
    // connection details. The password column holds AES-256-GCM ciphertext only — see
    // lib/inbox-secret.ts; plaintext must never reach this table.
    key: '20260726_inbox_smtp',
    title: 'Mailbox SMTP details on client_inboxes (#547 — send as the client, never from a shared address)',
    sql: `
ALTER TABLE public.client_inboxes
  ADD COLUMN IF NOT EXISTS smtp_host     text,
  ADD COLUMN IF NOT EXISTS smtp_port     integer,
  ADD COLUMN IF NOT EXISTS smtp_secure   boolean,
  ADD COLUMN IF NOT EXISTS smtp_user     text,
  ADD COLUMN IF NOT EXISTS smtp_pass_enc text,
  ADD COLUMN IF NOT EXISTS from_name     text;

COMMENT ON COLUMN public.client_inboxes.smtp_pass_enc IS
  'AES-256-GCM ciphertext (v1:iv:tag:body) of the mailbox password, encrypted with INBOX_SECRET_KEY. NEVER plaintext, and never returned by any API surface.';
COMMENT ON COLUMN public.client_inboxes.from_name IS
  'Display name on the From header. The ADDRESS is always client_inboxes.email — a mismatch reads as spoofing to the receiving server.';
`.trim(),
  },
  {
    key: '20260726_wallet_tx_types',
    title: 'Ledger accepts the wallet types the money model writes (pins the live constraint)',
    sql: `
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'credit_transactions_type_check') then
    alter table public.credit_transactions drop constraint credit_transactions_type_check;
  end if;
end $$;

alter table public.credit_transactions
  add constraint credit_transactions_type_check
  check (type in (
    'purchase','credit_purchase',
    'referral','referral_bonus',
    'trial_bonus',
    'consumed','usage',
    'manual_grant','refund',
    'wallet_topup','wallet_charge','wallet_reverse'
  ));
`.trim(),
  },
  {
    key: '20260726_client_contact_name',
    title: "Who we're speaking to (flow v2 step 0 — name on the client row)",
    sql: `
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS contact_name text;

COMMENT ON COLUMN public.clients.contact_name IS
  'Who we are speaking to at this client (flow v2 step 0). Not signer_name, which is who signs outbound email.';
`.trim(),
  },
  {
    key: '20260725_client_inboxes',
    title: 'Client inboxes (Engine + pooled→branded inbox SOP)',
    sql: `
CREATE TABLE IF NOT EXISTS public.client_inboxes (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id         uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  email             text NOT NULL,
  kind              text NOT NULL CHECK (kind IN ('pooled','branded')),
  status            text NOT NULL DEFAULT 'assigned'
                    CHECK (status IN ('assigned','warming','active','released','retired')),
  provider          text DEFAULT 'smartlead',
  daily_cap         integer,
  warmup_started_at timestamptz,
  warmup_ready_at   timestamptz,
  assigned_at       timestamptz NOT NULL DEFAULT now(),
  released_at       timestamptz,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_inboxes_client_id_idx ON public.client_inboxes(client_id);
CREATE INDEX IF NOT EXISTS client_inboxes_status_idx    ON public.client_inboxes(status);

-- A pooled inbox and a warming branded one may co-exist for one client: that overlap is
-- exactly what makes the ~day-29 switch gapless. Never two of the same kind in flight.
CREATE UNIQUE INDEX IF NOT EXISTS client_inboxes_one_live_per_kind
  ON public.client_inboxes(client_id, kind)
  WHERE status IN ('assigned','warming','active');
`.trim(),
  },
  {
    // #290 — `supabase/migrations/20260703_error_events.sql` was written to be run BY HAND
    // in the Supabase SQL editor, and the founder has been locked out of that editor since
    // (GitHub flag). So there is no way to know whether this table exists in production —
    // and the error handler swallows the insert failure by design, which means error capture
    // may have been silently degraded this whole time: exactly the "exceptions vanish"
    // problem the item was raised to fix. Idempotent, so running it either way is safe.
    key: '20260703_error_events',
    title: 'Error events (error tracking — the table the 500-handler writes to)',
    sql: `
CREATE TABLE IF NOT EXISTS public.error_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route      text,
  method     text,
  status     integer,
  message    text,
  stack      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS error_events_created_at_idx ON public.error_events(created_at DESC);
`.trim(),
  },
  {
    // FOUND BY THE FIRST LIVE DEMO REBUILD, 26 Jul — the founder pressed Build / reset MBF
    // and got: *"Could not find the 'copilot_mode' column of 'figsy_campaigns' in the schema
    // cache"*. Another instance of #558: the repo's migrations no longer describe the live
    // database. BOTH columns are missing in production, and each is stranded in a file that
    // cannot be run from Vida:
    //
    //   • `copilot_mode`        — supabase/migrations/20260531_copilot_mode.sql
    //   • `approve_before_send` — supabase/migrations/20260602_human_in_loop.sql, and
    //     also 20260603_schema_reconcile.sql, which carries a DO-NOT-RUN warning because
    //     re-running it would drop the hand-widened wallet constraint (#558) and break every
    //     wallet transaction. So the reconcile file is NOT the way to get this column.
    //
    // Restated here as one idempotent statement instead, so neither original has to be run.
    //
    // These are not cosmetic. `copilot_mode` / `approve_before_send` are what hold a
    // campaign's emails for manual approval — the human-in-the-loop gate. `start-work.ts:50`
    // sets both to true when work begins for a real client, so this insert would fail the
    // same way for the FIRST PAYING CLIENT, not just the demo.
    // #554 — CLOSE THE POLICIES #350 LEFT BEHIND.
    //
    // #350 found `visitor_sessions.admin_read_visits` shipped as a {public} SELECT
    // USING (true) — every visitor IP and enrichment row readable by anyone holding the
    // public anon key, confirmed in production. It dropped that ONE policy and nobody swept
    // for the pattern. This is the sweep.
    //
    // A policy with no `TO` clause applies to PUBLIC. `CREATE POLICY "Service role bypass"
    // ON t FOR ALL USING (true)` restricts nothing to the service role despite its name —
    // the name is the trap, because reviewers read names and not missing clauses. And since
    // permissive policies combine with OR, one of these makes every careful
    // `client_id = current_client_id()` policy on the same table irrelevant.
    //
    // Each policy below was created by a migration in the PRODUCTION path and is dropped
    // NOWHERE in that path — the only DROPs live in supabase/staging-schema.sql, which is a
    // staging snapshot. So unless they were removed by hand, they are live right now.
    //
    // SAFE TO DROP: dropping a permissive policy only ever REMOVES access. The API talks to
    // Postgres with the service-role key, which bypasses RLS entirely, so nothing the
    // product does is affected. None of these tables is read directly by any browser code —
    // verified by reading every `.from('…')` in the portal, website and admin apps
    // (BROWSER_READ_TABLES in lib/rls-audit.ts). After the drop, RLS stays ON with no
    // permissive policy: anon and authenticated get nothing.
    //
    // NOTHING IS DELETED. These statements remove POLICY definitions, not a single row of
    // data, and not a table or column.
    key: '20260727_rls_close_public_policies',
    title: 'Close the {public} USING(true) policies #350 left behind (#554 — anon-readable tables)',
    // ⚠️ `DROP POLICY IF EXISTS <p> ON <table>` GUARDS THE POLICY, NOT THE TABLE.
    //
    // The first version of this migration was six bare DROP POLICY statements and it failed
    // in production on the very first line: `relation "public.lead_enrichment" does not
    // exist`. The `IF EXISTS` refers to the POLICY; the TABLE reference is resolved before
    // that, so a missing table is a hard error. And because node-postgres sends a
    // multi-statement query as one implicit transaction, that first line rolled back all
    // eighteen.
    //
    // Which also answered the open question from the audit: most of these tables were never
    // created in production at all. They come from `packages/db/src/migrations/`, a
    // directory nothing has ever confirmed was run there.
    //
    // So each statement is guarded on the table actually existing. `to_regclass` returns
    // NULL rather than throwing for an unknown name, which is the only way to ask "is this
    // table here?" without an error.
    sql: `
do $$
declare t text;
begin
  foreach t in array array[
    'lead_enrichment','figsy_calls','webhook_triggers',
    'partners','partner_commissions','partner_referrals'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists %I on public.%I', 'Service role bypass', t);
      -- Belt: RLS must be ON, or dropping the policy achieves nothing — a table with RLS
      -- off is readable regardless of what policies exist, and it is the one state with no
      -- pg_policies row to give it away.
      execute format('alter table public.%I enable row level security', t);
      raise notice 'secured %', t;
    else
      raise notice 'skipped % — not present in this database', t;
    end if;
  end loop;
end $$;
`.trim(),
  },
  {
    // #554b — WHAT THE LIVE AUDIT ACTUALLY FOUND, which is not what the repo predicted.
    //
    // The first RLS audit run against production (27 Jul, 11:12) returned three tables, and
    // NONE of the five the repo-based verdict named. That is the whole justification for
    // reading pg_catalog instead of files, and it cuts both ways: the file verdict named
    // five tables that are fine and MISSED the most sensitive table in the product.
    //
    //   ① client_inboxes — RLS OFF, NO POLICIES. This table holds `smtp_pass_enc`,
    //     `smtp_host`, `smtp_user` and `email`: how we log in to send as each client. RLS
    //     was never enabled — not in this migration list, not in schema.sql, NOWHERE in the
    //     repo — because `20260725_client_inboxes` simply never included the line. With RLS
    //     off, anyone holding the PUBLIC anon key can read every client's mailbox
    //     configuration. The passwords are AES-256-GCM ciphertext (lib/inbox-secret.ts), so
    //     this is not plaintext credentials — but the hosts, usernames and addresses are
    //     plain, and ciphertext should never have been fetchable either.
    //
    //   ② app_migrations_applied — RLS OFF. Created as a side effect by
    //     `supabase/migrations/20260724_one_wallet.sql` via CREATE TABLE IF NOT EXISTS,
    //     so it never went through any review that would have asked about RLS. Low
    //     sensitivity (migration keys), but it is internal bookkeeping and there is no
    //     reason for a browser to read it.
    //
    //   ③ agreement_templates.agreement_templates_admin_write — a policy that exists ONLY
    //     IN PRODUCTION. The repo has never heard of it; it knows only
    //     `agreement_templates_read`. Someone created it by hand. It is FOR ALL USING (true)
    //     reaching a browser role, so it grants read AND write on the contract templates to
    //     anyone with the public key. #558 pointing the other way: production carries
    //     policies the repo cannot see.
    //
    // SAFE: nothing in a browser touches any of these three. Verified by re-reading every
    // `.from('…')` in client components only — the earlier pass wrongly counted Next.js
    // server routes under `app/api/`, which use SUPABASE_SERVICE_ROLE_KEY and bypass RLS.
    // The real browser-read set is just clients, leads, figsy_campaigns, figsy_replies,
    // figsy_sent_emails. Every path that touches these three tables is server-side on the
    // service role, which is unaffected by RLS.
    key: '20260727_rls_live_findings',
    title: 'Lock the tables the LIVE audit found (#554b — client_inboxes had NO RLS at all)',
    sql: `
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
`.trim(),
  },
  {
    // #340 — the statuses a subscription can honestly be in.
    //
    // `routes/stripe.ts` coerced every non-good Stripe status to `active`, so a card declined
    // at signup bought a working product. Mapping faithfully means storing values the enum has
    // never held — and production's `subscriptions.status` is an ENUM, not text+CHECK (the
    // repo schema.sql drifted; #190 found this the hard way with `paused`, and #342 is still
    // living it with `lapsed`). Without this, the honest fix fails exactly like #342.
    //
    // `ADD VALUE IF NOT EXISTS` is idempotent. The new values are deliberately NOT used
    // anywhere in this migration: Postgres forbids using an enum value in the same
    // transaction that adds it.
    key: '20260727_subscription_status',
    title: 'Subscription status enum accepts the real Stripe states (#340 — a declined card must not read as active)',
    sql: `
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'incomplete';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'incomplete_expired';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'unpaid';
`.trim(),
  },
  {
    // #342 — the value the lapse cron has been failing to write EVERY DAY since it was
    // written. `/subscriptions/check-lapsed` does `.update({ status: 'lapsed' })`, Postgres
    // rejects it because the enum has never held it, the handler rethrows and the route
    // 500s. Nothing has ever been lapsed, so an unpaid client keeps access forever.
    //
    // Separate migration from 20260727_subscription_status on purpose: that one is #340's
    // and may already be applied, and a value added in one transaction cannot be used in
    // that same transaction — keeping them apart keeps each independently re-runnable.
    key: '20260727_subscription_lapsed',
    title: 'Subscription enum accepts "lapsed" (#342 — the lapse cron has 500\'d daily since it was written)',
    sql: `
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'lapsed';
`.trim(),
  },
  {
    // #627 — THE TABLE EVERY READER ASSUMED AND NOBODY CREATED.
    //
    // The System check has read `app_settings` for months (key `pdl_monthly_cap_usd`) and
    // reported "no usable setting exists — set it". That instruction pointed at a table that
    // does not exist anywhere: the read errored, the probe treated the error as "no row", and
    // the screen said something false in a calm voice.
    //
    // It surfaced the first time anything WROTE to it — the founder pressed Save on the #626
    // cap card and got "Could not find the table 'public.app_settings' in the schema cache",
    // because that write is CHECKED rather than swallowed (#349). A swallowed error would have
    // left him believing sourcing was capped while nothing was.
    key: '20260806_app_settings',
    title: 'Operator settings table (#627 — read for months, created by nobody)',
    sql: `
CREATE TABLE IF NOT EXISTS public.app_settings (
  key        text        PRIMARY KEY,
  value      text        NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.app_settings IS
  'Operator-set global settings, one row per key. Written by Vida (operator, admin-gated) and read by the System check. First key: pdl_monthly_cap_usd — the monthly PDL sourcing ceiling (#626/#627).';

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
`.trim(),
  },
  {
    // #343 — THE CRON SINGLETON. `startCrons()` ran on every API process with no gate, so
    // two replicas doubled every email, every charge and every digest, silently, on a
    // schedule. The env var (`RUN_CRONS`) is a kill switch, NOT a singleton: Railway sets
    // variables per SERVICE and every replica inherits them, so both replicas would read
    // `true` and both would fire. The guarantee has to live where both can see it.
    //
    // (job, slot) as the primary key IS the lock — the first INSERT wins and every other
    // process gets a unique violation and stands down. Same shape as the (enrollment_id,
    // step) backstop from #354 that already keeps sequence sends from doubling.
    key: '20260727_cron_claims',
    title: 'Cron slot claims (#343 — two replicas can never run the same job twice)',
    sql: `
CREATE TABLE IF NOT EXISTS public.cron_claims (
  job        text        NOT NULL,
  slot       timestamptz NOT NULL,
  claimed_by text,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (job, slot)
);

COMMENT ON TABLE public.cron_claims IS
  'One row per (job, scheduled minute). The INSERT is the lock: the first process to claim a slot runs the job, every other gets a unique violation and stands down (#343).';

CREATE INDEX IF NOT EXISTS cron_claims_claimed_at_idx ON public.cron_claims (claimed_at);

-- RLS on with no policies denies anon/authenticated outright; the service role (the API)
-- bypasses RLS and is the only accessor. Same posture as icp_run_outcomes.
ALTER TABLE public.cron_claims ENABLE ROW LEVEL SECURITY;
`.trim(),
  },
  {
    // #366 — PDL PAGING. Without these three columns the cursor has nowhere to live, every
    // run re-reads page 1, and a client's second month sources zero new people while
    // reporting "no leads matched this ICP".
    //
    // The second statement is #342's lesson applied BEFORE it bites: `icp_run_outcomes.status`
    // carries a CHECK constraint listing four values, and this change starts writing a fifth
    // ('audience_exhausted'). Without widening it, the insert is rejected — and supabase-js
    // RETURNS that rejection rather than throwing, so the outcome would simply never appear
    // and the portal would keep showing the previous run's message. Written as drop-and-add
    // inside a DO block so re-running is harmless.
    key: '20260727_pdl_cursor',
    title: 'PDL scroll_token paging + the audience_exhausted outcome (#366 — a second month that finds NEW people)',
    sql: `
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

-- ⛓️ 29 Aug (R3) — THE CONSTRAINT BLOCK THAT USED TO SIT HERE IS GONE. Full reasoning in the
-- canonical file. In short: this entry is #15 in the array and '20260826_run_outcome_failed'
-- is #2, so the OLDER five-value definition ran LAST and overwrote the newer six-value one.
-- Against production, which holds 'failed' rows, that ADD CONSTRAINT failed and rolled the
-- whole entry back on every deploy. Against a database with no 'failed' row yet it would
-- SUCCEED and silently narrow the constraint, after which every crashed run's outcome is
-- rejected by the database with no error anywhere (#342 / R72).
-- 'audience_exhausted' is not lost — it is inside the six values the OWNER declares.
-- Do not restore this block. One constraint, one owner; constraint-ownership.test.ts enforces it.
`.trim(),
  },
  {
    key: '20260726_campaign_copilot_columns',
    title: 'Campaign human-in-the-loop columns (copilot_mode + approve_before_send — the demo rebuild and the first paying client both need them)',
    sql: `
ALTER TABLE public.figsy_campaigns
  ADD COLUMN IF NOT EXISTS copilot_mode        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approve_before_send boolean NOT NULL DEFAULT false;
`.trim(),
  },
  {
    // #607 — the grandfathering half of retiring the trial state. From 1 Aug a signup writes
    // status='paused' (dormant until the $99 lands); this converts the rows written before
    // that. Explicit by founder instruction — nothing is silently rewritten, and until this
    // runs `statusGrantsAccess()` still honours 'trialing' so no existing account loses
    // anything. /internal/status/snapshot reports the remaining count as `legacy_trialing`,
    // so you can watch it reach zero instead of assuming it did.
    // Canonical file: supabase/migrations/20260801_retire_trial_status.sql
    key: '20260801_retire_trial_status',
    title: 'Retire the trial state (#607) — convert legacy trialing subscriptions to paused and clear their trial end dates',
    sql: `
UPDATE public.subscriptions
   SET status        = 'paused',
       trial_ends_at = NULL
 WHERE status = 'trialing';
`.trim(),
  },
  {
    // #599 — THE CSV IMPORTER HAS NEVER WORKED. `toLeadRow` has written `source:
    // 'csv_import'` since it was authored and this column was never created, so every import
    // died with "Could not find the 'source' column of 'leads' in the schema cache". Found by
    // running it on a real file for the first time during A18 — no test caught it, because
    // no test compared a query's column names to the schema. `leads-column-truth.test.ts`
    // now does.
    //
    // NULLABLE AND NO DEFAULT, deliberately. Every row already in the table was written
    // before this column existed and we genuinely do not know where it came from; a
    // DEFAULT would stamp all of them with a provenance nobody verified, which is the
    // "reads as done, was never checked" failure this project keeps catching. NULL means
    // exactly what it says — unknown.
    // Canonical file: supabase/migrations/20260806_leads_source.sql
    key: '20260806_leads_source',
    title: 'leads.source — where a lead came from (#599 — the column the CSV importer has always written and never had)',
    sql: `
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS source text;

COMMENT ON COLUMN public.leads.source IS
  'Provenance of the row: ''csv_import'' for an operator upload, NULL for anything written before this column existed (August 2026). Never defaulted — an unverified provenance must read as unknown, not as a claim.';
`.trim(),
  },
  {
    // #637/#641 — THE AUDIT COLUMNS. The 6-Aug full-repo sweep compared every column the
    // code names against every migration; these are read (some written) by live code and
    // created by nothing. Every failure was silent — `.data ?? []` renders a REJECTED query
    // exactly like an empty one (#349/#565).
    //
    // The worst is `figsy_sent_emails.client_id`: the client's own dashboard sent-counter and
    // 7-day sparkline, the admin clients page and CMO memory all read it, and NO send path
    // writes it. Today every one shows 0 and 0 is TRUE, so it is invisible — on send-day it
    // stays 0 forever while real mail goes out, which reads to a paying client as "KIND does
    // nothing." `clients.last_low_credit_email_at` is next: the low-credit cron reads AND
    // writes it, so its whole select fails and NO client is ever warned.
    //
    // ⚠️ DELIBERATELY NOT HERE: figsy_campaigns.reply_count/enrolled_count and
    // icps.description/locations. Reading those handlers showed they are WRONG-NAME selects —
    // the maintained columns are replies_total/leads_enrolled and geographies. Creating dead
    // columns would freeze the mistake (O8: assert the intent, not the literal); the queries
    // are fixed instead.
    //
    // IF NOT EXISTS + nullable + no defaults: the hand-paste era may have made some already,
    // and a DEFAULT would stamp historic rows with a claim nobody checked (#599 precedent).
    // Canonical file: supabase/migrations/20260806_audit_columns.sql
    key: '20260806_audit_columns',
    title: 'Audit columns (#637/#641) — the columns live readers need and no migration ever created, + client_id backfill',
    sql: `
ALTER TABLE public.figsy_sent_emails
  ADD COLUMN IF NOT EXISTS client_id uuid,
  ADD COLUMN IF NOT EXISTS status    text;

UPDATE public.figsy_sent_emails se
   SET client_id = fc.client_id
  FROM public.figsy_campaigns fc
 WHERE se.campaign_id = fc.id
   AND se.client_id IS NULL;

CREATE INDEX IF NOT EXISTS figsy_sent_emails_client_id_idx
  ON public.figsy_sent_emails(client_id);

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS last_low_credit_email_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_seen_at             timestamptz,
  ADD COLUMN IF NOT EXISTS leads_per_run            integer,
  ADD COLUMN IF NOT EXISTS contact_email            text;
`.trim(),
  },
  {
    // Canonical file: supabase/migrations/20260710_increment_emails_sent.sql
    //
    // #383 — THE SEND COUNTER'S ATOMIC RPC. The .sql file has existed since 10 Jul and was
    // never added HERE, which is the only list that executes (O3). So the function has never
    // been created in production, every send has fallen through to the fallback in
    // `figsy.ts:sendSequenceEmail`, and that fallback was a read-then-write: two concurrent
    // sends both read N and both write N+1, losing a count.
    //
    // ⚠️ THE REASON THIS WENT UNSEEN FOR A MONTH: the item was marked 🩷 and then briefly 🟢,
    // so nothing re-examined it — a file in `supabase/migrations/` LOOKS applied. Recording a
    // migration is not running one; only this array runs.
    //
    // The fallback is now recomputed from the send log rather than incremented (see figsy.ts),
    // so the counter is correct with or without this function. This makes it atomic in ONE
    // statement rather than merely correct in two.
    key: '20260710_increment_emails_sent',
    title: 'Atomic send-counter RPC (#383) — the .sql existed since 10 Jul but was never in the runner, so it never ran',
    sql: `
CREATE OR REPLACE FUNCTION public.increment_figsy_emails_sent(campaign_id uuid)
RETURNS integer
LANGUAGE sql
AS $$
  UPDATE public.figsy_campaigns
     SET emails_sent = COALESCE(emails_sent, 0) + 1
   WHERE id = campaign_id
  RETURNING emails_sent;
$$;
`.trim(),
  },
  {
    // ── #316 + #372 — THE COMPANY CREDIT POOL, AND THE SECOND #383 ──────────────────
    // `20260706_pool_atomic.sql` has existed since 6 Jul carrying the line "NOT auto-applied
    // — the founder runs this by hand in the Supabase SQL editor". The Supabase dashboard has
    // been unreachable that entire time (the GitHub OAuth account flag), so "by hand" has
    // meant "never". Both call sites — `routes/company.ts:526/539` — fail SOFT:
    //
    //     if (error) { console.error(...); return false }
    //
    // so a missing function is indistinguishable from a genuine refusal, and the owner is
    // told "Not enough in the company pool, or seat not found" when the truth is that the
    // function does not exist. This is #383's shape exactly: a .sql file that LOOKS applied,
    // a fail-soft caller, and nothing that can ask the question.
    //
    // ⚠️ AND THE SQL ITSELF CARRIED A MONEY BUG (#372), FIXED HERE.
    // `allocate_pool_to_rep` debited the pool, then updated the rep with NO row-count check
    // and returned `true` regardless. A bad or cross-company seat id destroyed the credits:
    // pool down, nobody up, screen says success. Returning `false` would not have saved them
    // — the debit is already written by that point. So the two writes are now ONE unit via a
    // subtransaction (`begin … exception when sqlstate 'KIND1'`): raising rolls the debit
    // back, and the handler returns the same `false` the caller already renders as "pool
    // short or seat not found".
    //
    // Idempotent (CREATE OR REPLACE), and the canonical copy in supabase/migrations/ is
    // updated to match — both homes, the 20260806_audit_columns precedent.
    key: '20260706_pool_atomic',
    title: 'Company pool moves, atomic + #372 fixed (#316) — the .sql existed since 6 Jul but was never in the runner, so it never ran',
    sql: `
create or replace function allocate_pool_to_rep(p_company_id uuid, p_rep_id uuid, p_amount int)
returns boolean
language plpgsql
as $$
declare
  v_rows int;
begin
  if p_amount is null or p_amount <= 0 then
    return false;
  end if;

  begin
    update companies
       set credit_pool = credit_pool - p_amount
     where id = p_company_id
       and coalesce(credit_pool, 0) >= p_amount;
    get diagnostics v_rows = row_count;

    if v_rows = 0 then
      return false;
    end if;

    update clients
       set seat_budget    = coalesce(seat_budget, 0)    + p_amount,
           credit_balance = coalesce(credit_balance, 0) + p_amount
     where id = p_rep_id and company_id = p_company_id;
    get diagnostics v_rows = row_count;

    if v_rows = 0 then
      raise exception 'allocate_pool_to_rep: seat % is not a member of company %', p_rep_id, p_company_id
        using errcode = 'KIND1';
    end if;

    return true;
  exception when sqlstate 'KIND1' then
    return false;
  end;
end;
$$;

create or replace function return_rep_to_pool(p_company_id uuid, p_rep_id uuid)
returns int
language plpgsql
as $$
declare
  v_amount int := 0;
begin
  select coalesce(credit_balance, 0) into v_amount
    from clients
   where id = p_rep_id and company_id = p_company_id
   for update;

  if v_amount is null or v_amount <= 0 then
    return 0;
  end if;

  update clients  set credit_balance = 0                                   where id = p_rep_id and company_id = p_company_id;
  update companies set credit_pool   = coalesce(credit_pool, 0) + v_amount where id = p_company_id;

  return v_amount;
end;
$$;
`.trim(),
  },
  {
    key: '20260815_client_partner_seat',
    title: 'The Client Partner seat (R40) + the earnings backend (#220) + the double-pay guard (#351). Canonical .sql: supabase/migrations/20260815_client_partner_seat.sql — BOTH HOMES, because only this array ever executes (O3).',
    sql: `
-- ── the seat ────────────────────────────────────────────────────────────────────────
alter table public.partners
  add column if not exists seat_type text not null default 'partner';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'partners_seat_type_check'
  ) then
    alter table public.partners
      add constraint partners_seat_type_check
      check (seat_type in ('partner', 'client_partner'));
  end if;
end $$;

-- The retention rate this seat earns, as a fraction. NULL = fall back to the plan default
-- (0.05), so every existing partner keeps exactly the deal they already had.
alter table public.partners
  add column if not exists retain_rate numeric(5,4);

-- ── the earnings backend (#220) ─────────────────────────────────────────────────────
alter table public.partner_commissions
  add column if not exists amount_usd numeric(10,2);

alter table public.partner_commissions
  add column if not exists commission_type text not null default 'land';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'partner_commissions_type_check'
  ) then
    alter table public.partner_commissions
      add constraint partner_commissions_type_check
      check (commission_type in ('land', 'retain'));
  end if;
end $$;

-- ── the double-pay guard (#351) ─────────────────────────────────────────────────────
-- ⛓️ Re-designed during Fable verification (16 Aug), before this ever ran anywhere.
-- The first design was UNIQUE (partner, client, period, type) — one commission row per
-- month. But the checkout handler serves wallet TOP-UPS as well as the pack, so a client
-- can legitimately pay several times in a month, and one-row-per-month silently dropped
-- the retain on every payment after the first: the over-pay became an under-pay.
--
-- The real identity of a commission is THE PAYMENT THAT EARNED IT. So:
--   • one row per Stripe payment, deduped by its reference — a replayed webhook hits the
--    partial unique below and loses at the database, which is the actual #351 guard;
--   • months are derived by summing rows per period (the portal already does);
--   • the landing fee is DB-enforced once per client, ever, by its own partial unique.
alter table public.partner_commissions
  add column if not exists stripe_ref text;

create unique index if not exists partner_commissions_once_per_payment
  on public.partner_commissions (partner_id, stripe_ref)
  where stripe_ref is not null;

create unique index if not exists partner_commissions_land_once
  on public.partner_commissions (partner_id, client_id)
  where commission_type = 'land';

-- Statements are read per seat per month; this is the index that query rides.
create index if not exists partner_commissions_seat_period
  on public.partner_commissions (partner_id, period_month);
`,
  },
  {
    key: '20260816_partner_contact_details',
    title: 'Partner contact details (address, country, phone) so the document pack is TAILORED at seat creation instead of hand-filled. Founder review 16 Aug: "i should not need to fill anything out." Canonical .sql: supabase/migrations/20260816_partner_contact_details.sql — BOTH HOMES (O3). All nullable: legacy seats keep the bracket placeholder rather than a guessed address.',
    sql: `
alter table public.partners
  add column if not exists address text;

alter table public.partners
  add column if not exists country text;

alter table public.partners
  add column if not exists phone text;
`.trim(),
  },
  {
    key: '20260816_partner_onboarding_flow',
    title: 'The partner onboarding flow (R42): onboarding_state + invite token + payout details + partner_signed_documents (FROZEN copies of what was signed). Founder 16 Aug: "they sign. i recieve docs i sign and they then go live on partner." Canonical .sql: supabase/migrations/20260816_partner_onboarding_flow.sql — BOTH HOMES (O3). ⚠️ onboarding_state DEFAULTS to active: every existing seat is grandfathered live, because defaulting to invited would switch off working referral codes as a side effect of a schema change.',
    sql: `
alter table public.partners
  add column if not exists onboarding_state text not null default 'active';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'partners_onboarding_state_check'
  ) then
    alter table public.partners
      add constraint partners_onboarding_state_check
      check (onboarding_state in ('invited', 'pack_pending', 'awaiting_countersign', 'active', 'archived'));
  end if;
end $$;

alter table public.partners
  add column if not exists invite_token text;

create unique index if not exists partners_invite_token_key
  on public.partners (invite_token)
  where invite_token is not null;

alter table public.partners
  add column if not exists invite_sent_at timestamptz;

alter table public.partners
  add column if not exists archived_at timestamptz;

-- HER payment rails. The agreement promises payment "against an invoice, by Wise transfer in
-- the partner's local currency" — without this the first payout month ends with the founder
-- chasing bank details over WhatsApp.
alter table public.partners
  add column if not exists payout_details jsonb;

-- ── WHAT WAS SIGNED, FROZEN ─────────────────────────────────────────────────────────────
--
-- The document pack is GENERATED LIVE from the billing constants, which is exactly right
-- before signing and exactly wrong afterwards: if a rate ever moves, a regenerated document
-- would silently change under an existing signature and nobody could prove what was agreed.
--
-- So the moment a person signs, the exact text they signed is copied here verbatim and never
-- touched again. The vault serves THIS once it exists, not a regeneration.
create table if not exists public.partner_signed_documents (
  id             uuid primary key default gen_random_uuid(),
  partner_id     uuid not null references public.partners(id) on delete cascade,
  doc_id         text not null,
  doc_version    text not null,
  body_snapshot  text not null,
  signed_name    text not null,
  signed_role    text not null check (signed_role in ('partner', 'company')),
  signed_at      timestamptz not null default now()
);

-- One signature per document per side: a second click must not create a second record of the
-- same agreement.
create unique index if not exists partner_signed_documents_once
  on public.partner_signed_documents (partner_id, doc_id, signed_role);

create index if not exists partner_signed_documents_partner_idx
  on public.partner_signed_documents (partner_id);
`.trim(),
  },
  {
    key: '20260817_seller_ramp',
    title: 'The seller ramp (#654): partner_ramp_contacts — the seller\'s OWN network, typed by them, and the scoreboard the ramp gates are derived from. Founder 16 Aug: "getting someone to sign up to sell is easy. keeping them enagged and selling is another thing." Canonical .sql: supabase/migrations/20260817_seller_ramp.sql — BOTH HOMES (O3). ⚠️ A NOTEBOOK, NEVER LEAD-GEN (R40), and personal data: the operator console shows counts only, never names.',
    sql: `
create table if not exists public.partner_ramp_contacts (
  id               uuid primary key default gen_random_uuid(),
  partner_id       uuid not null references public.partners(id) on delete cascade,
  name             text not null,
  company          text,
  note             text,
  -- The stamps are the scoreboard. Each is set server-side with now() when the seller says
  -- the thing happened — never a timestamp supplied by the browser, or the ramp becomes a
  -- number anybody can type rather than a record of work done.
  ask_sent_at      timestamptz,
  conversation_at  timestamptz,
  demo_booked_at   timestamptz,
  became_client_id uuid,
  created_at       timestamptz not null default now()
);

create index if not exists partner_ramp_contacts_partner_idx
  on public.partner_ramp_contacts (partner_id);
`.trim(),
  },
  {
    // HC-7 — THE FOUR CRITICAL ERRORS SUPABASE'S OWN ADVISOR REPORTED ON PRODUCTION,
    // 19 Aug 2026. Found by the founder opening the dashboard, not by anything we own.
    //
    // Four errors, three objects: `lead_pool_pnl` raises both "Exposed Auth Users" and
    // "Security Definer View"; `partner_ramp_contacts` and `partner_signed_documents`
    // each raise "RLS Disabled in Public".
    //
    // WHY IT IS REAL: apps/portal ships NEXT_PUBLIC_SUPABASE_ANON_KEY to every browser
    // (apps/portal/src/lib/supabase/client.ts). Anything PostgREST exposes with RLS off is
    // readable by anyone who lifts that key. `lead_pool_pnl` carries prospect `email_norm`
    // AND `acquisition_cost`/`revenue_usd`/`roi` — PII and our own margins.
    //
    // ⛓️ CORRECTED SAME DAY by 20260819_pool_pnl_service_role_grant (below): the claim in
    // this block that the service role keeps every underlying right under security_invoker
    // is FALSE — it has no SELECT on auth.users, which this view joins twice, and Money
    // Path's pool section broke on deploy. The RLS half was correct and is untouched.
    //
    // WHY IT CANNOT BREAK US: packages/db/src/client.ts builds the API's only client with
    // SUPABASE_SERVICE_ROLE_KEY and throws at boot without it. The service role bypasses
    // RLS. Every reader is server-side on that client — money-path.ts:240 for the view,
    // routes/partners.ts for the tables. Same reasoning and same shape as
    // `20260727_rls_live_findings`, which is what this entry deliberately mirrors.
    //
    // `error_events` is NOT advisor-flagged and is here on the founder's explicit choice
    // (19 Aug, option (a)): the runner CREATEs it and never enables RLS, so the guard added
    // with this migration counts it — correctly. Enabling it is a no-op if production
    // already has it and a real fix if it does not. He chose that over allowlisting a belief.
    //
    // ⚠️ PG15+ — `ALTER VIEW … SET (security_invoker = true)` needs PostgreSQL 15. Each
    // entry is sent as ONE multi-statement query = one implicit transaction, so on PG14
    // that line would roll the RLS lines back with it. NOT silently: the runner records
    // {key, ok:false, error} per migration and Vida shows it. If the run reports an error
    // naming security_invoker, split this entry — the REVOKE and the three ALTER TABLEs
    // stand perfectly well on their own.
    key: '20260819_rls_advisor_fixes',
    title: 'HC-7: RLS on the two partner tables + error_events, and lead_pool_pnl stops running as its creator (Supabase Security Advisor, 4 criticals, 19 Aug). Canonical .sql: supabase/migrations/20260819_rls_advisor_fixes.sql — BOTH HOMES (O3). ⚠️ security_invoker needs PG15; a failure here is reported per-key by the runner, never silent.',
    sql: `
-- ① ② The view: revoke the grant AND stop it running with its creator's rights.
--     The SELECT is untouched — 20260717's definition stays byte-identical, because
--     redefining it here could silently undo the house/demo revenue exclusion.
ALTER VIEW public.lead_pool_pnl SET (security_invoker = true);
REVOKE ALL ON public.lead_pool_pnl FROM anon, authenticated;

-- ③ The seller's own network contacts — real people, typed by her.
ALTER TABLE IF EXISTS public.partner_ramp_contacts ENABLE ROW LEVEL SECURITY;

-- ④ The frozen signed partner contracts (R42) — address, country, mobile, payout
--    details once a real seat signs. Empty today; that is the only reason this is a
--    near-miss rather than a breach.
ALTER TABLE IF EXISTS public.partner_signed_documents ENABLE ROW LEVEL SECURITY;

-- ⑤ Not advisor-flagged; founder-approved for completeness. Idempotent either way.
ALTER TABLE IF EXISTS public.error_events ENABLE ROW LEVEL SECURITY;
`.trim(),
  },
  {
    // ⛓️ THE CORRECTION TO THE ENTRY ABOVE, written the same hour it broke something.
    // Chained, never hidden: that migration stays exactly as it was run in production.
    //
    // WHAT BROKE: `security_invoker = true` cleared the advisor's "Security Definer View"
    // error AND stopped our own reader working. Vida → Money Path's "The lead pool ·
    // records as inventory" section fell to its "Pool data unavailable" fallback within
    // minutes of the deploy.
    //
    // WHY: the view's live definition (20260717) joins `auth.users` TWICE to exclude the
    // house account from pool revenue. Under SECURITY DEFINER it ran with its creator's
    // rights, which reach the auth schema. Under invoker rights it runs as the CALLER —
    // `service_role` — which has no SELECT on `auth.users` by default in Supabase.
    //
    // ⚠️ THE FALSE SENTENCE, NAMED SO IT IS NOT INHERITED: the entry above says "with
    // invoker rights the service role still has every underlying right (including
    // auth.users) so money-path keeps working". That is WRONG. It was reasoned from how
    // Supabase roles usually behave and never verified against this database — the one
    // sentence in that migration nobody checked, and the one that cost a working screen.
    //
    // NOT AN ESCALATION: service_role is the key the API already authenticates with
    // (packages/db/src/client.ts) and already bypasses RLS across `public`. What keeps the
    // fix intact is the pairing — invoker ON plus anon/authenticated REVOKED, both still in
    // force from the entry above — so a browser holding the public key would now need its
    // own auth.users grant, and has none. This restores only our side.
    //
    // THE ROOT FIX IS NOT THIS: a P&L view should not read the auth schema at all;
    // `clients.contact_email` exists and would do the same job. That changes the view's
    // SELECT, which the founder's no-touch forbade for this work — queued for Fable.
    //
    // PROOF IS RUNTIME: a grant has no code path to red-prove. Vida → Money Path rendering
    // the pool section is the proof.
    key: '20260819_pool_pnl_service_role_grant',
    title: 'Restore Money Path\'s pool P&L: grant service_role read on auth.users, which security_invoker took away from lead_pool_pnl. Canonical .sql: supabase/migrations/20260819_pool_pnl_service_role_grant.sql — BOTH HOMES (O3). ⛓️ Corrects a FALSE claim in 20260819_rls_advisor_fixes; the four advisor errors stay closed.',
    sql: `
-- Usage first: a grant on a table in a schema the role cannot enter is useless.
-- Both statements are idempotent — re-granting is a no-op.
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT SELECT ON TABLE auth.users TO service_role;
`.trim(),
  },
  {
    // HC-1 — the opt-out blocklist had two email shapes in it, so a person who opted out with
    // a mixed-case address could still be emailed. The code fix normalises every writer and
    // every probe; this repairs the rows already stored. Canonical record:
    // supabase/migrations/20260819_blocklist_email_normalize.sql (AR6 — both homes, and this
    // string is the one that actually executes).
    //
    // Dedup FAILS CLOSED on the founder's 19-Aug ruling: identity comes from the earliest
    // created_at, but if ANY case-variant is still blocked the survivor is blocked. The
    // obvious "earliest row wins" rule can take a suppressed person OFF the list, which is the
    // one direction this table must never move.
    key: '20260819_blocklist_email_normalize',
    title: 'One email shape on the opt-out blocklist (HC-1 — a mixed-case opt-out was unmatchable)',
    sql: `
-- HC-1 — ONE EMAIL SHAPE ON THE OPT-OUT SPINE (19 Aug 2026)
--
-- THE DEFECT. "opt_out_blocklist" is the table that decides whether a person who told us to
-- stop gets emailed again. Its writers disagreed about letter case: the unsubscribe route and
-- the bounce handler lowercased, while the consent-decline writer, the manual-block writer and
-- the reply-STOP writer stored the address exactly as it arrived. Every send-path probe then
-- compared EXACTLY (".eq('email', lead.email)") against "leads.email", which the code's own
-- comment describes as "stored raw". So "John@Acme.com" opting out could leave a row that no
-- send-path probe ever matched — a person who used the legal opt-out mechanism, still mailable.
--
-- The code fix normalises every writer and every probe. This migration fixes the ROWS THAT
-- ALREADY EXIST, because a normalised probe against a raw stored row misses just as badly.
--
-- ── WHY STEP 1 EXISTS, AND WHY IT IS NOT "KEEP THE EARLIEST ROW" ─────────────────────────
-- Deduplicating case-variants needs a survivor, and the obvious rule — keep the earliest
-- "created_at" — CAN UNBLOCK SOMEONE. If the earliest variant is the one carrying
-- "opted_back_in_at" and a later variant is still blocked, keeping the earliest and deleting
-- the rest takes a suppressed person OFF the suppression list. That is the one direction this
-- table must never move. Founder-ruled 19 Aug: FAIL CLOSED. Identity still comes from the
-- earliest row, but if ANY case-variant is still blocked, the survivor is blocked.
--
-- IDEMPOTENT. Step 1 only touches rows that have a blocked sibling; step 2 only deletes rows
-- that are not the first of their group; step 3 only rewrites rows that differ from their own
-- normalised form. A second run changes nothing.
--
-- NULL-SAFE. Rows written by the WhatsApp opt-out path carry "whatsapp_number" and a NULL
-- email. Every statement below is guarded on "email IS NOT NULL" so those are never touched.

-- ── 1 · FAIL CLOSED — a still-blocked case-variant wins over an opted-back-in one ─────────
UPDATE public.opt_out_blocklist b
   SET opted_back_in_at = NULL
 WHERE b.email IS NOT NULL
   AND b.opted_back_in_at IS NOT NULL
   AND EXISTS (
     SELECT 1
       FROM public.opt_out_blocklist o
      WHERE o.email IS NOT NULL
        AND o.id <> b.id
        AND lower(btrim(o.email)) = lower(btrim(b.email))
        AND o.opted_back_in_at IS NULL
   );

-- ── 2 · DEDUPLICATE case-variants, keeping the EARLIEST created_at as the survivor ────────
-- Ordered by created_at then id so the choice is deterministic on a tie (and on NULL dates,
-- which sort last rather than winning by accident).
DELETE FROM public.opt_out_blocklist d
 USING (
   SELECT id,
          row_number() OVER (
            PARTITION BY lower(btrim(email))
            ORDER BY created_at ASC NULLS LAST, id ASC
          ) AS rn
     FROM public.opt_out_blocklist
    WHERE email IS NOT NULL
 ) k
 WHERE d.id = k.id
   AND k.rn > 1;

-- ── 3 · NORMALISE what remains ────────────────────────────────────────────────────────────
UPDATE public.opt_out_blocklist
   SET email = lower(btrim(email))
 WHERE email IS NOT NULL
   AND email <> lower(btrim(email));
`.trim(),
  },
  {
    // PARTNER COMMISSION MOVES TO THE LEAD SALE (founder-locked 19 Aug 2026).
    // Widens commission_type to accept 'lead_sale' — without it the new insert is rejected
    // outright by the CHECK constraint — and documents that stripe_ref now carries
    // 'lead:<lead_id>' for the new path, which is what makes the existing partial unique
    // (partner_id, stripe_ref) the once-per-lead double-pay guard.
    // Canonical record: supabase/migrations/20260819_lead_sale_commission.sql (AR6 - both
    // homes, and THIS string is the one that actually executes).
    key: '20260819_lead_sale_commission',
    title: 'Partner commission moves to the $4 lead sale (25 percent, founder-locked 19 Aug)',
    sql: `
-- PARTNER COMMISSION MOVES TO THE LEAD SALE (19 Aug 2026, founder-locked)
--
-- THE RULING, in his words:
--   "no 25% does not include the $299 nor the 100 leads we give. its everything after this
--    or above this"
--   "lifetime. if they looking after their client its theirs."
--   "she earns on leads purchased not when they top up. because our calulators on leads not
--    money in. we earn money when they buy leads. so thye need to be managing their
--    customers to buy leads."
--
-- WHAT CHANGED IN THE CODE. Commission used to fire on three Stripe events (pack checkout,
-- credit-bundle top-up, subscription renewal) — money ARRIVING. It now fires on the $4
-- approval charge instead, which is a wallet deduction and never touched Stripe at all.
--
-- WHAT THIS MIGRATION IS FOR. Two things the new path needs from the schema:
--
--   1. commission_type is CHECK-constrained to ('land','retain'). A lead sale is neither,
--      so the insert would be rejected outright. The constraint widens to include
--      'lead_sale'. The two existing values stay — nothing is renamed and no row is touched,
--      because deleting a type would rewrite history that a statement is derived from.
--
--   2. stripe_ref is the idempotency column, and its partial unique index
--      (partner_id, stripe_ref) is the REAL double-pay guard (#351's fix — the app-level
--      check is only a fast path in front of it). A lead sale has no Stripe reference, so it
--      writes 'lead:<lead_id>' — the SAME reference the $4 ledger row uses. That makes the
--      guard cover the new path exactly as it covered the old one: one commission per lead,
--      ever, enforced by the database rather than by a read-then-write the app could race.
--      The column keeps its name (renaming it would break every reader) and gets a COMMENT
--      so the next person is not misled by it.
--
-- NOTHING NEEDS BACKFILLING. No client has ever paid, so partner_commissions has never had
-- a row. This is a schema widening on an empty table.
--
-- IDEMPOTENT. The constraint is dropped only if present and recreated with the same name;
-- the comment is unconditional and overwrites. A second run changes nothing.

-- 1 - widen the type so a lead-sale commission can be written at all
alter table public.partner_commissions
  drop constraint if exists partner_commissions_type_check;

alter table public.partner_commissions
  add constraint partner_commissions_type_check
  check (commission_type in ('land', 'retain', 'lead_sale'));

-- 2 - say what the reference column actually holds now
comment on column public.partner_commissions.stripe_ref is
  'The reference of the EARNING EVENT, and the idempotency key behind the partial unique (partner_id, stripe_ref). Historically a Stripe session/invoice id; since 19 Aug 2026 a lead-sale commission writes ''lead:<lead_id>'', the same reference the $4 credit_transactions row uses, so one lead can never pay twice. Not Stripe-only despite the name - renaming it would break every reader.';

comment on column public.partner_commissions.commission_type is
  'land = the one-time acquisition fee (legacy MRR plan) - retain = the recurring book fee (legacy MRR plan) - lead_sale = 25% of a $4 approved lead, the live model from 19 Aug 2026. The two legacy values are kept because statements are derived from historical rows.';
`.trim(),
  },
  {
    // HC-3 - the column that makes an opt-out reachable into Smartlead.
    //
    // Smartlead's OWN ENGINE sends. Once a lead is pushed there our chokepoint never runs for
    // it again, so adding that person to opt_out_blocklist stops OUR sends and does nothing at
    // all to Smartlead's. The only fix is to remove them inside Smartlead - and nothing in the
    // product recorded WHO was in a Smartlead campaign, because pushApprovedLeadToSmartlead
    // returned the campaign id and approve-lead.ts threw it away.
    //
    // Canonical record: supabase/migrations/20260820_smartlead_campaign_membership.sql (AR6 -
    // both homes, and THIS string is the one that actually executes).
    key: '20260820_smartlead_campaign_membership',
    title: 'Record which leads are inside a Smartlead campaign, so an opt-out can name them',
    sql: `
-- HC-3 - RECORD WHICH LEADS ARE INSIDE A SMARTLEAD CAMPAIGN (20 Aug 2026)
--
-- Smartlead is the R25 month-one send path for every new client, and Smartlead's own engine
-- does the sending. Our send chokepoint - which carries the opt-out net, the do-not-contact
-- stop, the PECR gate and the launch-country hold - is never reached for those emails.
--
-- So when a person opts out, the blocklist row stops OUR sends and Smartlead keeps mailing
-- them from its own copy of the lead. Removing them there is the only stop, and you cannot
-- remove someone you cannot name. This column is what lets the opt-out alert say WHO and
-- FROM WHICH campaign.
--
-- NOTHING NEEDS BACKFILLING. Smartlead is unpurchased and every call returns 401, so no lead
-- has ever been pushed - every row is correctly null today.
--
-- IDEMPOTENT: add-if-not-exists plus an unconditional comment. A second run changes nothing.
-- Nullable and unindexed on purpose - read one lead at a time on the suppression path, never
-- scanned.

alter table public.leads
  add column if not exists smartlead_campaign_id text;

comment on column public.leads.smartlead_campaign_id is
  'HC-3: the Smartlead campaign this lead was pushed into, or NULL if never pushed. Set only after addLeads succeeds. Read on opt-out so the alert can name the campaign a person must be removed from - our blocklist does not stop Smartlead sending.';
`.trim(),
  },
  {
    key: '20260820_governed_documents',
    title: 'R46 — governed documents live in Vida, versioned by chaining and never deleted',
    sql: `
-- ── GOVERNED DOCUMENTS — R46'S SINGLE HOME, BUILT THE SMALLEST HONEST WAY ──────────────────
--
-- Founder-ruled 17 Aug (R46): *"any documents we need to create hold of be governed get held
-- in Vida operator. on sole truth of source."* Logged 19 Aug; until now the enforcement column
-- read "nothing yet".
--
-- ⚠️ THIS IS NOT A NEW SYSTEM. It is "partner_signed_documents" (R42) generalised by one step.
-- That table already proved the shape that matters: a document's TEXT is stored verbatim as a
-- snapshot, never a reference to a generator, because a contract that re-renders is a contract
-- nobody can prove the terms of. "partner_signed_documents.body_snapshot" exists for exactly
-- that reason and this table's "body_md" is the same idea.
--
-- ⚠️ AND IT IS NOT "terms-library". That screen holds BLANK TEMPLATES you upload and hand out
-- (the MSA, the SLA, the service order) as files, and it has a delete button because deleting
-- last year's blank template is a normal thing to want. This table holds GOVERNED INSTRUMENTS
-- whose text IS the record. Two shelves, on purpose, and each screen now says which it is —
-- otherwise "single source of truth" becomes a question rather than an answer.
--
-- THE LAW HERE IS THE REGISTER'S LAW: versions CHAIN. A new version points at what it
-- supersedes, and nothing is edited in place or deleted. "docs/PRODUCT-RULES.md" works this way
-- because a superseded rule that vanishes takes with it the evidence that it was ever believed
-- — and #549 was contradicted on 6 Aug precisely because an amendment was forgotten while the
-- original was remembered.
--
-- ⚠️ BOTH HOMES (AR6/O3): this file is the canonical record; the entry in
-- apps/api/src/lib/pending-migrations.ts is the only thing that ever EXECUTES.

create table if not exists public.governed_documents (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  -- Free text rather than a check constraint: the founder adds kinds by governing a new sort of
  -- document, and a constraint would turn that into a migration. The screen offers the kinds
  -- already in use, so drift is visible without being enforced.
  kind          text not null,
  -- The document itself. Markdown, stored verbatim — the same reason
  -- partner_signed_documents keeps body_snapshot rather than a doc_id.
  body_md       text not null,
  version       integer not null default 1,
  -- NULL for the first version of a document; otherwise the row this one replaces.
  supersedes_id uuid references public.governed_documents(id),
  created_at    timestamptz not null default now(),
  -- The operator email from the verified admin session (never a request body) — the same
  -- identity operator_audit_log records.
  created_by    text not null
);

-- ⚠️ ONE SUCCESSOR PER VERSION — the chain may not FORK.
--
-- Without this, two operators can each add "version 2" of the same document and both rows point
-- at version 1. There is then no answer to "what is the current text?", which is the one
-- question this table exists to answer. Modelled on partner_signed_documents_once, which stops
-- the same class of problem for signatures.
create unique index if not exists governed_documents_one_successor
  on public.governed_documents (supersedes_id)
  where supersedes_id is not null;

-- Read paths: newest first within a document family, and by kind on the index screen.
create index if not exists governed_documents_kind_created
  on public.governed_documents (kind, created_at desc);

-- Service-role only. This is operator-governed content and the Vida console is internal
-- forever (R36) — no client, and no anonymous reader, has any business here. The API reaches
-- it with the service key; enabling RLS with no policy means nothing else can.
alter table public.governed_documents enable row level security;

comment on table public.governed_documents is
  'R46 — governed documents, versioned by chaining. Never edited in place, never deleted. Not the same as terms-library, which holds blank uploadable templates.';
`.trim(),
  },
  {
    key: '20260821_lead_feedback',
    title: 'P32 — calibration v1: the reason behind a Pass, captured per client',
    sql: `
-- ── CALIBRATION v1 — THE REASON BEHIND A PASS (P32, 21 Aug) ─────────────────────────────
--
-- Founder doctrine (Jack & Jill K.2, adopted): *"Approve/Pass IS the calibration event —
-- capture the REASON and the product gets smarter every time a client clicks."*
--
-- ⚠️ WHAT WE LOSE TODAY, EVERY DAY. A client passes six leads. We record six noes. We do not
-- record a single WHY. Tomorrow we source more of exactly what they rejected — and from their
-- side it feels like they told us and we ignored it. They didn't tell us: Pass carries no
-- reason. But the experience is identical to being ignored, and that is what churns people.
--
-- ⚠️ THIS TABLE IS DELIBERATELY THIN. No scores, no derived fields, no computed "signal
-- strength" — those are read-side questions and belong in code that can change without a
-- migration. What is expensive and irreversible is NOT CAPTURING the reason at the moment the
-- human had it in their head. Everything else can be decided later; that cannot.

create table if not exists public.lead_feedback (
  id          uuid primary key default uuid_generate_v4(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  lead_id     uuid not null references public.leads(id)   on delete cascade,
  -- 'pass' today. 'approve' is deliberately permitted by the check so approve-side capture
  -- (the founder's "optionally Approve") needs no migration if he rules for it later.
  action      text not null check (action in ('pass', 'approve')),
  -- NULLABLE ON PURPOSE. The chip is optional and must never block the action, so a pass with
  -- no reason is a real, valid row — it records that the client passed and declined to say why,
  -- which is itself worth knowing. A NOT NULL here would have forced the UI to make the chip
  -- mandatory, quietly turning a one-tap nicety into a gate.
  reason_code text check (reason_code in (
    'too_big', 'too_small', 'wrong_industry', 'wrong_role', 'wrong_geography', 'bad_timing', 'other'
  )),
  -- The client's own words. STORED AND SURFACED, NEVER AUTO-APPLIED (founder-gated): a parser
  -- acting on free text would be the product changing a client's targeting based on a sentence
  -- nobody read. A human reads this in Vida.
  free_text   text,
  created_at  timestamptz not null default now()
);

-- The read this table exists for: "what has THIS client been rejecting lately?" — client-scoped
-- and time-ordered, because calibration cares about recent opinion, not opinion from March.
create index if not exists lead_feedback_client_recent_idx
  on public.lead_feedback (client_id, created_at desc);

-- One feedback row per (client, lead, action): a client who taps a chip, changes their mind and
-- taps another is correcting themselves, not voting twice. The API upserts on this key so the
-- last tap wins rather than accumulating contradictory rows nobody can reconcile.
create unique index if not exists lead_feedback_one_per_lead_action
  on public.lead_feedback (client_id, lead_id, action);

alter table public.lead_feedback enable row level security;

-- Service role (the API) only, exactly like operator_audit_log and outcome_events. Every read
-- in application code is already scoped by client_id; RLS is the floor under that, not a
-- substitute for it.
`.trim(),
  },
  {
    key: '20260822_morning_brief_once_per_day',
    title: "P33 — Milla's morning brief: one per client per LONDON day, enforced by the database and not by a check",
    sql: `
-- ── MILLA'S MORNING BRIEF — ONE PER CLIENT PER LONDON DAY (P33 v3, 21 Aug 2026) ──────
--
-- Founder's clause: "ONE BRIEF PER CLIENT LOCAL DAY MAXIMUM: a second login the same
-- local day must resolve to the SAME brief message, never create a twin. Prove this
-- under concurrent first-logins as well as sequential logins."
--
-- ⚠️ A READ-THEN-WRITE CHECK CANNOT DELIVER THAT, AND THAT IS WHY THIS INDEX EXISTS.
-- The brief is created lazily when the client opens /milla. Two tabs, or a phone and a
-- laptop, hitting that page in the same instant both run "does today's brief exist?",
-- both get "no", and both insert. The client opens Milla to two identical good-mornings.
-- The only place two API processes can agree is the database, so the uniqueness is a
-- CONSTRAINT, not a code path — the loser of the race gets 23505 and re-reads the winner's
-- row. Same reasoning as the cron slot claim in lib/cron-guard.ts (#343).
--
-- ⚠️ WHY THIS RIDES ON "sources" RATHER THAN A NEW TABLE.
-- "milla_messages.sources" is jsonb and already exists (it carries RAG citations). Ordinary
-- chat rows put an ARRAY there; a brief puts an OBJECT: {"kind":"morning_brief","day":"…"}.
-- In Postgres, "sources->>'kind'" on an array yields NULL, not an error — so every normal
-- conversation row falls OUTSIDE this partial index and can never collide with it. A whole
-- new table for one tag would have to be joined on every brief read for no gain.
--
-- ⚠️ THE DAY IS A LONDON DAY, COMPUTED IN TYPESCRIPT, STORED AS TEXT.
-- R62 (founder-ruled 21 Aug): "why we working in SA time when I am based in the UK." The
-- product keeps Europe/London. The date is resolved in "lib/morning-brief.ts" with the
-- platform tz database (BST-safe) and written here as a plain 'YYYY-MM-DD' string, so this
-- index never has to know about timezones — and cannot disagree with the code about which
-- day it is, which is exactly what a "date_trunc('day', created_at)" index would do (it
-- would key on UTC and let a 00:30-BST login create the day's second brief).
--
-- Idempotent: safe to re-run. Creating an index concurrently is deliberately NOT used —
-- the runner executes inside a transaction, and CONCURRENTLY cannot run in one.

create unique index if not exists milla_messages_morning_brief_once_per_day_idx
  on public.milla_messages (client_id, (sources->>'day'))
  where sources->>'kind' = 'morning_brief';

-- Read path: "has this client had today's brief yet?" is answered by the index above.
-- Nothing else is needed — the brief is a normal assistant message in the normal thread,
-- so it is fetched by the existing GET /milla/sessions/:id/messages with no special casing.
`.trim(),
  },
  {
    key: '20260822_meeting_briefs',
    title: 'P34 — the Meeting Brief: one versioned, client-approved record of what we understand, read by the scoring prompt and the sequence generator',
    sql: `
-- ── THE MEETING BRIEF (P34 v1, 21 Aug 2026) ─────────────────────────────────────────
--
-- ONE canonical, versioned, CLIENT-LEVEL record of what we understand about a client:
-- who they want to reach, what they sell, who to avoid, what proof to lead with. FIGSY's
-- scoring prompt and the sequence generator read the approved version as ADDITIVE context,
-- so "she learns what good looks like" stops being a slogan and becomes a row.
--
-- "Meeting Brief" is the product name for this CLIENT-level brief. It is NOT a brief about
-- an individual booked meeting.
--
-- ⚠️ WHAT v1 IS ASSEMBLED FROM, AND THE SOURCE THAT TURNED OUT NOT TO EXIST.
-- The build brief put the Milla onboarding conversation first: "the product already uses
-- that conversation to learn/propose the ICP". It does — but only in flight. /milla/welcome
-- holds the transcript in React state, posts it to /icps/builder/chat (stateless: the
-- messages arrive in the request and NOTHING is written), and on approval posts only the
-- finished ICP to POST /icps. The conversation is discarded. There is no db write anywhere
-- on that path. So v1 is derived from the sources that DO persist:
--     the active ICP -> figsy_knowledge (pitch/messaging) -> P32 lead_feedback
-- Founder-ruled 21 Aug, given the choice between building on what exists and capturing
-- transcripts first: build on what exists now. Capturing the welcome conversation is a
-- separate change with its own privacy surface.
--
-- ⚠️ VERSIONS ARE IMMUTABLE IN CONTENT, AND THAT IS WHY THERE IS NO UPDATE PATH FOR TEXT.
-- An edit INSERTS version+1. No route updates a content column, no route deletes a row, and
-- the only UPDATE that exists at all flips a draft to approved — metadata, never words. A
-- client who corrects the brief can always see what they corrected.
--
-- ⚠️ "SUPERSEDED" IS DERIVED, NOT STORED, AND THAT IS DELIBERATE.
-- The authoritative brief is: the HIGHEST version for this client whose status is
-- 'approved'. Any older approved row is therefore superseded by construction. The
-- alternative — flipping old rows to a 'superseded' status when a new one lands — needs two
-- writes to stay consistent, and PostgREST cannot wrap them in a transaction: a failure
-- between them leaves a client with either two live briefs or none. Deriving it means every
-- operation here is a SINGLE atomic row write.
--   ⚠️ Note this is NOT "MAX(version) wins", which the build brief rightly warns against —
--   a draft sitting at version 4 must never become consumer context. The status filter is
--   the whole difference and it is not optional in any read.
--
-- ⚠️ THE BRIEF IS EVIDENCE, NEVER PERMISSION.
-- Its geography field records what the client WANTS to target. It cannot widen the launch
-- allowlist, PECR eligibility, suppression, the approval gate or any send gate — those are
-- independent and this table is not wired to any of them. It reaches exactly two prompts.

create table if not exists public.meeting_briefs (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients(id) on delete cascade,
  version           integer not null,

  -- 'draft'    — assembled but not yet confirmed by the client. NEVER consumer context.
  -- 'approved' — the client confirmed it (or wrote it themselves, which is the same act:
  --              founder-ruled 21 Aug that the CLIENT approves their own brief).
  status            text not null default 'draft'
                      check (status in ('draft', 'approved')),

  -- Content. Every field nullable ON PURPOSE: the evidence rule says an unsupported field
  -- stays EMPTY. A brief that invents a proposition to look complete is worse than one with
  -- three fields filled and the rest honestly blank.
  objective         text,
  ideal_accounts    text,
  target_personas   text,
  exclusions        text,
  proposition       text,
  proof_points      text,
  strong_signals    text,
  anti_signals      text,
  geography         text,
  meeting_objective text,

  -- Which source each populated field came from, e.g. {"target_personas":"icp"}. Without
  -- this a client asking "where did you get that?" has no answer, and a field derived from
  -- evidence is indistinguishable from one a model made up.
  provenance        jsonb not null default '{}'::jsonb,

  -- 'client' for every row today. Recorded rather than assumed so the day an operator can
  -- approve one, old rows still say truthfully who approved them.
  approved_by       text,
  approved_at       timestamptz,
  created_at        timestamptz not null default now()
);

-- CONCURRENCY. Two tabs editing at once both read "current version is 2" and both write 3.
-- The database is the only place they can be made to disagree: the loser gets 23505 and is
-- told to re-read. Same reasoning as the cron slot claim (#343) and P33's brief index.
create unique index if not exists meeting_briefs_client_version_idx
  on public.meeting_briefs (client_id, version);

-- The consumer read: newest approved brief for a client, in one index hit.
create index if not exists meeting_briefs_client_approved_idx
  on public.meeting_briefs (client_id, version desc)
  where status = 'approved';

-- Service-role only. The API scopes every read and write by client_id; enabling RLS with no
-- policy means nothing else reaches this table at all.
alter table public.meeting_briefs enable row level security;

comment on table public.meeting_briefs is
  'P34 - the client-level Meeting Brief. Versions are immutable in content; an edit inserts version+1. The authoritative brief is the highest version with status=approved. Evidence only: it reaches the FIGSY scoring prompt and the sequence generator, and never a gate.';
`.trim(),
  },
  {
    key: '20260822_free_proof_acquisition',
    title: 'The free-proof acquisition fence — its own budget, atomic across clients, never touching paid AR8',
    sql: `
-- ── FREE REAL-LEAD PROOF — THE ACQUISITION FENCE (22 Aug 2026, corrected same day) ──────
--
-- An unpaid prospect is shown REAL masked leads before they pay: up to 20, one refinement
-- of the same core ICP, up to 20 more, then a human conversation. That costs K.I.N.D real
-- money at PDL, so it needs a fence -- and the fence has to be a different fence from the
-- one that protects paying clients.
--
-- ⚠️ WHY THIS DOES NOT REUSE clients.sourcing_allowance OR try_spend_sourcing.
-- An unpaid prospect's sourcing_allowance is 0, so try_spend_sourcing grants 0 and could
-- never fund proof at all. Granting into that shared integer instead would be worse: SIX
-- current paths spend it (ICP create/activate/run, the nightly top-up, start-work, operator
-- sourcing, admin and partner routes, and /lookalike/generate directly), so a proof budget
-- placed there could be drained by any of them. Proof therefore gets its own authority,
-- and paid AR8 is left byte-for-byte alone.
--
-- ⚠️ WHY PROOF DOES NOT WRITE TO sourcing_ledger.
-- That ledger is the sum behind the PAID monthly PDL ceiling. Writing proof spend into it
-- would make free acquisition compete with paid delivery for the same $300 -- a busy
-- acquisition month could refuse a paying client's sourcing. Founder-ruled 22 Aug: free
-- acquisition and paid delivery are SEPARATE budget controls. So proof gets proof_ledger,
-- and money_settings gets its own proof cap beside the paid one.
--
-- ⚠️ THE FOUR RACES THIS EXISTS TO CLOSE. Two were found in review before any code was
-- written, two more by independent review of the first implementation:
--   1. PER CLIENT. read spent -> compute remaining -> call PDL -> increment is NOT a fence:
--      two overlapping runs both read the same remaining budget and both spend it. Fixed by
--      deciding and committing inside one transaction under a row lock.
--   2. ACROSS CLIENTS. Locking client A's row does nothing to serialise client B. With 50
--      records of monthly room, A and B could each be authorised 40 -- 80 total. Fixed by
--      taking the lock on the SINGLETON money_settings row FIRST, so every proof
--      reservation in the system passes through one critical section.
--   3. RECONCILIATION REPLAY. The first release took a client id and a count and
--      decremented the AGGREGATE. Reserve 40, consume 25, release 15 -> committed 25; retry
--      the SAME reconciliation -> committed 10, though 25 real records were bought. A
--      retried job literally manufactured acquisition authority -- and with two
--      reservations for one client, reconciling one could release the other's. Fixed:
--      every reservation is its own ledger row, reconciliation addresses THAT row by id,
--      and a row reconciles exactly once. A replay is a true no-op.
--   4. MONTH-END LEAK. Sums keyed on created_at push an August reservation's September
--      correction into September, so September opened with negative spend and more than
--      the configured budget of real authority. Fixed: every reservation carries a FIXED
--      budget_month stamped at creation; its correction inherits that month; and the
--      monthly room is summed over budget_month, never over when a row happened to land.
--
-- Lock order is always money_settings (global) then clients (per client); the release path
-- locks its reservation row then the client, and never money_settings. One order per path,
-- no cycle, so proof callers cannot deadlock each other. try_spend_sourcing reads
-- money_settings with a plain SELECT and never locks it, so the paid path is not blocked.
--
-- Reservation is PESSIMISTIC: the records are committed BEFORE PDL is called and released
-- afterwards if fewer came back. Every failure therefore under-allows rather than
-- overspends -- a temporary under-allocation is recoverable, an overspend is not.
--
-- Additive only. No existing table, function or money rule is modified.

-- ── 1. Per-client proof state ───────────────────────────────────────────────────────────
-- proof_records_committed: PDL records reserved for this prospect across BOTH passes,
--   capped at 40 for life (founder-set, 22 Aug: $11.20 at the verified $0.28 rate).
-- proof_passes_done: automatic proof batches already claimed. Max 2, then a human.
-- milla_understanding_confirmed_at: when the client pressed "yes, this represents us" on
--   the reflect-back of what Milla understood about their business. AN AUDITABLE FACT,
--   NEVER A GATE (round 4): nothing reads it before activation, generation or sending —
--   it exists so a later "FIGSY wrote the wrong thing about us" conversation can be
--   answered with the date they confirmed the understanding it wrote from.
alter table public.clients
  add column if not exists proof_records_committed          int not null default 0,
  add column if not exists proof_passes_done                int not null default 0,
  add column if not exists milla_understanding_confirmed_at timestamptz;

-- ── 2. The free-acquisition monthly ceiling, beside the paid one ────────────────────────
-- Deliberately a SECOND column rather than a shared one: paid delivery keeps
-- pdl_monthly_cap_usd untouched, and neither budget can starve the other.
-- ── 1b. A LIVE CLIENT'S REVISION WAITS FOR K.I.N.D (founder-ruled 22 Aug) ───────────────
-- The targeting columns on the icps row ARE the live operational targeting: runIcpJob reads
-- that row and hands it straight to the pool serve and the PDL query, so writing them takes
-- effect on the very next run. That meant a live client editing their targeting in Milla
-- changed who we source for them with nobody at K.I.N.D looking - the founder ruled the
-- change must WAIT for review.
--
-- There was no way to tell CURRENT LIVE targeting from a REVISED PENDING one, because the
-- row held only the live copy. These two columns are that distinction and nothing more:
--   pending_targeting    the revision exactly as the client saved it, parked off to the
--                        side. Nothing reads it for sourcing, scoring or sending.
--   pending_submitted_at when they asked. Drives the Vida badge and "waiting since".
--   pending_campaign_intent  the revised BRIEF - what this campaign is now for. It waits
--                        with the targeting, because the brief is what every email is
--                        written from: a live campaign whose brief changed without review
--                        is the same event as live targeting that changed without review.
-- K.I.N.D's GO applies all of it and clears all of it. A prospect in unpaid proof is NOT
-- live, so their refinement keeps writing the live columns directly - there is nothing of
-- theirs running to protect.
--
-- WHY THE BRIEF NEEDS ITS OWN FIELD RATHER THAN A KEY INSIDE pending_targeting: GO applies
-- the held revision by spreading that payload straight onto the icps row, so every key in
-- it is written as an icps COLUMN. campaign_intent is a figsy_campaigns column
-- (20260524_campaign_intent.sql) and does not exist on icps - hiding it in that payload
-- would fail the GO write, or need stripping logic the column's own name gives no hint of.
-- It is still the SAME row as the targeting, so a refused GO cannot clear half a revision.
alter table public.icps
  add column if not exists pending_targeting       jsonb,
  add column if not exists pending_submitted_at    timestamptz,
  add column if not exists pending_campaign_intent text;

comment on column public.icps.pending_targeting is
  'A live client''s revised targeting, awaiting K.I.N.D review. NEVER read by sourcing, scoring or sending - the live columns beside it remain operational until GO applies this and clears it. Null for a prospect, whose ICP is not live and is edited in place.';

alter table public.money_settings
  add column if not exists proof_monthly_cap_usd numeric not null default 300;

comment on column public.money_settings.proof_monthly_cap_usd is
  'Free-proof ACQUISITION PDL ceiling per calendar month, separate from pdl_monthly_cap_usd which fences PAID delivery. Founder-set 22 Aug at $300: the most he is initially prepared to fund to win clients, raised deliberately when demand justifies it. Never raised automatically.';

-- ── 3. The proof ledger — every RESERVATION is a row, and the row is the token ──────────
-- Separate from sourcing_ledger on purpose (see header). A positive row IS a reservation:
-- its id is the identity a reconciliation must name, budget_month pins which month's
-- ceiling it consumed, and reconciled_at makes reconciliation once-only. Negative rows are
-- corrections, carry reservation_id back to the row they correct, and inherit its
-- budget_month -- so a late reconciliation can never leak authority into a newer month.
create table if not exists public.proof_ledger (
  id               uuid primary key default uuid_generate_v4(),
  client_id        uuid not null references public.clients(id) on delete cascade,
  records          int  not null,
  cost_usd         numeric not null,
  -- The month whose ceiling this row counts against. Stamped at creation, inherited by the
  -- correction, NEVER derived from when a later event happened to run.
  budget_month     date not null default (date_trunc('month', now()))::date,
  -- Corrections only: the reservation row this negative row reconciles.
  reservation_id   uuid references public.proof_ledger(id),
  -- Reservations only: set exactly once, by the one reconciliation this row may ever have.
  reconciled_at    timestamptz,
  released_records int not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists proof_ledger_budget_month_idx on public.proof_ledger (budget_month);
create index if not exists proof_ledger_client_idx on public.proof_ledger (client_id, created_at desc);

alter table public.proof_ledger enable row level security;

comment on table public.proof_ledger is
  'Free-proof acquisition PDL spend. A positive row IS a reservation (made BEFORE the provider call) and its id is the token a reconciliation must name; a negative row is that reservation''s once-only correction and inherits its budget_month. The month sum of cost_usd over budget_month is the authority for the free-acquisition ceiling. Never mixed with sourcing_ledger, which fences paid delivery.';

-- ── 4. Claim a proof pass — atomic, and independent of PDL ──────────────────────────────
-- Claimed BEFORE the batch starts, so a POOL-ONLY batch consumes a pass exactly as a
-- PDL-backed one does. Returns the pass number claimed (1 or 2), or 0 when refused.
--
-- If a technical failure happens after a claim, the pass is spent and there is NO automatic
-- retry: an automatic retry is precisely the race that would produce a third free batch.
-- Recovery is human, which is the model the founder already chose for a second miss.
create or replace function public.try_claim_proof_pass(p_client_id uuid)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_done int;
begin
  if p_client_id is null then return 0; end if;

  -- FOR UPDATE serialises two requests racing for the same pass: the loser reads the
  -- winner's committed value, not a stale one, and is refused.
  select coalesce(proof_passes_done, 0) into v_done
    from public.clients where id = p_client_id for update;

  if v_done is null then return 0; end if;     -- unknown client: fail closed
  if v_done >= 2 then return 0; end if;        -- two passes used: a human takes over

  update public.clients set proof_passes_done = v_done + 1 where id = p_client_id;
  return v_done + 1;
end;
$$;

revoke execute on function public.try_claim_proof_pass(uuid) from public;
grant  execute on function public.try_claim_proof_pass(uuid) to service_role;

-- ── 5. Reserve proof records — atomic per client AND across clients ─────────────────────
-- Returns jsonb: { "granted": n, "reservation_id": uuid, "reason": text }. granted is the
-- LEAST of what was asked for, the prospect's remaining 40, and the month's remaining room;
-- 0 = refused and reservation_id is null. The caller MUST carry reservation_id to the
-- reconciliation: a release addresses one reservation, never a client aggregate.
--
-- ⚠️ WHY THE REASON IS RETURNED RATHER THAN INFERRED BY THE CALLER (round 3).
-- A granted of 0 on its own says only "you got nothing". It does not say whether THIS
-- prospect has used their own 40 lifetime records -- routine, expected, and costing K.I.N.D
-- nothing -- or whether the MONTH'S $300 ACQUISITION CEILING is gone, which is rare, urgent
-- and needs the founder. The first implementation could not tell them apart, so it raised
-- "the free-proof acquisition budget is spent" on every zero, including the common one. An
-- alert that fires on a routine event is an alert nobody reads on the day it is true.
--
-- The reason is computed INSIDE the same locked section, from the same numbers that decided
-- the grant, so it can never disagree with the decision it explains and is never re-derived
-- by a second query reading a different instant. Values:
--   GRANTED                       records were reserved (possibly fewer than requested).
--   CLIENT_PROOF_LIMIT_REACHED    this prospect has committed all 40 of their records.
--   MONTHLY_PROOF_BUDGET_REACHED  the month's acquisition ceiling has no room left.
--   FAIL_CLOSED_BAD_ARGS          nothing was asked for; nothing reserved, nothing spent.
--   FAIL_CLOSED_NO_MONEY_SETTINGS the singleton settings row is missing -> refuse.
--   FAIL_CLOSED_UNKNOWN_CLIENT    no such client row -> refuse.
--
-- ⚠️ ORDER MATTERS: the CLIENT'S own limit is tested FIRST. A prospect sitting at 40 tells
-- you nothing whatsoever about the $300, so reporting that case as a budget exhaustion
-- would be a false statement about company money.
create or replace function public.try_reserve_proof_records(p_client_id uuid, p_requested int)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rate        numeric := 0.28;   -- PDL $/record, verified 10 Jul (sourcing-fences.ts:6)
  v_client_cap  int     := 40;     -- founder-set lifetime proof records per prospect
  v_committed   int;
  v_client_room int;
  v_cap_usd     numeric;
  v_month_usd   numeric;
  v_month       date := (date_trunc('month', now()))::date;
  v_room        int;
  v_grant       int;
  v_res_id      uuid;
begin
  if p_client_id is null or p_requested is null or p_requested <= 0 then
    return jsonb_build_object('granted', 0, 'reservation_id', null, 'reason', 'FAIL_CLOSED_BAD_ARGS');
  end if;

  -- ① GLOBAL LOCK FIRST. The singleton money_settings row is the one object every proof
  --    reservation must pass through, which is what serialises DIFFERENT clients. Locking
  --    per-client rows alone would let two prospects each read the same monthly room.
  select coalesce(proof_monthly_cap_usd, 300) into v_cap_usd
    from public.money_settings where id = 1 for update;
  if v_cap_usd is null then
    return jsonb_build_object('granted', 0, 'reservation_id', null, 'reason', 'FAIL_CLOSED_NO_MONEY_SETTINGS');
  end if;

  -- ② then the prospect's own row. Always this order, so proof callers cannot deadlock.
  select coalesce(proof_records_committed, 0) into v_committed
    from public.clients where id = p_client_id for update;
  if v_committed is null then
    return jsonb_build_object('granted', 0, 'reservation_id', null, 'reason', 'FAIL_CLOSED_UNKNOWN_CLIENT');
  end if;

  -- THE PROSPECT'S OWN CEILING, ANSWERED BEFORE THE COMPANY'S. This is the common refusal
  -- and it is not a money event: the prospect has had their two passes' worth of records.
  v_client_room := greatest(0, v_client_cap - v_committed);
  if v_client_room <= 0 then
    return jsonb_build_object('granted', 0, 'reservation_id', null, 'reason', 'CLIENT_PROOF_LIMIT_REACHED');
  end if;

  -- THIS month's authority: summed over budget_month, so an old month's late correction
  -- can never inflate the current month's room. Outstanding reservations are already in
  -- the sum, because the reservation IS a ledger row.
  select coalesce(sum(cost_usd), 0) into v_month_usd
    from public.proof_ledger where budget_month = v_month;

  v_room := greatest(0, floor((v_cap_usd - v_month_usd) / v_rate))::int;
  if v_room <= 0 then
    -- THE ONE THAT IS ACTUALLY A COMPANY EVENT. Free acquisition has stopped for everybody
    -- until the founder raises the ceiling, so this -- and only this -- raises the alert.
    return jsonb_build_object('granted', 0, 'reservation_id', null, 'reason', 'MONTHLY_PROOF_BUDGET_REACHED');
  end if;

  v_grant := least(p_requested, v_client_room, v_room);
  if v_grant <= 0 then
    -- Unreachable: all three inputs are > 0 above. Kept as a fail-closed floor so a future
    -- edit to any of them can only ever under-allow.
    return jsonb_build_object('granted', 0, 'reservation_id', null, 'reason', 'FAIL_CLOSED_BAD_ARGS');
  end if;

  update public.clients
     set proof_records_committed = v_committed + v_grant
   where id = p_client_id;

  insert into public.proof_ledger (client_id, records, cost_usd, budget_month)
    values (p_client_id, v_grant, v_grant * v_rate, v_month)
    returning id into v_res_id;

  return jsonb_build_object('granted', v_grant, 'reservation_id', v_res_id, 'reason', 'GRANTED');
end;
$$;

revoke execute on function public.try_reserve_proof_records(uuid, int) from public;
grant  execute on function public.try_reserve_proof_records(uuid, int) to service_role;

-- ── 6. Reconcile ONE reservation — once, by id, in its own month ────────────────────────
-- Reserve 40, PDL returns 25 -> release 15 AGAINST THAT RESERVATION. The row is marked
-- reconciled and can never release again: a replayed job, a double webhook or a second
-- reconciliation is a true no-op, so authority can never be recreated after the records
-- were genuinely bought. The correction inherits the reservation's budget_month, so an
-- August reservation reconciled on 1 Sep corrects AUGUST -- September opens with exactly
-- its configured budget.
--
-- If this never runs, the reservation simply stands: the prospect and the month are both
-- under-allocated by the unused amount, and neither ceiling can be exceeded. That is the
-- fail-closed behaviour, and it is why the reservation is taken before the provider call.
create or replace function public.release_proof_records(p_reservation_id uuid, p_records int)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row       public.proof_ledger%rowtype;
  v_rate      numeric;
  v_committed int;
  v_release   int;
begin
  if p_reservation_id is null or p_records is null or p_records <= 0 then return 0; end if;

  -- Lock THE reservation row. Everything below is scoped to it and nothing else.
  select * into v_row from public.proof_ledger where id = p_reservation_id for update;
  if not found then return 0; end if;
  if v_row.records <= 0 then return 0; end if;             -- corrections are not reservations
  if v_row.reconciled_at is not null then return 0; end if; -- ONCE. A replay is a no-op.

  -- Clamp to THIS reservation's size: reconciling A can never release B's authority.
  v_release := least(p_records, v_row.records);
  v_rate    := v_row.cost_usd / v_row.records;             -- the rate this reservation was booked at

  update public.proof_ledger
     set reconciled_at = now(), released_records = v_release
   where id = p_reservation_id;

  select coalesce(proof_records_committed, 0) into v_committed
    from public.clients where id = v_row.client_id for update;
  update public.clients
     set proof_records_committed = greatest(0, v_committed - v_release)
   where id = v_row.client_id;

  -- The correction lands in the RESERVATION'S month. Never the current one.
  insert into public.proof_ledger (client_id, records, cost_usd, budget_month, reservation_id)
    values (v_row.client_id, -v_release, -(v_release * v_rate), v_row.budget_month, v_row.id);

  return v_release;
end;
$$;

-- ── 7. APPLY A HELD REVISION — ALL OF IT, OR NONE OF IT ─────────────────────────────────
-- A live client's revised targeting and revised brief wait together (founder-ruled 22 Aug),
-- and K.I.N.D's GO applies them together. "Together" is the whole rule, and the first
-- implementation could not honour it: the route made TWO ordinary client writes, the
-- campaign brief first and the ICP second. Two writes across two tables are not a
-- transaction. When the first landed and the second did not, the client was left with a NEW
-- BRIEF and OLD TARGETING - FIGSY writing for an audience nobody had approved - while the
-- revision could still look like it was waiting. Found by independent review.
--
-- Ordering the writes more carefully cannot fix that; only one transaction can. A plpgsql
-- function body IS one transaction, so everything below either lands together or, on any
-- raise, rolls back entirely: the live targeting, the live brief and all three pending
-- fields are exactly as they were, and GO reports failure.
--
-- WHY THE TARGETING IS APPLIED FIELD BY FIELD rather than spread from the jsonb: this is a
-- WHITELIST. Only the nine columns the client's own ICP form can set are written, so a stray
-- or hostile key in the stored payload can never reach a column nobody intended - and a key
-- that is absent leaves the live value alone rather than nulling it.
--
-- Idempotent by construction: applying clears the pending fields in the same statement that
-- activates, so a second GO finds nothing to apply and simply re-activates.
--
-- ⚠️ TWO KINDS OF FAILURE, AND ONLY ONE OF THEM RAISES. Bad arguments and an ICP that is not
-- this client's are answered with a clean refusal, because they are decided BEFORE any write
-- happens - nothing has been changed, so there is nothing to roll back, and a refusal keeps
-- the function PROBEABLE (system-probes calls it with the all-zeros uuid to prove it exists
-- without touching a real row). Every failure that can occur once a write has landed RAISES,
-- which is what rolls the whole thing back. The route treats ok=false and an error the same
-- way: nothing was applied, the revision is still waiting.
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
  v_icp    public.icps%rowtype;
  v_t      jsonb;
  v_intent text;
  v_rows   int;
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

  -- ③ THE TARGETING, THE ACTIVATION AND THE CLEARING - one statement, one whitelist.
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
    'icp',            to_jsonb(v_icp)
  );
end;
$$;

revoke execute on function public.apply_pending_revision(uuid, uuid, uuid) from public;
grant  execute on function public.apply_pending_revision(uuid, uuid, uuid) to service_role;

revoke execute on function public.release_proof_records(uuid, int) from public;
grant  execute on function public.release_proof_records(uuid, int) to service_role;
`.trim(),
  },
  {
    // ⚑ 25 Aug — FREE-PROOF PASS-2 WIDENED ACCEPTANCE. Canonical file:
    // supabase/migrations/20260825_proof_widened_candidate.sql (written in the same change,
    // which is the shape migration-home.test.ts argues for).
    //
    // ONE nullable jsonb column. It is the durable server-side answer to "which batch did
    // this client accept, and what targeting produced it?" — without it, a client can accept
    // a widened proof and then pay for an ICP whose paid sourcing re-runs the exact query
    // that already returned zero. Every existing field was ruled out on its own evidence;
    // the .sql file carries that reasoning in full.
    //
    // Additive, idempotent, no default, no backfill, no constraint, no index, no RLS change.
    key: '20260825_proof_widened_candidate',
    title: 'icps.proof_widened_candidate — the accepted-proof targeting alignment (a widened proof the client approved must be the targeting they pay for)',
    sql: `
alter table public.icps
  add column if not exists proof_widened_candidate jsonb;

comment on column public.icps.proof_widened_candidate is
  'Free-proof pass-2 widened-fallback acceptance state. Server-owned only: never accepted from a browser, never read by sourcing, scoring or sending, and never applied by an operator GO. Shape: {version, state: pending|accepted, proof_pass, batch_at, basis:{job_titles, seniority_levels, industries, company_sizes, geographies}, accepted_at?}. batch_at is the surfaced_for_approval_at stamp of the batch it produced; basis is the saved ICP targeting the widened search was derived from, BEFORE seniority and size were removed. Only ''pending'' may change targeting, and the transition to ''accepted'' happens in the same conditional UPDATE that clears seniority_levels and company_sizes — so a replayed click cannot mutate twice. NULL for every paying client and for every proof that did not widen.';
`.trim(),
  },
  {
    // ⚑ 26 Aug — THE PROOF DESK'S CLOCK BECOMES SERVER TRUTH (founder-authorised).
    //
    // The desk decides "still finding your matches" vs the approved recovery copy from how
    // long the run has been going, and nothing on the server could answer that: the claim
    // stored a counter and no time, run outcomes exist only once a run FINISHES, and the
    // proof ledger has a row only when PDL was reserved. So the desk inferred the start from
    // the browser — and a browser stamp is written only AFTER the POST returns, is scoped to
    // one profile, and can be stale from an older pass. A server that claimed a pass and lost
    // its response left a claimed run whose start existed nowhere.
    //
    // ONE COLUMN, written inside the SAME UPDATE that claims the pass, so the counter and the
    // clock can never disagree. Pass 1 sets it, pass 2 advances it, every refusal returns
    // before it. The pass it belongs to is already readable from `proof_passes_done` in the
    // same row, so no second identity column is needed.
    //
    // Additive and idempotent. Existing rows stay NULL and are NEVER backfilled — there is no
    // truthful historical source, and inventing one is the fabrication this column ends.
    key: '20260826_proof_started_at',
    title: 'clients.proof_started_at + try_claim_proof_pass stamps it atomically — the proof desk stops inferring its clock from the browser',
    sql: `
alter table public.clients
  add column if not exists proof_started_at timestamptz;

comment on column public.clients.proof_started_at is
  'When the CURRENT (latest) free-proof pass was claimed, set by try_claim_proof_pass in the same atomic statement that increments proof_passes_done. The authoritative clock for the proof desk''s bounded wait. NULL means no pass has been claimed since this column existed — never backfilled, because no truthful historical source exists.';

create or replace function public.try_claim_proof_pass(p_client_id uuid)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_done int;
begin
  if p_client_id is null then return 0; end if;

  -- FOR UPDATE serialises two requests racing for the same pass: the loser reads the
  -- winner's committed value, not a stale one, and is refused.
  select coalesce(proof_passes_done, 0) into v_done
    from public.clients where id = p_client_id for update;

  if v_done is null then return 0; end if;     -- unknown client: fail closed
  if v_done >= 2 then return 0; end if;        -- two passes used: a human takes over

  -- ONE STATEMENT: the pass is claimed and its start time recorded together, or neither
  -- happens. now() is the server's clock and is the only source this value ever has.
  update public.clients
     set proof_passes_done = v_done + 1,
         proof_started_at  = now()
   where id = p_client_id;
  return v_done + 1;
end;
$$;

revoke execute on function public.try_claim_proof_pass(uuid) from public;
grant  execute on function public.try_claim_proof_pass(uuid) to service_role;
`.trim(),
  },
  {
    // ⚑ 28 Aug — BUILD-002 · THE PROGRAMME COMMERCIAL + MONEY ENGINE. Canonical file:
    // supabase/migrations/20260828_programme_money_engine.sql (written in the same change,
    // which is the shape migration-home.test.ts argues for).
    //
    // Two new tables (programmes, programme_batches), four additive columns on existing
    // tables, and try_spend_sourcing gains a third parameter carrying programme authority.
    //
    // ⚠️ INERT UNTIL A PROGRAMME ROW EXISTS. With no programmes written, the gate takes the
    // legacy branch — reproduced byte-for-byte from 20260711_sourcing_fences.sql — so every
    // existing client's sourcing behaviour is unchanged. Asserted directly by
    // programme-authority-gate.test.ts rather than assumed.
    //
    // 🚀 RUN THIS BEFORE DEPLOYING THE API. The reverse order takes sourcing and campaign
    // activation down for every existing client — full reasoning in the .sql header. The
    // two-arg overload is dropped so a two-argument call is not ambiguous between it and
    // the new defaulted three-arg function.
    //
    // Backticks in the SQL comments are escaped for the template literal. The statements
    // themselves are identical to the canonical file.
    key: '20260828_programme_money_engine',
    title: 'programmes + programme_batches + programme sourcing authority (BUILD-002 — additive, inert until a programme exists)',
    sql: `
CREATE TABLE IF NOT EXISTS public.programmes (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                 uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  status                    text        NOT NULL DEFAULT 'DRAFT',

  -- What was sold. \`meeting_target\` is the client's choice; the rest is derived from the
  -- curve by @kind/shared and STORED, because a price quoted to a client must not silently
  -- change if the curve is ever amended.
  meeting_target            int         NOT NULL,
  recommended_volume        int         NOT NULL,
  price_per_meeting_cents   int         NOT NULL,
  price_total_cents         int         NOT NULL,
  first_payment_cents       int         NOT NULL,
  second_payment_cents      int         NOT NULL,

  -- Payment identity. \`*_ref\` is the Stripe checkout session id and is the idempotency key.
  -- \`*_intent_id\` is kept separately because refunds and disputes arrive keyed on the
  -- payment intent, not the session, and #317 already had to resolve one from the other.
  first_payment_ref         text,
  second_payment_ref        text,
  first_payment_intent_id   text,
  second_payment_intent_id  text,
  first_paid_at             timestamptz,
  second_paid_at            timestamptz,

  -- Sourcing authority. \`ceiling\` is set from \`recommended_volume\` when the first payment
  -- lands. \`reserved\` is volume granted but not yet delivered by a provider; \`used\` is
  -- volume actually delivered. See the reserve/release note on programme_batches.
  sourcing_ceiling          int         NOT NULL DEFAULT 0,
  sourced_used              int         NOT NULL DEFAULT 0,
  sourced_reserved          int         NOT NULL DEFAULT 0,

  approved_at               timestamptz,
  went_live_at              timestamptz,

  -- Pause is ORTHOGONAL to status, not a status of its own: a paused programme is still
  -- SOURCING or APPROVED, and collapsing that into a PAUSED status would lose what it must
  -- return to. \`pause_reason\` is client | quality | icp_change.
  paused_at                 timestamptz,
  pause_reason              text,

  -- Unused value. A programme may only COMPLETE when its ceiling is consumed OR the value
  -- has been deliberately settled — no job may silently expire what a client paid for.
  value_settled_at          timestamptz,
  make_whole_cents          int         NOT NULL DEFAULT 0,

  -- Contribution is NULL while the programme is live: a provisional figure persisted as if
  -- final is how a partner gets paid on a number that later moved.
  contribution_cents        int,
  contribution_finalised_at timestamptz,

  disputed_at               timestamptz,

  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- Status vocabulary. PAUSED is deliberately absent — see the pause note above.
ALTER TABLE public.programmes DROP CONSTRAINT IF EXISTS programmes_status_check;
ALTER TABLE public.programmes ADD CONSTRAINT programmes_status_check CHECK (status IN (
  'DRAFT', 'RECOMMENDED', 'AWAITING_FIRST_PAYMENT', 'SOURCING_AUTHORISED', 'SOURCING',
  'READY_FOR_APPROVAL', 'APPROVED', 'LIVE', 'COMPLETED', 'CANCELLED'
));

ALTER TABLE public.programmes DROP CONSTRAINT IF EXISTS programmes_pause_reason_check;
ALTER TABLE public.programmes ADD CONSTRAINT programmes_pause_reason_check
  CHECK (pause_reason IS NULL OR pause_reason IN ('client', 'quality', 'icp_change'));

-- Money integrity. The 50/50 split must partition the total exactly (R81) — if these two
-- ever fail to sum, a client is over- or under-charged, so the database refuses the row.
ALTER TABLE public.programmes DROP CONSTRAINT IF EXISTS programmes_payment_split_check;
ALTER TABLE public.programmes ADD CONSTRAINT programmes_payment_split_check
  CHECK (first_payment_cents + second_payment_cents = price_total_cents);

ALTER TABLE public.programmes DROP CONSTRAINT IF EXISTS programmes_positive_check;
ALTER TABLE public.programmes ADD CONSTRAINT programmes_positive_check CHECK (
  meeting_target > 0 AND recommended_volume > 0
  AND price_per_meeting_cents > 0 AND price_total_cents > 0
  AND first_payment_cents > 0 AND second_payment_cents > 0
  AND sourcing_ceiling >= 0 AND sourced_used >= 0 AND sourced_reserved >= 0
  AND make_whole_cents >= 0
);

-- ⚠️ THE CEILING INVARIANT, ENFORCED BY THE DATABASE. Used + reserved may never exceed the
-- authorised ceiling. This is what makes "sourcing beyond programme authority" impossible
-- rather than merely unlikely: two concurrent batches that would both fit individually
-- cannot both commit, because the second UPDATE violates this CHECK and rolls back.
ALTER TABLE public.programmes DROP CONSTRAINT IF EXISTS programmes_ceiling_check;
ALTER TABLE public.programmes ADD CONSTRAINT programmes_ceiling_check
  CHECK (sourced_used + sourced_reserved <= sourcing_ceiling);

-- Payment references are the webhook idempotency key. Partial, because most rows have NULL.
CREATE UNIQUE INDEX IF NOT EXISTS programmes_first_ref_uidx
  ON public.programmes (first_payment_ref) WHERE first_payment_ref IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS programmes_second_ref_uidx
  ON public.programmes (second_payment_ref) WHERE second_payment_ref IS NOT NULL;

-- ⚠️ ONE OPEN PROGRAMME PER CLIENT. Two open programmes would make "which programme does
-- this ICP's sourcing draw on?" ambiguous at the exact moment money moves. Terminal states
-- are excluded so a client can buy again after completing or cancelling.
CREATE UNIQUE INDEX IF NOT EXISTS programmes_one_open_per_client_uidx
  ON public.programmes (client_id) WHERE status NOT IN ('COMPLETED', 'CANCELLED');

CREATE INDEX IF NOT EXISTS programmes_client_idx ON public.programmes (client_id);
CREATE INDEX IF NOT EXISTS programmes_status_idx ON public.programmes (status);

-- ── 2 · programme_batches — controlled ~250-lead execution ───────────────────────────────
--
-- The first 50% authorises the FULL recommended volume, but execution happens in controlled
-- batches of ~250 (founder lock 4). Each batch records what was asked, what authority was
-- granted, and what a provider actually delivered — three different numbers, and conflating
-- them is how client entitlement gets stranded.
CREATE TABLE IF NOT EXISTS public.programme_batches (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id   uuid        NOT NULL REFERENCES public.programmes(id) ON DELETE CASCADE,
  seq            int         NOT NULL,
  requested      int         NOT NULL,
  granted        int         NOT NULL DEFAULT 0,
  delivered      int,
  status         text        NOT NULL DEFAULT 'running',
  reservation_id uuid,
  created_at     timestamptz NOT NULL DEFAULT now(),
  settled_at     timestamptz
);

ALTER TABLE public.programme_batches DROP CONSTRAINT IF EXISTS programme_batches_status_check;
ALTER TABLE public.programme_batches ADD CONSTRAINT programme_batches_status_check
  CHECK (status IN ('running', 'served', 'released', 'stranded'));

ALTER TABLE public.programme_batches DROP CONSTRAINT IF EXISTS programme_batches_positive_check;
ALTER TABLE public.programme_batches ADD CONSTRAINT programme_batches_positive_check
  CHECK (requested > 0 AND granted >= 0 AND (delivered IS NULL OR delivered >= 0));

CREATE UNIQUE INDEX IF NOT EXISTS programme_batches_seq_uidx
  ON public.programme_batches (programme_id, seq);
CREATE INDEX IF NOT EXISTS programme_batches_programme_idx
  ON public.programme_batches (programme_id, created_at);
-- 'stranded' is the dead-letter state: a release that itself failed. Indexed because it is
-- an alert queue, and an entitlement nobody can find is an entitlement nobody restores.
CREATE INDEX IF NOT EXISTS programme_batches_stranded_idx
  ON public.programme_batches (status) WHERE status = 'stranded';

-- ── 3 · additive columns on existing tables ─────────────────────────────────────────────
--
-- programme_id on ICPS, not on clients: a programme may contain SEVERAL ICPs, and
-- \`runIcpJob\` already loads the ICP row with select('*'), so the programme is deterministic
-- from the row the job is already holding. Deriving it from the client instead would guess
-- when a client has more than one.
ALTER TABLE public.icps
  ADD COLUMN IF NOT EXISTS programme_id uuid;
ALTER TABLE public.icps DROP CONSTRAINT IF EXISTS icps_programme_fk;
ALTER TABLE public.icps ADD CONSTRAINT icps_programme_fk
  FOREIGN KEY (programme_id) REFERENCES public.programmes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS icps_programme_idx ON public.icps (programme_id);

-- The sourcing ledger gains programme attribution so contribution can be computed from
-- ACTUAL cost rather than an estimate. SET NULL, never CASCADE: deleting a programme must
-- never delete the record of money we spent.
ALTER TABLE public.sourcing_ledger
  ADD COLUMN IF NOT EXISTS programme_id uuid;
ALTER TABLE public.sourcing_ledger DROP CONSTRAINT IF EXISTS sourcing_ledger_programme_fk;
ALTER TABLE public.sourcing_ledger ADD CONSTRAINT sourcing_ledger_programme_fk
  FOREIGN KEY (programme_id) REFERENCES public.programmes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS sourcing_ledger_programme_idx
  ON public.sourcing_ledger (programme_id) WHERE programme_id IS NOT NULL;

-- Partner commissions gain a BASIS, because there are now two of them and a row that does
-- not say which one it used cannot be audited. Legacy rows stay NULL and keep meaning
-- 'lead_sale' by their history — no backfill, because inventing a basis for a historical
-- row is a claim about a payment nobody re-checked.
ALTER TABLE public.partner_commissions
  ADD COLUMN IF NOT EXISTS programme_id uuid;
ALTER TABLE public.partner_commissions
  ADD COLUMN IF NOT EXISTS basis text;
ALTER TABLE public.partner_commissions DROP CONSTRAINT IF EXISTS partner_commissions_programme_fk;
ALTER TABLE public.partner_commissions ADD CONSTRAINT partner_commissions_programme_fk
  FOREIGN KEY (programme_id) REFERENCES public.programmes(id) ON DELETE SET NULL;
ALTER TABLE public.partner_commissions DROP CONSTRAINT IF EXISTS partner_commissions_basis_check;
ALTER TABLE public.partner_commissions ADD CONSTRAINT partner_commissions_basis_check
  CHECK (basis IS NULL OR basis IN ('lead_sale', 'programme_contribution'));
CREATE INDEX IF NOT EXISTS partner_commissions_programme_idx
  ON public.partner_commissions (programme_id) WHERE programme_id IS NOT NULL;

-- ── 4 · the authority gate, inside the atomic function ──────────────────────────────────
--
-- ⚠️ THE LEGACY BRANCH BELOW IS BYTE-FOR-BYTE THE EXISTING FUNCTION BODY. It is reproduced
-- rather than refactored so a reader can diff it against 20260711_sourcing_fences.sql and
-- see that no legacy client's behaviour moved. The programme branch is new code beside it.
-- ⚠️ THE OLD TWO-ARGUMENT OVERLOAD IS DROPPED, AND THIS IS A DEPLOYMENT-SAFETY DECISION,
-- not tidiness. \`CREATE OR REPLACE\` with a new defaulted parameter creates a SECOND function
-- rather than replacing the first, leaving \`try_spend_sourcing(uuid, int)\` and
-- \`try_spend_sourcing(uuid, int, uuid DEFAULT NULL)\` both able to accept a two-argument call.
-- That is PostgreSQL's documented ambiguity case, and an ambiguous call on the sourcing gate
-- is a hard error on the live money path for every existing client.
--
-- With ONE function carrying a default, both callers resolve cleanly:
--   old API, two args  → the default supplies NULL → legacy branch, behaviour unchanged
--   new API, three args → programme authority
-- which is precisely what makes MIGRATION-FIRST deployment safe (see the header).
--
-- The DROP and the CREATE are in the same statement batch, so there is no window in which
-- the gate is absent.
DROP FUNCTION IF EXISTS public.try_spend_sourcing(uuid, int);

CREATE OR REPLACE FUNCTION public.try_spend_sourcing(
  p_client_id uuid,
  p_requested int,
  p_programme_id uuid DEFAULT NULL
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rate         numeric := 0.28;
  v_daily_cap    int     := 100;
  -- ⚠️ CONTROLLED EXECUTION, AND IT IS A DIFFERENT LIMIT FROM THE CEILING. The first 50%
  -- authorises sourcing up to the FULL recommended volume — but execution happens in
  -- controlled batches of approximately 250 (founder lock 4). The ceiling is the TOTAL a
  -- programme may ever source; this is the MOST any single grant may take. Without it a
  -- caller asking for 2,500 would be granted 2,500 and the whole programme would execute in
  -- one uncontrolled batch, which is exactly what "controlled batches" forbids — and the
  -- pause-on-material-problem rule would then have nothing left to pause.
  v_batch_cap    int     := 250;
  v_cap_usd      numeric;
  v_month_usd    numeric;
  v_month_room   int;
  v_day_used     int;
  v_day_room     int;
  v_allowance    int;
  v_granted      int;
  v_open_id      uuid;
  v_open_status  text;
  v_room         int;
BEGIN
  IF p_requested IS NULL OR p_requested <= 0 THEN
    RETURN 0;
  END IF;

  -- WHICH REGIME APPLIES IS DECIDED HERE, FROM THE DATABASE — never from what the caller
  -- sent. This is the whole point of putting the gate inside the function.
  SELECT id, status INTO v_open_id, v_open_status
    FROM public.programmes
    WHERE client_id = p_client_id AND status NOT IN ('COMPLETED', 'CANCELLED')
    LIMIT 1;

  -- FAIL CLOSED ①: a legacy client can never borrow programme authority.
  IF v_open_id IS NULL AND p_programme_id IS NOT NULL THEN
    RETURN 0;
  END IF;

  -- FAIL CLOSED ②: a programme client must declare its programme. Omission is not a
  -- fallback to the legacy wallet — it is a caller that forgot, and it returns 0.
  IF v_open_id IS NOT NULL AND p_programme_id IS NULL THEN
    RETURN 0;
  END IF;

  -- FAIL CLOSED ③: a mismatched id is never treated as "close enough".
  IF v_open_id IS NOT NULL AND p_programme_id <> v_open_id THEN
    RETURN 0;
  END IF;

  IF v_open_id IS NOT NULL THEN
    -- ── PROGRAMME AUTHORITY ───────────────────────────────────────────────────────────
    -- Sourcing is authorised by the first payment, so the programme must have reached at
    -- least SOURCING_AUTHORISED and must not be paused. Money is already collected; the
    -- constraint here is entitlement, not wallet balance.
    IF v_open_status NOT IN ('SOURCING_AUTHORISED', 'SOURCING', 'READY_FOR_APPROVAL', 'APPROVED', 'LIVE') THEN
      RETURN 0;
    END IF;
    IF EXISTS (SELECT 1 FROM public.programmes WHERE id = v_open_id AND paused_at IS NOT NULL) THEN
      RETURN 0;
    END IF;

    -- RESERVE, do not consume: \`sourced_reserved\` rises now and is converted to
    -- \`sourced_used\` only when a provider actually delivers. The CHECK constraint makes
    -- two concurrent batches unable to exceed the ceiling — the loser's UPDATE violates it.
    SELECT GREATEST(0, sourcing_ceiling - sourced_used - sourced_reserved) INTO v_room
      FROM public.programmes WHERE id = v_open_id;

    v_granted := LEAST(p_requested, COALESCE(v_room, 0), v_batch_cap);
    IF v_granted <= 0 THEN
      RETURN 0;
    END IF;

    UPDATE public.programmes
      SET sourced_reserved = sourced_reserved + v_granted, updated_at = now()
      WHERE id = v_open_id
        AND sourced_used + sourced_reserved + v_granted <= sourcing_ceiling;
    IF NOT FOUND THEN
      RETURN 0;
    END IF;

    -- Provider spend is still recorded pessimistically at grant time — the existing
    -- spend-safety model, unchanged. Attribution lets contribution use ACTUAL cost.
    INSERT INTO public.sourcing_ledger (client_id, records, cost_usd, programme_id)
      VALUES (p_client_id, v_granted, v_granted * v_rate, v_open_id);

    RETURN v_granted;
  END IF;

  -- ── LEGACY BEHAVIOUR — unchanged from 20260711_sourcing_fences.sql ──────────────────
  SELECT pdl_monthly_cap_usd INTO v_cap_usd FROM public.money_settings WHERE id = 1;
  v_cap_usd := COALESCE(v_cap_usd, 300);
  SELECT COALESCE(SUM(cost_usd), 0) INTO v_month_usd
    FROM public.sourcing_ledger
    WHERE created_at >= date_trunc('month', now());
  v_month_room := GREATEST(0, floor((v_cap_usd - v_month_usd) / v_rate))::int;

  SELECT COALESCE(SUM(records), 0) INTO v_day_used
    FROM public.sourcing_ledger
    WHERE client_id = p_client_id
      AND created_at >= date_trunc('day', now());
  v_day_room := GREATEST(0, v_daily_cap - v_day_used);

  SELECT COALESCE(sourcing_allowance, 0) INTO v_allowance
    FROM public.clients WHERE id = p_client_id;

  v_granted := LEAST(p_requested, COALESCE(v_allowance, 0), v_month_room, v_day_room);
  IF v_granted <= 0 THEN
    RETURN 0;
  END IF;

  UPDATE public.clients
    SET sourcing_allowance = sourcing_allowance - v_granted
    WHERE id = p_client_id
      AND COALESCE(sourcing_allowance, 0) >= v_granted;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  INSERT INTO public.sourcing_ledger (client_id, records, cost_usd)
    VALUES (p_client_id, v_granted, v_granted * v_rate);

  RETURN v_granted;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.try_spend_sourcing(uuid, int, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.try_spend_sourcing(uuid, int, uuid) TO service_role;

-- ── 5 · settle a batch — reserve → used, or release ─────────────────────────────────────
--
-- Called once a provider has returned. Converts reservation into consumption for what was
-- actually delivered and RELEASES the remainder, so a provider returning 0 does not
-- permanently burn a client's paid entitlement.
CREATE OR REPLACE FUNCTION public.settle_programme_batch(
  p_batch_id  uuid,
  p_delivered int
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prog    uuid;
  v_granted int;
  v_status  text;
  v_deliver int;
BEGIN
  SELECT programme_id, granted, status INTO v_prog, v_granted, v_status
    FROM public.programme_batches WHERE id = p_batch_id FOR UPDATE;
  IF v_prog IS NULL THEN
    RETURN 0;
  END IF;
  -- Idempotent: a settled batch settles once. A webhook or retry replaying this must not
  -- release the same reservation twice and hand the client volume they already consumed.
  IF v_status <> 'running' THEN
    RETURN 0;
  END IF;

  v_deliver := LEAST(GREATEST(COALESCE(p_delivered, 0), 0), v_granted);

  UPDATE public.programmes
    SET sourced_reserved = GREATEST(0, sourced_reserved - v_granted),
        sourced_used     = sourced_used + v_deliver,
        status           = CASE WHEN status = 'SOURCING_AUTHORISED' THEN 'SOURCING' ELSE status END,
        updated_at       = now()
    WHERE id = v_prog;

  UPDATE public.programme_batches
    SET delivered = v_deliver,
        status    = CASE WHEN v_deliver > 0 THEN 'served' ELSE 'released' END,
        settled_at = now()
    WHERE id = p_batch_id;

  RETURN v_deliver;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.settle_programme_batch(uuid, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.settle_programme_batch(uuid, int) TO service_role;

-- ── 6 · RLS ─────────────────────────────────────────────────────────────────────────────
--
-- ON with NO policies, matching the \`acquisition_memory\` precedent (20260826). Supabase RLS
-- is off by default and \`apps/portal\` ships the anon key to every browser. Nothing
-- client-facing reads these tables — every legitimate caller is server-side on the service
-- role, which bypasses RLS — so the correct policy set is EMPTY. A policy added here later
-- is a deliberate decision to expose programme money to a browser.
ALTER TABLE IF EXISTS public.programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.programme_batches ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.programmes IS
  'BUILD-002 · the targeted booked-meeting programme (R74/R77/R78/R81). Money in integer cents. Pause is orthogonal to status. Contribution stays NULL until the programme is terminal and settled.';
COMMENT ON TABLE public.programme_batches IS
  'Controlled ~250-lead execution batches. reserve at grant, convert to used on delivery, release on provider failure. status=stranded is the dead-letter queue for a release that itself failed.';
`.trim(),
  },
  {
    // ⚑ 29 Aug — BUILD-003 · MEETING TRUTH. Canonical file:
    // supabase/migrations/20260829_meetings.sql.
    //
    // Replaces figsy_replies.meeting_booked_at — a nullable timestamp on a REPLY row, with
    // the count re-derived in six places — which cannot tell HELD from NO_SHOW, cannot
    // exclude a duplicate, counts a reschedule twice, and cannot record a failed calendar
    // write. MEETING_BOOKED is the hard product-outcome boundary (P v1 r21).
    //
    // ⚠️ NOT gated by R2. Adds a table nothing reads yet plus a BEFORE DELETE trigger on
    // leads; existing behaviour is unchanged until meeting-truth.ts writes to it.
    key: '20260829_meetings',
    title: 'public.meetings — the sole source of meeting truth (BUILD-003 item 2)',
    sql: `
-- ═══════════════════════════════════════════════════════════════════════════════════════
-- BUILD-003 · item 2 — public.meetings, THE SOLE SOURCE OF MEETING TRUTH
--
-- ⚠️ NOT GATED BY R2. Split out from delivery_rls on purpose: R2 gates browser access, and
-- meeting truth must not wait behind it. This migration grants the browser nothing beyond a
-- tenant-scoped read of a table that does not exist yet.
--
-- WHAT IT REPLACES. Meeting truth today is \`figsy_replies.meeting_booked_at\` — a nullable
-- timestamp on a REPLY row — and the count is re-derived independently in at least six
-- places (figsy.ts:1253, figsy.ts:819, company.ts:82, company.ts:259, leads.ts:427,
-- morning-brief-deliver.ts:61), each as \`if (r.meeting_booked_at) n++\`. That shape cannot
-- express what the founder actually needs: it cannot tell a HELD meeting from a NO_SHOW,
-- cannot exclude a duplicate or a spam booking, counts a reschedule twice, and has nowhere
-- to record that a calendar write failed.
--
-- MEETING_BOOKED is the hard downstream product-outcome boundary (P v1 rule 21), so the
-- number this table produces is the number the commercial model is judged on.
--
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.meetings (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ⚠️ RESTRICT, NOT CASCADE. A client with meeting history cannot be deleted out from under
  -- the outcome record. Deleting the client is refused at the database, loudly, rather than
  -- silently taking the evidence with it — and this FK is the ONLY prohibition needed, so no
  -- second custom delete trigger exists on this table.
  client_id            uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,

  -- The prospect, by REFERENCE ONLY. ⚠️ No name, no email, no phone is stored here: meeting
  -- truth adds NO additional persisted prospect identifier, so erasing the lead does not
  -- leave a second copy of the person behind on this row.
  lead_id              uuid REFERENCES public.leads(id)            ON DELETE SET NULL,
  campaign_id          uuid REFERENCES public.figsy_campaigns(id)  ON DELETE SET NULL,
  enrollment_id        uuid REFERENCES public.figsy_enrollments(id) ON DELETE SET NULL,
  programme_id         uuid REFERENCES public.programmes(id)       ON DELETE SET NULL,

  -- ── THE FOUR STATES ──────────────────────────────────────────────────────────────────
  -- BOOKED             a booking we have CONFIRMED against the calendar
  -- BOOKED_UNVERIFIED  the prospect accepted, but the calendar write failed or is unproven.
  --                    ⚠️ A SEPARATE STATE ON PURPOSE. Recording it as BOOKED would claim a
  --                    calendar entry that may not exist; dropping it would lose a real
  --                    meeting. It is a booking we cannot yet prove, and it says so.
  -- HELD               the meeting happened — explicit confirmation only
  -- NO_SHOW            it did not — explicit confirmation only
  state                text NOT NULL
                         CHECK (state IN ('BOOKED', 'BOOKED_UNVERIFIED', 'HELD', 'NO_SHOW')),

  google_event_id      text,
  scheduled_at         timestamptz NOT NULL,
  booked_at            timestamptz NOT NULL DEFAULT now(),
  verified_at          timestamptz,
  held_confirmed_at    timestamptz,
  no_show_confirmed_at timestamptz,
  confirmed_by         text,

  -- A reschedule INSERTS a new row and points back; the old row is stamped \`superseded_by\`.
  -- History is preserved — both rows survive, so "this meeting moved twice" stays answerable
  -- — while only the surviving row counts.
  rescheduled_from     uuid REFERENCES public.meetings(id) ON DELETE SET NULL,
  superseded_by        uuid REFERENCES public.meetings(id) ON DELETE SET NULL,

  -- A duplicate, a spam booking or someone outside the ICP is still a real row: deleting it
  -- would destroy the evidence of why the number moved. It simply does not count.
  excluded_reason      text CHECK (excluded_reason IN ('duplicate', 'spam', 'outside_icp')),
  excluded_at          timestamptz,
  excluded_note        text,

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  -- ── CONSTRAINTS — the invariant, as CHECKs rather than a trigger ─────────────────────

  -- HELD and NO_SHOW REQUIRE EXPLICIT CONFIRMATION. Neither may be inferred from the clock:
  -- a meeting whose time has passed is not evidence that anyone attended it.
  CONSTRAINT meetings_held_requires_confirmation
    CHECK (state <> 'HELD' OR held_confirmed_at IS NOT NULL),
  CONSTRAINT meetings_no_show_requires_confirmation
    CHECK (state <> 'NO_SHOW' OR no_show_confirmed_at IS NOT NULL),

  -- A confirmation without its state is a half-written record — the shape that turns a HELD
  -- meeting into one merely counted as booked.
  CONSTRAINT meetings_held_stamp_matches_state
    CHECK (held_confirmed_at IS NULL OR state = 'HELD'),
  CONSTRAINT meetings_no_show_stamp_matches_state
    CHECK (no_show_confirmed_at IS NULL OR state = 'NO_SHOW'),
  CONSTRAINT meetings_not_both_outcomes
    CHECK (held_confirmed_at IS NULL OR no_show_confirmed_at IS NULL),

  -- BOOKED MEANS VERIFIED. This is the whole point of splitting the two booked states.
  -- ⚠️ It requires \`verified_at\` and NOT \`google_event_id\`: erasure clears the event pointer
  -- while the booking stays verified, because THAT A BOOKING WAS VERIFIED IS HISTORICAL
  -- OUTCOME EVIDENCE. Requiring the event id here would make erasure impossible without
  -- falsifying the outcome.
  CONSTRAINT meetings_booked_requires_verification
    CHECK (state <> 'BOOKED' OR verified_at IS NOT NULL),
  CONSTRAINT meetings_unverified_carries_no_proof
    CHECK (state <> 'BOOKED_UNVERIFIED' OR verified_at IS NULL),

  -- ⚠️ NO ORPHAN EVENT POINTER — and this constraint is load-bearing twice over.
  -- A google_event_id resolves, inside Google, to an invitee's email address. So an event id
  -- with no lead is a pointer back to a person this row is not supposed to identify.
  -- It is ALSO the backstop for the erasure trigger below: \`lead_id\` is ON DELETE SET NULL,
  -- so if that trigger is ever dropped, deleting a lead nulls \`lead_id\` while leaving
  -- \`google_event_id\` behind — and this CHECK makes the DELETE ITSELF FAIL, loudly, instead
  -- of quietly leaving a route back to an erased person.
  CONSTRAINT meetings_no_orphan_event_pointer
    CHECK (google_event_id IS NULL OR lead_id IS NOT NULL),

  -- An exclusion must say why AND when; a reason with no timestamp is unauditable.
  CONSTRAINT meetings_exclusion_is_complete
    CHECK ((excluded_reason IS NULL) = (excluded_at IS NULL)),

  CONSTRAINT meetings_not_rescheduled_from_self
    CHECK (rescheduled_from IS NULL OR rescheduled_from <> id)
);

-- DUPLICATE google_event_id IS REJECTED. Partial, so the many rows with no calendar entry —
-- every BOOKED_UNVERIFIED, and every erased row — do not collide with each other on NULL.
CREATE UNIQUE INDEX IF NOT EXISTS meetings_google_event_id_key
  ON public.meetings (google_event_id) WHERE google_event_id IS NOT NULL;

-- ⚠️ LIVE-BOOKING UNIQUENESS — one live booking per lead, enforced by the DATABASE.
-- Two replies arriving at once, or a provider redelivering a webhook, would otherwise each
-- read "no meeting yet" and each insert one: the classic read-then-write race, and here it
-- inflates the single number the commercial model is judged on. A partial unique index makes
-- the second writer lose at commit rather than at a check it never ran.
-- Superseded (rescheduled) and excluded rows are outside the index, so a reschedule and an
-- excluded duplicate can both coexist with the live booking they relate to.
CREATE UNIQUE INDEX IF NOT EXISTS meetings_one_live_booking_per_lead
  ON public.meetings (lead_id)
  WHERE lead_id IS NOT NULL
    AND state IN ('BOOKED', 'BOOKED_UNVERIFIED')
    AND superseded_by IS NULL
    AND excluded_reason IS NULL;

CREATE INDEX IF NOT EXISTS meetings_client_idx    ON public.meetings (client_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS meetings_programme_idx ON public.meetings (programme_id) WHERE programme_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS meetings_lead_idx      ON public.meetings (lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS meetings_state_idx     ON public.meetings (client_id, state);

-- ── ERASURE — THE POINTER GOES, THE OUTCOME STAYS ──────────────────────────────────────
--
-- Fires BEFORE a lead is deleted. It nulls \`lead_id\` and \`google_event_id\` together, which
-- is the only pair that satisfies meetings_no_orphan_event_pointer.
--
-- ⚠️ WHAT IT DELIBERATELY DOES NOT DO: it does not demote BOOKED to BOOKED_UNVERIFIED and it
-- does not clear \`verified_at\`. The booking WAS verified; that is historical outcome evidence
-- and erasing it would falsify the record rather than protect the person. What disappears is
-- the route back to the prospect and to the calendar event — not the fact that a meeting
-- happened.
--
-- ⚠️ Data hygiene, not a legal claim. This makes NO assertion of sufficiency for any erasure
-- regime, and #704 (retention duration) remains unresolved and untouched.
CREATE OR REPLACE FUNCTION public.meetings_detach_erased_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.meetings
     SET lead_id         = NULL,
         google_event_id = NULL,
         updated_at      = now()
   WHERE lead_id = OLD.id;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.meetings_detach_erased_lead() FROM PUBLIC;

DROP TRIGGER IF EXISTS meetings_detach_erased_lead_trg ON public.leads;
CREATE TRIGGER meetings_detach_erased_lead_trg
  BEFORE DELETE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.meetings_detach_erased_lead();

-- Meetings are tenant data: a client reads their own, and the browser never writes them.
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "meetings_own" ON public.meetings;
CREATE POLICY "meetings_own" ON public.meetings
  FOR SELECT TO authenticated USING (client_id = public.current_client_id());
`.trim(),
  },
  {
    // ⚑ 29 Aug — BUILD-003 · REPLY IDEMPOTENCY. Canonical file:
    // supabase/migrations/20260829_reply_idempotency.sql.
    //
    // Keys on provider_event_key (replyEventKey: message id → delivery id → NULL), NOT on
    // provider_message_id, which would drop the delivery-id fallback that a webhook retry
    // actually carries. The index is PARTIAL: NULL is deliberately fail-open, because
    // dedupe on (campaign, lead, body) would discard a real second 'yes'.
    //
    // ⚠️ NOT gated by R2. One nullable column and one partial index.
    key: '20260829_reply_idempotency',
    title: 'figsy_replies.provider_event_key + partial unique index (BUILD-003 item 7)',
    sql: `
-- ═══════════════════════════════════════════════════════════════════════════════════════
-- BUILD-003 · item 7 — REPLY IDEMPOTENCY, A DATABASE BACKSTOP
--
-- ⚠️ NOT GATED BY R2 — split out from delivery_rls so the browser-access gate does not hold
-- back a duplicate-suppression guard. This file grants no browser access at all.
--
-- A provider redelivering a webhook must not create a second reply. A duplicate reply is a
-- duplicate classification, a duplicate meeting and a duplicate outcome — and outcomes are
-- what the commercial model is judged on.
--
-- ⚠️ WHY THE DATABASE AND NOT THE APPLICATION. There are three insert sites today —
-- reply-pipeline.ts:156, manual-reply.ts:114 and routes/figsy.ts:2297 — and the fourth one
-- somebody adds will not know about the other three. Application dedupe protects the paths
-- its author remembered; a unique index protects the paths nobody has written yet.
--
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- ⚠️ provider_event_key, NOT provider_message_id — and the difference is the whole design.
--
-- \`replyEventKey\` (reply-ingest.ts:346) already resolves the intended hierarchy:
--
--     provider message id  →  fallback provider delivery id  →  NULL if neither exists
--
-- and namespaces the result by provider, so \`smartlead:123\` and \`instantly:123\` are
-- different events rather than a collision between two vendors' counters.
--
-- Keying the index on \`provider_message_id\` alone would throw away the delivery-id fallback:
-- every redelivery that carries only a delivery id would slip past the backstop, which is
-- exactly the case a webhook retry produces. The column stores the KEY the application
-- already computes, so the database protects the same identity the code reasons about
-- instead of a narrower one.
ALTER TABLE public.figsy_replies
  ADD COLUMN IF NOT EXISTS provider_event_key text;

-- ⚠️ PARTIAL, SO NULL IS DELIBERATELY FAIL-OPEN — this is a decision, not an oversight.
--
-- A reply with neither a provider message id nor a delivery id (an operator typing a manual
-- reply, a provider that sends no identifier) is NOT deduplicated. The alternative is worse:
-- keying on something synthetic like (campaign, lead, body) would silently DISCARD a real
-- second reply from a person who wrote the same short line twice — "yes", "thanks", "ok".
--
-- Losing a genuine reply is a worse failure than storing a rare duplicate, because a lost
-- reply is a lost meeting and nobody ever sees that it happened. So the backstop protects
-- exactly the case where the provider hands us something authoritative to key on, and
-- declines to guess in the case where it does not.
CREATE UNIQUE INDEX IF NOT EXISTS figsy_replies_provider_event_key_key
  ON public.figsy_replies (provider_event_key) WHERE provider_event_key IS NOT NULL;

COMMENT ON COLUMN public.figsy_replies.provider_event_key IS
  'Provider-namespaced event key from replyEventKey() — message id, else delivery id, else NULL. Unique when present; NULL is deliberately NOT deduplicated (see 20260829_reply_idempotency.sql).';
`.trim(),
  },
  {
    // ⚑ 29 Aug — BUILD-003 · DELIVERY ATTRIBUTION. Canonical file:
    // supabase/migrations/20260829_delivery_attribution.sql.
    //
    // BUILD-002 gave a programme its SOURCING authority; nothing recorded what it
    // DELIVERED. Without these two columns PR 2 cannot enforce Go-Live or a coordinated
    // pause on delivery, because delivery cannot say whose authority it is spending.
    //
    // ⚠️ ADDITIVE AND INERT, and NOT gated by R2: both columns are nullable with no
    // backfill, every existing enrolment keeps NULL (the legacy $299/$4 path), and
    // nothing reads them until PR 2. Applying this changes no behaviour.
    key: '20260829_delivery_attribution',
    title: 'figsy_enrollments.programme_id + batch_id (BUILD-003 — the foundation PR 2 needs)',
    sql: `
-- ═══════════════════════════════════════════════════════════════════════════════════════
-- BUILD-003 · DELIVERY ATTRIBUTION — which programme, and which batch, put this person
-- into a sequence
--
-- ⚠️ NOT GATED BY R2 — split out from delivery_rls so PR 2's foundation is not held behind
-- the browser-access gate. Two nullable columns and two partial indexes; it grants nothing.
--
-- WHY IT EXISTS. BUILD-002 gave a programme its authority (\`try_spend_sourcing\` carries
-- \`p_programme_id\`) and its sourcing ledger, so we can say what a programme SOURCED. Nothing
-- records what it DELIVERED: \`figsy_enrollments\` is where a lead becomes an outreach
-- sequence, and it carries no programme. Without these two columns, PR 2 cannot enforce
-- Go-Live or a coordinated pause on delivery, because delivery cannot say which programme's
-- authority it is spending — and a programme could never be judged on the meetings it
-- actually produced.
--
-- ⚠️ ADDITIVE AND INERT. Both columns are nullable with no default and no backfill. Every
-- existing enrolment keeps \`NULL\`, which is the legacy $299/$4 path, and nothing reads these
-- columns until PR 2 does. Applying this file changes no behaviour.
--
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- SET NULL, not CASCADE: deleting a programme must never delete the record that a person was
-- enrolled and emailed. The attribution goes; the delivery history stays.
ALTER TABLE public.figsy_enrollments
  ADD COLUMN IF NOT EXISTS programme_id uuid REFERENCES public.programmes(id) ON DELETE SET NULL;

ALTER TABLE public.figsy_enrollments
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.programme_batches(id) ON DELETE SET NULL;

-- Partial, because the overwhelming majority of rows are legacy and carry NULL — indexing
-- those would be paying for a value nothing queries.
CREATE INDEX IF NOT EXISTS figsy_enrollments_programme_idx
  ON public.figsy_enrollments (programme_id) WHERE programme_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS figsy_enrollments_batch_idx
  ON public.figsy_enrollments (batch_id) WHERE batch_id IS NOT NULL;

COMMENT ON COLUMN public.figsy_enrollments.programme_id IS
  'The programme whose authority paid for this enrolment. NULL = legacy $299/$4 path (BUILD-003).';
COMMENT ON COLUMN public.figsy_enrollments.batch_id IS
  'The controlled ~250 batch this enrolment belongs to. NULL = legacy path (BUILD-003).';
`.trim(),
  },
  {
    // ⚑ 29 Aug — BUILD-003 item 6 (completion) · PROVIDER-SIDE EVICTION BLOCKER. Canonical
    // file: supabase/migrations/20260829_provider_eviction.sql.
    //
    // The send gate refuses NEW sends to a suppressed person. It can do nothing about one
    // already inside Smartlead, which sends from its own copy of the lead — our chokepoint
    // never runs for them again. alertSmartleadStillSending ONLY ALERTS; it stops no
    // delivery, and an email is not a tracked blocker.
    //
    // ⚠️ THIS DOES NOT CLOSE THE RISK. No remove endpoint can be confirmed (403 from this
    // environment; founder-ruled 20 Aug "yes alert not api"). It makes the risk COUNTABLE:
    // raised automatically at suppression, cleared only when a NAMED human confirms removal.
    //
    // ⚠️ NOT gated by R2 — five nullable columns and one partial index, no browser access.
    key: '20260829_provider_eviction',
    title: 'leads provider-eviction blocker — suppressed people already inside a provider (BUILD-003 item 6)',
    sql: `
-- ═══════════════════════════════════════════════════════════════════════════════════════
-- BUILD-003 · item 6 (completion) — PROVIDER-SIDE EVICTION, AS A TRACKED BLOCKER
--
-- ⚠️ NOT GATED BY R2 — four nullable columns and one partial index, no browser access.
--
-- THE GAP THE SEND GATE DOES NOT CLOSE. \`lib/send-gate.ts\` refuses any NEW K.I.N.D send to a
-- suppressed person. It can do nothing about a person who was already pushed into a provider
-- BEFORE they opted out: Smartlead sends from its own engine with its own copy of the lead,
-- so our chokepoint never runs for them again. A pre-send gate is necessary and is not
-- sufficient.
--
-- WHAT EXISTS TODAY, STATED HONESTLY: \`alertSmartleadStillSending\` reads
-- \`leads.smartlead_campaign_id\` and emails the founder a list of people to remove by hand.
-- It ONLY ALERTS. It stops no delivery. Founder-ruled 20 Aug — *"yes alert not api"* — because
-- api.smartlead.ai returns 403 from this environment, so no remove endpoint could be
-- confirmed and writing one would be guessing at an API that touches real people.
--
-- That ruling stands and this does not overturn it. What it fixes is that an EMAIL IS NOT A
-- TRACKED BLOCKER: if it fails to send, lands in spam, or is simply missed, nothing anywhere
-- records that a suppressed person is still sitting in a live campaign. The risk was real,
-- unresolved, and invisible.
--
-- So the blocker is PERSISTED on the lead. It is raised automatically at the moment of
-- suppression, it stays raised until an operator confirms the removal, and it can be listed.
-- ⚠️ IT DOES NOT CLOSE THE RISK — it makes the risk countable. That distinction is the whole
-- point, and the operator surface must say so in those words rather than implying it is
-- handled.
--
-- ⚠️ NO LEGAL OR COMPLIANCE CLAIM. This is an operational control. It asserts nothing about
-- sufficiency under any regime, and #704 remains unresolved and untouched.
--
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS provider_eviction_required_at timestamptz;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS provider_eviction_provider text
    CHECK (provider_eviction_provider IS NULL OR provider_eviction_provider IN ('smartlead', 'instantly'));

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS provider_eviction_reason text;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS provider_evicted_at timestamptz;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS provider_evicted_by text;

-- The operator's queue: raised and not yet cleared. Partial, because the overwhelming
-- majority of leads have never been pushed to a provider at all — and this index is what
-- makes "who is still in a campaign after opting out?" a question with an instant answer
-- rather than a table scan nobody runs.
CREATE INDEX IF NOT EXISTS leads_provider_eviction_pending_idx
  ON public.leads (provider_eviction_required_at)
  WHERE provider_eviction_required_at IS NOT NULL AND provider_evicted_at IS NULL;

COMMENT ON COLUMN public.leads.provider_eviction_required_at IS
  'BUILD-003 item 6: this person is suppressed AND was already inside a provider that sends from its own copy. Raised automatically on suppression; cleared only when an operator confirms removal. A raised blocker means delivery may still be happening — it records the risk, it does not close it.';
`.trim(),
  },
  {
    key: '20260829_delivery_rls',
    title: 'delivery RLS — the four figsy client policies narrow from ALL to SELECT, and the browser loses its unscoped read/write on the global blocklist (R2 closed)',
    sql: `
-- ── DELIVERY RLS — canonical copy: supabase/migrations/20260829_delivery_rls.sql
--
-- ⛓️ RELEASED 29 Aug AFTER R2 CLOSED. This entry did not exist while the migration was held.
-- Vida applies ALL pending migrations in one action, so the hold could only ever be the
-- ABSENCE of this entry — not a note in a PR body or an instruction remembered on the day.
--
-- ✅ THE RELEASE CONDITION, AND IT WAS MET. The five policy names dropped below were read off
-- pg_policies in production by the founder IMMEDIATELY before this entry was added. That is
-- the whole reason for the hold: a DROP naming a policy that does not exist is a silent no-op,
-- the CREATE that follows then ADDS beside whatever was already there, and PostgreSQL ORs
-- permissive policies — so a stale name does not fail, it WIDENS access while the migration
-- claims to narrow it. Narrowing is only possible via a DROP that actually bites.
--
-- WHAT THIS DOES:
--   · figsy_campaigns / _enrollments / _replies / _sent_emails — the client policy goes from
--     FOR ALL to FOR SELECT. These are delivery RECORDS: what we sent, who replied, what a
--     campaign did. FOR ALL let a signed-in client UPDATE and DELETE the evidence behind their
--     own invoice and the outcome numbers the commercial model is judged on. No product
--     feature ever used that write access; it was granted by default, not by decision.
--   · opt_out_blocklist — blocklist_read and blocklist_write are REMOVED WITH NO REPLACEMENT.
--     Both lacked a tenant predicate on a table that HAS blocked_by_client_id, so any signed-in
--     client could read EVERY suppressed address on the platform and INSERT arbitrary ones.
--     Suppression is globally effective across every send path, so that insert let a client
--     silence anyone they chose and have it look like ordinary use.
--
-- ⚠️ NO REPLACEMENT SELECT POLICY IS A DECISION, NOT AN OVERSIGHT. apps/portal/src contains
-- ZERO references to opt_out_blocklist — no live customer path reads it. RLS on with no policy
-- IS the deny for authenticated; the service role bypasses it and every send gate reads the
-- whole table exactly as before. A client-facing suppression view, if ever wanted, returns as
-- a controlled API surface — never as direct table access.
--
-- ⚠️ NOT TOUCHED, BY CONSTRUCTION: both service-role bypass policies per figsy table
-- ("service role bypass campaigns" and its siblings, AND "service_role_bypass"), leads, icps,
-- lead_pool, sourcing_ledger, and public.current_client_id() — which already exists, already
-- works, and is already used by leads_own/icps_own. Replacing a function live policies depend
-- on, to change nothing, is risk bought for nothing.
--
-- ⚠️ A PRODUCT RULE. No claim of legal sufficiency, and no PECR compliance asserted.
--
-- Safe to re-run: every DROP is IF EXISTS, and the CREATEs restore the same names.

DROP POLICY IF EXISTS "clients see own campaigns"   ON public.figsy_campaigns;
DROP POLICY IF EXISTS "clients see own enrollments" ON public.figsy_enrollments;
DROP POLICY IF EXISTS "clients see own replies"     ON public.figsy_replies;
DROP POLICY IF EXISTS "clients see own sent emails" ON public.figsy_sent_emails;

CREATE POLICY "clients see own campaigns" ON public.figsy_campaigns
  FOR SELECT TO authenticated USING (client_id = public.current_client_id());

CREATE POLICY "clients see own enrollments" ON public.figsy_enrollments
  FOR SELECT TO authenticated USING (client_id = public.current_client_id());

CREATE POLICY "clients see own replies" ON public.figsy_replies
  FOR SELECT TO authenticated USING (client_id = public.current_client_id());

CREATE POLICY "clients see own sent emails" ON public.figsy_sent_emails
  FOR SELECT TO authenticated USING (client_id = public.current_client_id());

DROP POLICY IF EXISTS "blocklist_read"  ON public.opt_out_blocklist;
DROP POLICY IF EXISTS "blocklist_write" ON public.opt_out_blocklist;
-- Defensive: an earlier draft of this migration created "blocklist_own". If any environment
-- ran that version, remove it too so the end state is the same everywhere.
DROP POLICY IF EXISTS "blocklist_own"   ON public.opt_out_blocklist;
`.trim(),
  },
  {
    key: '20260829_programme_delivery_control',
    title: 'BUILD-003 PR2 — atomic programme batch claim (at most ONE running batch per programme) + the review hold. Additive; no existing row is written.',
    sql: `
-- ── PROGRAMME DELIVERY CONTROL — canonical copy:
--    supabase/migrations/20260829_programme_delivery_control.sql
--
-- THE RACE. (programme_id, seq) is ALREADY unique (programme_batches_seq_uidx, added by
-- 20260828_programme_money_engine). That makes a double-INSERT impossible and closes nothing
-- that matters: openBatch reads MAX(seq), adds one, inserts. Two workers racing leave one
-- winner and one unique violation, openBatch returns null, and a caller that RETRIES then
-- reads the new max and inserts successfully -- TWO batches in status 'running' on one
-- programme, each holding its own reservation against the client's paid ceiling. No unique
-- key on (programme_id, seq) could ever have stopped that: the second batch has a legitimately
-- different seq. So the constraint that matters is ONE RUNNING BATCH PER PROGRAMME, enforced
-- by the database rather than by a check-then-act in application code -- check-then-act is
-- the bug.
--
-- State names are read off programme_batches_status_check (running/served/released/stranded).
-- 'running' is the only open state. Nothing is invented.
--
-- REVIEW IS NOT PAUSE. Four nullable columns, no second state machine. Pause is the hard stop;
-- review holds the NEXT NEW BATCH only, so an in-flight sequence finishes its story and
-- replies and meetings keep ingesting. 250 leads per targeted meeting is a PLANNING BENCHMARK
-- (R77), not a guarantee: nothing here stores money, promises a refund or creates a meeting.
-- public.meetings remains the sole meeting truth.
--
-- Additive and idempotent. No statement writes, deletes or rewrites an existing row.
--
-- RUNTIME NOTE: the partial unique index is built against live data and FAILS (rolling the
-- migration back) if a programme already has two running batches. That is the correct
-- outcome -- it would mean the race already happened and needs a human. Repo evidence says it
-- cannot have: the programme tables are inert until a programme row exists and no real
-- customer payment has been taken.

CREATE UNIQUE INDEX IF NOT EXISTS programme_batches_one_running_uidx
  ON public.programme_batches (programme_id)
  WHERE status = 'running';

ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS review_required_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_reason      text,
  ADD COLUMN IF NOT EXISTS review_resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_resolution  text;

COMMENT ON COLUMN public.programmes.review_required_at IS
  'BUILD-003 PR2. Set when the programme reached the R77 planning benchmark (250 delivered leads per targeted meeting) with no live booked meeting. Holds the NEXT NEW BATCH only — it is NOT a pause: in-flight sequence steps finish, replies and meetings keep ingesting. A planning benchmark is not a guarantee: this column promises no meeting, no refund and no credit.';
COMMENT ON COLUMN public.programmes.review_resolved_at IS
  'Set when a human resolved the review. Only an explicit operator decision clears the hold — nothing on a clock, and no background job.';

CREATE INDEX IF NOT EXISTS programmes_review_open_idx
  ON public.programmes (review_required_at)
  WHERE review_required_at IS NOT NULL AND review_resolved_at IS NULL;

CREATE OR REPLACE FUNCTION public.claim_programme_batch(
  p_programme_id uuid,
  p_requested    int,
  p_granted      int
) RETURNS public.programme_batches
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing public.programme_batches;
  v_next_seq int;
  v_row      public.programme_batches;
BEGIN
  -- PERFORM ... FOR UPDATE on the programme row is the serialiser: two callers arriving
  -- together are ordered by that lock, so the second one's SELECT runs after the first one's
  -- INSERT is visible to it. That is what makes "reuse the existing batch" true rather than
  -- hopeful. Without it both SELECTs could find nothing, both INSERT, and the partial unique
  -- index would reject one -- safe, but not idempotent.
  PERFORM 1 FROM public.programmes WHERE id = p_programme_id FOR UPDATE;

  SELECT * INTO v_existing
  FROM public.programme_batches
  WHERE programme_id = p_programme_id AND status = 'running'
  LIMIT 1;

  IF FOUND THEN
    RETURN v_existing;
  END IF;

  SELECT COALESCE(MAX(seq), 0) + 1 INTO v_next_seq
  FROM public.programme_batches
  WHERE programme_id = p_programme_id;

  INSERT INTO public.programme_batches (programme_id, seq, requested, granted, status)
  VALUES (p_programme_id, v_next_seq, p_requested, p_granted, 'running')
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.claim_programme_batch(uuid, int, int) IS
  'BUILD-003 PR2. Atomically claim the programme''s open batch: returns the one already running, or creates exactly one. Serialised by FOR UPDATE on the programme row, and backstopped by programme_batches_one_running_uidx. Replaces a read-MAX-then-insert in openBatch whose loser could retry into a SECOND running batch, each holding its own reservation against the client''s paid ceiling.';

-- ── 4 · ATTRIBUTION AT ITS SOURCE: leads.programme_id / leads.batch_id ─────────────────
--
-- ⚠️ WITHOUT THIS THE ATTRIBUTION CHAIN HAS NO BEGINNING. PR 1 added programme_id and batch_id
-- to figsy_enrollments and nothing wrote them, because there was nowhere to read them FROM:
-- leads records who we bought and never which programme or batch bought them. Resolving an
-- enrollment's programme from "whatever the client's programme is today" would silently
-- re-attribute a lead sourced under batch 1 to batch 7, which is worse than null.
--
-- So the person carries their own provenance, stamped by the sourcing run that paid for them,
-- and the enrollment copies it from the lead.
--
-- ⚠️ NULLABLE AND NEVER BACKFILLED. Every lead sourced before today has no batch, and that is
-- the honest answer — inventing one would manufacture certainty we do not have. Legacy
-- non-programme leads stay null permanently, because they belong to no programme.
--
-- ON DELETE SET NULL, not CASCADE: deleting a programme must never delete the people.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS programme_id uuid REFERENCES public.programmes(id)       ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS batch_id     uuid REFERENCES public.programme_batches(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.leads.programme_id IS
  'BUILD-003 PR2. The programme whose authority paid to source this person. NULL for legacy/non-programme leads and for everyone sourced before attribution existed — never backfilled, because a guessed batch is worse than an honest null.';

CREATE INDEX IF NOT EXISTS leads_programme_idx ON public.leads (programme_id) WHERE programme_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_batch_idx     ON public.leads (batch_id)     WHERE batch_id IS NOT NULL;

`.trim(),
  },
  {
    // ⚑ 2 Sep — INTERNAL PROGRAMME AUTHORITY, for House / Client Zero.
    //
    // 🛑 THE PROBLEM. `first_paid_at` is simultaneously the sourcing key AND the revenue
    // trigger: `computeContribution` reads `(first_paid_at ? first_payment_cents : 0)`. So
    // authorising House by setting it would invent revenue on a client that has paid nothing
    // — and a partner's commission derives from that same figure.
    //
    // Two nullable timestamps separate AUTHORITY from MONEY. No `authority_source` column:
    // P1 and P2 are independent authorities and could legitimately differ in source, so one
    // programme-level enum could only lie about a mixed programme. The source is DERIVED per
    // stage — `first_paid_at` means paid, `first_authorised_at` means internal — and the
    // operator audit log carries who and why.
    key: '20260902_programme_internal_authority',
    title: 'Internal programme authority (House P1/P2 without fake money) + per-stage XOR',
    sql: `
ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS first_authorised_at  timestamptz,
  ADD COLUMN IF NOT EXISTS second_authorised_at timestamptz;

COMMENT ON COLUMN public.programmes.first_authorised_at IS
  'Internal P1 authority (House / Client Zero). Set ONLY by the operator route, never by Stripe. Carries no money: no first_paid_at, no first_payment_ref, and computeContribution never reads it.';
COMMENT ON COLUMN public.programmes.second_authorised_at IS
  'Internal P2 authority. Does NOT make the programme live — went_live_at is a separate, explicit founder action.';

-- ── PER-STAGE XOR, CREATED ONLY IF MISSING ───────────────────────────────────────────────
--
-- ⚠️ NOT "DROP CONSTRAINT IF EXISTS; ADD CONSTRAINT". The runner has no ledger and executes
-- every entry on every run, and \`ADD CONSTRAINT ... CHECK\` takes an ACCESS EXCLUSIVE lock and
-- revalidates the whole table. Dropping and re-adding would pay that cost on each run AND
-- leave a window with no constraint at all, during which a concurrent write could insert the
-- very row that then makes the re-ADD fail. The RLS policies elsewhere in this file use
-- DROP/CREATE safely because a policy is catalogue-only; a CHECK is not.
--
-- SAFE ON A POPULATED TABLE: both columns are added NULL with no default and no backfill, so
-- \`*_authorised_at IS NULL\` short-circuits the OR for every existing row.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.programmes'::regclass
       AND conname  = 'programmes_p1_authority_xor'
  ) THEN
    ALTER TABLE public.programmes
      ADD CONSTRAINT programmes_p1_authority_xor CHECK (
        first_authorised_at IS NULL
        OR (first_paid_at IS NULL
            AND first_payment_ref IS NULL
            AND first_payment_intent_id IS NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.programmes'::regclass
       AND conname  = 'programmes_p2_authority_xor'
  ) THEN
    ALTER TABLE public.programmes
      ADD CONSTRAINT programmes_p2_authority_xor CHECK (
        second_authorised_at IS NULL
        OR (second_paid_at IS NULL
            AND second_payment_ref IS NULL
            AND second_payment_intent_id IS NULL)
      );
  END IF;
END $$;
`.trim(),
  },
  {
    // ⚑ 3 Sep — THE CLIENT COMMERCIAL MODEL, DECLARED RATHER THAN INFERRED (PR C1).
    //
    // 🛑 THE PROBLEM THIS COLUMN EXISTS FOR. `authorityFor(null)` in programme-authority.ts
    // returns `{ allowed: true, mode: 'legacy' }` — so the ABSENCE of a programme row is being
    // read as the positive assertion "this client is legacy", and every commercial decision in
    // the product inherits it: the per-lead approve/reveal routes open, the wallet gates
    // enrolment, low-credit emails send, and Vida tells the operator the account is on the
    // $299 pack. Absence of X cannot mean "is Y". The same absence also describes a programme
    // client before their first programme, between two, or after one completes.
    //
    // Founder-locked 3 Sep: House and MBF are PROGRAMME-MODEL clients, and having no active
    // programme must not make either of them legacy.
    //
    // ── THREE STATES, AND THE NULLABILITY IS THE WHOLE SAFETY ARGUMENT ───────────────────
    //
    //   NULL          unclassified. Resolves to EXACTLY the behaviour the product has today.
    //   'programme'   programme economics, whether or not a programme row exists.
    //   'legacy'      the retired per-lead model, chosen by a human and never by inference.
    //
    // 🛑 NO DEFAULT, AND THAT IS DELIBERATE. This repository already paid for that lesson:
    // programme-notifications.ts records the #599 precedent verbatim — a DEFAULT stamps
    // historic rows with a claim nobody checked. A default of 'programme' would silently
    // convert the entire existing book and strip wallet economics from paying legacy clients;
    // a default of 'legacy' would assert about every account that nobody has reviewed. NULL
    // asserts nothing, so this migration changes no row and no behaviour.
    //
    // ⚠️ NOT ON `clients.plan`. That column is lead_gen or figsy — WHICH WALLET POOL — and is
    // read by normalizePlan, canEnroll and deliveryCapBalance. Overloading it with a second,
    // unrelated meaning is how one column starts answering two questions and gets one wrong.
    //
    // ⚠️ NO INDEX. The resolver reads one client by primary key; nothing filters or groups by
    // this column on the launch path, and an index nobody can prove is needed is a cost with
    // no reader.
    //
    // ⚑ SHIPPED AHEAD OF ITS APPLICATION CODE, ON PURPOSE (expand/contract, the PR A1 lesson).
    // PENDING_MIGRATIONS is a TypeScript constant compiled into the DEPLOYED API, so a
    // migration can NEVER be applied before the build that carries it. NO application code in
    // this PR reads or writes this column; the deployed product behaves exactly as before.
    key: '20260903_client_commercial_model',
    title: 'Client commercial model (programme | legacy), nullable and unclassified by default',
    sql: `
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS commercial_model text;

COMMENT ON COLUMN public.clients.commercial_model IS
  'Which commercial model governs this client. NULL means UNCLASSIFIED and resolves to the behaviour the product had before this column existed. programme means programme economics whether or not a programme row is open. legacy means the retired per-lead model. Never inferred from a company name, an email, an env id, or the presence of a programme row. Never backfilled.';

-- ── THE CHECK, CREATED ONLY IF MISSING ───────────────────────────────────────────────────
--
-- The runner has no ledger and executes every entry on every run, so this must be idempotent.
-- Guarded on pg_constraint rather than written as DROP + ADD: ADD CONSTRAINT ... CHECK takes
-- an ACCESS EXCLUSIVE lock and revalidates the whole table, so DROP/ADD would pay that on
-- every run AND leave a window with no constraint at all, during which a concurrent write
-- could insert the very row that then makes the re-ADD fail. The A1 entry above carries the
-- same reasoning for the same reason.
--
-- SAFE ON A POPULATED TABLE: the column is added NULL with no default and no backfill, so
-- commercial_model IS NULL short-circuits the OR for every existing row and validation cannot
-- fail against the book as it stands.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.clients'::regclass
       AND conname  = 'clients_commercial_model_check'
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_commercial_model_check CHECK (
        commercial_model IS NULL
        OR commercial_model IN ('programme', 'legacy')
      );
  END IF;
END $$;
`.trim(),
  },
  {
    // ⚑ 3 Sep — WHICH LEAD IS FREE-PROOF WORK? Canonical file:
    // supabase/migrations/20260903_lead_proof_attribution.sql (written in the same change,
    // which is the shape migration-home.test.ts argues for). Full reasoning lives there.
    //
    // A declared programme client with no open programme is TWO accounts — a new customer
    // mid FREE PROOF whose cards are CURRENT, and an account whose leads are the retired
    // per-lead desk, which is HISTORY. Every existing store was traced write -> storage ->
    // read before this column was added, and none can separate them per row: leads.source is
    // the PROVIDER name and identical for both; programme_id is NULL for both;
    // icp_run_outcomes has no lead ids and no proof flag; sourcing_ledger and proof_ledger
    // are money rows with no lead ids (and a pool-only proof pass writes no proof_ledger row
    // at all); acquisition_memory is keyed on the provider identity; proof_passes_done and
    // proof_started_at are CUMULATIVE CLIENT STATE; and icps.proof_widened_candidate — the
    // only existing proof-batch-to-leads link — exists only for a pass-2 widened fallback.
    //
    // ⚠️ NULLABLE, NO DEFAULT, NO BACKFILL (the #599 lesson). Every existing row reads NULL,
    // which means exactly what it says: not known to be proof work. No row is written, moved
    // or deleted by this migration and no behaviour changes until the code reads it.
    //
    // 🚀 RUN THIS FROM VIDA -> ENGINE IMMEDIATELY AFTER DEPLOYING THE BUILD THAT CARRIES IT.
    // PENDING_MIGRATIONS is a TypeScript constant compiled into the DEPLOYED API, so a
    // migration can never be applied before the build that carries it. Until it is applied,
    // the proof stamp write is refused by the database and the customer desk therefore
    // attributes NOTHING — which fails CLOSED (an empty desk), never open (history).
    key: '20260903_lead_proof_attribution',
    title: 'leads.proof_pass — positive per-row free-proof attribution (additive, nullable, never backfilled)',
    sql: `
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS proof_pass smallint;

COMMENT ON COLUMN public.leads.proof_pass IS
  'The FREE-PROOF pass number that produced this row (1 or 2), stamped by runIcpJob on exactly the ids it inserted, from the pass try_claim_proof_pass atomically granted before the run. NULL means this row is NOT known to be free-proof work - the honest answer for every legacy, programme and pool-served lead, and for everyone sourced before this column existed. Never defaulted, never backfilled, never rewritten, and never read by money, sending, reveal or delivery.';

-- Guarded on pg_constraint rather than DROP + ADD: ADD CONSTRAINT ... CHECK takes an ACCESS
-- EXCLUSIVE lock and revalidates the whole table, so DROP/ADD would pay that on every run AND
-- leave a window with no constraint at all. The commercial_model entry above carries the same
-- reasoning for the same reason. SAFE ON A POPULATED TABLE: the column is added NULL with no
-- default, so proof_pass IS NULL short-circuits the OR for every existing row.
--
-- TWO IS THE CEILING BECAUSE try_claim_proof_pass REFUSES A THIRD (v_done >= 2 -> return 0).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.leads'::regclass
       AND conname  = 'leads_proof_pass_check'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_proof_pass_check CHECK (
        proof_pass IS NULL OR proof_pass IN (1, 2)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS leads_proof_pass_idx
  ON public.leads (client_id, proof_pass)
  WHERE proof_pass IS NOT NULL;
`.trim(),
  },
  {
    // 7 Sep — HOUSE-009. Canonical file (with the full reasoning):
    // supabase/migrations/20260907_programme_sourcing_authority.sql, written in the same
    // change — the shape migration-home.test.ts argues for. The short version: try_spend_sourcing
    // did programme ENTITLEMENT and PDL MONEY in one body, so exempting the Apollo/house path
    // from the fabricated $0.28-a-record cost also exempted it from the reservation, the 2,500
    // ceiling and the batch. A real run sourced 246 people and the programme read
    // "0 used / 0 reserved / 2500 left / no batch has been opened yet".
    //
    // The SQL below is the canonical file with its comment lines stripped — every backtick in
    // that file sits inside a `--` comment, and one backtick would terminate this literal.
    //
    // FUNCTIONS ONLY: NO TABLE, NO COLUMN, NO ROW. try_reserve_programme_sourcing is new;
    // try_spend_sourcing is REPLACED with the same signature, the same return and a byte-
    // unchanged legacy branch, so nothing about how an existing caller resolves changes.
    // reconcile_programme_sourcing does nothing at all until an operator names one programme,
    // so APPLYING this migration rewrites no counter anywhere.
    //
    // RUN IT FROM VIDA -> ENGINE IMMEDIATELY AFTER DEPLOYING THE BUILD THAT CARRIES IT. Until
    // it is applied try_reserve_programme_sourcing does not exist, every house reservation
    // returns nothing and house sourcing STOPS — fail-closed (no records) rather than fail-open
    // (unaccounted records), which is the right way round, but it is still a stop.
    key: '20260907_programme_sourcing_authority',
    title: 'HOUSE-009 - split programme sourcing AUTHORITY from PDL money, plus the one-shot reconcile for records already delivered',
    sql: `
CREATE OR REPLACE FUNCTION public.try_reserve_programme_sourcing(
  p_programme_id uuid,
  p_requested    int
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch_cap   int := 250;
  v_status      text;
  v_paused      timestamptz;
  v_room        int;
  v_granted     int;
BEGIN
  IF p_programme_id IS NULL OR p_requested IS NULL OR p_requested <= 0 THEN
    RETURN 0;
  END IF;

  SELECT status, paused_at INTO v_status, v_paused
    FROM public.programmes WHERE id = p_programme_id;
  IF v_status IS NULL THEN
    RETURN 0;
  END IF;

  IF v_status NOT IN ('SOURCING_AUTHORISED', 'SOURCING', 'READY_FOR_APPROVAL', 'APPROVED', 'LIVE') THEN
    RETURN 0;
  END IF;
  IF v_paused IS NOT NULL THEN
    RETURN 0;
  END IF;

  SELECT GREATEST(0, sourcing_ceiling - sourced_used - sourced_reserved) INTO v_room
    FROM public.programmes WHERE id = p_programme_id;

  v_granted := LEAST(p_requested, COALESCE(v_room, 0), v_batch_cap);
  IF v_granted <= 0 THEN
    RETURN 0;
  END IF;

  UPDATE public.programmes
    SET sourced_reserved = sourced_reserved + v_granted, updated_at = now()
    WHERE id = p_programme_id
      AND sourced_used + sourced_reserved + v_granted <= sourcing_ceiling;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  RETURN v_granted;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.try_reserve_programme_sourcing(uuid, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.try_reserve_programme_sourcing(uuid, int) TO service_role;

COMMENT ON FUNCTION public.try_reserve_programme_sourcing(uuid, int) IS
  'HOUSE-009. Programme sourcing AUTHORITY only: status, pause, ceiling and the 250 batch cap. Writes no ledger row and touches no wallet, because entitlement and provider cost are different facts. try_spend_sourcing calls this and then records PDL money; the Apollo/House path calls it and records none. One implementation of the ceiling, two callers.';

CREATE OR REPLACE FUNCTION public.try_spend_sourcing(
  p_client_id uuid,
  p_requested int,
  p_programme_id uuid DEFAULT NULL
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rate         numeric := 0.28;
  v_daily_cap    int     := 100;
  v_cap_usd      numeric;
  v_month_usd    numeric;
  v_month_room   int;
  v_day_used     int;
  v_day_room     int;
  v_allowance    int;
  v_granted      int;
  v_open_id      uuid;
  v_open_status  text;
BEGIN
  IF p_requested IS NULL OR p_requested <= 0 THEN
    RETURN 0;
  END IF;

  SELECT id, status INTO v_open_id, v_open_status
    FROM public.programmes
    WHERE client_id = p_client_id AND status NOT IN ('COMPLETED', 'CANCELLED')
    LIMIT 1;

  IF v_open_id IS NULL AND p_programme_id IS NOT NULL THEN
    RETURN 0;
  END IF;

  IF v_open_id IS NOT NULL AND p_programme_id IS NULL THEN
    RETURN 0;
  END IF;

  IF v_open_id IS NOT NULL AND p_programme_id <> v_open_id THEN
    RETURN 0;
  END IF;

  IF v_open_id IS NOT NULL THEN
    v_granted := public.try_reserve_programme_sourcing(v_open_id, p_requested);
    IF v_granted <= 0 THEN
      RETURN 0;
    END IF;

    INSERT INTO public.sourcing_ledger (client_id, records, cost_usd, programme_id)
      VALUES (p_client_id, v_granted, v_granted * v_rate, v_open_id);

    RETURN v_granted;
  END IF;

  SELECT pdl_monthly_cap_usd INTO v_cap_usd FROM public.money_settings WHERE id = 1;
  v_cap_usd := COALESCE(v_cap_usd, 300);
  SELECT COALESCE(SUM(cost_usd), 0) INTO v_month_usd
    FROM public.sourcing_ledger
    WHERE created_at >= date_trunc('month', now());
  v_month_room := GREATEST(0, floor((v_cap_usd - v_month_usd) / v_rate))::int;

  SELECT COALESCE(SUM(records), 0) INTO v_day_used
    FROM public.sourcing_ledger
    WHERE client_id = p_client_id
      AND created_at >= date_trunc('day', now());
  v_day_room := GREATEST(0, v_daily_cap - v_day_used);

  SELECT COALESCE(sourcing_allowance, 0) INTO v_allowance
    FROM public.clients WHERE id = p_client_id;

  v_granted := LEAST(p_requested, COALESCE(v_allowance, 0), v_month_room, v_day_room);
  IF v_granted <= 0 THEN
    RETURN 0;
  END IF;

  UPDATE public.clients
    SET sourcing_allowance = sourcing_allowance - v_granted
    WHERE id = p_client_id
      AND COALESCE(sourcing_allowance, 0) >= v_granted;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  INSERT INTO public.sourcing_ledger (client_id, records, cost_usd)
    VALUES (p_client_id, v_granted, v_granted * v_rate);

  RETURN v_granted;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.try_spend_sourcing(uuid, int, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.try_spend_sourcing(uuid, int, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.reconcile_programme_sourcing(
  p_programme_id uuid
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_orphans   int;
  v_foreign   int;
  v_client    uuid;
  v_room      int;
  v_seq       int;
  v_batch     uuid;
BEGIN
  SELECT client_id INTO v_client
    FROM public.programmes WHERE id = p_programme_id FOR UPDATE;
  IF v_client IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO v_foreign
    FROM public.leads
    WHERE programme_id = p_programme_id
      AND client_id IS DISTINCT FROM v_client;
  IF v_foreign > 0 THEN
    RAISE EXCEPTION
      'reconcile_programme_sourcing: programme % has % lead(s) attributed to it that belong to another client. Attribution is ambiguous, so nothing was counted, stamped or changed. Resolve the attribution first.',
      p_programme_id, v_foreign;
  END IF;

  SELECT COUNT(*) INTO v_orphans
    FROM public.leads
    WHERE programme_id = p_programme_id
      AND client_id = v_client
      AND batch_id IS NULL
      AND delivered_at IS NOT NULL;

  IF v_orphans <= 0 THEN
    RETURN 0;
  END IF;

  SELECT GREATEST(0, sourcing_ceiling - sourced_used - sourced_reserved) INTO v_room
    FROM public.programmes WHERE id = p_programme_id;

  IF COALESCE(v_room, 0) < v_orphans THEN
    RAISE EXCEPTION
      'reconcile_programme_sourcing: programme % has % unaccounted delivered lead(s) but only % of its ceiling left. Nothing was changed — this needs a decision, not a partial count.',
      p_programme_id, v_orphans, COALESCE(v_room, 0);
  END IF;

  SELECT COALESCE(MAX(seq), 0) + 1 INTO v_seq
    FROM public.programme_batches WHERE programme_id = p_programme_id;

  INSERT INTO public.programme_batches
    (programme_id, seq, requested, granted, delivered, status, settled_at)
  VALUES
    (p_programme_id, v_seq, v_orphans, v_orphans, v_orphans, 'served', now())
  RETURNING id INTO v_batch;

  UPDATE public.leads SET batch_id = v_batch
    WHERE programme_id = p_programme_id
      AND client_id = v_client
      AND batch_id IS NULL
      AND delivered_at IS NOT NULL;

  UPDATE public.programmes
    SET sourced_used = sourced_used + v_orphans,
        status       = CASE WHEN status = 'SOURCING_AUTHORISED' THEN 'SOURCING' ELSE status END,
        updated_at   = now()
    WHERE id = p_programme_id
      AND sourced_used + sourced_reserved + v_orphans <= sourcing_ceiling;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'reconcile_programme_sourcing: the ceiling guard refused programme % after the room check passed. Nothing was committed.', p_programme_id;
  END IF;

  RETURN v_orphans;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reconcile_programme_sourcing(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.reconcile_programme_sourcing(uuid) TO service_role;

COMMENT ON FUNCTION public.reconcile_programme_sourcing(uuid) IS
  'HOUSE-009 repair. Accounts for leads already DELIVERED under a programme that carry no batch, by creating one settled batch, stamping those leads with it and converting the volume to sourced_used. Operator-invoked for one named programme; idempotent; adds rows and deletes none; refuses outright rather than counting a subset.';
`.trim(),
  },
  {
    // 7 Sep — THE EXACT WORK APPROVED IS THE EXACT WORK ALLOWED TO RUN. Canonical file (with
    // the full reasoning): supabase/migrations/20260907_preparation_snapshot.sql, written in
    // the same change. Two additions, both nullable, neither backfilled:
    //
    //   figsy_sequences.campaign_id — the positive link that lets programme work resolve
    //   programme -> ICP -> campaign -> sequence. Without it "this programme's sequence" could
    //   only be answered by picking one of the CLIENT's sequences, and House carries sequences
    //   from a retired per-lead desk — so the words of an old campaign could be put in front of
    //   a customer as the words they are approving for a new programme. NULL means historical
    //   and is never a candidate; nothing is relinked, because a guessed campaign IS the leak.
    //
    //   programmes.approved_preparation_hash / _snapshot / _at — what was approved, so a
    //   change to it can be SEEN. Written only in the same conditional UPDATE that writes
    //   status = APPROVED, so a snapshot is never stamped approved before an approval happens.
    //
    // The SQL below is the canonical file with its comment lines stripped — every backtick in
    // that file sits inside a `--` comment, and one backtick would terminate this literal.
    //
    // ADDITIVE AND INERT. No row is written, moved or deleted, and nothing changes until the
    // code that reads these columns is deployed alongside it.
    key: '20260907_preparation_snapshot',
    title: 'figsy_sequences.campaign_id (positive programme sequence link) and the approved preparation snapshot/hash',
    sql: `
ALTER TABLE public.figsy_sequences
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.figsy_campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS figsy_sequences_campaign_idx
  ON public.figsy_sequences (campaign_id) WHERE campaign_id IS NOT NULL;

COMMENT ON COLUMN public.figsy_sequences.campaign_id IS
  'The campaign these words belong to. Written only when a sequence is authored for a campaign; NULL means client-scoped historical work, which is the honest reading of every row written before this column existed and is never backfilled. Programme work resolves programme -> icps.programme_id -> figsy_campaigns.icp_id -> figsy_sequences.campaign_id and treats NULL as NOT FOUND, because belonging to the same client is not belonging to the same work.';

ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS approved_preparation_hash     text,
  ADD COLUMN IF NOT EXISTS approved_preparation_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS approved_preparation_at       timestamptz;

COMMENT ON COLUMN public.programmes.approved_preparation_hash IS
  'sha256 of the canonical preparation snapshot the customer actually approved: batch and its membership, campaign, sequence, ordered message steps, cadence, sender identity and the prepared enrolment set. Deterministic and free of timestamps, so it changes only when the WORK changes. Written in the same conditional UPDATE as status = APPROVED and never anywhere else. Outreach authority compares the current preparation against it and refuses when they differ - the exact work approved is the exact work allowed to run.';

COMMENT ON COLUMN public.programmes.approved_preparation_snapshot IS
  'The canonical snapshot behind approved_preparation_hash, kept so a change can be EXPLAINED and not merely detected. Not a version history: exactly one snapshot, the approved one, replaced only by a re-approval.';

COMMENT ON COLUMN public.programmes.approved_preparation_at IS
  'When the approved preparation snapshot was taken. Deliberately separate from approved_at: they are written together today, and a future re-approval must be able to move this without rewriting the original approval time.';
`.trim(),
  },
  {
    // 8 Sep — THE CLIENT MUST REVIEW THE EXACT THING THEY LATER APPROVE, AND OUTBOUND MUST HAVE
    // A TIME OF DAY. Canonical file (full reasoning):
    // supabase/migrations/20260908_review_freeze_and_schedule.sql, written in the same change.
    //
    //   programmes.review_preparation_hash / _snapshot / _at — freezing only at APPROVED proved
    //   what was approved and nothing about what was READ, so work could change underneath a
    //   client mid-review and the approval would faithfully record the new state.
    //
    //   programmes.send_schedule — there was NO schedule anywhere in the send path. Not a
    //   default, not a constant: getDay, getHours and "send window" appear nowhere. NULL means
    //   NOT CONFIGURED, which the guard treats as REFUSE for programme work.
    //
    //   figsy_enrollments.sequence_id — so "which words will this person receive" is a positive
    //   fact rather than an unverifiable copy of steps.
    //
    // All nullable, NO DEFAULT, NO BACKFILL, additive and inert until the code reads them.
    // The SQL below is the canonical file with its comment lines stripped, because a backtick
    // inside one would terminate this literal.
    key: '20260908_review_freeze_and_schedule',
    title: 'review-boundary preparation freeze, the programme send schedule, and figsy_enrollments.sequence_id',
    sql: `
ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS review_preparation_hash     text,
  ADD COLUMN IF NOT EXISTS review_preparation_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS review_preparation_at       timestamptz,
  ADD COLUMN IF NOT EXISTS send_schedule               jsonb;

COMMENT ON COLUMN public.programmes.review_preparation_hash IS
  'sha256 of the canonical preparation snapshot FROZEN at the transition into READY_FOR_APPROVAL - the exact material the client is shown. Approval refuses unless the current preparation still matches it, and then stores the REVIEWED snapshot as the approved one. Taking a fresh snapshot at approval instead would faithfully record consent to something the client never read.';

COMMENT ON COLUMN public.programmes.review_preparation_snapshot IS
  'The canonical snapshot behind review_preparation_hash, kept so a change can be EXPLAINED and not merely detected. Exactly one snapshot, replaced only by a re-freeze.';

COMMENT ON COLUMN public.programmes.review_preparation_at IS
  'When the review snapshot was frozen. Separate from approved_preparation_at: a re-freeze after a material change must move this without rewriting the approval time.';

COMMENT ON COLUMN public.programmes.send_schedule IS
  'When outbound may leave for this programme: { days: [1..7 Mon..Sun], start: "HH:MM", end: "HH:MM", default_tz: "IANA zone" }, evaluated in the RECIPIENT''S OWN local timezone - resolved from a persisted zone, else a region, else the intersection of every zone their country spans. default_tz is for display and does NOT grant: an unresolvable recipient is REFUSED, because judging them in our timezone is the same defect as assuming New York for every American. NULL means NO SCHEDULE CONFIGURED, which the guard treats as REFUSE for programme work - a missing schedule is not permission to send at any hour.';

ALTER TABLE public.figsy_enrollments
  ADD COLUMN IF NOT EXISTS sequence_id uuid REFERENCES public.figsy_sequences(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS figsy_enrollments_sequence_idx
  ON public.figsy_enrollments (sequence_id) WHERE sequence_id IS NOT NULL;

COMMENT ON COLUMN public.figsy_enrollments.sequence_id IS
  'The canonical figsy_sequences row this enrolment was built from. Written by programme preparation only; NULL means a legacy enrolment whose words came from the campaign settings copy, which is the honest reading of every row written before this column and is never backfilled. The programme send path refuses an enrolment whose sequence_id is not the programme''s current canonical sequence.';
`.trim(),
  },
  {
    key: '20260909_programme_qualification',
    title: 'programme entitlement is consumed by QUALIFICATION, not by delivery — the verdict columns and the repointed reconcile RPC',
    sql: `
-- ═════════════════════════════════════════════════════════════════════════════════════════
-- PROGRAMME ENTITLEMENT IS CONSUMED BY QUALIFICATION, NOT BY DELIVERY (founder-locked 9 Sep)
--
-- 🛑 WHAT THIS CORRECTS, AND IT IS AN ACCOUNTING DEFECT RATHER THAN A BUG IN ONE FUNCTION.
--
-- \`sourced_used\` was settled on \`delivered_at\`. That column is the legacy SELF-SERVE
-- visibility stamp: it is written by three unrelated acts, and on the programme path it is
-- gated by \`deliveryCapBalance()\` — which returns a CONSTANT 25 regardless of plan or balance
-- — and then by a nightly drip of ~5/day. So a 250-candidate batch would settle at at most 25
-- "used" and release the other 225 back to the ceiling, and the historical House run reported
-- \`0 used · 0 reserved · 2500 left\` about 246 real people.
--
-- ⛓️ THE FIRST FIX (#1651) MOVED THE COUNT AND KEPT THE PREDICATE. It settled on
-- \`count(batch_id = X AND delivered_at IS NOT NULL)\` — the same 25-capped population. Correct
-- shape, wrong event.
--
-- ── THE LOCKED MODEL ────────────────────────────────────────────────────────────────────
--
--   reserve → source → enrich → FINAL M&V QUALIFICATION → qualified consume USED
--   → failures release the reservation → customer visibility changes no counter
--
-- A customer's entitlement buys QUALIFIED PROSPECTS. A candidate M&V itself rejects has cost
-- them nothing and must not consume their ceiling; a prospect they can see is a fact about a
-- screen, not about a ledger.
--
-- ── ① THE VERDICT, PERSISTED ON THE LEAD ────────────────────────────────────────────────
--
-- \`finalVerdict\` (lib/icp-qualification.ts) already decides this. What has never existed is a
-- place to WRITE the answer, so a rejected candidate left no trace: it was re-picked by the
-- drip, RE-REVEALED at cost, and delivered on a path that runs no ICP gate at all.
--
--   qualified_at       proved to match the customer's ICP; consumes entitlement
--   disqualified_at    proved not to; consumes nothing, is never surfaced, never re-revealed
--   disqualify_reason  the truthful reason, from \`QualificationRefusal\`
--
-- Exactly one of the two timestamps is ever set. NULL/NULL means CANDIDATE — not yet judged.
--
-- ── ② \`leads.email_status\` — THE COLUMN THIS DESIGN CANNOT WORK WITHOUT ─────────────────
--
-- 🛑 IT IS NOT A FIFTH NICE-TO-HAVE. \`finalVerdict\` needs three facts: email, EMAIL STATUS and
-- country. \`leads\` stores email and country and has never stored the status. The only proxy is
-- \`apollo_consented\`, and it is NOT the same fact: it is written
-- \`email_status === 'verified' || email_status === 'likely_to_engage'\` (routes/icps.ts), and
-- the drip path writes it TRUE unconditionally for anything the provider returned. House
-- requires a VERIFIED business address, so \`apollo_consented = true\` cannot prove the ICP.
--
-- ⚠️ WITHOUT THIS COLUMN "judge from stored facts" IS UNREACHABLE FOR HOUSE — every candidate
-- would need a provider reveal on every pass, for ever, because the fact that came back would
-- have nowhere to live. One nullable text column is the difference between a reveal that is
-- paid for once and a reveal that is paid for repeatedly.
--
-- ── ③ \`programme_batches.inserted\` ──────────────────────────────────────────────────────
--
-- The batch already records \`requested\` and \`granted\` (authority) and \`delivered\` (which now
-- means USED — the rename is post-launch, see the comment on the column). What it could not
-- say is how many CANDIDATES the attempt actually obtained, which is the number that makes
-- "250 requested, 246 obtained, 210 qualified" explainable instead of a gap.
--
-- ── ④ THE RECONCILIATION RPC, REPOINTED ────────────────────────────────────────────────
--
-- Same name, same signature, same return type — replaced in place, so nothing that calls it
-- changes. What changes is what it counts, and one new refusal:
--
--   🛑 IT REFUSES WHILE ANY CANDIDATE IS UNJUDGED. This is the server-side safety net for the
--   Vida control that still says "Account for delivered sourcing": after this migration that
--   button cannot settle anything, because the 246 have no verdicts. It stops being able to
--   write a wrong number the moment this runs, and before any application code ships.
--
-- ⚠️ NOTHING HERE CALLS A PROVIDER, sources anybody, or touches a wallet. It counts rows that
-- already exist and writes one batch row.
--
-- ⚠️ NULLABLE, NO DEFAULT, NO BACKFILL, NO ROW MUTATED BY THIS FILE. Every existing lead is
-- NULL/NULL — an honest "not yet judged" — and every existing batch has \`inserted\` NULL,
-- because we do not know what a historical batch obtained and guessing would invent a number.
-- ═════════════════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS qualified_at      timestamptz,
  ADD COLUMN IF NOT EXISTS disqualified_at   timestamptz,
  ADD COLUMN IF NOT EXISTS disqualify_reason text,
  ADD COLUMN IF NOT EXISTS email_status      text;

COMMENT ON COLUMN public.leads.qualified_at IS
  'When M&V proved this candidate matches the customer''s full ICP (lib/icp-qualification.ts finalVerdict) on facts we actually hold. A qualified prospect is what consumes programme entitlement - sourced_used counts these, never delivered_at. NULL with disqualified_at also NULL means CANDIDATE: sourced but not yet judged.';

COMMENT ON COLUMN public.leads.disqualified_at IS
  'When M&V proved this candidate does NOT match the ICP. A disqualified candidate consumes no entitlement, is never surfaced for review, is never enrolled, and is never revealed again - the absence of this marker is why a rejected candidate used to be re-picked by the drip and re-revealed at cost.';

COMMENT ON COLUMN public.leads.disqualify_reason IS
  'The QualificationRefusal that decided it: no_email | personal_email | unverified_email | geography_unknown | geography_mismatch. Persisted so a batch of 250 can explain its own shortfall instead of presenting one.';

COMMENT ON COLUMN public.leads.email_status IS
  'The provider''s verification status for the address, as returned by the PAID reveal (Apollo bulk_match). NOT apollo_consented, which is true for BOTH "verified" and "likely_to_engage" and is written unconditionally by the drip path - it cannot prove a verified address. Stored so a candidate already revealed is judged from stored facts rather than revealed a second time.';

ALTER TABLE public.programme_batches
  ADD COLUMN IF NOT EXISTS inserted int;

COMMENT ON COLUMN public.programme_batches.inserted IS
  'Candidates this attempt actually obtained and attributed. requested = what authority was asked for, granted = what was reserved, inserted = what the provider produced, delivered = what QUALIFIED and therefore consumed entitlement. The delivered column keeps its name until a post-launch rename; its meaning is USED.';

-- Partial indexes on the two queries this design adds: "candidates still needing a verdict"
-- and "the qualified rows of this batch". Both are programme-scoped and highly selective.
CREATE INDEX IF NOT EXISTS leads_unjudged_candidates_idx
  ON public.leads (programme_id)
  WHERE programme_id IS NOT NULL AND qualified_at IS NULL AND disqualified_at IS NULL;

CREATE INDEX IF NOT EXISTS leads_qualified_idx
  ON public.leads (programme_id, batch_id)
  WHERE qualified_at IS NOT NULL;


-- ── THE RECONCILIATION, COUNTING THE RIGHT EVENT ─────────────────────────────────────────
--
-- Historical recovery for an attempt that ran before the accounting existed: it creates the
-- one settled batch that attempt never had, stamps EVERY candidate of that attempt with it —
-- qualified and disqualified alike, because both belong to the 250 that was attempted — and
-- converts the QUALIFIED count to \`sourced_used\`.
--
-- ⚠️ REJECTED CANDIDATES ARE STAMPED AND NOT COUNTED. Leaving them batch-less would make them
-- look like a second unaccounted attempt for ever; counting them would charge the customer for
-- M&V's own rejects. They are in the batch, and they are not in \`used\`.

CREATE OR REPLACE FUNCTION public.reconcile_programme_sourcing(
  p_programme_id uuid
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client     uuid;
  v_foreign    int;
  v_candidates int;
  v_unjudged   int;
  v_qualified  int;
  v_requested  int;
  v_room       int;
  v_seq        int;
  v_batch      uuid;
BEGIN
  SELECT client_id INTO v_client
    FROM public.programmes WHERE id = p_programme_id FOR UPDATE;
  IF v_client IS NULL THEN
    RETURN 0;
  END IF;

  -- 🛑 FAIL CLOSED ON AMBIGUOUS ATTRIBUTION, BEFORE COUNTING ANYTHING. A lead carrying THIS
  -- programme's id while belonging to ANOTHER client is a corrupt link and the exact shape a
  -- cross-tenant leak would take. Counting it would put somebody else's prospect inside this
  -- programme's consumed volume; stamping it would attach them to this batch permanently. The
  -- whole call refuses rather than filtering the row out, because a quiet skip reconciles
  -- "successfully" while leaving a corruption nobody is told about.
  SELECT COUNT(*) INTO v_foreign
    FROM public.leads
    WHERE programme_id = p_programme_id
      AND client_id IS DISTINCT FROM v_client;
  IF v_foreign > 0 THEN
    RAISE EXCEPTION
      'reconcile_programme_sourcing: programme % has % lead(s) attributed to it that belong to another client. Attribution is ambiguous, so nothing was counted, stamped or changed. Resolve the attribution first.',
      p_programme_id, v_foreign;
  END IF;

  -- The unaccounted attempt: every programme-attributed row of this client that belongs to no
  -- batch. NOT filtered by delivered_at — that column is customer visibility and has no place
  -- in this ledger.
  SELECT COUNT(*) INTO v_candidates
    FROM public.leads
    WHERE programme_id = p_programme_id
      AND client_id = v_client
      AND batch_id IS NULL;

  -- IDEMPOTENT BY CONSTRUCTION. After a successful run every one of those rows carries a
  -- batch_id, so a second call finds nothing and returns 0. There is no flag to remember.
  IF v_candidates <= 0 THEN
    RETURN 0;
  END IF;

  -- 🛑 THE REFUSAL THAT MAKES THE OLD VIDA BUTTON HARMLESS. An attempt cannot be settled while
  -- M&V has not judged it: settling would write a \`sourced_used\` derived from whichever
  -- candidates happened to have been judged so far, and the ceiling would then be wrong in a
  -- way nothing downstream could detect.
  SELECT COUNT(*) INTO v_unjudged
    FROM public.leads
    WHERE programme_id = p_programme_id
      AND client_id = v_client
      AND batch_id IS NULL
      AND qualified_at IS NULL
      AND disqualified_at IS NULL;
  IF v_unjudged > 0 THEN
    RAISE EXCEPTION
      'reconcile_programme_sourcing: programme % has % candidate(s) with no qualification verdict. Entitlement is consumed by QUALIFIED prospects, so an unjudged attempt cannot be settled. Nothing was counted, stamped or changed - qualify the candidates first.',
      p_programme_id, v_unjudged;
  END IF;

  SELECT COUNT(*) INTO v_qualified
    FROM public.leads
    WHERE programme_id = p_programme_id
      AND client_id = v_client
      AND batch_id IS NULL
      AND qualified_at IS NOT NULL;

  -- The ceiling is checked against what will actually be CONSUMED.
  SELECT GREATEST(0, sourcing_ceiling - sourced_used - sourced_reserved) INTO v_room
    FROM public.programmes WHERE id = p_programme_id;
  IF COALESCE(v_room, 0) < v_qualified THEN
    RAISE EXCEPTION
      'reconcile_programme_sourcing: programme % has % qualified prospect(s) to account for but only % of its ceiling left. Nothing was changed - this needs a decision, not a partial count.',
      p_programme_id, v_qualified, COALESCE(v_room, 0);
  END IF;

  -- A controlled batch is ~250 (founder lock 4), and that is what the historical attempt asked
  -- for. Expressed as a GREATEST so an attempt that somehow obtained more than a batch still
  -- produces a coherent row rather than requested < granted.
  v_requested := GREATEST(250, v_candidates);

  SELECT COALESCE(MAX(seq), 0) + 1 INTO v_seq
    FROM public.programme_batches WHERE programme_id = p_programme_id;

  -- Settled on creation: this is a RECORD of an attempt that already happened, so it never
  -- occupies the one-running slot and cannot be settled a second time.
  --
  -- ⚠️ \`granted\` = the candidates obtained, NOT 250. No reservation was ever held for this
  -- historical run (the House path bypassed the accounting entirely), so claiming 250 was
  -- granted would assert a reservation that never existed. \`sourced_reserved\` is likewise left
  -- alone: there is nothing to release.
  INSERT INTO public.programme_batches
    (programme_id, seq, requested, granted, inserted, delivered, status, settled_at)
  VALUES
    (p_programme_id, v_seq, v_requested, v_candidates, v_candidates, v_qualified, 'served', now())
  RETURNING id INTO v_batch;

  -- EVERY candidate of the attempt, qualified and disqualified alike.
  UPDATE public.leads SET batch_id = v_batch
    WHERE programme_id = p_programme_id
      AND client_id = v_client
      AND batch_id IS NULL;

  UPDATE public.programmes
    SET sourced_used = sourced_used + v_qualified,
        status       = CASE WHEN status = 'SOURCING_AUTHORISED' THEN 'SOURCING' ELSE status END,
        updated_at   = now()
    WHERE id = p_programme_id
      AND sourced_used + sourced_reserved + v_qualified <= sourcing_ceiling;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'reconcile_programme_sourcing: the ceiling guard refused programme % after the room check passed. Nothing was committed.', p_programme_id;
  END IF;

  RETURN v_qualified;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reconcile_programme_sourcing(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.reconcile_programme_sourcing(uuid) TO service_role;

COMMENT ON FUNCTION public.reconcile_programme_sourcing(uuid) IS
  'HOUSE-009 repair, repointed 9 Sep. Settles an attempt that ran before the accounting existed: one settled batch, EVERY candidate stamped with it (qualified and disqualified), sourced_used += the QUALIFIED count. It counts qualification, never delivered_at, and REFUSES while any candidate is unjudged - which is what stops the older Vida control from settling a number nobody has proved. Operator-invoked, idempotent, adds rows and deletes none, calls no provider.';
`.trim(),
  },
  {
    // ── ⚑ 10 Sep — THE STRUCTURAL GATE NEEDS SOMEWHERE TO RECORD A REFUSAL ──────────────
    //
    // 🛑 WHY A COLUMN AND NOT A STATUS. `leads.status` carries `leads_status_check`, which
    // allows exactly pending · scored · contacted · consent_sent · consent_given · exported ·
    // rejected · opted_out. Adding `set_aside` would mean DROP + re-ADD on the constraint the
    // entire outreach path writes through, for no gain: the fact we need to record is WHY a
    // candidate was never shown, which is not a lifecycle state at all. Founder-locked 10 Sep:
    // *"Use leads.set_aside_reason text NULL... Do NOT extend the core leads.status CHECK
    // merely to add set_aside."*
    //
    // WHAT IT IS FOR. Proof used to surface every fetched person and let the client do our
    // filtering — a UK-digital-marketing-agency target was shown management consultancies
    // scored 70-75 and starred "We would start here". `proof-fit.ts` now refuses those before
    // they are surfaced, and this column is the record of that refusal: which criterion, in
    // plain words, per row. Without it a refused candidate is indistinguishable from an
    // unprocessed one and would be re-surfaced by `surfaceEverything` on the next pass.
    //
    // ⚠️ NULLABLE, NO DEFAULT, NO BACKFILL. Every existing row keeps NULL, which reads
    // correctly as "never set aside". Additive and inert until the code reads it.
    //
    // ⚠️ THE INDEX IS PARTIAL AND THAT IS THE POINT. Every hot read filters
    // `set_aside_reason IS NULL`, so the useful index is over the SET-ASIDE rows only — small,
    // and it answers the operational question ("what did we refuse for this client, and why")
    // without carrying the null majority.
    key: '20260910_lead_set_aside_reason',
    title: 'leads.set_aside_reason — the structural gate record of a refused Proof candidate (C04)',
    sql: `
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS set_aside_reason text;

CREATE INDEX IF NOT EXISTS leads_set_aside_reason_idx
  ON public.leads (client_id, set_aside_reason)
  WHERE set_aside_reason IS NOT NULL;

COMMENT ON COLUMN public.leads.set_aside_reason IS
  'Why this candidate was never shown to the client - one of the four hard criteria (geography, size, industry, seniority) in plain words, written by the deterministic structural gate in proof-fit.ts BEFORE scoring and surfacing. NULL means never set aside. A set-aside row is kept for operational accounting and audit, is never surfaced, and can never recycle into a later Proof pass. It is deliberately NOT a leads.status value: status is a lifecycle state and this is a reason, and widening leads_status_check would touch the constraint the whole outreach path writes through.';
`.trim(),
  },
  {
    // ── ⚑ 10 Sep — TWO ATTEMPTS, THEN A PERSON: THE EVIDENCE THE HAND-OFF NEEDS (C07) ────
    //
    // The automatic Proof loop now closes PROACTIVELY on the second attempt instead of
    // waiting for the client to try to spend a third time. Four facts have to survive that
    // moment, and none of them has a home today:
    //
    //   proof_escalation_trigger  — WHICH of the three conditions closed the loop. The
    //     operator's first question is "why am I looking at this", and deriving it later from
    //     feedback counts would re-decide it against data the client has since changed.
    //   proof_phone_confirmed_at  — that the client CONFIRMED a number, and when. `phone`
    //     already exists and may hold something they typed at signup and never checked;
    //     "they told us this is the right number for a calibration call" is a different fact.
    //   proof_calibration_note    — the operator's resolution note. Required BEFORE a
    //     calibrated restart, so a restart cannot be pressed on an unexamined client.
    //   proof_calibrated_restart_at — when the one human-authorised extra pass was granted.
    //     It is what makes the grant SELF-LIMITING: a restart is allowed only when the
    //     resolution is newer than the last restart, so one resolution buys exactly one pass.
    //
    // ⚠️ THE ATTEMPT SUMMARIES ARE NOT STORED. Surfaced counts, "looks right", "not a fit"
    // and the reason tallies are all derivable from `lead_feedback` × `leads.proof_pass`,
    // which already exist and are already the truth of record. A second copy would be a
    // second answer to "what did the client actually say".
    //
    // ⚠️ `try_claim_proof_pass` IS NOT TOUCHED, DELIBERATELY. It stays the hard server
    // backstop that refuses a third AUTOMATIC pass forever (founder-locked: "UI is not the
    // safety boundary"). The calibrated restart does not go through it at all — it is a
    // separate, operator-only, audited door, which is why the backstop needs no new exception
    // and cannot be widened by accident.
    //
    // Additive, nullable, no defaults, no backfill, idempotent.
    key: '20260910_proof_calibration_handoff',
    title: 'clients: proof escalation trigger, confirmed phone, operator note and the one calibrated restart (C07)',
    sql: `
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS proof_escalation_trigger    text,
  ADD COLUMN IF NOT EXISTS proof_phone_confirmed_at    timestamptz,
  ADD COLUMN IF NOT EXISTS proof_calibration_note      text,
  ADD COLUMN IF NOT EXISTS proof_calibrated_restart_at timestamptz;

COMMENT ON COLUMN public.clients.proof_escalation_trigger IS
  'Which condition closed the automatic Proof loop: client_said_still_not_right, second_set_mostly_rejected, or requested_more_after_pass_two. Written once, in the same statement as proof_review_requested_at, so a client can never be escalated without a recorded reason.';

COMMENT ON COLUMN public.clients.proof_phone_confirmed_at IS
  'When the client confirmed the number to reach them on for a calibration call. Distinct from clients.phone, which may hold an unchecked signup value: this records that they were asked and answered.';

COMMENT ON COLUMN public.clients.proof_calibration_note IS
  'The operator note written when a failed Proof calibration is resolved. Required before Restart Proof (calibrated) is offered - a restart pressed on an unexamined client would spend a pass on the same targeting.';

COMMENT ON COLUMN public.clients.proof_calibrated_restart_at IS
  'When the one human-authorised extra Proof pass was granted. A restart is permitted only while proof_review_resolved_at is NEWER than this, so one resolution grants exactly one pass and it never resets the two automatic attempts. try_claim_proof_pass is untouched and still refuses a third automatic claim.';
`.trim(),
  },
  {
    // ── ⚑ 11 Sep — THE CALIBRATED RESTART IS PROVENANCE, NOT A THIRD PASS NUMBER ────────
    //
    // 🛑 WHAT THIS REPLACES, AND IT COULD NOT HAVE WORKED. An earlier cut encoded the one
    // human-authorised restart as `leads.proof_pass = 3`. `20260903_lead_proof_attribution`
    // declares CHECK (proof_pass IS NULL OR proof_pass IN (1, 2)) — so every restart insert
    // would have been REJECTED by the database. And even without the constraint it put
    // ambiguous truth in the row for rendering code to repair: anything reading
    // max(proof_pass), counting attempts, guarding spend or building analytics would
    // reasonably have read 3 as a third automatic attempt.
    //
    // ⚠️ AUTOMATIC PROOF PASS IDENTITY STAYS 1 AND 2, and so does that CHECK. The restart's
    // rows carry the pass they ran ALONGSIDE (2) plus this kind, so three history events are
    // readable while only two are automatic passes. `proof_passes_done` stays 2 throughout.
    //
    // ⚠️ NULL MEANS 'automatic' — the honest reading of every row written before today. No
    // default, no backfill. The CHECK is added NOT VALID so it cannot fail on existing rows.
    key: '20260911_lead_proof_batch_kind',
    title: 'leads: what produced a Proof row — automatic attempt or the one calibrated restart',
    sql: `
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS proof_batch_kind text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.leads'::regclass
       AND conname  = 'leads_proof_batch_kind_check'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_proof_batch_kind_check CHECK (
        proof_batch_kind IS NULL OR proof_batch_kind IN ('automatic', 'calibrated_restart')
      ) NOT VALID;
  END IF;
END $$;

COMMENT ON COLUMN public.leads.proof_batch_kind IS
  'What produced this Proof row: automatic (one of the two automatic attempts) or calibrated_restart (the one human-authorised set granted after a real calibration resolution). NULL reads as automatic, which is the honest answer for every row written before this column existed. It is the ONLY thing that tells a restart from an automatic attempt - proof_pass stays 1 or 2 for both, and clients.proof_passes_done stays 2.';

CREATE INDEX IF NOT EXISTS leads_proof_batch_kind_idx
  ON public.leads (client_id, proof_batch_kind)
  WHERE proof_batch_kind IS NOT NULL;
`.trim(),
  },
  {
    // ── ⚑ 11 Sep (C39 / C23) — THE RESTART CAN BE SPENT, AND A REFINEMENT CAN BE MEANT ──
    //
    // 🛑 C39, AND IT WAS LIVE. 20260910 added `proof_calibrated_restart_at` — that an operator
    // GRANTED the one human-authorised extra Proof pass. Nothing recorded that the client had
    // SPENT it, and nothing let the pass be claimed: `spendDoors` answered
    // `proof_passes_done < 2` (false at 2, for ever) and `try_claim_proof_pass` refuses at 2
    // for ever. The operator pressed a real button, an audit row was written, and the client
    // got nothing. The grant bought a pass that could not be taken.
    //
    //   proof_calibrated_restart_used_at — when the granted restart was CONSUMED. Granted and
    //     used are DIFFERENT FACTS: with only the first, the grant either buys nothing (the
    //     count still refuses) or buys unlimited sets (it never expires). Both were live.
    //   proof_calibration_resolved_by — who recorded the human resolution. The operator audit
    //     log holds the action; this keeps the identity on the row an operator reads.
    //
    // 🛑 AND C23. Attempt 2 is real paid sourcing against a target the client is supposed to
    // have corrected. Milla may PROPOSE what she thinks they meant; nothing recorded whether
    // they AGREED, so the second and last automatic attempt could be spent on the model's
    // reading of a sentence.
    //
    //   proof_refinement_text         — the client's own words, never the interpretation.
    //   proof_refinement_proposed_at  — an interpreted change was put back to them.
    //   proof_refinement_confirmed_at — they confirmed it. The gate Attempt 2 waits behind.
    //
    // ⚠️ `proof_passes_done` IS NOT TOUCHED, and neither is `try_claim_proof_pass`. The two
    // automatic attempts are spent for ever. This is a separate door, never a wider one.
    //
    // Additive, nullable, no defaults, no backfill, idempotent.
    key: '20260911_proof_restart_and_refinement',
    title: 'clients: the calibrated restart can be spent once, and a refinement can be confirmed (C39/C23)',
    sql: `
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS proof_calibrated_restart_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS proof_calibration_resolved_by    text,
  ADD COLUMN IF NOT EXISTS proof_refinement_text            text,
  ADD COLUMN IF NOT EXISTS proof_refinement_proposed_at     timestamptz,
  ADD COLUMN IF NOT EXISTS proof_refinement_confirmed_at    timestamptz;

COMMENT ON COLUMN public.clients.proof_calibrated_restart_used_at IS
  'When the granted calibrated restart was CONSUMED by a Proof claim. A restart is available only while proof_calibrated_restart_at is NEWER than this, so one grant buys exactly one set. It never resets proof_passes_done and try_claim_proof_pass is untouched.';

COMMENT ON COLUMN public.clients.proof_calibration_resolved_by IS
  'The operator who recorded the human calibration resolution. The operator audit log holds the action; this keeps the identity on the row the next operator reads.';

COMMENT ON COLUMN public.clients.proof_refinement_text IS
  'What the client said to refine their targeting, IN THEIR OWN WORDS. Never the models interpretation of it, and never a provider label.';

COMMENT ON COLUMN public.clients.proof_refinement_proposed_at IS
  'When an interpreted refinement was proposed back to the client. A proposal on its own never sources: it CLOSES the improved-set door until they confirm.';

COMMENT ON COLUMN public.clients.proof_refinement_confirmed_at IS
  'When the client confirmed the interpreted refinement. This is the only thing that reopens the door to automatic Attempt 2.';
`.trim(),
  },
  {
    // ── ⚑ 10 Sep (C03) — THE CLIENT'S OWN OUTCOME, AND IT HAD NOWHERE TO LIVE ───────────
    //
    // During onboarding the client said "Book qualified meetings with those founders and
    // CEOs." Milla Home then showed OUTCOME — not set yet, and NEXT: "Tell Milla the outcome
    // you want." He had just told her.
    //
    // There were two notions of outcome and neither was the client's. The spoken sentence
    // went to `icps.campaign_intent` (copy input for the sequence writer, rendered only on
    // the welcome summary). The OUTCOME CARD read `programmes.meeting_target` — a number
    // that does not exist until a programme is created, several steps later — so during Proof
    // the card was structurally always empty.
    //
    // These two columns are the client-level truth. Founder-locked: the outcome belongs to
    // the CUSTOMER, is stated once, survives ICP revisions, exists before any programme and
    // outlives each programme that serves it.
    //
    // ⚠️ SEPARATE FROM THE NUMBER, DELIBERATELY. `meeting_target` stays a commercial figure
    // agreed at recommendation; `outcome_stated` is a sentence the client owns. Conflating
    // them is what produced the empty card.
    //
    // ⚠️ `outcome_kind` IS NARROW ON PURPOSE. 'meetings' or 'other'. A client who asks for
    // "more revenue" has not asked for meetings, and classifying them as such would put a
    // meeting target against an outcome nobody agreed to — 'other' reaches a person instead.
    //
    // Additive, nullable, no defaults, no backfill, idempotent.
    key: '20260910_client_stated_outcome',
    title: 'clients.outcome_kind / outcome_stated — what the client said they want, stated once (C03)',
    sql: `
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS outcome_kind   text,
  ADD COLUMN IF NOT EXISTS outcome_stated text;

COMMENT ON COLUMN public.clients.outcome_kind IS
  'What kind of outcome the client asked for: meetings or other. Narrow on purpose - a client who asks for revenue or awareness has NOT asked for meetings, and other routes to a person rather than being reinterpreted. Written once at onboarding from their own answer.';

COMMENT ON COLUMN public.clients.outcome_stated IS
  'The outcome in the client own words, verbatim, captured once at onboarding. Client-level because it survives ICP revisions, exists before any programme and outlives each programme that serves it. It is NOT programmes.meeting_target: that is a commercial number agreed later at recommendation, and reading it as the outcome is why Milla Home showed "not set yet" to a client who had just stated one.';
`.trim(),
  },
  {
    // ═══════════════════════════════════════════════════════════════════════════════════
    // 🛑 RUN IS A STORED FACT, BECAUSE IT WAS NOT ONE — AND LIVE MEANT SEND.
    //
    // ── WHAT THE 10 SEP AUDIT FOUND ──────────────────────────────────────────────────
    //
    // The founder's rule is that Make Live ARMS and Run STARTS: two distinct operator
    // acts, and only the second permits external delivery. In the code there was only
    // one. `programmes` had no run column at all, and `checkProgrammeAuthority(...,
    // 'OUTREACH')` asked approval, P2, LIVE, the approved hash, the schedule and the
    // sender — never "has Run been pressed".
    //
    // Make Live activates the campaign and stamps every enrolment `next_send_at = now`.
    // `send-due` selects exactly that state. So the first time AUTO_OUTREACH_ENABLED was
    // set to 'true' — to let the founder Run one canary — the two-hourly cron and the
    // client-callable `/figsy/send-due` would have sent EVERY live programme, with no
    // operator Run anywhere. Run existed as a button that sent a bounded batch; it did
    // not exist as authority.
    //
    // ── WHY A COLUMN AND NOT A STATUS ────────────────────────────────────────────────
    //
    // ⚠️ `LIVE` IS ARMED, AND THAT MEANING IS NOW LOAD-BEARING. Adding a RUNNING status
    // would have re-pointed every existing status read — `mayStartCampaign`, the
    // lifecycle derivations, the Milla stage map, ten status literals in the CHECK — at
    // a vocabulary change, on launch day, to record one fact. A nullable timestamp adds
    // the fact without moving anything that already reads correctly.
    //
    // 🛑 NULL FAILS CLOSED, AND THAT INCLUDES PROGRAMMES ALREADY LIVE. Every existing
    // row reads NULL, so no programme can send until somebody presses Run. That is the
    // founder's rule applied uniformly — "no exception for Founder, operator_run, canary,
    // cron, retry, test send" — and it is deliberately NOT backfilled: a backfill would
    // grant the exact authority this column exists to require.
    //
    // Additive, nullable, no defaults, no backfill, idempotent.
    // ═══════════════════════════════════════════════════════════════════════════════════
    key: '20260910_programme_run_authority',
    title: 'programmes.run_at / run_by / went_live_by — Run is a stored authority, not a button (H)',
    sql: `
ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS run_at       timestamptz,
  ADD COLUMN IF NOT EXISTS run_by       text,
  ADD COLUMN IF NOT EXISTS went_live_by text;

COMMENT ON COLUMN public.programmes.run_at IS
  'When an operator pressed Run - the SECOND of the two operator acts, and the only one that permits external delivery. NULL means never run: no send path may select or deliver for this programme, however LIVE it is. Make Live arms (status LIVE + went_live_at) and sends zero; Run starts. Deliberately never backfilled - a backfill would grant the authority this column exists to require.';

COMMENT ON COLUMN public.programmes.run_by IS
  'Who pressed Run. Audit companion to run_at; the operator audit log carries the full row.';

COMMENT ON COLUMN public.programmes.went_live_by IS
  'Who pressed Make Live. Recorded so arming and starting can be told apart by person as well as by time.';
`.trim(),
  },
  {
    // ═══════════════════════════════════════════════════════════════════════════════════
    // 🛑 PROOF COMPLETING WAS NOT A FACT ANYWHERE — THE HAPPY PATH ENDED IN SILENCE.
    //
    // ── WHAT THE 10 SEP AUDIT FOUND ──────────────────────────────────────────────────
    //
    // The canonical flow is: client reacts to the Proof set, says "These are right", Proof
    // COMPLETES, and they move to the programme calculator. In the code, the accept control
    // was `onAccept={() => { void loadCalibration() }}` — a GET. It wrote nothing.
    //
    // A search for any completion signal (`proof_complete`, `proof_accepted`,
    // `proof_completed_at`, `proof_done`, `proof_finished`) across the API, portal, admin,
    // shared and every migration returned NOTHING. `clients` carried `proof_passes_done`,
    // `proof_started_at` and the review columns — how many attempts were SPENT, never
    // whether the client was SATISFIED. Vida's Proof mode is "No action needed"; Milla's
    // next-step line stayed "Milla is finding your first examples".
    //
    // So a satisfied client produced no record, no alert and no stage change, and the
    // journey resumed only if an operator noticed by other means and hand-created a
    // programme. The happy path terminated silently.
    //
    // ── WHY ON `clients` AND NOT ON A PROGRAMME ──────────────────────────────────────
    //
    // ⚠️ THERE IS NO PROGRAMME YET, AND THAT IS THE POINT. Proof completes BEFORE the
    // calculator, and the calculator is what creates the programme. Hanging the fact on a
    // programme would need one to exist first, which is the operator-created-programme
    // shape this whole change removes. It sits beside `proof_passes_done` and
    // `outcome_stated` — the other two client-level Proof facts.
    //
    // ⚠️ A TIMESTAMP, NOT A BOOLEAN, so "when did they accept" is answerable and the write
    // is naturally idempotent: the first acceptance is the one recorded.
    //
    // Additive, nullable, no default, no backfill, idempotent.
    // ═══════════════════════════════════════════════════════════════════════════════════
    key: '20260910_proof_completion',
    title: 'clients.proof_completed_at — the client said the examples are right (A)',
    sql: `
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS proof_completed_at timestamptz;

COMMENT ON COLUMN public.clients.proof_completed_at IS
  'When the client said their Proof examples are right, so Proof is finished and the programme calculator is next. Before this column the accept control wrote nothing at all: a satisfied client produced no record, no alert and no stage change, and the journey only resumed if an operator noticed by other means. Client-level because Proof completes BEFORE any programme exists - the calculator is what creates one. NOT a count of attempts (proof_passes_done is how many were spent) and NOT an escalation (proof_review_requested_at is the failed loop). First acceptance wins; the write is idempotent.';
`.trim(),
  },
  {
    // ═══════════════════════════════════════════════════════════════════════════════════
    // 🛑 THE CLIENT CHOSE THE PROGRAMME, AND NOTHING RECORDED WHAT THEY WERE SHOWN.
    //
    // ── WHAT THE 10 SEP AUDIT FOUND ──────────────────────────────────────────────────
    //
    // `programmes` already stores the COMMITTED figures — `meeting_target`,
    // `recommended_volume`, `price_per_meeting_cents`, `price_total_cents` and the two
    // payment halves — so the money side needs nothing new. Two things were missing.
    //
    //   ① THE CLIENT'S OWN ASSUMPTIONS. The calculator's illustrative outputs (estimated
    //      clients, estimated revenue, the revenue multiple) are arithmetic on figures the
    //      CLIENT supplied: what a client is worth to them, and how many meetings become
    //      clients. Without storing them, "reproduce exactly what the client accepted" is
    //      impossible — the price could be re-derived from the curve, but the illustration
    //      they were actually looking at when they said yes could not.
    //
    //   ② ACCEPTANCE AS A FACT SEPARATE FROM PAYING. There was no accept action at all:
    //      accepting WAS paying, because the only client control was the Stripe button. So
    //      a client who chose a programme and then hesitated at checkout left no record
    //      that they had agreed to anything, and `approved_at` is the LATER preparation
    //      approval (R108), not this.
    //
    // ⚠️ ONE JSONB, NOT FOUR COLUMNS. The assumptions are a SNAPSHOT — read back together,
    // never queried across, never aggregated. Four typed columns would invite exactly the
    // aggregate reporting the founder did not ask for, and each new assumption would be a
    // migration.
    //
    // Additive, nullable, no defaults, no backfill, idempotent.
    // ═══════════════════════════════════════════════════════════════════════════════════
    key: '20260910_programme_calculator_choice',
    title: 'programmes.calculator_assumptions / recommendation_accepted_at — what the client chose and agreed to (B/C)',
    sql: `
ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS calculator_assumptions      jsonb,
  ADD COLUMN IF NOT EXISTS recommendation_accepted_at  timestamptz;

COMMENT ON COLUMN public.programmes.calculator_assumptions IS
  'The client own assumptions from the Milla programme calculator, exactly as they stood when the recommendation was accepted: leadsPerMeeting, averageClientValue, meetingToClientPct. A SNAPSHOT for reproducing what they were shown - never queried across programmes and never aggregated. The COMMITTED figures are the typed columns (meeting_target, recommended_volume, price_total_cents, first/second_payment_cents) and are priced by the shared curve; these are the ILLUSTRATIVE inputs and we stand behind none of them.';

COMMENT ON COLUMN public.programmes.recommendation_accepted_at IS
  'When the client accepted the recommendation in Milla - a fact SEPARATE from paying. Before this column accepting WAS paying, because the only client control was the Stripe button, so a client who agreed and then hesitated at checkout left no record of having agreed. NOT approved_at: that is the later approval of the prepared programme (R108).';
`.trim(),
  },
  {
    key: '20260910_inbox_verification',
    title: 'client_inboxes.verified_at / verify_failed_at / verify_detail — did anyone prove this mailbox can log in? (I2)',
    sql: `
ALTER TABLE public.client_inboxes
  ADD COLUMN IF NOT EXISTS verified_at      timestamptz,
  ADD COLUMN IF NOT EXISTS verify_failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS verify_detail    text;

COMMENT ON COLUMN public.client_inboxes.verified_at IS
  'When this mailbox last PROVED it can log in - nodemailer verify() authenticated and sent nothing. NULL means never checked, which is not the same as failed and is the honest reading of every row written before 10 Sep. Cleared on a failed check so a mailbox that once worked and now does not cannot read as verified.';

COMMENT ON COLUMN public.client_inboxes.verify_failed_at IS
  'When a login check last FAILED. Kept alongside verified_at rather than replacing it so an operator can see that a check happened and what it said, rather than a silent NULL that looks identical to never having tried.';

COMMENT ON COLUMN public.client_inboxes.verify_detail IS
  'The operator-facing sentence from the last check - the named cause and the fix (App Password, SMTP AUTH disabled, port/TLS mismatch), never a raw SMTP code. Written on success and failure alike.';
`.trim(),
  },
  {
    // Canonical file: supabase/migrations/20260911_icp_target_category_and_type.sql
    //
    // MVP1 (C04, C21) - `icps.industries` was the ONLY home for a target market and it is a
    // CLOSED SIXTEEN-VALUE LIST. A client who said "digital marketing agencies" had nowhere
    // for that phrase: the model either substituted whichever of the sixteen seemed nearest,
    // or omitted the field entirely - and an empty `industries` makes the structural-fit gate
    // return 'yes' for every row on earth.
    //
    // TWO COLUMNS BECAUSE THEY ARE TWO FACTS (founder-locked). `target_category` is the
    // client's own words and is authoritative; `target_company_type` is the organisational
    // form of the TARGET company and is set only from client evidence. One utterance may
    // supply both, but a client who said only "digital marketing" has the first and not the
    // second - which is why one column cannot serve for both.
    //
    // ADDITIVE. `industries` is untouched and keeps doing its job as the provider-edge hint.
    // No backfill: existing rows keep NULL, which reads correctly as "never collected".
    //
    // DEPLOYMENT ORDERING: apply this BEFORE shipping the code that writes the columns.
    key: '20260911_icp_target_category_and_type',
    title: "icps.target_category / target_company_type - the client's own words for the target market, and the target's organisational form (MVP1 C04/C21)",
    sql: `
ALTER TABLE public.icps
  ADD COLUMN IF NOT EXISTS target_category     text,
  ADD COLUMN IF NOT EXISTS target_company_type text;

COMMENT ON COLUMN public.icps.target_category IS
  'MVP1 brief fact 5 - the kind of market/business to target, in the CLIENT''S OWN WORDS. Never a provider label; never rewritten by normalisation.';

COMMENT ON COLUMN public.icps.target_company_type IS
  'MVP1 brief fact 7 - the organisational form of the TARGET company (agency, consultancy, clinic...). Set only from client evidence, never inferred from a website, the client''s own industry, or a provider taxonomy.';
`.trim(),
  },
  {
    // Canonical file: supabase/migrations/20260911_onboarding_brief_drafts.sql
    //
    // MVP1 - THE BRIEF BEFORE THERE IS A CLIENT. /auth/signup creates an auth user and
    // nothing else; the clients row is created by the CONFIRM click, which also saves the ICP
    // and starts Proof. So the whole Brief conversation lived in React state in one tab:
    // close it and everything collected was gone, and Vida never knew the person existed.
    // Preview 07 - signed up 14 minutes ago, 10 of 11 facts, confirmation pending - was not a
    // state the product could reach.
    //
    // NOT a second Brief model and NOT a lifecycle authority: it is the persistence location
    // for the SAME eleven facts defined in packages/shared/src/brief-facts.ts. Authoritative
    // and writable until promotion; evidence only afterwards, which promoted_client_id is
    // what enforces.
    //
    // Additive, non-destructive, idempotent. One new table, no backfill, no existing row
    // written, and no change to what "a client" means anywhere.
    //
    // DEPLOYMENT ORDERING: apply before the code that reads or writes it. Until then the
    // draft routes fail closed and the product behaves exactly as it does today.
    key: '20260911_onboarding_brief_drafts',
    title: 'onboarding_brief_drafts - the partial Brief persisted before a client exists (MVP1, Preview 07)',
    sql: `
CREATE TABLE IF NOT EXISTS public.onboarding_brief_drafts (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null unique references auth.users(id) on delete cascade,
  facts              jsonb not null default '{}'::jsonb,
  conversation       jsonb,
  confirmed_at       timestamptz,
  promoted_client_id uuid references public.clients(id) on delete set null,
  promoted_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS onboarding_brief_drafts_open_idx
  ON public.onboarding_brief_drafts(created_at DESC)
  WHERE promoted_client_id IS NULL;

-- ── ROW-LEVEL SECURITY ─────────────────────────────────────────────────────────────────
--
-- 🛑 THIS TABLE IS THE ONE THAT MOST NEEDS IT. Every other client table is keyed by
-- client_id and reached through current_client_id(). This one is keyed by user_id and
-- exists precisely for people who have NO client row — so the usual helper answers NULL for
-- exactly the rows it is meant to protect, and "no policy" would mean a person's company,
-- their contact name, their targeting and their stated outcome are readable by anyone holding
-- the public anon key that apps/portal ships to every browser.
--
-- ⚠️ THE POLICY IS auth.uid(), NOT current_client_id(), for that reason. A draft belongs
-- to an authenticated USER, before it belongs to a client.
--
-- ⚠️ SELECT AND UPDATE ONLY, AND NO INSERT POLICY ON PURPOSE. The API writes with the service
-- role, which bypasses RLS; a browser must never be able to mint a draft row directly. Read
-- and amend your own, and nothing else.
ALTER TABLE IF EXISTS public.onboarding_brief_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own brief draft readable" ON public.onboarding_brief_drafts;
CREATE POLICY "own brief draft readable" ON public.onboarding_brief_drafts
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "own brief draft writable" ON public.onboarding_brief_drafts;
CREATE POLICY "own brief draft writable" ON public.onboarding_brief_drafts
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.onboarding_brief_drafts IS
  'MVP1 pre-confirmation Brief persistence. The SAME eleven facts defined in packages/shared/src/brief-facts.ts, stored before a clients row exists. Authoritative and writable until promotion; evidence only afterwards. Not a second Brief model and not a lifecycle authority.';

COMMENT ON COLUMN public.onboarding_brief_drafts.facts IS
  'Partial eleven-fact state as a snapshot. Completeness is decided by shared code, never by this column''s shape.';

COMMENT ON COLUMN public.onboarding_brief_drafts.confirmed_at IS
  'When the client confirmed a COMPLETE brief. A separate gate - never counted as one of the eleven facts.';

COMMENT ON COLUMN public.onboarding_brief_drafts.promoted_client_id IS
  'The clients row this draft became. Once set, the draft is evidence: it may not be written again and may never compete with the confirmed client/ICP truth.';
`.trim(),
  },
  {
    // Canonical file: supabase/migrations/20260911_preparation_version.sql
    //
    // MVP1 DAY 3 - A FROZEN PACKAGE IS NEVER MUTATED IN PLACE; IT IS REPLACED BY A NEW
    // VERSION. review_preparation_hash proves WHETHER the package changed and cannot say how
    // many times, cannot be spoken to a client, and gives an approval no way to name a version
    // rather than a digest.
    //
    // approved_preparation_version is what stops an approval drifting forward: it is stamped
    // from the review version at approval, so a later re-freeze moves review_preparation_version
    // and leaves the approved one behind. The two numbers disagreeing IS the statement "this
    // approval does not cover the current package".
    //
    // A MONOTONIC COUNTER, NOT A LEDGER of superseded packages - keeping every historical
    // snapshot is a product decision nobody has taken.
    //
    // Expand only. Nullable, no backfill: a programme frozen before this reads as "unknown
    // version", never as version zero.
    //
    // DEPLOYMENT ORDERING: apply before the code that writes it. Until then re-freeze refuses
    // rather than writing a column that does not exist.
    // AND WHO APPROVED IT. An approval recorded no identity at all - approved_at says when,
    // the snapshot says what, and nothing said WHO, so "the client approved this" was a claim
    // the database could not support. approved_by_kind distinguishes the client's own approval
    // in Milla from an operator approval in Vida; approved_by_user_id is the authenticated user
    // behind a client approval, and stays NULL for an operator because admin-key authority is
    // not a session and recording one would invent a person.
    key: '20260911_preparation_version',
    title: 'programmes.review_preparation_version / approved_preparation_version / approved_by_* - a re-freeze is a new version, and an approval has an author (MVP1 Day 3)',
    sql: `
ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS review_preparation_version   int,
  ADD COLUMN IF NOT EXISTS approved_preparation_version int,
  ADD COLUMN IF NOT EXISTS approved_by_kind             text,
  ADD COLUMN IF NOT EXISTS approved_by_user_id          uuid;

COMMENT ON COLUMN public.programmes.approved_by_kind IS
  'Who approved: ''client'' (the customer, in Milla, from their own session) or ''operator'' (Vida, admin-key authority). NULL means approved before identity was recorded.';

COMMENT ON COLUMN public.programmes.approved_by_user_id IS
  'The authenticated user behind a CLIENT approval. NULL for operator approvals - admin-key authority is not a session, and recording a user id for it would invent a person.';

COMMENT ON COLUMN public.programmes.review_preparation_version IS
  'Which frozen review package this is, counting from 1 and rising by one on every re-freeze. NULL means frozen before versioning existed. Never reused, never decremented.';

COMMENT ON COLUMN public.programmes.approved_preparation_version IS
  'The review version the client actually approved. It stays put when a later re-freeze moves review_preparation_version - the two disagreeing is how an approval is known not to cover the current package.';
`.trim(),
  },
  {
    // ── 🛑 ⚑ 12 Sep (S2-AUDIT-001 + R119) — PROOF AUTHORITY THAT CAN BE RETURNED ────────
    //
    // `try_claim_proof_pass` increments `clients.proof_passes_done` and NOTHING ANYWHERE
    // RELEASES IT. The only writer of that column in the whole repo is the `+ 1`; there is no
    // decrement, no reset, no unclaim — and the same is true of
    // `proof_calibrated_restart_used_at`, which is stamped BEFORE anything is sourced. So a run
    // that crashes at the PDL boundary — with `PAID_PROVIDERS_ENABLED` unset, the fail-closed
    // default and THE MOST LIKELY PRODUCTION PATH — leaves the pass spent and the client with
    // nothing. `routes/icps.ts` says so in its own alert text: "Their proof pass is CONSUMED".
    //
    // Authority is now CONSUMED at completion, HELD in flight and RETURNED on release. Because
    // nothing else can be claimed while one is held, a duplicate or a retry can never reach the
    // NEXT authority — the residual the founder refused when he rejected a decrement.
    //
    // ⚠️ EXPAND-ONLY, NO BACKFILL, NO DATA MUTATED. `try_claim_proof_pass` is deliberately
    // left in place and unchanged so a partial deployment degrades to today's behaviour rather
    // than to none; after this build it has ZERO live callers (proof-authority-bypass.test.ts).
    //
    // ⚠️ `clients.proof_passes_legacy` LANDS NULL AND IS NEVER BACKFILLED. NULL means
    // UNCLASSIFIED and `claim_proof_authority` FAILS CLOSED on it, because historical authority
    // is NOT deterministically reconstructible: `icp_run_outcomes` carries no pass number,
    // `proof_started_at` is overwritten on every claim, `leads.proof_pass` did not exist before
    // 3 Sep, a failed status is written by TWO paths with opposite meanings, and an ABSENT
    // outcome row proves nothing. The founder refused a snapshot of the counter by name:
    // "Blindly snapshotting proof_passes_done would memorialise the defect we are fixing."
    //
    // ⚠️ THE RESTART INDEX IS KEYED ON client_id ALONE (R119). Keying completed restarts on the
    // grant timestamp is the per-resolution model main shipped on 11 Sep and R119 forbids.
    key: '20260912_proof_pass_claims',
    title: 'proof_pass_claims: durable Proof authority — infrastructure failure returns the pass, and exactly one calibrated restart per client for ever',
    sql: `
create table if not exists public.proof_pass_claims (
  id               uuid        primary key default gen_random_uuid(),
  client_id        uuid        not null references public.clients(id) on delete cascade,

  authority        text        not null
                     check (authority in ('automatic_1','automatic_2','calibrated_restart')),

  restart_grant_at timestamptz,

  status           text        not null default 'open'
                     check (status in ('open','completed','released')),

  icp_id           uuid        references public.icps(id) on delete set null,
  claimed_at       timestamptz not null default now(),
  settled_at       timestamptz,
  release_reason   text,

  constraint proof_pass_claims_settled_shape
    check ((status = 'open' and settled_at is null)
        or (status <> 'open' and settled_at is not null)),

  constraint proof_pass_claims_grant_shape
    check ((authority = 'calibrated_restart' and restart_grant_at is not null)
        or (authority <> 'calibrated_restart' and restart_grant_at is null))
);

comment on table public.proof_pass_claims is
  'Durable free-proof AUTHORITY ledger. One row per claim attempt. Authority is consumed at COMPLETION, held while a run is in flight, and returned on RELEASE — so provider/infrastructure failure never consumes a pass. The three unique partial indexes below ARE the authority; clients.proof_passes_done and clients.proof_calibrated_restart_used_at are compatibility mirrors of this table for existing readers.';

comment on column public.proof_pass_claims.restart_grant_at is
  'AUDIT ONLY — the clients.proof_calibrated_restart_at value this restart claim spent. Never part of a unique key: keying completed restarts on the grant is the per-resolution model R119 forbids. Keyed on client_id alone instead.';

comment on column public.proof_pass_claims.release_reason is
  'Why a claim was released, or how a legacy row was classified: run_failed | refused_before_run | structural_gate_no_set | operator_reconciled | legacy_classified_completed | legacy_classified_burned.';

create unique index if not exists proof_pass_claims_one_open
  on public.proof_pass_claims (client_id) where status = 'open';

create unique index if not exists proof_pass_claims_one_completed_automatic
  on public.proof_pass_claims (client_id, authority)
  where status = 'completed' and authority <> 'calibrated_restart';

create unique index if not exists proof_pass_claims_one_completed_restart
  on public.proof_pass_claims (client_id)
  where status = 'completed' and authority = 'calibrated_restart';

create index if not exists proof_pass_claims_client_status
  on public.proof_pass_claims (client_id, status);

alter table public.proof_pass_claims enable row level security;

alter table public.clients
  add column if not exists proof_passes_legacy int;

comment on column public.clients.proof_passes_legacy is
  'How many automatic Proof passes this client LEGITIMATELY consumed BEFORE the durable claim ledger existed. NULLABLE, no default, NEVER backfilled: NULL means UNCLASSIFIED, and claim_proof_authority refuses to issue any automatic authority to an unclassified client that has claim history. Written only by an audited operator classification, or set to 0 by the claim function for a brand-new client whose proof_passes_done is 0.';

create or replace function public.refresh_proof_authority_mirror(p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_legacy       int;
  v_auto_live    int;
  v_restart_live timestamptz;
begin
  if p_client_id is null then return; end if;

  select proof_passes_legacy into v_legacy from public.clients where id = p_client_id;
  if v_legacy is null then return; end if;

  select count(*) into v_auto_live
    from public.proof_pass_claims
   where client_id = p_client_id
     and authority <> 'calibrated_restart'
     and status in ('open','completed');

  select min(claimed_at) into v_restart_live
    from public.proof_pass_claims
   where client_id = p_client_id
     and authority = 'calibrated_restart'
     and status in ('open','completed');

  update public.clients
     set proof_passes_done                    = v_legacy + v_auto_live,
         proof_calibrated_restart_used_at     = v_restart_live
   where id = p_client_id;
end;
$$;

revoke execute on function public.refresh_proof_authority_mirror(uuid) from public;
grant  execute on function public.refresh_proof_authority_mirror(uuid) to service_role;

create or replace function public.claim_proof_authority(p_client_id uuid, p_icp_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_done          int;
  v_legacy        int;
  v_grant_at      timestamptz;
  v_grant_used    timestamptz;
  v_open          uuid;
  v_auto_done     int;
  v_auto_used     int;
  v_authority     text;
  v_claim         uuid;
  v_found         boolean := false;
begin
  if p_client_id is null then
    return jsonb_build_object('ok', false, 'reason', 'bad_args');
  end if;

  select true, coalesce(proof_passes_done, 0), proof_passes_legacy,
         proof_calibrated_restart_at, proof_calibrated_restart_used_at
    into v_found, v_done, v_legacy, v_grant_at, v_grant_used
    from public.clients where id = p_client_id for update;

  if not v_found then
    return jsonb_build_object('ok', false, 'reason', 'unknown_client');
  end if;

  select id into v_open
    from public.proof_pass_claims
   where client_id = p_client_id and status = 'open'
   limit 1;
  if v_open is not null then
    return jsonb_build_object('ok', false, 'reason', 'in_flight', 'claim_id', v_open);
  end if;

  if v_legacy is null then
    if v_done = 0 then
      update public.clients set proof_passes_legacy = 0 where id = p_client_id;
      v_legacy := 0;
    else
      return jsonb_build_object('ok', false, 'reason', 'unclassified');
    end if;
  end if;

  if v_grant_used is not null and not exists (
       select 1 from public.proof_pass_claims
        where client_id = p_client_id and authority = 'calibrated_restart') then
    return jsonb_build_object('ok', false, 'reason', 'restart_unclassified');
  end if;

  select count(*) into v_auto_done
    from public.proof_pass_claims
   where client_id = p_client_id
     and status = 'completed'
     and authority <> 'calibrated_restart';

  v_auto_used := v_legacy + v_auto_done;

  if v_auto_used < 2 then
    v_authority := 'automatic_' || (v_auto_used + 1)::text;
    insert into public.proof_pass_claims (client_id, authority, icp_id)
      values (p_client_id, v_authority, p_icp_id)
      returning id into v_claim;
    update public.clients set proof_started_at = now() where id = p_client_id;
    perform public.refresh_proof_authority_mirror(p_client_id);
    return jsonb_build_object(
      'ok', true, 'claim_id', v_claim, 'authority', v_authority,
      'pass', v_auto_used + 1, 'kind', 'automatic', 'reason', 'granted');
  end if;

  if exists (
       select 1 from public.proof_pass_claims
        where client_id = p_client_id
          and status = 'completed'
          and authority = 'calibrated_restart') then
    return jsonb_build_object('ok', false, 'reason', 'restart_already_used');
  end if;

  if v_grant_at is null then
    return jsonb_build_object('ok', false, 'reason', 'exhausted');
  end if;

  insert into public.proof_pass_claims (client_id, authority, restart_grant_at, icp_id)
    values (p_client_id, 'calibrated_restart', v_grant_at, p_icp_id)
    returning id into v_claim;
  update public.clients set proof_started_at = now() where id = p_client_id;
  perform public.refresh_proof_authority_mirror(p_client_id);
  return jsonb_build_object(
    'ok', true, 'claim_id', v_claim, 'authority', 'calibrated_restart',
    'pass', 2, 'kind', 'calibrated_restart', 'reason', 'granted');
end;
$$;

revoke execute on function public.claim_proof_authority(uuid, uuid) from public;
grant  execute on function public.claim_proof_authority(uuid, uuid) to service_role;

create or replace function public.settle_proof_claim(
  p_claim_id uuid, p_status text, p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_client uuid;
begin
  if p_claim_id is null or p_status is null then
    return jsonb_build_object('ok', false, 'reason', 'bad_args');
  end if;
  if p_status not in ('completed','released') then
    return jsonb_build_object('ok', false, 'reason', 'bad_status');
  end if;

  update public.proof_pass_claims
     set status         = p_status,
         settled_at     = now(),
         release_reason = p_reason
   where id = p_claim_id
     and status = 'open'
  returning client_id into v_client;

  if v_client is null then
    return jsonb_build_object('ok', false, 'reason', 'not_open');
  end if;

  perform public.refresh_proof_authority_mirror(v_client);
  return jsonb_build_object('ok', true, 'client_id', v_client, 'status', p_status);
end;
$$;

revoke execute on function public.settle_proof_claim(uuid, text, text) from public;
grant  execute on function public.settle_proof_claim(uuid, text, text) to service_role;

create or replace function public.classify_legacy_restart(
  p_client_id uuid, p_status text, p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_grant_at timestamptz;
  v_used_at  timestamptz;
  v_claim    uuid;
  v_found    boolean := false;
begin
  if p_client_id is null or coalesce(btrim(p_note), '') = '' then
    return jsonb_build_object('ok', false, 'reason', 'note_required');
  end if;
  if p_status not in ('completed','released') then
    return jsonb_build_object('ok', false, 'reason', 'bad_status');
  end if;

  select true, proof_calibrated_restart_at, proof_calibrated_restart_used_at
    into v_found, v_grant_at, v_used_at
    from public.clients where id = p_client_id for update;
  if not v_found then
    return jsonb_build_object('ok', false, 'reason', 'unknown_client');
  end if;
  if exists (select 1 from public.proof_pass_claims
              where client_id = p_client_id and authority = 'calibrated_restart') then
    return jsonb_build_object('ok', false, 'reason', 'already_classified');
  end if;
  if v_used_at is null then
    return jsonb_build_object('ok', false, 'reason', 'nothing_to_classify');
  end if;

  insert into public.proof_pass_claims
    (client_id, authority, restart_grant_at, status, settled_at, release_reason)
  values
    (p_client_id, 'calibrated_restart',
     coalesce(v_grant_at, v_used_at),
     p_status, now(),
     case p_status when 'completed' then 'legacy_classified_completed'
                   else 'legacy_classified_burned' end)
  returning id into v_claim;

  perform public.refresh_proof_authority_mirror(p_client_id);
  return jsonb_build_object('ok', true, 'claim_id', v_claim, 'status', p_status);
end;
$$;

revoke execute on function public.classify_legacy_restart(uuid, text, text) from public;
grant  execute on function public.classify_legacy_restart(uuid, text, text) to service_role;

create or replace function public.classify_legacy_proof_passes(
  p_client_id uuid, p_passes int, p_note text, p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing int;
  v_found    boolean := false;
begin
  if p_client_id is null or coalesce(btrim(p_note), '') = '' then
    return jsonb_build_object('ok', false, 'reason', 'note_required');
  end if;
  if p_passes is null or p_passes < 0 or p_passes > 2 then
    return jsonb_build_object('ok', false, 'reason', 'out_of_range');
  end if;

  select true, proof_passes_legacy into v_found, v_existing
    from public.clients where id = p_client_id for update;
  if not v_found then
    return jsonb_build_object('ok', false, 'reason', 'unknown_client');
  end if;

  if v_existing is not null and not coalesce(p_force, false) then
    return jsonb_build_object('ok', false, 'reason', 'already_classified', 'existing', v_existing);
  end if;

  update public.clients set proof_passes_legacy = p_passes where id = p_client_id;
  perform public.refresh_proof_authority_mirror(p_client_id);
  return jsonb_build_object('ok', true, 'passes', p_passes,
                            'replaced', v_existing is not null);
end;
$$;

revoke execute on function public.classify_legacy_proof_passes(uuid, int, text, boolean) from public;
grant  execute on function public.classify_legacy_proof_passes(uuid, int, text, boolean) to service_role;
`.trim(),
  },
  {
    // ── 🛑 ⚑ 12 Sep (S1-AUDIT-006 · R120) — ONE AUTOMATIC WELCOME EMAIL PER CLIENT ──────
    //
    // `routes/auth.ts` calls `sendWelcomeEmail(...)` OUTSIDE the `if (!existing)` block
    // that guards the founder alert immediately below it, so a second POST /auth/onboard for
    // the same user takes the UPDATE branch and THE WELCOME EMAIL SENDS AGAIN. A double-click,
    // a refresh, an offline retry and two concurrent tabs all land there, and nothing anywhere
    // recorded that the email had already been sent.
    //
    // ⚠️ CLAIMED IS NOT SENT, AND THE COLUMN NAMES NOW SAY SO. An earlier cut used
    // `welcome_email_sent_at` as the PRE-SEND claim, which records a send that has not
    // happened — the #338 phantom-send class in a new costume. `sent_at` is now written ONLY
    // when Resend returns a message id, and clients_welcome_email_sent_needs_id ENFORCES that
    // rather than trusting callers to remember: NO PROVIDER MESSAGE ID MEANS NO sent ASSERTION.
    //
    // ⚠️ THE 24-HOUR WINDOW IS NAMED RATHER THAN OVERSOLD (R120). Inside Resend's retention an
    // ambiguous outcome is retried with the SAME key and a payload proven identical by
    // `welcome_email_payload_hash`. After it the key is gone, so the state becomes
    // unresolved_expired: no automatic resend, THE CLAIM IS NOT RELEASED, and a human is shown
    // it. A provider's retention expiring is not a reason to risk a duplicate.
    //
    // ⚠️ NO BACKFILL. NULL here is the SAFE direction (at worst one extra welcome to a
    // long-standing client who re-onboards), the opposite asymmetry to proof_passes_legacy
    // above, where NULL must refuse. That difference is deliberate, not an oversight.
    key: '20260912_welcome_email_once',
    title: 'clients: one automatic welcome email — a durable claim, a provider message id, and the 24-hour idempotency window',
    sql: `
alter table public.clients
  add column if not exists welcome_email_claimed_at   timestamptz,
  add column if not exists welcome_email_sent_at      timestamptz,
  add column if not exists welcome_email_outcome      text,
  add column if not exists welcome_email_message_id   text,
  add column if not exists welcome_email_payload_hash text;

comment on column public.clients.welcome_email_claimed_at is
  'THE CLAIM, not the send. "This process holds the exclusive right to send this client''s one welcome email." Taken by a conditional UPDATE (… where welcome_email_claimed_at is null) so a replayed /auth/onboard, a double-click and two concurrent tabs produce exactly one send. Cleared ONLY on a definitive provider refusal or a pre-provider skip — never on an ambiguous outcome, because an ambiguous outcome may already have sent. It is therefore also the anchor for Resend''s 24-hour idempotency window.';

comment on column public.clients.welcome_email_sent_at is
  'THE SEND, positively confirmed. Written ONLY when Resend returned an email id (new or cached). Never cleared. Non-null means a provider id exists and the state is terminal.';

comment on column public.clients.welcome_email_outcome is
  'sent | in_progress | payload_conflict | ambiguous | refused | unresolved_expired. in_progress = the provider reported another same-key request in flight (concurrent_idempotent_requests) — NOT a send. payload_conflict = the same key was used with a different payload (invalid_idempotent_request): fail closed, no retry, a human looks. ambiguous = a 500, a timeout or a throw: retry safely inside 24h. refused = a definitive provider refusal; the claim is released. unresolved_expired = still unresolved past Resend''s 24-hour retention: NO automatic resend, claim NOT released, surfaced for human review.';

comment on column public.clients.welcome_email_message_id is
  'Resend''s email id for this client''s welcome email. The only positive evidence a send landed, and what resolves an ambiguous retry inside the 24-hour window.';

comment on column public.clients.welcome_email_payload_hash is
  'sha256 over the exact rendered payload (from, to, subject, html, text) at the FIRST attempt. A retry re-renders, re-hashes and compares BEFORE calling the provider: equal means the same idempotency key is still safe and the retry will succeed; different means payload_conflict and the retry is refused locally rather than discovering it from a provider 409.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.clients'::regclass
       and conname  = 'clients_welcome_email_outcome_check'
  ) then
    alter table public.clients
      add constraint clients_welcome_email_outcome_check check (
        welcome_email_outcome is null
        or welcome_email_outcome in
             ('sent','in_progress','payload_conflict','ambiguous','refused','unresolved_expired')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.clients'::regclass
       and conname  = 'clients_welcome_email_sent_needs_id'
  ) then
    alter table public.clients
      add constraint clients_welcome_email_sent_needs_id check (
        welcome_email_outcome is distinct from 'sent'
        or (welcome_email_message_id is not null and welcome_email_sent_at is not null)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.clients'::regclass
       and conname  = 'clients_welcome_email_sent_needs_claim'
  ) then
    alter table public.clients
      add constraint clients_welcome_email_sent_needs_claim check (
        welcome_email_sent_at is null or welcome_email_claimed_at is not null
      );
  end if;
end $$;

create index if not exists clients_welcome_email_unresolved_idx
  on public.clients (welcome_email_outcome, welcome_email_claimed_at)
  where welcome_email_outcome in ('in_progress','ambiguous','payload_conflict','unresolved_expired');
`.trim(),
  },
  {
    // ⚑ 14 Sep (S1-RT-005) — NEEDS ICP REVIEW. The client's words survive a provider
    // vocabulary that cannot take them, and a human translates before anything is spent.
    // ⚠️ NULL EVERYWHERE MEANS "nothing ever failed to translate", so no existing ICP enters
    // review and no existing Proof authority changes. The opposite asymmetry to
    // proof_passes_legacy above, and both directions are deliberate.
    key: '20260914_icp_provider_review',
    title: 'icps.icp_review — a Brief whose words we cannot translate reaches a human, not a dead end',
    sql: `-- ═══════════════════════════════════════════════════════════════════════════════════════
-- NEEDS ICP REVIEW — the client's words survive, and a human translates them.
-- (S1-RT-005 · the founder's fail-soft rule.)
--
-- ── THE DEFECT, AND IT WAS LIVE ────────────────────────────────────────────────────────
--
-- "industries", "seniority_levels" and "company_sizes" are CLOSED PROVIDER VOCABULARIES.
-- "boundedEnum" refused the whole Milla reply when every value in one of them was off-list,
-- so a client describing their own market in their own words — "B2B service businesses",
-- "founder-led firms" — was told "Milla didn't catch that", deterministically, for ever.
--
-- The refusal existed for a real reason: an EMPTY closed list means UNCONSTRAINED downstream
-- ("buildPdlBody" adds no filter for a list with no length), so silently turning their answer
-- into "[]" would widen the search to everybody and spend their money on it. Both available
-- answers were wrong. This is the third: keep their words, canonicalise only what we can
-- prove, and put the remainder in front of a person BEFORE anything is sourced or spent.
--
--     THE CLIENT SPEAKS NATURALLY. THE CLIENT NEVER HAS TO SPEAK APOLLO.
--     PROVIDER TRANSLATION IS OUR PROBLEM, NOT THEIRS.
--
-- ── WHY NOT "pending_targeting" ────────────────────────────────────────────────────────
--
-- 🛑 IT MEANS SOMETHING ELSE, AND OVERLOADING IT WOULD BREAK A LIVE READER. That column is
-- "a revision the client submitted, waiting for GO" — Vida renders it as *"⏸ Revision waiting
-- since … Not in effect; GO applies it"*, and "pending_campaign_intent" travels with it. A
-- brand-new ICP that has never been live is not a revision of anything, and a column whose
-- two meanings disagree about whether the CURRENT targeting is in effect is the
-- competing-truth defect this repo keeps writing rules against.
--
-- ── THE STATE, AND IT IS DELIBERATELY SMALL ────────────────────────────────────────────
--
-- Three nullable columns on "icps". No new table, no queue, no workflow engine, no tiers.
-- The ICP itself is the thing under review, so the state belongs on the ICP.
--
--     icp_review          jsonb        WHAT could not be translated, and the client's words
--     icp_review_at       timestamptz  WHEN we found out
--     icp_review_resolved_at / _by     WHO closed it, and when
--
-- 🛑 NULL EVERYWHERE = "NOTHING WAS EVER WRONG", which is the truth for every existing row
-- and for the overwhelming majority of future ones. "icpNeedsReview(null, null)" is FALSE, so
-- no existing client can be dragged into review by this migration, and no existing Proof
-- authority changes. That direction is the whole safety of the backfill: the flag is only
-- ever set FORWARD, by a promotion that actually failed to translate something.
--
-- ⚠️ THE ASYMMETRY WITH "proof_passes_legacy" IS DELIBERATE, and both are right. There, NULL
-- had to REFUSE, because guessing hands out free provider spend. Here, NULL must ADMIT,
-- because guessing the other way would freeze every live client's Proof on the day this
-- deploys over a translation problem they never had.
--
-- ⚠️ A CORRUPT OR UNREADABLE "icp_review" FAILS CLOSED, and that is decided in code
-- ("icpNeedsReview"), not here — a CHECK constraint cannot express "shaped like a review".
-- NULL is the only value this migration can create, and NULL is the safe one.
--
-- ADDITIVE AND IDEMPOTENT. Three nullable columns, one partial index, one guarded CHECK.
-- No data mutated, no backfill, no DROP, no destructive ALTER.
--
-- Also carried as a string in apps/api/src/lib/pending-migrations.ts (key
-- '20260914_icp_provider_review') and run from Vida -> Engine. Keep the two in step.
-- ═══════════════════════════════════════════════════════════════════════════════════════

alter table public.icps
  add column if not exists icp_review             jsonb,
  add column if not exists icp_review_at          timestamptz,
  add column if not exists icp_review_resolved_at timestamptz,
  add column if not exists icp_review_resolved_by uuid;

comment on column public.icps.icp_review is
  'NEEDS ICP REVIEW — the provider translation we could NOT complete, and the client''s own words for it. Shape: {"requirements":[{"field":"industries"|"seniority_levels"|"company_sizes","said":["their words","exactly as said"]}]}. NULL means nothing ever failed to translate, which is the truth for every row that predates this column and for every client whose words mapped cleanly — it is NOT a backfilled default and it grants nothing. A non-empty requirements array means Proof and provider sourcing are REFUSED until a human resolves it. A corrupt or unreadable value fails CLOSED (see icpNeedsReview in lib/icp-provider-translation.ts): the one thing we must not do with an unreadable translation state is spend money on it.';

comment on column public.icps.icp_review_at is
  'When the incomplete translation was recorded. Evidence only — authority is icp_review + icp_review_resolved_at, never a timestamp on its own.';

comment on column public.icps.icp_review_resolved_at is
  'When an operator supplied provider-safe values and the review closed. Set ONLY in the same statement that writes the canonical provider lists, so the flag can never clear without the values that justify it.';

comment on column public.icps.icp_review_resolved_by is
  'The auth user who resolved it. NOT a foreign key to auth.users, matching the existing convention for operator-attribution columns on this table: an operator account being removed must never cascade into or block a client''s ICP history.';

-- ── 🛑 THE FLAG AND ITS EVIDENCE CANNOT DISAGREE ──────────────────────────────────────
-- Guarded on pg_constraint rather than DROP + ADD: ADD CONSTRAINT ... CHECK takes an ACCESS
-- EXCLUSIVE lock and revalidates the whole table, so DROP/ADD would pay that on every run of
-- the ledger-less migration runner AND leave a window with no constraint at all.
-- SAFE ON A POPULATED TABLE: the columns are added NULL with no default and no backfill, so
-- every existing row short-circuits each predicate and validation cannot fail.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.icps'::regclass
       and conname  = 'icps_review_resolution_shape'
  ) then
    alter table public.icps
      add constraint icps_review_resolution_shape check (
        -- A resolution may only exist for something that was actually flagged. Without this,
        -- a stray "resolved_at" on a never-flagged row would read as "a human checked this",
        -- which is a claim about a person that nobody made.
        icp_review_resolved_at is null or icp_review is not null
      );
  end if;
end $$;

-- Vida's review rail asks for ICPs that still need a human — a small, bounded set that must
-- never require a table scan. Partial, because the overwhelming majority of ICPs have NULL
-- here and always will.
create index if not exists icps_needs_review_idx
  on public.icps (icp_review_at)
  where icp_review is not null and icp_review_resolved_at is null;
`,
  },
  {
    // ⚑ 14 Sep (S1-PD-05) — GO CARRIES THE REVIEW. `apply_pending_revision` applied a column
    // whitelist that did not include `icp_review`, so a live client's held revision landed
    // its canonical provider half and LOST the unresolved customer constraint — the new
    // targeting went live reading as translatable, and Proof and provider spend followed.
    // ⚠️ FUNCTION BODY ONLY. No column, no data, no backfill; `create or replace` swaps one
    // body for another and re-running is a no-op.
    // 🛑 IT MUST APPLY AFTER '20260914_icp_provider_review', whose four columns this body
    // names — and BOTH executors now agree about that (S1-PD-09): this array applies in
    // literal order and that entry sits above, AND the filename sorts after it. The file was
    // renamed from '20260914_go_applies_icp_review.sql' for exactly that reason: it sorted
    // FIRST, so any filename-ordered run would have created the function before its columns.
    key: '20260914_icp_review_go_apply',
    title: 'apply_pending_revision — GO applies a held revision WITH its review, or applies nothing',
    sql: `-- ═══════════════════════════════════════════════════════════════════════════════════════
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
grant  execute on function public.apply_pending_revision(uuid, uuid, uuid) to service_role;`.trim(),
  },
  {
    key: '20260710_founder_alerts',
    title: 'founder_alerts — the durable home for every founder alert (RT-008)',
    sql: `-- ═══════════════════════════════════════════════════════════════════════════════════════
-- 🛑 ⚑ 14 Sep (RT-008 · F8) — THIS MIGRATION HAD ONLY ONE HOME, AND THAT MAY BE WHY
-- GET HELP DID NOTHING.
--
-- S1-PD-09: a migration lives in TWO places — the .sql file AND this array, which is what
-- the Vida engine actually applies. \`supabase/migrations/20260710_founder_alerts.sql\` has
-- existed since 10 Jul and was never added here, so unless somebody ran it by hand,
-- \`founder_alerts\` does not exist in production.
--
-- What that costs: \`sendFounderAlert\` writes every alert to this table precisely so an
-- alert survives when email and Slack both fail. If the table is absent, the durable insert
-- fails too — and before today the escalation route answered { success: true } regardless.
-- A client stuck in the Milla Brief pressed Get help, was told the team had been told, and
-- nobody had been.
--
-- ⚠️ RUNTIME UNVERIFIED. Code cannot see production. This is the most likely cause, not a
-- proven one; the preview checklist in the packet is how the founder settles it.
--
-- ⚠️ FULLY IDEMPOTENT. Every statement is IF NOT EXISTS, so applying it where the table
-- already exists changes nothing.
-- ═══════════════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.founder_alerts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL,
  subject     text NOT NULL,
  body        text,
  email_ok    boolean NOT NULL DEFAULT false,
  slack_ok    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS founder_alerts_created_idx ON public.founder_alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS founder_alerts_kind_idx    ON public.founder_alerts (kind, created_at DESC);

-- 🛑 RLS ON, WITH NO POLICY — AND THE REPO'S OWN GUARD IS WHY THIS LINE EXISTS.
--
-- The moment this migration entered the runner, \`migration-home.test.ts\` failed with:
-- "A table exposed to PostgREST with RLS off is readable by anyone holding the public anon
-- key — apps/portal ships that key to every browser."
--
-- It is right, and the contents make it serious: every founder alert body lands here —
-- support escalations with a client's own words, their email address, payment failures,
-- company names. The .sql file has carried this hole since 10 Jul and it was never caught
-- because the migration was never in the runner to be checked.
--
-- ⚠️ NO POLICY IS DELIBERATE, and it is the same shape \`vida_conversations\` uses. The API
-- reaches this table with the SERVICE ROLE, which bypasses RLS; the anon key must reach it
-- with nothing at all. A policy here would be a door nobody asked for.
ALTER TABLE public.founder_alerts ENABLE ROW LEVEL SECURITY;
`,
  },
  {
    // ⚠️ LAST IN THE ARRAY AND LAST BY FILENAME, which is the S1-PD-09 contract: the only
    // executor applies in literal array order, and the filename must sort the same way so a
    // psql loop or a new contributor cannot produce a different one. '20260915_' sorts after
    // every '20260914_' entry above. It depends on nothing and nothing depends on it.
    key: '20260915_vida_conversations',
    title: "vida_conversations — Vida remembers the client she is working on (R121, Build 3)",
    sql: `-- ═══════════════════════════════════════════════════════════════════════════════════════
-- VIDA REMEMBERS THE CLIENT SHE IS WORKING ON. (R121, BUILD 3.)
--
-- ── WHAT THIS FIXES ────────────────────────────────────────────────────────────────────
--
-- Vida's transcript lived in React state (cmdLog in VidaConversation.tsx) and nowhere
-- else. An operator who reloaded the console, opened another client, or came back after
-- lunch was talking to somebody with no memory of the last twenty minutes — while the
-- CLIENT'S OWN Milla thread, three feet away in the same product, had been persisted since
-- 14 Sep. She could not be a colleague because she could not remember being one.
--
-- ── THE SHAPE, AND WHY IT IS THIS SHAPE ────────────────────────────────────────────────
--
-- 🛑 ONE ROW PER OPERATOR PER CLIENT. Two operators working the same client are having two
-- different conversations and must not read each other's — an operator who asked "what did
-- they say about pricing?" should not receive somebody else's half-finished thought as
-- context. And one operator across two clients must never carry A's context into B, which is
-- the cross-client leak this build is tested against.
--
-- ⚠️ THE TRANSCRIPT IS A JSONB ARRAY, not a row per message. It is read whole, written
-- whole, bounded to the most recent turns in application code, and never queried BY message
-- — exactly like onboarding_brief_drafts.conversation, which this deliberately mirrors
-- rather than inventing a second shape for the same job.
--
-- ⚠️ NO RLS POLICY, AND THAT IS THE SECURE CHOICE HERE. Every client-facing table in this
-- schema is reached by an authenticated client through RLS; this one is reached ONLY by the
-- service role, behind the admin-key proxy, and a client must never read it under any
-- policy. RLS is enabled with no policy at all, so an anon or authenticated role sees
-- nothing — the deny is structural rather than a rule somebody has to get right.
--
-- ⚠️ ADDITIVE AND IDEMPOTENT. Creates one table and one index; touches nothing that exists.
-- ═══════════════════════════════════════════════════════════════════════════════════════

create table if not exists public.vida_conversations (
  id            uuid primary key default gen_random_uuid(),
  -- The VERIFIED operator email, as the proxy forwards it and operator_audit_log records
  -- it. Text rather than a user id because operators are an allowlist, not a table.
  operator      text not null,
  client_id     uuid not null references public.clients(id) on delete cascade,
  -- [{ role: 'operator' | 'vida', text: string, at: iso }] — bounded in application code.
  conversation  jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 🛑 THE UNIQUENESS IS THE ISOLATION. Without it a second row for the same pair would make
-- "the conversation" ambiguous, and whichever row a query happened to return would be the
-- memory — which is how one operator's words start appearing in another's thread.
create unique index if not exists vida_conversations_operator_client_idx
  on public.vida_conversations (operator, client_id);

-- Enabled with NO policy: the service role bypasses RLS, every other role is denied by
-- default. A client can never read what an operator said about them.
alter table public.vida_conversations enable row level security;
`,
  },
  {
    key: '20260916_client_inboxes_one_live_per_email',
    title: 'client_inboxes — one mailbox may be LIVE on at most one client (MVP1 C1b)',
    sql: `-- ═══════════════════════════════════════════════════════════════════════════════════════
-- ⚑ 16 Sep (MVP1 · C1b) — ONE MAILBOX CANNOT BE LIVE ON TWO CLIENTS.
--
-- ── 🛑 WHY THIS MIGRATION IS NECESSARY, AND WHY IT IS THE ONLY ONE IN THIS BUILD ────────
--
-- \`20260725_client_inboxes.sql\` created exactly one unique index:
--
--     CREATE UNIQUE INDEX client_inboxes_one_live_per_kind
--       ON public.client_inboxes(client_id, kind)
--       WHERE status IN ('assigned','warming','active');
--
-- That is a rule about ONE CLIENT: it stops a single client holding two live pooled inboxes.
-- It says NOTHING about one ADDRESS being live on two DIFFERENT clients — and that is the
-- rule that matters the moment mailboxes are handed out automatically.
--
-- \`lib/programme-sender.ts\` has always known this. Its own comment says *"\`client_inboxes\` is
-- keyed per client, so nothing stops the same address being attached to"* another one, and it
-- compensates with a RUNTIME READ that looks for the address on other clients. That read is a
-- check-then-act: two preparations running at the same moment both read "free" and both
-- insert. With an operator typing addresses by hand that race was theoretical. With
-- preparation claiming senders automatically it is the normal case — two programmes reaching
-- the sender step together is exactly what a queue does.
--
-- ⚠️ SO THE EXISTING CONSTRAINT DOES NOT PROVE IT, which is the founder's own test for whether
-- a migration is warranted: *"if an existing unique constraint proves that safely, reuse it.
-- otherwise add only the smallest DB constraint/migration required."* This is that constraint,
-- and it is the whole of it.
--
-- ── WHAT IT DOES, AND WHAT IT CAREFULLY DOES NOT ───────────────────────────────────────
--
-- ⚠️ ADDITIVE ONLY. One index. Nothing is dropped, altered, renamed or deleted; no column
-- changes type; no row is touched. The existing per-kind index stays exactly as it is — the
-- two rules are different and both are wanted.
--
-- ⚠️ SCOPED TO LIVE ROWS, AND THAT IS WHAT MAKES IT SAFE TO ADD. \`released\` and \`retired\`
-- rows are history: a mailbox handed from one client to the next legitimately appears many
-- times, and a full unique index would refuse that and destroy the audit trail. Only rows in
-- play are constrained.
--
-- ⚠️ LOWER(email), because a mailbox is not case-sensitive and \`Outreach1@…\` and
-- \`outreach1@…\` are one inbox. The claim path normalises to lower case before inserting; this
-- index is what makes that a guarantee rather than a convention.
--
-- 🛑 IF IT CANNOT BE CREATED, THE DATA ALREADY VIOLATES IT. A duplicate live address is a
-- real defect — two clients sending from one mailbox — and the create failing is how it gets
-- discovered. Resolve the duplicates (release one), then re-run. It is deliberately NOT
-- written as a nullable/soft check that would hide that.
-- ═══════════════════════════════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS client_inboxes_one_live_per_email
  ON public.client_inboxes (lower(email))
  WHERE status IN ('assigned', 'warming', 'active');

COMMENT ON INDEX public.client_inboxes_one_live_per_email IS
  'MVP1 C1b: one mailbox address may be LIVE on at most one client. Scoped to assigned/warming/active so released and retired history can reuse an address. This is the arbiter for automatic pooled-sender claims — the application read that preceded it was a check-then-act race.';`.trim(),
  },
  {
    key: '20260917_unattributed_replies',
    title: 'unattributed_replies — the durable home for a reply we refused to attribute',
    sql: `-- ═══════════════════════════════════════════════════════════════════════════════════════
-- ⚑ 17 Sep — THE AMBIGUOUS REPLY GETS A DURABLE HOME.
--
-- ── 🛑 WHY THIS MIGRATION IS NECESSARY ─────────────────────────────────────────────────
--
-- 16 Sep closed the cross-client fan-out: a reply whose prospect address is held by two
-- clients, with no receiving mailbox and no originating-send evidence, is now written to
-- NOBODY. That is the correct safety answer and it created a second defect in its place.
--
-- The inbound content lived only in process memory. Resend's \`email.received\` webhook is
-- METADATA-ONLY, so the body is fetched from their API into a local variable; the dedup
-- ledger (\`processed_webhook_events\`) stores an id and a source and nothing else. So the
-- ambiguous path was: accept the webhook, record the dedup claim, fetch the body, refuse to
-- attribute it, email an alert, answer 200 — and the reply itself was gone. The provider
-- will not redeliver, because we told it we had the event.
--
-- A privacy leak was replaced with silent data loss. This table is the fix.
--
-- ── ⚠️ WHY NOT \`figsy_replies\` ──────────────────────────────────────────────────────────
--
-- \`figsy_replies.client_id\`, \`.lead_id\` and \`.campaign_id\` are all NOT NULL and have been
-- since 002_figsy.sql. An unattributed reply has no client by definition, so parking it
-- there would mean either relaxing those constraints — the very columns that make one reply
-- belong to one client — or inventing a placeholder client, which is a guess wearing a
-- fact's clothes. It gets its own table precisely so that nothing client-visible exists
-- until a human names the owner.
--
-- ── ⚠️ WHY \`UNIQUE (provider, provider_event_key)\` AND NOT THE KEY ALONE ────────────────
--
-- Event ids are PROVIDER-SCOPED. Smartlead message "123" and Instantly message "123" are two
-- different emails, and a global unique on the key alone would let one provider's reply
-- silently suppress the other's — the identical trap \`replyEventKey\` was written to avoid by
-- namespacing. NULL is deliberately not deduplicated: an operator-typed or demo reply has no
-- provider event, and a NULL key that collided would drop the second real one.
--
-- ⚠️ ADDITIVE. A new table, two indexes and RLS. Nothing existing is altered, nothing is
-- backfilled, and the application is safe whether or not this has run: until it exists,
-- \`retainUnattributedReply\` fails, the webhook is REFUSED with a 500 and the dedup claim is
-- released, so the provider keeps the reply and redelivers rather than anything being lost.
-- ═══════════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.unattributed_replies (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  provider              text        NOT NULL,
  provider_event_key    text,

  from_email            text        NOT NULL,
  from_name             text,
  to_email              text,
  subject               text,
  body                  text        NOT NULL,
  raw_payload           jsonb,

  candidate_client_ids  uuid[]      NOT NULL,
  candidate_lead_ids    uuid[]      NOT NULL,

  received_at           timestamptz NOT NULL DEFAULT now(),

  -- ⚑ THE CLAIM, AND IT IS NOT THE RESOLUTION. Two operators pressing at once must not
  -- produce two replies, and an attribution that FAILS must leave the exception recoverable.
  -- One column cannot do both, so the claim is taken first (compare-and-set on NULL), the
  -- reply is written, and only then is the resolution recorded. A failure releases the claim.
  resolve_claimed_at    timestamptz,
  resolve_claimed_by    text,

  resolved_at           timestamptz,
  resolved_client_id    uuid REFERENCES public.clients(id),
  resolved_by           text,
  resolution            text CHECK (resolution IN ('attributed', 'discarded')),

  -- 🛑 THE TWO HALVES OF AN OUTCOME CANNOT DISAGREE. A row carrying \`resolution\` with no
  -- \`resolved_at\` (or the reverse) is a state no reader could interpret, and an \`attributed\`
  -- row with no client is the guess this whole table exists to prevent.
  CONSTRAINT unattributed_replies_resolution_complete CHECK (
    (resolved_at IS NULL AND resolution IS NULL AND resolved_client_id IS NULL)
    OR (resolved_at IS NOT NULL AND resolution = 'discarded')
    OR (resolved_at IS NOT NULL AND resolution = 'attributed' AND resolved_client_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS unattributed_replies_provider_event_key
  ON public.unattributed_replies (provider, provider_event_key)
  WHERE provider_event_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS unattributed_replies_open_idx
  ON public.unattributed_replies (received_at)
  WHERE resolved_at IS NULL;

-- Enabled with NO policy: the API uses the service role, which bypasses RLS, and every other
-- role is denied by default. A client can never read an inbound reply that was never
-- attributed to them — which is the isolation this table was built to preserve.
ALTER TABLE public.unattributed_replies ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.unattributed_replies IS
  'An inbound reply whose owner could not be determined safely: several clients hold a lead with that prospect address, no receiving mailbox names one, and no originating-send record names one. Retained in full, visible to nobody, until an operator attributes it to one of its stored candidates or discards it. NEVER a client-visible reply — that is figsy_replies.';`.trim(),
  },
  {
    key: '20260917_operator_tasks_and_automatic_work',
    title: 'operator_tasks + automatic_work + the applied-migration ledger (XC-5 / XC-6 / XC-3)',
    sql: `-- ═════════════════════════════════════════════════════════════════════════════════════════
-- XC-5 + XC-6 + XC-3 · THE THREE THINGS THE SYSTEM COULD NOT WRITE DOWN
--
-- ── EXPAND / CONTRACT ───────────────────────────────────────────────────────────────────
-- **PHASE: EXPAND ONLY.** This migration ADDS three tables and their indexes. It alters no
-- existing column, drops nothing, renames nothing and rewrites no row. Every reader of
-- every existing table behaves identically before and after, so it is safe to apply while
-- the old code is still serving, and safe to leave applied if the code is rolled back.
--
-- **THE CONTRACT PHASE IS A LATER, SEPARATE MIGRATION** and there is nothing to contract
-- yet: no column is being replaced. When \`founder_alerts\` email-only mirroring is finally
-- retired in favour of \`operator_tasks\`, that is the contract step, and it is not this one.
--
-- **ABSENT-COLUMN / ABSENT-TABLE TOLERANCE IS IN THE CODE, LOUDLY.** \`operator-tasks.ts\`
-- and \`automatic-work.ts\` both detect "this table is not here yet" and say so — they do not
-- read a \`supabase-js\` \`{data:null,error}\` as an empty list. That distinction is the single
-- most expensive defect class in this repo (553 unchecked destructures), and a new table is
-- exactly where it bites: the code ships before the migration is run, every time.
--
-- ── WHAT EARNED EACH TABLE ──────────────────────────────────────────────────────────────
--
-- ① \`operator_tasks\` (XC-5). Every operator-facing exception in this product is currently
--    either an EMAIL (\`sendFounderAlert\`) or a value DERIVED on read (\`deriveLifecycle\`'s
--    \`needsYou\`). Neither is a record. An email is not a queue: it cannot be assigned,
--    resolved, deduped, counted or audited, and when it is missed there is nothing left
--    behind. A derived flag is not a record either: it exists only while the facts that
--    imply it still hold, so an exception that resolves itself leaves no trace that it ever
--    happened — and one that needs a human is invisible the moment the derivation changes.
--    Vida's Needs-you must be readable from the database, not recomputed from a guess.
--
-- ② \`automatic_work\` (XC-6). Nothing in this product owns TIME. Work that the system
--    promises to do by itself — start a Proof, promote a Brief, prepare a programme — has
--    no persisted "I said I would do this, at this moment, within this bound". So
--    "requested but never started" is indistinguishable from "never requested", which is
--    exactly how Northvale sat in unresolved \`icp_review\` with Milla saying it was
--    "finding your first examples" and Vida saying no action was needed. FD-0 requires BOTH
--    automatic recovery and an audited operator action, and both require a persisted state
--    to recover FROM.
--
-- ③ \`app_migrations_applied\` (XC-3). It already exists — created as a SIDE EFFECT of
--    \`20260724_one_wallet.sql\`'s exception handler, with two columns and no RLS. The
--    migration runner does not write to it: it replays all of its keys on every run and
--    keeps no applied-state record at all, so Vida → System cannot answer "has this been
--    applied?" except by looking for the object the migration was supposed to create. This
--    gives it the columns a ledger needs and enables RLS.
--
-- ⚠️ IDEMPOTENT THROUGHOUT. \`IF NOT EXISTS\` on every object, \`DROP POLICY IF EXISTS\` before
-- each \`CREATE POLICY\` (PostgreSQL has no \`CREATE POLICY IF NOT EXISTS\` — a fact this repo
-- learned the hard way: \`20260525_milla_vida_tables.sql\` has been unable to execute since
-- the day it was written because it uses exactly that non-existent syntax). Nothing here
-- tracks what has been applied, so every file must survive a re-run.
-- ═════════════════════════════════════════════════════════════════════════════════════════


-- ── ① OPERATOR TASKS — the persisted Needs-you row ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.operator_tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The machine class. Routing, dedupe and counting all key on this, never on the prose.
  kind          text NOT NULL,

  severity      text NOT NULL DEFAULT 'warn'
                  CHECK (severity IN ('info', 'warn', 'critical')),

  -- What the operator reads. One sentence, in the operator's language.
  title         text NOT NULL,
  detail        text,

  -- Who it is about. \`client_id\` cascades: a deleted client's tasks are about nobody.
  client_id     uuid REFERENCES public.clients(id) ON DELETE CASCADE,

  -- ⚠️ \`programme_id\` IS DELIBERATELY NOT A FOREIGN KEY, matching the existing convention
  -- for operator-attribution columns on \`operator_audit_log\`: the record of what an operator
  -- was asked to do must outlive the thing it was about, and a cascade here would delete the
  -- evidence along with the subject.
  programme_id  uuid,
  subject_kind  text,
  subject_id    text,

  -- ⚠️ DEDUPE IS AN INDEX, NOT AN APPLICATION READ. A check-then-insert is a race, and the
  -- callers are crons: two slots firing on the same second is the normal case, not the edge
  -- case. \`operator_tasks_one_open_per_key\` below IS the authority.
  dedupe_key    text,

  status        text NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'resolved', 'dismissed')),

  -- Machine-readable evidence: the provider status code, the run id, the counts. Whatever
  -- the operator needs in order to decide without opening a terminal.
  evidence      jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at   timestamptz,
  resolved_by   uuid,
  resolution_note text
);

COMMENT ON TABLE public.operator_tasks IS
  'XC-5. The PERSISTED operator exception. Every sendFounderAlert class writes one; the email is a mirror, not the record. Vida Needs-you reads this table. A task is resolved by a human with a note, or by the condition clearing, and either way the row survives as evidence that it happened.';

COMMENT ON COLUMN public.operator_tasks.dedupe_key IS
  'One OPEN task per (kind, dedupe_key), enforced by a partial unique index. Null means "never dedupe this one" — used where each occurrence is its own event.';

COMMENT ON COLUMN public.operator_tasks.evidence IS
  'Machine-readable facts the operator needs to decide: provider status code, run id, counts. NEVER a secret, a key, a database URL or a prospect''s personal data — this table is read by a console and copied into notes.';

-- 🛑 THE DEDUPE AUTHORITY. Without it, an Apollo 402 on a 2-hourly cron produces twelve
-- identical rows a day and the operator learns to ignore the list — which is the failure
-- mode the whole Needs-you design exists to prevent ("NORMAL IS SILENT").
CREATE UNIQUE INDEX IF NOT EXISTS operator_tasks_one_open_per_key
  ON public.operator_tasks (kind, dedupe_key)
  WHERE status = 'open' AND dedupe_key IS NOT NULL;

-- The two reads Vida actually performs: the open queue, and one client's history.
CREATE INDEX IF NOT EXISTS operator_tasks_open_created
  ON public.operator_tasks (created_at DESC) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS operator_tasks_client
  ON public.operator_tasks (client_id, created_at DESC);

ALTER TABLE public.operator_tasks ENABLE ROW LEVEL SECURITY;

-- Operator-only, and that means service_role only: this is K.I.N.D's own queue and it
-- names clients other than the reader. No \`authenticated\` policy exists on purpose — a
-- client must never see another client's exception, and the safest way to guarantee that
-- is for the client role to have no path to the table at all.
DROP POLICY IF EXISTS operator_tasks_service_only ON public.operator_tasks;
CREATE POLICY operator_tasks_service_only ON public.operator_tasks
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ── ② AUTOMATIC WORK — the system's own promise, written down ────────────────────────────

CREATE TABLE IF NOT EXISTS public.automatic_work (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- WHAT was promised: 'proof_run', 'brief_promotion', 'programme_prepare', …
  kind          text NOT NULL,

  -- WHICH thing it was promised about. Text, not uuid: the subject is sometimes an icp id,
  -- sometimes a programme id, sometimes a composite — and a typed column would force a
  -- second table per kind for no gain.
  subject_kind  text NOT NULL,
  subject_id    text NOT NULL,

  client_id     uuid REFERENCES public.clients(id) ON DELETE CASCADE,

  -- ⚠️ FIVE STATES, AND \`stuck\` IS NOT A SYNONYM FOR \`failed\`. A failure is a thing that
  -- happened and reported itself. STUCK is the absence of a report: it started and never
  -- came back, or it was requested and never started. Those need different recoveries —
  -- FD-0's automatic recovery can safely retry a failure, and must not silently retry
  -- something that may still be running.
  state         text NOT NULL DEFAULT 'requested'
                  CHECK (state IN ('requested', 'started', 'completed', 'failed', 'stuck')),

  -- How long this kind of work is allowed to take before silence becomes a finding. Stored
  -- per row, not read from a constant, so a bound that was in force when the work was
  -- requested cannot be retroactively changed by a deploy.
  bound_seconds int NOT NULL CHECK (bound_seconds > 0),

  requested_at  timestamptz NOT NULL DEFAULT now(),
  started_at    timestamptz,
  completed_at  timestamptz,
  failed_at     timestamptz,
  stuck_at      timestamptz,

  attempt       int NOT NULL DEFAULT 1 CHECK (attempt >= 1),
  failure_reason text,

  -- The task the detector raised for this unit, so a second detector pass finds the row
  -- already reported instead of raising again.
  detected_task_id uuid REFERENCES public.operator_tasks(id) ON DELETE SET NULL,

  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.automatic_work IS
  'XC-6 / FD-0. One row per unit of work the SYSTEM promised to do by itself, with the moment it was promised and the bound it must finish inside. Nothing in this product owned time before this table: "requested but never started" was indistinguishable from "never requested", which is how a client sat on "finding your first examples" while nothing was running and Vida reported no action needed.';

COMMENT ON COLUMN public.automatic_work.bound_seconds IS
  'The bound in force WHEN THE WORK WAS REQUESTED. Stored per row rather than read from a constant so a later deploy cannot retroactively make a late run look punctual.';

-- 🛑 ONE LIVE UNIT PER SUBJECT — the retry-safety property, enforced by the database.
--
-- FD-0 is explicit that recovery must not "create concurrent runs" or "create a second
-- Proof entitlement". An application-level check-then-insert cannot promise that: the
-- callers are a cron, an HTTP retry and an operator button, and any two of them can arrive
-- together. This index refuses the second live row outright.
CREATE UNIQUE INDEX IF NOT EXISTS automatic_work_one_live_per_subject
  ON public.automatic_work (kind, subject_kind, subject_id)
  WHERE state IN ('requested', 'started');

-- The detector's own read: everything still live, oldest first.
CREATE INDEX IF NOT EXISTS automatic_work_live
  ON public.automatic_work (requested_at) WHERE state IN ('requested', 'started');
CREATE INDEX IF NOT EXISTS automatic_work_client
  ON public.automatic_work (client_id, requested_at DESC);

ALTER TABLE public.automatic_work ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS automatic_work_service_only ON public.automatic_work;
CREATE POLICY automatic_work_service_only ON public.automatic_work
  FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ── ③ THE APPLIED-MIGRATION LEDGER (XC-3) ───────────────────────────────────────────────
--
-- The table already exists in production with two columns, created accidentally by
-- \`20260724_one_wallet.sql\`'s \`EXCEPTION WHEN undefined_table\` handler. \`CREATE TABLE IF
-- NOT EXISTS\` therefore does nothing there and creates it on a fresh database; the \`ADD
-- COLUMN IF NOT EXISTS\` statements below are what actually change production.
CREATE TABLE IF NOT EXISTS public.app_migrations_applied (
  key         text PRIMARY KEY,
  applied_at  timestamptz NOT NULL DEFAULT now()
);

-- EXPAND: four nullable columns. Nothing reads them until the runner writes them, and the
-- runner tolerates their absence (see \`pending-migrations.ts\`) — so this migration and the
-- code that uses it can land in either order without a window where either is broken.
ALTER TABLE public.app_migrations_applied
  ADD COLUMN IF NOT EXISTS last_outcome  text,
  ADD COLUMN IF NOT EXISTS last_error    text,
  ADD COLUMN IF NOT EXISTS last_run_at   timestamptz,
  ADD COLUMN IF NOT EXISTS run_count     int NOT NULL DEFAULT 0;

COMMENT ON TABLE public.app_migrations_applied IS
  'XC-3. What the migration runner has actually applied. Before this, the runner replayed every key on every run and recorded nothing, so "has this been applied?" could only be answered by hunting for the object the migration was supposed to create — and a migration whose object already existed for another reason was indistinguishable from one that had run.';

COMMENT ON COLUMN public.app_migrations_applied.last_outcome IS
  'ok | error, from the most recent run of this key. \`applied_at\` is the FIRST success and never moves; this and last_run_at describe the latest attempt.';

ALTER TABLE IF EXISTS public.app_migrations_applied ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_migrations_applied_service_only ON public.app_migrations_applied;
CREATE POLICY app_migrations_applied_service_only ON public.app_migrations_applied
  FOR ALL TO service_role USING (true) WITH CHECK (true);
`.trim(),
  },
  {
    key: '20260917_proof_fence_in_records',
    title: 'the free-proof fence is counted in RECORDS, not PDL dollars (J5-C9 / FD-6)',
    sql: `-- ═════════════════════════════════════════════════════════════════════════════════════════
-- J5-C9 · THE FREE-PROOF FENCE IS COUNTED IN RECORDS, NOT IN PDL DOLLARS
--
-- ── EXPAND / CONTRACT ───────────────────────────────────────────────────────────────────
-- **PHASE: EXPAND, plus two \`CREATE OR REPLACE FUNCTION\` bodies.**
--
-- ADDS one nullable column (\`money_settings.proof_monthly_cap_records\`) and a ONE-TIME unit
-- translation into it. Drops nothing, renames nothing, and leaves \`proof_monthly_cap_usd\`
-- exactly where it is — a historic figure, still readable, describing the ledger rows that
-- were genuinely booked in dollars.
--
-- **THE CONTRACT PHASE IS A LATER, SEPARATE MIGRATION**: dropping \`proof_monthly_cap_usd\`
-- and the \`cost_usd\` column on \`proof_ledger\` once nothing reads them. Nothing here does
-- that, because rows already written in dollars are the only record of money genuinely spent.
--
-- **ABSENT-COLUMN TOLERANCE IS IN BOTH DIRECTIONS.** \`try_reserve_proof_records\` below reads
-- the new column with a COALESCE onto a translation of the old one, so it behaves correctly
-- whether or not the \`ADD COLUMN\` has been applied. \`icps.ts\`'s alert reads whichever column
-- answers and says which. Neither treats a missing column as a zero ceiling — that would
-- refuse all free Proof, which is the loud-but-wrong direction.
--
-- ── WHAT EARNED IT (FD-6) ───────────────────────────────────────────────────────────────
--
-- The fence was denominated in PDL money. \`v_rate numeric := 0.28\` — "PDL $/record, verified
-- 10 Jul" — converted a $300 monthly ceiling into a number of records, and every reservation
-- wrote \`records * 0.28\` into \`proof_ledger.cost_usd\`.
--
-- The founder's ruling of 17 Sep: **"PDL IS NOT A PAID/ACTIVE PROVIDER FOR MVP1. We are not
-- paying for PDL."** So every part of that arithmetic became fiction:
--
--   ① **THE RATE IS FOR A VENDOR WE DO NOT BUY FROM.** Apollo's People Search costs nothing;
--      the credit is the email reveal, and a free Proof set shows MASKED cards precisely so
--      it reveals nobody. A Proof run's true provider cost is $0.
--   ② **SO THE CEILING STOPPED BINDING.** With \`cost_usd\` telling the truth ($0), the room
--      calculation \`floor((cap - month_spend) / rate)\` divides an untouched budget by a rate
--      that buys nothing — an unbounded fence. Leaving the fiction in place is what kept it
--      bounded, which is the worst of both: a limit that works only while the number is wrong.
--   ③ **AND IT MISREPORTED THE REFUSAL.** \`MONTHLY_PROOF_BUDGET_REACHED\` told the founder a
--      $300 acquisition budget was spent. Under FD-6 no dollars are spent at all, so the
--      operator was sent to raise a budget that was not the constraint.
--
-- ── THE TRANSLATION, AND WHY IT IS NOT A NEW DECISION ───────────────────────────────────
--
-- AR17 fences the PROSPECT at 40 records for life, and that is already counted in records —
-- untouched here. The MONTHLY ceiling is the half that was in dollars, and it is translated
-- once, at the rate the dollars were always divided by:
--
--     floor(proof_monthly_cap_usd / 0.28)  →  floor(300 / 0.28)  =  1071 records
--
-- So the operative limit on the day this applies is the SAME limit as the day before. The
-- unit becomes honest; the number does not move. **Choosing a different monthly record
-- ceiling is the founder's decision and is not made here** — this migration only stops the
-- product from expressing his existing decision in a currency it no longer spends.
--
-- ⚠️ THE 0.28 IN THIS FILE IS HISTORIC ARITHMETIC, NOT A LIVE RATE. It appears exactly once,
-- in the one-time backfill, to reproduce a limit that was set in dollars. No function body
-- below multiplies by it, and nothing at runtime reads it.
--
-- ── WHAT APOLLO CREDIT TRUTH MEANS HERE ─────────────────────────────────────────────────
--
-- A database function cannot ask Apollo how many credits are left, and it must not pretend
-- to. The credit fence therefore lives where the provider answers: a 402 or a credit-bearing
-- 422 is classified by \`classifyProviderFailure\`, releases the reservation, records
-- \`quota_exhausted\`, and raises a Vida task naming the top-up. This function's job is the
-- ENTITLEMENT — 40 per prospect for life, and a monthly company ceiling in records.
--
-- ⚠️ IDEMPOTENT. \`ADD COLUMN IF NOT EXISTS\`, a backfill guarded on \`IS NULL\`, and
-- \`CREATE OR REPLACE\` bodies. Nothing here tracks what has been applied, so every statement
-- must survive a re-run.
-- ═════════════════════════════════════════════════════════════════════════════════════════


-- ── ① THE MONTHLY CEILING, IN RECORDS ───────────────────────────────────────────────────

ALTER TABLE public.money_settings
  ADD COLUMN IF NOT EXISTS proof_monthly_cap_records int;

COMMENT ON COLUMN public.money_settings.proof_monthly_cap_records IS
  'J5-C9 / FD-6: the free-proof ACQUISITION ceiling per calendar month, counted in RECORDS. Replaces proof_monthly_cap_usd, which denominated the same limit in PDL dollars at $0.28 a record — a rate for a provider we no longer buy from, which made the fence unbounded the moment the cost told the truth. Founder-set; never raised automatically. The per-prospect lifetime cap (40, AR17) is separate and was always counted in records.';

-- THE ONE-TIME UNIT TRANSLATION. Guarded on NULL, so a re-run cannot overwrite a value the
-- founder has since set by hand.
UPDATE public.money_settings
   SET proof_monthly_cap_records = GREATEST(1, FLOOR(COALESCE(proof_monthly_cap_usd, 300) / 0.28)::int)
 WHERE id = 1
   AND proof_monthly_cap_records IS NULL;

COMMENT ON COLUMN public.money_settings.proof_monthly_cap_usd IS
  'HISTORIC (J5-C9, 17 Sep): the free-proof acquisition ceiling as it was expressed while PDL was the provider — $300/month at $0.28 a record. Kept because proof_ledger rows written before FD-6 record dollars genuinely committed, and a ceiling with no unit makes them unreadable. NOT the live fence: that is proof_monthly_cap_records.';


-- ── ② THE RESERVATION, WITH NO RATE IN IT ───────────────────────────────────────────────
--
-- Same name, same signature, same return shape, same reason strings — so every existing
-- caller, guard and test reads it identically. Three things change inside:
--   · the monthly room is a count of RECORDS, summed from \`proof_ledger.records\`;
--   · nothing is multiplied by a rate;
--   · a new row books \`cost_usd = 0\`, because that is what an Apollo-sourced record costs.

CREATE OR REPLACE FUNCTION public.try_reserve_proof_records(p_client_id uuid, p_requested int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
declare
  -- AR17, founder-set: lifetime proof records per prospect. Unchanged, and it was always
  -- counted in records rather than money.
  v_client_cap    int := 40;
  v_committed     int;
  v_client_room   int;
  v_cap_records   int;
  v_month_records int;
  v_month         date := (date_trunc('month', now()))::date;
  v_room          int;
  v_grant         int;
  v_res_id        uuid;
begin
  if p_client_id is null or p_requested is null or p_requested <= 0 then
    return jsonb_build_object('granted', 0, 'reservation_id', null, 'reason', 'FAIL_CLOSED_BAD_ARGS');
  end if;

  -- ① GLOBAL LOCK FIRST. The singleton money_settings row is the one object every proof
  --    reservation must pass through, which is what serialises DIFFERENT clients. Locking
  --    per-client rows alone would let two prospects each read the same monthly room.
  --
  -- ⚠️ ABSENT-VALUE TOLERANCE, IN THE SAFE DIRECTION, AND WITH NO RATE IN THE BODY.
  --
  -- The column cannot be missing when this body is live: the \`ADD COLUMN\` above is in the
  -- same file, and both the Vida runner and \`psql --single-transaction\` send a file as ONE
  -- transaction, so either both landed or neither did. What CAN be null is the value — a
  -- \`money_settings\` row created after the backfill ran.
  --
  -- ⚠️ SO THE DEFAULT IS A LITERAL, NOT ARITHMETIC. \`DEFAULT_CAP_RECORDS\` is the translation
  -- of the historic $300-at-$0.28 ceiling, computed ONCE in this file's backfill and written
  -- here as the number it produced. Dividing by 0.28 at runtime would leave a rate for a
  -- provider we do not buy from inside the deployed fence — which is the whole thing J5-C9
  -- removes, and a test reads \`pg_get_functiondef\` to prove it is gone.
  --
  -- A missing ceiling is NEVER read as zero: that would refuse all free Proof, which is loud
  -- but wrong.
  select coalesce(proof_monthly_cap_records, 1071)
    into v_cap_records
    from public.money_settings where id = 1 for update;

  if v_cap_records is null then
    return jsonb_build_object('granted', 0, 'reservation_id', null, 'reason', 'FAIL_CLOSED_NO_MONEY_SETTINGS');
  end if;

  -- ② then the prospect's own row. Always this order, so proof callers cannot deadlock.
  select coalesce(proof_records_committed, 0) into v_committed
    from public.clients where id = p_client_id for update;
  if v_committed is null then
    return jsonb_build_object('granted', 0, 'reservation_id', null, 'reason', 'FAIL_CLOSED_UNKNOWN_CLIENT');
  end if;

  -- THE PROSPECT'S OWN CEILING, ANSWERED BEFORE THE COMPANY'S. This is the common refusal
  -- and it is not a company event: the prospect has had their two passes' worth of records.
  v_client_room := greatest(0, v_client_cap - v_committed);
  if v_client_room <= 0 then
    return jsonb_build_object('granted', 0, 'reservation_id', null, 'reason', 'CLIENT_PROOF_LIMIT_REACHED');
  end if;

  -- THIS month's authority, IN RECORDS. Summed over budget_month, so an old month's late
  -- correction can never inflate the current month's room. Outstanding reservations are
  -- already in the sum, because the reservation IS a ledger row — and a release writes a
  -- NEGATIVE records row, so the sum self-corrects without a rate anywhere in it.
  select coalesce(sum(records), 0) into v_month_records
    from public.proof_ledger where budget_month = v_month;

  v_room := greatest(0, v_cap_records - v_month_records);
  if v_room <= 0 then
    -- THE ONE THAT IS ACTUALLY A COMPANY EVENT. Free acquisition has stopped for everybody
    -- until the founder raises the ceiling, so this — and only this — raises the alert. The
    -- reason string is UNCHANGED so no caller has to learn a new one; what changed is that
    -- it is now true about a record count rather than about dollars nobody spent.
    return jsonb_build_object('granted', 0, 'reservation_id', null, 'reason', 'MONTHLY_PROOF_BUDGET_REACHED');
  end if;

  v_grant := least(p_requested, v_client_room, v_room);
  if v_grant <= 0 then
    -- Unreachable: all three inputs are > 0 above. Kept as a fail-closed floor so a future
    -- edit to any of them can only ever under-allow.
    return jsonb_build_object('granted', 0, 'reservation_id', null, 'reason', 'FAIL_CLOSED_BAD_ARGS');
  end if;

  update public.clients
     set proof_records_committed = v_committed + v_grant
   where id = p_client_id;

  -- ⚠️ \`cost_usd = 0\`, AND THAT IS THE HONEST FIGURE. An Apollo People Search costs nothing;
  -- the credit is the email reveal, and a free Proof set shows masked cards precisely so it
  -- reveals nobody. The column is kept so historic rows stay readable — see its comment.
  insert into public.proof_ledger (client_id, records, cost_usd, budget_month)
    values (p_client_id, v_grant, 0, v_month)
    returning id into v_res_id;

  return jsonb_build_object('granted', v_grant, 'reservation_id', v_res_id, 'reason', 'GRANTED');
end;
$$;

REVOKE EXECUTE ON FUNCTION public.try_reserve_proof_records(uuid, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.try_reserve_proof_records(uuid, int) TO service_role;

COMMENT ON FUNCTION public.try_reserve_proof_records(uuid, int) IS
  'J5-C9 / FD-6. The free-proof ENTITLEMENT fence, counted in RECORDS: 40 per prospect for life (AR17) and a monthly company ceiling in records. No provider rate appears in it. Apollo credit exhaustion is not this function''s business and it does not pretend otherwise — a 402 or credit-bearing 422 is classified at the caller, releases the reservation, records quota_exhausted and raises a Vida task.';


-- ── ③ THE RELEASE, WITH NO RATE EITHER ──────────────────────────────────────────────────
--
-- ⛓️ WHY IT HAD TO CHANGE TOO. It computed \`v_rate := v_row.cost_usd / v_row.records\` — "the
-- rate this reservation was booked at" — and wrote \`-(v_release * v_rate)\`. Against a
-- reservation booked at $0 that is a division yielding 0, which is harmless; against a
-- reservation with ZERO records it is a division by zero, and the \`v_row.records <= 0\` guard
-- above it is the only thing that has ever stood between this function and that. Removing
-- the rate removes the hazard with it.
--
-- The RECORDS half — which is the authority — is unchanged: clamp to this reservation, mark
-- it reconciled once, give the prospect their committed records back, and write the negative
-- row in the RESERVATION'S month rather than the current one.

CREATE OR REPLACE FUNCTION public.release_proof_records(p_reservation_id uuid, p_records int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
declare
  v_row       public.proof_ledger%rowtype;
  v_committed int;
  v_release   int;
begin
  if p_reservation_id is null or p_records is null or p_records <= 0 then return 0; end if;

  -- Lock THE reservation row. Everything below is scoped to it and nothing else.
  select * into v_row from public.proof_ledger where id = p_reservation_id for update;
  if not found then return 0; end if;
  if v_row.records <= 0 then return 0; end if;              -- corrections are not reservations
  if v_row.reconciled_at is not null then return 0; end if;  -- ONCE. A replay is a no-op.

  -- Clamp to THIS reservation's size: reconciling A can never release B's authority.
  v_release := least(p_records, v_row.records);

  update public.proof_ledger
     set reconciled_at = now(), released_records = v_release
   where id = p_reservation_id;

  select coalesce(proof_records_committed, 0) into v_committed
    from public.clients where id = v_row.client_id for update;
  update public.clients
     set proof_records_committed = greatest(0, v_committed - v_release)
   where id = v_row.client_id;

  -- ⚠️ \`cost_usd = 0\` — NOT a rate-derived figure. A correction to a reservation that cost
  -- nothing is a correction of nothing, and inventing one would put fabricated money back
  -- into a ledger this migration exists to stop fabricating money in.
  --
  -- ⚠️ A HISTORIC RESERVATION, BOOKED IN DOLLARS, IS STILL CORRECTED IN RECORDS. Its own
  -- \`cost_usd\` stays exactly as it was written; only the release row is zero. The month's
  -- authority is summed from \`records\`, so the release corrects the authority in full.
  insert into public.proof_ledger (client_id, records, cost_usd, budget_month, reservation_id)
    values (v_row.client_id, -v_release, 0, v_row.budget_month, v_row.id);

  return v_release;
end;
$$;

REVOKE EXECUTE ON FUNCTION public.release_proof_records(uuid, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.release_proof_records(uuid, int) TO service_role;
`.trim(),
  },
]// Runs the statements against DATABASE_URL. Uses node-postgres because the Supabase JS
// client speaks PostgREST, which cannot execute DDL.
//
// The first attempt failed with `connect ENETUNREACH …:5432` against an IPv6 address:
// Supabase's direct host is IPv6-only and Railway has no IPv6 egress, so the connection died
// before it sent anything. lib/db-connection.ts derives the IPv4 pooler equivalents; we try
// the configured URL first, then those, and report which host actually worked so DATABASE_URL
// can be set to it permanently.
export type MigrationRunResult = {
  results: { key: string; ok: boolean; error?: string }[]
  host: string
  usedFallback: boolean
  hint?: string
}

export async function runPendingMigrations(passwordOverride?: string | null): Promise<MigrationRunResult> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set on this service — add it in Railway → @kind/api → Variables.')

  const { Client } = await import('pg')
  const { connectionCandidates, safeHost, isUnreachableError, isAuthError, refMismatch } = await import('./db-connection')

  // A project-ref typo is always a typo, never a valid configuration — DATABASE_URL and
  // SUPABASE_URL sit beside each other in Railway and must describe the same project. Caught
  // BEFORE any connection attempt, because the attempt can only fail with a DNS-shaped error
  // that names a tenant rather than the mistake (`tenant/user postgres.<typo> not found`).
  const mismatch = refMismatch(url, process.env.SUPABASE_URL)
  if (mismatch) throw new Error(mismatch)

  const candidates = connectionCandidates(url, process.env.SUPABASE_URL, passwordOverride)

  // Find ONE reachable connection string before running any SQL, so a migration is never
  // half-applied across two different attempts.
  let working: string | null = null
  let lastError: unknown = null
  let attempted = 0
  let sawAuthFailure = false
  for (const candidate of candidates) {
    attempted++
    const probe = new Client({ connectionString: candidate, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 })
    try {
      await probe.connect()
      working = candidate
      await probe.end().catch(() => {})
      break
    } catch (e) {
      lastError = e
      await probe.end().catch(() => {})
      // A wrong password is not a routing problem — stop rather than replay bad credentials
      // against every region, which is how accounts get locked out.
      if (!isUnreachableError(e)) { sawAuthFailure = isAuthError(e); break }
    }
  }

  if (!working) {
    const msg = lastError instanceof Error ? lastError.message : String(lastError)
    // Say WHICH problem this is. "Nothing was reachable" and "the server rejected the
    // password" need completely different actions, and reporting the count of candidates
    // GENERATED rather than the number actually TRIED made the last failure read like a
    // 19-address network sweep when it stopped after two.
    if (sawAuthFailure) {
      throw new Error(
        `The database answered and REJECTED the credentials — so the network route is fine and this is a password problem. ` +
        `Tried ${attempted} address(es); last error: ${msg}. ` +
        `Fix: paste the correct Postgres password into the "Try a different password" box below (used for this run only, never stored), ` +
        `or update DATABASE_URL in Railway → @kind/api → Variables. ` +
        `Note Supavisor reports the user as "postgres" even when we connect as postgres.<ref> — it splits the dot into user + tenant, so that name in the error is expected and not the problem.`,
      )
    }
    throw new Error(
      `Could not reach the database from this service. Tried ${attempted} of ${candidates.length} address(es); last error: ${msg}. ` +
      `Supabase's direct host is IPv6-only and Railway has no IPv6 route, so DATABASE_URL needs to be the ` +
      `SESSION POOLER string (postgres.<ref>@aws-0-<region>.pooler.supabase.com:5432).`,
    )
  }

  const usedFallback = working !== url
  const results: { key: string; ok: boolean; error?: string }[] = []

  for (const m of PENDING_MIGRATIONS) {
    // A fresh connection per migration so one failure cannot poison the next.
    const client = new Client({ connectionString: working, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 })
    try {
      await client.connect()
      await client.query(m.sql)
      results.push({ key: m.key, ok: true })
    } catch (e) {
      results.push({ key: m.key, ok: false, error: e instanceof Error ? e.message : String(e) })
    } finally {
      await client.end().catch(() => {})
    }
  }

  return {
    results,
    host: safeHost(working),
    usedFallback,
    hint: usedFallback
      ? `Connected via the IPv4 pooler at ${safeHost(working)} — the configured DATABASE_URL is the IPv6-only direct host and is unreachable from Railway. Set DATABASE_URL to the pooler string in Railway → @kind/api → Variables so this stops being a fallback.`
      : undefined,
  }
}
