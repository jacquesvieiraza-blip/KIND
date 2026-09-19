// ══════════════════════════════════════════════════════════════════════════════════════════
// A CLIENT PARKED FOR TRANSLATION IS AN OPERATOR TASK, NOT A CALM PROOF (19 Sep · R135)
//
// 🛑 WHAT EARNED THIS, MEASURED ON PRODUCTION. Northstar Operations Studio's ICP was flagged
// for human translation at promotion, so `POST /icps/:id/proof` refused at `icps.ts:7105`
// before claiming anything — `proof_passes_done` 0, `proof_records_committed` 0, zero leads,
// no search ever made. The client was shown the founder-locked sentence *"Your setup is saved
// and has been flagged for K.I.N.D review."*
//
// And nobody was told. Three independent surfaces each held half the truth:
//
//   1. promotion writes an `icp_review_pending` operator task — and NOTHING in `apps/admin/src`
//      reads that kind, so it sits in a table no console renders;
//   2. `deriveLifecycle` returned `proof` → "No action needed", because the only Proof-stage
//      exception it knew (`proofNoEligibleSet`) requires leads that were bought and then
//      refused, and this client has none — nothing was ever bought;
//   3. Vida's panel therefore drew the ordinary Proof card — *"Targeting: Calibrating · Client:
//      Reviewing · Vida: No action needed"* — with no control at all.
//
// So the client's screen said WE were acting and the operator's screen said THEY were. Seven
// clients sat in that deadlock. This is the state that ends it.
//
// ⚠️ IT IS NOT `proof_no_eligible_set`, AND THE DIFFERENCE IS THE CAUSE. That exception means
// we produced a set and our own gate refused every candidate — targeting that needs correcting.
// This means we never searched, because the targeting has not been translated yet. Different
// cause, different remedy, and only one of them was ever visible.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { deriveLifecycle, LIFECYCLE_STAGES, type LifecycleFacts } from './programme-lifecycle'

const REPO = join(__dirname, '../../../..')

/** A pre-programme client, mid-Proof — every case here is a variation on this. */
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

describe('a client whose targeting is not translated yet', () => {
  it('🛑 THE ANTI-VACUITY CASE — an ordinary Proof client is still silent', () => {
    // Without this, every assertion below would pass on a function that flagged everybody.
    const v = deriveLifecycle(midProof())
    expect(v.state).toBe('proof')
    expect(v.mode).toBe('No action needed')
    expect(v.needsYouReason).toBeNull()
  })

  it('🛑 IS A TASK — Vida interrupts, because nothing moves until a person acts', () => {
    const v = deriveLifecycle(midProof({ awaitingIcpTranslation: true }))
    expect(v.state, 'the parked client still reads as an ordinary Proof').toBe('proof_awaiting_translation')
    expect(v.mode, 'the operator is told there is nothing to do').toBe('Needs you')
    expect(v.needsYouReason).toBe('icp_awaiting_translation')
  })

  it('🛑 AND IT KEEPS ITS TRUE STAGE — an exception is not a new stage', () => {
    const v = deriveLifecycle(midProof({ awaitingIcpTranslation: true }))
    expect(v.stage, 'the ribbon moved the client somewhere they are not').toBe('proof')
    expect(LIFECYCLE_STAGES).toContain(v.stage)
  })

  it('🛑 IT OUTRANKS THE NO-ELIGIBLE-SET EXCEPTION — we never searched, so that is not the cause', () => {
    const v = deriveLifecycle(midProof({ awaitingIcpTranslation: true, proofNoEligibleSet: true }))
    expect(v.state).toBe('proof_awaiting_translation')
    expect(v.needsYouReason, 'an operator would be sent to fix targeting we never used').toBe('icp_awaiting_translation')
  })

  it('🛑 AND A CLIENT THE CLIENT THEMSELVES BLOCKED KEEPS THEIR OWN VERDICT', () => {
    // `proofCalibrationFailed` means they saw a set and said it was wrong — they are owed a
    // call, and the call is what unblocks them (founder decision D). That outranks ours.
    const v = deriveLifecycle(midProof({ awaitingIcpTranslation: true, proofCalibrationFailed: true }))
    expect(v.state).toBe('proof_calibration_failed')
  })

  it('a completed Proof is not pulled back — they are at the calculator, moving forward', () => {
    const v = deriveLifecycle(midProof({ awaitingIcpTranslation: true, proofCompleted: true }))
    expect(v.state).toBe('recommendation')
  })

  it('🛑 AND AN UNREADABLE ANSWER INVENTS NOTHING — null is not a task', () => {
    // A transient read failure must not raise an operator task on every client at once.
    for (const value of [null, undefined, false] as const) {
      const v = deriveLifecycle(midProof({ awaitingIcpTranslation: value }))
      expect(v.state, `awaitingIcpTranslation=${String(value)} invented a task`).toBe('proof')
      expect(v.mode).toBe('No action needed')
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// THE OTHER TWO SURFACES — the state is useless if the panel cannot render it
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('the operator is given something to press', () => {
  const copy = readFileSync(join(REPO, 'apps/admin/src/lib/vida-lifecycle-copy.ts'), 'utf8')

  it('🛑 VIDA HAS A CASE FOR IT, AND IT CARRIES A CONTROL', () => {
    expect(copy, 'the admin union cannot even receive this state').toContain("| 'proof_awaiting_translation'")
    expect(copy, 'the panel has no case, so it would fall through to the calm Proof card')
      .toContain("case 'proof_awaiting_translation':")
    expect(copy, 'a Needs-you with no button is an alarm, not a task')
      .toContain("key: 'resolve_icp_review'")
  })

  it('🛑 AND IT SAYS WHO IS WAITING — not "calibrating", which reads as work in progress', () => {
    const block = copy.slice(
      copy.indexOf("case 'proof_awaiting_translation':"),
      copy.indexOf("case 'proof':", copy.indexOf("case 'proof_awaiting_translation':")),
    )
    expect(block).toContain("vidaCard('Needs you')")
    expect(block, 'the panel does not say that nothing has been searched').toMatch(/Nothing yet|Nothing has been searched/)
    expect(block, 'the operator is not told a retry is free').toMatch(/costs them nothing|no records bought/)
  })

  it('🛑 THE FACT IS READ FROM THE SAME COLUMNS THE GATE ITSELF READS', () => {
    // If the panel and the refusal consulted different sources they could disagree about who
    // is blocked, which is the class of defect this whole repair exists to end.
    const facts = readFileSync(join(REPO, 'apps/api/src/lib/programme-lifecycle-facts.ts'), 'utf8')
    expect(facts).toContain('export async function awaitingIcpTranslationFor')
    expect(facts, 'the fact re-derives the gate rather than sharing it').toContain('icpNeedsReview')
    expect(facts, 'the verdict is not given the fact at all').toContain('awaitingIcpTranslationFor(clientId)')
  })
})
