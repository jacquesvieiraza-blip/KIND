#!/usr/bin/env bash
# demo-walk.sh — THE NORTHWIND DEMO, WALKED END TO END, AS A GATE (R173, 28 Sep).
#
# The founder, verbatim: "i need this demo enviroment to be perfect. match the exact flow. then
# when i add new fatures the demo also needs to be updated." A demo that silently stops matching
# the product is found by a prospect on a sales call; this finds it before a merge.
#
# What it does, against the real API + portal + admin + PostgREST (scripts/fullstack.sh):
#   1. sets the demo to each of the six stages through Vida's own route;
#   2. calls every Milla read AS the demo login and every Vida read for it, and checks the exact
#      numbers each screen must show (scripts/fullstack/demo-walk.mjs);
#   3. opens Milla and Vida in a real browser at every stage and fails on any error text
#      (scripts/fullstack/demo-shots.mjs) — skipped, loudly, only where no Chromium exists.
# A feature that changes a client screen and breaks the demo turns this red. Fix the demo
# (apps/api/src/lib/demo-northwind-data.ts) in the same PR — never loosen this walk.
set -u
cd "$(dirname "$0")/.."
RUN_DIR="${FULLSTACK_RUN_DIR:-${TMPDIR:-/tmp}/kind-fullstack}"
OUT="$RUN_DIR/demo-walk"
rc=0
bash scripts/fullstack.sh up || rc=1
if [ "$rc" = "0" ]; then
  node scripts/fullstack/demo-walk.mjs "$RUN_DIR/env.json" "$OUT" || rc=1
fi
CHROMIUM="${CHROMIUM:-/opt/pw-browsers/chromium}"
if [ "$rc" = "0" ]; then
  if [ -x "$CHROMIUM" ]; then
    [ -d /opt/node22/lib/node_modules ] && export NODE_PATH="${NODE_PATH:-/opt/node22/lib/node_modules}"
    CHROMIUM="$CHROMIUM" node scripts/fullstack/demo-shots.mjs "$RUN_DIR/env.json" "$RUN_DIR/demo-shots" "$OUT/session.json" || rc=1
    echo "   screenshots: $RUN_DIR/demo-shots"
  else
    echo "   ⚠️ browser scan SKIPPED — no Chromium at $CHROMIUM (set CHROMIUM=…). The API walk above still ran."
  fi
fi
bash scripts/fullstack.sh down || true
exit $rc
