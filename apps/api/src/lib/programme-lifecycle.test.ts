// ═══════════════════════════════════════════════════════════════════════════════════════
// WHERE IS THIS CLIENT, AND DOES ANYBODY HAVE TO DO ANYTHING — the rule, pinned.
//
// ── WHY THIS FILE IS THE IMPORTANT ONE ──────────────────────────────────────────────────
//
// Five surfaces render this verdict: the lifecycle ribbon, the stage word on every client row,
// Vida's message, the right panel, and the Needs-you filter. They cannot disagree, because
// there is one function — so the whole workspace's correctness is this function's correctness.
//
// ── AND `needsYou` IS THE HALF THAT WILL BE GOT WRONG ───────────────────────────────────
//
// 🛑 THE FAILURE MODE IS OVER-INCLUSION, NOT UNDER. A filter that lists a client the operator
// cannot help is a row that can never clear, and a list with rows that never clear is a list
// nobody reads — at which point the one real exception in it is invisible. So the exclusions
// below are asserted as hard as the inclusions, and every inclusion names a control that
// actually exists on that screen.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import {
  deriveLifecycle, LIFECYCLE_STAGES, STAGE_LABEL,
  type LifecycleFacts,
} from './programme-lifecycle'

/** Everything healthy, nothing outstanding. Each case changes only what it is about. */
const BASE: LifecycleFacts = {
  programme: null,
  proofStarted: null,
  preparationStopped: false,
  preparing: false,
  humanBlockers: [],
  readinessReady: true,
  sends: 0,
  repliesAwaitingDecision: 0,
  senderSendable: true,
  killSwitchOff: true,
  operatorRunEnabled: true,
  remainingEntitlement: 0,
  hasNewerProgramme: false,
  repeatDismissed: false,
}

// ⛓️ 10 Sep (H) — `run` JOINS THE SHAPE, AND ITS DEFAULT IS `true` ON PURPOSE.
//
// Run is the second operator act and the only one that permits delivery, so `live && !run` is
// now its own state (armed, never started). Every pre-existing LIVE case in this file was
// written to mean "a programme that is actually running", so the default preserves each of
// those duties exactly; the armed-not-started cases are asserted explicitly below and in
// `programme-run-authority.test.ts`. Defaulting it to `false` instead would have silently
// re-pointed a dozen assertions at a state they were never about.
const prog = (over: Partial<NonNullable<LifecycleFacts['programme']>> = {}) => ({
  status: 'SOURCING', paused: false, approved: false, secondAuthorised: false, live: false,
  run: true, ...over,
})
const at = (f: Partial<LifecycleFacts>) => deriveLifecycle({ ...BASE, ...f })

/**
 * ⚑ 10 Sep (H) — ARMED, NEVER STARTED: Make Live has run, Run has not.
 *
 * Declared once at module scope because two describe blocks need it. `live: true` alone used
 * to mean both "armed" and "running", and the send count stood in for the difference.
 */
const armedLive = { status: 'LIVE', approved: true, secondAuthorised: true, live: true, run: false }

describe('① the eight stages, and exactly one of them is live', () => {
  it('the locked order is the founder\'s, and nothing was added to it', () => {
    expect([...LIFECYCLE_STAGES]).toEqual([
      'signup', 'proof', 'recommendation', 'sourcing', 'approval', 'live', 'review', 'completion',
    ])
    // 🛑 P1, P2, QUALIFICATION, PREPARATION AND RUN ARE NOT STAGES. They are commercial and
    // operational truths inside a stage; a ribbon carrying them describes our plumbing.
    for (const notAStage of ['p1', 'p2', 'qualification', 'preparation', 'run']) {
      expect((LIFECYCLE_STAGES as readonly string[]).includes(notAStage), `${notAStage} became a stage`).toBe(false)
    }
  })

  it('every stage has a label, and the index is its position', () => {
    for (const [i, s] of LIFECYCLE_STAGES.entries()) {
      expect(STAGE_LABEL[s], `${s} has no label`).toBeTruthy()
      const v = deriveLifecycle({ ...BASE, programme: prog({ status: 'COMPLETED' }) })
      expect(v.stageIndex).toBe(LIFECYCLE_STAGES.indexOf(v.stage) + 1)
      void i
    }
  })
})

describe('② the derivation, state by state', () => {
  it('no programme, and no proof signal → Signup', () => {
    const v = at({ programme: null, proofStarted: null })
    expect(v.state).toBe('signup')
    expect(v.stage).toBe('signup')
    expect(v.needsYou).toBe(false)
  })

  it('🛑 an UNREADABLE proof signal reads as Signup, never as Proof', () => {
    // `null` means "we could not tell". Promoting a client to Proof on it would make Vida look
    // like she is watching work that is not happening.
    expect(at({ programme: null, proofStarted: null }).state).toBe('signup')
    expect(at({ programme: null, proofStarted: false }).state).toBe('signup')
    expect(at({ programme: null, proofStarted: true }).state).toBe('proof')
  })

  it('RECOMMENDED and AWAITING_FIRST_PAYMENT are both Recommendation', () => {
    for (const status of ['DRAFT', 'RECOMMENDED', 'AWAITING_FIRST_PAYMENT']) {
      const v = at({ programme: prog({ status }) })
      expect(v.stage, status).toBe('recommendation')
      expect(v.needsYou, `${status} asked the operator for something`).toBe(false)
    }
  })

  it('SOURCING_AUTHORISED and SOURCING are Sourcing, and Vida is Working', () => {
    for (const status of ['SOURCING_AUTHORISED', 'SOURCING']) {
      const v = at({ programme: prog({ status }) })
      expect(v.state).toBe('sourcing')
      expect(v.mode).toBe('Working')
      expect(v.needsYou).toBe(false)
    }
  })

  it('READY_FOR_APPROVAL is Approval, and the client is the one acting', () => {
    const v = at({ programme: prog({ status: 'READY_FOR_APPROVAL' }) })
    expect(v.state).toBe('approval')
    expect(v.needsYou).toBe(false)
  })

  it('approved but P2 outstanding stays on Approval', () => {
    const v = at({ programme: prog({ status: 'APPROVED', approved: true, secondAuthorised: false }) })
    expect(v.stage).toBe('approval')
    expect(v.state).toBe('approval_awaiting_second_payment')
    expect(v.needsYou).toBe(false)
  })

  it('approved WITH P2 is Live, waiting for Make Live', () => {
    const v = at({ programme: prog({ status: 'APPROVED', approved: true, secondAuthorised: true }) })
    expect(v.stage).toBe('live')
    expect(v.state).toBe('live_ready_to_make_live')
    expect(v.needsYouReason).toBe('make_live_required')
  })

  it('LIVE and never Run is Live — ready to Run, NOT Review', () => {
    // ⛓️ RETARGETED 10 Sep (H), AND IT IS NOW A STRONGER CLAIM. The case was "LIVE with zero
    // sends", because zero sends was the only available proxy for "nobody has started it".
    // Run is a stored fact now, so the state is named by the fact — and the send count is
    // asserted NOT to matter: an armed programme reads ready-to-Run even with sends against
    // it, which is the honest answer while `authorityFor` refuses `programme_not_run`.
    const v = at({ programme: prog({ ...armedLive }), sends: 0 })
    expect(v.stage).toBe('live')
    expect(v.state).toBe('live_ready_to_run')
    const withStraySends = at({ programme: prog({ ...armedLive }), sends: 212 })
    expect(withStraySends.state, 'a send count promoted an un-Run programme to Review').toBe('live_ready_to_run')
  })

  it('LIVE with sends is Review', () => {
    const v = at({ programme: prog({ status: 'LIVE', approved: true, secondAuthorised: true, live: true }), sends: 212 })
    expect(v.stage).toBe('review')
    expect(v.state).toBe('review')
    expect(v.mode).toBe('Watching')
    expect(v.needsYou).toBe(false)
  })

  it('COMPLETED is Completion', () => {
    expect(at({ programme: prog({ status: 'COMPLETED' }) }).state).toBe('completion')
  })

  it('🛑 CANCELLED keeps its truthful stage and is NEVER a task', () => {
    // There is nothing to press on a cancelled programme, so a row in Needs you could never
    // clear. It keeps the stage it reached, and says it is on hold.
    const v = at({ programme: prog({ status: 'CANCELLED', approved: true, secondAuthorised: true, live: true }), sends: 5 })
    expect(v.state).toBe('blocked')
    expect(v.stage).toBe('review')
    expect(v.needsYou).toBe(false)
  })
})

describe('③ exceptions replace the healthy state they sit on', () => {
  it('a paused sourcing programme is the sourcing exception', () => {
    const v = at({ programme: prog({ paused: true }) })
    expect(v.state).toBe('sourcing_exception')
    expect(v.needsYouReason).toBe('preparation_stopped')
  })

  it('a refused preparation is the sourcing exception', () => {
    expect(at({ programme: prog(), preparationStopped: true }).state).toBe('sourcing_exception')
  })

  it('🛑 A RUN IN FLIGHT IS NEVER AN EXCEPTION — that is the difference between slow and broken', () => {
    // Calling a working programme broken is how an operator learns to ignore the flag.
    const v = at({ programme: prog(), preparing: true, preparationStopped: true, humanBlockers: ['no_sender'] })
    expect(v.state).toBe('sourcing')
    expect(v.needsYou).toBe(false)
  })

  it('within Review, a stopped SENDER outranks a waiting reply', () => {
    // A stopped sender is why nothing is moving; the reply behind it is a smaller truth.
    const v = at({
      programme: prog({ status: 'LIVE', approved: true, secondAuthorised: true, live: true }),
      sends: 200, senderSendable: false, repliesAwaitingDecision: 3,
    })
    expect(v.state).toBe('review_sender')
    expect(v.needsYouReason).toBe('sender_not_sendable')
  })

  it('a waiting reply with a healthy sender is the reply exception', () => {
    const v = at({
      programme: prog({ status: 'LIVE', approved: true, secondAuthorised: true, live: true }),
      sends: 200, repliesAwaitingDecision: 1,
    })
    expect(v.state).toBe('review_reply')
    expect(v.needsYouReason).toBe('reply_needs_decision')
  })
})

describe('🛑 ④ Needs you — the inclusions, each naming a control that exists', () => {
  const live = { status: 'LIVE', approved: true, secondAuthorised: true, live: true }
  // ⛓️ 10 Sep (H) — ARMED, NEVER STARTED. Make Live produced `live: true`; nobody has pressed
  // Run. This state used to be inferred from `sends: 0`, which was only ever a proxy for it.
  const armed = { ...live, run: false }

  it('1 · preparation stopped, and there is a retry', () => {
    expect(at({ programme: prog(), preparationStopped: true }).needsYouReason).toBe('preparation_stopped')
  })
  it('2 · Make Live is required', () => {
    expect(at({ programme: prog({ status: 'APPROVED', approved: true, secondAuthorised: true }) }).needsYouReason)
      .toBe('make_live_required')
  })
  it('3 · Run is required AND actually usable', () => {
    expect(at({ programme: prog(armed), sends: 0 }).needsYouReason).toBe('run_required')
  })
  it('4 · a reply is waiting for a person', () => {
    expect(at({ programme: prog(live), sends: 9, repliesAwaitingDecision: 2 }).needsYouReason).toBe('reply_needs_decision')
  })
  it('5 · the sender cannot send', () => {
    expect(at({ programme: prog(live), sends: 9, senderSendable: false }).needsYouReason).toBe('sender_not_sendable')
  })
  it('6 · a blocker only a human can clear', () => {
    const v = at({ programme: prog({ status: 'APPROVED', approved: true, secondAuthorised: true }), readinessReady: false, humanBlockers: ['no_sender'] })
    expect(v.needsYouReason).toBe('human_blocker')
  })

  it('every inclusion carries a NAMED reason — never a bare true', () => {
    const cases: LifecycleFacts[] = [
      { ...BASE, programme: prog(), preparationStopped: true },
      { ...BASE, programme: prog({ status: 'APPROVED', approved: true, secondAuthorised: true }) },
      { ...BASE, programme: prog(armed), sends: 0 },
      { ...BASE, programme: prog(live), sends: 9, repliesAwaitingDecision: 1 },
      { ...BASE, programme: prog(live), sends: 9, senderSendable: false },
    ]
    for (const f of cases) {
      const v = deriveLifecycle(f)
      expect(v.needsYou).toBe(true)
      expect(v.needsYouReason, 'a task with no reason is a task nobody can act on').toBeTruthy()
      expect(v.mode).toBe('Needs you')
    }
  })
})

describe('🛑 ⑤ Needs you — the exclusions, which are the half that will be got wrong', () => {
  const live = { status: 'LIVE', approved: true, secondAuthorised: true, live: true }
  // ⛓️ 10 Sep (H) — ARMED, NEVER STARTED. Make Live produced `live: true`; nobody has pressed
  // Run. This state used to be inferred from `sends: 0`, which was only ever a proxy for it.
  const armed = { ...live, run: false }

  it('Signup · Proof · Recommendation are never tasks — the client is acting', () => {
    for (const f of [
      { programme: null, proofStarted: null },
      { programme: null, proofStarted: true },
      { programme: prog({ status: 'RECOMMENDED' }) },
    ] as Partial<LifecycleFacts>[]) {
      expect(at(f).needsYou).toBe(false)
    }
  })

  it('healthy Sourcing is never a task', () => {
    expect(at({ programme: prog() }).needsYou).toBe(false)
  })

  it('Approval waiting on the client is never a task — even when it has sat for days', () => {
    // 🛑 THE REMINDER IS POST-LAUNCH, and an unopened review is not an operator failure. If
    // this ever goes true, every client at Approval becomes a permanent row.
    expect(at({ programme: prog({ status: 'READY_FOR_APPROVAL' }) }).needsYou).toBe(false)
    expect(at({ programme: prog({ status: 'APPROVED', approved: true }) }).needsYou).toBe(false)
  })

  it('healthy Review is never a task', () => {
    expect(at({ programme: prog(live), sends: 400 }).needsYou).toBe(false)
  })

  it('a finished programme with nothing left is never a task', () => {
    expect(at({ programme: prog({ status: 'COMPLETED' }), remainingEntitlement: 0 }).needsYou).toBe(false)
  })

  it('🛑 THE KILL-SWITCH IS NOT A TO-DO — Run blocked by it does NOT enter Needs you', () => {
    // The operator cannot turn the switch off from this screen, so a row here could not be
    // cleared by the person reading it. The state stays truthful and the panel says why.
    const v = at({ programme: prog(armed), sends: 0, killSwitchOff: false })
    expect(v.state).toBe('live_ready_to_run')
    expect(v.needsYou).toBe(false)
    expect(v.mode).not.toBe('Needs you')
  })

  it('…and neither does a Run with the operator key unset', () => {
    const v = at({ programme: prog(armed), sends: 0, operatorRunEnabled: false })
    expect(v.state).toBe('live_ready_to_run')
    expect(v.needsYou).toBe(false)
  })

  it('🛑 the repeat opportunity is stated, not tasked — there is no safe button behind it', () => {
    // Preparing a next programme needs a meeting target nobody has chosen. A task whose control
    // cannot exist is a row that never clears.
    const v = at({ programme: prog({ status: 'COMPLETED' }), remainingEntitlement: 2324 })
    expect(v.state).toBe('completion_repeat')
    expect(v.needsYou).toBe(false)
  })

  it('…and it is not offered at all once a newer programme exists', () => {
    const v = at({ programme: prog({ status: 'COMPLETED' }), remainingEntitlement: 2324, hasNewerProgramme: true })
    expect(v.state).toBe('completion')
  })
})

describe('⑥ the mode pill says one of exactly four things', () => {
  it('and "Needs you" is only ever said when there is something to do', () => {
    const ALLOWED = ['No action needed', 'Working', 'Watching', 'Needs you']
    const facts: Partial<LifecycleFacts>[] = [
      { programme: null }, { programme: null, proofStarted: true },
      { programme: prog({ status: 'RECOMMENDED' }) }, { programme: prog() },
      { programme: prog(), preparationStopped: true },
      { programme: prog({ status: 'READY_FOR_APPROVAL' }) },
      { programme: prog({ status: 'APPROVED', approved: true }) },
      { programme: prog({ status: 'APPROVED', approved: true, secondAuthorised: true }) },
      { programme: prog({ status: 'LIVE', approved: true, secondAuthorised: true, live: true }) },
      { programme: prog({ status: 'LIVE', approved: true, secondAuthorised: true, live: true }), killSwitchOff: false },
      { programme: prog({ status: 'LIVE', approved: true, secondAuthorised: true, live: true }), sends: 9 },
      { programme: prog({ status: 'LIVE', approved: true, secondAuthorised: true, live: true }), sends: 9, repliesAwaitingDecision: 1 },
      { programme: prog({ status: 'LIVE', approved: true, secondAuthorised: true, live: true }), sends: 9, senderSendable: false },
      { programme: prog({ status: 'COMPLETED' }) },
      { programme: prog({ status: 'COMPLETED' }), remainingEntitlement: 10 },
      { programme: prog({ status: 'CANCELLED' }) },
    ]
    for (const f of facts) {
      const v = at(f)
      expect(ALLOWED, `mode "${v.mode}" is not one of the four`).toContain(v.mode)
      // 🛑 THE PILL IS A PROMISE. "Needs you" means there is something here the operator can do.
      if (v.mode === 'Needs you') expect(v.needsYou, `${v.state} says Needs you with no reason`).toBe(true)
      if (v.needsYou) expect(v.mode).toBe('Needs you')
    }
  })
})
