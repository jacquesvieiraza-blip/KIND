// ═══════════════════════════════════════════════════════════════════════════════════════
// 25 Sep — "PAY THE SECOND HALF — $2,187.50" ON THE HOUSE ACCOUNT.
//
// The founder's House walk: straight after approving, Milla offered the second payment, and the
// client route would have opened a LIVE Stripe session for it. House's P1 and P2 are internal
// authority granted in Vida (R152). Both halves of the fix: the route refuses before Stripe, and
// Milla never draws the card for House.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROUTE = readFileSync(join(__dirname, '..', 'routes', 'my-programme.ts'), 'utf8')
const PAGE = readFileSync(join(__dirname, '..', '..', '..', 'portal', 'src', 'app', '(milla)', 'milla', 'programme', 'page.tsx'), 'utf8')
const CHECKOUT = ROUTE.slice(ROUTE.indexOf('async function programmeCheckout'), ROUTE.indexOf("myProgrammeRouter.post('/approve'"))

describe('🛑 House is never asked to pay, at either half', () => {
  it('the checkout refuses House BEFORE any Stripe session is created', () => {
    const refusal = CHECKOUT.indexOf("error: 'internally_billed'")
    expect(refusal).toBeGreaterThan(-1)
    expect(CHECKOUT.indexOf('if (await isHouseClient(clientId)) {')).toBeLessThan(refusal)
    expect(refusal).toBeLessThan(CHECKOUT.indexOf('createProgrammeCheckoutSession({'))
    // …and before either stage's own gates, so it covers P1 and P2 alike.
    expect(refusal).toBeLessThan(CHECKOUT.indexOf("if (stage === 'programme_first') {"))
  })

  it('Milla shows House "nothing to pay" and never the payment card', () => {
    expect(PAGE).toContain('data-testid="house-second-nothing-to-pay"')
    expect(PAGE).toContain('This is the House account, so there is nothing to pay. P2 is authorised internally in Vida.')
    const payCard = PAGE.indexOf('<ProgrammePayment')
    const guard = PAGE.lastIndexOf('p.money.internalBilling !== true', payCard)
    expect(guard).toBeGreaterThan(-1)
    expect(payCard - guard).toBeLessThan(200)
  })
})
