// ══════════════════════════════════════════════════════════════════════════════════════════
// J5-C1 · THE PROOF RUN HAS A SERVER OWNER (FD-0)
//
// ── THE DEFECT ──────────────────────────────────────────────────────────────────────────
//
// `launchProofRun` is fire-and-forget by design — the client's surface has already been
// answered and must not wait for a provider. But fire-and-forget with NO RECORD means the
// run exists only as a promise object inside one Node process:
//
//   · the process restarts mid-run  → the run is gone. Nothing knows it was promised.
//   · the model hangs               → nothing is overdue, because nothing was ever due.
//   · two replicas both start       → nothing refuses the second.
//   · it fails                      → the claim is settled, but no operator is told the
//                                     client is sitting in front of a desk that will
//                                     never finish.
//
// The client watches a spinner for ever and the only evidence is a console line in a
// container that has since been recycled. FD-0 is explicit that the system stays the primary
// OWNER of failed/stuck automatic Proof — and you cannot own what you never recorded.
//
// ── WHAT THIS ASSERTS ───────────────────────────────────────────────────────────────────
//
// Batch 1 (XC-6) already built the ownership machinery and declared `'proof_run'` as one of
// its four kinds — `requestAutomaticWork`, the per-kind bound stored ON the row, the
// requested/started/completed/failed/stuck states, and `detectOverdueAutomaticWork` which
// turns silence into an operator task. Nothing wired the Proof run to it. So this file does
// not invent a mechanism; it asserts that the Proof run USES the one that exists.
//
// ⚠️ IT ASSERTS THE CALLS AND THE STATE, NOT THE SOURCE TEXT. `launchProofRun` is invoked for
// real, against a doubled `runIcpJob`, and the recorded rows are read back. A test that
// grepped for "requestAutomaticWork" would pass for a call that throws, sits in a dead
// branch, or has its result discarded.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest'

type Row = Record<string, unknown>

const state = {
  automatic_work: [] as Row[],
  operator_tasks: [] as Row[],
  claims: [] as Row[],
  /** what the doubled `runIcpJob` will do this time */
  run: 'ok' as 'ok' | 'failed' | 'throw' | 'hang',
  settled: [] as Array<{ claimId: string; terminal: string }>,
}

function table(name: string) {
  const filters: ((r: Row) => boolean)[] = []
  const rows = (): Row[] => {
    const t = state as unknown as Record<string, Row[]>
    if (!Array.isArray(t[name])) t[name] = []
    return t[name]
  }
  const q: Record<string, unknown> = {
    select() { return q },
    eq(c: string, v: unknown) { filters.push(r => r[c] === v); return q },
    is(c: string, v: unknown) { filters.push(r => (r[c] ?? null) === v); return q },
    in(c: string, v: unknown[]) { filters.push(r => v.includes(r[c])); return q },
    lt(c: string, v: unknown) { filters.push(r => String(r[c]) < String(v)); return q },
    order() { return q }, limit() { return q },
    async maybeSingle() { const h = rows().filter(r => filters.every(f => f(r))); return { data: h[0] ?? null, error: null } },
    insert(row: Row) {
      // 🛑 THE UNIQUE INDEX IS THE AUTHORITY, not a check-then-insert. `automatic_work` has a
      // partial unique index over (kind, subject_kind, subject_id) WHERE the unit is live —
      // two replicas racing is the normal case, so the second must be REFUSED by the database.
      const live = (r: Row) => ['requested', 'started'].includes(String(r.state))
      if (name === 'automatic_work' && rows().some(r =>
        r.kind === row.kind && r.subject_kind === row.subject_kind && r.subject_id === row.subject_id && live(r))) {
        return { select: () => ({ async maybeSingle() { return { data: null, error: { code: '23505', message: 'duplicate key value' } } } }) }
      }
      const made = { id: `${name}-${rows().length + 1}`, ...row }
      const push = () => rows().push(made)
      return {
        select: () => ({
          async maybeSingle() { push(); return { data: made, error: null } },
          async single() { push(); return { data: made, error: null } },
        }),
        then(resolve: (v: unknown) => unknown) { push(); return resolve({ data: made, error: null }) },
      }
    },
    update(patch: Row) {
      const uf: ((r: Row) => boolean)[] = []
      const u: Record<string, unknown> = {
        eq(c: string, v: unknown) { uf.push(r => r[c] === v); return u },
        is(c: string, v: unknown) { uf.push(r => (r[c] ?? null) === v); return u },
        in(c: string, v: unknown[]) { uf.push(r => v.includes(r[c])); return u },
        select() { return u },
        async maybeSingle() {
          const h = rows().filter(r => uf.every(f => f(r)))
          if (!h.length) return { data: null, error: null }
          Object.assign(h[0], patch); return { data: h[0], error: null }
        },
        then(resolve: (v: unknown) => unknown) {
          for (const r of rows().filter(x => uf.every(f => f(x)))) Object.assign(r, patch)
          return resolve({ error: null })
        },
      }
      return u
    },
    then(resolve: (v: unknown) => unknown) { return resolve({ data: rows().filter(r => filters.every(f => f(r))), error: null }) },
  }
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => table(t) } }))

// The provider run itself. `launchProofRun` imports `runIcpJob` from the icps route at call
// time, so the whole route module is doubled — nothing here reaches a provider.
vi.mock('../routes/icps', () => ({
  PROOF_PASS_LEADS: 20,
  recordRunOutcome: async () => {},
  runIcpJob: async () => {
    if (state.run === 'throw') throw new Error('the model refused')
    if (state.run === 'hang') await new Promise(() => {})   // never settles — F-RESTART/F-STUCK
    return { terminal: state.run === 'failed' ? 'released' : 'completed' }
  },
}))

vi.mock('./proof-claim', () => ({
  settleProofClaim: async (claimId: string, terminal: string) => {
    state.settled.push({ claimId, terminal })
    return { settled: true }
  },
}))
vi.mock('./alerts', () => ({ sendFounderAlert: async () => {} }))
vi.mock('./proof-calibration', () => ({ attemptLabel: () => 'attempt 1' }))

const NOW = '2026-09-18T10:00:00.000Z'
const INPUT = {
  icpId: 'icp-1', clientId: 'client-1', userId: 'user-1',
  claimed: 1, batchKind: 'automatic' as const, claimId: 'claim-1',
}

/** Wait for the fire-and-forget tail to reach a state, or give up loudly.
 *
 * ⚠️ IT POLLS A CONDITION; IT DOES NOT SLEEP A GUESS. Two earlier versions were wrong in the
 * same way for different reasons: draining microtasks returned before the first write (a
 * dynamic `import()` is not a microtask), and a fixed 60ms passed for five tests and failed
 * the first one — the only one paying the COLD module load. Both look exactly like "the
 * feature is missing". A sleep long enough to be safe is also a sleep long enough to hide a
 * regression, so the wait is tied to the fact under test. */
async function until(done: () => boolean, what: string, ms = 3000) {
  const stop = Date.now() + ms
  while (Date.now() < stop) {
    if (done()) return
    await new Promise(r => setTimeout(r, 5))
  }
  throw new Error(`timed out after ${ms}ms waiting for: ${what}`)
}
const owned = () => state.automatic_work.length > 0
const inState = (s: string) => () => String(state.automatic_work[0]?.state ?? '') === s

beforeEach(() => {
  state.automatic_work = []; state.operator_tasks = []; state.claims = []
  state.settled = []; state.run = 'ok'
  vi.resetModules()
})

describe('J5-C1 · the Proof run is owned, not just fired', () => {
  it('🛑 the run is RECORDED as automatic work before it starts', async () => {
    const { launchProofRun } = await import('./proof-run-launch')
    launchProofRun(INPUT)
    await until(owned, 'the Proof run to be recorded as automatic work')

    const work = state.automatic_work
    expect(work, 'the Proof run was fired with NO record — a restart loses it entirely').toHaveLength(1)
    expect(work[0].kind).toBe('proof_run')
    expect(work[0].subject_id).toBe('icp-1')
    expect(work[0].client_id).toBe('client-1')
    // 🛑 THE BOUND IS ON THE ROW. Reading it from the constant at detection time would let a
    // later deploy retroactively make a late run look punctual.
    expect(Number(work[0].bound_seconds), 'no bound was stored, so nothing can ever be overdue').toBeGreaterThan(0)
  })

  it('🛑 a successful run ends at `completed`, not left open for ever', async () => {
    const { launchProofRun } = await import('./proof-run-launch')
    launchProofRun(INPUT)
    await until(inState('completed'), 'the owner to reach completed')
    expect(state.automatic_work[0].state).toBe('completed')
  })

  it('🛑 F-MODEL · a run that THROWS is recorded `failed` WITH A REASON', async () => {
    state.run = 'throw'
    const { launchProofRun } = await import('./proof-run-launch')
    launchProofRun(INPUT)
    await until(inState('failed'), 'the crashed run to be recorded failed')

    const w = state.automatic_work[0]
    expect(w.state, 'a crashed Proof run left no failure state — nobody can recover what nothing recorded').toBe('failed')
    // FD-0's audited recovery has to say what it is recovering FROM.
    expect(String(w.failure_reason ?? ''), 'failed with no reason').not.toBe('')
    // The authority still comes back — provider failure must never consume Proof authority.
    expect(state.settled).toContainEqual({ claimId: 'claim-1', terminal: 'released' })
  })

  it('🛑 a run that reports `released` is also recorded failed — it never threw', async () => {
    // The structural gate records `failed` WITH LEADS INSERTED and simply RETURNS; it does
    // not throw. That path left the old code with a settled claim and no owner at all.
    state.run = 'failed'
    const { launchProofRun } = await import('./proof-run-launch')
    launchProofRun(INPUT)
    await until(inState('failed'), 'a released run to be recorded failed')
    expect(state.automatic_work[0].state).toBe('failed')
  })

  it('🛑 F-DUP / F-RESTART · two replicas cannot both own the same Proof run', async () => {
    state.run = 'hang'
    const { launchProofRun } = await import('./proof-run-launch')
    launchProofRun(INPUT)
    await until(owned, 'the first replica to take ownership')
    launchProofRun(INPUT)                    // the second replica, same ICP, still in flight
    await new Promise(r => setTimeout(r, 120))   // long enough for a second owner to appear
    expect(state.automatic_work, 'a second owner was created for one Proof run').toHaveLength(1)
  })

  it('🛑 F-STUCK · a hung run is left in a state the detector can find', async () => {
    state.run = 'hang'
    const { launchProofRun } = await import('./proof-run-launch')
    launchProofRun(INPUT)
    await until(owned, 'the hung run to be recorded before it stalls')

    const w = state.automatic_work[0]
    // It must be LIVE (requested or started) with a bound — that is exactly the shape
    // `classifyOverdue` turns into `automatic_work_stuck` once the bound passes.
    expect(['requested', 'started']).toContain(String(w.state))

    const { classifyOverdue } = await import('./automatic-work')
    const past = Date.parse(String(w.requested_at ?? NOW)) + Number(w.bound_seconds) * 1000 + 60_000
    expect(
      classifyOverdue(w as never, past),
      'a hung Proof run is invisible to the overdue detector — the client waits for ever',
    ).toBeTruthy()
  })
})
