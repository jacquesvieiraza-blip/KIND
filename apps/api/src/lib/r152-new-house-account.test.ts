// ═══════════════════════════════════════════════════════════════════════════════════════
// R152 (24 Sep) — A NEW HOUSE ACCOUNT. Founder: *"i would much rather build a new house
// account."* · asked to confirm `jacques.vieiraza+house@gmail.com` and GO: *"1. yes. 2. go"*.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { HOUSE_ACCOUNT_EMAIL, HOUSE_ACCOUNT_EMAILS, isHouseEmail } from '@kind/shared'

const code = (rel: string) => readFileSync(join(__dirname, rel), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('R152 · the new House login', () => {
  it('🛑 the new address is the House; the old one stays House only for its history', () => {
    expect(HOUSE_ACCOUNT_EMAIL).toBe('jacques.vieiraza+house@gmail.com')
    expect(isHouseEmail('  Jacques.Vieiraza+House@Gmail.com ')).toBe(true)
    expect(isHouseEmail('hello@get-kind.com')).toBe(true)
    expect(HOUSE_ACCOUNT_EMAILS[0]).toBe(HOUSE_ACCOUNT_EMAIL)
  })

  it('🛑 nobody else is House — not a lookalike, not empty', () => {
    for (const e of ['jacques.vieiraza@gmail.com', 'jacques.vieiraza+canary3221@gmail.com', 'house@get-kind.com', '', null, undefined]) {
      expect(isHouseEmail(e as string), String(e)).toBe(false)
    }
  })

  it('🛑 every House check in both apps reads the ONE list — no second typed address', () => {
    for (const f of ['./real-clients.ts', './provider-boundary.ts', './house-client.ts',
      '../../../admin/src/lib/revenue-exclusions.ts', '../../../admin/src/app/clients/page.tsx']) {
      const c = code(f)
      expect(c, f).not.toMatch(/=== HOUSE_ACCOUNT_EMAIL/)
      expect(c, f).not.toContain("'hello@get-kind.com'")
      expect(c, f).toContain('isHouseEmail')
    }
  })

  it('🛑 House accepts its programme with NO payment page — P1 is authorised in Vida', () => {
    const CALC = code('../../../portal/src/components/milla/ProgrammeCalculator.tsx')
    const skip = CALC.indexOf('if (internalBilling) { setBusy(false); return }')
    const pay = CALC.indexOf("'/my/programme/checkout/first'")
    expect(skip).toBeGreaterThan(-1)
    expect(skip, 'House reaches the checkout before it stops').toBeLessThan(pay)
    expect(code('../../../portal/src/app/(milla)/milla/programme/page.tsx'))
      .toContain('internalBilling={p.money.internalBilling === true}')
  })
})
