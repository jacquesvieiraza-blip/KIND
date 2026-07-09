#!/usr/bin/env bash
# flip-dots.sh — flip inventory item dots, then regenerate every board surface.
#
# Usage:  scripts/flip-dots.sh <dot> <id> [<id> …]
#   e.g.  scripts/flip-dots.sh 🩷 421 422
#
# Rules (the automation contract, founder-locked 9 Jul):
#   • AUTOMATION may only flip 🔴/🟡/⏸ → 🩷 (live, NOT verified).
#   • 🟢 is FOUNDER-ONLY — this script refuses to set 🟢 unless FOUNDER_FLIP=1
#     (set by a human session on the founder's explicit "good", never by CI).
#   • Items already 🩷/🟢 are left alone (idempotent).
# Handles both inventory row formats:
#   A: | <id> | <dot> | text… |      B: | <id> | text… | <dot> |
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
INV=docs/PRODUCT-INVENTORY.md

DOT="${1:?usage: flip-dots.sh <dot> <id>…}"; shift
[ $# -ge 1 ] || { echo "flip-dots: no item ids given" >&2; exit 2; }

if [ "$DOT" = "🟢" ] && [ "${FOUNDER_FLIP:-}" != "1" ]; then
  echo "flip-dots: REFUSED — 🟢 is founder-only (set FOUNDER_FLIP=1 in a human session)" >&2
  exit 3
fi

flipped=0
for id in "$@"; do
  id="${id#\#}"
  before="$(grep -E "^\| ?${id}[a-z]? ?\|" "$INV" | head -1 || true)"
  if [ -z "$before" ]; then
    echo "flip-dots: WARN — item #$id not found; skipped" >&2
    continue
  fi
  cur="$(printf '%s\n' "$before" | grep -oE '🟢|🩷|🟣|🟡|🔴|⏸' | head -1 || true)"
  if [ "$cur" = "$DOT" ]; then continue; fi
  if [ "$DOT" = "🩷" ] && { [ "$cur" = "🟢" ] || [ "$cur" = "🩷" ]; }; then
    continue  # never downgrade
  fi
  # Format A (dot in col 2) then Format B (dot in col 3) — first match wins.
  sed -i -E "s%^(\| ?${id}[a-z]? ?\| ?)(🟢|🩷|🟣|🟡|🔴|⏸)( ?\|)%\1${DOT}\3%" "$INV"
  after="$(grep -E "^\| ?${id}[a-z]? ?\|" "$INV" | head -1)"
  if [ "$after" = "$before" ]; then
    sed -i -E "s%^(\| ?${id}[a-z]? ?\|[^|]*\| ?)(🟢|🩷|🟣|🟡|🔴|⏸)( ?\|)%\1${DOT}\3%" "$INV"
    after="$(grep -E "^\| ?${id}[a-z]? ?\|" "$INV" | head -1)"
  fi
  if [ "$after" != "$before" ]; then
    echo "flip-dots: #$id $cur → $DOT"
    flipped=$((flipped+1))
  else
    echo "flip-dots: WARN — could not flip #$id (row format unrecognised)" >&2
  fi
done

echo "flip-dots: $flipped flipped — regenerating boards"
scripts/update-board.sh
