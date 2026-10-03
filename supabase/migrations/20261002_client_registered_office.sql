-- ── THE CLIENT'S REGISTERED OFFICE — 2 Oct 2026 (board #2543 · R189 ⑥) ─────────────────────
--
-- R189 ⑥: a client's emails end with their own company name and registered office, given by
-- the client and checked before their programme goes live. The company name is already held
-- (`clients.company_name`); the registered office was not held anywhere.
--
-- EXPAND ONLY: one nullable text column, no DEFAULT, no backfill. Empty = not given yet.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS registered_office text;

COMMENT ON COLUMN public.clients.registered_office IS
  'The client''s registered office address, as they gave it. Printed with their company name at the bottom of their outreach emails (R189 ⑥); required before their programme goes live.';
