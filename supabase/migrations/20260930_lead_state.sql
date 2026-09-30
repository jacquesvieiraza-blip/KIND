-- ── A PROSPECT'S STATE — 30 Sep 2026 (board #2473) ─────────────────────────────────────────
--
-- House's first sends were held all morning: every prospect is in the United States and none had
-- a state on file, so the send window had to be open in EVERY US zone at once (Honolulu to New
-- York) — only 18:30–21:00 UTC. Apollo's reveal already returns the person's state; nothing kept
-- it. With it stored, a New York prospect is judged on New York time.
-- The founder: "i want this fixed whatever it is".
--
-- EXPAND ONLY: one nullable text column, no default, no backfill. A lead without a state keeps
-- exactly today's behaviour (the whole-country window).
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS state text;

COMMENT ON COLUMN public.leads.state IS
  'The prospect''s state or region as the provider returned it (e.g. "New York"). Read by the send window so each prospect is emailed in their own time zone.';
