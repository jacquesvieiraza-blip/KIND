-- ── CLIENT COMMERCIAL MODEL (3 Sep 2026, PR C1) ─────────────────────────────────────────
--
-- ⚠️ THIS FILE IS THE CANONICAL COPY AND IT DOES NOT RUN. The only thing that executes a
-- migration in this product is `PENDING_MIGRATIONS` in apps/api/src/lib/pending-migrations.ts,
-- run by the founder from Vida → Engine → Database migrations → Run. A .sql file on disk LOOKS
-- applied and is not: that mistaken reading is #383, where an RPC sat here for 33 days doing
-- nothing. This statement is registered there under key `20260903_client_commercial_model`.
--
-- ── WHAT IT IS FOR ──────────────────────────────────────────────────────────────────────
--
-- `authorityFor(null)` returns `{ allowed: true, mode: 'legacy' }`, so the ABSENCE of a
-- programme row is read as the positive assertion "this client is legacy". Absence of X cannot
-- mean "is Y" — the same absence describes a programme client before their first programme,
-- between two, or after one completes. Founder-locked 3 Sep: House and MBF are PROGRAMME-model
-- clients, and having no active programme must not make either of them legacy.
--
-- ── NULLABLE, NO DEFAULT, NO BACKFILL ───────────────────────────────────────────────────
--
--   NULL          unclassified, and resolves to EXACTLY the behaviour the product has today
--   'programme'   programme economics, whether or not a programme row is open
--   'legacy'      the retired per-lead model, chosen by a human and never by inference
--
-- 🛑 A DEFAULT WOULD STAMP HISTORIC ROWS WITH A CLAIM NOBODY CHECKED — the #599 precedent this
-- repository already records in programme-notifications.ts. So this migration writes no row and
-- changes no behaviour: it adds a column and a constraint that every existing row satisfies.
--
-- ⚑ SHIPPED AHEAD OF ITS APPLICATION CODE, ON PURPOSE (expand/contract, the PR A1 lesson).
-- PENDING_MIGRATIONS is a TypeScript constant compiled into the DEPLOYED API, so a migration
-- can NEVER be applied before the build that carries it. No application code in PR C1 reads or
-- writes this column.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS commercial_model text;

COMMENT ON COLUMN public.clients.commercial_model IS
  'Which commercial model governs this client. NULL means UNCLASSIFIED and resolves to the behaviour the product had before this column existed. programme means programme economics whether or not a programme row is open. legacy means the retired per-lead model. Never inferred from a company name, an email, an env id, or the presence of a programme row. Never backfilled.';

-- ── THE CHECK, CREATED ONLY IF MISSING ───────────────────────────────────────────────────
--
-- The runner has no ledger and executes every entry on every run, so this must be idempotent.
-- Guarded on pg_constraint rather than written as DROP + ADD: ADD CONSTRAINT ... CHECK takes
-- an ACCESS EXCLUSIVE lock and revalidates the whole table, so DROP/ADD would pay that on
-- every run AND leave a window with no constraint at all, during which a concurrent write
-- could insert the very row that then makes the re-ADD fail. The A1 entry above carries the
-- same reasoning for the same reason.
--
-- SAFE ON A POPULATED TABLE: the column is added NULL with no default and no backfill, so
-- commercial_model IS NULL short-circuits the OR for every existing row and validation cannot
-- fail against the book as it stands.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.clients'::regclass
       AND conname  = 'clients_commercial_model_check'
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_commercial_model_check CHECK (
        commercial_model IS NULL
        OR commercial_model IN ('programme', 'legacy')
      );
  END IF;
END $$;
