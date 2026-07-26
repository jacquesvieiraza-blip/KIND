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

# BASH 3.2 SAFE — no associative arrays.
#
# This used `declare -A count`, which needs bash 4+. macOS still ships **bash 3.2**
# (2007 — Apple froze it over the GPLv3 licence change), so on the founder's Mac this
# script died with `declare: -A: invalid option` and doc-lint failed with it. It had
# therefore NEVER run there, silently, while passing in every Linux container.
#
# Found 26 Jul the first time the founder ran `scripts/check.sh` himself — which is
# exactly what a gate is for: it surfaces what only the real machine can see.
#
# Six named counters instead. Uglier, and it runs everywhere.
c_green=0; c_pink=0; c_purple=0; c_yellow=0; c_red=0; c_blocked=0
total=0
for dot in "${DOTS[@]}"; do
  # Format A: id then dot.   Format B: id then a non-pipe cell then dot.
  a=$(printf '%s\n' "$region" | grep -cE "^\| ?[0-9]+[a-z]? ?\| ?${dot}( |\|)" || true)
  b=$(printf '%s\n' "$region" | grep -cE "^\| ?[0-9]+[a-z]? ?\|[^|]*\| ?${dot} ?\|" || true)
  n=$((a + b))
  case "$dot" in
    "🟢") c_green=$n ;;
    "🩷") c_pink=$n ;;
    "🟣") c_purple=$n ;;
    "🟡") c_yellow=$n ;;
    "🔴") c_red=$n ;;
    "⏸")  c_blocked=$n ;;
  esac
  total=$((total + n))
done

board="🟢${c_green} · 🩷${c_pink} · 🟣${c_purple} · 🟡${c_yellow} · 🔴${c_red} · ⏸${c_blocked} · Σ${total}"

# Look a dot's derived count up by its emoji. This exists because the six named counters
# above replaced an associative array, and `--check` below still needs to go the other way:
# from a dot found in the doc, to the number it should be.
dot_count() {
  case "$1" in
    "🟢") printf '%s' "$c_green"   ;;
    "🩷") printf '%s' "$c_pink"    ;;
    "🟣") printf '%s' "$c_purple"  ;;
    "🟡") printf '%s' "$c_yellow"  ;;
    "🔴") printf '%s' "$c_red"     ;;
    "⏸")  printf '%s' "$c_blocked" ;;
    *) return 1 ;;
  esac
}

if [ "${1:-}" = "--check" ]; then
  # #322 — validate EVERY place the board is shown, not just the hidden marker.
  # The drift that bit us (🩷45/🔴126/Σ294 marker vs a visible table reading the
  # truth) slipped through precisely because --check only ever read the comment.
  # Now the hidden marker AND the visible summary table AND every section header
  # must agree with the script-derived counts, or the check fails loudly.
  fail=0

  # 1) Hidden marker: <!-- BOARD: … -->
  stated="$(grep -oE '<!-- BOARD:[^>]*-->' "$DOC" | head -1 | sed -E 's/<!-- BOARD: ?//; s/ ?-->//')"
  if [ "$stated" != "$board" ]; then
    echo "MISMATCH (hidden marker)" >&2
    echo "  marker: ${stated:-<no BOARD marker>}" >&2
    echo "  real  : $board" >&2
    fail=1
  fi

  # 2) Visible summary table — the first row of seven bold-number cells, in board
  #    order: 🟢 | 🩷 | 🟣 | 🟡 | 🔴 | ⏸ | Σ.
  trow="$(grep -E '^\| \*\*[0-9]+\*\*( \| \*\*[0-9]+\*\*){6} \|$' "$DOC" | head -1 || true)"
  if [ -z "$trow" ]; then
    echo "MISMATCH (visible table): no 7-column bold-number summary row found" >&2
    fail=1
  else
    read -r -a tnums <<< "$(printf '%s\n' "$trow" | grep -oE '[0-9]+' | tr '\n' ' ')"
    expect=("$c_green" "$c_pink" "$c_purple" "$c_yellow" "$c_red" "$c_blocked" "$total")
    labels=("🟢" "🩷" "🟣" "🟡" "🔴" "⏸" "Σ")
    for i in 0 1 2 3 4 5 6; do
      if [ "${tnums[$i]:-}" != "${expect[$i]}" ]; then
        echo "MISMATCH (visible table ${labels[$i]}): doc=${tnums[$i]:-<none>} real=${expect[$i]}" >&2
        fail=1
      fi
    done
  fi

  # 3) Section headers: '# ░ <dot> LABEL (N) ░' — N must equal the derived count
  #    for that dot (grouped-by-status headers are a board surface too).
  while IFS= read -r line; do
    hdot="$(printf '%s\n' "$line" | grep -oE '🟢|🩷|🟣|🟡|🔴|⏸' | head -1 || true)"
    hnum="$(printf '%s\n' "$line" | grep -oE '\([0-9]+\)' | head -1 | tr -dc '0-9' || true)"
    exp="$(dot_count "$hdot" || true)"
    if [ "$hnum" != "$exp" ]; then
      echo "MISMATCH (section header $hdot): doc=${hnum:-<none>} real=${exp:-<none>}" >&2
      fail=1
    fi
  done < <(grep -E '^# ░ (🟢|🩷|🟣|🟡|🔴|⏸).*\([0-9]+\) ░' "$DOC" || true)

  if [ "$fail" -eq 0 ]; then
    echo "OK  board matches (marker + visible table + section headers): $board"
    exit 0
  fi
  exit 1
fi

# THE FALL-THROUGH GUARD — reaching here in --check mode means the check ABORTED.
#
# This is not hypothetical. #578 replaced `declare -A count` with six named counters for
# bash 3.2, but left three `${count["🟢"]}` reads behind in --check. On a plain indexed
# array bash evaluates the subscript as ARITHMETIC, so it died with
# `🟢: syntax error: operand expected`, abandoned the whole if-block **mid-way**, resumed
# here, printed the board and **exited 0**. Checks 2 and 3 — the visible summary table and
# the section headers, i.e. the entire #322 hardening — never ran, and check 1's verdict
# was discarded. doc-lint calls this with `>/dev/null 2>&1` and reads only the exit code,
# so the gate reported "doc-lint: OK — no drift" over a check that was doing nothing.
#
# Fourth time this week a check has looked green while not running (#578 ×2, #579, this).
# So: in --check mode, falling out of the block is now itself a FAILURE, loudly.
if [ "${1:-}" = "--check" ]; then
  echo "ERROR: --check did not reach a verdict — the check ABORTED partway." >&2
  echo "       Do NOT read this as a pass. Re-run without redirecting stderr to see why." >&2
  exit 2
fi

echo "$board"
