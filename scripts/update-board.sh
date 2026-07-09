#!/usr/bin/env bash
# update-board.sh — regenerate every board surface from the derived counts.
# The ONLY way board numbers change (never hand-typed — RULEBOOK §10).
# Rewrites: the hidden <!-- BOARD --> marker · the visible 7-cell summary row ·
# the six section headers in PRODUCT-INVENTORY · the LAUNCH-PAD Board line.
# Idempotent; run after any dot flip. doc-lint passes by construction afterwards.
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

INV=docs/PRODUCT-INVENTORY.md
LP=docs/LAUNCH-PAD.md

board="$(scripts/count-inventory.sh)"   # e.g. 🟢111 · 🩷85 · 🟣3 · 🟡23 · 🔴213 · ⏸5 · Σ440
read -r g p v y r b s <<<"$(echo "$board" | grep -oE '[0-9]+' | tr '\n' ' ')"

# 1. hidden marker
sed -i -E "s|<!-- BOARD:[^>]*-->|<!-- BOARD: $board -->|" "$INV"

# 2. visible summary row (the first 7-cell bold-number row)
sed -i -E "0,/^\| \*\*[0-9]+\*\*( \| \*\*[0-9]+\*\*){6} \|$/s//| **$g** | **$p** | **$v** | **$y** | **$r** | **$b** | **$s** |/" "$INV"

# 3. section headers '# ░ <dot> LABEL (N) ░'
sed -i -E "s|^(# ░ 🟢[^(]*)\([0-9]+\)|\1($g)|" "$INV"
sed -i -E "s|^(# ░ 🩷[^(]*)\([0-9]+\)|\1($p)|" "$INV"
sed -i -E "s|^(# ░ 🟣[^(]*)\([0-9]+\)|\1($v)|" "$INV"
sed -i -E "s|^(# ░ 🟡[^(]*)\([0-9]+\)|\1($y)|" "$INV"
sed -i -E "s|^(# ░ 🔴[^(]*)\([0-9]+\)|\1($r)|" "$INV"
sed -i -E "s|^(# ░ ⏸[^(]*)\([0-9]+\)|\1($b)|" "$INV"

# 4. LAUNCH-PAD board line
sed -i -E "s|🟢[0-9]+ · 🩷[0-9]+ · 🟣[0-9]+ · 🟡[0-9]+ · 🔴[0-9]+ · ⏸[0-9]+ · \*\*Σ[0-9]+\*\*|🟢$g · 🩷$p · 🟣$v · 🟡$y · 🔴$r · ⏸$b · **Σ$s**|" "$LP"

# 5. LAUNCH-PAD item-table rows mirror the inventory dots (never hand-typed).
scripts/mirror-launchpad.sh

scripts/count-inventory.sh --check
