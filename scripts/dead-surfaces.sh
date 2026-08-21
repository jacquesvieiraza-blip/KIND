#!/usr/bin/env bash
# dead-surfaces.sh — find code that runs NOWHERE, before a prompt aims at it.
#
# ── WHY THIS EXISTS (founder-ordered 21 Aug 2026, R64) ────────────────────────
# Four times in one working session, the answer to "where does this live?" turned
# out to be "nothing calls it":
#   • governed documents — built, then found reachable from no screen
#   • the audit-failure alert — same
#   • POST /calendar/book — the authed booking path, called by zero screens
#   • the whole FIGSY chat panel — `AskFigsyButton` is mounted NOWHERE, and a
#     build prompt confidently named its table as "the conversation the client
#     actually sees". It is not. The client's chat is `/milla`, on a different
#     table entirely. That was caught by the founder's screenshot, not by us.
#
# The founder's point, verbatim: *"if i dont audit you properly you are going to
# break a perfectly good system."* His eyes were the only check. This script is
# the beginning of that check not being a person.
#
# ── WHAT IT REPORTS ──────────────────────────────────────────────────────────
#   1. COMPONENTS mounted nowhere — an exported React component in a components/
#      directory that no other file imports.
#   2. ENDPOINTS called by nothing — an API route whose path string appears in no
#      portal or admin source file.
#
# ── HOW TO READ IT ───────────────────────────────────────────────────────────
# A listing here is NOT automatically a bug. Legitimately-unreferenced things:
#   • webhook receivers (called by Stripe/Smartlead, never by our frontends)
#   • cron-invoked and operator-curl endpoints
#   • components rendered dynamically or re-exported through an index
# It is a QUESTION list, not a defect list. The rule it serves is narrow and
# absolute: **before building into a surface, prove which route renders it.**
# If the surface you are about to build into appears below, stop and find the
# one the user actually opens.
#
# Report-only by design — it prints and exits 0. It is deliberately NOT wired
# into check.sh: this is a thinking aid, and a gate that fires on legitimate
# webhooks would be trained away within a week.
#
# Usage:  bash scripts/dead-surfaces.sh
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

python3 - <<'PY'
import os, re, sys

def read(p):
    try:
        with open(p, encoding='utf-8') as fh: return fh.read()
    except Exception: return ''

def walk(root, exts):
    out = []
    for base, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in ('node_modules', '.next', 'dist', 'build', '.git')]
        for f in files:
            if f.endswith(exts): out.append(os.path.join(base, f))
    return out

APPS = [d for d in ('apps/portal/src', 'apps/admin/src') if os.path.isdir(d)]
front_files = [f for a in APPS for f in walk(a, ('.tsx', '.ts'))]
front_src = {f: read(f) for f in front_files}

# ── 1. COMPONENTS MOUNTED NOWHERE ────────────────────────────────────────────
# A component is "mounted" if any OTHER file names it. Checking the bare name
# rather than the import path catches re-exports and aliased imports too.
comp_files = [f for f in front_files
              if f.endswith('.tsx') and '/components/' in f.replace(os.sep, '/')
              and not f.endswith('.test.tsx')]

orphans = []
for f in comp_files:
    src = front_src[f]
    names = set(re.findall(r'export\s+(?:default\s+)?(?:function|const)\s+([A-Z]\w+)', src))
    if not names: continue
    for n in sorted(names):
        used = any(n in s for g, s in front_src.items() if g != f)
        if not used:
            orphans.append((n, f))

print('╭─ 1. COMPONENTS MOUNTED NOWHERE ' + '─' * 44)
if orphans:
    for n, f in orphans:
        print(f'│  {n:<28} {f}')
    print(f'│  → {len(orphans)} component(s). Before building into any of these, find the')
    print( '│    route the user actually opens. AskFigsyButton is why this section exists.')
else:
    print('│  none — every exported component is referenced somewhere')
print('╰' + '─' * 74)
print()

# ── 2. ENDPOINTS CALLED BY NOTHING ───────────────────────────────────────────
# Mount prefixes come from index.ts, so a reported path is the FULL path a
# frontend would have to call.
idx = read('apps/api/src/index.ts')
mounts = {}   # router variable -> mount prefix
for m in re.finditer(r"app\.use\(\s*'([^']+)'\s*,\s*(\w+)\s*\)", idx):
    mounts[m.group(2)] = m.group(1)

route_files = walk('apps/api/src/routes', ('.ts',))
endpoints = []
for f in route_files:
    if f.endswith('.test.ts'): continue
    src = read(f)
    for m in re.finditer(r"(\w+)\.(get|post|put|patch|delete)\(\s*'([^']*)'", src):
        var, verb, path = m.group(1), m.group(2).upper(), m.group(3)
        if var not in mounts: continue
        full = (mounts[var] + path).replace('//', '/')
        endpoints.append((verb, full, f))

# The literal a frontend would contain: the path with :params stripped back to
# its stable prefix, since callers build those segments by interpolation.
def probe(p):
    parts = p.split('/')
    keep = []
    for seg in parts:
        if seg.startswith(':'): break
        keep.append(seg)
    return '/'.join(keep)

all_front = '\n'.join(front_src.values())
uncalled = []
seen = set()
for verb, full, f in endpoints:
    pr = probe(full)
    if len(pr) < 4: continue          # too short to match meaningfully
    key = (verb, full)
    if key in seen: continue
    seen.add(key)
    if pr not in all_front:
        uncalled.append((verb, full, f))

print('╭─ 2. ENDPOINTS NO PORTAL/ADMIN SCREEN CALLS ' + '─' * 32)
if uncalled:
    for verb, full, f in sorted(uncalled)[:200]:
        print(f'│  {verb:<6} {full:<46} {os.path.basename(f)}')
    print(f'│  → {len(uncalled)} endpoint(s). Webhooks, cron and operator-curl routes belong')
    print( '│    here legitimately. An endpoint you expected a SCREEN to call does not.')
else:
    print('│  none')
print('╰' + '─' * 74)
print()
print(f'Scanned {len(front_files)} frontend files and {len(endpoints)} mounted routes.')
print('Report-only: this never fails a build. It answers one question —')
print('"does anything actually use this?" — before a prompt assumes the answer.')
PY
