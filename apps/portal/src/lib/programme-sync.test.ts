// 25 Sep (R161) — Milla hears what happened in Vida, without a refresh.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { SYNC_CHECK_MS, millaFacts, sameMillaFacts, millaChangeLines, type MillaSyncFacts } from './programme-sync'

const PAGE = readFileSync(join(__dirname, '../app/(milla)/milla/programme/page.tsx'), 'utf8')
const base: MillaSyncFacts = { stage: 'Approval', firstAt: '2026-09-24', secondAt: null, approvedAt: '2026-09-25', wentLiveAt: null, paused: false }

describe('what moved, and what Milla says', () => {
  it('🛑 P2 authorised in Vida → Milla says it is fully authorised and nothing is sent yet', () => {
    const c = millaChangeLines(base, { ...base, secondAt: '2026-09-25T10:00Z' })
    expect(c).toHaveLength(1)
    expect(c[0].key).toBe('sync-second-2026-09-25T10:00Z')
    expect(c[0].lines.join(' ')).toContain('fully authorised')
    expect(c[0].lines.join(' ')).toContain('nothing is sent until then')
  })

  it('made live, paused and resumed are each said', () => {
    expect(millaChangeLines(base, { ...base, wentLiveAt: 'x' })[0].lines[0]).toContain('now live')
    expect(millaChangeLines(base, { ...base, paused: true })[0].lines[0]).toContain('paused')
    expect(millaChangeLines({ ...base, paused: true }, base)[0].lines[0]).toContain('resumed')
  })

  it('nothing moved → nothing is said', () => {
    expect(sameMillaFacts(base, { ...base })).toBe(true)
    expect(millaChangeLines(base, { ...base })).toEqual([])
  })

  it('paid or internally authorised count the same', () => {
    const f = millaFacts({ stage: 'Approval', paused: false, approvedAt: null, wentLiveAt: null,
      money: { firstPaidAt: null, secondPaidAt: null, firstAuthorisedAt: 'a', secondAuthorisedAt: 'b' } })
    expect([f.firstAt, f.secondAt]).toEqual(['a', 'b'])
  })

  it('checks often enough to matter and never hammers the server', () => {
    expect(SYNC_CHECK_MS).toBeGreaterThanOrEqual(10_000)
    expect(SYNC_CHECK_MS).toBeLessThanOrEqual(60_000)
  })
})

describe('🛑 every Milla screen that shows a programme re-reads it', () => {
  const HOOK = readFileSync(join(__dirname, '../components/milla/useProgrammeSync.ts'), 'utf8')
  const HOME = readFileSync(join(__dirname, '../app/(milla)/milla/page.tsx'), 'utf8')

  it('the one hook: on a timer and on return to the tab, reloads and announces once per event', () => {
    expect(HOOK).toContain("api.get<{ data: CustomerProgramme }>('/my/programme', session?.access_token)")
    expect(HOOK).toContain('setInterval(() => { void check() }, SYNC_CHECK_MS)')
    expect(HOOK).toContain("document.addEventListener('visibilitychange', onReturn)")
    expect(HOOK).toContain('if (sameMillaFacts(before, after)) return')
    expect(HOOK).toContain('for (const c of millaChangeLines(before, after)) sayRef.current(c.key, c.lines)')
  })

  it('🛑 Home uses it — the screen a client lives on — and so does the Programme screen', () => {
    expect(HOME).toContain('useProgrammeSync(prog, load, conversation.announceOnce)')
    expect(PAGE).toContain('useProgrammeSync(p, load, conversation.announceOnce)')
  })
})
