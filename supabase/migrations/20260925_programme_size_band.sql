-- ── THE BAND A PROGRAMME WAS PRICED ON — 25 Sep 2026 (R166 ① ④ · board #2354, P8) ───────────
--
-- R166 ①: new programmes are priced flat per qualified meeting by the client's own size band —
-- Founders $99 · Growth $199 · Enterprise $299 — and ④ stop at 300 / 300 / 400 people per
-- meeting. Programmes already running keep the terms they bought (the R81 curve, 400).
--
-- The programme row already stores its own price_per_meeting_cents and sourcing_ceiling; this
-- records WHICH terms produced them, so every later calculation (the shortfall credit above
-- all) reads the programme's own terms and never re-derives them from a curve.
--
-- EXPAND ONLY: nullable, no default, no backfill. NULL = priced on the R81 curve.
ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS size_band text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'programmes_size_band_values') THEN
    ALTER TABLE public.programmes ADD CONSTRAINT programmes_size_band_values
      CHECK (size_band IS NULL OR size_band IN ('founders', 'growth', 'enterprise'));
  END IF;
END $$;

COMMENT ON COLUMN public.programmes.size_band IS
  'R166: the band this programme was priced on (founders $99 · growth $199 · enterprise $299 per qualified meeting). NULL = the R81 curve.';
