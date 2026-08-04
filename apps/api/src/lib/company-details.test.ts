// #615 — VAT EVIDENCE AT ONBOARDING.
//
// We are a UK Ltd. For a BUSINESS customer the place of supply is where the customer belongs,
// so an overseas business is outside UK VAT and an EU business self-accounts under the reverse
// charge — **but only if we hold proof they are a business.** No proof, and they are treated as
// a consumer, and VAT is charged.
//
// Today `company_registration` and `vat_number` are optional fields on a Settings page nobody
// is required to visit, so the default state of every client is *undocumented* — the state that
// costs 20%.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  parseCompanyDetails, hasCompanyDetails, vatStatus, vatBadge, NOT_VAT_REGISTERED,
} from '@kind/shared'
import { stripCommentsForEnvScan } from './env-inventory'

const GOOD = { company_name: 'Rivo Systems Ltd', company_registration: '12345678', vat_number: 'GB123456789' }

// ── RED PROOF ① — an empty step is REFUSED ───────────────────────────────────────────────
describe('onboarding refuses an empty company step', () => {
  it('all three empty → refused, with every problem named at once', () => {
    const r = parseCompanyDetails({})
    expect(r.ok).toBe(false)
    if (!r.ok) {
      // A form that reveals its objections one at a time is a form you fill in four times.
      expect(r.errors).toHaveLength(3)
      expect(r.errors.join(' ')).toMatch(/legal name/i)
      expect(r.errors.join(' ')).toMatch(/registration number/i)
      expect(r.errors.join(' ')).toMatch(/VAT or tax registration/i)
    }
  })

  it('a good submission passes', () => {
    const r = parseCompanyDetails(GOOD)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.vat_number).toBe('GB123456789')
  })

  it('a one-character name or number is not an answer', () => {
    const r = parseCompanyDetails({ ...GOOD, company_name: 'R', company_registration: '1' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.length).toBe(2)
  })

  it('whitespace is not an answer either', () => {
    expect(parseCompanyDetails({ company_name: '   ', company_registration: '  ', vat_number: ' ' }).ok).toBe(false)
  })
})

// ── RED PROOF ② — "not registered" is an ANSWER, never a blank ───────────────────────────
describe('the sole-trader path records an explicit answer', () => {
  it('the tick completes the step and stores the sentinel', () => {
    // Blank means NOBODY ASKED. The sentinel means WE ASKED AND THIS IS THE ANSWER. Those are
    // different facts with different invoice treatment, so they must be different values.
    const r = parseCompanyDetails({ company_name: 'Jo Bloggs Consulting', company_registration: 'SP99887', not_vat_registered: true })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.vat_number).toBe(NOT_VAT_REGISTERED)
  })

  it('accepts the string "true" as well as the boolean — form posts send strings', () => {
    const r = parseCompanyDetails({ ...GOOD, vat_number: '', not_vat_registered: 'true' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.vat_number).toBe(NOT_VAT_REGISTERED)
  })

  it('REFUSES ticking the box AND supplying a number — both cannot be true', () => {
    const r = parseCompanyDetails({ ...GOOD, not_vat_registered: true })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join(' ')).toMatch(/cannot both be true/i)
  })

  it('REFUSES typing the sentinel by hand — that would forge the answer', () => {
    const r = parseCompanyDetails({ ...GOOD, vat_number: NOT_VAT_REGISTERED })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join(' ')).toMatch(/reserved value/i)
  })

  it('the three states are distinguishable afterwards', () => {
    expect(vatStatus({ vat_number: 'GB123456789' })).toBe('registered')
    expect(vatStatus({ vat_number: NOT_VAT_REGISTERED })).toBe('not_registered')
    expect(vatStatus({ vat_number: null })).toBe('unknown')
    expect(vatStatus({ vat_number: '  ' })).toBe('unknown')
  })

  it('the operator badge distinguishes "declared none" from "never asked"', () => {
    // These look the same on a screen that only checks for a value, and they are not the same:
    // one is evidence, the other is a gap to chase.
    expect(vatBadge({ vat_number: NOT_VAT_REGISTERED }).tone).toBe('grey')
    expect(vatBadge({ vat_number: null }).tone).toBe('amber')
    expect(vatBadge({ vat_number: null }).label).toBe('no tax ID')
    expect(vatBadge({ vat_number: 'GB1' }).tone).toBe('ok')
  })
})

// ── RED PROOF ③ — EXISTING CLIENTS ARE NOT BROKEN ────────────────────────────────────────
describe('a client who signed up before this existed still works', () => {
  it('hasCompanyDetails simply returns false — it never throws on an old row', () => {
    expect(hasCompanyDetails(null)).toBe(false)
    expect(hasCompanyDetails(undefined)).toBe(false)
    expect(hasCompanyDetails({})).toBe(false)
    expect(hasCompanyDetails({ company_name: 'Rivo' })).toBe(false)
    expect(hasCompanyDetails({ ...GOOD })).toBe(true)
    expect(hasCompanyDetails({ company_name: 'Jo', company_registration: 'SP1', vat_number: NOT_VAT_REGISTERED })).toBe(true)
  })

  it('the general settings PATCH keeps these fields OPTIONAL', () => {
    // Making them required on /clients/me would break every existing client the first time
    // they changed their phone number — a far worse bug than the one this fixes.
    const src = stripCommentsForEnvScan(readFileSync(join(__dirname, '../routes/clients.ts'), 'utf8'))
    const patch = src.slice(src.indexOf("clientRouter.patch('/me'"), src.indexOf("clientRouter.patch('/me'") + 1200)
    expect(patch).toContain('company_registration: z.string().optional()')
    expect(patch).toContain('vat_number:           z.string().optional()')
  })

  it('NOTHING in the money path gates on company details', () => {
    // The one rule that keeps this from becoming an outage: an approval, a payment or a send
    // must never consult it. Enforcement beyond onboarding is a founder decision.
    for (const f of ['approve-lead.ts', 'figsy.ts', 'start-work.ts']) {
      const p = join(__dirname, f)
      let src = ''
      try { src = readFileSync(p, 'utf8') } catch { continue }
      expect(stripCommentsForEnvScan(src), `${f} must not gate on company details`).not.toContain('hasCompanyDetails')
    }
  })
})

describe('the endpoint is wired and checks its write', () => {
  const src = stripCommentsForEnvScan(readFileSync(join(__dirname, '../routes/clients.ts'), 'utf8'))
  const route = src.slice(src.indexOf("clientRouter.post('/company-details'"), src.indexOf("clientRouter.patch('/me'"))

  it('the route exists', () => {
    expect(src).toContain("clientRouter.post('/company-details'")
  })

  it('it validates through the shared parser rather than re-implementing the rules', () => {
    expect(route).toContain('parseCompanyDetails')
  })

  it('the write is CHECKED — supabase-js returns { error } rather than throwing', () => {
    expect(route).toContain('if (error)')
    expect(route).toMatch(/were NOT saved/)
  })

  it('it returns every validation problem, not just the first', () => {
    expect(route).toContain('errors: parsed.errors')
  })
})
