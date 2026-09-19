// ══════════════════════════════════════════════════════════════════════════════════════════
// XC-12 · RECOVERY IS CONTROLLED (FD-0) — only from failed/stuck, audited, never concurrent
//
// ── THE DEFECT ──────────────────────────────────────────────────────────────────────────
//
// `POST /operator/proof-retry/:clientId` is the operator's recovery control. It checks the
// admin key and that the ICP belongs to the client — both right — and then retries, whatever
// the run is currently doing. There is no reading of the run's OWN state, because until
// J5-C1 the run had no state to read: it was a promise inside one process.
//
// So an operator watching a client wait could press it while the first run was still going,
// and get a SECOND live run against the same targeting. Two runs, one claim, one client — and
// whichever finished last wrote the desk.
//
// ── WHAT FD-0 REQUIRES, AND WHAT THIS ASSERTS ───────────────────────────────────────────
//
// FD-0: the system stays the primary owner, and a human's recovery is the exception — taken
// only from a state the system has already given up on, through the same ledger, and audited
// so the exception is answerable afterwards. Four rules, four groups below:
//
//   ① only from `failed` or `stuck`   — a live run is not recoverable, it is RUNNING
//   ② the same ledger                  — never a second authority mechanism
//   ③ audited with operator AND note   — "what were you recovering from?" must have an answer
//   ④ no concurrency                   — two operators, or two clicks, produce ONE recovery
//
// ⚠️ THE ROUTE IS INVOKED FOR REAL against a doubled database, and the state is read back. A
// source-text assertion would pass for a gate inside a dead branch.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest'

type Row = Record<string, unknown>

const state = {
  automatic_work: [] as Row[],
  icps: [{ id: 'icp-1', client_id: 'client-1' }] as Row[],
  operator_audit_log: [] as Row[],
  /** every retry the route actually authorised */
  retries: [] as Array<Record<string, unknown>>,
}

function table(name: string) {
  const filters: ((r: Row) => boolean)[] = []
  let sort: { col: string; asc: boolean } | null = null
  let cap: number | null = null
  const shaped = (): Row[] => {
    let out = rows().filter(r => filters.every(f => f(r)))
    if (sort) {
      const { col, asc } = sort
      out = [...out].sort((a, b) => String(a[col] ?? '').localeCompare(String(b[col] ?? '')) * (asc ? 1 : -1))
    }
    return cap == null ? out : out.slice(0, cap)
  }
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
    // ⚠️ `order` AND `limit` ARE REAL HERE, not no-ops. The route picks the LATEST run with
    // `.order('updated_at', { ascending: false }).limit(1)`; a mock that ignored ordering would
    // hand back whichever row happened to be first and the "a stale failed row must not unlock
    // a live run" case would pass without testing anything.
    order(col: string, opts?: { ascending?: boolean }) { sort = { col, asc: opts?.ascending !== false }; return q },
    limit(n: number) { cap = n; return q },
    async maybeSingle() { return { data: shaped()[0] ?? null, error: null } },
    insert(row: Row) {
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
    then(resolve: (v: unknown) => unknown) { return resolve({ data: shaped(), error: null }) },
  }
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => table(t) } }))

// ⚠️ THE RETRY ITSELF IS DOUBLED, NOT THE GATE. This file is about whether recovery is
// ALLOWED; whether the run then succeeds is J5-C1's business and is proven there.
vi.mock('./proof-run-launch', () => ({
  retryProofAfterZeroEligible: async (clientId: string, icpId: string) => {
    state.retries.push({ clientId, icpId })
    return { started: true, pass: 2, kind: 'calibrated_restart' }
  },
  firstFreeProofEligibility: async () => ({ ok: true, userId: 'user-1' }),
  continueProofAfterReviewResolved: async () => ({ started: false, reason: 'not_applicable' }),
  launchProofRun: () => {},
}))

const ADMIN_KEY = 'test-admin-key'

async function retry(body: Record<string, unknown>, headers: Record<string, string> = {}) {
  const { operatorRouter } = await import('../routes/operator')
  const layer = (operatorRouter as unknown as {
    stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>
  }).stack.find(l => l.route?.path === '/proof-retry/:clientId' && l.route?.methods.post)
  if (!layer?.route) throw new Error('POST /proof-retry/:clientId not found on the operator router')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const out: { code: number; payload: Record<string, unknown> } = { code: 200, payload: {} }
  const res = {
    status(c: number) { out.code = c; return res },
    json(p: Record<string, unknown>) { out.payload = p; return res },
  }
  await handler({
    body, params: { clientId: 'client-1' }, query: {},
    headers: { 'x-admin-key': ADMIN_KEY, 'x-operator-email': 'ops@kind.invalid', ...headers },
  }, res, () => {})
  return out
}

/** The one thing every case needs: a recorded Proof run in a given state. */
function work(stateName: string, over: Row = {}) {
  state.automatic_work.push({
    id: `aw-${state.automatic_work.length + 1}`, kind: 'proof_run',
    subject_kind: 'icp', subject_id: 'icp-1', client_id: 'client-1',
    // ⚠️ `attempt` IS ALWAYS PRESENT on a real row (`requestAutomaticWork` sets it), and it is
    // the version the recovery CAS compares against. Omitting it here made every claim look
    // like a lost race — a fixture fault that reads exactly like a product defect.
    state: stateName, bound_seconds: 300, attempt: 1,
    requested_at: '2026-09-18T10:00:00.000Z', updated_at: '2026-09-18T10:00:00.000Z',
    ...over,
  })
}

const NOTE = { note: 'run crashed on the model timeout; client waiting since 10:05' }

beforeEach(() => {
  // The operator router pulls in modules that build a Supabase client at import time. These
  // are loopback placeholders: `@kind/db` is doubled above, so nothing dials out.
  process.env.SUPABASE_URL ||= 'http://127.0.0.1:1/supabase-not-used'
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'not-a-real-key'
  process.env.SUPABASE_ANON_KEY ||= 'not-a-real-anon-key'
  process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'http://127.0.0.1:1/supabase-not-used'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= 'not-a-real-anon-key'
  process.env.ADMIN_SECRET_KEY = ADMIN_KEY
  state.automatic_work = []
  state.icps = [{ id: 'icp-1', client_id: 'client-1' }]
  state.operator_audit_log = []
  state.retries = []
  vi.resetModules()
})

describe('XC-12 · ① recovery only from a state the system gave up on', () => {
  it('🛑 REFUSES to recover a run that is still RUNNING — that is a second live run, not a recovery', async () => {
    work('started')
    const r = await retry({ icp_id: 'icp-1', ...NOTE })
    expect(r.code, 'an operator recovered a running Proof — two runs, one claim').toBeGreaterThanOrEqual(400)
    expect(state.retries, 'the retry was authorised while the first run was still going').toHaveLength(0)
  })

  it('🛑 REFUSES a run that is merely `requested` — it has not even started yet', async () => {
    work('requested')
    const r = await retry({ icp_id: 'icp-1', ...NOTE })
    expect(r.code).toBeGreaterThanOrEqual(400)
    expect(state.retries).toHaveLength(0)
  })

  it('allows recovery from `failed` — the system reported it and stopped', async () => {
    work('failed', { failure_reason: 'the model refused' })
    const r = await retry({ icp_id: 'icp-1', ...NOTE })
    expect(r.code, JSON.stringify(r.payload)).toBe(200)
    expect(state.retries).toHaveLength(1)
  })

  it('allows recovery from `stuck` — the detector gave up on it', async () => {
    work('stuck')
    const r = await retry({ icp_id: 'icp-1', ...NOTE })
    expect(r.code, JSON.stringify(r.payload)).toBe(200)
    expect(state.retries).toHaveLength(1)
  })

  it('reads the LATEST run, not any run — an old failure does not unlock a live one', async () => {
    work('failed', { updated_at: '2026-09-18T09:00:00.000Z' })
    work('started', { updated_at: '2026-09-18T11:00:00.000Z' })
    const r = await retry({ icp_id: 'icp-1', ...NOTE })
    expect(r.code, 'a stale failed row unlocked recovery of a run that is currently going').toBeGreaterThanOrEqual(400)
    expect(state.retries).toHaveLength(0)
  })
})

describe('XC-12 · ③ audited with an operator AND a note', () => {
  it('🛑 REFUSES with no note — FD-0 recovery must say what it is recovering from', async () => {
    work('failed')
    const r = await retry({ icp_id: 'icp-1' })
    expect(r.code, 'a recovery was accepted with no reason recorded').toBe(400)
    expect(state.retries).toHaveLength(0)
  })

  it('the audit row carries the operator, the note and the state recovered from', async () => {
    work('failed', { failure_reason: 'the model refused' })
    await retry({ icp_id: 'icp-1', ...NOTE })
    const audit = state.operator_audit_log.find(a => String(a.action).includes('proof_retry'))
    expect(audit, 'recovery left no audit row').toBeTruthy()
    expect(audit!.operator_email).toBe('ops@kind.invalid')
    const detail = JSON.stringify(audit!.detail ?? {})
    expect(detail, 'the note was not recorded').toContain('client waiting since 10:05')
    expect(detail, 'the state recovered FROM was not recorded').toContain('failed')
  })

  it('a REFUSAL is audited too — "I pressed it and nothing happened" must be answerable', async () => {
    work('started')
    await retry({ icp_id: 'icp-1', ...NOTE })
    expect(state.operator_audit_log.length, 'a refused recovery left no trace').toBeGreaterThan(0)
  })
})

describe('XC-12 · ④ no concurrency', () => {
  it('🛑 F-DUP · two clicks on a failed run produce exactly ONE recovery', async () => {
    work('failed')
    const [a, b] = await Promise.all([retry({ icp_id: 'icp-1', ...NOTE }), retry({ icp_id: 'icp-1', ...NOTE })])
    expect(state.retries, 'a double click started two recoveries').toHaveLength(1)
    expect([a.code, b.code].filter(c => c === 200), 'both clicks reported success').toHaveLength(1)
  })
})
