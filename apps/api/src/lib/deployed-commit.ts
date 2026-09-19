// ── XC-4 · WHICH COMMIT IS THIS API BUILD? (the node-side adapter) ──────────────
//
// The RULE — the lookup order, the strict sha shape, `"unknown"` only when genuinely
// unknown — lives in `@kind/shared/deployed-commit`, because all four services must answer
// the same question the same way and four copies of a lookup order is four chances for
// three of them to drift.
//
// This file supplies only what is node-specific: where `.deploy-stamp` is on disk, and a
// memoised answer for a value that cannot move under a running container.

import { readFileSync } from 'fs'
import path from 'path'
import {
  resolveDeployedCommit,
  type DeployedCommit,
  SHORT_SHA_LENGTH,
  UNKNOWN_COMMIT,
} from '@kind/shared'

export { resolveDeployedCommit, SHORT_SHA_LENGTH, UNKNOWN_COMMIT }
export type { DeployedCommit }

/**
 * Candidate locations for `.deploy-stamp`, resolved from BOTH `__dirname` and the process
 * working directory, because the two deploy paths this repo has start the API differently:
 *
 *   · `apps/api/Dockerfile`    → `WORKDIR /app`, `node apps/api/dist/index.js`
 *     → `__dirname` is `/app/apps/api/dist`, cwd is `/app`
 *   · `apps/api/nixpacks.toml` → `yarn workspace @kind/api start` → `node dist/index.js`
 *     → `__dirname` is `<root>/apps/api/dist`, cwd is `<root>/apps/api`
 *
 * Both are covered, and so is running from source in development. Guessing one and
 * shipping it is how a feature works in the container it was written in and nowhere else —
 * the failure class that cost this repo #578, #579 and #582.
 */
export function deployStampCandidates(dirname = __dirname, cwd = process.cwd()): string[] {
  return [
    path.resolve(dirname, '..', '.deploy-stamp'), // dist/lib → apps/api        (compiled, flat)
    path.resolve(dirname, '..', '..', '.deploy-stamp'), // src/lib → apps/api   (ts-node / dist/lib nested)
    path.resolve(cwd, '.deploy-stamp'),
    path.resolve(cwd, 'apps', 'api', '.deploy-stamp'),
  ]
}

function readStampFromDisk(): string | null {
  for (const candidate of deployStampCandidates()) {
    try {
      return readFileSync(candidate, 'utf8')
    } catch {
      // Absent here; try the next candidate.
    }
  }
  return null
}

/**
 * Resolved once per process: neither the environment nor the stamp can change under a
 * running container, and `/health` is polled by monitors — re-reading a file on every poll
 * would be a syscall for a value that cannot move.
 */
let cached: DeployedCommit | null = null

export function deployedCommit(): DeployedCommit {
  if (!cached) {
    cached = resolveDeployedCommit({ env: process.env, readStamp: readStampFromDisk })
  }
  return cached
}

/** Test-only: drop the memoised answer. */
export function resetDeployedCommitCache(): void {
  cached = null
}
