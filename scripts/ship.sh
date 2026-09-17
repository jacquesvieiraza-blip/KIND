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
# ══════════════════════════════════════════════════════════════════════════════════════════
# 🛑 THE SHIPPED SHA IS TRUNCATED HERE, TO THE PRODUCT'S LENGTH — NOT BY GIT (C-7, 17 Sep)
#
# This was `git rev-parse --short HEAD`, and that one word broke the whole four-service
# confirmation. `--short` picks its own abbreviation length and widens it as the repository
# grows: on this repo it returns **8** (`4977e45e`). Every service reports its commit through
# `@kind/shared`'s `resolveDeployedCommit`, which truncates to `SHORT_SHA_LENGTH = 7`
# (`4977e45`). So `[ "$GOT" = "$HEAD" ]` below compared 7 characters against 8 and could
# never match — XC-11's "all four services name the commit they are running" was
# unachievable in this repository, and `ship.sh` would have said NOT CONFIRMED for ever.
#
# ⚠️ NOTHING IN 9,000 TESTS COULD SEE IT. Every test of the resolver fed it a value and
# checked the resolver's own truncation — a value compared against itself. The two sides
# never met until the full-stack harness booted the real services and read them the way this
# script does.
#
# ⚠️ THE PRODUCT OWNS THE LENGTH. The constant stays 7 and this script conforms to it. Not
# `--short=7`: a length written in two places is a length that drifts, and `:0:7` here is
# pinned to `SHORT_SHA_LENGTH` by `xc11-migration-discipline.test.ts`, which fails and names
# the other side if either moves.
# ══════════════════════════════════════════════════════════════════════════════════════════
HEAD_FULL=$(git rev-parse HEAD)
HEAD="${HEAD_FULL:0:7}"
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

# ── ⚑ 18 Sep (XC-11, FOUNDER-APPROVED under #605's own exception) ────────────────────────
#
# 🛑 THE WEBSITE'S BUILD IDENTITY HAS TO BE A NON-DOTFILE, and that is the whole reason this
# line exists separately from the loop above. `apps/website/.deploy-stamp` has been written on
# every ship for months and is UNREADABLE over HTTP: `express.static` ignores dotfiles, so the
# locked catch-all answers with `index.html` instead — 119,926 bytes, at **HTTP 200**. Measured
# against the real locked server, not assumed.
#
# ⚠️ `server.js` IS NOT TOUCHED. The existing static handler already serves any ordinary file
# in this directory; it needs no route, no change and no redeploy of the lock. The founder
# approved this file by name under #605's *"if it in the future requires a website change you
# make it very clear then i approve"*.
#
# ⚠️ AND IT IS NOT GITIGNORED, DELIBERATELY. `.gitignore` already records why: `railway up`
# respects `.gitignore`, so an ignored file never reaches the deployed artifact and the read
# below would poll for something that was never shipped. `website-freeze.test.ts` excludes it
# by NAME instead, with the reason written next to the exclusion.
#
# Contents: the short shipped SHA only, newline-terminated. Nothing else. It cannot alter a page.
echo "$HEAD" > "apps/website/build-identity.txt"
echo "  apps/website/build-identity.txt: $HEAD  (served build identity — server.js untouched)"

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
# ⛓️ 18 Sep — ALL FOUR SERVICES ARE NOW READ. C-2 RESOLVED.
#
# The frozen contract asks for all four. My first cut read three and called the item green;
# GPT verification was right that three-of-four does not satisfy a four-service requirement,
# and it was escalated as a CONTRACT/CODE CONFLICT rather than worked around. **The founder has
# since approved the website build-identity file by name, under #605's own exception clause**
# (*"if it in the future requires a website change you make it very clear then i approve"*), so
# the website is in the read and XC-11 is no longer short of its requirement.
#
# ── WHAT WAS IN THE WAY, PROVEN RATHER THAN ASSUMED ───────────────────────────────────────
#
# `apps/website/server.js` is FOUNDER-LOCKED (1 Aug, #605 — *"lock in the site does not change
# after this. without my command and clear command"*). It has no /health route. I booted the
# real locked server and read it:
#
#   GET /.deploy-stamp    → 200, 119,926 bytes of index.html      ← the catch-all, NOT the stamp
#   GET /health           → 200, index.html                        ← same
#   GET /build-identity.txt (a NON-dotfile placed beside index.html)
#                         → 200, 8 bytes, the commit               ← served by the LOCKED server
#
# So two things are true at once:
#   · `ship.sh` ALREADY writes `apps/website/.deploy-stamp` on every run — but `express.static`
#     ignores dotfiles, so it is unreadable, and the catch-all answers **200 with HTML**. Any
#     naive health read would see a 200 and call it healthy. That is worse than no check.
#   · A non-dotfile in the same directory IS served, with **no change to server.js at all**.
#
# ── THE AUTHORISED CHANGE, AS IMPLEMENTED ─────────────────────────────────────────────────
#
# `apps/website/build-identity.txt` is written in the stamping step above and read below. It
# holds the short sha and nothing else, it cannot alter a page, and the locked `server.js` is
# untouched — the static handler it already has serves it.
#
# ⚠️ THE FREEZE IS NOT REGENERATED, AND THE FILE IS NOT GITIGNORED. `website-freeze.test.ts`
# excludes it BY NAME, with the reason written beside the exclusion. Regenerating the manifest
# would be wrong twice over: the file's content changes on every ship, so the manifest would
# drift every ship; and gitignoring it would be worse, because `railway up` respects
# `.gitignore` (the file already says so about `.deploy-stamp`) — an ignored file never reaches
# the deployed artifact, so the read would poll for something that was never shipped.
# ══════════════════════════════════════════════════════════════════════════════════════════
if [ "${SHIP_SKIP_HEALTH:-}" = "1" ]; then
  echo ""
  echo "(health read skipped: SHIP_SKIP_HEALTH=1)"
  exit 0
fi

HEALTH_API="${SHIP_HEALTH_API:-https://kindapi-production-e64c.up.railway.app}"
HEALTH_PORTAL="${SHIP_HEALTH_PORTAL:-https://app.get-kind.com}"
HEALTH_ADMIN="${SHIP_HEALTH_ADMIN:-https://admin.get-kind.com}"
HEALTH_WEBSITE="${SHIP_HEALTH_WEBSITE:-https://get-kind.com}"
HEALTH_TRIES="${SHIP_HEALTH_TRIES:-20}"     # 20 x 15s = five minutes
HEALTH_WAIT="${SHIP_HEALTH_WAIT:-15}"

echo ""
echo "== 4/4  Reading the build identity of all four services (expecting commit $HEAD) =="
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

# 🛑 THE WEBSITE IS READ BY **BODY CONTENT**, AND A STATUS CODE IS NOT EVIDENCE HERE.
#
# The locked `server.js` ends with `app.get('*')` → `sendFile(index.html)`. So EVERY unknown
# path answers **HTTP 200** with 119,926 bytes of markup — measured, not assumed:
#
#   GET /build-identity.txt  (before this change)  → 200, 119,926 bytes, NOT the sha
#   GET /.deploy-stamp                             → 200, 119,926 bytes, NOT the sha
#   GET /health                                    → 200, 119,926 bytes, NOT the sha
#
# A check that trusted the status code would therefore report the website GREEN for ever, on
# evidence that is the home page. This function returns a sha ONLY if the trimmed body IS a
# sha-shaped token: whitespace stripped, and the whole body must be hex of the same length the
# stamp writes. An HTML page cannot satisfy that, and neither can an error page, a CDN
# interstitial or a redirect body.
read_build_identity() {   # read_build_identity <base-url> — prints the served sha, or nothing
  local body=""
  body=$(curl -fsS --max-time 10 "$1/build-identity.txt" 2>/dev/null || true)
  # `tr -d` rather than a shell trim: the file is newline-terminated and a CDN may add \r.
  body=$(printf '%s' "$body" | tr -d '[:space:]')
  case "$body" in
    # Hex only, and 7–40 characters — the shape `git rev-parse --short` produces. Anything
    # containing a `<`, a space or a quote is not a build identity, whatever its status code.
    *[!0-9a-fA-F]*) return 0 ;;
    "")             return 0 ;;
  esac
  if [ "${#body}" -ge 7 ] && [ "${#body}" -le 40 ]; then printf '%s' "$body"; fi
  return 0
}

CONFIRMED=""
# ⚑ 18 Sep — ALL FOUR. The website joins the read via `build-identity.txt` (founder-approved
# under #605's exception); `server.js` is unchanged and the file is served by the static
# handler it already has.
PENDING="api portal admin website"
TRY=0
while [ "$TRY" -lt "$HEALTH_TRIES" ] && [ -n "$PENDING" ]; do
  TRY=$((TRY + 1))
  STILL=""
  for SVC in $PENDING; do
    case "$SVC" in
      api)     BASE="$HEALTH_API" ;;
      portal)  BASE="$HEALTH_PORTAL" ;;
      admin)   BASE="$HEALTH_ADMIN" ;;
      website) BASE="$HEALTH_WEBSITE" ;;
      *)       BASE="" ;;
    esac
    # Two readers, because the two shapes are genuinely different: a JSON `/health` that
    # REPORTS its commit, and a static file that IS its commit. The website must never be read
    # by the JSON reader — `/health` on it returns the home page at 200.
    if [ "$SVC" = "website" ]; then
      GOT=$(read_build_identity "$BASE")
    else
      GOT=$(read_commit "$BASE")
    fi
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
  echo "    curl -s $HEALTH_WEBSITE/build-identity.txt"
  exit 2
fi
echo "All four services are serving $HEAD (api - portal - admin - website)."
echo ""
echo "How each was read, because the two shapes are not the same evidence:"
echo "  api / portal / admin : GET /health (or /api/health) and the reported \"commit\" field."
echo "  website              : GET /build-identity.txt and the BODY, matched as a sha."
echo ""
echo "⚠️ The website read never trusts the status code. apps/website/server.js is"
echo "   founder-locked (#605) and its catch-all answers HTTP 200 with index.html for ANY"
echo "   unknown path — 119,926 bytes, measured — so a status-only check would report the"
echo "   website green for ever. The build-identity file is served by the static handler the"
echo "   locked server already has; server.js is untouched, and the file holds the sha only."
