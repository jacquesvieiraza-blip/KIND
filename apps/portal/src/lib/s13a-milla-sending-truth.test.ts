// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 2 Oct (R187 ② · R185 ① · card #2551 · sending fix #13a) — MILLA TELLS THE TRUTH ABOUT SENDING.
//
// ① On a LIVE programme Milla still showed "Approved — nothing is sent until the programme goes
//   Live", right under "20 emails sent". The approved card now goes once the programme is live.
// ② Milla offered a "Change the sending window" chip. R185 ① (2 Oct) retired the window —
//   *"we need to send no matter the time of day or zone"* — so there is nothing to change.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const strip = (s: string) => s.split('\n').filter(l => !/^\s*(\/\/|\/\*|\*|\{\/\*)/.test(l)).join('\n')
const PAGE = strip(readFileSync(join(__dirname, '../app/(milla)/milla/programme/page.tsx'), 'utf8'))
const CHAT = strip(readFileSync(join(__dirname, '../components/milla/MillaConversation.tsx'), 'utf8'))

describe('#2551 ① — the approved card goes once the programme is live', () => {
  it('🛑 the after-approval card is drawn only while the programme has NOT gone live', () => {
    expect(PAGE).toMatch(/review\.programme\.approved_at && !p\.wentLiveAt && \(\s*<ProgrammeApproval data=\{review\} onApproved=\{onApproved\} \/>/)
  })

  it('and nowhere else draws it unconditionally after approval', () => {
    expect(PAGE).not.toMatch(/review\.programme\.approved_at && \(\s*<ProgrammeApproval data=\{review\} onApproved=\{onApproved\} \/>/)
  })
})

describe('#2551 / R185 ① — no "sending window" for a client to change', () => {
  it('🛑 the "Change the sending window" chip is gone', () => {
    expect(CHAT).not.toContain('Change the sending window')
  })

  it('"Show me the full sequence" is still offered at approval', () => {
    expect(CHAT).toContain("prog.stage === 'Approval' ? ['Show me the full sequence'] : []")
  })
})
