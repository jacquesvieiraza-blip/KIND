-- ── ONE PAYMENT IN FULL MAY BE WRITTEN — 28 Sep 2026 (R166 ③ · P9 fix) ─────────────────────
--
-- Found on the founder's end-to-end walk: every new client on the band prices was refused at
-- "Accept" with `new row for relation "programmes" violates check constraint
-- "programmes_positive_check"`. P9 (25 Sep) prices a band programme as ONE payment — the whole
-- total at P1 and 0 at P2 (founder: "one payment in. run bang") — but the 28 Aug rule still
-- demanded `second_payment_cents > 0`. P9 said "No migration"; that was wrong.
--
-- The rule is REPLACED, not weakened: every term stays exactly as it was except that the second
-- payment may be 0. `programmes_payment_split_check` (first + second = total) is untouched, so a
-- 0 second payment still means the first carries the whole total, and nothing can be undercharged.
-- New name, because one constraint has one owning migration (constraint-ownership.test.ts).
ALTER TABLE public.programmes DROP CONSTRAINT IF EXISTS programmes_positive_check;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'programmes_positive_one_payment_check') THEN
    ALTER TABLE public.programmes ADD CONSTRAINT programmes_positive_one_payment_check CHECK (
      meeting_target > 0 AND recommended_volume > 0
      AND price_per_meeting_cents > 0 AND price_total_cents > 0
      AND first_payment_cents > 0 AND second_payment_cents >= 0
      AND sourcing_ceiling >= 0 AND sourced_used >= 0 AND sourced_reserved >= 0
      AND make_whole_cents >= 0
    );
  END IF;
END $$;
