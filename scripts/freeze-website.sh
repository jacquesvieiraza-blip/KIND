#!/usr/bin/env bash
# freeze-website.sh — regenerate the website freeze manifest (scripts/website-freeze.json).
#
# THE RULE THIS SERVES (founder-locked 1 Aug, #605): THE WEBSITE DOES NOT CHANGE WITHOUT THE
# FOUNDER'S EXPLICIT COMMAND. Any PR that touches apps/website must (1) state the change to
# the founder in plain words, (2) get his approval, and only then (3) run this script so the
# gate goes green. `website-freeze.test.ts` fails on ANY drift from the manifest — that
# failure is the rule working, not a bug to silence.
#
# Usage:  bash scripts/freeze-website.sh      # after founder approval only
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

python3 - <<'PY'
import hashlib, json, os
root = 'apps/website'
manifest = {}
for dirpath, dirnames, filenames in os.walk(root):
    dirnames[:] = [d for d in dirnames if d not in ('node_modules',)]
    for f in sorted(filenames):
        # .deploy-stamp is written by every ship.sh run and is not content; dotfiles are
        # never served. Freezing them would break the gate on every ordinary deploy.
        if f.startswith('.'):
            continue
        p = os.path.join(dirpath, f)
        rel = os.path.relpath(p, root)
        with open(p, 'rb') as fh:
            manifest[rel] = hashlib.md5(fh.read()).hexdigest()
out = 'scripts/website-freeze.json'
with open(out, 'w') as fh:
    json.dump(manifest, fh, indent=1, sort_keys=True)
print(f'froze {len(manifest)} files -> {out}')
PY
