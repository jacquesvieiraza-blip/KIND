// ═══════════════════════════════════════════════════════════════════════════════════════
// N4 · 6 Oct — "Replied" FELL FROM 1 TO 0 WHEN HOUSE GREW
//
// The programme's replies were read by naming EVERY one of its people in one `.in(...)` filter.
// With batch 2 House had ~486 people — a request line past the server's limit — and the error
// was ignored, so Vida showed 0 replies (Gina's reply vanished from the count). At 2,500 people
// it would also hit the 1000-row cap on the people read itself.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
  // ⚑ 10 Sep (I2) — the sender gate refuses outright without a readable secret key, and this
  // file's cases are about the mailbox, not about the environment.
  process.env.INBOX_SECRET_KEY ??= '0'.repeat(64)
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
    // ⚠️ A REAL REQUEST LINE HAS A LIMIT. Past it the server answers an error (a 414), which the
    // old read ignored and rendered as 0 replies. Modelled here at the module's own IN_CHUNK.
    in(c: string, l: unknown[]) { if (l.length > 300) q._tooLong = true; q._f.push((r: Row) => l.includes(r[c] as never)); return q },
    range(a: number, b: number) { q._range = [a, b]; return q },
    _hit() {
      if (unreadable.has(name)) throw new Error(`${name} unreadable`)
      if (q._tooLong) throw new Error('414 Request-URI Too Large')
      let h = rows().filter(r => q._f.every(f => f(r)))
      const o = q._order as null | { c: string; asc: boolean }
      if (o) h = [...h].sort((a, b) => String(a[o.c] ?? '').localeCompare(String(b[o.c] ?? '')) * (o.asc ? 1 : -1))
      const rg = q._range as [number, number] | undefined
      if (rg) h = h.slice(rg[0], rg[1] + 1)
      const n = q._limit as number | undefined
      // ⚠️ AND A SERVER-SIDE ROW CAP: one read returns at most 1000 rows, whatever .limit() asks.
      return h.slice(0, Math.min(typeof n === 'number' ? n : Infinity, 1000))
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

import { lifecycleDetailFor } from './programme-lifecycle-facts'

const CLIENT = '11111111-1111-4111-8111-111111111111'
const PROG = '22222222-2222-4222-8222-222222222222'
const lead = (i: number): Row => ({ id: `lead-${String(i).padStart(5, '0')}`, programme_id: PROG, client_id: CLIENT, company: `Co ${i}` })

beforeEach(() => {
  unreadable.clear()
  for (const k of Object.keys(state)) delete state[k]
  state.programmes = [{
    id: PROG, client_id: CLIENT, status: 'LIVE', paused_at: null,
    approved_at: '2026-10-01', second_paid_at: null, second_payment_ref: null, second_authorised_at: null,
    first_paid_at: '2026-09-30', first_authorised_at: null, went_live_at: '2026-10-02', run_at: '2026-10-02',
    meeting_target: 10, sourcing_ceiling: 2500, sourced_used: 500, sourced_reserved: 0,
    recommended_volume: 2500, created_at: '2026-09-30T08:00:00Z',
  }]
  state.clients = [{ id: CLIENT, proof_review_requested_at: null, proof_review_resolved_at: null, proof_completed_at: '2026-09-30' }]
  state.client_inboxes = []
  state.programme_batches = []
  state.operator_audit_log = []
  state.meetings = []
  state.leads = Array.from({ length: 486 }, (_, i) => lead(i))
  state.figsy_replies = [{
    id: 'reply-gina', lead_id: 'lead-00400', from_name: 'Gina', classification: 'interested',
    qualified_at: null, meeting_booked_at: null, received_at: '2026-10-05T09:00:00Z',
  }]
})

describe('N4 · the reply count does not depend on how many people the programme has', () => {
  it('🛑 486 people, one reply → Replied is 1, and it is waiting on a decision', async () => {
    const d = await lifecycleDetailFor(CLIENT)
    expect(d.counts.replies, 'the reply vanished once the programme grew').toBe(1)
    expect(d.counts.repliesAwaitingDecision).toBe(1)
    expect(d.counts.unreadable).not.toContain('replies')
  })

  it('🛑 2,500 people (past the 1000-row cap) → still counted', async () => {
    state.leads = Array.from({ length: 2500 }, (_, i) => lead(i))
    state.figsy_replies = [{ ...state.figsy_replies[0], lead_id: 'lead-02400' }]
    const d = await lifecycleDetailFor(CLIENT)
    expect(d.counts.replies).toBe(1)
  })

  it('🛑 an unreadable reply table is named unreadable — never a quiet 0', async () => {
    unreadable.add('figsy_replies')
    const d = await lifecycleDetailFor(CLIENT)
    expect(d.counts.unreadable).toContain('replies')
  })
})
