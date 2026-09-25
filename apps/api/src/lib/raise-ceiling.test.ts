// ═══════════════════════════════════════════════════════════════════════════════════════
// 25 Sep (R166 ⑥ · P3b, board #2349) — OPENING MORE SOURCING IS A PERSON'S DECISION, ON RECORD.
//
// Until now a programme's sourcing limit could only be raised by a raw database edit that left
// no trace, and Vida had no way to release a review hold at all. Both are now recorded controls;
// and Vida's own "create programme" door checks capacity the way the client's choice does.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Row = Record<string, unknown>
const state = vi.hoisted(() => ({ programme: null as Row | null, updates: [] as Row[], casMatches: true }))

vi.mock('@kind/db', () => ({
  db: {
    from: () => {
      let pending: Row | null = null
      const q: any = {
        select: () => q, eq: () => q, is: () => q, not: () => q, in: () => q, order: () => q, limit: () => q,
        update: (row: Row) => { pending = row; return q },
        maybeSingle: async () => ({ data: state.programme, error: null }),
        single: async () => ({ data: state.programme, error: null }),
        then: (r: (v: unknown) => unknown) => {
          if (pending) {
            state.updates.push(pending)
            return Promise.resolve({ data: state.casMatches ? [{ id: 'p1' }] : [], error: null }).then(r)
          }
          return Promise.resolve({ data: null, error: null }).then(r)
        },
      }
      return q
    },
  },
}))

import { raiseSourcingCeiling } from './programme'

const live = (over: Row = {}): Row => ({
  id: 'p1', client_id: 'c1', status: 'LIVE', meeting_target: 10, sourcing_ceiling: 4000,
  sourced_used: 4000, sourced_reserved: 0, first_paid_at: '2026-09-20T00:00:00Z', ...over,
})

beforeEach(() => { state.programme = live(); state.updates = []; state.casMatches = true })

describe('raising the limit', () => {
  it('a bounded amount with a reason is applied, compare-and-set on the old limit', async () => {
    const r = await raiseSourcingCeiling('p1', 500, 'Client widened targeting to the Nordics')
    expect(r).toEqual({ ok: true, from: 4000, to: 4500 })
    expect(state.updates[0]).toMatchObject({ sourcing_ceiling: 4500 })
  })

  it('🛑 no reason, a vague reason, or a non-number is refused and nothing is written', async () => {
    for (const [n, why] of [[500, ''], [500, 'ok'], [0, 'a real reason here'], [2.5, 'a real reason here'], [NaN, 'a real reason here']] as [number, string][]) {
      expect((await raiseSourcingCeiling('p1', n, why)).ok).toBe(false)
    }
    expect(state.updates).toEqual([])
  })

  it('🛑 at most one programme\'s worth per press — a typo cannot open everything', async () => {
    const r = await raiseSourcingCeiling('p1', 4001, 'A very large and mistaken number')
    expect(r.ok).toBe(false)
    expect(state.updates).toEqual([])
  })

  it('a programme with no sourcing authority, or finished, has nothing to raise', async () => {
    state.programme = live({ first_paid_at: null })
    expect((await raiseSourcingCeiling('p1', 100, 'Client widened targeting')).ok).toBe(false)
    state.programme = live({ status: 'COMPLETED' })
    expect((await raiseSourcingCeiling('p1', 100, 'Client widened targeting')).ok).toBe(false)
  })

  it('two presses on a stale read: the loser changes nothing and is told', async () => {
    state.casMatches = false
    const r = await raiseSourcingCeiling('p1', 100, 'Client widened targeting')
    expect(r.ok).toBe(false)
    expect((r as { reason: string }).reason).toContain('changed while you were raising it')
  })
})

describe('the doors', () => {
  const route = readFileSync(join(__dirname, '../routes/programme.ts'), 'utf8')
  const vida = readFileSync(join(__dirname, '../../../admin/src/app/vida/page.tsx'), 'utf8')

  it('the raise route writes an audit row naming who, from, to and why', () => {
    const at = route.indexOf("programmeRouter.post('/:id/raise-ceiling'")
    expect(at).toBeGreaterThan(-1)
    const body = route.slice(at, at + 900)
    expect(body).toContain("auditProgramme(req, 'programme_ceiling_raised'")
    expect(body).toContain('from: r.from, to: r.to, reason:')
  })

  it('Vida\'s create door checks capacity the way the client\'s choice does', () => {
    const at = route.indexOf("programmeRouter.post('/', guard(")
    const body = route.slice(at, at + 2000)
    expect(body.indexOf('clientCapacityFor(')).toBeGreaterThan(-1)
    expect(body.indexOf('clientCapacityFor(')).toBeLessThan(body.indexOf('createProgramme('))
    expect(body).toContain("reason: 'over_capacity'")
  })

  it('Vida has the two controls, and they call the recorded routes', () => {
    expect(vida).toContain('Resolve review')
    expect(vida).toContain('/resolve-review`, { method: \'POST\' })')
    expect(vida).toContain('Raise limit')
    expect(vida).toContain('/raise-ceiling`, {')
  })
})
