// ═══════════════════════════════════════════════════════════════════════════════════════
// MAY THIS PROGRAMME BE RECONCILED? — the question the BUTTON asks, answered on the server.
//
// 🛑 WHY THIS IS NOT A BROWSER DECISION. The visibility rule turns on two facts the browser
// cannot hold and must never be handed: the configured `HOUSE_LAUNCH_PROGRAMME_ID`, and a House
// audience proved by `audienceForClientStrict` (which answers from the AUTH USER). A client-side
// check would have to be fed both, and a value shipped to a browser is a value anybody can read
// and anybody can lie back to us. So Vida renders a boolean it is GIVEN; it never derives one.
//
// ⚠️ AND THE BUTTON IS NOT THE GATE. `POST /operator/programme/:id/reconcile-sourcing` refuses
// on its own — the uuid check, then the RPC's own guards. This decides whether a control is
// OFFERED, which is a different job: an operator should not be shown an action that would be
// refused, and must not be shown a one-time repair on a programme it does not belong to.
//
// ── WHAT MAKES IT AVAILABLE — ALL FIVE, AND ANY FAILURE TO READ IS A NO ─────────────────
//
//   ① the programme id is EXACTLY `HOUSE_LAUNCH_PROGRAMME_ID`
//   ② its client is a proved House audience          (① and ② together: isHouseLaunchProgramme)
//   ③ status is SOURCING_AUTHORISED — the exact pre-reconcile state
//   ④ programme-attributed, batch-less candidates exist
//   ⑤ the accounting still reads unreconciled: 0 used, and no batch
//
// ⚠️ ③ IS DELIBERATELY THE SINGLE STATUS, NOT A BAND. This is a ONE-TIME repair for one
// programme, so the state it is offered in is the state that programme is in right now. The RPC
// moves it to SOURCING, which makes ③ false for ever afterwards — the button disappears because
// the world changed, not because a flag was flipped.
//
// 🛑 ④ RE-STATES THE ACTION'S OWN PREDICATE, AND THAT IS A REAL DUPLICATION — SAID OUT LOUD
// RATHER THAN HIDDEN. `programme_id = <this> AND client_id = <its client> AND batch_id IS NULL`
// is the population `qualifyAndSettleBatch` pages, and two copies of a predicate can drift. It
// is accepted here because the two answer different questions and the consequences are not
// symmetric: this one only decides whether a control is DRAWN. If it drifts wide, the operator
// presses and the action answers "This programme has no unaccounted candidates". If it drifts
// narrow, the control is absent and a human says so. Neither can miscount anything: what ends
// up in `sourced_used` comes only from the SQL. Nothing here is ever used AS that number.
//
// ⛓️ 9 Sep — ④ NO LONGER REQUIRES `delivered_at`, AND THAT WAS A DEFECT, NOT A TIDY-UP.
// The count was `delivered_at IS NOT NULL AND batch_id IS NULL` — the OLD reconcile's orphan
// test. The action this control now fires reads EVERY batch-less candidate of the programme,
// delivered or not, because entitlement is consumed by M&V's qualification verdict and
// `delivered_at` is a fact about a screen. On the live House programme that is the difference
// between 30 and 246: the operator would have been offered "30 sourced leads" and 246 would
// have been checked. Worse, a programme whose candidates had never been surfaced would count
// ZERO and the control would not be offered at all, for work that plainly needs doing.
// **The number an operator is shown must be the number the action will act on.**
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'

/** The one status this one-time repair is offered in. */
export const RECONCILE_FROM_STATUS = 'SOURCING_AUTHORISED'

export interface ReconcileAvailability {
  /** Draw the control? Anything unproved, unreadable or unexpected is `false`. */
  available: boolean
  /**
   * Programme-attributed, batch-less candidates — exactly how many `qualifyAndSettleBatch`
   * would judge. This is the number the operator is shown before pressing.
   * ⚠️ A DISPLAY FIGURE FOR THE CONFIRMATION, NEVER A COUNT THAT IS WRITTEN. What ends up in
   * `sourced_used` is whatever the SQL itself counted inside its own transaction.
   */
  unaccounted: number
  /** Why the control is absent. For the operator's benefit; never rendered as an error. */
  reason: string | null
}

const NO: (reason: string) => ReconcileAvailability = reason => ({ available: false, unaccounted: 0, reason })

/**
 * Should Vida offer "Qualify sourced leads" for this programme?
 *
 * ⚠️ FAILS CLOSED ON EVERY UNKNOWN. A read that errors is not "nothing to do" — it is "we
 * cannot tell", and the honest response to that is not to offer a one-time repair.
 */
export async function reconcileAvailability(
  programmeId: string | null | undefined,
  clientId: string | null | undefined,
): Promise<ReconcileAvailability> {
  const pid = (programmeId ?? '').trim()
  const cid = (clientId ?? '').trim()
  if (!pid || !cid) return NO('no programme is loaded')

  // ── ① + ② THE EXACT PROGRAMME, AND A PROVED HOUSE CLIENT ───────────────────────────
  // One call, because they are one question: is this THE launch programme? It is the same
  // gate the approved sequence seeds behind, so the two can never disagree about which
  // programme is "the House launch one".
  const { isHouseLaunchProgramme } = await import('./house-sequence')
  if (!(await isHouseLaunchProgramme(pid, cid))) {
    return NO('this is not the configured House launch programme')
  }

  // ── ③ + ⑤ THE STATE, READ FROM THE ROW ─────────────────────────────────────────────
  const { data: prog, error: progErr } = await db.from('programmes')
    .select('id, client_id, status, sourced_used, sourced_reserved')
    .eq('id', pid).maybeSingle()
  if (progErr) return NO(`the programme could not be read (${progErr.message})`)
  if (!prog) return NO('there is no programme with that id')
  const p = prog as { client_id: string | null; status: string | null; sourced_used: number | null }
  // TENANCY on a row found positively — a programme naming another client is corrupt, and
  // offering a repair through it would be reaching across a tenant boundary.
  if (p.client_id !== cid) return NO('the programme belongs to a different client')
  if (String(p.status) !== RECONCILE_FROM_STATUS) {
    return NO(`the programme is ${p.status}, and this one-time repair is only offered at ${RECONCILE_FROM_STATUS}`)
  }
  if (Number(p.sourced_used ?? 0) !== 0) {
    return NO(`this programme already has ${p.sourced_used} accounted record(s), so it is not in the unreconciled state`)
  }

  // ⑤ continued — a batch existing at all means the accounting has already run.
  const { count: batchCount, error: batchErr } = await db.from('programme_batches')
    .select('id', { count: 'exact', head: true }).eq('programme_id', pid)
  if (batchErr) return NO(`the programme's batches could not be read (${batchErr.message})`)
  if ((batchCount ?? 0) > 0) return NO('this programme already has a batch, so its sourcing is accounted for')

  // ── ④ IS THERE ANYTHING TO QUALIFY? ────────────────────────────────────────────────
  // 🛑 THE SAME POPULATION THE ACTION READS, AND NOT ONE ROW MORE OR LESS. No `delivered_at`:
  // whether a candidate has been put in front of a customer is a fact about a screen, and it
  // decides nothing about whether M&V has judged them.
  const { count: orphans, error: leadErr } = await db.from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('programme_id', pid)
    .eq('client_id', cid)
    .is('batch_id', null)
  if (leadErr) return NO(`the programme's prospects could not be read (${leadErr.message})`)
  const unaccounted = orphans ?? 0
  if (unaccounted <= 0) return NO('every candidate this programme sourced already belongs to a batch')

  return { available: true, unaccounted, reason: null }
}
