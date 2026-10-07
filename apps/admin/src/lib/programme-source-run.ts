// ⚑ 6 Oct (N3) — WHAT VIDA SAYS AFTER "Confirm & source".
//
// ⛓️ WAS: the press waited for the whole batch (minutes). The proxy stopped waiting at 45s and
// said the request was "abandoned" while the run carried on and finished, and the confirm box
// stayed open inviting a second press. Now the API answers at once (202) and runs the batch after;
// Vida closes the box, says it is sourcing, and reads the run's state until it is done.

/** How Vida reads the press's answer. */
export type SourcePressOutcome =
  | { kind: 'running' }
  | { kind: 'done'; inserted: number | null; note: string | null }
  | { kind: 'error'; message: string }

export function sourcePressOutcome(status: number, json: Record<string, unknown> | null): SourcePressOutcome {
  const j = json ?? {}
  // The API took the run (202), or one is already running, or Vida stopped waiting (a timeout
  // means the work may still be going): in each case the honest answer is "sourcing", never a
  // failure, and never an invitation to press again.
  if ((status === 202 && j.started === true) || j.reason === 'already_sourcing' || j.timeout === true) {
    return { kind: 'running' }
  }
  if (status >= 200 && status < 300 && j.success === true) {
    // An API from before this change answers 200 with the finished result.
    return { kind: 'done', inserted: typeof j.inserted === 'number' ? j.inserted : null, note: typeof j.note === 'string' ? j.note : null }
  }
  return { kind: 'error', message: typeof j.error === 'string' && j.error ? j.error : `Sourcing failed (${status})` }
}

export type SourceRunStatus = null | {
  state: 'requested' | 'started' | 'completed' | 'failed' | 'stuck'
  failure_reason?: string | null
  inserted?: number | null
}

/** What one read of the run's state means for the screen. */
export type SourceRunView =
  | { kind: 'running'; line: string }
  | { kind: 'done'; line: string }
  | { kind: 'failed'; line: string }

export const SOURCING_LINE = 'Sourcing this programme’s next batch… This takes a few minutes. Vida updates by itself — nothing to press.'

export function sourceRunView(s: SourceRunStatus): SourceRunView {
  if (!s || s.state === 'requested' || s.state === 'started') return { kind: 'running', line: SOURCING_LINE }
  if (s.state === 'completed') {
    const n = typeof s.inserted === 'number' ? s.inserted : null
    return { kind: 'done', line: n === null ? 'Sourced. The new batch is in the pipeline above.' : `Sourced ${n} ${n === 1 ? 'person' : 'people'} for this programme. The new batch is in the pipeline above.` }
  }
  if (s.state === 'stuck') return { kind: 'failed', line: 'The sourcing run went quiet and has been raised as a task for you. Do not start another run by hand.' }
  return { kind: 'failed', line: `Sourcing stopped: ${s.failure_reason || 'no reason was recorded'}.` }
}

export const SOURCE_STATUS_ENDPOINT = (programmeId: string) =>
  `/api/proxy/operator/programme/source/status?programme_id=${encodeURIComponent(programmeId)}`

/** How often Vida reads the run, and for how long before it stops and says so. */
export const SOURCE_POLL_MS = 10_000
export const SOURCE_POLL_GIVE_UP_MS = 35 * 60_000
