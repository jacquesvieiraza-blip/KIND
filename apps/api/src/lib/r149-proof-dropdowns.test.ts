// ═══════════════════════════════════════════════════════════════════════════════════════
// R149 (24 Sep) — THE PROOF SCREEN HAS THE BRIEF'S DROP-DOWNS FOR INDUSTRY AND SENIORITY
//
// Founder, asked whether the client may change them on Proof itself: *"Yes, drop-downs"*.
// ⚠️ ONE SPEND BOUNDARY. Ticking writes nothing; the drop-downs build the same `refineFinal`
// the chat refinement builds, and the existing confirm (`confirmRefine`) is still the only write.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const code = (rel: string) => readFileSync(join(__dirname, rel), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const HOME = code('../../../portal/src/app/(milla)/milla/page.tsx')
const WELCOME = code('../../../portal/src/app/(milla)/milla/welcome/page.tsx')

describe('R149 · drop-downs on Proof', () => {
  it('🛑 the Proof panel carries Industry and Seniority as the Brief\'s own FilterRow', () => {
    expect(HOME).toContain("import { FilterRow } from '@/components/milla/FilterRow'")
    expect(WELCOME).toContain("import { FilterRow } from '@/components/milla/FilterRow'")
    expect(HOME).toContain('<FilterRow label="Industry" options={[...APOLLO_INDUSTRIES]} free={false}')
    expect(HOME).toContain('<FilterRow label="Seniority" options={[...APOLLO_SENIORITY_LABELS]} free={false}')
    const panel = HOME.slice(HOME.indexOf('const proofPanel = ('))
    expect(panel.indexOf('<b>Your targeting</b>')).toBeGreaterThan(-1)
  })

  it('🛑 ticking writes nothing — it opens the SAME confirmation the chat uses', () => {
    const fn = HOME.slice(HOME.indexOf('function reviewPicks()'), HOME.indexOf('async function submitRefine('))
    expect(fn).not.toMatch(/api\.(post|put|patch)|fetch\(/)
    expect(fn).toContain('setRefineFinal(final); setRefineIcpId(proofIcp.id)')
    // every other field is the value already saved, and consent travels unchanged
    expect(fn).toContain('for (const [k] of REFINE_FIELDS) final[k] = proofIcp[k] ?? []')
    expect(fn).toContain('apollo_only_consented: proofIcp.apollo_only_consented,')
  })

  it('🛑 only while a refinement is allowed, and only once something changed', () => {
    expect(HOME).toContain('{canRefine && proofIcp && pickDraft && (() => {')
    expect(HOME).toContain('disabled={!changed || refineBusy || proofAttempted}')
  })

  it('🛑 the confirm no longer promises a "last" set (22 Sep, "2. unlimited now.")', () => {
    expect(HOME).not.toMatch(/last free set/)
  })
})
