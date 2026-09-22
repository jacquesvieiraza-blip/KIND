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

// ── ⛓️ 18 Sep (J6-C4 · LR 6) — ONE LIST, AND THIS COPY WAS THE ONE THAT WAS WRONG ────
//
// ⛓️ WAS: a six-item literal here — *"The founder's six, 10 Sep"* — beside a SEVEN-item
// `REASON_CODES` in `lead-feedback.ts`. The missing one was `bad_timing`.
//
// 🛑 SO THE CLIENT'S OWN ANSWER WAS ERASED IN THE READ. The Milla card renders the chip, the
// route stores it, the database CHECK accepts it — and then `readAttempts` asks THIS list
// whether `bad_timing` is a reason, is told no, and records it as `other`:
//
//     const code: ProofReasonCode = isReason(f.reason_code) ? f.reason_code : 'other'
//
// Vida's calibration evidence then showed an operator "Other" where the client had said "Bad
// timing", and `whatChangedSentence` — the one line a person reads before phoning them about
// it — could not name the thing they actually said.
//
// ⚠️ THE SEVEN ARE THE SUPERSET AND THE DATABASE ALREADY STORES THEM, so this is the six
// CORRECTED rather than the seven narrowed: narrowing would make a value already in production
// unreadable, which is the same defect pointing the other way.
//
// ⚠️ THE NAMES STAY so no caller moves. They are now aliases of the shared list, not a copy
// that happens to agree with it today.
export {
  LEAD_REASON_CODES as PROOF_REASON_CODES,
  LEAD_REASON_LABELS as PROOF_REASON_LABELS,
} from '@kind/shared'
export type { LeadReasonCode as ProofReasonCode } from '@kind/shared'
import type { LeadReasonCode as ProofReasonCode } from '@kind/shared'

/** What a client did to one card in a pass. */
export type CardVerdict = 'looks_right' | 'not_a_fit'

/**
 * 🛑 WHAT PRODUCED A SET OF PROOF ROWS. THE DISCRIMINATOR, AND IT IS PERSISTED.
 *
 * ⛓️ 11 Sep — WHAT THIS REPLACES, AND WHY IT WAS DANGEROUS. The calibrated restart was
 * briefly encoded as `leads.proof_pass = 3`, with presentation code special-casing 3 into
 * "Calibrated restart". That was wrong twice over:
 *
 *   ① IT COULD NOT HAVE WORKED AT ALL. `20260903_lead_proof_attribution` declares
 *      `CHECK (proof_pass IS NULL OR proof_pass IN (1, 2))`, so every restart insert would
 *      have been REJECTED by the database. The value was unreachable, not merely unwise.
 *   ② IT PUT AMBIGUOUS TRUTH IN THE ROW and asked rendering code to repair it. Anything
 *      reading `max(proof_pass)`, counting attempts, guarding spend or building analytics
 *      would reasonably have read 3 as a third automatic attempt — the exact product rule
 *      the restart exists to respect. A presentation special case does not make persisted
 *      data honest.
 *
 * ⚠️ AUTOMATIC PROOF PASS IDENTITY IS 1 AND 2, FOR EVER. The restart's rows carry the pass
 * they ran ALONGSIDE (2) and are told apart by this kind — explicit provenance, on the row.
 */
export const PROOF_BATCH_KINDS = ['automatic', 'calibrated_restart'] as const
export type ProofBatchKind = typeof PROOF_BATCH_KINDS[number]

/** One set of Proof rows, as the client left it. Derived from `lead_feedback` × `leads`. */
export interface AttemptSummary {
  /** 1 or 2 — the automatic pass this set ran as, or ran alongside. NEVER 3. */
  pass: number
  /**
   * 🛑 WHAT THIS SET ACTUALLY IS. `automatic` is one of the two attempts;
   * `calibrated_restart` is the one human-authorised set that follows a real resolution.
   * Every label, count and gate reads THIS, never the pass number.
   */
  kind: ProofBatchKind
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
 * ── 🛑 ⚑ 18 Sep (J6-C3 · PV 02) — THE SET-LEVEL VERDICT, WITH ITS REASON ────────────────
 *
 * `mayRequestStrongerSet` answers a BOOLEAN about a SET, and that answer is the one spend gate
 * between a client and their second automatic attempt. It was computed, used and thrown away:
 * nothing recorded WHY a second set was unlocked, or why it was refused, at the moment the
 * client was looking at the screen — so nobody could answer either question afterwards, and
 * Vida could not answer them at all (no operator route reads calibration).
 *
 * ⚠️ THE BOOLEAN IS UNCHANGED AND STAYS THE GATE. This states the same decision with the
 * cause attached, so a recorded verdict and a live one can never disagree: there is one
 * function, and the record is a historical EVENT rather than a second copy of a live answer.
 */
export type StrongerSetVerdict = {
  unlocked: boolean
  /** Machine-readable, stable, and the thing an operator or a log can be keyed on. */
  because:
    | 'per_card_feedback'      // they marked cards with a reason or a note
    | 'confirmed_refinement'   // they confirmed a targeting change, which IS the instruction
    | 'no_usable_feedback'     // nothing said that could shape the next attempt
    | 'refinement_in_flight'   // a proposal is waiting on their word
    | 'not_on_pass_one'        // no set exists yet (pre-22-Sep rows: or both attempts used)
    | 'escalated'              // the loop is closed; a person has it
}

/** Founder-plain, operator-facing. Never shown to a client — Milla has her own copy. */
export const STRONGER_SET_REASON_COPY: Record<StrongerSetVerdict['because'], string> = {
  per_card_feedback:    'They marked cards with a reason or a note, so the next attempt has something to change.',
  confirmed_refinement: 'They confirmed a targeting change, which is the instruction itself.',
  no_usable_feedback:   'Nothing they have said yet could shape a second attempt — no reason and no note.',
  refinement_in_flight: 'A targeting proposal is waiting on their word; sourcing would spend their last automatic attempt on our reading of it.',
  // ⛓️ 22 Sep — THE KEY IS KEPT, THE MEANING NARROWED. It is persisted on historical verdict
  // rows, where it still means "either no set exists yet, or both automatic attempts are
  // used". With refinement unlimited it can now only ever mean the first of those, and the
  // copy says so. Renaming it would have rewritten what past records claim to have decided.
  not_on_pass_one:      'No set exists yet, so there is nothing to improve on. (On rows written before 22 Sep this also covered a client who had used both automatic attempts, back when there were two.)',
  escalated:            'The automatic loop is closed and a person has this client.',
}

export function strongerSetVerdict(s: CalibrationState): StrongerSetVerdict {
  if (s.escalated) return { unlocked: false, because: 'escalated' }
  // ── 🛑 ⚑ 22 Sep — UNLIMITED, SO THE ONLY COUNT THAT MATTERS IS "HAS ONE HAPPENED" ────
  //
  // ⛓️ WAS: ~~`if (s.passesDone !== 1)`~~ — unlocked strictly BETWEEN the two automatic
  // attempts, which is exactly what made it the last one.
  //
  // 🛑 FOUNDER-LOCKED 22 Sep: *"2. unlimited now."* `claim_proof_authority` has no ceiling
  // any more, so a client on their third set would have been refused here by a rule the
  // database would happily have granted — the browser cap and the server cap disagreeing,
  // with the stricter one winning silently.
  //
  // ⚠️ THE OTHER GATES ARE UNTOUCHED AND THEY ARE THE ONES THAT MATTER. A set still cannot
  // be asked for with nothing to change, with a proposal in flight, or after escalation.
  // Those are about HAVING AN INSTRUCTION, not about how many turns have been spent — and
  // removing the count leaves them doing the whole job, which is what they were always for.
  if (s.passesDone < 1) return { unlocked: false, because: 'not_on_pass_one' }
  // ── 🛑 ⚑ 11 Sep (C23) — AN INTERPRETED REFINEMENT IS NOT A MANDATE TO SPEND ──────────
  //
  // Attempt 2 is real paid sourcing against a target the client is supposed to have
  // corrected. Milla may PROPOSE what she thinks they meant; until they confirm it, sourcing
  // would spend their second and last automatic attempt on the model's reading of a sentence.
  // A proposal in flight therefore CLOSES this door rather than leaving it where it was.
  const r = s.refinement ?? null
  if (r && r.proposedAt && !r.confirmedAt) return { unlocked: false, because: 'refinement_in_flight' }
  // A confirmed refinement is itself the instruction — the client does not also have to mark
  // cards. Per-card feedback remains sufficient on its own, exactly as before.
  if (r?.confirmedAt) return { unlocked: true, because: 'confirmed_refinement' }
  return hasMeaningfulFeedback(automaticAttempt(s, 1) ?? null)
    ? { unlocked: true, because: 'per_card_feedback' }
    : { unlocked: false, because: 'no_usable_feedback' }
}

/**
 * May the client ask for an improved set right now?
 *
 * ⚠️ THREE CONDITIONS, ALL NECESSARY: at least one set exists, they have said something
 * usable, and the loop is not already closed. Every one of them is a spend gate.
 *
 * ⛓️ 22 Sep — the first condition was "on pass 1, not 2, not 0" while there were exactly two
 * attempts. Refinement is unlimited now, so what remains of it is "not zero".
 *
 * ⛓️ 18 Sep (J6-C3) — the conditions now live in `strongerSetVerdict`, which answers the same
 * question WITH its reason. This is kept as the name every caller already uses, and delegates
 * rather than restating: two copies of a spend gate is one copy too many.
 */
export function mayRequestStrongerSet(s: CalibrationState): boolean {
  return strongerSetVerdict(s).unlocked
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
 * What a set of Proof rows is CALLED. The one place provenance becomes words.
 *
 * ⚠️ IT DERIVES FROM `kind`, NEVER FROM A PASS NUMBER. There is no "Attempt 3" at any point
 * on either surface, and the restart is not rendered as an automatic attempt — but neither
 * fact is a rendering trick: the row itself says which it is.
 */
export function attemptLabel(a: { pass: number; kind: ProofBatchKind }): string {
  return a.kind === 'calibrated_restart' ? 'Calibrated restart' : `Automatic attempt ${a.pass}`
}

/**
 * The AUTOMATIC attempt with this pass number, if it happened.
 *
 * 🛑 EVERY RULE THAT ASKS ABOUT "attempt 2" MEANS THE AUTOMATIC ONE. A calibrated restart
 * runs alongside pass 2 and is a different history event; a `find(a => a.pass === 2)` would
 * read one as the other, which is precisely the ambiguity the `kind` column removes.
 */
export function automaticAttempt(s: CalibrationState, pass: number): AttemptSummary | undefined {
  return s.attempts.find(a => a.pass === pass && a.kind === 'automatic')
}

/**
 * What Milla says when a client asks for another set and both automatic attempts are gone.
 *
 * 🛑 IT IS A QUESTION, NOT AN ESCALATION (founder-corrected 11 Sep). "Show me more" can come
 * from somebody who agrees with the targeting and simply wants more examples of it. Only
 * their explicit answer that it is still not right may hand them to a person.
 *
 * ⚠️ AND IT PROMISES NOTHING. No third automatic attempt is offered, hinted at or implied.
 */
export const BOTH_ATTEMPTS_USED_ASK =
  'I’ve used both of the automatic searches I get for you, so I can’t go and look again on my own. ' +
  'Before I ask a person to step in — is the targeting still not right, or did you just want to see more like these?'

/** Where the one calibrated restart stands. Never a count, and never `proof_passes_done`. */
export type RestartState = 'none' | 'available' | 'used'

/**
 * 🛑 THE ONE AUDITED POST-HUMAN RESTART — granted, available, or spent.
 *
 * ⚠️ IT IS NOT ATTEMPT 3. `proof_passes_done` stays at 2 for ever and `try_claim_proof_pass`
 * still refuses a third AUTOMATIC claim. This answers a different question: has a human
 * looked at this client, fixed the targeting, and bought them exactly one more set.
 *
 * ⛓️ 12 Sep — STRUCK, AND THE STRUCK TEXT IS KEPT BECAUSE IT WAS LIVE AND IT WAS WRONG:
 * ~~"USED-AFTER-GRANTED IS THE TEST, NOT 'used at all'. A client can legitimately be granted
 * a restart, spend it, be escalated again months later, be resolved again and be granted
 * another — each resolution buys exactly one. Comparing the timestamps is what makes the
 * grant self-limiting without a counter to keep in step."~~
 *
 * 🛑 THAT IS A PER-RESOLUTION ALLOWANCE, AND R119 FORBIDS IT: "Exactly ONE calibrated restart
 * per client, ever… A SECOND CALIBRATED RESTART IS REFUSED, whatever happens later." It was
 * reachable, not theoretical — the exhausted-Proof hand-off re-opens a RESOLVED review, a
 * second resolution moves `proof_review_resolved_at` past the old grant, and the timestamp
 * comparison below then read `available` again. Unbounded, one per cycle.
 *
 * ⚠️ USED IS NOW TERMINAL. A newer grant cannot reopen `available`, so this one change closes
 * the door on BOTH client surfaces at once: `spendDoors` (Milla) and the operator evidence
 * endpoint (Vida) each derive from here and neither can offer a second restart.
 *
 * ⚠️ AND `used` IS THE FAIL-CLOSED ANSWER WHEN THE TWO COLUMNS DISAGREE. A consumption with
 * no grant is impossible under current code; if one is ever seen (a hand-edit, a restore) it
 * reads as spent rather than as free.
 */
export function calibratedRestart(s: CalibrationState): RestartState {
  if (s.restartUsedAt) return 'used'
  if (!s.restartGrantedAt) return 'none'
  return 'available'
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
  /**
   * ⛓️ HISTORICAL ONLY since 11 Sep. Asking for another set is NOT semantically equivalent to
   * "this is still not right" — a client may simply want more examples of targeting they are
   * perfectly happy with. Generating an escalation from it put people in a queue for a phone
   * call they had not asked for, and it is the founder's own correction.
   */
  | 'requested_more_after_pass_two'
  /** ⛓️ HISTORICAL ONLY. Never produced since 11 Sep; see above. */
  | 'second_set_mostly_rejected'

/**
 * The triggers `calibrationVerdict` may still return. Anything else is history.
 *
 * 🛑 EXACTLY ONE. Everything else a client can do after Attempt 2 — mark cards, ask for more,
 * say nothing — leads to a QUESTION, never to an escalation.
 */
export const LIVE_ESCALATION_TRIGGERS = ['client_said_still_not_right'] as const

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

  // ── 🛑 ⛓️ 11 Sep — "GIVE ME ANOTHER SET" IS NOT "THIS IS STILL NOT RIGHT" ────────────
  //
  // This used to close the loop when a client asked for more after both passes, on the
  // reading that asking a third time IS dissatisfaction. The founder corrected it, and the
  // correction is obviously right once stated: "Show me more" can come from somebody who
  // AGREES with the targeting and simply wants more examples of it. Escalating them books a
  // phone call nobody asked for and consumes a human's afternoon.
  //
  // ⚠️ IT STILL SOURCES NOTHING. `spendDoors` is closed at two passes whatever this returns,
  // so the request cannot buy a set. What changes is only that the refusal is a QUESTION —
  // Milla explains that both automatic attempts are used and asks whether the current Proof
  // is still not right (`BOTH_ATTEMPTS_USED_ASK`). Only their explicit answer escalates.
  void (signal === 'requested_more')

  // Everything else requires the second set to exist and to have been judged.
  if (s.passesDone < 2) return { close: false }
  // ⚠️ THE AUTOMATIC SECOND PASS, NOT "whatever carries pass 2". A calibrated restart's rows
  // are a different history event and must never be read as the automatic attempt.
  const second = automaticAttempt(s, 2)

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
  // ⚡ 18 Sep (J6-C4) — `bad_timing` JOINS THE MAP, because it is a real chip the client has
  // always been able to tap; it was simply unreadable on this side (see the note at the top).
  //
  // ⚠️ AND ITS VERB IS HONEST ABOUT WHAT WE CAN DO. "Bad timing" is not a targeting fault —
  // the company may be exactly right and this may be the wrong month — so the sentence must
  // not claim we narrowed anything on the strength of it.
  bad_timing: 'noted that the timing was wrong for them',
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

  const first = automaticAttempt(s, 1) ?? null

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
