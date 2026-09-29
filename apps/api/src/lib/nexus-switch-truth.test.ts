// ⚑ 29 Sep (R174 ② · PR 1g) — THE NEXUS AUTO-TUNE SWITCH SAYS WHAT IT REALLY DOES, AND ASKS.
// It said "Nothing tunes until Phase 2 ships". The code says otherwise: once on and past the
// confidence gate, new emails and new scoring change. The sentence is pinned to the two code
// paths that make it true — if either stops reading the switch, this goes red, not stale.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
const PAGE = read('apps/admin/src/app/vida/nexus/page.tsx')

describe('the switch tells the truth', () => {
  it('the false "nothing tunes" line is gone', () => {
    expect(PAGE).not.toContain('Nothing tunes until Phase 2 ships')
  })
  it('it says new emails and new scoring change, and sent emails do not', () => {
    expect(PAGE).toContain("changes how this client\\'s new emails are written and how new people are scored")
    expect(PAGE).toContain('Emails already sent are not changed.')
  })
  it('…which is what the code does: new emails (figsy) and new scoring (scoring) read the switch', () => {
    const figsy = read('apps/api/src/lib/figsy.ts')
    const scoring = read('apps/api/src/lib/scoring.ts')
    expect(figsy).toContain("nexusTuneGate(prof, tuneFlag?.nexus_autotune_enabled === true, nexusGlobalKill())")
    expect(figsy).toContain('memoryContext += `\\nNexus')
    expect(scoring).toContain("nexusTuneGate(prof, flag?.nexus_autotune_enabled === true, nexusGlobalKill())")
    expect(scoring).toContain('nexusBoost = `')
  })
})

describe('turning it on is asked, not clicked', () => {
  it('Enable asks first, before the request is sent', () => {
    const start = PAGE.indexOf('async function toggleAutotune(')
    const ask = PAGE.indexOf('if (enabled && !window.confirm(AUTOTUNE_CONFIRM)) return', start)
    const send = PAGE.indexOf("fetch('/api/proxy/operator/nexus/autotune'", start)
    expect(ask).toBeGreaterThan(start)
    expect(ask).toBeLessThan(send)
  })
})
