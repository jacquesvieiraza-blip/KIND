// ⚑ 29 Sep (R174 · PR 2b) — AFTER PAYING THE SECOND HALF, THE PAGE KNOWS; THE PAY BUTTON NEVER COMES BACK.
// Old 50/50 programmes: the P2 card's Pay returned with no flag, and while Stripe's confirmation
// was still on its way the card drew its Pay button under "we're confirming your second payment".
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
const PAY = read('apps/portal/src/components/milla/ProgrammePayment.tsx')
const PAGE = read('apps/portal/src/app/(milla)/milla/programme/page.tsx')

describe('the return from Stripe carries which half was paid', () => {
  it('the P2 card returns with ?paid=<stage>, which the page reads', () => {
    expect(PAY).toContain('successUrl: `${window.location.origin}/milla/programme?paid=${stage}`')
    expect(PAY).toContain("export type PaymentStage = 'first' | 'second'")
    expect(PAGE).toContain("setPaidReturn(v === 'first' || v === 'second' ? v : null)")
  })
  it('the Approve-and-pay press still returns flagged too', () => {
    expect(PAGE).toContain('successUrl: `${window.location.origin}/milla?paid=second`')
  })
})

describe('while the second payment is being confirmed, there is no Pay button', () => {
  it('the P2 card waits for the confirmation', () => {
    const at = PAGE.indexOf('<ProgrammePayment')
    const cond = PAGE.slice(PAGE.lastIndexOf('{p.hasProgramme && p.approvedAt', at), at)
    expect(cond).toContain('!awaitingSecond')
    expect(cond).toContain('!p.money.secondPaidAt && !p.money.secondAuthorisedAt')
  })
})
