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
   * ⚑ 10 Sep (C07) — THE ONE PROOF-STAGE TASK, and it is a REASON, not a stage.
   *
   * Both automatic Proof attempts were used and the targeting is still wrong, so the loop was
   * handed to a person: Milla has told the client a human will call, and no further automatic
   * sourcing can run. That IS an operator task — it names a control that exists (contact and
   * recalibrate) and it clears when somebody does it, which is the whole test for Needs you.
   *
   * ⚠️ IT IS THE ONLY EXCEPTION TO "SIGNUP AND PROOF ARE NEVER TASKS", and it earns it by
   * being the one Proof-stage condition where Vida has something to do and the client is
   * waiting on us rather than the other way round.
   */
  | 'proof_calibration_failed'

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
    /** ARMED: status LIVE with `went_live_at`. Make Live produced this, and it sends nothing. */
    live: boolean
    /**
     * ⚑ 10 Sep (H) — STARTED: an operator pressed Run and `programmes.run_at` holds it.
     *
     * 🛑 DIFFERENT FROM `live`, AND THE SCREEN SAID OTHERWISE. Vida read a LIVE programme with
     * zero sends as "ready to run" and offered Run as the task — correct — but a LIVE programme
     * WITH sends as "Review", so the two states between them never asked whether Run had
     * actually happened. Now `live && !run` is armed-not-started, whatever the send count says.
     */
    run: boolean
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
  /**
   * ⚑ 10 Sep — the automatic Proof loop was handed to a person and nobody has resolved it.
   * `clients.proof_review_requested_at` open with `proof_review_resolved_at` null.
   */
  proofCalibrationFailed?: boolean | null
  /**
   * ⚑ 10 Sep (A) — the client said their examples are RIGHT. `clients.proof_completed_at`.
   *
   * 🛑 THE FACT THAT DID NOT EXIST. Proof completing is the client being satisfied, which is
   * a different question from how many attempts were spent (`proofStarted`, `passesDone`) or
   * whether the loop failed (`proofCalibrationFailed`). Without it a satisfied client stayed
   * at `proof` for ever and Vida reported "No action needed" about a finished set.
   *
   * ⚠️ `undefined`/`null` MEAN "NOT ACCEPTED YET", which keeps the client at Proof — the safe
   * direction, and the answer for every row read before the migration.
   */
  proofCompleted?: boolean | null
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
  if (!p) {
    // 🛑 ⚑ 10 Sep (C07) — THE ONE PROOF-STAGE TASK. Checked BEFORE the healthy split because
    // an escalated client has necessarily started Proof, so testing `proofStarted` first
    // would return the calm verdict and lose the task entirely.
    if (f.proofCalibrationFailed === true) {
      return verdict('proof', 'proof', 'proof_calibration_failed')
    }
    // ── 🛑 10 Sep (A) — PROOF IS FINISHED, AND THE CLIENT IS AT THE CALCULATOR ──────────
    //
    // ⛓️ WHAT THIS ADDS. A client who accepted their set used to stay at `proof` for ever,
    // because nothing recorded the acceptance — Vida read "Proof · No action needed" while
    // the client sat looking at a finished set with nowhere to go. `proof_completed_at` is
    // that fact, and the stage after Proof in the founder's own order is Recommendation,
    // where the calculator lives.
    //
    // ⚠️ NOT A TASK. The client is choosing a target; Vida has nothing to press and must not
    // appear in Needs you for a client who is deciding. The commercial state is honest too —
    // no programme exists yet, so nothing here claims one is waiting on money.
    // ⚠️ CHECKED AFTER THE ESCALATION so a failed loop keeps its task even if a completion
    // somehow also existed, and BEFORE `proofStarted` because a completed Proof is
    // necessarily a started one.
    if (f.proofCompleted === true) return verdict('recommendation', 'recommendation', null)
    return f.proofStarted === true ? verdict('proof', 'proof', null) : verdict('signup', 'signup', null)
  }

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
    // ── 🛑 10 Sep (H) — ARMED IS ASKED BEFORE SENT ────────────────────────────────────────
    //
    // ⛓️ THIS BRANCH USED TO OPEN ON `f.sends > 0`, which made the send count the thing that
    // separated "waiting to start" from "running". That was only ever true because LIVE
    // implied sending: nothing recorded whether Run had happened, so a programme with one
    // stray historical send read as Review and one with none read as ready-to-run.
    //
    // Run is now a stored fact, so it is asked FIRST and the send count no longer stands in
    // for it. An armed, never-Run programme is `live_ready_to_run` whatever has been sent —
    // which is the honest answer, because until somebody presses Run no send path will
    // consider it (`authorityFor` refuses `programme_not_run`).
    if (!p.run) {
      if (!f.senderSendable) return verdict('review_sender', 'live', 'sender_not_sendable')
      if (p.paused) return verdict('blocked', 'live', 'human_blocker')
      // 🛑 THE KILL-SWITCH IS NOT A TO-DO. With it ON, Run cannot start — and an operator
      // cannot fix that from this screen, so the client must NOT appear in Needs you. The
      // state stays truthful and the panel says plainly why Run is unavailable.
      const runnable = f.killSwitchOff && f.operatorRunEnabled
      return verdict('live_ready_to_run', 'live', runnable ? 'run_required' : null)
    }
    if (f.sends > 0) {
      // Review. The sender is asked FIRST: a paused sender is why nothing is moving, and a
      // reply queued behind it is a smaller truth wearing the bigger one's urgency.
      if (!f.senderSendable) return verdict('review_sender', 'review', 'sender_not_sendable')
      if (p.paused) return verdict('blocked', 'review', 'human_blocker')
      if (f.repliesAwaitingDecision > 0) return verdict('review_reply', 'review', 'reply_needs_decision')
      return verdict('review', 'review', null)
    }
    // ── RUN, AND NOTHING HAS LANDED YET ─────────────────────────────────────────────────
    //
    // The programme has been started and is working through its schedule; the first send may
    // be minutes or a whole send-window away. Vida WATCHES — there is no task, because there
    // is nothing for an operator to press. A sender that has stopped, or a pause, is still a
    // real interruption and is reported as one.
    if (!f.senderSendable) return verdict('review_sender', 'live', 'sender_not_sendable')
    if (p.paused) return verdict('blocked', 'live', 'human_blocker')
    return verdict('review', 'live', null)
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
