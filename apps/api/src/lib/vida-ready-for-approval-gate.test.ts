// ═══════════════════════════════════════════════════════════════════════════════════════
// THE LIFECYCLE IS AN ORDER, AND VIDA OFFERED THE LAST STEP FROM THE FIRST.
//
// 🛑 WHAT THE FOUNDER SAW. On the House programme — 246 candidates, every one unjudged, no
// batch, no campaign, no sequence, no sender, nothing frozen — Vida drew an ACTIVE
// `Ready for approval` button ABOVE `Qualify sourced leads`. The locked order is
//
//     SOURCE → QUALIFY → PREPARE (campaign · sequence · sender · schedule · enrolments)
//            → FREEZE THE REVIEW SNAPSHOT → READY FOR APPROVAL
//
// and the screen presented its last step as the obvious next one.
//
// ⚠️ THE BACKEND WAS NEVER WRONG, AND THIS FILE SAYS SO RATHER THAN IMPLYING OTHERWISE.
// `markReadyForApproval` has always consulted `programmePreparationReadiness` and refuses on
// any of its thirteen requirements — `preparation-readiness.test.ts` proves each one
// behaviourally, and none of them is touched here. The defect was that `lcCan` tested the
// STATUS alone, so the control was drawn active for a transition the route would refuse.
// An operator does not learn a lifecycle from a refusal they had to trigger.
//
// ── WHAT THIS FILE PINS ────────────────────────────────────────────────────────────────
//   ① the button defers to the SERVER's readiness boolean, and hides without it
//   ② the API computes that boolean from the SAME rule the transition is gated by
//   ③ the browser re-derives none of it
//   ④ not one existing readiness requirement was removed to make this pass
//   ⑤ the qualification control approved in #1657 is unchanged
//
// ⚠️ THE VIDA HALF IS ASSERTED ON EXECUTABLE SOURCE, for the reason its sibling
// `programme-reconcile-control.test.ts` states: there is no DOM harness for admin `.tsx` in
// this repo. Every anchor below was red-proved by deliberately breaking the file it guards.
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
import { preparationBlockers, PREPARATION_REQUIREMENTS, type PreparationFacts } from './preparation-readiness'

const VIDA = readFileSync(join(__dirname, '../../../admin/src/app/vida/page.tsx'), 'utf8')
/** Executable lines only — a rule described in a comment is not a rule. */
const CODE = VIDA.split('\n')
  .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*') })
  .join('\n')
const LCCAN = CODE.slice(CODE.indexOf('function lcCan(action: string): boolean {'), CODE.indexOf('function lcCanAttachIcp'))
const ROUTES = readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')
const PROGRAMME_LIB = readFileSync(join(__dirname, 'programme.ts'), 'utf8')

// ── ① THE CONTROL DEFERS ─────────────────────────────────────────────────────────────

describe('① `Ready for approval` is offered only when the SERVER says the work is ready', () => {
  it('🛑 1 · 2 · 3 · the status test is no longer the whole test', () => {
    expect(LCCAN, 'lcCan could not be located — the anchor below proves nothing').toBeTruthy()
    const branch = LCCAN.slice(LCCAN.indexOf("case 'ready-for-approval':"), LCCAN.indexOf("case 'authorise/second':"))
    expect(branch, "the branch for 'ready-for-approval' is gone").toBeTruthy()
    // Status is still NECESSARY — nothing was relaxed.
    expect(branch).toContain("p.status === 'SOURCING_AUTHORISED'")
    expect(branch).toContain("p.status === 'SOURCING'")
    // 🛑 AND NO LONGER SUFFICIENT. Without this the control is active while 246 candidates sit
    // unjudged, while qualification is paused, and before a single prospect is surfaced.
    expect(branch, 'the button is drawn from the status alone again — the defect the founder saw')
      .toContain('prog?.readiness?.ready === true')
  })

  it('🛑 11 · absent, unreadable or unknown readiness HIDES it — `=== true`, never truthiness', () => {
    const branch = LCCAN.slice(LCCAN.indexOf("case 'ready-for-approval':"), LCCAN.indexOf("case 'authorise/second':"))
    // `readiness?.ready` alone would treat a missing field as falsy today and as ready the
    // moment somebody made it an object; `=== true` is the only form that fails closed against
    // an older API, a failed read and a field this UI was never given.
    expect(branch, 'readiness is read loosely, so a non-boolean could pass').toContain('=== true')
    expect(branch).not.toMatch(/readiness\?\.ready\s*\)/)
    // ⛓️ RETARGETED 9 Sep — the gate now also admits `preparable`, and the fail-closed rule it
    // was written to protect applies to BOTH booleans or it protects nothing. A loose read of
    // the second field would let an older API, a failed read or a non-boolean draw the button
    // just as surely as a loose read of the first.
    expect(branch).not.toMatch(/readiness\?\.preparable\s*\)/)
    expect(branch, 'preparable is read loosely, so a non-boolean could pass')
      .toContain('prog?.readiness?.preparable === true')
    expect((branch.match(/=== true/g) ?? []).length, 'a readiness field is read without `=== true`').toBe(2)
    // And the fields are declared OPTIONAL, so "the API did not send it" is expressible at all.
    expect(CODE, 'readiness is not part of the programme truth this screen reads')
      .toContain('readiness?: { ready: boolean; preparable?: boolean')
  })

  it('🛑 11 · the browser re-derives NONE of the thirteen conditions', () => {
    // A readiness rule this file could compute is a rule anybody with the console open could
    // satisfy — and a second source of truth that will drift from the route's.
    for (const derived of ['campaign_id', 'sequence_id', 'senderAssigned', 'eligibleEnrolments',
                           'reviewableLeads', 'snapshotSupported', 'preparationBlockers',
                           'review_preparation_hash', 'surfaced_for_approval_at', 'qualified_at']) {
      expect(LCCAN, `lcCan re-derives readiness from ${derived}`).not.toContain(derived)
    }
    // The whole decision is the status plus the server's answer, and nothing else.
    //
    // ⛓️ RETARGETED 9 Sep — ASSERTED ON CODE, NOT ON PROSE. The branch carries an explanatory
    // comment now, and both of the old anchors were reading it: `'&&\n'` matched a wrapped
    // sentence, and the `prog?.` count included nothing but was written when the branch was one
    // line. Neither was ever about the comment. The rule they encode — this browser derives NO
    // readiness of its own — is unchanged and is now checked against the executable lines only.
    const branch = LCCAN.slice(LCCAN.indexOf("case 'ready-for-approval':"), LCCAN.indexOf("case 'authorise/second':"))
    const code = branch.split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
    // ⛓️ RETARGETED 9 Sep — three reads now, and the third is the same kind of fact as the
    // other two: a SERVER boolean. `preparing` says a background preparation run is in flight
    // for this programme, so the control is not drawn while one is going; the founder's House
    // press ran for minutes with the button still on screen. Still no rule derived here.
    expect((code.match(/prog\?\./g) ?? []).length, 'the branch reads more programme state than the readiness answer').toBe(3)
    expect(code, 'the in-flight check is gone').toContain('prog?.preparing !== true')
    expect((code.match(/p\.status ===/g) ?? []).length, 'the branch tests statuses it did not before').toBe(2)
    // 🛑 AND NOTHING ELSE OFF THE ROW. Any other programme column here would be a local rule.
    expect(code.replace(/p\.status/g, ''), 'the branch grew a condition on another programme column')
      .not.toMatch(/\bp\.[a-z_]+/)
  })

  it('🛑 13 · and the lifecycle gained no approval, P2, Live, Run or send action', () => {
    // 🛑 STILL NO APPROVE BUTTON. The single programme approval belongs to the CLIENT, in
    // Milla; a fix to the ORDER of the lifecycle must not be the change that adds one.
    expect(CODE).not.toContain("lifecycle('approve'")
    expect(CODE).not.toContain("case 'approve':")
    // The other five controls are untouched, and each still turns on its own status.
    for (const [action, status] of [['recommend', 'DRAFT'], ['await-first-payment', 'RECOMMENDED'],
                                    ['authorise/first', 'AWAITING_FIRST_PAYMENT']] as const) {
      expect(LCCAN, `the ${action} control changed`).toContain(`case '${action}':`)
      expect(LCCAN).toContain(`p.status === '${status}'`)
    }
    expect(LCCAN, 'P2 no longer requires APPROVED').toContain("case 'authorise/second':     return p.status === 'APPROVED' && !p2")
    expect(LCCAN, 'go-live no longer requires APPROVED and P2').toContain("case 'go-live':              return p.status === 'APPROVED' && p2")
  })
})

// ── ② THE ANSWER COMES FROM THE RULE THE TRANSITION ITSELF USES ──────────────────────

describe('② the screen and the route are gated by ONE rule', () => {
  it('🛑 the API computes readiness server-side and hands over a boolean', () => {
    // ⛓️ RETARGETED 9 Sep — the same import also brings in `onlyPreparationBlocks`, so the
    // exact destructuring line changed. What matters is unchanged: the answer comes from
    // `preparation-readiness`, the module the transition itself is gated by.
    expect(ROUTES).toContain("programmePreparationReadiness")
    expect(ROUTES).toContain("await import('../lib/preparation-readiness')")
    expect(ROUTES).toContain('await programmePreparationReadiness(truth.programme.id)')
    // ⛓️ RETARGETED 9 Sep — the payload gained `preparable` and the named blockers, so the
    // one-line form is gone. The fact this case exists for is unchanged and is asserted more
    // strictly than before: the READY boolean is still computed on the SERVER and still fails
    // closed on an absent or non-boolean answer.
    expect(ROUTES).toContain('ready: readiness?.ready === true')
    expect(ROUTES, 'the second gate boolean is not computed from the same blocker list')
      // ⛓️ RETARGETED 9 Sep — `preparable` is now computed against what THIS programme's
      // preparation can actually clear. Claimed unconditionally it told a fresh paying client's
      // programme it was one press from ready when pressing could never author its words.
      .toContain('onlyPreparationBlocks(readiness.blockers)')
    // ⚠️ THE PROGRAMME'S OWN ID, from the truth already resolved — not the client, not a name,
    // not "the newest". The same discipline the reconcile availability beside it follows.
    expect(ROUTES, 'readiness is resolved from something other than the programme on screen')
      .toContain('truth.programme\n      ? await programmePreparationReadiness(truth.programme.id)')
  })

  it('🛑 an UNREADABLE readiness is false AND is said out loud, never a silently missing button', () => {
    // `programmePreparationReadiness` fails closed on every unreadable fact and returns the
    // sentence. That sentence joins the array this panel already renders in red — no new
    // panel, and "we could not tell" reaches the operator as itself.
    expect(ROUTES).toContain('degraded: readiness?.degraded ? [...truth.degraded, readiness.degraded] : truth.degraded')
    // And `?? []` is not how an unknown is handled anywhere in that expression.
    expect(ROUTES, 'an unreadable readiness is collapsed into "nothing wrong"')
      .not.toContain('readiness?.ready ?? true')
  })

  it('🛑 `markReadyForApproval` is still gated by the same rule — the backend was never the defect', () => {
    expect(PROGRAMME_LIB).toContain("const { programmePreparationReadiness } = await import('./preparation-readiness')")
    expect(PROGRAMME_LIB).toContain('const readiness = await programmePreparationReadiness(programmeId)')
    expect(PROGRAMME_LIB).toContain('if (!readiness.ready) {')
    // ⚠️ ORDER, NOT PRESENCE. A readiness check after `setStatus` would be a comment with a
    // function call in it.
    const gate = PROGRAMME_LIB.indexOf('const readiness = await programmePreparationReadiness(programmeId)')
    const set = PROGRAMME_LIB.indexOf("await setStatus(programmeId, 'READY_FOR_APPROVAL'")
    expect(gate).toBeGreaterThan(-1)
    expect(set, 'the status is set before readiness is judged').toBeGreaterThan(gate)
    // 🛑 9 · AND THE FREEZE HAPPENS IN THE SAME WRITE. A programme cannot be READY_FOR_APPROVAL
    // without a record of what it was ready WITH.
    const freeze = PROGRAMME_LIB.indexOf('const frozen = await buildPreparationSnapshot(programmeId)')
    expect(freeze).toBeGreaterThan(gate)
    expect(set).toBeGreaterThan(freeze)
    expect(PROGRAMME_LIB).toContain('review_preparation_hash: frozen.hash')
  })
})

// ── ③ NOT ONE REQUIREMENT WAS REMOVED TO MAKE THIS PASS ──────────────────────────────

describe('③ 4 · 5 · 6 · 7 · 8 · 9 · 10 · the readiness contract is intact', () => {
  /** Everything present — the only state that is ready. */
  const READY: PreparationFacts = {
    programmeStatus: 'SOURCING', paused: false,
    attachedIcpId: 'icp-1', batchId: 'batch-1', reviewableLeads: 210,
    campaignId: 'camp-1', campaignProgrammeLinked: true,
    sequenceId: 'seq-1', sequenceCampaignLinked: true, messageSteps: 3,
    cadenceConfigured: true, sendScheduleConfigured: true, senderAssigned: true,
    eligibleEnrolments: 210, foreignEnrolments: 0, snapshotSupported: true,
  }

  it('the fully prepared state is ready — otherwise every case below proves nothing', () => {
    expect(preparationBlockers(READY)).toEqual([])
  })

  it('🛑 10 · the requirement list is the contract, and all sixteen codes survive', () => {
    // A requirement quietly dropped from this list is a requirement dropped from the gate.
    expect([...PREPARATION_REQUIREMENTS].sort()).toEqual([
      'campaign_not_programme_linked', 'foreign_enrolments', 'no_attached_icp', 'no_batch',
      'no_cadence', 'no_campaign', 'no_eligible_enrolments', 'no_message_steps',
      'no_reviewable_leads', 'no_send_schedule', 'no_sender', 'no_sequence', 'no_snapshot',
      'paused', 'sequence_not_campaign_linked', 'wrong_status',
    ])
  })

  it('🛑 3 · 4 · 5 · 6 · 7 · 8 · 9 · each missing piece still blocks, one at a time', () => {
    const cases: [string, Partial<PreparationFacts>][] = [
      ['no_reviewable_leads',  { reviewableLeads: 0 }],          // nothing qualified + surfaced yet
      ['no_batch',             { batchId: null }],
      ['no_campaign',          { campaignId: null }],
      ['no_sequence',          { sequenceId: null }],
      ['no_message_steps',     { messageSteps: 0 }],
      ['no_cadence',           { cadenceConfigured: false }],
      ['no_send_schedule',     { sendScheduleConfigured: false }],
      ['no_sender',            { senderAssigned: false }],
      ['no_eligible_enrolments', { eligibleEnrolments: 0 }],
      ['foreign_enrolments',   { foreignEnrolments: 1 }],
      ['no_snapshot',          { snapshotSupported: false }],
      ['no_attached_icp',      { attachedIcpId: null }],
      ['paused',               { paused: true }],
    ]
    for (const [code, patch] of cases) {
      const blockers = preparationBlockers({ ...READY, ...patch })
      expect(blockers.map(b => b.code), `${code} no longer blocks approval`).toContain(code)
    }
  })

  it('🛑 1 · 2 · 3 · an unjudged or unsurfaced programme can never be reviewable', () => {
    // The count `reviewableLeads` is fed by is the review query itself: delivered AND surfaced
    // AND M&V-qualified AND not disqualified. 246 candidates with no verdict count ZERO, which
    // is what makes `Ready for approval` unavailable before qualification — the ordering the
    // founder asked for, enforced by the fact rather than by a screen.
    const READINESS = readFileSync(join(__dirname, 'preparation-readiness.ts'), 'utf8')
    const count = READINESS.slice(READINESS.indexOf('const { count: reviewable'), READINESS.indexOf('if (leadErr)'))
    for (const cond of [".not('delivered_at', 'is', null)", ".not('surfaced_for_approval_at', 'is', null)",
                        ".not('qualified_at', 'is', null)", ".is('disqualified_at', null)"]) {
      expect(count, `the reviewable count no longer requires ${cond}`).toContain(cond)
    }
    // And zero of them is a blocker, not a shrug.
    expect(preparationBlockers({ ...READY, reviewableLeads: 0 }).map(b => b.code)).toContain('no_reviewable_leads')
  })
})

// ── ④ THE APPROVED #1657 CONTROL IS UNCHANGED ────────────────────────────────────────

describe('④ 12 · the qualification control the founder approved did not move', () => {
  it('🛑 it is still there, still says the same thing, still posts to the same door', () => {
    expect(CODE).toContain("{qualBusy ? 'Qualifying…' : 'Qualify sourced leads'}")
    expect(CODE).toContain('sourced leads are ready to be checked against this programme')
    expect(CODE).toContain('`/api/proxy/operator/programme/${encodeURIComponent(id)}/qualify-batch`')
    expect(CODE).toContain('{prog.reconcile?.available && (')
    expect(CODE, 'the obsolete control came back').not.toContain('Account for delivered sourcing')
  })

  it('🛑 12 · and it is NOT gated on readiness — qualifying is what MAKES a programme ready', () => {
    // The two controls are deliberately governed by different facts. Gating the qualify button
    // on readiness would be a deadlock: nothing can qualify until it is ready, and nothing can
    // be ready until it has qualified.
    const offer = CODE.slice(CODE.indexOf('{prog.reconcile?.available && ('), CODE.indexOf('{qualConfirm && ('))
    expect(offer, 'the qualification control now waits for the readiness it produces')
      .not.toContain('readiness')
  })
})
