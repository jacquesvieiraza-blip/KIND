// ═══════════════════════════════════════════════════════════════════════════════════════
// A CLIENT IS NEVER ASKED TO APPROVE WORK THAT DOES NOT EXIST (founder-locked 7 Sep).
//
// 🛑 THE LAUNCH-CRITICAL DEFECT. Vida offers **Ready for approval** on the House programme
// while there is no batch, no campaign, no sequence, no messaging, no cadence, no sender
// binding and no frozen review set. `markReadyForApproval` asks exactly one question —
// *"does any lead carry this programme id, delivered and surfaced?"* — which was the right
// guard for the defect it was written for (a programme going ready with NOTHING sourced) and
// is nowhere near sufficient for the thing the status actually means:
//
//   READY_FOR_APPROVAL = "a human may now look at what will run, and approve it."
//
// If the campaign, the sequence, the words, the cadence, the sender and the audience do not
// exist, there is nothing to approve — and an approval collected against nothing is worse
// than no approval, because everybody downstream treats it as consent to send.
//
// ⚠️ THIS IS A BACKEND AUTHORITY, NOT A HIDDEN BUTTON. Hiding the control in Vida would leave
// the API willing to make the transition, and UI and backend would disagree about what is
// allowed — which is how the founder finds out by pressing something that should not exist.
//
// ⚠️ AND IT NAMES THE BLOCKER. "Not ready" with no reason sends an operator hunting; every
// refusal below carries the specific missing piece, because the operator's next action
// depends entirely on WHICH one is missing.
//
// RED PROOF — before the fix `./preparation-readiness` does not exist, and
// `markReadyForApproval` succeeds on reviewable leads alone.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'

// ⚠️ HOISTED. The module imports `@kind/db`, which throws at module scope without these.
// Every test here is pure or reads source — nothing touches a database or a network.
vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})
import { join } from 'path'
import {
  preparationBlockers,
  cadenceIsConfigured,
  PREPARATION_REQUIREMENTS,
  type PreparationFacts,
} from './preparation-readiness'

/** Everything present — the shape a genuinely reviewable programme has. */
const READY: PreparationFacts = {
  programmeId: 'prog-1',
  programmeStatus: 'SOURCING_AUTHORISED',
  paused: false,
  attachedIcpId: 'icp-v4',
  batchId: 'batch-1',
  reviewableLeads: 246,
  campaignId: 'camp-1',
  campaignProgrammeLinked: true,
  sequenceId: 'seq-1',
  sequenceCampaignLinked: true,
  messageSteps: 3,
  cadenceConfigured: true,
  sendScheduleConfigured: true,
  senderAssigned: true,
  eligibleEnrolments: 246,
  foreignEnrolments: 0,
  snapshotSupported: true,
}

const without = (patch: Partial<PreparationFacts>): PreparationFacts => ({ ...READY, ...patch })
const codes = (f: PreparationFacts) => preparationBlockers(f).map(b => b.code)

describe('① a fully prepared programme is ready', () => {
  it('everything present → no blockers', () => {
    expect(preparationBlockers(READY)).toEqual([])
  })

  it('the requirement list is the contract, and it is not empty', () => {
    expect(PREPARATION_REQUIREMENTS.length).toBeGreaterThanOrEqual(10)
  })

  it('every blocker carries a specific, actionable detail — never a bare "not ready"', () => {
    for (const b of preparationBlockers(without({ batchId: null, campaignId: null, sequenceId: null }))) {
      expect(b.detail.length, `${b.code} has no usable detail`).toBeGreaterThan(30)
    }
  })
})

// ── ② EACH MISSING PIECE FAILS CLOSED, AND SAYS WHICH ────────────────────────────────

describe('② every missing piece of the preparation blocks approval', () => {
  it('🛑 no batch', () => {
    expect(codes(without({ batchId: null }))).toContain('no_batch')
  })

  it('🛑 no reviewable current-programme prospects', () => {
    expect(codes(without({ reviewableLeads: 0 }))).toContain('no_reviewable_leads')
  })

  it('🛑 no campaign', () => {
    expect(codes(without({ campaignId: null }))).toContain('no_campaign')
  })

  it('🛑 a campaign that is not positively linked to THIS programme', () => {
    // Resolving a campaign by `client_id` is how a historical campaign becomes "current".
    expect(codes(without({ campaignProgrammeLinked: false }))).toContain('campaign_not_programme_linked')
  })

  it('🛑 no sequence', () => {
    expect(codes(without({ sequenceId: null }))).toContain('no_sequence')
  })

  it('🛑 a sequence not positively linked to the campaign', () => {
    expect(codes(without({ sequenceCampaignLinked: false }))).toContain('sequence_not_campaign_linked')
  })

  it('🛑 no real message steps — an empty sequence is not reviewable content', () => {
    expect(codes(without({ messageSteps: 0 }))).toContain('no_message_steps')
  })

  it('🛑 no cadence configured', () => {
    expect(codes(without({ cadenceConfigured: false }))).toContain('no_cadence')
  })

  it('🛑 no sender assigned', () => {
    expect(codes(without({ senderAssigned: false }))).toContain('no_sender')
  })

  it('🛑 no eligible current-programme enrolments prepared', () => {
    expect(codes(without({ eligibleEnrolments: 0 }))).toContain('no_eligible_enrolments')
  })

  it('🛑 a FOREIGN enrolment in the prepared set — another programme\'s work cannot ride along', () => {
    expect(codes(without({ foreignEnrolments: 3 }))).toContain('foreign_enrolments')
  })

  it('🛑 no attached ICP', () => {
    expect(codes(without({ attachedIcpId: null }))).toContain('no_attached_icp')
  })

  it('🛑 no freeze/snapshot capability — approval must apply to exactly what will run', () => {
    expect(codes(without({ snapshotSupported: false }))).toContain('no_snapshot')
  })

  it('🛑 a paused programme is not ready', () => {
    expect(codes(without({ paused: true }))).toContain('paused')
  })

  it('🛑 the wrong status is not ready', () => {
    expect(codes(without({ programmeStatus: 'DRAFT' }))).toContain('wrong_status')
  })
})

// ── ③ MANY MISSING PIECES ARE ALL REPORTED, NOT JUST THE FIRST ───────────────────────

describe('③ the operator is told everything that is missing', () => {
  it('🛑 the House situation today — nothing prepared — names every gap at once', () => {
    const houseToday = without({
      batchId: null, campaignId: null, campaignProgrammeLinked: false,
      sequenceId: null, sequenceCampaignLinked: false, messageSteps: 0,
      cadenceConfigured: false, senderAssigned: false, eligibleEnrolments: 0,
      snapshotSupported: false,
    })
    const c = codes(houseToday)
    for (const expected of ['no_batch', 'no_campaign', 'no_sequence', 'no_message_steps', 'no_cadence', 'no_sender', 'no_eligible_enrolments', 'no_snapshot']) {
      expect(c, `the operator is not told about ${expected}`).toContain(expected)
    }
    expect(c.length).toBeGreaterThanOrEqual(8)
  })

  it('reviewable leads alone are NOT enough — the old rule, shown to be insufficient', () => {
    // 246 leads and nothing else: exactly the live House state that offered "Ready for approval".
    const leadsOnly = without({
      batchId: null, campaignId: null, campaignProgrammeLinked: false, sequenceId: null,
      sequenceCampaignLinked: false, messageSteps: 0, cadenceConfigured: false,
      senderAssigned: false, eligibleEnrolments: 0, snapshotSupported: false,
    })
    expect(leadsOnly.reviewableLeads).toBe(246)
    expect(preparationBlockers(leadsOnly).length).toBeGreaterThan(0)
  })
})

// ── ④ PREPARATION GRANTS NOTHING DOWNSTREAM ──────────────────────────────────────────

describe('④ readiness is a gate, not an authority', () => {
  const SRC = readFileSync(join(__dirname, './preparation-readiness.ts'), 'utf8')
    .split('\n').filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') }).join('\n')

  // ⚠️ THE BANNED LIST IS EXECUTORS, NOT TABLE NAMES. An earlier version banned the substring
  // `figsy`, which flagged `figsy_campaigns` / `figsy_sequences` / `figsy_enrollments` — the very
  // READS this rule exists to perform. A guard that fires on the correct implementation is not a
  // strict guard, it is a broken one, and the pressure it creates is to weaken the file. What
  // actually must never appear here is the name of anything that GRANTS or SENDS.
  it('🛑 it grants no P2, no Live and no send — it only refuses', () => {
    for (const banned of ['second_authorised_at', 'second_paid_at', 'went_live_at', 'goLiveProgramme',
                          'authoriseSecondInternal', 'approveProgramme', 'markReadyForApproval',
                          'autoEnrollLead', 'sendDay1OutreachBatch', 'sendSequenceEmail',
                          'enqueueLinkedInStep', 'dispatchLinkedInStep', 'sendDue', 'sendEmail']) {
      expect(SRC, `preparation readiness reaches ${banned}`).not.toContain(banned)
    }
  })

  it('the pure rule writes nothing at all', () => {
    for (const banned of ['.update(', '.insert(', '.upsert(', '.delete(']) {
      expect(SRC, `the readiness rule writes to the database (${banned})`).not.toContain(banned)
    }
  })
})

// ── ⑤ THE TRANSITION ACTUALLY USES IT ────────────────────────────────────────────────

describe('⑤ markReadyForApproval is gated by the canonical rule', () => {
  const PROGRAMME = readFileSync(join(__dirname, './programme.ts'), 'utf8')
    .split('\n').filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') }).join('\n')

  it('🛑 the transition consults the preparation readiness rule', () => {
    const at = PROGRAMME.indexOf('export async function markReadyForApproval')
    expect(at).toBeGreaterThan(-1)
    const rest = PROGRAMME.slice(at)
    const body = rest.slice(0, rest.indexOf('\nexport ') > -1 ? rest.indexOf('\nexport ') : rest.length)
    expect(body, 'markReadyForApproval no longer checks preparation readiness')
      .toMatch(/programmePreparationReadiness\(/)
    expect(body, 'the status is set without the readiness result deciding it')
      .toMatch(/blockers/)
  })

  it('🛑 and it sets the status only AFTER the readiness check', () => {
    const at = PROGRAMME.indexOf('export async function markReadyForApproval')
    const rest = PROGRAMME.slice(at)
    const body = rest.slice(0, rest.indexOf('\nexport ') > -1 ? rest.indexOf('\nexport ') : rest.length)
    // ⛓️ 8 Sep — the transition now also FREEZES the review snapshot in the same write, so the
    // status literal moved into a multi-line `setStatus(..., { review_preparation_* })` call.
    expect(body.indexOf('programmePreparationReadiness('))
      .toBeLessThan(body.indexOf("setStatus(programmeId, 'READY_FOR_APPROVAL'"))
    // 🛑 AND THE FREEZE IS PART OF THAT SAME WRITE. A programme can never be reviewable without
    // a record of what it was reviewable WITH.
    expect(body).toContain('review_preparation_hash: frozen.hash')
  })
})

// ── ⑥ CADENCE — A RULE, NOT A DEFAULT ────────────────────────────────────────────────
//
// 🛑 *"Do not invent a cadence if none is locked."* (founder, 7 Sep). So this is the TEST for
// one, never a fallback that supplies one. It is a real predicate rather than a hard-coded
// `false`, so the day the founder's approved cadence is persisted it starts passing on its own
// — and until then it blocks, honestly.

describe('⑥ a cadence is configured, or it is not — nothing is assumed', () => {
  it('🛑 no steps and one step are NOT a cadence — a single message has nothing to time', () => {
    expect(cadenceIsConfigured([])).toBe(false)
    expect(cadenceIsConfigured([0])).toBe(false)
    expect(cadenceIsConfigured([3])).toBe(false)
  })

  // ⛓️ CORRECTED 8 Sep. `wait_days` is the wait AFTER a step, so the value never read is the
  // LAST one. The rule originally ignored the FIRST, which is the "wait before" reading — under
  // it, a cadence of [0, 3, 4, 5, 6] passed while sending steps one and two on the same day.
  it('🛑 a ZERO wait BETWEEN two real steps is a burst, not a cadence', () => {
    expect(cadenceIsConfigured([0, 0])).toBe(false)
    expect(cadenceIsConfigured([3, 0, 4, 0])).toBe(false)
    expect(cadenceIsConfigured([0, 3, 4, 5, 6]), 'the literal locked array would send two on day one').toBe(false)
  })

  it('a real multi-step cadence is configured', () => {
    expect(cadenceIsConfigured([3, 4, 0])).toBe(true)
    expect(cadenceIsConfigured([2, 0])).toBe(true)
    expect(cadenceIsConfigured([3, 4, 5, 6, 0])).toBe(true)
  })

  it('the LAST step\'s wait is not part of the test — nothing follows the final message', () => {
    expect(cadenceIsConfigured([3, 99])).toBe(true)
    expect(cadenceIsConfigured([3, 0])).toBe(true)
  })

  it('🛑 15 · and an unconfigured cadence blocks approval', () => {
    expect(codes(without({ cadenceConfigured: false }))).toContain('no_cadence')
  })
})

// ── ⑦ THE SEND SCHEDULE IS PART OF WHAT IS APPROVED ──────────────────────────────────

describe('⑦ timing is approved work, not a system setting', () => {
  it('🛑 no send schedule blocks approval', () => {
    // Without one every send is refused, so a programme could be declared reviewable and then
    // be unable to run — and a schedule added AFTER approval changes work the client never saw.
    expect(codes(without({ sendScheduleConfigured: false }))).toContain('no_send_schedule')
  })
})
