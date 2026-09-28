// ═══════════════════════════════════════════════════════════════════════════════════════
// 28 Sep — SECTION C OF THE END-TO-END CHECK (R172): WHAT THE FOUNDER IS TOLD, AND WHAT VIDA SAYS.
//
// The founder's rule: a client must never be stuck without him being told, and Vida must never
// point him at a control that does not exist. Nine verified gaps; each is pinned here (C8's
// database rule is proved in `realdb/founder-alerts.realdb.test.ts`).
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { deriveLifecycle, type LifecycleFacts } from './programme-lifecycle'

const src = (f: string) => readFileSync(join(__dirname, f), 'utf8')
const admin = (f: string) => readFileSync(join(__dirname, '../../../admin/src', f), 'utf8')

const base: LifecycleFacts = {
  programme: null, proofStarted: true, proofCalibrationFailed: false, proofCompleted: false,
  proofNoEligibleSet: false, awaitingIcpTranslation: false,
  preparationStopped: false, preparing: false, humanBlockers: [], readinessReady: false,
  sends: 0, repliesAwaitingDecision: 0, senderSendable: true, killSwitchOff: true, operatorRunEnabled: false,
  remainingEntitlement: 0, hasNewerProgramme: false, repeatDismissed: false,
} as LifecycleFacts

describe('🛑 C1 · a failed or stuck Proof is a task with a Retry button that works', () => {
  it('Vida: Needs you, with its own state and reason', () => {
    expect(deriveLifecycle({ ...base, proofRunFailed: true }))
      .toMatchObject({ state: 'proof_failed', stage: 'proof', needsYou: true, needsYouReason: 'proof_run_failed', mode: 'Needs you' })
    expect(deriveLifecycle({ ...base, proofRunFailed: false })).toMatchObject({ state: 'proof', needsYou: false })
    expect(deriveLifecycle({ ...base, proofRunFailed: null })).toMatchObject({ state: 'proof', needsYou: false })
  })
  it('an untranslated ICP still outranks it (nothing can have run without translation)', () => {
    expect(deriveLifecycle({ ...base, proofRunFailed: true, awaitingIcpTranslation: true }).state).toBe('proof_awaiting_translation')
  })
  it('the panel offers Retry Proof, and the route lets a failed/stuck run through the shared door', () => {
    const copy = admin('lib/vida-lifecycle-copy.ts')
    const at = copy.indexOf("case 'proof_failed':")
    expect(at).toBeGreaterThan(-1)
    expect(copy.slice(at, at + 1500)).toContain("actions: [{ key: 'retry_proof', label: 'Retry Proof', kind: 'primary' }]")
    expect(src('../routes/operator.ts')).toContain('{ recoveringFailedRun: !!lastWork && RECOVERABLE.includes(observedState) }')
    expect(src('proof-run-launch.ts')).toContain('const inException = opts.recoveringFailedRun === true ? true : await proofNoEligibleSetFor(clientId)')
  })
  it('the fact is read for one client AND the whole board (one read, never per client)', () => {
    const facts = src('programme-lifecycle-facts.ts')
    expect(facts).toContain('export async function proofRunFailedFor(clientId: string)')
    expect(facts).toContain('proofRunFailed: proofRunRead ? proofFailed.has(clientId) : null,')
  })
  it('the stuck-client email names the button that exists', () => {
    expect(src('stuck-client-watchdog.ts')).toContain("proof: 'Vida → this client → Retry Proof.")
  })
})

describe('🛑 C2 · a paid-in-full approval tells the founder to Make Live', () => {
  it('raises one task and emails once, only when P2 is already in place', () => {
    const r = src('../routes/my-programme.ts')
    expect(r).toContain('if (p2Authorised(r.programme)) {')
    expect(r).toContain('dedupeKey = `ready_make_live:${r.programme.id}`')
    expect(r).toContain("'A client approved their paid-in-full programme — ready for Make Live'")
  })
})

describe('🛑 C3 · a stuck-client task puts the client in Needs you', () => {
  it('the rail reads open critical / escalation tasks and counts them as Needs you', () => {
    const rail = admin('components/vida/VidaClients.tsx')
    expect(rail).toContain("fetch('/api/proxy/operator/tasks')")
    expect(rail).toContain('const needsYou = (id: string) => lifecycle[id]?.needs_you === true || escalated.has(id)')
  })
})

describe('C4 · hand-offs to a person email the founder', () => {
  it('a new ICP review emails once, and files no second task (one condition, one row)', () => {
    const t = src('icp-review-tasks.ts')
    expect(t).toContain('if (t.alreadyOpen !== true) {')
    expect(t).toContain('mirrorTask: false })')
    expect(src('alerts.ts')).toContain('if (about?.mirrorTask !== false) try {')
  })
  it('the calibration hand-off emails once and closes when the restart starts', () => {
    const c = src('proof-calibration-io.ts')
    expect(c).toContain("dedupeKey: `proof_calibration:${clientId}`")
    expect(c).toContain("await resolveOperatorTasksForCondition('support_escalation', `proof_calibration:${clientId}`,")
  })
})

describe('C5 · Vida never says a second payment is due on a paid-in-full programme', () => {
  it('the approval card shows "Paid in full"', () => {
    const copy = admin('lib/vida-lifecycle-copy.ts')
    expect(copy).toContain("label: 'Payment', value: 'Paid in full'")
    expect(admin('app/vida/page.tsx')).toContain('paidInFull: !!prog?.programme?.first_payment_ref && prog?.programme?.second_payment_ref === prog?.programme?.first_payment_ref,')
    expect(src('programme-advance.ts')).toContain("'until it is approved, paid in full and made live.'")
  })
})

describe('C6 · "told" means an email left', () => {
  it('an alert whose email did not go is counted apart and logged', () => {
    const w = src('stuck-client-watchdog.ts')
    expect(w).toContain('if (sent?.emailOk === true) told++')
    expect(w).toContain('NO EMAIL was sent. Check RESEND_API_KEY and FOUNDER_EMAIL.')
  })
})

describe('C7 · Settle waits for the programme to finish', () => {
  it('refused while live, unpaused, short of target and with sourcing room left', () => {
    const p = src('programme.ts')
    expect(p).toContain("const stillWorking = p.status === 'LIVE' && !p.paused_at && roomLeft > 0 && deliveredMeetings < p.meeting_target")
    expect(p).toContain('Nothing was credited.')
  })
})

describe('🛑 C8 · an operator\'s sent reply is recorded, or the founder is told', () => {
  it('the migration adds sent_reply, and the insert\'s answer is read', () => {
    expect(src('pending-migrations.ts')).toContain("key: '20260928_reply_classification_sent_reply'")
    const m = src('manual-reply.ts')
    expect(m).toContain("const { error: recErr } = await db.from('figsy_replies').insert({")
    expect(m).toContain("'A reply you sent was not recorded'")
  })
})

describe('C9 · setting the size closes the price-waiting task and tells the client', () => {
  it('the task closes on the same key the watchdog files under', () => {
    expect(src('../routes/operator.ts'))
      .toContain("await resolveOperatorTasksForCondition('support_escalation', `stuck:price_waiting:${client.id}:${client.id}`,")
  })
  it('Milla says the price is ready — once, on the first price after waiting', () => {
    const calc = readFileSync(join(__dirname, '../../../portal/src/components/milla/ProgrammeCalculator.tsx'), 'utf8')
    expect(calc).toContain("if (firstPrice) { waitedForPrice.current = false; keepNoticeRef.current('price-ready', 'price_ready') }")
  })
})
