-- ── THE SHORTFALL CREDIT: ONCE PER CLIENT, 90 DAYS — 25 Sep 2026 (R166 ⑤ · board #2357, P11) ──
--
-- R166 ⑤, from the options put to the founder: "Once only, 90 days, new programmes" — a
-- programme on the new terms earns a shortfall credit only once per client, and that credit
-- expires after 90 days. Credit already promised as "never expires" is honoured (no stamp).
--
-- The wallet is one balance; these record the once-only grant and the part of the balance that
-- expires, so the expired part is simply not spendable. Spending uses the expiring part first.
--
-- EXPAND ONLY: nullable columns, no default, no backfill. NULL = no expiring credit.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS shortfall_credit_granted_at     timestamptz,
  ADD COLUMN IF NOT EXISTS shortfall_credit_expires_at     timestamptz,
  ADD COLUMN IF NOT EXISTS shortfall_credit_expiring_cents integer;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_shortfall_credit_is_complete') THEN
    ALTER TABLE public.clients ADD CONSTRAINT clients_shortfall_credit_is_complete
      CHECK ((shortfall_credit_granted_at IS NULL) = (shortfall_credit_expires_at IS NULL)
         AND (shortfall_credit_expiring_cents IS NULL OR shortfall_credit_expiring_cents >= 0));
  END IF;
END $$;

COMMENT ON COLUMN public.clients.shortfall_credit_granted_at IS
  'R166 ⑤: when this client received their ONE new-terms shortfall credit. Set once; never again.';
COMMENT ON COLUMN public.clients.shortfall_credit_expiring_cents IS
  'The part of the wallet that stops being spendable at shortfall_credit_expires_at. Spent first.';
