#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════════════════
# THE LIVE CONVERSATION EVAL — Milla and Vida, against the real model.
#
# Every one of the repo's 8,400+ tests mocks the model, deliberately: the gate must be
# deterministic, free and offline. So the gate can prove the PLUMBING around a conversation
# and can never prove the CONVERSATION. This is the other half.
#
#   bash scripts/conversation-eval.sh            both
#   bash scripts/conversation-eval.sh milla      just Milla
#   bash scripts/conversation-eval.sh vida       just Vida
#
# ⚠️ IT COSTS REAL MONEY AND IT IS NOT THE GATE. `scripts/check.sh` never calls this, and
# `npx vitest run` cannot pick these files up — vitest's default include is
# `**/*.{test,spec}.*` and these end `.eval.ts`. Both facts are held by
# `apps/api/src/lib/eval-is-not-in-the-gate.test.ts`.
#
# ⚠️ NO KEY, NO RUN. Without ANTHROPIC_API_KEY every case SKIPS and this prints NOT RUN. A
# skipped eval is evidence of nothing and must never be reported as a pass.
#
# ⚠️ THE KEY IS READ FROM THE ENVIRONMENT AND NEVER PRINTED. Nothing here or in the eval
# files echoes its value.
# ═══════════════════════════════════════════════════════════════════════════════════════

cd "$(dirname "$0")/.."

WHICH="${1:-both}"
case "$WHICH" in
  milla) FILTER='milla.eval' ;;
  vida)  FILTER='vida.eval' ;;
  both)  FILTER='' ;;
  *) echo "usage: $0 [milla|vida|both]" >&2; exit 2 ;;
esac

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "LIVE MODEL EVAL = NOT RUN — ANTHROPIC_API_KEY unavailable."
  echo "  Set it in your shell and re-run. Nothing was called and nothing was spent."
  exit 0
fi

echo "▶ live conversation eval ($WHICH) — this calls the real model and costs real money."
echo "  @kind/shared is rebuilt first; the eval reads it from dist like the suite does."
yarn --cwd packages/shared build >/dev/null

# ⚠️ THE SEPARATE CONFIG IS THE ONLY REASON THESE FILES RUN AT ALL. The gate's root config
# leaves `include` at the vitest default, which does not match `.eval.ts`; vitest 4 has no
# `--include` flag, and a positional filter narrows the configured include rather than
# widening it. So the gate cannot reach these files even by accident.
npx vitest run --config vitest.eval.config.ts --reporter verbose ${FILTER:+"$FILTER"}
