// ═══════════════════════════════════════════════════════════════════════════════════════
// R145 · STEP 5 (24 Sep) — THE APPROVAL PANEL: ONE "APPROVE vN AND PAY P2"
//
// Tracker #32 #33 #34 #35 #36 #60 #78. Approval and payment stay two ordered acts — the approval
// screen records the decision and spends nothing (④); the page opens P2 once it is stored.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const read = (rel: string) => readFileSync(join(__dirname, rel), 'utf8')
const code = (rel: string) => read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const APPROVAL = code('../../../portal/src/components/milla/ProgrammeApproval.tsx')
const PAGE = code('../../../portal/src/app/(milla)/milla/programme/page.tsx')
const CHAT = code('../../../portal/src/components/milla/MillaConversation.tsx')

describe('#32 · one press: approve (recorded) → then P2', () => {
  it('🛑 the button names the version and the payment when P2 is due', () => {
    expect(APPROVAL).toContain("secondDue ? `Approve ${vLabel} and pay P2` : APPROVE_LABEL")
  })

  it('🛑 the approval screen itself still reaches no checkout (④) — the page opens P2', () => {
    expect(APPROVAL.toLowerCase()).not.toContain('checkout')
    expect(PAGE).toContain("'/my/programme/checkout/second'")
    expect(PAGE).toContain('successUrl: `${window.location.origin}/milla?paid=second`')
  })

  it('🛑 P2 opens only AFTER the approval is stored — from the approval\'s own callback', () => {
    const cb = PAGE.indexOf('onApproved={at => {')
    const pay = PAGE.indexOf('void payAfterApproval()', cb)
    expect(cb).toBeGreaterThan(-1)
    expect(pay).toBeGreaterThan(cb)
    expect(APPROVAL.indexOf("'/my/programme/approve'")).toBeLessThan(APPROVAL.indexOf('onApproved(r.data?.approved_at ?? null)'))
  })
})

describe('#33 #60 · the panel as designed, every fact from the freeze', () => {
  it('🛑 frozen-package hero, version card with people · messages · window · sender, the second payment', () => {
    expect(APPROVAL).toContain('Frozen package · {vLabel}')
    expect(APPROVAL).toContain('Approve exactly what will go out.')
    for (const f of ['<label>People</label>', '<label>What we will send</label>', '<label>Cadence &amp; window</label>', '<label>Sender</label>']) {
      expect(APPROVAL, f).toContain(f)
    }
    expect(APPROVAL).toContain('<div className="mv-eyebrow">Second payment</div>')
  })

  it('🛑 #36 · a change is a new version to approve, said on the panel', () => {
    expect(APPROVAL).toContain('If anything changes, we will ask you again')
  })
})

describe('#34 #35 · P2 without a reload, and no "nothing to pay"', () => {
  it('🛑 approving re-reads the programme, so the P2 card appears at once', () => {
    expect(PAGE).toMatch(/payAfterApproval = useCallback\(async \(\) => \{[\s\S]*void load\(\)/)
    expect(PAGE).toContain('p.hasProgramme && p.approvedAt && !p.wentLiveAt')
  })

  it('🛑 no client screen says there is nothing to pay', () => {
    const walk = (dir: string): string[] => readdirSync(dir).flatMap(n => {
      const f = join(dir, n)
      return statSync(f).isDirectory() ? walk(f) : f.endsWith('.tsx') ? [f] : []
    })
    for (const f of walk(join(__dirname, '../../../portal/src'))) {
      const c = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
      expect(c, f).not.toMatch(/There is nothing to pay/)
    }
  })
})

describe('#78 · review the sequence, and ask to change the window', () => {
  it('🛑 "Review full sequence" opens the frozen words; the chat offers the window change', () => {
    expect(APPROVAL).toContain("{showAll ? 'Hide the full sequence' : 'Review full sequence'}")
    expect(CHAT).toContain("prog.stage === 'Approval' ? ['Show me the full sequence', 'Change the sending window'] : []")
  })

  it('🛑 back from the P2 payment, the same wait — no second pay button', () => {
    expect(PAGE).toContain("const awaitingSecond = paidReturn === 'second' && !!p && !p.money.secondPaidAt && !p.money.secondAuthorisedAt")
  })
})
