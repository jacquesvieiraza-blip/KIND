// ⚑ 3 Oct — "Use House's approved emails" timed out in Vida (45 s) while rewriting 234 people one
// after another; the work finished but its count was never seen. The copies are now rewritten many
// at a time, so the answer comes back while Vida is still waiting.
import { describe, it, expect, vi } from 'vitest'
vi.mock('@kind/db', () => ({ db: {} }))
import { readFileSync } from 'fs'
import { join } from 'path'
import { inParallelBatches } from './live-reword'

describe('the per-person rewrite runs many at a time', () => {
  it('🛑 234 slow updates finish in a fraction of the one-by-one time, every one counted', async () => {
    const items = Array.from({ length: 234 }, (_, i) => i)
    const t0 = Date.now()
    const out = await inParallelBatches(items, 25, async (n) => { await new Promise(r => setTimeout(r, 30)); return n * 2 })
    const ms = Date.now() - t0
    expect(out).toEqual(items.map(n => n * 2))   // every one, in order
    expect(ms, `took ${ms} ms — one by one would be ~7000`).toBeLessThan(2000)
  })
  it('the House button uses it', () => {
    const src = readFileSync(join(__dirname, 'live-reword.ts'), 'utf8')
    const fn = src.slice(src.indexOf('export async function applyHouseApprovedEmails'))
    expect(fn).toContain('inParallelBatches(slice, ')
  })
})
