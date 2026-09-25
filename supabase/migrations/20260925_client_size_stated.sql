-- ── THE CLIENT'S STATED COMPANY SIZE — 25 Sep 2026 (R168 ④ · P7b, board #2353) ─────────────────
--
-- Founder: "when they sign up. they got to tell us their company name. their size. we take their
-- word for it. but we should build in a company check." — and, when the two disagree: "a".
-- Milla asks at sign-up; their answer sets the band; the company check holds the price for a
-- person only when it finds the company BIGGER.
--
-- EXPAND ONLY: two nullable columns and one new check; no default, no backfill; no existing rule changes.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS size_stated_employees integer,
  ADD COLUMN IF NOT EXISTS size_stated_at        timestamptz;

DO $$
BEGIN
  -- A band set from the client's own answer is size_source = 'person' (a human decided it) with
  -- size_set_by = 'client' — the P7 check already allows that, so no existing rule is touched.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_size_stated_positive') THEN
    ALTER TABLE public.clients ADD CONSTRAINT clients_size_stated_positive
      CHECK (size_stated_employees IS NULL OR size_stated_employees >= 1);
  END IF;
END $$;

COMMENT ON COLUMN public.clients.size_stated_employees IS
  'R168 ④: roughly how many people work at the client''s own company, as they told Milla. Sets their band; the company check holds it for a person only when it finds the company bigger.';
COMMENT ON COLUMN public.clients.size_review_reason IS
  'Why a person must set the band: free_email | no_website | domain_mismatch | not_found | lookup_failed | stated_smaller.';
