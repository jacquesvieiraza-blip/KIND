// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CUSTOMER'S VIEW OF WHERE THEIR PROGRAMME IS — one mapping, shared by API and Milla.
//
// ⚠️ EVERY STRING IN THIS FILE IS THE FOUNDER'S, NOT MINE. The seven stages and the quick
// action for each were specified verbatim (BUILD-004A, 30 Aug). Nothing here is copy I wrote:
// where a sentence was needed and none had been approved, the field is left for the UI to
// render from data instead of inventing a sentence. That is the rule for this build — no new
// visible copy without founder sign-off — and this file is where it would be easiest to break.
//
// ⚠️ THE ENGINE'S STATUS IS NOT THE CUSTOMER'S STAGE, and collapsing them would leak internal
// state into the product. `SOURCING_AUTHORISED` and `SOURCING` are one thing to a client (we
// are preparing); `AWAITING_FIRST_PAYMENT` and `RECOMMENDED` are one thing (here is what we
// suggest). The engine keeps its ten states because money needs them; the customer sees seven
// because that is what the journey actually has.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** The seven stages the founder specified for the Milla workspace. */
export const MILLA_STAGES = [
  'Proof', 'Recommendation', 'Sourcing', 'Approval', 'Live', 'Review', 'Completion',
] as const
// ⚠️ NAMED `MillaStage`, NOT `ProgrammeStage`. That name is TAKEN in this package and means
// something else entirely — `'programme_first' | 'programme_second'`, the Stripe charge stage
// (programme-pricing.ts:178). Two different `ProgrammeStage` types in one package is a
// collision the compiler catches once and a reader mis-reads forever.
export type MillaStage = (typeof MILLA_STAGES)[number]

/**
 * The stage-aware conversation accelerator for each stage.
 *
 * ⚠️ FOUNDER'S WORDS, VERBATIM. These are conversation starters, not SaaS controls — they
 * open a message to Milla rather than performing an action.
 */
export const STAGE_QUICK_ACTION: Record<MillaStage, string> = {
  Proof:          'Show me stronger examples',
  Recommendation: 'Why this approach?',
  Sourcing:       'What are you learning?',
  Approval:       'Why this approach?',
  Live:           "What's working?",
  Review:         'What should we change?',
  Completion:     'What should we do next?',
}

/**
 * Customer-visible failure copy, LOCKED by the founder. Never paraphrase, never re-derive.
 *
 * ⚠️ EACH ONE SAYS WHAT DID **NOT** HAPPEN. That is the whole design: a customer who sees an
 * error needs to know their money and their programme are untouched, and a vague failure
 * message makes them assume the worst.
 */
export const MILLA_FAILURE_COPY = {
  sourcingPaused: 'Sourcing is paused while we recover.',
  paymentFailed:  "Your payment didn't complete. Nothing has started.",
  pipelineFailed: "We couldn't load your pipeline. Nothing has changed.",
} as const

/** The engine statuses, mirrored here so the mapper is total without importing the API. */
export type EngineProgrammeStatus =
  | 'DRAFT' | 'RECOMMENDED' | 'AWAITING_FIRST_PAYMENT' | 'SOURCING_AUTHORISED' | 'SOURCING'
  | 'READY_FOR_APPROVAL' | 'APPROVED' | 'LIVE' | 'COMPLETED' | 'CANCELLED'

export type StageInput = {
  /** null when the client has no programme at all — they are at Proof, or at the calculator. */
  status: EngineProgrammeStatus | null
  /** A review hold is OPEN. Distinct from paused, and it does not stop live delivery. */
  reviewOpen?: boolean
  /**
   * ⚑ 10 Sep (A) — THE CLIENT SAID THEIR PROOF EXAMPLES ARE RIGHT.
   *
   * 🛑 IT ONLY MATTERS WHEN THERE IS NO PROGRAMME, and that is the whole gap it fills. A
   * client between accepting Proof and choosing a target has no programme row, so `status`
   * is null and this mapper returned `'Proof'` — the client sat looking at a finished set
   * while the screen still said "Milla is finding your first examples". The stage after
   * Proof in the founder's order is Recommendation, and the calculator is what lives there.
   *
   * ⚠️ ONCE A PROGRAMME EXISTS THE STATUS DECIDES, always. This never overrides a real
   * programme state: a client whose programme is SOURCING is at Sourcing whatever their
   * Proof history says.
   */
  proofComplete?: boolean
}

/**
 * Which stage is this customer in?
 *
 * ⚠️ REVIEW OUTRANKS LIVE, AND ONLY LIVE. A review hold is raised on a running programme, so
 * it is the one state that overrides `LIVE` — the customer needs to know a decision is waiting.
 * It never overrides `COMPLETED`, because a finished programme has nothing left to review into.
 *
 * ⚠️ PAUSE IS **NOT** A STAGE, and that is deliberate. Pause is orthogonal to where the
 * programme is in its journey — a paused SOURCING programme returns to sourcing, not to
 * somewhere else — so it rides alongside the stage rather than replacing it. Exactly the reason
 * `paused_at` is not a status in the engine.
 */
export function millaStage(input: StageInput): MillaStage {
  const { status, reviewOpen, proofComplete } = input
  // No programme yet: Proof, unless the client has finished it — then they are choosing a
  // target, which is Recommendation. See `proofComplete`.
  if (status === null) return proofComplete === true ? 'Recommendation' : 'Proof'
  switch (status) {
    // ── ⛓️ ⚑ 10 Sep (I3) — DRAFT MOVED FROM Proof TO Recommendation ────────────────────
    //
    // 🛑 IT DISAGREED WITH VIDA, AND VIDA WAS RIGHT. `deriveLifecycle` puts DRAFT at
    // `recommendation` (its final fall-through: "DRAFT · RECOMMENDED · AWAITING_FIRST_PAYMENT —
    // the client is deciding and paying"). Milla said `Proof`, so one client had two stages
    // depending on which screen was open.
    //
    // ⚠️ AND THE MILLA ANSWER WAS THE WRONG ONE ON ITS OWN TERMS. A DRAFT programme is a
    // programme — it exists because the client finished Proof and chose a target in the
    // calculator. Sending them back to "Milla is finding your first examples" is precisely the
    // defect `proofComplete` was added to fix, arriving one step later by another door.
    //
    // ⚠️ THIS DID NOT MATTER BEFORE THE CALCULATOR, and that is why it survived: a DRAFT row
    // was only ever created by an operator typing a meeting target into Vida, often while the
    // client really was still at Proof. The client now creates it themselves, after Proof.
    case 'DRAFT':
    case 'RECOMMENDED':
    case 'AWAITING_FIRST_PAYMENT': return 'Recommendation'
    case 'SOURCING_AUTHORISED':
    case 'SOURCING':               return 'Sourcing'
    case 'READY_FOR_APPROVAL':
    case 'APPROVED':               return 'Approval'
    case 'LIVE':                   return reviewOpen ? 'Review' : 'Live'
    case 'COMPLETED':
    case 'CANCELLED':              return 'Completion'
  }
}

// ── OUTCOMES — OPTION C, FOUNDER-LOCKED 30 AUG ──────────────────────────────────────────
//
// 🛑 THE PRODUCT IS NOT HARD-CODED AROUND MEETINGS, AND THE PRICING IS NOT INVENTED.
//
// Milla captures ANY outcome a customer states. Only ONE of them can be priced automatically
// today, because `quoteProgramme(meetings)` is the only pricing rule that exists and
// `programmes.meeting_target` is the only target column. So:
//
//   · booked meetings           → priced instantly, the existing curve, unchanged
//   · anything else             → captured properly and routed to a human
//
// ⚠️ WHAT THIS DELIBERATELY DOES NOT DO. It does not map a registration target onto a
// meeting-equivalent and quote the meeting curve for it. That would put a number in front of a
// customer that no commercial rule supports — a price we made up, printed as if it were policy.
// The founder ruled it out explicitly, and this constant is where that ruling lives.

export type OutcomeKind = 'meetings' | 'other'

/**
 * Can this outcome be priced without a human?
 *
 * Deliberately narrow: only an outcome the customer states as booked meetings reaches the
 * pricing curve. Everything else is `other`, which is not a failure state — it is a
 * conversation that continues with a person in it.
 */
export function outcomeIsAutoPriceable(kind: OutcomeKind): boolean {
  return kind === 'meetings'
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 16 Sep (MVP1 · D2) — "RUNNING" MEANS SOMETHING ACTUALLY LEFT THE BUILDING.
//
// 🛑 THE DEFECT. `ProgrammeWorkspace.tsx` answered the `Live` stage with *"Running — nothing
// needed from you"*, and `Live` is simply `status === 'LIVE'`, which MAKE LIVE alone produces.
// Make Live arms a programme; it sends nothing. So a client whose programme was armed and
// silent — no Run authority granted, not one email delivered — was told it was running, and
// told there was nothing they needed to do about it.
//
// The screen could not have known better: the customer payload carried neither `run_at` nor a
// send count. Two facts were missing, so a third (the status) was asked a question it cannot
// answer.
//
// ⚠️ THE TWO CONDITIONS ARE BOTH REQUIRED, AND EACH RULES OUT A DIFFERENT LIE:
//
//   · `runAt`     — the operator granted external-delivery authority (`programmes.run_at`).
//                   Without it the programme is ARMED, which is a real and honest state.
//   · `delivered` — real rows in `figsy_sent_emails` for THIS programme's campaign. Not a
//                   status, not a flag, not a queue depth. Under Co-Pilot a programme can
//                   hold a full queue of messages awaiting per-email approval and have
//                   delivered nothing; that is not running, and Co-Pilot is unchanged.
//
// ⚠️ IT FAILS CLOSED ON AN UNREADABLE COUNT. `null` means we could not count the sends, and
// claiming delivery we cannot see is the one direction this function must never take.
//
// ⚠️ AND A DELIVERY WITH NO RUN AUTHORITY IS NOT RUNNING EITHER. That state should not exist;
// reading it as "running" would paper over a real authority defect rather than surface it.
// ═══════════════════════════════════════════════════════════════════════════════════════

export type ProgrammeRunningFacts = {
  /** `programmes.run_at` — the external-delivery authority. Null means armed, not started. */
  runAt: string | null
  /** REAL sent rows for this programme's campaign. `null` means the count was unreadable. */
  delivered: number | null
}

export function programmeIsRunning(f: ProgrammeRunningFacts): boolean {
  if (!f.runAt) return false
  if (f.delivered === null || f.delivered === undefined) return false
  return f.delivered > 0
}

/**
 * The client-facing headline for a LIVE programme, chosen by the rule above.
 *
 * ⚠️ BOTH SENTENCES ARE THE FOUNDER'S EXISTING VOCABULARY. "Running — nothing needed from you"
 * is the locked Live copy and is unchanged for the state it was true of. The armed sentence
 * says what is true instead — the programme is ready and we have not started sending — and
 * promises no timing, because nothing here knows one.
 */
export const PROGRAMME_RUNNING_COPY = 'Running — nothing needed from you'
export const PROGRAMME_ARMED_COPY = 'Ready to start — nothing needed from you'
