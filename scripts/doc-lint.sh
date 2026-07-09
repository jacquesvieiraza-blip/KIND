#!/usr/bin/env bash
# doc-lint.sh — the doc-drift firewall. Run before every docs commit; CI runs it too.
#
# WHY: docs drifted because the same fact lived in many places and was updated by
# memory (status dots in 4 docs; prices restated in prose; boards hand-typed).
# This script makes that class of drift FAIL THE COMMIT instead of surfacing weeks
# later. One fact, one home:
#   • STATUS  → docs/PRODUCT-INVENTORY.md only (script-counted board)
#   • PRICING → packages/shared/src/constants/index.ts (code) mirrored ONCE in
#               docs/run-costs-and-cashflow.md §0
#
# Checks:
#   1. Inventory board consistency  (delegates to count-inventory.sh --check)
#   2. LAUNCH-PAD board line == derived board (it drifted 98→111 on 9 Jul)
#   3. No '| Status |' table columns outside PRODUCT-INVENTORY
#   4. No duplicate item IDs inside the inventory COUNT region
#   5. Banned stale CLAIMS (tight patterns; history-marked lines are exempt;
#      pre-existing hits ride in the KNOWN_DIRTY burn-down until the
#      reconciliation pass clears them — new hits fail immediately)
#
# Usage:  scripts/doc-lint.sh          (exit 0 = clean, 1 = drift found)
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

FAIL=0
say() { echo "doc-lint: $*" >&2; }

# ── 1. Inventory board (marker + visible table + section headers) ────────────
if ! scripts/count-inventory.sh --check >/dev/null 2>&1; then
  say "FAIL [board] PRODUCT-INVENTORY board out of sync — run scripts/count-inventory.sh and update marker/table/headers"
  scripts/count-inventory.sh --check 2>&1 | sed 's/^/  /' >&2
  FAIL=1
fi

# ── 2. LAUNCH-PAD board line must equal the derived board ─────────────────────
derived="$(scripts/count-inventory.sh)"
lp_line="$(grep -m1 -oE '🟢[0-9]+ · 🩷[0-9]+ · 🟣[0-9]+ · 🟡[0-9]+ · 🔴[0-9]+ · ⏸[0-9]+' docs/LAUNCH-PAD.md || true)"
lp_sigma="$(grep -m1 -oE 'Σ[0-9]+' docs/LAUNCH-PAD.md || true)"
want_line="$(echo "$derived" | grep -oE '🟢[0-9]+ · 🩷[0-9]+ · 🟣[0-9]+ · 🟡[0-9]+ · 🔴[0-9]+ · ⏸[0-9]+')"
want_sigma="$(echo "$derived" | grep -oE 'Σ[0-9]+')"
if [ "$lp_line" != "$want_line" ] || [ "$lp_sigma" != "$want_sigma" ]; then
  say "FAIL [launchpad-board] LAUNCH-PAD Board line disagrees with the derived board"
  say "  launchpad: ${lp_line:-<none>} ${lp_sigma:-}"
  say "  derived  : $want_line $want_sigma"
  FAIL=1
fi

# ── 3. Status columns live ONLY in PRODUCT-INVENTORY ──────────────────────────
# (LAUNCH-PAD de-statused 9 Jul; V2-TRACKER rides the burn-down until the
#  reconciliation pass de-statuses it, then moves into this enforced list.)
STATUS_FREE=(docs/LAUNCH-PAD.md docs/KIND-MASTER.md docs/MILESTONE-0-CHECKLIST.md)
for f in "${STATUS_FREE[@]}"; do
  [ -f "$f" ] || continue
  if hits="$(grep -nE '\| *Status *\|' "$f")" && [ -n "$hits" ]; then
    say "FAIL [status-home] $f carries a Status column — status lives ONLY in PRODUCT-INVENTORY:"
    echo "$hits" | sed 's/^/  /' >&2
    FAIL=1
  fi
done

# ── 4. Duplicate item IDs corrupt the board ───────────────────────────────────
dups="$(awk '/<!-- COUNT:START -->/{inside=1;next} /<!-- COUNT:END -->/{inside=0} inside' docs/PRODUCT-INVENTORY.md \
  | grep -oE '^\| ?[0-9]+[a-z]? ?\|' | tr -d '| ' | sort | uniq -d)"
if [ -n "$dups" ]; then
  say "FAIL [dup-ids] duplicate item IDs in the inventory COUNT region: $(echo "$dups" | tr '\n' ' ')"
  FAIL=1
fi

# ── 5. Banned stale claims (tight patterns; history-marked lines exempt) ──────
# A line is exempt when it is clearly marked as history/defect-description:
HISTORY_RE='RETIRED|STALE|SUPERSEDED|superseded|retired|history|~~|no longer|was \$|kept as|dead|DEAD|defect|bug|conflict|false|WRONG|wrong|hunt|reword|remove'
# Tight patterns — stale CLAIMS only, not mentions:
BANNED=(
  'Start (your )?14-day( free)? trial'          # trial CTA (model has no trials)
  '14-day free trial\.'                          # trial claim as a sentence
  'Milla[^|]*\$49/mo|\$49/mo[^|]*Milla'          # agent monthly pricing (retired #431)
  'Vida[^|]*\$29/mo|\$29/mo[^|]*Vida'
  'Denise[^|]*\$39/mo(nth)?[^|]*(price|sub|bill)'
  '250M\+? (verified )?(B2B )?contacts'          # the false database claim
  'blended ARPU|Blended ARPU'                    # subscription-era revenue framing
)
# Pre-existing hits ride here until the reconciliation pass clears them
# (format: file:regex). EMPTY this list in Move 2 — do not add to it.
KNOWN_DIRTY=(
  'docs/run-costs-and-cashflow.md:blended ARPU|Blended ARPU'
  'docs/V2-TRACKER.md:14-day free trial'
)
DOCS=(docs/LAUNCH-PAD.md docs/PRODUCT-INVENTORY.md docs/KIND-MASTER.md docs/V2-TRACKER.md docs/run-costs-and-cashflow.md docs/MILESTONE-0-CHECKLIST.md)
for f in "${DOCS[@]}"; do
  [ -f "$f" ] || continue
  for pat in "${BANNED[@]}"; do
    skip=""
    for kd in "${KNOWN_DIRTY[@]}"; do
      [ "$kd" = "$f:$pat" ] && skip=1
    done
    [ -n "$skip" ] && continue
    if hits="$(grep -nE "$pat" "$f" | grep -vE "$HISTORY_RE")" && [ -n "$hits" ]; then
      say "FAIL [stale-claim] $f matches banned pattern '$pat' on a non-history line:"
      echo "$hits" | head -5 | sed 's/^/  /' >&2
      FAIL=1
    fi
  done
done

# ── verdict ───────────────────────────────────────────────────────────────────
if [ "$FAIL" -eq 0 ]; then
  echo "doc-lint: OK — no drift ($derived)"
  exit 0
fi
say "❌ drift found — fix the doc (or, for a genuine new home of a fact, update the lint in the same PR)"
exit 1
