// ── XC-5 · VIDA RENDERS THE PERSISTED QUEUE, AND NEVER MISREADS A BLIND ONE ─────
//
// The panel itself is thin; the decisions are in `apps/admin/src/lib/vida-operator-tasks.ts`
// and that is what is tested, the same split `vida-proof-claims` uses.
//
// 🛑 THE ASSERTION THAT MATTERS is the third block. "Nothing needs you" is the most
// reassuring sentence this console prints, and a failed read must never produce it. That
// exact inversion — an unreadable answer rendering as a calm one — is what let Northvale sit
// in an unresolved review while Vida reported no action needed.

import { describe, it, expect } from 'vitest'
import {
  toTasksView,
  sortTasks,
  labelForKind,
  validateResolution,
  loadOperatorTasks,
  resolveTaskPath,
  OPERATOR_TASKS_PATH,
  TASKS_EMPTY_COPY,
  TASKS_FAILED_COPY,
  TASKS_TABLE_MISSING_COPY,
  type OperatorTask,
} from './vida-operator-tasks'

const task = (over: Partial<OperatorTask> = {}): OperatorTask => ({
  id: 't1',
  kind: 'provider_credits_exhausted',
  severity: 'critical',
  title: 'Apollo is out of lead credits',
  detail: null,
  client_id: null,
  programme_id: null,
  subject_kind: null,
  subject_id: null,
  created_at: '2026-09-17T10:00:00.000Z',
  ...over,
})

describe('XC-5 · the queue renders', () => {
  it('shows the open tasks, most severe first', () => {
    const v = toTasksView({
      success: true,
      data: {
        tasks: [
          task({ id: 'a', severity: 'info', kind: 'new_signup' }),
          task({ id: 'b', severity: 'critical' }),
          task({ id: 'c', severity: 'warn', kind: 'sends_stalled' }),
        ],
      },
    })
    expect(v.state).toBe('ok')
    expect(v.tasks.map((t) => t.id)).toEqual(['b', 'c', 'a'])
    expect(v.critical).toBe(1)
  })

  it('inside one severity, the longest-open comes first', () => {
    const out = sortTasks([
      task({ id: 'new', created_at: '2026-09-17T12:00:00.000Z' }),
      task({ id: 'old', created_at: '2026-09-15T12:00:00.000Z' }),
    ])
    // A critical exception open longest is the one ignored longest.
    expect(out.map((t) => t.id)).toEqual(['old', 'new'])
  })

  it('an empty queue says normal is silent', () => {
    const v = toTasksView({ success: true, data: { tasks: [] } })
    expect(v.state).toBe('empty')
    expect(TASKS_EMPTY_COPY).toMatch(/nothing needs you/i)
  })
})

describe('XC-5 · an unreadable queue is NEVER a calm one', () => {
  it('a failed response is `failed`, not `empty`', () => {
    const v = toTasksView({ success: false, error: 'connection reset' })
    expect(v.state).toBe('failed')
    expect(v.tasks).toEqual([])
    expect(v.error).toBe('connection reset')
  })

  it('a missing table gets its own sentence, naming the migration', () => {
    const v = toTasksView({ success: false, table_missing: true, error: 'whatever' })
    expect(v.state).toBe('failed')
    expect(v.tableMissing).toBe(true)
    expect(v.error).toBe(TASKS_TABLE_MISSING_COPY)
    expect(v.error).toContain('20260917_operator_tasks_and_automatic_work')
  })

  it('a null or garbage payload is `failed`', () => {
    for (const p of [null, undefined, {} as never, { data: { tasks: [] } } as never]) {
      expect(toTasksView(p).state, JSON.stringify(p)).toBe('failed')
    }
  })

  it('the failure copy does not claim there are no tasks', () => {
    // The whole point: the words shown on a blind read must not be reassuring.
    expect(TASKS_FAILED_COPY).not.toMatch(/nothing needs you/i)
    expect(TASKS_FAILED_COPY).toMatch(/not empty|unknown/i)
  })

  it('a thrown fetch is `failed` and carries the reason', async () => {
    const v = await loadOperatorTasks(async () => {
      throw new Error('offline')
    })
    expect(v.state).toBe('failed')
    expect(v.error).toContain('offline')
  })

  it('reads the proxied operator route', async () => {
    let seen = ''
    await loadOperatorTasks(async (p) => {
      seen = p
      return { success: true, data: { tasks: [] } }
    })
    expect(seen).toBe(OPERATOR_TASKS_PATH)
    expect(OPERATOR_TASKS_PATH).toContain('/api/proxy/operator/tasks')
  })
})

describe('XC-5 · labels and resolution', () => {
  it('names each class in operator language', () => {
    expect(labelForKind('provider_credits_exhausted')).toMatch(/credits/i)
    expect(labelForKind('automatic_work_never_started')).toMatch(/never started/i)
  })

  it('an unmapped kind shows its raw class rather than a friendly guess', () => {
    // A wrong label on an exception is worse than an ugly one.
    expect(labelForKind('something_new')).toBe('something_new')
  })

  it('refuses an empty resolution before the round trip', () => {
    expect(validateResolution('  ').ok).toBe(false)
    expect(validateResolution('ok').ok).toBe(false)
    expect(validateResolution('topped up the Apollo account').ok).toBe(true)
  })

  it('builds the resolve path from the id, encoded', () => {
    expect(resolveTaskPath('a/b')).toBe('/api/proxy/operator/tasks/a%2Fb/resolve')
  })
})
