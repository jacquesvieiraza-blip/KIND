// ═══════════════════════════════════════════════════════════════════════════════════════
// R145 · STEP 7 (24 Sep) — VIDA, AS THE REDESIGN DRAWS IT
//
// Founder: *"match everything. colors everything."* Tracker #41 #42 #43 #44 #45 #55 #63 #64
// #83 #84 #85. Every card is still the copy's own claim — this step changes where and how they
// are drawn, plus three facts that were false or missing (#41 #43 #84) and one contradiction (#44).
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { nextActionCard, operatorRailAt, provenanceCard } from '../../../admin/src/lib/vida-stage-copy'

const read = (rel: string) => readFileSync(join(__dirname, rel), 'utf8')
const code = (rel: string) => read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const PAGE = code('../../../admin/src/app/vida/page.tsx')
const LAYOUT = code('../../../admin/src/app/vida/layout.tsx')
const RIBBON = code('../../../admin/src/components/vida/LifecycleRibbon.tsx')
const PANEL = code('../../../admin/src/components/vida/LifecyclePanel.tsx')
const BRIEF = code('../../../admin/src/components/vida/BriefPanel.tsx')
const OPS = code('../routes/operator.ts')

describe('#55 #85 #45 · the shell: menu | work | Vida on the right, and a ✓ stage bar', () => {
  it('🛑 the Vida chat is the right-hand column, after the work', () => {
    expect(PAGE).toContain('className="mv-vida-chat w-[430px] shrink-0 flex flex-col min-h-0"')
    expect(LAYOUT).toContain('mv-leftnav w-[180px]')
  })

  it('🛑 a finished stage shows ✓, and the bar is drawn during the Brief', () => {
    expect(RIBBON).toContain("<i>{done ? '✓' : i + 1}</i>")
    expect(PAGE).toContain('{!selected && selectedDraft && <LifecycleRibbon stage="signup" />}')
  })
})

describe('#42 #63 · every stage: banner, tiles, checklist, then the one action', () => {
  it('🛑 the banner turns red on the server\'s verdict alone', () => {
    expect(PANEL).toContain("const attn = needsYou === true || cards.some(c => 'tone' in c && c.tone === 'exception')")
    expect(PANEL).toContain("<div className={`mv-attention ${attn ? 'attn' : ''}`}>")
    expect(PAGE).toContain('needsYou={lc?.verdict.needsYou === true}')
  })

  it('🛑 facts are tiles, checklists are timelines — drawn from the copy, never computed', () => {
    expect(PANEL).toContain('<div className="mv-ops-grid">')
    expect(PANEL).toContain('<div className="mv-timeline">')
    for (const forbidden of ['fetch(', 'useEffect', 'status ===']) expect(PANEL).not.toContain(forbidden)
  })
})

describe('#64 · the operator rail in the redesign\'s style, lit from the engine stage', () => {
  it('🛑 the retired strip with a "Paid $299" step is gone', () => {
    expect(PAGE).not.toContain('FLOW_STEPS.map(')
    expect(PAGE).not.toContain('flowStepLabel(')
    expect(PAGE).toContain('rail={{ at: operatorRailAt(lc?.verdict.stage) }}')
    expect(BRIEF).toContain('rail={{ at: null }}')
    expect(PANEL).toContain('<div className="mv-rail-flow">')
  })

  it('🛑 only what the stage says is lit — nothing before our work starts', () => {
    expect(operatorRailAt('signup')).toBeNull()
    expect(operatorRailAt('proof')).toBeNull()
    expect(operatorRailAt('recommendation')).toBeNull()
    expect(operatorRailAt('sourcing')).toBe('Inbox + people')
    expect(operatorRailAt('approval')).toBe('Sequence')
    expect(operatorRailAt('live')).toBe('Run')
    expect(operatorRailAt('completion')).toBe('Live')
    expect(operatorRailAt(null)).toBeNull()
  })
})

describe('#41 #43 #44 #84 · four facts on the panel, made true', () => {
  it('🛑 #44 · Proof does not say "confirmed" beside "Client: Reviewing"', () => {
    const t = JSON.stringify(nextActionCard('proof', { needsYou: false }))
    expect(t).toContain('Proof with the client')
    expect(t).not.toContain('confirmed')
  })

  it('🛑 #84 · the owned-records count is the server\'s, and a failed count prints nothing', () => {
    expect(OPS).toContain("from_pool: poolErr ? null : (fromPool ?? null),")
    expect(PAGE).toContain('fromPool: lcCapacity.from_pool ?? null,')
    const base = { matched: 10, excluded: 0, alreadyWorked: 0, setAside: 0, workable: 10, committed: 1 }
    expect(JSON.stringify(provenanceCard({ ...base, fromPool: 7 }))).toContain('7 already ours')
    expect(JSON.stringify(provenanceCard({ ...base, fromPool: null }))).not.toContain('already ours')
  })

  it('🛑 #43 · the provider panel shows the industry that is actually sent', () => {
    expect(OPS).toContain("industries: list('industries')")
    expect(OPS).toContain('q_organization_keyword_tags')
  })

  it('🛑 #41 · a draft cannot have been spent on, so Spend is never "could not be read"', () => {
    expect(BRIEF).toContain('spendUsd: facts ? facts.spend.usd : 0,')
    // …and a client row, which never reads spend, does not claim the read failed.
    expect(PAGE).toContain(".filter(c => !c.text.startsWith('Brief') && !c.text.startsWith('Spend'))")
  })

  it('🛑 #83 · the Run label says what Send once does, and that it is not Run', () => {
    expect(PAGE).toContain('It is not Run — Run grants the authority and sends nothing itself.')
  })
})
