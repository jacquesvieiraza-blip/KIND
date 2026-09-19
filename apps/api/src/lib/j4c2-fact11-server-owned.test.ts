// ══════════════════════════════════════════════════════════════════════════════════════════
// J4-C2 · BRIEF FACT #11 IS THE SERVER'S, ON THE PROMOTION PATH TOO
//
// ── THE DEFECT: S1-AUDIT-002 TOOK TWO FACTS OFF THE BROWSER AND LEFT THIS ONE ON IT ─────
//
// S1-AUDIT-002 (12 Sep) established the rule on this exact path — *"the confirmed draft is the
// source of truth"* — and applied it to fact #4 (`what_they_do` → `business.product`) and fact
// #10 (`exclusions` → `business.bad_fit`). Fact #11, the client's DESIRED OUTCOME, stayed on
// the browser:
//
//     persistMillaUnderstanding: const intent = typeof body.campaign_intent === 'string' ? …
//     milla/welcome:  api.post('/icps', { …proposed, business, proof, campaign_intent: intent })
//
// 🛑 AND IT IS THE BRIEF EVERY OUTBOUND EMAIL IS WRITTEN FROM. It lands on
// `figsy_campaigns.campaign_intent`, which is what FIGSY reads when it writes to a prospect.
// The three consequences S1-AUDIT-002 named apply to it unchanged:
//
//   · a body that OMITS it writes no intent for a client who answered the question;
//   · a body that sends something DIFFERENT wins over the brief they confirmed and agreed to;
//   · the eleven-fact gate reads the DRAFT while this write read the BODY — two sources for
//     one decision, which is the shape of every drift bug.
//
// ⚠️ `clients.industry` IS NOT IN SCOPE AND IS NOT TOUCHED. `/auth/onboard`'s own note is
// founder-locked: *"WHAT THE BUSINESS DOES ≠ INDUSTRY. `industry` stays a separate
// classification field on the client row."* What this item owns is the `industry` in Milla's
// UNDERSTANDING payload, which her tool schema describes as "a short plain phrase for what
// their business does, from their own words" — fact #4 under another name.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const CODE = readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')
  .split('\n')
  .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
  .join('\n')

/** The block that decides which facts the confirmed draft owns on the promotion path. */
const OWNERSHIP = (() => {
  const at = CODE.indexOf('const understandingBody = req.body')
  expect(at, 'the ownership block moved — this guard must be repointed').toBeGreaterThan(-1)
  return CODE.slice(at, CODE.indexOf('await persistMillaUnderstanding', at))
})()

describe('J4-C2 · the confirmed draft owns fact #11', () => {
  it('🛑 `campaign_intent` comes from the draft, not from the body', () => {
    expect(
      OWNERSHIP,
      'the brief every outbound email is written from is still whatever the browser sent',
    ).toMatch(/understandingBody\.campaign_intent\s*=\s*ownedIntent/)
    expect(OWNERSHIP, 'the owned value is not brief fact #11')
      .toMatch(/promotionDraft\.facts\.desired_outcome/)
  })

  it('🛑 `industry` is deliberately NOT owned from the draft — the founder lock wins', () => {
    // The manifest REQ says "campaign_intent AND INDUSTRY from the draft". It was implemented
    // and then withdrawn: `brief-promotion-server-owned.test.ts` refused it by name — "WHAT
    // THE BUSINESS DOES ≠ INDUSTRY — `clients.industry` is not touched by fact #4" — which is
    // founder-locked, and a founder ruling outranks a manifest line (PROTOCOL v1 rule 3).
    //
    // The lock is about the CONCEPT rather than one column, so writing fact #4 into a field
    // named `industry` re-creates the conflation wherever it lands. And it would have bought
    // nothing: `business.industry` has no consumer anywhere in this repository.
    expect(
      OWNERSHIP,
      'fact #4 was written into a field named `industry`, which is the conflation the founder '
      + 'lock forbids',
    ).not.toMatch(/\['industry',/)
  })

  it('facts #4 and #10 are unchanged — this ADDS an owner, it removes none', () => {
    expect(OWNERSHIP).toMatch(/\['product',\s*\(promotionDraft\.facts\.what_they_do/)
    expect(OWNERSHIP).toMatch(/\['bad_fit',\s*\(promotionDraft\.facts\.exclusions/)
  })

  it('🛑 A BLANK DRAFT FACT IS NOT A VALUE — the one direction R72 ⑦ forbids', () => {
    // An override applies only when the draft HOLDS something. A fact the brief never captured
    // must fall back rather than BLANK what the client approved on screen.
    expect(OWNERSHIP, 'a blank desired_outcome would erase the intent the client saw')
      .toMatch(/if \(ownedIntent\)/)
    expect(OWNERSHIP, 'the blank-is-not-a-value filter on the owned list was lost')
      .toMatch(/owned\.filter\(\(\[, v\]\) => v !== ''\)/)
  })

  it('🛑 it applies ONLY to a confirmed, unpromoted draft', () => {
    // A legacy client re-onboarding, an operator-created account and every pre-draft journey
    // have no draft at all and must take exactly today's path.
    expect(OWNERSHIP).toMatch(/promotionDraft\?\.confirmedAt && !promotionDraft\.promotedClientId/)
  })
})

describe('J4-C2 · the founder-locked boundary is respected', () => {
  it('🛑 `clients.industry` is NOT written by this path', () => {
    // "WHAT THE BUSINESS DOES ≠ INDUSTRY" — founder-locked. `clients.industry` is a separate
    // classification field written by `/auth/onboard` from the body, deliberately.
    expect(
      OWNERSHIP,
      'the promotion path started writing the founder-locked client classification column',
    ).not.toMatch(/from\('clients'\)[\s\S]{0,200}industry/)
  })

  it('the intent still reaches the campaign row, which is where FIGSY reads it', () => {
    const at = CODE.indexOf('async function persistMillaUnderstanding')
    expect(at, 'the understanding writer moved — this guard must be repointed').toBeGreaterThan(-1)
    const fn = CODE.slice(at, CODE.indexOf('\nicpRouter.', at))
    expect(fn).toMatch(/campaign_intent: intent\.slice\(0, 2000\)/)
  })

  it("a LIVE client's revision is still HELD for GO, not applied (AR9)", () => {
    // ⚠️ THE HOLD IS NOT IN `persistMillaUnderstanding` — I asserted it there first and it
    // failed for a reason that had nothing to do with the product. `pending_campaign_intent`
    // is written by `saveClientTargeting`, which is the function that decides whether a live
    // client's revision applies now or waits for the operator's GO. The guard follows the
    // behaviour rather than where I assumed it lived.
    expect(CODE, 'a live client\'s intent revision would apply without GO')
      .toMatch(/pending_campaign_intent: intent/)
  })
})
