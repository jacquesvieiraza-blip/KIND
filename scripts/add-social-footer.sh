#!/usr/bin/env bash
# add-social-footer.sh — put the social channels into the footer of every page on the site.
#
#   Usage:  scripts/add-social-footer.sh <linkedin-url> [youtube-url] [tiktok-url]
#   e.g.    scripts/add-social-footer.sh https://www.linkedin.com/company/milla-vida
#           scripts/add-social-footer.sh "$LI" https://www.youtube.com/@millaandvida https://www.tiktok.com/@millaandvida
#
# WHY THIS IS A SCRIPT AND NOT 28 HAND EDITS
# The site is 28 static HTML files, each carrying its OWN copy of the footer — so a
# "small footer change" is 28 identical edits, and the failure mode is the interesting
# one: hand-editing 28 copies is how three of them silently end up different. The script
# is idempotent (it removes any block it previously wrote before writing the new one), so
# re-running it to add YouTube/TikTok later, or to fix a typo, is the intended path.
#
# ⚠️ P12 — the website is founder-locked. This script exists under R28 (12 Aug), a NAMED,
# BOUNDED permission — *"i over rule this as it needs to be on the site"* — for social and
# channel links only. It must not grow into a general site editor.
#
# ⚠️ R29/R34 — NO NEWSLETTER LINK, EVER, from this script. beehiiv is parked; the channels
# are LinkedIn now, YouTube and TikTok when they launch. A link needs a destination: this
# writes only the URLs you actually pass it, and refuses to invent one.
#
# AFTER RUNNING: the P12 manifest must follow the approved change —
#     bash scripts/freeze-website.sh
# then commit both together. Never re-freeze to make a red gate green without the founder's
# approval for that exact change; the manifest follows approval, it does not grant it.
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

LI="${1:-}"
YT="${2:-}"
TT="${3:-}"
if [ -z "$LI" ]; then
  echo "usage: scripts/add-social-footer.sh <linkedin-url> [youtube-url] [tiktok-url]" >&2
  echo "  no LinkedIn URL given — refusing to write a placeholder to a LIVE site." >&2
  exit 2
fi
case "$LI" in https://*linkedin.com/*) ;; *) echo "add-social-footer: '$LI' is not a linkedin.com https URL" >&2; exit 3;; esac
if [ -n "$YT" ]; then
  case "$YT" in https://*youtube.com/*|https://youtu.be/*) ;; *) echo "add-social-footer: '$YT' is not a youtube URL" >&2; exit 3;; esac
fi
if [ -n "$TT" ]; then
  case "$TT" in https://*tiktok.com/*) ;; *) echo "add-social-footer: '$TT' is not a tiktok URL" >&2; exit 3;; esac
fi

START='<!-- SOCIAL:START (scripts/add-social-footer.sh — R28) -->'
END='<!-- SOCIAL:END -->'

block="$START
        <a href=\"$LI\" target=\"_blank\" rel=\"noopener\">LinkedIn</a>"
[ -n "$YT" ] && block="$block
        <a href=\"$YT\" target=\"_blank\" rel=\"noopener\">YouTube</a>"
[ -n "$TT" ] && block="$block
        <a href=\"$TT\" target=\"_blank\" rel=\"noopener\">TikTok</a>"
block="$block
        $END"

changed=0; skipped=0
for f in apps/website/*.html; do
  # The anchor is the "Get in touch" footer column, which every page carries.
  if ! grep -q '<h4>Get in touch</h4>' "$f"; then
    skipped=$((skipped+1)); continue
  fi
  python3 - "$f" "$START" "$END" "$block" <<'PY'
import sys, re
path, start, end, block = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
s = open(path, encoding='utf-8').read()
# Idempotent: drop any block we wrote before, so a re-run replaces rather than stacks.
s = re.sub(re.escape(start) + r'.*?' + re.escape(end), '', s, flags=re.S)
anchor = '<a href="support.html">Support</a>'
if anchor in s and start not in s:
    s = s.replace(anchor, anchor + '\n        ' + block, 1)
open(path, 'w', encoding='utf-8').write(s)
PY
  changed=$((changed+1))
done

echo "add-social-footer: $changed pages updated, $skipped skipped (no footer)"
echo "  LinkedIn: $LI"
[ -n "$YT" ] && echo "  YouTube:  $YT"
[ -n "$TT" ] && echo "  TikTok:   $TT"
echo "  Next: bash scripts/freeze-website.sh   (the P12 manifest follows the approved change)"
