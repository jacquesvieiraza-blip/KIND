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
// ── THE TWO AUTHORISED EXCEPTIONS, BOTH PINNED TO THEIR EXACT CONTENT ───────────────────
//
// ① **house-authority.test.ts — FOUNDER DECISION B, 18 Sep.** The global migration-count
//    assertion was removed on his explicit instruction; the same tripwire lives in
//    `migration-home.test.ts` and `schema-drift.test.ts`, which is where a global count belongs.
//    Every House invariant in the file is untouched, and the diff is that one removal.
//
// ② **kill-switch-absolute.test.ts — ONE FIELD, FOUNDER-RULED 19 Sep.** FD-5 makes the send
//    seam refuse anybody without an Apollo-verified business email; the frozen fixture's lead
//    row carried no `email_status`, so case 13 — the file's own ANTI-VACUITY control — could no
//    longer reach the mail server, and the file asserted `sent` where the product now answers
//    `deferred`.
//
// ⛓️ **AND THE HISTORY OF THIS EXCEPTION IS THE POINT OF THIS FILE.** It was first applied
// under a chained note written by me, with no ruling behind it. GPT's whole-candidate review
// asked for the ruling reference, there was none, the file was RESTORED BYTE-IDENTICAL and the
// contradiction was raised as a STOP under MVP1_STOP_AND_SCOPE_RULES §1 — the same route
// Decision B travelled. **The founder then ruled it, 19 Sep 2026, verbatim:**
//
//     "APPROVED: OPTION A. Authorise exactly ONE amendment to
//      apps/api/src/lib/kill-switch-absolute.test.ts. Change only the mocked lead used by the
//      anti-vacuity positive-control case so that it carries: email_status: 'verified'.
//      Nothing else in that frozen test is authorised to change."
//
//     Purpose, in his words: "preserve FD-5 · preserve F-SENDABLE · preserve the real send seam
//     refusing any lead without an Apollo-verified business email · restore the frozen test's
//     original anti-vacuity purpose: when both switches are correctly enabled and the mocked
//     lead is genuinely sendable, the seam is reached and can send."
//
//     And what it does NOT authorise: "Do NOT weaken FD-5 · Do NOT create an operator-run
//     exception · Do NOT allow unverified leads through the seam · Do NOT amend any other
//     assertion in that frozen test."
//
// 🛑 THE EXCEPTION IS PINNED, NOT PERMITTED. This file asserts the kill-switch deviation is
// EXACTLY that one added field: no second line, no added prose, no assertion touched. The
// explanation lives in `j20c4-send-seam-refuses-non-sendable.test.ts`, deliberately, so the
// frozen file's own text stays as the founder certified it.
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
  it('🛑 KILL-SWITCH — EXACTLY ONE LINE, AND THE CHANGE IS THE ONE FOUNDER-RULED FIELD', () => {
    // ⛓️ 19 Sep — RESTORED under the founder's Option A ruling (quoted in this file's header).
    // Between the GPT review and that ruling this asserted the file was byte-identical, because
    // the amendment was unauthorised at the time. It is authorised now, and pinned to one field.
    const { added, removed } = changedLines(diffAgainstBaseline(FROZEN['kill-switch']))
    expect(removed.length, `the kill-switch test removed ${removed.length} line(s); exactly 1 is authorised`).toBe(1)
    expect(added.length, `the kill-switch test added ${added.length} line(s); exactly 1 is authorised`).toBe(1)

    // 🛑 AND THE DIFFERENCE BETWEEN THE TWO LINES IS THE FIELD, NOTHING ELSE. Restoring the
    // removed line by deleting the field must reproduce the baseline line exactly — so no
    // assertion, no fixture value and no behaviour can hide inside an "authorised" hunk.
    expect(added[0].replace(" email_status: 'verified',", ''), 'the authorised hunk changed something other than the one field')
      .toBe(removed[0])
    expect(added[0]).toContain("email_status: 'verified'")
  })

  it('🛑 AND THE KILL-SWITCH GUARANTEE ITSELF IS WORD-FOR-WORD THE CERTIFIED ONE', () => {
    // The fixture is data; the rule is the file. Every sentence that states the guarantee, and
    // every case that holds it, is compared against the baseline's own text.
    // ⚠️ THE FILE ON DISK, NOT `git show :path` — that reads the INDEX, so an unstaged edit to
    // a frozen test would compare clean and this guard would pass over the very change it
    // exists to catch.
    const now = readFileSync(join(REPO, FROZEN['kill-switch']), 'utf8')
      .replace(" email_status: 'verified',", '')
    const base = execFileSync('git', ['show', `${BASELINE}:${FROZEN['kill-switch']}`], { cwd: REPO, encoding: 'utf8' })
    expect(now, 'the kill-switch test differs from the baseline beyond the one authorised field')
      .toBe(base)
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
  it('🛑 EXACTLY TWO FROZEN FILES DIFFER FROM THE BASELINE, AND THEY ARE THE TWO DECLARED', () => {
    // This is the assertion that makes the list closed rather than illustrative: a future edit
    // to any other frozen test is caught here even if somebody forgets to add a case above.
    // ⛓️ 19 Sep, twice. It briefly asserted `['house authority']` alone, while the kill-switch
    // amendment stood withdrawn for want of a ruling. The founder then ruled it (Option A), so
    // the authorised set is two — and a third still cannot appear without this file saying so.
    const differing = Object.entries(FROZEN)
      .filter(([, file]) => diffAgainstBaseline(file) !== '')
      .map(([guarantee]) => guarantee)
      .sort()
    expect(differing, 'a frozen test differs from the certified baseline without an authorised exception')
      .toEqual(['house authority', 'kill-switch'])
  })
})
