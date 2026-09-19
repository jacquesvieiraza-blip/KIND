// ── XC-5 · AN ALERT IS NOT A TASK ───────────────────────────────────────────────
//
// WHAT EARNED THIS. Every operator-facing exception in this product is one of two things,
// and neither is a record:
//
//   ① AN EMAIL (`sendFounderAlert`). An email cannot be assigned, resolved, deduped,
//      counted or audited. When it is missed, nothing is left behind. The alert path even
//      has a branch that logs `⛔ ALERT LOST` — an honest admission that the signal can
//      simply evaporate.
//   ② A VALUE DERIVED ON READ (`deriveLifecycle`'s `needsYou`). It exists only while the
//      facts that imply it still hold. An exception that clears itself leaves no evidence
//      it ever happened, and one that needs a human disappears the moment the derivation
//      is changed.
//
// So Vida's Needs-you could not answer "what went wrong last Tuesday", and the founder's
// inbox was the queue. `operator_tasks` is the record; the email is a mirror of it.
//
// ⚠️ THE SUPABASE-JS TRAP IS THE MAIN EVENT HERE. `db.from('operator_tasks')` against a
// database where the migration has not run returns `{ data: null, error }`, and
// `const { data } = await …` reads that as AN EMPTY LIST. A brand-new table is exactly
// where that bites — the code always ships before the migration is run. So "the table is
// not there" must be a distinguishable, loud answer, never an empty queue. That is the
// single most expensive defect class in this repo (553 unchecked destructures).

import { describe, it, expect, vi, beforeEach } from 'vitest'

const from = vi.fn()
vi.mock('@kind/db', () => ({ db: { from: (t: string) => from(t) } }))

import {
  OPERATOR_TASK_KINDS,
  dedupeKeyFor,
  raiseOperatorTask,
  listOpenOperatorTasks,
  resolveOperatorTask,
  type OperatorTaskKind,
} from './operator-tasks'

/** A chainable stub whose terminal call resolves to whatever the test supplies. */
function table(result: unknown) {
  const chain: Record<string, unknown> = {}
  for (const m of ['insert', 'select', 'update', 'eq', 'is', 'in', 'order', 'limit', 'maybeSingle', 'single']) {
    chain[m] = vi.fn(() => chain)
  }
  ;(chain as { then: unknown }).then = (res: (v: unknown) => unknown) => Promise.resolve(result).then(res)
  chain.maybeSingle = vi.fn(async () => result)
  chain.single = vi.fn(async () => result)
  return chain
}

beforeEach(() => {
  from.mockReset()
})

describe('XC-5 · the task kinds are a closed set', () => {
  it('names every class the contract requires, and nothing is a free string', () => {
    // A free-string `kind` cannot be routed, deduped or counted — and a typo becomes a new
    // silent category with one member.
    for (const k of [
      'provider_credits_exhausted',
      'provider_unavailable',
      'provider_refused',
      'sourcing_refused_no_authority',
      'automatic_work_never_started',
      'automatic_work_stuck',
      'sends_stalled',
      'api_down',
      'payment_failed',
      'charge_failed',
      'churn_risk',
      'hot_reply',
      'support_escalation',
      'audit_dropped',
      'new_signup',
    ] satisfies OperatorTaskKind[]) {
      expect(OPERATOR_TASK_KINDS).toContain(k)
    }
  })
})

describe('XC-5 · dedupe is deterministic and scoped', () => {
  it('builds the same key from the same subject, and a different one from a different subject', () => {
    const a = dedupeKeyFor({ clientId: 'c1', subjectKind: 'icp', subjectId: 'i1' })
    const b = dedupeKeyFor({ clientId: 'c1', subjectKind: 'icp', subjectId: 'i1' })
    const c = dedupeKeyFor({ clientId: 'c1', subjectKind: 'icp', subjectId: 'i2' })
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })

  it('a global condition dedupes globally, with no client in the key', () => {
    // Apollo being out of credits is one fact about the company, not one fact per client.
    // Keying it per client would produce a row per client per cron tick.
    expect(dedupeKeyFor({})).toBe('global')
  })
})

describe('XC-5 · raising a task', () => {
  it('writes a row with the kind, the sentence and the evidence', async () => {
    const t = table({ data: { id: 'task-1' }, error: null })
    from.mockReturnValue(t)

    const res = await raiseOperatorTask({
      kind: 'provider_credits_exhausted',
      severity: 'critical',
      title: 'Apollo is out of lead credits — sourcing is returning nothing',
      detail: 'Top up at app.apollo.io → Settings → Billing.',
      evidence: { status: 402 },
    })

    expect(from).toHaveBeenCalledWith('operator_tasks')
    expect(res.ok).toBe(true)
    expect(res.taskId).toBe('task-1')
    const row = (t.insert as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(row.kind).toBe('provider_credits_exhausted')
    expect(row.severity).toBe('critical')
    expect(row.status).toBe('open')
    expect(row.evidence).toEqual({ status: 402 })
    expect(row.dedupe_key).toBe('global')
  })

  // 🛑 THE DEDUPE RACE. The unique index is the authority; the code's job is to read its
  // refusal as "already reported", not as a failure to report.
  it('treats the unique-index refusal as ALREADY REPORTED, not as an error', async () => {
    from.mockReturnValue(
      table({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "operator_tasks_one_open_per_key"' } }),
    )
    const res = await raiseOperatorTask({
      kind: 'provider_credits_exhausted',
      title: 'Apollo is out of lead credits',
    })
    expect(res.ok).toBe(true)
    expect(res.alreadyOpen).toBe(true)
  })

  // 🛑 THE MAIN EVENT. Migration not run → the write fails → the caller must be told, and
  // the sentence must name the fix rather than looking like a transient blip.
  it('says the table is MISSING, loudly, instead of reporting a silent success', async () => {
    from.mockReturnValue(
      table({ data: null, error: { code: '42P01', message: 'relation "public.operator_tasks" does not exist' } }),
    )
    const res = await raiseOperatorTask({ kind: 'api_down', title: 'anything' })
    expect(res.ok).toBe(false)
    expect(res.tableMissing).toBe(true)
    expect(res.error).toMatch(/operator_tasks/)
    expect(res.error).toMatch(/migration/i)
  })

  it('never throws into its caller — an exception path must not break the path it rides on', async () => {
    from.mockImplementation(() => {
      throw new Error('connection reset')
    })
    const res = await raiseOperatorTask({ kind: 'api_down', title: 'anything' })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/connection reset/)
  })

  it('refuses to store a value that looks like a secret', async () => {
    // This table is read in a console and copied into resolution notes. A connection string
    // or a key pasted into `evidence` becomes a credential in a place nobody is guarding —
    // and the production DATABASE_URL has already been exposed once this month.
    const t = table({ data: { id: 'task-1' }, error: null })
    from.mockReturnValue(t)
    await raiseOperatorTask({
      kind: 'api_down',
      title: 'API unreachable',
      evidence: { url: 'postgresql://postgres:hunter2@db.example.com:5432/postgres', status: 500 },
    })
    const row = (t.insert as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(JSON.stringify(row.evidence)).not.toContain('hunter2')
    expect(JSON.stringify(row.evidence)).toContain('[redacted]')
    expect(row.evidence.status).toBe(500)
  })
})

describe('XC-5 · reading the queue', () => {
  it('returns the open tasks', async () => {
    from.mockReturnValue(table({ data: [{ id: 't1', kind: 'api_down' }], error: null }))
    const res = await listOpenOperatorTasks()
    expect(res.ok).toBe(true)
    expect(res.tasks).toHaveLength(1)
  })

  // 🛑 AN EMPTY QUEUE AND AN UNREADABLE QUEUE ARE DIFFERENT SENTENCES. "Nothing needs you"
  // is the most reassuring thing this console can say, and it must never be said because a
  // read failed. That inversion is exactly the Vida "no action needed" defect.
  it('an unreadable queue is NOT an empty queue', async () => {
    from.mockReturnValue(table({ data: null, error: { code: '42P01', message: 'relation "public.operator_tasks" does not exist' } }))
    const res = await listOpenOperatorTasks()
    expect(res.ok).toBe(false)
    expect(res.tasks).toEqual([])
    expect(res.tableMissing).toBe(true)
  })
})

describe('XC-5 · resolving a task', () => {
  it('records who resolved it and why', async () => {
    const t = table({ data: { id: 't1' }, error: null })
    from.mockReturnValue(t)
    const res = await resolveOperatorTask('t1', { by: 'user-9', note: 'topped up' })
    expect(res.ok).toBe(true)
    const patch = (t.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(patch.status).toBe('resolved')
    expect(patch.resolved_by).toBe('user-9')
    expect(patch.resolution_note).toBe('topped up')
    expect(typeof patch.resolved_at).toBe('string')
  })

  it('refuses an empty note — a resolution with no reason is not evidence', async () => {
    const res = await resolveOperatorTask('t1', { by: 'user-9', note: '   ' })
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/note/i)
    expect(from).not.toHaveBeenCalled()
  })
})
