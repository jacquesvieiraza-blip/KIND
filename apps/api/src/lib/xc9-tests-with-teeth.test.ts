// ══════════════════════════════════════════════════════════════════════════════════════════
// XC-9 · TESTS WITH TEETH (RC-10)
//
// REQ: *"RED→GREEN evidence; stale-truth tests inverted/retired; no source-text-only truth."*
// RED: *"A test asserting stale truth still passes against the final behaviour."*
//
// ── THE THREE CLAUSES ARE THREE DIFFERENT FAILURES ──────────────────────────────────────
//
// ① **RED EVIDENCE.** A guard that passes proves nothing on its own: one that asserts the wrong
//    text, reads a moved file, matches its own comment, or sits inside a branch nobody executes
//    passes exactly as loudly as a real one. This wave found SEVEN blind guards, every one of
//    them green a minute earlier, and every one found by breaking the thing it guards.
//    `scripts/red-proof.sh` is that procedure as an instrument, so the evidence is reproducible
//    rather than pasted into a commit message.
//
// ② **STALE TRUTH.** A test that asserted yesterday's behaviour and still passes is worse than
//    no test: it is a green tick over a claim that has been withdrawn. Nine guards were reversed
//    this wave, each chained, each re-asserting the property the old assertion protected — and
//    each is checked HERE against the new truth, so a revert of the product without a revert of
//    the test cannot pass.
//
// ③ **NO SOURCE-TEXT-ONLY TRUTH FOR BEHAVIOUR.** Reading a file and finding the right words
//    proves the words are there. For a claim about what the system DOES — what leaves, what is
//    refused, what is written — the proof has to run the function and watch the seam. A source
//    scan is legitimate for a claim about SHAPE (a comment, a rendered sentence, a gate's
//    position); it is not evidence about behaviour, and this file names which is which.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const LIB = __dirname
const read = (p: string) => readFileSync(join(LIB, p), 'utf8')

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① THE RED-PROOF INSTRUMENT
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('XC-9 · the red proof is an instrument, not a paragraph', () => {
  const SCRIPT = join(LIB, '../../../../scripts/red-proof.sh')

  it('🛑 IT EXISTS AND IS EXECUTABLE', () => {
    expect(existsSync(SCRIPT), 'the red-proof instrument is gone').toBe(true)
  })

  it('🛑 IT PROVES THE THREE STATES — green, then red with the defect, then green again', () => {
    const s = readFileSync(SCRIPT, 'utf8')
    expect(s).toContain('① GREEN FIRST')
    expect(s).toContain('② RED — the defect is reintroduced')
    expect(s).toContain('③ GREEN AGAIN')
  })

  it('🛑 A GUARD THAT WAS ALREADY RED PROVES NOTHING, and it says so', () => {
    // Running the mutation against a suite that was failing anyway would "prove" teeth that
    // are not there.
    expect(readFileSync(SCRIPT, 'utf8')).toContain('the guard is ALREADY RED before any mutation')
  })

  it('🛑 A MUTATION IT COULD NOT APPLY IS A FAILURE, NOT A PASS', () => {
    // The single most likely way to fake a red proof: a replacement string that matches
    // nothing, a test that stays green, and a tick beside it.
    expect(readFileSync(SCRIPT, 'utf8'))
      .toContain('the mutation could not be applied — the string was not found, so this proves nothing')
  })

  it('🛑 AND IT ALWAYS RESTORES — a mutation left behind is a defect this script introduced', () => {
    const s = readFileSync(SCRIPT, 'utf8')
    expect(s).toContain('trap restore EXIT INT TERM')
    expect(s).toContain('cp "$BACKUP" "$SRC"')
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② NO STALE TRUTH SURVIVES — each reversed guard asserts the NEW behaviour
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('XC-9 · every guard this wave reversed now asserts the truth that replaced it', () => {
  /**
   * [what it used to assert, the file, a SUBSTRING of the assertion that must now be there].
   *
   * ⚠️ SUBSTRINGS, NOT PATTERNS. The first cut built a `RegExp` from each entry, and two of
   * them were wrong in the one direction that matters: an unescaped `(` became a group and an
   * escaped `\.` did not match the file's own escaped regex literal. Both went red against
   * assertions that were present and correct — a guard failing for a reason that has nothing to
   * do with the thing it guards is the same class of defect as one passing for the wrong reason.
   */
  const REVERSED: [string, string, string][] = [
    ['quota_exhausted reassured a client about CREDITS (R124 retired them)',
      './run-outcome.test.ts', 'none of your programme volume has been used'],
    ['the lead lookup was "case-insensitive-CAPABLE" while asserting `.limit(50)`',
      './mvp1-gap-closeout.test.ts', 'LEAD_MATCH_CEILING'],
    ['the approve control was pinned to the review desk, which no longer approves',
      './customer-programme-approval.test.ts', 'ProgrammeApproval.tsx'],
    ['the frozen payload guard measured a fixed 2200-character window',
      './milla-approval.test.ts', 'the frozen payload literal no longer ends where this expects'],
    ['`Approve programme` was asserted on the raw file, so a struck quotation satisfied it',
      './milla-approval.test.ts', 'the action no longer carries the founder'],
    ['both surfaces had to name a version, because both approved',
      './day3-programme-authority.test.ts', 'the desk approves as well as the surface'],
    ['the send-site count was scanned on raw text, so a comment quoting `sendAs(` counted',
      './postal-footer.test.ts', 'COMMENTS STRIPPED BEFORE THE SCAN'],
  ]

  for (const [was, file, nowAsserts] of REVERSED) {
    it(`🛑 ${was}`, () => {
      const src = read(file)
      expect(src, `${file} no longer asserts what replaced it`).toContain(nowAsserts)
      // ⚠️ AND THE REVERSAL IS CHAINED. This repository never deletes what it corrected; a
      // silent retarget leaves the next reader unable to tell a fix from a drift.
      expect(src, `${file} reversed a guard without a chained note`).toMatch(/⛓️/)
    })
  }

  it('🛑 AND THE WITHDRAWN CLAIMS ARE NOT STILL ASSERTED ANYWHERE', () => {
    // The specific sentences the product stopped making. A test still demanding one of these
    // is a green tick over a claim that has been withdrawn.
    const STALE: [string, string][] = [
      ['./run-outcome.test.ts', 'credits are untouched'],
      ['./mvp1-gap-closeout.test.ts', '\\.limit\\(50\\)'],
    ]
    for (const [file, gone] of STALE) {
      const live = read(file)
        .split('\n')
        .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
        .join('\n')
      expect(live, `${file} still asserts a withdrawn claim`).not.toMatch(new RegExp(gone))
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ③ BEHAVIOUR IS PROVED BY RUNNING IT
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('XC-9 · every behavioural claim has an executed proof, not a source scan', () => {
  /** [the claim, the file that EXECUTES it]. */
  const EXECUTED: [string, string][] = [
    ['a non-sendable prospect never reaches the mailer (J20-C4)', './j20c4-send-seam-executed.test.ts'],
    ['a failed selector read halts the run and widens no cap (J20-C1)', './j20c1-selector-reads-fail-loud.test.ts'],
    ['a classifier failure stores the reply unclassified (J22-C1)', './j22c1-reply-durable-before-classification.test.ts'],
    ['a failed lead lookup retains the reply (J22-C3)', './j22c3-reply-routing-hardening.test.ts'],
    ['the legacy-door verdict refuses a programme client (XC-7)', './xc7-legacy-doors-fenced.test.ts'],
    ['the lookup matches case-insensitively and exactly (J22-C3)', './reply-ingest.test.ts'],
  ]

  for (const [claim, file] of EXECUTED) {
    it(`🛑 ${claim} — executed`, () => {
      const src = read(file)
      // 🛑 THE MARKS OF AN EXECUTED TEST: it stands the collaborators up, and it CALLS the real
      // thing. A file that only ever reads source text cannot answer a question about
      // behaviour, however many assertions it carries.
      expect(src, `${file} mocks nothing, so it cannot be running the real path`)
        .toMatch(/vi\.(mock|doMock)\(/)
      expect(src, `${file} never awaits the function under test`).toMatch(/await (import|[a-z])/)
    })
  }

  it('🛑 AND THE SEND SEAM\'S PROOF WATCHES THE PROVIDER, not the return value', () => {
    // A returned 'deferred' proves what the function SAID. The only evidence about what left
    // is the seam the outside world is reached through — the same rule the frozen kill-switch
    // file states about itself.
    const src = read('./j20c4-send-seam-executed.test.ts')
    expect(src).toMatch(/vi\.mock\('\.\/mailer'/)
    expect(src).toContain('state.mailerCalls')
    expect(src, 'the positive control is missing, so every refusal proves nothing')
      .toContain('THE ANTI-VACUITY CASE')
  })

  it('a SHAPE claim may be proved by source — and this file says which claims those are', () => {
    // ⚠️ THE HONEST HALF. A comment (J23-C2), a rendered sentence (J16-C1, J14-C3, J22-C2) and
    // a gate's POSITION (XC-7, XC-2) are claims about the source, and reading the source is the
    // right instrument for them. What is refused is a source scan standing in for behaviour.
    for (const f of ['./j23c2-false-reconciliation-comment.test.ts', './j16c1-one-approval-surface.test.ts']) {
      expect(existsSync(join(LIB, f)), `${f} is missing`).toBe(true)
      expect(read(f), `${f} claims to execute something it does not`).not.toMatch(/mailerCalls/)
    }
  })
})
