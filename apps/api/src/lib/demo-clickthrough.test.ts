// R173 · the Northwind demo is clicked through like the real thing — and only the Northwind demo.
//
// "Accept · Pay" and "Approve" are the two presses a real client makes that a demo could not
// (no money, no mailbox). For the Northwind login each builds the stage it leads to; every other
// client — real, House, or another demo — still meets the real path.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const ROUTE = readFileSync(join(__dirname, '../routes/my-programme.ts'), 'utf8')
  .split('\n').filter(l => !l.trim().startsWith('//')).join('\n')

describe('R173 · demo click-through', () => {
  it('"Accept · Pay": only the FIRST payment, only the Northwind login, before any Stripe session', () => {
    const checkout = ROUTE.slice(ROUTE.indexOf('async function programmeCheckout'), ROUTE.indexOf("myProgrammeRouter.post('/approve'"))
    const demo = checkout.indexOf("if (stage === 'programme_first' && isNorthwindLogin(req.authEmail))")
    expect(demo).toBeGreaterThan(-1)
    expect(checkout.slice(demo, demo + 600)).toContain("advanceNorthwindOnPress(req.userId!, 'first_payment', p.meeting_target)")
    expect(checkout.slice(demo, demo + 900)).toContain("res.json({ success: true, data: { url: '/milla/programme', demo: true } })")
    // Any other demo is still refused, and nothing reaches Stripe first.
    expect(checkout.indexOf("error: 'demo_account'")).toBeGreaterThan(demo)
    expect(checkout.indexOf('createProgrammeCheckout')).toSatisfy((i: number) => i === -1 || i > demo)
  })
  it('"Approve": the Northwind login moves to Results BEFORE the real approval — no record, no alert', () => {
    const approve = ROUTE.slice(ROUTE.indexOf("myProgrammeRouter.post('/approve'"), ROUTE.indexOf("myProgrammeRouter.get('/meetings'"))
    const demo = approve.indexOf('if (isNorthwindLogin(req.authEmail)) {')
    const real = approve.indexOf('approveProgrammeAsCustomer(clientId')
    expect(demo).toBeGreaterThan(-1)
    expect(demo).toBeLessThan(real)
    expect(approve.slice(demo, demo + 600)).toContain("advanceNorthwindOnPress(req.userId!, 'approve', p.meeting_target)")
    expect(approve.indexOf('raiseOperatorTask')).toBeGreaterThan(real)
  })
  it('the demo\'s sender line is the display-only Northwind address, for the Northwind login only', () => {
    expect(ROUTE).toContain('if (isNorthwindLogin(req.authEmail)) frozen.sender_email = NORTHWIND_SENDER')
  })
})
