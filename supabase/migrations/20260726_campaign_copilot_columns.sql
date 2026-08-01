-- ═══════════════════════════════════════════════════════════════════════════════
-- RECOVERED FROM THE RUNNER 31 Jul 2026 (#273) — this migration had NO FILE
-- ═══════════════════════════════════════════════════════════════════════════════
-- Found by the #273 sweep: `PENDING_MIGRATIONS` holds twelve entries and eleven of them
-- had a matching `.sql` on disk. This one had none — anywhere. It existed ONLY as a
-- template string inside `apps/api/src/lib/pending-migrations.ts`, so the product could
-- apply it to production while nothing in the migration record said it existed.
--
-- That is the #558 problem in its purest form: a statement the database can receive that
-- no file describes. The body below is copied verbatim from the constant, which remains
-- the thing that actually RUNS (the runner reads the constant, never the disk — .sql files
-- are not copied into dist/ by tsc). `migration-home.test.ts` asserts the two stay
-- identical, so the file cannot quietly drift away from what is executed.
--
-- Campaign human-in-the-loop columns: the demo rebuild and the first paying client both
-- need them.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.figsy_campaigns
  ADD COLUMN IF NOT EXISTS copilot_mode        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approve_before_send boolean NOT NULL DEFAULT false;
