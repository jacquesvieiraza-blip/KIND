// ══════════════════════════════════════════════════════════════════════════════════════════
// J5-C12 · WHAT THE CLIENT ASKED US TO LEAVE OUT IS LEFT OUT (FD-1)
//
// ── THE DEFECT: THE ANSWER WAS STORED AND NEVER ASKED ───────────────────────────────────
//
// `icps.exclusions` has been written since promotion existed. `figsy_knowledge.bad_fit` carries
// the same sentence to the copywriter. `describeBriefMemory` reads it back to Milla as *"Who
// they do NOT want"*. And NO GATE ANYWHERE READ EITHER.
//
// 🛑 SO A CLIENT WHO SAID "not recruitment agencies, and not our competitors" — one of the
// eleven facts, asked for explicitly, confirmed on screen — could have one sourced, structurally
// passed, scored, surfaced on their review desk, approved and emailed. Nothing failed. The
// product simply never used the answer.
//
// `hardFit` had six criteria and every one of them asks "does this candidate MEET the
// requirement". None asked "did they already tell us no", which is a different question and
// the only one that SUBTRACTS.
//
// ── AND "IN EVERY PATH" WAS NOT RHETORICAL ──────────────────────────────────────────────
//
// FD-1 says set aside with a reason IN EVERY PATH, and building the criterion is not enough:
//
//   · two surfaces cast a FIVE-COLUMN select to `FitIcp`, so `target_category` and
//     `target_company_type` were ALWAYS undefined there and their verdicts unconditionally
//     `yes` — those desks were already banding with a weaker rule than the gate that produced
//     the set, and `exclusions` would have arrived with the same defect;
//   · the POOL REUSE path builds its own `FitIcp` field by field and passed no exclusions and
//     no company name, so the free path could not have recognised an excluded company at all.
//
// ⚠️ THE SEMANTIC UPGRADE IS J5-C13'S, DELIBERATELY. This is the structural half — the
// criterion, the canonical field, the reason, and the suppression everywhere. Model-interpreted
// matching arrives with FD-2's mechanism and lands ON this criterion rather than beside it.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  hardFit, setAsideReason, structurallyAdmissible, exclusionPhrases,
  HARD_CRITERIA, type FitCandidate, type FitIcp,
} from './proof-fit'

/** A client who targets marketing agencies in the UK and excludes two kinds of company. */
const ICP: FitIcp = {
  geographies: ['United Kingdom'],
  target_category: 'marketing',
  exclusions: 'no recruitment agencies, and not our competitors',
}

const CANDIDATE: FitCandidate = {
  country: 'United Kingdom',
  industry: 'Marketing and advertising',
  company: 'Fathom Marketing',
  job_title: 'Managing Director',
}

describe('J5-C12 · an excluded company is set aside, with the client\'s own reason', () => {
  it('🛑 a company matching a stated exclusion FAILS the gate', () => {
    const f = hardFit({ ...CANDIDATE, company: 'Northgate Recruitment Agencies' }, ICP)
    expect(f.excluded, 'the client said no recruitment agencies and one passed the gate').toBe('no')
    expect(structurallyAdmissible(f), 'an excluded company was structurally admissible').toBe(false)
  })

  it('🛑 the reason quotes the CLIENT back, not a score', () => {
    const reason = setAsideReason(hardFit({ ...CANDIDATE, company: 'Northgate Recruitment Agencies' }, ICP))
    expect(reason, 'no reason was recorded for a suppression the client asked for').toBeTruthy()
    expect(String(reason)).toMatch(/^excluded:/)
    expect(String(reason), 'the reason does not say it was their own instruction').toMatch(/asked us to leave/)
  })

  it('🛑 EVERY significant word of a phrase must match — not any word', () => {
    // The client asked FOR marketing agencies and excluded the RECRUITMENT ones. Matching on
    // "agencies" alone would delete their entire target market, which is the ordinary case.
    const f = hardFit({ ...CANDIDATE, company: 'Fathom Marketing Agencies' }, ICP)
    expect(
      f.excluded,
      'the exclusion "recruitment agencies" removed a marketing agency — the client\'s whole market',
    ).toBe('yes')
  })

  it('🛑 a phrase with no recognisable company words is NOT a test', () => {
    // "not our competitors" names nobody we can recognise. Reducing it to "our" and matching
    // everything would suppress the entire set; pretending to judge it would be the
    // unfalsifiable claim this file refuses everywhere else.
    expect(exclusionPhrases('not our competitors'), 'a meaningless phrase became a live filter').toEqual([])
    expect(hardFit(CANDIDATE, { ...ICP, exclusions: 'not our competitors' }).excluded).toBe('yes')
  })

  it('the sentence is split the way people write it', () => {
    const phrases = exclusionPhrases('no recruitment agencies, nothing in gambling; and staffing firms')
    const flat = phrases.map(p => p.join(' '))
    expect(flat).toContain('recruitment agencies')
    expect(flat).toContain('gambling')
    expect(flat).toContain('staffing')
  })

  it('a client who excluded NOTHING is unaffected — no criterion, no refusal', () => {
    expect(hardFit(CANDIDATE, { ...ICP, exclusions: null }).excluded).toBe('yes')
    expect(hardFit(CANDIDATE, { ...ICP, exclusions: '' }).excluded).toBe('yes')
  })

  it('🛑 a candidate we cannot READ is `unknown`, never a silent pass', () => {
    // We cannot say this is not one of the companies they excluded. `setAsideReason` already
    // treats an unknown as set-aside-with-a-reason, so a suppression is not quietly cleared by
    // a thin row — and such a row is already unknown on category and industry anyway.
    const blind = hardFit({ country: 'United Kingdom', job_title: 'Managing Director' }, ICP)
    expect(blind.excluded).toBe('unknown')
    expect(setAsideReason(blind)).toBeTruthy()
  })

  it('the exclusion is matched against the company NAME as well as the industry tag', () => {
    // A provider's industry tag rarely says "recruitment"; the company name usually does.
    expect(hardFit({ ...CANDIDATE, company: 'Apex Recruitment Agencies Ltd' }, ICP).excluded).toBe('no')
    expect(hardFit({ ...CANDIDATE, industry: 'Recruitment agencies', company: 'Apex Ltd' }, ICP).excluded).toBe('no')
  })

  it('it is one of the hard criteria, so every consumer of the list gets it', () => {
    expect(HARD_CRITERIA, 'the criterion exists but is not in the canonical list').toContain('excluded')
  })
})

describe('J5-C12 · in every path', () => {
  const code = (p: string): string =>
    readFileSync(join(__dirname, p), 'utf8')
      .split('\n')
      .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
      .join('\n')

  for (const [name, path] of [
    ['the review desk', '../routes/leads.ts'],
    ['Milla\'s proof context', './milla-proof-context-io.ts'],
  ] as const) {
    it(`🛑 ${name} reads every field the gate judges on`, () => {
      const src = code(path)
      const at = src.indexOf("from('icps')")
      expect(at, `the ICP read in ${name} moved — this guard must be repointed`).toBeGreaterThan(-1)
      const sel = src.slice(at, at + 400)
      expect(sel, `${name} cannot see the client's exclusions`).toMatch(/exclusions/)
      // ⚠️ AND THE TWO THAT WERE ALREADY MISSING. Their verdicts were unconditionally `yes`
      // here, so this desk banded with a weaker rule than the gate that produced the set.
      expect(sel, `${name} cannot see the client's own category`).toMatch(/target_category/)
      expect(sel, `${name} cannot see the target company type`).toMatch(/target_company_type/)
    })
  }

  it('🛑 the POOL REUSE path suppresses them too — the free path is still a path', () => {
    const src = code('./pool-sourcing.ts')
    const at = src.indexOf('structurallyAdmissible(hardFit(')
    expect(at, 'the pool match moved — this guard must be repointed').toBeGreaterThan(-1)
    const call = src.slice(at, at + 900)
    expect(call, 'a reused pool record is never checked against the exclusions').toMatch(/exclusions:/)
    // The company NAME is the evidence an exclusion is usually recognised in, and it was not
    // being passed — so the criterion would have had nothing to read on this path.
    expect(call, 'the pool match passes no company name, so an exclusion cannot be seen').toMatch(/company:/)
  })

  it('the pool ICP TYPE admits it — a type that stops short is a suppression that stops short', () => {
    expect(code('./pool-candidates.ts'), 'PoolCandidateIcp drops exclusions before the decision')
      .toMatch(/exclusions\?:\s*string \| null/)
    expect(code('./pool-sourcing.ts'), 'PoolMatchIcp drops exclusions before the decision')
      .toMatch(/exclusions\?:\s*string \| null/)
  })
})
