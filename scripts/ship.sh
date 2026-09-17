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

# ══════════════════════════════════════════════════════════════════════════════════════════
# == 4/4  WHAT IS ACTUALLY SERVING? (XC-11) ==
#
# 🛑 THE GAP THIS CLOSES. Everything above proves an UPLOAD was accepted. Nothing proved a
# DEPLOY, and the two are different: Railway can accept an upload and then skip the build,
# fail it, or roll back — and the script's own last words were "now confirm each actually
# BUILT: Railway -> service -> Deployments", i.e. go and check by hand, four times, in a
# browser. In practice nobody did, which is how "I deployed and nothing changed" survived.
#
# ⚠️ READ-ONLY, AND IT CHANGES NO DEPLOY TARGET. Three GETs. It cannot break a ship; it can
# only tell you the ship did not land. It runs AFTER the summary so a deploy failure still
# exits non-zero on its own terms.
#
# ⚠️ IT COMPARES COMMITS, NOT "DID IT ANSWER". A 200 from the OLD build is the failure this
# is for — the service is up, healthy and serving last week's code. `/health` reports the
# commit it was built from (XC-4), so the only honest check is `reported == shipped`.
#
# ⚠️ AND IT IS NOT INSTANT. A Railway build takes minutes, so an immediate read legitimately
# shows the previous commit. It polls, and when it gives up it says NOT CONFIRMED rather than
# FAILED — "we stopped waiting" is not "it did not deploy" (the same distinction XC-3 put
# into the admin proxy).
#
# ⚠️ THE WEBSITE IS DELIBERATELY ABSENT. `apps/website/server.js` is FOUNDER-LOCKED (1 Aug,
# #605) and has no /health route; `website-freeze.test.ts` refuses one. Adding the route to
# make this list symmetrical would break a lock to satisfy a script, so the website is
# checked by eye and this says so rather than quietly implying four-service coverage.
# ══════════════════════════════════════════════════════════════════════════════════════════
if [ "${SHIP_SKIP_HEALTH:-}" = "1" ]; then
  echo ""
  echo "(health read skipped: SHIP_SKIP_HEALTH=1)"
  exit 0
fi

HEALTH_API="${SHIP_HEALTH_API:-https://kindapi-production-e64c.up.railway.app}"
HEALTH_PORTAL="${SHIP_HEALTH_PORTAL:-https://app.get-kind.com}"
HEALTH_ADMIN="${SHIP_HEALTH_ADMIN:-https://admin.get-kind.com}"
HEALTH_TRIES="${SHIP_HEALTH_TRIES:-20}"     # 20 x 15s = five minutes
HEALTH_WAIT="${SHIP_HEALTH_WAIT:-15}"

echo ""
echo "== 4/4  Reading /health on each service (expecting commit $HEAD) =="
echo "   Polling up to $HEALTH_TRIES times, ${HEALTH_WAIT}s apart. Ctrl-C is safe — the deploy continues."

# ⚠️ ALWAYS EXITS 0, AND THAT IS NOT LAZINESS — `set -euo pipefail` is on. A `curl` that
# cannot reach a service returns non-zero, and with `pipefail` that fails the whole command
# substitution, which under `set -e` would ABORT THE SHIP SCRIPT. A health READ must never be
# able to do that: it is the thing that reports, not the thing that ships. "No answer" is a
# result this function returns (as an empty string), never an error it raises.
read_commit() {   # read_commit <base-url> — prints the reported short sha, or nothing
  local body=""
  # Next's App Router serves the portal/admin route at /api/health; the Express API at /health.
  for path in /health /api/health; do
    body=$(curl -fsS --max-time 10 "$1$path" 2>/dev/null || true)
    case "$body" in
      *'"commit"'*) printf '%s' "$body" | sed -n 's/.*"commit":"\([^"]*\)".*/\1/p'; return 0 ;;
    esac
  done
  return 0
}

CONFIRMED=""
PENDING="api portal admin"
TRY=0
while [ "$TRY" -lt "$HEALTH_TRIES" ] && [ -n "$PENDING" ]; do
  TRY=$((TRY + 1))
  STILL=""
  for SVC in $PENDING; do
    case "$SVC" in
      api)    BASE="$HEALTH_API" ;;
      portal) BASE="$HEALTH_PORTAL" ;;
      admin)  BASE="$HEALTH_ADMIN" ;;
      *)      BASE="" ;;
    esac
    GOT=$(read_commit "$BASE")
    if [ "$GOT" = "$HEAD" ]; then
      echo "   ✅ $SVC is serving $HEAD  ($BASE)"
      CONFIRMED="$CONFIRMED $SVC"
    else
      STILL="$STILL $SVC"
      [ "$TRY" -eq 1 ] && echo "   … $SVC reports ${GOT:-no answer} (waiting for $HEAD)"
    fi
  done
  PENDING=$(echo "$STILL" | sed 's/^ *//')
  [ -n "$PENDING" ] && [ "$TRY" -lt "$HEALTH_TRIES" ] && sleep "$HEALTH_WAIT"
done

echo ""
echo "=================== LIVE COMMIT ==================="
echo "Shipped commit:  $HEAD"
[ -n "$CONFIRMED" ] && echo "Serving it:     $CONFIRMED"
if [ -n "$PENDING" ]; then
  # NOT a failure verdict. It is the honest one: the read stopped, the build may not have.
  echo "NOT CONFIRMED:  $PENDING"
  echo ""
  echo "This does NOT mean the deploy failed — it means these services had not answered with"
  echo "$HEAD by the time the read gave up. Either the build is still running, or it did not"
  echo "happen. Check Railway -> service -> Deployments, or re-read by hand:"
  echo "    curl -s $HEALTH_API/health | head -c 300"
  exit 2
fi
echo "All three API/portal/admin services are serving $HEAD."
echo ""
echo "⚠️ The WEBSITE is not in this check: apps/website/server.js is founder-locked (#605) and"
echo "   has no /health route. Confirm it by eye in Railway -> KIND -> Deployments."
