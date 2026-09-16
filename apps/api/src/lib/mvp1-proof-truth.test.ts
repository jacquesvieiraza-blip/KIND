// ⚑ 16 Sep (MVP1 · A1) — THE COUNT THE CLIENT CAN RECEIVE IS NOT THE COUNT WE INSERTED.
//
// 🛑 THE DEFECT. The 26-Aug rule "A ZERO THAT K.I.N.D ITSELF CREATED IS NEVER A TARGETING
// VERDICT" already exists in `runIcpJob`, already routes to `failed`, already RELEASES the
// Proof attempt (`RUN_STATUS_TERMINAL.failed`) and already has founder-locked copy that
// promises a human (`FAILED_RUN_BODY`). Its predicate was written before the 10-Sep
// STRUCTURAL GATE existed, so it asks `inserted === 0` — the PRE-GATE count.
//
// Consequence, exactly as the founder found it: 20 candidates inserted, all 20 set aside by
// `applyStructuralGate`, zero surfaced. `inserted` is 20, so:
//
//   • `gatesAteEverything` is false
//   • `deriveRunStatus` returns `served` (correctly, on a number that is wrong)
//   • `RUN_STATUS_TERMINAL.served === 'completed'` — THE ATTEMPT IS BURNT
//   • the persisted message says "Sourced 20 leads."
//   • the client's desk shows ZERO cards
//
// A client is told about twenty people they cannot see, and pays an attempt for it.
//
// ⚠️ THE FIX IS A PREDICATE, NOT A NEW MECHANISM. Nothing about `hardFit`, the structural
// criteria, unknown-is-set-aside, the claim RPCs, the calibration ladder or the
// no-third-attempt rule moves. The gate's own count simply reaches the rule that was always
// meant to read it.
//
// ⚠️ AND THE RAW NUMBER SURVIVES. `icp_run_outcomes.total_inserted` stays the raw sourcing
// truth for audit and accounting (founder decision C, 16 Sep). Only what the CLIENT is told
// derives from the client-usable count.

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// `proof-claim.ts` holds the DB seam beside the pure settlement map, so importing it needs a
// client. Nothing below touches a database: every assertion is a pure function or a source
// scan, and a stub is honest about that rather than pretending to exercise a query.
vi.mock('@kind/db', () => ({ db: { from: () => ({}), rpc: async () => ({ data: null, error: null }) } }))

import {
  clientUsableCount, gatesEmptiedTheRun, deriveRunStatus, runOutcomeMessage,
  FAILED_RUN_BODY,
} from './run-outcome'
import { RUN_STATUS_TERMINAL } from './proof-claim'

const REPO = join(__dirname, '../../../..')

/**
 * Source text with WHOLE-LINE COMMENTS REMOVED.
 *
 * ⚠️ A guard a comment can satisfy is not a guard — this file's own header names the
 * predicate it is asserting about, so asserting on raw source would pass on prose.
 */
const codeOnly = (src: string) =>
  src.split('\n').filter(l => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n')

const icpsSrc = () => codeOnly(readFileSync(join(REPO, 'apps/api/src/routes/icps.ts'), 'utf8'))

// ─────────────────────────────────────────────────────────────────────────────
// Ⓐ THE CLIENT-USABLE COUNT — one pure function, so the arithmetic is provable
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓐ · clientUsableCount', () => {
  it('20 raw · 20 set aside → 0 usable', () => {
    expect(clientUsableCount(20, 20)).toBe(0)
  })

  it('20 raw · 8 set aside → 12 usable (the founder\'s own example)', () => {
    expect(clientUsableCount(20, 8)).toBe(12)
  })

  it('20 raw · 19 set aside → 1 usable — PARTIAL PROOF IS STILL PROOF', () => {
    expect(clientUsableCount(20, 19)).toBe(1)
  })

  it('nothing sourced → 0, and the gate cannot make it negative', () => {
    expect(clientUsableCount(0, 0)).toBe(0)
    // Defensive: a set-aside count larger than the insert count is a bug elsewhere, but it
    // must never produce a negative number that reads as "less than nothing" downstream.
    expect(clientUsableCount(3, 9)).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ⓑ THE PREDICATE — "did OUR gates empty a search that worked?"
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓑ · gatesEmptiedTheRun', () => {
  it('🛑 THE DEFECT, PINNED — 20 inserted, all 20 set aside, IS the K.I.N.D-created zero', () => {
    expect(gatesEmptiedTheRun({
      clientUsable: clientUsableCount(20, 20), searchTrusted: true, providerContactsReturned: 20,
    })).toBe(true)
  })

  it('12 usable → NOT an exception. A partial set is a served set', () => {
    expect(gatesEmptiedTheRun({
      clientUsable: clientUsableCount(20, 8), searchTrusted: true, providerContactsReturned: 20,
    })).toBe(false)
  })

  it('1 usable → NOT an exception (the 26-Aug partial-proof rule, unchanged)', () => {
    expect(gatesEmptiedTheRun({
      clientUsable: clientUsableCount(20, 19), searchTrusted: true, providerContactsReturned: 20,
    })).toBe(false)
  })

  it('a search that returned NOBODY is a targeting answer, never a K.I.N.D-created zero', () => {
    expect(gatesEmptiedTheRun({
      clientUsable: 0, searchTrusted: true, providerContactsReturned: 0,
    })).toBe(false)
  })

  it('an UNTRUSTED search is a provider failure, and keeps its own status', () => {
    // `deriveRunStatus` owns this case and answers `failed` through `searchCompleted:false`.
    // The gate predicate must not claim it, or the two would disagree about the cause.
    expect(gatesEmptiedTheRun({
      clientUsable: 0, searchTrusted: false, providerContactsReturned: 20,
    })).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ⓒ THE WHOLE CHAIN, END TO END — status → settlement → the client's sentence
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓒ · 20 raw / 0 eligible — the full consequence', () => {
  const usable = clientUsableCount(20, 20)

  it('the run status is the neutral `failed`, NOT `served`', () => {
    const status = gatesEmptiedTheRun({ clientUsable: usable, searchTrusted: true, providerContactsReturned: 20 })
      ? 'failed' as const
      : deriveRunStatus(false, usable, false, false, true)
    expect(status).toBe('failed')
  })

  it('THE ATTEMPT IS RELEASED — this is what returns Attempt 1', () => {
    expect(RUN_STATUS_TERMINAL.failed).toBe('released')
  })

  it('the client is told the founder-locked recovery sentence and NO COUNT', () => {
    const said = runOutcomeMessage('failed', usable)
    expect(said).toBe(FAILED_RUN_BODY)
    // 🛑 THE DEFECT'S SIGNATURE. "Sourced 20 leads." must be unreachable from this state.
    expect(said).not.toMatch(/\b20\b/)
    expect(said).not.toMatch(/sourced/i)
    // No internal vocabulary ever reaches a prospect.
    expect(said).not.toMatch(/set aside|geograph|seniority|industr|provider|gate|failed/i)
  })

  it('and the RAW number is still the raw number — audit truth is not rewritten', () => {
    // `total_inserted` keeps 20 (founder decision C). Only the sentence derives from 0.
    expect(clientUsableCount(20, 20)).toBe(0)
    expect(runOutcomeMessage('served', 20)).toMatch(/Sourced 20 leads/)
  })
})

describe('Ⓒ · 20 raw / 12 eligible — a served set, and the client is told 12', () => {
  const usable = clientUsableCount(20, 8)

  it('status is `served` and the attempt is CONSUMED', () => {
    const status = gatesEmptiedTheRun({ clientUsable: usable, searchTrusted: true, providerContactsReturned: 20 })
      ? 'failed' as const
      : deriveRunStatus(false, usable, false, false, true)
    expect(status).toBe('served')
    expect(RUN_STATUS_TERMINAL.served).toBe('completed')
  })

  it('🛑 THE SENTENCE SAYS 12, NOT 20 — the number and the cards cannot disagree', () => {
    expect(runOutcomeMessage('served', usable)).toBe('Sourced 12 leads.')
    expect(runOutcomeMessage('served', usable)).not.toMatch(/\b20\b/)
  })

  it('one eligible out of twenty still says one, singular', () => {
    expect(runOutcomeMessage('served', clientUsableCount(20, 19))).toBe('Sourced 1 lead.')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ⓓ THE ROUTE ACTUALLY USES IT — the predicate is not a library nobody calls
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓓ · runIcpJob reads the gated count', () => {
  it('🛑 the PRE-GATE predicate `inserted === 0` is GONE from the run outcome decision', () => {
    const src = icpsSrc()
    expect(src, 'the defective pre-gate predicate is still deciding the run outcome')
      .not.toMatch(/gatesAteEverything\s*=\s*inserted === 0/)
  })

  it('the shared predicate is imported and called', () => {
    const src = icpsSrc()
    expect(src).toMatch(/gatesEmptiedTheRun/)
    expect(src).toMatch(/clientUsableCount/)
  })

  it('`deriveRunStatus` is given the CLIENT-USABLE count, never the raw insert count', () => {
    const src = icpsSrc()
    // The one call inside runIcpJob's ordinary tail.
    expect(src).toMatch(/deriveRunStatus\(\s*!!clientSettings\?\.is_demo,\s*clientUsable\b/)
  })

  it('`recordRunOutcome` still receives the RAW count for the row, plus the usable count for the copy', () => {
    const src = icpsSrc()
    // raw `inserted` stays in the total_inserted position; `clientUsable` is appended.
    expect(src).toMatch(/recordRunOutcome\(icpId, clientId, status, effectiveCap, pool\.served, inserted, heldFromIcp, didWiden, clientUsable\)/)
    // and the row's column is written from the raw argument, not the usable one.
    expect(src).toMatch(/total_inserted: Math\.max\(0, Math\.round\(totalInserted\)\)/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ⓓ2 MILLA NEVER USES THE RAW SOURCING COUNT AS CLIENT PROOF TRUTH (decision C)
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓓ2 · the desk\'s "zero" decision', () => {
  const millaSrc = () => codeOnly(
    readFileSync(join(REPO, 'apps/portal/src/app/(milla)/milla/page.tsx'), 'utf8'),
  )

  it('🛑 `proofEndedEmpty` is NOT derived from `total_inserted`', () => {
    // THE DEFECT. `total_inserted` is the RAW sourcing figure. With 20 sourced and 20 set
    // aside it is 20, so the desk concluded the run was not empty — while showing no cards.
    expect(millaSrc(), 'the desk still decides "empty" from the raw sourcing count')
      .not.toMatch(/proofEndedEmpty\s*=\s*!!terminalRun && terminalRun\.total_inserted === 0/)
  })

  it('it is derived from the SAME bounded count the cards are drawn from', () => {
    // `leads_awaiting` is built in `milla-summary.ts` from "the same boundary the card list
    // applies, clause for clause", so what Milla says and what the desk shows cannot disagree.
    expect(millaSrc()).toMatch(/proofEndedEmpty[\s\S]{0,120}leads_awaiting/)
  })

  it('and the server still ships that bounded count, gated exactly as the cards are', () => {
    const summary = codeOnly(readFileSync(join(REPO, 'apps/api/src/lib/milla-summary.ts'), 'utf8'))
    expect(summary).toMatch(/leads_awaiting:\s*awaiting\.count/)
    expect(summary).toMatch(/if \(summaryScope\.kind === 'proof'\) q = q\.not\('proof_pass', 'is', null\)/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ⓔ F1 — PROOF MUST NOT TRIGGER LEGACY SIDE EFFECTS (R124: 299/$4 is gone)
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓔ · F1 legacy fences on the Proof path', () => {
  it('🛑 the +100 welcome grant and `first_icp_run_at` are fenced OUT of proof mode', () => {
    const src = icpsSrc()
    const at = src.indexOf('grant_first_run_credits')
    expect(at, 'grant_first_run_credits vanished — find its new home before deleting this guard')
      .toBeGreaterThan(0)
    // The nearest enclosing condition above the grant must exclude proof runs.
    const before = src.slice(Math.max(0, at - 2000), at)
    expect(before, 'a free Proof run can still grant 100 legacy credits and stamp first_icp_run_at')
      .toMatch(/if \(!proofMode\)/)
  })

  /**
   * The body of the `!proofMode` fence around the retired-model side-effects.
   *
   * ⚠️ BOUNDED BY TWO THINGS THAT ARE BOTH CODE. The opening `if (!proofMode) {` and the
   * closing log line are real statements, so `codeOnly` cannot let a comment satisfy this —
   * and an `indexOf` on a function NAME would have matched the import at the top of the file
   * instead of the call site, which is exactly how this guard first passed for the wrong
   * reason.
   */
  const legacyFence = (src: string) => {
    const end = src.indexOf('LEGACY SIDE-EFFECTS FENCED OFF')
    expect(end, 'the F1 fence sentinel is gone — the legacy side-effects may be unfenced')
      .toBeGreaterThan(0)
    const start = src.lastIndexOf('if (!proofMode) {', end)
    expect(start, 'the F1 fence opening is gone').toBeGreaterThan(0)
    return src.slice(start, end)
  }

  it('🛑 the legacy first-leads-ready email is INSIDE the fence', () => {
    expect(legacyFence(icpsSrc()), 'a free Proof run can still send the legacy first-leads email')
      .toMatch(/sendFirstLeadsReadyEmail\(/)
  })

  it('🛑 day-1 legacy outreach and FIGSY auto-enrolment are INSIDE the fence', () => {
    const fenced = legacyFence(icpsSrc())
    expect(fenced, 'day-1 legacy outreach is reachable from a Proof run')
      .toMatch(/sendDay1OutreachBatch\(/)
    expect(fenced, 'FIGSY auto-enrolment is reachable from a Proof run')
      .toMatch(/autoEnrollLead\(/)
  })

  it('🛑 consent email — real cold contact — is fenced off Proof by its own check', () => {
    const src = icpsSrc()
    const at = src.lastIndexOf('autoConsentScoredLeads(')
    expect(at, 'autoConsentScoredLeads vanished — find its new home before deleting this guard')
      .toBeGreaterThan(0)
    // Its fence is an early `return` on `proofMode` inside the scoring continuation, so the
    // check sits immediately above the call rather than wrapping it.
    expect(src.slice(Math.max(0, at - 1200), at), 'a free Proof run can still cold-email the client\'s prospects')
      .toMatch(/if \(proofMode\)/)
  })

  it('and SCORING is deliberately OUTSIDE the fence — it is the product, not a side-effect', () => {
    const src = icpsSrc()
    expect(legacyFence(src), 'scoring was swept into the legacy fence — the Proof desk loses its ordering')
      .not.toMatch(/scoreLeadsForIcp\(/)
    expect(src).toMatch(/scoreLeadsForIcp\(gatedIds/)
  })
})
