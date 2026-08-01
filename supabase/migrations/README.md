# ✅ THE migration directory — every migration lives here

**One home, since #273 (31 Jul 2026).** 127 files: the 94 that were already here, the 32 consolidated in from two other directories, and one recovered from the runner that had no file at all.

## ⚠️ Recording a migration and RUNNING one are two different things

**Nothing applies this directory.** There is no `supabase/config.toml`, so the Supabase CLI was never wired up, and the Supabase SQL editor is unreachable (the flagged GitHub account). The only mechanism the product has is `PENDING_MIGRATIONS` in `apps/api/src/lib/pending-migrations.ts` — a **TypeScript constant**, deliberately not read from disk, because `.sql` files are not copied into `dist/` by `tsc`: a file read would work locally and fail in production.

Vida → Engine → **Run migrations** executes that constant. So:

| I want to… | Change |
|---|---|
| record a migration | **this directory** — the canonical file |
| make the product **run** it | `apps/api/src/lib/pending-migrations.ts` |

**Do both** for anything that must reach production. `migration-home.test.ts` fails the gate if a runner entry has no file here — which is exactly how `20260726_campaign_copilot_columns` came to exist as a string the product could apply while no file described it.

## Conventions

- **`YYYYMMDD_short_name.sql`.** The `001`–`013` files predate the convention; they are the oldest set and sort first, which is chronologically right by accident rather than design.
- **Idempotent.** `IF NOT EXISTS`, `OR REPLACE`, `DROP … IF EXISTS` — every file must be safe to re-run, because nothing tracks what has been applied.
- **⚠️ `DROP POLICY IF EXISTS <p> ON <table>` guards the POLICY, not the TABLE.** The table reference resolves first, so a missing table is a hard error — and node-postgres sends a multi-statement query as one implicit transaction, so one bad line rolls back the whole file. That cost a production run in #554c. Guard on `to_regclass('public.x') is not null` instead.
- **A consolidated file carries a provenance header** naming where it came from. Its body is byte-identical to the original, which still exists under a tombstone header.

## The honest state

**No file here is known to have been applied to production.** The three directories were all hand-pasted into a SQL editor over months, in an unrecorded order, with no record of which took — and that editor can no longer be opened. Consolidating them fixes *where things live*; it does not tell you what production has.

**What production actually has → [`docs/SCHEMA-DRIFT.md`](../../docs/SCHEMA-DRIFT.md)**, and Vida → Engine → **Schema probe (#558)** answers six of those questions live.
