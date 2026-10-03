// 9b (#2560) — A BRANDED MAILBOX THAT IS STILL WARMING NO LONGER BLOCKS THE POOLED CLAIM.
//
// A warming box never sends (R183), and warming takes 2–3 weeks, so the client waited that long
// before anything could be approved.

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

vi.mock('@kind/db', () => ({ db: {} }))
vi.mock('./inbox-secret', () => ({ encryptSecret: (s: string) => s }))

import { blocksPooledClaim } from './sender-claim'

describe('9b — what counts as already having a sender', () => {
  it('a warming branded box does not; an active branded box does; any live pooled box does', () => {
    expect(blocksPooledClaim({ kind: 'branded', status: 'warming' })).toBe(false)
    expect(blocksPooledClaim({ kind: 'branded', status: 'assigned' })).toBe(false)
    expect(blocksPooledClaim({ kind: 'branded', status: 'active' })).toBe(true)
    expect(blocksPooledClaim({ kind: 'pooled', status: 'assigned' })).toBe(true)
  })
  it('the claim asks it, rather than taking the first live row', () => {
    const src = readFileSync(join(__dirname, 'sender-claim.ts'), 'utf8')
    expect(src).toContain('.find(r => blocksPooledClaim(r)) ?? null')
    expect(src).not.toMatch(/\.in\('status', LIVE_CLAIM_STATUSES as unknown as string\[\]\)\s*\.limit\(1\)\.maybeSingle\(\)/)
  })
})
