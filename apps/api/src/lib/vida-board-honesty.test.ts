// #619 — THE VIDA CLIENT BOARD MUST NOT LIE ABOUT MONEY OR SUSPENSION.
//
// Both faults were caught by the founder on a screenshot of the LIVE site, on our own account,
// and both are the same shape: a surface reading a value that means one thing and printing a
// sentence that means another.
//
// ① "Paid $299 ✓" on an account that has never paid us. `PAID_TX_TYPES` includes `manual_grant`
//    ON PURPOSE — it is what ENTITLES a comped account — so `hasFunded` is true for the house
//    account and the flow rail ticked step 2 as a payment. Entitlement is not evidence that
//    money arrived. Same class as #613: a money surface must never round up.
//
// ② A red SUSPEND badge on a cold-check-exempt account. #618 built `coldCheckExempt` and fixed
//    the CRON, then stopped — leaving three display copies asking `coldState` raw. #618's own
//    test file wrote the warning down (*"two copies of who is exempt"*) and this is that debt
//    coming due. The fix is not a fourth copy: `coldView` is now the ONE place the clock and
//    the exemption are combined, so a surface added next month inherits it.
//
// EVERY PROOF HERE RUNS BOTH DIRECTIONS. A test that only shows the house account is quiet
// would pass just as happily if the whole rule had been deleted — so each one is paired with
// the real client that must STILL be suspended, and the real payment that must STILL read paid.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { fundedVia, PAID_TX_TYPES, PURCHASE_TX_TYPES } from './onboarding-pack'
import { coldView, COLD_DAYS, WARN_DAYS } from './cold-client'
import { stripCommentsForEnvScan } from './env-inventory'

const HOUSE = 'house-client-id'
const REAL = 'a-real-paying-client'

// ── FAULT ① — A COMP IS NOT A PAYMENT ─────────────────────────────────────────────────────
describe('fundedVia — real money, a comp, or nothing', () => {
  it('a Stripe wallet top-up is REAL — it carries the session id as its reference', () => {
    // The shape `stripe.ts` actually writes: `type: 'wallet_topup', reference: session.id`.
    expect(fundedVia([{ type: 'wallet_topup', reference: 'cs_test_a1b2c3' }])).toBe('real')
    expect(fundedVia([{ type: 'purchase', reference: 'cs_live_x' }])).toBe('real')
    expect(fundedVia([{ type: 'credit_purchase', reference: 'cs_live_y' }])).toBe('real')
  })

  it('THE FOUNDER’S SCREENSHOT — a manual grant is a COMP, never a payment', () => {
    // This is the house account: $4,000 of hunting budget granted by us, to us. The board
    // ticked "Paid $299". Nobody paid anybody.
    expect(fundedVia([{ type: 'manual_grant', reference: null }])).toBe('comp')
  })

  it('a grant that happens to carry a reference is STILL a comp', () => {
    // `demo-mbf.ts` writes `reference: mbf_demo_grant_<id>` on a grant. A reference is not the
    // test — the TYPE is. Checking the reference first would have read this as real money.
    expect(fundedVia([{ type: 'manual_grant', reference: 'mbf_demo_grant_abc' }])).toBe('comp')
  })

  it('nothing at all is null — not "comp", which would imply we let them in', () => {
    expect(fundedVia([])).toBe(null)
    expect(fundedVia(null)).toBe(null)
    expect(fundedVia(undefined)).toBe(null)
  })

  it('a grant PLUS a real payment is real — they did pay us', () => {
    // Order must not matter: a comped account that later paid is a paying client.
    expect(fundedVia([
      { type: 'manual_grant', reference: null },
      { type: 'wallet_topup', reference: 'cs_test_paid' },
    ])).toBe('real')
    expect(fundedVia([
      { type: 'wallet_topup', reference: 'cs_test_paid' },
      { type: 'manual_grant', reference: null },
    ])).toBe('real')
  })

  it('a purchase row with NO provider reference resolves DOWNWARD, to comp', () => {
    // Stripe always writes a reference, so this row is hand-made. Ambiguity resolves toward
    // understating what came in — the board claiming money that never arrived is the failure
    // this was built to end.
    expect(fundedVia([{ type: 'wallet_topup', reference: null }])).toBe('comp')
    expect(fundedVia([{ type: 'wallet_topup', reference: '   ' }])).toBe('comp')
  })

  it('spending is not funding — charges and usage never count', () => {
    expect(fundedVia([{ type: 'wallet_charge', reference: 'lead:1' }])).toBe(null)
    expect(fundedVia([{ type: 'usage', reference: 'x' }])).toBe(null)
    expect(fundedVia([{ type: 'trial_bonus', reference: 'x' }])).toBe(null)
  })

  it('the two lists still disagree in the one way they are supposed to', () => {
    // If `manual_grant` ever joined PURCHASE_TX_TYPES, every comp above would read as real and
    // every assertion in this block would still pass on the old code. This is the guard.
    expect(PAID_TX_TYPES).toContain('manual_grant')
    expect(PURCHASE_TX_TYPES).not.toContain('manual_grant')
  })
})

// ── FAULT ② — THE EXEMPTION REACHES THE SCREEN ────────────────────────────────────────────
describe('coldView — the clock with the exemption already applied', () => {
  // The exact shape from the #618 audit: last approval ~59 days before send-day.
  const now = new Date('2026-08-25T09:00:00Z')
  const idle59 = '2026-06-27T00:00:00Z'

  it('THE FOUNDER’S SCREENSHOT — the house account is not suspended and does not say so', () => {
    const v = coldView({ lastApprovalAt: idle59, now, clientId: HOUSE, isDemo: false, houseClientId: HOUSE })
    expect(v.cold).toBe(false)
    expect(v.warn).toBe(false)
    expect(v.exempt).toBe(true)
    expect(v.label).not.toContain('Suspended')
    expect(v.label).toContain('exempt')
    expect(v.why.length).toBeGreaterThan(20)
  })

  it('THE OTHER DIRECTION — a real client on the SAME clock is still suspended', () => {
    // Without this, deleting the whole cold rule would pass the test above.
    const v = coldView({ lastApprovalAt: idle59, now, clientId: REAL, isDemo: false, houseClientId: HOUSE })
    expect(v.cold).toBe(true)
    expect(v.exempt).toBe(false)
    expect(v.label).toContain('Suspended')
    expect(v.daysIdle).toBeGreaterThan(COLD_DAYS)
  })

  it('the WARN badge is suppressed too — and still fires for a real client', () => {
    const at = new Date(now.getTime() - (WARN_DAYS + 1) * 86_400_000).toISOString()
    expect(coldView({ lastApprovalAt: at, now, clientId: HOUSE, isDemo: false, houseClientId: HOUSE }).warn).toBe(false)
    expect(coldView({ lastApprovalAt: at, now, clientId: REAL, isDemo: false, houseClientId: HOUSE }).warn).toBe(true)
  })

  it('a demo account is exempt, exactly as it was before #618', () => {
    expect(coldView({ lastApprovalAt: idle59, now, clientId: 'mbf', isDemo: true, houseClientId: HOUSE }).exempt).toBe(true)
  })

  it('FAILS OPEN — an unresolvable house account exempts nobody', () => {
    // Failing closed would silently exempt the whole book and quietly stop a rule that saves
    // real money. Open costs us a visible, one-click-undo pause on our own campaign.
    const v = coldView({ lastApprovalAt: idle59, now, clientId: HOUSE, isDemo: false, houseClientId: null })
    expect(v.exempt).toBe(false)
    expect(v.cold).toBe(true)
  })

  it('the day count SURVIVES the exemption — it is true and the operator wants it', () => {
    const v = coldView({ lastApprovalAt: idle59, now, clientId: HOUSE, isDemo: false, houseClientId: HOUSE })
    expect(v.daysIdle).toBeGreaterThan(COLD_DAYS)
    expect(v.label).toContain(String(v.daysIdle))
  })

  it('an exempt account that never approved anyone still reads honestly', () => {
    const v = coldView({ lastApprovalAt: null, now, clientId: HOUSE, isDemo: false, houseClientId: HOUSE })
    expect(v.cold).toBe(false)
    expect(v.neverStarted).toBe(true)
    expect(v.label).toContain('exempt')
  })
})

// ── THE WIRING — a guard nothing calls is not a guard ─────────────────────────────────────
describe('the worklist route actually asks', () => {
  const src = stripCommentsForEnvScan(readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8'))
  const route = src.slice(src.indexOf("operatorRouter.get('/worklist'"))
  const body = route.slice(0, route.indexOf('operatorRouter.', 20))

  it('is the route the board reads, and it was found', () => {
    expect(body.length).toBeGreaterThan(500)
  })

  it('serves funded_via, computed by the pure function', () => {
    expect(body).toContain('fundedVia(')
    expect(body).toContain('funded_via:')
  })

  it('does NOT compute the cold verdict raw — that is what put SUSPEND on our own account', () => {
    expect(body).not.toContain('coldState(')
    expect(body).toContain('coldView({')
  })

  it('resolves the house account ONCE, before the row loop', () => {
    const resolveAt = body.indexOf('resolveHouseClientId()')
    // `const out = rows.map(` — NOT bare `rows.map(`, which first matches `const ids =
    // rows.map(...)` forty lines earlier and would fail a correct build.
    const loopAt = body.indexOf('const out = rows.map(')
    expect(resolveAt).toBeGreaterThan(-1)
    expect(loopAt).toBeGreaterThan(-1)
    expect(resolveAt, 'the house lookup must sit outside the loop').toBeLessThan(loopAt)
  })

  it('resolves it by decideHouseClient, never by company name', () => {
    // resolveHouseClientId is the one permitted resolver (#584/#593 were both name matches).
    expect(body).not.toMatch(/company_name\s*===/)
  })

  it('LEAVES THE GATE ALONE — a comp still entitles, or the house account regresses', () => {
    // If `hasFunded` started excluding comps, `client-step.ts` would send Client Zero back to
    // step 2 "Waiting on their $299" — chasing ourselves for money we chose not to charge.
    expect(body).toContain('hasFunded: (paidN.get(id) ?? 0) > 0')
  })
})

describe('the system probe actually asks', () => {
  const src = stripCommentsForEnvScan(readFileSync(join(__dirname, 'system-probes.ts'), 'utf8'))

  it('reads the cold verdict through coldView, not raw', () => {
    expect(src).not.toContain('coldState(')
    expect(src).toContain('coldView({')
  })

  it('does not call a comped account "paid"', () => {
    expect(src).toContain('fundedVia(')
    expect(src).toContain('comped')
  })
})

// ── THE SCREEN — the two sentences the founder photographed ───────────────────────────────
describe('Vida renders the honest sentence', () => {
  const src = stripCommentsForEnvScan(
    readFileSync(join(__dirname, '../../../admin/src/app/vida/page.tsx'), 'utf8'))
  // ⚑ 4 Sep (UI-009) — the CLIENT ROWS moved to the operator nav's clients group; the flow
  // rail and the money sentences below did not. Each test reads the file it is about.
  const clients = stripCommentsForEnvScan(
    readFileSync(join(__dirname, '../../../admin/src/components/vida/VidaClients.tsx'), 'utf8'))

  it('the flow rail asks how the account was funded before labelling step 2', () => {
    // ⛓️ EXTENDED 3 Sep (C2) — ~~`flowStepLabel(n, label, selectedWork.funded_via)`~~ and
    // ~~`step === 2 && via === 'comp' ? 'Comped'`~~. #619's property is unchanged and still
    // asserted: step 2 is a MONEY SENTENCE and must not be printed without asking about the
    // money. C2 adds a second way for it to be false — a PROGRAMME client never bought the
    // $299 pack at all — so the label now takes the commercial model as well.
    expect(src).toContain('flowStepLabel(n, label, selectedWork.funded_via, modelView)')
    expect(src).toContain("via === 'comp' ? 'Comped' : label")
    expect(src, 'and a programme account is named as one').toContain("if (view === 'programme') return 'Programme'")
    // ⛓️ AND A THIRD WAY FOR STEP 2 TO BE FALSE, added 3 Sep: an UNREADABLE commercial model.
    // The label took a boolean, and a boolean has only one else — so a client whose model we had
    // explicitly failed to resolve was shown "Paid $299" through the legacy arm.
    expect(src).toContain("if (view === 'unresolved') return 'Model unresolved'")
  })

  it('a comped step 2 is NOT the green paid tick', () => {
    // The green tick is the "we got paid" signal on this rail. A comp gets neutral slate.
    expect(src).toContain("const comped = n === 2 && selectedWork.funded_via === 'comp'")
    // ⛓️ C2 — a PROGRAMME step 2 takes the same neutral slate, for the same reason: neither a
    // comp nor a programme is a pack payment, and only a pack payment earns the green tick.
    expect(src).toContain('const progStep = n === 2 && (programmeModel || unresolvedModel)')
    expect(src).toContain("(comped || progStep) && done ? 'bg-[#f1f0f4]")
    expect(src).toContain("{done ? ((comped || progStep) ? '·' : '✓') : n}")
  })

  it('THE PRICE IS NEVER HAND-TYPED — and #623 went further: it is no longer CALCULATED either', () => {
    // ⚠️ THIS ASSERTION WAS REWRITTEN BY #623, NOT DELETED. #619 fixed a hand-typed `99 + … * 4`
    // by interpolating the constants, and pinned that fix by asserting the arithmetic existed.
    // #623 then found the deeper fault: the figure should not be arithmetic AT ALL. Cash in is
    // now summed from the ledger, so asserting the old expression would pin the bug in place.
    //
    // The founder-locked invariant is unchanged and still asserted: no hand-typed price.
    expect(src).not.toMatch(/\?\s*99\s*\+/)
    // And the stronger one #623 added: the money figure comes from the ledger, not from counts.
    expect(src).toContain('money_in_usd')
  })

  it('a comped account still shows $0 in and says COMPED — now proven by the ledger, not a ternary', () => {
    // #619 special-cased comp to 0 in the render. #623 made that special case redundant:
    // `moneyInUsd` returns 0 for a manual_grant on its own, because a comp is not cash. The
    // two agree independently (asserted in money-in.test.ts), which is stronger than a ternary
    // — the render can no longer disagree with the ledger about what a comp is worth.
    expect(src).toContain("funded_via === 'comp' &&")
    expect(src).toContain('· comped')
  })

  // ⛓️ RETARGETED 9 Sep — THE COLD STATE MOVED FROM THE ROW TO THE CLIENT'S TRUTH PANEL.
  // The client row is locked at name · stage · needs you, so Suspended / Going quiet / exempt
  // came off it. The duty is unchanged and is #619's: an EXEMPT account must never be shown as
  // suspended. It is now on the Account card, which states the real state or says nothing.
  it('the console shows the cold state honestly, and never a red badge on an exempt account', () => {
    const CONSOLE = readFileSync(join(__dirname, '..', '..', '..', 'admin', 'src', 'app', 'vida', 'page.tsx'), 'utf8')
    const at = CONSOLE.indexOf('const accountCard = useMemo(')
    const block = CONSOLE.slice(at, CONSOLE.indexOf('}, [selectedClient', at))
    expect(block, 'the suspended state is gone from the product').toContain('cold?.cold')
    expect(block, 'the going-quiet state is gone from the product').toContain('cold?.warn')
    // 🛑 #619 — THE API APPLIES THE EXEMPTION, so an exempt account reaches here with neither
    // flag set and draws nothing at all. The console must not re-derive it.
    expect(block, 'the console re-derives the exemption itself').not.toContain('exempt ?')
  })
})
