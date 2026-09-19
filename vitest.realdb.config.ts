import { defineConfig, configDefaults } from 'vitest/config'
import path from 'path'

// ── THE REAL-DATABASE SUITE — a SEPARATE run, on purpose ────────────────────────
//
// `*.realdb.test.ts` files need a live PostgreSQL. `npx vitest run` (the gate) must stay
// runnable on a laptop with no database, so those files are EXCLUDED from the default
// config and included only here. `scripts/realdb.sh run` creates the database, exports
// `REALDB_URL` and invokes this config.
//
// ⚠️ A real-DB file must never be picked up by the default run. Two halves enforce that:
// this config's `include` is the only place they are named, and `vitest.config.ts` /
// `apps/api/vitest.config.ts` exclude the pattern explicitly. Losing either half turns
// every laptop run red — which is how gates stop being run.
//
// The provider-key deletion from `vitest.setup.ts` applies here too: a real database is
// not permission to reach a paid provider.
export default defineConfig({
  test: {
    include: ['**/*.realdb.test.ts'],
    exclude: [...configDefaults.exclude, '**/packages/shared/dist/**'],
    setupFiles: [path.resolve(__dirname, 'vitest.setup.ts')],
    // One database, shared by every file: the harness gives each test its own client rows,
    // so isolation comes from distinct ids rather than from distinct databases. Running
    // files in parallel against one cluster invites cross-file interference on the
    // *global* tables (app_settings, cron_claims), so they run one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: {
      '@kind/shared': path.resolve(__dirname, 'packages/shared/src/index.ts'),
      '@': path.resolve(__dirname, 'apps/admin/src'),
    },
  },
})
