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
# Exit code matters: 1 = real drift, 2 = the check itself could not run. Reporting the
# second as "board out of sync" would send the founder hunting a doc bug that isn't there.
board_out="$(scripts/count-inventory.sh --check 2>&1)" && board_rc=0 || board_rc=$?
if [ "$board_rc" -eq 2 ]; then
  say "FAIL [board] the board check ITSELF could not run — this is NOT a pass and NOT doc drift"
  printf '%s\n' "$board_out" | sed 's/^/  /' >&2
  FAIL=1
elif [ "$board_rc" -ne 0 ]; then
  say "FAIL [board] PRODUCT-INVENTORY board out of sync — run scripts/count-inventory.sh and update marker/table/headers"
  printf '%s\n' "$board_out" | sed 's/^/  /' >&2
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
STATUS_FREE=(docs/LAUNCH-PAD.md docs/KIND-MASTER.md docs/MILESTONE-0-CHECKLIST.md docs/V2-TRACKER.md)
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
# ⚠️ 6 Aug — three additions, each earned by a TRUE line the new patterns flagged:
#   • `NOT SOLD`      — an env row may name a retired product's price while saying it is dead
#   • `no "free..."`  — the truth banner literally says there is **no** "free to start"
#   • `No trial`      — same banner, same sentence
# A lint that fails on the sentence CORRECTING a claim teaches people to delete the lint.
HISTORY_RE='RETIRED|STALE|SUPERSEDED|superseded|retired|history|~~|no longer|was \$|kept as|dead|DEAD|defect|bug|conflict|false|WRONG|wrong|hunt|reword|remove|NOT SOLD|no "free to start"|No trial, no freebies|banner added|PREVIOUSLY SAID|Original text|RETIRED FRAMING'
# A DATED SESSION-LOG ENTRY IS HISTORY BY DEFINITION. `KIND-MASTER`'s log records what was
# true on the day — a 21-Jul entry describing the $1/$3 ladder is CORRECT, and "fixing" it
# would destroy the record the chain rule exists to protect. Matched against the
# `<lineno>:- **21 Jul` shape grep -n produces, since the ^ anchor sees the line number.
DATED_LOG_RE='^[0-9]+:[-|] \*\*[0-9]{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)'
# Tight patterns — stale CLAIMS only, not mentions:
BANNED=(
  'Start (your )?14-day( free)? trial'          # trial CTA (model has no trials)
  '14-day free trial\.'                          # trial claim as a sentence
  'Milla[^|]*\$49/mo|\$49/mo[^|]*Milla'          # agent monthly pricing (retired #431)
  'Vida[^|]*\$29/mo|\$29/mo[^|]*Vida'
  'Denise[^|]*\$39/mo(nth)?[^|]*(price|sub|bill)'
  '250M\+? (verified )?(B2B )?contacts'          # the false database claim
  'blended ARPU|Blended ARPU'                    # subscription-era revenue framing
  # ── Added 6 Aug (R11). Every one of these was LIVE in a doc on the day it was added,
  #    and the first two were in `sales-playbook.md` — the document the founder sells from.
  '\$1 reveal'                                   # the per-qualified-lead ladder, retired 24 Jul
  '\$1 per lead revealed'                        # same ladder, the customer-facing phrasing
  '\$99 (onboarding )?pack|pack[^|]{0,20}\$99'   # the pack price, re-locked to $299 on 3 Aug (#609)
  'Start free trial|Start your free trial'       # the trial, retired 1 Aug (#607)
  'free to start'                                # no-freebies lock, 24 Jul
  'no card required'                             # same lock — signup takes no card, but nothing RUNS free
)
# Pre-existing hits ride here until the reconciliation pass clears them
# (format: file:regex). EMPTY this list in Move 2 — do not add to it.
KNOWN_DIRTY=(
)  # emptied 9 Jul (Move 2 reconciliation) — do not add entries; fix the doc instead
# ⚠️ WIDENED 6 Aug (R11). This list held six docs, and `sales-playbook.md` was not one of
# them — which is exactly why a header labelled "PRICING (locked)" sat there quoting the
# RETIRED ladder for two weeks. A lint that only reads the docs already being maintained
# checks the ones least likely to be wrong.
# ⚠️ WIDENED AGAIN 11 Aug (#632) — the seven marketing docs were added to this list ON THE
# DAY THEY WERE WRITTEN, not later. Marketing docs are almost entirely price, offer and
# claim copy, which is the exact category that goes stale, and the 6-Aug lesson above is
# that an unlinted doc rots unnoticed. They get linted from birth.
# ── 11 Aug again (DOC-MAP): the index of every doc was itself unchecked, and it carried
#    "$99 onboarding pack" as the CURRENT money model five weeks after the 3-Aug re-lock —
#    while correctly describing, in another row, how a different doc had made the same
#    mistake. The map that catalogues the docs gets linted like one.
DOCS=(docs/LAUNCH-PAD.md docs/PRODUCT-INVENTORY.md docs/KIND-MASTER.md docs/V2-TRACKER.md docs/run-costs-and-cashflow.md docs/MILESTONE-0-CHECKLIST.md docs/sales-playbook.md docs/client-flow-sop.md docs/CORE-MAP.md docs/TECH-STACK.md docs/ENVIRONMENT.md docs/DOC-MAP.md docs/marketing/GTM-STRATEGY.md docs/marketing/GTM-ONE-PAGE.md docs/marketing/MARKETING-PLAN.md docs/marketing/founder-led-marketing-system.md docs/marketing/beehiiv-setup-checklist.md docs/marketing/founder-content-playbook.md docs/marketing/paid-ads-phase-plan.md docs/marketing/marketing-metrics-and-iteration.md docs/marketing/README-marketing.md docs/marketing/voice.md docs/marketing/warm-outreach-kit.md docs/marketing/bundle-source/README.md)
for f in "${DOCS[@]}"; do
  [ -f "$f" ] || continue
  # ── A FILE MARKED HISTORICAL AT THE TOP IS EXEMT FROM STALE-CLAIM CHECKS ──────
  # Added 6 Aug (R11). Some docs ARE the record of a finished phase — the M0 checklist
  # and the pink-walk list quote the retired per-qualified-lead ladder because that is
  # what the work was priced at. Rewriting them would destroy the record; leaving them
  # unmarked let them read as current. So the banner is now load-bearing: it exempts the
  # file, and the exemption is ANNOUNCED rather than silent, because an invisible skip is
  # how a lint quietly stops checking anything.
  if head -20 "$f" | grep -q '⚠️ \*\*HISTORICAL'; then
    say "  note: $f is marked HISTORICAL at the top — stale-claim patterns skipped for it"
    continue
  fi
  for pat in "${BANNED[@]}"; do
    skip=""
    # BASH 3.2 SAFE — expanding an EMPTY array under `set -u` is an "unbound variable"
    # error on bash 3.2 (macOS), and KNOWN_DIRTY has been empty since 9 Jul. Bash 4.4+
    # fixed this, which is why it only ever failed on the founder's Mac. The `+` form
    # expands to nothing at all when the array is empty.
    for kd in ${KNOWN_DIRTY[@]+"${KNOWN_DIRTY[@]}"}; do
      [ "$kd" = "$f:$pat" ] && skip=1
    done
    [ -n "$skip" ] && continue
    if hits="$(grep -nE "$pat" "$f" | grep -vE "$HISTORY_RE" | grep -vE "$DATED_LOG_RE")" && [ -n "$hits" ]; then
      say "FAIL [stale-claim] $f matches banned pattern '$pat' on a non-history line:"
      echo "$hits" | head -5 | sed 's/^/  /' >&2
      FAIL=1
    fi
  done
done

# ── 6. LAUNCH-PAD item rows must MIRROR the inventory dot ─────────────────────
# Every LAUNCH-PAD row whose first cell is "#id <dot>" must carry the SAME dot the
# inventory holds for that id. Regenerate with scripts/mirror-launchpad.sh.
# BSD AWK SAFE — the map goes through a FILE, never through -v.
#
# This passed the whole id=dot map (500+ lines) as `awk -v inv="$inv_dots"`. GNU awk
# accepts newlines in a -v assignment; **BSD awk, which is what macOS ships, does not** —
# it printed `awk: newline in string 477=🔴...` and gave up. `mismatch` then came back
# EMPTY, so this check reported OK **without comparing a single dot**.
#
# That is the third instance of one bug shape today: a check that looks green because it
# never ran. And this is the check that keeps LAUNCH-PAD honest against the inventory —
# the thing the entire doc system rests on. Found 26 Jul in the founder's own terminal.
#
# A temp file read in BEGIN works identically on both awks (mirror-launchpad.sh already
# does it this way).
INV_MAP="$(mktemp)"
trap 'rm -f "$INV_MAP"' EXIT
awk -F'|' '
  /<!-- COUNT:START -->/{inside=1} /<!-- COUNT:END -->/{inside=0}
  inside && NF>=4 { id=$2; gsub(/^ +| +$/,"",id);
    if(id ~ /^[0-9]+[a-z]?$/){ c2=$3; gsub(/^ +| +$/,"",c2); c3=$4; gsub(/^ +| +$/,"",c3);
      d=""; if(c2 ~ /^(🟢|🩷|🟣|🟡|🔴|⏸)$/) d=c2; else if(c3 ~ /^(🟢|🩷|🟣|🟡|🔴|⏸)$/) d=c3;
      if(d!="") print id"="d } }' docs/PRODUCT-INVENTORY.md > "$INV_MAP"

# If the map is empty the check CANNOT run — say so instead of passing silently.
if [ ! -s "$INV_MAP" ]; then
  say "FAIL [launchpad-mirror] could not read any dots from the inventory — this check did NOT run"
  FAIL=1
fi

mismatch="$(awk -F'|' -v mapf="$INV_MAP" '
  BEGIN{ while((getline line < mapf) > 0){ split(line,kv,"="); m[kv[1]]=kv[2] } }
  { cell=$2; gsub(/^ +| +$/,"",cell);
    if(cell ~ /^#[0-9]+[a-z]? (🟢|🩷|🟣|🟡|🔴|⏸)$/){
      split(cell,p," "); id=p[1]; sub(/^#/,"",id); dot=p[2];
      if((id in m) && m[id]!=dot) print "  #"id" LAUNCH-PAD="dot" inventory="m[id] } }' docs/LAUNCH-PAD.md)"
if [ -n "$mismatch" ]; then
  say "FAIL [launchpad-mirror] LAUNCH-PAD dots disagree with the inventory — run scripts/mirror-launchpad.sh:"
  echo "$mismatch" >&2
  FAIL=1
fi

# ── verdict ───────────────────────────────────────────────────────────────────
if [ "$FAIL" -eq 0 ]; then
  echo "doc-lint: OK — no drift ($derived)"
  exit 0
fi
say "❌ drift found — fix the doc (or, for a genuine new home of a fact, update the lint in the same PR)"
exit 1
