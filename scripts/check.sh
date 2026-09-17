#!/usr/bin/env bash
# check.sh — THE GATE. Everything that must be true before code can reach a client.
#
# WHY THIS EXISTS (26 Jul): there is no CI on this repo. GitHub Actions is unavailable —
# the account is flagged, the appeal went unanswered, and no further tickets can be raised.
# So for weeks the only thing between a broken change and production was somebody
# remembering to run the tests. Several things shipped that two seconds of checking would
# have caught.
#
# On this repo **merging to main IS deploying** — so the deploy is the only gate that
# actually matters, and this is it. `ship.sh` runs this first and REFUSES to deploy if
# anything fails. That makes a broken build impossible to ship rather than merely reported
# afterwards, which is stronger than what GitHub Actions would have given us.
#
# Run it yourself any time:   bash scripts/check.sh
#
# Nothing here touches the network, so it cannot be blocked, rate-limited or flagged.

set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

FAILED=""
STEP=0

step() {   # step <label> <command...>
  STEP=$((STEP + 1))
  local label="$1"; shift
  echo ""
  echo "── [$STEP] $label"
  # EVERY check runs even after an earlier one fails, so ONE run tells you EVERYTHING that
  # is wrong. Aborting on first failure means three runs to find three problems, and that is
  # how people start skipping the gate.
  if "$@"; then
    echo "   ✅ OK: $label"
  else
    echo "   ❌ FAILED: $label"
    FAILED="$FAILED
     · $label"
  fi
}

echo "════════════════════ PRE-DEPLOY CHECK ════════════════════"
echo "Nothing ships unless every one of these passes."

# ── [0] PREFLIGHT — is this machine able to run the checks at all? ───────────────
#
# The first time the founder ran this on his own Mac it reported three TypeScript
# errors ("Cannot find module 'nodemailer' / 'pg' / 'web-push'") — which read like the
# code was broken. It wasn't: node_modules simply hadn't been installed. A gate whose
# first failure sends you hunting for a bug that doesn't exist is worse than no gate,
# so the environment is checked FIRST and named plainly.
if [ ! -d node_modules ] || [ ! -d node_modules/.bin ]; then
  echo ""
  echo "🛑 STOP — dependencies are not installed on this machine."
  echo ""
  echo "   This is NOT a problem with the code. Run this once, then try again:"
  echo ""
  echo "       yarn install"
  echo ""
  exit 1
fi
if [ ! -d node_modules/nodemailer ] || [ ! -d node_modules/vitest ]; then
  echo ""
  echo "🛑 STOP — node_modules is out of date (packages are missing)."
  echo ""
  echo "   Someone added a dependency since your last install. Run:"
  echo ""
  echo "       yarn install"
  echo ""
  exit 1
fi

# 0. BUILD THE WORKSPACE PACKAGES FIRST — the gate must check what it is about to ship.
#
# `@kind/shared` declares `"main": "./dist/index.js"` and **`packages/shared/dist` is
# gitignored**: it is a build artifact, so it is whatever that machine last built, or absent.
# Nothing here built it, so every step below silently checked a STALE copy.
#
# It bit on the first run that mattered. Pure logic moved into `@kind/shared` so both consoles
# could share one copy; the container it was authored in had a fresh `dist`, so the suite was
# green there — and the founder's Mac died with `TypeError: loadError is not a function`,
# because his `dist` predated the new file. **The gate was green for a reason that did not
# reproduce** — the same shape as bash 3.2 (#578), BSD awk (#579) and a hardcoded container
# path (#582): tooling that works where it was written and nowhere else.
#
# The tests no longer depend on this (apps/api/vitest.config.ts aliases `@kind/shared` to its
# SOURCE), but the type-check and both Next builds legitimately consume `dist` — so it is
# built here, first, every time.
step "Shared package build" npx tsc -p packages/shared

# 1. Does the API compile? A type error here is a runtime crash on the money path.
step "API type-check" npx tsc --noEmit -p apps/api/tsconfig.json

# 2. The full suite — including the money invariants and the send-gate tests. Each of those
#    covers a bug that reached production once already.
step "API tests (full suite)" npx vitest run --reporter=dot

# 3. Do the two client-facing apps build? A Next build failure is a white screen for a
#    paying client, and it only ever shows up at build time.
step "Milla (portal) build" npx next build apps/portal --no-lint
step "Vida (admin) build"   npx next build apps/admin  --no-lint

# 4. Do the docs still agree with themselves? Catches board drift, duplicate ids and banned
#    stale claims. Cheap — and doc drift is what made the trackers untrustworthy.
step "Doc lint" bash scripts/doc-lint.sh

# ⚠️ 21 Aug — doc-lint asks "is the board correct TODAY?". This asks the question whose
# absence let the 79-item drift live: "would the tooling NOTICE if it stopped being
# correct?" The writer and the checker were both first-match-only, so a stale visible
# board row passed every gate. Runs entirely inside a throwaway git repo — it never
# touches the real docs, and it fails if it ever does.
step "Board tooling regression" bash scripts/board-tooling.test.sh

# ── [8] REAL-DATABASE TESTS — OPT-IN (§8.2-H) ───────────────────────────────────
#
# The 3,900 tests above run against a MOCKED `supabase-js`. A mock returns what the test
# author expected; a schema returns what it actually enforces. Anything whose truth lives
# in the database — a partial unique index refusing a second claim, a check constraint, an
# RPC's compare-and-set, a migration having applied at all — is unprovable above and
# provable only here, against a disposable PostgreSQL with the repo's own migrations
# applied (`scripts/realdb.sh`, documented in `scripts/realdb/README.md`).
#
# ⚠️ OPT-IN, and that is a deliberate trade. It needs local PostgreSQL SERVER binaries
# (`initdb`/`pg_ctl`), which `psql` alone does not give you. A gate that goes red because
# a machine lacks a server is a gate people stop running, and this repo has exactly one
# gate. So: `REAL_DB_TESTS=1 bash scripts/check.sh` turns it on, and it is REQUIRED before
# any batch of the MVP1 contract is handed over.
if [ "${REAL_DB_TESTS:-}" = "1" ]; then
  step "Real-database tests (disposable Postgres)" bash scripts/realdb.sh run
else
  echo ""
  echo "── [skipped] Real-database tests — set REAL_DB_TESTS=1 to run them"
  echo "   (needs local PostgreSQL server binaries; see scripts/realdb/README.md)"
fi

echo ""
echo "══════════════════════════════════════════════════════════"
if [ -n "$FAILED" ]; then
  echo "🛑 NOT SAFE TO SHIP. These failed:$FAILED"
  echo ""
  echo "Fix them and run this again. Do NOT deploy around it — on this repo main is live,"
  echo "so shipping a red build is shipping it to clients."
  exit 1
fi
echo "✅ ALL CHECKS PASSED — safe to ship."
