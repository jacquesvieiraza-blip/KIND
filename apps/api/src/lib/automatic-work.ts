// ═══════════════════════════════════════════════════════════════════════════════
// XC-6 · THE SYSTEM'S OWN PROMISES, WRITTEN DOWN — and the detector that reads them
//
// ── WHAT EARNED IT (RC-9 / D-28 / FD-0) ────────────────────────────────────────
//
// This product promises to do things by itself: start a Proof, promote a Brief, prepare a
// programme. Not one of those promises was recorded with a MOMENT and a BOUND. So
// "requested but never started" was indistinguishable from "never requested", and
// "started and never came back" was indistinguishable from "still going".
//
// That is the Northvale shape exactly. The ICP sat in unresolved `icp_review`, Proof was
// never claimed, nothing ran — and both consoles inferred a comfortable story from the
// absence. Milla said "finding your first examples" (read off the stage name). Vida said
// no action was needed (read off the ICP row existing). Neither was lying about its
// inputs; neither had an input that said *this was due forty minutes ago*.
//
// FD-0, the founder's ruling, is BOTH: the system stays the primary owner and must
// auto-recover where safe, AND Vida must receive an audited recovery action available only
// from a persisted failed/stuck state. Both halves need a state to recover FROM. This is
// it. **Batch 1 builds the model and the detector only** — wiring promotion, Proof and P1
// continuation onto it is Batch 2, by the manifest.
//
// ── THE FOUR RULES ─────────────────────────────────────────────────────────────
//
// ① **THE CLOCK IS INJECTED.** Every function takes `now`. A detector that reads the clock
//    internally can only be tested by waiting, which means it is tested by nobody.
//
// ② **`stuck` IS NOT `failed`.** A failure happened and reported itself; it already has a
//    task and can be safely retried. STUCK is the ABSENCE of a report — it may still be
//    running, so FD-0's prohibition on concurrent runs applies to it and not to a failure.
//
// ③ **ONE LIVE UNIT PER SUBJECT, ENFORCED BY THE DATABASE.**
//    `automatic_work_one_live_per_subject` is a partial unique index. The writers are a
//    cron, an HTTP retry and an operator button; any two can arrive together, so an
//    application-level check cannot promise FD-0's "must not create concurrent runs".
//
// ④ **AN UNREADABLE TABLE IS NOT AN EMPTY ONE.** `supabase-js` returns
//    `{data:null,error}` for a missing table and `const { data } = await …` reads it as
//    empty. "Nothing is overdue" said because a read failed would be the Vida "no action
//    needed" defect, reproduced inside the mechanism built to catch it.
// ═══════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
// C-9: one predicate for "the relation is not there", across both the pg and PostgREST seams.
import { isRelationAbsent } from './relation-absent'
import { raiseOperatorTask } from './operator-tasks'

/** Every kind of work the SYSTEM owns. Batch 2 wires the call sites; these are the names. */
export const AUTOMATIC_WORK_KINDS = [
  /** Proof attempt 1 or 2 for a prospect — a client is watching the screen while it runs. */
  'proof_run',
  /** Brief → client + ICP, the first automatic step after Confirm. */
  'brief_promotion',
  /** Sourcing + sender + freeze for an authorised programme. */
  'programme_prepare',
  /** P1 continuation: the automatic start after the first payment. */
  'p1_continuation',
] as const

export type AutomaticWorkKind = typeof AUTOMATIC_WORK_KINDS[number]
export type AutomaticWorkState = 'requested' | 'started' | 'completed' | 'failed' | 'stuck'

/**
 * How long each kind may take before SILENCE becomes a finding.
 *
 * ⚠️ THESE ARE BOUNDS ON SILENCE, NOT PERFORMANCE TARGETS. Exceeding one does not mean the
 * work is wrong; it means nobody can any longer tell whether it is running, and that is
 * the thing a human has to be told.
 *
 * ⚠️ Proof is the tight one BECAUSE A CLIENT IS WATCHING. They pressed Confirm and are
 * sitting on a desk that says we are finding their examples; ten minutes of that is a
 * product, forty is an abandonment.
 */
const BOUND_SECONDS: Record<AutomaticWorkKind, number> = {
  proof_run: 10 * 60,
  brief_promotion: 5 * 60,
  programme_prepare: 60 * 60,
  p1_continuation: 30 * 60,
}

/** A conservative bound for an unrecognised kind. */
const DEFAULT_BOUND_SECONDS = 15 * 60

/**
 * ⚠️ IT NEVER RETURNS `undefined`, AND THAT IS THE POINT. A missing bound would make
 * `requested_at + bound` a NaN, every NaN comparison is false, and the detector would
 * silently never fire for that kind — the exact species of blindness this module exists to
 * remove, hiding inside the fix for it.
 */
export function boundSecondsFor(kind: AutomaticWorkKind): number {
  const v = BOUND_SECONDS[kind]
  return typeof v === 'number' && v > 0 ? v : DEFAULT_BOUND_SECONDS
}

const UNIQUE_VIOLATION = '23505'
type PgError = { code?: string; message?: string } | null | undefined

/**
 * ⛓️ C-9 (17 Sep) — was `err.code === '42P01'`, which `supabase-js` never receives for a
 * missing table: PostgREST answers its own `PGRST205` from its schema cache. `isRelationAbsent`
 * accepts both, so this branch can finally fire on the seam the product actually uses — which
 * matters most here, because the overdue detector going blind is the failure XC-6 exists for.
 */
function isTableMissing(err: PgError): boolean {
  if (!err) return false
  return isRelationAbsent(err) || /relation .*automatic_work.* does not exist/i.test(err.message ?? '')
}
function isUniqueViolation(err: PgError): boolean {
  if (!err) return false
  return err.code === UNIQUE_VIOLATION || /duplicate key value/i.test(err.message ?? '')
}
const TABLE_MISSING_MESSAGE =
  'automatic_work does not exist on this database — the 20260917_operator_tasks_and_automatic_work migration has not been run. ' +
  'No automatic work is being tracked, and the overdue detector is blind.'

export interface AutomaticWorkRow {
  id: string
  kind: string
  subject_kind: string
  subject_id: string
  client_id: string | null
  state: AutomaticWorkState
  bound_seconds: number
  requested_at: string
  started_at: string | null
  completed_at: string | null
  failed_at: string | null
  stuck_at: string | null
  attempt: number
  failure_reason: string | null
  detected_task_id: string | null
}

export interface RequestResult {
  ok: boolean
  workId?: string
  /** The index refused a second live row: this subject already has work in flight. */
  alreadyLive?: boolean
  tableMissing?: boolean
  error?: string
}

/**
 * Record that the system has promised to do this, now, within this bound.
 *
 * Idempotent per `(kind, subjectKind, subjectId)` while the previous unit is still live.
 */
export async function requestAutomaticWork(input: {
  kind: AutomaticWorkKind
  subjectKind: string
  subjectId: string
  clientId?: string | null
  attempt?: number
  now: string
}): Promise<RequestResult> {
  const row = {
    kind: input.kind,
    subject_kind: input.subjectKind,
    subject_id: input.subjectId,
    client_id: input.clientId ?? null,
    state: 'requested' as const,
    // ⚠️ THE BOUND IN FORCE **NOW**, stored on the row. Reading it from the constant at
    // detection time would let a later deploy retroactively make a late run look punctual.
    bound_seconds: boundSecondsFor(input.kind),
    requested_at: input.now,
    attempt: input.attempt ?? 1,
    updated_at: input.now,
  }
  try {
    const res = (await db.from('automatic_work').insert(row).select('id').maybeSingle()) as {
      data?: { id?: string } | null
      error?: PgError
    }
    if (res?.error) {
      if (isUniqueViolation(res.error)) return { ok: true, alreadyLive: true }
      if (isTableMissing(res.error)) {
        console.error(`[automatic-work] 🛑 ${TABLE_MISSING_MESSAGE}`)
        return { ok: false, tableMissing: true, error: TABLE_MISSING_MESSAGE }
      }
      return { ok: false, error: res.error.message ?? String(res.error) }
    }
    return { ok: true, workId: res?.data?.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[automatic-work] request threw: ${msg}`)
    return { ok: false, error: msg }
  }
}

/**
 * Move a unit's state.
 *
 * ⚠️ `from` IS A GUARD, NOT A HINT. The update matches only rows already in one of those
 * states, so a completed unit can never be dragged back to `started` by a late retry — the
 * same compare-and-set discipline the proof claim ledger uses.
 */
async function transition(
  workId: string,
  from: AutomaticWorkState[],
  patch: Record<string, unknown>,
): Promise<{ ok: boolean; tableMissing?: boolean; error?: string }> {
  try {
    const res = (await db
      .from('automatic_work')
      .update(patch)
      .eq('id', workId)
      .in('state', from)
      .select('id')
      .maybeSingle()) as { data?: { id?: string } | null; error?: PgError }
    if (res?.error) {
      const tableMissing = isTableMissing(res.error)
      if (tableMissing) console.error(`[automatic-work] 🛑 ${TABLE_MISSING_MESSAGE}`)
      return { ok: false, tableMissing, error: res.error.message ?? String(res.error) }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export function markAutomaticWorkStarted(workId: string, opts: { now: string }) {
  return transition(workId, ['requested'], {
    state: 'started',
    started_at: opts.now,
    updated_at: opts.now,
  })
}

export function markAutomaticWorkCompleted(workId: string, opts: { now: string }) {
  return transition(workId, ['requested', 'started'], {
    state: 'completed',
    completed_at: opts.now,
    updated_at: opts.now,
  })
}

/**
 * A failure that REPORTED ITSELF.
 *
 * ⚠️ THE REASON IS REQUIRED BY THE SIGNATURE. "It failed" with no reason cannot be
 * recovered from — FD-0's audited operator action has to say what it is recovering from.
 */
export function markAutomaticWorkFailed(workId: string, opts: { reason: string; now: string }) {
  return transition(workId, ['requested', 'started', 'stuck'], {
    state: 'failed',
    failed_at: opts.now,
    failure_reason: opts.reason,
    updated_at: opts.now,
  })
}

/**
 * ⚑ 18 Sep (J12-C1) — THE UNIT'S OWN LATEST WORD ABOUT ONE SUBJECT.
 *
 * Every surface that wants to say what the system is doing needs the same row: the newest unit
 * of one kind for one subject. Three callers now want it — the Milla summary (J5-C2), the
 * operator's recovery control (XC-12) and the continuation's health (J12-C1) — and each was
 * about to read it with its own hand-rolled query.
 *
 * ⚠️ AN UNREADABLE ANSWER IS `{ ok: false }`, NEVER AN EMPTY ROW. "No unit" and "we could not
 * ask" are different facts and every caller here decides differently between them: a missing
 * unit is a programme nobody has started, an unreadable one is a programme whose owner we
 * cannot identify. Collapsing them is the shape of defect XC-2 exists to remove.
 *
 * ⚠️ IT DOES NOT FILTER BY STATE. The newest row is the answer whatever state it is in —
 * filtering to the live ones would make a `failed` unit look like no unit at all, which is
 * precisely the reading that let a stopped programme sit on **Working** for ever.
 */
export type LatestWorkRead =
  | { ok: true; row: AutomaticWorkRow | null }
  | { ok: false; tableMissing: boolean; error: string }

export async function latestAutomaticWork(
  kind: AutomaticWorkKind, subjectKind: string, subjectId: string,
): Promise<LatestWorkRead> {
  try {
    const { data, error } = await db.from('automatic_work')
      .select('*')
      .eq('kind', kind).eq('subject_kind', subjectKind).eq('subject_id', subjectId)
      .order('updated_at', { ascending: false })
      .limit(1)
    if (error) {
      const missing = isTableMissing(error)
      if (missing) console.error(`[automatic-work] 🛑 ${TABLE_MISSING_MESSAGE}`)
      return { ok: false, tableMissing: missing, error: error.message ?? String(error) }
    }
    return { ok: true, row: ((data ?? []) as AutomaticWorkRow[])[0] ?? null }
  } catch (err) {
    return { ok: false, tableMissing: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/** The two things silence can mean. Both are operator task classes. */
export type OverdueVerdict = 'automatic_work_never_started' | 'automatic_work_stuck'

/**
 * Is this unit overdue, and in which way? Pure — the whole decision, no database.
 *
 * ⚠️ THE BOUND IS MEASURED FROM `started_at` ONCE STARTED. A run that began late but is
 * progressing is not stuck; measuring from `requested_at` would flag it while it was still
 * working, and a detector that cries wolf is a detector that gets muted.
 *
 * ⚠️ `failed` RAISES NOTHING HERE. A failure is not silence: it already produced its own
 * task at the moment it failed, and FD-0 treats the two recoveries differently. Raising a
 * second task would double-report one event.
 */
export function classifyOverdue(row: AutomaticWorkRow, nowMs: number): OverdueVerdict | null {
  if (row.state !== 'requested' && row.state !== 'started') return null
  // Already reported once. The row stays live so the work can still land normally.
  if (row.detected_task_id) return null

  // ⚠️ POSITIVE AND FINITE, OR THE DEFAULT. `Number(x) || DEFAULT` is not enough: a
  // negative bound is truthy, and `Math.max(1, -5)` yields a one-second bound that fires
  // against everything. Both directions of a bad value must land on a real bound.
  const raw = Number(row.bound_seconds)
  const boundMs = (Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_BOUND_SECONDS) * 1000
  const anchor = row.state === 'started' ? row.started_at ?? row.requested_at : row.requested_at
  const anchorMs = new Date(anchor).getTime()
  if (!Number.isFinite(anchorMs)) {
    // An unparseable timestamp is itself a finding, and treating it as "not overdue" is the
    // blindness this module exists to remove.
    return row.state === 'started' ? 'automatic_work_stuck' : 'automatic_work_never_started'
  }
  if (nowMs - anchorMs <= boundMs) return null
  return row.state === 'started' ? 'automatic_work_stuck' : 'automatic_work_never_started'
}

const KIND_LABEL: Record<string, string> = {
  proof_run: 'a Proof run',
  brief_promotion: 'the Brief promotion',
  programme_prepare: 'programme preparation',
  p1_continuation: 'the P1 continuation',
}

function sentence(row: AutomaticWorkRow, verdict: OverdueVerdict): string {
  const what = KIND_LABEL[row.kind] ?? `automatic work (${row.kind})`
  const mins = Math.round((Number(row.bound_seconds) || DEFAULT_BOUND_SECONDS) / 60)
  return verdict === 'automatic_work_never_started'
    ? `${what} was requested and never started — more than ${mins} minutes ago`
    : `${what} started and has not reported back — more than ${mins} minutes ago`
}

export interface DetectResult {
  ok: boolean
  checked: number
  raised: number
  failed: number
  tableMissing?: boolean
  error?: string
}

/**
 * THE DETECTOR. Reads every live unit, and for each one past its bound writes an operator
 * task and marks the unit `stuck`.
 *
 * ⚠️ IT MARKS `stuck`, IT DOES NOT RETRY. Automatic recovery is FD-0's other half and it
 * belongs at the call site that knows how to redo that particular work — a generic
 * "run it again" here would be exactly the concurrent second run FD-0 forbids.
 *
 * ⚠️ ONE BAD ROW MUST NOT STOP THE SWEEP. A detector that abandons the list on its first
 * error is a detector that reports the first problem and hides the rest.
 *
 * Intended to be called from a CRON-CLAIMED slot, so two replicas cannot both sweep.
 */
export async function detectOverdueAutomaticWork(opts: { nowMs: number; limit?: number }): Promise<DetectResult> {
  let rows: AutomaticWorkRow[]
  try {
    const res = (await db
      .from('automatic_work')
      .select('id, kind, subject_kind, subject_id, client_id, state, bound_seconds, requested_at, started_at, completed_at, failed_at, stuck_at, attempt, failure_reason, detected_task_id')
      .in('state', ['requested', 'started'])
      .order('requested_at', { ascending: true })
      .limit(opts.limit ?? 500)) as { data?: AutomaticWorkRow[] | null; error?: PgError }

    if (res?.error) {
      const tableMissing = isTableMissing(res.error)
      const msg = tableMissing ? TABLE_MISSING_MESSAGE : res.error.message ?? String(res.error)
      console.error(`[automatic-work] detector read failed: ${msg}`)
      return { ok: false, checked: 0, raised: 0, failed: 0, tableMissing, error: msg }
    }
    rows = res?.data ?? []
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[automatic-work] detector read threw: ${msg}`)
    return { ok: false, checked: 0, raised: 0, failed: 0, error: msg }
  }

  const nowIso = new Date(opts.nowMs).toISOString()
  let raised = 0
  let failed = 0

  for (const row of rows) {
    const verdict = classifyOverdue(row, opts.nowMs)
    if (!verdict) continue
    try {
      const task = await raiseOperatorTask({
        kind: verdict,
        severity: 'warn',
        title: sentence(row, verdict),
        detail:
          'The system owns this step — the client was not asked to do anything. Recover it from Vida, ' +
          'or wait for the automatic recovery if this kind has one. Do not start a second run by hand.',
        clientId: row.client_id,
        subjectKind: row.subject_kind,
        subjectId: row.subject_id,
        evidence: {
          automatic_work_id: row.id,
          kind: row.kind,
          state: row.state,
          bound_seconds: row.bound_seconds,
          requested_at: row.requested_at,
          started_at: row.started_at,
          attempt: row.attempt,
        },
      })
      if (!task.ok) {
        failed += 1
        continue
      }
      // Stamp the task onto the unit so a second sweep finds it already reported. The unit
      // stays readable as `stuck`, which is the state FD-0's operator action requires.
      await transition(row.id, ['requested', 'started'], {
        state: 'stuck',
        stuck_at: nowIso,
        detected_task_id: task.taskId ?? null,
        updated_at: nowIso,
      })
      raised += 1
    } catch (err) {
      failed += 1
      console.error(`[automatic-work] detector could not report unit ${row.id}:`, err)
    }
  }

  return { ok: true, checked: rows.length, raised, failed }
}
