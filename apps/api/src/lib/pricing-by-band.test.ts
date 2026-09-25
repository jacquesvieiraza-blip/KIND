// ═══════════════════════════════════════════════════════════════════════════════════════
// 25 Sep (R166 ① ④ · P8, board #2354) — PRICE BY SIZE BAND: $99 / $199 / $299 FLAT, LIMITS 300 / 300 / 400.
//
// Founder: "99 for founders. 199 for growth. and 299 for enterprise" · "No, flat price per
// meeting" · limits "300 Founders, 400 Enterprise" and "300" for Growth. Programmes already
// running (House included) keep the R81 curve they bought.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  quoteProgramme, BAND_PRICE_PER_MEETING_USD, sourcingCeiling, BAND_LEADS_LIMIT_PER_MEETING,
  shortfallCreditCents, calculateProgramme, LEADS_PER_TARGETED_MEETING,
} from '@kind/shared'

describe('the founder\'s prices, flat', () => {
  it('$99 · $199 · $299 per qualified meeting — no volume discount', () => {
    expect(BAND_PRICE_PER_MEETING_USD).toEqual({ founders: 99, growth: 199, enterprise: 299 })
    for (const m of [1, 7, 10, 50, 120]) {
      expect(quoteProgramme(m, 'founders').totalCents).toBe(m * 9_900)
      expect(quoteProgramme(m, 'growth').totalCents).toBe(m * 19_900)
      expect(quoteProgramme(m, 'enterprise').totalCents).toBe(m * 29_900)
      expect(quoteProgramme(m, 'growth').pricePerMeetingCents).toBe(19_900)
    }
    const q = quoteProgramme(10, 'founders')
    expect(q).toMatchObject({ band: 'founders', pricePerMeetingUsd: 99, recommendedVolume: 10 * LEADS_PER_TARGETED_MEETING })
    expect(q.firstPaymentCents + q.secondPaymentCents).toBe(q.totalCents)
  })

  it('⛓️ no band is the R81 curve, unchanged — what running programmes and House keep', () => {
    expect(quoteProgramme(1).totalCents).toBe(45_000)
    expect(quoteProgramme(3).totalCents).toBe(134_167)
    expect(quoteProgramme(3, null)).toEqual(quoteProgramme(3))
  })

  it('an invalid target is still refused with a band', () => {
    expect(() => quoteProgramme(0, 'growth')).toThrow()
    expect(() => quoteProgramme(2.5, 'enterprise')).toThrow()
  })

  it('the calculator prices on the band it is given', () => {
    expect(calculateProgramme({ meetings: 10, band: 'enterprise' }).totalCents).toBe(299_000)
    expect(calculateProgramme({ meetings: 10 }).totalCents).toBe(quoteProgramme(10).totalCents)
  })
})

describe('the limit per meeting, by band — never disclosed', () => {
  it('300 · 300 · 400; no band stays 400', () => {
    expect(BAND_LEADS_LIMIT_PER_MEETING).toEqual({ founders: 300, growth: 300, enterprise: 400 })
    expect(sourcingCeiling(10, 'founders')).toBe(3_000)
    expect(sourcingCeiling(10, 'growth')).toBe(3_000)
    expect(sourcingCeiling(10, 'enterprise')).toBe(4_000)
    expect(sourcingCeiling(10)).toBe(4_000)
    // Every limit stays above the 250 plan, so no programme stops where it was meant to succeed.
    for (const v of Object.values(BAND_LEADS_LIMIT_PER_MEETING)) expect(v).toBeGreaterThan(LEADS_PER_TARGETED_MEETING)
  })
})

describe('🛑 the shortfall credit uses the programme\'s OWN price', () => {
  it('a $99 programme that delivered 7 of 10, fully paid, is owed 3 × $99 — not a curve figure', () => {
    expect(shortfallCreditCents(10, 7, 99_000, 9_900)).toBe(29_700)
    expect(shortfallCreditCents(10, 10, 99_000, 9_900)).toBe(0)
    expect(shortfallCreditCents(10, 12, 99_000, 9_900)).toBe(0)   // over-delivery is not billed
    expect(shortfallCreditCents(10, 0, 49_500, 9_900)).toBe(49_500) // never more than was collected
  })
  it('without a flat price it is exactly the R136 ⑤ curve rule', () => {
    expect(shortfallCreditCents(10, 7, 437_500)).toBe(437_500 - Math.round(7 * 437.5 * 100))
  })
})

// ── THE DOORS — the band comes from the client's record, never from the browser ──────────────
const state = vi.hoisted(() => ({ terms: { kind: 'band', band: 'growth' } as Record<string, unknown> }))
vi.mock('./client-size', () => ({ pricingTermsFor: async () => state.terms }))

describe('🛑 who decides the band', () => {
  beforeEach(() => { state.terms = { kind: 'band', band: 'growth' } })

  it('the calculator route reads the session client\'s terms, and refuses with a sentence when pending', () => {
    const src = readFileSync(join(__dirname, '../routes/my-programme.ts'), 'utf8')
    const at = src.indexOf("myProgrammeRouter.get('/calculator'")
    const body = src.slice(at, at + 2400)
    expect(body).toContain('pricingTermsFor(clientId)')
    expect(body).toContain("band: terms.kind === 'band' ? terms.band : null")
    expect(body).toContain("code: 'price_pending'")
    expect(body).not.toMatch(/req\.query\.band/)
  })

  it('choosing and creating a programme price on the record\'s band and store it', () => {
    const choice = readFileSync(join(__dirname, 'client-programme-choice.ts'), 'utf8')
    expect(choice).toContain('calculateProgramme({ ...inputs, band })')
    expect(choice).toContain('size_band: band,')
    const prog = readFileSync(join(__dirname, 'programme.ts'), 'utf8')
    const at = prog.indexOf('export async function createProgramme(')
    const fn = prog.slice(at, at + 4000)
    expect(fn).toContain('quoteProgramme(meetings, band)')
    expect(fn).toContain('size_band: band,')
    expect(fn).toContain("if (terms.kind === 'pending') return { ok: false, reason: terms.message }")
  })

  it('the paid path opens the band\'s ceiling; the credit reads the stored flat price', () => {
    const prog = readFileSync(join(__dirname, 'programme.ts'), 'utf8')
    const at = prog.indexOf('export async function recordFirstPayment(')
    expect(prog.slice(at, at + 6000)).toContain('bandSourcingCeiling(p) ?? sourcingCeiling(p.meeting_target)')
    expect(prog).toContain('shortfallCreditCents(p.meeting_target, deliveredMeetings, collectedCents, flat)')
  })
})
