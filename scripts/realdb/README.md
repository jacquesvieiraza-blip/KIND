# The real-database harness (`scripts/realdb.sh`)

**What it is.** A throwaway PostgreSQL cluster, created from nothing in seconds, with this
repo's own schema applied, used by `*.realdb.test.ts` files. It is destroyed at the end of
every run.

**Why it exists.** The 3,900 tests in the main suite run against a **mocked** `supabase-js`.
A mock returns what the test author expected. A database returns what the schema actually
enforces. Two facts this repo has paid for live only in the second one:

- `supabase-js` returns `{ data: null, error }` for a missing table or column, and
  `const { data } = await …` reads that as **empty**. A mock has no missing columns, so the
  mocked test is green while the deployed read silently returns nothing.
- "One proof claim per client" is enforced by a **partial unique index**. A mock cannot
  refuse a second insert. Only the index can.

So: anything whose truth lives in the schema is proven here, or it is not proven.

## Running it

```bash
bash scripts/realdb.sh run      # create → run *.realdb.test.ts → destroy   ← the usual one
bash scripts/realdb.sh up       # create and leave running; prints the URL
bash scripts/realdb.sh url      # print the URL of the running harness DB
bash scripts/realdb.sh psql     # psql against it
bash scripts/realdb.sh status   # what each migration did
bash scripts/realdb.sh down     # destroy it
```

In the gate it is **opt-in**:

```bash
REAL_DB_TESTS=1 bash scripts/check.sh
```

Opt-in because it needs local PostgreSQL **server** binaries (`initdb`, `pg_ctl`) — `psql`
alone is not enough. On macOS: `brew install postgresql@16`. On Debian/Ubuntu:
`apt-get install postgresql-16`. If they are somewhere unusual, set `PGBIN`.

Environment knobs: `REALDB_ROOT` (default `$TMPDIR/kind-realdb`), `REALDB_PORT` (55432),
`REALDB_DB` (`kind_test`), `REALDB_KEEP=1` (do not destroy after `run`).

## It cannot touch production

Not as a promise — as a property:

- the script **never reads** `DATABASE_URL`, `SUPABASE_DB_URL`, `PGHOST` or any other
  ambient connection. The only database it connects to is one it created itself, seconds
  earlier, under `$REALDB_ROOT`;
- `down` refuses to delete any directory without the marker file `up` writes;
- the test helper (`apps/api/src/realdb/harness.ts`) reads **only** `REALDB_URL`, and
  `assertDisposable()` refuses any non-loopback host and any database name other than the
  harness database. Those refusals have their own tests.

## What it applies, in order

1. **`scripts/realdb/bootstrap.sql`** — the Supabase-compatible shim. A plain PostgreSQL
   has no `auth` schema, no `auth.users`, no `auth.uid()` and none of the three API roles,
   so migration #1 would die on its first `references auth.users(id)`. The shim creates
   the minimum surface the repo's migrations actually use, verified by grepping the whole
   migration set rather than guessed.
2. **`supabase/staging-schema.sql`** — the baseline. See the finding below.
3. **`supabase/migrations/*.sql`** in filename order, each in its own transaction, with the
   outcome recorded in `harness.applied_migrations`.

Current state of a clean run: **166 applied · 17 superseded-by-baseline · 1 known-broken ·
0 failed.**

## Three findings the harness surfaced, that it does not hide

**① `supabase/migrations/` cannot build the database from empty.** Nothing in it creates
`public.clients`, `public.icps`, `public.leads`, `public.subscriptions` or the `figsy_*`
tables. They were created by hand in a Supabase SQL editor that can no longer be opened,
and every migration since only `ALTER`s them. Without a baseline, **159 of 184 migrations
fail** on `relation "public.clients" does not exist`. The nearest thing the repo has to a
baseline is `supabase/staging-schema.sql`, whose own header says "paste this entire file
into your NEW Supabase project", so that is what the harness uses.

**② 17 pre-baseline migrations are not re-runnable**, against the migration directory's own
stated rule that every file must be safe to re-run. `CREATE POLICY` has no `IF NOT EXISTS`
in PostgreSQL, and a few `CREATE INDEX` statements omit the guard, so the file aborts on
`policy "x" already exists`. The harness records these as `superseded_by_baseline` — the
baseline demonstrably already contains them — and says so on every run. It does that **by
rule, not by a list**: a file dated at or before the baseline that fails with an
"already exists" error is superseded; a file that fails for any other reason, and every
post-baseline file that fails at all, **fails the harness**.

**③ `20260525_milla_vida_tables.sql` cannot execute anywhere.** From line 66 it uses
`CREATE POLICY IF NOT EXISTS`, which is not valid PostgreSQL in any version. It is not in
`PENDING_MIGRATIONS`, so production never attempted it, and the baseline already contains
its four tables. It is declared in `KNOWN_BROKEN` and printed on every run.

## Two places the harness is honestly weaker than production

**Enum vs text.** Production models `subscriptions.status` and `leads.status` as PostgreSQL
**enum types** (`subscription_status`, `lead_status`) — four migrations do `ALTER TYPE … ADD
VALUE`, and their comments record production rejecting a text-shaped assumption. The repo's
own schema files model both as `text` + `CHECK`. The harness creates the *types* so those
migrations apply (one of them also creates `operator_audit_log`, which is lost entirely if
the file aborts) and leaves the *columns* as the baseline declares them. **A real-DB test
here cannot prove anything about the enum-vs-text shape of those two columns.**

**RLS.** Tests connect as the cluster superuser, so row-level security is bypassed. The
policies are created and can be inspected, but "an anonymous caller is refused" is **not**
provable here. `auth.uid()` reads the same `request.jwt.claim.sub` setting Supabase uses, so
a test may impersonate a user with `set local`, but PostgREST's full request context is not
reproduced.

**pgvector.** `008_milla.sql` declares `create extension vector` and never uses it (its own
comment says so). When pgvector is absent, `up` installs a no-op `vector` stub into the
PostgreSQL share directory and announces it every run. If it cannot, that migration is
reported unsupported — never as applied.

## Writing a real-DB test

Name the file `*.realdb.test.ts`. It is excluded from `npx vitest run` by both
`vitest.config.ts` and `apps/api/vitest.config.ts`, and included only by
`vitest.realdb.config.ts`.

```ts
import { realdbClient, createTestClient, dropTestClient, migrationOutcome }
  from '../realdb/harness'
```

Isolation is **by identity, not by transaction**: `createTestClient()` gives each test its
own client row, and the test deletes it afterwards. That is deliberate — the things these
tests prove are proven by two *committed* writes racing, so a wrap-everything-in-a-rollback
harness would remove the behaviour under test.

If `REALDB_URL` is missing the suite **fails loudly**. It never skips. A real-database suite
that quietly passes because no database was present is the exact failure this harness exists
to remove.
