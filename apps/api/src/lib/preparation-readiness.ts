// ═══════════════════════════════════════════════════════════════════════════════════════
// IS THERE ANYTHING TO APPROVE? — the one canonical answer, used by the transition itself.
//
// 🛑 THE DEFECT. Vida offered **Ready for approval** on the House programme while there was no
// batch, no campaign, no sequence, no messaging, no cadence, no sender and no frozen review
// set. `markReadyForApproval` asked exactly one question — *does any lead carry this
// programme id, delivered and surfaced?* — which was the right guard for the defect it was
// written for (a programme going ready with nothing sourced at all) and is nowhere near
// sufficient for what the status actually means:
//
//     READY_FOR_APPROVAL = "a human may now look at what will run, and approve it."
//
// If the campaign, the sequence, the words, the cadence, the sender and the audience do not
// exist, there is nothing to approve — and an approval collected against nothing is WORSE than
// no approval, because everybody downstream treats it as consent to send.
//
// ⚠️ A BACKEND AUTHORITY, NOT A HIDDEN BUTTON. Hiding the control in Vida would leave the API
// willing to make the transition, and UI and backend would disagree about what is allowed —
// which is how a founder finds out by pressing something that should not have been there.
//
// ⚠️ IT REFUSES AND EXPLAINS. "Not ready" with no reason sends an operator hunting; the
// operator's next action depends entirely on WHICH piece is missing, so every refusal names it.
//
// ⚠️ AND IT GRANTS NOTHING. This module only ever says no. It cannot authorise Payment 2, it
// cannot make a programme Live, it cannot enrol anybody and it cannot send. Preparation and
// authority are different things, and this file is on the preparation side of that line.
//
// ── PURE CORE, IO SHELL ─────────────────────────────────────────────────────────────────
// `preparationBlockers` is a pure function over facts, so every branch is provable without a
// database. `programmePreparationReadiness` gathers those facts and calls it. The rule lives
// in one place and the transition cannot disagree with the screen about it.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import { SOURCING_AUTHORISED_STATUSES, type ProgrammeStatus } from './programme'
import { resolveProgrammeChain } from './programme-chain'
import { isSendSchedule } from './send-schedule'

/**
 * Is a cadence actually decided, or is it just an array that exists?
 *
 * ⚠️ NO CADENCE IS INVENTED HERE (founder-locked 7 Sep: *"Do not invent a cadence if none is
 * locked"*). This is the TEST for one, not a default. A sequence of a single message has
 * nothing to time, so it cannot be said to have a cadence; a follow-up scheduled zero days
 * after the message before it is not a timed sequence, it is a burst.
 */
export function cadenceIsConfigured(cadence: readonly number[]): boolean {
  if (cadence.length < 2) return false
  // ⛓️ CORRECTED 8 Sep — IT WAS CHECKING THE WRONG END, and the same misreading that produced
  // it nearly persisted a cadence sending two emails on day one.
  //
  // `steps[i].wait_days` is the wait AFTER step i: `send-due.ts` passes the CURRENT step's
  // value as `waitDaysNext`. So the value never read is the LAST one — nothing follows the
  // final step — and every gap BETWEEN real steps must be a real gap. The old `slice(1)` was
  // written as if the first element were the ignored one, which is the "wait before" reading.
  return cadence.slice(0, -1).every(w => typeof w === 'number' && w > 0)
}

/** Everything the rule needs to know. Gathered by the IO shell, judged by the pure core. */
export interface PreparationFacts {
  programmeId: string
  programmeStatus: string
  paused: boolean
  /** The ICP attached to THIS programme — never one merely owned by the same client. */
  attachedIcpId: string | null
  /** The current controlled batch this preparation belongs to. */
  batchId: string | null
  /** Prospects that can actually appear in the customer's review set. */
  reviewableLeads: number
  /**
   * ── ⚑ 18 Sep (J13-C1 · FD-5) — HOW MANY OF THE PREPARED AUDIENCE WE MAY ACTUALLY EMAIL ──
   *
   * FD-5: *"Verified business email required before send; QUALIFIED ≠ SENDABLE."* Preparation
   * counted the enrolments and never the reachable ones, so "40 prepared" could mean eighteen
   * people we are allowed to write to.
   *
   * ⚠️ COUNTED FROM THE FACT (`isSendable` over `leads.email_status` and the address), never
   * from `apollo_consented` — that flag is set on a guess at insert and forced true at reveal.
   *
   * ⚠️ IT DOES NOT BLOCK. FD-5 separates qualified from sendable rather than making one gate
   * the other, and `PREPARATION_REQUIREMENTS` is unchanged: a programme is not refused
   * readiness because the provider has not finished verifying. The number is REPORTED, and the
   * package states it — which is what the customer needed and did not have.
   *
   * ⚠️ NULL WHEN IT COULD NOT BE COUNTED, never 0. Printing zero for a failed read would tell
   * an operator nobody is reachable, which is a claim rather than an absence.
   */
  sendableEnrolments: number | null
  campaignId: string | null
  /** Positively linked to this programme — not inferred from `client_id`. */
  campaignProgrammeLinked: boolean
  sequenceId: string | null
  sequenceCampaignLinked: boolean
  /** Real, reviewable outbound steps. Zero means there is nothing to read. */
  messageSteps: number
  cadenceConfigured: boolean
  /** A well-formed send schedule — days, window, default timezone. */
  sendScheduleConfigured: boolean
  // ── 🛑 ⚑ 11 Sep (DAY 3) — ASSIGNED AND VERIFIED ARE TWO FACTS, NOT ONE ────────────────
  //
  // ⛓️ THIS WAS ONE BOOLEAN — `senderAssigned = safety.ok` — AND IT WAS THE REPO'S RECURRING
  // DEFECT IN ITS PUREST FORM: two different questions sharing one field. `programmeSenderSafety`
  // has distinguished `no_sender` from `unverified_sender` since 10 Sep precisely because the
  // operator's next action is different — connect a mailbox, versus fix the password on the one
  // that is already there. Collapsing both to `false` threw that distinction away one line after
  // it was computed, and the blocker then told an operator *"No sending mailbox is assigned"*
  // about a client whose mailbox WAS assigned, warmed and live. They would go and assign a second
  // one, which `ambiguous_sender` then refuses — a loop built out of a wrong sentence.
  //
  // 🛑 BOTH STILL BLOCK. Nothing is loosened: an unverified sender refuses readiness and
  // therefore refuses the freeze, exactly as before. What changes is that the refusal is TRUE.
  /** A mailbox is resolved for this client, unambiguous, and not shared with another client. */
  senderAssigned: boolean
  /**
   * That mailbox has PROVED it can log in (`verifyInbox`, #552).
   *
   * ⚠️ NEVER INFERRED FROM ASSIGNMENT. A warmed, branded, correctly-shaped row with a mistyped
   * password is assigned and unverifiable, and the difference is only discovered when a real
   * prospect's first email fails.
   */
  senderVerified: boolean
  /**
   * The sender safety module's own sentence for whichever fact is false.
   *
   * ⚠️ CARRIED, NOT RE-WRITTEN. `programme-sender.ts` already names the other client an address
   * is live on, the equally-ranked boxes, and the failed credential. Re-phrasing it here would be
   * a second, vaguer copy of a diagnosis that already exists.
   */
  senderProblem: string | null
  /** Prepared enrolments that belong to THIS programme. */
  eligibleEnrolments: number
  /** Prepared enrolments that belong to something else. Any is a hard stop. */
  foreignEnrolments: number
  /** Can the approved set be frozen, so approval applies to exactly what will run? */
  snapshotSupported: boolean
}

export interface PreparationBlocker {
  code: string
  detail: string
}

/**
 * The named requirements, in the order an operator would work through them.
 *
 * Exported so the list is a contract rather than a comment: a test asserts it is not empty and
 * every code below appears here, which stops a requirement being quietly dropped from the rule.
 */
export const PREPARATION_REQUIREMENTS = [
  'wrong_status', 'paused', 'no_attached_icp', 'no_batch', 'no_reviewable_leads',
  'no_campaign', 'campaign_not_programme_linked', 'no_sequence', 'sequence_not_campaign_linked',
  'no_message_steps', 'no_cadence', 'no_send_schedule', 'no_sender', 'sender_unverified',
  'no_eligible_enrolments', 'foreign_enrolments', 'no_snapshot',
] as const

/**
 * The blockers PREPARATION ITSELF clears, as opposed to the ones a human must go and fix.
 *
 * ⛓️ 9 Sep — THIS EXISTS BECAUSE THE READINESS BOOLEAN ALONE PRODUCED A DEADLOCK. Vida hides
 * "Ready for approval" until `readiness.ready` is true; readiness needs a campaign, sequence,
 * schedule and enrolments; and those are created by preparation, which the button is what runs.
 * Gated on `ready` alone, the only way to reach the state that reveals the control is to press
 * the control. That is not a stricter gate, it is an unreachable one.
 *
 * 🛑 THE SPLIT IS A FACT ABOUT THE SYSTEM, NOT A CONVENIENCE. Every code below is something
 * `prepareProgrammeOutreach` demonstrably produces — the campaign, the canonical sequence and
 * its schedule, the cadence it validates, the enrolments it writes, and the snapshot that
 * becomes describable once that chain exists. Every code NOT below is something it cannot:
 * `no_attached_icp` and `no_batch` are earlier lifecycle acts, `no_reviewable_leads` is
 * sourcing and qualification, `no_sender` is a mailbox somebody has to connect,
 * `foreign_enrolments` is corruption, and `wrong_status` / `paused` are authority.
 *
 * ⚠️ ADDING A CODE HERE WEAKENS THE SCREEN'S GATE. A requirement listed here is one the UI will
 * offer the button in spite of — so it must be one preparation actually clears, and a test
 * asserts every entry is a real requirement and that the un-clearable ones are absent.
 */
export const PREPARATION_CLEARS: string[] = [
  'no_campaign', 'campaign_not_programme_linked', 'no_eligible_enrolments', 'no_snapshot',
  // ⛓️ 9 Sep, LATER THE SAME DAY — THE FIVE BELOW CAME BACK, AND THE REASON IS A REAL CHANGE
  // IN WHAT PREPARATION DOES, not a relaxation of this rule. They were split out that morning
  // because preparation auto-applied a sequence and a schedule for exactly ONE programme (the
  // configured House launch programme) and for every paying client the words had to be
  // hand-authored — so listing them unconditionally drew a button that could not possibly
  // succeed. Preparation now writes any programme's sequence from that client's own knowledge,
  // approved brief and qualified audience (`programme-sequence-generation.ts`), and sets the
  // conservative default schedule, so these ARE cleared for everybody and the split has no
  // subject left. **If that generation branch is ever removed, these five must move back out.**
  'no_sequence', 'sequence_not_campaign_linked', 'no_message_steps', 'no_cadence', 'no_send_schedule',
  // ── ⛓️ 16 Sep (MVP1 · C1d) — THE TWO SENDER CODES MOVED IN, AND IT IS A REAL CHANGE IN
  //    WHAT PREPARATION DOES, not a relaxation of the rule above ─────────────────────────
  //
  // 🛑 THIS FILE USED TO SAY, IN THE NOTE DIRECTLY ABOVE: *"`no_sender` is a mailbox somebody
  // has to connect."* That was true and it was the stall — and the manual remedy it pointed at
  // could not actually be taken. `POST /operator/inboxes/assign` requires an operator to TYPE
  // a pooled address, it never set SMTP credentials so `verifyInbox` refused whatever it
  // created, and no inventory of pooled addresses existed anywhere to type one from. So the
  // sentence described a step nobody could complete, and every paying client's programme
  // stopped one requirement short of Ready for Approval.
  //
  // `prepareProgrammeOutreach` now claims a mailbox from the pooled inventory and runs the
  // EXISTING `verifyInbox` against it before anything else (step ⓿). These two codes are
  // therefore things preparation demonstrably produces, which is exactly this list's own test
  // for membership.
  //
  // 🛑 NOTHING IS LOOSENED. Both still BLOCK readiness — `block('no_sender')` and
  // `block('sender_unverified')` are untouched, `senderAssigned` and `senderVerified` are
  // still two separate facts, and an assigned-but-unverified mailbox still refuses
  // READY_FOR_APPROVAL. Membership here changes only whether the SCREEN offers Try again; and
  // it should, because pressing it is now what claims the mailbox.
  //
  // ⚠️ AND IF THE CLAIM CAPABILITY IS EVER REMOVED, THESE TWO MUST MOVE BACK OUT — the same
  // standing condition the five sequence codes above carry.
  'no_sender', 'sender_unverified',
]

/**
 * The five requirements that depend on a programme having an automatic sequence source.
 *
 * ⛓️ KEPT AS A NAMED GROUP, NOW UNCONDITIONAL. For half of 9 Sep these were conditional: only
 * the configured House launch programme auto-applied a sequence and schedule, so promising them
 * for a paying client drew a button that could never succeed. Preparation now writes ANY
 * programme's sequence from its own client context, so the condition has no subject and the
 * group lives inside `PREPARATION_CLEARS`.
 *
 * ⚠️ IT IS STILL EXPORTED, AND ON PURPOSE. These five stand or fall together with the
 * generation branch in `programme-preparation.ts`. Naming the group keeps that dependency
 * legible — and a test asserts every one of them is in `PREPARATION_CLEARS`, so removing
 * generation without moving them back out fails loudly rather than promising a dead button.
 */
export const PREPARATION_CLEARS_WITH_AUTO_SEQUENCE: string[] = [
  'no_sequence', 'sequence_not_campaign_linked', 'no_message_steps', 'no_cadence', 'no_send_schedule',
]

/**
 * ⚑ 11 Sep (DAY 3) — THE SENDER VERDICT, TURNED INTO THE TWO FACTS, AS A PURE FUNCTION.
 *
 * ⛓️ THIS WAS FOUR LINES INSIDE THE IO SHELL, AND A DELIBERATE REGRESSION PROVED THEY WERE
 * UNGUARDED. Flipping `senderVerified` to true for an `unverified_sender` verdict — the exact
 * defect the split exists to prevent — passed the entire suite, because the only thing watching
 * that mapping was a source scan pinning ONE of its two lines. A rule that lives inside an
 * async database function is a rule that can only be tested by standing up a database, which in
 * practice means it is not tested. Out here every branch is provable in a millisecond.
 *
 * 🛑 ONLY `unverified_sender` MEANS A MAILBOX IS SETTLED. `no_sender` is none at all;
 * `ambiguous_sender` is a tie nobody has broken; `shared_sender` is an address live on another
 * client. In all three, WHICH mailbox sends is undecided, so verification has no subject yet.
 */
export function senderFactsFrom(
  safety: { ok: true } | { ok: false; reason: string; detail: string },
): { senderAssigned: boolean; senderVerified: boolean; senderProblem: string | null } {
  if (safety.ok) return { senderAssigned: true, senderVerified: true, senderProblem: null }
  return {
    senderAssigned: safety.reason === 'unverified_sender',
    // ⚠️ ALWAYS FALSE ON A REFUSAL. `programmeSenderSafety` returns `ok: true` if and only if
    // the mailbox has a `verified_at`, so there is no refusal that means "verified".
    senderVerified: false,
    senderProblem: safety.detail,
  }
}

/**
 * Is this programme one run of preparation away from being reviewable?
 *
 * ⚠️ IT IS NOT "NEARLY READY". It is the strictly narrower claim that every outstanding blocker
 * is one preparation clears — a single blocker outside that list makes it false, because
 * running preparation would not fix it and the operator would be sent round a loop.
 *
 * ⚠️ AND IT NEVER MEANS READY. A programme with no blockers at all is `ready`, and this returns
 * false for it: the two answers are different questions and a caller must not conflate them.
 *
 * ⛓️ 9 Sep — THE `autoSequence` OPTION IS GONE, AND ITS DUTY IS DISCHARGED RATHER THAN DROPPED.
 * It existed for the hours when only House could auto-apply a sequence, and it required the
 * caller to PROVE that capability so a fresh client was never offered a button that could not
 * clear `no_sequence`. Preparation now writes any programme's sequence, so the capability is
 * universal and a per-caller proof of it would be a proof of a constant — the worse failure
 * mode, because it invites a caller to pass `false` and re-hide a control that does work.
 */
export function onlyPreparationBlocks(blockers: readonly PreparationBlocker[]): boolean {
  if (blockers.length === 0) return false
  return blockers.every(b => PREPARATION_CLEARS.includes(b.code))
}

/**
 * Everything standing between this programme and a client being asked to approve it.
 *
 * ⚠️ IT RETURNS ALL OF THEM, not the first. An operator preparing a launch needs the whole
 * list — reporting one at a time turns a five-minute job into five round trips.
 */
export function preparationBlockers(f: PreparationFacts): PreparationBlocker[] {
  const out: PreparationBlocker[] = []
  const block = (code: string, detail: string) => out.push({ code, detail })

  if (!SOURCING_AUTHORISED_STATUSES.includes(f.programmeStatus as ProgrammeStatus)) {
    block('wrong_status', `This programme is ${f.programmeStatus}, which carries no sourcing authority, so there is no prepared work to approve.`)
  }
  if (f.paused) {
    block('paused', 'This programme is paused. Resume it before asking the client to approve what it will do.')
  }
  if (!f.attachedIcpId) {
    block('no_attached_icp', 'No ICP is attached to this programme, so nothing defines who the prepared work is aimed at. Attach the targeting first.')
  }
  if (!f.batchId) {
    block('no_batch', 'No controlled batch has been opened for this programme, so the prepared work belongs to no authorised unit of delivery.')
  }
  if (f.reviewableLeads <= 0) {
    block('no_reviewable_leads', 'No prospect carrying this programme has been delivered and surfaced, so the client would open an empty review list.')
  }
  if (!f.campaignId) {
    block('no_campaign', 'This programme has no campaign, so there is no container for the outreach the client is being asked to approve.')
  } else if (!f.campaignProgrammeLinked) {
    block('campaign_not_programme_linked', 'A campaign was found for this client but it is not positively linked to THIS programme. A campaign resolved by client alone may be historical work, and approving it would approve the wrong thing.')
  }
  if (!f.sequenceId) {
    block('no_sequence', 'The campaign has no sequence, so there is no defined series of messages to approve.')
  } else if (!f.sequenceCampaignLinked) {
    block('sequence_not_campaign_linked', 'A sequence exists but is not positively linked to this campaign. Belonging to the same client is not the same as belonging to this work.')
  }
  if (f.messageSteps <= 0) {
    block('no_message_steps', 'The sequence has no message steps, so there is no actual wording for the client to read. An empty sequence is not reviewable content.')
  }
  if (!f.cadenceConfigured) {
    block('no_cadence', 'No cadence is configured, so it is not decided when these messages would go out. Approving content without timing approves half the plan.')
  }
  if (!f.sendScheduleConfigured) {
    // ⚑ 8 Sep — TIMING IS PART OF WHAT IS APPROVED, and there was no schedule at all: `getDay`,
    // `getHours` and "send window" appear nowhere in the send path. Without one the OUTREACH
    // guard refuses every send, so a programme could be declared reviewable and then be unable
    // to run — and worse, a schedule added AFTER approval is a change the client never saw.
    block('no_send_schedule', 'No sending schedule is configured (days, window, timezone), so it is not decided WHEN these messages would go out. Outreach refuses without one, and adding it after approval would change work the client already agreed to.')
  }
  // ── THE SENDER, AS TWO QUESTIONS ─────────────────────────────────────────────────────
  //
  // ⚠️ ONLY ONE OF THEM IS REPORTED. If no mailbox is settled there is nothing whose login
  // could have been proved, so `sender_unverified` would be noise on top of `no_sender` — and a
  // list of blockers is a worklist, not a diagnosis dump.
  if (!f.senderAssigned) {
    block('no_sender', f.senderProblem
      ?? 'No sending mailbox is assigned and ready for this client, so nothing could leave even after approval — and the client would be approving a plan that cannot run.')
  } else if (!f.senderVerified) {
    // 🛑 IT BLOCKS THE FREEZE. A programme frozen on a mailbox nobody has logged into is a
    // package the client approves and the send path then refuses — the approval would be real
    // and the work would not run. Assigned is not ready.
    block('sender_unverified', f.senderProblem
      ?? 'The sending mailbox assigned to this client has never proved it can log in, so the prepared work could be approved and still never leave. Press Test connection on it in Vida → the client\'s inbox; it authenticates and sends nothing.')
  }
  if (f.eligibleEnrolments <= 0) {
    block('no_eligible_enrolments', 'No eligible prospect from this programme has been prepared for the sequence, so the approved audience would be empty.')
  }
  if (f.foreignEnrolments > 0) {
    block('foreign_enrolments', `${f.foreignEnrolments} prepared enrolment(s) do not belong to this programme. Another programme's or client's work must never ride along inside this approval.`)
  }
  if (!f.snapshotSupported) {
    block('no_snapshot', 'The prepared work cannot be frozen, so an approval could not be tied to exactly what would run. A material change after approval must require re-approval, not continue silently.')
  }

  return out
}

export interface PreparationReadiness {
  ready: boolean
  blockers: PreparationBlocker[]
  /** Null when the facts could not be read — which is NOT the same as "not ready". */
  facts: PreparationFacts | null
  degraded: string | null
}

/**
 * Gather the facts for one programme and judge them.
 *
 * ⚠️ AN UNREADABLE FACT IS NEVER A PASS. Where a read fails, the caller is told the check could
 * not be completed — the recurring `?? []` defect in this codebase, which turns "we could not
 * tell" into "there is nothing wrong", applied to a gate that guards a client's consent.
 */
export async function programmePreparationReadiness(programmeId: string): Promise<PreparationReadiness> {
  const notReady = (degraded: string): PreparationReadiness =>
    ({ ready: false, blockers: [{ code: 'unreadable', detail: degraded }], facts: null, degraded })

  const { data: prog, error: progErr } = await db.from('programmes')
    .select('id, client_id, status, paused_at, send_schedule').eq('id', programmeId).maybeSingle()
  if (progErr) return notReady(`This programme's own row could not be read (${progErr.message}), so readiness could not be judged. Nothing changed.`)
  if (!prog) return notReady('There is no programme with that id.')

  const p = prog as { id: string; client_id: string; status: string; paused_at: string | null; send_schedule?: unknown }

  // The ICP attached to THIS programme — the same positive link `sourceProgramme` uses.
  const { data: icps, error: icpErr } = await db.from('icps')
    .select('id').eq('programme_id', programmeId)
  if (icpErr) return notReady(`The targeting attached to this programme could not be read (${icpErr.message}).`)
  const attachedIcpId = (icps ?? [])[0]?.id ?? null

  const { data: batches, error: batchErr } = await db.from('programme_batches')
    .select('id, status').eq('programme_id', programmeId)
  if (batchErr) return notReady(`This programme's batches could not be read (${batchErr.message}).`)
  const batchId = (batches ?? [])[0]?.id ?? null

  // Exactly the review query — so "ready" and "there is something to review" cannot disagree.
  const { count: reviewable, error: leadErr } = await db.from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('programme_id', programmeId)
    .not('delivered_at', 'is', null)
    .not('surfaced_for_approval_at', 'is', null)
    // ⚑ 9 Sep (HOUSE-009) — AND M&V's PASSING VERDICT, so this cannot drift from the desk.
    // The comment above promises "ready" and "there is something to review" cannot disagree;
    // once the review desk required a verdict, that promise held only while nothing surfaced
    // an unjudged programme row — which `surfaceEverything` could do until it was fenced.
    // Asserting it here makes the agreement structural instead of incidental.
    .not('qualified_at', 'is', null)
    .is('disqualified_at', null)
    .is('revealed_at', null)
    .neq('status', 'passed')
  if (leadErr) return notReady(`This programme's reviewable prospects could not be counted (${leadErr.message}).`)

  // ⛓️ 7 Sep — THE CHAIN IS WALKED IN ONE PLACE NOW (`programme-chain.ts`).
  //
  // The first cut resolved the campaign here by `icp_id` and the sequence by `client_id`,
  // reporting the sequence link as unprovable because `figsy_sequences` carried no campaign
  // column. It carries one now (20260907_preparation_snapshot), so the whole chain is
  // POSITIVE — programme → ICP → campaign → sequence — and it is resolved by the same module
  // the approved-preparation snapshot uses, so the thing the customer is asked to approve and
  // the thing that gets frozen can never be two different resolutions of "the sequence".
  const chainRes = await resolveProgrammeChain(programmeId)
  if (!chainRes.ok) return notReady(chainRes.degraded)
  const chain = chainRes.chain

  const { count: eligible, error: enrErr } = await db.from('figsy_enrollments')
    .select('id', { count: 'exact', head: true }).eq('programme_id', programmeId)
  if (enrErr) return notReady(`This programme's prepared enrolments could not be read (${enrErr.message}).`)

  // ⛓️ 8 Sep — THE SAFETY CHECK, NOT THE BARE RESOLVER. "A mailbox exists and can send" is not
  // the same as "it is safe to bind this programme to it": an unbroken tie between two boxes
  // makes the frozen sender arbitrary, and an address live on another client makes two
  // programmes send as one human. Readiness asks the same question OUTREACH will ask, so a
  // programme cannot be declared reviewable on a sender the send gate would later refuse.
  //
  // ── ⚑ 11 Sep (DAY 3) — AND THE SAFETY VERDICT IS NOW READ AS TWO FACTS ───────────────
  //
  // `unverified_sender` means a mailbox IS settled and its login is unproved. Every other
  // refusal — none assigned, a tie at the top, the same address live on another client — means
  // WHICH mailbox sends is not settled at all, so verification has no subject yet.
  let sender: ReturnType<typeof senderFactsFrom>
  try {
    const { programmeSenderSafety } = await import('./programme-sender')
    const safety = await programmeSenderSafety(p.client_id)
    if (!safety.ok && safety.reason === 'unreadable') return notReady(safety.detail)
    // ⚠️ THE MAPPING IS THE PURE FUNCTION ABOVE, not four lines written out here. That is what
    // makes "an unverified sender is never verified" a testable claim rather than a hope.
    sender = senderFactsFrom(safety)
  } catch (err) {
    return notReady(`The sending mailbox for this client could not be checked (${err instanceof Error ? err.message : String(err)}).`)
  }

  // ⚠️ THE SNAPSHOT FACT IS "CAN ONE BE TAKEN", NOT "HAS ONE BEEN TAKEN". Taking it before
  // approval and storing it as the approved snapshot would be inventing approval authority to
  // make readiness pass — the snapshot is written in the same conditional UPDATE as
  // `status = 'APPROVED'`, and never a moment earlier. What must be true HERE is only that the
  // work can be described deterministically at the approval boundary.
  let snapshotSupported = false
  try {
    const { buildPreparationSnapshot } = await import('./preparation-snapshot')
    const snap = await buildPreparationSnapshot(programmeId)
    if (!snap.ok) return notReady(snap.degraded)
    snapshotSupported = true
  } catch (err) {
    return notReady(`The prepared work could not be described for freezing (${err instanceof Error ? err.message : String(err)}).`)
  }

  // ── ⚑ 18 Sep (J13-C1 · FD-5) — HOW MANY OF THE PREPARED AUDIENCE ARE REACHABLE ────────
  //
  // ⚠️ IT NEVER BLOCKS AND IT NEVER FAILS READINESS. A count we could not take is `null` —
  // reported as unknown — and a programme is not refused because the provider has not finished
  // verifying. FD-5 separates qualified from sendable; it does not make one the gate for the
  // other. What it requires is that the number be STATED, which is J13-C1's other half.
  let sendableEnrolments: number | null = null
  {
    const { data: enrRows, error: enrRowsErr } = await db.from('figsy_enrollments')
      .select('lead_id').eq('programme_id', programmeId)
    if (enrRowsErr) {
      console.error(`[preparation] sendable count unavailable for programme ${programmeId} — the enrolments could not be listed (${enrRowsErr.message}). Readiness is unaffected.`)
    } else {
      const ids = ((enrRows ?? []) as { lead_id: string | null }[])
        .map(r => r.lead_id).filter((v): v is string => typeof v === 'string')
      if (ids.length === 0) sendableEnrolments = 0
      else {
        const { isSendable } = await import('./sendable')
        let counted = 0
        let unreadable = false
        for (let i = 0; i < ids.length; i += 500) {
          const { data: rows, error: rowsErr } = await db.from('leads')
            .select('id, email, email_status').in('id', ids.slice(i, i + 500))
          if (rowsErr) {
            console.error(`[preparation] sendable count unavailable for programme ${programmeId} — ${rowsErr.message}. Readiness is unaffected.`)
            unreadable = true
            break
          }
          for (const r of (rows ?? []) as { email?: string | null; email_status?: string | null }[]) {
            if (isSendable(r)) counted++
          }
        }
        sendableEnrolments = unreadable ? null : counted
      }
    }
  }

  const facts: PreparationFacts = {
    programmeId,
    programmeStatus: p.status,
    paused: !!p.paused_at,
    attachedIcpId,
    batchId,
    reviewableLeads: reviewable ?? 0,
    sendableEnrolments,
    campaignId: chain.campaignId,
    // The campaign was found THROUGH the programme's own ICP, so finding one at all is the
    // positive link. There is no separate weaker way to have found it.
    campaignProgrammeLinked: chain.campaignId !== null,
    sequenceId: chain.sequenceId,
    // Likewise: the sequence was found by `campaign_id`. A client-scoped historical sequence
    // is invisible to this resolution and can never present itself as the current work.
    sequenceCampaignLinked: chain.sequenceId !== null,
    messageSteps: chain.steps.length,
    cadenceConfigured: cadenceIsConfigured(chain.cadence),
    sendScheduleConfigured: isSendSchedule((p as unknown as { send_schedule?: unknown }).send_schedule),
    ...sender,
    eligibleEnrolments: eligible ?? 0,
    foreignEnrolments: 0,
    snapshotSupported,
  }

  const blockers = preparationBlockers(facts)
  return { ready: blockers.length === 0, blockers, facts, degraded: null }
}
