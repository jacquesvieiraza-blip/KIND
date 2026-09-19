// ═══════════════════════════════════════════════════════════════════════════════
// XC-5 · THE PERSISTED OPERATOR TASK — because an alert is not a queue
//
// Every operator-facing exception in this product used to be one of two things, and
// neither is a record:
//
//   ① AN EMAIL (`sendFounderAlert`). It cannot be assigned, resolved, deduped, counted
//      or audited, and when it is missed nothing is left behind. That path even has a
//      branch that logs `⛔ ALERT LOST` — an honest admission that the signal evaporates.
//   ② A VALUE DERIVED ON READ (`deriveLifecycle`'s `needsYou`). It exists only while the
//      facts that imply it still hold, so an exception that clears itself leaves no trace
//      that it happened, and one that needs a human vanishes when the derivation changes.
//
// So `operator_tasks` is the record and the email is a MIRROR of it (R117). Vida's
// Needs-you reads rows; the founder's inbox stops being the queue.
//
// ── THREE RULES THIS MODULE EXISTS TO HOLD ─────────────────────────────────────
//
// ① **THE TABLE BEING ABSENT IS A LOUD ANSWER, NOT AN EMPTY LIST.** `supabase-js` returns
//    `{ data: null, error }` for a missing table, and `const { data } = await …` reads that
//    as empty. A brand-new table is exactly where that bites, because code always ships
//    before the migration is run. Every function here returns an explicit `ok` and a
//    `tableMissing` flag, and "nothing needs you" is never said because a read failed —
//    that inversion IS the Vida "no action needed" defect.
//
// ② **DEDUPE IS THE DATABASE'S JOB.** `operator_tasks_one_open_per_key` is a partial
//    unique index. The callers are crons; two slots firing in the same second is the
//    normal case. A check-then-insert here would be a race, so the code's job is to read
//    the index's refusal (SQLSTATE 23505) as "already reported".
//
// ③ **NO SECRETS IN `evidence`.** This table is read in a console and copied into
//    resolution notes. A connection string or an API key landing in it becomes a
//    credential in a place nobody is guarding, and the production `DATABASE_URL` has
//    already been exposed once this month. Values are redacted on the way in, not trusted
//    to the caller's discipline.
//
// It NEVER throws into its caller. An exception-reporting path that breaks the path it
// rides on is worse than one that reports nothing.
// ═══════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
// C-9: one predicate for "the relation is not there", across both the pg and PostgREST seams.
import { isRelationAbsent } from './relation-absent'

/**
 * The closed set of task classes. A free-string `kind` cannot be routed, deduped or
 * counted, and a typo silently becomes a new category with one member in it.
 *
 * The first block is XC-13's provider and authority failures; the second mirrors every
 * `AlertKind` in `alerts.ts`, because XC-5 requires each of those to become a task.
 */
export const OPERATOR_TASK_KINDS = [
  // ── provider and sourcing authority (XC-13 / J12-C0) ──
  'provider_credits_exhausted',
  'provider_unavailable',
  'provider_refused',
  'sourcing_refused_no_authority',
  // ── automatic work that did not happen (XC-6 / FD-0) ──
  'automatic_work_never_started',
  'automatic_work_stuck',
  /**
   * ⚑ 18 Sep (J5-C10) — A CLIENT IS BLOCKED ON US TRANSLATING THEIR OWN WORDS.
   *
   * 🛑 THIS IS THE CASE THIS FILE'S SIBLING HEADER ALREADY NAMED AND NOTHING RAISED.
   * `vida-operator-tasks.ts` opens with it: *"Northvale's ICP sat in unresolved `icp_review`,
   * nothing ran, and Vida said no action was needed."* There was a dedicated rail
   * (`GET /operator/icp-review`) and R117 wants ONE queue, so the rail was a list nobody was
   * sent to. Proof cannot start, no provider spend is possible, and the client has been told
   * their targeting is being prepared — every property of a Needs-you.
   */
  'icp_review_pending',
  // ── the existing founder-alert classes, now records ──
  'sends_stalled',
  'api_down',
  'payment_failed',
  'charge_failed',
  'churn_risk',
  'hot_reply',
  'support_escalation',
  'audit_dropped',
  'new_signup',
  'source_down',
] as const

export type OperatorTaskKind = typeof OPERATOR_TASK_KINDS[number]
export type OperatorTaskSeverity = 'info' | 'warn' | 'critical'

export interface OperatorTaskSubject {
  clientId?: string | null
  programmeId?: string | null
  subjectKind?: string | null
  subjectId?: string | null
}

export interface RaiseOperatorTaskInput extends OperatorTaskSubject {
  kind: OperatorTaskKind
  title: string
  detail?: string | null
  severity?: OperatorTaskSeverity
  evidence?: Record<string, unknown>
  /**
   * Override the dedupe key. `null` means NEVER dedupe — every occurrence is its own
   * event (a hot reply, a signup). Omitted means "derive it from the subject".
   */
  dedupeKey?: string | null
}

export interface RaiseResult {
  ok: boolean
  taskId?: string
  /** The unique index refused a second OPEN row: this condition is already reported. */
  alreadyOpen?: boolean
  /** The table is not there. The migration has not been run on this database. */
  tableMissing?: boolean
  error?: string
}

/** Postgres: unique violation. */
const UNIQUE_VIOLATION = '23505'

type PgError = { code?: string; message?: string } | null | undefined

/**
 * Is the table absent?
 *
 * ⛓️ C-9 (17 Sep) — the code check moved to `isRelationAbsent`, which accepts PostgreSQL's
 * `42P01` **and** PostgREST's `PGRST205`. This site previously compared `42P01` only, and
 * `supabase-js` never receives that code for a missing table: PostgREST resolves the name
 * against its schema cache first and answers its own. So this branch could not fire on the
 * seam it was written for, and only a real PostgREST showed it.
 *
 * ⚠️ THE MESSAGE PATTERN STAYS, AND IT IS NOT REDUNDANT. It names THESE two tables, so an
 * absence reported without a usable code is still recognised here and not somewhere else.
 */
function isTableMissing(err: PgError): boolean {
  if (!err) return false
  if (isRelationAbsent(err)) return true
  return /relation .*(operator_tasks|automatic_work).* does not exist/i.test(err.message ?? '')
}

function isUniqueViolation(err: PgError): boolean {
  if (!err) return false
  return err.code === UNIQUE_VIOLATION || /duplicate key value/i.test(err.message ?? '')
}

/**
 * The dedupe key for a condition.
 *
 * ⚠️ A GLOBAL CONDITION DEDUPES GLOBALLY. "Apollo is out of lead credits" is one fact
 * about the company, not one fact per client — keying it per client would produce a row
 * per client per cron tick, and a list nobody can read is a list nobody reads.
 */
export function dedupeKeyFor(s: OperatorTaskSubject): string {
  const parts = [s.clientId, s.programmeId, s.subjectKind, s.subjectId].filter(Boolean)
  return parts.length > 0 ? parts.join(':') : 'global'
}

/** Anything that looks like a credential, a key or a connection string. */
const SECRET_SHAPES: RegExp[] = [
  /\b[a-z+]+:\/\/[^\s:@/]+:[^\s@/]+@/i, // any URL with a password in it
  /\b(sk|pk|rk|key|api|secret|token|bearer)[-_][A-Za-z0-9]{8,}/i,
  /\beyJ[A-Za-z0-9_-]{10,}\./, // a JWT
]

/**
 * Redact evidence on the way IN, not on the way out.
 *
 * ⚠️ ON THE WAY IN IS THE ONLY PLACE IT WORKS. Redacting at render time leaves the secret
 * in the row, where a database export, a support query or a copied resolution note finds
 * it. Redacting at write time means the secret was never stored.
 */
export function redactEvidence(evidence: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!evidence) return {}
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(evidence)) {
    if (typeof v === 'string' && SECRET_SHAPES.some((re) => re.test(v))) {
      out[k] = '[redacted]'
      continue
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = redactEvidence(v as Record<string, unknown>)
      continue
    }
    out[k] = v
  }
  return out
}

/**
 * Raise a task. Idempotent per `(kind, dedupeKey)` while the previous one is still open.
 *
 * Never throws. Returns what happened so a caller that must be honest about it can be —
 * the `sendFounderAlert` lesson (14 Sep): a function that swallows its own outcome lets a
 * caller answer `{ success: true }` over an alert that landed nowhere.
 */
export async function raiseOperatorTask(input: RaiseOperatorTaskInput): Promise<RaiseResult> {
  const title = (input.title ?? '').trim()
  if (!title) return { ok: false, error: 'a task with no title cannot be read or acted on' }

  const dedupe =
    input.dedupeKey === null
      ? null
      : input.dedupeKey ?? dedupeKeyFor(input)

  const row = {
    kind: input.kind,
    severity: input.severity ?? 'warn',
    title,
    detail: input.detail ?? null,
    client_id: input.clientId ?? null,
    programme_id: input.programmeId ?? null,
    subject_kind: input.subjectKind ?? null,
    subject_id: input.subjectId ?? null,
    dedupe_key: dedupe,
    status: 'open' as const,
    evidence: redactEvidence(input.evidence),
  }

  try {
    const res = (await db
      .from('operator_tasks')
      .insert(row)
      .select('id')
      .maybeSingle()) as { data?: { id?: string } | null; error?: PgError }

    if (res?.error) {
      if (isUniqueViolation(res.error)) {
        // The index did its job: this condition is already on the operator's list.
        return { ok: true, alreadyOpen: true }
      }
      if (isTableMissing(res.error)) {
        const msg =
          'operator_tasks does not exist on this database — the 20260917_operator_tasks_and_automatic_work migration has not been run. ' +
          'The exception was NOT recorded; only the email mirror went out.'
        console.error(`[operator-tasks] 🛑 ${msg}`)
        return { ok: false, tableMissing: true, error: msg }
      }
      const msg = res.error.message ?? String(res.error)
      console.error(`[operator-tasks] insert returned error: ${msg}`)
      return { ok: false, error: msg }
    }

    return { ok: true, taskId: res?.data?.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[operator-tasks] insert threw: ${msg}`)
    return { ok: false, error: msg }
  }
}

export interface OperatorTaskRow {
  id: string
  kind: string
  severity: string
  title: string
  detail: string | null
  client_id: string | null
  programme_id: string | null
  subject_kind: string | null
  subject_id: string | null
  status: string
  evidence: Record<string, unknown>
  created_at: string
}

export interface ListResult {
  ok: boolean
  tasks: OperatorTaskRow[]
  tableMissing?: boolean
  error?: string
}

/**
 * The open queue.
 *
 * 🛑 `ok: false` WITH AN EMPTY ARRAY IS THE WHOLE POINT. "Nothing needs you" is the most
 * reassuring sentence this console can print, and it must never be printed because a read
 * failed. A caller that ignores `ok` and renders `tasks.length === 0` as calm is repeating
 * the defect this field exists to stop.
 */
export async function listOpenOperatorTasks(opts?: { clientId?: string; limit?: number }): Promise<ListResult> {
  try {
    let q = db
      .from('operator_tasks')
      .select('id, kind, severity, title, detail, client_id, programme_id, subject_kind, subject_id, status, evidence, created_at')
      .eq('status', 'open')
    if (opts?.clientId) q = q.eq('client_id', opts.clientId)
    const res = (await q.order('created_at', { ascending: false }).limit(opts?.limit ?? 200)) as {
      data?: OperatorTaskRow[] | null
      error?: PgError
    }

    if (res?.error) {
      const tableMissing = isTableMissing(res.error)
      const msg = tableMissing
        ? 'operator_tasks does not exist on this database — the 20260917_operator_tasks_and_automatic_work migration has not been run. This is NOT an empty queue.'
        : res.error.message ?? String(res.error)
      console.error(`[operator-tasks] read failed: ${msg}`)
      return { ok: false, tasks: [], tableMissing, error: msg }
    }
    return { ok: true, tasks: res?.data ?? [] }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[operator-tasks] read threw: ${msg}`)
    return { ok: false, tasks: [], error: msg }
  }
}

/**
 * ⚑ 18 Sep (J5-C10) — CLOSE EVERY OPEN TASK FOR A CONDITION THAT HAS CLEARED.
 *
 * The migration's own words: *"A task is resolved by a human with a note, OR BY THE CONDITION
 * CLEARING, and either way the row survives as evidence that it happened."* The second half
 * had no implementation — `resolveOperatorTask` needs a task id, which a condition does not
 * have, so every raise-from-a-condition class could only ever be closed by hand.
 *
 * 🛑 A QUEUE THAT ONLY GROWS IS NOT A QUEUE. A pending ICP review resolved by an operator
 * through the resolve route would leave its Needs-you row open for ever, and after the second
 * one the list is something people scroll past. That is the failure XC-5 exists to prevent,
 * reintroduced from the other end.
 *
 * ⚠️ IT MATCHES BY `(kind, dedupeKey)` — the same pair the partial unique index dedupes on —
 * so it closes exactly the row(s) a re-raise would have collided with, and nothing else.
 *
 * ⚠️ NOT FINDING A ROW IS SUCCESS. A condition that clears before anything raised it is the
 * ordinary case (the review was resolved inside five minutes, before the sweep ran), and
 * reporting that as a failure would make every caller log noise about working correctly.
 */
export async function resolveOperatorTasksForCondition(
  kind: OperatorTaskKind, dedupeKey: string, note: string,
): Promise<{ ok: boolean; closed: number; tableMissing?: boolean; error?: string }> {
  const reason = (note ?? '').trim()
  if (!reason) {
    return { ok: false, closed: 0, error: 'a resolution note is required — a resolution with no reason is not evidence' }
  }
  try {
    const now = new Date().toISOString()
    const res = (await db
      .from('operator_tasks')
      .update({
        status: 'resolved',
        resolved_at: now,
        // ⚠️ `resolved_by` IS NULL BECAUSE NOBODY PRESSED ANYTHING. Naming an operator here
        // would credit a person with a resolution the system made, and the note says which.
        resolved_by: null,
        resolution_note: reason,
        updated_at: now,
      })
      .eq('kind', kind)
      .eq('dedupe_key', dedupeKey)
      .eq('status', 'open')
      .select('id')) as { data?: Array<{ id?: string }> | null; error?: PgError }

    if (res?.error) {
      const tableMissing = isTableMissing(res.error)
      return { ok: false, closed: 0, tableMissing, error: res.error.message ?? String(res.error) }
    }
    return { ok: true, closed: (res?.data ?? []).length }
  } catch (err) {
    return { ok: false, closed: 0, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Resolve a task. A note is REQUIRED: a resolution with no reason is not evidence, and the
 * whole reason this table exists is that the previous mechanism left nothing behind.
 */
export async function resolveOperatorTask(
  taskId: string,
  opts: { by?: string | null; note: string; status?: 'resolved' | 'dismissed' },
): Promise<{ ok: boolean; error?: string; tableMissing?: boolean }> {
  const note = (opts.note ?? '').trim()
  if (!note) {
    return { ok: false, error: 'a resolution note is required — a resolution with no reason is not evidence' }
  }
  try {
    const res = (await db
      .from('operator_tasks')
      .update({
        status: opts.status ?? 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: opts.by ?? null,
        resolution_note: note,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('status', 'open')
      .select('id')
      .maybeSingle()) as { data?: { id?: string } | null; error?: PgError }

    if (res?.error) {
      const tableMissing = isTableMissing(res.error)
      return { ok: false, tableMissing, error: res.error.message ?? String(res.error) }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
