// ═══════════════════════════════════════════════════════════════════════════════════════
// R145 · STEP 6 (24 Sep) — RESULTS AND COMPLETE, AS THE REDESIGN DRAWS THEM
//
// Tracker #37 #38 #39 #61 #62 #80 #81 · D5 (target + qualified) · D6 (no never-contacted count).
// #79 ("Approve the draft reply") is NOT built — nothing drafts replies for a client, and a click
// that sends outreach is the founder's decision. This file pins that it is absent.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const read = (rel: string) => readFileSync(join(__dirname, rel), 'utf8')
const code = (rel: string) => read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const OUT = code('../../../portal/src/components/milla/ProgrammeOutcome.tsx')
const PAGE = code('../../../portal/src/app/(milla)/milla/programme/page.tsx')
const WS = code('../../../portal/src/components/milla/ProgrammeWorkspace.tsx')
const CHAT = code('../../../portal/src/components/milla/MillaConversation.tsx')

describe('#37 #61 · Results: meetings against target, emails, replies', () => {
  it('🛑 the hero is the programme\'s own meeting count against its target', () => {
    expect(OUT).toContain('const achieved = p.progress.outcomesAchieved')
    expect(OUT).toContain("{achieved === null ? '—' : achieved}{target ? ` / ${target}` : ''}")
    expect(OUT).toContain('qualified meetings booked — against your target')
  })

  it('🛑 a number we could not read is a dash, never a zero', () => {
    expect(OUT).toContain("{sent === null ? '—' : sent.toLocaleString('en-US')} emails sent")
    expect(OUT).toContain("replies === null ? 'replies — not available right now'")
  })

  it('🛑 the reply list reads the recorded classification, in plain words', () => {
    expect(OUT).toContain("case 'hot':")
    expect(OUT).toContain("case 'out_of_office':")
  })

  it('🛑 the page draws Results while it runs and Complete when it ends', () => {
    expect(PAGE).toContain("(p.stage === 'Live' || p.stage === 'Review' || p.stage === 'Completion') ? (")
    expect(PAGE).toContain('<ProgrammeOutcome p={p} summary={summary}')
  })
})

describe('#38 #80 · the "ask Milla" buttons work, and "Pause sending" is a request', () => {
  it('🛑 no link to the `?ask=` nothing read; the buttons ask in the one chat', () => {
    expect(WS).not.toContain('/milla?ask=')
    expect(WS).toContain('onClick={() => ask(p.quickAction)}')
    expect(CHAT).toContain('sendRef.current = (t: string) => { void send(t) }')
  })

  it('🛑 "Pause sending" asks us — nothing here stops a send by itself', () => {
    expect(OUT).toContain("onClick={() => ask('Please pause my programme')}>Pause sending</button>")
    expect(OUT).not.toMatch(/api\.post|fetch\(/)
  })
})

describe('#39 #62 #81 · Complete: delivered, what next, and a next programme can start', () => {
  it('🛑 Complete says delivered N / target and that nothing restarts on its own', () => {
    expect(OUT).toContain('qualified meetings delivered')
    expect(OUT).toContain('Nothing restarts automatically.')
  })

  it('🛑 the next programme: Milla, a price on this screen, and the report', () => {
    expect(OUT).toContain('Talk to Milla about the next programme')
    expect(PAGE).toContain("p.stage === 'Completion' && pricingNext ? (")
    expect(OUT).toContain('href="/milla/reports"')
    expect(CHAT).toContain("prog.stage === 'Completion' ? ['Price twenty meetings'] : []")
  })

  it('🛑 D6 · no never-contacted count, and D5 · no "commitment" wording', () => {
    expect(OUT).not.toMatch(/never contacted|never got contacted/i)
    expect(OUT).not.toMatch(/the commitment/i)
    expect(OUT).not.toMatch(/\b400\b/)
  })

  it('🛑 #79 is not built: no draft-approval control reaches the client', () => {
    expect(OUT).not.toMatch(/draft reply/i)
  })
})
