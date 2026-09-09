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
  /** Enrolments that already existed and were left alone. */
  already_enrolled: number
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
