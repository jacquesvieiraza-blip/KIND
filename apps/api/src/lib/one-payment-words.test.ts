// ═══════════════════════════════════════════════════════════════════════════════════════
// 25 Sep (R166 ③ · P10, board #2356) — MILLA AND VIDA SAY "ONE PAYMENT" TO A CLIENT ON THE NEW TERMS.
//
// A client who pays once must never be told about a second half, by the screen or by Milla.
// A programme already running keeps the two-payment words it bought. Words only (R167).
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  buildMillaChatSystem, buildLifecycleReassertion, lifecycleFor,
  PROGRAMME_LIFECYCLE, LIFECYCLE_RULES, PROGRAMME_LIFECYCLE_ONE_PAYMENT, LIFECYCLE_RULES_ONE_PAYMENT,
} from './milla-chat-system'
import type { CustomerProgramme } from './customer-programme'

const prog = (money: Partial<CustomerProgramme['money']>): CustomerProgramme => ({
  stage: 'Recommendation', quickAction: '', hasProgramme: true, programmeId: 'p', paused: false, pausedCopy: null,
  reviewOpen: false, terminal: null,
  outcome: { kind: 'meetings', target: 10, stated: null },
  progress: { delivered: 0, sourcingAuthorised: false, outcomesAchieved: 0 },
  money: { totalCents: 199_000, firstPaymentCents: 199_000, secondPaymentCents: 0, firstPaidAt: null, secondPaidAt: null,
    firstAuthorisedAt: null, secondAuthorisedAt: null, internalBilling: false, ...money },
} as unknown as CustomerProgramme)

describe('🛑 Milla, to a client who pays once', () => {
  const sys = buildMillaChatSystem(null, prog({ paysInFull: true }))

  it('gets the one-payment lifecycle and rules, and never the halves', () => {
    for (const step of PROGRAMME_LIFECYCLE_ONE_PAYMENT) expect(sys).toContain(step)
    for (const rule of LIFECYCLE_RULES_ONE_PAYMENT) expect(sys).toContain(rule)
    expect(sys).toContain('paid in ONE payment — there is no second payment')
    expect(sys).not.toContain(PROGRAMME_LIFECYCLE[6])       // "7. PAYMENT 2 — the remaining 50%…"
    expect(sys).not.toMatch(/paid in two halves/)
  })

  it('the re-assertion before the question says the same', () => {
    const re = buildLifecycleReassertion(true)
    expect(re).toContain(PROGRAMME_LIFECYCLE_ONE_PAYMENT[2])
    // The two-payment steps are absent. (The one-payment RULE itself names "a second half" in
    // order to forbid it, so this checks the steps, not the words.)
    expect(re).not.toContain(PROGRAMME_LIFECYCLE[2])
    expect(re).not.toContain(PROGRAMME_LIFECYCLE[6])
  })

  it('the one-payment sequence keeps its order and its distinct gates', () => {
    const at = (s: string) => sys.indexOf(s)
    const steps = PROGRAMME_LIFECYCLE_ONE_PAYMENT
    for (let i = 1; i < steps.length; i++) expect(at(steps[i])).toBeGreaterThan(at(steps[i - 1]))
    expect(steps[2]).toMatch(/SOURCING AND PREPARATION ONLY/)
    expect(steps[5]).toMatch(/No money is attached/)
  })
})

describe('⛓️ a programme already running (and "no programme block") keeps the two-payment words', () => {
  it('byte for byte', () => {
    expect(lifecycleFor(false)).toEqual({ steps: PROGRAMME_LIFECYCLE, rules: LIFECYCLE_RULES })
    expect(lifecycleFor(null)).toEqual({ steps: PROGRAMME_LIFECYCLE, rules: LIFECYCLE_RULES })
    const sys = buildMillaChatSystem(null, prog({ paysInFull: false, secondPaymentCents: 99_500, firstPaymentCents: 99_500 }))
    expect(sys).toContain(PROGRAMME_LIFECYCLE[6])
    expect(sys).toContain('paid in two halves')
  })
})

describe('a client with no programme yet', () => {
  it('is on one payment — unless House, which keeps the two-payment terms', async () => {
    const { paysInFullFor } = await import('./milla-chat-system')
    const none = (internalBilling: boolean) => ({ ...prog({ internalBilling, totalCents: 0 }), hasProgramme: false }) as CustomerProgramme
    expect(paysInFullFor(none(false))).toBe(true)
    expect(paysInFullFor(none(true))).toBe(false)
    expect(paysInFullFor(null)).toBeNull()
    expect(buildMillaChatSystem(null, none(false))).toContain(PROGRAMME_LIFECYCLE_ONE_PAYMENT[2])
    expect(buildMillaChatSystem(null, none(true))).toContain(PROGRAMME_LIFECYCLE[2])
  })
})

describe('the screens', () => {
  const read = (p: string) => readFileSync(join(__dirname, p), 'utf8')

  it('the client payload says paysInFull from the stored split — no new column on the hot read', () => {
    const cp = read('customer-programme.ts')
    expect(cp).toContain("paysInFull: Number(p.price_total_cents ?? 0) > 0 && Number(p.second_payment_cents ?? 0) === 0")
    expect(cp).not.toMatch(/select\([^)]*size_band/)
  })

  it('the calculator, the status card and Vida say one payment', () => {
    const calc = read('../../../portal/src/components/milla/ProgrammeCalculator.tsx')
    expect(calc).toContain("d.secondPaymentCents === 0 ? 'one payment' : 'split 50 / 50'")
    expect(calc).toContain('One payment · before we start')
    expect(calc).toContain('Accepting opens the one payment.')
    const ws = read('../../../portal/src/components/milla/ProgrammeWorkspace.tsx')
    expect(ws).toContain("p.money.paysInFull ? (p.money.firstPaidAt ? 'Paid in full'")
    const vida = read('../../../admin/src/app/vida/page.tsx')
    expect(vida).toContain("'Paid in full (one payment)'")
  })
})
