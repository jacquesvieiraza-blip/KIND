import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'
import { createHash } from 'crypto'

// #605 — THE WEBSITE IS FOUNDER-LOCKED. IT DOES NOT CHANGE WITHOUT HIS EXPLICIT COMMAND.
//
// Founder, 1 Aug, verbatim: *"lock in the site does not change after this. without my
// command and clear command. if it in the future requires a website change you make it very
// clear then i approve."*
//
// Why the rule exists: #560 shrank the site 28 pages → 12 under a launch-path item. The item
// was authorized; the specific sixteen retirements were agent judgement inside the PR — and
// the founder experienced his own website changing in ways he had not pictured. #604 restored
// it. This file makes a third occurrence impossible to do QUIETLY: any change to any file
// under apps/website fails the gate until the manifest is regenerated, and regenerating the
// manifest is defined (scripts/freeze-website.sh) as a post-approval act.
//
// IF THIS TEST IS FAILING FOR YOU:
//   1. Did the founder explicitly approve this exact website change? If not — STOP. Show him
//      the change in plain words and wait. That is the rule; this failure is it working.
//   2. If he approved: bash scripts/freeze-website.sh  (commits the new manifest with your PR).
//
// Never update the manifest to make a red gate green. The manifest follows approval; it does
// not grant it.

const WEB = join(__dirname, '../../../website')
const MANIFEST = JSON.parse(
  readFileSync(join(__dirname, '../../../../scripts/website-freeze.json'), 'utf8'),
) as Record<string, string>

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    // .deploy-stamp is rewritten by every ship.sh run; dotfiles are never served.
    if (name.startsWith('.') || name === 'node_modules') continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else out.push(p)
  }
  return out
}

// ⏱️ WHY THESE TESTS CARRY AN EXPLICIT TIMEOUT (added 11 Aug)
//
// This suite hashes EVERY file under apps/website — measured 11 Aug at 110 files / 68.1 MB,
// taking ~1,240 ms on an IDLE container. Vitest's default per-test budget is 5,000 ms, so the
// margin was only ~4×. `scripts/check.sh` runs this alongside two `next build`s and 124 other
// test files, and under that contention the sweep intermittently blew the 5 s budget and died
// with "Test timed out in 5000ms" — NOT an assertion failure.
//
// That made the guard on a FOUNDER-LOCKED rule flaky, which is worse than a slow guard: a test
// that fails randomly teaches everyone to re-run it until it goes green, and on 11 Aug that is
// exactly what happened — it went red in the gate, passed on a quiet re-run, and shipped. The
// next time it goes red it might be a real website change, and by then the habit is to shrug.
//
// A timeout is the correct fix because the assertions are unaffected: a REAL drift fails fast
// with a diff, and only the I/O sweep is slow. 60 s is ~48× the idle cost — generous enough to
// absorb any contention, and it can never mask a genuine failure.
const SWEEP_TIMEOUT_MS = 60_000

describe('#605 — the website is frozen to the founder-approved state', () => {
  const files = walk(WEB).map(p => relative(WEB, p))

  it('no file has been added or removed', () => {
    expect([...files].sort()).toEqual(Object.keys(MANIFEST).sort())
  }, SWEEP_TIMEOUT_MS)

  it('no file content has changed', () => {
    const drifted = files.filter(rel => {
      const real = createHash('md5').update(readFileSync(join(WEB, rel))).digest('hex')
      return MANIFEST[rel] !== real
    })
    expect(
      drifted,
      `WEBSITE CHANGED WITHOUT FOUNDER APPROVAL: ${drifted.join(', ')} — ` +
        `the site is founder-locked (1 Aug). Get explicit approval, then bash scripts/freeze-website.sh`,
    ).toEqual([])
  }, SWEEP_TIMEOUT_MS)
})
