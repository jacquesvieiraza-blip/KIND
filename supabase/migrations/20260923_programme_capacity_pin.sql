-- ── THE CAPACITY A CLIENT CHOSE AGAINST, PINNED — 23 Sep 2026 (MVP1 stage 3) ────────────
--
-- ── WHAT WAS MISSING, AND IT WAS THE HALF THAT MAKES THE CAP REAL ───────────────────────
--
-- R136 (PR B) bound the meetings slider to the pool's committed capacity. That was the BROWSER.
-- `POST /my/programme/choose` took `meetings` from the request body and priced it without ever
-- asking whether the pool could carry it -- so a client, or anyone with a terminal, could buy a
-- hundred meetings against a pool that carries three. The stage-flow document names exactly
-- this: "Today a client can buy a hundred meetings against a four-thousand-person market and
-- the calculator will price it." The slider stopped it on screen; nothing stopped it anywhere
-- that mattered.
--
-- `chooseProgramme` now refuses a target above capacity, and records here WHAT CAPACITY THE
-- CLIENT CHOSE AGAINST. Without the pin, "the pool could carry this" is a claim recomputed later
-- against a pool that has moved -- people get worked, exclusions get added, the provider's count
-- changes -- and nobody could say afterwards whether the target was sellable when it was sold.
--
-- ── THE TWO COLUMNS, AND THE ONE STATE THAT IS ALLOWED TO LOOK INCOMPLETE ───────────────
--
--   committed_capacity  NULL, capacity_pinned_at NULL   -> chosen before this existed
--   committed_capacity  N,    capacity_pinned_at T      -> chosen against a known pool of N
--   committed_capacity  NULL, capacity_pinned_at T      -> chosen while the pool was UNKNOWN
--
-- ⚠️ THE THIRD ROW IS DELIBERATE. An unreachable provider refuses nothing (the same rule the
-- slider follows: capping a paying client at zero because a vendor was slow is the worse
-- failure), and recording the moment WITHOUT a number is what lets an operator later tell
-- "chosen blind" from "chosen before we checked". Forbidding it would erase that difference.
--
-- 🛑 A NUMBER WITH NO MOMENT IS REFUSED. A capacity nobody can place in time cannot be compared
-- against anything, which is the whole point of pinning it.
--
-- Single-step, idempotent (IF NOT EXISTS throughout). Safe to re-run.

ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS committed_capacity int;

ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS capacity_pinned_at timestamptz;

DO $$ BEGIN
  ALTER TABLE public.programmes
    ADD CONSTRAINT programmes_committed_capacity_non_negative
    CHECK (committed_capacity IS NULL OR committed_capacity >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.programmes
    ADD CONSTRAINT programmes_committed_capacity_dated
    CHECK (committed_capacity IS NULL OR capacity_pinned_at IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
