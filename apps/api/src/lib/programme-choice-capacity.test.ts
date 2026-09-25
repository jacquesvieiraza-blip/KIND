// ══════════════════════════════════════════════════════════════════════════════════════════
// 🛑 THE CAP IS ENFORCED BY THE SERVER, AND WHAT THE CLIENT CHOSE AGAINST IS PINNED
//                                                          23 Sep 2026 · MVP1 stage-flow row 3
//
// ── WHAT WAS WRONG, AND WHY NOTHING NOTICED ─────────────────────────────────────────────
//
// R136 PR B bound the meetings slider to committed capacity. That was the BROWSER. `/choose`
// took `meetings` from the request body and priced it without ever asking whether the pool could
// carry it. The stage-flow document names the consequence exactly: *"Today a client can buy a
// hundred meetings against a four-thousand-person market and the calculator will price it."*
//
// Every existing guard stayed green, because every existing guard was a source assertion about
// the slider — and the slider was right. A cap that exists only in the UI is a suggestion to
// anyone who can open a terminal, and a promise the founder's own ruling says we must not make:
// *"we would not offer 10 meetings when we can only deliver 6."*
//
// ⚠️ THERE WAS NO UNIT TEST FOR `chooseProgramme` AT ALL before this file. The function that
// creates a client's programme and sets its price was covered only through source reads of the
// route that calls it. This harness honours the writes, so the pin is checked on the ROW.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest'

type Row = Record<string, unknown>
const state: {
  clients: Row[]; icps: Row[]; programmes: Row[]
  cap: { known: boolean; committed: number } | 'throws'
  capCalls: number
} = { clients: [], icps: [], programmes: [], cap: { known: true, committed: 10 }, capCalls: 0 }

function makeTable(name: 'clients' | 'icps' | 'programmes') {
  const q = {
    _filters: [] as Array<(r: Row) => boolean>,
    _payload: null as Row | null,
    _mode: '' as '' | 'update' | 'select',
    select() { if (this._mode === '') this._mode = 'select'; return this },
    eq(col: string, val: unknown) { this._filters.push(r => r[col] === val); return this },
    order() { return this }, limit() { return this },
    update(p: Row) { this._mode = 'update'; this._payload = p; return this },
    _matched() { return (state[name] as Row[]).filter(r => this._filters.every(f => f(r))) },
    async maybeSingle() { return { data: this._matched()[0] ?? null, error: null } },
    async single() {
      if (this._mode === 'update') {
        const hit = this._matched()
        for (const r of hit) Object.assign(r, this._payload)
        return { data: hit[0] ?? null, error: null }
      }
      return { data: this._matched()[0] ?? null, error: null }
    },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: { from: (t: string) => makeTable(t === 'clients' ? 'clients' : t === 'icps' ? 'icps' : 'programmes') },
}))

// The provider preview is the one thing that must NOT run in a unit test — and the one thing
// whose answer this whole file is about. So it is replaced by a switch, and counted.
// ⛓️ 25 Sep (R166 · P8) — creating or choosing a programme now asks WHICH PRICING TERMS apply
// (`client-size.ts`: the client's size band, the curve for House, or "no price yet"). This file
// is about the curve and the rows it writes, so its client is curve-priced; nothing asserted
// here changed. Band pricing is proven in `pricing-by-band.test.ts`.
vi.mock('./client-size', () => ({ pricingTermsFor: async () => ({ kind: 'curve' }) }))
vi.mock('./client-capacity', () => ({
  activeIcpFor: async (clientId: string) =>
    state.icps.find(i => i.client_id === clientId && i.is_active) ?? null,
  clientCapacityFor: async () => {
    state.capCalls++
    if (state.cap === 'throws') throw new Error('Apollo unreachable')
    return { matched: 0, excluded: 0, already_worked: 0, workable: 0, ...state.cap }
  },
}))

vi.mock('./programme', () => ({
  openProgrammeForClient: async (clientId: string) =>
    state.programmes.find(p => p.client_id === clientId) ?? null,
  createProgramme: async (clientId: string, meetings: number) => {
    const { quoteProgramme } = await import('@kind/shared')
    const q = quoteProgramme(meetings)
    const row: Row = {
      id: 'prog-1', client_id: clientId, status: 'DRAFT',
      meeting_target: q.meetings, recommended_volume: q.recommendedVolume,
      price_per_meeting_cents: q.pricePerMeetingCents, price_total_cents: q.totalCents,
      first_payment_cents: q.firstPaymentCents, second_payment_cents: q.secondPaymentCents,
    }
    state.programmes.push(row)
    return { ok: true, programme: row }
  },
}))

vi.mock('./programme-icp', () => ({ attachIcpToProgramme: async () => ({ ok: true }) }))

import { chooseProgramme } from './client-programme-choice'

beforeEach(() => {
  state.clients = [{ id: 'c1', proof_completed_at: '2026-09-20T00:00:00Z' }]
  state.icps = [{ id: 'icp-1', client_id: 'c1', is_active: true, created_at: '2026-09-19T00:00:00Z', name: 'x' }]
  state.programmes = []
  state.cap = { known: true, committed: 10 }
  state.capCalls = 0
})

const prog = () => state.programmes[0]

describe('🛑 the server refuses a target the pool cannot carry', () => {
  it('a target within capacity is accepted and priced', async () => {
    const r = await chooseProgramme('c1', { meetings: 10 })
    expect(r.ok).toBe(true)
    expect(prog().meeting_target).toBe(10)
  })

  it('🛑 A TARGET ABOVE CAPACITY IS REFUSED — this is the whole fix', async () => {
    // The exact case the stage-flow document names: more meetings than the market carries,
    // arriving by any route other than the slider.
    const r = await chooseProgramme('c1', { meetings: 100 })
    expect(r.ok, 'a hundred meetings were sold against a pool that carries ten').toBe(false)
    if (!r.ok) {
      expect(r.reason).toBe('over_capacity')
      expect(r.committed).toBe(10)
    }
    expect(state.programmes, 'a programme was created for an unsellable target').toHaveLength(0)
  })

  it('one meeting over is still over — nothing rounds a promise up', async () => {
    const r = await chooseProgramme('c1', { meetings: 11 })
    expect(r.ok).toBe(false)
  })

  it('🛑 A POOL TOO SMALL FOR ONE MEETING REFUSES EVERY TARGET', async () => {
    // Founder, 22 Sep: "if we dont have enough we tell the client improve your ICP."
    state.cap = { known: true, committed: 0 }
    const r = await chooseProgramme('c1', { meetings: 1 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.detail).toMatch(/not reach enough people/i)
  })

  it('the refusal hands them their own targeting and names no rate', async () => {
    const r = await chooseProgramme('c1', { meetings: 100 })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.detail).toMatch(/widen/i)
      // "i said 400 internally. we dont disclose this."
      expect(r.detail).not.toMatch(/\b400\b|\b250\b|per meeting/)
    }
  })

  it('an existing programme re-chosen above capacity is refused and left untouched', async () => {
    state.programmes.push({
      id: 'prog-1', client_id: 'c1', status: 'RECOMMENDED', meeting_target: 5, committed_capacity: 10,
    })
    const r = await chooseProgramme('c1', { meetings: 50 })
    expect(r.ok).toBe(false)
    expect(prog().meeting_target, 'a refused re-choice still moved the target').toBe(5)
  })
})

describe('🛑 what the client chose against is pinned on the programme', () => {
  it('a known pool pins its committed capacity and the moment', async () => {
    await chooseProgramme('c1', { meetings: 7 })
    expect(prog().committed_capacity).toBe(10)
    expect(prog().capacity_pinned_at).toBeTruthy()
  })

  it('re-choosing re-pins against the pool as it stands NOW', async () => {
    await chooseProgramme('c1', { meetings: 7 })
    state.cap = { known: true, committed: 12 }
    await chooseProgramme('c1', { meetings: 12 })
    expect(prog().committed_capacity).toBe(12)
  })
})

describe('🛑 an unknown pool caps nothing — and says it was unknown', () => {
  it('an unreachable provider does not refuse a paying client', async () => {
    // The same rule the slider follows: a vendor being slow is not the client's market being
    // empty, and capping them at zero for it would be the worse of the two failures.
    state.cap = 'throws'
    const r = await chooseProgramme('c1', { meetings: 40 })
    expect(r.ok).toBe(true)
  })

  it('🛑 AND IT IS PINNED AS UNKNOWN — a moment with no number, never a silent gap', async () => {
    // What lets an operator later tell "chosen blind" from "chosen before this check existed".
    state.cap = 'throws'
    await chooseProgramme('c1', { meetings: 40 })
    expect(prog().committed_capacity, 'an unknown pool was recorded as a number').toBeNull()
    expect(prog().capacity_pinned_at, 'the blind choice left no trace').toBeTruthy()
  })

  it('known:false from the provider is treated exactly like a throw', async () => {
    state.cap = { known: false, committed: 0 }
    const r = await chooseProgramme('c1', { meetings: 40 })
    expect(r.ok).toBe(true)
    expect(prog().committed_capacity).toBeNull()
  })
})

describe('the check happens once, and only where it should', () => {
  it('one provider call per press', async () => {
    await chooseProgramme('c1', { meetings: 7 })
    expect(state.capCalls).toBe(1)
  })

  it('an unfinished Proof is refused BEFORE any provider call is made', async () => {
    state.clients = [{ id: 'c1', proof_completed_at: null }]
    const r = await chooseProgramme('c1', { meetings: 7 })
    expect(r.ok).toBe(false)
    expect(state.capCalls, 'a provider was called for a client not yet allowed to choose').toBe(0)
  })

  it('an invalid target is refused before any provider call too', async () => {
    const r = await chooseProgramme('c1', { meetings: 0 })
    expect(r.ok).toBe(false)
    expect(state.capCalls).toBe(0)
  })
})

// ⚑ 23 Sep (MVP1 Stage 3) — THE SCREEN AGREES WITH THE SERVER ON A KNOWN ZERO.
// `capOf` read a measured zero as "unknown" and left the slider open at 1–50, every value of
// which `chooseProgramme` above refuses — so the client learned on Save. The calculator now holds
// the choice and shows the widen sentence; an UNKNOWN capacity still caps nothing.
describe('the calculator holds the choice when the pool is known to carry nothing', () => {
  it('🛑 a known zero disables Build and points at their own targeting; unknown still caps nothing', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const src = readFileSync(join(__dirname, '../../../portal/src/components/milla/ProgrammeCalculator.tsx'), 'utf8')
    expect(src).toContain('const noCapacity = capacity !== null && capacity.known && capacity.committed <= 0')
    expect(src).toMatch(/disabled=\{busy \|\| chosen \|\| !d \|\| noCapacity\}/)
    expect(src).toContain('(atCeiling || noCapacity) && calc?.widen_note')
    expect(src, 'an unknown capacity must still cap nothing').toContain('return c && c.known && c.committed > 0 ? c.committed : null')
  })
})
