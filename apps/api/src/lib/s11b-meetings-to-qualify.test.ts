// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 2 Oct (R189 ⑤ · card #2557 · sending fix #11b) — EVERY UNQUALIFIED MEETING IS ON VIDA'S LIST.
//
// Only qualified meetings count as delivered (R141), and nothing asked anyone to qualify one —
// so the client's meetings against target, the 25/50/75% moments and settlement all stayed at
// 0 until somebody remembered. R189 ⑤: *"a 'qualify this meeting' task follows"*.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Row = Record<string, unknown>
const state = { meetings: [] as Row[], error: null as null | { message: string } }

vi.mock('@kind/db', () => ({
  db: {
    from: () => {
      const filters: ((r: Row) => boolean)[] = []
      const q: Record<string, unknown> = {
        select() { return q },
        is(c: string, v: unknown) { filters.push(r => (r[c] ?? null) === v); return q },
        in(c: string, vs: unknown[]) { filters.push(r => vs.includes(r[c])); return q },
        limit() { return q },
        then(res: (v: unknown) => unknown) {
          if (state.error) return res({ data: null, error: state.error })
          return res({ data: state.meetings.filter(r => filters.every(f => f(r))), error: null })
        },
      }
      return q
    },
  },
}))

// Booked Wednesday 30 Sep → 3 business days → Monday 5 Oct.
const BOOKED_WED = '2026-09-30T10:00:00.000Z'
const meeting = (over: Row = {}): Row => ({
  id: `m-${state.meetings.length + 1}`, client_id: 'client-A', booked_at: BOOKED_WED, state: 'BOOKED_UNVERIFIED',
  qualified_at: null, excluded_reason: null, superseded_by: null, ...over,
})
const NOW = new Date('2026-10-01T09:00:00Z')
const load = async (exclude = new Set<string>()) => (await import('./meetings-to-qualify')).meetingsToQualify(exclude)
const label = async (count: number, soonest: string, now = NOW) =>
  (await import('./meetings-to-qualify')).meetingsToQualifyAlert({ count, soonestDeadline: soonest }, now)

beforeEach(() => { state.meetings = []; state.error = null })

describe('#2557 — a booked or held meeting nobody has qualified is listed for its client', () => {
  it('🛑 one line per client, with the count and the soonest "qualify by" date (3 business days after booking)', async () => {
    state.meetings = [meeting(), meeting({ booked_at: '2026-10-01T10:00:00.000Z', state: 'HELD' })]
    const r = await load()
    expect(r.degraded).toBeNull()
    expect(r.rows).toEqual([{ clientId: 'client-A', count: 2, soonestDeadline: new Date('2026-10-05T10:00:00.000Z').toISOString() }])
  })

  it('🛑 qualified, excluded, rescheduled-away and no-show meetings are not listed', async () => {
    state.meetings = [
      meeting({ qualified_at: '2026-10-01T08:00:00Z' }),
      meeting({ excluded_reason: 'duplicate' }),
      meeting({ superseded_by: 'm-9' }),
      meeting({ state: 'NO_SHOW' }),
    ]
    expect((await load()).rows).toEqual([])
  })

  it('🛑 House is listed like any client — the demo is not', async () => {
    state.meetings = [meeting({ client_id: 'house' }), meeting({ client_id: 'demo' })]
    const r = await load(new Set(['demo']))
    expect(r.rows.map(x => x.clientId)).toEqual(['house'])
  })

  it('🛑 a read failure says so — it is never "no meetings waiting"', async () => {
    state.error = { message: 'connection reset' }
    const r = await load()
    expect(r.rows).toEqual([])
    expect(r.degraded).toMatch(/could not be checked/)
    expect(r.degraded).toMatch(/does NOT mean/)
  })
})

describe('#2557 — what Vida shows', () => {
  it('names the count, says only qualified meetings count, and gives the date that keeps the client\'s 3-day window', async () => {
    const a = await label(2, '2026-10-05T10:00:00.000Z')
    expect(a.label).toContain('2 meetings to qualify')
    expect(a.label).toContain('only qualified meetings count')
    expect(a.label).toContain('Mon 5 Oct')
    expect(a.severity).toBe('normal')
  })

  it('🛑 is urgent when the soonest window closes within a day — or has already closed', async () => {
    expect((await label(1, '2026-10-01T20:00:00.000Z')).severity).toBe('high')
    const late = await label(1, '2026-09-30T20:00:00.000Z')
    expect(late.severity).toBe('high')
    expect(late.label).toContain('1 meeting to qualify')
    expect(late.label).toMatch(/already closed/)
  })
})

describe('the list is wired into Vida\'s Needs-you row', () => {
  const operator = readFileSync(join(__dirname, '..', 'routes', 'operator.ts'), 'utf8')
  const vida = readFileSync(join(__dirname, '..', '..', '..', 'admin', 'src', 'app', 'vida', 'page.tsx'), 'utf8')

  it('the alerts feed adds one "meetings_to_qualify" row per client, and reports a failed read as degraded', () => {
    expect(operator).toContain('meetingsToQualify(')
    expect(operator).toContain("kind: 'meetings_to_qualify'")
    expect(operator).toContain('meetings_to_qualify: ')
  })

  it('pressing it opens the tab with the qualify panel', () => {
    expect(vida).toContain("a.kind === 'meetings_to_qualify' ? 'Programme'")
  })
})
