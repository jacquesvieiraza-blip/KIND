// ═══════════════════════════════════════════════════════════════════════════════════════
// RECONCILE ONE PROGRAMME'S ALREADY-DELIVERED SOURCING — the operator door to the RPC.
//
// 🛑 WHAT THIS IS FOR, ONCE. 246 real people were sourced for the House programme while the
// House path bypassed the accounting entirely (HOUSE-009). The programme screen therefore says
// `0 used · 0 reserved · 2500 left · no batch` about a run that actually happened.
// `reconcile_programme_sourcing` — reviewed in #1651, shipped in #1652, live in the database —
// fixes that. It had no caller, so it was an orphan: the fix existed and nothing could run it.
//
// ── WHAT THIS MODULE DOES, AND THE LIST IS THE WHOLE MODULE ─────────────────────────────
//
//   ① refuse anything that is not a uuid
//   ② read the programme's counters BEFORE
//   ③ call `reconcile_programme_sourcing(p_programme_id)` — and NOTHING else
//   ④ read the counters and batches AFTER
//   ⑤ report what actually changed
//
// 🛑 IT WRITES NOTHING ITSELF. Every mutation in this operation happens inside the reviewed
// RPC, in one transaction, under its own guards — the foreign-client refusal, the
// delivered-and-unbatched predicate, the ceiling check and the settled-on-creation batch. This
// module has no `update`, no `insert`, no `leads` query and no ceiling arithmetic of its own,
// which is deliberate: a second implementation of "which leads count" is how the two would
// eventually disagree, and the one that drifted would be the one nobody read.
//
// ⚠️ IDENTITY IS THE CALLER'S EXACT UUID. Not the client, not "the newest programme", not the
// House audience, not a name. The RPC is passed the id it was given and nothing is resolved on
// the way — because the failure this whole package keeps finding is a positive fact inferred
// from a classification, and "this client's programme" is exactly that.
//
// ⚠️ IDEMPOTENT BY THE RPC'S CONSTRUCTION, NOT BY A FLAG HERE. After a successful run those
// leads carry a `batch_id`, so the second call finds nothing orphaned and returns 0. A count of
// 0 is reported as 0 — never dressed up as a success, and never as a failure either.
//
// 🛑 ONE CONSEQUENCE THE CALLER MUST SEE BEFORE PRESSING, STATED RATHER THAN BURIED. The RPC
// ends with `status = CASE WHEN status = 'SOURCING_AUTHORISED' THEN 'SOURCING' ELSE status END`.
// So a programme sitting at SOURCING_AUTHORISED MOVES to SOURCING. That is inside the reviewed
// RPC and this module does not add it, cannot suppress it without a second write fighting the
// first, and must not hide it. Both statuses sit in the same pre-approval band
// (`PRE_APPROVAL_PREPARABLE`), so nothing is approved, no P2 is taken and nothing goes live —
// but it IS a status change, and the result says so in words.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'

/** A uuid, and nothing that merely looks like one. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface SourcingCounters {
  /** Provider actually delivered. */
  used: number
  /** Granted, not yet delivered. */
  reserved: number
  /** `ceiling - used - reserved`, never negative. */
  left: number
  ceiling: number
}

export interface BatchSummary {
  id: string
  seq: number
  status: string | null
  requested: number | null
  granted: number | null
  delivered: number | null
  settled_at: string | null
}

export type ReconcileResult =
  | {
      ok: true
      programme_id: string
      reconciled_count: number
      before: SourcingCounters
      after: SourcingCounters
      status_before: string
      status_after: string
      batches: BatchSummary[]
      headline: string
    }
  | { ok: false; reason: string }

function counters(row: {
  sourcing_ceiling?: number | null
  sourced_used?: number | null
  sourced_reserved?: number | null
}): SourcingCounters {
  const ceiling = Number(row.sourcing_ceiling ?? 0)
  const used = Number(row.sourced_used ?? 0)
  const reserved = Number(row.sourced_reserved ?? 0)
  return { ceiling, used, reserved, left: Math.max(0, ceiling - used - reserved) }
}

const PROGRAMME_FIELDS = 'id, client_id, status, sourcing_ceiling, sourced_used, sourced_reserved'

/**
 * Account for one named programme's already-delivered sourcing.
 *
 * ⚠️ EVERY REFUSAL IS A REFUSAL, NOT A ZERO. "The read failed" and "there was nothing to
 * reconcile" are different answers, and collapsing them is the `?? []` defect this codebase
 * keeps finding: it turns *we could not tell* into *there is nothing wrong*.
 */
export async function reconcileProgrammeSourcing(programmeId: unknown): Promise<ReconcileResult> {
  const id = typeof programmeId === 'string' ? programmeId.trim() : ''
  if (!UUID.test(id)) {
    return {
      ok: false,
      reason: 'A programme id is required, and it must be the exact uuid of the programme to reconcile. Nothing was read and nothing was changed — this action never resolves a programme from a client, a name or an ordering.',
    }
  }

  // ── ② BEFORE ────────────────────────────────────────────────────────────────────────
  const { data: pre, error: preErr } = await db.from('programmes')
    .select(PROGRAMME_FIELDS).eq('id', id).maybeSingle()
  if (preErr) {
    return { ok: false, reason: `This programme's row could not be read (${preErr.message}), so nothing was reconciled. Nothing was changed.` }
  }
  if (!pre) {
    return { ok: false, reason: 'There is no programme with that id. Nothing was changed.' }
  }
  const before = counters(pre as Record<string, number | null>)
  const statusBefore = String((pre as { status?: string | null }).status ?? '')

  // ── ③ THE ONE CALL ──────────────────────────────────────────────────────────────────
  const { data: rpcData, error: rpcErr } = await db.rpc('reconcile_programme_sourcing', {
    p_programme_id: id,
  })
  if (rpcErr) {
    // 🛑 THE RPC RAISES RATHER THAN HALF-COUNTING — a foreign-client lead, or orphans that
    // would not fit under the ceiling. Its sentence is passed through verbatim because it is
    // the one that knows what it refused; a generic "reconcile failed" would send somebody
    // looking in the wrong place.
    return { ok: false, reason: `The reconciliation refused and nothing was changed: ${rpcErr.message}` }
  }
  // ⚠️ A NON-NUMBER IS UNREADABLE, NEVER ZERO. `RETURNS int`, so anything else means the call
  // did not answer — and reporting "0 reconciled, all good" for an answer we did not get is
  // precisely the false green this repo has spent weeks removing.
  if (typeof rpcData !== 'number' || !Number.isFinite(rpcData)) {
    return {
      ok: false,
      reason: `The reconciliation did not return a count (got ${JSON.stringify(rpcData)}), so what it did is UNKNOWN — do not read this as "nothing needed doing". Read the programme's counters and batches before pressing again.`,
    }
  }
  const reconciled = rpcData

  // ── ④ AFTER, READ BACK RATHER THAN CALCULATED ──────────────────────────────────────
  // The counters are re-read, never derived from `before + reconciled`. Arithmetic here would
  // report the number this module expected rather than the number the database holds, which is
  // the difference between a result and a guess.
  const { data: post, error: postErr } = await db.from('programmes')
    .select(PROGRAMME_FIELDS).eq('id', id).maybeSingle()
  if (postErr || !post) {
    return {
      ok: false,
      reason: `The reconciliation RAN and reported ${reconciled} record(s), but the programme could not be re-read afterwards (${postErr?.message ?? 'no row returned'}). Do NOT press this again — the work is done and a second call would only report 0. Open the programme to read its counters.`,
    }
  }
  const after = counters(post as Record<string, number | null>)
  const statusAfter = String((post as { status?: string | null }).status ?? '')

  const { data: batchRows, error: batchErr } = await db.from('programme_batches')
    .select('id, seq, status, requested, granted, delivered, settled_at')
    .eq('programme_id', id)
    .order('seq', { ascending: true })
  // A batch-read failure does not undo the reconciliation, so it is reported as a gap in the
  // REPORT rather than as a failure of the operation.
  const batches = batchErr ? [] : ((batchRows ?? []) as BatchSummary[])

  const statusNote = statusBefore === statusAfter
    ? `Status is unchanged (${statusAfter}).`
    : `⚠️ Status moved ${statusBefore} → ${statusAfter} — the reconciliation records that sourcing has happened. Nothing was approved, no P2 was taken and nothing went live.`

  return {
    ok: true,
    programme_id: id,
    reconciled_count: reconciled,
    before,
    after,
    status_before: statusBefore,
    status_after: statusAfter,
    batches,
    headline: reconciled > 0
      ? `Accounted for ${reconciled} already-delivered prospect(s). ${after.used} used · ${after.reserved} reserved · ${after.left} left · ${batches.length} batch(es). ${batchErr ? 'The batch list could not be read. ' : ''}${statusNote} Nothing was sourced, no provider was called and nothing was sent.`
      : `Nothing to reconcile — no delivered prospect on this programme is missing a batch. ${after.used} used · ${after.reserved} reserved · ${after.left} left · ${batches.length} batch(es). Nothing was changed.`,
  }
}
