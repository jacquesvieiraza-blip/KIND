-- 20260710_charge_once.sql
-- #424 — CHARGE-ONCE (founder ruling, 10 Jul).
--
-- Reveal $1 = charged ONCE PER LEAD, EVER — keyed on (client_id, normalised email),
-- NOT the lead row id. A re-sourced duplicate of the same person is a NEW leads row,
-- so the existing per-row `revealed_at` gate would charge the client $1 twice for the
-- same person. This adds a per-(client, email) reveal ledger so the second reveal is
-- free (the client already owns that contact).
--
-- Work $3 = already charged ONCE PER (campaign, lead): the enroll paths pre-filter
-- enrolled leads AND refund on conflict, backed by figsy_enrollments_campaign_lead_uidx
-- (20260707_money_integrity.sql). NO change needed on the work side — confirmed, not
-- touched here.
--
-- Design: the app keeps its existing charge/Hunter ordering (the $1 decrement stays
-- the gate before any paid Hunter lookup). AFTER the email is resolved, the app calls
-- record_reveal_or_refund() — a first reveal of an email KEEPS the charge; a repeat of
-- an email this client already owns REFUNDS the $1. reveal_is_owned() lets the app skip
-- the charge entirely when the email is already known + owned (free re-reveal at any
-- balance). A FAILED reveal (no email) never records ownership → still refundable +
-- retryable, unchanged.
--
-- Run on STAGING (kind-staging) first, then PRODUCTION.

-- ── Per-(client, email) reveal ledger ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_reveals (
  client_id   uuid        NOT NULL,
  email_norm  text        NOT NULL,
  lead_id     uuid,
  revealed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, email_norm)
);

-- Backfill: every lead already revealed (client already paid) with a real email is
-- recorded as owned, earliest reveal wins. Idempotent.
INSERT INTO public.client_reveals (client_id, email_norm, lead_id, revealed_at)
SELECT DISTINCT ON (client_id, lower(btrim(email)))
       client_id, lower(btrim(email)), id, COALESCE(revealed_at, now())
FROM public.leads
WHERE revealed_at IS NOT NULL
  AND email IS NOT NULL
  AND btrim(email) <> ''
ORDER BY client_id, lower(btrim(email)), revealed_at ASC
ON CONFLICT (client_id, email_norm) DO NOTHING;

-- ── reveal_is_owned — has this client already paid to reveal this email? ──────
-- Lets the app serve an owned email for FREE at any balance (even $0), before any
-- charge gate. Read-only.
CREATE OR REPLACE FUNCTION public.reveal_is_owned(
  p_client_id  uuid,
  p_email_norm text
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_reveals
    WHERE client_id = p_client_id AND email_norm = p_email_norm
  );
$$;

-- ── record_reveal_or_refund — post-charge, per-email idempotency reconcile ────
-- Called AFTER the $1 was charged and the email resolved. First reveal of this email
-- records ownership and KEEPS the charge ('charged'). A repeat (already owned, incl.
-- a concurrent first-reveal that beat us) REFUNDS the $1 and returns 'refunded'.
-- The INSERT ... ON CONFLICT is the atomic gate — safe under concurrent reveals.
CREATE OR REPLACE FUNCTION public.record_reveal_or_refund(
  p_client_id  uuid,
  p_email_norm text,
  p_lead_id    uuid
) RETURNS text                       -- 'charged' | 'refunded'
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.client_reveals (client_id, email_norm, lead_id)
    VALUES (p_client_id, p_email_norm, p_lead_id)
    ON CONFLICT (client_id, email_norm) DO NOTHING;

  IF FOUND THEN
    RETURN 'charged';                -- first time for this email → charge stands
  END IF;

  -- Already owned → the $1 just taken is a duplicate; return it to the wallet.
  UPDATE public.clients
    SET credit_balance = COALESCE(credit_balance, 0) + 1
    WHERE id = p_client_id;
  RETURN 'refunded';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reveal_is_owned         FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_reveal_or_refund FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.reveal_is_owned         TO service_role;
GRANT  EXECUTE ON FUNCTION public.record_reveal_or_refund TO service_role;
