-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: audit columns — what the 6-Aug full-repo audit proved the readers need
-- Date:      2026-08-06
-- Items:     #637 #641
--
-- The audit compared every column the code names against every migration (76
-- tables). These columns are READ (and some written) by live code and CREATED by
-- nothing. Every failure was silent: supabase-js returns { error }, the call
-- sites read `.data ?? []`, and a rejected query renders exactly like an empty
-- one (#349/#565).
--
--   figsy_sent_emails.client_id  — read by the client dashboard's sent counter +
--                                  sparkline, the admin clients page and CMO
--                                  memory; written by NO send path. Without it
--                                  every one of those reads 0 FOREVER — including
--                                  after sending starts (#637).
--   figsy_sent_emails.status     — written by the demo seeders ('sent'), never
--                                  created; their inserts have been failing.
--   clients.last_low_credit_email_at — the low-credit warning cron reads AND
--                                  writes it; without it the whole select fails
--                                  and NO client is ever warned (#641①).
--   clients.last_seen_at         — churn-risk scoring reads it (falls back to
--                                  auth last_sign_in_at when null) (#641③).
--   clients.leads_per_run        — sourcing target preference; its failed read
--                                  also nulled is_demo IN THE SAME QUERY, making
--                                  the demo check in that path read false (#641②).
--   clients.contact_email        — the lookalike "best client" endpoint selects
--                                  it and THROWS on error: the admin button 500s.
--
-- NOT here, deliberately: figsy_campaigns.reply_count / enrolled_count and
-- icps.description / locations. Reading the handlers showed those are WRONG-NAME
-- selects — the real, maintained columns are replies_total / leads_enrolled and
-- geographies. Adding dead columns would have frozen the mistake; the queries
-- are fixed instead (#638 method, O8: assert the intent, not the literal).
--
-- IF NOT EXISTS everywhere: the hand-paste era may have created some of these in
-- production already — this must be correct in both worlds. Nullable, no
-- defaults: a default would stamp historic rows with a claim nobody verified
-- (#599 precedent).
--
-- Backfill: client_id is derivable for every sent email that has a campaign —
-- figsy_campaigns.client_id is NOT NULL, so the join is total for those rows.
-- Day-1 sends carry campaign_id null and stay null here; the send path now
-- writes client_id directly for everything new.
-- ─────────────────────────────────────────────────────────────────────────────

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

-- Verify
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND ((table_name = 'figsy_sent_emails' AND column_name IN ('client_id','status'))
    OR (table_name = 'clients' AND column_name IN
        ('last_low_credit_email_at','last_seen_at','leads_per_run','contact_email')))
ORDER BY table_name, column_name;
