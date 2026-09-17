#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════════════════
# BATCH 1b · THE FULL-STACK PRE-PRODUCTION RUN (§8.2, scoped to Batch 1)
#
#   bash scripts/fullstack.sh            # up → the ten checks → teardown      ← the usual one
#   bash scripts/fullstack.sh up         # up and leave it running; prints every URL
#   bash scripts/fullstack.sh checks     # run the checks against something already up
#   bash scripts/fullstack.sh down       # tear it all down
#   FULLSTACK_KEEP=1 bash scripts/fullstack.sh     # run, then leave it up to inspect
#   FULLSTACK_TREE=<path> bash scripts/fullstack.sh # boot a DIFFERENT checkout (the RED run)
#
# ── WHAT THIS IS ────────────────────────────────────────────────────────────────────────
#
# The real API, the real portal and the real admin console, as separate processes, against a
# disposable PostgreSQL reached through REAL PostgREST, with every provider replaced by a
# recording fake. The unit suite proves logic against mocks; this proves the seams — base
# URLs, HTTP status codes, PostgREST's own error codes, process boot, the admin proxy hop.
#
# 🛑 THE HEADLINE EVIDENCE IS A PAIR OF ZEROES. PDL and Hunter run with their KEYS SET and
# their fakes LISTENING and WILLING TO ANSWER 200. If FD-6's code lock regressed, a call would
# succeed and the product would carry on — only the counter would notice. `PDL_CALLS=0` and
# `HUNTER_CALLS=0` are printed at teardown and are part of the pass condition.
#
# ── WHAT IT IS NOT ──────────────────────────────────────────────────────────────────────
#
# ⚠️ NOT the complete 26-journey run. That is Batch 6's exit condition. This is the cumulative
# scoped run Fable ruled is owed after Batch 1, covering Batch 1's items and failure classes.
# ⚠️ NOT production-schema fidelity — see scripts/realdb/README.md § SCHEMA FIDELITY.
# ⚠️ NOT a browser test. No GoTrue, no login journeys; every check here is API-side or
# operator-key-side, and browser-loss journeys belong to Batch 2.
#
# ── IT CANNOT TOUCH PRODUCTION ──────────────────────────────────────────────────────────
#
# Not as a promise, as a property: it never reads DATABASE_URL, SUPABASE_DB_URL, PGHOST or any
# real key; every URL it hands the product is 127.0.0.1; the database is one `realdb.sh`
# created seconds earlier; and the keys it sets are literal fakes. The one command that could
# reach a real provider — a base URL left unset — is asserted against by check 0.
# ══════════════════════════════════════════════════════════════════════════════════════════
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
REPO="$(pwd)"

# The tree whose API/portal/admin get booted. Normally this repo; the RED run points it at a
# worktree of the pre-Batch-1 commit so the SAME checks run against the OLD product.
TREE="${FULLSTACK_TREE:-$REPO}"

P="${FULLSTACK_PORT_BASE:-58500}"
PORT_API=$((P + 20))
PORT_PORTAL=$((P + 21))
PORT_ADMIN=$((P + 22))
PORT_PGRST=$((P + 99))
PORT_GATEWAY=$((P + 98))
PORT_APOLLO=$((P + 1))
PORT_PDL=$((P + 2))
PORT_HUNTER=$((P + 3))
PORT_STRIPE=$((P + 10))
PORT_GOOGLE=$((P + 11))
PORT_RESEND=$((P + 12))
PORT_ANTHROPIC=$((P + 13))
PORT_SMTP=$((P + 14))

RUN_DIR="${FULLSTACK_RUN_DIR:-${TMPDIR:-/tmp}/kind-fullstack}"
PID_FILE="$RUN_DIR/pids"
JWT_SECRET="kind-fullstack-jwt-secret-not-a-real-one-at-least-32-chars"

say()  { printf '   %s\n' "$*"; }
head2() { printf '\n── fullstack: %s\n' "$*"; }
fail() { printf '🛑 fullstack: %s\n' "$*" >&2; exit 1; }

# ── TEARDOWN ──────────────────────────────────────────────────────────────────────────────
#
# ⚠️ ONE TRAP, AND IT RUNS ON EVERY EXIT PATH including a failed check and a Ctrl-C. A harness
# that leaves eight listeners and a database behind makes the NEXT run fail for a reason that
# has nothing to do with the product.
KEEP="${FULLSTACK_KEEP:-0}"
teardown() {
  local code=$?
  if [ "$KEEP" = "1" ] && [ "$code" = "0" ]; then
    echo ""
    say "FULLSTACK_KEEP=1 — leaving everything up. Tear down with: bash scripts/fullstack.sh down"
    return 0
  fi
  head2 "tearing down"
  if [ -f "$PID_FILE" ]; then
    while read -r pid name; do
      [ -z "${pid:-}" ] && continue
      if kill -0 "$pid" 2>/dev/null; then kill "$pid" 2>/dev/null || true; say "stopped $name ($pid)"; fi
    done < "$PID_FILE"
    sleep 1
    while read -r pid name; do
      [ -z "${pid:-}" ] && continue
      kill -9 "$pid" 2>/dev/null && say "force-stopped $name ($pid)" || true
    done < "$PID_FILE"
    rm -f "$PID_FILE"
  fi
  # ⚠️ A PATTERN BACKSTOP, because the PID file is not enough. `next start` re-execs, and a
  # PID file truncated by a later `up` orphans everything the earlier one started. These
  # patterns are specific to the harness: none of them can match a developer's own processes.
  for pat in "scripts/fullstack/fakes.mjs" "scripts/fullstack/gateway.mjs" "fullstack/bin/postgrest"; do
    pkill -f "$pat" 2>/dev/null && say "backstop: stopped $pat" || true
  done
  # 🛑 KILL THE PROCESS THAT HOLDS THE PORT, NOT THE ONE WE STARTED — they are not the same.
  #
  # `npx next start` is a chain: `npm exec` → `sh -c next start` → `next-server`. The PID we
  # tracked is the npm wrapper, so killing it ORPHANS the next-server that actually holds the
  # port. Three processes survived the first teardown that way, and the next run then measured
  # them instead of the product.
  #
  # ⚠️ `fuser` IS USED BECAUSE IT IS THE ONE THAT WORKS HERE. `lsof -ti tcp:<port>` printed
  # nothing and `ss -ltnp` printed no pid for the same live listener; `fuser -n tcp <port>`
  # named it correctly. Measured, not assumed — and every fallback is tried in turn so this
  # does not depend on one tool being installed.
  for port in "$PORT_API" "$PORT_PORTAL" "$PORT_ADMIN" $((P + 23)); do
    pids="$(fuser -n tcp "$port" 2>/dev/null | tr -d ' \t' || true)"
    [ -z "$pids" ] && pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
    [ -z "$pids" ] && pids="$(ss -ltnp 2>/dev/null | grep -oE "127.0.0.1:$port .*pid=[0-9]+" | grep -oE 'pid=[0-9]+' | cut -d= -f2 || true)"
    if [ -n "$pids" ]; then kill -9 $pids 2>/dev/null && say "backstop: freed port $port (pid $pids)" || true; fi
  done
  bash scripts/realdb.sh down >/dev/null 2>&1 || true
  say "disposable database destroyed"
  [ -n "${WORKTREE_MADE:-}" ] && git worktree remove --force "$WORKTREE_MADE" 2>/dev/null && say "RED worktree removed"
  return 0
}

track() { mkdir -p "$RUN_DIR"; echo "$1 $2" >> "$PID_FILE"; }

wait_http() {  # wait_http <url> <label> [tries]
  local url="$1" label="$2" tries="${3:-60}" i=0
  while [ "$i" -lt "$tries" ]; do
    i=$((i + 1))
    if curl -sS -o /dev/null --max-time 3 "$url" 2>/dev/null; then say "$label is up (${i}s)"; return 0; fi
    sleep 1
  done
  fail "$label did not come up at $url after ${tries}s — see $RUN_DIR"
}

# ══════════════════════════════════════════════════════════════════════════════════════════
# 🛑 THE PRECONDITION FOR TURNING THE SPEND GUARD OFF — AND IT MUST REFUSE, NOT WARN
#
# This is the whole basis on which `PAID_PROVIDERS_ENABLED=true` is defensible (the long block
# in `export_env`). It establishes two separate facts, because either alone is insufficient:
#
#   ① every provider base URL this process will export is a LOOPBACK url — so a provider call
#     cannot leave the machine even if a key were real;
#   ② the PAID providers' fakes are ACTUALLY ANSWERING on those ports — so "no provider was
#     called" can never be confused with "the fake was not listening", which is precisely the
#     ambiguity that would make `PDL_CALLS=0` worthless again.
#
# ⚠️ IT ASSERTS THE VARIABLES' VALUES, NOT THE PORT NUMBERS THAT BUILT THEM. Re-deriving
# `http://127.0.0.1:$PORT_APOLLO` here would assert this function's own arithmetic against
# itself. It reads what `export_env` is about to hand the product.
# ══════════════════════════════════════════════════════════════════════════════════════════
assert_providers_are_loopback() {
  local bad="" v url
  for v in APOLLO_BASE_URL RESEND_BASE_URL STRIPE_BASE_URL GOOGLE_API_BASE_URL ANTHROPIC_BASE_URL; do
    url="$(eval "printf '%s' \"\${$v:-}\"")"
    case "$url" in
      http://127.0.0.1:*) ;;
      *) bad="$bad $v=${url:-<unset>}" ;;
    esac
  done
  [ -z "$bad" ] || fail "refusing to disable the zero-spend guard — these are not loopback:$bad"

  # ② The paid providers must be reachable. A silent PDL fake would turn the contract's
  #    headline zero into an artifact of a dead listener.
  local p
  for p in "$PORT_APOLLO:apollo" "$PORT_PDL:pdl" "$PORT_HUNTER:hunter"; do
    curl -sS -o /dev/null --max-time 3 "http://127.0.0.1:${p%%:*}/__fake/count" 2>/dev/null \
      || fail "refusing to disable the zero-spend guard — the ${p##*:} fake is not answering on ${p%%:*}"
  done
  say "zero-spend guard OFF — all 5 provider base URLs are loopback and apollo/pdl/hunter fakes answer"
}

# ── THE ENVIRONMENT THE PRODUCT GETS ──────────────────────────────────────────────────────
#
# 🛑 EVERY PROVIDER KEY IS SET, INCLUDING PDL's AND HUNTER's. That is the contract's
# requirement and the only shape that proves the code lock rather than the absence of a key.
# Every base URL is a loopback fake, so a set key can reach nothing real.
export_env() {
  export NODE_ENV=production
  export PORT="$PORT_API"

  # Database, through real PostgREST. `supabase-js` addresses /rest/v1, the gateway strips it.
  export SUPABASE_URL="http://127.0.0.1:$PORT_GATEWAY"
  export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_JWT"
  export SUPABASE_ANON_KEY="$ANON_JWT"
  export NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:$PORT_GATEWAY"
  export NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_JWT"

  # Provider base URLs → the fakes (Batch 1b's one product change).
  export APOLLO_BASE_URL="http://127.0.0.1:$PORT_APOLLO"
  export RESEND_BASE_URL="http://127.0.0.1:$PORT_RESEND"
  export STRIPE_BASE_URL="http://127.0.0.1:$PORT_STRIPE"
  export GOOGLE_API_BASE_URL="http://127.0.0.1:$PORT_GOOGLE"
  export ANTHROPIC_BASE_URL="http://127.0.0.1:$PORT_ANTHROPIC"

  # Keys: all fake, all SET.
  export APOLLO_API_KEY="fullstack-fake-apollo-key"
  export PDL_API_KEY="fullstack-fake-pdl-key-MUST-RECEIVE-ZERO-CALLS"
  export HUNTER_API_KEY="fullstack-fake-hunter-key-MUST-RECEIVE-ZERO-CALLS"
  export ANTHROPIC_API_KEY="fullstack-fake-anthropic-key"
  export RESEND_API_KEY="fullstack-fake-resend-key"
  export STRIPE_SECRET_KEY="sk_test_fullstack_fake"
  export ADMIN_SECRET_KEY="fullstack-admin-secret"
  export INBOX_SECRET_KEY="fullstack-inbox-secret-key-32-chars-minimum-ok"

  # ══════════════════════════════════════════════════════════════════════════════════════════
  # 🛑 THE SPEND GUARD IS OFF IN THIS PROCESS, AND THAT DECISION IS THE MOST DELICATE ONE
  #    IN THIS FILE. READ ALL OF IT BEFORE CHANGING EITHER LINE.
  #
  # ── WHAT WENT WRONG WHEN IT WAS ON ──────────────────────────────────────────────────────
  #
  # An earlier version exported `SAFE_TEST_MODE=1` as an obvious belt. R66's guard sits at the
  # `fetch` boundary and THROWS, so the real API did exactly what it should:
  #
  #   [icp] stage=provider_blocked — paid sourcing required (20 record(s)) but the zero-spend
  #         guard refused it; pool served 0.
  #
  # Apollo was never called. Checks 4, 5 and 7 — the sourcing lifecycle, the eight-case
  # failure matrix, the shared timeout — are checks ABOUT provider calls, so all three were
  # unobtainable, and the harness was measuring its own guard.
  #
  # ⚠️ AND IT QUIETLY HOLLOWED OUT THE HEADLINE EVIDENCE. `PDL_CALLS=0` / `HUNTER_CALLS=0` are
  # the contract's proof of FD-6. With the guard on, they were 0 because the guard refuses
  # EVERY paid provider — Apollo included. A zero that a blanket refusal produces says nothing
  # whatsoever about FD-6, and it would have read on the page as though it did. With the guard
  # off, Apollo IS called, repeatedly, through the same code path and the same boundary — so
  # PDL and Hunter staying at zero is now a real, discriminating absence. The guard being off
  # is not a concession to get a green run; it is what makes the two zeroes mean anything.
  #
  # ── WHY THIS CANNOT SPEND MONEY, AS A PROPERTY AND NOT A PROMISE ────────────────────────
  #
  # `assert_providers_are_loopback` below runs FIRST and refuses the whole run unless all five
  # provider base URLs are `127.0.0.1` AND the paid-provider fakes are answering there. Money
  # leaves at the HTTP call; the HTTP call cannot leave the machine. Every key is an obvious
  # fake, so even a redirect that failed could not authenticate. R66's protection is preserved
  # in substance — spending is impossible — while the code path it guards stays exercisable.
  #
  # 🛑 DO NOT set `SAFE_TEST_MODE` here, and do not enable spend without the assertion. Either
  # one alone reintroduces one of the two failures above.
  # ══════════════════════════════════════════════════════════════════════════════════════════
  # ── THE ONE EXCEPTION, AND IT IS THE RED RUN ────────────────────────────────────────────
  #
  # 🛑 `FULLSTACK_RED=1` PUTS THE GUARD BACK ON, BECAUSE THE RED TREE HAS NO SEAM TO REDIRECT.
  #
  # The RED run boots a PRE-BATCH-1 checkout, where `apollo.ts` reads
  # `const APOLLO_BASE = 'https://api.apollo.io/api/v1'` as a hardcoded literal — the absence
  # of that seam is the very thing RED is meant to demonstrate. So the assertion above would
  # pass (the variables ARE loopback) while the product ignored every one of them and called
  # the real Apollo with a fake key. `assert_providers_are_loopback` cannot catch that: it
  # proves what the ENVIRONMENT says, and the RED product does not read the environment.
  #
  # ⚠️ SO THE RED RUN'S CHECKS 4/5/7 FAIL FOR TWO REASONS AT ONCE — no seam AND a guard that
  # refuses paid calls — and the report must say so rather than implying a purely behavioural
  # RED. That is a weaker demonstration than a redirected one, and it is the correct trade:
  # the alternative is sending real traffic to a live provider to make a nicer-looking
  # failure. R66 exists for exactly this decision.
  if [ "${FULLSTACK_RED:-0}" = "1" ]; then
    export SAFE_TEST_MODE="1"
    unset PAID_PROVIDERS_ENABLED || true
    say "🛑 RED RUN — zero-spend guard ON (this tree has no base-URL seam, so its provider calls could not be redirected)"
  else
    assert_providers_are_loopback
    export PAID_PROVIDERS_ENABLED="true"
    unset SAFE_TEST_MODE || true
  fi

  # ── THE REST OF THE REGISTER, SO THE API ACTUALLY BOOTS ─────────────────────────────────
  #
  # ⚠️ AND THE BOOT REFUSAL IS ITSELF EVIDENCE. The first run of this harness died with
  # `Startup aborted — 2 critical env var(s) missing: FIGSY_COLD_FROM, UNSUBSCRIBE_SECRET`,
  # which is `runStartupCheck` doing exactly its job against a real process. Every value below
  # is an obvious fake, and the six capability stages (check 2) need their variables present
  # to be reported as anything other than OFF.
  #
  # 🛑 `.invalid` AND `example.invalid` THROUGHOUT (RFC 6761): a reserved TLD that cannot
  # resolve, so even a bug that bypassed every base URL could not reach a real recipient.
  export FIGSY_COLD_FROM="K.I.N.D Fullstack <cold@fullstack.invalid>"
  export UNSUBSCRIBE_SECRET="fullstack-unsubscribe-secret-32-chars-minimum"
  export TRACKING_URL="http://127.0.0.1:$PORT_API/t"
  export RESEND_WEBHOOK_SECRET="fullstack-resend-webhook-secret"
  export STRIPE_WEBHOOK_SECRET="whsec_fullstack_fake"
  export STRIPE_PRICE_LEADGEN_20="price_fullstack_lg20"
  export STRIPE_PRICE_LEADGEN_40="price_fullstack_lg40"
  export STRIPE_PRICE_LEADGEN_100="price_fullstack_lg100"
  export STRIPE_PRICE_FIGSY_20="price_fullstack_fg20"
  export STRIPE_PRICE_FIGSY_40="price_fullstack_fg40"
  export STRIPE_PRICE_FIGSY_100="price_fullstack_fg100"
  export GOOGLE_CLIENT_ID="fullstack-google-client-id"
  export GOOGLE_CLIENT_SECRET="fullstack-google-client-secret"
  export GOOGLE_REDIRECT_URI="http://127.0.0.1:$PORT_API/calendar/callback"
  # The pooled sending inventory — XC-8's finding was that an unparseable value yields zero
  # senders in silence, so the harness supplies a VALID one and check 2 reads the stage.
  export POOLED_SENDERS_JSON='[{"email":"pool-1@fullstack.invalid","host":"127.0.0.1","port":'"$PORT_SMTP"',"user":"pool-1","pass":"fullstack"}]'
  export FOUNDER_EMAIL="founder@example.invalid"

  # ⚑ XC-4's OWN VARIABLE, used for its own purpose. `ship.sh` normally arranges the commit
  # via `.deploy-stamp`; here the harness sets `KIND_DEPLOY_COMMIT` directly, which is the
  # fallback XC-4 added precisely because Railway injects RAILWAY_GIT_COMMIT_SHA only for
  # git-source builds. Without it all three services correctly report commit:"unknown", which
  # is the honest answer and not what check 1 is asking about.
  export KIND_DEPLOY_COMMIT="$(cd "$TREE" && git rev-parse --short HEAD)"

  # SMTP sink.
  export SMTP_HOST="127.0.0.1"
  export SMTP_PORT="$PORT_SMTP"

  # App URLs, so nothing builds a production link.
  export PORTAL_URL="http://127.0.0.1:$PORT_PORTAL"
  export ADMIN_URL="http://127.0.0.1:$PORT_ADMIN"
  export ADMIN_ALLOWED_EMAILS="fullstack-operator@example.invalid"
  export ADMIN_API_UPSTREAM="http://127.0.0.1:$PORT_API"
  export NEXT_PUBLIC_API_URL="http://127.0.0.1:$PORT_API"

  # 🛑 THE CRON MUST NOT RUN ITSELF — AND THE VARIABLE IS `RUN_CRONS`, NOT AN INVENTED ONE.
  #
  # My first cut exported `DISABLE_CRON=1`, which nothing reads. The real API said so out loud
  # in its own boot log — *"RUN_CRONS is not set — crons run (the default; a missing variable
  # must never silently stop every scheduled job)"* — and scheduled 32 jobs. That default is
  # deliberate and correct in production; here it would make check 8's "exactly one task, and
  # no duplicate on a second run" a race against a background detector rather than an
  # assertion about the detector.
  #
  # ⚠️ WHICH IS ITSELF A SMALL PIECE OF EVIDENCE: a real process reading a real env var told me
  # I had the name wrong. A mocked scheduler would have accepted `DISABLE_CRON` in silence.
  export RUN_CRONS="false"
  # ⚠️ `SAFE_TEST_MODE` IS DELIBERATELY NOT SET — see the block above `PAID_PROVIDERS_ENABLED`.

  # ⚠️ EVERY INHERITED CONNECTION IS CLEARED FIRST, so a developer's shell cannot leak a real
  # database in. Nothing here is read from the environment it was given.
  unset SUPABASE_DB_URL PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE || true

  # 🛑 AND THEN `DATABASE_URL` IS SET, DELIBERATELY, TO THE DISPOSABLE CLUSTER.
  #
  # The migration runner (`pending-migrations.ts`) connects with raw `pg`, not supabase-js, and
  # reads `DATABASE_URL`. With it unset, `POST /operator/migrations/run` answers HTTP 500
  # *"DATABASE_URL is not set on this service"* — which is the correct product behaviour and
  # made check 10 untestable. The rule was never "the harness must have no DATABASE_URL"; it
  # is "the harness must never read the one it was HANDED". It is cleared above and then
  # pointed at a loopback database created seconds ago and destroyed at teardown, and the run
  # refuses to continue unless that URL is `127.0.0.1 … kind_test`.
  export DATABASE_URL="$DB_URL"
}

# ── 🛑 REFUSE TO START ON A DIRTY BOX ─────────────────────────────────────────────────────
#
# THE BUG THIS EXISTS FOR, AND IT PRODUCED A WHOLE RUN OF LIES. `cmd_up` truncates the PID
# file, so a previous `up` whose processes were still alive became untrackable — and the new
# run's API could not bind its port, failed silently, and the STALE API answered every check.
# Check 1 read `commit:"unknown"` from a process started before the variable existed; check 0
# read a 404 from a gateway left over from an experiment. Nothing was wrong with the product.
#
# A harness that can silently measure the wrong process is worse than no harness. So: every
# port is checked before anything starts, and the failure names what to do.
assert_ports_free() {
  local busy=""
  for port in "$@"; do
    # ⚠️ THE PROBE RUNS IN A SUBSHELL, so fd 3 belongs to that subshell and is closed when it
    # exits. An `exec 3<&-` here would close a descriptor the parent never opened — and under
    # `set -e` a failing bare `exec` redirection TERMINATES a non-interactive shell, which is
    # exactly what it did: the script died silently at the first busy port, printing nothing.
    if (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; then busy="$busy $port"; fi
  done
  if [ -n "$busy" ]; then
    cat >&2 <<EOF

🛑 fullstack: these ports are ALREADY IN USE:$busy

   Something is still listening — almost certainly a previous run that was not torn down.
   A new run would fail to bind and the STALE process would answer the checks, so this
   refuses to start rather than measure the wrong thing.

   Clear it:   bash scripts/fullstack.sh down
   Or move:    FULLSTACK_PORT_BASE=59000 bash scripts/fullstack.sh

EOF
    exit 1
  fi
}

cmd_up() {
  mkdir -p "$RUN_DIR"
  assert_ports_free "$PORT_API" "$PORT_PORTAL" "$PORT_ADMIN" "$PORT_PGRST" "$PORT_GATEWAY" \
    "$PORT_APOLLO" "$PORT_PDL" "$PORT_HUNTER" "$PORT_STRIPE" "$PORT_GOOGLE" "$PORT_RESEND" \
    "$PORT_ANTHROPIC" "$PORT_SMTP" $((P + 15)) $((P + 23))
  : > "$PID_FILE"

  # ── 0 · the binary must be REAL PostgREST ──
  head2 "PostgREST"
  bash scripts/fullstack/fetch-postgrest.sh
  PGRST_BIN="${POSTGREST_BIN:-$REPO/scripts/fullstack/bin/postgrest}"
  [ -x "$PGRST_BIN" ] || fail "no PostgREST binary at $PGRST_BIN"
  PGRST_VERSION="$("$PGRST_BIN" --version)"
  say "$PGRST_VERSION"
  case "$PGRST_VERSION" in
    PostgREST*) ;;
    *) fail "that is not PostgREST: $PGRST_VERSION" ;;
  esac

  # ── 1 · the disposable database ──
  head2 "disposable PostgreSQL (scripts/realdb.sh)"
  # 🛑 THE SCHEMA COMES FROM THE SAME TREE AS THE PRODUCT (Fable C-12, 17 Sep). A RED run
  # that boots old code against the current schema can PASS for a reason that belongs to the
  # harness — which is exactly how check 6's first RED was rejected. One variable, one tree.
  [ "$TREE" = "$REPO" ] || say "⚠️  RED/ALT TREE — schema AND product both from $TREE"
  REALDB_SCHEMA_TREE="$TREE" \
    bash scripts/realdb.sh up >"$RUN_DIR/realdb.log" 2>&1 || {
      tail -40 "$RUN_DIR/realdb.log"
      # ⚠️ A REPLAY FAILURE IS EVIDENCE, NOT AN ABORT TO TIDY AWAY. If an older tree's
      # migration set cannot replay, that fact is the finding and the log above is its
      # record — Fable's C-12 ruling requires it reported rather than worked around.
      fail "realdb.sh up failed with schema from $TREE — the replay log above IS the evidence"
    }
  DB_URL="$(bash scripts/realdb.sh url)"
  say "$DB_URL"
  case "$DB_URL" in
    *127.0.0.1*kind_test*) ;;
    *) fail "refusing to continue: the database is not the disposable harness ($DB_URL)" ;;
  esac

  # ── 2 · the JWTs PostgREST will validate ──
  SERVICE_JWT="$(node scripts/fullstack/mint-jwt.mjs service_role "$JWT_SECRET")"
  ANON_JWT="$(node scripts/fullstack/mint-jwt.mjs anon "$JWT_SECRET")"
  say "service_role and anon JWTs minted (HS256, harness secret)"

  # ── 2b · ONE ADMIN IDENTITY, FOR CHECK 3's TIMEOUT HALF ONLY ────────────────────────────
  #
  # 🛑 WHAT THIS IS FOR, AND WHAT IT IS EXPLICITLY NOT FOR (Fable C-8, 17 Sep).
  #
  # Check 3's second half must prove the admin proxy answers 504 `timeout:true` — not "API
  # unreachable" — when its 45s bound is reached. The proxy sits behind #308's real
  # middleware, which requires a signed-in Supabase user on the admin allowlist. Without an
  # identity the middleware returns 401 long before the bound, so the sub-case was NOT-RUN.
  #
  # This seeds ONE `auth.users` row whose address is already the allowlist value exported in
  # `export_env`, and mints a session token for it with the SAME `mint-jwt.mjs` and the SAME
  # secret PostgREST validates — which the gateway then verifies by signature, not by trust.
  #
  # ⚠️ IT IS NOT A LOGIN AND IT DOES NOT WEAKEN #308. No password exists anywhere in this
  # harness, nothing is issued or refreshed, and `middleware.ts` is untouched — the product's
  # allowlist check runs for real against a real signed session.
  # ⚠️ AND IT IS NOT USED BY CHECK 1. Check 1 reads all three health endpoints with plain
  # unauthenticated HTTP, exactly as `ship.sh` does in production, precisely so that this
  # session cannot paper over the admin `/api/health` 401 defect (C-6, still unfixed).
  ADMIN_USER_ID="$(uuidgen 2>/dev/null || node -e 'process.stdout.write(require("crypto").randomUUID())')"
  ADMIN_EMAIL="fullstack-operator@example.invalid"
  PGPASSWORD="" "$(dirname "$(command -v psql 2>/dev/null || echo /usr/bin/psql)")/psql" -q "$DB_URL" -c \
    "insert into auth.users(id, email) values ('$ADMIN_USER_ID', '$ADMIN_EMAIL') on conflict (id) do nothing" \
    >/dev/null 2>&1 || fail "could not seed the admin auth.users row"
  ADMIN_JWT="$(node scripts/fullstack/mint-jwt.mjs authenticated "$JWT_SECRET" "$ADMIN_USER_ID" "$ADMIN_EMAIL")"
  say "one admin identity seeded ($ADMIN_EMAIL) and a session token minted — for check 3 only"

  # ── 3 · real PostgREST, then the path-rewriting gateway ──
  head2 "PostgREST + Supabase gateway"
  PGRST_DB_URI="$DB_URL" PGRST_DB_SCHEMAS="public" PGRST_DB_ANON_ROLE="anon" \
    PGRST_JWT_SECRET="$JWT_SECRET" PGRST_SERVER_PORT="$PORT_PGRST" PGRST_DB_POOL=10 \
    nohup "$PGRST_BIN" > "$RUN_DIR/postgrest.log" 2>&1 &
  track $! postgrest
  sleep 2
  grep -q "Listening on port" "$RUN_DIR/postgrest.log" 2>/dev/null || sleep 3
  # ⚠️ THE GATEWAY GETS THE SAME SECRET POSTGREST GOT. That is what lets it VERIFY a session
  # token's signature rather than decode and believe it — see `verifyBearer` in gateway.mjs.
  GATEWAY_PORT="$PORT_GATEWAY" GATEWAY_UPSTREAM_PORT="$PORT_PGRST" GATEWAY_DB_URL="$DB_URL" \
  GATEWAY_JWT_SECRET="$JWT_SECRET" \
    nohup node scripts/fullstack/gateway.mjs > "$RUN_DIR/gateway.log" 2>&1 &
  track $! gateway
  sleep 1
  say "postgrest :$PORT_PGRST   gateway :$PORT_GATEWAY (strips /rest/v1)"

  # ── 4 · the fakes ──
  head2 "provider fakes"
  FULLSTACK_PORT_BASE="$P" nohup node scripts/fullstack/fakes.mjs > "$RUN_DIR/fakes.log" 2>&1 &
  track $! fakes
  sleep 2
  wait_http "http://127.0.0.1:$PORT_APOLLO/__fake/count" "apollo fake" 30
  say "pdl :$PORT_PDL and hunter :$PORT_HUNTER are LISTENING and will answer 200 — their keys are SET"

  # ── 5 · the real processes ──
  export_env
  head2 "booting the real API, portal and admin from $TREE"

  # ⚠️ THE API IS BUILT AND RUN FROM `dist`, not from source through a transpiler. That is
  # exactly what Railway does (`"start": "node dist/index.js"`), so the run exercises the
  # artifact that actually ships — including anything `tsc` would refuse to emit.
  ( cd "$TREE" && npx tsc -p apps/api/tsconfig.json > "$RUN_DIR/api-build.log" 2>&1 ) \
    || { tail -20 "$RUN_DIR/api-build.log"; fail "the API did not compile"; }
  say "api compiled (node dist/index.js — the same command Railway runs)"
  ( cd "$TREE/apps/api" && nohup node dist/index.js > "$RUN_DIR/api.log" 2>&1 & echo $! > "$RUN_DIR/api.pid" )
  track "$(cat "$RUN_DIR/api.pid")" api
  wait_http "http://127.0.0.1:$PORT_API/health" "api" 90

  ( cd "$TREE/apps/portal" && nohup npx next start -p "$PORT_PORTAL" > "$RUN_DIR/portal.log" 2>&1 & echo $! > "$RUN_DIR/portal.pid" )
  track "$(cat "$RUN_DIR/portal.pid")" portal
  wait_http "http://127.0.0.1:$PORT_PORTAL/api/health" "portal" 90

  ( cd "$TREE/apps/admin" && nohup npx next start -p "$PORT_ADMIN" > "$RUN_DIR/admin.log" 2>&1 & echo $! > "$RUN_DIR/admin.pid" )
  track "$(cat "$RUN_DIR/admin.pid")" admin
  wait_http "http://127.0.0.1:$PORT_ADMIN/api/health" "admin" 90

  # ── A SECOND ADMIN, POINTED AT AN UPSTREAM THAT NEVER ANSWERS ───────────────────────────
  #
  # Check 3 must prove the admin proxy returns 504 `timeout:true` — not "API unreachable" —
  # when its 45s bound is reached. The bound is product code and is not edited; instead this
  # instance uses XC-3's own `ADMIN_API_UPSTREAM` seam to point at the hang fake. That is the
  # variable's purpose, so the sub-case exercises the real proxy against a real stall.
  #
  # ⚠️ OPT-OUT: FULLSTACK_SLOW_ADMIN=0 skips it (one Next boot, and the check then says the
  # sub-case was skipped rather than quietly passing).
  ADMIN_SLOW_URL=""
  if [ "${FULLSTACK_SLOW_ADMIN:-1}" = "1" ]; then
    PORT_ADMIN_SLOW=$((P + 23))
    ( cd "$TREE/apps/admin" && ADMIN_API_UPSTREAM="http://127.0.0.1:$((P + 15))" \
        nohup npx next start -p "$PORT_ADMIN_SLOW" > "$RUN_DIR/admin-slow.log" 2>&1 & echo $! > "$RUN_DIR/admin-slow.pid" )
    track "$(cat "$RUN_DIR/admin-slow.pid")" admin-slow
    wait_http "http://127.0.0.1:$PORT_ADMIN_SLOW/login" "admin-slow" 90
    ADMIN_SLOW_URL="http://127.0.0.1:$PORT_ADMIN_SLOW"
  fi

  cat > "$RUN_DIR/env.json" <<JSON
{
  "tree": "$TREE",
  "api": "http://127.0.0.1:$PORT_API",
  "portal": "http://127.0.0.1:$PORT_PORTAL",
  "admin": "http://127.0.0.1:$PORT_ADMIN",
  "adminSlow": "$ADMIN_SLOW_URL",
  "gateway": "http://127.0.0.1:$PORT_GATEWAY",
  "postgrest": "http://127.0.0.1:$PORT_PGRST",
  "postgrestVersion": "$PGRST_VERSION",
  "db": "$DB_URL",
  "serviceJwt": "$SERVICE_JWT",
  "adminJwt": "$ADMIN_JWT",
  "adminUserId": "$ADMIN_USER_ID",
  "adminEmail": "$ADMIN_EMAIL",
  "supabaseUrl": "http://127.0.0.1:$PORT_GATEWAY",
  "fakes": {
    "apollo": "http://127.0.0.1:$PORT_APOLLO",
    "pdl": "http://127.0.0.1:$PORT_PDL",
    "hunter": "http://127.0.0.1:$PORT_HUNTER",
    "stripe": "http://127.0.0.1:$PORT_STRIPE",
    "google": "http://127.0.0.1:$PORT_GOOGLE",
    "resend": "http://127.0.0.1:$PORT_RESEND",
    "anthropic": "http://127.0.0.1:$PORT_ANTHROPIC"
  },
  "commit": "$(cd "$TREE" && git rev-parse --short HEAD)",
  "runDir": "$RUN_DIR"
}
JSON
  echo ""
  say "READY — env written to $RUN_DIR/env.json"
}

cmd_checks() {
  [ -f "$RUN_DIR/env.json" ] || fail "nothing is up — run: bash scripts/fullstack.sh up"

  # 🛑 THE CHECKS PROCESS NEEDS THE ENVIRONMENT TOO, AND FORGETTING IT COST TWO DIAGNOSES.
  #
  # `run` calls `export_env` on its way through `cmd_up`, so the checks inherited it and this
  # was invisible. Invoked on its own against an already-`up` stack, `checks` had none of it —
  # and several checks import product modules directly (`alerts.js` → `@kind/db`, which throws
  # `Missing SUPABASE_URL` at module scope). Worse, the failures did not look like missing
  # env: check 5 reported eight wrong outcome classes, and I spent a round reading the product
  # before realising the harness had told the checks nothing.
  #
  # ⚠️ IT MUST MATCH WHAT THE PRODUCT WAS BOOTED WITH, so it is the same function and not a
  # second copy of the values. Ports and the database URL are recovered from the run's own
  # `env.json`/`realdb.sh`, which is what `up` wrote them from.
  DB_URL="$(bash scripts/realdb.sh url)"
  SERVICE_JWT="$(node -e 'process.stdout.write(require(process.argv[1]).serviceJwt)' "$RUN_DIR/env.json")"
  ANON_JWT="$SERVICE_JWT"
  ADMIN_JWT="$(node -e 'process.stdout.write(require(process.argv[1]).adminJwt || "")' "$RUN_DIR/env.json")"
  ADMIN_USER_ID="$(node -e 'process.stdout.write(require(process.argv[1]).adminUserId || "")' "$RUN_DIR/env.json")"
  ADMIN_EMAIL="$(node -e 'process.stdout.write(require(process.argv[1]).adminEmail || "")' "$RUN_DIR/env.json")"
  export_env

  head2 "the ten Batch 1b checks"
  node scripts/fullstack/checks.mjs "$RUN_DIR/env.json"
}

cmd_down() { KEEP=0; teardown; }

case "${1:-run}" in
  up)     trap - EXIT; cmd_up ;;
  checks) trap - EXIT; cmd_checks ;;
  down)   trap - EXIT; cmd_down ;;
  run)    trap teardown EXIT; cmd_up; cmd_checks ;;
  *)      fail "unknown command '${1}' — use run | up | checks | down" ;;
esac
