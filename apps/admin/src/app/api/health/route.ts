// ── XC-4 · VIDA NAMES THE BUILD IT IS RUNNING ───────────────────────────────────
//
// The release checklist's step 4 is "`/health.commit` equals the candidate short SHA on
// ALL FOUR services", and `scripts/ship.sh` now reads all four after deploying. Before
// this route, Vida had no machine-readable health at all: the only way to ask "did the
// admin console actually take the deploy?" was to look at a page and guess.
//
// The resolution RULE is `@kind/shared`'s, identical to the API's and the website's. Only
// the file lookup is local, because Next puts the app somewhere else.

import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import path from 'path'
import { resolveDeployedCommit } from '@kind/shared'

export const dynamic = 'force-dynamic'

/**
 * `ship.sh` writes `apps/admin/.deploy-stamp`. A Next server's cwd is the app directory
 * under every deploy shape this repo uses, but `process.cwd()` alone has burned this repo
 * before (#582 — a hardcoded container path), so the parent and the monorepo layout are
 * tried too rather than assumed.
 */
function readStamp(): string | null {
  const cwd = process.cwd()
  for (const candidate of [
    path.resolve(cwd, '.deploy-stamp'),
    path.resolve(cwd, '..', '.deploy-stamp'),
    path.resolve(cwd, 'apps', 'admin', '.deploy-stamp'),
  ]) {
    try {
      return readFileSync(candidate, 'utf8')
    } catch {
      // Absent here; try the next candidate.
    }
  }
  return null
}

export async function GET() {
  const { commit, source } = resolveDeployedCommit({ env: process.env, readStamp })
  // Always 200: this is a liveness read, and a health endpoint that fails on a missing
  // stamp would fail the platform's own deploy check. The absence is reported in the body.
  return NextResponse.json({
    status: 'ok',
    service: 'kind-admin',
    commit,
    commitSource: source,
    ts: new Date().toISOString(),
  })
}
