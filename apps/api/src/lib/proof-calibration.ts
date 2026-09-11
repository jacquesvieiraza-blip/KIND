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
  // ── 🛑 ⚑ 11 Sep (C23) — AN INTERPRETED REFINEMENT IS NOT A MANDATE TO SPEND ──────────
  //
  // Attempt 2 is real paid sourcing against a target the client is supposed to have
  // corrected. Milla may PROPOSE what she thinks they meant; until they confirm it, sourcing
  // would spend their second and last automatic attempt on the model's reading of a sentence.
  // A proposal in flight therefore CLOSES this door rather than leaving it where it was.
  const r = s.refinement ?? null
  if (r && r.proposedAt && !r.confirmedAt) return false
  // A confirmed refinement is itself the instruction — the client does not also have to mark
  // cards. Per-card feedback remains sufficient on its own, exactly as before.
  if (r?.confirmedAt) return true
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
  /**
   * ⚑ 11 Sep (C39) — THE ONE HUMAN-AUTHORISED RESTART, AS TWO SEPARATE FACTS.
   *
   * 🛑 GRANTED AND USED ARE NOT THE SAME THING, and conflating them is why the restart could
   * not work. `proof_calibrated_restart_at` records that an operator GRANTED one after a real
   * resolution; nothing recorded that the client had SPENT it. Without the second fact the
   * grant either buys nothing (the pass count still refuses) or buys unlimited passes (the
   * grant never expires). Both were live: see `calibratedRestart` below.
   *
   * ⚠️ NEITHER OF THEM IS `proof_passes_done`. The two automatic attempts are spent for ever;
   * this is a separate door, never a wider one.
   */
  restartGrantedAt?: string | null
  restartUsedAt?: string | null
  /**
   * ⚑ 11 Sep (C23) — THE REFINEMENT THE CLIENT GAVE IN CONVERSATION, AND WHETHER THEY MEANT IT.
   *
   * 🛑 THE MODEL INTERPRETING SOMETHING IS NOT A MANDATE TO SPEND. Attempt 2 is real paid
   * sourcing against a target the client is supposed to have corrected, so an interpreted
   * change waits for their word. See `mayRequestStrongerSet`.
   */
  refinement?: RefinementState | null
}

/**
 * What the client said to refine the targeting, and how far it has got.
 *
 * ⚠️ `clientWords` IS THEIRS AND IS NEVER OVERWRITTEN BY THE INTERPRETATION. The founder's
 * rule across this build: preserve the client's wording, and never let model or provider
 * taxonomy silently redefine the target.
 */
export interface RefinementState {
  /** Their own sentence. Empty when they have not said anything yet. */
  clientWords: string
  /** We have proposed an interpreted change back to them. */
  proposedAt: string | null
  /** They confirmed it. THIS is the gate Attempt 2 waits behind — nothing else. */
  confirmedAt: string | null
}

/**
 * 🛑 THE PASS NUMBER THE CALIBRATED RESTART'S LEADS CARRY — AND IT IS NOT "ATTEMPT 3".
 *
 * `leads.proof_pass` is how the attempt history is derived, so the restart's batch needs a
 * value of its own: folding it into 2 would rewrite history to make the restart look like an
 * automatic attempt, and the founder's rule is that Attempt 1, Attempt 2 and the Calibrated
 * Restart must all still be readable afterwards.
 *
 * ⚠️ 3 IS A ROW LABEL, NEVER AN ALLOWANCE. `proof_passes_done` stays at 2, the two automatic
 * attempts remain spent for ever, and `try_claim_proof_pass` still refuses a third automatic
 * claim. Everything that RENDERS this number must render it as "Calibrated restart" — see
 * `attemptLabel`.
 */
export const CALIBRATED_RESTART_PASS = 3

/**
 * What an attempt is CALLED. The one place a pass number becomes words.
 *
 * ⚠️ THERE IS NO "Attempt 3", AT ANY POINT, ON EITHER SURFACE. The founder's lock: do not
 * rewrite history to make the restart look like an automatic attempt, and do not imply
 * another automatic attempt is available.
 */
export function attemptLabel(pass: number): string {
  if (pass === CALIBRATED_RESTART_PASS) return 'Calibrated restart'
  return `Automatic attempt ${pass}`
}

/** Where the one calibrated restart stands. Never a count, and never `proof_passes_done`. */
export type RestartState = 'none' | 'available' | 'used'

/**
 * 🛑 THE ONE AUDITED POST-HUMAN RESTART — granted, available, or spent.
 *
 * ⚠️ IT IS NOT ATTEMPT 3. `proof_passes_done` stays at 2 for ever and `try_claim_proof_pass`
 * still refuses a third AUTOMATIC claim. This answers a different question: has a human
 * looked at this client, fixed the targeting, and bought them exactly one more set.
 *
 * ⚠️ USED-AFTER-GRANTED IS THE TEST, NOT "used at all". A client can legitimately be granted
 * a restart, spend it, be escalated again months later, be resolved again and be granted
 * another — each resolution buys exactly one. Comparing the timestamps is what makes the
 * grant self-limiting without a counter to keep in step.
 */
export function calibratedRestart(s: CalibrationState): RestartState {
  const granted = s.restartGrantedAt ?? null
  if (!granted) return 'none'
  const used = s.restartUsedAt ?? null
  return used && used >= granted ? 'used' : 'available'
}

/**
 * Why the automatic loop closed. Recorded, and shown to the operator.
 *
 * ⛓️ 11 Sep — `second_set_mostly_rejected` IS NO LONGER PRODUCIBLE, and this is the one place
 * that says so. The founder's MVP1 lock names the ONLY automatic escalation trigger as an
 * explicit client action equivalent to "Still not right", and lists what must NEVER escalate:
 * one prospect marked Not a fit, SEVERAL marked Not a fit, an UNKNOWN prospect, silence, a
 * timer, the model's read of the client's mood, or Attempt 2 simply completing.
 * `second_set_mostly_rejected` is precisely "several prospects are Not a fit", inferred.
 *
 * ⚠️ IT IS KEPT AS A READABLE VALUE, NOT DELETED. Rows escalated under the 10-Sep rule carry
 * it in `clients.proof_escalation_trigger`, and an operator opening one of those clients must
 * still read why it happened. Deleting the member would render their reason as a blank.
 * `calibrationVerdict` can no longer return it — that is the enforcement.
 */
export type EscalationTrigger =
  /** The client pressed "Still not right" on the second set. THE ONLY LIVE TRIGGER. */
  | 'client_said_still_not_right'
  /** They asked for another set after pass 2 — an explicit client act, and the old backstop. */
  | 'requested_more_after_pass_two'
  /** ⛓️ HISTORICAL ONLY. Never produced since 11 Sep; see above. */
  | 'second_set_mostly_rejected'

/** The triggers `calibrationVerdict` may still return. Anything else is history. */
export const LIVE_ESCALATION_TRIGGERS = [
  'client_said_still_not_right', 'requested_more_after_pass_two',
] as const

export const ESCALATION_TRIGGER_COPY: Record<EscalationTrigger, string> = {
  client_said_still_not_right: 'The client said the second set still was not right.',
  requested_more_after_pass_two: 'The client asked for another set after both attempts were used.',
  second_set_mostly_rejected: 'Half or more of the second set was marked "Not a fit", and nothing was marked right. (Historical — this no longer escalates on its own.)',
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

  // ── 🛑 ⛓️ 11 Sep — WHAT USED TO BE HERE, AND WHY IT IS GONE ─────────────────────────
  //
  // A branch closed the loop when half or more of the second set was marked "Not a fit" with
  // nothing kept. It was written to stop the client having to ask for a third paid batch
  // before anybody took responsibility, and it reads as a kindness.
  //
  // 🛑 THE FOUNDER'S MVP1 LOCK FORBIDS IT BY NAME. Escalation to a human may be triggered
  // ONLY by an explicit client action equivalent to "Still not right". Not by one prospect
  // marked Not a fit, not by SEVERAL, not by an UNKNOWN prospect, not by silence, not by a
  // timer, not by the model's read of the client's mood, and not by Attempt 2 completing.
  // That branch was the "several prospects are Not a fit" case, inferred on the client's
  // behalf — it decided a person was unhappy from a count and put them in a queue for a
  // phone call they never asked for.
  //
  // ⚠️ NOTHING REPLACES IT, AND SILENCE IS THE CORRECT OUTCOME. A client who marks the second
  // set badly and then says nothing is PAUSED: no third set, no spend, no operator work, no
  // escalation. `second` is still read above for `whatChangedSentence`; nothing decides on it.
  void second

  return { close: false }
}

// ── WHAT MILLA SAYS ────────────────────────────────────────────────────────────────────
//
// 🛑 FOUNDER-LOCKED WORDING, 10 Sep, AND THE SLA IS DELIBERATELY ABSENT. An earlier draft of
// mine said "within one working day". He struck it: *"No SLA has been approved."* A promise
// nobody has agreed to is worse than no promise, because the client measures us against it.

/**
 * Milla takes responsibility, then asks for exactly what is still missing.
 *
 * ⛓️ 11 Sep — IT ASKED FOR THE NUMBER ONLY, AND THE HUMAN PATH NEEDS A NAME TOO. The founder's
 * lock: before human calibration, ensure the required contact details exist — NAME and PHONE.
 * An operator with a number and no name opens the call with "hello, is that… the company?"
 *
 * ⚠️ WHAT WE ALREADY HOLD IS NOT ASKED FOR AGAIN. A client who gave their name at signup is
 * confirmed, not re-interviewed — "If already known: do not ask redundantly."
 *
 * ⚠️ AND NOTHING IS INVENTED. A missing number is ASKED for; it is never inferred from a
 * website, a domain, a provider record or anything else on the account.
 */
export function escalationAsk(
  storedPhone: string | null | undefined,
  storedName?: string | null,
): string {
  const opener =
    "I'm not getting the targeting right enough yet, and I don't want to keep showing you the wrong people. " +
    'I’d like a person to help get this calibrated properly. '
  const phone = (storedPhone ?? '').trim()
  const name = (storedName ?? '').trim()

  if (phone && name) return `${opener}Is ${phone} still the best number to reach you on, ${name}?`
  if (phone) return `${opener}Is ${phone} still the best number to reach you on — and who should they ask for?`
  if (name) return `${opener}What’s the best number to reach you on, ${name}?`
  return `${opener}What’s the best number to reach you on, and who should they ask for?`
}

/**
 * 🛑 MAY THE HUMAN CALIBRATION CALL ACTUALLY HAPPEN? Name and phone, both.
 *
 * ⚠️ IT IS A READING, NOT A GATE ON THE ESCALATION ITSELF. A client escalates the moment they
 * say "Still not right"; whether we can yet phone them is a separate question, and holding
 * the escalation back until they answer would lose the very signal we must not miss.
 */
export function calibrationContactReady(
  phone: string | null | undefined, name: string | null | undefined,
): { ready: boolean; missing: ('name' | 'phone')[] } {
  const missing: ('name' | 'phone')[] = []
  if (!(name ?? '').trim()) missing.push('name')
  if ((phone ?? '').trim().length < 6) missing.push('phone')
  return { ready: missing.length === 0, missing }
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
  // ⚑ 11 Sep (C39) — AND THE ONE GRANTED RESTART OPENS THIS DOOR, NOTHING ELSE DOES.
  //
  // 🛑 THE DEFECT THIS FIXES. `POST /operator/proof-review/:id/restart` recorded a grant and
  // its own comment said "the ordinary Proof path becomes available once more for exactly one
  // pass". It was not: this function answered `passesDone < 2`, which is false at 2 for ever,
  // and `try_claim_proof_pass` refuses at 2 for ever. The operator pressed a real button, an
  // audit row was written, and the client got nothing. That is C39, and it was live.
  //
  // ⚠️ IT IS NOT A WIDER AUTOMATIC ALLOWANCE. `under` is unchanged; this is a second, narrow
  // condition that requires a human resolution behind it and closes again the moment the
  // restart is spent.
  const under = s.passesDone < 2
  const restart = calibratedRestart(s)
  return {
    automaticProofPass: under || restart === 'available',
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
  /**
   * ⚑ 11 Sep (C39) — WHERE THE ONE HUMAN-AUTHORISED RESTART STANDS.
   *
   * ⚠️ IT IS NOT AN ATTEMPT COUNT AND MUST NEVER BE RENDERED AS "Attempt 3". `attempt` above
   * stays at 2 for ever once both automatic passes are spent; this says whether a person has
   * bought the client exactly one more set, and whether it has been spent.
   */
  restart: RestartState
  /**
   * The control that actually spends the granted restart.
   *
   * ⚠️ THE GRANT DOES NOT RUN. An operator pressing "Restart Proof (calibrated)" says "the
   * targeting is fixed now" — putting a paid provider call behind that press would spend on
   * the operator's timing rather than the client's. The client asks for the set.
   */
  showCalibratedSet: boolean
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
export function proofUiState(
  s: CalibrationState, phone: string | null, phoneConfirmed: boolean, contactName: string | null = null,
): ProofUiState {
  const base = {
    attempt: s.passesDone,
    showStronger: false, strongerEnabled: false, strongerHint: null as string | null,
    showStillNotRight: false, showTheseAreRight: false,
    whatChanged: null as string | null, ask: null as string | null,
    headline: null as string | null, detail: null as string | null,
    completed: false,
    restart: calibratedRestart(s),
    showCalibratedSet: false,
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
      ask: phoneConfirmed ? null : escalationAsk(phone, contactName),
      headline: phoneConfirmed ? ESCALATED_HEADLINE : null,
      detail: phoneConfirmed ? ESCALATED_DETAIL : null,
    }
  }

  const first = s.attempts.find(a => a.pass === 1) ?? null

  if (s.passesDone >= 2) {
    // ── ⚑ 11 Sep (C39) — A HUMAN HAS BOUGHT THEM ONE MORE SET ──────────────────────────
    //
    // ⚠️ THIS IS THE ONLY WAY A THIRD BATCH CAN EXIST, and it required a person to call the
    // client, correct the targeting and write down what was agreed. It is offered INSTEAD of
    // "Still not right", because they have already said that and somebody acted on it.
    if (base.restart === 'available') {
      return {
        ...base, escalated: false,
        showTheseAreRight: true,
        showCalibratedSet: true,
        whatChanged: whatChangedSentence(first),
      }
    }
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
