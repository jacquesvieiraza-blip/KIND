// ⚑ 4 Oct (founder: "C. FIX") — sign-up refused a brief short of an ACCOUNT fact (country, or how
// many people work there) with "Milla still needs  before this brief can be confirmed." — naming
// nothing, because it listed only the eleven targeting facts. Milla's own confirm route was fixed
// on 16 Sep (S1-ONB-001); the sign-up route now names both classes the same way.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('a refused sign-up names what is missing', () => {
  it('the sentence is built from the complete list (targeting and account facts)', () => {
    const auth = readFileSync(join(__dirname, '../routes/auth.ts'), 'utf8')
    const at = auth.indexOf('const gate = mayConfirmBrief(draft)')
    const block = auth.slice(at, at + 900)
    expect(block).toContain('gate.missingLabels')
    expect(block).not.toMatch(/error: `Milla still needs \$\{gate\.missing\.map/)
  })
  it('the full-stack journey supplies the account facts sign-up requires', () => {
    const j = readFileSync(join(__dirname, '../../../../scripts/fullstack/journeys.mjs'), 'utf8')
    const setup = j.slice(j.indexOf("W.briefPut = await asClient('/milla/brief-draft'"), j.indexOf("W.briefConfirm = await asClient('/milla/brief-draft/confirm'"))
    expect(setup).toContain("country: 'United Kingdom'")
    expect(setup).toMatch(/"company_employees": \d+/)
  })
})
