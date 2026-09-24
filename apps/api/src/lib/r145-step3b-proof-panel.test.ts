// ═══════════════════════════════════════════════════════════════════════════════════════
// R145 · STEP 3b (24 Sep) — THE PROOF PANEL, AS THE REDESIGN DRAWS IT
//
// Founder, verbatim: *"i dont have time to sit here and go thru looks right"* · *"when it
// presents leads to a client i want a little note saying pooled from pool or apollo"* ·
// *"no name. full company."* (D9) · R143: Proof closes with one question and one button,
// "These are my people".
//
// Tracker rows #14 #15 #16 #17 #18 #19 #20 #25 #26 #58 #74 #82.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const read = (rel: string) => readFileSync(join(__dirname, rel), 'utf8')
/** Comments out, so an explanation can never satisfy a guard about code. */
const code = (rel: string) => read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const HOME = code('../../../portal/src/app/(milla)/milla/page.tsx')
const CAL = code('../../../portal/src/components/milla/ProofCalibration.tsx')
const CHAT = code('../../../portal/src/components/milla/MillaConversation.tsx')
const LEADS = code('../routes/leads.ts')
const panel = HOME.slice(HOME.indexOf('const proofPanel = ('), HOME.indexOf('  return (\n    <div className="h-full flex flex-col overflow-hidden">'))

describe('#14 #15 #58 · one hero, no duplicate tile rows', () => {
  it('🛑 the Proof desk is its own panel, drawn without the four KPI tiles above it', () => {
    expect(HOME).toContain('{showProofDesk ? proofPanel : (')
    expect(panel).not.toContain('<KPI')
    expect(panel).toContain('<div className="mv-hero-card">')
    expect(panel).toContain('booked meetings we can commit to at this targeting')
    expect(panel).toContain('workable people')
  })

  it('the Programme side is untouched by the Proof panel', () => {
    expect(HOME).toContain('<ProgrammeScreen />')
  })
})

describe('#19 #16 #17 · one featured person to teach Milla, the rest a sample — companies, not people', () => {
  it('🛑 the reaction controls exist ONCE, on the featured person — not on every card', () => {
    expect(panel.match(/👍 Looks right/g) ?? []).toHaveLength(1)
    expect(panel.match(/>Not a fit<\/button>/g) ?? []).toHaveLength(1)
    expect(panel).toContain('<b>Teach Milla what good looks like</b>')
    // Any sample row can be featured instead — a tap, not a button per card.
    expect(panel).toContain('onClick={() => setFeaturedId(l.id)}')
  })

  it('🛑 D9 — the company in full, and no person\'s name anywhere on the card', () => {
    expect(panel).toContain('<b>{l.company}</b>')
    expect(panel).not.toMatch(/first_name|last_name/)
    const masked = LEADS.slice(LEADS.indexOf('const masked ='), LEADS.indexOf('res.json({ success: true, data: masked })'))
    expect(masked).not.toMatch(/\bfirst_name:|\blast_name:/)
  })
})

describe('#18 · D8 · each person says where they came from', () => {
  it('🛑 the server says pool or Apollo, from the row\'s own acquisition stamp', () => {
    expect(LEADS).toContain("from: (l.source === 'apollo' || (typeof l.apollo_id === 'string' && l.apollo_id !== '' && !l.apollo_id.startsWith('pdl_')))")
    expect(LEADS).toContain("? 'apollo' : l.source ? 'provider' : 'pool',")
  })

  it('🛑 and the card prints it, on the featured person and every sample row', () => {
    expect(HOME).toContain("const FROM_LABEL: Record<string, string> = { apollo: 'From Apollo', pool: 'From our pool'")
    expect(panel.match(/FROM_LABEL\[l\.from\]/g) ?? []).toHaveLength(2)
  })
})

describe('#20 #74 · R143 · one question, "These are my people", and "Show another sample"', () => {
  it('🛑 the closing row carries the founder\'s words', () => {
    expect(CAL).toContain('These are my people')
    expect(CAL).toContain('Show another sample')
    expect(CAL).not.toContain('>\n        These are right\n')
    expect(CAL).not.toContain('Show me stronger examples')
  })

  it('🛑 and the same server verdict still decides which exist', () => {
    expect(CAL).toContain('{state.showStronger && (')
    expect(CAL).toContain('disabled={busy || !state.strongerEnabled}')
  })
})

describe('#82 · no route back to a sealed Brief', () => {
  it('🛑 the desk no longer links to the Brief, which sends a Proof client straight back', () => {
    expect(HOME).not.toContain('href="/milla/welcome"')
    expect(HOME).not.toContain('Open my Brief')
  })
})

describe('#25 #26 · Milla opens Proof in the one chat, and the chips act like the buttons', () => {
  it('🛑 Milla says how many match and that these are a sample — once per set', () => {
    expect(HOME).toContain('announceOnceRef.current(`proof-intro-${introBatch}`, [')
    expect(HOME).toContain('people who match what you told me. Here are ${n} of them.')
    expect(CHAT).toContain('if (announcedKeys.current.has(key)) return')
  })

  it('🛑 the redesign\'s chips, and the two that act run the panel\'s own handlers', () => {
    expect(CHAT).toContain("const CHIP_ANOTHER = 'Show me another twenty'")
    expect(CHAT).toContain("const CHIP_WIDEN = 'What if I add Germany?'")
    expect(CHAT).toContain("const CHIP_ACCEPT = 'These are right'")
    expect(CHAT).toContain('if (c === CHIP_ANOTHER && deskActions?.anotherSample) { deskActions.anotherSample(); return }')
    expect(CHAT).toContain('if (c === CHIP_ACCEPT && deskActions?.accept) { deskActions.accept(); return }')
  })

  it('🛑 a chip is offered only while the server offers the action (C06 — no ungated "more")', () => {
    expect(HOME).toContain('calib.showStronger && calib.strongerEnabled && pending.length > 0')
    expect(CHAT).toContain('proofSetOnDesk && deskActions?.anotherSample ? [CHIP_ANOTHER] : []')
  })
})

describe('two defects found while building this — both live on main today', () => {
  it('🛑 the Proof controls load WITH the desk, not only after a "Not a fit"', () => {
    // Founder: *"i clicked looks right to all and nothing happened after this."* Nothing read the
    // calibration on mount, so the closing button and the capacity only appeared after a dislike.
    expect(HOME).toMatch(/useEffect\(\(\) => \{\n\s+if \(proofMode\) void loadCalibration\(\)\n\s+\}, \[proofMode, leads\?\.length, loadCalibration\]\)/)
  })

  it('🛑 only the newest thread read may write — Milla does not greet twice', () => {
    expect(CHAT).toContain('const gen = ++restoreGen.current')
    expect((CHAT.match(/if \(stale\(\)\) return/g) ?? []).length).toBeGreaterThanOrEqual(5)
  })
})
