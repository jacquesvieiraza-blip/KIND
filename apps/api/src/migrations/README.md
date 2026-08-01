# 🪦 HISTORICAL — do not add migrations here

**Every file in this directory has been consolidated into [`supabase/migrations/`](../../../../supabase/migrations/), which is the single home for migrations (#273, 31 Jul 2026).** The 19 files here are kept, not deleted (CORE-MAP rule 3, founder-locked: *nothing gets deleted*) — each carries a tombstone header pointing at its canonical copy.

## Why this directory existed, and what it cost

There were **three** migration directories: this one (19 files), `packages/db/src/migrations/` (13) and `supabase/migrations/` (94). **Not one file was in more than one of them** — so the answer to *"where is the migration that created this table?"* depended on which directory you happened to look in first, and there was nothing to tell you there were two more.

`TECH-STACK.md` described this directory as *"App-run set. 7 files"*. It held **19**, and nothing ran it. A doc describing a directory that had almost tripled since is how a stale mental model survives a year of work.

## ⚠️ The thing to understand before touching migrations at all

**No directory has ever been applied to production.** There is no `supabase/config.toml`, so the Supabase CLI was never wired up. The only mechanism the product has is `PENDING_MIGRATIONS` in `apps/api/src/lib/pending-migrations.ts` — a **TypeScript constant**, deliberately not read from disk (`.sql` files are not copied into `dist/` by `tsc`, so a file read would work locally and fail in production). Vida → Engine → *Run migrations* executes that constant and nothing else.

So there are two different things, and conflating them is the mistake:

| I want to… | Change |
|---|---|
| record a migration | `supabase/migrations/` — the canonical file |
| make the product **run** it | `apps/api/src/lib/pending-migrations.ts` — the constant |

Both, for anything that must actually reach production. `migration-home.test.ts` fails the gate if a runner entry has no canonical file, or if a tombstoned file drifts from its canonical copy.

**Full picture: [`docs/SCHEMA-DRIFT.md`](../../../../docs/SCHEMA-DRIFT.md).**
