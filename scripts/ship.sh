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

echo ""
echo "== 1/3  Getting the latest code =="
git checkout main --quiet
git pull --ff-only
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
railway up --detach --service "@kind/api"
railway up --detach --service "@kind/portal"
railway up --detach --service "@kind/admin"
railway up --detach --service "KIND"      # the marketing website (apps/website)

echo ""
echo "Done. Check Railway -> each service -> Deployments: new commits = Building/Success."
echo "A 'Skipped' here only ever means: that app had nothing new since the last ship."
