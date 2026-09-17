// ── XC-4 · THE DEPLOYED BUILD MUST BE ABLE TO NAME ITSELF ───────────────────────
//
// WHAT EARNED THIS TEST.
//
// `/health` answered `commit: "unknown"` on production and on staging, at the same time,
// for every deploy this repo has ever made. The reason was not a bug in the reader — it
// was that the reader had nothing to read:
//
//   · `/health` read ONLY `process.env.RAILWAY_GIT_COMMIT_SHA`;
//   · `scripts/ship.sh` deploys with `railway up`, which uploads a directory. It is not a
//     git-source build, so **Railway never injects that variable**;
//   · `ship.sh` already wrote the exact short SHA into `apps/<app>/.deploy-stamp` before
//     every upload — and **nothing has ever read it**.
//
// The cost is not cosmetic. The certification gate for MVP1 is "two consecutive clean
// runs on ONE SHA", and the release checklist's step 4 is "`/health.commit` must equal the
// candidate short SHA on all four services". Neither sentence can be executed by a build
// that cannot say which commit it is. `commit: "unknown"` also means a deploy that
// silently did not take looks identical to one that did.
//
// So: `commit` is resolved from real evidence, `"unknown"` survives ONLY when there
// genuinely is none, and the answer carries the SOURCE it came from — because a value
// whose provenance is invisible is a value nobody can check.

import { describe, it, expect } from 'vitest'
import { resolveDeployedCommit, SHORT_SHA_LENGTH } from './deployed-commit'

const NO_STAMP = () => null

describe('XC-4 · resolveDeployedCommit', () => {
  it('reports the Railway-injected SHA when the platform provides one', () => {
    const r = resolveDeployedCommit({
      env: { RAILWAY_GIT_COMMIT_SHA: '4357bc7f33b1552611fa25fb44dfd6139cf01eed' },
      readStamp: NO_STAMP,
    })
    expect(r.commit).toBe('4357bc7')
    expect(r.source).toBe('RAILWAY_GIT_COMMIT_SHA')
  })

  // THE CASE THAT WAS BROKEN. `railway up` injects nothing; the stamp is the only evidence.
  it('reports the ship.sh deploy stamp when Railway injected nothing', () => {
    const r = resolveDeployedCommit({
      env: {},
      readStamp: () => '4357bc7\n',
    })
    expect(r.commit).toBe('4357bc7')
    expect(r.source).toBe('.deploy-stamp')
  })

  it('accepts a full-length sha in the stamp and shortens it the same way git does', () => {
    const r = resolveDeployedCommit({
      env: {},
      readStamp: () => '4357bc7f33b1552611fa25fb44dfd6139cf01eed',
    })
    expect(r.commit).toBe('4357bc7')
    expect(r.commit).toHaveLength(SHORT_SHA_LENGTH)
  })

  it('lets an explicit KIND_DEPLOY_COMMIT override the stamp', () => {
    const r = resolveDeployedCommit({
      env: { KIND_DEPLOY_COMMIT: 'abc1234' },
      readStamp: () => 'deadbee',
    })
    expect(r.commit).toBe('abc1234')
    expect(r.source).toBe('KIND_DEPLOY_COMMIT')
  })

  it('prefers the platform SHA over the stamp when both are present', () => {
    // Railway building from a git source knows the commit first-hand. The stamp is
    // written by whoever ran ship.sh, so the platform's answer outranks it.
    const r = resolveDeployedCommit({
      env: { RAILWAY_GIT_COMMIT_SHA: 'aaaaaaa1111' },
      readStamp: () => 'bbbbbbb',
    })
    expect(r.commit).toBe('aaaaaaa')
    expect(r.source).toBe('RAILWAY_GIT_COMMIT_SHA')
  })

  // ── "unknown" ONLY WHEN GENUINELY UNKNOWN, AND NEVER A GUESS ──────────────────

  it('reports unknown when there is no evidence at all', () => {
    const r = resolveDeployedCommit({ env: {}, readStamp: NO_STAMP })
    expect(r.commit).toBe('unknown')
    expect(r.source).toBe('none')
  })

  it('refuses a value that is not a sha rather than echoing it', () => {
    // A stamp containing a branch name, an error message, or an HTML error page must not
    // be reported as a commit. Echoing junk is worse than saying unknown: it reads as a
    // verified identity in the release checklist.
    for (const junk of ['main', 'not a sha', '<html>oops</html>', 'HEAD', 'zzzzzzz', '']) {
      const r = resolveDeployedCommit({ env: {}, readStamp: () => junk })
      expect(r.commit).toBe('unknown')
    }
  })

  it('refuses a too-short sha rather than padding or echoing it', () => {
    expect(resolveDeployedCommit({ env: {}, readStamp: () => 'abc' }).commit).toBe('unknown')
  })

  it('ignores an empty or whitespace-only environment variable', () => {
    const r = resolveDeployedCommit({
      env: { RAILWAY_GIT_COMMIT_SHA: '   ', KIND_DEPLOY_COMMIT: '' },
      readStamp: () => '4357bc7',
    })
    expect(r.commit).toBe('4357bc7')
    expect(r.source).toBe('.deploy-stamp')
  })

  it('survives an unreadable stamp without throwing', () => {
    const r = resolveDeployedCommit({
      env: {},
      readStamp: () => {
        throw new Error('EACCES')
      },
    })
    expect(r.commit).toBe('unknown')
    expect(r.source).toBe('none')
  })
})
