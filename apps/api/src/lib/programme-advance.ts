// ═══════════════════════════════════════════════════════════════════════════════════════
// CONTINUE A SETTLED PROGRAMME TO THE REVIEW BOUNDARY — the missing caller, not a new rule.
//
// ── THE DEADLOCK ────────────────────────────────────────────────────────────────────────
//
// Two correct functions could not reach each other.
//
//   `prepareProgrammeOutreach` has accepted the PRE-APPROVAL stage since 7 Sep —
//   `PRE_APPROVAL_PREPARABLE = ['SOURCING_AUTHORISED','SOURCING']`, campaign created with
//   `activate: false`. It builds the campaign, applies the canonical sequence and schedule,
//   validates the cadence and enrols the current batch. Its only two callers are
//   `goLiveProgramme` and `recordSecondPayment` — **both strictly after approval.**
//
//   `markReadyForApproval` demands, through `programmePreparationReadiness`, exactly the
//   enrolments that preparation creates. `POST /programmes/:id/ready-for-approval` called it
//   DIRECTLY, with nothing in between.
//
// So a programme that had sourced, qualified and settled sat at `SOURCING` and could not
// advance: press the button, get a list of blockers, and no path existed to clear them. The
// House launch programme is in exactly that state — 246 candidates, 246 qualified, settled,
// surfaced, and stuck.
//
// 🛑 THE FIX IS THE CALLER. Neither guard is weakened, bypassed or reordered by this file.
// `markReadyForApproval` still re-proves all sixteen requirements itself and still freezes the
// review snapshot in the same write as the status. What changes is that something now does the
// preparation work BEFORE the question is asked, which is what the 7 Sep lock intended.
//
// ── WHAT THIS FILE MAY NOT DO, AND WHY EACH ONE IS STRUCTURAL ───────────────────────────
//
//   • IT NEVER SOURCES. No call to `sourceProgramme`, no ICP run, no provider. A programme
//     that has settled has bought what it bought; continuing it must not buy more.
//   • IT NEVER QUALIFIES OR SETTLES. `qualifyAndSettleBatch` may spend Apollo reveal credits
//     and consumes entitlement. Resuming a programme past that stage must not replay it.
//   • IT NEVER REQUIRES P2, and never grants it. Preparation is what Payment 1 buys
//     (`programme-authority.ts`, 29 Aug). Demanding P2 here would rebuild the deadlock one
//     gate later.
//   • IT NEVER ACTIVATES A CAMPAIGN, never writes `went_live_at`, never sends. Activation is
//     `ensureCampaignForIcp({ activate: true })`, reached only through `assertGoingLive`,
//     which still demands an approval and P2. This path passes `activate: false` by going
//     through the pre-approval stage — non-sending BY CONSTRUCTION, not by promise.
//
// ⚠️ IDEMPOTENT AND RESTART-SAFE, because it will be run again. Preparation skips leads that
// already hold an enrolment and returns an existing campaign untouched; the canonical sequence
// is applied only when none resolves; and a programme that already reached the review boundary
// is reported as such and NOTHING is written. A second press is a no-op, not a second batch.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import {
  TERMINAL_STATUSES, p1Authorised, markReadyForApproval, type ProgrammeRow,
} from './programme'
import { PRE_APPROVAL_PREPARABLE } from './programme-preparation'

/** Statuses at or beyond the review boundary — already advanced, nothing to do. */
export const AT_OR_PAST_REVIEW: string[] = ['READY_FOR_APPROVAL', 'APPROVED', 'LIVE']

export type AdvanceStepState = 'done' | 'already' | 'blocked' | 'not_reached'

export interface AdvanceStep {
  /** Stable machine name, so a screen can key on it without parsing prose. */
  step: 'authority' | 'preparation' | 'readiness' | 'review_boundary'
  state: AdvanceStepState
  /** Founder-plain sentence. Never a stack trace, never internal jargon. */
  detail: string
}

export interface AdvanceReport {
  programme_id: string
  client_id: string | null
  status_before: string
  /** Read back from the row after the work — never assumed from what was attempted. */
  status_after: string
  steps: AdvanceStep[]
  /** Enrolments created on THIS run. Zero on a re-run is the idempotent answer, not a failure. */
  enrolled: number
  /** Enrolments that already existed for THIS programme and were left alone. */
  already_enrolled: number
  /**
   * ⚑ 9 Sep — THE FOUR COUNTS AN OPERATOR ACTUALLY NEEDS, so the desk never renders a list of
   * lead ids. `attempted` is the eligible set this run walked; `failed` is how many of them
   * ended with no programme enrolment; `refusals` is the cause breakdown. The lead ids
   * themselves stay in the audit detail, which is where technical evidence belongs.
   */
  attempted: number
  failed: number
  refusals: Record<string, number>
  /** The failed lead ids — audit/log detail, never rendered on the desk. */
  failed_lead_ids: string[]
  /** Campaign ids now available to this programme, one per attached ICP. */
  campaigns: string[]
  /** Eligible prospects still awaiting an enrolment. Non-zero means NOT complete. */
  remaining: number
  /** Named readiness blockers still standing, in the order an operator would work them. */
  blockers: { code: string; detail: string }[]
  /** True only when the programme is now at the review boundary. */
  reviewable: boolean
  headline: string
}

export type AdvanceResult =
  | { ok: true; report: AdvanceReport }
  | { ok: false; reason: string; report?: AdvanceReport }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** A programme row read back from the database, so `status_after` is fact rather than intent. */
async function reread(programmeId: string): Promise<string> {
  const { data } = await db.from('programmes').select('status').eq('id', programmeId).maybeSingle()
  const row = data as { status?: string } | null
  return typeof row?.status === 'string' ? row.status : 'unknown'
}

/**
 * Take one settled programme through the complete pre-approval preparation chain and, if and
 * only if every requirement is genuinely met, to `READY_FOR_APPROVAL`.
 *
 * ⚠️ IT REPORTS RATHER THAN THROWS, and every refusal names the step that stopped it. An
 * operator's next action depends entirely on WHICH piece is missing — "not ready" with no
 * reason sends them hunting through six tables.
 */
export async function advanceProgrammeToReview(programmeId: unknown): Promise<AdvanceResult> {
  const id = typeof programmeId === 'string' ? programmeId.trim() : ''
  if (!UUID.test(id)) {
    return {
      ok: false,
      reason: 'A programme id is required, and it must be the exact uuid of the programme. Nothing was read, prepared or changed — this action never resolves a programme from a client, a name or an ordering.',
    }
  }

  const steps: AdvanceStep[] = []
  const step = (s: AdvanceStep['step'], state: AdvanceStepState, detail: string) => {
    steps.push({ step: s, state, detail })
  }

  // ── ① AUTHORITY — READ FROM THE ROW, NEVER FROM THE CALLER ──────────────────────────
  const { data: prog, error: progErr } = await db.from('programmes')
    .select('*').eq('id', id).maybeSingle()
  if (progErr) {
    return { ok: false, reason: `This programme's row could not be read (${progErr.message}). Nothing was changed.` }
  }
  if (!prog) return { ok: false, reason: 'There is no programme with that id. Nothing was changed.' }
  const p = prog as unknown as ProgrammeRow
  const statusBefore = String(p.status)

  const base = (over: Partial<AdvanceReport>): AdvanceReport => ({
    programme_id: id,
    client_id: p.client_id ?? null,
    status_before: statusBefore,
    status_after: statusBefore,
    steps,
    enrolled: 0,
    already_enrolled: 0,
    attempted: 0,
    failed: 0,
    refusals: {},
    failed_lead_ids: [],
    campaigns: [],
    remaining: 0,
    blockers: [],
    reviewable: false,
    headline: '',
    ...over,
  })

  // 🛑 ALREADY THERE IS A SUCCESS, AND IT WRITES NOTHING. This is the restart-safe case, and
  // it is checked FIRST — before preparation — for a reason that is not cosmetic: once a
  // programme is reviewable its material preparation is FROZEN (the 8 Sep lock that removed
  // `READY_FOR_APPROVAL` from `PRE_APPROVAL_PREPARABLE`). Preparation ADDS enrolments, so
  // running it here would change the very set the client is reading, and the review freeze
  // taken at the transition would no longer describe what is on screen.
  if (AT_OR_PAST_REVIEW.includes(statusBefore)) {
    step('authority', 'already', `This programme is already ${statusBefore}.`)
    step('preparation', 'already', 'Its prepared work is frozen for review and was deliberately not touched — adding enrolments now would change the set the client is reading.')
    step('readiness', 'already', 'Readiness was proved when it crossed the review boundary.')
    step('review_boundary', 'already', 'It is at or past the review boundary.')
    return {
      ok: true,
      report: base({
        reviewable: true,
        headline: `This programme is already ${statusBefore} — nothing was prepared, enrolled or changed.`,
      }),
    }
  }

  if (TERMINAL_STATUSES.includes(p.status)) {
    step('authority', 'blocked', `This programme is ${statusBefore}, so there is nothing to continue.`)
    return { ok: false, reason: `This programme is ${statusBefore}, so there is nothing to continue. Nothing was changed.`, report: base({}) }
  }
  if (p.paused_at) {
    step('authority', 'blocked', 'This programme is paused.')
    return { ok: false, reason: 'This programme is paused. Resume it before continuing it towards review. Nothing was changed.', report: base({}) }
  }
  if (!PRE_APPROVAL_PREPARABLE.includes(statusBefore)) {
    step('authority', 'blocked', `This programme is ${statusBefore}, which carries no pre-approval preparation authority.`)
    return {
      ok: false,
      reason: `This programme is ${statusBefore}, which carries no pre-approval preparation authority. Nothing was changed.`,
      report: base({}),
    }
  }
  // 🛑 P1 AND NOTHING ELSE. Payment 1 (or House's internal equivalent) is what authorises
  // preparation. P2 is deliberately NOT consulted: demanding it here would rebuild the very
  // deadlock this file exists to break, one gate further along.
  if (!p1Authorised(p)) {
    step('authority', 'blocked', 'This programme has no first-payment authority, so it has bought nothing to prepare.')
    return {
      ok: false,
      reason: 'This programme has no first-payment authority, so it has bought nothing to prepare. Nothing was changed.',
      report: base({}),
    }
  }
  step('authority', 'done', `This programme is ${statusBefore} with first-payment authority, so preparation is authorised.`)

  // ── ② PREPARATION — THE CANONICAL FUNCTION, CALLED ONCE ─────────────────────────────
  //
  // ⚠️ NO PREPARATION LOGIC IS REIMPLEMENTED HERE, and that is the point of the file. Campaign
  // per attached ICP, the canonical sequence and its schedule, the cadence check, the current
  // batch scoping and the enrolments all live in `prepareProgrammeOutreach`. A second
  // implementation would drift, and the one that drifted would be the one nobody walked.
  const { prepareProgrammeOutreach } = await import('./programme-preparation')
  const prep = await prepareProgrammeOutreach(id)

  const prepared = base({
    enrolled: prep.enrolled.length,
    already_enrolled: prep.alreadyEnrolled,
    attempted: prep.total,
    failed: prep.failed.length,
    refusals: prep.refusals,
    failed_lead_ids: prep.failed,
    campaigns: prep.campaigns,
    remaining: prep.remaining,
  })

  if (!prep.complete) {
    step('preparation', 'blocked', prep.problems.join(' ') || 'Preparation did not complete.')
    step('readiness', 'not_reached', 'Readiness was not judged, because the work it judges is not finished.')
    step('review_boundary', 'not_reached', 'The programme was not moved.')
    prepared.status_after = await reread(id)
    prepared.headline = `This programme could not be prepared for review: ${prep.problems.join(' ')}`
    return { ok: false, reason: prepared.headline, report: prepared }
  }
  step(
    'preparation', prep.enrolled.length > 0 ? 'done' : 'already',
    `${prep.enrolled.length} prospect(s) prepared on this run, ${prep.alreadyEnrolled} already prepared, across ${prep.campaigns.length} campaign(s). Nothing was sent — the campaign is a draft until Make live.`,
  )

  // ── ③ READINESS — REPORTED, THEN RE-PROVED BY THE TRANSITION ITSELF ─────────────────
  //
  // ⚠️ THIS IS A REPORT, NOT THE GATE. `markReadyForApproval` consults the same rule and
  // decides; reading it here exists so a refusal names the blockers instead of returning a
  // bare "not ready". Two reads of one canonical rule — never a second rule.
  const { programmePreparationReadiness } = await import('./preparation-readiness')
  const readiness = await programmePreparationReadiness(id)
  if (!readiness.ready) {
    step('readiness', 'blocked', readiness.blockers.map(b => b.detail).join(' '))
    step('review_boundary', 'not_reached', 'The programme was not moved.')
    prepared.blockers = readiness.blockers.map(b => ({ code: b.code, detail: b.detail }))
    prepared.status_after = await reread(id)
    prepared.headline = 'This programme is prepared but not yet ready for the client to approve — ' +
      readiness.blockers.map(b => b.detail).join(' ')
    return { ok: false, reason: prepared.headline, report: prepared }
  }
  step('readiness', 'done', 'Every preparation requirement is met.')

  // ── ④ THE REVIEW BOUNDARY — THE UNCHANGED CANONICAL TRANSITION ──────────────────────
  //
  // 🛑 THE GATE IS NOT TOUCHED. `markReadyForApproval` re-counts the reviewable set, re-runs
  // `programmePreparationReadiness` itself, and writes the frozen snapshot in the SAME
  // `setStatus` call as the status. Everything above only made its preconditions true; nothing
  // above can make it say yes when it would have said no.
  const moved = await markReadyForApproval(id)
  const statusAfter = await reread(id)
  prepared.status_after = statusAfter
  if (!moved.ok) {
    step('review_boundary', 'blocked', moved.reason ?? 'The programme was not moved.')
    prepared.headline = `This programme is prepared but was not moved to review: ${moved.reason ?? 'the transition refused.'}`
    return { ok: false, reason: prepared.headline, report: prepared }
  }
  step('review_boundary', 'done', 'The programme is now ready for the client to approve, and the reviewed set is frozen.')
  prepared.reviewable = statusAfter === 'READY_FOR_APPROVAL'
  prepared.headline =
    `This programme is ready for the client to approve — ${prep.enrolled.length} prospect(s) prepared on this run, ` +
    `${prep.alreadyEnrolled} already prepared. The reviewed set is frozen. Nothing has been sent, and nothing can send ` +
    'until it is approved, the second payment is authorised and it is made live.'
  return { ok: true, report: prepared }
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE AUTOMATIC CONTINUATION — normal flow runs itself, Vida interrupts only on an exception.
//
// ⛓️ 9 Sep (founder-corrected) — THE FIRST CUT LEFT THE NORMAL PATH OPERATOR-DRIVEN. Making
// `Ready for approval` *work* is not the same as making it *unnecessary*, and the locked rule
// is the second one:
//
//     P1 authorised → source → enrich → qualify → account → PREPARE.  Automatically.
//     Vida interrupts only for a real exception.
//
// A button that must be pressed on every healthy programme is a step somebody will one day not
// press, on a launch where nobody is watching. So the orchestrator is invoked at the canonical
// moment qualification and entitlement settlement have BOTH completed successfully, and the
// operator door survives only as the recovery/retry path it should always have been.
//
// ── THE TWO SETTLEMENT BOUNDARIES, AND WHY BOTH ────────────────────────────────────────
//
//   ① `routes/icps.ts` — the fresh sourcing run: qualify → settle → surface. The normal path.
//   ② `programme-batch-recovery.ts` — the operator's *Qualify sourced leads*, for an attempt
//      whose first run left candidates unjudged. It reaches the SAME successful state, so it
//      must continue the same way; requiring a second button there would rebuild the gap.
//
// Both call THIS function. Neither contains any preparation logic of its own.
//
// 🛑 IT NEVER THROWS, AND THAT IS A CORRECTNESS PROPERTY RATHER THAN TIDINESS. It runs AFTER
// the ledger has moved. An exception escaping into the sourcing run would abandon the rest of
// that run's work — the surfacing, the scoring, the founder alerts — on a settle that already
// succeeded and cannot be taken back. Preparation failing is a reason to stop and report, never
// a reason to unwind accounting that is already correct.
//
// ⚠️ AND IT FAILS CLOSED. It cannot advance a programme the readiness rule refuses; it just
// names the blocker and leaves the row where it is. Every requirement — a valid sender above
// all — is still proved by `markReadyForApproval`, which this does not touch.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** Which settlement boundary asked for the continuation. Used for logs and audit only. */
export type AdvanceTrigger = 'sourcing_run' | 'operator_qualify' | 'operator_recovery'

export interface AutoAdvanceOutcome {
  attempted: boolean
  /** True only when the programme is now at the review boundary. */
  reviewable: boolean
  /** The named readiness blockers standing in the way, when it could not continue. */
  blockers: { code: string; detail: string }[]
  /** One founder-plain sentence, safe to render. */
  detail: string
}

/**
 * Continue a programme automatically now that its qualification and accounting have settled.
 *
 * ⚠️ THE CALLER MUST HAVE SETTLED SUCCESSFULLY. This function does not re-check the settle and
 * must never be reached from a partial one — the two call sites are both inside their own
 * success branch, past an unjudged-remainder guard that refuses to settle at all.
 */
export async function advanceAfterSettlement(
  programmeId: string, trigger: AdvanceTrigger,
): Promise<AutoAdvanceOutcome> {
  const nothing = (detail: string): AutoAdvanceOutcome =>
    ({ attempted: true, reviewable: false, blockers: [], detail })

  try {
    const r = await advanceProgrammeToReview(programmeId)

    if (r.ok) {
      const done = r.report.reviewable || AT_OR_PAST_REVIEW.includes(r.report.status_after)
      console.log(`[programme-advance] ${trigger} → programme ${programmeId}: ${r.report.headline}`)
      return {
        attempted: true,
        reviewable: done,
        blockers: [],
        detail: r.report.headline,
      }
    }

    // 🛑 AN EXCEPTION, NOT A FAILURE OF THE RUN. The batch is settled and correct; what could
    // not happen is the preparation that follows it. The operator is told exactly which
    // requirement stopped it, because that is the only thing that decides their next action —
    // `no_sender` is a mailbox to connect, not a retry.
    console.error(`[programme-advance] ${trigger} → programme ${programmeId} did NOT continue: ${r.reason}`)
    return {
      attempted: true,
      reviewable: false,
      blockers: r.report?.blockers ?? [],
      detail: r.reason,
    }
  } catch (err) {
    // ⚠️ SWALLOWED HERE AND NOWHERE ELSE. See the header: the ledger has already moved.
    const why = err instanceof Error ? err.message : String(err)
    console.error(`[programme-advance] ${trigger} → programme ${programmeId} threw during continuation:`, why)
    return nothing(
      `The attempt is settled and correct, but this programme could not be carried on to review (${why}). ` +
      'Nothing was sent and no accounting changed. Use Ready for approval to retry once the cause is fixed.',
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE RECOVERY DOOR RUNS IN THE BACKGROUND — because it ran in the request, and the request died.
//
// ⛓️ 9 Sep — WHAT HAPPENED IN PRODUCTION. The founder pressed *Ready for approval* on House.
// The route called `advanceProgrammeToReview` and held the HTTP response open for the whole
// chain: 246 prospects, each costing `verifyProgrammeFulfilment`, `resolveProgrammeChain`, the
// lead and client reads, the attribution read, the insert, the campaign counter and the
// (correctly refused) step-one send — thousands of sequential round trips from Railway to
// Supabase. Several minutes. Node 20's default `server.requestTimeout` is 300 s and Railway's
// edge in front of the admin app has its own limit; one of them closed the browser-facing
// connection with a plain-text `upstream error`, Vida called `.json()` on it, and the founder
// read *Unexpected token 'u'*. The API process kept running — the sequence write landed — and
// whatever it concluded was delivered to nobody and, because the route audited success only,
// recorded nowhere.
//
// 🛑 THE FIX IS THE SHAPE OF THE REQUEST, NOT A `try` AROUND `JSON.parse`. The same work now
// starts and the response returns at once; the outcome is written to the operator audit log
// whether it succeeded or refused, so it survives any lost response; and Vida reads it back
// from the programme panel. `icps/proof` has done exactly this since 26 Aug.
//
// ⚠️ ONE RUN PER PROGRAMME AT A TIME. The founder's first request may still be running in the
// API when the second press arrives. Preparation's already-enrolled check is read-then-write,
// so two concurrent runs over the same page could each see "not enrolled" and both insert —
// `autoEnrollLead`'s own per-campaign guard would catch most of that, but a lock that costs a
// Map lookup is cheaper than an argument about which guard catches which race. A press while
// a run is in flight is answered *already running*, not started twice.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** In-flight continuations, keyed by programme id. Process-local — one API process serves Vida. */
const inFlight = new Map<string, Promise<AdvanceResult>>()

/** Is a continuation currently running for this programme in this process? */
export function isAdvanceRunning(programmeId: string): boolean {
  return inFlight.has(programmeId)
}

export interface BackgroundStart {
  /** True when this call started the run. False when one was already in flight. */
  started: boolean
  already_running: boolean
}

/**
 * Start the continuation for one programme without holding a response open for it.
 *
 * ⚠️ THE OUTCOME IS AUDITED HERE, ON BOTH BRANCHES, BECAUSE THE CALLER CANNOT. A route that
 * responded before the work finished has nothing to write; this is the only place that knows
 * how the run ended. `programme_prepared_for_review` and `programme_prepare_for_review_refused`
 * are the two rows Vida's programme panel reads back as *last preparation attempt*.
 *
 * ⚠️ IT NEVER THROWS AND NEVER REJECTS — a background promise nobody awaits must not become an
 * unhandled rejection that takes the process down mid-preparation.
 */
export function startAdvanceInBackground(
  programmeId: string, trigger: AdvanceTrigger, operatorEmail: string,
): BackgroundStart {
  const id = typeof programmeId === 'string' ? programmeId.trim() : ''
  if (inFlight.has(id)) return { started: false, already_running: true }

  const run = (async (): Promise<AdvanceResult> => {
    let result: AdvanceResult
    try {
      result = await advanceProgrammeToReview(id)
    } catch (err) {
      const why = err instanceof Error ? err.message : String(err)
      console.error(`[programme-advance] ${trigger} → programme ${id} threw in the background:`, why)
      result = {
        ok: false,
        reason: `This programme could not be carried on to review (${why}). Nothing was sent and no accounting changed. Fix the cause and press Ready for approval again — preparation resumes where it stopped.`,
      }
    }
    try {
      const { writeOperatorAudit } = await import('./operator-audit')
      if (result.ok) {
        const r = result.report
        await writeOperatorAudit({
          operatorEmail, clientId: r.client_id,
          action: 'programme_prepared_for_review',
          subjectType: 'programme', subjectId: id,
          detail: {
            trigger, headline: r.headline,
            status_before: r.status_before, status_after: r.status_after,
            enrolled: r.enrolled, already_enrolled: r.already_enrolled,
            attempted: r.attempted, failed: r.failed, refusals: r.refusals,
            // The technical evidence, kept out of every operator-facing sentence.
            failed_lead_ids: r.failed_lead_ids,
            campaigns: r.campaigns, remaining: r.remaining, reviewable: r.reviewable,
            steps: r.steps,
          },
        })
        console.log(`[programme-advance] ${trigger} → programme ${id}: ${r.headline}`)
      } else {
        await writeOperatorAudit({
          operatorEmail, clientId: result.report?.client_id ?? null,
          action: 'programme_prepare_for_review_refused',
          subjectType: 'programme', subjectId: id,
          detail: {
            trigger, reason: result.reason,
            attempted: result.report?.attempted ?? null,
            enrolled: result.report?.enrolled ?? null,
            already_enrolled: result.report?.already_enrolled ?? null,
            failed: result.report?.failed ?? null,
            refusals: result.report?.refusals ?? null,
            failed_lead_ids: result.report?.failed_lead_ids ?? null,
            steps: result.report?.steps ?? null,
            blockers: result.report?.blockers ?? null,
            status_before: result.report?.status_before ?? null,
            status_after: result.report?.status_after ?? null,
          },
        })
        console.error(`[programme-advance] ${trigger} → programme ${id} did NOT continue: ${result.reason}`)
      }
    } catch (auditErr) {
      // The work is done either way; a lost audit row is logged, never allowed to look like a
      // lost run.
      console.error(`[programme-advance] outcome for programme ${id} could not be audited:`, auditErr)
    }
    return result
  })()

  inFlight.set(id, run)
  void run.finally(() => { if (inFlight.get(id) === run) inFlight.delete(id) })
  return { started: true, already_running: false }
}

/** What Vida shows as the programme's last preparation attempt. */
export interface LastPreparation {
  at: string
  ok: boolean
  by: string | null
  /** Founder-plain sentence: the headline on success, the named refusal otherwise. */
  detail: string
  blockers: { code: string; detail: string }[]
  /** Counts only — the failed lead ids stay in the audit row and never reach the desk. */
  attempted: number | null
  enrolled: number | null
  already_enrolled: number | null
  failed: number | null
}

/**
 * The most recent recorded preparation outcome for one programme, from the audit log.
 *
 * ⚠️ THIS IS WHY THE AUDIT ROW IS THE RECORD. A background run's result has nowhere else to
 * go; without this the founder's only evidence of a failed attempt would be an onboarding
 * percentage that moved. `null` when nothing was ever recorded — never a synthesised entry.
 */
export async function lastPreparationAttempt(programmeId: string): Promise<LastPreparation | null> {
  const { data, error } = await db.from('operator_audit_log')
    .select('operator_email, action, detail, created_at')
    .eq('subject_type', 'programme').eq('subject_id', programmeId)
    .in('action', ['programme_prepared_for_review', 'programme_prepare_for_review_refused'])
    .order('created_at', { ascending: false }).limit(1)
  if (error) {
    console.error(`[programme-advance] last preparation attempt for ${programmeId} could not be read:`, error.message)
    return null
  }
  const row = ((data ?? []) as { operator_email: string | null; action: string; detail: Record<string, unknown> | null; created_at: string }[])[0]
  if (!row) return null
  const d = row.detail ?? {}
  const ok = row.action === 'programme_prepared_for_review'
  const blockers = Array.isArray(d.blockers)
    ? (d.blockers as { code?: unknown; detail?: unknown }[])
        .filter(b => typeof b?.code === 'string' && typeof b?.detail === 'string')
        .map(b => ({ code: String(b.code), detail: String(b.detail) }))
    : []
  const num = (v: unknown): number | null => (typeof v === 'number' ? v : null)
  return {
    at: row.created_at,
    ok,
    by: row.operator_email,
    detail: String(ok ? (d.headline ?? 'Prepared.') : (d.reason ?? 'The preparation did not complete.')),
    blockers,
    // ⚑ 9 Sep — the four counts the desk renders. `failed_lead_ids` is deliberately NOT
    // returned: it stays in the audit row, which is where technical evidence belongs.
    attempted: num(d.attempted),
    enrolled: num(d.enrolled),
    already_enrolled: num(d.already_enrolled),
    failed: num(d.failed),
  }
}
