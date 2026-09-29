// ⚑ 29 Sep (R174 · PR 5i) — THE GTM FUNNEL IS BRIEF → PROOF → PAID → APPROVAL → RESULTS → COMPLETE.
//   · a cohort: each client counts at every stage up to the furthest reached, so each stage is a
//     subset of the one before and no conversion passes 100%;
//   · the demo and House are left out; subscriptions are no longer read.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { programmeFunnel, FUNNEL_STAGES } from '../../../admin/src/lib/programme-funnel'

const p = (client_id: string, over: Record<string, unknown> = {}) =>
  ({ client_id, status: 'SOURCING', first_paid_at: null, approved_at: null, went_live_at: null, run_at: null, ...over })

describe('the programme funnel', () => {
  it('counts each client at every stage up to the furthest they reached', () => {
    const out = programmeFunnel({
      clientIds: ['a', 'b', 'c', 'd', 'e', 'f', 'nw', 'h'],
      proofClientIds: new Set(['b', 'c', 'd', 'e', 'f', 'nw']),
      programmes: [
        p('c', { first_paid_at: 't' }),                                            // paid
        p('d', { first_paid_at: 't', approved_at: 't' }),                          // approved
        p('e', { first_paid_at: 't', approved_at: 't', went_live_at: 't' }),       // results
        p('f', { status: 'COMPLETED', first_paid_at: 't', approved_at: 't', went_live_at: 't' }),
        p('nw', { status: 'COMPLETED' }), p('h', { first_paid_at: 't' }),          // demo, House
      ],
      excluded: new Set(['nw', 'h']),
    })
    expect(out.map(s => s.stage)).toEqual([...FUNNEL_STAGES])
    expect(out.map(s => s.count)).toEqual([6, 5, 4, 3, 2, 1])
  })
  it('never lets a later stage exceed an earlier one', () => {
    const out = programmeFunnel({
      clientIds: ['x', 'y'], proofClientIds: new Set(),          // paid without a recorded Proof
      programmes: [p('x', { status: 'COMPLETED' }), p('y', { first_paid_at: 't' })], excluded: new Set(),
    })
    const counts = out.map(s => s.count)
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeLessThanOrEqual(counts[i - 1])
  })
})

describe('the GTM page reads it', () => {
  it('no subscriptions, and the six stages with their notes', () => {
    const page = readFileSync(join(process.cwd(), 'apps/admin/src/app/gtm/page.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    expect(page).not.toContain("from('subscriptions')")
    expect(page).not.toContain('Started trial')
    expect(page).toContain('const stages = programmeFunnel({')
    expect(page).toContain('excluded: exclusions.excludedClientIds,')
  })
})
