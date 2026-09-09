// ═══════════════════════════════════════════════════════════════════════════════════════
// WHERE IS THIS CLIENT, AND DOES THE OPERATOR HAVE TO DO ANYTHING — decided ONCE, on the server.
//
// ── THE LOCKED LIFECYCLE (founder-approved 9 Sep, from the final preview set) ────────────
//
//   Signup → Proof → Recommendation → Sourcing → Approval → Live → Review → Completion
//
// Eight stages, and exactly one is live at a time. P1, P2, qualification, preparation and Run
// are NOT stages: they are commercial and operational truths that live INSIDE the right stage.
// A ribbon that showed them would be describing our plumbing to somebody watching their client.
//
// ── WHY THIS IS ONE FUNCTION AND WHY IT IS HERE ─────────────────────────────────────────
//
// 🛑 FIVE SURFACES ASK THE SAME QUESTION: the lifecycle ribbon, the stage word on each client
// row, the middle column's message, the right panel's cards, and the Needs-you filter. Five
// copies of "where is this client" is five chances to disagree, and the one that disagrees
// silently is the filter — an operator would be told nothing needs them while the panel beside
// it drew a button. So the derivation is a single PURE function over named facts.
//
// 🛑 AND IT IS SERVER-SIDE, like every other decision this console renders. A rule a browser
// can compute is a rule anybody with devtools can satisfy. Vida receives a verdict.
//
// ── NORMAL IS SILENT ────────────────────────────────────────────────────────────────────
//
// The product principle the whole workspace rests on: **NORMAL = Vida works and watches;
// EXCEPTION = Vida interrupts.** So `needsYou` is deliberately hard to earn. A lifecycle
// transition that happened by itself is not a task. A client the operator cannot help is not a
// task. Turning every stage change into a row to clear would rebuild the queue this console
// exists to delete — and worse, it would train the operator to ignore the flag.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** The eight ribbon stages, in order. Index is the number the ribbon prints. */
export const LIFECYCLE_STAGES = [
  'signup', 'proof', 'recommendation', 'sourcing', 'approval', 'live', 'review', 'completion',
] as const
export type LifecycleStage = typeof LIFECYCLE_STAGES[number]

/** What the ribbon and the client row print. Title case, the founder's words. */
export const STAGE_LABEL: Record<LifecycleStage, string> = {
  signup: 'Signup', proof: 'Proof', recommendation: 'Recommendation', sourcing: 'Sourcing',
  approval: 'Approval', live: 'Live', review: 'Review', completion: 'Completion',
}

/**
 * The stage PLUS what is true within it. The panels render from this, never from the status.
 *
 * ⚠️ `blocked` IS THE ONE STATE THAT CAN SIT ON ANY STAGE. A paused programme, a cancelled one,
 * or one whose readiness needs a human all keep their truthful stage — "remain on their last
 * lifecycle stage with an exception state" — rather than being moved somewhere tidier.
 */
export type LifecycleState =
  | 'signup' | 'proof' | 'recommendation'
  | 'sourcing' | 'sourcing_exception'
  | 'approval' | 'approval_awaiting_second_payment'
  | 'live_ready_to_make_live' | 'live_ready_to_run'
  | 'review' | 'review_reply' | 'review_sender'
  | 'completion' | 'completion_repeat'
  | 'blocked'

/** Vida's own posture, and the ONLY four words the mode pill may say. */
export type VidaMode = 'No action needed' | 'Working' | 'Watching' | 'Needs you'

/**
 * Why the operator is being interrupted. Named rather than boolean, because "why" is what makes
 * the Needs-you list auditable — and because a reason nobody can name is a reason to distrust.
 */
export type NeedsYouReason =
  | 'preparation_stopped'
  | 'make_live_required'
  | 'run_required'
  | 'reply_needs_decision'
  | 'sender_not_sendable'
  | 'repeat_decision'
  | 'human_blocker'

/**
 * Everything the derivation is allowed to look at.
 *
 * ⚠️ NAMED FACTS, NOT ROWS. The function takes no database handle and no status string it has
 * to parse — every input is already a decided fact, so the rule can be read in one sitting and
 * tested without a database. The gathering is `lifecycleFactsFor` below, and it is the only
 * place a schema detail appears.
 */
export type LifecycleFacts = {
  programme: null | {
    status: string
    paused: boolean
    approved: boolean
    /** P2 authority — internal authorisation OR a real second payment. Never inferred. */
    secondAuthorised: boolean
    live: boolean
  }
  /**
   * Has Milla started Proof?
   *
   * ⚠️ `null` MEANS WE COULD NOT TELL, AND IT IS READ AS SIGNUP. There is no "proof started"
   * column; the honest signal is whether calibration has actually produced anything. An
   * unreadable answer must not promote a client to a stage they may not be in — a client shown
   * at Proof who is really at Signup makes Vida look like it is watching work that is not
   * happening.
   */
  proofStarted: boolean | null
  /** Preparation refused, or a batch is unsettled with no run in flight. */
  preparationStopped: boolean
  /** A run IS in flight — the opposite of stopped, and it must never read as an exception. */
  preparing: boolean
  /** Readiness blockers preparation itself cannot clear, so a human must. */
  humanBlockers: string[]
  /** Every readiness requirement is met. */
  readinessReady: boolean
  /** Real emails delivered for THIS programme's campaign. Zero is what separates Live from Review. */
  sends: number
  /** Replies on this programme that are waiting for a person, not for the pipeline. */
  repliesAwaitingDecision: number
  /** The programme's sending mailbox can actually send. */
  senderSendable: boolean
  /** `AUTO_OUTREACH_ENABLED === 'true'` — i.e. the kill-switch is OFF. */
  killSwitchOff: boolean
  /** `FIGSY_OPERATOR_SEND_ENABLED === 'true'`. */
  operatorRunEnabled: boolean
  /** Qualified-prospect entitlement left on a finished programme. */
  remainingEntitlement: number
  /** A later programme already exists, so the repeat question is already answered. */
  hasNewerProgramme: boolean
  /** The operator pressed "Not yet". */
  repeatDismissed: boolean
}

export type LifecycleVerdict = {
  stage: LifecycleStage
  stageIndex: number
  stageLabel: string
  state: LifecycleState
  mode: VidaMode
  needsYou: boolean
  needsYouReason: NeedsYouReason | null
}

/** Which stage a programme has reached, ignoring exceptions — used to place `blocked`. */
function stageOfProgress(p: NonNullable<LifecycleFacts['programme']>, sends: number): LifecycleStage {
  if (p.live) return sends > 0 ? 'review' : 'live'
  if (p.approved) return p.secondAuthorised ? 'live' : 'approval'
  if (p.status === 'READY_FOR_APPROVAL') return 'approval'
  if (p.status === 'SOURCING' || p.status === 'SOURCING_AUTHORISED') return 'sourcing'
  return 'recommendation'
}

const MODE_OF: Record<LifecycleState, VidaMode> = {
  signup: 'No action needed',
  proof: 'No action needed',
  recommendation: 'No action needed',
  sourcing: 'Working',
  sourcing_exception: 'Needs you',
  approval: 'No action needed',
  approval_awaiting_second_payment: 'No action needed',
  live_ready_to_make_live: 'Needs you',
  live_ready_to_run: 'Needs you',
  review: 'Watching',
  review_reply: 'Needs you',
  review_sender: 'Needs you',
  completion: 'No action needed',
  completion_repeat: 'Needs you',
  blocked: 'Needs you',
}

/**
 * THE ONE DERIVATION. Pure, total, and the only thing allowed to decide where a client is.
 *
 * ⚠️ ORDER IS THE RULE, not an implementation detail. Terminal states are read first (a
 * COMPLETED programme is finished whatever else is true of it); an exception is read before the
 * healthy state it replaces; and within Review the SENDER outranks a reply, because a stopped
 * sender means the reply is not the thing holding the programme up.
 */
export function deriveLifecycle(f: LifecycleFacts): LifecycleVerdict {
  const verdict = (state: LifecycleState, stage: LifecycleStage, reason: NeedsYouReason | null): LifecycleVerdict => {
    const mode = MODE_OF[state]
    // 🛑 `needsYou` IS THE REASON, NOT THE MODE. A state whose mode is "Needs you" but which
    // carries no reason is a state the operator cannot act on — and the whole point of the
    // filter is that everything in it can be resolved by the person reading it.
    const needsYou = reason !== null
    return {
      stage, stageIndex: LIFECYCLE_STAGES.indexOf(stage) + 1, stageLabel: STAGE_LABEL[stage],
      state, mode: needsYou ? 'Needs you' : mode === 'Needs you' ? 'Watching' : mode,
      needsYou, needsYouReason: reason,
    }
  }

  const p = f.programme
  // ── NO PROGRAMME ─────────────────────────────────────────────────────────────────────
  // Signup and Proof are the two stages before anything is recommended. Neither is ever a task:
  // Milla is talking to the client and Vida has nothing to do until there is a programme.
  if (!p) return f.proofStarted === true ? verdict('proof', 'proof', null) : verdict('signup', 'signup', null)

  // ── TERMINAL ─────────────────────────────────────────────────────────────────────────
  if (p.status === 'COMPLETED') {
    // ⚠️ THE REPEAT IS A QUESTION, NEVER AN ACTION TAKEN. It is offered only when there is real
    // unused entitlement, nothing newer already exists, and nobody has said "not yet".
    const repeat = f.remainingEntitlement > 0 && !f.hasNewerProgramme && !f.repeatDismissed
    // 🛑 THE REPEAT IS INFORMATIONAL, AND `needsYou` IS DELIBERATELY `null`. Preparing a next
    // programme needs a meeting target and an outcome — a commercial decision with no safe
    // route behind it today (`POST /programmes` takes a target nobody has chosen yet). A task
    // whose button cannot exist is a row that can never clear, which is the one thing the
    // Needs-you filter must never contain. The opportunity is stated; nothing is started.
    return repeat
      ? verdict('completion_repeat', 'completion', null)
      : verdict('completion', 'completion', null)
  }
  if (p.status === 'CANCELLED') {
    // 🛑 CANCELLED IS NOT A TASK. It keeps its truthful stage and says so, but there is nothing
    // for the operator to press — putting it in Needs you would be a row that can never clear.
    return verdict('blocked', stageOfProgress(p, f.sends), null)
  }

  // ── LIVE AND PAST ────────────────────────────────────────────────────────────────────
  if (p.live) {
    if (f.sends > 0) {
      // Review. The sender is asked FIRST: a paused sender is why nothing is moving, and a
      // reply queued behind it is a smaller truth wearing the bigger one's urgency.
      if (!f.senderSendable) return verdict('review_sender', 'review', 'sender_not_sendable')
      if (p.paused) return verdict('blocked', 'review', 'human_blocker')
      if (f.repliesAwaitingDecision > 0) return verdict('review_reply', 'review', 'reply_needs_decision')
      return verdict('review', 'review', null)
    }
    // Live, armed, nothing sent. Run is the only launch action — and it is only a TASK when it
    // could actually be pressed.
    if (!f.senderSendable) return verdict('review_sender', 'live', 'sender_not_sendable')
    if (p.paused) return verdict('blocked', 'live', 'human_blocker')
    // 🛑 THE KILL-SWITCH IS NOT A TO-DO. With it ON, Run cannot start — and an operator cannot
    // fix that from this screen, so the client must NOT appear in Needs you. The state is still
    // truthful (`live_ready_to_run`) and the panel says plainly why Run is unavailable.
    const runnable = f.killSwitchOff && f.operatorRunEnabled
    return verdict('live_ready_to_run', 'live', runnable ? 'run_required' : null)
  }

  // ── APPROVED, NOT YET LIVE ───────────────────────────────────────────────────────────
  if (p.approved) {
    if (!p.secondAuthorised) {
      // Still Approval: the client owes the second payment and Vida cannot collect it.
      return verdict('approval_awaiting_second_payment', 'approval', null)
    }
    if (p.paused || f.humanBlockers.length > 0 || !f.readinessReady) {
      // Everything is bought and something a person must fix is in the way. This is the one
      // place a blocker genuinely stops the launch, so it is a task — unless it is only a pause.
      return verdict('blocked', 'live', f.humanBlockers.length > 0 ? 'human_blocker' : null)
    }
    return verdict('live_ready_to_make_live', 'live', 'make_live_required')
  }

  // ── AWAITING THE CLIENT'S APPROVAL ───────────────────────────────────────────────────
  if (p.status === 'READY_FOR_APPROVAL') {
    // 🛑 NEVER A TASK. The client is acting in Milla; Vida cannot approve for them, and an
    // unopened review is not an operator failure. (The reminder is post-launch.)
    if (p.paused) return verdict('blocked', 'approval', null)
    return verdict('approval', 'approval', null)
  }

  // ── SOURCING ─────────────────────────────────────────────────────────────────────────
  if (p.status === 'SOURCING' || p.status === 'SOURCING_AUTHORISED') {
    // ⚠️ A RUN IN FLIGHT IS NEVER AN EXCEPTION. `preparing` is checked first precisely because
    // a slow run and a stopped one look identical from the outside, and calling a working
    // programme broken is how an operator learns to ignore the flag.
    if (f.preparing) return verdict('sourcing', 'sourcing', null)
    if (p.paused || f.preparationStopped || f.humanBlockers.length > 0) {
      return verdict('sourcing_exception', 'sourcing', 'preparation_stopped')
    }
    return verdict('sourcing', 'sourcing', null)
  }

  // ── RECOMMENDATION ───────────────────────────────────────────────────────────────────
  // DRAFT · RECOMMENDED · AWAITING_FIRST_PAYMENT. The client is deciding and paying; nothing
  // here is the operator's, and P1 starts the work by itself.
  return verdict('recommendation', 'recommendation', null)
}
