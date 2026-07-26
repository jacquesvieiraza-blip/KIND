#!/usr/bin/env bash
# check.sh — THE GATE. Everything that must be true before code reaches clients.
#
# WHY THIS EXISTS (26 Jul): this repo has no CI. GitHub Actions is unavailable — the
# account is flagged, the appeal went unanswered and no further tickets can be raised — so
# for weeks the only thing standing between a broken change and production was somebody
# remembering to run the tests. Several things shipped that a two-second check would have
# caught.
#
# On this repo **merging to main IS deploying to the live site**, so the deploy is the only
# gate that actually matters. `ship.sh` calls this first and REFUSES TO DEPLOY if anything
# here fails. That makes a broken build impossible to ship rather than merely reported after
# the fact — which is stronger than what GitHub Actions would have given us.
#
# Run it yourself any time:  bash scripts/check.sh
#
# Nothing here talks to the network, so it cannot be blocked, rate-limited or flagged.

set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

FAILED=""
STEP=0
step() {   # step <label> <command...>
  STEP=$((STEP + 1))
  local label="$1"; shift
  echo ""
  echo "-- [$STEP] $label"
  # Each check runs to completion even if an earlier one failed, so one run tells you
  # EVERYTHING that is wrong. Aborting on the first failure means three runs to find three
  # problems, and that is how people start skipping the gate.
  if "$@"; then
    echo "   OK: $label"
  else
    echo "   *** FAILED: $label ***"
    FAILED="$FAILED
     · $label"
  fi
}

echo "==================== PRE-DEPLOY CHECK ===================="
echo "Nothing ships unless every one of these passes."

# 1. Does the API even compile? A type error here is a runtime crash on the money path.
step "API type-check" npx tsc --noEmit -p apps/api/tsconfig.json

# 2. The tests. Includes the money invariants — the pack boundary, the send gate — each of
#    which is a bug that reached production once already.
step "API tests" npx vitest run --reporter=dot

# 3. Do the two client-facing apps build? A Next build failure is a white screen for a
#    paying client, and it only shows up at build time.
step "Portal (Milla) build" npx next build apps/portal --no-lint
step "Admin (Vida) build"  npx next build apps/admin --no-lint

# 4. Do the docs still agree with themselves? Catches board drift, duplicate ids and the
#    banned stale claims. Cheap, and doc drift is what made the trackers untrustworthy.
step "Doc lint" bash scripts/doc-lint.sh

echo ""
echo "=========================================================="
if [ -n "$FAILED" ]; then
  echo "NOT SAFE TO SHIP. These failed:$FAILED"
  echo ""
  echo "Fix them and run this again. Do NOT deploy around it —"
  echo "on this repo main is live, so shipping a red build is shipping it to clients."
  exit 1
fi
echo "ALL CHECKS PASSED — safe to ship."
