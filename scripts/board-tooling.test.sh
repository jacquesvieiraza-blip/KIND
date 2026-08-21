#!/usr/bin/env bash
# board-tooling.test.sh — the regression test for the board writer + checker.
#
# ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────────
# On 21 Aug the founder found the inventory's visible status table reading
#   95 · 240 · 2 · 64 · 173 · 5 · 579
# while the real board was
#   106 · 308 · 2 · 49 · 187 · 6 · 658
# — 79 items stale — and **every gate was green**. It was not a missed run. The
# inventory carries TWO 7-cell board rows (an orphan between the <!-- BOARD -->
# markers, and the one under the legend that a human actually reads), and BOTH
# tools were first-match-only:
#   • update-board.sh   `$done ||= s/…/`   → repaired only the first row
#   • count-inventory.sh `grep … | head -1` → validated only the first row
# The writer and the checker were blind in exactly the same place, so the writer
# kept the checker happy and the visible table rotted in the gap between them.
#
# doc-lint answers "is the board correct today?". THIS answers the question whose
# absence let the bug live: "would the tooling NOTICE if it stopped being correct?"
#
# ── HOW IT IS ISOLATED, AND WHY IT HAS TO BE ────────────────────────────────────
# update-board.sh ends by calling mirror-launchpad.sh, which:
#   • `cd`s to `git rev-parse --show-toplevel` (so the caller's $PWD is irrelevant),
#   • hard-codes docs/PRODUCT-INVENTORY.md and docs/LAUNCH-PAD.md with NO override, and
#   • WRITES: `> "$LP.new" && mv "$LP.new" "$LP"`.
# So pointing INVENTORY_DOC at a fixture is NOT enough — the flow would still reach
# back into the real repo and rewrite the real LAUNCH-PAD. Instead the whole flow runs
# inside a THROWAWAY GIT REPO: `git rev-parse --show-toplevel` then resolves to the
# fixture, every hard-coded docs/… path lands inside it, and mirror-launchpad.sh needs
# no modification and cannot escape.
#
# Belt and braces: the real repo's `git status` for docs/ and scripts/ is snapshotted
# before and after, and a difference FAILS the test. Isolation is proven here, not
# promised in a comment.
set -uo pipefail

REAL_ROOT="$(git rev-parse --show-toplevel)"
pass=0; fail=0
ok()   { echo "   ✅ $1"; pass=$((pass+1)); }
bad()  { echo "   ❌ $1" >&2; fail=$((fail+1)); }

# The real repo's working-tree state BEFORE anything runs. Nothing this test does
# may change it.
before="$(cd "$REAL_ROOT" && git status --porcelain -- docs scripts)"

FIX="$(mktemp -d)"
trap 'rm -rf "$FIX"' EXIT

mkdir -p "$FIX/docs" "$FIX/scripts"
git -C "$FIX" init -q                       # ← this is what redirects the scripts
cp "$REAL_ROOT/scripts/count-inventory.sh" \
   "$REAL_ROOT/scripts/update-board.sh" \
   "$REAL_ROOT/scripts/mirror-launchpad.sh" "$FIX/scripts/"

# ── THE FIXTURE ────────────────────────────────────────────────────────────────
# Ten items with known dots: 🟢3 · 🩷2 · 🟣1 · 🟡1 · 🔴2 · ⏸1 · Σ10.
# Row 1 (the "orphan", between the BOARD markers) is CORRECT.
# Row 2 (under the legend) is STALE — the exact live defect, reproduced.
# The unrelated tables below must never be touched by the writer.
cat > "$FIX/docs/PRODUCT-INVENTORY.md" <<'FIXTURE'
# FIXTURE INVENTORY

<!-- BOARD: 🟢3 · 🩷2 · 🟣1 · 🟡1 · 🔴2 · ⏸1 · Σ10 -->
| **3** | **2** | **1** | **1** | **2** | **1** | **10** |

| 🟢 Live + verified | 🩷 Live, not walked | 🟣 Approved, not shipped | 🟡 Built, pending review | 🔴 Not built | ⏸ Blocked | Σ |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **1** | **1** | **1** | **1** | **1** | **1** | **6** |

## An unrelated table that must NOT be mistaken for a board
| Metric | Count |
|---|---|
| **12** | **34** |

| **1** | **2** | **3** | **4** | **5** | **6** | **7** | **8** |

<!-- COUNT:START -->
| 1 | 🟢 | first item | 🤖 |
| 2 | 🟢 | second item | 🤖 |
| 3 | 🟢 | third item | 🤖 |
| 4 | 🩷 | fourth item | 🤖 |
| 5 | 🩷 | fifth item | 🤖 |
| 6 | 🟣 | sixth item | 🤖 |
| 7 | 🟡 | seventh item | 🤖 |
| 8 | 🔴 | eighth item | 🤖 |
| 9 | 🔴 | ninth item | 🤖 |
| 10 | ⏸ | tenth item | 🧍 |
<!-- COUNT:END -->
FIXTURE

cat > "$FIX/docs/LAUNCH-PAD.md" <<'FIXTURE'
# FIXTURE LAUNCH PAD

**Board:** 🟢1 · 🩷1 · 🟣1 · 🟡1 · 🔴1 · ⏸1 · **Σ6** · live count: `scripts/count-inventory.sh`

| # | Action | Owner |
|---|---|---|
| #4 | mirror me | 🤖 |
FIXTURE

cd "$FIX"

echo ""
echo "── RED: the OLD first-match-only checker, against a stale second row"
# The old logic, reproduced exactly as it stood before this fix: take the FIRST
# 7-cell row and compare only that one.
old_verdict() {
  local doc="$1" expect="$2" trow tnums i
  trow="$(grep -E '^\| \*\*[0-9]+\*\*( \| \*\*[0-9]+\*\*){6} \|$' "$doc" | head -1 || true)"
  [ -n "$trow" ] || { echo FAILWOULD; return; }
  read -r -a tnums <<< "$(printf '%s\n' "$trow" | grep -oE '[0-9]+' | tr '\n' ' ')"
  read -r -a exp   <<< "$expect"
  for i in 0 1 2 3 4 5 6; do
    [ "${tnums[$i]:-}" = "${exp[$i]}" ] || { echo FAILWOULD; return; }
  done
  echo PASSWOULD
}
red="$(old_verdict docs/PRODUCT-INVENTORY.md "3 2 1 1 2 1 10")"
stale_row="$(sed -n '8p' docs/PRODUCT-INVENTORY.md)"
if [ "$red" = "PASSWOULD" ]; then
  ok "OLD checker PASSES while the legend row is stale — the bug, reproduced"
  echo "      stale row still reads: $stale_row"
else
  bad "expected the old checker to pass on the stale fixture; it did not (got $red)"
fi

echo ""
echo "── GREEN 1: the FIXED checker must FAIL that same stale condition"
if out="$(bash scripts/count-inventory.sh --check 2>&1)"; then
  bad "fixed checker PASSED on the stale fixture — the regression is back"
  echo "$out"
else
  if printf '%s' "$out" | grep -q 'visible table line 8'; then
    ok "fixed checker FAILS and names the row: $(printf '%s' "$out" | grep -m1 'line 8')"
  else
    bad "fixed checker failed, but did not name line 8"; echo "$out"
  fi
fi

echo ""
echo "── GREEN 2: update-board.sh must repair BOTH board rows"
bash scripts/update-board.sh >/dev/null 2>&1 || true
r1="$(sed -n '4p' docs/PRODUCT-INVENTORY.md)"
r2="$(sed -n '8p' docs/PRODUCT-INVENTORY.md)"
want='| **3** | **2** | **1** | **1** | **2** | **1** | **10** |'
if [ "$r1" = "$want" ] && [ "$r2" = "$want" ]; then
  ok "both rows now read the derived board (3·2·1·1·2·1·10)"
else
  bad "rows not repaired"; echo "      row1: $r1"; echo "      row2: $r2"
fi

if bash scripts/count-inventory.sh --check >/dev/null 2>&1; then
  ok "fixed checker PASSES once both rows agree"
else
  bad "checker still failing after update-board repaired the rows"
fi

echo ""
echo "── GREEN 3: unrelated markdown tables untouched"
u1="$(grep -c '^| \*\*12\*\* | \*\*34\*\* |$' docs/PRODUCT-INVENTORY.md)"
u2="$(grep -c '^| \*\*1\*\* | \*\*2\*\* | \*\*3\*\* | \*\*4\*\* | \*\*5\*\* | \*\*6\*\* | \*\*7\*\* | \*\*8\*\* |$' docs/PRODUCT-INVENTORY.md)"
if [ "$u1" = "1" ] && [ "$u2" = "1" ]; then
  ok "2-cell and 8-cell bold-number tables left exactly as they were"
else
  bad "an unrelated table was rewritten (2-cell found=$u1, 8-cell found=$u2)"
fi

echo ""
echo "── GREEN 4: LAUNCH-PAD mirroring still works, inside the fixture"
if grep -q '🟢3 · 🩷2 · 🟣1 · 🟡1 · 🔴2 · ⏸1 · \*\*Σ10\*\*' docs/LAUNCH-PAD.md; then
  ok "fixture LAUNCH-PAD board line regenerated"
else
  bad "fixture LAUNCH-PAD board line not updated"; grep -n 'Board:' docs/LAUNCH-PAD.md
fi
if grep -q '#4 🩷' docs/LAUNCH-PAD.md; then
  ok "fixture LAUNCH-PAD item row stamped from the inventory dot (#4 → 🩷)"
else
  bad "mirror-launchpad did not stamp the fixture row"; grep -n '#4' docs/LAUNCH-PAD.md
fi

echo ""
echo "── SAFETY: the real repository must be untouched by all of the above"
cd "$REAL_ROOT"
after="$(git status --porcelain -- docs scripts)"
if [ "$before" = "$after" ]; then
  ok "real docs/ and scripts/ unchanged — the fixture never leaked"
else
  bad "THE TEST WROTE TO THE REAL REPO. before/after differ:"
  diff <(printf '%s\n' "$before") <(printf '%s\n' "$after") >&2 || true
fi

echo ""
if [ "$fail" -eq 0 ]; then
  echo "board-tooling: OK — $pass checks passed"
  exit 0
fi
echo "board-tooling: FAILED — $fail failed, $pass passed" >&2
exit 1
