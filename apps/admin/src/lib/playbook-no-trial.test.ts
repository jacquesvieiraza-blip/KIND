// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ #706 — THE AE PLAYBOOK IN VIDA NEVER SCRIPTS A TRIAL, AND NEVER TYPES A PRICE.
//
// Trials were retired: R124 (16 Sep) by decision and R137 (23 Sep) in the code — every
// account is on the programme. The playbook kept scripting a "14-day trial" to prospects
// after it no longer existed. What comes before any payment now is the client's Brief and a
// free Proof (R138); the programme is paid 50/50 per QUALIFIED meeting on the R81 curve
// (R141 · R74).
//
// House rule: money sentences are interpolated, never typed. Any price the playbook shows
// must come from `@kind/shared`, so a typed "$4…" (the $450/$437.50/$400 curve, or the
// retired $4 per lead) or the retired "$299" pack is a regression.
//
// ⚠️ RELATIVE PATHS, DELIBERATELY — `check.sh` runs vitest from the repository root.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const PAGE = join(__dirname, '../app/playbook/page.tsx')
const src = () => readFileSync(PAGE, 'utf8')

describe('#706 — Vida AE playbook: no trial, no typed price', () => {
  it('never mentions a trial (case-insensitive)', () => {
    const hits = src().split('\n').map((l, i) => [i + 1, l] as const).filter(([, l]) => /trial/i.test(l))
    expect(hits).toEqual([])
  })

  it('never types a "$4…" or "$299" price — prices come from @kind/shared', () => {
    const s = src()
    expect(s).not.toMatch(/\$4/)
    expect(s).not.toMatch(/\$299/)
  })

  it('reads its programme prices from the shared curve', () => {
    const s = src()
    expect(s).toMatch(/from '@kind\/shared'/)
    expect(s).toContain('PROGRAMME_ANCHOR_1_USD')
    expect(s).toContain('PROGRAMME_FLOOR_USD')
  })
})
