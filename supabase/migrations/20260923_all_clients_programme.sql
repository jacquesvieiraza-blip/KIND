-- ── EVERY ACCOUNT IS ON THE PROGRAMME — R137, FOUNDER-ORDERED 23 Sep 2026 ─────────────────
--
-- ⚠️ THIS FILE IS THE CANONICAL COPY AND IT DOES NOT RUN. It executes only from
-- `PENDING_MIGRATIONS` in apps/api/src/lib/pending-migrations.ts, run by the founder from
-- Vida → Engine → Database migrations → Run, under key `20260923_all_clients_programme`.
--
-- Founder, verbatim: "the 299/4 is retired/ this must go. everything must be updated to new
-- programme pricing model." — completing R124 (16 Sep): "299/4 is gone. out. we are on the
-- programme. all clients."
--
-- ── WHAT THIS CHANGES ────────────────────────────────────────────────────────────────────
--
-- `20260903_client_commercial_model` added the column NULLABLE, NO DEFAULT, NO BACKFILL, because
-- NULL then meant "unclassified — behave as the product did before", which for an account with
-- no programme was the retired $299 pack + $4 per approved lead. That compatibility state is
-- exactly what R137 retires. This migration:
--
--   1. records what each row said BEFORE, in `commercial_model_before_r137`, so nothing is lost;
--   2. writes 'programme' on every row that is not already 'programme';
--   3. makes 'programme' the DEFAULT, so every creation path that never names the column — seat
--      reps, demo clients, partner demos — creates a programme account;
--   4. makes the column NOT NULL, and adds a CHECK that it can only be 'programme'.
--
-- ⚠️ THE APPLICATION DOES NOT WAIT FOR THIS. The resolver already treats NULL and 'legacy' as
-- programme from the moment the build that carries this entry deploys. This migration makes the
-- database say the same thing, so no future code path can write the retired state back.
--
-- ⚠️ NOTHING ELSE ON THE ROW IS TOUCHED. Wallet balances, credit columns, historical leads,
-- replies and campaigns are left exactly where they are.
--
-- Idempotent: the backfill only touches rows not yet recorded; the constraint is guarded.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS commercial_model_before_r137 text;

COMMENT ON COLUMN public.clients.commercial_model_before_r137 IS
  'What clients.commercial_model held before R137 (23 Sep 2026) moved every account to the programme: legacy, or unclassified for NULL. NULL here means the row was already programme, or was created after R137. Record only; nothing reads it for a decision.';

UPDATE public.clients
   SET commercial_model_before_r137 = COALESCE(commercial_model, 'unclassified'),
       commercial_model = 'programme'
 WHERE commercial_model IS DISTINCT FROM 'programme';

ALTER TABLE public.clients
  ALTER COLUMN commercial_model SET DEFAULT 'programme';

ALTER TABLE public.clients
  ALTER COLUMN commercial_model SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.clients
    ADD CONSTRAINT clients_commercial_model_programme_only
    CHECK (commercial_model = 'programme');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.clients.commercial_model IS
  'Which commercial model governs this client. Since R137 (23 Sep 2026) the only model is programme: the retired $299 pack + $4 per approved lead is not sold to anyone. What a row held before is in commercial_model_before_r137.';
