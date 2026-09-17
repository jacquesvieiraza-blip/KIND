import { defineConfig, configDefaults } from 'vitest/config'
import path from 'path'

// WHY A ROOT CONFIG EXISTS AT ALL.
//
// `scripts/check.sh` runs `npx vitest run` from the REPOSITORY ROOT — the gate, the thing
// that decides whether a build ships. Without a config here, vitest ran with defaults and
// **never loaded `apps/api/vitest.config.ts`**, so anything wired only there was silently
// absent from the one run that matters. That is how the zero-spend setup file came to be
// green locally (`cd apps/api && vitest`) and red in the gate: two different runs, one
// config, and the gate was reading neither.
//
// Deliberately MINIMAL: setup only. Module resolution at root is left exactly as it was,
// because `check.sh` builds `@kind/shared` before this step and the tests resolve it from
// `dist` — changing that here would alter 3,500 tests to fix one.
export default defineConfig({
  test: {
    // Deletes every provider API key before any test runs, so the suite is structurally
    // incapable of reaching PDL, Apollo, Hunter or Clearbit (R66).
    setupFiles: [path.resolve(__dirname, 'vitest.setup.ts')],
    // ⛓️ ADDED with the real-database harness (§8.2-H). `*.realdb.test.ts` files need a
    // live PostgreSQL that `scripts/realdb.sh` creates; they are run by
    // `vitest.realdb.config.ts` and must NOT be picked up here. The gate has to stay
    // runnable on a machine with no database — a gate that needs a server is a gate
    // people stop running.
    exclude: [...configDefaults.exclude, '**/*.realdb.test.ts'],
  },
})
