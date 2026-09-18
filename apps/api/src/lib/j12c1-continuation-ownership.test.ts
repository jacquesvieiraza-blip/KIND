// ══════════════════════════════════════════════════════════════════════════════════════════
// J12-C1 · THE P1 CONTINUATION HAS AN OWNER — persisted state, detection, Needs-you, and
//          TWO REPLICAS CANNOT BOTH START ONE PAYMENT'S RUN
//
// ── THE DEFECT, AND WHY THE 10-SEP ARGUMENT NO LONGER HOLDS ─────────────────────────────
//
// `startProgrammeAfterP1` guards its single start with `inFlight`, a `Map` in ONE node
// process. The file says so itself and defends it: a durable claim was deliberately NOT taken
// on 10 Sep (I1), on the reasoning that `programme_batches` already answers the question that
// protects the client's money — *has this programme already SPENT?* — and that detecting the
// completed step beats locking against a repeat.
//
// 🛑 THAT ARGUMENT IS SOUND ABOUT A CRASH AND WRONG ABOUT A RACE. `alreadySpent` is a READ,
// and the window between it and the batch the run opens is the whole of `sourceProgramme` —
// a provider search, minutes long. Two replicas handling one redelivered Stripe webhook both
// read `programme_batches`, both find it empty, both pass every check on the row, and both
// source. `try_spend_sourcing` then keeps them inside the CEILING, which is a different
// promise: one payment produces two Apollo searches and two batches, and the second one is
// entitlement the client has not agreed to spend yet.
//
// ⚠️ AND THE MECHANISM NOW EXISTS. XC-6 shipped `automatic_work` with a partial unique index
// over `(kind, subject_kind, subject_id) WHERE state IN ('requested','started')` — a durable
// single-live-unit claim the DATABASE enforces — and declared the kind `'p1_continuation'`
// with a 30-minute bound. Nothing has ever requested it. The claim the 10-Sep note said it
// would not build by hand is already there, unused, waiting for this item.
//
// ── WHAT THIS FILE ASSERTS ──────────────────────────────────────────────────────────────
//
// The four clauses of J12-C1's REQ, each against real behaviour rather than source text:
//
//   ① TWO REPLICAS CANNOT BOTH START — two independent module instances (a faithful model of
//     two pods: separate `inFlight` maps, ONE database) racing on one programme.
//   ② PERSISTED STOPPED STATE — `failed` and `stuck` survive the process that wrote them.
//   ③ DETECTION — `p1ContinuationHealth` reads that persisted state.
//   ④ NEEDS-YOU — the operator's facts carry it (proved through `preparationStopped`, which
//     `deriveLifecycle` turns into `sourcing_exception` · Needs you).
//
// ⚠️ THE UNIQUE INDEX IS EMULATED FAITHFULLY, INCLUDING ITS `WHERE`. A mock that refused every
// duplicate would also refuse the legitimate SECOND batch a programme opens later under
// `NEXT_BATCH` authority, and this file would be asserting a rule the product does not have.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest'

type Row = Record<string, unknown>

const shared = vi.hoisted(() => ({
  programmes: [] as Row[],
  icps: [] as Row[],
  clients: [] as Row[],
  programme_batches: [] as Row[],
  automatic_work: [] as Row[],
  operator_audit_log: [] as Row[],
  operator_tasks: [] as Row[],
  /** Every `sourceProgramme` entry — the thing that must happen exactly once. */
  sourced: [] as string[],
  /** Held open so both replicas are inside the run at the same time, like a real race. */
  release: null as null | (() => void),
  /**
   * A named table will not answer — F-DBREAD.
   *
   * ⚠️ THE CODE IS PART OF THE FIXTURE, because the two failures are not one failure.
   * `PGRST205` is "the migration has not run"; `57014` is "the table is there and would not
   * answer". The product must treat them differently and this is where that is proved.
   */
  unreadable: null as null | { table: string; code: string; message: string },
  seq: 0,
}))

const MISSING = { code: 'PGRST205', message: "Could not find the table 'public.automatic_work' in the schema cache" }
const TIMEOUT = { code: '57014', message: 'canceling statement due to statement timeout' }

const LIVE = ['requested', 'started']

/**
 * The store. One instance, shared by every "replica" — which is the point: the replicas differ
 * only in their process-local memory, exactly as two pods do.
 */
vi.mock('@kind/db', () => {
  const bag = (t: string): Row[] => {
    const s = shared as unknown as Record<string, Row[]>
    if (!Array.isArray(s[t])) s[t] = []
    return s[t]
  }
  const from = (t: string) => {
    const f: ((r: Row) => boolean)[] = []
    let ord: { col: string; asc: boolean } | null = null
    let lim = Infinity
    const fail = () => (shared.unreadable?.table === t
      ? { message: shared.unreadable.message, code: shared.unreadable.code }
      : null)
    const hits = () => {
      let out = bag(t).filter(r => f.every(fn => fn(r)))
      if (ord) {
        const { col, asc } = ord
        out = [...out].sort((a, b) => String(a[col] ?? '').localeCompare(String(b[col] ?? '')) * (asc ? 1 : -1))
      }
      return out.slice(0, lim === Infinity ? undefined : lim)
    }
    const q: Record<string, unknown> = {
      select() { return q },
      eq(c: string, v: unknown) { f.push(r => r[c] === v); return q },
      is(c: string, v: unknown) { f.push(r => (r[c] ?? null) === v); return q },
      in(c: string, v: unknown[]) { f.push(r => v.includes(r[c])); return q },
      not(c: string, _op: string, v: unknown) { f.push(r => (r[c] ?? null) !== v); return q },
      order(c: string, o?: { ascending?: boolean }) { ord = { col: c, asc: o?.ascending !== false }; return q },
      limit(n: number) { lim = n; return q },
      async maybeSingle() { const e = fail(); return e ? { data: null, error: e } : { data: hits()[0] ?? null, error: null } },
      async single() { const e = fail(); return e ? { data: null, error: e } : { data: hits()[0] ?? null, error: null } },
      insert(row: Row) {
        // 🛑 THE PARTIAL UNIQUE INDEX, WITH ITS `WHERE`. This is the whole mechanism under test.
        const clash = t === 'automatic_work' && bag(t).some(r =>
          r.kind === row.kind && r.subject_kind === row.subject_kind
          && r.subject_id === row.subject_id && LIVE.includes(String(r.state)))
        const made = { id: `${t}-${++shared.seq}`, ...row }
        const err = fail() ?? (clash
          ? { code: '23505', message: 'duplicate key value violates unique constraint "automatic_work_one_live_per_subject"' }
          : null)
        const done = err ? { data: null, error: err } : { data: made, error: null as unknown }
        const push = () => { if (!err) bag(t).push(made) }
        const sel = () => ({
          async maybeSingle() { push(); return done },
          async single() { push(); return done },
          then(res: (v: unknown) => unknown) { push(); return res(done) },
        })
        return { select: sel, then(res: (v: unknown) => unknown) { push(); return res(done) } }
      },
      update(patch: Row) {
        const uf: ((r: Row) => boolean)[] = []
        const u: Record<string, unknown> = {
          eq(c: string, v: unknown) { uf.push(r => r[c] === v); return u },
          in(c: string, v: unknown[]) { uf.push(r => v.includes(r[c])); return u },
          select() { return u },
          async maybeSingle() {
            const hit = bag(t).filter(r => uf.every(fn => fn(r)))
            if (!hit.length) return { data: null, error: null }
            Object.assign(hit[0], patch); return { data: hit[0], error: null }
          },
          then(res: (v: unknown) => unknown) {
            for (const r of bag(t).filter(x => uf.every(fn => fn(x)))) Object.assign(r, patch)
            return res({ error: null })
          },
        }
        return u
      },
      then(res: (v: unknown) => unknown) { const e = fail(); return res(e ? { data: null, error: e } : { data: hits(), error: null }) },
    }
    return q
  }
  return { db: { from, rpc: async () => ({ data: null, error: { message: 'no rpc in this test' } }) } }
})

/**
 * The run itself is stubbed, and the stub is the instrument. `sourceProgramme` is a provider
 * search; what J12-C1 is about is how many times it is ENTERED for one payment.
 */
vi.mock('./programme-sourcing', () => ({
  sourceProgramme: async (id: string) => {
    shared.sourced.push(id)
    if (shared.release) await new Promise<void>(r => { shared.release = r })
    shared.programme_batches.push({ id: `batch-${++shared.seq}`, programme_id: id })
    return { ok: true, programmeId: id, clientId: 'client-1', icpId: 'icp-1', icpName: 'Agencies', requested: 250, inserted: 200, skipped: 0, relaxed: false }
  },
}))

const PROG = '11111111-2222-4333-8444-555555555555'

/**
 * ⚠️ NO FIXED SLEEP, AND THAT IS A SCAR. `startProgrammeAfterP1` returns before its background
 * run has even resolved its `import('./programme-sourcing')`, so draining microtasks proves
 * nothing and a fixed delay passes on a warm module and fails on the one paying the cold load.
 * `until` polls the condition; `quiet` waits for the count to STOP moving, which is the only
 * honest way to assert that a second run never arrived.
 */
async function until(cond: () => boolean, ms = 2000): Promise<void> {
  const stop = Date.now() + ms
  while (!cond() && Date.now() < stop) await new Promise(r => setTimeout(r, 5))
}
async function quiet(count: () => number, stillMs = 60): Promise<void> {
  let last = -1
  let steadySince = Date.now()
  while (Date.now() - steadySince < stillMs) {
    if (count() !== last) { last = count(); steadySince = Date.now() }
    await new Promise(r => setTimeout(r, 5))
  }
}

function seed(over: Row = {}) {
  shared.programmes.push({
    id: PROG, client_id: 'client-1', status: 'SOURCING_AUTHORISED',
    paused_at: null, first_paid_at: '2026-09-18T09:00:00Z',
    sourcing_ceiling: 1000, sourced_used: 0, sourced_reserved: 0, ...over,
  })
  shared.icps.push({ id: 'icp-1', client_id: 'client-1', programme_id: PROG })
  shared.clients.push({ id: 'client-1', user_id: 'user-1' })
}

/** A fresh module registry — a second pod. Same database, its own `inFlight`. */
async function replica() {
  vi.resetModules()
  return await import('./programme-p1-continuation')
}

beforeEach(() => {
  shared.programmes = []; shared.icps = []; shared.clients = []
  shared.programme_batches = []; shared.automatic_work = []
  shared.operator_audit_log = []; shared.operator_tasks = []
  shared.sourced = []; shared.release = null; shared.unreadable = null
  shared.seq = 0
  vi.resetModules()
})

describe('J12-C1 · one payment starts one run, whatever the topology', () => {
  it('🛑 F-REPLICA · TWO replicas racing one payment produce ONE sourcing run', async () => {
    seed()
    // Hold the first run open, so the second replica arrives while the first is still inside
    // `sourceProgramme` and no batch row exists yet — the exact window `alreadySpent` cannot see.
    shared.release = () => {}

    const a = await replica()
    const b = await replica()
    const first = await a.startProgrammeAfterP1(PROG, 'stripe_first_payment', 'stripe@kind')
    const second = await b.startProgrammeAfterP1(PROG, 'stripe_first_payment', 'stripe@kind')
    await quiet(() => shared.sourced.length)

    expect(
      shared.sourced,
      'BOTH replicas sourced one payment: two provider searches, two batches, entitlement spent twice',
    ).toHaveLength(1)
    expect([first.started, second.started].filter(Boolean), 'two replicas both reported a start').toHaveLength(1)
    const loser = first.started ? second : first
    expect(loser.already_running, 'the second replica called it a refusal rather than an existing run').toBe(true)

    // ⚠️ AND THE LOSER IS NOT AUDITED AS A REFUSAL. `p1ContinuationHealth` reads the newest
    // refusal as an exception, so auditing a lost race would put a perfectly healthy paid
    // client into Needs you — the same trap `alreadyDone` was given its own branch for.
    expect(
      shared.operator_audit_log.filter(r => r.action === 'programme_p1_auto_refused'),
      'a lost race was recorded as a refusal, which Vida reads as a broken programme',
    ).toHaveLength(0)
  })

  it('🛑 the claim is DURABLE — a restart does not license a second start', async () => {
    seed()
    shared.release = () => {}
    const a = await replica()
    await a.startProgrammeAfterP1(PROG, 'stripe_first_payment', 'stripe@kind')
    await until(() => shared.sourced.length > 0)
    expect(shared.sourced, 'the first start never reached the run at all').toHaveLength(1)

    // The process dies mid-run: `inFlight` is gone, the live row is not.
    const b = await replica()
    const again = await b.startProgrammeAfterP1(PROG, 'operator_retry', 'ops@kind')
    await quiet(() => shared.sourced.length)
    expect(again.started, 'a restart started a second run against one payment').toBe(false)
    expect(shared.sourced, 'a restart sourced the same programme twice').toHaveLength(1)
  })

  it('a FINISHED continuation releases the claim — later authorised batches are not blocked', async () => {
    // 🛑 THIS IS THE ONE THAT KEEPS THE GUARD HONEST. J12-C1 is a one-automatic-start rule, not
    // a one-batch-per-programme rule: the advance and operator paths open later batches under
    // `NEXT_BATCH` authority, and a claim that never cleared would block them for ever.
    seed()
    const a = await replica()
    await a.startProgrammeAfterP1(PROG, 'stripe_first_payment', 'stripe@kind')
    await until(() => shared.programme_batches.length > 0)
    await quiet(() => shared.automatic_work.filter(r => r.state === 'completed').length)

    const live = shared.automatic_work.filter(r => LIVE.includes(String(r.state)))
    expect(live, 'the completed continuation left its claim live for ever').toHaveLength(0)
    expect(shared.automatic_work.some(r => r.state === 'completed'), 'the finished run recorded no terminal state').toBe(true)
  })

  it('the persisted states are the recorded ones — requested → started → completed', async () => {
    seed()
    const a = await replica()
    await a.startProgrammeAfterP1(PROG, 'stripe_first_payment', 'stripe@kind')
    await until(() => shared.programme_batches.length > 0)
    await quiet(() => shared.automatic_work.filter(r => r.state === 'completed').length)

    const row = shared.automatic_work.find(r => r.kind === 'p1_continuation')
    expect(row, 'the P1 continuation was never tracked — the kind XC-6 declared is still unused').toBeTruthy()
    expect(row!.subject_kind).toBe('programme')
    expect(row!.subject_id).toBe(PROG)
    expect(row!.client_id).toBe('client-1')
    expect(row!.started_at, 'the run never recorded that it started').toBeTruthy()
    expect(row!.state).toBe('completed')
  })
})

describe('J12-C1 · a stopped continuation is persisted, detected, and a Needs-you', () => {
  /** A finished-and-broken unit, written by a process that is now gone. */
  const stoppedRow = (state: 'failed' | 'stuck', over: Row = {}) => {
    shared.automatic_work.push({
      id: 'aw-1', kind: 'p1_continuation', subject_kind: 'programme', subject_id: PROG,
      client_id: 'client-1', state, attempt: 1, bound_seconds: 1800,
      requested_at: '2026-09-18T09:00:00Z', started_at: '2026-09-18T09:00:01Z',
      updated_at: '2026-09-18T09:31:00Z',
      failure_reason: 'Apollo refused the search (402 credits exhausted).', ...over,
    })
  }

  it('🛑 a FAILED continuation is stopped, and the operator reads the recorded reason', async () => {
    seed()
    stoppedRow('failed')
    const { p1ContinuationHealth } = await replica()
    const h = await p1ContinuationHealth(PROG)
    expect(h.stopped, 'a recorded failure left the programme reading as healthy · Working').toBe(true)
    expect(h.detail, 'the operator was told it is stopped without being told why').toContain('402')
  })

  it('🛑 a STUCK continuation is stopped — the state only the detector can set', async () => {
    seed()
    // ⚠️ NO `failure_reason`, ON PURPOSE. A stuck run never came back to say anything; the
    // sentence has to stand up without one, and quoting a reason it does not have would be a
    // fabrication on an operator's screen.
    stoppedRow('stuck', { failure_reason: null })
    const { p1ContinuationHealth } = await replica()
    const h = await p1ContinuationHealth(PROG)
    expect(h.stopped, 'a stuck run — already escalated to a human — read as healthy').toBe(true)
    expect(h.detail, 'a stuck programme was flagged with nothing said about it').toContain('30 minutes')
  })

  it('a LIVE continuation is not an exception — a paid client is not broken for running', async () => {
    seed()
    shared.automatic_work.push({
      id: 'aw-2', kind: 'p1_continuation', subject_kind: 'programme', subject_id: PROG,
      client_id: 'client-1', state: 'started', attempt: 1, bound_seconds: 1800,
      requested_at: '2026-09-18T09:00:00Z', started_at: '2026-09-18T09:00:01Z', updated_at: '2026-09-18T09:00:01Z',
    })
    const { p1ContinuationHealth } = await replica()
    expect((await p1ContinuationHealth(PROG)).stopped).toBe(false)
  })

  it('a COMPLETED continuation is not an exception', async () => {
    seed()
    stoppedRow('failed', { state: 'completed', failure_reason: null })
    const { p1ContinuationHealth } = await replica()
    expect((await p1ContinuationHealth(PROG)).stopped).toBe(false)
  })

  it('the PRE-OWNERSHIP answer still stands — an audited refusal with no unit is still stopped', async () => {
    // ⚠️ THE RECORD IS DEMOTED, NOT DELETED. Programmes that ran before this item existed have
    // no `automatic_work` row at all, and their refusal is still the only thing that knows.
    seed()
    shared.operator_audit_log.push({
      id: 'aud-1', subject_type: 'programme', subject_id: PROG,
      action: 'programme_p1_auto_refused', created_at: '2026-09-18T09:00:00Z',
      detail: { trigger: 'stripe_first_payment', detail: 'No ICP is attached to this programme.' },
    })
    const { p1ContinuationHealth } = await replica()
    const h = await p1ContinuationHealth(PROG)
    expect(h.stopped, 'a pre-ownership refusal stopped being read when the unit became the owner').toBe(true)
    expect(h.detail).toContain('No ICP is attached')
  })

  it('🛑 F-DBREAD · an unreadable unit never INVENTS a stopped programme', async () => {
    seed()
    shared.unreadable = { table: 'automatic_work', ...TIMEOUT }
    const { p1ContinuationHealth } = await replica()
    const h = await p1ContinuationHealth(PROG)
    expect(h.stopped, 'a failed read was reported to the operator as a broken programme').toBe(false)
  })

  it('🛑 F-DBREAD · a unit table that WILL NOT ANSWER refuses the start', async () => {
    // The claim is the only thing that knows whether another replica is already inside this
    // programme's run. If it will not answer, authorising a spend is a guess with a client's
    // entitlement — the same reasoning `alreadySpent`'s `null` branch was given.
    seed()
    shared.unreadable = { table: 'automatic_work', ...TIMEOUT }
    const a = await replica()
    const r = await a.startProgrammeAfterP1(PROG, 'stripe_first_payment', 'stripe@kind')
    await quiet(() => shared.sourced.length)
    expect(r.started, 'a spend was authorised while the ownership table would not answer').toBe(false)
    expect(shared.sourced).toHaveLength(0)
  })

  it('🛑 a MISSING unit table still starts the programme — the migration is the gate, not the client', async () => {
    // ⚠️ THE OPPOSITE ANSWER TO THE TEST ABOVE, AND DELIBERATELY SO. `PGRST205` means the
    // 20260917 migration has not run on this database. Refusing here would mean every paid
    // client's programme silently fails to start on a database missing a tracking table —
    // breaking the founder's rule this whole file exists to keep ("P1 is committed, so the
    // programme starts") over something no client can influence. It runs untracked and says so
    // loudly, exactly as the Proof owner does (J5-C1), and XC-11's release gate is what
    // guarantees the table is there. The pre-J12-C1 fences (`alreadySpent`, `try_spend_sourcing`)
    // are still in force on that path — no worse than before, and never silent.
    seed()
    shared.unreadable = { table: 'automatic_work', ...MISSING }
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {})
    const a = await replica()
    const r = await a.startProgrammeAfterP1(PROG, 'stripe_first_payment', 'stripe@kind')
    await until(() => shared.sourced.length > 0)
    expect(r.started, 'a missing tracking table stopped a paid programme from starting').toBe(true)
    expect(shared.sourced).toHaveLength(1)
    expect(
      warn.mock.calls.flat().join(' '),
      'the programme ran untracked and nothing said so',
    ).toMatch(/automatic_work/)
    warn.mockRestore()
  })
})
