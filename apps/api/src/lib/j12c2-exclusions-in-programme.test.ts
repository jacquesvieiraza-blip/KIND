// ══════════════════════════════════════════════════════════════════════════════════════════
// J12-C2 · THE EXCLUSIONS APPLY ON THE PROGRAMME PATH TOO (FD-1)
//
// REQ: *"As J5-C12 in programme + pool paths"*.
//
// ── J5-C12 BUILT THE CRITERION. THE PROGRAMME PATH NEVER ASKED IT IN TIME ───────────────
//
// `applyStructuralGate` — the seven hard criteria, `excluded` among them — ran about a
// hundred and fifty lines BELOW the programme block. So on a programme run, in this order:
//
//   1. `qualifyCandidates(clientId, insertedIds, …)` judged the WHOLE batch. `finalVerdict`
//      reads email, email status and country and NOTHING else — it cannot see a category, a
//      size, a seniority or an EXCLUSION.
//   2. `settleBatch(batchId, qualified)` consumed the customer's programme ceiling on that
//      count.
//   3. `surfaceQualifiedBatch(...)` put them in front of the customer.
//   4. …and only THEN did the gate ask whether they were the kind of company the client had
//      asked for, or one of the companies they had asked us to LEAVE OUT.
//
// 🛑 SO A COMPANY THE CLIENT EXPLICITLY EXCLUDED COST THEM THEIR ENTITLEMENT AND THEN
// APPEARED ON THEIR SCREEN. FD-1 is "in every path", and this was the path.
//
// ⚠️ THE GATE'S OWN HEADER ALREADY SAID WHERE IT BELONGED — *"BEFORE ANYTHING IS SCORED OR
// SURFACED"* — and that was true of the proof path it was written for and false of the
// programme path, which surfaces through a different function. A comment can only speak for
// the code it sits above.
//
// ⚠️ NOTHING ABOUT THE GATE CHANGED: same call, same fail-closed refusal, same outcome
// record, same `gatedIds`. Only the line it sits on, and the list qualification is handed.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { hardFit, structurallyAdmissible, setAsideReason, type FitIcp } from './proof-fit'

const code = (p: string): string =>
  readFileSync(join(__dirname, p), 'utf8')
    .split('\n')
    .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
    .join('\n')

const ICPS = code('../routes/icps.ts')
const at = (needle: string): number => {
  const i = ICPS.indexOf(needle)
  expect(i, `not found in icps.ts — this guard must be repointed: ${needle}`).toBeGreaterThan(-1)
  return i
}

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① ORDER: THE GATE COMES FIRST
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J12-C2 · nothing a programme run does precedes the fit gate', () => {
  const gate = at('const gate = await applyStructuralGate(icp, insertedIds)')

  it('🛑 the gate runs BEFORE qualification — it used to run 150 lines after it', () => {
    expect(
      at('const q = await qualifyCandidates(clientId, gatedIds, {'),
      'qualification judges a batch the client\'s own criteria have not seen',
    ).toBeGreaterThan(gate)
  })

  it('🛑 and BEFORE the settle — an excluded company consumed the programme ceiling', () => {
    expect(
      at('settleBatch(programmeBatch.id, qualified ?? 0)'),
      'the customer\'s entitlement is settled on candidates nobody had judged for fit',
    ).toBeGreaterThan(gate)
  })

  it('🛑 and BEFORE the customer sees them', () => {
    expect(
      at('const surf = await surfaceQualifiedBatch('),
      'a company the client asked us to leave out reached their screen',
    ).toBeGreaterThan(gate)
  })

  it('🛑 qualification is handed the GATED list, not the raw batch', () => {
    // `finalVerdict` reads email, email status and country. It cannot refuse an excluded
    // company, so the list it is given has to have been judged already.
    expect(ICPS).toContain('qualifyCandidates(clientId, gatedIds, {')
    expect(ICPS, 'the raw batch is qualified again').not.toContain('qualifyCandidates(clientId, insertedIds')
  })

  it('it is still the WHOLE gated list — a refusal is not a throttle', () => {
    // HOUSE-009's defect was a self-serve cap deciding how many of a customer's prospects
    // M&V bothered to assess. Every candidate is still judged; what changed is that the
    // judgement now includes the criteria the client actually stated.
    const branch = ICPS.slice(at('if (programmeIdForRun) {'), at('const surf = await surfaceQualifiedBatch('))
    expect(branch).not.toContain('gatedIds.slice(')
    expect(branch).not.toContain('deliveryCapBalance')
  })

  it('the PROOF path is unchanged — scoring still reads the same gated list', () => {
    expect(ICPS).toMatch(/scoreLeadsForIcp\(gatedIds, icp/)
  })

  it('🛑 the fail-closed refusal is now EARLIER, which is the safe direction', () => {
    // A batch whose refusals cannot be RECORDED returns before qualification, so the
    // programme reservation stays open and recoverable rather than being settled on
    // candidates nobody had judged.
    const region = ICPS.slice(gate, gate + 1_400)
    expect(region).toMatch(/if \(!gate\.ok\)/)
    expect(region).toMatch(/return \{ inserted, skipped, relaxed: gate\.detail/)
    expect(at('return { inserted, skipped, relaxed: gate.detail'))
      .toBeLessThan(at('const q = await qualifyCandidates(clientId, gatedIds, {'))
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② AND THE CRITERION IT CONSULTS IS THE ONE J5-C12 BUILT
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J12-C2 · the same suppression, the same predicate', () => {
  const ICP: FitIcp = {
    geographies: ['United Kingdom'],
    target_category: 'marketing',
    exclusions: 'no recruitment agencies',
  }
  const CANDIDATE = {
    country: 'United Kingdom', industry: 'Marketing and advertising',
    company: 'Fathom Marketing', job_title: 'Managing Director',
  }

  it('an excluded company is inadmissible — the same answer J5-C12 proves for the pool', () => {
    const f = hardFit({ ...CANDIDATE, company: 'Northgate Recruitment Agencies' }, ICP)
    expect(f.excluded).toBe('no')
    expect(structurallyAdmissible(f)).toBe(false)
    expect(String(setAsideReason(f))).toMatch(/asked us to leave/)
  })

  it('and the gate the programme path now consults is that predicate', () => {
    const gateSrc = code('./proof-gate.ts')
    expect(gateSrc).toMatch(/setAsideReason\(hardFit\(row, icp\)\)/)
  })

  it('🛑 qualification itself still judges only deliverability — it was never the fit gate', () => {
    // Stated as a test so nobody "fixes" this by teaching `finalVerdict` about exclusions:
    // there would then be two answers to one question, which is what J5-C5 spent an item
    // removing. One predicate, consulted earlier.
    const q = code('./icp-qualification.ts')
    expect(q, 'the deliverability verdict grew its own opinion about fit')
      .not.toMatch(/exclusions|target_category|company_sizes|seniority_levels/)
  })
})
