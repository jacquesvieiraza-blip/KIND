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
