// ═══════════════════════════════════════════════════════════════════════════════════════
// 🛑 TWO ATTEMPTS, THEN A PERSON. THE DECISION LIVES HERE AND NOWHERE ELSE.
//
// ── WHAT THE FOUNDER STOPPED ON 10 Sep ──────────────────────────────────────────────────
//
// He stopped the live canary at Proof deliberately, because the loop was commercially
// unsafe: *Not a fit* · *Show me stronger examples* · *Please find more like these* could be
// pressed indefinitely, and each new Proof batch is real paid sourcing. The server already
// refused a THIRD pass (`try_claim_proof_pass` returns 0 at `proof_passes_done >= 2`), and
// that refusal is kept as the hard backstop — but it only ever fired when the client asked a
// third time and was told no. Nobody took responsibility; Milla just declined.
//
// ── THE LOCK (founder, 10 Sep) ──────────────────────────────────────────────────────────
//
//     MAX TWO AUTOMATIC PROOF PASSES PER ACTIVE CALIBRATION CYCLE.
//     Attempt 1 → feedback → Attempt 2. If Attempt 2 still fails: STOP.
//     No automatic Attempt 3. No third provider call. No client control that can spend.
//     "Do not wait for the client to trigger a third paid attempt."
//
// So the loop now closes PROACTIVELY, on evidence we already hold, and Milla says so first.
//
// ── WHY THIS FILE IS PURE ───────────────────────────────────────────────────────────────
//
// Every rule below is a spend decision. A rule that can only be exercised against a live
// database and a paid provider is a rule nobody can test, and this is the exact class of
// logic where being wrong costs money on every run. The DB glue is `proof-calibration-io.ts`.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** The reason codes a client may give per card. The founder's six, 10 Sep. */
export const PROOF_REASON_CODES = [
  'wrong_industry', 'wrong_role', 'too_big', 'too_small', 'wrong_geography', 'other',
] as const
export type ProofReasonCode = typeof PROOF_REASON_CODES[number]

/** Client-facing labels, in the founder's words. */
export const PROOF_REASON_LABELS: Record<ProofReasonCode, string> = {
  wrong_industry: 'Wrong industry',
  wrong_role: 'Wrong role',
  too_big: 'Too big',
  too_small: 'Too small',
  wrong_geography: 'Wrong geography',
  other: 'Other',
}

/** What a client did to one card in a pass. */
export type CardVerdict = 'looks_right' | 'not_a_fit'

/** One pass, as the client left it. Derived from `lead_feedback` × `leads.proof_pass`. */
export interface AttemptSummary {
  /** 1 or 2 — the pass `try_claim_proof_pass` granted. */
  pass: number
  /** Eligible examples SURFACED in this pass (post structural gate, PR1 #1672). */
  surfaced: number
  looksRight: number
  notAFit: number
  /** Counts by reason, only for reasons actually given. */
  reasons: Partial<Record<ProofReasonCode, number>>
  /** The client's own words, if any. Never summarised, never paraphrased. */
  notes: string[]
}

/** Has the client said anything this pass that could shape the next one? */
export function hasMeaningfulFeedback(a: AttemptSummary | null | undefined): boolean {
  if (!a) return false
  // ⚠️ A REASON OR A SENTENCE — NOT A BARE "Not a fit" COUNT. A pass with no reason and no
  // note tells the next attempt nothing, so spending on it would buy a second guess rather
  // than an improvement. "Looks right" alone is also not a change instruction.
  const reasonGiven = Object.values(a.reasons).some(n => (n ?? 0) > 0)
  return reasonGiven || a.notes.some(n => n.trim().length > 0)
}

/** The copy shown against a disabled "Show me stronger examples". Founder-locked. */
export const NEEDS_FEEDBACK_HINT =
  "Mark one or two that aren't right first, so I know what to change."

/**
 * May the client ask for an improved set right now?
 *
 * ⚠️ THREE CONDITIONS, ALL NECESSARY: they are on pass 1 (not 2, not 0), they have said
 * something usable, and the loop is not already closed. Every one of them is a spend gate.
 */
export function mayRequestStrongerSet(s: CalibrationState): boolean {
  if (s.escalated) return false
  if (s.passesDone !== 1) return false
  return hasMeaningfulFeedback(s.attempts.find(a => a.pass === 1) ?? null)
}

/** Everything the decision needs. All of it already exists somewhere canonical. */
export interface CalibrationState {
  /** `clients.proof_passes_done` — the same column the claim RPC increments. */
  passesDone: number
  /**
   * ⚑ 10 Sep (A) — THE CLIENT SAID THE EXAMPLES ARE RIGHT. `clients.proof_completed_at`.
   *
   * 🛑 DIFFERENT FROM EVERY OTHER FACT HERE. `passesDone` is how many attempts were SPENT and
   * `escalated` is the loop having FAILED; this is the client being SATISFIED, which nothing
   * recorded at all before this column existed — the accept control was a GET.
   *
   * Optional because the column is new: rows read before `20260910_proof_completion` carry
   * `undefined`, which reads as "not accepted yet" and leaves the controls exactly as they were.
   */
  completedAt?: string | null
  /** `clients.proof_review_requested_at IS NOT NULL AND proof_review_resolved_at IS NULL`. */
  escalated: boolean
  attempts: AttemptSummary[]
}

/** Why the automatic loop closed. Recorded, and shown to the operator. */
export type EscalationTrigger =
  /** The client pressed "Still not right" on the second set. */
  | 'client_said_still_not_right'
  /** Half or more of the second set rejected, and nothing marked right. */
  | 'second_set_mostly_rejected'
  /** They asked for another set after pass 2 — the pre-existing backstop, kept. */
  | 'requested_more_after_pass_two'

export const ESCALATION_TRIGGER_COPY: Record<EscalationTrigger, string> = {
  client_said_still_not_right: 'The client said the second set still was not right.',
  second_set_mostly_rejected: 'Half or more of the second set was marked "Not a fit", and nothing was marked right.',
  requested_more_after_pass_two: 'The client asked for another set after both attempts were used.',
}

/** What the client did, if anything, that we are judging. */
export type ClientSignal = 'still_not_right' | 'requested_more' | 'gave_feedback' | 'none'

export type CalibrationVerdict =
  /** Nothing to do — the loop is healthy and may continue. */
  | { close: false }
  /** Close the automatic loop. Nothing further may be claimed or sourced automatically. */
  | { close: true; trigger: EscalationTrigger }

/**
 * 🛑 THE ONE DECISION: is the automatic Proof loop finished?
 *
 * ⚠️ IT NEVER LOOKS AT ATTEMPT 1. A first set that misses is what Attempt 2 exists for —
 * closing on it would spend the client's goodwill and one of our two passes for nothing, and
 * a first-guess miss is not a calibration failure. Every trigger below requires pass 2.
 *
 * ⚠️ AND IT NEVER CLOSES A LOOP THAT IS ALREADY CLOSED. `escalated` returns `close: false`
 * so a second signal cannot re-open, re-alert or re-ask for a phone number the client has
 * already given.
 */
export function calibrationVerdict(s: CalibrationState, signal: ClientSignal): CalibrationVerdict {
  if (s.escalated) return { close: false }

  // ⚑ THE PRE-EXISTING BACKSTOP, KEPT AND MADE HONEST. Asking for more after both passes was
  // already refused by the claim RPC; what was missing is that the refusal became somebody's
  // problem. It still fires — it is simply no longer the FIRST thing that fires.
  if (signal === 'requested_more' && s.passesDone >= 2) {
    return { close: true, trigger: 'requested_more_after_pass_two' }
  }

  // Everything else requires the second set to exist and to have been judged.
  if (s.passesDone < 2) return { close: false }
  const second = s.attempts.find(a => a.pass === 2)

  if (signal === 'still_not_right') {
    return { close: true, trigger: 'client_said_still_not_right' }
  }

  if (second && second.surfaced > 0) {
    // 🛑 HALF OR MORE REJECTED AND NOTHING KEPT. The client has not pressed anything
    // conclusive, but they have told us plainly by marking the set. Waiting for them to ask
    // a third time is waiting for them to try to spend our money, which is the thing this
    // rule exists to prevent.
    //
    // ⚠️ `looksRight === 0` IS PART OF THE TEST, not a detail. Ten rejections beside two
    // "looks right" is a set we can still learn from and a client who is engaging; ten
    // rejections and nothing kept is a targeting failure.
    if (second.looksRight === 0 && second.notAFit * 2 >= second.surfaced) {
      return { close: true, trigger: 'second_set_mostly_rejected' }
    }
  }

  return { close: false }
}

// ── WHAT MILLA SAYS ────────────────────────────────────────────────────────────────────
//
// 🛑 FOUNDER-LOCKED WORDING, 10 Sep, AND THE SLA IS DELIBERATELY ABSENT. An earlier draft of
// mine said "within one working day". He struck it: *"No SLA has been approved."* A promise
// nobody has agreed to is worse than no promise, because the client measures us against it.

/** Milla takes responsibility, then asks about the number we already hold. */
export function escalationAsk(storedPhone: string | null | undefined): string {
  const opener =
    "I'm not getting the targeting right enough yet, and I don't want to keep showing you the wrong people. " +
    'I’d like a person to help get this calibrated properly. '
  const phone = (storedPhone ?? '').trim()
  return phone
    ? `${opener}Is ${phone} still the best number to reach you on?`
    : `${opener}What’s the best number to reach you on?`
}

/** After the client confirms or gives a number. No SLA, and it says what is paused. */
export const ESCALATION_CONFIRMED =
  'Thanks — a member of our team will contact you to finish calibrating this. ' +
  'I’ve paused finding people until we’ve spoken.'

/** The calm state Milla Home shows while it waits. Proof is still the stage. */
export const ESCALATED_HEADLINE = 'Calibration help arranged'
export const ESCALATED_DETAIL = 'Targeting is paused until reviewed.'

/**
 * 🛑 EVERY DOOR THAT COULD SPEND, AND WHETHER IT IS OPEN.
 *
 * ⚠️ THE UI IS NOT THE SAFETY BOUNDARY (founder-locked). This function exists so the SERVER
 * and the SCREEN answer from one rule — the screen hides what this closes, and the routes
 * refuse what this closes. A hidden button is a courtesy; a refused route is the control.
 */
export interface SpendDoors {
  /** A new automatic Proof pass (the paid provider call). */
  automaticProofPass: boolean
  /** The batch control "Show me stronger examples". */
  strongerExamplesControl: boolean
  /** Per-card requests that used to page us for more people. */
  perCardFindMore: boolean
  /** Chat asks that could be read as "go and source". */
  chatSourcingRequest: boolean
}

export function spendDoors(s: CalibrationState): SpendDoors {
  // 🛑 ESCALATED CLOSES EVERY DOOR AT ONCE. Not "most" — a single remaining path is the whole
  // exposure, because it is the one a client will find.
  if (s.escalated) {
    return {
      automaticProofPass: false,
      strongerExamplesControl: false,
      perCardFindMore: false,
      chatSourcingRequest: false,
    }
  }
  const under = s.passesDone < 2
  return {
    automaticProofPass: under,
    strongerExamplesControl: mayRequestStrongerSet(s),
    // ⚠️ NEITHER OF THESE MAY EVER SOURCE ON ITS OWN, at any pass count. They are requests to
    // a person (Vida → Asks), which is what they already were — this states it as a rule so a
    // later edit cannot quietly wire one of them to the provider.
    perCardFindMore: false,
    chatSourcingRequest: false,
  }
}

/**
 * The refusal a closed door returns. One sentence, client-safe, no HTTP codes and no
 * vocabulary of ours.
 */
export const SPEND_CLOSED_REFUSAL =
  'We have shown you two sets of leads and I don’t want to keep guessing. A member of our ' +
  'team is going to help get your targeting right, and I’ve paused finding people until then.'

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 10 Sep — THE VIEW MODEL. One shape, decided on the server, rendered by two surfaces.
//
// 🛑 THE SCREEN DECIDES NOTHING. Every control below is a spend gate or a promise to a
// client, and both were already decided above — so Milla receives a verdict rather than the
// inputs to one. A rule the browser can compute is a rule anybody with devtools can satisfy,
// and here that would mean a third paid batch.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** Which batch controls Milla may draw, and what she says. */
export interface ProofUiState {
  /** 1 or 2 — which attempt the client is looking at. 0 before the first set exists. */
  attempt: number
  /** 🛑 The automatic loop is closed and a person has it. Every control is gone. */
  escalated: boolean
  /** Attempt 1 only: the improved-set control, and whether it may be pressed. */
  showStronger: boolean
  strongerEnabled: boolean
  /** The hint under a disabled control. Null when it is enabled. */
  strongerHint: string | null
  /** Attempt 2 only: the honest way to say it is still wrong. */
  showStillNotRight: boolean
  /** Always available while a set is on screen — accepting costs nothing. */
  showTheseAreRight: boolean
  /** Attempt 2: one sentence naming what actually changed. Null on attempt 1. */
  whatChanged: string | null
  /** Escalated: Milla's ask, built from the stored number. */
  ask: string | null
  /** Escalated and the number is confirmed: the calm state. */
  headline: string | null
  detail: string | null
  /**
   * ⚑ 10 Sep (A) — PROOF IS FINISHED. The client accepted, so there is nothing left to react
   * to and the next thing is the programme calculator.
   *
   * ⚠️ IT RETIRES EVERY CONTROL, INCLUDING THE ACCEPT BUTTON. The old accept control stayed
   * pressable for ever because it recorded nothing, so the screen could not tell that the
   * client had already answered.
   */
  completed: boolean
}

/** What each reason code means as a CHANGE — the verb, not the complaint. */
const CHANGE_OF: Record<ProofReasonCode, string> = {
  wrong_industry: 'narrowed the kind of company',
  wrong_role: 'changed who we look for',
  too_big: 'brought the company size down',
  too_small: 'raised the company size',
  wrong_geography: 'tightened where we look',
  other: 'adjusted the targeting',
}

/**
 * One sentence naming what changed between the two sets.
 *
 * ⚠️ IT IS BUILT FROM THE CLIENT'S OWN REASONS, IN THEIR ORDER OF WEIGHT — not from a
 * template. A client who marked eight cards "wrong industry" must read that we narrowed the
 * industry, because the alternative ("I've refined your targeting") is a sentence that would
 * be equally true if we had changed nothing, and they have already been disappointed once.
 *
 * ⚠️ NULL WHEN THERE IS NOTHING TRUE TO SAY. No feedback means no claim: Milla says nothing
 * rather than implying an improvement she cannot name.
 */
export function whatChangedSentence(first: AttemptSummary | null | undefined): string | null {
  if (!first) return null
  const ranked = (Object.entries(first.reasons) as [ProofReasonCode, number][])
    .filter(([, n]) => (n ?? 0) > 0)
    .sort((a, b) => b[1] - a[1])
  if (ranked.length === 0) {
    // They wrote to us but ticked nothing. Acknowledge the words, claim no specific change.
    return first.notes.some(n => n.trim())
      ? 'I’ve taken what you told me into account and looked again.'
      : null
  }
  // At most two changes in one sentence: a list of five reads as a shrug, and the two the
  // client marked most are the two they care about.
  const parts = ranked.slice(0, 2).map(([code]) => CHANGE_OF[code])
  const joined = parts.length === 1 ? parts[0] : `${parts[0]} and ${parts[1]}`
  return `I’ve ${joined} based on what you marked, and looked again.`
}

/**
 * THE ONE DERIVATION of what Proof looks like right now.
 *
 * ⚠️ `escalated` IS CHECKED FIRST AND RETURNS EARLY. Every other branch draws a control that
 * can spend or a promise we have already superseded, and an escalated client has been told
 * "I've paused finding people until we've spoken" — a screen still offering to look again
 * would make that sentence a lie.
 */
export function proofUiState(s: CalibrationState, phone: string | null, phoneConfirmed: boolean): ProofUiState {
  const base = {
    attempt: s.passesDone,
    showStronger: false, strongerEnabled: false, strongerHint: null as string | null,
    showStillNotRight: false, showTheseAreRight: false,
    whatChanged: null as string | null, ask: null as string | null,
    headline: null as string | null, detail: null as string | null,
    completed: false,
  }

  // ── 🛑 10 Sep (A) — ACCEPTED IS CHECKED FIRST, AND IT RETIRES EVERYTHING ─────────────
  //
  // ⛓️ WHAT THIS FIXES. The accept control recorded nothing (`onAccept` was a GET), so the
  // identical controls re-rendered after a client pressed "These are right" and the button
  // stayed pressable for ever. The screen could not tell that the client had already answered.
  //
  // ⚠️ AHEAD OF `escalated` ON PURPOSE, AND THE TWO CANNOT BOTH BE TRUE IN PRACTICE — the
  // completion route refuses while an escalation is open. If a row somehow carried both, the
  // client's own acceptance is the later and kinder truth: they said it was right, and a
  // screen still asking for their phone number would be arguing with them.
  if (s.completedAt) {
    return { ...base, escalated: false, completed: true }
  }

  if (s.escalated) {
    return {
      ...base,
      escalated: true,
      // Before the number is confirmed Milla is still asking; after it, the calm state.
      ask: phoneConfirmed ? null : escalationAsk(phone),
      headline: phoneConfirmed ? ESCALATED_HEADLINE : null,
      detail: phoneConfirmed ? ESCALATED_DETAIL : null,
    }
  }

  const first = s.attempts.find(a => a.pass === 1) ?? null

  if (s.passesDone >= 2) {
    return {
      ...base, escalated: false,
      showTheseAreRight: true,
      // 🛑 THE ONLY OTHER CONTROL ON ATTEMPT 2. No "show me more", no "try again", no third
      // batch — the founder's list of what must NOT be here.
      showStillNotRight: true,
      whatChanged: whatChangedSentence(first),
    }
  }

  if (s.passesDone === 1) {
    const enabled = mayRequestStrongerSet(s)
    return {
      ...base, escalated: false,
      showTheseAreRight: true,
      showStronger: true,
      strongerEnabled: enabled,
      strongerHint: enabled ? null : NEEDS_FEEDBACK_HINT,
    }
  }

  // No set on screen yet — nothing to accept and nothing to improve.
  return { ...base, escalated: false }
}
