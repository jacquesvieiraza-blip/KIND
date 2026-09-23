// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 23 Sep (R137) — THE LEGACY-ERA FIXTURE STAYS A TEST FIXTURE
//
// `apps/api/test-support/legacy-era-commercial-model.ts` puts the pre-R137 resolver back — the
// one that granted the retired $4-per-lead path to NULL and 'legacy' clients — so the code R137
// made unreachable keeps its tests until that code is deleted by its own PR (R131: *"Do not
// weaken existing tests to make the build pass."*).
//
// 🛑 A RESOLVER THAT REOPENS THE $4 PATH MUST NEVER BE REACHABLE FROM PRODUCTION, and must not
// quietly spread to test files that are meant to prove production's behaviour. So:
//   ① no application file imports it (it also lives outside the API build's `rootDir`);
//   ② exactly the listed test files use it — a new user has to be added here, visibly;
//   ③ `commercial-model.test.ts`, which proves production's R137 behaviour, is not one of them.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

const API = join(__dirname, '..', '..')
const REPO = join(API, '..', '..')
const MARK = 'test-support/legacy-era-commercial-model'

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(ts|tsx|js|mjs)$/.test(name)) out.push(p)
  }
  return out
}

/** Every file that names the fixture, relative to the repo root. */
function users(): string[] {
  return [
    ...walk(join(REPO, 'apps')),
    ...walk(join(REPO, 'packages')),
    ...(existsSync(join(REPO, 'scripts')) ? walk(join(REPO, 'scripts')) : []),
  ]
    .filter(f => readFileSync(f, 'utf8').includes(MARK))
    .map(f => relative(REPO, f))
    .filter(f => f !== 'apps/api/src/lib/legacy-era-fixture-contained.test.ts')
    .filter(f => f !== 'apps/api/test-support/legacy-era-commercial-model.ts')   // itself
    .sort()
}

/** The per-lead internals R137 made unreachable. Each is removed with its code, by its own PR. */
export const LEGACY_ERA_FIXTURE_USERS = [
  'apps/api/src/lib/approve-lead.pack-boundary.test.ts',
  'apps/api/src/lib/approve-lead.test.ts',
  'apps/api/src/lib/approve-no-campaign.test.ts',
  'apps/api/src/lib/free-proof-route.test.ts',
  'apps/api/src/lib/kind-owns-go.test.ts',
  'apps/api/src/lib/launch-journey.test.ts',
  'apps/api/src/lib/paid-lead-delivery.test.ts',
  'apps/api/src/lib/pass2-zero-fallback.test.ts',
  'apps/api/src/lib/pool-first-gate.test.ts',
  'apps/api/src/lib/proof-apollo-provider.test.ts',
  'apps/api/src/lib/proof-provider-off.test.ts',
  'apps/api/src/lib/provider-boundary.test.ts',
  'apps/api/src/routes/approve-batch.route.test.ts',
]

describe('the legacy-era commercial-model fixture is contained (R137)', () => {
  it('🛑 ① NO APPLICATION FILE IMPORTS IT — only test files may', () => {
    const app = users().filter(f => !/\.test\.tsx?$/.test(f))
    expect(app, 'production code must never reach the pre-R137 resolver').toEqual([])
  })

  it('🛑 ② EXACTLY THE LISTED TEST FILES USE IT — a new user is added here, visibly', () => {
    expect(users()).toEqual(LEGACY_ERA_FIXTURE_USERS)
  })

  it('🛑 ③ THE FILE THAT PROVES PRODUCTION DOES NOT USE IT', () => {
    expect(users()).not.toContain('apps/api/src/lib/commercial-model.test.ts')
    expect(users()).not.toContain('apps/api/src/lib/legacy-per-lead-fence.test.ts')
  })

  it('🛑 IT LIVES OUTSIDE THE API BUILD — `rootDir` is src/, so it cannot be compiled in', () => {
    expect(existsSync(join(API, 'test-support', 'legacy-era-commercial-model.ts'))).toBe(true)
    const ts = JSON.parse(readFileSync(join(API, 'tsconfig.json'), 'utf8'))
    expect(ts.compilerOptions.rootDir).toBe('./src')
  })
})
