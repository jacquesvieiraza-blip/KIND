-- ── THE CLIENT'S SIZE BAND — 25 Sep 2026 (R166 ② · board #2353, P7) ────────────────────────
--
-- R166 ②: the price per meeting is set by the client's OWN company size — 1–50 Founders,
-- 51–200 Growth, 200+ Enterprise — never chosen by the client; unknown size (free email, no
-- website, not found) → "A person reviews it". Nothing recorded a client's size.
--
-- Found once from Apollo by the client's website, or set by a person in Vida; then LOCKED, so
-- the client's price cannot move under them. A person may re-set it with a written reason.
--
-- EXPAND ONLY: nullable columns, no default, no backfill.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS size_band           text,
  ADD COLUMN IF NOT EXISTS size_employees      integer,
  ADD COLUMN IF NOT EXISTS size_source         text,
  ADD COLUMN IF NOT EXISTS size_review_reason  text,
  ADD COLUMN IF NOT EXISTS size_checked_at     timestamptz,
  ADD COLUMN IF NOT EXISTS size_locked_at      timestamptz,
  ADD COLUMN IF NOT EXISTS size_set_by         text,
  ADD COLUMN IF NOT EXISTS size_note           text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_size_band_values') THEN
    ALTER TABLE public.clients ADD CONSTRAINT clients_size_band_values
      CHECK ((size_band IS NULL OR size_band IN ('founders', 'growth', 'enterprise'))
         AND (size_source IS NULL OR size_source IN ('apollo', 'person')));
  END IF;
  -- A locked band is a band, with who set it.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_size_lock_is_complete') THEN
    ALTER TABLE public.clients ADD CONSTRAINT clients_size_lock_is_complete
      CHECK (size_locked_at IS NULL OR (size_band IS NOT NULL AND size_source IS NOT NULL AND size_set_by IS NOT NULL));
  END IF;
END $$;

COMMENT ON COLUMN public.clients.size_band IS
  'R166 ②: founders (1–50) | growth (51–200) | enterprise (200+), by the client''s own company size. Locked once set.';
COMMENT ON COLUMN public.clients.size_review_reason IS
  'Why a person must set the band: free_email | no_website | domain_mismatch | not_found | lookup_failed.';
