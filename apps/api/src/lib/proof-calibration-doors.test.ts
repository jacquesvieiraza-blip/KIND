// ═══════════════════════════════════════════════════════════════════════════════════════
// EVERY DOOR THAT COULD SPEND, AND WHERE IT IS SHUT.
//
// `proof-calibration.test.ts` proves the RULE. This file proves the ROUTES obey it — because
// the founder locked the boundary explicitly: *"UI is not the safety boundary."* A hidden
// button is a courtesy; a refused route is the control.
//
// ⚠️ SOURCE-SHAPE, DELIBERATELY. These are single guards inside long database paths that no
// unit test reaches without a live Postgres and a paid provider, and each is a line a later
// edit quietly removes while fixing something next to it. What can be proved behaviourally
// is proved that way next door.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PENDING_MIGRATIONS } from './pending-migrations'

const API = join(__dirname, '..')
const ICPS = readFileSync(join(API, 'routes', 'icps.ts'), 'utf8')
const LEADS = readFileSync(join(API, 'routes', 'leads.ts'), 'utf8')
const OPERATOR = readFileSync(join(API, 'routes', 'operator.ts'), 'utf8')
const LIFECYCLE = readFileSync(join(__dirname, 'programme-lifecycle.ts'), 'utf8')
const FACTS = readFileSync(join(__dirname, 'programme-lifecycle-facts.ts'), 'utf8')
const IO = readFileSync(join(__dirname, 'proof-calibration-io.ts'), 'utf8')

const code = (s: string) => s.split('\n')
  .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
  .join('\n')

describe('🛑 ① the paid Proof pass refuses an escalated client before it claims', () => {
  it('the guard is there, and it runs BEFORE try_claim_proof_pass', () => {
    const c = code(ICPS)
    const guardAt = c.indexOf('if (cal.escalated) {')
    const claimAt = c.indexOf("db.rpc('try_claim_proof_pass'")
    expect(guardAt, 'the escalated-client guard is gone from the Proof route').toBeGreaterThan(-1)
    expect(claimAt).toBeGreaterThan(-1)
    expect(guardAt, 'the guard runs after the claim, so an escalated client can spend').toBeLessThan(claimAt)
  })

  it('🛑 …and it refuses on `escalated`, NOT on the doors — the distinction is a real defect', () => {
    // `automaticProofPass` is false for BOTH "a person already has this" and "both passes
    // spent, nobody told yet". Refusing the second here returns before the hand-off that
    // OPENS the review, so the client gets a 409 and nobody at K.I.N.D is told.
    const c = code(ICPS)
    expect(c.includes('if (!cal.doors.automaticProofPass) {'),
      'the Proof route refuses before the hand-off can open a review').toBe(false)
  })

  // ── 🛑 ⛓️ 11 Sep (C43) — THIS CASE IS INVERTED, AND THE REASON IT CHANGED IS THE POINT ──
  //
  // It used to REQUIRE that an unreadable calibration state fall through to the claim RPC.
  // That was right while the RPC was the only remaining door: it refuses a third AUTOMATIC
  // pass whatever the read said, so continuing could not mint a paid batch, and refusing here
  // instead would have returned before the hand-off that opens the operator review — losing
  // the review and the alert.
  //
  // 🛑 IT IS NO LONGER THE ONLY DOOR. The calibrated restart is claimable in this route now
  // (C39), and the RPC does not guard it. So "we could not read the calibration state" now
  // means we do not know whether this client is escalated, whether a restart was granted, or
  // whether it has already been spent — and the founder's rule for that answer is explicit:
  // uncertain authority state must FAIL SAFE, do not expose restart because the read failed,
  // and do not spend.
  //
  // ⚠️ THE OLD CONCERN IS ANSWERED, NOT OVERRULED. The refusal is 503-RETRYABLE and says
  // nothing was spent, so a transient fault is not dressed as a final refusal and the client
  // reaches the hand-off on the next attempt, when the state can actually be read.
  it('🛑 H · an unreadable calibration state REFUSES — it cannot expose restart or spend', () => {
    const c = code(ICPS)
    expect(c, 'the unreadable read still falls through to the claim').not.toContain('deferring to try_claim_proof_pass')
    expect(c).toContain('REFUSING (C43)')
    // ⚠️ AND IT REFUSES AS RETRYABLE, so a blip is never a final-sounding "we have shown you
    // two sets" to a client who may have neither.
    const at = c.indexOf('REFUSING (C43)')
    const after = c.slice(at, at + 700)
    expect(after).toContain('res.status(503)')
    expect(after).toContain('retryable: true')
    expect(after).toContain('nothing was spent')
    expect(after, 'an unreadable state must return, never fall through').toContain('return')
  })

  it('🛑 the hard server backstop is untouched — no migration re-defines the claim RPC', () => {
    // Founder-locked: the existing third-pass refusal REMAINS the backstop. A migration that
    // redefined it would be the one change able to widen the only control that cannot be
    // argued with, so the restart deliberately does not go through it.
    // ⚠️ SCOPED TO THIS BATCH'S MIGRATIONS. `20260822_free_proof_acquisition` legitimately
    // CREATED the RPC and must keep saying so; the duty is that nothing added since — least
    // of all the C07 hand-off — redefines it.
    for (const key of ['20260910_proof_calibration_handoff', '20260910_lead_set_aside_reason']) {
      const m = PENDING_MIGRATIONS.find(x => x.key === key)
      expect(m, key).toBeTruthy()
      // ⚠️ TESTED AS A REDEFINITION, NOT AS A WORD. The C07 migration's own COMMENT explains
      // that it leaves the RPC alone, so a bare substring search matches the very prose that
      // documents the rule. What must never appear is a CREATE/REPLACE or DROP against it.
      expect(/(?:create\s+(?:or\s+replace\s+)?function|drop\s+function)[^;]*try_claim_proof_pass/i.test(m!.sql),
        `migration ${key} redefines the pass-claim backstop`).toBe(false)
    }
    // ⚠️ AND THE RESTART ROUTE NEVER CALLS IT. Asserted as a CALL, because the audit detail
    // deliberately says the RPC is unchanged — that sentence is the promise, not a breach.
    const restartBody = code(OPERATOR).slice(
      code(OPERATOR).indexOf('/proof-review/:clientId/restart'),
      code(OPERATOR).indexOf('/proof-review/:clientId/restart') + 2600)
    expect(/rpc\(\s*['"]try_claim_proof_pass/.test(restartBody),
      'the operator restart route claims through the automatic backstop').toBe(false)
  })
})

describe('🛑 ② the loop closes on the client\'s verdict, not on a third request', () => {
  it('the feedback route evaluates the hand-off', () => {
    const c = code(LEADS)
    expect(c).toContain("closeCalibrationLoop(clientId, 'gave_feedback')")
    // …and reports it in the same round-trip, so the screen never draws a control the server
    // would refuse.
    expect(c).toContain('res.json({ success: true, recorded: true, calibration })')
  })

  it('🛑 …and a hand-off failure never loses the client\'s answer', () => {
    // The card verdict is written first and is not conditional on the escalation write. A
    // client who marks twelve cards and hits a hiccup must not lose twelve answers.
    const c = code(LEADS)
    const upsertAt = c.indexOf("db.from('lead_feedback').upsert")
    const closeAt = c.indexOf('closeCalibrationLoop')
    expect(upsertAt).toBeGreaterThan(-1)
    expect(upsertAt, 'the escalation is decided before the feedback is recorded').toBeLessThan(closeAt)
    expect(c).toContain('the feedback itself is recorded')
  })

  it('"Still not right" and the phone answer are ROUTES, not screen state', () => {
    const c = code(LEADS)
    expect(c).toContain("leadRouter.post('/proof/still-not-right'")
    expect(c).toContain("leadRouter.post('/proof/phone'")
    // The phone door exists only while a calibration is open — it is not a profile editor.
    expect(c).toContain('There is no calibration call to arrange right now.')
  })

  it('the escalation ask is built server-side from the stored number', () => {
    // A screen that composed the sentence could invent a number, or drop the confirmation
    // question and just take one.
    expect(code(LEADS)).toContain('escalationAsk(cal.phone)')
  })

  it('🛑 the write is conditional, so two signals cannot escalate twice', () => {
    const c = code(IO)
    expect(c).toContain(".is('proof_review_requested_at', null)")
    expect(c).toContain("proof_escalation_trigger: verdict.trigger")
  })

  it('a hand-off that cannot be recorded says which migration is missing', () => {
    expect(IO).toContain('CALIBRATION_MIGRATION')
    expect(code(IO)).toContain("reason: missing ? 'migration_required' : 'unreadable'")
  })
})

describe('🛑 ③ Proof reaches Needs you, as a REASON and not a stage', () => {
  it('the reason exists and the eight stages are untouched', () => {
    const c = code(LIFECYCLE)
    expect(c).toContain("| 'proof_calibration_failed'")
    // The locked eight, asserted as the LIST rather than as one source line — the array is
    // formatted across lines and a whitespace change is not a product change. A NINTH stage
    // would be, which is what this catches.
    const stages = /LIFECYCLE_STAGES = \[([\s\S]*?)\] as const/.exec(c)?.[1] ?? ''
    expect([...stages.matchAll(/'([a-z_]+)'/g)].map(m => m[1])).toEqual([
      'signup', 'proof', 'recommendation', 'sourcing', 'approval', 'live', 'review', 'completion',
    ])
  })

  it('🛑 it is checked BEFORE the healthy signup/proof split', () => {
    // An escalated client has necessarily started Proof, so testing `proofStarted` first
    // returns the calm verdict and loses the task entirely.
    const c = code(LIFECYCLE)
    const escAt = c.indexOf("f.proofCalibrationFailed === true")
    const splitAt = c.indexOf("f.proofStarted === true ?")
    expect(escAt).toBeGreaterThan(-1)
    expect(escAt, 'the calm Proof verdict wins and the task disappears').toBeLessThan(splitAt)
  })

  it('the verdict is a Proof-stage TASK — stage proof, reason set', () => {
    expect(code(LIFECYCLE)).toContain("return verdict('proof', 'proof', 'proof_calibration_failed')")
  })

  it('the fact is gathered, and fails SOFT to null rather than to false', () => {
    // `false` asserts "this client is fine", which on an unreadable answer hides the one
    // Proof-stage task from the operator — and the client has already been promised a call.
    const c = code(FACTS)
    expect(c).toContain('proofCalibrationFailedFor')
    expect(c).toContain('proofCalibrationFailed,')
    expect(c).toContain('} catch { return null }')
  })
})

describe('🛑 ④ the one calibrated restart — operator-only, audited, self-limiting', () => {
  it('both operator routes require the admin key', () => {
    const c = code(OPERATOR)
    for (const route of ["/proof-review/:clientId/evidence", "/proof-review/:clientId/restart"]) {
      const at = c.indexOf(route)
      expect(at, `${route} is missing`).toBeGreaterThan(-1)
      expect(c.slice(at, at + 400)).toContain("adminKeyValid(req.headers['x-admin-key'])")
    }
  })

  it('a restart requires a resolution AND a note AND an unused grant', () => {
    const c = code(IO)
    expect(c).toContain('if (!r.resolvedAt)')
    expect(c).toContain("if (!(r.operatorNote ?? '').trim())")
    expect(c).toContain('if (r.restartAt && r.restartAt >= r.resolvedAt)')
  })

  it('🛑 it never resets the two automatic attempts', () => {
    const c = code(OPERATOR)
    const at = c.indexOf('/proof-review/:clientId/restart')
    const body = c.slice(at, at + 2600)
    // `proof_passes_done` must not appear as a WRITE anywhere in the restart path.
    expect(/proof_passes_done\s*:/.test(body), 'the restart writes the pass counter').toBe(false)
    expect(body).toContain('proof_calibrated_restart_at: nowIso')
    expect(OPERATOR).toContain('the two automatic attempts are NOT reset')
  })

  it('it is audited under its own action', () => {
    expect(code(OPERATOR)).toContain("action: 'proof_calibrated_restart_granted'")
    const audit = readFileSync(join(__dirname, 'operator-audit.ts'), 'utf8')
    expect(code(audit)).toContain("| 'proof_calibrated_restart_granted'")
  })

  it('it GRANTS and does not run — no provider call sits behind the button', () => {
    const c = code(OPERATOR)
    const at = c.indexOf('/proof-review/:clientId/restart')
    const body = c.slice(at, at + 2600)
    for (const spend of ['runIcpJob', 'sourceProgramme', 'servePoolLeads', 'searchPeople']) {
      expect(body.includes(spend), `the restart route calls ${spend}`).toBe(false)
    }
  })

  it('the evidence route is read-only and says so', () => {
    const c = code(OPERATOR)
    const at = c.indexOf('/proof-review/:clientId/evidence')
    const body = c.slice(at, at + 2200)
    expect(body).toContain('read_only:')
    for (const write of ['.update(', '.insert(', '.delete(']) {
      expect(body.includes(write), `the evidence route performs a ${write} write`).toBe(false)
    }
  })
})

describe('⑤ the migration is additive and in both homes', () => {
  const entry = PENDING_MIGRATIONS.find(m => m.key === '20260910_proof_calibration_handoff')

  it('registered', () => { expect(entry).toBeTruthy() })

  it('four nullable columns, no default, no backfill, idempotent', () => {
    const sql = entry!.sql
    for (const col of ['proof_escalation_trigger', 'proof_phone_confirmed_at',
                       'proof_calibration_note', 'proof_calibrated_restart_at']) {
      expect(sql, col).toContain(`ADD COLUMN IF NOT EXISTS ${col}`)
    }
    expect(sql.includes('DEFAULT'), 'a column carries a default').toBe(false)
    for (const destructive of ['DROP COLUMN', 'DROP CONSTRAINT', 'DELETE FROM', 'UPDATE public.clients SET']) {
      expect(sql.includes(destructive), `destructive: ${destructive}`).toBe(false)
    }
  })
})
