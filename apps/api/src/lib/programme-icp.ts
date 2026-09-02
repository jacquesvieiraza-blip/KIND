// ═══════════════════════════════════════════════════════════════════════════════════════
// PROGRAMME ↔ ICP — THE MISSING FIRST LINK IN POSITIVE ATTRIBUTION
//
// ── WHAT WAS BROKEN ─────────────────────────────────────────────────────────────────────
//
// `icps.programme_id` was added on 29 Aug and `runIcpJob` reads it to decide whether a
// sourcing run IS programme delivery. The comment on that migration says exactly why it
// lives on the ICP and not the client: *"a programme may contain SEVERAL ICPs … deriving it
// from the client would guess when a client has more than one."*
//
// 🛑 NOTHING EVER WROTE IT. The column and its readers shipped; the writer did not. Every
// ICP in the database has `programme_id = NULL`, so every sourcing run resolves as legacy,
// every lead is stamped with nothing, and every enrollment copies that nothing. This is the
// same shape as #383 (an RPC written and never registered) and #558 (a column written by
// code that no migration creates) — a half of a mechanism that reads as if it works.
//
// The consequence is not cosmetic. It creates an impossible pair for a programme client:
//
//   • without positive attribution, the client's LEGACY history inherits the new programme
//     and can be sent to — House's 263 old enrollments, each with a real person at the end;
//   • with positive attribution, that history is correctly refused, but the programme's OWN
//     new work is refused too, because it is also NULL.
//
// Neither is shippable. This module is the writer that makes the second one work.
//
// ── WHY A DEDICATED ACTION AND NOT A FIELD ──────────────────────────────────────────────
//
// ⚠️ `programme_id` IS DELIBERATELY NOT EDITABLE THROUGH ANY GENERIC ICP DOOR. `POST /icps`
// parses through a zod object that has no such key, so unknown keys are stripped; the
// operator ICP editor writes a fixed nine-field payload. Both stay that way. An attribution
// key that any edit form can set is an attribution key that gets set by accident, and a lead
// attributed by accident is worse than one attributed to nothing.
//
// This function is the ONLY writer, and it is an explicit, audited, per-ICP decision.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import { getProgramme, TERMINAL_STATUSES, type ProgrammeStatus } from './programme'

/**
 * The programme states in which an ICP may still be attached.
 *
 * ⚠️ IT STOPS AT CLIENT REVIEW. Once a programme reaches READY_FOR_APPROVAL the client is
 * being asked to approve a specific body of work; widening what feeds that programme while
 * they are looking at it would change the thing under review after it was handed over. Later
 * states are the same argument with money attached.
 */
export const ICP_ATTACHABLE_STATUSES: ProgrammeStatus[] = [
  'DRAFT', 'RECOMMENDED', 'AWAITING_FIRST_PAYMENT', 'SOURCING_AUTHORISED', 'SOURCING',
]

export type IcpRow = {
  id: string
  client_id: string
  name: string | null
  is_active: boolean
  programme_id: string | null
}

export type AttachResult =
  | { ok: true; alreadyAttached?: boolean; icp: { id: string; name: string | null } }
  | { ok: false; reason: string }

/**
 * Attach ONE ICP to ONE programme. The only thing in the product that writes
 * `icps.programme_id`.
 *
 * ⚠️ IT WRITES EXACTLY ONE COLUMN ON EXACTLY ONE ROW. No lead, enrollment, campaign, meeting,
 * ledger, wallet or report is touched — history is never retroactively reclassified, and the
 * regression test for that is explicit. Attaching changes what FUTURE sourcing produces and
 * nothing about what past sourcing produced.
 */
export async function attachIcpToProgramme(programmeId: string, icpId: string): Promise<AttachResult> {
  const p = await getProgramme(programmeId)
  if (!p) return { ok: false, reason: 'No such programme.' }
  if (TERMINAL_STATUSES.includes(p.status)) {
    return { ok: false, reason: `This programme is ${p.status}, so no ICP may be attached to it.` }
  }
  if (p.paused_at) {
    return { ok: false, reason: 'This programme is paused. Resume it before changing what feeds it.' }
  }
  if (!ICP_ATTACHABLE_STATUSES.includes(p.status)) {
    return {
      ok: false,
      reason: `This programme is ${p.status}. An ICP may only be attached before the client review — attaching now would change the work the client is being asked to approve.`,
    }
  }

  const { data, error } = await db.from('icps')
    .select('id, client_id, name, is_active, programme_id').eq('id', icpId).maybeSingle()
  // A read error is "we cannot tell", never "no such ICP".
  if (error) return { ok: false, reason: `Could not read that ICP, so nothing was changed. (${error.message})` }
  if (!data) return { ok: false, reason: 'No such ICP.' }
  const icp = data as unknown as IcpRow

  // 🛑 TENANCY. An ICP reached by id must belong to the programme's own client. Without this,
  // one client's programme could take ownership of another client's targeting — and every
  // lead it then sourced would be attributed across a tenant boundary.
  if (icp.client_id !== p.client_id) {
    return { ok: false, reason: 'That ICP belongs to a different client. Nothing was changed.' }
  }

  // Idempotent: the same attach twice is a success that writes nothing.
  if (icp.programme_id === programmeId) {
    return { ok: true, alreadyAttached: true, icp: { id: icp.id, name: icp.name } }
  }

  // 🛑 NEVER SILENTLY REASSIGN. An ICP already pointing at another programme is refused, not
  // moved: its existing leads carry that programme's id, and re-pointing it would make the
  // two programmes' future work indistinguishable while leaving their history split.
  // Detach/transfer are deliberate post-launch decisions, not a side effect of a second press.
  if (icp.programme_id) {
    return {
      ok: false,
      reason: `That ICP already belongs to programme ${icp.programme_id.slice(0, 8)}. An ICP is never moved between programmes here — its existing leads carry the other programme's id.`,
    }
  }

  // ── 🛑 AN ICP THAT ALREADY HAS A CAMPAIGN MAY NOT JOIN A PROGRAMME ────────────────────
  //
  // THE DEFECT THIS CLOSES, AND IT IS THE ONE I PREVIOUSLY CLAIMED WAS IMPOSSIBLE.
  // "One ICP = one campaign, so an ICP-matched campaign is programme-correct by
  // construction" is FALSE. Two facts break it:
  //
  //   ① There is NO unique index on `figsy_campaigns (client_id, icp_id)` — only
  //      `figsy_campaigns_client_id_idx` and `_status_idx` (002_figsy.sql). "One campaign per
  //      ICP" is a convention `ensureCampaignForIcp` maintains, never a database invariant.
  //   ② `ensureCampaignForIcp` REUSES what it finds: given an existing campaign for that ICP
  //      it returns it, and if that campaign is paused it RE-ACTIVATES it. It does not create
  //      a new one.
  //
  // So attaching a HISTORICAL ICP would have meant: at Go Live the programme re-activates the
  // ICP's pre-programme campaign, and `autoEnrollLead`'s PRIMARY lookup
  // (`client_id + icp_id + active`) hands that old campaign — and its old sequence — to a
  // brand-new, correctly-attributed programme lead. The legacy-fallback fence in `figsy.ts`
  // does not help: the primary lookup succeeds, so the fallback never runs.
  //
  // ⚠️ REFUSING AT ATTACH IS WHAT MAKES THE INVARIANT STRUCTURAL. An ICP that had no campaign
  // when it joined can only ever acquire one afterwards, from `ensureCampaignForIcp`, which is
  // gated by programme authority. So the campaign found by ICP genuinely IS the programme's.
  //
  // ⚠️ AND NOTHING HISTORICAL IS TOUCHED. The alternative — retiring or rewriting the old
  // campaign — would mutate history and could strand its existing enrolments. This refuses
  // instead, and says what to do: give the programme its own ICP.
  const { data: existingCampaigns, error: campErr } = await db.from('figsy_campaigns')
    .select('id, name, status').eq('client_id', p.client_id).eq('icp_id', icpId).limit(1)
  // "We cannot tell" is not "there is none" — on this question a wrong yes hands a programme
  // a pre-programme sequence.
  if (campErr) {
    return { ok: false, reason: `Could not check this ICP's existing campaigns, so nothing was changed. (${campErr.message})` }
  }
  const priorCampaign = (existingCampaigns ?? [])[0] as { id: string; name: string | null; status: string } | undefined
  if (priorCampaign) {
    return {
      ok: false,
      reason:
        `This ICP already has a campaign from before the programme ("${priorCampaign.name ?? 'Outbound campaign'}", ${priorCampaign.status}). ` +
        'Attaching it would let the programme re-use that campaign and its sequence for new programme work. ' +
        'Create a new ICP for this programme and attach that instead — the existing ICP and its campaign are left exactly as they are.',
    }
  }

  // ⚠️ COMPARE-AND-SET on `programme_id` being null, so two operators pressing at once cannot
  // both win, and the loser updates zero rows rather than overwriting.
  const { data: updated, error: upErr } = await db.from('icps')
    .update({ programme_id: programmeId, updated_at: new Date().toISOString() })
    .eq('id', icpId).is('programme_id', null).select('id, name')
  if (upErr) return { ok: false, reason: `Could not attach that ICP — it is unchanged. (${upErr.message})` }
  if (!updated || updated.length === 0) {
    return { ok: false, reason: 'That ICP was attached to a programme by someone else a moment ago. Nothing was changed.' }
  }
  const row = (updated as { id: string; name: string | null }[])[0]
  return { ok: true, icp: { id: row.id, name: row.name } }
}

/**
 * What Vida needs to render the programme's ICP section: which ICPs already feed this
 * programme, and which of the client's remaining ICPs could.
 *
 * ⚠️ "ELIGIBLE" MEANS UNATTACHED, NOT "EVERY OTHER ICP". An ICP already pointing at another
 * programme is neither attached here nor offerable, so it appears in neither list — offering
 * it would present a button whose only possible outcome is a refusal.
 */
export async function programmeIcps(clientId: string, programmeId: string | null): Promise<{
  attached: IcpRow[]
  eligible: IcpRow[]
  unreadable: boolean
}> {
  const { data, error } = await db.from('icps')
    .select('id, client_id, name, is_active, programme_id')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(200)
  // Honest emptiness: a failed read must not render as "this client has no ICPs", which is
  // the sentence an operator would act on.
  if (error || !data) return { attached: [], eligible: [], unreadable: true }
  const rows = data as unknown as IcpRow[]
  return {
    attached: programmeId ? rows.filter(r => r.programme_id === programmeId) : [],
    eligible: rows.filter(r => r.programme_id === null),
    unreadable: false,
  }
}
