import { describe, it, expect } from 'vitest'
import { packLine, deskCoverage, shortfallMessage } from '@kind/shared'

// PROMPT 3, PR B — WHAT THE CLIENT IS TOLD ABOUT THEIR OWN MONEY AND THEIR OWN DESK.
//
// Every rule here decides a sentence a paying client reads. They were inlined in React
// components where nothing could prove them, and two were provably wrong.

// ── #563 ──────────────────────────────────────────────────────────────────────────────
// The billing page read `/credits` and knew ONLY the wallet. A client who had just paid $99
// saw a $0 balance and no mention of the 100 approvals they had bought — on the one screen
// that exists to explain what they paid for.
describe('#563 — the billing page can finally state the pack', () => {
  it('a fresh pack says all 100 are there and that approving is free', () => {
    const s = packLine({ active: true, included: 100, used: 0, left: 100 })
    expect(s).toContain('100 included leads')
    expect(s).toContain('costs nothing')
  })

  it('a partly-used pack names what is LEFT, which is the number they care about', () => {
    const s = packLine({ active: true, included: 100, used: 12, left: 88 })
    expect(s).toContain('88 of your 100')
    expect(s).toContain('12 used')
  })

  it('an exhausted pack says the $4 has started — no ambiguity about when charging begins', () => {
    const s = packLine({ active: true, included: 100, used: 100, left: 0 })
    expect(s).toContain('all used')
    expect(s).toContain('$4')
  })

  it('no pack renders NOTHING rather than an empty or zero pack', () => {
    // Showing "0 of 0 included leads" to someone who never bought a pack invents a product
    // they do not have.
    expect(packLine({ active: false, included: 0, used: 0, left: 0 })).toBeNull()
    expect(packLine(null)).toBeNull()
    expect(packLine(undefined)).toBeNull()
  })
})

// ── #570 ──────────────────────────────────────────────────────────────────────────────
// `/for-approval` is capped at 50 rows. `leads_awaiting` is an uncapped count. So a client
// with 120 waiting saw "120 leads awaiting you" above a list of 50, with nothing explaining
// the other 70 — which reads as the product having lost them.
describe('#570 — the desk says when it is showing you only part of the list', () => {
  it('explains the gap when the count exceeds what is on screen', () => {
    const s = deskCoverage({ awaiting: 120, shown: 50 })
    expect(s).toContain('top 50 of 120')
    expect(s).toContain('to see the rest')
  })

  it('says NOTHING when the list is complete — a caveat on a full list is noise', () => {
    expect(deskCoverage({ awaiting: 12, shown: 12 })).toBeNull()
    expect(deskCoverage({ awaiting: 0, shown: 0 })).toBeNull()
  })

  it('says nothing when fewer are awaiting than shown — never invents a shortfall', () => {
    expect(deskCoverage({ awaiting: 3, shown: 50 })).toBeNull()
  })

  it('fires at exactly one over the cap — the boundary, not a sample', () => {
    expect(deskCoverage({ awaiting: 50, shown: 50 })).toBeNull()
    expect(deskCoverage({ awaiting: 51, shown: 50 })).toContain('top 50 of 51')
  })
})

// The desk computed `ids.length * 4` in the BROWSER — a figure that ignores the wallet
// balance and the leads still inside the included pack. A wrong number on a payment screen
// costs more trust than no number.
describe('#570 — the 402 stops inventing a figure', () => {
  it('uses the SERVER figure when the server sends one', () => {
    const s = shortfallMessage({ count: 20, neededUsd: 34.5, balanceUsd: 45.5 })
    expect(s).toContain('$34.50')
    expect(s).toContain('$45.50')
    expect(s).toContain('20 leads')
  })

  it('names NO total when the server did not say — it states the rule instead', () => {
    const s = shortfallMessage({ count: 20 })
    expect(s).toContain('20 leads')
    expect(s).toContain('$4 each')
    // The old code would have asserted "$80" here, which it could not know.
    expect(s).not.toContain('$80')
  })

  it('the old client-side arithmetic is NOT reproduced for a batch', () => {
    // 20 × $4 = $80. That number must not appear unless the server said it.
    expect(shortfallMessage({ count: 20, neededUsd: null })).not.toContain('80')
  })

  it('gets the singular right — "1 lead", never "1 leads"', () => {
    expect(shortfallMessage({ count: 1 })).toContain('1 lead.')
    expect(shortfallMessage({ count: 1 })).not.toContain('1 leads')
  })

  it('ignores a nonsense server figure rather than printing it', () => {
    // A NaN or zero reaching a payment screen as "$NaN more" is worse than the fallback.
    expect(shortfallMessage({ count: 5, neededUsd: NaN })).toContain('$4 each')
    expect(shortfallMessage({ count: 5, neededUsd: 0 })).toContain('$4 each')
  })
})
