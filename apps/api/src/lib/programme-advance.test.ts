// ═══════════════════════════════════════════════════════════════════════════════════════
// THE PRE-APPROVAL CONTINUATION — what it must do, and the far longer list of what it must not.
//
// The orchestrator's whole value is that it adds NO rule. It calls two canonical functions in
// the one order that works and reports what happened. So most of these cases are absence
// proofs: no sourcing, no qualification, no settlement, no entitlement movement, no P2, no
// activation, no send. An absence is only worth asserting if the assertion would actually fail
// when the absence ends — so each one is anchored to the specific call that would appear.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'

// ⚠️ HOISTED. The modules under test import `@kind/db`, which throws at module scope without
// these. Every test here is pure or reads source — nothing touches a database or a network.
vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})
import { join } from 'node:path'
import { AT_OR_PAST_REVIEW } from './programme-advance'
import {
  PREPARATION_REQUIREMENTS, PREPARATION_CLEARS, PREPARATION_CLEARS_WITH_AUTO_SEQUENCE,
  onlyPreparationBlocks, preparationBlockers,
  type PreparationFacts,
} from './preparation-readiness'
import { PRE_APPROVAL_PREPARABLE, POST_APPROVAL_PREPARABLE } from './programme-preparation'

const LIB = join(__dirname)
const ADVANCE = readFileSync(join(LIB, 'programme-advance.ts'), 'utf8')
const READINESS = readFileSync(join(LIB, 'preparation-readiness.ts'), 'utf8')
const PROG_ROUTE = readFileSync(join(LIB, '..', 'routes', 'programme.ts'), 'utf8')
const OP_ROUTE = readFileSync(join(LIB, '..', 'routes', 'operator.ts'), 'utf8')
const VIDA = readFileSync(
  join(LIB, '..', '..', '..', 'admin', 'src', 'app', 'vida', 'page.tsx'), 'utf8')

/** The advance function's body only — so a mention inside the header prose proves nothing. */
// ⛓️ BOUNDED 9 Sep — the orchestrator and the settlement continuation, and NOT the background
// runner that was added below them. That runner legitimately reads the audit log (`.order`) and
// its prose names `autoEnrollLead` while explaining a race; an unbounded slice read both as the
// orchestrator sourcing and re-implementing preparation. `programme-advance.background.test.ts`
// asserts the same absences over the runner's own body.
const BODY = ADVANCE.slice(
  ADVANCE.indexOf('export async function advanceProgrammeToReview'),
  ADVANCE.indexOf('// THE RECOVERY DOOR RUNS IN THE BACKGROUND'),
)

describe('the settled programme resumes at preparation rather than replaying earlier work', () => {
  // ── ① THE GAP THAT WAS BEING CLOSED ───────────────────────────────────────────────────
  it('runs preparation and then the review transition, in that order and nothing between', () => {
    const prep = BODY.indexOf('prepareProgrammeOutreach(id)')
    const mark = BODY.indexOf('markReadyForApproval(id)')
    expect(prep, 'preparation is not called at all').toBeGreaterThan(-1)
    expect(mark, 'the review transition is not called at all').toBeGreaterThan(-1)
    // 🛑 THE ORDER IS THE WHOLE FIX. Marking first is exactly the deadlocked behaviour.
    expect(prep, 'the review transition runs before preparation — that is the deadlock').toBeLessThan(mark)
  })

  it('re-uses the canonical preparation and never reimplements any part of it', () => {
    // Every substantive preparation act belongs to `prepareProgrammeOutreach`. If any of these
    // appear here, a second implementation has started and will drift from the first.
    for (const forbidden of [
      'ensureCampaignForIcp', 'autoEnrollLead', 'applyHouseProgrammeSequence',
      'figsy_enrollments', 'opt_out_blocklist', 'isBusinessEmail',
    ]) {
      expect(BODY.includes(forbidden), `${forbidden} is reimplemented in the orchestrator`).toBe(false)
    }
  })

  it('never sources, and never re-runs qualification or settlement', () => {
    // ⚠️ THESE ARE THE EXPENSIVE, IRREVERSIBLE STAGES. `qualifyAndSettleBatch` may spend Apollo
    // reveal credits and consumes entitlement; `sourceProgramme` buys people. A programme that
    // has settled must resume PAST both.
    for (const forbidden of [
      'sourceProgramme', 'qualifyAndSettleBatch', 'settle_programme_batch',
      'try_reserve_programme_sourcing', 'reconcile_programme_sourcing',
      'bulkMatchEmails', 'servePoolLeads', 'enrichAndDeliverLeads',
    ]) {
      expect(BODY.includes(forbidden), `the orchestrator can reach ${forbidden}`).toBe(false)
    }
  })

  it('moves no entitlement counter itself', () => {
    for (const col of ['sourced_used', 'sourced_reserved', 'sourcing_ceiling']) {
      expect(BODY.includes(col), `the orchestrator writes ${col}`).toBe(false)
    }
  })
})

describe('it is idempotent and restart-safe', () => {
  // ── ② A SECOND PRESS IS A NO-OP, NOT A SECOND BATCH ──────────────────────────────────
  it('treats a programme already at or past the review boundary as done', () => {
    expect(AT_OR_PAST_REVIEW).toEqual(['READY_FOR_APPROVAL', 'APPROVED', 'LIVE'])
  })

  it('checks the already-advanced case BEFORE preparation, so a frozen set is never added to', () => {
    const already = BODY.indexOf('AT_OR_PAST_REVIEW.includes(statusBefore)')
    const prep = BODY.indexOf('prepareProgrammeOutreach(id)')
    expect(already, 'the already-advanced short circuit is gone').toBeGreaterThan(-1)
    // 🛑 THE 8 Sep LOCK. Once reviewable, material preparation is FROZEN — preparation ADDS
    // enrolments, so running it on a reviewable programme changes the set the client is reading
    // and the freeze taken at the transition stops describing what is on screen.
    expect(already, 'preparation could run on an already-frozen review set').toBeLessThan(prep)
  })

  it('writes nothing at all on the already-advanced path', () => {
    const start = BODY.indexOf('AT_OR_PAST_REVIEW.includes(statusBefore)')
    const end = BODY.indexOf('TERMINAL_STATUSES.includes(p.status)')
    expect(end).toBeGreaterThan(start)
    const branch = BODY.slice(start, end)
    expect(branch.includes('.update('), 'the already-advanced branch writes to the database').toBe(false)
    expect(branch.includes('.insert('), 'the already-advanced branch inserts rows').toBe(false)
    expect(branch.includes('setStatus'), 'the already-advanced branch changes the status').toBe(false)
  })

  it('re-reads the status from the row rather than assuming what it wrote', () => {
    expect(BODY).toContain('await reread(id)')
    expect(ADVANCE).toContain("db.from('programmes').select('status')")
  })
})

describe('the gate is not weakened — the caller is fixed', () => {
  // ── ③ THE INSTRUCTION THAT SHAPED THE WHOLE CHANGE ───────────────────────────────────
  // ⛓️ 11 Sep (DAY 3) — SEVENTEEN, AND THE SEVENTEENTH IS A SPLIT OF `no_sender` RATHER THAN
  // A NEW REQUIREMENT. `sender_unverified` carries the half that said "a mailbox is settled and
  // nobody has proved it can log in"; both halves still block, so nothing here is weakened. The
  // count is asserted exactly, not `toBeGreaterThanOrEqual`, so a requirement cannot be dropped
  // and hidden behind an addition.
  it('leaves every one of the seventeen requirements in the rule', () => {
    expect(PREPARATION_REQUIREMENTS.length).toBe(17)
    for (const code of [
      'wrong_status', 'paused', 'no_attached_icp', 'no_batch', 'no_reviewable_leads',
      'no_campaign', 'campaign_not_programme_linked', 'no_sequence', 'sequence_not_campaign_linked',
      'no_message_steps', 'no_cadence', 'no_send_schedule', 'no_sender', 'sender_unverified',
      'no_eligible_enrolments', 'foreign_enrolments', 'no_snapshot',
    ]) {
      expect(PREPARATION_REQUIREMENTS as readonly string[], `${code} left the rule`).toContain(code)
    }
  })

  it('does not bypass the transition — the canonical one is what moves the status', () => {
    // 🛑 The orchestrator must never write READY_FOR_APPROVAL itself. `markReadyForApproval`
    // re-proves readiness AND freezes the snapshot in the same write as the status; a direct
    // write here would produce a reviewable programme with no record of what it was ready with.
    // ⚠️ ANCHORED ON THE CALL, NOT THE WORD. `setStatus` and `READY_FOR_APPROVAL` both appear
    // in the prose above explaining why they are the transition's job — a bare word search
    // matches the explanation and proves nothing. `setStatus(` is executable; so is a status
    // write. Both were red-proved by inserting them.
    expect(BODY.includes('setStatus('), 'the orchestrator calls setStatus itself').toBe(false)
    expect(BODY.includes("status: 'READY_FOR_APPROVAL'"),
      'the orchestrator writes the reviewable status itself instead of using the transition').toBe(false)
    expect(BODY.includes(".update({ status"), 'the orchestrator writes a status directly').toBe(false)
    expect(BODY.includes('review_preparation_hash'), 'the orchestrator writes the freeze itself').toBe(false)
    expect(BODY.includes('review_preparation_snapshot'), 'the orchestrator writes the freeze itself').toBe(false)
  })

  it('refuses to advance when preparation did not complete', () => {
    const guard = BODY.indexOf('if (!prep.complete)')
    const mark = BODY.indexOf('markReadyForApproval(id)')
    expect(guard, 'incomplete preparation is not checked').toBeGreaterThan(-1)
    expect(guard, 'the transition is attempted before completeness is checked').toBeLessThan(mark)
  })

  it('reports the named blockers instead of a bare refusal', () => {
    expect(BODY).toContain('programmePreparationReadiness')
    expect(BODY).toContain('readiness.blockers.map')
  })
})

describe('P2 is not required, and no live authority is touched', () => {
  // ── ④ DEMANDING P2 HERE WOULD REBUILD THE DEADLOCK ONE GATE LATER ───────────────────
  it('never consults P2 authority', () => {
    expect(BODY.includes('p2Authorised'), 'the orchestrator requires P2').toBe(false)
    expect(BODY.includes('second_paid_at'), 'the orchestrator reads the second payment').toBe(false)
    expect(BODY.includes('second_authorised_at'), 'the orchestrator reads P2 authority').toBe(false)
  })

  it('requires P1 and says so', () => {
    expect(BODY).toContain('p1Authorised(p)')
  })

  it('never makes a programme live, activates a campaign or sends', () => {
    for (const forbidden of [
      'went_live_at', 'goLiveProgramme', 'assertGoingLive', 'activate: true',
      'mayStartCampaign', 'send-due', 'sendDue', 'approveProgramme', 'approved_at',
    ]) {
      expect(BODY.includes(forbidden), `the orchestrator can reach ${forbidden}`).toBe(false)
    }
  })

  it('only ever prepares through the pre-approval stage, whose campaign is a draft', () => {
    // The stage is decided inside `prepareProgrammeOutreach` from the STATUS, and the statuses
    // this orchestrator admits are exclusively pre-approval ones — so `activate: true` is
    // structurally unreachable from here rather than merely un-passed.
    expect(PRE_APPROVAL_PREPARABLE).toEqual(['SOURCING_AUTHORISED', 'SOURCING'])
    for (const s of PRE_APPROVAL_PREPARABLE) {
      expect(POST_APPROVAL_PREPARABLE, `${s} is also a post-approval status`).not.toContain(s)
    }
    expect(BODY).toContain('PRE_APPROVAL_PREPARABLE.includes(statusBefore)')
  })
})

describe('scoping — one exact programme, never a client, a name or an ordering', () => {
  // ── ⑤ THE RECURRING FAILURE SHAPE IN THIS PACKAGE ───────────────────────────────────
  it('requires a uuid before it reads anything', () => {
    const check = BODY.indexOf('UUID.test(id)')
    const read = BODY.indexOf("db.from('programmes')")
    expect(check, 'the id is not validated').toBeGreaterThan(-1)
    expect(check, 'the programme is read before the id is proved to be a uuid').toBeLessThan(read)
  })

  it('resolves the programme by id alone', () => {
    expect(BODY).toContain(".eq('id', id)")
    // No client-scoped or ordered resolution may pick a programme for the caller.
    expect(BODY.includes(".eq('client_id'"), 'the orchestrator resolves a programme by client').toBe(false)
    expect(BODY.includes('.order('), 'the orchestrator picks a programme by ordering').toBe(false)
  })

  it('passes the same proved id to both canonical calls, never a re-derived one', () => {
    expect(BODY).toContain('prepareProgrammeOutreach(id)')
    expect(BODY).toContain('markReadyForApproval(id)')
    expect(BODY).toContain('programmePreparationReadiness(id)')
  })
})

describe('the preparable/ready split is honest', () => {
  // ── ⑥ THE UI DEADLOCK THIS PASS ALSO HAD TO CLOSE ───────────────────────────────────
  it('every code preparation is said to clear is a real requirement', () => {
    for (const code of PREPARATION_CLEARS) {
      expect(PREPARATION_REQUIREMENTS as readonly string[], `${code} is not a requirement at all`).toContain(code)
    }
  })

  it('never claims to clear a blocker preparation cannot clear', () => {
    // 🛑 THESE ARE THE ONES A HUMAN MUST GO AND FIX. Listing any of them would draw the button
    // on a programme where pressing it changes nothing — the loop the split exists to prevent.
    for (const code of [
      'wrong_status', 'paused', 'no_attached_icp', 'no_batch',
      'no_reviewable_leads', 'no_sender', 'foreign_enrolments',
    ]) {
      expect(PREPARATION_CLEARS, `${code} is claimed to be cleared by preparation`).not.toContain(code)
    }
  })

  it('a missing sender keeps the programme unpreparable, however much else is ready', () => {
    const facts: PreparationFacts = {
      programmeId: 'p', programmeStatus: 'SOURCING', paused: false,
      attachedIcpId: 'i', batchId: 'b', reviewableLeads: 246,
      campaignId: null, campaignProgrammeLinked: false,
      sequenceId: null, sequenceCampaignLinked: false,
      messageSteps: 0, cadenceConfigured: false, sendScheduleConfigured: false,
      senderAssigned: false, senderVerified: false, senderProblem: null, eligibleEnrolments: 0, foreignEnrolments: 0, snapshotSupported: false,
    }
    const blockers = preparationBlockers(facts)
    expect(blockers.map(b => b.code)).toContain('no_sender')
    expect(onlyPreparationBlocks(blockers), 'a programme with no mailbox was called preparable').toBe(false)
  })

  // ⛓️ RETARGETED 9 Sep (twice, same day) — AND THE SECOND MOVE IS A BEHAVIOUR CHANGE, NOT A
  // RELAXATION. That morning these two cases were a pair: a programme with an AUTOMATIC SEQUENCE
  // SOURCE (only the configured House launch programme) was preparable, and an identical one
  // without was NOT — because promising a fresh paying client "one press from ready" when the
  // press could never write their words was an unreachable button.
  //
  // 🛑 THE UNREACHABLE BUTTON IS STILL THE DUTY. What changed is the fact underneath it:
  // preparation now writes ANY programme's sequence from that client's own knowledge, approved
  // brief and qualified audience, and sets the default schedule. So the negative case has no
  // subject left — there is no programme for which those five cannot be cleared — and asserting
  // it would now pin the OLD behaviour and fail the moment generation works.
  //
  // The duty is kept two ways: the positive case below (a fresh programme IS preparable), and
  // the dependency case after it, which fails loudly if generation is ever removed without
  // moving those five requirements back out of `PREPARATION_CLEARS`.
  it('a fresh programme with a sender is preparable — preparation writes its sequence and schedule', () => {
    const facts: PreparationFacts = {
      programmeId: 'p', programmeStatus: 'SOURCING', paused: false,
      attachedIcpId: 'i', batchId: 'b', reviewableLeads: 246,
      campaignId: null, campaignProgrammeLinked: false,
      sequenceId: null, sequenceCampaignLinked: false,
      messageSteps: 0, cadenceConfigured: false, sendScheduleConfigured: false,
      senderAssigned: true, senderVerified: true, senderProblem: null, eligibleEnrolments: 0, foreignEnrolments: 0, snapshotSupported: false,
    }
    const blockers = preparationBlockers(facts)
    expect(blockers.length, 'nothing was blocking, so this proves nothing').toBeGreaterThan(0)
    expect(blockers.map(b => b.code), 'the sequence blocker is not even present').toContain('no_sequence')
    expect(onlyPreparationBlocks(blockers)).toBe(true)
  })

  it('🛑 the five auto-sequence requirements are cleared ONLY because preparation generates one', () => {
    // If the generation branch is ever removed, these five stop being clearable and must move
    // back out of `PREPARATION_CLEARS` — otherwise the console offers a press that cannot work,
    // which is the exact defect the split existed for. This ties the two facts together so the
    // removal cannot be silent.
    for (const code of PREPARATION_CLEARS_WITH_AUTO_SEQUENCE) {
      expect(PREPARATION_CLEARS, `${code} is promised but not in the cleared list`).toContain(code)
    }
    const generation = readFileSync(join(LIB, 'programme-preparation.ts'), 'utf8')
    expect(generation, 'preparation no longer generates a sequence, but still promises to clear no_sequence')
      .toContain('generateProgrammeSequence')
  })

  it('a fresh programme that HAS its sequence and schedule is preparable with no auto source', () => {
    // Once an operator has authored the words and the schedule exists, the only things left are
    // the campaign, the enrolments and the snapshot — all of which preparation genuinely makes.
    const facts: PreparationFacts = {
      programmeId: 'p', programmeStatus: 'SOURCING', paused: false,
      attachedIcpId: 'i', batchId: 'b', reviewableLeads: 246,
      campaignId: null, campaignProgrammeLinked: false,
      sequenceId: 's', sequenceCampaignLinked: true,
      messageSteps: 5, cadenceConfigured: true, sendScheduleConfigured: true,
      senderAssigned: true, senderVerified: true, senderProblem: null, eligibleEnrolments: 0, foreignEnrolments: 0, snapshotSupported: false,
    }
    const blockers = preparationBlockers(facts)
    expect(blockers.map(b => b.code).sort()).toEqual(['no_campaign', 'no_eligible_enrolments', 'no_snapshot'])
    expect(onlyPreparationBlocks(blockers)).toBe(true)
  })

  it('an unsourced programme is never preparable — preparation cannot invent prospects', () => {
    const facts: PreparationFacts = {
      programmeId: 'p', programmeStatus: 'SOURCING', paused: false,
      attachedIcpId: 'i', batchId: null, reviewableLeads: 0,
      campaignId: null, campaignProgrammeLinked: false,
      sequenceId: null, sequenceCampaignLinked: false,
      messageSteps: 0, cadenceConfigured: false, sendScheduleConfigured: false,
      senderAssigned: true, senderVerified: true, senderProblem: null, eligibleEnrolments: 0, foreignEnrolments: 0, snapshotSupported: false,
    }
    expect(onlyPreparationBlocks(preparationBlockers(facts))).toBe(false)
  })

  it('"ready" and "preparable" are never the same answer', () => {
    // A fully ready programme has no blockers, and `onlyPreparationBlocks` is false for it —
    // so a caller that treated them as interchangeable would hide the control on a ready
    // programme. The screen tests BOTH, which is why the distinction has to hold.
    expect(onlyPreparationBlocks([])).toBe(false)
  })

  it('the server computes both, and hands over the named blockers too', () => {
    // ⛓️ RETARGETED 9 Sep (twice, same day). The call briefly carried a proved `autoSequence`
    // fact, for the hours when only House could auto-apply copy. Preparation now writes any
    // programme's sequence, so that fact is a constant and the call is unconditional again.
    expect(OP_ROUTE).toContain('onlyPreparationBlocks(readiness.blockers)')
    expect(OP_ROUTE).toContain('ready: readiness?.ready === true')
  })

  it('an unreadable readiness is not preparable', () => {
    // `programmePreparationReadiness` fails closed with a single `unreadable` blocker, and
    // `unreadable` is not in `PREPARATION_CLEARS`, so "we could not tell" hides the button.
    expect(PREPARATION_CLEARS).not.toContain('unreadable')
    expect(onlyPreparationBlocks([{ code: 'unreadable', detail: 'x' }])).toBe(false)
    // ⛓️ RETARGETED 9 Sep (twice, same day) — the proved fact became a constant; see above.
    expect(OP_ROUTE).toContain('onlyPreparationBlocks(readiness.blockers)')
  })
})

describe('the callers', () => {
  // ── ⑦ FIX THE CALLER, NOT THE GUARD ─────────────────────────────────────────────────
  it('the deadlocked route now advances instead of marking directly', () => {
    const route = PROG_ROUTE.slice(PROG_ROUTE.indexOf("programmeRouter.post('/:id/ready-for-approval'"))
    const end = route.indexOf('programmeRouter.post', 10)
    const body = end > 0 ? route.slice(0, end) : route
    // ⛓️ RETARGETED 9 Sep — the route no longer awaits the orchestrator inline. Held open for
    // the whole chain it died at an edge with a plain-text `upstream error` on the House
    // recovery press. It now STARTS the same orchestrator in the background and answers 202.
    // The fact this case exists for is unchanged: the route goes through the orchestrator,
    // never straight to the transition.
    expect(body).toContain('startAdvanceInBackground')
    expect(body, 'the route still holds the response open for the whole chain').not.toContain('await advanceProgrammeToReview(')
    expect(body).toContain('res.status(202)')
    // 🛑 THE OLD DIRECT CALL IS WHAT MADE THE PROGRAMME UNADVANCEABLE.
    expect(body.includes('await markReadyForApproval('),
      'the route still calls the transition directly, so the deadlock stands').toBe(false)
    // And the orchestrator is what the background runner calls — proved in the module, not assumed.
    const runner = ADVANCE.slice(ADVANCE.indexOf('export function startAdvanceInBackground'))
    expect(runner).toContain('await advanceProgrammeToReview(id)')
  })

  it('the operator door exists, is key-guarded and is audited', () => {
    const at = OP_ROUTE.indexOf("operatorRouter.post('/programme/:programmeId/prepare-for-review'")
    expect(at, 'the operator door is gone').toBeGreaterThan(-1)
    const route = OP_ROUTE.slice(at, OP_ROUTE.indexOf('operatorRouter.', at + 10))
    expect(route).toContain('adminKeyValid')
    // ⛓️ RETARGETED 9 Sep — the door now starts the run and answers 202; the two audit rows
    // are written by the background runner ITSELF, on both branches, because a route that has
    // already responded cannot know how the run ended. Same two actions, moved to the only
    // place that knows the outcome.
    expect(route).toContain('startAdvanceInBackground')
    expect(route).toContain('res.status(202)')
    const runner = ADVANCE.slice(ADVANCE.indexOf('export function startAdvanceInBackground'), ADVANCE.indexOf('export interface LastPreparation'))
    expect(runner).toContain("action: 'programme_prepared_for_review'")
    expect(runner).toContain("action: 'programme_prepare_for_review_refused'")
  })

  it('the operator door drives no other lifecycle action', () => {
    const at = OP_ROUTE.indexOf("operatorRouter.post('/programme/:programmeId/prepare-for-review'")
    const route = OP_ROUTE.slice(at, OP_ROUTE.indexOf('operatorRouter.', at + 10))
    for (const forbidden of ['go-live', 'goLiveProgramme', 'approveProgramme', 'qualifyAndSettleBatch', 'sourceProgramme']) {
      expect(route.includes(forbidden), `the door can also ${forbidden}`).toBe(false)
    }
  })
})

describe('what the operator is told', () => {
  // ── ⑧ THE FOUNDER READS THESE SENTENCES, NOT THE CODE ───────────────────────────────
  it('the screen offers the control on a preparable programme as well as a ready one', () => {
    const branch = VIDA.slice(
      VIDA.indexOf("case 'ready-for-approval':"), VIDA.indexOf("case 'authorise/second':"))
    expect(branch, "the branch for 'ready-for-approval' is gone").toBeTruthy()
    expect(branch).toContain("prog?.readiness?.ready === true")
    expect(branch).toContain("prog?.readiness?.preparable === true")
    // Status is still necessary — the pre-approval statuses and no others.
    expect(branch).toContain("p.status === 'SOURCING_AUTHORISED'")
    expect(branch).toContain("p.status === 'SOURCING'")
  })

  it('the screen still derives no readiness rule of its own', () => {
    const branch = VIDA.slice(
      VIDA.indexOf("case 'ready-for-approval':"), VIDA.indexOf("case 'authorise/second':"))
    // Any of these appearing would mean the browser had started re-deriving the sixteen
    // conditions from data it does not have — a second source of truth wearing a convenience's
    // clothes, which is exactly what #1657 refused.
    for (const forbidden of ['campaign', 'sequence', 'enrolment', 'enrollment', 'sender', 'batch', 'snapshot']) {
      expect(branch.toLowerCase().includes(forbidden), `the screen re-derives ${forbidden} readiness`).toBe(false)
    }
  })

  it('the confirmation says work is created and that nothing sends', () => {
    const at = VIDA.indexOf("'ready-for-approval': `")
    expect(at, 'the confirmation is gone').toBeGreaterThan(-1)
    const line = VIDA.slice(at, VIDA.indexOf('`,', at))
    expect(line.toUpperCase()).toContain('NOTHING IS SENT')
    expect(line).toContain('draft')
    // It must name what still stands between this and a send, rather than stopping at "draft".
    expect(line, 'the copy does not say what makes it live').toContain('made live')
    expect(line, 'the copy does not say the client is the one who approves').toContain('Milla')
  })

  it('the success line reports the prepared counts from the server, not from the browser', () => {
    const at = VIDA.lastIndexOf("action === 'ready-for-approval' && adv")
    expect(at, 'the advance report is not rendered').toBeGreaterThan(-1)
    const block = VIDA.slice(at, at + 700)
    expect(block).toContain('adv.enrolled')
    expect(block).toContain('adv.already_enrolled')
    expect(block).toContain('Nothing has been sent')
  })

  it('every refusal names what is missing rather than saying "not ready"', () => {
    expect(BODY).toContain('This programme is prepared but not yet ready for the client to approve —')
    expect(BODY).toContain('could not be prepared for review')
  })

  it('the headline states plainly that nothing has been sent and cannot send yet', () => {
    const head = BODY.slice(BODY.lastIndexOf('prepared.headline ='))
    expect(head).toContain('Nothing has been sent')
    expect(head).toContain('second payment')
  })
})

describe('the rule and its documentation cannot drift apart', () => {
  it('the clears list is documented where it is defined', () => {
    const at = READINESS.indexOf('export const PREPARATION_CLEARS')
    expect(at).toBeGreaterThan(-1)
    // The paragraph above it must say what adding a code costs, because that is the only
    // thing standing between this list and someone widening it to make a screen behave.
    const doc = READINESS.slice(Math.max(0, at - 1800), at).toLowerCase()
    expect(doc).toContain("weakens the screen's gate")
  })

  it('preparation still owns the sequence and schedule for the House programme', () => {
    // The orchestrator relies on this rather than applying either itself: `no_sequence`,
    // `no_cadence` and `no_send_schedule` are in the clears list only because preparation
    // reaches `applyHouseProgrammeSequence`, which writes the sequence AND the schedule.
    const PREP = readFileSync(join(LIB, 'programme-preparation.ts'), 'utf8')
    expect(PREP).toContain('applyHouseProgrammeSequence')
    const HOUSE = readFileSync(join(LIB, 'house-sequence.ts'), 'utf8')
    expect(HOUSE).toContain('send_schedule: HOUSE_SEND_SCHEDULE')
  })
})
