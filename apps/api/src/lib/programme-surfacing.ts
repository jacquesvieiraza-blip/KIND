// ═══════════════════════════════════════════════════════════════════════════════════════
// PUT THE QUALIFIED BATCH IN FRONT OF THE CUSTOMER — visibility, and nothing else.
//
// 🛑 WHY NOT `surfaceEverything`. That function is the managed-model surfacing act and it is
// CLIENT-SCOPED with no suppression filter of any kind: `client_id` + not-surfaced +
// not-revealed + `status != 'passed'`. `programme-review.ts`'s own header records what that
// means — House carries ~166 leads from a retired legacy desk, every one `programme_id = NULL`
// — so using it here would put a retired desk, and every disqualified candidate, on the
// customer's programme review screen. This surfaces one programme's one batch, qualified only.
//
// 🛑 AND IT MOVES NO COUNTER. `sourced_used`, `sourced_reserved`, the batch row, provider cost
// and programme status are all untouched. Customer visibility is a fact about a screen; the
// ledger was settled by qualification, before this ran. The whole HOUSE-009 arc exists because
// those two were the same event.
//
// ⚠️ BOTH STAMPS TOGETHER, DELIBERATELY. `/leads/for-approval` and `programme-review.ts` each
// require `delivered_at` AND `surfaced_for_approval_at`; writing one without the other is how
// a lead becomes invisible to the customer while the operator is told it was sent
// (`start-work.ts` carries the same pairing and the same reason).
//
// ⚠️ NEVER RE-STAMPS. The claim is `.is('surfaced_for_approval_at', null)`, so a second call
// cannot rewrite the batch timestamp that `leads.ts` uses to tell one review set from another.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'

export type SurfaceResult =
  | { ok: true; surfaced: number; eligible: number }
  | { ok: false; reason: string }

/**
 * Make this batch's QUALIFIED prospects visible to the customer.
 *
 * ⚠️ EVERY CONDITION IS A PERMANENT, PROSPECT-LEVEL FACT, and each is lifted from the
 * predicate `prepareProgrammeOutreach` and `programme-review.ts` already share. Nothing
 * send-time (mailbox caps, warm-up, launch holds) belongs here: those change by the hour and
 * freezing one into a review desk would tell a customer a person is unusable when they are
 * merely not sendable today.
 */
export async function surfaceQualifiedBatch(
  programmeId: string,
  clientId: string,
  batchId: string,
): Promise<SurfaceResult> {
  if (!programmeId || !clientId || !batchId) {
    return { ok: false, reason: 'a programme, a client and a batch are all required — nothing was surfaced' }
  }

  const { data, error } = await db.from('leads')
    .select('id')
    // ── POSITIVE ATTRIBUTION, THEN TENANCY ON THE SAME QUERY ──────────────────────────
    .eq('programme_id', programmeId)
    .eq('client_id', clientId)
    // 🛑 THIS BATCH. An older batch's people would otherwise join the set being reviewed now —
    // right programme, right client, wrong unit of work.
    .eq('batch_id', batchId)
    // 🛑 QUALIFIED, AND PROVED SO. `disqualified_at IS NULL` is asserted as well as
    // `qualified_at IS NOT NULL`: they are written together and exactly one is ever set, so a
    // row carrying both is corrupt and must not be shown to a customer.
    .not('qualified_at', 'is', null)
    .is('disqualified_at', null)
    // Permanent disqualifiers, identical to the review desk's own list.
    .not('status', 'in', '(passed,rejected,opted_out)')
    .is('opted_out_at', null)
    .is('provider_eviction_required_at', null)
    .not('email', 'is', null)
    .is('surfaced_for_approval_at', null)

  if (error) {
    return { ok: false, reason: `the qualified prospects could not be read (${error.message}) — nothing was surfaced` }
  }
  const ids = ((data ?? []) as { id: string }[]).map(r => r.id)
  if (ids.length === 0) return { ok: true, surfaced: 0, eligible: 0 }

  const now = new Date().toISOString()
  // ⚠️ CHECKED, NOT FIRED. `start-work.ts` records what a bare `await` cost here: a failed
  // `delivered_at` write left the leads invisible while the operator was told they were sent.
  const { data: claimed, error: surfErr } = await db.from('leads')
    .update({ surfaced_for_approval_at: now, delivered_at: now })
    .in('id', ids)
    .eq('client_id', clientId)
    .is('surfaced_for_approval_at', null)
    .select('id')
  if (surfErr) {
    return { ok: false, reason: `the review set could not be put in front of the customer (${surfErr.message}). Nothing is lost — the verdicts stand and this can be re-run.` }
  }

  return { ok: true, surfaced: (claimed ?? []).length, eligible: ids.length }
}
