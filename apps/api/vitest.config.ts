import { defineConfig } from 'vitest/config'
import path from 'path'

// WHY THIS FILE EXISTS.
//
// `@kind/shared` declares `"main": "./dist/index.js"`, and **`packages/shared/dist` is
// gitignored** — it is a build artifact, not source. So anything importing `@kind/shared`
// resolves to whatever happened to be built on that machine last.
//
// That bit us immediately. Pure logic was moved into `@kind/shared` so both consoles could
// share one copy; the container it was written in had a freshly built `dist`, so every test
// passed there — and on the founder's Mac the same suite died with
// `TypeError: loadError is not a function`, because his `dist` predated the new file. **The
// suite was green for a reason that did not reproduce**, which is the exact failure class
// this project has spent the week eliminating (#578 bash 3.2, #579 BSD awk, #582 a hardcoded
// container path).
//
// Tests now resolve `@kind/shared` to its SOURCE. A unit test should never depend on whether
// somebody remembered to run a build.
//
// `scripts/check.sh` also builds the package explicitly, so the type-check and the two Next
// builds — which legitimately consume `dist` — cannot go stale either. Both halves are
// needed: this alias fixes the tests, the gate step fixes everything else.
export default defineConfig({
  test: {
    // `vitest.setup.ts` deletes every provider API key before any test runs, so the suite
    // is structurally incapable of reaching PDL, Apollo, Hunter or Clearbit (R66).
    // ⚠️ MUST live under `test:` — at the config root it is silently ignored, which is
    // exactly how the first attempt "passed" while running nothing.
    setupFiles: [path.resolve(__dirname, '../../vitest.setup.ts')],
  },
  resolve: {
    alias: {
      '@kind/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
})
