// ── XC-5 · EVERY ALERT CLASS BECOMES A PERSISTED TASK, AND THE EMAIL IS THE MIRROR ──
//
// R117 / D-47. `sendFounderAlert` pushed to email and Slack, wrote a `founder_alerts` row
// for the founder to browse, and that was the end of it. None of those three is a QUEUE:
// nothing can be assigned, deduped, resolved with a reason, counted, or shown in Vida
// Needs-you — which is where the person who has to act actually looks.
//
// So the durable half moves: an alert now writes an `operator_tasks` row as well, and the
// email becomes a mirror of it. `founder_alerts` is KEPT — it is what the existing admin
// surface reads, and removing it would break a working screen to tidy a layer.
//
// ⚠️ THE MAPPING MUST BE TOTAL. An `AlertKind` with no task class would push an email and
// silently write no task — the exact gap this item closes, reintroduced for one value. The
// first test below is what makes adding an alert kind without a task class impossible.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const insert = vi.fn(async () => ({ data: null, error: null }))
const raiseOperatorTask = vi.fn(async () => ({ ok: true, taskId: 't1' }))

vi.mock('@kind/db', () => ({
  db: {
    from: () => ({
      insert: (row: unknown) => insert(row),
    }),
  },
}))
vi.mock('./operator-tasks', async (orig) => {
  const actual = (await orig()) as Record<string, unknown>
  return { ...actual, raiseOperatorTask: (i: unknown) => raiseOperatorTask(i as never) }
})

import { sendFounderAlert, ALERT_KINDS, ALERT_TASK_CLASS, ALERT_TASK_SEVERITY } from './alerts'
import { OPERATOR_TASK_KINDS } from './operator-tasks'

beforeEach(() => {
  insert.mockClear()
  raiseOperatorTask.mockClear()
  delete process.env.RESEND_API_KEY
  delete process.env.SLACK_WEBHOOK_URL
})

describe('XC-5 · the alert→task mapping is total', () => {
  it('every AlertKind has a task class', () => {
    for (const k of ALERT_KINDS) {
      expect(ALERT_TASK_CLASS[k], `AlertKind '${k}' has no operator_tasks class`).toBeTruthy()
      expect(OPERATOR_TASK_KINDS).toContain(ALERT_TASK_CLASS[k])
    }
  })

  it('every AlertKind has a severity, and the money/outage ones are critical', () => {
    for (const k of ALERT_KINDS) {
      expect(ALERT_TASK_SEVERITY[k]).toMatch(/^(info|warn|critical)$/)
    }
    expect(ALERT_TASK_SEVERITY.payment_failed).toBe('critical')
    expect(ALERT_TASK_SEVERITY.charge_failed).toBe('critical')
    expect(ALERT_TASK_SEVERITY.api_down).toBe('critical')
    expect(ALERT_TASK_SEVERITY.source_down).toBe('critical')
    // A signup is good news. Filing it as an exception would train the operator to ignore
    // the list — "NORMAL IS SILENT" is the whole design of Needs-you.
    expect(ALERT_TASK_SEVERITY.new_signup).toBe('info')
  })
})

describe('XC-5 · an alert writes a task', () => {
  it('raises a task carrying the subject, the body and the alert kind', async () => {
    await sendFounderAlert('source_down', 'Apollo search is failing', ['line one', 'line two'])
    expect(raiseOperatorTask).toHaveBeenCalledTimes(1)
    const t = raiseOperatorTask.mock.calls[0][0] as Record<string, unknown>
    expect(t.kind).toBe('source_down')
    expect(t.title).toBe('Apollo search is failing')
    expect(String(t.detail)).toContain('line one')
    expect((t.evidence as Record<string, unknown>).alert_kind).toBe('source_down')
  })

  it('still writes the founder_alerts row — the existing admin surface reads it', async () => {
    await sendFounderAlert('churn_risk', 'A client went quiet', ['detail'])
    expect(insert).toHaveBeenCalledTimes(1)
  })

  it('reports the task outcome to the caller, so nobody can claim a queue entry it did not get', async () => {
    raiseOperatorTask.mockResolvedValueOnce({ ok: false, taskId: undefined } as never)
    const res = await sendFounderAlert('api_down', 'API is down', ['detail'])
    expect(res.taskOk).toBe(false)
    // `delivered` is unchanged in meaning: the durable founder_alerts row still counts.
    expect(res.delivered).toBe(true)
  })

  it('a failing task write never breaks the path the alert rides on', async () => {
    raiseOperatorTask.mockRejectedValueOnce(new Error('boom') as never)
    await expect(sendFounderAlert('hot_reply', 'A prospect replied', ['detail'])).resolves.toMatchObject({
      taskOk: false,
    })
  })

  it('a hot reply and a signup are never deduped — each occurrence is its own event', async () => {
    await sendFounderAlert('hot_reply', 'A prospect replied', ['detail'])
    expect((raiseOperatorTask.mock.calls[0][0] as Record<string, unknown>).dedupeKey).toBeNull()
    raiseOperatorTask.mockClear()
    await sendFounderAlert('new_signup', 'Somebody signed up', ['detail'])
    expect((raiseOperatorTask.mock.calls[0][0] as Record<string, unknown>).dedupeKey).toBeNull()
  })

  it('a recurring outage IS deduped — twelve identical rows a day is a list nobody reads', async () => {
    await sendFounderAlert('source_down', 'Apollo search is failing', ['detail'])
    const t = raiseOperatorTask.mock.calls[0][0] as Record<string, unknown>
    // Not null → the partial unique index collapses repeats while one stays open.
    expect(t.dedupeKey).not.toBeNull()
  })
})
