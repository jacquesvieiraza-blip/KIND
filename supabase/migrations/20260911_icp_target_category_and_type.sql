-- ── MVP1 (C04, C21) — THE CLIENT'S OWN WORDS, AND THE TARGET'S ORGANISATIONAL FORM ──────
--
-- 🛑 WHAT WAS BROKEN. `icps.industries` was the ONLY place a target market could be recorded,
-- and it is a CLOSED SIXTEEN-VALUE LIST (Fintech, Healthtech, E-commerce, SaaS, Logistics,
-- Agriculture, Education, Manufacturing, Real Estate, Media, Consulting, Retail, Banking,
-- Insurance, Telecoms, Energy). A client who said "digital marketing agencies" had no home
-- for that phrase: the model either mapped it onto whichever of the sixteen seemed nearest —
-- substituting a vocabulary nobody agreed — or omitted the field, in which case the ICP
-- stored `industries: []` and the structural-fit gate returned 'yes' for every row on earth.
--
-- ⚠️ TWO COLUMNS, BECAUSE THEY ARE TWO FACTS (founder-locked).
--   · target_category     — what kind of market or business to target, IN THE CLIENT'S OWN
--                           WORDS, exactly as they said it. Authoritative. Provider taxonomy
--                           never replaces it; normalisation happens only at the provider edge.
--   · target_company_type — the organisational form of the TARGET company: agency,
--                           consultancy, clinic, recruitment firm, SaaS company. NOT a legal
--                           entity form, NOT the client's own industry, NOT a provider label,
--                           and never a model guess with no client evidence behind it.
--
-- One client utterance may supply both — "digital marketing agencies" carries the category
-- and, through the word "agencies", the type. They are still stored separately, because a
-- client who said only "digital marketing" has the first and not the second.
--
-- ⚠️ ADDITIVE AND NON-DESTRUCTIVE. `industries` is untouched and keeps doing its job as the
-- provider-edge hint that PDL and Apollo bodies already read. Nothing is dropped, nothing is
-- renamed, no data is rewritten, and there is no backfill: existing rows keep NULL, which
-- reads correctly as "this fact was never collected".
--
-- ⚠️ DEPLOYMENT ORDERING MATTERS. `icpSchema` now carries both fields and the client ICP save
-- writes them in its insert payload, so this migration must be applied BEFORE the code that
-- writes them ships. Same expand/contract rule as `clients.commercial_model`.
--
-- Idempotent: safe to re-run.

ALTER TABLE public.icps
  ADD COLUMN IF NOT EXISTS target_category     text,
  ADD COLUMN IF NOT EXISTS target_company_type text;

COMMENT ON COLUMN public.icps.target_category IS
  'MVP1 brief fact 5 — the kind of market/business to target, in the CLIENT''S OWN WORDS. Never a provider label; never rewritten by normalisation.';
COMMENT ON COLUMN public.icps.target_company_type IS
  'MVP1 brief fact 7 — the organisational form of the TARGET company (agency, consultancy, clinic...). Set only from client evidence, never inferred.';
