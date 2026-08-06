// #616 / C4 — THE SEAT LIMIT GETS A SCREEN.
//
// #616 built the rule and enforced it: owner-only, 1–100, refuses a limit below the seats in use,
// with an honest 409 that explains the fix. And NO screen called it. A company met that 409 at
// rep 26 having never been told a limit existed — the founder's own words: *"one company with 10
// employees is like having 10 companies"*, and the control over that was invisible.
//
// ⚠️ CLIENT-FACING. Per RULEBOOK §11 this should be PREVIEWED before it reaches the live site.
// The screen is built; whether it previews or ships with an immediate walk is the founder's call.
//
// C5 SAFE DEFAULT: no delete is built. Delete-vs-deactivate is an open founder ruling, and
// building the destructive half of an undecided question is how you get an irreversible answer.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { stripCommentsForEnvScan } from './env-inventory'

const page = stripCommentsForEnvScan(
  readFileSync(join(__dirname, '../../../portal/src/app/(dashboard)/dashboard/company/page.tsx'), 'utf8'))

/**
 * The body of `saveSeatCap`, bounded by CODE.
 *
 * ⚠️ THE FIRST DRAFT SLICED TO A `// #108` COMMENT — and this file is read through
 * `stripCommentsForEnvScan`, so that anchor was never there: `indexOf` returned -1, `slice(at, -1)`
 * ran to the end of the file, and the "it re-reads after saving" test PASSED with the re-read
 * deleted. Caught by the red proof, which is the entire reason red proofs exist.
 */
function saveSeatCapBody(): string {
  const at = page.indexOf('async function saveSeatCap')
  if (at < 0) return ''
  const next = page.indexOf('async function ', at + 20)
  return page.slice(at, next > at ? next : at + 1400)
}
const api = stripCommentsForEnvScan(readFileSync(join(__dirname, '../routes/company.ts'), 'utf8'))

describe('the screen calls the REAL #616 route', () => {
  it('PATCHes /company/seat-cap with a seat_cap integer', () => {
    expect(page).toContain("api.patch('/company/seat-cap'")
    expect(page).toContain('{ seat_cap: n }')
  })

  it('shows the limit AND the seats in use — a ceiling with no reading against it says nothing', () => {
    const at = page.indexOf('Seat limit')
    expect(at).toBeGreaterThan(-1)
    const card = page.slice(at, page.indexOf('Save limit', at))
    expect(card).toContain('seats_used')
    expect(card).toContain('seat_cap')
  })

  it('warns BEFORE the wall — the whole point of #616 returning seats_used', () => {
    expect(page).toContain('You are at your seat limit')
  })
})

describe('OWNER ONLY — the screen agrees with the API about who decides', () => {
  it('the card is gated on isOwner, matching the route', () => {
    // A manager runs the reps; what the company PAYS for is the owner's call. If the screen
    // showed the control to a manager they would meet a 403 with no explanation on screen.
    // ⚠️ ANCHORED ON THE HEADING, NOT THE WORDS. `indexOf('Seat limit')` first matches the
    // handler's success message (`Seat limit set to N`), so the earlier draft asserted against
    // the wrong region and failed on correct code — the same anchor error as #619's rows.map(.
    const at = page.indexOf('Seat limit</h3>')
    expect(at, 'the card heading must exist').toBeGreaterThan(-1)
    const before = page.slice(Math.max(0, at - 600), at)
    expect(before).toContain('isOwner &&')
  })

  it('and the API still enforces it — the screen is not the gate', () => {
    expect(api).toContain('if (!ctx.isOwner)')
    expect(api).toContain('the owner')
  })
})

describe('the refusal is rendered VERBATIM, not paraphrased', () => {
  it('the API error text is shown as-is', () => {
    // The 409 explains that lowering a limit removes nobody and says to deactivate first. Any
    // paraphrase on this page would be a second, worse copy of somebody else's rule.
    expect(saveSeatCapBody()).toContain('(e as Error).message')
  })

  it('and it RE-READS after saving rather than trusting the echo', () => {
    expect(saveSeatCapBody()).toContain('await load(token)')
  })

  it('it bails without a token instead of casting one — a 401 must not read as saved', () => {
    expect(saveSeatCapBody()).toContain('if (!token)')
  })
})

describe('C5 — the safe default: no delete was built', () => {
  it('the card says removal deactivates and keeps history', () => {
    const at = page.indexOf('Seat limit</h3>')
    const card = page.slice(at, at + 2400)
    expect(card).toContain('deactivates it and keeps its history')
  })

  it('the ruling is SETTLED and the card no longer says otherwise', () => {
    // ⚠️ REWRITTEN 6 Aug, NOT DELETED. This asserted `toContain('still open')` — correct while
    // C5 was undecided, and it would have failed the day the founder ruled, which is exactly
    // what a pin is for. He ruled DEACTIVATE ONLY, permanently, so the honest assertion is the
    // mirror image: a client must not be told we are still deciding how their team data is
    // handled, because we are not.
    const at = page.indexOf('Seat limit</h3>')
    const card = page.slice(at, at + 2400)
    expect(card).not.toContain('still open')
    expect(card).toContain('Permanent deletion is not offered')
  })

  it('and it says what SURVIVES a removal, not just what does not happen', () => {
    // "Deactivated" alone leaves the client wondering whether their rep's history went with
    // them. The ruling is that it never does — so the card has to say so.
    const at = page.indexOf('Seat limit</h3>')
    const card = page.slice(at, at + 2400)
    expect(card).toContain('stay on your account')
  })

  it('no destructive seat endpoint exists — the ruling is enforced in code, not just copy', () => {
    // Under the old ruling this guarded an UNDECIDED question. Under the new one it guards a
    // DECIDED one, and it matters more: the copy promises deletion is not offered, and this is
    // what stops a future session quietly building it and making that promise false.
    expect(api).not.toContain("companyRouter.delete('/seats")
  })
})
