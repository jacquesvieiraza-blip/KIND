#!/usr/bin/env python3
"""
MASTER.md structural cleanup script.
Steps:
1. Assert line 2351 (1-indexed) starts with "## 📅 5-DAY PLAN"
2. Assert line 4783 (1-indexed) starts with "## 24. ART OF POSSIBLE"
3. Delete lines 2351-2644 (1-indexed), i.e. 0-indexed 2350-2643
4. Delete lines 4489-5235 (1-indexed) of the NEW file, i.e. 0-indexed 4488-5234
   (= original 4783-5529 minus 294 shifted lines)
5. Write result back
"""

path = "/home/user/KIND/MASTER.md"

with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

print(f"Total lines before cleanup: {len(lines)}")

# Assertions (1-indexed line 2351 = 0-indexed 2350)
line_2351 = lines[2350]
line_4783 = lines[4782]

print(f"Line 2351: {repr(line_2351[:60])}")
print(f"Line 4783: {repr(line_4783[:60])}")

if not line_2351.startswith("## 📅 5-DAY PLAN"):
    raise AssertionError(f"Line 2351 does not start with '## 📅 5-DAY PLAN'. Got: {repr(line_2351[:80])}")

if not line_4783.startswith("## 24. ART OF POSSIBLE"):
    raise AssertionError(f"Line 4783 does not start with '## 24. ART OF POSSIBLE'. Got: {repr(line_4783[:80])}")

print("Both assertions passed. Proceeding with deletions...")

# Delete Block 1: lines 2351-2644 (1-indexed) = indices 2350-2643 (0-indexed, inclusive)
# That's 294 lines
before_block1 = lines[:2350]        # lines 1-2350
after_block1 = lines[2644:]         # lines 2645 onwards
lines_after_del1 = before_block1 + after_block1
deleted_count_1 = 2644 - 2350
print(f"Deleted Block 1: {deleted_count_1} lines (2351-2644 original 1-indexed)")
print(f"Lines after Block 1 deletion: {len(lines_after_del1)}")

# Delete Block 2 from the new line array:
# Original 4783-5529 shifted by -294 = 4489-5235 (1-indexed)
# 0-indexed: 4488-5234 (inclusive)
before_block2 = lines_after_del1[:4488]     # lines 1-4488
after_block2 = lines_after_del1[5235:]      # lines 5236 onwards
lines_final = before_block2 + after_block2
deleted_count_2 = 5235 - 4488
print(f"Deleted Block 2: {deleted_count_2} lines (post-shift 4489-5235 1-indexed)")
print(f"Lines after Block 2 deletion: {len(lines_final)}")

# Verify the new Block 1 start is right (check what was at original 2645 is now at 2351)
print(f"New line 2351: {repr(lines_final[2350][:60])}")
# Verify block 2 is gone - check what's now at position 4489
print(f"New line 4489: {repr(lines_final[4488][:60])}")

with open(path, "w", encoding="utf-8") as f:
    f.writelines(lines_final)

print(f"Done. Wrote {len(lines_final)} lines to {path}")
