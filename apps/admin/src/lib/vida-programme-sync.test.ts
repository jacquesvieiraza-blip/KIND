// 25 Sep (R161) — Vida hears what the client did in Milla, without a refresh.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { VIDA_SYNC_MS, vidaFacts, sameVidaFacts, vidaChangeLines, type VidaSyncFacts } from './vida-programme-sync'

const PAGE = readFileSync(join(__dirname, '../app/vida/page.tsx'), 'utf8')
const base: VidaSyncFacts = { status: 'READY_FOR_APPROVAL', approved_at: null, first_at: 'p1', second_at: null, went_live_at: null, paused_at: null }

describe('what moved, and what Vida says', () => {
  it('🛑 the client approved in Milla → Vida says so and names the next step', () => {
    const lines = vidaChangeLines(base, { ...base, status: 'APPROVED', approved_at: 't' }, 'K.I.N.D')
    expect(lines).toEqual(['K.I.N.D approved their programme in Milla. Next: the second half (P2).'])
  })

  it('P2 paid, live, paused and resumed are each said', () => {
    expect(vidaChangeLines(base, { ...base, second_at: 't' }, 'A')[0]).toContain('second half (P2) is now in place')
    expect(vidaChangeLines(base, { ...base, went_live_at: 't' }, 'A')[0]).toContain('now live')
    expect(vidaChangeLines(base, { ...base, paused_at: 't' }, 'A')[0]).toContain('paused')
    expect(vidaChangeLines({ ...base, paused_at: 't' }, base, 'A')[0]).toContain('resumed')
  })

  it('any other status move is named; nothing moved → nothing said', () => {
    expect(vidaChangeLines(base, { ...base, status: 'SOURCING' }, 'A')).toEqual(['A\'s programme moved from READY_FOR_APPROVAL to SOURCING.'])
    expect(sameVidaFacts(base, { ...base })).toBe(true)
    expect(vidaChangeLines(base, { ...base }, 'A')).toEqual([])
    expect(vidaFacts(null)).toBeNull()
  })

  it('checks often enough to matter and never hammers the server', () => {
    expect(VIDA_SYNC_MS).toBeGreaterThanOrEqual(10_000)
    expect(VIDA_SYNC_MS).toBeLessThanOrEqual(60_000)
  })
})

describe('🛑 Vida re-reads the open client', () => {
  it('on a timer and on return to the tab, only for the client still selected, and says what moved', () => {
    expect(PAGE).toContain('setInterval(() => { void check() }, VIDA_SYNC_MS)')
    expect(PAGE).toContain("document.addEventListener('visibilitychange', onReturn)")
    expect(PAGE).toContain('if (stopped || selectedRef.current !== clientId || j?.success !== true) return')
    expect(PAGE).toContain('if (!next || next.client_id !== clientId) return')
    expect(PAGE).toContain("for (const line of vidaChangeLines(before, after, name)) syncSay.current('vida', line)")
  })
})
