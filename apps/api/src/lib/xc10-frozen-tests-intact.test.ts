// ══════════════════════════════════════════════════════════════════════════════════════════
// XC-10 · THE FROZEN TESTS ARE INTACT (LR 17 · R131)
//
// REQ: *"Kill-switch, reply isolation, house authority, meeting confinement, proof-authority
// bypass untouched."*
// RED: *"A frozen test differs from the certified baseline by more than founder-authorised
// hunks."*
// PERSISTED TRUTH: *"`git diff 60e6e9ba HEAD -- <frozen tests>` is empty."*
//
// ── WHY THIS IS A TEST AND NOT A PROMISE ────────────────────────────────────────────────
//
// Five guarantees are frozen because they are the ones a build is most tempted to bend: each is
// a refusal that makes work harder, and each becomes easier to ship by editing the test that
// holds it. A wave that touched the send seam, the reply pipeline and House's authority is
// exactly the wave in which one of them quietly moves — and nobody notices, because the suite
// is green either way.
//
// So the diff itself is the assertion. This runs `git diff` against the certified baseline
// `60e6e9ba` and fails on ANY change to a frozen file that is not a declared, authorised
// exception — and it reads the WORKING TREE, not `HEAD`, so an uncommitted edit is caught
// before it is committed rather than after.
//
// ── THE ONE AUTHORISED EXCEPTION, PINNED TO ITS EXACT CONTENT ──────────────────────────
//
// ① **house-authority.test.ts — FOUNDER DECISION B, 18 Sep.** The global migration-count
//    assertion was removed on his explicit instruction; the same tripwire lives in
//    `migration-home.test.ts` and `schema-drift.test.ts`, which is where a global count belongs.
//    Every House invariant in the file is untouched, and the diff is that one removal.
//
// ── 🛑 ⛓️ 19 Sep — AND THE SECOND "EXCEPTION" IS WITHDRAWN. IT WAS NEVER AUTHORISED. ─────
//
// ~~② kill-switch-absolute.test.ts — ONE FIELD ON ONE LINE (J20-C4)~~ stood here, and the
// reasoning was sound: FD-5 makes the send seam refuse anybody without a verified business
// email, the frozen fixture's lead row carries no `email_status`, and case 13 — the file's own
// ANTI-VACUITY case — therefore answers `deferred` where the certified file asserts `sent`.
//
// 🛑 WHAT WAS WRONG WAS THE AUTHORITY, NOT THE ANALYSIS. A chained note explaining why an
// exception is necessary is not a Founder ruling, and XC-10 exists precisely so that a frozen
// test cannot be amended by the person who needs it amended. GPT's whole-candidate review
// asked for the ruling reference; there is none. The file is therefore RESTORED BYTE-IDENTICAL
// to `60e6e9ba` and the contradiction is raised as a STOP under MVP1_STOP_AND_SCOPE_RULES §1
// (frozen-test conflict) — the same route Decision B travelled.
//
// ⚠️ SO THIS SUITE NOW ASSERTS THE OPPOSITE OF WHAT IT USED TO: the kill-switch file must be
// byte-identical to the baseline. While the conflict stands, `kill-switch-absolute.test.ts`
// case 13 is RED, and that red is the STOP — not something for this file to paper over.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const REPO = join(__dirname, '../../../..')
const BASELINE = '60e6e9ba'

/** The five frozen guarantees, by the file that holds each. */
const FROZEN: Record<string, string> = {
  'kill-switch':            'apps/api/src/lib/kill-switch-absolute.test.ts',
  'reply isolation':        'apps/api/src/lib/reply-routing.test.ts',
  'house authority':        'apps/api/src/lib/house-authority.test.ts',
  'meeting confinement':    'apps/api/src/lib/meeting-truth.test.ts',
  'proof-authority bypass': 'apps/api/src/lib/proof-authority-bypass.test.ts',
}

/**
 * The diff of one frozen file against the certified baseline — WORKING TREE, not `HEAD`.
 *
 * ⚠️ THE WORKING TREE IS THE POINT. Diffing `HEAD` would let an uncommitted edit to a frozen
 * test sit green through a whole session and be caught only after it was committed.
 */
function diffAgainstBaseline(file: string): string {
  return execFileSync('git', ['diff', BASELINE, '--', file], { cwd: REPO, encoding: 'utf8' })
}

/** Added and removed lines, ignoring the diff's own file headers. */
function changedLines(diff: string): { added: string[]; removed: string[] } {
  const added: string[] = []
  const removed: string[] = []
  for (const l of diff.split('\n')) {
    if (l.startsWith('+++') || l.startsWith('---')) continue
    if (l.startsWith('+')) added.push(l.slice(1))
    else if (l.startsWith('-')) removed.push(l.slice(1))
  }
  return { added, removed }
}

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① THE GUARD IS ASKING A REAL QUESTION
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('XC-10 · the baseline and the files are where this expects', () => {
  it('🛑 THE CERTIFIED BASELINE EXISTS IN THIS REPOSITORY', () => {
    // A guard that cannot resolve the baseline would throw, not pass — but naming it here
    // makes the failure say WHY rather than printing a git error.
    const sha = execFileSync('git', ['rev-parse', '--short', BASELINE], { cwd: REPO, encoding: 'utf8' }).trim()
    expect(sha, 'the certified baseline is not reachable from this checkout').toBe(BASELINE)
  })

  it('🛑 AND ALL FIVE FROZEN FILES ARE STILL THERE — a deleted frozen test is the loudest drift', () => {
    for (const [guarantee, file] of Object.entries(FROZEN)) {
      expect(existsSync(join(REPO, file)), `the ${guarantee} frozen test is gone`).toBe(true)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② THREE ARE BYTE-IDENTICAL
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('XC-10 · untouched means byte-identical to 60e6e9ba', () => {
  for (const guarantee of ['reply isolation', 'meeting confinement', 'proof-authority bypass']) {
    it(`🛑 ${guarantee.toUpperCase()} — not one byte`, () => {
      const diff = diffAgainstBaseline(FROZEN[guarantee])
      expect(diff, `the ${guarantee} frozen test differs from the certified baseline:\n${diff}`)
        .toBe('')
    })
  }

  it('🛑 AND THE REPLY-ISOLATION RULE IS THE ONE THAT MATTERS — R131, in its own file', () => {
    // The route harnesses (`reply-fanout.route.test.ts`, `smartlead-inbound.route.test.ts`) were
    // touched this wave for J22-C3: the fake database gained `ilike` and the fixture rows gained
    // the address they reply from, because the lookup now matches case-insensitively. Not one
    // ASSERTION in either file changed. The rule itself — one reply, one client, fail closed —
    // lives here, and here is untouched.
    const src = execFileSync('git', ['show', `${BASELINE}:${FROZEN['reply isolation']}`], { cwd: REPO, encoding: 'utf8' })
    expect(src).toContain('one external reply is still written to two clients')
    expect(src).toContain("expect(r.how).toBe('ambiguous')")
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ③ TWO CARRY AUTHORISED EXCEPTIONS, AND EACH IS PINNED TO ITS EXACT CONTENT
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('XC-10 · the authorised exceptions, and nothing beyond them', () => {
  it('🛑 KILL-SWITCH — BYTE-IDENTICAL TO THE BASELINE, because no ruling amended it', () => {
    // 🛑 THE UNAUTHORISED AMENDMENT IS WITHDRAWN. What stood here asserted "exactly one added
    // field"; the field was added by me, under a chained note, with no Founder ruling behind
    // it. XC-10 exists so that cannot stand, so it now asserts the file as certified.
    //
    // ⚠️ THE FILE ON DISK, NOT `git show :path` — that reads the INDEX, so an unstaged edit to
    // a frozen test would compare clean and this guard would pass over the very change it
    // exists to catch.
    const now = readFileSync(join(REPO, FROZEN['kill-switch']), 'utf8')
    const base = execFileSync('git', ['show', `${BASELINE}:${FROZEN['kill-switch']}`], { cwd: REPO, encoding: 'utf8' })
    expect(now, 'the kill-switch frozen test was amended without a Founder ruling').toBe(base)
    expect(diffAgainstBaseline(FROZEN['kill-switch'])).toBe('')
  })

  it('🛑 HOUSE AUTHORITY — DECISION B, and every House invariant still asserted', () => {
    const diff = diffAgainstBaseline(FROZEN['house authority'])
    expect(diff, 'the house-authority exception is gone — Decision B was reverted').not.toBe('')
    // The authorised change is the removal of a GLOBAL migration count, which had no House
    // invariant in it and made this file red for any unrelated migration anywhere.
    expect(diff).toContain('FOUNDER DECISION B')
    // 🛑 AND IT IS THE DECISION AND NOTHING ELSE. One assertion line removed, and a chained
    // note in its place — so an 'authorised' hunk cannot carry an unrelated edit inside it.
    const { removed: gone } = changedLines(diff)
    expect(gone.length, `the Decision B hunk removed ${gone.length} line(s); exactly 1 is authorised`).toBe(1)
    expect(gone[0], 'the removed line is not the global migration-count assertion').toContain('toHaveLength(74)')
    const { added } = changedLines(diff)
    expect(added.join('\n'), 'the authorised hunk is not chained to the decision that made it')
      .toMatch(/⛓️/)
  })

  it('🛑 AND NOTHING ELSE IN HOUSE AUTHORITY MOVED — the count went, the invariants did not', () => {
    const now = readFileSync(join(REPO, FROZEN['house authority']), 'utf8')
    // The four House guarantees the file exists for. A "count removal" that took one of these
    // with it would be a very quiet way to open House's authority.
    for (const invariant of [
      'A1 must appear exactly once',
      'the Stripe writers refuse when internal authority already exists',
    ]) {
      expect(now, `house-authority no longer asserts: ${invariant}`).toContain(invariant)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ④ THE EXCEPTION LIST IS CLOSED
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('XC-10 · a third exception cannot appear without this file saying so', () => {
  it('🛑 EXACTLY ONE FROZEN FILE DIFFERS FROM THE BASELINE, AND IT IS THE ONE DECLARED', () => {
    // This is the assertion that makes the list closed rather than illustrative: a future edit
    // to any other frozen test is caught here even if somebody forgets to add a case above.
    // ⛓️ 19 Sep — WAS `['house authority', 'kill-switch']`. The kill-switch amendment had no
    // Founder ruling and is withdrawn; one exception is the authorised set.
    const differing = Object.entries(FROZEN)
      .filter(([, file]) => diffAgainstBaseline(file) !== '')
      .map(([guarantee]) => guarantee)
      .sort()
    expect(differing, 'a frozen test differs from the certified baseline without an authorised exception')
      .toEqual(['house authority'])
  })
})
