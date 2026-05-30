-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: public share token for client report pages
-- Date:      2026-05-30
--
-- The /share/<token> public report page needs to resolve a token to a client
-- without auth. Add an unguessable per-client `share_token`; the public
-- /share/:token API endpoint looks the client up by it and returns aggregated
-- outreach metrics.
--
-- New clients get a token by default; existing rows are backfilled. The token is
-- 64 hex chars (two CSPRNG UUIDs) — same format/strength as consent tokens, no
-- extra extension required. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS share_token TEXT
  DEFAULT (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''));

-- Backfill any rows created before the default existed.
UPDATE public.clients
SET share_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE share_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS clients_share_token_key ON public.clients (share_token);
