// ═══════════════════════════════════════════════════════════════════════════════════════
// 25 Sep (R141 · R166 · P6, board #2352) — SETTLEMENT COUNTS QUALIFIED MEETINGS, NOT A TYPED NUMBER.
//
// The credit is owed for QUALIFIED meetings not delivered. The figure is now counted from the
// meeting record; a typed figure must match it; and nothing settles while a meeting is
// unqualified or a client challenge is open.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Row = Record<string, unknown>
const state = vi.hoisted(() => ({ meetings: [] as Row[], meetingsError: false, programme: null as Row | null, settled: [] as Row[] }))

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => {
      const q: any = {
        select: () => q, eq: () => q, is: () => q,
        then: (r: (v: unknown) => unknown) => Promise.resolve(t === 'meetings'
          ? (state.meetingsError ? { data: null, error: { message: 'down' } } : { data: state.meetings, error: null })
          : { data: [], error: null }).then(r),
      }
      return q
    },
  },
}))
vi.mock('./alerts', () => ({ sendFounderAlert: () => Promise.resolve() }))

import { programmeDelivery, settlementVerdict } from './meeting-truth'

const m = (o: Row = {}) => ({ id: Math.random().toString(36), qualified_at: '2026-09-24T10:00:00Z', challenged_at: null, challenge_outcome: null, ...o })

beforeEach(() => { state.meetings = []; state.meetingsError = false })

describe('what a programme delivered, from the record', () => {
  it('qualified meetings count; an upheld challenge does not; a rejected challenge does', async () => {
    state.meetings = [m(), m(), m({ challenged_at: 'x', challenge_outcome: 'upheld' }), m({ challenged_at: 'x', challenge_outcome: 'rejected' })]
    expect(await programmeDelivery('p1')).toEqual({ delivered: 3, unqualified: 0, openChallenges: 0, upheld: 1 })
  })

  it('🛑 unqualified meetings and open challenges block settlement, naming the count', async () => {
    state.meetings = [m(), m({ qualified_at: null })]
    const v1 = settlementVerdict(await programmeDelivery('p1'))
    expect(v1.ok).toBe(false)
    expect((v1 as { reason: string }).reason).toMatch(/1 meeting has not been qualified/)
    state.meetings = [m(), m({ challenged_at: 'x' })]
    const v2 = settlementVerdict(await programmeDelivery('p1'))
    expect((v2 as { reason: string }).reason).toMatch(/1 client challenge is still open/)
  })

  it('🛑 an unreadable record is not zero delivered — it refuses', async () => {
    state.meetingsError = true
    expect(await programmeDelivery('p1')).toBeNull()
    expect(settlementVerdict(null).ok).toBe(false)
  })

  it('all decided → settles at the counted figure', async () => {
    state.meetings = [m(), m(), m()]
    expect(settlementVerdict(await programmeDelivery('p1'))).toEqual({ ok: true, delivered: 3 })
  })
})

describe('🛑 the settle door uses the count', () => {
  it('the route calls settleProgrammeFromRecord; a typed figure is a confirmation, not the source', () => {
    const route = readFileSync(join(__dirname, '../routes/programme.ts'), 'utf8')
    const at = route.indexOf("programmeRouter.post('/:id/settle-shortfall'")
    const body = route.slice(at, at + 1400)
    expect(body).toContain('settleProgrammeFromRecord({')
    expect(body).toContain('confirmedDelivered: confirmed')
    expect(body).not.toContain('settleProgrammeShortfall({')
  })

  it('settleProgrammeFromRecord refuses a figure that differs from the record, and counts before paying', () => {
    const src = readFileSync(join(__dirname, 'programme.ts'), 'utf8')
    const at = src.indexOf('export async function settleProgrammeFromRecord(')
    const fn = src.slice(at, src.indexOf('\n}\n', at))
    expect(fn).toContain('settlementVerdict(await programmeDelivery(params.programmeId))')
    expect(fn).toContain('params.confirmedDelivered !== v.delivered')
    expect(fn.indexOf('settlementVerdict(')).toBeLessThan(fn.indexOf('settleProgrammeShortfall('))
    expect(fn).toContain('deliveredMeetings: v.delivered')
  })

  it('Vida prefills and explains from the qualified count', () => {
    const vida = readFileSync(join(__dirname, '../../../admin/src/app/vida/page.tsx'), 'utf8')
    expect(vida).toContain('setSettleMeetings(String(prog.programme.meetings_qualified))')
    expect(vida).toContain('prog.programme.settle_blocked_reason')
    const op = readFileSync(join(__dirname, 'operator-programme.ts'), 'utf8')
    expect(op).toContain('meetings_qualified: meetingsQualified')
  })
})
