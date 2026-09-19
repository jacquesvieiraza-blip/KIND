#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════════════════
# XC-9 · RED PROOF — break the thing the guard guards, and watch the guard go red.
#
# ── WHY THIS IS A SCRIPT AND NOT A PARAGRAPH ────────────────────────────────────────────
#
# "The guard passes" proves nothing on its own: a guard that asserts the wrong text, reads a
# moved file, matches its own comment, or sits inside a branch nobody executes passes exactly
# as loudly as a real one. The only evidence that a guard has teeth is that it FAILS when the
# defect it names is reintroduced — and this wave found seven blind guards that way, every one
# of which had been green a minute earlier.
#
# So the evidence is reproducible rather than pasted: this applies one mutation, runs the test,
# restores the file byte-for-byte, and reports.
#
#   scripts/red-proof.sh <test-path> <source-path> <old-string> <new-string>
#
# ⚠️ IT ALWAYS RESTORES. The source file is copied first and put back on every exit path,
# including a failed run and a Ctrl-C, because a mutation left behind is a defect this script
# introduced rather than proved.
# ══════════════════════════════════════════════════════════════════════════════════════════
set -uo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: scripts/red-proof.sh <test-path> <source-path> <old-string> <new-string>" >&2
  exit 2
fi

TEST="$1"; SRC="$2"; OLD="$3"; NEW="$4"
[ -f "$TEST" ] || { echo "🛑 no such test: $TEST" >&2; exit 2; }
[ -f "$SRC" ]  || { echo "🛑 no such source: $SRC" >&2; exit 2; }

BACKUP="$(mktemp)"
cp "$SRC" "$BACKUP"
restore() { cp "$BACKUP" "$SRC"; rm -f "$BACKUP"; }
trap restore EXIT INT TERM

echo "── ① GREEN FIRST — the guard passes against correct code"
if ! npx vitest run "$TEST" >/dev/null 2>&1; then
  echo "🛑 the guard is ALREADY RED before any mutation. Fix that first; nothing below means anything." >&2
  exit 1
fi
echo "   ✅ green"

python3 - "$SRC" "$OLD" "$NEW" <<'PY' || { echo "🛑 the mutation could not be applied — the string was not found, so this proves nothing." >&2; exit 1; }
import sys
path, old, new = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(path).read()
if old not in s:
    sys.exit(1)
open(path, 'w').write(s.replace(old, new, 1))
PY

echo "── ② RED — the defect is reintroduced, and the guard must notice"
if npx vitest run "$TEST" >/dev/null 2>&1; then
  echo "🛑 STILL GREEN WITH THE DEFECT IN PLACE — this guard is blind. It asserts something other than what it claims." >&2
  exit 1
fi
echo "   ✅ red, as it must be"

restore
trap - EXIT INT TERM

echo "── ③ GREEN AGAIN — the file is restored and the guard passes"
npx vitest run "$TEST" >/dev/null 2>&1 || { echo "🛑 the restore did not put the file back." >&2; exit 1; }
echo "   ✅ green"
echo "RED PROOF PASSED — $TEST has teeth against: ${OLD:0:70}"
