-- ═══════════════════════════════════════════════════════════════════════════════════════
-- ONE AUTOMATIC WELCOME EMAIL PER CLIENT — a durable claim, and truthful send state.
-- (S1-AUDIT-006 · R120.)
--
-- ── THE DEFECT, AND IT IS LIVE ─────────────────────────────────────────────────────────
--
-- `routes/auth.ts` calls `sendWelcomeEmail(user.email!, profileFields.company_name)` OUTSIDE
-- the `if (!existing)` block that guards the founder alert immediately below it. A second
-- `POST /auth/onboard` for the same user takes the UPDATE branch (an existing client is
-- found), the draft gate stands aside because the draft is already promoted, and the welcome
-- email SENDS AGAIN. A double-click, a refresh, an offline retry and two concurrent tabs all
-- land there. Nothing anywhere records that the email was already sent.
--
-- ── THE AUTHORITY IS A DURABLE CLAIM, NEVER THE SCREEN ─────────────────────────────────
--
-- `welcome_email_claimed_at` is taken by a conditional UPDATE:
--
--     update clients set welcome_email_claimed_at = now(), welcome_email_payload_hash = $2
--      where id = $1 and welcome_email_claimed_at is null
--     returning id
--
-- Zero rows means somebody else holds it: do not send. One row means this process holds the
-- exclusive right to send. The database is the authority, exactly as it is for the proof
-- review handoff and `claimCalibratedRestart`.
--
-- ── 🛑 CLAIMED IS NOT SENT, AND THE COLUMN NAMES NOW SAY SO ───────────────────────────
--
-- An earlier cut of this used `welcome_email_sent_at` as the PRE-SEND claim. That is false
-- state: it records a send that has not happened, and it is the #338 phantom-send class in a
-- new costume. `sent_at` is now written ONLY when Resend returns a message id — new or cached
-- — and a CHECK constraint enforces it rather than trusting six callers to remember.
--
--     NO PROVIDER MESSAGE ID  =>  NO POSITIVE `sent` ASSERTION.
--
-- A 409, a 500, a timeout and a socket drop are NOT evidence of delivery.
--
-- ── THE 24-HOUR TRUTH (R120, founder-approved) ─────────────────────────────────────────
--
-- Resend retains an idempotency key for 24 HOURS. Inside that window an ambiguous outcome is
-- retried with the SAME key (`welcome:<clientId>`) and a payload proven identical by
-- `welcome_email_payload_hash`, and the provider returns the same email id rather than sending
-- again. AFTER the window the key is gone, so a resend would be UNPROTECTED: the state becomes
-- `unresolved_expired`, no automatic send happens, THE CLAIM IS NOT RELEASED, and a human is
-- shown it. A provider's retention expiring is not a reason to risk a duplicate.
--
-- ⚠️ NO BACKFILL. Every existing client reads NULL. Unlike `proof_passes_legacy` — where NULL
-- must REFUSE, because guessing there hands out free provider spend — NULL here is the safe
-- direction: the worst case is one extra welcome to a long-standing client who re-onboards,
-- and no existing client is re-onboarding in MVP1. The asymmetry between the two migrations is
-- deliberate.
--
-- ADDITIVE AND IDEMPOTENT. Five nullable columns and three guarded CHECKs. No data mutated.
--
-- Also carried as a string in apps/api/src/lib/pending-migrations.ts (key
-- '20260912_welcome_email_once') and run from Vida -> Engine. Keep the two in step.
-- ═══════════════════════════════════════════════════════════════════════════════════════

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

-- ── 🛑 NO MESSAGE ID => NO `sent`. STRUCTURAL, NOT A CONVENTION. ──────────────────────
-- Guarded on pg_constraint rather than DROP + ADD: ADD CONSTRAINT ... CHECK takes an ACCESS
-- EXCLUSIVE lock and revalidates the whole table, so DROP/ADD would pay that on every run of
-- the ledger-less migration runner AND leave a window with no constraint at all.
-- SAFE ON A POPULATED TABLE: the columns are added NULL with no default and no backfill, so
-- every existing row short-circuits each predicate and validation cannot fail.
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

-- The operator surface reads "welcome emails that need a human" — a small, bounded set that
-- must never require a table scan of every client. Partial, because the overwhelming majority
-- of clients are either NULL (never claimed) or a clean `sent`.
create index if not exists clients_welcome_email_unresolved_idx
  on public.clients (welcome_email_outcome, welcome_email_claimed_at)
  where welcome_email_outcome in ('in_progress','ambiguous','payload_conflict','unresolved_expired');
