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
import { normalizeRevealEmail, normalizeRevealEmails } from './billing-rules'

/** Statuses in which outreach preparation is meaningful. */
const PREPARABLE: string[] = ['APPROVED', 'LIVE']

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
  if (!p.approved_at) return { ok: false, reason: 'programme has no approval recorded' }
  if (!PREPARABLE.includes(p.status)) return { ok: false, reason: `programme is ${p.status}, not APPROVED or LIVE` }
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
    // ⚑ `goingLive` carries the authority this programme already holds; `ensureCampaignForIcp`
    // re-proves it rather than believing it. Idempotent: an existing campaign is returned.
    const camp = await ensureCampaignForIcp(p.client_id, icp.id, icp.name, {
      activate: true, goingLive: { programmeId },
    })
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
  // ⚠️ KEYSET PAGINATION ON `id`, NOT `.limit(2000)`. A programme is sized at 250 prospects
  // per targeted meeting (R77), so ten meetings is 2,500 people — the previous single-page
  // limit would have prepared 2,000 of them and called the programme operable. Pages are
  // ordered by `id` and each asks for rows STRICTLY AFTER the last one seen, so a page can
  // neither overlap nor skip, and an enrolment written mid-run cannot shift the window.
  //
  // ⚠️ EVERY PAGE RE-APPLIES THE FULL FILTER — `programme_id` AND `client_id`. Narrowing on
  // the first page only is how a paginated query drifts into another tenant.
  const { autoEnrollLead } = await import('./figsy')
  let after = ''
  let budgetLeft = PREPARE_BUDGET
  // ⚠️ A PAGE BOUND AS WELL AS A ROW BUDGET. The loop advances by keyset cursor, so a cursor
  // that failed to advance — a bug, or a page of rows whose ids sort unexpectedly — would spin
  // forever inside a Stripe webhook. Found by mutating `gt('id', after)` to a constant, which
  // hung the suite rather than failing it: a mutation that hangs is one the RED proof cannot
  // report, so the bound is the fix and the proof.
  let pagesLeft = Math.ceil(PREPARE_BUDGET / PAGE) + 2

  for (;;) {
    if (budgetLeft <= 0) break
    if (pagesLeft-- <= 0) {
      out.problems.push('Preparation stopped after its page budget — the lead cursor did not advance. Nothing further was enrolled.')
      break
    }
    const { data: page, error: pageErr } = await db.from('leads')
      .select('id, email, status, opted_out_at, provider_eviction_required_at')
      .eq('programme_id', programmeId)
      .eq('client_id', p.client_id)
      .not('delivered_at', 'is', null)
      .gt('id', after)
      .order('id', { ascending: true })
      .limit(PAGE)
    if (pageErr) { out.problems.push(`Could not read the programme's leads (${pageErr.message}).`); return out }
    const rows = (page ?? []) as {
      id: string; email: string | null; status: string | null
      opted_out_at: string | null; provider_eviction_required_at: string | null
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
      if (budgetLeft <= 0) { out.remaining++; continue }
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

  // 🛑 ANYTHING LEFT MEANS NOT COMPLETE, AND NOT COMPLETE MEANS NOT LIVE. A budget exhausted
  // mid-programme is reported, never rounded up into success — 2,500 eligible and 2,000
  // prepared is exactly the silent truncation this replaces.
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
