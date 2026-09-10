// ═══════════════════════════════════════════════════════════════════════════════════════
// TWO ATTEMPTS, THEN A PERSON — every way a third paid attempt could still happen.
//
// The founder stopped the live canary at Proof because the loop could be pressed
// indefinitely and each press is real paid sourcing. These cases are the spend gates: each
// one is a place where being wrong costs money on every run, which is why the rule is pure
// and proved here rather than only exercised against a live provider.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import {
  calibrationVerdict, mayRequestStrongerSet, hasMeaningfulFeedback, spendDoors,
  escalationAsk, ESCALATION_CONFIRMED, ESCALATED_HEADLINE, ESCALATED_DETAIL,
  NEEDS_FEEDBACK_HINT, SPEND_CLOSED_REFUSAL, PROOF_REASON_CODES, PROOF_REASON_LABELS,
  ESCALATION_TRIGGER_COPY,
  type AttemptSummary, type CalibrationState,
} from './proof-calibration'

const attempt = (pass: number, o: Partial<AttemptSummary> = {}): AttemptSummary => ({
  pass, surfaced: 20, looksRight: 0, notAFit: 0, reasons: {}, notes: [], ...o,
})

const state = (o: Partial<CalibrationState> = {}): CalibrationState =>
  ({ passesDone: 1, escalated: false, attempts: [], ...o })

describe('🛑 ① attempt 1 is never a calibration failure', () => {
  it('a first set that misses completely does NOT close the loop — that is what attempt 2 is for', () => {
    const s = state({ passesDone: 1, attempts: [attempt(1, { notAFit: 20, reasons: { wrong_industry: 20 } })] })
    expect(calibrationVerdict(s, 'gave_feedback')).toEqual({ close: false })
    expect(calibrationVerdict(s, 'still_not_right')).toEqual({ close: false })
  })

  it('and the automatic pass door is still open on pass 1', () => {
    expect(spendDoors(state({ passesDone: 1 })).automaticProofPass).toBe(true)
    expect(spendDoors(state({ passesDone: 0 })).automaticProofPass).toBe(true)
  })
})

describe('🛑 ② "Show me stronger examples" is a spend gate, not a button', () => {
  it('disabled with no feedback at all', () => {
    const s = state({ passesDone: 1, attempts: [attempt(1)] })
    expect(mayRequestStrongerSet(s)).toBe(false)
    expect(spendDoors(s).strongerExamplesControl).toBe(false)
  })

  it('🛑 disabled when the client only marked cards and gave no reason — a count is not an instruction', () => {
    // Spending a pass on "these 12 are wrong" with no reason buys a second guess, not an
    // improvement. This is the case that looks like feedback and is not.
    const s = state({ passesDone: 1, attempts: [attempt(1, { notAFit: 12 })] })
    expect(hasMeaningfulFeedback(s.attempts[0])).toBe(false)
    expect(mayRequestStrongerSet(s)).toBe(false)
  })

  it('enabled by a reason code', () => {
    const s = state({ passesDone: 1, attempts: [attempt(1, { notAFit: 3, reasons: { wrong_industry: 3 } })] })
    expect(mayRequestStrongerSet(s)).toBe(true)
  })

  it('enabled by the client\'s own words alone', () => {
    const s = state({ passesDone: 1, attempts: [attempt(1, { notes: ['these are all consultancies'] })] })
    expect(mayRequestStrongerSet(s)).toBe(true)
  })

  it('a blank note is not words', () => {
    expect(hasMeaningfulFeedback(attempt(1, { notes: ['   ', ''] }))).toBe(false)
  })

  it('🛑 NEVER enabled after pass 2, however much feedback there is', () => {
    // ⚠️ ATTEMPT 1 CARRIES FEEDBACK TOO, AND THAT IS THE POINT. An earlier version of this
    // case left attempt 1 empty, so it passed because there was nothing to learn from —
    // not because the ceiling refused. Removing the `passesDone !== 1` guard left it GREEN.
    // With both attempts richly annotated, the ONLY thing that can refuse is the ceiling.
    const first = attempt(1, { notAFit: 8, reasons: { wrong_industry: 8 }, notes: ['all consultancies'] })
    const rich = attempt(2, { notAFit: 20, reasons: { wrong_industry: 20 }, notes: ['still wrong'] })
    expect(mayRequestStrongerSet(state({ passesDone: 2, attempts: [first, rich] }))).toBe(false)
    expect(spendDoors(state({ passesDone: 2, attempts: [first, rich] })).strongerExamplesControl).toBe(false)
  })

  it('🛑 …and never before a first set exists, feedback or not', () => {
    // `passesDone: 0` with feedback is a contradiction the state could still be handed (a
    // stale summary, a reset counter). The door stays shut: there is nothing to improve on.
    const first = attempt(1, { notAFit: 3, reasons: { wrong_role: 3 } })
    expect(mayRequestStrongerSet(state({ passesDone: 0, attempts: [first] }))).toBe(false)
  })

  it('the disabled hint is the founder\'s sentence', () => {
    expect(NEEDS_FEEDBACK_HINT).toBe("Mark one or two that aren't right first, so I know what to change.")
  })
})

describe('🛑 ③ the three closing triggers, and only on attempt 2', () => {
  const twoPasses = (second: Partial<AttemptSummary>) =>
    state({ passesDone: 2, attempts: [attempt(1, { looksRight: 2 }), attempt(2, second)] })

  it('① the client presses "Still not right"', () => {
    expect(calibrationVerdict(twoPasses({ notAFit: 4 }), 'still_not_right'))
      .toEqual({ close: true, trigger: 'client_said_still_not_right' })
  })

  it('② half or more of the second set rejected AND nothing kept', () => {
    expect(calibrationVerdict(twoPasses({ surfaced: 20, notAFit: 10, looksRight: 0 }), 'gave_feedback'))
      .toEqual({ close: true, trigger: 'second_set_mostly_rejected' })
  })

  it('🛑 …but NOT when the client kept something — that is a set we can still learn from', () => {
    // Ten rejections beside two "looks right" is engagement, not a targeting failure. Closing
    // here would take a working conversation and hand it to a human for no reason.
    expect(calibrationVerdict(twoPasses({ surfaced: 20, notAFit: 18, looksRight: 2 }), 'gave_feedback'))
      .toEqual({ close: false })
  })

  it('…and NOT when fewer than half were rejected', () => {
    expect(calibrationVerdict(twoPasses({ surfaced: 20, notAFit: 9, looksRight: 0 }), 'gave_feedback'))
      .toEqual({ close: false })
    // Exactly half does close — the boundary is inclusive.
    expect(calibrationVerdict(twoPasses({ surfaced: 20, notAFit: 10, looksRight: 0 }), 'gave_feedback').close).toBe(true)
  })

  it('③ asking for more after both passes — the pre-existing backstop, kept', () => {
    expect(calibrationVerdict(twoPasses({}), 'requested_more'))
      .toEqual({ close: true, trigger: 'requested_more_after_pass_two' })
  })

  it('🛑 …and that backstop does NOT fire on pass 1', () => {
    expect(calibrationVerdict(state({ passesDone: 1 }), 'requested_more')).toEqual({ close: false })
  })

  it('an unjudged second set closes nothing on its own', () => {
    // 20 surfaced, nothing marked: the client has not looked yet. Closing would be us
    // deciding they are unhappy before they said so.
    expect(calibrationVerdict(twoPasses({ surfaced: 20, notAFit: 0, looksRight: 0 }), 'none'))
      .toEqual({ close: false })
  })

  it('every trigger has founder-plain copy, and none of it leaks our vocabulary', () => {
    for (const [t, copy] of Object.entries(ESCALATION_TRIGGER_COPY)) {
      expect(copy, t).toBeTruthy()
      expect(copy.toLowerCase()).not.toMatch(/apollo|pdl|provider|proof_pass|rpc|icp_id|null/)
    }
  })
})

describe('🛑 ④ an already-closed loop cannot be re-closed or re-opened', () => {
  const closed = state({ passesDone: 2, escalated: true, attempts: [attempt(1), attempt(2, { notAFit: 20 })] })

  it('no signal re-triggers escalation', () => {
    for (const sig of ['still_not_right', 'requested_more', 'gave_feedback', 'none'] as const) {
      expect(calibrationVerdict(closed, sig), sig).toEqual({ close: false })
    }
  })

  it('🛑 …and EVERY spend door is shut, not most of them', () => {
    const doors = spendDoors(closed)
    expect(doors).toEqual({
      automaticProofPass: false,
      strongerExamplesControl: false,
      perCardFindMore: false,
      chatSourcingRequest: false,
    })
    // Stated as a whole-object equality on purpose: adding a new door later fails this case
    // until somebody decides, deliberately, whether an escalated client may open it.
    expect(Object.values(doors).some(Boolean), 'a spend door is open after escalation').toBe(false)
  })
})

describe('🛑 ⑤ per-card and chat requests can never source, at any pass count', () => {
  it('neither door is ever open, escalated or not', () => {
    for (const passes of [0, 1, 2]) {
      const doors = spendDoors(state({ passesDone: passes }))
      expect(doors.perCardFindMore, `perCardFindMore open at ${passes} passes`).toBe(false)
      expect(doors.chatSourcingRequest, `chatSourcingRequest open at ${passes} passes`).toBe(false)
    }
  })
})

describe('🛑 ⑥ Milla\'s words — founder-locked, and no SLA', () => {
  it('the ask uses the number we already hold', () => {
    const ask = escalationAsk('07700 900123')
    expect(ask).toContain("I'm not getting the targeting right enough yet")
    expect(ask).toContain("I don't want to keep showing you the wrong people")
    expect(ask).toContain('Is 07700 900123 still the best number to reach you on?')
  })

  it('…and asks for one when there is none', () => {
    for (const none of [null, undefined, '', '   ']) {
      expect(escalationAsk(none), String(none)).toContain('What’s the best number to reach you on?')
    }
  })

  it('🛑 NO SLA — not in the ask, not in the confirmation, not in the calm state', () => {
    // ⛓️ An earlier draft of mine promised "within one working day". The founder struck it:
    // "No SLA has been approved." A promise nobody agreed to is worse than none, because the
    // client measures us against it.
    const all = [escalationAsk('07700 900123'), escalationAsk(null), ESCALATION_CONFIRMED,
                 ESCALATED_HEADLINE, ESCALATED_DETAIL, SPEND_CLOSED_REFUSAL].join(' ').toLowerCase()
    for (const promise of [
      'working day', 'within a day', 'within 24', '24 hours', 'today', 'tomorrow',
      'shortly', 'immediately', 'asap', 'guarantee',
    ]) {
      expect(all.includes(promise), `an SLA slipped into the copy: "${promise}"`).toBe(false)
    }
  })

  it('the confirmation says what is paused, and promises nothing else', () => {
    expect(ESCALATION_CONFIRMED).toBe(
      'Thanks — a member of our team will contact you to finish calibrating this. ' +
      'I’ve paused finding people until we’ve spoken.')
  })

  it('the calm state is the founder\'s two lines', () => {
    expect(ESCALATED_HEADLINE).toBe('Calibration help arranged')
    expect(ESCALATED_DETAIL).toBe('Targeting is paused until reviewed.')
  })

  it('no client-facing sentence names our plumbing', () => {
    const all = [escalationAsk('07700 900123'), ESCALATION_CONFIRMED, ESCALATED_HEADLINE,
                 ESCALATED_DETAIL, SPEND_CLOSED_REFUSAL, NEEDS_FEEDBACK_HINT].join(' ')
    for (const leak of ['Apollo', 'PDL', 'provider', 'proof pass', 'ICP', 'sourcing run', 'RPC', 'escalat']) {
      expect(all.toLowerCase().includes(leak.toLowerCase()), `copy leaks "${leak}"`).toBe(false)
    }
  })
})

describe('⑦ the six reasons are the founder\'s six', () => {
  it('exactly these, in this order', () => {
    expect([...PROOF_REASON_CODES]).toEqual([
      'wrong_industry', 'wrong_role', 'too_big', 'too_small', 'wrong_geography', 'other',
    ])
  })

  it('each has a client-facing label', () => {
    for (const c of PROOF_REASON_CODES) {
      expect(PROOF_REASON_LABELS[c], c).toBeTruthy()
    }
    expect(PROOF_REASON_LABELS.wrong_industry).toBe('Wrong industry')
    expect(PROOF_REASON_LABELS.too_big).toBe('Too big')
  })
})
