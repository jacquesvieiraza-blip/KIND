#!/usr/bin/env bash
# update-board.sh — regenerate every board surface from the derived counts.
# The ONLY way board numbers change (never hand-typed — RULEBOOK §10).
# Rewrites: the hidden <!-- BOARD --> marker · the visible 7-cell summary row ·
# the six section headers in PRODUCT-INVENTORY · the LAUNCH-PAD Board line.
# Idempotent; run after any dot flip. doc-lint passes by construction afterwards.
#
# ⚠️ 13 Aug — ALL IN-PLACE EDITS GO THROUGH PERL, NOT `sed -i`. The founder ran the boards
# scripts on his Mac for the first time and they died instantly: BSD sed treats the argument
# after `-i` as a BACKUP SUFFIX (so `-E` was eaten and the pattern parsed as basic-regex —
# his exact error, "\1 not defined in the RE"), and BSD sed has no GNU `0,/re/` first-match
# address at all. Same macOS class as #578 (bash 3.2) and #579 (BSD awk). perl ships on
# macOS and Linux and behaves identically on both, so the substitutions moved wholesale.
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

INV=docs/PRODUCT-INVENTORY.md
LP=docs/LAUNCH-PAD.md

board="$(scripts/count-inventory.sh)"   # e.g. 🟢111 · 🩷85 · 🟣3 · 🟡23 · 🔴213 · ⏸5 · Σ440
read -r g p v y r b s <<<"$(echo "$board" | grep -oE '[0-9]+' | tr '\n' ' ')"
export board g p v y r b s   # the perl one-liners read these via %ENV — no shell interpolation inside perl code

# 1. hidden marker
perl -i -pe 's|<!-- BOARD:[^>]*-->|<!-- BOARD: $ENV{board} -->|' "$INV"

# 2. EVERY visible summary row of 7 bold-number cells.
#
# ⚠️ 21 Aug — this line read `$done ||= s/…/` and that first-match-only behaviour is half
# of a two-part bug. The inventory carries TWO such rows: an orphan between the <!-- BOARD -->
# markers, and the one under the visible legend. This writer repaired only the orphan, and
# count-inventory.sh --check validated only the orphan (`head -1`) — so the row a human
# actually reads drifted 79 items out of date while every gate reported green. The writer
# and the checker were blind in the same place, which is why nothing caught it.
#
# The regex is deliberately UNCHANGED — it matches exactly 2 lines in the live docs tree,
# both of them the real board, so applying it to all matches widens nothing. What changed
# is only that we no longer stop after the first.
perl -i -pe 's/^\| \*\*\d+\*\*( \| \*\*\d+\*\*){6} \|$/| **$ENV{g}** | **$ENV{p}** | **$ENV{v}** | **$ENV{y}** | **$ENV{r}** | **$ENV{b}** | **$ENV{s}** |/' "$INV"

# 3. section headers '# ░ <dot> LABEL (N) ░'
perl -i -pe 's|^(# ░ 🟢[^(]*)\(\d+\)|${1}($ENV{g})|' "$INV"
perl -i -pe 's|^(# ░ 🩷[^(]*)\(\d+\)|${1}($ENV{p})|' "$INV"
perl -i -pe 's|^(# ░ 🟣[^(]*)\(\d+\)|${1}($ENV{v})|' "$INV"
perl -i -pe 's|^(# ░ 🟡[^(]*)\(\d+\)|${1}($ENV{y})|' "$INV"
perl -i -pe 's|^(# ░ 🔴[^(]*)\(\d+\)|${1}($ENV{r})|' "$INV"
perl -i -pe 's|^(# ░ ⏸[^(]*)\(\d+\)|${1}($ENV{b})|' "$INV"

# 4. LAUNCH-PAD board line
perl -i -pe 's|🟢\d+ · 🩷\d+ · 🟣\d+ · 🟡\d+ · 🔴\d+ · ⏸\d+ · \*\*Σ\d+\*\*|🟢$ENV{g} · 🩷$ENV{p} · 🟣$ENV{v} · 🟡$ENV{y} · 🔴$ENV{r} · ⏸$ENV{b} · **Σ$ENV{s}**|' "$LP"

# 5. LAUNCH-PAD item-table rows mirror the inventory dots (never hand-typed).
scripts/mirror-launchpad.sh

scripts/count-inventory.sh --check
