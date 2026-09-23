-- ── THE SHORTFALL CREDIT — FOUNDER RULING, 23 Sep 2026 (R136 ④) ───────────────────────
--
-- His words, verbatim:
--
--     "no. we dont give money back. we refund credits to their wallet internally to use
--      towards another icp run."
--
-- ── WHAT THIS IS FOR ────────────────────────────────────────────────────────────────────
--
-- R136 removed the overrun promise: we work to `meetings x 400` and then we stop, so a
-- programme may end having delivered fewer meetings than were bought. The founder also ruled
-- that a client "pays for what they receive" — so a programme that stops short owes the
-- difference back, and owes it as WALLET CREDIT rather than as money through Stripe.
--
-- ── WHY IT NEEDS ITS OWN COLUMNS AND NOT JUST `make_whole_cents` ─────────────────────────
--
-- `make_whole_cents` is an ACCUMULATOR. It is already written by `recordMakeWhole` for
-- operator-decided value, and `computeContribution` subtracts it from revenue -- which is
-- exactly the treatment a returned amount should get, so the credit adds to it and partner
-- commission stays correct with no further change (R78/R68).
--
-- But an accumulator cannot answer "has THIS programme's shortfall already been credited?".
-- Without a separate marker a retry -- a double-clicked operator button, a re-fired job --
-- would credit the wallet twice, and `increment_wallet` is not idempotent. So the marker is
-- its own column and the claim is a compare-and-set on it:
--
--   `shortfall_credited_at IS NULL` -> exactly one caller wins the right to move money.
--
-- ⚠️ AND IT IS RELEASABLE. If the wallet move or the ledger row then fails, the claim is set
-- back to NULL so the settlement is retryable -- the R132a lesson, in the founder's own words:
-- "Do not require the operator or Founder to manually edit the database." A claim that cannot
-- be handed back is a programme stuck forever with no exit.
--
-- Single-step, idempotent (IF NOT EXISTS throughout). Safe to re-run.

-- ── the marker: when this programme's shortfall was settled into the wallet ─────────────
ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS shortfall_credited_at timestamptz;

-- ── what was credited, in integer cents, for evidence rather than for arithmetic ────────
--
-- ⚠️ THE MONEY IS NOT DERIVED FROM THIS COLUMN. Contribution reads `make_whole_cents`, which
-- the credit is added to; this records what THIS settlement contributed to that total, so an
-- operator asking "what did we credit and when" gets an answer without replaying the ledger.
ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS shortfall_credit_cents int NOT NULL DEFAULT 0;

-- ── how many meetings were actually delivered when it stopped ───────────────────────────
--
-- 🛑 PERSISTED, NOT RECOMPUTED. The credit is a function of what was delivered, and meetings
-- keep being booked after a programme closes on other programmes. Re-deriving this later from
-- a live count would change a settled figure, which is the one thing a settlement may not do.
ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS delivered_meetings int;

-- ⚠️ A CREDIT IS NEVER NEGATIVE AND NEVER EXCEEDS WHAT WAS COLLECTED-ish. The upper bound is
-- not expressible here (it depends on payments), so only the floor is a constraint; the
-- arithmetic bound lives in `shortfallCreditCents`, which clamps at zero and is tested.
DO $$ BEGIN
  ALTER TABLE public.programmes
    ADD CONSTRAINT programmes_shortfall_credit_non_negative
    CHECK (shortfall_credit_cents >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 🛑 MONEY CREDITED MUST CARRY THE MOMENT IT WAS CREDITED. A non-zero amount with no timestamp
-- is a settlement nobody can audit, and it is the shape a half-failed write produces.
--
-- ⚠️ NOT THE STRICTER `(credited_at IS NULL) = (cents = 0)`, WHICH WAS WRONG AND WOULD HAVE
-- FAILED IN PRODUCTION. A programme that delivered everything it sold is still SETTLED -- it
-- simply owes nothing -- and that state is a timestamp with a zero amount. Forbidding it would
-- have refused the settlement of every successful programme, leaving exactly the healthy ones
-- unable to close.
DO $$ BEGIN
  ALTER TABLE public.programmes
    ADD CONSTRAINT programmes_shortfall_credit_dated
    CHECK (shortfall_credit_cents = 0 OR shortfall_credited_at IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
