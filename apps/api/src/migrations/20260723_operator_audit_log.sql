-- #486 — OPERATOR AUDIT LOG (Vida operator console).
-- Every state-changing action an operator takes on a client's behalf from Vida
-- (approve-on-behalf, reveal, enroll, send-now, pause, suppression change) writes
-- one immutable row here. The operator's email is set SERVER-SIDE from the admin
-- Supabase session (never trusted from the client), so this is a real accountability
-- trail for "who did what to which client".
--
-- Idempotent + additive: CREATE ... IF NOT EXISTS, safe to re-run. Service-role only
-- (the API writes/reads it via the service key; operators view it through the
-- admin-key-gated /admin/operator-audit route) — no RLS client policy needed because
-- no client ever queries this table directly.

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

-- Newest-first reads, and per-client filtering in the Vida audit viewer.
CREATE INDEX IF NOT EXISTS operator_audit_log_created_idx
  ON public.operator_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS operator_audit_log_client_idx
  ON public.operator_audit_log (client_id, created_at DESC);

-- #487 — "pass" (✕ not-a-fit) is a real terminal state for a masked, un-approved lead.
-- Add the column + widen the leads.status CHECK to allow it (Postgres can't ALTER a
-- CHECK — drop + re-add, carrying the full existing allow-list forward so nothing that
-- is already valid becomes invalid). Idempotent: IF NOT EXISTS / IF EXISTS throughout.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS passed_at timestamptz;

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_status_check
    CHECK (status IN (
      'pending', 'scored', 'contacted', 'consent_sent', 'consent_given',
      'exported', 'rejected', 'opted_out', 'passed'
    ));
