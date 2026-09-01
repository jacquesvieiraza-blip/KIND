import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { stripCommentsForEnvScan } from './env-inventory'

// #349 REMAINDER — the money writes outside the families closed on 29 Jul.
//
// THE DEFECT CLASS, restated because it is invisible: supabase-js RETURNS `{ error }`; it does
// not throw. So `await db.from('x').insert(...)` with no destructure is a write whose failure
// nothing observes, and `.then(() => {}, () => {})` is that decision made explicitly. Neither
// produces a stack trace, a 500, or a log. The money simply stops matching the ledger.
//
// EACH GUARD BELOW PINS A CONSEQUENCE, not a coding style. The rule this sweep worked to: a
// checked write is only finished when the failure branch says what it COSTS — "the client has
// paid and will never be credited" is actionable at 2am; "insert failed" is not.
//
// Comments are stripped before every assertion. The fixes are heavily commented and those
// comments quote the code they replaced, so a raw search finds the old shape in the note that
// explains its removal. Same lesson as #607 and #406.

const SRC = join(__dirname, '..')
const code = (rel: string) => stripCommentsForEnvScan(readFileSync(join(SRC, rel), 'utf8'))

describe('a client who paid is always credited — the two Stripe rollbacks', () => {
  const stripe = code('routes/stripe.ts')

  it('both ledger rollbacks check their error', () => {
    // The row is deleted so Stripe's retry can re-grant. The replay is idempotent ON THIS
    // REFERENCE, so a failed delete means the retry sees the row, decides the grant already
    // happened, and skips it — the client has paid and is never credited, permanently.
    const checked = stripe.split("const { error: rollbackErr } = await db.from('credit_transactions').delete().eq('reference', session.id)").length - 1
    const total = stripe.split("credit_transactions').delete().eq('reference', session.id)").length - 1
    expect(total, 'expected exactly two session-reference rollbacks').toBe(2)
    expect(checked, 'a session rollback is still unchecked').toBe(2)
  })

  it('and the alert names the consequence rather than the error', () => {
    expect(stripe).toContain('PAID CLIENT WILL NOT BE CREDITED')
    expect(stripe).toMatch(/will never receive the credit/)
  })
})

// ⛓️ 31 Aug (BUILD-004A-2D, founder decision D2) — RETARGETED, NOT WEAKENED.
//
// This block guarded `payReferrerOnFirstPurchase`: #349's finding that its atomic claim
// swallowed its own error (leaving the referrer silently unpaid) and that its rollback alerts
// asserted a clean undo whether or not one had happened.
//
// THAT FUNCTION NO LONGER EXISTS. The automatic $45 wallet credit is retired — referrals are
// handled by a human — so there is no payout, no ledger row and no rollback to guard. The
// assertions about `delErr`/`resetErr`/"THE ROLLBACK DID NOT FULLY SUCCEED" were removed
// because the code they described was deleted, and a guard pointed at nothing passes for the
// wrong reason.
//
// ⚠️ #349'S ACTUAL LESSON SURVIVES AND IS ASSERTED BELOW, on the function that replaced it.
// The failure was never "the payout was wrong" — it was "the step deciding whether anything
// runs did not check its error". The handoff makes exactly the same atomic claim, and under a
// human-handled model an unchecked failure there means a referral nobody is ever told about.
describe('the referral handoff cannot fail in silence', () => {
  const stripe = code('routes/stripe.ts')

  it('the atomic claim checks its error', () => {
    expect(stripe).toMatch(/const \{ data: handed, error: handErr \}/)
    expect(stripe).toContain('Referral NOT raised — claim failed')
  })

  it('and a lost claim is distinguished from a failed one', () => {
    // The #349 shape precisely: `handed` being empty means someone else won the race, which
    // is fine. It must never be how an ERROR reads.
    expect(stripe).toMatch(/if \(handErr\)/)
    expect(stripe).toMatch(/if \(!handed \|\| handed\.length === 0\) return/)
  })

  it('and nothing about a referral touches money any more', () => {
    expect(stripe).not.toMatch(/payReferrerOnFirstPurchase/)
    expect(stripe).not.toMatch(/type:\s*'referral_bonus'/)
  })
})

describe('the ledger never silently disagrees with the wallet', () => {
  it('figsy refund: the reverse row and the reference release are both checked', () => {
    const figsy = code('lib/figsy.ts')
    expect(figsy).toMatch(/const \{ error: reverseErr \}/)
    expect(figsy).toMatch(/const \{ error: freeErr \}/)
    // The $4 is already back in the wallet by this point — an unrecorded reverse means the
    // ledger under-reports the client forever.
    expect(figsy).toContain('Refund happened but was not recorded')
    // And a failed reference release blocks the legitimate retry via the unique index.
    expect(figsy).toContain('a retry cannot re-charge')
  })

  it('credit holds: capture and release are both marked and both ledgered', () => {
    const holds = code('lib/credit-holds.ts')
    for (const v of ['capErr', 'relErr', 'ledgerErr']) {
      expect(holds, `credit-holds still swallows ${v}`).toMatch(new RegExp(`const \\{ error: ${v} \\}`))
    }
    // The specific harm: an unmarked hold can be released twice.
    expect(holds).toContain('can be released again')
    expect(holds).toContain('returned a second time')
  })

  it('and no money write in these files still swallows with .then(noop, noop)', () => {
    // `.then(() => {}, () => {})` is the swallow made explicit. It was the shape #349 named.
    for (const f of ['lib/credit-holds.ts', 'routes/stripe.ts']) {
      const src = code(f)
      expect(src, `${f} still has an explicit swallow`).not.toMatch(/\.then\(\(\) => \{\}, \(\) => \{\}\)/)
    }
  })
})

describe('a prospect who replied is never emailed again', () => {
  it('the replied-status write is checked and alerts', () => {
    // Not a money write, but the same swallow with the consequence a person actually feels:
    // the enrollment stays active and the next cron mails someone who already replied.
    const rp = code('lib/reply-pipeline.ts')
    expect(rp).toMatch(/const \{ error: repliedErr \}/)
    expect(rp).toContain('A prospect who replied is still in sequence')
  })
})
