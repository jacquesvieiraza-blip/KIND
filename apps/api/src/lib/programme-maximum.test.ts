// ═══════════════════════════════════════════════════════════════════════════════════════
// 25 Sep (R168 ③ · P3·max, board #2349) — THE LARGEST PROGRAMME A CLIENT CAN BUY: 50 MEETINGS.
//
// Founder: "A we start here". Above 50 the client is told to talk to us. New terms only —
// House and programmes on the R81 curve keep today's control exactly.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { MAX_PROGRAMME_MEETINGS, OVER_PROGRAMME_MAXIMUM, overProgrammeMaximum } from '@kind/shared'

describe('the rule', () => {
  it('50 at most on a size band; the sentence says the number and "talk to us"', () => {
    expect(MAX_PROGRAMME_MEETINGS).toBe(50)
    expect(OVER_PROGRAMME_MAXIMUM).toContain('50 qualified meetings is the most one programme takes on')
    expect(OVER_PROGRAMME_MAXIMUM).toMatch(/talk to us/)
    for (const band of ['founders', 'growth', 'enterprise'] as const) {
      expect(overProgrammeMaximum(50, band)).toBeNull()
      expect(overProgrammeMaximum(51, band)).toBe(OVER_PROGRAMME_MAXIMUM)
      expect(overProgrammeMaximum(500, band)).toBe(OVER_PROGRAMME_MAXIMUM)
    }
  })

  it('⛓️ no band (House, the curve) is untouched', () => {
    expect(overProgrammeMaximum(120, null)).toBeNull()
    expect(overProgrammeMaximum(120, undefined)).toBeNull()
  })
})

// ── THE CLIENT'S DOOR, driven for real ─────────────────────────────────────────────────
const state = vi.hoisted(() => ({ terms: { kind: 'band', band: 'growth' } as Record<string, unknown>, writes: [] as string[] }))
vi.mock('./client-size', () => ({ pricingTermsFor: async () => state.terms }))
vi.mock('@kind/db', () => {
  const q: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'in', 'order', 'limit', 'like', 'not', 'neq', 'gte', 'lte', 'or']) q[m] = () => q
  q.then = (r: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(r)
  q.maybeSingle = async () => ({ data: { proof_completed_at: '2026-09-20T00:00:00Z' }, error: null })
  q.single = q.maybeSingle
  q.insert = () => { state.writes.push('insert'); return q }
  q.update = () => { state.writes.push('update'); return q }
  return { db: { from: () => q, rpc: async () => ({ data: null, error: null }) } }
})

import { chooseProgramme } from './client-programme-choice'

describe('🛑 choosing a programme above 50 on the new terms is refused, and nothing is written', () => {
  beforeEach(() => { state.writes = []; state.terms = { kind: 'band', band: 'growth' } })

  it('51 meetings → over_maximum, with the sentence', async () => {
    const r = await chooseProgramme('c1', { meetings: 51 } as never)
    expect(r).toMatchObject({ ok: false, reason: 'over_maximum', detail: OVER_PROGRAMME_MAXIMUM })
    expect(state.writes).toEqual([])
  })

  it('⛓️ a House / curve client is not stopped by it', async () => {
    state.terms = { kind: 'curve' }
    // It goes on past the maximum into the rest of the choice (whose stand-ins here are thin, so
    // it may stop later for its own reasons) — what matters is that it is never the maximum.
    const r = await chooseProgramme('c1', { meetings: 51 } as never).catch(() => ({ ok: false, reason: 'went_past_the_maximum' }))
    expect((r as { reason?: string }).reason).not.toBe('over_maximum')
  })
})

describe('the other doors', () => {
  const read = (p: string) => readFileSync(join(__dirname, p), 'utf8')

  it('createProgramme (Vida\'s create too) refuses above 50 on a band, before the quote', () => {
    const src = read('programme.ts')
    const fn = src.slice(src.indexOf('export async function createProgramme('))
    const at = fn.indexOf('const overMax = overProgrammeMaximum(meetings, band)')
    expect(at).toBeGreaterThan(-1)
    expect(fn.indexOf('if (overMax) return { ok: false, reason: overMax }')).toBeGreaterThan(at)
    expect(at).toBeLessThan(fn.indexOf('quoteProgramme(meetings, band)'))
  })

  it('the calculator route answers 409 over_maximum and tells the slider where to stop', () => {
    const src = read('../routes/my-programme.ts')
    const body = src.slice(src.indexOf("myProgrammeRouter.get('/calculator'"))
    expect(body).toContain("code: 'over_maximum'")
    expect(body).toContain('max_meetings: bandForMax ? MAX_PROGRAMME_MEETINGS : null')
    expect(src).toContain("r.reason === 'over_maximum' ? 409 : 503")
  })

  it('Milla\'s slider stops at the lower of the pool and the maximum, and says "talk to us" there', () => {
    const src = read('../../../portal/src/components/milla/ProgrammeCalculator.tsx')
    expect(src).toContain('max={top ?? 50}')
    expect(src).toContain('Math.min(top ?? Number.MAX_SAFE_INTEGER')
    expect(src).toContain('{atMaximum && !noCapacity && maxNote && <p className="mt-2">{maxNote}</p>}')
  })
})
