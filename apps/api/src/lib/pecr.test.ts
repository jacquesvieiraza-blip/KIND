// #617 — WE MUST NOT COLD-EMAIL A UK SOLE TRADER.
//
// UK PECR reg. 22 bans unsolicited marketing email to INDIVIDUAL subscribers. Limited companies
// are exempt — that exemption is the entire legal basis for B2B cold email — but a UK sole
// trader is an individual subscriber and needs consent. Nothing in the pipeline ever asked
// whether a "company" is one person trading under a name: every other gate is about the COPY or
// the CONTACT, and none of them is about WHO WE ARE ALLOWED TO WRITE TO.
//
// ⚠️ EVERY PROOF RUNS BOTH DIRECTIONS. A test that only shows the sole trader refused would pass
// just as happily if the gate refused EVERYONE and killed all outreach — so each refusal is
// paired with the corporate lead that must still enrol.
//
// ⚠️ THE WORD-BOUNDARY CASES ARE THE POINT, NOT PEDANTRY. `includes('ltd')` passes "Salted
// Foods" and `includes('inc')` passes "Reinc Media" — and a substring match here does not merely
// misclassify, it hands a sole trader a corporate exemption they do not have. That is the breach.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { pecrVerdict, pecrSkipReason, hasCorporateMarker, isUkCountry } from './pecr'
import { stripCommentsForEnvScan } from './env-inventory'

describe('pecrVerdict — who is the subscriber?', () => {
  it('THE CASE THIS EXISTS FOR — a UK sole trader is REFUSED', () => {
    const v = pecrVerdict({ country: 'United Kingdom', companyName: 'Sarah Jones Consulting' })
    expect(v.allow).toBe(false)
    expect(v.class).toBe('individual_risk')
    expect(v.reason).toContain('sole trader')
  })

  it('THE OTHER DIRECTION — a UK limited company STILL ENROLS', () => {
    // Without this, refusing every UK lead would pass the test above and kill the whole book.
    const v = pecrVerdict({ country: 'United Kingdom', companyName: 'Acme Ltd' })
    expect(v.allow).toBe(true)
    expect(v.class).toBe('corporate')
  })

  it('every UK spelling we actually see in the data is caught', () => {
    for (const c of ['UK', 'uk', ' United Kingdom ', 'GB', 'Great Britain', 'England', 'Scotland', 'Wales', 'Northern Ireland']) {
      expect(pecrVerdict({ country: c, companyName: 'Jane Smith Design' }).allow,
        `${c} must be treated as UK`).toBe(false)
    }
  })

  it('non-UK leads are OUT OF SCOPE — PECR is UK law, and the ICP is US + Africa', () => {
    for (const c of ['United States', 'USA', 'South Africa', 'Nigeria', 'Kenya', 'Germany']) {
      const v = pecrVerdict({ country: c, companyName: 'Bob Smith Consulting' })
      expect(v.allow, `${c} must not be refused`).toBe(true)
      expect(v.class).toBe('out_of_scope')
    }
  })

  it('a missing country SENDS but is NAMED — suppressing it would delete most of the book', () => {
    for (const c of [null, undefined, '', '   ']) {
      const v = pecrVerdict({ country: c, companyName: 'Someone Consulting' })
      expect(v.allow).toBe(true)
      expect(v.class).toBe('unknown_country')
    }
  })

  it('a demo account is out of scope — drafted only, never sent (#453)', () => {
    const v = pecrVerdict({ country: 'United Kingdom', companyName: 'Sole Trader Co', isDemo: true })
    expect(v.allow).toBe(true)
  })

  it('a UK lead with NO company name at all is refused — absence is not evidence', () => {
    expect(pecrVerdict({ country: 'UK', companyName: null }).allow).toBe(false)
    expect(pecrVerdict({ country: 'UK', companyName: '' }).allow).toBe(false)
  })

  it('the skip reason names the company AND the country, so an operator can act on it', () => {
    const r = pecrSkipReason(pecrVerdict({ country: 'England', companyName: 'Sarah Jones Consulting' }))
    expect(r).toContain('pecr_individual_risk')
    expect(r).toContain('Sarah Jones Consulting')
    expect(r).toContain('England')
  })
})

describe('hasCorporateMarker — word boundaries, because a substring match IS the breach', () => {
  it('REFUSES the substring traps', () => {
    // "Salted" contains ltd. "Reinc"/"Vincent"/"Principal" contain inc. Every one of them is a
    // name that evidences nothing — and a naive includes() would exempt all four.
    for (const n of ['Salted Foods', 'Reinc Media', 'Vincent & Co', 'Principal Partners', 'Ablaze Studio', 'Sabbatical']) {
      expect(hasCorporateMarker(n), `${n} must NOT read as corporate`).toBe(false)
    }
  })

  it('ACCEPTS a real marker however it is punctuated', () => {
    for (const n of ['Acme Ltd', 'Acme Ltd.', 'Acme (Ltd)', 'Acme,Ltd', 'ACME LIMITED', 'Bright PLC', 'Reed LLP', 'Foo GmbH', 'Bar Pty', 'Baz Oy']) {
      expect(hasCorporateMarker(n), `${n} must read as corporate`).toBe(true)
    }
  })

  it('an empty or missing name evidences nothing', () => {
    expect(hasCorporateMarker(null)).toBe(false)
    expect(hasCorporateMarker('')).toBe(false)
    expect(hasCorporateMarker('   ')).toBe(false)
  })
})

describe('isUkCountry', () => {
  it('does not match a country that merely contains a UK word', () => {
    // "New England" is not England; a naive substring check would make it so.
    expect(isUkCountry('New England')).toBe(false)
    expect(isUkCountry('United States')).toBe(false)
  })
})

// ── THE WIRING — a gate nothing calls is not a gate ───────────────────────────────────────
describe('both enrol routes ask, BEFORE the charge', () => {
  const src = stripCommentsForEnvScan(readFileSync(join(__dirname, '../routes/figsy.ts'), 'utf8'))

  it('the PECR check appears in BOTH enrol paths, not just the first', () => {
    // Two enrol routes exist (the authed path and the webhook path) and #612 had to be applied
    // to both for exactly this reason: a gate on one path is not a gate.
    const hits = src.split('pecrVerdict({').length - 1
    expect(hits, 'both enrol paths must ask').toBe(2)
  })

  it('asks BEFORE chargeFigsyEnroll on every path — never charge for a lead we refuse (#332)', () => {
    // Bounded per occurrence: for each PECR call, the NEXT charge must come after it. A
    // whole-file index compare would pass on one correct path and one broken one.
    let from = 0
    for (let i = 0; i < 2; i++) {
      const askAt = src.indexOf('pecrVerdict({', from)
      expect(askAt, `PECR call ${i + 1} must exist`).toBeGreaterThan(-1)
      const chargeAt = src.indexOf('chargeFigsyEnroll(', askAt)
      expect(chargeAt, `PECR call ${i + 1} must be followed by a charge`).toBeGreaterThan(-1)
      expect(askAt, `PECR call ${i + 1} must precede its charge`).toBeLessThan(chargeAt)
      from = chargeAt
    }
  })

  it('names the skip through the shared helper — two routes must not word it differently', () => {
    expect(src.split('pecrSkipReason(').length - 1).toBe(2)
  })
})

describe('the send-time safety net', () => {
  const src = stripCommentsForEnvScan(readFileSync(join(__dirname, 'figsy.ts'), 'utf8'))
  const fn = src.slice(src.indexOf('export async function sendSequenceEmail'))
  const body = fn.slice(0, fn.indexOf('export async function', 20))

  it('sendSequenceEmail asks PECR — it catches rows the enrol gate never saw', () => {
    expect(body).toContain('pecrVerdict({')
  })

  it('the opt-out net is UNTOUCHED — this is an additional check, not a replacement', () => {
    expect(body).toContain('opt_out_blocklist')
    expect(body).toContain("status: 'opted_out'")
  })

  it('a suppressed row is stood down, not left due to re-fire every run (#349/#453)', () => {
    const at = body.indexOf('pecrVerdict({')
    const window = body.slice(at, body.indexOf('#15', at) === -1 ? at + 1200 : body.indexOf('#15', at))
    expect(window).toContain('next_send_at: null')
    expect(window).toContain("return 'suppressed'")
  })
})

describe('the THIRD enrol path — autoEnrollLead, the one a client approval takes', () => {
  const src = stripCommentsForEnvScan(readFileSync(join(__dirname, 'figsy.ts'), 'utf8'))
  const fn = src.slice(src.indexOf('export async function autoEnrollLead'))
  const body = fn.slice(0, fn.indexOf('export async function', 20))

  it('asks PECR — found while wiring #620, and it charges', () => {
    // approve-lead.ts calls this with { force: true, prepaid: true } when a CLIENT approves in
    // Milla. It is THE production enrol path, and it was not covered by the two route gates.
    expect(body).toContain('pecrVerdict({')
  })

  it('asks BEFORE the credit gate — a refused lead must cost neither a credit nor a draft', () => {
    // Without this ordering the client is charged for a lead we can never legally email, and the
    // enrollment sits suppressed forever: the charge-then-refuse #332 forbids.
    const askAt = body.indexOf('pecrVerdict({')
    const chargeGateAt = body.indexOf('canEnroll(client?.figsy_credits_remaining)')
    expect(askAt).toBeGreaterThan(-1)
    expect(chargeGateAt).toBeGreaterThan(-1)
    expect(askAt, 'PECR must be asked before the billing gate').toBeLessThan(chargeGateAt)
  })

  it('leaves the do-not-contact and CRM-dedup refusals untouched', () => {
    expect(body).toContain('isSuppressed({')
    expect(body).toContain('crm_dedup_enabled')
  })
})
