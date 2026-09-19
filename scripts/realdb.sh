#!/usr/bin/env bash
# realdb.sh — THE DISPOSABLE REAL DATABASE. Never production. Never a shared database.
#
# ── WHY THIS EXISTS ─────────────────────────────────────────────────────────────
#
# 3,900 unit tests pass against a mocked `supabase-js`. A mock returns what the test
# author expected; a database returns what the schema actually enforces. Those are not
# the same fact, and the gap is where this repo has repeatedly shipped:
#
#   · `supabase-js` returns `{ data: null, error }` for a missing table or column, and
#     `const { data } = await …` reads that as EMPTY. A mock never has a missing column,
#     so the mocked test is green and the deployed read silently returns nothing.
#   · A compare-and-set claim ("only one proof claim per prospect") is enforced by a
#     PARTIAL UNIQUE INDEX. A mock cannot refuse a second insert. Only the index can.
#
# So anything whose truth lives in the schema — a CAS, a partial unique index, a check
# constraint, an RPC, a migration having applied at all — is proven HERE or not proven.
#
# ── WHAT IT DOES ────────────────────────────────────────────────────────────────
#
#   1. `initdb` a brand-new PostgreSQL cluster in a throwaway directory.
#   2. Start it on a private port, listening on 127.0.0.1 only.
#   3. Apply `scripts/realdb/bootstrap.sql` (the Supabase-compatible shim: `auth.users`,
#      `auth.uid()`, the three API roles — see that file for why).
#   4. Apply `supabase/staging-schema.sql` — THE BASELINE. `supabase/migrations/` cannot
#      build this database from empty: the base tables (`clients`, `icps`, `leads`, the
#      `figsy_*` set, `subscriptions`) have no migration at all — they were created by
#      hand in a SQL editor, and the migration directory only ALTERs them. That file is
#      the repo's own consolidated "paste this into a NEW Supabase project" schema, so it
#      is the only baseline the repo actually has. Without it 159 of 185 migrations fail
#      on `relation "public.clients" does not exist`.
#   5. Apply every file in `supabase/migrations/` in filename order, each in its own
#      transaction, recording the outcome in `harness.applied_migrations`.
#   6. Hand back a connection URL on stdout / in the state file.
#   7. `down` throws the entire cluster away.
#
# ── THE SAFETY PROPERTY ─────────────────────────────────────────────────────────
#
# This script CANNOT touch production, and not as a promise:
#   · it never reads DATABASE_URL, SUPABASE_DB_URL or any other ambient connection;
#   · the only database it ever connects to is one it created itself, seconds earlier,
#     in a directory under $REALDB_ROOT;
#   · `down` refuses to delete anything that is not a cluster this script made
#     (it looks for the marker file it writes at `up`).
#
# ── USAGE ───────────────────────────────────────────────────────────────────────
#
#   bash scripts/realdb.sh up      # create + migrate; prints the URL
#   bash scripts/realdb.sh url     # print the URL of the running harness DB
#   bash scripts/realdb.sh psql    # open psql against it
#   bash scripts/realdb.sh status  # migration outcomes
#   bash scripts/realdb.sh down    # destroy it
#   bash scripts/realdb.sh run     # up → run the *.realdb.test.ts suite → down
#
# In `check.sh` this is an OPT-IN stage: `REAL_DB_TESTS=1 bash scripts/check.sh`.
# It is opt-in because it needs local PostgreSQL binaries, and a gate that fails on a
# missing binary is a gate people stop running.

set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
REPO_ROOT="$(pwd)"

# ══════════════════════════════════════════════════════════════════════════════════════════
# 🛑 WHICH TREE'S SCHEMA GETS SEEDED — `REALDB_SCHEMA_TREE`
#
# Default: this repo. The RED run overrides it, and Fable's C-12 ruling (17 Sep) is why.
#
# ── WHAT WENT WRONG WITHOUT IT ──────────────────────────────────────────────────────────
#
# The first Batch 1b RED run booted the PRE-BATCH-1 product against the CURRENT schema,
# because these two paths were bare and relative. So check 6 — the free-Proof record fence
# — PASSED at a commit that does not contain the fence, purely because the harness had
# already installed `try_reserve_proof_records` for it. A RED that passes for a reason
# belonging to the harness is not evidence about the product, and it was reported and
# rejected as such.
#
# ⚠️ THE DECLARATIONS STAY WITH THE SCRIPT, NOT THE TREE. `KNOWN_BROKEN`,
# `EXPECTED_UNSUPPORTED` and `BASELINE_SORT_KEY` below are THIS script's declarations about
# specific filenames. Seeding an older tree does not import that tree's versions of them —
# a file that tree has and this list does not is simply counted on its own merits, and a
# declared name that tree lacks matches nothing. That is deliberate: the declarations are
# the harness's honesty ledger, and a RED run must not be able to quietly widen them.
# ══════════════════════════════════════════════════════════════════════════════════════════
SCHEMA_TREE="${REALDB_SCHEMA_TREE:-$REPO_ROOT}"
[ -f "$SCHEMA_TREE/supabase/staging-schema.sql" ] \
  || { echo "🛑 realdb: $SCHEMA_TREE/supabase/staging-schema.sql does not exist — REALDB_SCHEMA_TREE is wrong" >&2; exit 1; }

REALDB_ROOT="${REALDB_ROOT:-${TMPDIR:-/tmp}/kind-realdb}"
REALDB_PORT="${REALDB_PORT:-55432}"
REALDB_DB="${REALDB_DB:-kind_test}"
CLUSTER="$REALDB_ROOT/cluster"
MARKER="$REALDB_ROOT/.kind-realdb-marker"
STATE_URL="$REALDB_ROOT/url"
SERVER_LOG="$REALDB_ROOT/server.log"
APPLY_LOG="$REALDB_ROOT/apply.log"

# Migrations that CANNOT apply to a plain PostgreSQL because they require a Supabase-only
# extension. Declared here, printed on every run, and never silently swallowed — an
# undeclared failure fails the harness.
#
# Currently empty: `008_milla.sql` declares `create extension vector` but the file's own
# comment says pgvector is not used, and `up` installs a no-op `vector` stub when the real
# extension is absent (see `install_vector_stub`).
EXPECTED_UNSUPPORTED=()

# Migrations that are BROKEN IN THE REPO and cannot execute anywhere — declared so the
# harness reports them every run instead of being permanently red. A harness nobody runs
# proves nothing, and a silent skip proves less.
#
#   20260525_milla_vida_tables.sql — line 66 onward uses `CREATE POLICY IF NOT EXISTS`,
#     which is not valid PostgreSQL in any version. The file has never been able to run
#     past that line. It is NOT in `PENDING_MIGRATIONS`, so production never attempted it,
#     and the baseline already contains the four tables it creates. Reported, not fixed:
#     Batch 1 does not cover it.
KNOWN_BROKEN=(20260525_milla_vida_tables.sql)

# ── THE BASELINE DATE, AND WHY IT IS A RULE RATHER THAN A LIST ──────────────────
#
# `supabase/staging-schema.sql` says "Generated: 2026-06-12". It is a SNAPSHOT of the
# database as it stood that day, so every migration filename sorting at or before that
# date is ALREADY INSIDE IT. Applying such a file again is the re-run case, and the
# migrations README requires every file to be safe to re-run.
#
# **18 of them are not.** `CREATE POLICY` has no `IF NOT EXISTS` in PostgreSQL, and a
# handful of `CREATE INDEX` statements omit the guard, so the file aborts on
# `policy "x" already exists`. That is a real finding about those files — reported, and
# in the out-of-scope list, not fixed here.
#
# The harness handles it by RULE, not by a hand-maintained list that would rot: a
# pre-baseline file that fails with an "already exists" error is recorded as
# `superseded_by_baseline` and the run continues, because the baseline demonstrably
# contains it. A pre-baseline file that fails for ANY OTHER reason, and EVERY
# post-baseline file that fails at all, fails the harness.
BASELINE_SORT_KEY="${BASELINE_SORT_KEY:-20260612}"

say()  { echo "   $*"; }
fail() { echo "🛑 realdb: $*" >&2; exit 1; }

# ── Locating the PostgreSQL binaries ────────────────────────────────────────────
# `initdb` and `pg_ctl` are frequently NOT on PATH even when `psql` is (Debian/Ubuntu put
# them under /usr/lib/postgresql/<major>/bin; Homebrew under its own opt prefix). Probing
# is the difference between "harness works on the founder's Mac" and "works only here".
find_pgbin() {
  if [ -n "${PGBIN:-}" ]; then echo "$PGBIN"; return 0; fi
  if command -v initdb >/dev/null 2>&1 && command -v pg_ctl >/dev/null 2>&1; then
    dirname "$(command -v initdb)"; return 0
  fi
  local d
  for d in /usr/lib/postgresql/*/bin /opt/homebrew/opt/postgresql@*/bin \
           /usr/local/opt/postgresql@*/bin /opt/homebrew/bin /usr/local/bin \
           /Applications/Postgres.app/Contents/Versions/*/bin; do
    [ -x "$d/initdb" ] && [ -x "$d/pg_ctl" ] && { echo "$d"; return 0; }
  done
  return 1
}

PGBIN="$(find_pgbin || true)"
if [ -z "$PGBIN" ]; then
  echo ""
  echo "🛑 realdb: no PostgreSQL server binaries found (initdb / pg_ctl)."
  echo ""
  echo "   \`psql\` alone is not enough — the harness creates its own throwaway cluster."
  echo "   macOS:  brew install postgresql@16"
  echo "   Debian: apt-get install postgresql-16"
  echo "   Or set PGBIN=/path/to/postgres/bin"
  echo ""
  exit 2
fi

# ── Running the server as an unprivileged user ──────────────────────────────────
# PostgreSQL REFUSES to run as root ("cannot be run as root"), and CI containers commonly
# are root. When we are root we drop to an existing unprivileged account.
PG_RUN_AS=""
if [ "$(id -u)" = "0" ]; then
  for u in postgres nobody; do
    id "$u" >/dev/null 2>&1 && { PG_RUN_AS="$u"; break; }
  done
  [ -n "$PG_RUN_AS" ] || fail "running as root and no unprivileged user (postgres/nobody) to drop to."
fi

as_pg() {  # as_pg <command string>
  if [ -n "$PG_RUN_AS" ]; then su "$PG_RUN_AS" -c "$1"; else bash -c "$1"; fi
}

URL="postgresql://postgres@127.0.0.1:$REALDB_PORT/$REALDB_DB"
ADMIN_URL="postgresql://postgres@127.0.0.1:$REALDB_PORT/postgres"

running() { "$PGBIN/pg_isready" -h 127.0.0.1 -p "$REALDB_PORT" -q >/dev/null 2>&1; }

# ── The no-op `vector` stub ─────────────────────────────────────────────────────
# `008_milla.sql` runs `create extension if not exists vector`, and its own comment says
# "Uses Supabase full-text search (no pgvector/OpenAI embeddings needed)" — the extension
# is declared and never used. pgvector is not in a stock PostgreSQL install, so without a
# stub that one file aborts and every table it creates is missing.
#
# The stub is a control file declaring an extension whose entire body is a comment. It is
# installed only if `vector` is genuinely unavailable, only into the PostgreSQL share
# directory if that is writable, and it is announced every time. If it cannot be
# installed, `008_milla.sql` is reported as SKIPPED-UNSUPPORTED — never as applied.
install_vector_stub() {
  local ext_dir; ext_dir="$("$PGBIN/pg_config" --sharedir 2>/dev/null)/extension"
  [ -d "$ext_dir" ] || return 1
  [ -f "$ext_dir/vector.control" ] && return 0   # real pgvector (or a previous stub)
  [ -w "$ext_dir" ] || return 1
  cat > "$ext_dir/vector.control" <<'CTL'
# KIND TEST HARNESS STUB — NOT pgvector.
# Installed by scripts/realdb.sh so supabase/migrations/008_milla.sql can apply to a
# stock PostgreSQL. The repo performs no vector operations; that migration only declares
# the extension. Delete this file to restore the "pgvector is absent" behaviour.
comment = 'KIND harness no-op stub standing in for pgvector'
default_version = '0.0.0'
relocatable = true
CTL
  cat > "$ext_dir/vector--0.0.0.sql" <<'SQL'
-- Intentionally empty. See vector.control.
SQL
  say "⚠️  pgvector absent → installed a NO-OP \`vector\` stub in $ext_dir"
  say "    (008_milla.sql declares the extension and never uses it.)"
  return 0
}

sha_of() {
  if command -v shasum >/dev/null 2>&1; then shasum -a 256 "$1" | awk '{print $1}'
  elif command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | awk '{print $1}'
  else echo ""; fi
}

is_expected_unsupported() {
  local f="$1" e
  for e in ${EXPECTED_UNSUPPORTED+"${EXPECTED_UNSUPPORTED[@]}"}; do
    [ "$e" = "$f" ] && return 0
  done
  return 1
}

# A pre-baseline file (sorts at or before BASELINE_SORT_KEY) that failed only because the
# object it creates is already there. Both halves must hold — the date AND the error.
is_superseded_by_baseline() {
  local f="$1" err="$2"
  [[ "$f" < "$BASELINE_SORT_KEY" || "$f" == "$BASELINE_SORT_KEY"* ]] || return 1
  printf '%s' "$err" | grep -qiE 'ERROR: +(policy|relation|constraint|trigger|type|function) .* already exists' || return 1
  return 0
}

is_known_broken() {
  local f="$1" e
  for e in ${KNOWN_BROKEN+"${KNOWN_BROKEN[@]}"}; do
    [ "$e" = "$f" ] && return 0
  done
  return 1
}

cmd_down() {
  if [ -d "$CLUSTER" ] && [ ! -f "$MARKER" ]; then
    fail "$REALDB_ROOT exists but has no harness marker. REFUSING to delete it."
  fi
  if [ -d "$CLUSTER" ]; then
    as_pg "'$PGBIN/pg_ctl' -D '$CLUSTER' -m immediate -w stop" >/dev/null 2>&1
  fi
  rm -rf "$REALDB_ROOT"
  say "harness database destroyed ($REALDB_ROOT)"
}

cmd_up() {
  # An `up` onto an existing harness is always a fresh start — a test database that
  # carries the previous run's rows is a test database that lies about isolation.
  cmd_down >/dev/null 2>&1
  mkdir -p "$REALDB_ROOT" || fail "cannot create $REALDB_ROOT"
  : > "$MARKER"
  echo "created by scripts/realdb.sh — safe to delete" >> "$MARKER"
  [ -n "$PG_RUN_AS" ] && chown -R "$PG_RUN_AS" "$REALDB_ROOT"

  echo "── realdb: creating a disposable PostgreSQL cluster"
  say "root: $REALDB_ROOT   port: $REALDB_PORT"
  as_pg "'$PGBIN/initdb' -D '$CLUSTER' -U postgres --auth=trust -E UTF8" \
    > "$REALDB_ROOT/initdb.log" 2>&1 || { tail -20 "$REALDB_ROOT/initdb.log"; fail "initdb failed"; }

  # ── ⚑ 18 Sep (Batch 1b) — TLS ON THE DISPOSABLE CLUSTER, BECAUSE THE PRODUCT REQUIRES IT ──
  #
  # 🛑 THE MIGRATION RUNNER CONNECTS WITH `ssl: { rejectUnauthorized: false }` IN CODE, not
  # from the connection string — so `sslmode=disable` in the URL changes nothing. Against a
  # plain cluster it fails with *"The server does not support SSL connections"*, which is what
  # `POST /operator/migrations/run` answered on the first full-stack attempt.
  #
  # ⚠️ AND THE PRODUCT IS RIGHT. Supabase mandates TLS; a harness without it is LESS faithful,
  # not more convenient. A self-signed certificate is exactly what `rejectUnauthorized: false`
  # is for, and it stays inside a directory destroyed at teardown.
  #
  # ⚠️ IT DEGRADES RATHER THAN FAILS. If `openssl` is missing the cluster still starts without
  # TLS and says so — the real-DB suite connects over a unix-domain socket and does not care;
  # only the full-stack migration check does, and it will report the reason itself.
  SSL_ARGS=""
  if command -v openssl >/dev/null 2>&1; then
    openssl req -new -x509 -nodes -days 1 -subj "/CN=localhost" \
      -keyout "$REALDB_ROOT/server.key" -out "$REALDB_ROOT/server.crt" >/dev/null 2>&1 || true
    if [ -f "$REALDB_ROOT/server.key" ]; then
      chmod 600 "$REALDB_ROOT/server.key"
      [ -n "$PG_RUN_AS" ] && chown "$PG_RUN_AS" "$REALDB_ROOT/server.key" "$REALDB_ROOT/server.crt"
      SSL_ARGS=" -c ssl=on -c ssl_cert_file=$REALDB_ROOT/server.crt -c ssl_key_file=$REALDB_ROOT/server.key"
    fi
  fi

  as_pg "'$PGBIN/pg_ctl' -D '$CLUSTER' -o '-p $REALDB_PORT -k $REALDB_ROOT -c listen_addresses=127.0.0.1 -c fsync=off -c synchronous_commit=off -c full_page_writes=off$SSL_ARGS' -l '$SERVER_LOG' -w start" \
    > /dev/null 2>&1 || { tail -20 "$SERVER_LOG" 2>/dev/null; fail "pg_ctl start failed (port $REALDB_PORT already in use?)"; }
  running || fail "server started but is not accepting connections"
  if [ -n "$SSL_ARGS" ]; then say "server up (TLS on — the migration runner connects with ssl enabled in code)"
  else say "server up (NO TLS — openssl unavailable; the migration runner will refuse to connect)"; fi

  "$PGBIN/psql" -q -v ON_ERROR_STOP=1 "$ADMIN_URL" \
    -c "create database $REALDB_DB" >/dev/null || fail "could not create database $REALDB_DB"

  install_vector_stub || say "⚠️  pgvector absent and no stub possible — vector-dependent migrations will be reported unsupported"

  echo "── realdb: bootstrap (Supabase-compatible shim)"
  "$PGBIN/psql" -q -v ON_ERROR_STOP=1 "$URL" -f scripts/realdb/bootstrap.sql \
    > "$REALDB_ROOT/bootstrap.log" 2>&1 || { tail -30 "$REALDB_ROOT/bootstrap.log"; fail "bootstrap.sql failed"; }
  say "auth schema, RLS helpers and API roles created"

  echo "── realdb: applying the baseline ($SCHEMA_TREE/supabase/staging-schema.sql)"
  # ⚠️ THIS IS A FINDING, NOT A CONVENIENCE. `supabase/migrations/` is NOT self-sufficient:
  # nothing in it creates `public.clients`, `public.icps`, `public.leads`, `subscriptions`
  # or the `figsy_*` tables. Those were created by hand in the Supabase SQL editor that can
  # no longer be opened, and every migration since only ALTERs them. The nearest thing the
  # repo has to a baseline is this consolidated file, whose own header says "paste this
  # entire file into your NEW Supabase project".
  "$PGBIN/psql" -q -v ON_ERROR_STOP=1 "$URL" -f "$SCHEMA_TREE/supabase/staging-schema.sql" \
    > "$REALDB_ROOT/baseline.log" 2>&1 || { tail -30 "$REALDB_ROOT/baseline.log"; fail "staging-schema.sql (baseline) failed"; }
  say "baseline applied"

  echo "── realdb: applying $SCHEMA_TREE/supabase/migrations in filename order"
  [ "$SCHEMA_TREE" = "$REPO_ROOT" ] \
    || say "⚠️  SCHEMA FROM ANOTHER TREE — this database is NOT this repo's schema"
  : > "$APPLY_LOG"
  local applied=0 skipped=0 superseded=0 broken=0 failed=0 f base err sha
  for f in "$SCHEMA_TREE"/supabase/migrations/*.sql; do
    base="$(basename "$f")"
    sha="$(sha_of "$f")"
    # One transaction per file, exactly like `supabase db push`: a file either applies
    # whole or not at all, so a half-applied migration can never be recorded as applied.
    if err="$("$PGBIN/psql" -q -v ON_ERROR_STOP=1 --single-transaction "$URL" -f "$f" 2>&1)"; then
      applied=$((applied + 1))
      "$PGBIN/psql" -q "$URL" -c \
        "insert into harness.applied_migrations(filename, outcome, sha256) values ('$base','applied',nullif('$sha',''))
         on conflict (filename) do update set outcome='applied', error=null, applied_at=now()" >/dev/null
    else
      echo "── $base" >> "$APPLY_LOG"; echo "$err" >> "$APPLY_LOG"
      local esc; esc="$(printf '%s' "$err" | tail -5 | sed "s/'/''/g")"
      if is_superseded_by_baseline "$base" "$err"; then
        superseded=$((superseded + 1))
        "$PGBIN/psql" -q "$URL" -c \
          "insert into harness.applied_migrations(filename, outcome, error, sha256) values ('$base','superseded_by_baseline','$esc',nullif('$sha',''))
           on conflict (filename) do update set outcome='superseded_by_baseline', error='$esc'" >/dev/null
      elif is_expected_unsupported "$base"; then
        skipped=$((skipped + 1))
        say "⏭  SKIPPED-UNSUPPORTED (declared): $base"
        "$PGBIN/psql" -q "$URL" -c \
          "insert into harness.applied_migrations(filename, outcome, error, sha256) values ('$base','skipped_unsupported','$esc',nullif('$sha',''))
           on conflict (filename) do update set outcome='skipped_unsupported', error='$esc'" >/dev/null
      elif is_known_broken "$base"; then
        broken=$((broken + 1))
        say "🧨 DECLARED KNOWN-BROKEN (cannot execute anywhere): $base"
        printf '%s\n' "$err" | grep -iE '^.*ERROR:' | head -1 | sed 's/^/      /'
        "$PGBIN/psql" -q "$URL" -c \
          "insert into harness.applied_migrations(filename, outcome, error, sha256) values ('$base','failed','$esc',nullif('$sha',''))
           on conflict (filename) do update set outcome='failed', error='$esc'" >/dev/null
      else
        failed=$((failed + 1))
        say "❌ FAILED: $base"
        printf '%s\n' "$err" | tail -4 | sed 's/^/      /'
        "$PGBIN/psql" -q "$URL" -c \
          "insert into harness.applied_migrations(filename, outcome, error, sha256) values ('$base','failed','$esc',nullif('$sha',''))
           on conflict (filename) do update set outcome='failed', error='$esc'" >/dev/null
      fi
    fi
  done

  echo "$URL" > "$STATE_URL"
  echo ""
  say "applied $applied · superseded-by-baseline $superseded · known-broken(declared) $broken · skipped(declared) $skipped · FAILED $failed"
  say "full apply log: $APPLY_LOG"
  if [ "$superseded" -gt 0 ]; then
    say "⚠️  $superseded pre-baseline migration(s) are NOT re-runnable (\"already exists\"),"
    say "    against the migrations README's own idempotency rule. Listed by:"
    say "      bash scripts/realdb.sh status"
  fi
  if [ "$failed" -gt 0 ]; then
    echo ""
    echo "🛑 realdb: $failed migration(s) failed against a real PostgreSQL."
    echo "   That is a finding about the migrations, not about the harness. It is reported,"
    echo "   not hidden: the database is left running so you can inspect it."
    echo "   Declare a genuinely Supabase-only file in EXPECTED_UNSUPPORTED in this script."
    return 1
  fi
  # ── ⚑ 18 Sep (Batch 1b) — RE-GRANT AFTER THE REPLAY ─────────────────────────────────────
  #
  # `bootstrap.sql` grants table privileges to the Supabase API roles, but it runs BEFORE the
  # baseline and the migration replay — so every table those create is ungranted, and real
  # PostgREST answers `permission denied` for it. `ALTER DEFAULT PRIVILEGES` does not cover
  # them either: default privileges apply to the objects the GRANTING role creates afterwards,
  # and here the migrations run as the same superuser but the defaults were set for `public`
  # before those objects existed in this session's planning order.
  #
  # ⚠️ IT IS NOT A SECOND SOURCE OF TRUTH: the statements are the same ones bootstrap.sql
  # holds, re-applied. Cheap, idempotent, and the alternative is a harness whose API cannot
  # read the tables its own migrations just created.
  "$PGBIN/psql" -q -v ON_ERROR_STOP=1 "$URL" >/dev/null 2>&1 <<'GRANTS' || fail "re-granting API-role privileges after the replay failed"
grant usage on schema public to anon, authenticated, service_role;
grant all     on all tables    in schema public to service_role;
grant all     on all sequences in schema public to service_role;
grant all     on all functions in schema public to service_role;
grant select  on all tables    in schema public to anon, authenticated;
GRANTS
  say "API-role grants re-applied after the replay (PostgREST needs them; see bootstrap.sql)"

  # ── 🛑 FIDELITY, STATED ON EVERY RUN (⛓️ 18 Sep, after GPT verification) ─────────────────
  #
  # A green real-DB suite is easy to over-read as "the repo's migrations are proven". It is
  # not that, and the harness must not let anybody believe it is — a README nobody opens is
  # not a disclosure. Every `up` therefore says what this schema IS:
  #
  #   bootstrap shim + the staging-schema SNAPSHOT + all canonical files in filename order.
  #
  # That combination is a path THIS SCRIPT constructs. Nothing else in the product uses it:
  # there is no supabase/config.toml, the only glob over supabase/migrations/ is this file,
  # and the product's one executor is PENDING_MIGRATIONS — a 74-of-186 subset. See
  # scripts/realdb/README.md § SCHEMA FIDELITY and docs/SCHEMA-DRIFT.md (#558).
  echo ""
  say "SCHEMA FIDELITY — what a real-DB result here does and does not mean:"
  say "   ✅ PROVEN: function bodies, CHECK constraints, partial unique indexes, ON CONFLICT,"
  say "      row locking under real concurrency, NOT NULL — a real PostgreSQL running this"
  say "      repo's own SQL. That is what the *.realdb.test.ts files assert."
  say "   ⚠️ NOT PROVEN: that this equals PRODUCTION's schema. This is the staging-schema"
  say "      SNAPSHOT plus a filename-order replay — a path this harness constructs, which no"
  say "      other part of the product uses. Where the snapshot and production disagree, this"
  say "      agrees with the snapshot and CANNOT detect the difference (docs/SCHEMA-DRIFT.md)."
  say "   ⚠️ NOT a claim the migration set is healthy — see the findings printed above."
  echo ""
  say "READY → $URL"
  return 0
}

cmd_url()    { [ -f "$STATE_URL" ] || fail "no harness database running (run: bash scripts/realdb.sh up)"; cat "$STATE_URL"; }
cmd_psql()   { exec "$PGBIN/psql" "$(cmd_url)"; }
cmd_status() {
  "$PGBIN/psql" "$(cmd_url)" -c \
    "select outcome, count(*) from harness.applied_migrations group by outcome order by 1" \
    -c "select filename, left(coalesce(error,''),120) as error from harness.applied_migrations where outcome <> 'applied' order by 1"
}

cmd_run() {
  local rc=0
  cmd_up || rc=1
  if [ "$rc" = "0" ]; then
    echo ""
    echo "── realdb: running the real-database suite (*.realdb.test.ts)"
    REALDB_URL="$(cat "$STATE_URL")" npx vitest run --config vitest.realdb.config.ts --reporter=dot || rc=1
  fi
  if [ "${REALDB_KEEP:-}" = "1" ]; then
    echo ""; say "REALDB_KEEP=1 → database left running at $URL"
  else
    echo ""; cmd_down
  fi
  return $rc
}

case "${1:-run}" in
  up)     cmd_up ;;
  down)   cmd_down ;;
  url)    cmd_url ;;
  psql)   cmd_psql ;;
  status) cmd_status ;;
  run)    shift || true; cmd_run "$@" ;;
  *)      fail "unknown command '${1}' — use up | down | url | psql | status | run" ;;
esac
