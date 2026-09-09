// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CLIENT COULD NOT PAY — and Milla is supposed to own the payment experience.
//
// 🛑 THE GAP. `/programmes/:id/checkout/first` and `/checkout/second` create correctly scoped
// Stripe sessions and always have. They live on `programmeRouter`, which sits behind the ADMIN
// KEY — so the only way to take a programme payment was for an operator to mint a link and send
// it by hand. There was no client door at all.
//
// ⚠️ NO NEW PAYMENT LOGIC EXISTS. The client routes call the SAME
// `createProgrammeCheckoutSession` with the same metadata and amounts. What is new is only WHO
// may ask, and how the programme is resolved — from the SESSION, never from the request.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const API = __dirname
const PORTAL = join(API, '..', '..', '..', 'portal', 'src')
const ROUTE = readFileSync(join(API, '..', 'routes', 'my-programme.ts'), 'utf8')
const PAY = readFileSync(join(PORTAL, 'components', 'milla', 'ProgrammePayment.tsx'), 'utf8')
const PAGE = readFileSync(join(PORTAL, 'app', '(milla)', 'milla', 'programme', 'page.tsx'), 'utf8')
const CUSTOMER = readFileSync(join(API, 'customer-programme.ts'), 'utf8')

const code = (s: string) => s.split('\n')
  .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*') })
  .join('\n')

const CHECKOUT = ROUTE.slice(ROUTE.indexOf('async function programmeCheckout'), ROUTE.indexOf("myProgrammeRouter.post('/approve'"))

describe('① the client has a door, and it reuses the existing rails', () => {
  it('both stages exist on the customer router', () => {
    expect(ROUTE).toContain("myProgrammeRouter.post('/checkout/first'")
    expect(ROUTE).toContain("myProgrammeRouter.post('/checkout/second'")
  })

  it('🛑 no new payment logic — the same session factory, the same stages', () => {
    expect(CHECKOUT).toContain("await import('../lib/programme-checkout')")
    expect(CHECKOUT).toContain('createProgrammeCheckoutSession({')
    expect(CHECKOUT).toContain("stage === 'programme_first'")
    // No amount is computed here; the factory derives it from the stored row.
    const c = code(CHECKOUT)
    for (const forbidden of ['price_total_cents', 'quoteProgramme', 'amount', 'unit_amount', '/ 2']) {
      expect(c.includes(forbidden), `the client checkout re-derives money via ${forbidden}`).toBe(false)
    }
  })
})

describe('② the programme is resolved from the SESSION, never the request', () => {
  it('🛑 no programme id is taken from the caller', () => {
    expect(CHECKOUT).toContain('const clientId = await getClientId(req.userId!)')
    expect(CHECKOUT).toContain('openProgrammeForSession(clientId)')
    // 🛑 A BODY-SUPPLIED ID WOULD LET A SIGNED-IN CUSTOMER MINT A CHECKOUT AGAINST SOMEBODY
    // ELSE'S PROGRAMME — with that programme's id in the metadata, and therefore that
    // programme's authority when the webhook lands.
    expect(/req\.body[^\n]*programme/i.test(CHECKOUT), 'a programme id is read from the request').toBe(false)
    expect(CHECKOUT.includes('req.params'), 'a programme id is read from the path').toBe(false)
  })

  it('the screen sends no programme id either', () => {
    const c = code(PAY)
    expect(c.includes('programmeId'), 'the payment screen sends a programme id').toBe(false)
    expect(c).toContain("`/my/programme/checkout/${stage}`")
  })
})

describe('③ a client is only asked for a half that is genuinely due', () => {
  it('the first half is refused once paid, once internally authorised, or in the wrong state', () => {
    // ⛓️ RETARGETED 9 Sep — through the canonical helpers, not the columns. Reading
    // `first_authorised_at` in a route would restate "who owes what" in a second place AND
    // breach the internal-authority allowlist, which exists so a fourth module cannot invent
    // its own answer. The duty is unchanged.
    expect(CHECKOUT).toContain('if (firstPaid(p)) {')
    expect(CHECKOUT).toContain('if (firstInternallyAuthorised(p)) {')
    expect(CHECKOUT).toContain("p.status !== 'RECOMMENDED' && p.status !== 'AWAITING_FIRST_PAYMENT'")
  })

  it('the second half uses the SAME gate the operator door uses', () => {
    // Restating the rule loosely here is how a client pays for a stage the programme is not in.
    expect(CHECKOUT).toContain('maySecondCharge(p)')
    expect(CHECKOUT).toContain('if (secondInternallyAuthorised(p)) {')
  })

  it('🛑 AN INTERNALLY AUTHORISED PROGRAMME IS NEVER SHOWN A PRICE TO PAY', () => {
    // House owes nothing. Asking it for money would be a fabricated debt on a client screen.
    expect(PAGE).toContain('!p.money.firstAuthorisedAt')
    expect(PAGE).toContain('!p.money.secondAuthorisedAt')
  })

  it('the second half appears only after approval and before live', () => {
    expect(PAGE).toContain('p.approvedAt && !p.wentLiveAt')
  })

  it('a missing email fails closed rather than creating a receipt-less checkout', () => {
    expect(CHECKOUT).toContain("error: 'no_email'")
    expect(CHECKOUT).toContain('Nothing was charged.')
  })
})

describe('④ the authority helpers live where the columns do', () => {
  it('🛑 the route names no authority column of its own', () => {
    // The allowlist caught the first cut of this. One definition of "settled without money",
    // in the module that owns the columns.
    for (const col of ['first_authorised_at', 'second_authorised_at', 'first_payment_ref']) {
      expect(code(CHECKOUT).includes(col), `the client checkout names ${col} directly`).toBe(false)
    }
    const PROGRAMME = readFileSync(join(API, 'programme.ts'), 'utf8')
    expect(PROGRAMME).toContain('export function firstInternallyAuthorised')
    expect(PROGRAMME).toContain('export function secondInternallyAuthorised')
  })
})

describe('④b Milla never divides a price', () => {
  it('both halves come from the stored row', () => {
    expect(CUSTOMER).toContain('firstPaymentCents: Number(p.first_payment_cents ?? 0)')
    expect(CUSTOMER).toContain('secondPaymentCents: Number(p.second_payment_cents ?? 0)')
  })

  it('🛑 the screen computes no amount of its own', () => {
    const c = code(PAY)
    expect(c.includes('/ 2'), 'the payment screen halves a price').toBe(false)
    expect(c.includes('Math.'), 'the payment screen does arithmetic on money').toBe(false)
    expect(c).toContain('programmeMoney(halfCents)')
  })

  it('it says what the money buys, and that the first half is not outreach', () => {
    expect(PAY).toContain('Nothing is sent until you have seen the work and approved it.')
  })
})

describe('⑤ paying is not starting', () => {
  it('🛑 the route grants nothing — the webhook remains the authority', () => {
    const c = code(CHECKOUT)
    for (const forbidden of ['recordFirstPayment', 'recordSecondPayment', 'setStatus', '.update(',
                             'first_paid_at:', 'second_paid_at:', 'startProgrammeAfterP1', 'goLiveProgramme']) {
      expect(c.includes(forbidden), `the client checkout reaches ${forbidden}`).toBe(false)
    }
  })

  it('the screen only ever opens a checkout', () => {
    const posts = [...code(PAY).matchAll(/api\.post<[^>]*>\(\s*`?([^`',]+)/g)].map(m => m[1])
    expect(posts.length).toBe(1)
    expect(posts[0]).toContain('/my/programme/checkout/')
  })
})
