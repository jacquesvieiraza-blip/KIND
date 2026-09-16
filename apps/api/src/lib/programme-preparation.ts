// ═══════════════════════════════════════════════════════════════════════════════════════
// PROGRAMME OUTREACH PREPARATION — "LIVE" MUST MEAN OPERABLE, NOT A STATUS LABEL
//
// ── WHAT WAS BROKEN ─────────────────────────────────────────────────────────────────────
//
// A programme could reach LIVE with **nothing able to work its leads**. Three separate things
// stood between Go Live and a sendable enrolment, and none of them had a trigger:
//
//   ① NO CAMPAIGN. `ensureCampaignForIcp` is the only door to an active campaign, and its
//      four callers are all ICP screens. No programme lifecycle path called it, so a LIVE
//      programme had no campaign at all.
//   ② NO ENROLMENT. `autoEnrollLead` runs when a lead is sourced — which for a programme is
//      BEFORE Live, when the campaign does not yet exist. It returned silently, and nothing
//      ever came back for those leads.
//   ③ THE WALLET. Every enrolment required a legacy FIGSY credit, and charged one. For House
//      that would have spent an inert historical wallet; for a PAYING programme client it
//      would have charged them a second time for delivery their programme price covers.
//
// ── THE FOUNDER'S RULING THAT SHAPES THIS FILE (2 Sep) ──────────────────────────────────
//
// **"PROGRAMME ENROLMENT IS INCLUDED PROGRAMME FULFILMENT."** P1/P2 pay for delivery;
// enrolment is not separately billable, must not require or decrement the legacy wallet, and
// must not create per-lead revenue, a payment or an invoice. House follows the same rule and
// differs only in that its P1/P2 authority is internal rather than monetary.
//
// **Legacy clients are untouched.** Every bypass in here is reached only through positively
// proven programme authority; a client with no programme never enters any of it.
//
// ── ONE MECHANISM, BOTH LIVE PATHS ──────────────────────────────────────────────────────
//
// The paying client goes APPROVED → P2 payment → auto-Live. House goes APPROVED → internal
// P2 → explicit Make Live. Both call `prepareProgrammeOutreach`. Two implementations of
// "what makes a programme operable" would drift, and the one that drifted would be the one
// nobody walked.
//
// 🛑 AND PREPARATION SENDS NOTHING. It creates campaigns and enrolments. Whether an email
// leaves is decided afterwards and elsewhere, by `AUTO_OUTREACH_ENABLED` for the cron and
// `FIGSY_OPERATOR_SEND_ENABLED` for the founder's Run-once. Preparing is not sending.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import { getProgramme, TERMINAL_STATUSES, p1Authorised, p2Authorised, type ProgrammeRow } from './programme'
import { normalizeRevealEmail, normalizeRevealEmails } from './billing-rules'
import { isBusinessEmail } from './email-hygiene'

/**
 * ⛓️ 7 Sep — PREPARATION HAPPENS BEFORE APPROVAL (founder-locked).
 *
 * 🛑 THE DEADLOCK THIS BREAKS. `READY_FOR_APPROVAL` means *a human may now look at what will
 * run, and approve it* — so the campaign, the sequence, the words, the timing, the sender and
 * the audience have to EXIST before the question is put. Preparation was gated at APPROVED,
 * i.e. strictly after. The customer was being asked to approve work that could not have been
 * built yet, which is the launch-critical defect this package exists to close.
 *
 * **THE RULE:** *"Campaign + sequence + messaging + cadence + sender + prepared enrolments must
 * exist before the client is asked to approve. Preparation is NON-SENDING."*
 *
 * ── TWO STAGES, TWO AUTHORITIES, AND THE DIFFERENCE IS THE WHOLE SAFETY ARGUMENT ─────────
 *
 *   PRE-APPROVAL  — P1 only. Payment 1 authorises *sourcing and preparation* and nothing else
 *                   (`programme-authority.ts` has said so since 29 Aug). No approval, no P2.
 *   POST-APPROVAL — unchanged: an approval recorded AND P2 authority, exactly as before.
 *
 * ⚠️ NOTHING HERE GRANTS ANYTHING. Preparing does not approve, does not authorise Payment 2,
 * does not make a programme LIVE and does not send. Those are separate gates, in separate
 * modules, and this file touches none of them — `OUTREACH` still requires approval + P2 +
 * LIVE, so a pre-approval enrolment is INERT BY CONSTRUCTION rather than by promise.
 *
 * ⚠️ AND THE CAMPAIGN IS CREATED AS A DRAFT BEFORE APPROVAL. `activate: true` is the door to
 * `status: 'active'`, which is what the outreach machinery looks for; a draft campaign is a
 * container for the words with no way to send them. Activation stays where it was, behind
 * LIVE. That is the smallest safe boundary, and it is a structural guarantee rather than a
 * flag somebody has to remember.
 */
// ⛓️ `READY_FOR_APPROVAL` LEFT THIS LIST ON 8 Sep (founder-locked). It was here for idempotent
// recovery, and the reasoning was wrong in a way that mattered: preparation ADDS ENROLMENTS, so
// "recovery" could change the very set the client was reading — and the review freeze taken at
// the transition would no longer describe what was on screen. Once a programme is reviewable,
// its material preparation is FROZEN. Reopening it means going back through the transition,
// which re-freezes, which is the point.
export const PRE_APPROVAL_PREPARABLE: string[] = ['SOURCING_AUTHORISED', 'SOURCING']
export const POST_APPROVAL_PREPARABLE: string[] = ['APPROVED', 'LIVE']

export type PreparationStage = 'pre_approval' | 'post_approval'

export type StageVerdict =
  | { ok: true; stage: PreparationStage }
  | { ok: false; reason: string }

/**
 * Which preparation authority, if any, this programme holds right now.
 *
 * ⚠️ ONE DECISION, READ FROM THE ROW. Three call sites used to repeat the same four checks
 * inline, which is how two of them would eventually disagree about what "preparable" means.
 */
export function preparationStageFor(p: ProgrammeRow): StageVerdict {
  if (TERMINAL_STATUSES.includes(p.status)) return { ok: false, reason: `programme is ${p.status}` }
  if (p.paused_at) return { ok: false, reason: 'programme is paused' }

  if (POST_APPROVAL_PREPARABLE.includes(p.status)) {
    // Byte-for-byte the rule that was here before, for the statuses that had it.
    if (!p.approved_at) return { ok: false, reason: 'programme has no approval recorded' }
    if (!p2Authorised(p)) return { ok: false, reason: 'programme has no P2 authority' }
    return { ok: true, stage: 'post_approval' }
  }

  if (PRE_APPROVAL_PREPARABLE.includes(p.status)) {
    // 🛑 P1 AND NOTHING WEAKER. Payment 1 (or House's internal equivalent) is what authorises
    // preparation; a programme that has not reached it has bought nothing to prepare.
    if (!p1Authorised(p)) return { ok: false, reason: 'programme has no P1 authority' }
    return { ok: true, stage: 'pre_approval' }
  }

  return { ok: false, reason: `programme is ${p.status}, which carries no preparation authority` }
}

/**
 * Founder-plain wording for each refusal cause, used in the one-line summary.
 *
 * ⚠️ THE OPERATOR NEVER READS A CODE. `pecr` and `launch_country` do not appear because
 * pre-approval preparation no longer refuses on them — they are send-time decisions and are
 * listed here only so a POST-approval run, which still applies them, reports them in English.
 */
export const ENROL_REFUSAL_TEXT: Record<string, string> = {
  kill_switch:           'automatic outreach is switched off',
  programme_refused:     'the prospect did not prove to belong to this programme',
  no_campaign:           'no campaign was available for their targeting',
  no_email:              'no email address',
  do_not_contact:        'on the do-not-contact list',
  crm_duplicate:         "already in the client's CRM",
  crm_unreadable:        "the client's CRM could not be checked",
  pecr:                  'UK individual-subscriber rules (PECR)',
  launch_country:        'outside the countries open at launch',
  not_legacy_model:      'the client has no legacy per-lead enrolment authority',
  no_credits:            'no FIGSY credits left',
  no_send_capability:    'the email provider is not configured',
  no_canonical_sequence: 'the programme has no approved sequence to enrol them into',
  charge_failed:         'the enrolment charge did not go through',
  insert_failed:         'the enrolment row could not be written',
  unexpected_error:      'an unexpected error',
  threw:                 'an unexpected error',
  no_row_after_attempt:  'no enrolment row existed afterwards',
}

export type PrepareResult = {
  /** Fully prepared: every eligible lead enrolled, nothing outstanding, no problems. */
  ok: boolean
  /**
   * ⚑ 16 Sep (MVP1 · C1) — why the automatic sender claim did not produce a verified mailbox.
   *
   * 🛑 DELIBERATELY NOT IN `problems`, AND THEREFORE NOT IN `ok`. A missing pooled mailbox must
   * not discard a campaign, a generated sequence and a set of enrolments that are all real and
   * reusable — and this function builds, it does not judge. `preparation-readiness.ts` is the
   * single gate and already refuses `no_sender` and `sender_unverified`, so a client with no
   * verified mailbox cannot freeze Ready for Approval whatever this field says.
   *
   * ⚠️ `null` MEANS THE SENDER IS SETTLED — either newly claimed and verified, or already held.
   */
  senderProblem: string | null
  /**
   * ⚑ `complete === false` MEANS THE PROGRAMME MUST NOT GO LIVE. It is separate from `ok`
   * because they answer different questions: `ok` is "did everything I attempted succeed",
   * `complete` is "is there anything LEFT". A run that succeeded on every lead it touched and
   * still has 500 to go is `ok`-shaped and emphatically not finished.
   */
  complete: boolean
  /** Eligible leads still awaiting an enrolment. `remaining > 0` ⇒ never LIVE. */
  remaining: number
  /** Eligible leads seen across every page. */
  total: number
  /** Campaign ids now available, one per attached ICP. */
  campaigns: string[]
  /** Leads that gained a programme enrolment on THIS run. */
  enrolled: string[]
  /** Leads already enrolled — counted, never re-enrolled. */
  alreadyEnrolled: number
  /** Leads deliberately not enrolled because existing rules make them ineligible. */
  skipped: number
  /** Leads that were attempted and did not produce an enrolment row. */
  failed: string[]
  /**
   * ⚑ 9 Sep — HOW MANY PROSPECTS EACH CAUSE ACCOUNTS FOR, keyed by `EnrolRefusal`.
   *
   * 🛑 THE REPORT THE FOUNDER WAS ACTUALLY GIVEN was one line per failed prospect — the same
   * sentence, repeated for many of the 246, naming no cause at all. A hundred identical lines
   * are not evidence; they are one fact printed a hundred times. Causes are counted here, the
   * lead ids stay in `failed` for the audit record, and the operator reads a summary.
   */
  refusals: Record<string, number>
  /** Everything that could not be completed. A non-empty list means NOT fully operable. */
  problems: string[]
}

/**
 * How many leads one preparation call will process.
 *
 * ⚠️ A BUDGET, NOT A CAP THAT LIES. A programme is sized at 250 prospects per targeted meeting
 * (R77), so a ten-meeting programme is 2,500 people — the previous hard `.limit(2000)` would
 * have prepared 2,000 of them and reported success. This budget is deliberately larger than
 * the realistic single-programme set, AND anything left over is reported as `remaining` and
 * blocks the LIVE transition. Silent truncation is the failure being designed out; a bounded
 * run that says what is left is not truncation.
 *
 * The bound exists because this also runs inside the Stripe webhook, where an unbounded loop
 * is its own outage.
 */
export const PREPARE_BUDGET = 5000
/** Rows per page. Keyset pagination on `id`, so pages cannot overlap or skip. */
const PAGE = 500

/**
 * Is this lead genuinely programme fulfilment for this programme?
 *
 * ⚠️ EVERY FACT IS READ FROM THE DATABASE. Nothing is taken from the caller except the ids to
 * look up, because this is the check that unlocks the wallet bypass — if it could be talked
 * into a yes, a legacy lead would be enrolled for free against a programme it never belonged
 * to. `autoEnrollLead` calls this itself rather than trusting that its caller already did.
 */
export async function verifyProgrammeFulfilment(
  leadId: string, clientId: string, programmeId: string,
): Promise<{ ok: true; programme: ProgrammeRow } | { ok: false; reason: string }> {
  const { data: lead, error: leadErr } = await db.from('leads')
    .select('id, client_id, icp_id, programme_id, surfaced_for_approval_at, qualified_at, disqualified_at').eq('id', leadId).maybeSingle()
  if (leadErr) return { ok: false, reason: `lead read failed: ${leadErr.message}` }
  if (!lead) return { ok: false, reason: 'no such lead' }
  const l = lead as {
    client_id: string | null; icp_id: string | null; programme_id: string | null
    surfaced_for_approval_at: string | null
    qualified_at: string | null; disqualified_at: string | null
  }

  // 🛑 POSITIVE ATTRIBUTION. A null-attributed lead is history — House carries ~166 of them —
  // and history is never fulfilment for a programme that did not source it.
  if (!l.programme_id) return { ok: false, reason: 'lead carries no programme attribution' }
  if (l.programme_id !== programmeId) return { ok: false, reason: 'lead belongs to a different programme' }
  if (l.client_id !== clientId) return { ok: false, reason: 'lead belongs to a different client' }

  // 🛑 THE REVIEW BOUNDARY. Belonging to the programme is NOT enough. `surfaced_for_approval_at`
  // is the stamp that says an operator actually put this person in front of the customer (#493),
  // and it is the discriminator `/leads/for-approval` and `batchGate` both require — so a lead
  // without it was never in the set the customer could see, review, or decide on.
  //
  // ⚠️ AND `delivered_at` DOES NOT IMPLY IT. `enrichAndDeliverLeads` (the on-run delivery a
  // programme sourcing run calls, and the daily drip) stamps `delivered_at` ALONE; the surfacing
  // stamp is written later and separately by `surfaceEverything`, which is the operator's Send
  // act. Between those two acts a programme lead is delivered and invisible — and preparation
  // used to enrol exactly those people. That is outreach to somebody the customer never saw.
  if (!l.surfaced_for_approval_at) return { ok: false, reason: 'lead was never surfaced to the customer for review' }

  // 🛑 M&V's OWN VERDICT, RE-ASKED PER LEAD (9 Sep). The page query above already filters on
  // it; this is the second, independent defence — `autoEnrollLead` calls this function itself
  // rather than trusting that its caller filtered, and a disqualified candidate reaching
  // outreach would be us mailing somebody we ourselves ruled out of the customer's own ICP.
  if (l.disqualified_at) return { ok: false, reason: 'lead was disqualified by the final ICP check, so it is not part of this programme\'s work' }
  if (!l.qualified_at) return { ok: false, reason: 'lead has no qualification verdict, so it is not proved to match the ICP' }

  const p = await getProgramme(programmeId)
  if (!p) return { ok: false, reason: 'no such programme' }
  if (p.client_id !== clientId) return { ok: false, reason: 'programme belongs to a different client' }
  if (TERMINAL_STATUSES.includes(p.status)) return { ok: false, reason: `programme is ${p.status}` }
  if (p.paused_at) return { ok: false, reason: 'programme is paused' }
  // ⛓️ 7 Sep — STAGED. This used to demand an approval and P2 outright, which is precisely
  // what made preparation impossible before approval. `preparationStageFor` still demands
  // exactly that for APPROVED/LIVE, and demands P1 for the pre-approval stage — the authority
  // Payment 1 actually buys. Enrolling remains inert until OUTREACH authority exists.
  const stage = preparationStageFor(p)
  if (!stage.ok) return { ok: false, reason: stage.reason }

  // ⚠️ THE ICP MUST BELONG TO THIS PROGRAMME TOO. The lead's attribution and the ICP's are
  // written by different acts (a sourcing run, and the attach action), so agreeing is a fact
  // worth checking rather than assuming.
  if (!l.icp_id) return { ok: false, reason: 'lead has no ICP, so no programme campaign can serve it' }
  const { data: icp, error: icpErr } = await db.from('icps')
    .select('id, programme_id, client_id').eq('id', l.icp_id).maybeSingle()
  if (icpErr) return { ok: false, reason: `ICP read failed: ${icpErr.message}` }
  if (!icp) return { ok: false, reason: 'lead names an ICP that does not exist' }
  const i = icp as { programme_id: string | null; client_id: string | null }
  if (i.programme_id !== programmeId) return { ok: false, reason: 'the lead ICP is not attached to this programme' }
  if (i.client_id !== clientId) return { ok: false, reason: 'the lead ICP belongs to a different client' }

  return { ok: true, programme: p }
}

/**
 * Everything status LIVE would have proven, proven again while the row still says APPROVED.
 *
 * ⚠️ THIS IS WHAT LETS PREPARATION RUN BEFORE THE TRANSITION. `ensureCampaignForIcp` requires
 * LIVE; LIVE must be durable evidence that preparation succeeded; both cannot be true unless
 * the substantive conditions can be checked without the label. They can — the label is the
 * last thing written, not the thing that grants authority.
 */
export async function assertGoingLive(
  clientId: string, programmeId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const p = await getProgramme(programmeId)
  if (!p) return { ok: false, reason: 'no such programme' }
  if (p.client_id !== clientId) return { ok: false, reason: 'programme belongs to a different client' }
  if (TERMINAL_STATUSES.includes(p.status)) return { ok: false, reason: `programme is ${p.status}` }
  if (p.paused_at) return { ok: false, reason: 'programme is paused' }
  // 🛑 UNCHANGED, AND DELIBERATELY NOT STAGED. This is the gate that lets a campaign be
  // ACTIVATED, which is the door to sending. Preparation moved earlier; activation did not.
  if (!p.approved_at) return { ok: false, reason: 'programme has no approval recorded' }
  if (!POST_APPROVAL_PREPARABLE.includes(p.status)) return { ok: false, reason: `programme is ${p.status}, not APPROVED or LIVE` }
  if (!p2Authorised(p)) return { ok: false, reason: 'programme has no P2 authority' }
  return { ok: true }
}

/**
 * Make a programme operable: a programme-safe campaign per attached ICP, and a programme
 * enrolment for every eligible lead the programme sourced.
 *
 * ⚠️ IDEMPOTENT BY CONSTRUCTION, because it will be run more than once — by the paid P2 path,
 * by Make Live, and by a retry after a partial failure. `ensureCampaignForIcp` returns an
 * existing campaign untouched, and each lead is skipped when an enrolment already exists.
 *
 * ⚠️ IT REPORTS PROBLEMS RATHER THAN THROWING. A caller that has just recorded a real payment
 * must be able to keep that fact while knowing preparation did not finish.
 */
export async function prepareProgrammeOutreach(programmeId: string): Promise<PrepareResult> {
  const out: PrepareResult = {
    ok: false, complete: false, remaining: 0, total: 0, senderProblem: null,
    campaigns: [], enrolled: [], alreadyEnrolled: 0, skipped: 0, failed: [],
    refusals: {}, problems: [],
  }

  const p = await getProgramme(programmeId)
  if (!p) { out.problems.push('No such programme.'); return out }
  const stage = preparationStageFor(p)
  if (!stage.ok) { out.problems.push(`This programme cannot be prepared: ${stage.reason}.`); return out }

  // ── ⓿ ⚑ 16 Sep (MVP1 · C1) — THE SENDING MAILBOX, CLAIMED AND PROVEN AUTOMATICALLY ───
  //
  // 🛑 THIS STEP DID NOT EXIST, AND IT WAS THE WHOLE STALL. Readiness blocks
  // READY_FOR_APPROVAL on `no_sender` and `sender_unverified`, and both were classified as
  // blockers preparation cannot clear. The manual remedy could not be taken either: `POST
  // /operator/inboxes/assign` needs an operator to TYPE a pooled address, it never set SMTP
  // credentials so `verifyInbox` refused whatever it created, and there was no inventory of
  // pooled addresses anywhere to type one from. Every paying client's programme therefore
  // stopped dead one step before Ready for Approval, waiting on a person who had no working
  // control to press. Founder decision E: *"No normal operator GO."*
  //
  // ⚠️ IT RUNS FIRST, deliberately. The sender is the one requirement whose absence cannot be
  // repaired by anything further down, so finding out about it after building a campaign, a
  // sequence and a set of enrolments would mean an operator reads the LAST problem in a long
  // list as the cause.
  //
  // ⚠️ IT DECIDES NOTHING ABOUT READINESS. `claimPooledSender` either produces a verified
  // mailbox or it does not; the GATE is still `preparation-readiness.ts`, unchanged, and an
  // assigned-but-unverified row is still refused by `sender_unverified` exactly as before.
  // Nothing here relaxes a requirement — it satisfies one.
  //
  // ⚠️ AND IT IS NON-FATAL TO THE REST OF PREPARATION. A missing pool must not stop the
  // campaign, the words and the audience from being built: that work is real, it is reusable,
  // and the programme simply cannot freeze until a mailbox exists. So the problem is RECORDED
  // and preparation continues — which is what turns this into a legible Vida blocker instead
  // of a silent early return.
  const { claimPooledSender } = await import('./sender-claim')
  const senderClaim = await claimPooledSender(p.client_id)
  if (!senderClaim.ok && senderClaim.reason !== 'already_has_sender') {
    // 🛑 RECORDED HERE, GATED THERE — AND THE SPLIT IS THE POINT (corrected on first run).
    //
    // My first cut pushed this into `out.problems`, which feeds `out.complete` and therefore
    // `out.ok`. That was wrong twice over. It made a missing mailbox fail the whole
    // preparation — throwing away a campaign, a generated sequence and a set of enrolments
    // that are all real, reusable work — and it put a second opinion about whether a programme
    // may freeze inside a function whose job is to BUILD, not to judge.
    //
    // `preparation-readiness.ts` is the single gate and it already refuses `no_sender` and
    // `sender_unverified`. So the honest division is: preparation ATTEMPTS the claim (which is
    // what makes the happy path automatic), and readiness decides. A missing pool therefore
    // surfaces as the existing `no_sender` blocker — a legible Vida Needs-you with a sentence
    // on it — rather than as a preparation that reports failure for a reason buried in a list.
    out.senderProblem = senderClaim.reason === 'verify_failed'
      ? `The sending mailbox ${senderClaim.email} was assigned but could not be verified, so nothing can send from it yet. ${senderClaim.detail}`
      : senderClaim.reason === 'unreadable'
        ? `The sending mailbox could not be settled: ${senderClaim.detail}`
        : senderClaim.detail
    console.warn(`[programme-preparation] programme ${programmeId}: no verified sending mailbox — ${out.senderProblem}`)
  }

  // ── ① A PROGRAMME-SAFE CAMPAIGN PER ATTACHED ICP ─────────────────────────────────────
  //
  // 🛑 IT CANNOT BE A HISTORICAL CAMPAIGN, and that is structural rather than hoped for:
  // `attachIcpToProgramme` refuses any ICP that already carries a campaign, so an attached
  // ICP provably had none when it joined. The only campaign it can hold is one created after
  // attachment, by this call, for this programme.
  const { data: icpRows, error: icpErr } = await db.from('icps')
    .select('id, name, client_id, programme_id').eq('programme_id', programmeId)
  if (icpErr) { out.problems.push(`Could not read the programme's ICPs (${icpErr.message}).`); return out }
  const icps = (icpRows ?? []) as { id: string; name: string | null; client_id: string }[]
  if (icps.length === 0) {
    out.problems.push('No ICP is attached to this programme, so there is nothing to source or send from.')
    return out
  }

  const { ensureCampaignForIcp } = await import('./start-work')
  for (const icp of icps) {
    // ⚠️ TENANCY, even here. An ICP row naming this programme but another client would be a
    // corrupt link, and creating a campaign from it would cross a tenant boundary.
    if (icp.client_id !== p.client_id) {
      out.problems.push(`ICP ${icp.id.slice(0, 8)} names this programme but belongs to another client — skipped.`)
      continue
    }
    // ⚑ `goingLive` carries the authority this programme already holds; `ensureCampaignForIcp`
    // re-proves it rather than believing it. Idempotent: an existing campaign is returned.
    // 🛑 BEFORE APPROVAL THE CAMPAIGN IS A DRAFT, AND THAT IS THE NON-SENDING GUARANTEE.
    // `activate: true` is the ONLY door to `status: 'active'` — the status the outreach
    // machinery looks for — so withholding it means the words exist, the customer can be
    // shown them, and there is no path by which they leave. Activation happens later, at
    // Make Live, where `assertGoingLive` still demands an approval and P2.
    const camp = await ensureCampaignForIcp(p.client_id, icp.id, icp.name,
      stage.stage === 'post_approval'
        ? { activate: true, goingLive: { programmeId } }
        : { activate: false })
    if (!camp || !('id' in camp) || typeof camp.id !== 'string') {
      // ⚠️ THE TWO REFUSAL SHAPES SAY DIFFERENT THINGS, and an operator needs to know which.
      // "Another campaign is already live" is a one-active-campaign collision they can resolve
      // in Vida; a programme refusal means the authority is not what they think it is.
      let why = 'the call failed'
      if (camp && 'refused' in camp) {
        const r = camp.refused as { message?: string; reason?: string; blockingName?: string | null; blockingCampaignId?: string }
        why = r.message
          ?? (r.blockingCampaignId
            ? `another campaign is already live for this client ("${r.blockingName ?? r.blockingCampaignId.slice(0, 8)}") — only one may be active at a time`
            : (r.reason ?? 'refused'))
      }
      out.problems.push(`No active campaign for ICP ${icp.name ?? icp.id.slice(0, 8)} — ${why}.`)
      continue
    }
    out.campaigns.push(camp.id)
  }
  if (out.campaigns.length === 0) {
    out.problems.push('No programme campaign could be made available, so no lead can be enrolled.')
    return out
  }

  // ── ② A PROGRAMME ENROLMENT FOR EVERY ELIGIBLE LEAD THIS PROGRAMME SOURCED ────────────
  //
  // 🛑 THE REVIEW BOUNDARY COMES FIRST — `surfaced_for_approval_at` IS NOT NULL.
  //
  // ⛓️ THIS WAS A REAL DEFECT. The filter was `programme_id` + `client_id` + `delivered_at`,
  // and `delivered_at` does NOT imply the customer ever saw the person. Two different acts
  // write the two stamps: `enrichAndDeliverLeads` — which a programme sourcing run calls
  // directly (`routes/icps.ts`, the on-run delivery) and the daily drip calls again — writes
  // `delivered_at` ALONE, while `surfaced_for_approval_at` is written later by
  // `surfaceEverything`, the operator's "Send to client" act. A programme sourced 2,500 people,
  // an operator surfaced 50, `markReadyForApproval` passed on those 50, the customer approved
  // the programme — and preparation enrolled all 2,500. The other 2,450 would have been mailed
  // without ever appearing in anybody's review set.
  //
  // ⚠️ `revealed_at` IS DELIBERATELY NOT REQUIRED NULL, and that is not an oversight.
  // `markReadyForApproval` needs it because it asks "is there anything LEFT to review". This
  // asks a different question — "was this person part of the reviewable set" — and a revealed
  // lead is one the customer looked at and said YES to. Excluding it would invert the invariant.
  // It is also structurally redundant: every door to `approveLead` (`/leads/:id/approve`,
  // `/leads/:id/reveal`, the batch route) goes through `batchGate`, which itself requires
  // `surfaced_for_approval_at` NOT NULL, and nothing ever clears that stamp — so revealed
  // leads are a SUBSET of surfaced ones. `status = 'passed'` (the customer said no) is excluded
  // below, with the other permanent disqualifiers.
  //
  // ⚠️ KEYSET PAGINATION ON `id`, NOT `.limit(2000)`. A programme is sized at 250 prospects
  // per targeted meeting (R77), so ten meetings is 2,500 people — the previous single-page
  // limit would have prepared 2,000 of them and called the programme operable. Pages are
  // ordered by `id` and each asks for rows STRICTLY AFTER the last one seen, so a page can
  // neither overlap nor skip, and an enrolment written mid-run cannot shift the window.
  //
  // ⚠️ EVERY PAGE RE-APPLIES THE FULL FILTER — `programme_id` AND `client_id`. Narrowing on
  // the first page only is how a paginated query drifts into another tenant.
  // ── ⚑ 8 Sep — THE CANONICAL SEQUENCE, AND THE CURRENT BATCH (founder-locked) ──────────
  //
  // 🛑 A PREPARED ENROLMENT WITH NO APPROVED WORDS IS NOT PREPARATION. Without a canonical
  // sequence `autoEnrollLead` would AI-generate a draft per lead — words nobody wrote, nobody
  // reviewed and nobody approved, baked into a row that looks ready. Refusing here costs a
  // retry; the alternative is a client approving copy that was invented for them.
  const { resolveProgrammeChain } = await import('./programme-chain')
  let chainRes = await resolveProgrammeChain(programmeId)
  if (!chainRes.ok) { out.problems.push(chainRes.degraded); return out }

  // ── ⚑ 8 Sep — THE ORCHESTRATOR OWNS THE ORDER (founder-locked) ───────────────────────
  //
  // 🛑 THE ORDERING HAZARD THIS CLOSES. The campaign is created immediately above; the
  // canonical sequence is required immediately below. Left as two manual steps, the only way
  // through was: run preparation (creates the campaign, refuses to enrol), remember to apply
  // the sequence, run preparation again. **A production path that depends on somebody
  // remembering a magic call order is a path that will one day be run in the wrong order** —
  // and the wrong order here means enrolments built from words nobody approved.
  //
  // ⚠️ ONE PROGRAMME, PROVED BY IDENTITY RATHER THAN INFERRED. The approved five-step copy is
  // the LAUNCH copy for a single programme, not a universal default: applying it to a paying
  // customer's programme would put M&V's own pitch in front of THEIR prospects, and applying it
  // to a second House programme would put September's copy into November's campaign. Two
  // independent facts are required — the explicitly configured programme id, and a House
  // audience proved by `audienceForClientStrict` (the founder-locked resolver, which answers
  // from the AUTH USER, never from an API key or a name, and THROWS rather than guessing). Both
  // live in `isHouseLaunchProgramme`, and an unprovable identity is read there as NO.
  //
  // ⚠️ IT NEVER OVERWRITES AN EXISTING SEQUENCE. This runs only when the chain resolved NO
  // sequence, so a House sequence somebody has since edited is left exactly as it is — the
  // approved copy is the seed for an empty programme, not a periodic reset.
  //
  // ⚠️ AND EVERY OTHER PROGRAMME STILL REFUSES. A customer programme with no sequence is not
  // given one; it is told to author one, which is the honest answer.
  if (!chainRes.chain.sequenceId || chainRes.chain.steps.length === 0) {
    // 🛑 THE EXACT PROGRAMME, NOT THE AUDIENCE (founder-corrected 8 Sep). `audience === 'house'`
    // is true of every House programme — a second one created next month, a different ICP under
    // Client Zero, every historical one. These five messages are the LAUNCH sequence for ONE
    // programme. `isHouseLaunchProgramme` requires the configured programme id AND a proved
    // House client, and answers NO when either is absent or unprovable.
    const { isHouseLaunchProgramme, applyHouseProgrammeSequence } = await import('./house-sequence')
    if (await isHouseLaunchProgramme(programmeId, p.client_id)) {
      const applied = await applyHouseProgrammeSequence(programmeId)
      if (!applied.ok) { out.problems.push(`The approved House sequence could not be applied: ${applied.reason}`); return out }
      // Re-resolved, never assumed: the enrolments below must be built from what is actually
      // stored now, not from what the write was supposed to have stored.
      chainRes = await resolveProgrammeChain(programmeId)
      if (!chainRes.ok) { out.problems.push(chainRes.degraded); return out }
    }
  }

  // ── ⛓️ 9 Sep — AND EVERY OTHER PROGRAMME WRITES ITS OWN, RATHER THAN WAITING FOR A HUMAN ──
  //
  // 🛑 THE SENTENCE ABOVE USED TO END *"A customer programme with no sequence is not given one;
  // it is told to author one, which is the honest answer."* It was honest and it was a hidden
  // manual prerequisite: the locked flow is **P1 → source → enrich → qualify → account →
  // prepare**, and PREPARE must produce everything the client reviews in Milla — the outreach
  // included. Until this branch existed, a fresh client's money bought a programme that stopped
  // dead until the founder hand-wrote their cold email.
  //
  // ⚠️ IT IS NOT THE HOUSE BRANCH WIDENED. `isHouseLaunchProgramme` is untouched and is not
  // consulted here; House's five approved messages are ONE programme's launch copy and are
  // never applied to anyone else. This writes from THIS client's own knowledge digest, their
  // approved Meeting Brief, this campaign's intent and this programme's own qualified
  // audience — reusing the generator the operator console has always used, never a second one.
  //
  // ⚠️ AND IT RUNS ONLY WHEN NOTHING RESOLVED. An operator-edited sequence, a previously
  // generated one, or House's, all reach here as "already present" and are left alone.
  if (!chainRes.chain.sequenceId || chainRes.chain.steps.length === 0) {
    const { generateProgrammeSequence } = await import('./programme-sequence-generation')
    const gen = await generateProgrammeSequence(programmeId)
    if (!gen.ok && !gen.alreadyPresent) { out.problems.push(gen.reason); return out }
    if (gen.ok) {
      console.log(`[preparation] programme ${programmeId} — outreach written automatically: ${gen.steps} step(s), drafted against ${gen.drafted_against}`)
      // Re-resolved for the same reason the House branch re-resolves: the enrolments below are
      // built from what is STORED, never from what a write was supposed to have stored.
      chainRes = await resolveProgrammeChain(programmeId)
      if (!chainRes.ok) { out.problems.push(chainRes.degraded); return out }
    }
  }

  if (!chainRes.chain.sequenceId || chainRes.chain.steps.length === 0) {
    out.problems.push('This programme has no canonical sequence with message steps (programme → ICP → campaign → figsy_sequences), so no prospect can be prepared. Nothing was enrolled.')
    return out
  }

  // ── ⛓️ 9 Sep — A HALF-APPLIED HOUSE SEQUENCE IS REPAIRED, NOT LEFT ─────────────────────
  //
  // 🛑 THE RETRY GAP. `applyHouseProgrammeSequence` writes the sequence row and THEN the
  // programme's `send_schedule`, as two statements. If the second fails — or the process is
  // stopped between them, which is exactly what a killed request can do — the sequence exists
  // and the schedule does not. The auto-apply above runs only when NO sequence resolves, so a
  // retry would find the sequence, skip the apply, and then be refused at readiness with
  // `no_send_schedule` forever. A partial write that nothing can complete is a wedge, and the
  // founder's press would produce the same refusal every time.
  //
  // 🛑 IT WRITES THE SCHEDULE AND NOTHING ELSE. Calling the full apply here would also update
  // the sequence steps back to the approved copy, silently discarding an edit an operator had
  // made since — and the 8 Sep lock is explicit that the approved copy is a SEED for an empty
  // programme, never a periodic reset. `applyHouseSendSchedule` touches one column.
  //
  // ⚠️ SAME SCOPE GATE, AND ONLY WHEN IT IS GENUINELY MISSING. Only the proved House launch
  // programme; a programme with a valid schedule is untouched, and a non-House programme is
  // told to configure one, which is the honest answer.
  {
    const { data: schedRow, error: schedErr } = await db.from('programmes')
      .select('send_schedule').eq('id', programmeId).maybeSingle()
    if (schedErr) { out.problems.push(`This programme's send schedule could not be read (${schedErr.message}).`); return out }
    const { isSendSchedule } = await import('./send-schedule')
    if (!isSendSchedule((schedRow as { send_schedule?: unknown } | null)?.send_schedule)) {
      const { isHouseLaunchProgramme, applyHouseSendSchedule } = await import('./house-sequence')
      if (await isHouseLaunchProgramme(programmeId, p.client_id)) {
        const applied = await applyHouseSendSchedule(programmeId, p.client_id)
        if (!applied.ok) { out.problems.push(`The approved House send schedule could not be applied: ${applied.reason}`); return out }
      } else {
        // ⛓️ 9 Sep — AND A FRESH CLIENT GETS ONE TOO, for the same reason the sequence branch
        // above exists: a programme that prepares everything except its sending hours is a
        // programme that still needs a human before it can be reviewed.
        //
        // ⚠️ THE CONSERVATIVE DEFAULT, AND ONLY WHEN THERE IS NONE. `ensureProgrammeSendSchedule`
        // returns any valid existing schedule untouched and otherwise writes weekdays 08:30–17:00
        // Europe/London — deliberately the narrowest window that can send at all. Widening it is
        // an operator decision per programme, never something preparation decides for them.
        const { ensureProgrammeSendSchedule } = await import('./programme-sequence')
        const applied = await ensureProgrammeSendSchedule(programmeId)
        if (!applied.ok) { out.problems.push(`This programme's send schedule could not be set: ${applied.reason}`); return out }
      }
    }
  }

  // 🛑 AND THE CADENCE IS VALIDATED BEFORE ANYBODY IS ENROLLED. An enrolment copies the steps,
  // so a sequence whose follow-ups all sit on day zero would put five emails in one inbox on
  // one morning — and it would be frozen, approved and sent before anybody noticed the gaps.
  const { cadenceIsConfigured } = await import('./preparation-readiness')
  if (!cadenceIsConfigured(chainRes.chain.cadence)) {
    out.problems.push(`This programme's sequence has no usable cadence (waits ${JSON.stringify(chainRes.chain.cadence)}), so its messages would not be spaced. Nothing was enrolled.`)
    return out
  }

  // 🛑 THE CURRENT BATCH, AND ONLY IT. A programme runs in controlled batches, and the client
  // reviews ONE of them. Preparing across every batch a programme ever had would put people
  // from an older, already-decided batch into the set being approved now — right programme,
  // wrong unit of work, and invisible in every count.
  const { data: batchRows, error: batchErr } = await db.from('programme_batches')
    .select('id, seq').eq('programme_id', programmeId).order('seq', { ascending: false }).limit(1)
  if (batchErr) { out.problems.push(`This programme's batches could not be read (${batchErr.message}).`); return out }
  const currentBatchId = ((batchRows ?? []) as { id: string }[])[0]?.id ?? null
  if (!currentBatchId) {
    out.problems.push('No controlled batch has been opened for this programme, so there is no current unit of work to prepare.')
    return out
  }

  const { autoEnrollLead } = await import('./figsy')
  // ⛓️ 9 Sep — `null`, NOT `''`, AND IT IS THE SAME BUG THAT BROKE THE HOUSE QUALIFY IN
  // PRODUCTION. `leads.id` is `uuid`, so a first page asking for `id > ''` fails the cast
  // before any row is considered: *invalid input syntax for type uuid: ""*. An empty string is
  // not a cursor, it is the ABSENCE of one — and the predicate is now omitted rather than sent
  // empty. The outstanding count below is untouched: it runs only after the loop consumed rows,
  // so its cursor is always a real id.
  let after: string | null = null
  let budgetLeft = PREPARE_BUDGET
  // ⚠️ A PAGE BOUND AS WELL AS A ROW BUDGET. The loop advances by keyset cursor, so a cursor
  // that failed to advance — a bug, or a page of rows whose ids sort unexpectedly — would spin
  // forever inside a Stripe webhook. Found by mutating `gt('id', after)` to a constant, which
  // hung the suite rather than failing it: a mutation that hangs is one the RED proof cannot
  // report, so the bound is the fix and the proof.
  let pagesLeft = Math.ceil(PREPARE_BUDGET / PAGE) + 2

  let budgetExhausted = false

  for (;;) {
    if (budgetLeft <= 0) { budgetExhausted = true; break }
    if (pagesLeft-- <= 0) {
      out.problems.push('Preparation stopped after its page budget — the lead cursor did not advance. Nothing further was enrolled.')
      break
    }
    const pageBase = db.from('leads')
      .select('id, email, status, opted_out_at, provider_eviction_required_at, apollo_consented')
      .eq('programme_id', programmeId)
      .eq('client_id', p.client_id)
      // ⚑ 9 Sep (HOUSE-009) — QUALIFIED, AND PROVED SO. Entitlement is consumed by M&V's own
      // verdict, so a candidate that verdict REFUSED must be impossible to enrol: it is not a
      // person the customer bought, it was never surfaced, and outreach to it would be
      // outreach to somebody we ourselves ruled out. Both halves are asserted because they are
      // written together and exactly one is ever set — a row carrying both is corrupt.
      .not('qualified_at', 'is', null)
      .is('disqualified_at', null)
      // ⚑ 8 Sep — THE CURRENT BATCH. Positive, from `leads.batch_id`, which the sourcing run
      // stamps on exactly the people it bought. No older programme batch may enter this set.
      .eq('batch_id', currentBatchId)
      .not('delivered_at', 'is', null)
      .not('surfaced_for_approval_at', 'is', null)
    const { data: page, error: pageErr } = await (after === null ? pageBase : pageBase.gt('id', after))
      .order('id', { ascending: true })
      .limit(PAGE)
    if (pageErr) { out.problems.push(`Could not read the programme's leads (${pageErr.message}).`); return out }
    const rows = (page ?? []) as {
      id: string; email: string | null; status: string | null
      opted_out_at: string | null; provider_eviction_required_at: string | null
      apollo_consented: boolean | null
    }[]
    if (rows.length === 0) break
    after = rows[rows.length - 1].id

    // ── ELIGIBILITY, FROM THE EXISTING RULES ONLY ──────────────────────────────────────
    //
    // 🛑 NO PARALLEL SUPPRESSION SEMANTICS ARE INVENTED HERE. Each condition is one the
    // product already treats as permanently disqualifying:
    //   • `status` opted_out / rejected / passed — the client or the engine has disposed of it
    //   • `opted_out_at`                          — the person asked us to stop
    //   • `provider_eviction_required_at`         — we owe a provider a removal for this person
    //   • no email                                — `autoEnrollLead` cannot enrol them anyway
    // Anything excluded here would otherwise become an ACTIVE enrolment for somebody already
    // known to be permanently ineligible, which is the thing that must never be manufactured.
    const candidates = rows.filter(r => {
      if (!r.email) return false
      if (r.status === 'opted_out' || r.status === 'rejected' || r.status === 'passed') return false
      if (r.opted_out_at) return false
      if (r.provider_eviction_required_at) return false
      // ── ⚑ 8 Sep — THE EMAIL IS RE-PROVED HERE, NOT ASSUMED FROM DELIVERY ────────────────
      //
      // 🛑 "SOMETHING EARLIER PROBABLY CHECKED IT" IS NOT A CHECK. The Wednesday House policy
      // is a VERIFIED BUSINESS address and no personal fallback, and the row is what has to
      // satisfy it at the moment it is prepared — a lead can be edited, imported or reached by
      // a path whose gate differed.
      //
      // ⚠️ NO NEW COLUMN. `isBusinessEmail` is the same pure predicate `finalVerdict` uses, and
      // `leads.apollo_consented` is the existing "provider-VERIFIED email" marker, written true
      // only after that final gate passed. Inventing a second verification store would create
      // exactly the dual truth the sequence store just had to be rescued from.
      if (!isBusinessEmail(r.email)) return false
      if (r.apollo_consented !== true) return false
      return true
    })
    out.skipped += rows.length - candidates.length
    if (candidates.length === 0) continue

    // 🛑 THE CROSS-CLIENT BLOCKLIST, checked per page against the SAME table the send path
    // uses. A person who opted out through any client is suppressed for all of them, and that
    // fact lives in `opt_out_blocklist` rather than on the lead row.
    // ⚠️ NORMALISED, NOT `.toLowerCase()` — HC-1. The blocklist is deduped on a normalised
    // address, so a raw comparison can miss a case- or dot-variant of somebody who opted out.
    // `blocklist-case.test.ts` enforces this on every probe in the repo, and it caught this one.
    const programmeEmails = normalizeRevealEmails(candidates.map(c => c.email))
    const blocked = new Set<string>()
    if (programmeEmails.length > 0) {
      const { data: bl, error: blErr } = await db.from('opt_out_blocklist')
        .select('email').in('email', programmeEmails)
      // ⚠️ FAIL CLOSED. Not knowing whether somebody opted out is not permission to enrol them.
      if (blErr) { out.problems.push(`Could not read the opt-out blocklist (${blErr.message}). Nothing further was enrolled.`); return out }
      for (const b of (bl ?? []) as { email: string | null }[]) {
        const k = normalizeRevealEmail(b.email)
        if (k) blocked.add(k)
      }
    }

    const eligible = candidates.filter(c => { const k = normalizeRevealEmail(c.email); return !k || !blocked.has(k) })
    out.skipped += candidates.length - eligible.length
    out.total += eligible.length
    if (eligible.length === 0) continue

    // Already-enrolled leads are skipped rather than re-enrolled — this runs again on every
    // retry and on a second Make live.
    //
    // ── ⛓️ 9 Sep — SCOPED TO **THIS PROGRAMME**, AND IT WAS NOT ─────────────────────────
    //
    // 🛑 THE SILENT HALF OF THE HOUSE FAILURE. This asked only "does ANY enrolment row exist
    // for this lead" — client-wide, no programme filter. House carries ~263 legacy enrolments
    // from the retired per-lead desk, every one with `programme_id = NULL`. For each of those
    // leads the answer was yes, the lead was counted as `alreadyEnrolled`, and **no programme
    // enrolment was ever created**.
    //
    // Readiness and the review snapshot both count `figsy_enrollments.programme_id = <this
    // programme>` — correctly — so the two sides could never agree: preparation reported the
    // work done, readiness reported no eligible enrolments, and nothing named the disagreement.
    // A legacy row proves a person was once worked by a retired model; it says nothing about
    // this programme, and it must never be adopted as if it did.
    const existing = new Set<string>()
    const { data: enr, error: enrErr } = await db.from('figsy_enrollments')
      .select('lead_id').eq('programme_id', programmeId).in('lead_id', eligible.map(l => l.id))
    if (enrErr) { out.problems.push(`Could not read existing enrolments (${enrErr.message}).`); return out }
    for (const e of (enr ?? []) as { lead_id: string }[]) existing.add(e.lead_id)

    for (const lead of eligible) {
      if (existing.has(lead.id)) { out.alreadyEnrolled++; continue }
      if (budgetLeft <= 0) { budgetExhausted = true; out.remaining++; continue }
      budgetLeft--
      let outcome
      try {
        // ⚑ 9 Sep — `prepareOnly` FOR THE PRE-APPROVAL STAGE ONLY. It creates the row and
        // attempts no outreach; the per-lead SEND gates that used to abort the enrolment stay
        // exactly where they are, inside the send path. Post-approval (Make live, the paid P2
        // webhook) keeps its existing behaviour byte for byte.
        outcome = await autoEnrollLead(lead.id, p.client_id, {
          programmeFulfilment: { programmeId },
          prepareOnly: stage.stage === 'pre_approval',
        })
      } catch (err) {
        out.failed.push(lead.id)
        out.refusals.threw = (out.refusals.threw ?? 0) + 1
        continue
      }

      // ⚠️ THE OUTCOME IS TRUSTED FOR THE *CAUSE*, AND THE DATABASE FOR THE *FACT*. A refusal
      // names itself now, so a failure is reported by reason instead of by absence — but a
      // 'created' claim is still verified against a row, because #625 is the defect of
      // reporting success from a call that quietly did nothing.
      if (outcome.state === 'refused') {
        out.failed.push(lead.id)
        out.refusals[outcome.code] = (out.refusals[outcome.code] ?? 0) + 1
        continue
      }
      // 🛑 SCOPED, LIKE THE CHECK ABOVE. `.eq('lead_id', …)` alone would find one of House's
      // legacy NULL-programme rows and report a programme enrolment that does not exist.
      const { data: made } = await db.from('figsy_enrollments')
        .select('id').eq('programme_id', programmeId).eq('lead_id', lead.id).limit(1).maybeSingle()
      if (made) {
        if (outcome.state === 'already') out.alreadyEnrolled++
        else out.enrolled.push(lead.id)
      } else {
        out.failed.push(lead.id)
        out.refusals.no_row_after_attempt = (out.refusals.no_row_after_attempt ?? 0) + 1
      }
    }
    if (rows.length < PAGE) break
  }

  // ── 🛑 A BUDGET THAT RAN OUT MUST SAY WHAT IS LEFT, NOT STOP COUNTING ────────────────
  //
  // ⚠️ THIS WAS A REAL BUG, and it was invisible until the test fake honoured `limit`. The
  // loop broke out the moment the budget hit zero, so every row after the cursor was never
  // seen — `total` stopped growing, `remaining` read 0, and `complete` could come out TRUE
  // with hundreds of prospects unprepared. That is precisely the silent truncation this file
  // exists to prevent, reintroduced by the bound meant to prevent it.
  //
  // A head count is used rather than another read of the rows: it answers "how many are still
  // out there" without loading them, and it is deliberately an UPPER BOUND — it applies the
  // cheap filters only, so a row that would later prove suppressed still counts here. Over-
  // reporting what is left is safe; under-reporting it is the failure.
  if (budgetExhausted) {
    const leftBase = db.from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('programme_id', programmeId)
      .eq('client_id', p.client_id)
      .not('delivered_at', 'is', null)
      // ⚠️ THE SAME POPULATION THE LOOP READ. An upper bound is safe; a bound over a WIDER set
      // is not — counting never-surfaced leads here would leave `remaining > 0` permanently and
      // make LIVE unreachable for a programme that is in fact fully prepared.
      .not('surfaced_for_approval_at', 'is', null)
      // ⚑ 9 Sep — AND M&V's VERDICT, for the same reason the line above exists. If the head
      // count admitted candidates the page cannot enrol, `remaining` would never reach zero
      // and a fully prepared programme could never be complete.
      .not('qualified_at', 'is', null)
      .is('disqualified_at', null)
    // ⚑ 9 Sep — the same cursor discipline as the loop. This branch only runs after rows were
    // consumed, so `after` is always a real id here; the guard is structural rather than
    // corrective, so no future edit can reintroduce `id > ''` by shortening the path to it.
    const { count: left, error: leftErr } = await (after === null ? leftBase : leftBase.gt('id', after))
    if (leftErr) {
      // Cannot count ⇒ cannot claim completeness. Fail closed on the number, not on the work.
      out.problems.push(`Preparation reached its budget and the outstanding count could not be read (${leftErr.message}).`)
      out.remaining = Math.max(out.remaining, 1)
    } else {
      out.remaining += left ?? 0
    }
    out.problems.push(
      `Preparation reached its budget of ${PREPARE_BUDGET} prospect(s) in one run. ` +
      'The programme is NOT live. Press Make live again to continue — preparation is idempotent and resumes where it stopped.',
    )
  }

  // ── ⚑ 9 Sep — ONE SUMMARY LINE PER CAUSE, NOT ONE LINE PER PROSPECT ─────────────────────
  //
  // 🛑 WHAT THE FOUNDER WAS HANDED. Preparation pushed a problem line for every prospect it
  // could not enrol — the same sentence, over and over, naming no cause. That is not a report,
  // it is one fact printed many times, and it hid the single thing he needed to know.
  //
  // ⚠️ THE EVIDENCE IS NOT HIDDEN, IT IS MOVED. Every failed lead id stays in `failed`, which
  // the background runner writes into the operator audit row; the desk gets counts and causes.
  if (out.failed.length > 0) {
    const causes = Object.entries(out.refusals)
      .sort((a, b) => b[1] - a[1])
      .map(([code, n]) => `${n} × ${ENROL_REFUSAL_TEXT[code] ?? code}`)
      .join(' · ')
    out.problems.push(
      `${out.failed.length} of ${out.total} prospect(s) could not be enrolled. Nothing was sent. ` +
      (causes ? `Causes: ${causes}.` : ''),
    )
  }

  // 🛑 ANYTHING LEFT MEANS NOT COMPLETE, AND NOT COMPLETE MEANS NOT LIVE.
  out.remaining += out.failed.length
  const prepared = out.enrolled.length + out.alreadyEnrolled
  if (out.total > 0 && prepared < out.total) out.remaining = Math.max(out.remaining, out.total - prepared)
  out.complete = out.problems.length === 0 && out.remaining === 0 && prepared > 0
  if (prepared === 0 && out.problems.length === 0) {
    out.problems.push('No eligible programme lead was found to enrol, so this programme has nothing to send.')
  }
  out.ok = out.complete
  return out
}
