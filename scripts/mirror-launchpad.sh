#!/usr/bin/env bash
# mirror-launchpad.sh — make LAUNCH-PAD mirror PRODUCT-INVENTORY.
# Every LAUNCH-PAD item-table row whose first cell is a bare "#id" gets stamped
# with that item's CURRENT dot from the inventory, so the two docs can never
# drift. Status of record still lives ONLY in the inventory — this script just
# reflects it. Idempotent. Rows whose #id is not a real inventory item (e.g. PR
# numbers like #1021) are left untouched.
#
# Run after any dot change (flip-dots.sh / update-board.sh already chain here).
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
INV=docs/PRODUCT-INVENTORY.md
LP=docs/LAUNCH-PAD.md
TMP="$(mktemp)"

# 1. Build id -> dot from the inventory COUNT region.
#    Understands both table formats: A |id|dot|text|  ·  B |id|text|dot|
awk -F'|' '
  /<!-- COUNT:START -->/{inside=1}
  /<!-- COUNT:END -->/{inside=0}
  inside && NF>=4 {
    id=$2; gsub(/^ +| +$/,"",id)
    if(id ~ /^[0-9]+[a-z]?$/){
      c2=$3; gsub(/^ +| +$/,"",c2)
      c3=$4; gsub(/^ +| +$/,"",c3)
      dot=""
      if(c2 ~ /^(🟢|🩷|🟣|🟡|🔴|⏸)$/)      dot=c2
      else if(c3 ~ /^(🟢|🩷|🟣|🟡|🔴|⏸)$/) dot=c3
      if(dot!="") print id"\t"dot
    }
  }' "$INV" > "$TMP"

# 2. Stamp LAUNCH-PAD rows whose first cell is "#id" (optionally already "#id dot").
awk -F'|' -v OFS='|' -v mapf="$TMP" '
  BEGIN{ while((getline l < mapf)>0){ split(l,a,"\t"); m[a[1]]=a[2] } }
  {
    if(NF>=3){
      cell=$2; gsub(/^ +| +$/,"",cell)
      if(cell ~ /^#[0-9]+[a-z]?( (🟢|🩷|🟣|🟡|🔴|⏸))?$/){
        id=cell; sub(/^#/,"",id); sub(/ .*/,"",id)
        if(id in m){ $2=" #" id " " m[id] " "; n++ }
      }
    }
    print
  }
  END{ print "mirror-launchpad: stamped " n+0 " rows" > "/dev/stderr" }
' "$LP" > "$LP.new" && mv "$LP.new" "$LP"

rm -f "$TMP"
