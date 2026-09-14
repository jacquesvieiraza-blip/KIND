import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// ═══════════════════════════════════════════════════════════════════════════════════════
// DONE IS MEASURED, NOT DECLARED.
//
// 🛑 WHY THIS FILE EXISTS. Three rounds of this correction ended with the builder saying
// "done" — once with "CODE-PROVEN" in capitals — while required work was missing. There was
// no way for anybody but the founder to tell, because "complete the correction" is not a
// thing a machine can check.
//
// This makes it checkable. Every proof the founder asked for is named here. If one is
// missing, deleted, renamed or quietly dropped, this test fails and the work is not done —
// whatever anybody says in a report.
//
// ⚠️ IT ASSERTS EXISTENCE AND NAMING, NOT CORRECTNESS. Whether each test is any good is what
// the TEETH prove: every one of them was pulled, went red, and was restored. This file is the
// checklist; the teeth are the substance; the live eval and the founder's preview walk are
// the two things neither of them can stand in for.
// ═══════════════════════════════════════════════════════════════════════════════════════

const REPO = process.cwd()

/** Every required proof, by the file it lives in and the name it must carry. */
const REQUIRED: Array<{ file: string; names: string[]; why: string }> = [
  {
    file: 'apps/api/src/lib/conversational-map.test.ts',
    names: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'],
    why: 'the audit, executable — model calls, entry points, stores, fallbacks, language, error paths',
  },
  {
    file: 'apps/api/src/routes/handoff.test.ts',
    names: ['F2 the client’s own words reach Vida', 'F2 a second operator', 'F2 provider-shaped values'],
    why: 'Milla → Vida, driven through both real handlers over one store',
  },
  {
    file: 'apps/api/src/routes/reentry.test.ts',
    names: [
      'F3 after one turn', 'F3 after five turns', 'F3 after a provider failure',
      'F3 at confirmation', 'F3 correcting a fact after returning', 'F3 the resumed prompt',
    ],
    why: 'leaving and coming back, read back through the real GET',
  },
  {
    file: 'apps/api/src/routes/conversation-matrix.test.ts',
    names: [
      'F4 C the server’s own', 'F4 D a refresh', 'F4 E leaving and returning', 'F4 F when the provider recovers',
      'F7 the prompt rations ASKING', 'F7 she is never told to ask in a fixed order',
      'F7 she never counts at the client', 'F7 the completion gate only ever raises',
      'F7 all eleven in one message', 'F7 six good facts and one unreadable',
    ],
    why: 'the durability set and the form-disguise audit',
  },
  {
    file: 'apps/api/src/lib/vida-memory.test.ts',
    names: [
      'F5 the thread is ordered', 'F5 re-entry on the same client', 'F5 🛑 BOTH KEYS ON EVERY READ',
      'F5 🛑 TWO OPERATORS × TWO CLIENTS', 'F5 a read that fails is empty',
      'F5 a failed write loses the memory', 'F5 the thread is bounded', 'F5 ⚠️ READ-MODIFY-WRITE',
    ],
    why: "Vida's memory: ordering, isolation, failure, bounds, and the accepted race",
  },
  {
    file: 'apps/api/src/routes/vida-conversation.test.ts',
    names: [
      'F6 an unexpected request', 'F6 a plain question', 'F6 a correction lands',
      'F6 two requests in one message', 'F6 ambiguity is a question',
      'F6 she is given the programme', 'F6 🛑 SHE PROPOSES AND NOTHING EXECUTES',
    ],
    why: 'Vida carries a conversation, and executes nothing',
  },
  {
    file: 'apps/api/src/routes/get-help-path.test.ts',
    names: [
      'F8 ① the button exists', 'F8 ② a person MID-ONBOARDING', 'F8 ③ each channel ALONE',
      'F8 ④ 🛑 THE DURABLE TABLE HAS BOTH MIGRATION HOMES', 'F8 ⑤ the client stays in the same conversation',
    ],
    why: 'RT-008, every hop',
  },
  {
    file: 'apps/api/src/routes/northstar-regression.test.ts',
    names: ['F9 state after T1, T2, T3 and at confirmation'],
    why: "the founder's own conversation, state by state",
  },
  {
    file: 'apps/api/src/lib/models.test.ts',
    names: ['the two constants are the two the founder ruled', 'NOBODY HAND-TYPES THE CONVERSATIONAL MODEL'],
    why: 'the model allocation, asserted in both directions',
  },
  {
    file: 'apps/api/src/lib/eval-is-not-in-the-gate.test.ts',
    names: ['every file in the eval directory ends .eval.ts', 'check.sh never calls the eval'],
    why: 'the live eval spends money and can never be run by the gate',
  },
]

describe('🛑 DONE — every required proof exists, or the work is not finished', () => {
  for (const { file, names, why } of REQUIRED) {
    it(`${file} — ${why}`, () => {
      expect(existsSync(join(REPO, file)), `${file} is missing — a required proof was deleted`).toBe(true)
      const src = readFileSync(join(REPO, file), 'utf8')
      for (const name of names) {
        expect(src, `${file} no longer contains the required proof "${name}"`).toContain(name)
      }
    })
  }

  it('🛑 and the eleven Brief facts are still eleven', async () => {
    // The one product invariant that silently breaks everything downstream if it moves.
    const { BRIEF_FACTS } = await import('@kind/shared')
    expect(BRIEF_FACTS).toHaveLength(11)
  })

  it('🛑 RUNTIME AND REAL-MODEL ARE STILL UNPROVEN, AND THIS FILE DOES NOT PRETEND OTHERWISE', () => {
    // ⚠️ THE HONEST CEILING. Everything above is STRUCTURAL: the repository read as text and
    // the routes driven with a doubled model. None of it can tell you whether Sonnet, on the
    // real prompt, talks to a real person like a colleague. Two things answer that and
    // neither has happened: the live eval (no ANTHROPIC_API_KEY in the build environment)
    // and the founder walking preview.
    //
    // This assertion exists so nobody reading a green suite concludes more than it proves.
    const runner = join(REPO, 'scripts/conversation-eval.sh')
    expect(existsSync(runner), 'the live eval runner is gone — the only real-model proof').toBe(true)
    expect(readFileSync(runner, 'utf8')).toContain('NOT RUN — ANTHROPIC_API_KEY unavailable')
  })
})
