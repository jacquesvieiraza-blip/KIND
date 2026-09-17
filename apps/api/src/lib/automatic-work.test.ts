// ── XC-6 · NOTHING IN THIS PRODUCT OWNED TIME ───────────────────────────────────
//
// WHAT EARNED THIS (RC-9 / D-28 / FD-0). The system promises to do things by itself: start
// a Proof, promote a Brief, prepare a programme. Not one of those promises was written
// down with a moment and a bound. So:
//
//   · "requested but never started" was indistinguishable from "never requested";
//   · "started and never came back" was indistinguishable from "still going";
//   · and the only clocks that existed were derived on read, so a run that silently never
//     happened looked exactly like one that had not happened YET — forever.
//
// That is the Northvale shape precisely. The ICP sat in unresolved `icp_review`, Proof was
// never claimed, nothing ran, and the two consoles each inferred a comfortable story from
// the absence: Milla said "finding your first examples" (from the stage name) and Vida said
// no action was needed (from the ICP row existing). Neither was lying about its inputs.
// Neither had an input that said "this was due 40 minutes ago".
//
// FD-0 requires BOTH automatic recovery and an audited operator action. Both need a
// persisted state to recover FROM. This is that state, and the detector that reads it.
//
// ⚠️ THE CLOCK IS INJECTED, ALWAYS. A detector that reads `Date.now()` internally can only
// be tested by waiting, which means it is tested by nobody.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const from = vi.fn()
const rpc = vi.fn()
const raiseOperatorTask = vi.fn(async () => ({ ok: true, taskId: 'task-1' }))

vi.mock('@kind/db', () => ({ db: { from: (t: string) => from(t), rpc: (n: string, a: unknown) => rpc(n, a) } }))
vi.mock('./operator-tasks', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>
  return { ...actual, raiseOperatorTask: (i: unknown) => raiseOperatorTask(i as never) }
})

import {
  AUTOMATIC_WORK_KINDS,
  boundSecondsFor,
  requestAutomaticWork,
  markAutomaticWorkStarted,
  markAutomaticWorkCompleted,
  markAutomaticWorkFailed,
  classifyOverdue,
  detectOverdueAutomaticWork,
  type AutomaticWorkRow,
} from './automatic-work'

function table(result: unknown) {
  const chain: Record<string, unknown> = {}
  for (const m of ['insert', 'select', 'update', 'eq', 'in', 'is', 'order', 'limit', 'lt']) {
    chain[m] = vi.fn(() => chain)
  }
  ;(chain as { then: unknown }).then = (res: (v: unknown) => unknown) => Promise.resolve(result).then(res)
  chain.maybeSingle = vi.fn(async () => result)
  return chain
}

const T0 = '2026-09-17T10:00:00.000Z'
const ms = (iso: string) => new Date(iso).getTime()

beforeEach(() => {
  from.mockReset()
  rpc.mockReset()
  raiseOperatorTask.mockClear()
})

describe('XC-6 · the work kinds and their bounds', () => {
  it('every kind has a positive bound', () => {
    for (const k of AUTOMATIC_WORK_KINDS) {
      expect(boundSecondsFor(k), `${k} has no bound`).toBeGreaterThan(0)
    }
  })

  it('a Proof run is bounded in minutes, not hours — a client is watching the screen', () => {
    expect(boundSecondsFor('proof_run')).toBeLessThanOrEqual(15 * 60)
  })

  it('an unknown kind gets a bound rather than undefined', () => {
    // A missing bound would make `requested_at + bound` NaN, and a NaN comparison is
    // always false — so the detector would silently never fire for that kind.
    expect(boundSecondsFor('not_a_real_kind' as never)).toBeGreaterThan(0)
  })
})

describe('XC-6 · requesting work writes the promise down', () => {
  it('records the kind, the subject, the moment and the bound in force NOW', async () => {
    const t = table({ data: { id: 'w1' }, error: null })
    from.mockReturnValue(t)
    const res = await requestAutomaticWork({
      kind: 'proof_run', subjectKind: 'client', subjectId: 'c1', clientId: 'c1', now: T0,
    })
    expect(res.ok).toBe(true)
    expect(res.workId).toBe('w1')
    const row = (t.insert as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(row.kind).toBe('proof_run')
    expect(row.state).toBe('requested')
    expect(row.requested_at).toBe(T0)
    // Stored per row, not read from a constant at detection time — so a later deploy
    // cannot retroactively make a late run look punctual.
    expect(row.bound_seconds).toBe(boundSecondsFor('proof_run'))
  })

  // 🛑 FD-0: recovery "must not create concurrent runs". The partial unique index
  // `automatic_work_one_live_per_subject` is what promises that; the code's job is to read
  // its refusal as "already live", not as a failure.
  it('a second live request for the same subject is refused by the index and read as ALREADY LIVE', async () => {
    from.mockReturnValue(table({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint "automatic_work_one_live_per_subject"' },
    }))
    const res = await requestAutomaticWork({ kind: 'proof_run', subjectKind: 'client', subjectId: 'c1', now: T0 })
    expect(res.ok).toBe(true)
    expect(res.alreadyLive).toBe(true)
    expect(res.workId).toBeUndefined()
  })

  it('a missing table is a loud answer, not a silent success', async () => {
    from.mockReturnValue(table({ data: null, error: { code: '42P01', message: 'relation "public.automatic_work" does not exist' } }))
    const res = await requestAutomaticWork({ kind: 'proof_run', subjectKind: 'client', subjectId: 'c1', now: T0 })
    expect(res.ok).toBe(false)
    expect(res.tableMissing).toBe(true)
    expect(res.error).toMatch(/migration/i)
  })
})

describe('XC-6 · the state transitions', () => {
  it('started stamps started_at and leaves requested_at alone', async () => {
    const t = table({ data: { id: 'w1' }, error: null })
    from.mockReturnValue(t)
    await markAutomaticWorkStarted('w1', { now: T0 })
    const patch = (t.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(patch.state).toBe('started')
    expect(patch.started_at).toBe(T0)
    expect(patch.requested_at).toBeUndefined()
  })

  it('completed is terminal and carries its moment', async () => {
    const t = table({ data: { id: 'w1' }, error: null })
    from.mockReturnValue(t)
    await markAutomaticWorkCompleted('w1', { now: T0 })
    const patch = (t.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(patch.state).toBe('completed')
    expect(patch.completed_at).toBe(T0)
  })

  it('failed carries the reason — "it failed" with no reason cannot be recovered from', async () => {
    const t = table({ data: { id: 'w1' }, error: null })
    from.mockReturnValue(t)
    await markAutomaticWorkFailed('w1', { reason: 'apollo 402 credits exhausted', now: T0 })
    const patch = (t.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(patch.state).toBe('failed')
    expect(patch.failed_at).toBe(T0)
    expect(patch.failure_reason).toBe('apollo 402 credits exhausted')
  })

  it('a transition only moves a row that is still live — a completed run is never reopened', async () => {
    const t = table({ data: { id: 'w1' }, error: null })
    from.mockReturnValue(t)
    await markAutomaticWorkStarted('w1', { now: T0 })
    // `.in('state', ['requested'])` — a started/completed row must not be dragged back.
    const inCall = (t.in as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(inCall[0]).toBe('state')
    expect(inCall[1]).toEqual(['requested'])
  })
})

// ── THE DETECTOR — the whole point ──────────────────────────────────────────────

const row = (over: Partial<AutomaticWorkRow>): AutomaticWorkRow => ({
  id: 'w1',
  kind: 'proof_run',
  subject_kind: 'client',
  subject_id: 'c1',
  client_id: 'c1',
  state: 'requested',
  bound_seconds: 600,
  requested_at: T0,
  started_at: null,
  completed_at: null,
  failed_at: null,
  stuck_at: null,
  attempt: 1,
  failure_reason: null,
  detected_task_id: null,
  ...over,
})

describe('XC-6 · classifyOverdue — clock-driven, no database', () => {
  it('requested, inside the bound → nothing', () => {
    expect(classifyOverdue(row({}), ms(T0) + 599_000)).toBeNull()
  })

  it('requested, past the bound → NEVER STARTED', () => {
    expect(classifyOverdue(row({}), ms(T0) + 601_000)).toBe('automatic_work_never_started')
  })

  it('started, past the bound measured from the START → STUCK', () => {
    // The bound restarts at `started_at`: a run that began late but is progressing is not
    // stuck, and measuring from `requested_at` would flag it while it was still working.
    const r = row({ state: 'started', started_at: '2026-09-17T10:05:00.000Z' })
    expect(classifyOverdue(r, ms('2026-09-17T10:14:00.000Z'))).toBeNull()
    expect(classifyOverdue(r, ms('2026-09-17T10:16:00.000Z'))).toBe('automatic_work_stuck')
  })

  it('completed → nothing, whatever the clock says', () => {
    expect(classifyOverdue(row({ state: 'completed', completed_at: T0 }), ms(T0) + 86_400_000)).toBeNull()
  })

  it('failed → nothing HERE: a failure reported itself and is not silence', () => {
    // A failure is a different recovery from silence (FD-0), and it has already produced
    // its own task at the point it failed. Raising a second one would double-report it.
    expect(classifyOverdue(row({ state: 'failed', failed_at: T0 }), ms(T0) + 86_400_000)).toBeNull()
  })

  it('already stuck → nothing: it has been reported once', () => {
    expect(classifyOverdue(row({ state: 'stuck', stuck_at: T0 }), ms(T0) + 86_400_000)).toBeNull()
  })

  it('a row already carrying a detector task is not re-reported', () => {
    expect(classifyOverdue(row({ detected_task_id: 'task-1' }), ms(T0) + 601_000)).toBeNull()
  })

  it('a nonsense bound falls back to the default and STILL fires', () => {
    // NaN comparisons are always false, so a bad bound would otherwise mean "never
    // overdue" — the exact blindness this whole item exists to remove. The column carries
    // a `bound_seconds > 0` CHECK so these values cannot be stored, but the detector must
    // not depend on that: it falls back to a real bound rather than to silence.
    for (const bad of [0, -5, NaN, undefined as unknown as number, 'soon' as unknown as number]) {
      const r = row({ bound_seconds: bad })
      expect(classifyOverdue(r, ms(T0) + 60_000), `bound ${String(bad)} fired too early`).toBeNull()
      expect(classifyOverdue(r, ms(T0) + 3_600_000), `bound ${String(bad)} never fires`).toBe(
        'automatic_work_never_started',
      )
    }
  })

  it('an unparseable requested_at is itself a finding, not a reason to stay quiet', () => {
    expect(classifyOverdue(row({ requested_at: 'not a date' }), ms(T0))).toBe('automatic_work_never_started')
  })
})

describe('XC-6 · detectOverdueAutomaticWork', () => {
  it('turns a never-started unit into a task and marks it stuck', async () => {
    const t = table({ data: [row({})], error: null })
    from.mockReturnValue(t)
    const res = await detectOverdueAutomaticWork({ nowMs: ms(T0) + 601_000 })

    expect(res.ok).toBe(true)
    expect(res.raised).toBe(1)
    expect(raiseOperatorTask).toHaveBeenCalledTimes(1)
    const task = raiseOperatorTask.mock.calls[0][0] as Record<string, unknown>
    expect(task.kind).toBe('automatic_work_never_started')
    expect(task.clientId).toBe('c1')
    expect(task.subjectKind).toBe('client')
    expect(task.subjectId).toBe('c1')
    // The operator must be able to act without opening a terminal.
    expect(String(task.title)).toMatch(/proof/i)
    expect((task.evidence as Record<string, unknown>).bound_seconds).toBe(600)

    const patch = (t.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(patch.state).toBe('stuck')
    expect(patch.detected_task_id).toBe('task-1')
  })

  it('raises nothing when everything is inside its bound', async () => {
    from.mockReturnValue(table({ data: [row({})], error: null }))
    const res = await detectOverdueAutomaticWork({ nowMs: ms(T0) + 60_000 })
    expect(res.ok).toBe(true)
    expect(res.raised).toBe(0)
    expect(raiseOperatorTask).not.toHaveBeenCalled()
  })

  // 🛑 AN UNREADABLE LIST IS NOT AN EMPTY LIST. "Nothing is overdue" said because the read
  // failed is exactly the Vida "no action needed" defect, in the one place built to catch it.
  it('an unreadable table reports NOT OK rather than "nothing is overdue"', async () => {
    from.mockReturnValue(table({ data: null, error: { code: '42P01', message: 'relation "public.automatic_work" does not exist' } }))
    const res = await detectOverdueAutomaticWork({ nowMs: ms(T0) })
    expect(res.ok).toBe(false)
    expect(res.tableMissing).toBe(true)
    expect(res.raised).toBe(0)
  })

  it('one bad row does not stop the rest of the sweep', async () => {
    const t = table({ data: [row({ id: 'w1' }), row({ id: 'w2', subject_id: 'c2', client_id: 'c2' })], error: null })
    from.mockReturnValue(t)
    raiseOperatorTask.mockRejectedValueOnce(new Error('boom') as never)
    const res = await detectOverdueAutomaticWork({ nowMs: ms(T0) + 601_000 })
    expect(res.raised).toBe(1)
    expect(res.failed).toBe(1)
  })
})
