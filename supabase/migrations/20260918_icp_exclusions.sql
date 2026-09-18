-- ── icps.exclusions — WHO THE CLIENT ASKED US TO LEAVE OUT (MVP1 · J5-C12 · FD-1) ─────
--
-- Canonical copy. The executable copy is the `20260918_icp_exclusions` entry in
-- `apps/api/src/lib/pending-migrations.ts`, which is the only sanctioned way to run it (O3).
--
-- 🛑 THIS COLUMN IS ALREADY BEING WRITTEN AND DOES NOT EXIST. `lib/promotion.ts` (J4-C1)
-- includes `exclusions` in the core-ICP insert whenever the confirmed brief holds it — and
-- brief fact #10 is REQUIRED by `mayConfirmBrief`, so every promoted client holds it. A
-- Postgres insert naming a column that does not exist fails the whole statement, so server-
-- owned promotion could not create an ICP at all. Found by `schema-truth.test.ts`, which
-- exists for exactly this and caught it before the branch shipped.
--
-- WHAT IT IS FOR. FD-1: the client's own exclusions are canonical ON THE ICP, and a semantic
-- match is set aside with a reason in every path. `proof-fit.ts`'s seventh hard criterion
-- reads this column; before it, the sentence was stored only in `figsy_knowledge.bad_fit`
-- (the copywriter's input) and in the brief draft, and NO GATE READ EITHER — a client who
-- said "not recruitment agencies" could have one sourced, surfaced, approved and emailed.
--
-- ⚠️ ONE `text`, NOT A LIST. That is how a person answers the question: "no recruitment
-- agencies, nothing in gambling, and not our competitors." Splitting it into phrases is the
-- reader's job, not the schema's, and asking a client to structure it would be asking them to
-- speak our language.
--
-- ⚠️ EXPAND ONLY (XC-11). Nullable, NO DEFAULT, NO BACKFILL. NULL means "not stated" and every
-- candidate passes the criterion, which is exactly the behaviour of every ICP written before
-- today. Nothing is altered, dropped or rewritten.
-- ⚠️ IDEMPOTENT. `add column if not exists`; re-running is harmless.

ALTER TABLE public.icps ADD COLUMN IF NOT EXISTS exclusions text;

COMMENT ON COLUMN public.icps.exclusions IS
  'MVP1 J5-C12 / FD-1. The client''s own words for who NOT to contact, as one sentence. Read by proof-fit.ts''s `excluded` hard criterion, which sets a matching candidate aside with a reason in every path (sourcing gate, review desk, pool reuse). NULL means not stated and refuses nobody.';
