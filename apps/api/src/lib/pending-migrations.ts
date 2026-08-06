// PENDING MIGRATIONS — runnable from Vida, because the Supabase SQL editor is unreachable.
//
// Supabase login is GitHub OAuth and the founder's GitHub account is flagged ("cannot
// authorize a third party application"), so the dashboard cannot be opened at all. No psql,
// no Homebrew, and deliberately no new tooling. What we DO have is this API — which already
// holds DATABASE_URL — and Vida, which already talks to it behind the admin key.
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
