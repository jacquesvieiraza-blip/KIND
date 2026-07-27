import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  classify, buildReport, armingCheck, WIPE_CONFIRMATION, type SeedCandidate,
} from './seed-wipe'

// #329 — THE GO-LIVE SEED WIPE.
//
// Every test here is about what must SURVIVE. A wipe script's unit tests are not really
// about deletion — they are about the four things it must refuse to touch, because the cost
// of a false positive is a real client's data and there is no undo.

const c = (over: Partial<SeedCandidate> = {}): SeedCandidate => ({
  id: 'c1', company_name: 'Test Co', is_demo: false, email: null,
  realPayments: 0, realLeads: 0, ...over,
})
const HOUSE = new Set(['founder@get-kind.com'])

describe('REAL MONEY OUTRANKS EVERY OTHER SIGNAL', () => {
  it('a paying client is protected even when flagged is_demo', () => {
    // The flag is a human's opinion. A Stripe-referenced ledger row is a fact. If those two
    // disagree on a destructive path, the fact must win — this ordering IS the safety
    // property of the whole script.
    const r = classify(c({ is_demo: true, realPayments: 1 }), HOUSE)
    expect(r.disposition).toBe('protected_real')
  })

  it('a paying client is protected even when named like a test account', () => {
    const r = classify(c({ company_name: 'TEST DELETE ME', realPayments: 3 }), HOUSE)
    expect(r.disposition).toBe('protected_real')
  })

  it('and the reason says so, so nobody overrides it by hand', () => {
    expect(classify(c({ realPayments: 2 }), HOUSE).reason).toContain('never seed data')
  })
})

describe('a desk somebody has actually worked is protected', () => {
  it('real leads protect a client with no payment yet', () => {
    // Onboarded, sourced, not yet billed. Deleting this is deleting a live prospect list.
    expect(classify(c({ realLeads: 40 }), HOUSE).disposition).toBe('protected_real')
  })
  it('zero real leads does not protect on its own', () => {
    expect(classify(c({ realLeads: 0 }), HOUSE).disposition).toBe('eligible')
  })
})

describe('THE DEMO ACCOUNT SURVIVES — it is how the product is sold', () => {
  it('is_demo is protected, not wiped', () => {
    // The item said "wipe seed data at go-live". Taken literally that deletes MBF on the day
    // the founder most needs to demo. Kept deliberately.
    expect(classify(c({ is_demo: true }), HOUSE).disposition).toBe('protected_demo')
  })

  it('identified by the FLAG, never by the name', () => {
    // Name matching has bitten twice — "MBF Holdings" vs the live "MBF Demo" (#584/#582).
    // A name is a label a human edits; on a destructive path that deletes the wrong account.
    expect(classify(c({ company_name: 'MBF Holdings', is_demo: false }), HOUSE).disposition).not.toBe('protected_demo')
    expect(classify(c({ company_name: 'Nothing Like Mbf', is_demo: true }), HOUSE).disposition).toBe('protected_demo')
  })

  it('the reason explains why it is kept, not just that it is', () => {
    expect(classify(c({ is_demo: true }), HOUSE).reason).toContain('sold')
  })
})

describe('the house account survives', () => {
  it('matched on the auth email', () => {
    expect(classify(c({ email: 'founder@get-kind.com' }), HOUSE).disposition).toBe('protected_house')
  })
  it('case and whitespace do not defeat it', () => {
    expect(classify(c({ email: '  FOUNDER@GET-KIND.COM ' }), HOUSE).disposition).toBe('protected_house')
  })
  it('a different email is not the house account', () => {
    expect(classify(c({ email: 'someone@else.com' }), HOUSE).disposition).toBe('eligible')
  })
})

describe('what is actually eligible', () => {
  it('no money, no real leads, not demo, not house', () => {
    expect(classify(c(), HOUSE).disposition).toBe('eligible')
  })
  it('every classification carries a reason — a row without one is not actionable', () => {
    const rows = [c(), c({ is_demo: true }), c({ realPayments: 1 }), c({ realLeads: 5 }), c({ email: 'founder@get-kind.com' })]
    for (const row of rows) expect(classify(row, HOUSE).reason.length).toBeGreaterThan(15)
  })
})

describe('the report', () => {
  it('separates eligible from protected and counts both', () => {
    const r = buildReport([c({ id: 'a' }), c({ id: 'b', is_demo: true }), c({ id: 'c', realPayments: 1 })], HOUSE)
    expect(r.eligible.map(e => e.clientId)).toEqual(['a'])
    expect(r.protectedCount).toBe(2)
    expect(r.clean).toBe(false)
  })
  it('says clean when there is genuinely nothing to do', () => {
    expect(buildReport([c({ is_demo: true }), c({ realPayments: 1 })], HOUSE).clean).toBe(true)
  })
  it('an empty database is clean, not an error', () => {
    expect(buildReport([], HOUSE).clean).toBe(true)
  })
})

// ── THE ARMING GATE ──────────────────────────────────────────────────────────────────────
describe('execution cannot be reached by accident', () => {
  const today = new Date('2026-07-27T09:00:00Z')

  it('unset means NOT armed', () => {
    expect(armingCheck(undefined, WIPE_CONFIRMATION, today).armed).toBe(false)
  })

  it('THE DATE IS THE POINT — a value left set yesterday cannot fire today', () => {
    // Otherwise SEED_WIPE_ARMED=1 sits in Railway forever and this becomes a loaded gun
    // that any later deploy can pull. FOUNDER_FLIP=1 is fine for a reversible dot; this is
    // not reversible, so it expires.
    expect(armingCheck('2026-07-26', WIPE_CONFIRMATION, today).armed).toBe(false)
    expect(armingCheck('2026-07-26', WIPE_CONFIRMATION, today).why).toContain('stale')
  })

  it('a truthy-looking value does not arm it', () => {
    for (const v of ['1', 'true', 'yes', 'ARMED']) {
      expect(armingCheck(v, WIPE_CONFIRMATION, today).armed, v).toBe(false)
    }
  })

  it('the right date without the typed phrase does not arm it', () => {
    expect(armingCheck('2026-07-27', undefined, today).armed).toBe(false)
    expect(armingCheck('2026-07-27', 'yes', today).armed).toBe(false)
  })

  it('the phrase must be exact — no near miss counts', () => {
    expect(armingCheck('2026-07-27', 'wipe the seed data', today).armed).toBe(false)
  })

  it('both keys together, on the day, arms it', () => {
    expect(armingCheck('2026-07-27', WIPE_CONFIRMATION, today).armed).toBe(true)
  })

  it('every refusal explains how to arm it properly', () => {
    expect(armingCheck(undefined, undefined, today).why).toContain('2026-07-27')
  })
})

describe('the plan is written down', () => {
  it('the document exists and leads with what survives', () => {
    const doc = readFileSync(join(__dirname, '../../../../docs/SEED-WIPE-PLAN.md'), 'utf8')
    expect(doc).toContain('NOTHING GETS DELETED')
    expect(doc.toLowerCase()).toContain('exclusion')
    // The honest headline: most of the item is already solved by exclusion, not deletion.
    expect(doc).toContain('#543')
  })

  it('the report is REACHABLE — a plan nobody can run is a document, not a deliverable', () => {
    const src = readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')
      .split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
    expect(src).toContain('/seed-report')
    expect(src).toContain('buildReport')
  })

  it('the report endpoint never deletes — it is safe to press at any time', () => {
    const src = readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')
    const idx = src.indexOf("'/seed-report'")
    const block = src.slice(idx, idx + 3000)
    expect(block).not.toMatch(/\.delete\(|DELETE FROM|TRUNCATE/i)
  })

  it('a real payment is counted from PURCHASE types only — a manual grant is not real money', () => {
    // PAID_TX_TYPES includes manual_grant. Using it here would let a founder-granted credit
    // make a test account permanently undeletable, which is the wrong kind of safe.
    // COMMENTS STRIPPED — the comment in the route explains the choice BY NAMING the type
    // it rejected, and this guard failed on that. Fourth time in this codebase: a check that
    // forbids you from describing what you chose is a bad check.
    const src = readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')
      .split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
    const idx = src.indexOf("'/seed-report'")
    const block = src.slice(idx, idx + 3000)
    expect(block).toContain('PURCHASE_TX_TYPES')
    expect(block).not.toContain('PAID_TX_TYPES')
  })

  it('nothing in this module deletes anything', () => {
    // The classification decides; it must never be able to act. Execution lives behind the
    // arming gate, in a separate path, run only on the founder's explicit go.
    const src = readFileSync(join(__dirname, './seed-wipe.ts'), 'utf8')
    expect(src).not.toMatch(/\.delete\(|DROP |TRUNCATE|DELETE FROM/i)
  })
})
