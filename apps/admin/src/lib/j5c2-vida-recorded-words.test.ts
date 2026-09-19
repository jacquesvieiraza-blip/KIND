// ══════════════════════════════════════════════════════════════════════════════════════════
// J5-C2 (Vida half) · THE OPERATOR'S PROOF WORDS COME FROM THE RECORD, NOT FROM A CLOCK
//
// LR 6 requires the Proof words on BOTH surfaces to come from the recorded transition. The
// Milla half is enforced in `apps/portal/src/lib/j5c2-recorded-proof-truth.test.ts`, where
// the defect was real: the desk asked a timer a question only the record could answer.
//
// Vida's half was already built the right way — `lifecycleCopy` is a pure function of a
// `LifecycleState` that the server derives — so this file's job is to keep it that way rather
// than to change it. Two properties, both of which would be easy to lose in this build:
//
//   ① NO STATE IS DERIVED FROM ELAPSED TIME. Formatting a recorded timestamp is fine
//      (`new Date(frozenPackage.at).toLocaleDateString(...)`); deciding a state from
//      `Date.now()` is the Milla defect, one surface over.
//   ② `stuck` REACHES VIDA THROUGH THE ONE MECHANISM THAT ALREADY EXISTS. XC-6's detector
//      turns an overdue `automatic_work` row into an operator task, and XC-5 makes every such
//      task a Needs-you row. Giving Vida a SECOND path to the same fact — a `proof_stuck`
//      lifecycle state of its own — would be a second answer about one thing, which is the
//      defect class this repository spends most of its guards on.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SRC = readFileSync(join(__dirname, 'vida-lifecycle-copy.ts'), 'utf8')
/** Code only: the prose in this file discusses clocks and timers at length. */
const CODE = SRC.split('\n')
  .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
  .join('\n')

describe('J5-C2 · Vida derives Proof words from state, never from elapsed time', () => {
  it('🛑 no state is decided by the current time', () => {
    // `Date.now()` / `new Date()` with no argument are the shapes that read a clock. A
    // `new Date(<recorded timestamp>)` is formatting and is expected.
    expect(CODE, 'Vida asked the clock what only the record can answer').not.toMatch(/Date\.now\(\)/)
    expect(CODE, 'an argument-less new Date() is a clock read').not.toMatch(/new Date\(\s*\)/)
  })

  it('🛑 there is no bound, elapsed-time or timeout arithmetic in the derivation', () => {
    for (const shape of [/PROOF_WAIT_MS/, /\belapsed\b/, /setTimeout/, /Date\.parse/]) {
      expect(CODE, `a time-derived state crept into Vida's copy: ${shape}`).not.toMatch(shape)
    }
  })

  it('the Proof states it can say are RECORDED reasons, each named', () => {
    // These exist because the server recorded them — a person took the calibration, or our own
    // gate produced nothing usable. Neither is inferred by this file.
    expect(SRC).toContain("'proof_calibration_failed'")
    expect(SRC).toContain("'proof_exception'")
  })

  it('🛑 `stuck` is NOT given a second path — it arrives as an operator task', () => {
    // XC-6's detector → operator task → XC-5's Needs-you row. A `proof_stuck` lifecycle state
    // here would be a second mechanism for one fact, and the two would drift.
    expect(SRC, 'a second mechanism for "stuck" was added to Vida').not.toContain("'proof_stuck'")
    expect(SRC, 'a second mechanism for "stuck" was added to Vida').not.toMatch(/automatic_work_stuck/)
  })

  it('`lifecycleCopy` takes its state as an INPUT — it does not compute one', () => {
    // The signature is the guarantee: a caller hands it the recorded state. If this function
    // ever started reading rows or times for itself, Vida would have its own opinion.
    expect(SRC).toMatch(/export function lifecycleCopy\(i: LifecycleCopyInput\)/)
    expect(CODE, 'the copy function started reading the database itself').not.toMatch(/db\.from\(/)
  })
})
