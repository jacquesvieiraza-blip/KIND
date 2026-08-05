// #618 — THE COLD-CLIENT RULE STOPS POINTING AT US.
//
// Founder-ruled 5 Aug, after A4. The rule exists because *"a client's sender costs ~$40/month…
// a bill we pay to keep an inbox warm for nobody"* — a COST rule about a CLIENT going quiet
// while we carry their mailbox.
//
// It was pointing at our own account, and two individually correct decisions built that:
// `cold-check` skips only `is_demo === true`, and `house-client.ts` deliberately un-demos
// Client Zero so it counts in revenue figures and the CSV import accepts it.
//
// ⚠️ WHAT MADE IT URGENT. #611 called it "a trap for the abnormal order" — approvals normally
// precede a campaign, and any approval resets the clock. **The founder's A4 ruling killed that
// reasoning**: Client Zero's 159 approved leads are real prospects and stay, and they are
// already approved AND enrolled. So send-day needs no new approval — a campaign goes active on
// ~25 Aug with the last approval ~59 days old, and the next 08:40 UTC run pauses it and alerts
// about churn risk on our own account, after three weeks of warming.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { coldCheckExempt, coldState, COLD_DAYS } from './cold-client'
import { stripCommentsForEnvScan } from './env-inventory'

const HOUSE = 'house-client-id'

describe('coldCheckExempt — who this rule is not for', () => {
  it('EXEMPTS the house account', () => {
    const r = coldCheckExempt({ clientId: HOUSE, isDemo: false, houseClientId: HOUSE })
    expect(r.exempt).toBe(true)
    expect(r.why).toContain('house account')
  })

  it('EXEMPTS a demo account, exactly as before — this rule is unchanged', () => {
    const r = coldCheckExempt({ clientId: 'mbf', isDemo: true, houseClientId: HOUSE })
    expect(r.exempt).toBe(true)
    expect(r.why).toContain('demo')
  })

  it('does NOT exempt a real paying client — the feature still works', () => {
    // The whole point of the rule. If this ever returns true, we stop noticing clients who
    // have gone quiet while we pay for their sender.
    expect(coldCheckExempt({ clientId: 'real-client', isDemo: false, houseClientId: HOUSE }).exempt).toBe(false)
    expect(coldCheckExempt({ clientId: 'real-client', isDemo: null, houseClientId: HOUSE }).exempt).toBe(false)
    expect(coldCheckExempt({ clientId: 'real-client', isDemo: undefined, houseClientId: HOUSE }).exempt).toBe(false)
  })

  // ── FAILS OPEN, DELIBERATELY ─────────────────────────────────────────────────────────────
  it('exempts NOBODY extra when the house account cannot be resolved', () => {
    // The cost of failing open: our own campaign might be paused — visible, alerted, one click
    // to undo. The cost of failing closed: everyone is silently exempt and a rule that saves
    // real money quietly stops working. Open is the right direction.
    expect(coldCheckExempt({ clientId: HOUSE, isDemo: false, houseClientId: null }).exempt).toBe(false)
    expect(coldCheckExempt({ clientId: 'real-client', isDemo: false, houseClientId: null }).exempt).toBe(false)
  })

  it('an empty-string house id is treated as unresolved, not as a match', () => {
    // '' == '' would exempt a client whose id is somehow empty. Guarded by the truthiness check.
    expect(coldCheckExempt({ clientId: '', isDemo: false, houseClientId: '' }).exempt).toBe(false)
  })

  it('every exemption carries a REASON — a silent skip is an unexplained one', () => {
    for (const a of [
      { clientId: HOUSE, isDemo: false, houseClientId: HOUSE },
      { clientId: 'mbf', isDemo: true, houseClientId: HOUSE },
    ]) {
      expect(coldCheckExempt(a).why.length).toBeGreaterThan(20)
    }
  })
})

describe('the scenario this was built for — send-day, 25 Aug', () => {
  // The exact shape from the audit: last approval 39 days ago on 5 Aug, so ~59 by send-day.
  const now = new Date('2026-08-25T09:00:00Z')
  const lastApproval = '2026-06-27T00:00:00Z'   // ~59 days before send-day

  it('WITHOUT the exemption the house account is cold and would be suspended', () => {
    const s = coldState(lastApproval, now)
    expect(s.cold).toBe(true)
    expect(s.daysIdle).toBeGreaterThan(COLD_DAYS)
  })

  it('WITH the exemption the cron never reaches that judgement', () => {
    expect(coldCheckExempt({ clientId: HOUSE, isDemo: false, houseClientId: HOUSE }).exempt).toBe(true)
  })

  it('and a real client on the same clock IS still suspended', () => {
    expect(coldState(lastApproval, now).cold).toBe(true)
    expect(coldCheckExempt({ clientId: 'real-client', isDemo: false, houseClientId: HOUSE }).exempt).toBe(false)
  })
})

// ── THE WIRING — a guard nothing calls is not a guard ─────────────────────────────────────
describe('the cron actually asks', () => {
  const src = stripCommentsForEnvScan(readFileSync(join(__dirname, '../routes/internal.ts'), 'utf8'))
  const route = src.slice(src.indexOf("internalRouter.post('/clients/cold-check'"))
  const body = route.slice(0, route.indexOf('internalRouter.', 20))

  it('calls coldCheckExempt', () => {
    expect(body).toContain('coldCheckExempt({')
  })

  it('the OLD bare is_demo check is gone — one place decides, not two', () => {
    // Two copies of "who is exempt" is how the cron and the audit panel start disagreeing.
    expect(body).not.toContain('if (c.is_demo === true) continue')
  })

  it('resolves the house account by decideHouseClient, never by company name', () => {
    // #584/#582 were both caused by matching an account on a name a human can edit.
    expect(body).toContain('decideHouseClient')
    expect(body).not.toMatch(/company_name\s*===/)
  })

  it('resolves it ONCE, before the loop — not per client', () => {
    const resolveAt = body.indexOf('decideHouseClient')
    const loopAt = body.indexOf('for (const c of')
    expect(resolveAt).toBeGreaterThan(-1)
    expect(loopAt).toBeGreaterThan(-1)
    expect(resolveAt, 'the house lookup must sit outside the loop').toBeLessThan(loopAt)
  })

  it('reports how many it skipped — a silent exemption is invisible', () => {
    expect(body).toContain('exempted')
  })
})
