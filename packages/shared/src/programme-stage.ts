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
  /** null when the client has no programme at all — they are at Proof. */
  status: EngineProgrammeStatus | null
  /** A review hold is OPEN. Distinct from paused, and it does not stop live delivery. */
  reviewOpen?: boolean
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
  const { status, reviewOpen } = input
  if (status === null) return 'Proof'
  switch (status) {
    case 'DRAFT':                  return 'Proof'
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
