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

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'icp_run_outcomes_status_check') then
    alter table public.icp_run_outcomes drop constraint icp_run_outcomes_status_check;
  end if;
end $$;

alter table public.icp_run_outcomes
  add constraint icp_run_outcomes_status_check
  check (status in ('served','no_match','quota_exhausted','demo','audience_exhausted'));
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
]

// Runs the statements against DATABASE_URL. Uses node-postgres because the Supabase JS
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
