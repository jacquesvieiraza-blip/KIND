// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 23 Sep (R136 ③ · MVP1 Stage 5) — THE SOURCING CEILING NEVER REACHES A CLIENT
//
// Founder, verbatim: *"i said 400 internally. we dont disclose this."* Since R136 a programme's
// `sourcing_ceiling` IS `meetings × 400` — so any client surface that shows the ceiling next to
// the meeting target discloses the limit with one division.
//
// 🛑 WHAT WAS LIVE: `/my/programme` sent `progress.authorised = sourcing_ceiling`, and SIX client
// screens rendered it ("People sourced of 4,000 authorised", two progress bars with it as their
// maximum, and a terminal "N unused" figure derived from it by subtraction) — while Milla's own
// prompt carried "X of Y people authorised" for her to read aloud.
//
// So the number is not on the client wire at all now, and this file keeps it that way:
//   ① the client payload type has no numeric ceiling field, and the builder sends a boolean;
//   ② no Milla page or component reads `progress.authorised`;
//   ③ Milla's prompt builder never names the ceiling, and a real prompt carries no "of N";
//   ④ no client screen draws meetings against people sourced — that ratio IS the rate.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describeProgramme } from './milla-chat-system'
import type { CustomerProgramme } from './customer-programme'

const REPO = join(__dirname, '../../../..')
const code = (p: string) => readFileSync(join(REPO, p), 'utf8').split('\n')
  .filter(l => { const t = l.trim(); return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('{/*')) })
  .join('\n')

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n)) out.push(p)
  }
  return out
}
const MILLA_FILES = [
  ...walk(join(REPO, 'apps/portal/src/app/(milla)')),
  ...walk(join(REPO, 'apps/portal/src/components/milla')),
].map(f => relative(REPO, f))

describe('the sourcing ceiling never reaches a client (R136 ③)', () => {
  it('🛑 ① the client payload carries a yes/no, never the ceiling', () => {
    const cp = code('apps/api/src/lib/customer-programme.ts')
    const type = cp.slice(cp.indexOf('progress: {'), cp.indexOf('}', cp.indexOf('progress: {')))
    expect(type).toContain('sourcingAuthorised: boolean')
    expect(type, 'a numeric ceiling is back on the client type').not.toMatch(/authorised:\s*number/)
    // Every read of the column is the `> 0` boolean, and nothing else.
    // The value reads — `p.sourcing_ceiling` — not the column list in the select string.
    const reads = [...cp.matchAll(/p\.sourcing_ceiling[^\n]*/g)].map(m => m[0])
    expect(reads.length, 'the builder no longer reads the column at all — vacuous').toBeGreaterThan(0)
    for (const r of reads) expect(r, `the ceiling is sent as a value: ${r}`).toMatch(/sourcing_ceiling \?\? 0\) > 0/)
  })

  it('🛑 ② no Milla page or component reads `progress.authorised`', () => {
    expect(MILLA_FILES.length, 'the Milla surface was not found — vacuous').toBeGreaterThan(10)
    const readers = MILLA_FILES.filter(f => /progress\??\.authorised\b/.test(code(f)))
    expect(readers).toEqual([])
    const labels = MILLA_FILES.filter(f => /People sourced of|of authorised/.test(code(f)))
    expect(labels, 'an "of N authorised" label is back on a client screen').toEqual([])
  })

  it('🛑 ③ Milla\'s prompt never names the ceiling — in source, or in a real prompt', () => {
    const src = code('apps/api/src/lib/milla-chat-system.ts')
    expect(src).not.toMatch(/sourcing_ceiling|progress\.authorised/)
    const prog = {
      stage: 'Live', quickAction: 'x', paused: false, pausedCopy: null, reviewOpen: false,
      outcome: { kind: 'meetings', target: 10 },
      progress: { delivered: 1234, sourcingAuthorised: true, outcomesAchieved: 3 },
      money: { totalCents: 500_000, firstPaidAt: 'a', secondPaidAt: null },
      approvedAt: null, wentLiveAt: 'w',
    } as unknown as CustomerProgramme
    const block = describeProgramme(prog)
    const line = block.split('\n').find(l => l.startsWith('- Sourcing:')) ?? ''
    expect(line).toContain('1234')
    // The only number on the sourcing line is the count itself.
    expect(line.match(/\d[\d,]*/g)).toEqual(['1234'])
    expect(block).not.toContain('4000')
    expect(block).not.toContain('400')
  })

  it('🛑 ④ no client screen draws meetings against people sourced — that ratio is the rate', () => {
    for (const f of MILLA_FILES) {
      const c = code(f)
      expect(c, `${f} draws meetings over people sourced`)
        .not.toMatch(/value=\{p\.progress\.outcomesAchieved\}\s*max=\{p\.progress\.delivered\}/)
    }
  })
})
