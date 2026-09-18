// ══════════════════════════════════════════════════════════════════════════════════════════
// J2-C1 · AN UNRESOLVED WELCOME EMAIL IS A TASK ABOUT A NAMED CLIENT
//
// ── WHAT IS ALREADY RIGHT ───────────────────────────────────────────────────────────────
//
// The welcome state machine (S1-AUDIT-006 · R120) is careful: `payload_conflict` and
// `unresolved_expired` send nothing, keep the claim, write the outcome column, and alert — and
// the alert names the client, the company, what happened and where to go. XC-5's bridge then
// turns that alert into an `operator_tasks` row, and `support_escalation` is in `NEVER_DEDUPED`
// so a second client's unresolved welcome does not collide with the first one's.
//
// ── THE DEFECT: THE TASK IS NOT ABOUT ANYBODY ───────────────────────────────────────────
//
// `sendFounderAlert(kind, subject, lines)` has no way to say WHO an alert is about, so the
// bridge raises every task with `client_id: null`:
//
//     dedupeKey: NEVER_DEDUPED.has(kind) ? null : `alert:${kind}:${dedupeKeyFor({})}`,
//     // "these classes are facts about the company, not about a client we can name here"
//
// 🛑 THAT SENTENCE IS TRUE OF `api_down` AND FALSE OF THIS ONE. An unresolved welcome email is
// a fact about ONE named client, and three things follow from the row not knowing it:
//
//   ① `listOpenOperatorTasks({ clientId })` — the per-client rail — never returns it, so the
//      one screen an operator opens when working that client shows nothing.
//   ② it cannot be resolved by the condition clearing, because nothing can look it up.
//   ③ the client id survives only inside the title/body PROSE, which is exactly the shape
//      XC-5 exists to replace: a sentence a human has to read and re-key.
//
// ── AND THE DEDUPED CLASSES HAVE THE MIRROR PROBLEM ─────────────────────────────────────
//
// For a kind NOT in `NEVER_DEDUPED`, the key is `alert:<kind>:global`. `charge_failed` is a
// fact about one client's card, so the first client's failure files a row and every later
// client's hits the unique index and files NOTHING. Global is right for `api_down` and
// `source_down`; it is wrong the moment an alert can name a subject.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest'

type Row = Record<string, unknown>

const store = vi.hoisted(() => ({ tasks: [] as Row[], alerts: [] as Row[], clients: [] as Row[], seq: 0 }))

vi.mock('@kind/db', () => {
  const bag = (t: string): Row[] =>
    t === 'operator_tasks' ? store.tasks : t === 'founder_alerts' ? store.alerts : store.clients
  const from = (t: string) => {
    const f: ((r: Row) => boolean)[] = []
    const q: Record<string, unknown> = {
      select() { return q },
      eq(c: string, v: unknown) { f.push(r => r[c] === v); return q },
      is(c: string, v: unknown) { f.push(r => (r[c] ?? null) === v); return q },
      in(c: string, v: unknown[]) { f.push(r => v.includes(r[c])); return q },
      not() { return q }, order() { return q }, limit() { return q },
      async maybeSingle() { return { data: bag(t).filter(r => f.every(fn => fn(r)))[0] ?? null, error: null } },
      insert(row: Row) {
        // The partial unique index: ONE open task per (kind, dedupe_key), null never collides.
        const clash = t === 'operator_tasks' && row.dedupe_key != null && store.tasks.some(r =>
          r.kind === row.kind && r.dedupe_key === row.dedupe_key && r.status === 'open')
        const made = { id: `${t}-${++store.seq}`, status: 'open', ...row }
        const done = clash
          ? { data: null, error: { code: '23505', message: 'duplicate key value' } }
          : { data: made, error: null as unknown }
        const push = () => { if (!clash) bag(t).push(made) }
        return {
          select: () => ({
            async maybeSingle() { push(); return done },
            async single() { push(); return done },
            then(res: (v: unknown) => unknown) { push(); return res(done) },
          }),
          then(res: (v: unknown) => unknown) { push(); return res(done) },
        }
      },
      update(patch: Row) {
        const uf: ((r: Row) => boolean)[] = []
        const u: Record<string, unknown> = {
          eq(c: string, v: unknown) { uf.push(r => r[c] === v); return u },
          select() { return u },
          then(res: (v: unknown) => unknown) {
            const hit = bag(t).filter(x => uf.every(fn => fn(x)))
            for (const r of hit) Object.assign(r, patch)
            return res({ data: hit, error: null })
          },
        }
        return u
      },
      then(res: (v: unknown) => unknown) { return res({ data: bag(t).filter(r => f.every(fn => fn(r))), error: null }) },
    }
    return q
  }
  return { db: { from, rpc: async () => ({ data: null, error: null }) } }
})

const A = 'c1111111-1111-4111-8111-111111111111'
const B = 'c2222222-2222-4222-8222-222222222222'

beforeEach(() => {
  store.tasks = []; store.alerts = []; store.clients = []; store.seq = 0
  vi.resetModules()
})

describe('J2-C1 · the task knows which client it is about', () => {
  it('🛑 an unresolved welcome raises a task ATTACHED to the client', async () => {
    const { sendFounderAlert } = await import('./alerts')
    await sendFounderAlert(
      'support_escalation',
      'A welcome email needs a human — it cannot be retried safely',
      [`Client ${A} (Redmayne).`, 'Nothing has been sent automatically.'],
      { clientId: A, subjectKind: 'client', subjectId: A },
    )
    const t = store.tasks[0]
    expect(t, 'no task was raised at all').toBeTruthy()
    expect(
      t.client_id,
      'the task is not attached to anybody — the per-client rail will never show it, and the '
      + 'client id survives only inside the title prose',
    ).toBe(A)
    expect(t.subject_kind).toBe('client')
    expect(t.subject_id).toBe(A)
  })

  it('🛑 the per-client rail can actually find it — which is the whole point', async () => {
    const { sendFounderAlert } = await import('./alerts')
    await sendFounderAlert('support_escalation', 'A welcome email needs a human', ['x'],
      { clientId: A, subjectKind: 'client', subjectId: A })
    const { listOpenOperatorTasks } = await import('./operator-tasks')
    const out = await listOpenOperatorTasks({ clientId: A })
    expect(out.ok).toBe(true)
    expect(
      out.tasks.map(t => t.kind),
      "the operator opened this client and Vida showed nothing, because the row does not know whose it is",
    ).toContain('support_escalation')
  })

  it('two clients each get their own row — one is not swallowed by the other', async () => {
    const { sendFounderAlert } = await import('./alerts')
    for (const c of [A, B]) {
      await sendFounderAlert('support_escalation', 'A welcome email needs a human', [`Client ${c}.`],
        { clientId: c, subjectKind: 'client', subjectId: c })
    }
    expect(store.tasks.filter(t => t.kind === 'support_escalation')).toHaveLength(2)
    expect(new Set(store.tasks.map(t => t.client_id))).toEqual(new Set([A, B]))
  })

  it('🛑 a PER-CLIENT deduped class stops deduping globally', async () => {
    // `charge_failed` is a fact about one client's card. With `alert:charge_failed:global` the
    // first client files a row and every later client hits the unique index and files NOTHING —
    // so a whole morning of failed charges is one row about the first person it happened to.
    const { sendFounderAlert } = await import('./alerts')
    for (const c of [A, B]) {
      await sendFounderAlert('charge_failed', 'A charge failed', [`Client ${c}.`], { clientId: c })
    }
    expect(
      store.tasks.filter(t => t.kind === 'charge_failed'),
      "the second client's failed charge was swallowed as a duplicate of the first client's",
    ).toHaveLength(2)
  })

  it('the SAME client repeating still dedupes — a queue of identical rows is unreadable', async () => {
    const { sendFounderAlert } = await import('./alerts')
    for (let i = 0; i < 3; i++) {
      await sendFounderAlert('charge_failed', 'A charge failed', [`Client ${A}.`], { clientId: A })
    }
    expect(store.tasks.filter(t => t.kind === 'charge_failed' && t.status === 'open')).toHaveLength(1)
  })

  it('🛑 an alert with NO subject keeps exactly the behaviour it had', async () => {
    // `api_down` and `source_down` ARE facts about the company. Nothing here may turn a
    // correctly-global condition into one row per client.
    const { sendFounderAlert } = await import('./alerts')
    await sendFounderAlert('api_down', 'The API is down', ['x'])
    await sendFounderAlert('api_down', 'The API is down', ['x'])
    expect(store.tasks.filter(t => t.kind === 'api_down')).toHaveLength(1)
    expect(store.tasks[0].client_id).toBeNull()
  })
})

describe('J2-C1 · the alert still names it, and the send path passes the client', () => {
  it('the alert body still carries the client and the action', async () => {
    const { sendFounderAlert } = await import('./alerts')
    await sendFounderAlert('support_escalation', 'A welcome email needs a human', [
      `Client ${A} (Redmayne).`,
      'ACTION: Vida -> Command Centre -> System -> unresolved welcome emails.',
    ], { clientId: A })
    const alert = store.alerts[0]
    expect(String(alert.body), 'the alert stopped naming the client').toContain(A)
    expect(String(alert.body), 'the alert stopped naming what to do').toMatch(/ACTION:/)
  })

  it('🛑 the welcome path actually PASSES the client — a capability nobody uses is not a fix', async () => {
    // ⚠️ SOURCE-TEXT, AND IT IS THE RIGHT INSTRUMENT: the behaviour above proves the mechanism
    // works when it is given a subject, and this proves the one site J2-C1 names gives it one.
    // Reaching the real call would need the whole Resend/idempotency ladder stood up, which is
    // `welcome-email-state`'s own suite, not this one.
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const src = readFileSync(join(__dirname, 'email.ts'), 'utf8')
    const at = src.indexOf('A welcome email needs a human')
    expect(at, 'the unresolved-welcome alert moved — this guard must be repointed').toBeGreaterThan(-1)
    // ⚠️ THE WINDOW ENDS AT THE CALL'S OWN CLOSING `)`, not at an arbitrary character count.
    // A 1,200-character slice of this file contains `clientId` for a dozen unrelated reasons,
    // so a loose window would have passed against the defect it was written to catch — it did,
    // on the first RED run.
    const close = src.indexOf('.catch(() => {})', at)
    expect(close, 'the alert call shape moved — this guard must be repointed').toBeGreaterThan(at)
    const block = src.slice(at, close)
    // 🛑 THE FOURTH ARGUMENT, NOT THE WORD. `/\{\s*clientId/` looked right and was useless:
    // the alert's own body line is `` `Client ${clientId} (${companyName}).` ``, and a template
    // interpolation IS `{clientId`. The guard passed against the exact defect it was written
    // for, which I only found by reverting the fix and watching it stay green. So it now asks
    // for the argument POSITION — the `]` that closes the lines array, then an object literal.
    expect(
      block,
      'the unresolved welcome still raises a task that is not attached to the client it is about',
    ).toMatch(/\]\s*,\s*\{[^}]*\bclientId\b/)
  })
})
