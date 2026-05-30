-- ─────────────────────────────────────────────────────────────────────────────
-- Helper query (NOT a schema migration — read-only SELECT, safe to run anytime)
-- Date: 2026-05-30
--
-- Companion to 20260530_consent_token.sql. After the consent-token security fix
-- deploys, any consent email already sent carries the OLD lead-UUID token, which
-- no longer validates. This query lists the leads stuck in `consent_sent` that
-- need a fresh consent email (the resend endpoint mints a new secure token).
--
-- Run it, review per client, then trigger a resend for the returned lead ids
-- (e.g. POST /leads/:id/resend-consent, or POST /leads/bulk-consent).
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  l.id                          AS lead_id,
  l.client_id,
  c.company_name,
  l.email,
  l.first_name,
  l.last_name,
  l.status,
  l.consent_sent_at,
  -- Was this lead's link generated under the old (UUID) scheme? Tokens minted by
  -- the new code are 64 hex chars; the backfill also produced 64-char tokens, so
  -- length alone can't tell them apart — every consent_sent lead predating the
  -- deploy should be resent regardless.
  (l.consent_token IS NULL)     AS missing_token
FROM public.leads l
LEFT JOIN public.clients c ON c.id = l.client_id
WHERE l.status = 'consent_sent'   -- sent, but no give/opt-out response yet
  AND l.email IS NOT NULL          -- can only resend if we have an address
ORDER BY l.client_id, l.consent_sent_at DESC NULLS LAST;

-- Count by client (uncomment to see resend volume per client):
-- SELECT l.client_id, c.company_name, COUNT(*) AS pending_resend
-- FROM public.leads l
-- LEFT JOIN public.clients c ON c.id = l.client_id
-- WHERE l.status = 'consent_sent' AND l.email IS NOT NULL
-- GROUP BY l.client_id, c.company_name
-- ORDER BY pending_resend DESC;
