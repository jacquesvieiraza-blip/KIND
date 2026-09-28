// R164 · a demo account is never served a real person — not from a provider, not from the pool.
//
// The Northwind walk found the gap: #453 made demo sourcing "pool-only", and the pool is REAL
// people. "Show another sample", "Find a new sample with these" or asking Milla to widen the
// targeting would put real strangers' names on a sales call. A demo's people are its fixed cast.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const src = readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')
  .split('\n').filter(l => !l.trim().startsWith('//')).join('\n')

describe('R164 · demo accounts never source', () => {
  it('the pool serves a demo nobody (cap 0), and only a demo', () => {
    expect(src).toMatch(/await servePoolLeads\(icp, clientId, isDemo \? 0 : runCap, /)
    expect(src.match(/await servePoolLeads\(/g)?.length).toBe(1)
  })
  it('the provider remainder is still skipped for a demo (no spend, no search)', () => {
    const at = src.indexOf('if (isDemo) {')
    expect(at).toBeGreaterThan(-1)
    expect(src.slice(at, at + 1200)).toMatch(/\} else if \(cursor\.exhausted\)/)
  })
  it('the demo sentence the client reads says no new people are found — never that they came from "people we already have"', () => {
    expect(src).not.toContain('these examples came from people we already have')
    expect(src).toContain("relaxed = 'This is a demo account, so no new people are found")
  })
})
