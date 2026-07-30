import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// #352 — THE DEAD CARD-CHARGING PATH IS GONE. FOUNDER-CONFIRMED: "I confirm: yes, remove".
//
// `routes/figsy.ts` held a live `POST https://api.paystack.co/transaction/charge_authorization`
// inside the inbound-reply webhook. When a hot reply arrived and the client's balance was
// under their threshold, it charged their card.
//
// Four things wrong with it at once:
//
//   ① IT CHARGED IN ZAR AT A HARDCODED RATE. `Math.round(amountUsd * 19 * 100)` — a made-up
//     USD→ZAR rate of 19, baked into a card charge. A $20 bundle billed R380 whatever the
//     real rate was that day.
//   ② CHECK-THEN-ACT (the AR-14 headline). The 30-minute cooldown COUNTED recent top-up rows
//     and then charged. Two hot replies arriving together both read zero and both charged —
//     a genuine double card charge, which is why #702's idempotency migration mentions it.
//   ③ IT COULD NEVER SUCCEED. The gate requires `auto_topup_paystack_auth`, and Paystack was
//     removed from the billing UI in #325, so no client can obtain one. The code's own
//     comment admits it: *"Landmine: unreachable until a Paystack auth exists."*
//   ④ NO WEBHOOK EVER RECEIVED THE RESULT. `index.ts` mounted raw-body parsing for
//     `/webhooks/paystack` and no route was ever registered behind it.
//
// A payment integration that cannot complete, in a currency we do not bill, at a rate we
// invented, with a race condition. Removing it removes the AR-14 double charge outright —
// there is no charge left to race.
//
// These are REGRESSION GUARDS, not unit tests. Nothing here can be proven by calling a
// function; the assertion is about what is no longer in the tree.

const api    = (p: string) => readFileSync(join(__dirname, p), 'utf8')
const stripComments = (s: string) =>
  s.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')

describe('the charge path is gone', () => {
  it('nothing in the API calls Paystack', () => {
    for (const f of ['../routes/figsy.ts', '../routes/stripe.ts', '../routes/clients.ts', '../index.ts']) {
      expect(stripComments(api(f)), f).not.toContain('api.paystack.co')
    }
  })

  it('charge_authorization appears nowhere', () => {
    expect(stripComments(api('../routes/figsy.ts'))).not.toContain('charge_authorization')
  })

  it('the secret key is read by no code path', () => {
    for (const f of ['../routes/figsy.ts', '../index.ts']) {
      expect(stripComments(api(f)), f).not.toContain('PAYSTACK_SECRET_KEY')
    }
  })

  it('and startup-check may name it ONLY as parked — never as config to go and set', () => {
    // TIGHTENED 30 JUL (#561). This used to assert the name appeared nowhere in
    // startup-check.ts at all, and the environment sweep now lists all 83 API variables
    // there — including this one, at the `parked` tier, whose description says **delete it
    // from Railway**.
    //
    // The guard's real intent was never "the string must not appear"; it was "nothing may
    // tell the founder to configure a payment path that was removed". So it now asserts
    // that directly, which is STRICTER than the old version: the old one would have passed
    // on `{ key: 'PAYSTACK_SECRET_KEY_V2', level: 'critical' }`, and this does not.
    const sc = stripComments(api('./startup-check.ts'))
    const entry = sc.match(/key:\s*'PAYSTACK_SECRET_KEY',\s*level:\s*'(\w+)'/)
    expect(entry, 'PAYSTACK_SECRET_KEY must either be absent or listed as parked').toBeTruthy()
    expect(entry![1]).toBe('parked')
    for (const tier of ['critical', 'important', 'optional']) {
      expect(sc).not.toContain(`key: 'PAYSTACK_SECRET_KEY',           level: '${tier}'`)
    }
  })

  it('the hardcoded ×19 ZAR rate is gone', () => {
    // A made-up exchange rate inside a card charge. Nothing should reintroduce it.
    expect(stripComments(api('../routes/figsy.ts'))).not.toMatch(/amountUsd \* 19/)
    expect(stripComments(api('../routes/figsy.ts'))).not.toContain('amountZarKobo')
  })

  it('the dangling webhook mount is gone — no route ever sat behind it', () => {
    expect(stripComments(api('../index.ts'))).not.toContain('/webhooks/paystack')
  })
})

describe('the AR-14 double charge cannot happen, because there is no charge', () => {
  it('the check-then-act cooldown is gone with the code it guarded', () => {
    // The 30-min cooldown counted rows and THEN charged; two simultaneous hot replies both
    // read zero and both charged. Removing the charge removes the race outright.
    const src = stripComments(api('../routes/figsy.ts'))
    expect(src).not.toContain('cooldownAgo')
    expect(src).not.toContain('recentTopups')
  })

  it('the reply webhook no longer moves money at all', () => {
    // A webhook ANY PROSPECT can trigger by replying to an email must not be a payment
    // endpoint. This is the property worth keeping long after the Paystack detail is
    // forgotten — so it asserts on money movement, not on one vendor's hostname.
    //
    // Note it does NOT forbid outbound fetch generally: the same route legitimately calls
    // api.resend.com to pull a reply body. The first version of this guard did, and caught
    // that instead — a guard that fires on the wrong thing is worse than none.
    const src = stripComments(api('../routes/figsy.ts'))
    expect(src).not.toContain('auto_topup_paystack_auth')
    expect(src).not.toContain('api.paystack.co')
    expect(src).not.toContain("type: 'purchase'")
    expect(src).not.toContain('increment_client_credits')
    expect(src).not.toContain('increment_figsy_credits')
  })
})

describe('what must NOT have been removed', () => {
  it("the client's saved auto-top-up PREFERENCES survive", () => {
    // NOTHING GETS DELETED (founder-locked 26 Jul). The founder authorised removing the
    // Paystack CHARGE PATH, not a client's stored settings — those are what a future
    // Stripe-based auto top-up will read.
    const src = api('../routes/clients.ts')
    expect(src).toContain('auto_topup_enabled')
    expect(src).toContain('auto_topup_threshold')
  })

  it('the database columns are untouched — no migration drops anything', () => {
    const src = api('./pending-migrations.ts')
    expect(src).not.toMatch(/DROP COLUMN/i)
    expect(src).not.toMatch(/paystack/i)
  })

  it('historical purchase references are untouched', () => {
    // credit_transactions.reference holds real Paystack references for real past payments.
    // Deleting billing history to tidy up a code path would be indefensible.
    expect(api('./pending-migrations.ts')).not.toMatch(/DELETE FROM public\.credit_transactions/i)
  })
})

describe('nothing still tells anyone Paystack is part of the product', () => {
  const admin = (p: string) => readFileSync(join(__dirname, '../../../admin/src/app', p), 'utf8')

  it('the health page does not monitor a processor we do not use', () => {
    expect(admin('health/page.tsx')).not.toContain('status.paystack.com')
  })

  it('the launch smoke test does not send an operator to test a removed path', () => {
    // "Billing → buy credits: Paystack opens (live key)" would have someone verifying a
    // checkout that no longer exists, and reporting it broken.
    expect(stripComments(admin('launch/page.tsx'))).not.toContain('Paystack')
  })

  it('the founder brief does not label Stripe fees as Paystack fees', () => {
    // internal-briefs.ts computed 2.9% of MRR and called it a Paystack fee. Stripe is the
    // processor; the number was fine, the name was a lie on a money report.
    expect(stripComments(api('../routes/internal-briefs.ts'))).not.toMatch(/paystack/i)
  })
})
