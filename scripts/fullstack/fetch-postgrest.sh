#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════════════════
# BATCH 1b · GET THE REAL PostgREST BINARY — nothing else will do
#
# 🛑 WHY THIS IS A FETCH AND NOT A SHIM. The API talks to the database through
# `supabase-js`, which speaks PostgREST over HTTP. Fable ruled P1: use real PostgREST, do not
# build a PostgREST-compatible substitute. The reason is the §8.2-H lesson one layer up — a
# green run against a hand-written substitute would prove the substitute, and nothing would
# check that the substitute behaves like PostgREST.
#
# And the run has already justified that ruling: real PostgREST answers a MISSING TABLE with
# `PGRST205`, not the `42P01` this codebase's absence-tolerance checks for. A substitute
# written from the code's own assumptions would have returned 42P01 and hidden the defect.
#
# ⚠️ PINNED, AND THE CHECKSUM IS THE POINT. A harness that silently upgrades its own database
# gateway is a harness whose results move for reasons nobody recorded.
#
# ⚠️ NO DOCKER. PostgREST ships as a single static binary; this repo's environment has the
# docker CLI but no daemon (`/var/run/docker.sock` does not exist), and Fable's ruling forbids
# it anyway. Nothing here needs root.
# ══════════════════════════════════════════════════════════════════════════════════════════
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

VERSION="${POSTGREST_VERSION:-v13.0.4}"
ASSET="postgrest-${VERSION}-linux-static-x86-64.tar.xz"
URL="https://github.com/PostgREST/postgrest/releases/download/${VERSION}/${ASSET}"
# sha256 of postgrest-v13.0.4-linux-static-x86-64.tar.xz, recorded when it was first fetched.
EXPECTED_SHA="${POSTGREST_SHA256:-a0052c8d4726f52349e0298f98da51140ef4941855548590ee88331afa617811}"

DEST_DIR="scripts/fullstack/bin"
DEST="$DEST_DIR/postgrest"

say() { printf '   %s\n' "$*"; }

# Already have it, and it runs? Nothing to do.
if [ -x "$DEST" ] && "$DEST" --version >/dev/null 2>&1; then
  say "postgrest already present: $("$DEST" --version)"
  exit 0
fi

# An operator-supplied binary anywhere on PATH or in POSTGREST_BIN is equally valid — the
# point is a REAL PostgREST, not this particular download.
if [ -n "${POSTGREST_BIN:-}" ] && [ -x "${POSTGREST_BIN}" ]; then
  say "using POSTGREST_BIN=${POSTGREST_BIN} ($("${POSTGREST_BIN}" --version))"
  exit 0
fi

mkdir -p "$DEST_DIR"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo ""
echo "── fullstack: fetching real PostgREST ${VERSION}"
say "$URL"

# ⚠️ THE RELEASE *PAGE* AND THE GITHUB *API* ARE BLOCKED IN THIS ENVIRONMENT (HTTP 403); the
# release ASSET path is not. That distinction cost a wrong feasibility answer once — recorded
# here so the next person does not repeat the conclusion instead of the test.
if ! curl -sSL --fail --max-time 300 -o "$TMP/$ASSET" "$URL"; then
  cat <<EOF

🛑 fullstack: could not download PostgREST.

   Batch 1b requires the REAL PostgREST binary (Fable ruling P1 — no shim, no Docker).
   If this environment cannot reach the release asset, place the binary yourself:

     version : ${VERSION}
     asset   : ${ASSET}
     path    : $(pwd)/${DEST}      (or export POSTGREST_BIN=/path/to/postgrest)
     verify  : ${DEST} --version   → must print "PostgREST ${VERSION#v}"

EOF
  exit 1
fi

ACTUAL_SHA="$(sha256sum "$TMP/$ASSET" | cut -d' ' -f1)"
if [ "$ACTUAL_SHA" != "$EXPECTED_SHA" ]; then
  cat <<EOF

🛑 fullstack: PostgREST checksum MISMATCH — refusing to use it.

   expected ${EXPECTED_SHA}
   actual   ${ACTUAL_SHA}

   The harness gateway to the database is not something to run unverified. If the upstream
   asset legitimately changed, update POSTGREST_SHA256 in this script deliberately, in a
   commit that says why.

EOF
  exit 1
fi
say "sha256 verified"

tar -xJf "$TMP/$ASSET" -C "$TMP"
mv "$TMP/postgrest" "$DEST"
chmod +x "$DEST"
say "installed → $DEST ($("$DEST" --version))"
