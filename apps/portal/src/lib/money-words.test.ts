// ═══════════════════════════════════════════════════════════════════════════════════════
// 28 Sep — SECTION B OF THE END-TO-END CHECK (R172): WHAT THE CLIENT READS AND PAYS.
//
// R166 ③ made a band programme ONE payment in full; the screens, the Stripe receipt and the
// notices kept describing two halves. And "Accept 1 meetings". Every sentence below is what a
// client on the new terms actually reads.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { meetingsPhrase, SHORTFALL_CREDIT_EXPIRY_DAYS } from '@kind/shared'
import { millaChangeLines, type MillaSyncFacts } from './programme-sync'

const portal = (f: string) => readFileSync(join(__dirname, '..', f), 'utf8')
const api = (f: string) => readFileSync(join(__dirname, '../../../api/src', f), 'utf8')

describe('B6 · one meeting is "1 meeting"', () => {
  it('the one helper decides the plural', () => {
    expect(meetingsPhrase(1)).toBe('1 qualified meeting')
    expect(meetingsPhrase(2)).toBe('2 qualified meetings')
    expect(meetingsPhrase(1, '')).toBe('1 meeting')
    expect(meetingsPhrase(50, '')).toBe('50 meetings')
  })
  it('the price screen, Billing and the Stripe receipt all use it — no "N meetings" template left', () => {
    const calc = portal('components/milla/ProgrammeCalculator.tsx')
    expect(calc).not.toMatch(/Accept \$\{[^}]*\} meetings/)
    expect(calc).not.toContain('{d.meetings} qualified meetings')
    expect(portal('app/(milla)/milla/billing/page.tsx')).not.toContain('booked meetings')
    expect(api('lib/programme-checkout.ts')).not.toContain('${params.meetings} targeted booked meetings')
  })
})

describe('🛑 B1 · a one-payment programme is never described in halves', () => {
  it('Billing shows ONE card, from the stored amounts', () => {
    const b = portal('app/(milla)/milla/billing/page.tsx')
    expect(b).toContain('const oneInFull = !!p && (p.money.paysInFull === true')
    expect(b).toContain('>One payment</span>')
    expect(b).toContain('Nothing else is due.')
    expect(b).toContain('first: p.money.firstPaymentCents ??')
  })
  it('ROI and Performance say "paid in full" and "once you approve"', () => {
    expect(portal('app/(milla)/milla/roi/page.tsx')).toContain("(p.money.firstPaidAt ? 'Paid in full' : 'One payment, not yet paid')")
    expect(portal('app/(milla)/milla/performance/page.tsx')).toContain('Outreach starts once you approve the prepared programme.')
  })
})

describe('B2 · the Stripe receipt names what was bought', () => {
  it('"paid in full" for a band programme, and qualified meetings', () => {
    const c = api('lib/programme-checkout.ts')
    expect(c).toContain("(${params.band ? 'paid in full' : 'first 50%'})")
  })
})

describe('🛑 B3 · after the one payment Milla does not say "it goes live next"', () => {
  const base: MillaSyncFacts = { stage: 'Recommendation', firstAt: null, secondAt: null, approvedAt: null, wentLiveAt: null, paused: false }
  it('P1 and P2 landing together (one payment) → only the first notice', () => {
    const lines = millaChangeLines(base, { ...base, stage: 'Sourcing', firstAt: '2026-09-28T10:00:00.000Z', secondAt: '2026-09-28T10:00:00.001Z' })
    expect(lines.map(l => l.kind)).toEqual(['first'])
  })
  it('a real second payment on a 50/50 programme is still announced', () => {
    const paid1 = { ...base, firstAt: '2026-09-20T10:00:00Z' }
    expect(millaChangeLines(paid1, { ...paid1, secondAt: '2026-09-27T10:00:00Z' }).map(l => l.kind)).toEqual(['second'])
  })
})

describe('B4 · a refund returns the credit and earns no commission', () => {
  const prog = api('lib/programme.ts')
  it('the credit a refunded payment used goes back to the wallet, once', () => {
    expect(prog).toContain('export async function returnRefundedWalletCredit(programmeId: string)')
    expect(prog).toContain('reference: `programme-refund-credit:${programmeId}`')
    expect(prog).toContain("if (rowErr.code === '23505') return { returnedCents: 0 }   // already returned")
    expect(api('routes/stripe.ts')).toContain("if (r.ok && kind === 'refund') await returnRefundedWalletCredit(meta.programmeId)")
  })
  it('refunded or disputed money is not revenue', () => {
    expect(prog).toContain('const revenueCents = p.disputed_at ? 0 : paidRevenueCents')
  })
})

describe('B5 · the credit line says how long it lasts', () => {
  it('90 days, from the one shared number the stamp also uses', () => {
    expect(SHORTFALL_CREDIT_EXPIRY_DAYS).toBe(90)
    expect(portal('components/milla/ProgrammeWorkspace.tsx')).toContain('and can be used for ${SHORTFALL_CREDIT_EXPIRY_DAYS} days')
    expect(api('lib/shortfall-credit.ts')).toContain("import { SHORTFALL_CREDIT_EXPIRY_DAYS } from '@kind/shared'")
  })
})

describe('B7 · the website band wording is the founder\'s own, and the code reads it right', () => {
  // ⛓️ 1 Oct (R182 · W-2) — WAS '"200+" stays (R166, verbatim)'. The founder then ruled the label
  // "201+" ("all yes", W-2): 200 employees is Growth, so "200+" read as overlapping it.
  // ⛓️ 8 Oct (precision model, founder GO) — the website no longer prices by size: one setup fee and one
  // price per held meeting for every client, so it shows no band at all. The bands stay in the code for
  // programmes on the earlier terms, where Enterprise still starts above 200.
  it('the website shows no size band; the code\'s Enterprise band still starts above 200', () => {
    const site = readFileSync(join(__dirname, '../../../website/pricing.html'), 'utf8')
    expect(site).toContain('One price for every client.')
    expect(site, 'a size band is back on the website').not.toMatch(/Enterprise &mdash; 201\+ employees|\b20[01]\+/)
    expect(readFileSync(join(__dirname, '../../../../packages/shared/src/size-band.ts'), 'utf8'))
      .toContain("{ key: 'enterprise', label: 'Enterprise', min: 201, max: null }")
  })
})

describe('🛑 B8 · the amount paid must be the programme\'s price', () => {
  it('a mismatch records nothing, starts nothing, and tells the founder', () => {
    const s = api('routes/stripe.ts')
    const check = s.indexOf('if (prog && !prog.first_paid_at && paidCents + credit !== prog.first_payment_cents)')
    expect(check).toBeGreaterThan(-1)
    expect(check).toBeLessThan(s.indexOf('const r = await recordFirstPayment({'))
    expect(s).toContain("'A programme payment did not match its price — not recorded'")
  })
})
