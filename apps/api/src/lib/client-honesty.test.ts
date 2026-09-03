import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
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

// ── #570③ — THE MISMATCH IS REAL, AND IT IS DISCLOSED. THE COMMENT WAS THE BUG. ──────────
//
// `/leads/for-approval` returns `.limit(50)`; the `leads_awaiting` KPI is an UNCAPPED count.
// The row filed this as a silent discrepancy — a KPI of 200 beside a panel of 50, "with no
// load more". Verified 29 Jul: it is NOT silent. `deskCoverage()` renders
// "Showing the top 50 of 200. Approve or pass some to see the rest." directly above the list.
//
// What was actually broken was the COMMENT above the summary query, which asserted
// "leads_awaiting mirrors /for-approval exactly". It does not — same filters, different size —
// and that false sentence is why the mismatch read as already-fixed for weeks: anyone checking
// found a comment asserting the very thing they came to verify.
//
// These guards exist so the disclosure cannot be quietly removed, and so the comment cannot go
// back to lying. Comment lines are stripped before any source scan (the practice
// `reply-routing.test.ts` established after three tests bound to a comment quoting old code).
describe('the desk tells the client when it is showing a subset', () => {
  const strip = (s: string) => s.split('\n')
    .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*'))
    .join('\n')
  const desk = strip(readFileSync(join(__dirname, '../../../../apps/portal/src/app/(milla)/milla/page.tsx'), 'utf8'))
  // STRIPPED, and this one caught itself: the replacement comment QUOTES the old false claim
  // ("this comment used to say …"), so an unstripped `not.toContain` matched the quotation and
  // failed. Fourth time this week a source scan bound to a comment — and the first time it
  // failed loudly instead of passing falsely, which is the argument for the practice.
  const routeRaw = readFileSync(join(__dirname, '../routes/leads.ts'), 'utf8')
  const route = strip(routeRaw)

  // ⛓️ 30 Aug — RE-AIMED TWICE IN ONE DAY, AND THE SECOND TIME IS THE HONEST ONE.
  //
  // #570③ was "the DESK must disclose when it is showing a subset", because
  // `/leads/for-approval` is capped at 50 and the home rendered it as if it were everything.
  //
  // 4A-1's first cut deleted that fetch, and this guard was inverted to forbid it by name —
  // reasoning that a deleted screen owes no disclosure. That reasoning was sound about the
  // PAID desk and wrong about the file: the same fetch is the FREE PROOF calibration set,
  // which the founder's spec keeps, and forbidding it by name is part of what made deleting
  // the customer's reaction look like passing the guards. Option B brought it back.
  //
  // 🛑 SO WHY IS NO DISCLOSURE OWED NOW? Because the cap cannot bite on the surface that
  // renders it. The calibration set is shown ONLY at stage Proof, and proof is fenced at two
  // passes of 20 (40 lifetime records) against a route limit of 50 — so the list is complete
  // by construction, never a subset. That is asserted below rather than asserted about, and
  // if any of those three numbers moves, this fails and the disclosure is owed again.
  //
  // `deskCoverage` stays exported and correct — it is the right answer the day a capped list
  // genuinely needs disclosing. What is guarded is that it is not needed here.
  it('the calibration set is complete by construction, so no subset disclosure is owed', () => {
    expect(desk, 'the calibration set is no longer fetched at all').toContain('/leads/for-approval')
    // ⛓️ CORRECTED 3 Sep — THE "COMPLETE BY CONSTRUCTION" ARGUMENT WAS FALSE FOR A CLIENT WITH
    // HISTORY, and a founder screenshot of House proved it. The panel is gated to clients with
    // NO PROGRAMME (it was gated on `stage !== 'Proof'`, which could not tell a DRAFT programme
    // from none at all). That set is NOT bounded by the proof fences: House holds ~166 records
    // and would have been shown 50 of them with nothing saying so. So the completeness argument
    // below still holds for a genuine proof prospect, AND the disclosure is now actually made
    // when the list reaches the route cap — which is what this test should have required.
    expect(desk, 'the calibration panel is no longer gated on the absence of a programme').toContain("prog.hasProgramme !== false")
    expect(desk, 'a capped calibration list must disclose that it is a subset')
      .toContain("leads && leads.length >= 50")
    expect(desk, 'the subset disclosure copy is gone').toContain('These are some of the people we’ve shown you before')
    // Route cap …
    expect(routeRaw, 'the /for-approval cap moved').toContain('.limit(50)')
    // … versus the most a proof client can ever have. 2 × 20 = 40 < 50.
    const icps = strip(readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8'))
    expect(icps, 'the per-pass proof size moved').toContain('const PROOF_PASS_LEADS = 20')
    expect(icps, 'the lifetime proof record fence moved').toContain('PROOF_CLIENT_RECORD_CAP = 40')
    // And nothing on the home claims a coverage figure it has no cap to report.
    expect(desk, 'deskCoverage is being called on a list that cannot be capped')
      .not.toContain('deskCoverage(')
  })

  // TWO VIEWS OF THE SAME FILE, and the split is the point. A "no longer claims X" assertion
  // must read the STRIPPED code, or the replacement comment quoting X breaks it. A "the file
  // documents X" assertion must read the RAW text, because documentation is what comments are.
  // Using one view for both is what made the first two attempts at this block fail.
  it('the route no longer claims the count and the panel match EXACTLY — outside comments', () => {
    expect(route).not.toContain('leads_awaiting mirrors /for-approval exactly')
  })

  it('and the file now DOCUMENTS the real relationship — same filters, different size', () => {
    expect(routeRaw).toContain('uncapped')
    expect(routeRaw).toContain('.limit(50)')
  })

  it('it records that raising the limit is NOT the fix', () => {
    // #571's settled reasoning, written where the next person will be tempted.
    expect(routeRaw).toContain('the same bug with a later trigger')
  })
})
