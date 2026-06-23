#!/usr/bin/env bash
# count-inventory.sh — the ONLY way the PRODUCT-INVENTORY status board gets its numbers.
# Why this exists: the dashboard used to be hand-typed and drifted (claimed 227 items when
# the real count was 214; one item read "live" when it wasn't). Numbers are now derived,
# never typed.  RULEBOOK §10: the board is script-generated; if you edit it by hand it lies.
#
# It counts ONLY real item rows inside the COUNT markers, and it understands BOTH table
# formats the inventory uses (we never reformat the tables — the script adapts to them):
#   Format A:  | <id> | <dot> | <item text> | <owner> |     (dot in column 2)
#   Format B:  | <id> | <item text> | <dot> | <owner> |     (dot in column 3)
#
# Usage:
#   scripts/count-inventory.sh           # print the derived board
#   scripts/count-inventory.sh --check   # exit 1 if the doc's <!-- BOARD: --> line disagrees
#
set -euo pipefail

DOC="${INVENTORY_DOC:-docs/PRODUCT-INVENTORY.md}"
START='<!-- COUNT:START -->'
END='<!-- COUNT:END -->'
DOTS=("🟢" "🩷" "🟣" "🟡" "🔴" "⏸")

[ -f "$DOC" ] || { echo "ERROR: $DOC not found" >&2; exit 2; }

# Pull only the lines between the COUNT markers (the live item region).
region="$(awk -v s="$START" -v e="$END" '
  $0 ~ s {inside=1; next}
  $0 ~ e {inside=0}
  inside {print}
' "$DOC")"

if [ -z "$region" ]; then
  echo "ERROR: no '$START'..'$END' markers found in $DOC" >&2
  exit 2
fi

declare -A count
total=0
for dot in "${DOTS[@]}"; do
  # Format A: id then dot.   Format B: id then a non-pipe cell then dot.
  a=$(printf '%s\n' "$region" | grep -cE "^\| ?[0-9]+[a-z]? ?\| ?${dot}( |\|)" || true)
  b=$(printf '%s\n' "$region" | grep -cE "^\| ?[0-9]+[a-z]? ?\|[^|]*\| ?${dot} ?\|" || true)
  n=$((a + b))
  count["$dot"]=$n
  total=$((total + n))
done

board="🟢${count["🟢"]} · 🩷${count["🩷"]} · 🟣${count["🟣"]} · 🟡${count["🟡"]} · 🔴${count["🔴"]} · ⏸${count["⏸"]} · Σ${total}"

if [ "${1:-}" = "--check" ]; then
  stated="$(grep -oE '<!-- BOARD:[^>]*-->' "$DOC" | head -1 | sed -E 's/<!-- BOARD: ?//; s/ ?-->//')"
  if [ "$stated" = "$board" ]; then
    echo "OK  board matches: $board"
    exit 0
  fi
  echo "MISMATCH" >&2
  echo "  doc  : ${stated:-<no BOARD marker>}" >&2
  echo "  real : $board" >&2
  exit 1
fi

echo "$board"
