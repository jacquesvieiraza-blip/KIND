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

describe('#605 — the website is frozen to the founder-approved state', () => {
  const files = walk(WEB).map(p => relative(WEB, p))

  it('no file has been added or removed', () => {
    expect([...files].sort()).toEqual(Object.keys(MANIFEST).sort())
  })

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
  })
})
