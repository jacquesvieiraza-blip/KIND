// ═══════════════════════════════════════════════════════════════════════════════════════
// R145 · STEP 4 (24 Sep) — THE PROGRAMME PANEL: ONE SLIDER, ONE "ACCEPT · PAY P1"
//
// Founder, verbatim: *"from one screen to one choice to the next."* Tracker #27 #28 #29 #30 #31
// #59 #75 #76 #77, and D4 (the 400 is Vida's only) and D5 (target + qualified meetings).
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const read = (rel: string) => readFileSync(join(__dirname, rel), 'utf8')
const code = (rel: string) => read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const CALC = code('../../../portal/src/components/milla/ProgrammeCalculator.tsx')
const PAGE = code('../../../portal/src/app/(milla)/milla/programme/page.tsx')
const HOME = code('../../../portal/src/app/(milla)/milla/page.tsx')
const CHAT = code('../../../portal/src/components/milla/MillaConversation.tsx')
const MYPROG = code('../routes/my-programme.ts')

describe('#27 · ONE button runs choose → accept → P1, in that order', () => {
  it('🛑 the three server steps, in order, each refusing stops the rest', () => {
    const choose = CALC.indexOf("'/my/programme/choose'")
    const accept = CALC.indexOf('await postAcceptance(')
    const pay = CALC.indexOf("'/my/programme/checkout/first'")
    expect(choose).toBeGreaterThan(-1)
    expect(accept).toBeGreaterThan(choose)
    expect(pay).toBeGreaterThan(accept)
    expect(CALC).toContain('if (!accepted.ok) throw new Error(accepted.message)')
  })

  it('🛑 the button says what it does, and the price it starts', () => {
    // ⛓️ 25 Sep (R168 · P7b) — WAS one template: "Accept N meetings · Pay P1" with the price only
    // when known. With a price it still says the price it starts, word for word; with NO price
    // yet (size being confirmed) it no longer says "Pay P1", because a client on the new terms
    // pays once. Same rule — the button says what it does — for both cases.
    expect(CALC).toContain(': d ? `Accept ${d.meetings} meetings · Pay P1 (${programmeMoney(d.firstPaymentCents)})`')
    expect(CALC).toContain(': `Accept ${meetings} meetings`}')
  })

  it('🛑 the separate Accept and P1 cards are gone from the screen', () => {
    expect(PAGE).not.toContain('<ProgrammeAcceptance')
    expect(PAGE).not.toMatch(/stage="first"/)
    expect(PAGE).toContain('<ProgrammeCalculator')
  })
})

describe('#28 #29 #59 #76 · the panel as designed', () => {
  it('🛑 hero + slider, Capacity card with the workable pool, Payment card with P1 and P2', () => {
    expect(CALC).toContain('qualified meetings — your target')
    expect(CALC).toContain('<div className="mv-eyebrow">Capacity</div>')
    expect(CALC).toContain('<div className="mv-eyebrow">Payment</div>')
    expect(CALC).toContain('P1 · starts preparation')
    expect(CALC).toContain('P2 · on approval')
    expect(MYPROG).toContain('workable: cap.workable')
  })

  it('🛑 D4 · the 400 never reaches the client, and D5 · no "commitment" wording', () => {
    expect(CALC).not.toMatch(/\b400\b/)
    expect(CALC).not.toMatch(/the commitment/i)
  })

  it('🛑 their value and conversion are sliders, and labelled an illustration', () => {
    expect(CALC).toContain('id="calc-value" type="range"')
    expect(CALC).toContain('id="calc-pct" type="range"')
    expect(CALC).toContain('an illustration, not a forecast')
  })

  it('🛑 on Home the Programme screen is the whole right side — no tile row above it', () => {
    expect(HOME).toContain('<div className="flex-1 min-h-0"><ProgrammeScreen /></div>')
  })
})

describe('#30 #77 · back from Stripe, on the same screen, and never asked twice', () => {
  it('🛑 the payment returns to the ONE screen with a flag', () => {
    expect(CALC).toContain('successUrl: `${window.location.origin}/milla?paid=first`')
  })

  it('🛑 while the payment is not yet on record, the panel says so and offers NO button', () => {
    expect(PAGE).toContain("const awaitingFirst = paidReturn === 'first' && !!p && !p.money.firstPaidAt && !p.money.firstAuthorisedAt")
    const at = PAGE.indexOf('{awaiting ? (')
    const calc = PAGE.indexOf('<ProgrammeCalculator')
    expect(at).toBeGreaterThan(-1)
    expect(at, 'the calculator can render while the payment is being confirmed').toBeLessThan(calc)
    expect(PAGE).toContain('if (n > 30) { clearInterval(t); setConfirmSlow(true); return }')
  })
})

describe('#75 #31 · "Widen targeting" and the chat shortcuts', () => {
  it('🛑 widening is handed to Milla in the one chat', () => {
    expect(PAGE).toContain('conversation.focus()')
    expect(CALC).toContain('>Widen targeting</button>')
  })

  it('🛑 "Accept N" in the chat runs the panel\'s own button, only while it could be pressed', () => {
    expect(CALC).toContain('const canPay = !!d && !noCapacity && !busy && !chosen')
    expect(CALC).toContain('setDeskActions(canPay ? { accept: () => void payRef.current(), acceptLabel: payLabel } : null)')
    expect(CHAT).toContain("const CHIP_EXPLAIN_250 = 'Explain the 250'")
    expect(CHAT).toContain("prog.stage === 'Recommendation' && deskActions?.accept ? [deskActions.acceptLabel ?? CHIP_ACCEPT] : []")
  })
})
