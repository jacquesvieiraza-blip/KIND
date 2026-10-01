// ⚑ 1 Oct (Coaching F6 · #2486) — the client's sales context: kept beside the offer, never over it,
// and a result reaches a prompt only with the client's permission.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = vi.hoisted(() => ({ pitch: {} as Record<string, unknown>, upserts: [] as Array<Record<string, unknown>> }))
vi.mock('@kind/db', () => ({
  db: {
    from: () => {
      const q: Record<string, unknown> = {
        select() { return q }, eq() { return q },
        async maybeSingle() { return { data: { data: state.pitch }, error: null } },
        upsert(row: Record<string, unknown>) { state.upserts.push(row); return Promise.resolve({ error: null }) },
      }
      return q
    },
  },
}))
import { cleanSalesContext, saveSalesContext, salesContextLines, salesContextFrom } from './sales-context'

beforeEach(() => { state.pitch = {}; state.upserts = [] })

describe('F6 — your sales context', () => {
  it('🛑 saving keeps the offer answers and the Brief\'s pitch fields exactly as they were', async () => {
    state.pitch = { product: 'FieldOps', offer: { problems: 'spreadsheets', answered_at: 'x' } }
    await saveSalesContext('c-1', { objections: 'too busy', lead_proof: '', decider: 'COO', won_deal: '' })
    const data = state.upserts[0].data as Record<string, unknown>
    expect(data.product).toBe('FieldOps')
    expect(data.offer).toEqual({ problems: 'spreadsheets', answered_at: 'x' })
    expect(data.sales_context).toMatchObject({ objections: 'too busy', decider: 'COO', source: 'milla_coaching' })
  })

  it('nothing to save when every answer is empty; long answers are cut to the limit', () => {
    expect(cleanSalesContext({ objections: '  ', decider: '' })).toBeNull()
    expect(cleanSalesContext({ won_deal: 'x'.repeat(900) })?.won_deal).toHaveLength(600)
  })

  it('🛑 a result reaches the prep prompt ONLY when the client ticked "you may mention this"', () => {
    const base = { offer: { problems: 'p', solution: 's', roi: '60% faster' }, sales_context: { objections: 'o', lead_proof: 'lp', decider: '', won_deal: '' } }
    expect(salesContextLines({ ...base, offer: { ...base.offer, roi_may_quote: false } }).join(' ')).not.toContain('60% faster')
    expect(salesContextLines({ ...base, offer: { ...base.offer, roi_may_quote: true } }).join(' ')).toContain('60% faster')
    expect(salesContextLines(base)).toEqual(expect.arrayContaining([
      'Objections the seller usually hears, and their answers: o', 'Proof the seller leads with: lp',
    ]))
  })

  it('an empty pitch reads as four empty answers, never a crash', () => {
    expect(salesContextFrom(null)).toEqual({ objections: '', lead_proof: '', decider: '', won_deal: '', answeredAt: null })
    expect(salesContextLines(undefined)).toEqual([])
  })
})
