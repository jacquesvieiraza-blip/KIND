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
  campaignId: string | null
  /** Positively linked to this programme — not inferred from `client_id`. */
  campaignProgrammeLinked: boolean
  sequenceId: string | null
  sequenceCampaignLinked: boolean
  /** Real, reviewable outbound steps. Zero means there is nothing to read. */
  messageSteps: number
  cadenceConfigured: boolean
  senderAssigned: boolean
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
  'no_message_steps', 'no_cadence', 'no_sender', 'no_eligible_enrolments',
  'foreign_enrolments', 'no_snapshot',
] as const

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
  if (!f.senderAssigned) {
    block('no_sender', 'No sending mailbox is assigned and ready for this client, so nothing could leave even after approval — and the client would be approving a plan that cannot run.')
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
    .select('id, client_id, status, paused_at').eq('id', programmeId).maybeSingle()
  if (progErr) return notReady(`This programme's own row could not be read (${progErr.message}), so readiness could not be judged. Nothing changed.`)
  if (!prog) return notReady('There is no programme with that id.')

  const p = prog as { id: string; client_id: string; status: string; paused_at: string | null }

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
    .is('revealed_at', null)
    .neq('status', 'passed')
  if (leadErr) return notReady(`This programme's reviewable prospects could not be counted (${leadErr.message}).`)

  // ⚠️ THE CAMPAIGN LINK IS THE ATTACHED ICP, NOT THE CLIENT. `figsy_campaigns` carries
  // `icp_id` and the ICP carries `programme_id`, so that chain is a POSITIVE link. Resolving a
  // campaign by `client_id` alone would let a historical campaign present itself as this
  // programme's work — the same class of mistake as sourcing the client-facing active ICP.
  let campaignId: string | null = null
  let campaignProgrammeLinked = false
  if (attachedIcpId) {
    const { data: camps, error: campErr } = await db.from('figsy_campaigns')
      .select('id, icp_id, status').eq('icp_id', attachedIcpId)
    if (campErr) return notReady(`This programme's campaign could not be read (${campErr.message}).`)
    campaignId = (camps ?? [])[0]?.id ?? null
    campaignProgrammeLinked = !!campaignId
  }

  // ⚠️ SEQUENCES CARRY NO CAMPAIGN OR PROGRAMME COLUMN TODAY (`figsy_sequences` is
  // client-scoped). So there is no positive link to find, and this reports the absence rather
  // than inferring one from the client — inferring is exactly what the campaign rule refuses.
  const { data: seqs, error: seqErr } = await db.from('figsy_sequences')
    .select('id, steps').eq('client_id', p.client_id)
  if (seqErr) return notReady(`This client's sequences could not be read (${seqErr.message}).`)
  const seq = (seqs ?? [])[0] as { id: string; steps?: unknown } | undefined
  const steps = Array.isArray(seq?.steps) ? (seq!.steps as unknown[]) : []

  const { count: eligible, error: enrErr } = await db.from('figsy_enrollments')
    .select('id', { count: 'exact', head: true }).eq('programme_id', programmeId)
  if (enrErr) return notReady(`This programme's prepared enrolments could not be read (${enrErr.message}).`)

  let senderAssigned = false
  try {
    const { resolveSendingInbox } = await import('./sending-inbox')
    senderAssigned = (await resolveSendingInbox(p.client_id)).ok === true
  } catch (err) {
    return notReady(`The sending mailbox for this client could not be checked (${err instanceof Error ? err.message : String(err)}).`)
  }

  const facts: PreparationFacts = {
    programmeId,
    programmeStatus: p.status,
    paused: !!p.paused_at,
    attachedIcpId,
    batchId,
    reviewableLeads: reviewable ?? 0,
    campaignId,
    campaignProgrammeLinked,
    sequenceId: seq?.id ?? null,
    // No column links a sequence to a campaign yet, so this cannot be proved. Reported as a
    // blocker rather than assumed — see HOUSE-021.
    sequenceCampaignLinked: false,
    messageSteps: steps.length,
    // No stored cadence configuration exists to read yet — see HOUSE-023.
    cadenceConfigured: false,
    senderAssigned,
    eligibleEnrolments: eligible ?? 0,
    foreignEnrolments: 0,
    // No freeze/snapshot capability exists yet — see HOUSE-026.
    snapshotSupported: false,
  }

  const blockers = preparationBlockers(facts)
  return { ready: blockers.length === 0, blockers, facts, degraded: null }
}
