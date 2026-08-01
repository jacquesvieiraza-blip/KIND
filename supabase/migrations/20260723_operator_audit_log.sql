-- ═══════════════════════════════════════════════════════════════════════════════
-- CONSOLIDATED HERE 31 Jul 2026 (#273) — original: apps/api/src/migrations/20260723_operator_audit_log.sql
-- ═══════════════════════════════════════════════════════════════════════════════
-- The SQL below this header is BYTE-IDENTICAL to the original. Nothing was rewritten,
-- reordered or "fixed" on the way in: a migration that has (or has not) been applied to
-- production is a historical fact, and editing it while copying would destroy the only
-- record of what was actually run.
--
-- The original file still exists and carries a tombstone header pointing here. A test
-- (`migration-home.test.ts`) asserts the two bodies stay identical, so editing one copy
-- without the other fails the gate — which is the duplication risk turned into a guard.
-- ═══════════════════════════════════════════════════════════════════════════════

-- #486 — OPERATOR AUDIT LOG (Vida operator console) + #487 'passed' lead state.
--
-- ⚠️ PROD REALITY (learned on first run, 23 Jul): leads.status is an ENUM (lead_status),
-- NOT text-with-CHECK as supabase/migrations/20260525 assumed — that CHECK migration
-- evidently never applied to prod. So 'passed' is added as an ENUM VALUE, and there is
-- NO check constraint to (re)create: the enum itself is the guard.
--
-- RUN IN TWO STEPS in the Supabase SQL editor:
--   Step 1 (alone):  the ALTER TYPE line — a new enum value can't be used in the same
--                    transaction that adds it.
--   Step 2:          everything else.
-- Idempotent: IF NOT EXISTS throughout — safe to re-run.

-- ── STEP 1 (run alone) ────────────────────────────────────────────────────────
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'passed';
-- Pre-existing prod bug exposed by this migration's first run: the enum also lacks
-- 'opted_out', yet SIX code sites write leads.status='opted_out' (POPIA decline +
-- unsubscribe) — those updates have failed silently on prod since the enum was created.
-- Compliance was never at risk (the opt_out_blocklist upsert succeeds and the send
-- chokepoint checks it per send) — but opted-out leads kept a stale status in every
-- view. This makes the existing code work as designed:
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'opted_out';

-- ── STEP 2 ────────────────────────────────────────────────────────────────────
-- Every state-changing action an operator takes on a client's behalf from Vida
-- (approve-on-behalf, reveal, enroll, send-now, pause, suppression change) writes
-- one immutable row here. The operator's email is set SERVER-SIDE from the admin
-- Supabase session (never trusted from the client). Service-role only — no client
-- RLS policy needed because no client ever queries this table directly.
CREATE TABLE IF NOT EXISTS public.operator_audit_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_email text NOT NULL,
  client_id      uuid,
  action         text NOT NULL,
  subject_type   text,
  subject_id     text,
  detail         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS operator_audit_log_created_idx
  ON public.operator_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS operator_audit_log_client_idx
  ON public.operator_audit_log (client_id, created_at DESC);

-- #487 — "pass" (✕ not-a-fit) timestamp for a masked, un-approved lead.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS passed_at timestamptz;
