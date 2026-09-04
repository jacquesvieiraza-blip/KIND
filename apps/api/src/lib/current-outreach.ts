// ═══════════════════════════════════════════════════════════════════════════════════════
// WHOSE OUTREACH IS THIS CLIENT'S **CURRENT** OUTREACH?
//
// ── WHY THIS MODULE EXISTS AT ALL ───────────────────────────────────────────────────────
//
// `currentWorkspaceScope` answers WHICH RULE APPLIES. Four separate customer surfaces then
// need the same second step — *"and which leads does that rule admit?"* — and on 3 Sep an
// enumeration found every one of them still answering it with `client_id` alone:
//
//   · Replies    `/figsy/replies/all`   newest 200 replies, client-scoped
//   · Pipeline   `/leads/pipeline`      every lead ever `revealed_at`, client-scoped
//   · Meetings   `/leads/meetings`      every `calendar_bookings` row, client-scoped
//   · Teams Hub  `/leads/stats`, `/figsy/kpis`   lifetime counts presented as activity
//
// 🛑 THE REPLIES ONE IS THE PROOF THAT A PER-SURFACE FIX IS NOT A FIX. `recentRepliesFor`
// bounded the Home rail over `figsy_replies` on 3 Sep and the founder confirmed the historical
// reply had gone. The REPLIES PAGE reads the same table, one click away in the same rail, and
// was left unbounded — so the reply he watched disappear was still fully readable, beside a
// badge that now correctly said zero. Two surfaces, one table, one bounded.
//
// ⚠️ SO THE RULE LIVES HERE ONCE. Five call sites deriving it from memory is exactly how the
// first four came to disagree, and `meeting-truth.ts` already carries the same lesson in its
// own words: "six call sites each applying them from memory is the drift this module exists
// to end".
//
// ── THE RULE ────────────────────────────────────────────────────────────────────────────
//
//   programme  → the leads POSITIVELY attributed to that programme, and nothing else.
//   proof      → NONE. Free proof is calibration, not outreach (R91): it sends nobody an
//                email and books nobody, so any reply, contact or meeting readable for a
//                proof-scoped client is by construction an earlier motion's.
//   legacy     → the whole client, exactly as it always was. The retired book keeps
//                everything it has; nothing about their screens changes.
//   unreadable → reported as itself. Each caller degrades it the way its SIBLING surface
//                already does — the replies page fails soft because the replies rail does,
//                a metric fails closed because a wrong number is an assertion. That split is
//                deliberate and pre-existing; flattening it into one boolean here would
//                silently change one of them.
//
// ⚠️ NOTHING HERE INFERS. Not from `revealed_at`, not from the newest row, not from a null
// programme, not from an old payment, not from a proof counter. `client_id` alone is never
// enough for a programme-model customer, and an absence is never a positive fact.
//
// ⚠️ AND NOTHING HERE WRITES. Every historical row stays exactly where it is and remains
// readable by every operator surface in Vida; what changes is only which rows a customer's
// CURRENT screens claim as current.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'

/**
 * What a current-outreach surface may show for this client.
 *
 * ⚠️ FOUR ANSWERS, NOT A NULLABLE ID LIST. `none` and an empty `ids` look identical in a
 * query and mean different things to a reader; `client` and `unreadable` are opposite facts
 * that a nullable list would collapse. Every conflation this repo has paid for since 25 Jul
 * has been a nullable value standing in for a state.
 */
export type CurrentOutreach =
  /** An open programme. Only these lead ids are current work. May legitimately be empty. */
  | { mode: 'ids'; ids: string[]; programmeId: string }
  /** Legacy or unclassified — the whole client, unchanged. */
  | { mode: 'client' }
  /** A calibration workspace, or none at all. There is no current outreach to show. */
  | { mode: 'none' }
  /** The model or the lead read failed. The caller decides how to degrade. */
  | { mode: 'unreadable'; reason: string }

/**
 * Resolve which leads a current-outreach surface may speak for.
 *
 * ⚠️ IT ASKS `currentWorkspaceScope`, NOT THE PROGRAMME TABLE. That module already resolves
 * the commercial model AND the open programme in one read and carries every fail-closed rule
 * this needs — including the declared-legacy-with-an-open-programme conflict. A second
 * resolver here would be a second truth, which is the defect one layer up.
 */
export async function currentOutreachLeads(clientId: string): Promise<CurrentOutreach> {
  if (!clientId) return { mode: 'unreadable', reason: 'no client id' }

  const { currentWorkspaceScope } = await import('./current-workspace')
  const scope = await currentWorkspaceScope(clientId)

  if (scope.kind === 'unreadable') return { mode: 'unreadable', reason: scope.reason }
  if (scope.kind === 'legacy')     return { mode: 'client' }
  // 🛑 CALIBRATION IS NOT OUTREACH (R91). This covers BOTH the genuine free-proof prospect and
  // the declared programme client between programmes — they are the same scope, and neither
  // has outreach. Proof cards are a different surface and are unaffected.
  if (scope.kind === 'proof')      return { mode: 'none' }

  const programmeId = scope.programmeId
  const { data, error } = await db.from('leads')
    .select('id').eq('client_id', clientId).eq('programme_id', programmeId)
  if (error) return { mode: 'unreadable', reason: `programme leads unreadable: ${error.message}` }

  // ⚠️ AN EMPTY LIST IS A REAL ANSWER. A programme with no leads yet has no current outreach,
  // and that is different from "we could not read it" — which is why this is not a null.
  return { mode: 'ids', ids: (data ?? []).map((r: { id: string }) => r.id), programmeId }
}

/**
 * A PostgREST-safe `.in()` argument.
 *
 * ⚠️ AN EMPTY `.in()` IS NOT A NO-OP IN EVERY CLIENT, and a query that quietly drops its only
 * boundary returns the whole client — the failure mode this module exists to prevent. The
 * impossible uuid makes an empty set match nothing, loudly and by construction. The pattern is
 * already used by `/leads/pipeline` and `/leads/coaching`; it is named here so the next caller
 * copies the safe version rather than re-deriving it.
 */
export const NO_LEADS = ['00000000-0000-0000-0000-000000000000']
export function safeIn(ids: string[]): string[] {
  return ids.length > 0 ? ids : NO_LEADS
}

/**
 * The CAMPAIGNS a current-outreach surface may speak for.
 *
 * ⚠️ `figsy_campaigns` HAS NO `programme_id`, so attribution is DERIVED — a campaign belongs
 * to a programme when its ICP does. That is sound rather than convenient:
 * `attachIcpToProgramme` is the only writer of `icps.programme_id` and it REFUSES any ICP that
 * already carries a campaign, so an attached ICP provably had none when it joined and the only
 * campaign it can hold was created after attachment, for that programme. `campaignFor` in
 * `milla-summary.ts` already reasons exactly this way; the derivation lives here so the two
 * cannot drift into two different answers about the same client.
 *
 * ⚠️ NO COLUMN, NO MIGRATION, NO BACKFILL.
 */
export async function currentOutreachCampaigns(
  clientId: string,
  scope: CurrentOutreach,
): Promise<{ mode: 'client' } | { mode: 'ids'; ids: string[] } | { mode: 'none' } | { mode: 'unreadable'; reason: string }> {
  // `client`, `none` and `unreadable` pass straight through: the campaign question only has a
  // different answer when a programme is what bounds the work.
  if (scope.mode !== 'ids') return scope

  const { data: icpRows, error: icpErr } = await db.from('icps')
    .select('id').eq('client_id', clientId).eq('programme_id', scope.programmeId)
  if (icpErr) return { mode: 'unreadable', reason: `programme ICPs unreadable: ${icpErr.message}` }

  const icpIds = (icpRows ?? []).map((r: { id: string }) => r.id)
  // No attached ICP means no programme campaign can exist yet. A real answer, not a gap.
  if (icpIds.length === 0) return { mode: 'ids', ids: [] }

  const { data, error } = await db.from('figsy_campaigns')
    .select('id').eq('client_id', clientId).in('icp_id', icpIds)
  if (error) return { mode: 'unreadable', reason: `programme campaigns unreadable: ${error.message}` }
  return { mode: 'ids', ids: (data ?? []).map((r: { id: string }) => r.id) }
}
