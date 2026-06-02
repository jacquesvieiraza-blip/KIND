-- ════════════════════════════════════════════════════════════════════════════
-- SCHEMA RECONCILIATION — 3 June 2026
-- ════════════════════════════════════════════════════════════════════════════
-- WHY: A full client-journey audit found the application code reads/writes many
-- columns, constraints, and CHECK values that NO migration in the repo creates.
-- The live DB has been hand-patched over time, so some of these may already
-- exist in production — but a fresh deploy (e.g. the Render standby) would build
-- a BROKEN database, and some columns may be missing in prod too (causing the
-- silently-swallowed errors the audit found).
--
-- This script is IDEMPOTENT and NON-DESTRUCTIVE: it only ADDs columns/tables
-- (IF NOT EXISTS) and RELAXES constraints. It never drops a column or table and
-- never narrows a constraint. Safe to run repeatedly on any database.
--
-- ALSO RUN (standalone table migrations, each idempotent):
--   apps/api/src/migrations/20260602_linkedin_queue.sql      (figsy_linkedin_queue)
--   apps/api/src/migrations/20260602_human_in_loop.sql       (figsy_approval_queue + approve_before_send)
--   apps/api/src/migrations/20260602_figsy_chat_history.sql  (figsy_chat_messages)
--   apps/api/src/migrations/20260602_push_subscriptions.sql  (push_subscriptions)
--   apps/api/src/migrations/20260602_calendar_bookings.sql   (calendar_bookings)
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. figsy_campaigns.settings (jsonb) ─────────────────────────────────────
-- Campaign engine stores sequence steps, A/B config, review_required, daily
-- quota, custom prompt, etc. in settings. Without it, every campaign update /
-- sequence-save / audience-save returns 500.
alter table public.figsy_campaigns
  add column if not exists settings jsonb not null default '{}'::jsonb;

-- meetings_booked KPI (also added by 20260529_meetings_booked.sql — safe to repeat)
alter table public.figsy_campaigns
  add column if not exists meetings_booked integer not null default 0;

-- ── 2. figsy_sent_emails: created_at + status ───────────────────────────────
-- The daily-send-cap query filters on created_at; the approval queue filters on
-- status='draft'. Neither column exists in 002_figsy.sql. Missing created_at
-- means the send cron throws and NO follow-up emails go out.
alter table public.figsy_sent_emails
  add column if not exists created_at timestamptz not null default now();
alter table public.figsy_sent_emails
  add column if not exists status text not null default 'sent';
-- Backfill created_at from the existing sent_at so the cap counts history right.
update public.figsy_sent_emails
  set created_at = sent_at
  where created_at is null or created_at = '1970-01-01'::timestamptz;

-- ── 3. figsy_replies: from_name, body_text, nullable campaign_id, classification ──
-- The inbound webhook inserts from_name + body_text (don't exist) and sets
-- campaign_id = null when there's no active enrollment (column is NOT NULL).
-- The classification CHECK also rejects every value the AI actually produces
-- (hot/warm/cold/...). Any one of these makes the insert throw → reply silently
-- dropped → hot leads never surface. This is the worst client-facing failure.
alter table public.figsy_replies
  add column if not exists from_name text;
alter table public.figsy_replies
  add column if not exists body_text text;
alter table public.figsy_replies
  alter column campaign_id drop not null;

-- Widen the classification CHECK to every value the code writes. Drop the old
-- (auto-named) constraint if present, then add the inclusive one.
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'figsy_replies_classification_check'
  ) then
    alter table public.figsy_replies drop constraint figsy_replies_classification_check;
  end if;
end $$;

alter table public.figsy_replies
  add constraint figsy_replies_classification_check
  check (classification is null or classification in (
    'hot','warm','cold',
    'interested','not_interested',
    'opt_out','unsubscribe',
    'out_of_office','wrong_person','referral','other'
  ));

-- ── 4. credit_transactions.type — widen CHECK to match the code ─────────────
-- Code writes 'trial_bonus','referral_bonus','usage','credit_purchase' which the
-- original CHECK rejects → the credit LEDGER silently diverges from the balance.
-- (Balance is updated separately, so money still "works", but the audit trail
-- is wrong — bad for reconciliation and trust.)
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'credit_transactions_type_check'
  ) then
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
    'manual_grant','refund'
  ));

-- ── 5. icps.intent_signals ──────────────────────────────────────────────────
-- ABM organization_names + settings already have migrations; intent_signals does
-- not. Without it, selected funding/hiring intent filters are silently dropped
-- on save and never reach the Apollo search.
alter table public.icps
  add column if not exists intent_signals jsonb not null default '[]'::jsonb;
-- belt-and-suspenders (these have their own migrations, but IF NOT EXISTS is safe)
alter table public.icps
  add column if not exists organization_names jsonb not null default '[]'::jsonb;
alter table public.icps
  add column if not exists settings jsonb not null default '{}'::jsonb;

-- ── 6. leads.delivered_at ───────────────────────────────────────────────────
-- The drip system meters delivery + charges credits via delivered_at. Confirm it
-- exists so the (forthcoming) client-facing delivery gate has a column to read.
alter table public.leads
  add column if not exists delivered_at timestamptz;
