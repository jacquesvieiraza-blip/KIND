// ═══════════════════════════════════════════════════════════════════════════════════════
// 🛑 THE HAPPY PATH ENDED IN SILENCE.
//
// ── WHAT THE 10 SEP AUDIT FOUND (item A) ────────────────────────────────────────────────
//
// The canonical flow is: the client reacts to their Proof set, says "These are right", Proof
// COMPLETES, and they move to the programme calculator. Three separate things were missing.
//
//   ① **"These are right" wrote nothing.** The control was
//      `onAccept={() => { void loadCalibration() }}` — a GET — under a comment that read
//      "Records that the set is right; Proof is finished". A search for any completion signal
//      across the API, portal, admin, shared and every migration returned NOTHING. So a
//      satisfied client produced no record, no alert and no stage change: Vida read "Proof ·
//      No action needed" and Milla still said "Milla is finding your first examples".
//
//   ② **"Looks right" wrote no feedback**, so #1673 counted zero of them. `readAttempts`
//      reads `looksRight` from `lead_feedback.action = 'approve'`; the button called
//      `/proof-accept`, which recorded nothing, and only the optional note box ever wrote
//      that action. `second.looksRight === 0` was therefore true for virtually everybody, and
//      the `second_set_mostly_rejected` trigger — `looksRight === 0 && notAFit * 2 >=
//      surfaced` — handed a client who marked TEN of twenty "Looks right" to a human as a
//      calibration failure.
//
//   ③ **"Not a fit" could lose the client's rejection entirely.** `passLead` destructured
//      `{ data }` only, so a REFUSED `leads.status` write was indistinguishable from "no such
//      lead" and the route answered 404 "already actioned" on a card still on screen. The
//      reason chip renders only AFTER a successful pass, so no `lead_feedback` row was written
//      either — and the two-attempt rule then read zero rejections. There is a live reason to
//      expect that refusal: `'passed'` is not in the CHECK the schema of record declares.
//
// Mocks only. No provider, no database, no network, nothing sourced, nothing sent.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('@kind/db', () => ({ db: {} }))

import {
  proofUiState, calibrationVerdict, type CalibrationState, type AttemptSummary,
} from './proof-calibration'
import { millaStage } from '@kind/shared'
import { deriveLifecycle, type LifecycleFacts } from './programme-lifecycle'
import { PENDING_MIGRATIONS } from './pending-migrations'

const API = join(__dirname, '..')
const PORTAL = join(API, '..', '..', 'portal', 'src')
const raw = (p: string) => readFileSync(p, 'utf8')
const code = (s: string) => s.split('\n')
  .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*') })
  .join('\n')

const LEADS = raw(join(API, 'routes', 'leads.ts'))
const IO = raw(join(API, 'lib', 'proof-calibration-io.ts'))
const APPROVE = raw(join(API, 'lib', 'approve-lead.ts'))
const FACTS = raw(join(API, 'lib', 'programme-lifecycle-facts.ts'))
const PROOF_UI = raw(join(PORTAL, 'components', 'milla', 'ProofCalibration.tsx'))
const HOME = raw(join(PORTAL, 'app', '(milla)', 'milla', 'page.tsx'))

  // ⚑ 11 Sep — `kind` defaults to 'automatic', which is what every case in this file is
  // about. The calibrated restart is a DIFFERENT history event and never an automatic
  // attempt; `proof-restart-authority.test.ts` is where that distinction is exercised.
const attempt = (over: Partial<AttemptSummary> = {}): AttemptSummary =>
  ({ pass: 2, kind: 'automatic', surfaced: 20, looksRight: 0, notAFit: 0, reasons: {}, notes: [], ...over })

const state = (over: Partial<CalibrationState> = {}): CalibrationState =>
  ({ passesDone: 1, escalated: false, attempts: [], ...over })

const BASE: LifecycleFacts = {
  programme: null, proofStarted: true,
  preparationStopped: false, preparing: false, humanBlockers: [], readinessReady: false,
  sends: 0, repliesAwaitingDecision: 0, senderSendable: true,
  killSwitchOff: false, operatorRunEnabled: false,
  remainingEntitlement: 0, hasNewerProgramme: false, repeatDismissed: false,
}

describe('🛑 ① "These are right" is a fact now, and it is idempotent', () => {
  it('the accept control POSTs, and the old GET is gone', () => {
    const c = code(HOME)
    expect(c).toContain("api.post('/leads/proof/complete', {}, await token())")
    expect(c.includes('onAccept={() => { void loadCalibration() }}'),
      'the accept control records nothing again').toBe(false)
  })

  it('🛑 it sources nothing — no pass claim, no provider, no run', () => {
    const fn = IO.slice(IO.indexOf('export async function completeProof'),
                        IO.indexOf('export const PROOF_COMPLETION_MIGRATION'))
    expect(fn.length).toBeGreaterThan(0)
    const c = code(fn)
    for (const forbidden of [
      'try_claim_proof_pass', 'runIcpJob', 'sourceProgramme', 'pdl', 'apollo',
      'servePoolLeads', 'rpc(', 'sendConsentEmail', 'sendSequenceEmail',
    ]) {
      expect(c.toLowerCase().includes(forbidden.toLowerCase()),
        `completion reaches into sourcing: ${forbidden}`).toBe(false)
    }
    expect(c).toContain("db.from('clients')")
  })

  it('IDEMPOTENT — the first acceptance is the one recorded', () => {
    const c = code(IO)
    expect(c).toContain('if (r.completedAt) return { ok: true, completedAt: r.completedAt, alreadyComplete: true }')
    expect(c).toContain(".is('proof_completed_at', null)")
  })

  it('🛑 refused while a person already has the calibration', () => {
    // The client was told "I've paused finding people until we've spoken"; closing Proof from
    // the same screen would step over the human about to call them.
    //
    // ⛓️ STRENGTHENED 10 Sep — the first version asserted only that the REFUSAL BLOCK existed
    // (`return { ok: false, reason: 'escalated' }`), and a mutation that changed the guard to
    // `if (false)` came back GREEN: the block was still in the file, simply unreachable. The
    // CONDITION is now asserted, and so is its position before the write.
    const fn = IO.slice(IO.indexOf('export async function completeProof'),
                        IO.indexOf('export const PROOF_COMPLETION_MIGRATION'))
    const c = code(fn)
    expect(c).toContain('if (r.escalated) {')
    expect(c).toContain("ok: false, reason: 'escalated',")
    const guard = c.indexOf('if (r.escalated) {')
    const write = c.indexOf("db.from('clients')")
    expect(guard).toBeGreaterThan(-1)
    expect(write).toBeGreaterThan(-1)
    expect(guard, 'the completion is written before the escalation is checked').toBeLessThan(write)
  })

  it('the route answers a decision as 409 and an unwritable state as 503 — never a bare 500', () => {
    const c = code(LEADS)
    expect(c).toContain("leadRouter.post('/proof/complete'")
    expect(c).toContain("res.status(r.reason === 'escalated' ? 409 : 503)")
    expect(c).toContain("next: 'calculator'")
  })

  it('a missing column names the outstanding migration rather than failing generically', () => {
    expect(code(IO)).toContain("reason: migration ? 'migration_required' : 'unreadable'")
    expect(code(IO)).toContain('PROOF_COMPLETION_MIGRATION')
  })
})

describe('🛑 ② accepted retires every control, including the accept button', () => {
  it('the verdict says completed, and nothing else is offered', () => {
    const v = proofUiState(state({ completedAt: '2026-09-10T10:00:00Z' }), null, false)
    expect(v.completed).toBe(true)
    expect(v.showTheseAreRight, 'the accept button is still pressable').toBe(false)
    expect(v.showStronger).toBe(false)
    expect(v.showStillNotRight).toBe(false)
    expect(v.escalated).toBe(false)
    expect(v.ask).toBeNull()
  })

  it('⚠️ NON-VACUOUS: an un-accepted client still gets their controls', () => {
    const v = proofUiState(state({ attempts: [attempt({ pass: 1, notAFit: 3, reasons: { wrong_industry: 3 } })] }), null, false)
    expect(v.completed).toBe(false)
    expect(v.showTheseAreRight).toBe(true)
  })

  it('a MISSING column reads as not accepted, so the controls stay as they were', () => {
    const v = proofUiState(state(), null, false)
    expect(v.completed).toBe(false)
  })

  it('the component returns the finished state BEFORE any control is drawn', () => {
    const c = code(PROOF_UI)
    const done = c.indexOf('if (state.completed) {')
    const esc = c.indexOf('if (state.escalated) {')
    expect(done).toBeGreaterThan(-1)
    expect(done, 'a control is drawn before the finished check').toBeLessThan(esc)
    expect(c).toContain('Proof complete')
  })
})

describe('🛑 ③ Proof complete moves BOTH apps to the calculator stage', () => {
  it('Vida: recommendation, and it is NOT a task', () => {
    const v = deriveLifecycle({ ...BASE, proofCompleted: true })
    expect(v.stage).toBe('recommendation')
    expect(v.state).toBe('recommendation')
    // The client is choosing a target. Vida has nothing to press.
    expect(v.needsYou).toBe(false)
    expect(v.needsYouReason).toBeNull()
  })

  it('Milla: Recommendation, with no programme row in existence', () => {
    expect(millaStage({ status: null, proofComplete: true })).toBe('Recommendation')
    expect(millaStage({ status: null })).toBe('Proof')
    expect(millaStage({ status: null, proofComplete: false })).toBe('Proof')
  })

  it('🛑 …so the two apps agree, which they did not before', () => {
    const vida = deriveLifecycle({ ...BASE, proofCompleted: true }).stage
    const milla = millaStage({ status: null, proofComplete: true }).toLowerCase()
    expect(vida).toBe(milla)
  })

  it('an ESCALATED client keeps their task even if a completion also existed', () => {
    const v = deriveLifecycle({ ...BASE, proofCompleted: true, proofCalibrationFailed: true })
    expect(v.needsYouReason).toBe('proof_calibration_failed')
  })

  it('an unreadable completion keeps the client at Proof — it never promotes them', () => {
    expect(deriveLifecycle({ ...BASE, proofCompleted: null }).stage).toBe('proof')
    expect(millaStage({ status: null, proofComplete: undefined })).toBe('Proof')
  })

  it('once a programme exists the STATUS decides, whatever the Proof history says', () => {
    expect(millaStage({ status: 'SOURCING', proofComplete: true })).toBe('Sourcing')
    expect(millaStage({ status: 'LIVE', proofComplete: true })).toBe('Live')
  })
})

describe('🛑 ④ the satisfied-client escalation defect (#1673) is closed', () => {
  it('"Looks right" writes the positive feedback the rule counts', () => {
    const accept = LEADS.slice(LEADS.indexOf("leadRouter.post('/:id/proof-accept'"))
    expect(code(accept)).toContain("action: 'approve',")
    expect(code(accept)).toContain("db.from('lead_feedback').upsert({")
  })

  it('…written BEFORE the eligibility gates, so the reaction is theirs whatever we decide', () => {
    const accept = LEADS.slice(LEADS.indexOf("leadRouter.post('/:id/proof-accept'"))
    const fb = accept.indexOf("action: 'approve',")
    const funded = accept.indexOf('fundedVia(fundingRows')
    expect(fb).toBeGreaterThan(-1)
    expect(fb, 'the reaction is only recorded on the happy path').toBeLessThan(funded)
  })

  it('🛑 and with it counted, a half-happy second set does NOT escalate', () => {
    // The exact shape that used to page an operator: ten right, ten wrong, on attempt 2.
    const half = state({
      passesDone: 2,
      attempts: [attempt({ pass: 2, surfaced: 20, looksRight: 10, notAFit: 10, reasons: { wrong_industry: 10 } })],
    })
    expect(calibrationVerdict(half, 'gave_feedback').close, 'a half-happy set escalated').toBe(false)
  })

  // ⛓️ 11 Sep — THIS CASE IS INVERTED, NOT DELETED, AND IT IS THE SAME FIXTURE.
  //
  // It used to prove the guard above was NON-VACUOUS: a genuinely rejected second set still
  // escalated, so "a half-happy set does not escalate" was a real distinction rather than a
  // rule that never fired. The founder's MVP1 lock removed the distinction entirely —
  // escalation may be triggered ONLY by an explicit client action equivalent to "Still not
  // right", and NOT because several prospects are Not a fit.
  //
  // ⚠️ THE NON-VACUOUSNESS CLAIM IS KEPT, AND MOVED TO THE THING THAT STILL DECIDES: the same
  // rejected set escalates the moment the client SAYS so, and not before. Without that second
  // assertion this case would pass against a `calibrationVerdict` that never closes at all.
  it('🛑 B · a genuinely rejected second set does NOT escalate on its own…', () => {
    const rejected = state({
      passesDone: 2,
      attempts: [attempt({ pass: 2, surfaced: 20, looksRight: 0, notAFit: 14, reasons: { wrong_industry: 14 } })],
    })
    expect(calibrationVerdict(rejected, 'gave_feedback').close, 'marking the set escalated it').toBe(false)
    expect(calibrationVerdict(rejected, 'none').close, 'silence escalated it').toBe(false)
  })

  it('⚠️ NON-VACUOUS: …and the SAME set escalates the moment the client says "Still not right"', () => {
    const rejected = state({
      passesDone: 2,
      attempts: [attempt({ pass: 2, surfaced: 20, looksRight: 0, notAFit: 14, reasons: { wrong_industry: 14 } })],
    })
    const v = calibrationVerdict(rejected, 'still_not_right')
    expect(v.close).toBe(true)
    expect(v.close === true && v.trigger).toBe('client_said_still_not_right')
  })

  it('the feedback write can never fail the client\'s reaction', () => {
    const accept = LEADS.slice(LEADS.indexOf("leadRouter.post('/:id/proof-accept'"))
    expect(code(accept)).toContain('try {')
    expect(code(accept)).toContain("console.error('[proof-accept] lead_feedback")
  })
})

describe('🛑 ⑤ "Not a fit" keeps the client\'s rejection whatever the column decides', () => {
  it('the pass records the negative feedback itself, before the status write', () => {
    const c = code(LEADS)
    const passStart = c.indexOf("post('/:id/pass'")
    const handler = c.slice(passStart, c.indexOf('leadRouter.post(', passStart + 10))
    expect(handler).toContain("action: 'pass',")
    expect(handler.indexOf("action: 'pass',")).toBeLessThan(handler.indexOf('passLead(req.params.id'))
  })

  it('🛑 a REFUSED write is no longer reported as "already actioned"', () => {
    const c = code(APPROVE)
    expect(c).toContain("if (error) {")
    expect(c).toContain("return { status: 'failed', detail: error.message }")
    expect(c.includes("return { status: data ? 'passed' : 'not_found' }")).toBe(true)
  })

  it('…and the route says something true about it', () => {
    const c = code(LEADS)
    expect(c).toContain("code: 'pass_not_stored'")
    expect(c).toContain('Your feedback is saved')
    // 🛑 IT MUST NOT CLAIM THE CARD WENT. The client can still see it.
    expect(c).toContain('the card may still be here when you reload')
  })

  it('the constraint is NOT widened — no migration touches leads_status_check', () => {
    // Founder-locked: `20260910_lead_set_aside_reason` says "do not widen that CHECK".
    // ⚠️ SCANNED FOR A STATEMENT, NOT A MENTION. `20260910_lead_set_aside_reason`'s COMMENT
    // explains at length why it does NOT widen the CHECK — banning the words would fail on
    // the very text that proves the property.
    for (const m of PENDING_MIGRATIONS) {
      expect(/(ALTER|ADD|DROP)[^\n]*leads_status_check/i.test(m.sql),
        `${m.key} alters the status CHECK`).toBe(false)
      expect(/status IN \([^)]*'passed'/i.test(m.sql),
        `${m.key} widens the status vocabulary to include 'passed'`).toBe(false)
    }
  })
})

describe('🛑 ⑥ Vida sees an escalated or finished Proof on the BOARD, not only in the panel', () => {
  it('the board reads both client-level Proof facts, once for everybody', () => {
    const c = code(FACTS)
    expect(c).toContain("db.from('clients')")
    expect(c).toContain('proof_review_requested_at, proof_review_resolved_at, proof_completed_at')
    expect(c).toContain('proofCalibrationFailed: proofFactsRead ? escalatedProof.has(clientId) : null')
    expect(c).toContain('proofCompleted: proofFactsRead ? completedProof.has(clientId) : null')
  })

  it('…and an unreadable read asserts NOTHING rather than "this client is fine"', () => {
    expect(code(FACTS)).toContain('proofFactsRead = false')
  })

  it('the detail panel reads the completion too, so the row and the panel agree', () => {
    expect(code(FACTS)).toContain('proofCompletedFor(clientId)')
    expect(code(FACTS)).toContain('programme: null, proofStarted, proofCalibrationFailed, proofCompleted,')
  })
})

describe('⑦ the migration is additive and in all three homes', () => {
  const entry = PENDING_MIGRATIONS.find(m => m.key === '20260910_proof_completion')

  it('registered in the runner', () => { expect(entry).toBeTruthy() })

  it('one nullable column, no default, no backfill, nothing destructive', () => {
    const sql = entry!.sql
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS proof_completed_at timestamptz')
    expect(sql.includes('DEFAULT'), 'a column carries a default').toBe(false)
    expect(sql.includes('UPDATE public.clients'), 'existing clients were granted a completion').toBe(false)
    for (const destructive of ['DROP COLUMN', 'DROP CONSTRAINT', 'DELETE FROM']) {
      expect(sql.includes(destructive), `destructive: ${destructive}`).toBe(false)
    }
  })

  it('declared in the schema of record, and filed in supabase/migrations', () => {
    const schema = raw(join(API, '..', '..', '..', 'packages', 'db', 'src', 'schema.sql'))
    expect(schema).toContain('proof_completed_at               timestamptz')
    const file = raw(join(API, '..', '..', '..', 'supabase', 'migrations', '20260910_proof_completion.sql'))
    expect(file).toContain('ADD COLUMN IF NOT EXISTS proof_completed_at')
  })
})
