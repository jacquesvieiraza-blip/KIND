// ═══════════════════════════════════════════════════════════════════════════════════════
// THE STRUCTURAL GATE'S DB GLUE — read the rows, judge them, record the refusals.
//
// The judgement itself is `proof-fit.ts` and is PURE. This file is the only part that touches
// the database, and it exists so the rule can be proved without one.
//
// ── 🛑 IT FAILS CLOSED, AND THE FOUNDER LOCKED THAT EXPLICITLY (10 Sep) ─────────────────
//
//     "If code requiring set_aside_reason runs before the migration exists, FAIL CLOSED.
//      Do not silently skip the stamp and continue. The Proof run must stop/refuse with a
//      clear migration-required outcome rather than surface structurally invalid leads or
//      allow them to recycle into a later pass."
//
// So the column is PROBED FIRST, before any judgement is acted on. Without it there is no way
// to record a refusal — and a refusal we cannot record is a refusal that does not hold:
// `surfaceEverything` would re-surface the same candidate on the next pass, and the client
// would be shown the management consultancy we had already decided against. The honest answer
// is to refuse the whole surfacing step and say which migration is missing.
//
// ⚠️ `unknowable` IS TREATED AS MISSING. A probe that cannot tell us whether the column exists
// is not permission to proceed — this is the one place where "we do not know" and "it is not
// there" must produce the same behaviour, because the cost of guessing wrong is a prospect's
// first impression.
//
// ── WHAT IT MAY NEVER DO ────────────────────────────────────────────────────────────────
//
//   • never delete, pass, reject or re-status a candidate — a set-aside row keeps its status
//     and its data, exactly as the founder required ("keep record for audit")
//   • never touch a row outside the ids it was given
//   • never call a provider, never spend, never send
//   • never decide fit itself — every verdict comes from `proof-fit.ts`
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import { classifyProbeError } from './schema-probe'
import { hardFit, setAsideReason, type FitCandidate, type FitIcp } from './proof-fit'

/** The migration this gate cannot work without. Named in every refusal, so the fix is obvious. */
export const SET_ASIDE_MIGRATION = '20260910_lead_set_aside_reason'

export type GateOutcome =
  /** The gate ran. `eligible` may be surfaced; `setAside` has been recorded and must not be. */
  | { ok: true; eligible: string[]; setAside: { id: string; reason: string }[] }
  /**
   * The gate could NOT run safely. Nothing was surfaced and nothing was stamped.
   * `detail` is founder-plain and names the migration.
   */
  | { ok: false; reason: 'migration_required' | 'unreadable'; detail: string }

/** The columns the judgement reads — all four hard criteria, and nothing else. */
const CANDIDATE_COLUMNS = 'id, country, company_size, industry, job_title, seniority'

/**
 * Is `leads.set_aside_reason` there?
 *
 * ⚠️ A ZERO-ROW SELECT IS THE PROBE. `limit(0)` asks PostgREST to resolve the column without
 * reading anything, so this costs nothing and cannot be confused with "no rows matched" —
 * a missing column is an ERROR with a specific code, which is exactly what `schema-probe`
 * was built to classify.
 */
async function setAsideColumnPresent(): Promise<{ present: boolean; detail: string | null }> {
  const { error } = await db.from('leads').select('set_aside_reason').limit(0)
  if (!error) return { present: true, detail: null }
  const probe = classifyProbeError(error, 'column')
  return {
    present: false,
    detail: probe.verdict === 'missing'
      ? `\`leads.set_aside_reason\` does not exist yet, so a refused candidate could not be recorded. Run the ${SET_ASIDE_MIGRATION} migration (Vida → Command Centre → System → migrations), then try again.`
      : `It could not be established whether \`leads.set_aside_reason\` exists (${probe.detail ?? error.message ?? 'no detail'}), so nothing was surfaced. Confirm the ${SET_ASIDE_MIGRATION} migration has run before retrying.`,
  }
}

/**
 * Judge a freshly-sourced batch and record the refusals.
 *
 * Returns the ids that may be surfaced. **A caller that surfaces anything other than
 * `eligible` has defeated the gate**, which is why the eligible list is returned rather than
 * the caller being trusted to re-filter.
 *
 * @param leadIds the rows THIS run created. Never a client-wide selection: re-judging an
 *                earlier pass would move the ground under a set the client is already reading.
 */
export async function applyStructuralGate(
  icp: FitIcp,
  leadIds: string[],
): Promise<GateOutcome> {
  if (leadIds.length === 0) return { ok: true, eligible: [], setAside: [] }

  // 🛑 THE PROBE COMES FIRST — BEFORE ANY JUDGEMENT IS ACTED ON. Judging and then discovering
  // we cannot record the result would leave the run having decided something it cannot
  // enforce, which is the silent-skip the founder forbade.
  const column = await setAsideColumnPresent()
  if (!column.present) {
    return { ok: false, reason: 'migration_required', detail: column.detail! }
  }

  const { data, error } = await db.from('leads').select(CANDIDATE_COLUMNS).in('id', leadIds)
  if (error) {
    return {
      ok: false,
      reason: 'unreadable',
      detail: `The sourced candidates could not be re-read to check them against the targeting (${error.message}), so none was surfaced. Nothing was changed.`,
    }
  }

  const rows = (data ?? []) as ({ id: string } & FitCandidate)[]
  const eligible: string[] = []
  const setAside: { id: string; reason: string }[] = []

  for (const row of rows) {
    const reason = setAsideReason(hardFit(row, icp))
    if (reason) setAside.push({ id: row.id, reason })
    else eligible.push(row.id)
  }

  // ⚠️ ONE STATEMENT PER REASON, and the reason is the same for every row in it — so this is
  // at most four updates regardless of batch size, and each is idempotent.
  for (const reason of [...new Set(setAside.map(s => s.reason))]) {
    const ids = setAside.filter(s => s.reason === reason).map(s => s.id)
    const { error: stampErr } = await db.from('leads')
      .update({ set_aside_reason: reason })
      .in('id', ids)
    if (stampErr) {
      // 🛑 A FAILED STAMP IS A FAILED GATE. If we cannot record the refusal, the refusal will
      // not survive to the next pass — so the whole batch is refused rather than surfacing
      // the ones that happened to pass while the rejects stay eligible for re-surfacing.
      return {
        ok: false,
        reason: 'unreadable',
        detail: `A candidate that does not match the targeting could not be set aside (${stampErr.message}), so nothing was surfaced — a refusal we cannot record would show them the same people again.`,
      }
    }
  }

  return { ok: true, eligible, setAside }
}
