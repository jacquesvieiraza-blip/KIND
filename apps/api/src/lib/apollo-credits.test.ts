// ── XC-8 · THE CREDIT BALANCE IS READ, OR IT IS NOT REPORTED ────────────────────
//
// With FD-6, Apollo is the only lead source, so this is the one number that decides whether
// a Proof set or a programme batch can be delivered. The release checklist reads it before a
// certification run.
//
// 🛑 SO THE FAILURE MODE THAT MATTERS IS NOT "CANNOT PARSE" — IT IS "PARSED THE WRONG POOL".
// The same response carries direct-dial, export and AI credit pools, and those are different
// currencies. Reporting a dial balance as the lead balance would authorise a run that cannot
// finish, which is the "$138 · verified" defect exactly: a number nobody checked against the
// thing it claims to measure. Every case below is about refusing to guess.

import { describe, it, expect } from 'vitest'
import { findLeadCredits } from './apollo-credits'

describe('XC-8 · reading the lead-credit pool', () => {
  it('reads a nested pool named for leads', () => {
    const found = findLeadCredits({
      api_usage_stats: { lead_credits: { limit: 2500, consumed: 524 } },
    })
    expect(found).toMatchObject({ limit: 2500, used: 524 })
    // The path is reported so an operator can check the claim rather than trust it.
    expect(found?.path).toContain('lead_credits')
  })

  it('accepts the key names Apollo has actually used', () => {
    expect(findLeadCredits({ email_credits: { credit_limit: 100, credits_used: 10 } })).toMatchObject({ limit: 100, used: 10 })
    expect(findLeadCredits({ credits: { total: 50, usage: 5 } })).toMatchObject({ limit: 50, used: 5 })
  })

  it('finds the pool a couple of levels down', () => {
    expect(
      findLeadCredits({ data: { account: { usage: { lead_credits: { limit: 10, used: 3 } } } } }),
    ).toMatchObject({ limit: 10, used: 3 })
  })

  // ── THE REFUSALS ──────────────────────────────────────────────────────────────

  it('IGNORES the dial pool — a different currency, not a lead balance', () => {
    const found = findLeadCredits({
      direct_dial_credits: { limit: 2500, consumed: 2500 },
      lead_credits: { limit: 2500, consumed: 524 },
    })
    expect(found).toMatchObject({ limit: 2500, used: 524 })
    expect(found?.path).toContain('lead_credits')
  })

  it('reports nothing rather than the dial pool when leads are absent', () => {
    // A zeroed dial pool reported as leads would say "ZERO credits left" and stop a
    // perfectly fundable run; a full one would authorise a run that cannot finish.
    expect(findLeadCredits({ direct_dial_credits: { limit: 2500, consumed: 2500 } })).toBeNull()
    expect(findLeadCredits({ export_credits: { limit: 100, consumed: 0 } })).toBeNull()
    expect(findLeadCredits({ ai_credits: { limit: 250000, consumed: 0 } })).toBeNull()
  })

  it('reports nothing for an unrecognised shape', () => {
    for (const body of [null, undefined, 42, 'ok', {}, [], { foo: 'bar' }, { limit: 10 }, { used: 3 }]) {
      expect(findLeadCredits(body), JSON.stringify(body)).toBeNull()
    }
  })

  it('reports nothing for a bare {limit, used} with nothing naming the pool', () => {
    // The first pair in the document must not win by position. Without a name, there is no
    // way to know which currency it is.
    expect(findLeadCredits({ some_pool: { limit: 10, used: 1 } })).toBeNull()
  })

  it('refuses nonsense numbers', () => {
    expect(findLeadCredits({ lead_credits: { limit: -1, consumed: 0 } })).toBeNull()
    expect(findLeadCredits({ lead_credits: { limit: 10, consumed: -5 } })).toBeNull()
    // Used wildly beyond the limit is a misread field, not a balance.
    expect(findLeadCredits({ lead_credits: { limit: 10, consumed: 100000 } })).toBeNull()
  })

  it('a fully-spent pool IS a reading, not a refusal', () => {
    // Zero left is the most important thing this can report; it must not look like "unknown".
    expect(findLeadCredits({ lead_credits: { limit: 2500, consumed: 2500 } })).toMatchObject({ limit: 2500, used: 2500 })
  })

  it('cannot hang on a deep or cyclic structure', () => {
    // A System-page probe that hangs takes the page down, and the input is untrusted JSON
    // from an endpoint whose shape is not ours.
    let deep: Record<string, unknown> = { lead_credits: { limit: 1, consumed: 0 } }
    for (let i = 0; i < 50; i++) deep = { nested: deep }
    expect(findLeadCredits(deep)).toBeNull()   // beyond the bounded depth → not reported

    const cyclic: Record<string, unknown> = { a: 1 }
    cyclic.self = cyclic
    expect(() => findLeadCredits(cyclic)).not.toThrow()
  })

  it('does not walk an unbounded array', () => {
    const big = Array.from({ length: 5000 }, () => ({ noise: true }))
    big.push({ lead_credits: { limit: 1, consumed: 0 } } as never)
    // The pool sits past the scan bound, so it is not reported — deliberately, because a
    // 5,000-element response is not a shape this probe should be trusting anyway.
    expect(findLeadCredits(big)).toBeNull()
  })
})
