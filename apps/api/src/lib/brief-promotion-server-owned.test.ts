import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CONFIRMED BRIEF IS THE SERVER'S TRUTH (S1-AUDIT-002), AND THE SEAL COMES LAST
// (S1-AUDIT-003).
//
// ── DEFECT ONE: THE BROWSER WAS THE COURIER ───────────────────────────────────────────
//
// Every fact `/auth/onboard` wrote came from the REQUEST BODY. The browser read the draft,
// held the values in component state across a FOUR-CALL promotion, and re-sent them. So:
//   · a body that OMITS `outcome_stated` created a client with no stated outcome, even though
//     the client had answered and the answer was sitting on the server;
//   · a body that DISAGREES with the confirmed draft won, so the client row could contradict
//     the brief the client was shown and agreed to;
//   · the eleven-fact gate read the DRAFT while the write read the BODY — two sources for one
//     decision, which is the shape of every drift bug in this repo.
//
// ── DEFECT TWO: THE SEAL WAS TAKEN HALFWAY THROUGH ────────────────────────────────────
//
// `markBriefDraftPromoted` ran inside `/auth/onboard`, after the client row. But promotion
// produces TWO pieces of durable state and the ICP is a SEPARATE browser call, so this was
// reachable:
//
//     /auth/onboard succeeds -> client exists -> DRAFT SEALED
//       -> the browser never reaches POST /icps (tab closed, network drop, crash)
//       -> a client with NO ICP and an UNWRITABLE Brief, unrecoverable by design.
//
// ⚠️ WHY THIS FILE IS A SOURCE SCAN. Both defects are about WHICH SOURCE a value comes from
// and WHERE IN A SEQUENCE a write happens. A behavioural test over a mocked Express stack can
// show that the right value arrived; it cannot show that the body is no longer CONSULTED, and
// it cannot show that no ordering exists in which the seal precedes the ICP. Those are
// structural claims, so they are checked structurally — and the teeth for them are real
// mutations of the source, recorded in the build evidence.
// ═══════════════════════════════════════════════════════════════════════════════════════

const REPO = join(__dirname, '../../../..')

function code(relPath: string): string {
  return readFileSync(join(REPO, relPath), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map(l => { const i = l.search(/(?<!:)\/\//); return i < 0 ? l : l.slice(0, i) })
    .join('\n')
}

const AUTH = code('apps/api/src/routes/auth.ts')
// ⛓️ 13 Sep — the raw-source handle that stood here is GONE, with the assertion that needed
// it. It existed because `/^https?:\/\//i` ends in two adjacent slashes, so a `//`-comment
// stripper truncates the line mid-regex — and that regex was the website guard. The guard has
// been replaced by `resolveOwnedWebsite`, which is asserted behaviourally in
// `brief-promotion.test.ts`, so nothing here needs to match a regex literal any more. The
// lesson is kept because the next person to pin a line containing a regex will hit it again.
const ICPS = code('apps/api/src/routes/icps.ts')
const DRAFT = code('apps/api/src/lib/brief-draft.ts')

describe('S1-AUDIT-002 — the confirmed draft owns every fact it holds', () => {
  it('the override is gated on a CONFIRMED, UNPROMOTED draft and nothing else', () => {
    expect(AUTH).toMatch(/const draftFacts = draft && !draft\.promotedClientId && draft\.confirmedAt \? draft\.facts : null/)
  })

  it('the client-row facts are taken from the draft, not the body', () => {
    // `website` is asserted on its own below: it is a GUARDED override, not a direct
    // assignment, because a brief may legitimately record an explicit "none".
    for (const [fact, column] of [
      ['company_name', 'profileFields.company_name'],
      ['country',      'profileFields.country'],
      ['phone',        'profileFields.phone'],
    ] as const) {
      const re = new RegExp(`draftFacts\\.${fact}[\\s\\S]{0,120}${column.replace('.', '\\.')} =`)
      expect(AUTH, `${fact} is still couriered by the browser`).toMatch(re)
    }
  })

  it('🛑 a body that OMITS the outcome no longer loses it — the draft supplies it', () => {
    expect(AUTH).toMatch(/const outcomeStatedOwned = text2\(draftFacts\?\.desired_outcome\) \?\? outcome_stated/)
    // And the classification reads the SERVER-owned sentence, never the body's copy.
    expect(AUTH).toMatch(/readStatedOutcome\(outcomeStatedOwned\)/)
    expect(AUTH).not.toMatch(/readStatedOutcome\(outcome_stated\)/)
  })

  it('contact_name is written from the draft-owned value', () => {
    expect(AUTH).toMatch(/const contactNameOwned = text2\(draftFacts\?\.contact_name\) \?\? contact_name/)
    expect(AUTH).toMatch(/contact_name: contactNameOwned\.trim\(\)/)
  })

  it('🛑 a BLANK draft fact is not a value — it falls back rather than blanking', () => {
    // `text2` returns undefined for '' and null, so a fact the brief never captured leaves
    // whatever the caller had. Emptying a field because the draft is silent is the one
    // direction R72 ⑦ forbids reading into an absence.
    expect(AUTH).toMatch(/function text2\(v: string \| null \| undefined\): string \| undefined \{[\s\S]{0,140}t === '' \? undefined : t/)
  })

  // ── 🛑 ⛓️ 13 Sep (S1-AUDIT-002 correction) — WHAT THIS ASSERTION USED TO PIN ──────────
  //
  // ~~`expect(AUTH_RAW).toContain('const site = text(draftFacts.website)')`~~
  // ~~`expect(AUTH_RAW).toContain("if (site && /^https?://i.test(site)) profileFields.website = site")`~~
  //
  // It pinned the guard EXACTLY, and the guard was wrong: it recognised that `website_none`
  // exists and did nothing with it, so a confirmed "we have no website" left the request
  // body's stale value standing, and a confirmed bare domain lost to the body as well. The
  // assertion was not weakened — it is RETARGETED onto the correction, and the outcome it used
  // to approximate is now driven for real in `brief-promotion.test.ts` (the decision) and
  // `routes/onboard-brief.route.test.ts` (the row).
  it('🛑 the struck guard is GONE — the body can no longer win fact #3', () => {
    expect(AUTH, 'the old guarded assignment is still in the handler')
      .not.toContain('profileFields.website = site')
    expect(AUTH).not.toContain('const site = text(draftFacts.website)')
  })

  it('website is RESOLVED by the one pure owner, and the result reaches the payload', () => {
    expect(AUTH).toMatch(/const \{ resolveOwnedWebsite \} = await import\('\.\.\/lib\/brief-promotion'\)/)
    expect(AUTH).toMatch(/const ownedWebsite = resolveOwnedWebsite\(draftFacts, profileFields\.website\)/)
    // `body` means "no draft, or the draft is silent" — only then is the caller's own value
    // left alone. Anything else writes the resolved value, INCLUDING an explicit null.
    expect(AUTH).toMatch(
      /ownedWebsite\.source === 'body' \? \{\} : \{ website: ownedWebsite\.website \?\? null \}/)
    // And it must land in the payload AFTER `profileFields`, or the body's copy wins the spread.
    const fields = AUTH.indexOf('...websiteFields,')
    const profile = AUTH.indexOf('...profileFields,')
    expect(fields, 'the resolved website never reaches the payload').toBeGreaterThan(-1)
    expect(fields).toBeGreaterThan(profile)
  })

  it('the account facts that are NOT brief facts are left to the body, deliberately', () => {
    // `industry` is nowhere in BriefDraftFacts, so it must not be invented from the draft.
    expect(AUTH).not.toMatch(/draftFacts\.industry/)
  })

  it('the STRUCTURED targeting comes from the draft too, not from three calls of browser state', () => {
    for (const fact of [
      'target_category', 'target_company_type', 'geographies',
      'company_sizes', 'job_titles', 'seniority_levels',
    ]) {
      expect(ICPS, `${fact} is still browser-couriered into the ICP`).toMatch(
        new RegExp(`f\\.${fact}\\)`))
    }
  })

  // ⛓️ 13 Sep — RETARGETED, NOT WEAKENED. ~~`expect(ICPS).toMatch(/business\.bad_fit = bad/)`~~
  // pinned a single-field assignment. Fact #4 now shares the same gate and the same injection,
  // so the assignment is a keyed loop. The CLAIM is unchanged and is if anything tighter: the
  // words are the confirmed draft's and the destination is still `business.bad_fit`.
  it('exclusions keep their EXACT destination — figsy_knowledge.bad_fit — with a server-owned source', () => {
    expect(ICPS).toMatch(/\['bad_fit', \(promotionDraft\.facts\.exclusions \?\? ''\)\.trim\(\)\]/)
    expect(ICPS).toMatch(/for \(const \[key, value\] of present\) business\[key\] = value/)
    expect(ICPS).toMatch(/promotionDraft\.facts\.exclusions/)
    // No redesign: the reader is unchanged.
    expect(ICPS).toMatch(/exclusions:\s+v\.business\?\.bad_fit/)
  })

  it('the ICP override is likewise gated on a CONFIRMED, UNPROMOTED draft', () => {
    expect(ICPS).toMatch(/if \(promotionDraft\?\.confirmedAt && !promotionDraft\.promotedClientId\) \{/)
  })

  it('a journey with NO draft takes exactly today\'s path', () => {
    // `promoting` is the named act; without it nothing is read and nothing is overridden.
    expect(ICPS).toMatch(/const promoting = req\.body\?\.from_brief_draft === true/)
    expect(ICPS).toMatch(/const promotionDraft = promoting \? await briefDraftFor\(req\.userId!\) : null/)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE SAME-DEFECT BOUNDARY AUDIT — ALL ELEVEN FACTS, NOT JUST THE ONE THAT WAS CAUGHT
//
// 🛑 WHY THIS EXISTS. The website hole was inside the fix for the very defect it belongs to:
// the implementation claimed "the confirmed draft owns every fact it holds", and for fact #3
// it did not. Claiming a class of defect closed while one member of the class is still open is
// how #414 and #549 happened. So every one of the eleven is walked, and the one that is STILL
// browser-authoritative is recorded here rather than left to be rediscovered.
//
// ⚠️ WHERE BEHAVIOURAL TESTING IS PRACTICAL IT IS USED, AND IT IS USED FIRST. The facts
// `/auth/onboard` persists are driven through the real handler in
// `routes/onboard-brief.route.test.ts` §⑤; fact #3's decision is driven pure in
// `brief-promotion.test.ts`. What remains here is the structural half — WHICH SOURCE a line
// consults — which no behavioural test can show, because a mocked route can prove the right
// value arrived and cannot prove the body is no longer read.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('S1-AUDIT-002 — the boundary audit across all eleven facts', () => {
  it('all eleven facts promotion persists are each read from the confirmed draft', () => {
    // fact -> the expression that must appear, at the destination that owns it.
    const OWNED: Array<[string, string, RegExp]> = [
      ['1 contact name',    'auth', /text2\(draftFacts\?\.contact_name\)/],
      ['2 company',         'auth', /draftFacts\.company_name/],
      ['3 website/none',    'auth', /resolveOwnedWebsite\(draftFacts, profileFields\.website\)/],
      ['4 what they do',    'icps', /promotionDraft\.facts\.what_they_do/],
      ['5 target category', 'icps', /f\.target_category\)/],
      ['6 geography',       'icps', /f\.geographies\)/],
      ['7 company type',    'icps', /f\.target_company_type\)/],
      ['8 company size',    'icps', /f\.company_sizes\)/],
      ['9 target roles',    'icps', /f\.job_titles\)/],
      ['9 target roles',    'icps', /f\.seniority_levels\)/],
      ['10 exclusions',     'icps', /promotionDraft\.facts\.exclusions/],
      ['11 desired outcome','auth', /text2\(draftFacts\?\.desired_outcome\)/],
    ]
    for (const [fact, file, re] of OWNED) {
      const src = file === 'auth' ? AUTH : ICPS
      expect(src, `brief fact ${fact} is still couriered by the browser`).toMatch(re)
    }
  })

  // ── 🛑 ⛓️ 13 Sep — BRIEF FACT #4 IS NOW OWNED. WHAT THIS BLOCK USED TO RECORD: ───────
  //
  // ~~"REPORTED: brief fact #4 (what_they_do) still has NO promotion reader"~~
  //
  // It was a boundary record, and it said so: the fact was stored, gated on, and read by
  // nothing, so `figsy_knowledge.pitch.data.product` came entirely from the browser. Founder
  // decision 13 Sep closed it — `what_they_do` is the canonical confirmed wording and feeds
  // that exact existing destination; `clients.industry` stays a SEPARATE classification field
  // and is explicitly NOT a substitute. The record is replaced by the guard it was waiting
  // for, and the behaviour is driven in `routes/brief-fact-4-owned.route.test.ts`.
  it('🛑 fact #4 reaches its EXISTING destination — no new canonical field', () => {
    // The words are the draft's…
    expect(ICPS).toMatch(/\['product', \(promotionDraft\.facts\.what_they_do \?\? ''\)\.trim\(\)\]/)
    // …and the destination is the one that was already there, unchanged.
    expect(ICPS, 'figsy_knowledge.pitch no longer takes `product` from `business`')
      .toMatch(/product:\s+str\(biz\.product\)/)
    // Injected BEFORE the write, or `hasBusiness`'s early return loses it when the browser
    // omitted `business` entirely.
    const inject = ICPS.indexOf("['product', (promotionDraft.facts.what_they_do")
    const persist = ICPS.indexOf('await persistMillaUnderstanding(clientId, understandingBody')
    expect(inject).toBeGreaterThan(-1)
    expect(persist).toBeGreaterThan(inject)
  })

  it('🛑 WHAT THE BUSINESS DOES ≠ INDUSTRY — `clients.industry` is not touched by fact #4', () => {
    // Founder-locked: they are different concepts and one must never stand in for the other.
    expect(AUTH, 'the brief\'s words were written into clients.industry')
      .not.toMatch(/industry[^\n]{0,60}what_they_do|what_they_do[^\n]{0,60}industry/)
    expect(ICPS, 'POST /icps started writing clients.industry from the draft')
      .not.toMatch(/industry[^\n]{0,60}what_they_do|what_they_do[^\n]{0,60}industry/)
    // `industry` remains exactly what it was on the onboarding body: optional, and the
    // client's own, with no draft field of that name to override it.
    expect(AUTH).toMatch(/industry:\s+emptyToUndefined\.optional\(\)/)
    expect(AUTH).not.toMatch(/draftFacts\.industry/)
  })

  // ── 🛑 ⛓️ 13 Sep — THE WEBSITE KEY IS NO LONGER A PRECONDITION ──────────────────────
  //
  // ~~`website: emptyToUndefined.pipe(z.string().url().optional()),`~~
  //
  // The `.optional()` sat inside the pipe, so the outer `z.string()` was REQUIRED and a body
  // omitting the key 400'd the promotion — making the browser a precondition for a fact the
  // server owns. Widened to allow an ABSENT key; a SUPPLIED value is validated exactly as
  // before (driven in `routes/onboard-brief.route.test.ts` §⑤ cases 5–9).
  it('🛑 an absent website key is allowed; a supplied value is still validated', () => {
    expect(AUTH).toMatch(/website:\s+emptyToUndefined\.pipe\(z\.string\(\)\.url\(\)\.optional\(\)\)\.optional\(\),/)
    // The value rule itself is untouched — this widened what may be OMITTED, not what may be SENT.
    expect(AUTH).toContain('z.string().url()')
  })
})

describe('S1-AUDIT-003 — the seal is the LAST durable step, so nothing strands', () => {
  it('🛑 /auth/onboard no longer seals the draft', () => {
    expect(AUTH).not.toMatch(/markBriefDraftPromoted\(/)
    // And it no longer even imports it, so it cannot drift back in unnoticed.
    expect(AUTH).not.toMatch(/markBriefDraftPromoted\s*\}/)
  })

  it('the seal happens in POST /icps, AFTER the core ICP is written', () => {
    expect(ICPS).toMatch(/if \(promoting && promotionDraft && !promotionDraft\.promotedClientId\) \{\s*\n\s*await markBriefDraftPromoted\(req\.userId!, clientId\)/)
    // Ordering is the whole fix: the seal must come after `saveClientTargeting`.
    const save = ICPS.indexOf('await saveClientTargeting(')
    const seal = ICPS.indexOf('await markBriefDraftPromoted(req.userId!, clientId)\n    }')
    expect(save).toBeGreaterThan(-1)
    expect(seal, 'the seal was not found after the ICP write').toBeGreaterThan(save)
  })

  it('🛑 AN INTERRUPTED PROMOTION IS RESUMABLE — the replay branch finishes the seal', () => {
    // If the first attempt created the ICP and died before sealing, the draft is still open
    // and ONLY this line closes it. Without it, a retry would return the existing ICP and
    // leave the Brief permanently unsealed-but-promoted — a different stranding.
    const replay = /if \(promoting\) \{[\s\S]{0,700}?replayed: true/.exec(ICPS)
    expect(replay, 'the replay branch was not found').toBeTruthy()
    expect(replay![0]).toMatch(/markBriefDraftPromoted\(req\.userId!, clientId\)/)
  })

  it('the seal records the FIRST promotion and cannot be re-stamped', () => {
    // Now that two call sites can reach it, a replay must not move `promoted_at` — the row
    // is evidence of when promotion happened.
    expect(DRAFT).toMatch(/\.is\('promoted_client_id', null\)/)
  })

  it('PROOF START stays OUTSIDE the durable promotion boundary', () => {
    // Promotion is client + ICP + seal. A Proof run is a provider call with its own authority
    // ledger; folding it in would let a provider outage block account creation entirely.
    const proofRoute = ICPS.indexOf("icpRouter.post('/:id/proof'")
    const seal = ICPS.indexOf('await markBriefDraftPromoted(req.userId!, clientId)\n    }')
    expect(seal).toBeLessThan(proofRoute)
    // And the proof route neither seals nor reads the draft for authority.
    const proof = ICPS.slice(proofRoute)
    expect(proof).not.toMatch(/markBriefDraftPromoted/)
  })

  it('one client, one ICP — the replay guard still answers with the existing core ICP', () => {
    expect(ICPS).toMatch(/const already = await coreIcpRow\(clientId\)/)
    expect(ICPS).toMatch(/res\.status\(200\)\.json\(\{ success: true, data: already, replayed: true \}\)/)
  })

  it('the eleven-fact gate and the confirmation gate are unchanged and still refuse first', () => {
    expect(AUTH).toMatch(/const gate = mayConfirmBrief\(draft\)/)
    expect(AUTH).toMatch(/needs_confirmation: true/)
    // Both must still come BEFORE any client write.
    const gateIdx = AUTH.indexOf('const gate = mayConfirmBrief(draft)')
    const insertIdx = AUTH.indexOf(".from('clients')\n        .insert(")
    expect(gateIdx).toBeGreaterThan(-1)
    if (insertIdx > -1) expect(gateIdx).toBeLessThan(insertIdx)
  })
})
