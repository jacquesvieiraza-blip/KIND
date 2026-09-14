import { defineConfig } from 'vitest/config'
import path from 'path'

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE LIVE CONVERSATION EVAL RUNS FROM ITS OWN CONFIG, AND THAT IS THE ISOLATION.
//
// 🛑 THE GATE MUST NEVER BE ABLE TO RUN THIS. `scripts/check.sh` runs `npx vitest run` from
// the repository root, which loads `vitest.config.ts` — whose `include` is left at the
// default (`**/*.{test,spec}.*`). The eval files end `.eval.ts`, so the gate does not see
// them and could not be made to spend money or depend on a network even by accident.
//
// ⚠️ WHY A SECOND CONFIG RATHER THAN A CLI FLAG. Vitest 4 has no `--include`; positional
// arguments FILTER the configured include rather than widening it, so there is no way to
// reach a `.eval.ts` from the gate's config at all. A separate config is the honest
// mechanism, and it makes the isolation a file somebody has to deliberately edit.
//
// ⚠️ THE ZERO-SPEND SETUP STILL APPLIES. `vitest.setup.ts` deletes every PROVIDER key (PDL,
// Apollo, Hunter, Clearbit) before anything runs — so the eval can reach Anthropic, which is
// the entire point of it, and still cannot reach a paid data provider. The two kinds of
// spend are separate and only one of them is authorised here.
// ═══════════════════════════════════════════════════════════════════════════════════════
export default defineConfig({
  test: {
    include: ['apps/api/src/eval/**/*.eval.ts'],
    setupFiles: [path.resolve(__dirname, 'vitest.setup.ts')],
    // One conversation at a time. Thirty in parallel is a rate-limit test, not a behaviour
    // test, and a 429 in the middle of a run would read as a model failure.
    fileParallelism: false,
    maxConcurrency: 1,
    testTimeout: 120_000,
  },
})
