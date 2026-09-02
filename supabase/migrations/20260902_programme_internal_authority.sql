-- ── INTERNAL PROGRAMME AUTHORITY (House / Client Zero, 2 Sep 2026) ──────────────────────
--
-- ⚠️ THIS FILE IS THE CANONICAL COPY AND IT DOES NOT RUN. The only thing that executes a
-- migration in this product is `PENDING_MIGRATIONS` in apps/api/src/lib/pending-migrations.ts,
-- run by the founder from Vida → Engine → Run. A .sql file on disk LOOKS applied and is not:
-- that mistaken reading is #383, where an RPC sat here for 33 days doing nothing.
-- This statement is registered there under key `20260902_programme_internal_authority`.
--
-- ── ⚑ SHIPPED AHEAD OF ITS APPLICATION CODE, ON PURPOSE (PR A1, expand/contract) ─────────
--
-- 🛑 THE ORDER IS FORCED BY THE RUNNER, NOT CHOSEN FOR NEATNESS. `PENDING_MIGRATIONS` is a
-- TypeScript constant compiled into the DEPLOYED API, so a migration can NEVER be applied
-- before the build that carries it. Shipping these columns together with the code that reads
-- them would therefore have guaranteed a window — between the API going live and a human
-- pressing Run — in which every explicit `programmes` select named a column the database did
-- not have. PostgREST answers that with `42703`/`PGRST204`, and the authority reads fail
-- CLOSED: outreach refused, the Vida programme panel unable to render. So the schema ships
-- first, alone, and the readers follow in a second PR once these columns exist.
--
-- ⚠️ AT THE MOMENT THIS FILE LANDS, NOTHING IN THE APPLICATION READS OR WRITES EITHER COLUMN.
-- That is the property that makes it safe to deploy against the CURRENT product: two nullable
-- columns with no default and no backfill, and two CHECKs that every existing row satisfies
-- trivially because `*_authorised_at IS NULL` short-circuits the OR. The deployed product
-- behaves exactly as it did before.
--
-- WHAT THIS IS FOR. House is Client Zero — a real internal launch canary that must walk the
-- SAME programme lifecycle a paying customer walks (Proof → Recommendation → P1 → sourcing →
-- review → ONE client approval → P2 → Live) while paying nothing.
--
-- 🛑 WHY NOT JUST SET `first_paid_at`. That column is simultaneously the sourcing key AND the
-- revenue trigger: `computeContribution` reads `(first_paid_at ? first_payment_cents : 0)`,
-- and a partner's commission derives from that figure. Authorising House by stamping it would
-- have invented revenue, an invoice figure and a commission on an account that has paid
-- nothing — the exact class of fake money the founder ruled out. Authority and payment are
-- therefore SEPARATE facts, and only payment is money.
--
-- ⚠️ NULLABLE, NO DEFAULT — the #599 precedent. A DEFAULT would stamp every historic row with
-- an authority it never had, and every existing programme is legitimately NULL here.
--
-- ⚠️ PER-STAGE, NOT PER-PROGRAMME. P1 and P2 are separate acts weeks apart, and a real
-- programme can hold one of each: a House programme internally authorised at P1 that later
-- takes a genuine payment at P2 is a legitimate state. One programme-level `authority_source`
-- column could not describe it. Two timestamps can.

ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS first_authorised_at  timestamptz,
  ADD COLUMN IF NOT EXISTS second_authorised_at timestamptz;

COMMENT ON COLUMN public.programmes.first_authorised_at IS
  'Internal P1 authority (House / Client Zero). Set ONLY by the operator route, never by Stripe. Carries no money: no first_paid_at, no first_payment_ref, and computeContribution never reads it.';
COMMENT ON COLUMN public.programmes.second_authorised_at IS
  'Internal P2 authority. Does NOT make the programme live — went_live_at is a separate, explicit founder action.';

-- ── PER-STAGE XOR, CREATED ONLY IF MISSING ───────────────────────────────────────────────
--
-- ⚠️ NOT "DROP CONSTRAINT IF EXISTS; ADD CONSTRAINT". The runner has no ledger and executes
-- every entry on every run, and `ADD CONSTRAINT ... CHECK` takes an ACCESS EXCLUSIVE lock and
-- revalidates the whole table. Dropping and re-adding would pay that cost on each run AND
-- leave a window with no constraint at all, during which a concurrent write could insert the
-- very row that then makes the re-ADD fail. The RLS policies elsewhere in this file use
-- DROP/CREATE safely because a policy is catalogue-only; a CHECK is not.
--
-- SAFE ON A POPULATED TABLE: both columns are added NULL with no default and no backfill, so
-- `*_authorised_at IS NULL` short-circuits the OR for every existing row.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.programmes'::regclass
       AND conname  = 'programmes_p1_authority_xor'
  ) THEN
    ALTER TABLE public.programmes
      ADD CONSTRAINT programmes_p1_authority_xor CHECK (
        first_authorised_at IS NULL
        OR (first_paid_at IS NULL
            AND first_payment_ref IS NULL
            AND first_payment_intent_id IS NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.programmes'::regclass
       AND conname  = 'programmes_p2_authority_xor'
  ) THEN
    ALTER TABLE public.programmes
      ADD CONSTRAINT programmes_p2_authority_xor CHECK (
        second_authorised_at IS NULL
        OR (second_paid_at IS NULL
            AND second_payment_ref IS NULL
            AND second_payment_intent_id IS NULL)
      );
  END IF;
END $$;
