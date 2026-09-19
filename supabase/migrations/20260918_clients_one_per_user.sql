-- ── ONE CLIENT ROW PER AUTH USER (MVP1 · J1-C1) ───────────────────────────────────────
--
-- Canonical copy. The executable copy is the `20260918_clients_one_per_user` entry in
-- `apps/api/src/lib/pending-migrations.ts`, which is the only sanctioned way to run it (O3).
--
-- WHAT IS MISSING. `POST /auth/onboard` is check-then-insert: read `clients` by `user_id`,
-- branch, INSERT. There is NO unique index on `clients.user_id` anywhere in this repository,
-- so two concurrent onboards for one auth user do not collide — they BOTH succeed. One
-- person, two client rows, and every downstream `.eq('user_id', …).maybeSingle()` then picks
-- one of them arbitrarily: their Proof claim, their wallet and their programme can end up on
-- the row their next request does not read. A double-tap on the confirm button, a retried
-- request and two open tabs all produce it.
--
-- ⚠️ THE APPLICATION HALF IS ALREADY SHIPPED AND DOES NOT DEPEND ON THIS. The route re-reads
-- after a failed insert and completes against the winning row, so it converges whether or not
-- this index exists. What the index adds is that the second insert is REFUSED rather than
-- merely unlikely to be noticed.
--
-- ── 🛑 IT REFUSES TO RUN OVER EXISTING DUPLICATES, AND DOES NOT TRY TO FIX THEM ────────
--
-- A bare CREATE UNIQUE INDEX aborts if duplicates already exist, which would make this
-- migration fail half-way through a batch. And deciding WHICH of two client rows to keep is a
-- data decision about somebody's account — their wallet, their programme, their leads — and it
-- is never a migration's to make silently. So this checks first, creates the index when it
-- can, and NAMES the offending users when it cannot.
--
-- ⚠️ IDEMPOTENT. Re-running is harmless: the index is created IF NOT EXISTS, and the notice
-- branch writes nothing at all.
-- ⚠️ EXPAND ONLY (XC-11). It adds a constraint and drops nothing; no column changes, no
-- backfill, no rewrite. Code that predates it keeps working unchanged.

DO $$
DECLARE
  dupes text;
BEGIN
  SELECT string_agg(user_id::text, ', ')
    INTO dupes
    FROM (
      SELECT user_id
        FROM public.clients
       WHERE user_id IS NOT NULL
       GROUP BY user_id
      HAVING count(*) > 1
       LIMIT 50
    ) d;

  IF dupes IS NOT NULL THEN
    RAISE NOTICE 'clients_one_per_user NOT created: these auth users already have more than one client row (%). Resolve them in Vida first — which row to keep is a decision about somebody''s account, not a migration''s.', dupes;
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS clients_one_per_user
      ON public.clients (user_id)
      WHERE user_id IS NOT NULL;
    RAISE NOTICE 'clients_one_per_user is in place — a second onboard for one auth user is now refused by the database.';
  END IF;
END $$;
