// ⚑ 1 Oct — A PAID OFFER NAMES ONLY WHAT IS BUILT. The 50% Full Coaching offer said "deal strategy",
// but Deal Coach (#2503) is Phase 2 and does not exist. A client paying $100 a meeting must never be
// sold a feature they cannot open. Phase 2/3 names are listed here; add one only when it ships.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '../../../..')
const code = (rel: string) => readFileSync(join(ROOT, rel), 'utf8').split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
const UNBUILT = /deal strategy|deal coach|deal review|team coaching|rep coaching|scorecard|manager view|win\/loss|playbook|call recording|transcri/i
const SELLING = [
  'apps/api/src/lib/expansion-moments.ts',
  'apps/portal/src/components/milla/ExpansionMoment.tsx',
]

describe('🛑 Full Coaching is sold only on what a client can open today', () => {
  for (const f of SELLING) it(`${f} names no unbuilt Coaching feature`, () => {
    expect(code(f)).not.toMatch(UNBUILT)
  })
})
