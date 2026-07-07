-- 20260707_money_integrity.sql
-- M0 money-integrity pass. Makes FIGSY enrollment charging FAIL-CLOSED.
--
-- Run on STAGING first (kind-staging), then PRODUCTION (confirm the Supabase
-- project name first).

-- ── try_charge_figsy_credit — the decrement IS the gate ──────────────────────
-- Previously enrollment did gate-then-charge: canEnroll() checked the balance,
-- THEN increment_figsy_credits(-1) decremented (clamping at 0 via GREATEST).
-- Two money bugs lived in that gap:
--   1. Balance-1 race — two concurrent enrolls both pass the >=1 gate, both
--      decrement, and the GREATEST(0, …) clamp SILENTLY swallows the second
--      overdraw: two leads enrolled, one credit charged (a free enroll).
--   2. Clamp-at-0 free enroll — any decrement at balance 0 clamps to 0 and
--      returns "success", so a lead gets enrolled for free.
-- This function makes the decrement itself the gate: a SINGLE atomic conditional
-- UPDATE that only decrements when the balance is still >= 1, and reports via
-- FOUND whether it actually charged. No credit → no charge → caller aborts.
CREATE OR REPLACE FUNCTION try_charge_figsy_credit(
  p_client_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.clients
    SET figsy_credits_remaining = COALESCE(figsy_credits_remaining, 0) - 1
  WHERE id = p_client_id
    AND COALESCE(figsy_credits_remaining, 0) >= 1;

  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION try_charge_figsy_credit FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION try_charge_figsy_credit TO service_role;

-- ── low-credit warning bookkeeping (Fix 5 / #337②) ──────────────────────────
-- Timestamp of the last "you're running low on FIGSY credits" email, so the
-- daily sweep re-warns at most once per 7 days.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS low_credit_warned_at timestamptz;

-- ── referral bonus idempotency marker (#336) ────────────────────────────────
-- The referrer bonus moved off "first ICP run" (free → farmable, paid the
-- retired credit_balance wallet) to the referred client's FIRST PURCHASE, paid
-- in FIGSY credits. This timestamp on the REFERRED client's row is the single
-- idempotency guard: an atomic conditional UPDATE claims it only while null, so
-- the referrer is paid exactly once no matter how many purchases or webhook
-- retries follow.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS referral_bonus_paid_at timestamptz;

-- ── P7: figsy_enrollments (campaign_id, lead_id) uniqueness — race-safety index ─
-- Two concurrent enrolls of the same lead into the same campaign (webhook re-fire,
-- cron overlap, manual re-run) both pass the app-layer "already enrolled?" SELECT
-- before either INSERT lands — a classic TOCTOU that double-charges (two credits,
-- two enrollment rows, two sends). The app guard cannot close that window; only a
-- DB unique index can. With the index in place the second concurrent insert fails,
-- and the refund path (refundFigsyEnroll) self-heals the credit that was charged.
-- Staging already has this as a table-level UNIQUE(campaign_id, lead_id); PROD needs
-- it added here.
--
-- Dedupe first (a plain CREATE UNIQUE INDEX would fail if duplicates already exist):
-- keep the earliest row per (campaign_id, lead_id), delete the rest.
DELETE FROM public.figsy_enrollments a
USING public.figsy_enrollments b
WHERE a.campaign_id = b.campaign_id
  AND a.lead_id     = b.lead_id
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS figsy_enrollments_campaign_lead_uidx
  ON public.figsy_enrollments(campaign_id, lead_id);
