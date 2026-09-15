import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// `proof-claim.ts` holds the DB seam beside the pure decisions, so importing it needs a client.
// Nothing below touches the database: every assertion here is either a pure map or a source
// scan, and a stub is honest about that rather than pretending to exercise a query.
vi.mock('@kind/db', () => ({ db: { from: () => ({}), rpc: async () => ({ data: null, error: null }) } }))

import {
  RUN_STATUS_TERMINAL, terminalForRunStatus, PROOF_CLAIM_STALE_MS,
  RECONCILE_RELEASE_WARNING, RECONCILE_COMPLETE_WARNING,
} from './proof-claim'
import type { RunStatus } from './run-outcome'

// ═══════════════════════════════════════════════════════════════════════════════════════
// EVERY TERMINAL EXIT OF `runIcpJob` SETTLES THE CLAIM — AND EXCEPTIONS ARE NOT ENOUGH.
//
// 🛑 THE FOUNDER NAMED THE TRAP: "The structural-gate path that writes status='failed' with
// total_inserted > 0 does NOT throw. It MUST NOT be forgotten merely because the outer
// .catch does not execute."
//
// He was right, and the trace found a SECOND non-throwing failure beside it: `deriveRunStatus`
// returns `failed` when `searchCompleted === false` — a provider search that did not complete
// — and that path also just returns. Under the old code both consumed the client's pass while
// delivering nothing.
//
// So settlement is wired to the status the run ACTUALLY RECORDED, through an exhaustive map,
// and `runIcpJob`'s return type makes `terminal` REQUIRED so a new exit cannot compile
// without choosing one.
// ═══════════════════════════════════════════════════════════════════════════════════════

const REPO = join(__dirname, '../../../..')
// ⛓️ 15 Sep (S1-RT-004) — THE HAYSTACK IS THE WHOLE PROOF PATH, not one file. The
// run-and-settle tail moved VERBATIM to `lib/proof-run-launch.ts` so the client route and
// Vida's review-resolution continuation share ONE implementation. Every assertion below is
// unchanged — same regexes, same strings, same count — they now read the two production
// files that together ARE that path, which is where the behaviour they protect lives.
const ICPS = readFileSync(join(REPO, 'apps/api/src/routes/icps.ts'), 'utf8')
  + '\n' + readFileSync(join(REPO, 'apps/api/src/lib/proof-run-launch.ts'), 'utf8')

/**
 * `icps.ts` with its comments removed.
 *
 * 🛑 REQUIRED FOR EVERY "MUST NOT CONTAIN" ASSERTION, AND THE FIRST CUT OF THIS FILE PROVED
 * IT. The corrected alert keeps the OLD sentence quoted in its own comment — that is how the
 * next reader learns what was wrong with it — so a raw-text scan for the old sentence finds
 * the explanation and fails on a fix that is actually correct. The same mistake
 * `constraint-ownership.test.ts` records having been made five times in this repo.
 */
const ICPS_CODE = ICPS
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n')
  .map(l => { const i = l.search(/(?<!:)\/\//); return i < 0 ? l : l.slice(0, i) })
  .join('\n')

/** The six statuses `icp_run_outcomes.status` admits, from the migration's CHECK. */
const ALL_STATUSES: RunStatus[] = [
  'served', 'no_match', 'quota_exhausted', 'demo', 'audience_exhausted', 'failed',
]

describe('the run status -> settlement map', () => {
  it('covers every RunStatus, with no default to fall through', () => {
    expect(Object.keys(RUN_STATUS_TERMINAL).sort()).toEqual([...ALL_STATUSES].sort())
  })

  it('a run that ran and ANSWERED consumes the attempt', () => {
    expect(terminalForRunStatus('served')).toBe('completed')
    expect(terminalForRunStatus('no_match')).toBe('completed')
    expect(terminalForRunStatus('audience_exhausted')).toBe('completed')
    expect(terminalForRunStatus('demo')).toBe('completed')
  })

  it('🛑 a FAILED run RETURNS the attempt — provider/infrastructure failure must not spend it', () => {
    expect(terminalForRunStatus('failed')).toBe('released')
  })

  it('🛑 a refusal BEFORE the provider call returns the attempt — nothing was spent', () => {
    expect(terminalForRunStatus('quota_exhausted')).toBe('released')
  })
})

describe('every terminal exit of runIcpJob names its settlement', () => {
  /**
   * The body of `runIcpJob`, from its declaration to the next top-level export.
   *
   * ⚠️ SCOPED RATHER THAN WHOLE-FILE, because `icps.ts` holds many routes and a `return`
   * belonging to one of them would make this assertion meaningless.
   */
  const body = (() => {
    const start = ICPS.indexOf('export async function runIcpJob(')
    expect(start, 'runIcpJob not found').toBeGreaterThan(-1)
    const after = ICPS.indexOf('\nicpRouter.', start)
    const end = after > -1 ? after : ICPS.length
    return ICPS.slice(start, end)
  })()

  /** Returns of an object literal — i.e. candidate terminal exits of the function itself. */
  const objectReturns = body
    .split('\n')
    .filter(l => /^\s{2,8}return \{/.test(l))

  it('there are exactly four object-literal returns (the four terminal exits)', () => {
    // ① funded-account refusal · ② no-budget refusal · ③ structural gate · ④ the ordinary end.
    // If this number moves, a new exit was added and the next assertion is what checks it.
    expect(objectReturns.length).toBe(4)
  })

  it('🛑 EVERY ONE of them carries a `terminal:` decision', () => {
    const missing = objectReturns.filter(l => !/terminal:/.test(l))
    expect(missing, 'a terminal exit of runIcpJob does not settle the Proof claim').toEqual([])
  })

  it('the return type makes `terminal` REQUIRED, so a new exit cannot compile without one', () => {
    expect(body).toMatch(/Promise<\{[^}]*terminal: RunTerminal[^}]*\}>/)
    // Not optional: `terminal?:` would let a future exit omit the decision silently.
    expect(body).not.toMatch(/terminal\?: RunTerminal/)
  })

  it('🛑 the structural-gate exit RELEASES — it records `failed` and RETURNS without throwing', () => {
    // The gate refusal and its settlement must be the same statement's decision.
    const gate = /recordRunOutcome\(icpId, clientId, 'failed'[\s\S]{0,900}?return \{[^}]*\}/.exec(body)
    expect(gate, 'the structural-gate exit was not found').toBeTruthy()
    expect(gate![0]).toMatch(/terminal: terminalForRunStatus\('failed'\)/)
  })

  it('the ordinary end settles from the status it actually recorded, never a literal', () => {
    expect(body).toMatch(/terminal: terminalForRunStatus\(status\)/)
  })
})

describe('the proof route settles from BOTH the resolved and the rejected path', () => {
  const route = ICPS.slice(ICPS.indexOf("icpRouter.post('/:id/proof'"))

  it('`.then` settles from the run’s own terminal result', () => {
    expect(route).toMatch(/\.then\(async r => \{[\s\S]{0,400}settleProofClaim\(claimId, r\.terminal/)
  })

  it('`.catch` releases — a throw is provider/infrastructure failure', () => {
    expect(route).toMatch(/settleProofClaim\(claimId, 'released', 'run_threw'\)/)
  })

  it('a settle that does not persist raises an alert rather than failing silently', () => {
    expect(route).toMatch(/A Proof authority claim could not be settled/)
  })
})

describe('S2-AUDIT-003 half A — the false alert sentence is gone', () => {
  it('🛑 it no longer claims that no run outcome was recorded', () => {
    // The line directly above the alert records the `failed` outcome, so the old sentence was
    // false on its own terms — and as of this build the pass is returned, not consumed.
    expect(ICPS_CODE).not.toContain('Their proof pass is CONSUMED and no run outcome was recorded')
    // …and the correction is still explained where the next reader will look for it.
    expect(ICPS).toContain('Their proof pass is CONSUMED and no run outcome was recorded')
  })

  it('it reports what actually happened, measured rather than asserted', () => {
    expect(ICPS_CODE).toMatch(/Their Proof attempt has been RETURNED, not consumed/)
    expect(ICPS_CODE).toMatch(/The failed run outcome WAS recorded/)
    // Both halves are conditional on the real result, not stated blindly.
    expect(ICPS).toMatch(/settled\.settled\s*\n?\s*\?/)
    expect(ICPS).toMatch(/recorded\s*\n?\s*\?/)
  })
})

describe('the stale-claim threshold controls VISIBILITY ONLY', () => {
  it('it is 15 minutes', () => {
    expect(PROOF_CLAIM_STALE_MS).toBe(900_000)
  })

  it('🛑 nothing in the claim library releases a claim because time elapsed', () => {
    const lib = readFileSync(join(REPO, 'apps/api/src/lib/proof-claim.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')                     // strip the prose, which discusses it
      .split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n')
    // The ONLY place staleness and a settle appear together is `reconcileProofClaim`, where a
    // person has made the decision — and there staleness is a PRECONDITION that REFUSES.
    const autoRelease = /PROOF_CLAIM_STALE_MS[\s\S]{0,200}settleProofClaim\(\s*[^,]+,\s*'released'/.test(lib)
    expect(autoRelease, 'a time-based automatic release exists — there is no proven upper bound on runIcpJob').toBe(false)
  })

  it('reconcile REFUSES a claim that is not yet stale — a fresh claim may still be a live run', () => {
    const lib = readFileSync(join(REPO, 'apps/api/src/lib/proof-claim.ts'), 'utf8')
    expect(lib).toMatch(/< PROOF_CLAIM_STALE_MS\) \{\s*\n\s*return \{ ok: false, reason: 'not_stale' \}/)
  })

  it('the operator is warned, in words, that Release is only for a run that will not finish', () => {
    expect(RECONCILE_RELEASE_WARNING).toMatch(/will NOT subsequently\s+complete/)
    expect(RECONCILE_RELEASE_WARNING).toMatch(/second batch for one attempt/)
    expect(RECONCILE_COMPLETE_WARNING).toMatch(/Completing spends the attempt/)
  })
})
