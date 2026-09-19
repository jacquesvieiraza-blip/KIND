// ═══════════════════════════════════════════════════════════════════════════════════════
// XC-5 · VIDA NEEDS-YOU, READ FROM THE DATABASE
//
// ── THE DEFECT THIS CLOSES ─────────────────────────────────────────────────────────────
//
// Vida's Needs-you was entirely DERIVED. `deriveLifecycle` recomputed it from lifecycle
// facts on every read, so it could only ever describe conditions that were STILL TRUE, and
// only conditions it happened to know how to derive. Everything else — a provider out of
// credits, a migration not run, a charge that failed, a reply nobody could attribute — was
// an EMAIL to the founder, and an email is not a queue.
//
// The consequence was concrete. Northvale's ICP sat in unresolved `icp_review`, nothing ran,
// and Vida said no action was needed, because "no action needed" was the honest output of a
// derivation with no input that said otherwise.
//
// ── 🛑 THE ONE INVERSION THIS FILE EXISTS TO PREVENT ──────────────────────────────────
//
// **AN UNREADABLE QUEUE MUST NEVER RENDER AS A CALM ONE.** "Nothing needs you" is the most
// reassuring sentence this console prints. `supabase-js` returns `{data:null,error}` for a
// missing table and a destructured read shows that as an empty list, so the calm sentence is
// exactly what a broken read produces if nobody separates the two. `failed` is therefore a
// distinct state from `empty`, and the copy for it names the fix.
// ═══════════════════════════════════════════════════════════════════════════════════════

export const OPERATOR_TASKS_PATH = '/api/proxy/operator/tasks'

export function resolveTaskPath(taskId: string): string {
  return `/api/proxy/operator/tasks/${encodeURIComponent(taskId)}/resolve`
}

export interface OperatorTask {
  id: string
  kind: string
  severity: string
  title: string
  detail: string | null
  client_id: string | null
  programme_id: string | null
  subject_kind: string | null
  subject_id: string | null
  evidence?: Record<string, unknown>
  created_at: string
}

export interface TasksPayload {
  success?: boolean
  data?: { tasks?: OperatorTask[]; open?: number; critical?: number }
  error?: string
  table_missing?: boolean
}

export type TasksViewState = 'loading' | 'ok' | 'empty' | 'failed'

export interface TasksView {
  state: TasksViewState
  tasks: OperatorTask[]
  critical: number
  error: string | null
  /** The table is not there. A different sentence, and a different fix, from a bad read. */
  tableMissing: boolean
}

export const TASKS_EMPTY_COPY = 'Nothing needs you. Normal is silent.'

/**
 * The sentence shown when the queue could not be read.
 *
 * ⚠️ IT DOES NOT SAY "no tasks". Saying so would be the inversion this whole file exists to
 * prevent, and it would be said in exactly the situation where a human most needs to know
 * the console is blind.
 */
export const TASKS_FAILED_COPY =
  'The task queue could not be read, so this list is NOT empty — it is unknown.'

export const TASKS_TABLE_MISSING_COPY =
  'The operator_tasks table does not exist yet. Run 20260917_operator_tasks_and_automatic_work ' +
  'from Vida → System → Engine. Until then no exception is being recorded, and this list is ' +
  'blank because nothing can be stored — not because nothing is wrong.'

/** Severity order for display: the thing that can lose money first. */
const SEVERITY_RANK: Record<string, number> = { critical: 0, warn: 1, info: 2 }

export function sortTasks(tasks: OperatorTask[]): OperatorTask[] {
  return [...tasks].sort((a, b) => {
    const s = (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9)
    if (s !== 0) return s
    // Oldest first inside a severity: a critical exception that has been open longest is the
    // one that has been ignored longest.
    return a.created_at.localeCompare(b.created_at)
  })
}

/** Operator-facing words for a machine class. An unmapped kind shows its raw class rather
 *  than a friendly guess — a wrong label on an exception is worse than an ugly one. */
const KIND_LABEL: Record<string, string> = {
  provider_credits_exhausted: 'Provider credits exhausted',
  provider_unavailable: 'Provider unavailable',
  provider_refused: 'Provider refused the request',
  sourcing_refused_no_authority: 'Sourcing refused — no authority',
  automatic_work_never_started: 'Automatic work never started',
  automatic_work_stuck: 'Automatic work is stuck',
  sends_stalled: 'Sending has stalled',
  api_down: 'API problem',
  payment_failed: 'Payment failed',
  charge_failed: 'Charge failed',
  churn_risk: 'Churn risk',
  hot_reply: 'A prospect replied',
  support_escalation: 'Support escalation',
  audit_dropped: 'An audit row was lost',
  new_signup: 'New signup',
  source_down: 'Lead source down',
}

export function labelForKind(kind: string): string {
  return KIND_LABEL[kind] ?? kind
}

/**
 * Turn the API's answer into a view. Pure, so every branch — including the two failure
 * branches nobody exercises by accident — is testable without a browser.
 */
export function toTasksView(payload: TasksPayload | null | undefined): TasksView {
  if (!payload || payload.success !== true) {
    const tableMissing = payload?.table_missing === true
    return {
      state: 'failed',
      tasks: [],
      critical: 0,
      tableMissing,
      error: tableMissing
        ? TASKS_TABLE_MISSING_COPY
        : payload?.error ?? TASKS_FAILED_COPY,
    }
  }
  const tasks = sortTasks(payload.data?.tasks ?? [])
  return {
    state: tasks.length === 0 ? 'empty' : 'ok',
    tasks,
    critical: tasks.filter((t) => t.severity === 'critical').length,
    tableMissing: false,
    error: null,
  }
}

export async function loadOperatorTasks(
  get: (path: string) => Promise<TasksPayload>,
): Promise<TasksView> {
  try {
    return toTasksView(await get(OPERATOR_TASKS_PATH))
  } catch (err) {
    return {
      state: 'failed',
      tasks: [],
      critical: 0,
      tableMissing: false,
      error: `${TASKS_FAILED_COPY} (${err instanceof Error ? err.message : String(err)})`,
    }
  }
}

/**
 * A resolution needs a reason. Checked here as well as on the server, so the operator is
 * told before the round trip rather than after it.
 */
export function validateResolution(note: string): { ok: true } | { ok: false; error: string } {
  if (note.trim().length < 3) {
    return { ok: false, error: 'Say what you did. A resolution with no reason is not evidence.' }
  }
  return { ok: true }
}
