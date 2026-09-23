-- ── WALLET CREDIT APPLIED TO A PROGRAMME PAYMENT — FOUNDER RULING, 23 Sep 2026 (R136 ④) ──
--
-- The second half of the shortfall ruling. `20260923_programme_shortfall_credit` records what a
-- short programme credited BACK; this records what a later programme paid FOR with that credit.
--
-- ── 🛑 THE DEFECT THIS EXISTS TO PREVENT, AND IT IS A DOUBLE COUNT ──────────────────────
--
-- `computeContribution` reads revenue off the programme ROW:
--
--     (first_paid_at ? first_payment_cents : 0) + (second_paid_at ? second_payment_cents : 0)
--
-- Those columns are what was OWED, fixed when the programme was created. Today that is also
-- what was RECEIVED, because every cent arrives through Stripe -- so the distinction has never
-- mattered. Wallet credit is the first thing that separates them, and separates them silently:
--
--   Programme 1: client pays $4,375, we deliver 7 of 10, $1,312 is credited back.
--                Revenue correctly reads $3,063, because `make_whole_cents` subtracts it.
--   Programme 2: price $4,375. The client pays $3,063 in cash and $1,312 from the wallet.
--                Revenue would read $4,375 -- the full owed figure -- when $3,063 arrived.
--
-- The $1,312 is counted as revenue TWICE: once in P1 before it was given back, and again in P2
-- when it was spent. Nothing throws. Contribution is overstated, and PARTNER COMMISSION is 25%
-- of contribution (R78), so a partner is paid on money that never came in. That is the R68
-- shape exactly -- one number living in two places, moving in one of them.
--
-- 🛑 FOUNDER-RULED 23 Sep: commission follows CASH RECEIVED, not price. So the cash a programme
-- actually took is `first_payment_cents - wallet_applied_cents`, and contribution reads that.
--
-- ── WHY ONE COLUMN AND NOT TWO ──────────────────────────────────────────────────────────
--
-- Credit applies to P1 only (founder-ruled: P1 authorises sourcing, so it reduces the cost of
-- starting the next run; P2 is going live, a different promise). A second column for a stage
-- that may never take credit would be a column nothing writes and something eventually reads.
--
-- Single-step, idempotent (IF NOT EXISTS throughout). Safe to re-run.

ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS wallet_applied_cents int NOT NULL DEFAULT 0;

-- ⚠️ NEVER NEGATIVE. A negative "credit applied" would ADD to revenue, which is the double
-- count wearing a minus sign.
DO $$ BEGIN
  ALTER TABLE public.programmes
    ADD CONSTRAINT programmes_wallet_applied_non_negative
    CHECK (wallet_applied_cents >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 🛑 CREDIT MAY NEVER COVER THE WHOLE FIRST PAYMENT. Founder-ruled 23 Sep, asked directly
-- whether it could: "No." The application is capped in `walletCreditForPayment` so at least
-- MIN_CASH_PAYMENT_CENTS always goes through Stripe; this is the database saying the same
-- thing, so a future caller that forgets the cap cannot write the state anyway.
DO $$ BEGIN
  ALTER TABLE public.programmes
    ADD CONSTRAINT programmes_wallet_applied_leaves_cash
    CHECK (wallet_applied_cents = 0 OR wallet_applied_cents < first_payment_cents);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
