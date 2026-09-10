// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 10 Sep (I1) — THE FACTS VIDA IS TOLD, AND THE ONE IT WAS NEVER TOLD.
//
// ── WHY THIS FILE DID NOT EXIST AND HAD TO ──────────────────────────────────────────────
//
// `programme-lifecycle.test.ts` proves the DERIVATION: given `preparationStopped: true`, a
// sourcing programme is an exception. It has always passed. The defect was one layer below it
// — nothing ever set that fact from a refused automatic start, so the derivation was asked a
// question with the wrong answer already in it and returned `sourcing` · **Working** about a
// programme that had bought nothing and never would.
//
// 🛑 A PURE FUNCTION TESTED IN ISOLATION CANNOT CATCH THAT. The bug lives in the gathering, so
// the test has to live here too.
//
// ⚠️ EVERY READ IN THE FILE UNDER TEST FAILS SOFT, which is exactly why it needs asserting:
// a gathering step that silently returns the calm answer is indistinguishable from one that
// was never written.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})

type Row = Record<string, unknown>
const state: Record<string, Row[]> = {}
/** Tables whose next read throws, so "unreadable" can be told apart from "empty". */
const unreadable = new Set<string>()

function table(name: string) {
  const rows = () => state[name] ?? []
  const q: Record<string, unknown> & { _f: ((r: Row) => boolean)[] } = {
    _f: [], _order: null as null | { c: string; asc: boolean }, _limit: undefined as number | undefined,
    select() { return q },
    order(c: string, o?: { ascending?: boolean }) { q._order = { c, asc: o?.ascending !== false }; return q },
    limit(n: number) { q._limit = n; return q },
    eq(c: string, v: unknown) { q._f.push((r: Row) => r[c] === v); return q },
    is(c: string, v: unknown) { q._f.push((r: Row) => (r[c] ?? null) === v); return q },
    not(c: string, _o: string, v: unknown) { q._f.push((r: Row) => (r[c] ?? null) !== v); return q },
    in(c: string, l: unknown[]) { q._f.push((r: Row) => l.includes(r[c] as never)); return q },
    _hit() {
      if (unreadable.has(name)) throw new Error(`${name} unreadable`)
      let h = rows().filter(r => q._f.every(f => f(r)))
      const o = q._order as null | { c: string; asc: boolean }
      if (o) h = [...h].sort((a, b) => String(a[o.c] ?? '').localeCompare(String(b[o.c] ?? '')) * (o.asc ? 1 : -1))
      const n = q._limit as number | undefined
      return typeof n === 'number' ? h.slice(0, n) : h
    },
    _run() {
      try { const h = q._hit(); return { data: h, count: h.length, error: null } }
      catch (e) { return { data: null, count: null, error: { message: (e as Error).message } } }
    },
    async maybeSingle() { const r = q._run(); return { data: (r.data ?? [])[0] ?? null, error: r.error } },
    then(res: (v: unknown) => unknown) { return Promise.resolve(q._run()).then(res) },
  } as never
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => table(t), rpc: async () => ({ data: null, error: null }) } }))
vi.mock('./programme-chain', () => ({ resolveProgrammeChain: async () => ({ ok: false, reason: 'none' }) }))
vi.mock('./preparation-readiness', () => ({
  PREPARATION_CLEARS: [] as string[],
  programmePreparationReadiness: async () => ({ ready: false, blockers: [] }),
}))
vi.mock('./programme-advance', () => ({
  isAdvanceRunning: () => false,
  lastPreparationAttempt: async () => null,
}))
vi.mock('./outreach-kill-switch', () => ({ outreachDeliveryPermitted: () => false }))
vi.mock('./figsy', () => ({ operatorSendEnabled: () => false }))

import { lifecycleDetailFor, lifecycleBoard } from './programme-lifecycle-facts'

const CLIENT = '11111111-1111-4111-8111-111111111111'
const PROG = '22222222-2222-4222-8222-222222222222'

const refusal = 'No ICP is attached to this programme, so there is nothing it is authorised to source.'

const auditRow = (action: string, detail: string, created_at: string): Row => ({
  operator_email: 'stripe-webhook', action, subject_type: 'programme', subject_id: PROG,
  detail: { trigger: 'stripe_first_payment', detail }, created_at,
})

beforeEach(() => {
  unreadable.clear()
  for (const k of Object.keys(state)) delete state[k]
  // A paid programme that is authorised to source and has done nothing at all — the exact
  // shape a refused automatic start leaves behind.
  state.programmes = [{
    id: PROG, client_id: CLIENT, status: 'SOURCING_AUTHORISED', paused_at: null,
    approved_at: null, second_paid_at: null, second_payment_ref: null, second_authorised_at: null,
    first_paid_at: '2026-09-10', first_authorised_at: null, went_live_at: null, run_at: null,
    meeting_target: 10, sourcing_ceiling: 2500, sourced_used: 0, sourced_reserved: 0,
    recommended_volume: 2500, created_at: '2026-09-10T08:00:00Z',
  }]
  state.clients = [{ id: CLIENT, proof_review_requested_at: null, proof_review_resolved_at: null, proof_completed_at: '2026-09-10' }]
  state.client_inboxes = [{ client_id: CLIENT, status: 'active' }]
  state.programme_batches = []
  state.leads = []
  state.operator_audit_log = []
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ① THE DETAIL PANEL — the client an operator has actually opened
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('① a refused automatic start is reported, not rendered as work in progress', () => {
  it('🛑 THE BUG: with no continuation history at all it reads as Working', async () => {
    // The baseline. This is what EVERY stranded programme looked like, and it is still the
    // correct answer for a programme whose payment landed a second ago.
    const d = await lifecycleDetailFor(CLIENT)
    expect(d.verdict.state).toBe('sourcing')
    expect(d.verdict.needsYou).toBe(false)
  })

  it('🛑 THE FIX: a refused start makes it an exception with the real reason', async () => {
    state.operator_audit_log = [auditRow('programme_p1_auto_refused', refusal, '2026-09-10T09:00:00Z')]
    const d = await lifecycleDetailFor(CLIENT)
    expect(d.verdict.state, 'a programme that never started still reads as working').toBe('sourcing_exception')
    expect(d.verdict.needsYou).toBe(true)
    expect(d.verdict.mode).toBe('Needs you')
    // ⚠️ THE REASON THE OPERATOR READS IS THE ONE THE REFUSAL ACTUALLY GAVE — not a generic
    // "something went wrong", which is the sentence that makes a person open a database.
    expect(d.stoppedDetail).toContain('No ICP is attached')
  })

  it('a successful start leaves it Working, because it genuinely is', async () => {
    state.operator_audit_log = [auditRow('programme_p1_auto_started', '250 prospect(s) obtained.', '2026-09-10T09:00:00Z')]
    const d = await lifecycleDetailFor(CLIENT)
    expect(d.verdict.state).toBe('sourcing')
    expect(d.verdict.needsYou).toBe(false)
  })

  it('🛑 a refusal the operator already fixed does not keep raising a task', async () => {
    state.operator_audit_log = [
      auditRow('programme_p1_auto_refused', refusal, '2026-09-10T09:00:00Z'),
      auditRow('programme_p1_auto_started', '250 prospect(s) obtained.', '2026-09-10T11:00:00Z'),
    ]
    const d = await lifecycleDetailFor(CLIENT)
    expect(d.verdict.state, 'a cleared exception is still in Needs you').toBe('sourcing')
  })

  it('🛑 a spend with no recorded outcome is stopped — it died mid-run', async () => {
    state.programme_batches = [{ id: 'b1', programme_id: PROG, seq: 1 }]
    const d = await lifecycleDetailFor(CLIENT)
    expect(d.verdict.state).toBe('sourcing_exception')
    expect(d.stoppedDetail).toContain('never recorded how it finished')
  })

  it('an unreadable audit trail invents no task', async () => {
    unreadable.add('operator_audit_log')
    const d = await lifecycleDetailFor(CLIENT)
    expect(d.verdict.state).toBe('sourcing')
    expect(d.verdict.needsYou).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ② THE BOARD — and why this one exception breaks the board's own under-count rule
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('② the LIST shows it too, because nothing else would make anybody open it', () => {
  it('🛑 a stranded programme is flagged on the row, not only in the opened panel', async () => {
    state.operator_audit_log = [auditRow('programme_p1_auto_refused', refusal, '2026-09-10T09:00:00Z')]
    const [row] = await lifecycleBoard([CLIENT])
    expect(row.state, 'the list still says Working, so nobody opens the client').toBe('sourcing_exception')
    expect(row.needs_you).toBe(true)
    expect(row.needs_you_reason).toBe('preparation_stopped')
  })

  it('a healthy programme is not flagged on the row', async () => {
    state.operator_audit_log = [auditRow('programme_p1_auto_started', 'obtained.', '2026-09-10T09:00:00Z')]
    const [row] = await lifecycleBoard([CLIENT])
    expect(row.needs_you).toBe(false)
  })

  it('🛑 and the newest outcome wins here as well', async () => {
    state.operator_audit_log = [
      auditRow('programme_p1_auto_refused', refusal, '2026-09-10T09:00:00Z'),
      auditRow('programme_p1_auto_started', 'obtained.', '2026-09-10T11:00:00Z'),
    ]
    const [row] = await lifecycleBoard([CLIENT])
    expect(row.needs_you, 'a fixed refusal keeps the badge lit for ever').toBe(false)
  })

  it('an unreadable trail leaves the board silent rather than alarmed', async () => {
    unreadable.add('operator_audit_log')
    const [row] = await lifecycleBoard([CLIENT])
    expect(row.needs_you).toBe(false)
  })
})
