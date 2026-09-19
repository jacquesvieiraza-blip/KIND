// ⚑ 16 Sep (MVP1 · A1b) — THE PROOF STAGE GETS THE EXCEPTION STATE THE SOURCING STAGE HAS.
//
// 🛑 THE DEFECT, AND IT WAS PROVED FIVE WAYS BEFORE A LINE WAS WRITTEN. A Proof run whose
// every candidate was refused by the structural gate produced NO operator task anywhere:
//
//   1. `lib/alerts.ts` inserts into `founder_alerts` — and nothing in `routes/operator.ts` or
//      `apps/admin/src` ever reads that table. The alert is written and never read.
//   2. `founder_alerts` is itself in PENDING_MIGRATIONS, so the durable insert may not even
//      land in production (RUNTIME UNVERIFIED — code cannot see production).
//   3. `GET /operator/alerts` emits exactly seven kinds. None of them is a run failure.
//   4. `deriveLifecycle` with no programme returned `proof` / 'No action needed'.
//   5. `VidaClients.tsx` then filters any client without `needs_you` OUT of the rail entirely.
//
// So the client was told "your setup is saved and has been flagged for K.I.N.D review" — the
// founder-locked `FAILED_RUN_BODY` — and no human was told anything. The product promised a
// person who did not exist.
//
// ⚠️ THIS IS NOT A NEW MECHANISM AND NOT A SEVENTH STAGE. `sourcing_exception` is the
// established pattern: a state that KEEPS its true stage and adds an exception, mapped in
// `MODE_OF` to 'Needs you'. `proof_exception` is that pattern applied to the stage that
// lacked it. The canonical stage stays `proof`.
//
// ⚠️ AND IT IS NOT CLIENT CALIBRATION (founder decision D). `proof_calibration_failed` means
// the client SAW a set and said it was still not right; this means the SYSTEM could not
// produce a set at all. Different cause, different remedy, different copy — and reusing the
// calibration state would close `spendDoors`, show the client the phone-call UX and block the
// retry. The two must stay distinguishable.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  deriveLifecycle, LIFECYCLE_STAGES, type LifecycleFacts,
} from './programme-lifecycle'

const REPO = join(__dirname, '../../../..')
const codeOnly = (src: string) =>
  src.split('\n').filter(l => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n')

/** A pre-programme client, healthy, mid-Proof. Every A1b case is a variation on this. */
const midProof = (over: Partial<LifecycleFacts> = {}): LifecycleFacts => ({
  programme: null,
  proofStarted: true,
  preparationStopped: false,
  preparing: false,
  humanBlockers: [],
  readinessReady: false,
  sends: 0,
  repliesAwaitingDecision: 0,
  senderSendable: true,
  killSwitchOff: false,
  operatorRunEnabled: false,
  remainingEntitlement: 0,
  hasNewerProgramme: false,
  repeatDismissed: false,
  ...over,
})

// ─────────────────────────────────────────────────────────────────────────────
// Ⓐ THE EXCEPTION ITSELF
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓐ · zero-eligible Proof is a Vida task', () => {
  it('🛑 THE DEFECT, PINNED — a healthy mid-Proof client is NOT a task', () => {
    const v = deriveLifecycle(midProof())
    expect(v.stage).toBe('proof')
    expect(v.needsYou).toBe(false)
    expect(v.needsYouReason).toBe(null)
    expect(v.mode).toBe('No action needed')
  })

  it('a zero-eligible run makes it one — Needs you, with a nameable reason', () => {
    const v = deriveLifecycle(midProof({ proofNoEligibleSet: true }))
    expect(v.state).toBe('proof_exception')
    expect(v.needsYou).toBe(true)
    expect(v.needsYouReason).toBe('proof_no_eligible_set')
    expect(v.mode).toBe('Needs you')
  })

  it('🛑 AND THE CANONICAL STAGE IS STILL PROOF — no seventh stage, no re-parenting', () => {
    const v = deriveLifecycle(midProof({ proofNoEligibleSet: true }))
    expect(v.stage).toBe('proof')
    expect(v.stageLabel).toBe('Proof')
    // The same stage index a healthy Proof client has.
    expect(v.stageIndex).toBe(deriveLifecycle(midProof()).stageIndex)
  })

  it('CLIENT CALIBRATION OUTRANKS IT when both are somehow true (founder decision D)', () => {
    const v = deriveLifecycle(midProof({
      proofCalibrationFailed: true, proofNoEligibleSet: true,
    }))
    expect(v.state).toBe('proof_calibration_failed')
    expect(v.needsYouReason).toBe('proof_calibration_failed')
    expect(v.stage).toBe('proof')
  })

  it('🛑 AND THE 10-SEP CALIBRATION TASK IS REACHABLE AT ALL — it was not', () => {
    // FOUND WHILE BUILDING A1b'S SIBLING. `deriveLifecycle` returned `verdict('proof', 'proof',
    // 'proof_calibration_failed')` — the STATE stayed `'proof'` while the reason carried the
    // name. Both admin surfaces are keyed to the NAME: `vida-lifecycle-copy.ts` has a full
    // `case 'proof_calibration_failed'` and `vida/page.tsx` gates `loadCalibration` on
    // `verdict.state === 'proof_calibration_failed'`. Neither can match `'proof'`, so the one
    // Proof-stage task the product already had was built, shipped and unreachable.
    const v = deriveLifecycle(midProof({ proofCalibrationFailed: true }))
    expect(v.state, 'the calibration panel is unreachable again').toBe('proof_calibration_failed')
    expect(v.mode).toBe('Needs you')
    // And the admin's union — the one the copy switch is typed against — must contain it.
    const adminUnion = readFileSync(
      join(REPO, 'apps/admin/src/lib/vida-lifecycle-copy.ts'), 'utf8')
    expect(adminUnion).toMatch(/\|\s*'proof_calibration_failed'/)
  })

  it('and a COMPLETED Proof is not dragged back by a stale failed run', () => {
    // The client accepted a set; they are at the calculator. A zero-eligible fact that
    // survives from before that is moot, and pulling them back would be a false alarm about
    // work that has already succeeded.
    const v = deriveLifecycle(midProof({ proofCompleted: true, proofNoEligibleSet: true }))
    expect(v.stage).toBe('recommendation')
    expect(v.needsYou).toBe(false)
  })

  it('🛑 UNREADABLE FAILS SOFT — `null` must never invent a task', () => {
    // The facts file's own rule: reads fail in the direction that does NOT invent work. A
    // transient error must not raise a false alarm on every client at once.
    for (const value of [null, undefined, false] as const) {
      const v = deriveLifecycle(midProof({ proofNoEligibleSet: value }))
      expect(v.needsYou, `proofNoEligibleSet: ${String(value)}`).toBe(false)
      expect(v.state, `proofNoEligibleSet: ${String(value)}`).toBe('proof')
    }
  })

  it('a client who never started Proof is still Brief/Signup, not an exception', () => {
    const v = deriveLifecycle(midProof({ proofStarted: null, proofNoEligibleSet: null }))
    expect(v.stage).toBe('signup')
    expect(v.needsYou).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ⓑ THE SIX-STAGE MODEL IS UNTOUCHED
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓑ · no new stage was created', () => {
  it('the stage list is unchanged in length and content', () => {
    // A1b adds a STATE, never a stage. If this count moves, something re-parented Proof.
    expect(LIFECYCLE_STAGES).toEqual([
      'signup', 'proof', 'recommendation', 'sourcing', 'approval', 'live', 'review', 'completion',
    ])
  })

  it('`proof_exception` carries the `proof` stage in the source, not a new one', () => {
    const src = codeOnly(readFileSync(join(REPO, 'apps/api/src/lib/programme-lifecycle.ts'), 'utf8'))
    expect(src).toMatch(/verdict\('proof_exception', 'proof', 'proof_no_eligible_set'\)/)
  })

  it('and `MODE_OF` is still exhaustive over every state', () => {
    // A `Record<LifecycleState, VidaMode>` cannot compile with a missing key, so this asserts
    // the new state was added to the map rather than widened out of it.
    const src = codeOnly(readFileSync(join(REPO, 'apps/api/src/lib/programme-lifecycle.ts'), 'utf8'))
    expect(src).toMatch(/const MODE_OF: Record<LifecycleState, VidaMode>/)
    expect(src).toMatch(/proof_exception: 'Needs you'/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ⓒ THE FACT IS DERIVED FROM PERSISTED TRUTH — no new table, no new column
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓒ · the fact comes from rows that already exist', () => {
  const facts = () => codeOnly(
    readFileSync(join(REPO, 'apps/api/src/lib/programme-lifecycle-facts.ts'), 'utf8'),
  )

  it('it reads the latest run outcome AND the unsurfaced set-aside rows', () => {
    const src = facts()
    expect(src).toMatch(/icp_run_outcomes/)
    expect(src).toMatch(/set_aside_reason/)
    expect(src).toMatch(/surfaced_for_approval_at/)
  })

  it('🛑 THE SET-ASIDE ROWS ARE WHAT SEPARATE IT FROM A CRASH', () => {
    // `failed` has three writers and only one of them is the gate. A crash and an incomplete
    // provider search leave NO set-aside rows, so requiring at least one is what stops this
    // exception claiming a cause that is not its own.
    const src = facts()
    const fn = src.slice(src.indexOf('proofNoEligibleSetFor'))
    expect(fn).toMatch(/set_aside_reason/)
    expect(fn).toMatch(/'failed'/)
  })

  it('no migration and no new column were introduced for it', () => {
    const src = facts()
    // The two persisted sources are existing tables; nothing named for this feature exists.
    expect(src).not.toMatch(/proof_no_eligible|proof_exception_at|zero_eligible/)
  })

  it('and the bulk board read gathers it too, or the rail cannot show it', () => {
    const src = facts()
    const board = src.slice(src.indexOf('export async function lifecycleBoard'))
    expect(board, 'lifecycleBoard does not gather the exception — Vida\'s rail would miss it')
      .toMatch(/proofNoEligibleSet/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ⓓ PROVENANCE ISOLATION — it must not become client calibration by accident
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓓ · it is a SYSTEM exception, and stays one', () => {
  const facts = () => codeOnly(
    readFileSync(join(REPO, 'apps/api/src/lib/programme-lifecycle-facts.ts'), 'utf8'),
  )

  it('🛑 it never writes `proof_review_requested_at` (founder decision D)', () => {
    // That column is the CLIENT saying their set is wrong. Writing it here would close
    // `spendDoors`, show the client the phone-call UX for a cause that was ours, and block
    // the very retry this state exists to offer.
    const src = facts()
    expect(src).not.toMatch(/update\([\s\S]{0,200}proof_review_requested_at/)
  })

  it('the reader is a READ — the whole facts file writes nothing at all', () => {
    // ⛓️ TIGHTENED 18 Sep (J12-C1) · THE PROPERTY IS UNCHANGED; THE PATTERN NOW MATCHES THE
    // SEAM IT MEANS.
    // WHAT THIS REPLACED: ~~`.not.toMatch(/\.(insert|upsert|update|delete)\(/)`~~ — a ban on
    // those four words anywhere in the file, which also caught `someMap.delete(key)`. J12-C1
    // batches the continuation's `automatic_work` rows into the board and clears a superseded
    // refusal from a local `Map`, and the old pattern failed on it: a red light for a line that
    // touches no database at all.
    //
    // 🛑 AND THE NEW PATTERN IS STRICTLY STRONGER, not a relaxation. It reads every `db.from(`
    // in the file and refuses a write verb in its chain, so it now also names WHICH table a
    // write appeared on — whereas the old one could be satisfied by spelling a real write
    // `db.from(t)['upsert'](…)`. Every DB call in this file is a `db.from(…).…` chain.
    const src = facts()
    const writes: string[] = []
    for (const m of src.matchAll(/db\s*\.\s*from\(([^)]*)\)([\s\S]{0,400}?)(?=\bdb\s*\.\s*from\(|$)/g)) {
      const verb = /\.\s*(insert|upsert|update|delete)\s*\(/.exec(m[2])
      if (verb) writes.push(`${m[1].trim()} → .${verb[1]}()`)
    }
    expect(writes, 'the lifecycle facts gatherer has grown a write').toEqual([])
    // The broad ban is kept for the three verbs that have no innocent local-collection twin.
    expect(src, 'the lifecycle facts gatherer has grown a write')
      .not.toMatch(/\.(insert|upsert)\(/)
  })

  it('and the two reasons remain separately nameable', () => {
    const src = codeOnly(readFileSync(join(REPO, 'apps/api/src/lib/programme-lifecycle.ts'), 'utf8'))
    expect(src).toMatch(/'proof_calibration_failed'/)
    expect(src).toMatch(/'proof_no_eligible_set'/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ⓔ THE RAIL, THE EVIDENCE AND THE RETRY
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓔ · Vida can see it and act on it', () => {
  it('the rail filter admits it — needs_you is the whole test', () => {
    const src = codeOnly(readFileSync(
      join(REPO, 'apps/admin/src/components/vida/VidaClients.tsx'), 'utf8'))
    // Unchanged filter, deliberately: `proof_exception` earns its place by being needs_you,
    // not by being special-cased into the list.
    expect(src).toMatch(/lifecycle\[id\]\?\.needs_you === true/)
  })

  it('the panel has copy for the state, with the evidence an operator needs', () => {
    const src = codeOnly(readFileSync(
      join(REPO, 'apps/admin/src/lib/vida-lifecycle-copy.ts'), 'utf8'))
    expect(src).toMatch(/case 'proof_exception'/)
    expect(src).toMatch(/proofException/)
  })

  it('🛑 and the client-facing vocabulary never reaches the client', () => {
    // The operator panel names criteria; the CLIENT keeps `FAILED_RUN_BODY`. This asserts the
    // criterion vocabulary lives only in the admin app.
    const portal = readFileSync(
      join(REPO, 'apps/portal/src/app/(milla)/milla/page.tsx'), 'utf8')
    expect(portal).not.toMatch(/set_aside_reason|set aside/i)
  })

  it('the route DELEGATES — it does not grow its own copy of the Proof start', () => {
    const src = codeOnly(readFileSync(join(REPO, 'apps/api/src/routes/operator.ts'), 'utf8'))
    expect(src).toMatch(/operatorRouter\.post\('\/proof-retry\/:clientId'/)
    expect(src).toMatch(/retryProofAfterZeroEligible\(clientId, icpId\)/)
    // 🛑 THE ROUTE MUST NOT CLAIM AUTHORITY ITSELF. A second claim site is a second opinion
    // about the ladder; the shared function is the one door.
    expect(src).not.toMatch(/claimProofAuthority/)
    expect(src).not.toMatch(/launchProofRun/)
    // And it is audited, started or refused.
    expect(src).toMatch(/action: 'proof_retry_zero_eligible'/)
  })

  it('the shared retry claims through the ONE door, and hand-counts nothing', () => {
    const src = codeOnly(readFileSync(join(REPO, 'apps/api/src/lib/proof-run-launch.ts'), 'utf8'))
    const fn = src.slice(src.indexOf('export async function retryProofAfterZeroEligible'))
    expect(fn).toMatch(/claimProofAuthority\(clientId, icpId\)/)
    expect(fn).toMatch(/launchProofRun\(/)
    // 🛑 NO HAND-COUNTING. The ladder is the RPC's job; writing the counter here would be a
    // second opinion about how many attempts a client has had.
    expect(fn).not.toMatch(/proof_passes_done/)
    // 🛑 AND IT ASKS THE SAME READER VIDA'S RAIL ASKS — no second definition of the state.
    expect(fn).toMatch(/proofNoEligibleSetFor\(clientId\)/)
  })

  it('🛑 the retry refuses a client who is NOT in the exception', () => {
    const src = codeOnly(readFileSync(join(REPO, 'apps/api/src/lib/proof-run-launch.ts'), 'utf8'))
    const fn = src.slice(src.indexOf('export async function retryProofAfterZeroEligible'))
    // Fail closed on both "no" and "could not tell": an unreadable state must not spend a pass.
    expect(fn).toMatch(/inException !== true/)
    expect(fn).toMatch(/not_in_exception/)
  })

  it('and it verifies the ICP belongs to that client before running anything', () => {
    const src = codeOnly(readFileSync(join(REPO, 'apps/api/src/routes/operator.ts'), 'utf8'))
    const at = src.indexOf("operatorRouter.post('/proof-retry/:clientId'")
    const route = src.slice(at, at + 3000)
    expect(route).toMatch(/\.eq\('id', icpId\)\.eq\('client_id', clientId\)/)
    expect(route).toMatch(/adminKeyValid/)
  })

  it('🛑 and it does NOT weaken `firstFreeProofEligibility`', () => {
    const src = codeOnly(readFileSync(join(REPO, 'apps/api/src/lib/proof-run-launch.ts'), 'utf8'))
    // `proof_started_at IS NULL` is what makes that function first-run-only (AR21). The retry
    // is a separate caller with its own predicate precisely so this stays intact.
    expect(src).toMatch(/proof_started_at/)
    expect(src).toMatch(/proof_passes_done/)
  })
})
