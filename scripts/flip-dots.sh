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
  # ── THE RATCHET, AND ITS ONE NAMED EXCEPTION ────────────────────────────────
  # 🟢 → 🩷 is refused by default: a walked item does not quietly become unwalked, and
  # an accidental re-run must never erase the founder's own verification.
  #
  # ⚠️ FOUNDER_UNFLIP=1 ADDED 12 Aug, and it exists because of a real event, not a
  # hypothetical. On 12 Aug five items were flipped 🟢 during the first A11 walk. Three
  # (#376 #383 #473) were awarded on the walk-list's claim that the System page measured
  # them — it does not measure any of the three. A 🟢 is "the founder verified this with
  # his own eyes", so three items were wearing a verification nobody performed, and a 🟢
  # item is never walked again: the error would have been permanent and invisible. One of
  # them (#383) was sitting on a live send-path defect.
  #
  # So reverting a wrongly-awarded green must be POSSIBLE, and must be as deliberate and
  # as auditable as awarding one. Same shape as FOUNDER_FLIP: a named variable, refused
  # by default, and the reason belongs in the row's chain and the session log.
  if [ "$DOT" = "🩷" ] && [ "$cur" = "🟢" ] && [ "${FOUNDER_UNFLIP:-}" != "1" ]; then
    echo "flip-dots: REFUSED — #$id is 🟢 and 🟢 does not go backwards. If a green was awarded" >&2
    echo "           on a claim that turned out to be wrong, set FOUNDER_UNFLIP=1 and chain the" >&2
    echo "           reason in the row. Never revert a green silently." >&2
    continue
  fi
  if [ "$DOT" = "🩷" ] && [ "$cur" = "🩷" ]; then
    continue  # already there
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
