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

export type PrepareResult = {
  /** Fully prepared: every eligible lead enrolled, nothing outstanding, no problems. */
  ok: boolean
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
    .select('id, client_id, icp_id, programme_id, surfaced_for_approval_at').eq('id', leadId).maybeSingle()
  if (leadErr) return { ok: false, reason: `lead read failed: ${leadErr.message}` }
  if (!lead) return { ok: false, reason: 'no such lead' }
  const l = lead as {
    client_id: string | null; icp_id: string | null; programme_id: string | null
    surfaced_for_approval_at: string | null
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
    ok: false, complete: false, remaining: 0, total: 0,
    campaigns: [], enrolled: [], alreadyEnrolled: 0, skipped: 0, failed: [], problems: [],
  }

  const p = await getProgramme(programmeId)
  if (!p) { out.problems.push('No such programme.'); return out }
  const stage = preparationStageFor(p)
  if (!stage.ok) { out.problems.push(`This programme cannot be prepared: ${stage.reason}.`); return out }

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
  const chainRes = await resolveProgrammeChain(programmeId)
  if (!chainRes.ok) { out.problems.push(chainRes.degraded); return out }
  if (!chainRes.chain.sequenceId || chainRes.chain.steps.length === 0) {
    out.problems.push('This programme has no canonical sequence with message steps (programme → ICP → campaign → figsy_sequences), so no prospect can be prepared. Nothing was enrolled.')
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
  let after = ''
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
    const { data: page, error: pageErr } = await db.from('leads')
      .select('id, email, status, opted_out_at, provider_eviction_required_at, apollo_consented')
      .eq('programme_id', programmeId)
      .eq('client_id', p.client_id)
      // ⚑ 8 Sep — THE CURRENT BATCH. Positive, from `leads.batch_id`, which the sourcing run
      // stamps on exactly the people it bought. No older programme batch may enter this set.
      .eq('batch_id', currentBatchId)
      .not('delivered_at', 'is', null)
      .not('surfaced_for_approval_at', 'is', null)
      .gt('id', after)
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
    const existing = new Set<string>()
    const { data: enr, error: enrErr } = await db.from('figsy_enrollments')
      .select('lead_id').in('lead_id', eligible.map(l => l.id))
    if (enrErr) { out.problems.push(`Could not read existing enrolments (${enrErr.message}).`); return out }
    for (const e of (enr ?? []) as { lead_id: string }[]) existing.add(e.lead_id)

    for (const lead of eligible) {
      if (existing.has(lead.id)) { out.alreadyEnrolled++; continue }
      if (budgetLeft <= 0) { budgetExhausted = true; out.remaining++; continue }
      budgetLeft--
      try {
        await autoEnrollLead(lead.id, p.client_id, { programmeFulfilment: { programmeId } })
      } catch (err) {
        out.failed.push(lead.id)
        out.problems.push(`Lead ${lead.id.slice(0, 8)} could not be enrolled: ${err instanceof Error ? err.message : String(err)}`)
        continue
      }
      // ⚠️ VERIFIED, NEVER ASSUMED. `autoEnrollLead` returns void and several of its refusals
      // are a bare `return` — #625 is exactly the defect of reporting success from a call that
      // quietly did nothing. A "worked" verdict here means a row exists.
      const { data: made } = await db.from('figsy_enrollments')
        .select('id').eq('lead_id', lead.id).limit(1).maybeSingle()
      if (made) out.enrolled.push(lead.id)
      else {
        out.failed.push(lead.id)
        out.problems.push(`Lead ${lead.id.slice(0, 8)} was not enrolled — no enrolment row exists after the attempt.`)
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
    const { count: left, error: leftErr } = await db.from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('programme_id', programmeId)
      .eq('client_id', p.client_id)
      .not('delivered_at', 'is', null)
      // ⚠️ THE SAME POPULATION THE LOOP READ. An upper bound is safe; a bound over a WIDER set
      // is not — counting never-surfaced leads here would leave `remaining > 0` permanently and
      // make LIVE unreachable for a programme that is in fact fully prepared.
      .not('surfaced_for_approval_at', 'is', null)
      .gt('id', after)
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
