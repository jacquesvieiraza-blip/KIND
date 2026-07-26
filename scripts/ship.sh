#!/usr/bin/env bash
# ship.sh — THE deploy command. One command, correct order, every time:
#   bash scripts/ship.sh
#
# What it does (and why):
#   1. Pulls latest main FIRST — tonight's failure mode was deploying before pulling,
#      so every upload matched what was live and Railway said "no changes" (skip).
#   2. Writes a .deploy-stamp (current commit sha) into each app before uploading —
#      so whenever there ARE new commits, the upload is guaranteed to differ and
#      Railway MUST build. When there are no new commits, it skips — and this script
#      SAYS SO in plain words instead of Railway's confusing message.
#   3. Deploys @kind/api, @kind/portal, @kind/admin AND the website, in that order.
#
# The website used to be deployed by hand (`railway up --service "KIND"`), OUTSIDE this
# script — so it missed both safety nets above: it was easy to upload before pulling
# (stale files → "no changes" → skip), and it had no stamp to force a rebuild. That is
# exactly how a merged-and-"deployed" website can still serve the OLD markup. It is in
# here now so one command ships everything, always from freshly-pulled code.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# ── 0/4  THE GATE ───────────────────────────────────────────────────────────────
# There is no CI on this repo (GitHub Actions unavailable — flagged account, appeal
# unanswered, no further tickets possible), and here main IS live. So the deploy is the only
# gate that matters, and this is it: type-check, the full test suite, both client-facing
# builds, doc-lint.
#
# The pull happens FIRST, inside this block, because checking the code you are about to
# replace tells you nothing — we must check what is actually going out.
#
# Two escape hatches, both deliberate:
#   SHIP_DRY_RUN=1  run the gate and STOP. Proves the wiring without deploying.
#   SKIP_CHECKS=1   deploy without checking. For env-var-only ships, where the checks
#                   cannot see the thing being changed. Warns loudly enough that nobody
#                   does it by accident.
echo ""
echo "== 0/4  Pulling, then checking =="
git checkout main --quiet
git pull --ff-only

if [ "${SKIP_CHECKS:-0}" = "1" ]; then
  echo ""
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  echo "!!  SKIP_CHECKS=1 — DEPLOYING WITHOUT CHECKS.              !!"
  echo "!!  main is LIVE. You are shipping straight to clients.     !!"
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  echo ""
elif ! bash scripts/check.sh; then
  echo ""
  echo "═══════════════ NOTHING WAS DEPLOYED ═══════════════"
  echo "The checks failed, so ship.sh stopped before touching Railway."
  echo "Whatever is live stays live — which is the safe outcome."
  echo ""
  echo "Fix what check.sh listed above, then run this again."
  exit 1
fi

if [ "${SHIP_DRY_RUN:-0}" = "1" ]; then
  echo ""
  echo "═══════════════ DRY RUN — STOPPING HERE ═══════════════"
  echo "The gate ran and passed. SHIP_DRY_RUN=1 means nothing is deployed."
  echo "Run without SHIP_DRY_RUN to ship for real."
  exit 0
fi
HEAD=$(git rev-parse --short HEAD)
echo "Local main is at: $HEAD  ($(git log -1 --pretty=%s | cut -c1-70))"

echo ""
echo "== 2/3  Stamping each app with $HEAD =="
# The stamp makes the upload provably different whenever the code moved.
for APP in api portal admin website; do
  PREV="none"
  [ -f "apps/$APP/.deploy-stamp" ] && PREV=$(cat "apps/$APP/.deploy-stamp")
  echo "$HEAD" > "apps/$APP/.deploy-stamp"
  if [ "$PREV" = "$HEAD" ]; then
    echo "  apps/$APP: already shipped at $HEAD — Railway will skip this one (correct: nothing new)."
  else
    echo "  apps/$APP: $PREV -> $HEAD — Railway will BUILD this one."
  fi
done

echo ""
echo "== 3/3  Deploying all four services =="
# One service failing must NOT silently swallow the rest. With `set -e` a single bad
# `railway up` (wrong/renamed service, not linked, network blip) aborted the whole script
# on the spot — so the services listed AFTER it were never deployed, with no obvious error.
# That is exactly how "I deployed and nothing changed" happens. Deploy each one
# independently, remember the result, and print an unmissable summary.
FAILED=""
deploy() {   # deploy <railway-service-name> <label>
  echo ""
  echo "-- deploying $2  (service: $1)"
  if railway up --detach --service "$1"; then
    echo "   OK: $2 upload accepted"
  else
    echo "   *** FAILED: $2 (service \"$1\") — see the error above ***"
    FAILED="$FAILED $2"
  fi
}

deploy "@kind/api"    "api"
deploy "@kind/portal" "portal"
deploy "@kind/admin"  "admin"
deploy "KIND"         "website"

echo ""
echo "=================== SHIP SUMMARY ==================="
if [ -n "$FAILED" ]; then
  echo "SOME SERVICES DID NOT DEPLOY:$FAILED"
  echo ""
  echo "Fix these before trusting anything you see live — the old version is still"
  echo "serving for each failed service. Most common cause: the Railway service name"
  echo "in this script no longer matches the real one. List the real names with:"
  echo "    railway status"
  echo "    railway service"
  exit 1
fi
echo "All four uploads accepted at $HEAD (api - portal - admin - website)."
echo ""
echo "Now confirm each actually BUILT: Railway -> service -> Deployments."
echo "A 'Skipped' there only ever means: that app had nothing new since the last ship."
