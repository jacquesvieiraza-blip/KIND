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
  ESCALATION_TRIGGER_COPY, proofUiState, whatChangedSentence,
  calibratedRestart, BOTH_ATTEMPTS_USED_ASK, LIVE_ESCALATION_TRIGGERS,
  type AttemptSummary, type CalibrationState,
} from './proof-calibration'

  // ⚑ 11 Sep — `kind` defaults to 'automatic', which is what every case in this file is
  // about. The calibrated restart is a DIFFERENT history event and never an automatic
  // attempt; `proof-restart-authority.test.ts` is where that distinction is exercised.
const attempt = (pass: number, o: Partial<AttemptSummary> = {}): AttemptSummary => ({
  pass, kind: 'automatic', surfaced: 20, looksRight: 0, notAFit: 0, reasons: {}, notes: [], ...o,
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

describe('🛑 ③ the closing triggers, and only on attempt 2', () => {
  const twoPasses = (second: Partial<AttemptSummary>) =>
    state({ passesDone: 2, attempts: [attempt(1, { looksRight: 2 }), attempt(2, second)] })

  it('① the client presses "Still not right"', () => {
    expect(calibrationVerdict(twoPasses({ notAFit: 4 }), 'still_not_right'))
      .toEqual({ close: true, trigger: 'client_said_still_not_right' })
  })

  // ── ⛓️ 11 Sep — THESE TWO CASES ARE INVERTED, NOT DELETED ────────────────────────────
  //
  // 🛑 THEY USED TO REQUIRE `second_set_mostly_rejected`: half or more of the second set
  // marked "Not a fit" with nothing kept closed the loop automatically. The founder's MVP1
  // lock forbids exactly that — escalation may be triggered ONLY by an explicit client action
  // equivalent to "Still not right", and NOT because "several prospects are Not a fit".
  //
  // ⚠️ THE ASSERTIONS ARE REVERSED SO THE OLD BEHAVIOUR IS NOW FORBIDDEN, which is the shape
  // this repo uses when a rule is withdrawn rather than relaxed (see the billing-push guard).
  // Deleting them would leave nothing standing between a future edit and the same inference.
  it('🛑 B · a badly-marked second set does NOT escalate — several Not-a-fits are not a verdict', () => {
    expect(calibrationVerdict(twoPasses({ surfaced: 20, notAFit: 10, looksRight: 0 }), 'gave_feedback'))
      .toEqual({ close: false })
  })

  it('🛑 C · nor does the WHOLE second set being rejected, while the client says nothing', () => {
    expect(calibrationVerdict(twoPasses({ surfaced: 20, notAFit: 20, looksRight: 0 }), 'gave_feedback'))
      .toEqual({ close: false })
    expect(calibrationVerdict(twoPasses({ surfaced: 20, notAFit: 20, looksRight: 0 }), 'none'))
      .toEqual({ close: false })
  })

  it('🛑 …and a set the client kept something from still does not escalate', () => {
    expect(calibrationVerdict(twoPasses({ surfaced: 20, notAFit: 18, looksRight: 2 }), 'gave_feedback'))
      .toEqual({ close: false })
  })

  it('🛑 the only automatic trigger is the explicit act — the SAME set escalates when they say so', () => {
    const rejected = twoPasses({ surfaced: 20, notAFit: 20, looksRight: 0 })
    expect(calibrationVerdict(rejected, 'gave_feedback').close, 'marking closed the loop').toBe(false)
    expect(calibrationVerdict(rejected, 'still_not_right').close, 'the explicit act did not close it').toBe(true)
  })

  // ── 🛑 ⛓️ 11 Sep — THIS CASE IS INVERTED (founder correction) ────────────────────────
  //
  // It used to require that asking for another set after both passes CLOSED the loop, on the
  // reading that asking a third time is dissatisfaction. The founder corrected it: "Show me
  // more" can come from somebody who AGREES with the targeting and simply wants more examples
  // of it. Escalating them books a phone call nobody asked for.
  //
  // ⚠️ IT STILL SOURCES NOTHING — that was never what this trigger did. `spendDoors` is shut
  // at two passes whatever the verdict says, and the case below asserts it.
  it('🛑 1 · 2 · 3 · asking for more after both passes does NOT escalate, and sources nothing', () => {
    const s = twoPasses({})
    expect(calibrationVerdict(s, 'requested_more')).toEqual({ close: false })
    expect(spendDoors(s).automaticProofPass, 'the request bought a third set').toBe(false)
    expect(spendDoors(s).strongerExamplesControl).toBe(false)
    expect(spendDoors(s).chatSourcingRequest).toBe(false)
  })

  it('🛑 3 · …and it grants no restart authority either', () => {
    expect(calibratedRestart(twoPasses({})), 'asking for more granted a restart').toBe('none')
  })

  it('🛑 4 · the client is ASKED instead, and only their answer escalates', () => {
    // Milla explains that both automatic searches are used and asks the question outright.
    expect(BOTH_ATTEMPTS_USED_ASK).toContain('still not right')
    expect(BOTH_ATTEMPTS_USED_ASK, 'a third automatic attempt was implied').not.toMatch(/another (search|look|attempt)/i)
    expect(calibrationVerdict(twoPasses({}), 'still_not_right'))
      .toEqual({ close: true, trigger: 'client_said_still_not_right' })
  })

  it('🛑 5 · 6 · the legacy trigger values stay READABLE — history is not rewritten', () => {
    // Rows escalated under the 10-Sep rules carry these; an operator opening one of those
    // clients must still read why it happened. They are simply never generated again.
    expect(ESCALATION_TRIGGER_COPY.requested_more_after_pass_two).toBeTruthy()
    expect(ESCALATION_TRIGGER_COPY.second_set_mostly_rejected).toBeTruthy()
    expect(LIVE_ESCALATION_TRIGGERS, 'a withdrawn trigger is still generated')
      .toEqual(['client_said_still_not_right'])
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
  // ⛓️ 11 Sep — THE ASK NOW COVERS A NAME AS WELL AS A NUMBER. The founder's MVP1 lock:
  // before human calibration, ensure the required contact details exist — NAME and PHONE.
  // These cases keep every previous claim (the opener, the stored number, never inventing
  // one) and add the half that was missing.
  it('the ask uses the number AND the name we already hold, and asks for neither again', () => {
    const ask = escalationAsk('07700 900123', 'Ellis')
    expect(ask).toContain("I'm not getting the targeting right enough yet")
    expect(ask).toContain("I don't want to keep showing you the wrong people")
    expect(ask).toContain('Is 07700 900123 still the best number to reach you on')
    expect(ask).toContain('Ellis')
    expect(ask, 'it asked for a name it already holds').not.toContain('who should they ask for')
  })

  it('…asks for the number when there is none', () => {
    for (const none of [null, undefined, '', '   ']) {
      expect(escalationAsk(none, 'Ellis'), String(none)).toContain('What’s the best number to reach you on')
    }
  })

  it('🛑 18 · …and asks for the NAME when we do not hold one', () => {
    expect(escalationAsk('07700 900123', null)).toContain('who should they ask for')
    expect(escalationAsk(null, null)).toContain('who should they ask for')
    expect(escalationAsk(null, '   ')).toContain('who should they ask for')
  })

  it('🛑 19 · and never invents either — a missing number is asked for, not derived', () => {
    const ask = escalationAsk(null, null)
    expect(ask).not.toMatch(/\d{5,}/)
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

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE SCREEN'S SHAPE — decided here, so the browser cannot decide it.
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('🛑 ⑧ attempt 1 draws exactly two batch controls', () => {
  it('These are right, and a Show me stronger examples that is DISABLED with no feedback', () => {
    const ui = proofUiState(state({ passesDone: 1, attempts: [attempt(1)] }), null, false)
    expect(ui.attempt).toBe(1)
    expect(ui.showTheseAreRight).toBe(true)
    expect(ui.showStronger).toBe(true)
    expect(ui.strongerEnabled).toBe(false)
    expect(ui.strongerHint).toBe(NEEDS_FEEDBACK_HINT)
    // 🛑 AND NO ATTEMPT-2 CONTROL. "Still not right" before a second set would close the loop
    // on a first guess — the thing attempt 2 exists to prevent.
    expect(ui.showStillNotRight).toBe(false)
    expect(ui.whatChanged).toBeNull()
  })

  it('…and ENABLED once a reason exists, with no hint', () => {
    const s = state({ passesDone: 1, attempts: [attempt(1, { notAFit: 3, reasons: { wrong_industry: 3 } })] })
    const ui = proofUiState(s, null, false)
    expect(ui.strongerEnabled).toBe(true)
    expect(ui.strongerHint).toBeNull()
  })

  it('before any set exists there is nothing to accept and nothing to improve', () => {
    const ui = proofUiState(state({ passesDone: 0 }), null, false)
    expect(ui.showTheseAreRight).toBe(false)
    expect(ui.showStronger).toBe(false)
    expect(ui.showStillNotRight).toBe(false)
  })
})

describe('🛑 ⑨ attempt 2 draws These are right and Still not right — and nothing else', () => {
  const s = state({
    passesDone: 2,
    attempts: [attempt(1, { notAFit: 8, reasons: { wrong_industry: 8 } }), attempt(2, { notAFit: 3 })],
  })

  it('the two controls, and no third-batch control of any kind', () => {
    const ui = proofUiState(s, null, false)
    expect(ui.showTheseAreRight).toBe(true)
    expect(ui.showStillNotRight).toBe(true)
    // The founder's explicit list of what must not be here.
    expect(ui.showStronger, 'a third batch can be requested from attempt 2').toBe(false)
    expect(ui.strongerEnabled).toBe(false)
  })

  it('🛑 Milla names what actually changed, from the client\'s own reasons', () => {
    const ui = proofUiState(s, null, false)
    expect(ui.whatChanged).toBe('I’ve narrowed the kind of company based on what you marked, and looked again.')
  })

  it('two reasons are ranked by weight and at most two are named', () => {
    const many = state({
      passesDone: 2,
      attempts: [attempt(1, { reasons: { too_big: 9, wrong_industry: 2, wrong_geography: 1 } }), attempt(2)],
    })
    const said = proofUiState(many, null, false).whatChanged ?? ''
    expect(said).toContain('brought the company size down')     // the heaviest first
    expect(said).toContain('narrowed the kind of company')      // then the next
    expect(said.includes('tightened where we look'), 'a third change was named').toBe(false)
  })

  it('🛑 …and it claims NOTHING when there was nothing to learn from', () => {
    // "I've refined your targeting" would be equally true if we had changed nothing, and this
    // client has already been disappointed once.
    const blind = state({ passesDone: 2, attempts: [attempt(1), attempt(2)] })
    expect(proofUiState(blind, null, false).whatChanged).toBeNull()
    expect(whatChangedSentence(null)).toBeNull()
  })

  it('words alone are acknowledged without claiming a specific change', () => {
    const noted = state({ passesDone: 2, attempts: [attempt(1, { notes: ['all consultancies'] }), attempt(2)] })
    expect(proofUiState(noted, null, false).whatChanged)
      .toBe('I’ve taken what you told me into account and looked again.')
  })
})

describe('🛑 ⑩ the escalated screen has no controls at all', () => {
  const closed = state({ passesDone: 2, escalated: true, attempts: [attempt(1), attempt(2, { notAFit: 20 })] })

  it('every control is gone, and Milla is asking for the number', () => {
    const ui = proofUiState(closed, '07700 900123', false)
    expect(ui.escalated).toBe(true)
    expect(ui.showTheseAreRight).toBe(false)
    expect(ui.showStronger).toBe(false)
    expect(ui.showStillNotRight).toBe(false)
    expect(ui.ask).toContain('Is 07700 900123 still the best number to reach you on')
    // The calm state comes only AFTER they answer — otherwise the screen would say "arranged"
    // while Milla is still asking the question.
    expect(ui.headline).toBeNull()
  })

  it('…and asks for one when we hold none', () => {
    expect(proofUiState(closed, null, false).ask).toContain('What’s the best number to reach you on')
  })

  it('once confirmed it is the calm state, and the ask is gone', () => {
    const ui = proofUiState(closed, '07700 900123', true)
    expect(ui.ask).toBeNull()
    expect(ui.headline).toBe(ESCALATED_HEADLINE)
    expect(ui.detail).toBe(ESCALATED_DETAIL)
    expect(ui.showTheseAreRight).toBe(false)
  })

  it('🛑 no rendered sentence in ANY escalated shape carries an SLA', () => {
    const all = [
      proofUiState(closed, '07700 900123', false), proofUiState(closed, null, false),
      proofUiState(closed, '07700 900123', true),
    ].flatMap(u => [u.ask, u.headline, u.detail, u.whatChanged, u.strongerHint])
      .filter(Boolean).join(' ').toLowerCase()
    for (const promise of ['working day', 'within 24', '24 hours', 'today', 'tomorrow', 'shortly', 'asap']) {
      expect(all.includes(promise), `an SLA slipped into the rendered state: "${promise}"`).toBe(false)
    }
  })
})
