#!/usr/bin/env bash
# FULL CHECK — surfaces the facts for every audit category in FULL_CHECK.md.
# This does NOT replace reasoning. It guarantees the raw facts are on the table
# so an audit cannot silently skip a category. Run from repo root.
#
# Born 2 June 2026 after a "full teardown" missed that the platform has no
# Railway backup and no static-CDN failover.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

bold(){ printf "\n\033[1m\033[36m== %s ==\033[0m\n" "$1"; }
warn(){ printf "\033[33m  ⚠ %s\033[0m\n" "$1"; }
ok(){   printf "\033[32m  ✓ %s\033[0m\n" "$1"; }

bold "1. SINGLE POINTS OF FAILURE / REDUNDANCY"
echo "  Services and where they run:"
for svc in portal admin api website; do
  if [ -d "apps/$svc" ]; then
    host="Railway"
    [ -f "apps/$svc/vercel.json" ] && host="$host (+stale vercel.json)"
    echo "    - apps/$svc → $host"
  fi
done
echo "  Static-CDN failover for marketing site?"
if find apps/website -name "_redirects" -o -name "netlify.toml" -o -name "wrangler.toml" 2>/dev/null | grep -q .; then
  ok "CDN config found"
else
  warn "NO static-CDN failover — get-kind.com dies if Railway is down"
fi
echo "  Render API warm standby?"
if [ -f "render.yaml" ]; then
  ok "render.yaml exists — standby deploy config present"
  # If curl available, ping the standby health endpoint (skip gracefully if not reachable)
  if command -v curl >/dev/null 2>&1; then
    RENDER_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 \
      "https://kind-api-standby.onrender.com/health" 2>/dev/null || echo "ERR")
    if [ "$RENDER_HEALTH" = "200" ]; then
      ok "Render standby is LIVE (/health → 200)"
    else
      warn "Render standby health check returned: $RENDER_HEALTH (may be starting up, or not yet deployed)"
    fi
  fi
else
  warn "NO render.yaml — API has zero failover. Railway outage = total outage."
fi
echo "  Cloudflare LB for api.get-kind.com?"
if grep -q "api.get-kind.com" docs/render-cloudflare-failover.md 2>/dev/null; then
  ok "LB setup guide exists (docs/render-cloudflare-failover.md)"
else
  warn "No LB documentation found"
fi
echo "  Status page for downtime?"
grep -rqi "status.get-kind\|maintenance" apps/website 2>/dev/null && ok "status reference found" || warn "no public status/maintenance page found in website"

bold "2. DEAD / DUPLICATE CONFIG & FILES"
find apps -name "vercel.json" 2>/dev/null | grep -v node_modules | sed 's/^/    stale-config: /'
find apps -name "*..png" -o -name "*..jpg" 2>/dev/null | grep -v node_modules | sed 's/^/    dup-file: /'
echo "  Mounted-but-legacy payment routes:"
grep -nE "paystack|flutterwave" apps/api/src/index.ts 2>/dev/null | grep -i "app.use\|Router" | sed 's/^/    /'

bold "3. STUBS / TODOs / FAKE DATA"
grep -rIn "TODO\|FIXME\|STUB" apps/*/src 2>/dev/null | grep -v node_modules | grep -v ".next" | wc -l | xargs printf "  %s TODO/FIXME/STUB markers in app source\n"

bold "4. BUILD HEALTH (TypeScript)"
for app in portal api admin; do
  if [ -f "apps/$app/tsconfig.json" ]; then
    if npx tsc --noEmit -p "apps/$app/tsconfig.json" >/dev/null 2>&1; then
      ok "$app: tsc clean"
    else
      warn "$app: tsc ERRORS — run: npx tsc --noEmit -p apps/$app/tsconfig.json"
    fi
  fi
done

bold "5. GIT STATE"
if [ -n "$(git status --porcelain)" ]; then
  warn "uncommitted changes:"
  git status --short | sed 's/^/    /'
else
  ok "working tree clean"
fi
unpushed=$(git log @{u}..HEAD --oneline 2>/dev/null | wc -l)
[ "$unpushed" -gt 0 ] && warn "$unpushed commits not pushed" || ok "all commits pushed"

bold "6. BRAND CONSISTENCY (purple lock)"
blues=$(grep -rIl "#0066FF\|#2563eb\|#4f46e5\|#3b82f6\|#1d4ed8" apps/website/*.html 2>/dev/null | wc -l)
[ "$blues" -eq 0 ] && ok "zero non-purple blues in website HTML" || warn "$blues HTML files still contain blue hex values"

bold "7. WEBSITE LINK / PLACEHOLDER CHECK"
ph=$(grep -rl "\[PLACEHOLDER\]\|href=\"#\"" apps/website/*.html 2>/dev/null | wc -l)
[ "$ph" -eq 0 ] && ok "no placeholders / dead anchors" || warn "$ph HTML files have [PLACEHOLDER] or href=\"#\""

printf "\n\033[1mNow open FULL_CHECK.md and answer sections 1, 2, 5, 8 by reasoning — the script cannot judge those.\033[0m\n\n"
