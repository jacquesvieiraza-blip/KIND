// ═══════════════════════════════════════════════════════════════════════════════════════
// THE GATE HOLDS EVERY SEAM, OR IT HOLDS NOTHING.
//
// `proof-fit.test.ts` proves the JUDGEMENT. This file proves the four places the judgement
// has to be obeyed — because a correct rule that one read ignores is a rule that does not
// exist. The four:
//
//   ① the Proof run scores only what passed          (`icps.ts` → `gatedIds`)
//   ② the Proof run surfaces only what passed        (`icps.ts` → the stamp)
//   ③ the desk never lists a set-aside candidate     (`leads.ts` → `/for-approval`)
//   ④ nothing recycles it into a later pass          (`start-work.ts` → surfaceEverything)
//
// ⚠️ SOURCE-SHAPE, DELIBERATELY. These are single lines in long database paths that no unit
// test can reach without a live Postgres, and each one is a place a later edit silently
// reverts while fixing something adjacent — which is exactly how the original defect
// survived. What CAN be proved behaviourally (the judgement, the bands, the fail-closed
// verdict) is proved that way in the other two files.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PENDING_MIGRATIONS } from './pending-migrations'

// ⚠️ THE KEY IS READ OUT OF `proof-gate.ts`'s OWN SOURCE, not imported. Importing it would
// pull in `@kind/db`, which needs Supabase credentials this suite has no business holding —
// and the point of the assertion is that the runtime refusal and the registered migration
// name the SAME key, which reading the source proves just as well.
const GATE_SRC = readFileSync(join(__dirname, 'proof-gate.ts'), 'utf8')
const SET_ASIDE_MIGRATION =
  /SET_ASIDE_MIGRATION = '([^']+)'/.exec(GATE_SRC)?.[1] ?? '(not found)'

const API = join(__dirname, '..')
const ICPS = readFileSync(join(API, 'routes', 'icps.ts'), 'utf8')
const LEADS = readFileSync(join(API, 'routes', 'leads.ts'), 'utf8')
const START_WORK = readFileSync(join(__dirname, 'start-work.ts'), 'utf8')
const APOLLO = readFileSync(join(__dirname, 'apollo.ts'), 'utf8')

/** Executable lines only — a rule about what the code DOES must not match a comment. */
const code = (s: string) => s.split('\n')
  .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
  .join('\n')

describe('🛑 ① the model judges only structurally eligible candidates', () => {
  it('scoring is handed the gated list, never the raw insert', () => {
    const c = code(ICPS)
    expect(c).toContain("scoreLeadsForIcp(gatedIds, icp, clientRow?.company_name ?? '', clientId)")
    expect(c.includes('scoreLeadsForIcp(insertedIds'),
      'the model is scoring candidates the gate refused').toBe(false)
  })

  it('the consent send follows the same list', () => {
    const c = code(ICPS)
    expect(c).toContain("autoConsentScoredLeads(gatedIds")
    expect(c.includes('autoConsentScoredLeads(insertedIds'),
      'a set-aside candidate can be cold-emailed a consent request').toBe(false)
  })

  it('the gate runs BEFORE either of them', () => {
    const c = code(ICPS)
    const gateAt = c.indexOf('applyStructuralGate(icp, insertedIds)')
    const scoreAt = c.indexOf('scoreLeadsForIcp(gatedIds')
    expect(gateAt, 'the structural gate is not called at all').toBeGreaterThan(-1)
    expect(scoreAt).toBeGreaterThan(-1)
    expect(gateAt, 'the gate runs after scoring, so the model saw refused candidates').toBeLessThan(scoreAt)
  })
})

describe('🛑 ② a refused candidate is never surfaced, not even once', () => {
  it('the proof surfacing stamp names the gated list', () => {
    const c = code(ICPS)
    expect(c).toContain(".in('id', gatedIds).is('delivered_at', null)")
    expect(c.includes(".in('id', insertedIds).is('delivered_at', null)"),
      'the surfacing stamp shows the client the rows the gate refused').toBe(false)
  })

  it('🛑 the batch is REFUSED rather than surfaced when the gate cannot run', () => {
    const c = code(ICPS)
    expect(c).toContain('if (!gate.ok)')
    // The refusal must return BEFORE the scoring/surfacing block — not log and continue.
    const refuseAt = c.indexOf('if (!gate.ok)')
    const scoreAt = c.indexOf('scoreLeadsForIcp(gatedIds')
    expect(refuseAt).toBeLessThan(scoreAt)
    // ⛓️ 12 Sep (S2-AUDIT-001) — the exit now also names its SETTLEMENT, and that addition is
    // the point: this path records `failed` and RETURNS without throwing, so the proof route's
    // outer `.catch` never sees it. Under the old code it consumed the client's Proof attempt
    // while delivering nothing. `terminalForRunStatus('failed')` returns the attempt.
    expect(c).toContain("return { inserted, skipped, relaxed: gate.detail, terminal: terminalForRunStatus('failed') }")
  })
})

describe('🛑 ③ the desk never lists a set-aside candidate', () => {
  it('/for-approval filters them out', () => {
    expect(code(LEADS)).toContain(".is('set_aside_reason', null)")
  })

  it('🛑 …and the star is the band, with no rank slice anywhere', () => {
    const c = code(LEADS)
    expect(c).toContain('recommended: isStarred(band)')
    // THE ORIGINAL DEFECT, in the spelling that shipped: the top 20 by score, on a pass that
    // surfaces exactly 20, starred all of them.
    expect(c.includes('.slice(0, 20)'), 'the rank-based star is back').toBe(false)
    expect(c.includes('recommendedIds'), 'the rank-based star is back under its old name').toBe(false)
  })

  it('the band and the displayed score come from the one module', () => {
    const c = code(LEADS)
    expect(c).toContain("await import('../lib/proof-fit')")
    expect(c).toContain('score: displayScore(fit, l.score ?? null)')
    expect(c).toContain('\n      band,')  // returned so no surface invents its own rule
  })

  it('⚠️ the criteria are read but never shown — the client sees a band, not our rules', () => {
    const c = code(LEADS)
    expect(c).toContain('company_size, seniority')       // selected for the derivation
    // …and not present in the masked object the client receives.
    const masked = c.slice(c.indexOf('const masked ='), c.indexOf('res.json({ success: true, data: masked })'))
    // ⛓️ 24 Sep (R145 step 3b) — COMPANY SIZE IS NOW ON THE CARD, as the redesign draws it
    // ("Wren & C— LLP · 51–200"). Founder: *"match everything."* It is a fact about the company,
    // not one of our rules; the rules (seniority, the criteria verdicts) stay off the card.
    expect(masked.includes('company_size: l.company_size ?? null'), 'the size the redesign shows is missing').toBe(true)
    expect(masked.includes('seniority: '), 'seniority leaked into the masked card').toBe(false)
  })
})

describe('🛑 ④ nothing recycles a refused candidate into a later pass', () => {
  it('surfaceEverything skips them', () => {
    // This act surfaces EVERY un-surfaced lead for a client. Without this filter the gate is
    // decorative: the rows exist and the next call puts them on the desk.
    expect(code(START_WORK)).toContain(".is('set_aside_reason', null)")
  })
})

describe('⑤ the migration exists, is additive, and is named in the refusal', () => {
  const entry = PENDING_MIGRATIONS.find(m => m.key === SET_ASIDE_MIGRATION)

  it('it is registered in PENDING_MIGRATIONS', () => {
    expect(entry, `${SET_ASIDE_MIGRATION} is not in PENDING_MIGRATIONS`).toBeTruthy()
  })

  it('🛑 it is ADDITIVE — no DROP, no backfill, and it does not touch the status CHECK', () => {
    const sql = entry!.sql
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS set_aside_reason text')
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS leads_set_aside_reason_idx')
    // Founder-locked: "Do NOT extend the core leads.status CHECK merely to add set_aside."
    //
    // ⚠️ TESTED AS AN EXECUTABLE STATEMENT, NOT AS A WORD. The migration's own COMMENT
    // explains WHY it avoids `leads_status_check`, so a bare substring search matches the
    // explanation and fails on the very prose that documents the rule. What must never
    // appear is an ALTER against that constraint.
    expect(/(?:DROP|ADD)\s+CONSTRAINT[^;]*leads_status_check/i.test(sql),
      'it alters the leads status CHECK constraint').toBe(false)
    expect(/ALTER\s+TABLE[^;]*leads_status_check/i.test(sql),
      'it alters the leads status CHECK constraint').toBe(false)
    for (const destructive of ['DROP COLUMN', 'DROP CONSTRAINT', 'DELETE FROM', 'UPDATE public.leads SET']) {
      expect(sql.includes(destructive), `the migration is destructive: ${destructive}`).toBe(false)
    }
  })

  it('it is idempotent, so re-running it is harmless', () => {
    expect(entry!.sql).toContain('IF NOT EXISTS')
  })
})

describe('⑥ the provider is asked strictly where it can be, and generously only where it cannot', () => {
  it('titles, seniority, size and geography are strict structured filters', () => {
    const c = code(APOLLO)
    for (const strict of [
      'body.person_titles = icp.job_titles',
      'body.person_seniorities = seniorities',
      'body.organization_num_employees_ranges = employeeRanges',
      'body.person_locations = icp.geographies',
    ]) {
      expect(c, `${strict} is no longer a strict provider filter`).toContain(strict)
    }
  })

  // ── 🛑 ⚑ 22 Sep — THE BARGAIN THIS TEST DEFENDED IS OVER, AND BOTH HALVES OF IT FAILED ──
  //
  // ⛓️ WAS: ~~"⚠️ industry stays a keyword tag ON PURPOSE, and the gate is why that is safe"~~,
  // asserting `body.q_organization_keyword_tags = icp.industries` and the phrase "refuse
  // precisely". The reasoning was *fetch generously, refuse precisely* — send a loose OR over
  // tags, then re-decide industry deterministically on the row.
  //
  // 🛑 IT WAS SAFE ONLY IF THE CLIENT SPOKE OUR VOCABULARY, AND THE CLIENT NEVER DOES. Their
  // category was first forced into a sixteen-word list we invented, and then judged against
  // that same list. A word that fitted narrowed the search in our terms against Apollo's
  // taxonomy; a word that did not fit produced an empty list, `unknown` on every row, and a
  // gate that removed all of them without one criterion ever saying `no`. Both roads ended at
  // an empty Proof screen.
  //
  // ⚠️ THE STRICT-FIELD FACT IT CITED IS STILL TRUE AND STILL RECORDED IN `apollo.ts`:
  // Apollo's strict industry field returns ~1 result where tags return 65k. That is why the
  // answer was never "narrow it" — it is that the client's category is not a filter at all.
  it('🛑 the client’s category is NOT sent to the provider — it orders, it never filters', () => {
    expect(code(APOLLO), 'the category is being sent as a search filter again')
      .not.toContain('body.q_organization_keyword_tags = icp.industries')
    // ⚠️ THE FIELD ITSELF IS NOT BANNED. Intent signals still OR into it, and those are OUR
    // signals about a company's moment rather than the client's description of a market.
    expect(code(APOLLO), 'intent signals lost their tag field').toContain('orgKwTags')
    // And the four that DO reach the request are unchanged.
    for (const strict of [
      'body.person_titles', 'body.person_seniorities',
      'body.organization_num_employees_ranges', 'body.person_locations',
    ]) expect(code(APOLLO), `${strict} stopped reaching the request`).toContain(strict)
  })
})
