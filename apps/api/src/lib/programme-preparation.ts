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
import { getProgramme, TERMINAL_STATUSES, p2Authorised, type ProgrammeRow } from './programme'

/** Statuses in which outreach preparation is meaningful. */
const PREPARABLE: string[] = ['APPROVED', 'LIVE']

export type PrepareResult = {
  ok: boolean
  /** Campaign ids now available, one per attached ICP. */
  campaigns: string[]
  /** Leads that gained a programme enrolment on THIS run. */
  enrolled: string[]
  /** Leads already enrolled — counted, never re-enrolled. */
  alreadyEnrolled: number
  /** Everything that could not be completed. A non-empty list means NOT fully operable. */
  problems: string[]
}

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
    .select('id, client_id, icp_id, programme_id').eq('id', leadId).maybeSingle()
  if (leadErr) return { ok: false, reason: `lead read failed: ${leadErr.message}` }
  if (!lead) return { ok: false, reason: 'no such lead' }
  const l = lead as { client_id: string | null; icp_id: string | null; programme_id: string | null }

  // 🛑 POSITIVE ATTRIBUTION. A null-attributed lead is history — House carries ~166 of them —
  // and history is never fulfilment for a programme that did not source it.
  if (!l.programme_id) return { ok: false, reason: 'lead carries no programme attribution' }
  if (l.programme_id !== programmeId) return { ok: false, reason: 'lead belongs to a different programme' }
  if (l.client_id !== clientId) return { ok: false, reason: 'lead belongs to a different client' }

  const p = await getProgramme(programmeId)
  if (!p) return { ok: false, reason: 'no such programme' }
  if (p.client_id !== clientId) return { ok: false, reason: 'programme belongs to a different client' }
  if (TERMINAL_STATUSES.includes(p.status)) return { ok: false, reason: `programme is ${p.status}` }
  if (p.paused_at) return { ok: false, reason: 'programme is paused' }
  if (!p.approved_at) return { ok: false, reason: 'programme has no approval recorded' }
  if (!PREPARABLE.includes(p.status)) return { ok: false, reason: `programme is ${p.status}, not APPROVED or LIVE` }
  // Either source of P2 — a payment or internal authority — and nothing weaker.
  if (!p2Authorised(p)) return { ok: false, reason: 'programme has no P2 authority' }

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
  const out: PrepareResult = { ok: false, campaigns: [], enrolled: [], alreadyEnrolled: 0, problems: [] }

  const p = await getProgramme(programmeId)
  if (!p) { out.problems.push('No such programme.'); return out }
  if (TERMINAL_STATUSES.includes(p.status)) { out.problems.push(`This programme is ${p.status}.`); return out }
  if (p.paused_at) { out.problems.push('This programme is paused.'); return out }
  if (!p.approved_at) { out.problems.push('This programme has no approval recorded.'); return out }
  if (!PREPARABLE.includes(p.status)) { out.problems.push(`This programme is ${p.status}, not APPROVED or LIVE.`); return out }
  if (!p2Authorised(p)) { out.problems.push('This programme has no P2 authority.'); return out }

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
    const camp = await ensureCampaignForIcp(p.client_id, icp.id, icp.name, { activate: true })
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
  // ⚠️ SELECTED BY POSITIVE ATTRIBUTION, never by client. `programme_id = this programme` is
  // the whole filter — House's ~166 historical leads carry NULL and are not in this set at
  // all, so they cannot be enrolled by a bug in a later condition.
  //
  // The eligibility conditions are the existing ones, not new ones: delivered (a contactable
  // person), not opted out, not rejected, not already worked.
  const { data: leadRows, error: leadErr } = await db.from('leads')
    .select('id, status')
    .eq('programme_id', programmeId)
    .eq('client_id', p.client_id)
    .not('delivered_at', 'is', null)
    .not('status', 'in', '(opted_out,rejected,passed)')
    .limit(2000)
  if (leadErr) { out.problems.push(`Could not read the programme's leads (${leadErr.message}).`); return out }
  const leads = (leadRows ?? []) as { id: string }[]

  // Already-enrolled leads are skipped rather than re-enrolled — this runs again on every
  // retry and on a second Make Live.
  const existing = new Set<string>()
  if (leads.length > 0) {
    const { data: enr, error: enrErr } = await db.from('figsy_enrollments')
      .select('lead_id').in('lead_id', leads.map(l => l.id))
    if (enrErr) { out.problems.push(`Could not read existing enrolments (${enrErr.message}).`); return out }
    for (const e of (enr ?? []) as { lead_id: string }[]) existing.add(e.lead_id)
  }

  const { autoEnrollLead } = await import('./figsy')
  for (const lead of leads) {
    if (existing.has(lead.id)) { out.alreadyEnrolled++; continue }
    try {
      await autoEnrollLead(lead.id, p.client_id, { programmeFulfilment: { programmeId } })
    } catch (err) {
      out.problems.push(`Lead ${lead.id.slice(0, 8)} could not be enrolled: ${err instanceof Error ? err.message : String(err)}`)
      continue
    }
    // ⚠️ VERIFIED, NEVER ASSUMED. `autoEnrollLead` returns void and several of its refusals
    // are a bare `return` — #625 is exactly the defect of reporting success from a call that
    // quietly did nothing. A "worked" verdict here means a row exists.
    const { data: made } = await db.from('figsy_enrollments')
      .select('id').eq('lead_id', lead.id).limit(1).maybeSingle()
    if (made) out.enrolled.push(lead.id)
    else out.problems.push(`Lead ${lead.id.slice(0, 8)} was not enrolled — no enrolment row exists after the attempt.`)
  }

  out.ok = out.problems.length === 0 && (out.enrolled.length + out.alreadyEnrolled) > 0
  if (out.enrolled.length + out.alreadyEnrolled === 0 && out.problems.length === 0) {
    out.problems.push('No eligible programme lead was found to enrol, so this programme has nothing to send.')
  }
  return out
}
