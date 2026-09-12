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
/**
 * The raw file, for the ONE assertion that must read a regex literal.
 *
 * ⚠️ THE COMMENT STRIPPER CANNOT BE USED THERE, AND THIS IS WHY. `/^https?:\/\//i` ends in
 * two adjacent slashes, so a `//`-comment stripper truncates the line mid-regex. A stripper
 * is the right instrument for "must NOT contain" assertions (the struck code is quoted in the
 * comments that explain it) and the wrong one for matching source that contains a regex.
 */
const AUTH_RAW = readFileSync(join(REPO, 'apps/api/src/routes/auth.ts'), 'utf8')
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

  it('website only overrides with a value that already parses — a brief saying "none" cannot 400 the promotion', () => {
    expect(AUTH_RAW).toContain('const site = text(draftFacts.website)')
    expect(AUTH_RAW).toContain("if (site && /^https?:\\/\\//i.test(site)) profileFields.website = site")
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

  it('exclusions keep their EXACT destination — figsy_knowledge.bad_fit — with a server-owned source', () => {
    expect(ICPS).toMatch(/business\.bad_fit = bad/)
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
