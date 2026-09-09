// ═══════════════════════════════════════════════════════════════════════════════════════
// MAKE LIVE ARMS · RUN SENDS — and the console had no way to do the second.
//
// 🛑 THE LOCKED PRODUCT MEANING. Make Live is an explicit operator action that ARMS a
// programme and sends nothing by itself. Run is a SEPARATE explicit action, and it is the only
// deliberate way real mail leaves for a canary. `POST /operator/send-due/run-once` existed —
// one client, an explicit ceiling, its own env gate — and **Vida never called it**, so the
// Thursday walk had no console path at all.
//
// 🛑 AND THE KILL-SWITCH WORDING IS LOCKED. ON = sending BLOCKED. OFF = sending PERMITTED,
// subject to every other gate. A bare "OFF" under "SENDING" reads as the opposite of what it
// means, which is why the state is spelled out and the switch is never shown alone.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const API = __dirname
const OP = readFileSync(join(API, '..', 'routes', 'operator.ts'), 'utf8')
const VIDA = readFileSync(join(API, '..', '..', '..', 'admin', 'src', 'app', 'vida', 'page.tsx'), 'utf8')
const PROGRAMME = readFileSync(join(API, 'programme.ts'), 'utf8')

const code = (s: string) => s.split('\n')
  .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*') })
  .join('\n')

describe('① Make Live arms and sends nothing', () => {
  it('🛑 goLiveProgramme reaches no send path of its own', () => {
    const at = PROGRAMME.indexOf('export async function goLiveProgramme')
    const body = code(PROGRAMME.slice(at, PROGRAMME.indexOf('\nexport ', at + 40)))
    for (const forbidden of ['sendSequenceEmail', 'runSendDue', 'send-due', 'operatorSendEnabled']) {
      expect(body.includes(forbidden), `Make Live can reach ${forbidden}`).toBe(false)
    }
  })

  it('it prepares first and refuses LIVE on incomplete preparation', () => {
    const at = PROGRAMME.indexOf('export async function goLiveProgramme')
    const body = PROGRAMME.slice(at, PROGRAMME.indexOf('\nexport ', at + 40))
    expect(body).toContain('prepareProgrammeOutreach(programmeId)')
    expect(body).toContain('prep.complete')
  })

  it('🛑 the console never says outreach started because a status changed', () => {
    // The old line read "Live — sending still obeys every downstream safety gate", which a
    // reader takes as "it is sending, safely". A programme can be LIVE with nothing going out.
    expect(VIDA).toContain('Live — armed. Nothing has been sent by making it live.')
    expect(VIDA.includes('Live — sending still obeys'),
      'the console implies sending began at Make Live again').toBe(false)
  })
})

describe('② Run is separate, explicit, client-scoped and capped', () => {
  it('🛑 the console can actually reach it — it could not before', () => {
    expect(VIDA).toContain("'/api/proxy/operator/send-due/run-once'")
    expect(VIDA).toContain('Run once')
  })

  it('a run names exactly one client and a ceiling the operator typed', () => {
    expect(VIDA).toContain('client_id: selected, max_sends: n')
    // 🛑 NEVER DEFAULTED. A pre-filled ceiling is a number nobody chose.
    expect(VIDA).toContain("const [runMax, setRunMax] = useState('')")
  })

  it('a non-numeric or zero ceiling sends nothing and says so', () => {
    const at = VIDA.indexOf('const runOnce = useCallback')
    const body = VIDA.slice(at, at + 900)
    expect(body).toContain('!Number.isInteger(n) || n < 1')
    expect(body).toContain('Nothing was sent.')
  })

  // ⛓️ TITLE CORRECTED 9 Sep. It read "independently of the kill-switch", which was the old,
  // wrong model — the run's own key is an ADDITIONAL gate, never a parallel one. The duty
  // asserted below (its own env gate · one client · a typed ceiling) is unchanged.
  it('the route refuses without its own env gate, ON TOP of the kill-switch', () => {
    const at = OP.indexOf("operatorRouter.post('/send-due/run-once'")
    const body = OP.slice(at, at + 2600)
    expect(body).toContain('operatorSendEnabled()')
    expect(body).toContain('FIGSY_OPERATOR_SEND_ENABLED')
    // One client, always — there is no all-clients mode.
    expect(body).toContain('there is no all-clients mode')
    expect(body).toContain('max_sends is required')
  })

  it('the confirmation says real mail leaves, and names the ceiling back', () => {
    const at = VIDA.indexOf('const runOnce = useCallback')
    const body = VIDA.slice(at, at + 1600)
    expect(body).toContain('REAL prospects')
    expect(body).toContain('This is the only action that sends')
  })

  it('🛑 a run that sent nothing is reported as nothing, not as done', () => {
    const at = VIDA.indexOf('const runOnce = useCallback')
    const body = VIDA.slice(at, at + 2400)
    expect(body).toContain("tone: sent > 0 ? 'ok' : 'warn'")
    expect(body).toContain('Nothing left the building')
  })
})

describe('③ the kill-switch is stated, never shown as a bare OFF', () => {
  it('🛑 ON means blocked and OFF means permitted, in words', () => {
    expect(VIDA).toContain('Permitted — automatic outreach is on (kill-switch OFF)')
    expect(VIDA).toContain('Blocked — automatic outreach is off (kill-switch ON)')
  })

  it('the server reports both switches, so the console infers neither', () => {
    expect(OP).toContain('auto_outreach_enabled: outreachEnabled()')
    expect(OP).toContain('operator_run_enabled: operatorSendEnabled()')
    expect(VIDA).toContain('prog.send_controls.auto_outreach_enabled')
    expect(VIDA).toContain('prog.send_controls.operator_run_enabled')
  })

  it('🛑 the console re-derives neither switch from an env var of its own', () => {
    // ⚠️ THE RULE IS ABOUT READING, NOT NAMING. The unavailable-Run sentence tells the operator
    // exactly which variable to set on the API, which is the useful thing to say; banning the
    // word banned the help rather than the defect. What must never happen is this browser
    // deciding a send switch for itself — a rule a console can compute is a rule anybody with
    // devtools can satisfy.
    const c = code(VIDA)
    expect(c.includes('process.env'), 'the console reads an environment variable itself').toBe(false)
    // Both switches are rendered from the server's booleans and from nothing else.
    expect(c).toContain('prog.send_controls.auto_outreach_enabled')
    expect(c).toContain('prog.send_controls.operator_run_enabled')
    // And neither name appears in EXECUTABLE position — only inside rendered copy.
    for (const name of ['AUTO_OUTREACH_ENABLED', 'FIGSY_OPERATOR_SEND_ENABLED']) {
      expect(new RegExp(`env[^\\n]*${name}|${name}\\s*===|${name}\\s*\\?`).test(c),
        `the console evaluates ${name} itself`).toBe(false)
    }
  })

  it('an unavailable Run says why, rather than hiding with no explanation', () => {
    expect(VIDA).toContain('Run is unavailable — FIGSY_OPERATOR_SEND_ENABLED is not set on the API')
  })

  // ⛓️ RETARGETED 9 Sep — THE SAME DUTY, THE CORRECT RULE. This case used to read "🛑 the
  // canary works with the kill-switch ON — Run does not consult it", and it pinned the two
  // exact source lines that made that true. The founder locked the opposite: **KILL-SWITCH
  // ON = NO EXTERNALLY DELIVERED OUTREACH OF ANY KIND**, with no exception for a run.
  //
  // The duty underneath it was never "the run bypasses the switch" — it was *the operator run
  // is separately gated, and Run is the only deliberate way mail leaves*. That duty is kept,
  // pointed the right way round, and the behavioural proof lives in
  // `kill-switch-absolute.test.ts` (13 cases against the real provider seams, all five guards
  // mutation-proved). This file keeps the SOURCE-SHAPE half a behavioural test cannot see.
  it('🛑 the run is gated by the kill-switch FIRST, and by its own key ON TOP', () => {
    const FIGSY = readFileSync(join(API, 'figsy.ts'), 'utf8')
    const at = FIGSY.indexOf('async function sendSequenceEmailCore')
    const core = FIGSY.slice(at, at + 3000)

    // The kill-switch is asked unconditionally — no `&&`, no `isPreview`, no authority.
    expect(core).toContain('if (!outreachEnabled()) {')
    // …and it is asked BEFORE the operator key, so the narrower gate can only ever add.
    const killAt = core.indexOf('if (!outreachEnabled()) {')
    const opAt = core.indexOf("if (opts.authority === 'operator_run' && !operatorSendEnabled())")
    expect(killAt, 'the kill-switch check is gone from the core').toBeGreaterThan(-1)
    expect(opAt, 'the operator key check is gone from the core').toBeGreaterThan(-1)
    expect(killAt, 'the operator key is checked before the kill-switch').toBeLessThan(opAt)

    // 🛑 AND THE OLD BYPASS MUST NEVER COME BACK, in any spelling.
    expect(FIGSY.includes('const operatorAuthorised'),
      'the operator_run kill-switch bypass has returned').toBe(false)
    expect(FIGSY.includes('!opts?.isPreview && !outreachEnabled()'),
      'isPreview exempts a send from the kill-switch again').toBe(false)
  })

  it('🛑 Run refuses at the route while the kill-switch is ON, before anything is attempted', () => {
    const at = OP.indexOf("operatorRouter.post('/send-due/run-once'")
    const body = OP.slice(at, at + 2200)
    expect(body).toContain('outreachDeliveryPermitted()')
    expect(body).toContain('KILL_SWITCH_REFUSAL')
    // The kill-switch is refused BEFORE the route's own env key, so the reason an operator
    // reads is the highest one that applies rather than the first one that happens to run.
    expect(body.indexOf('outreachDeliveryPermitted()')).toBeLessThan(body.indexOf('operatorSendEnabled()'))
  })

  it('🛑 every provider seam asks the one switch — none keeps a private copy', () => {
    // A path that re-derives `AUTO_OUTREACH_ENABLED` itself is a path that can spell the safe
    // default wrong. The seams import the shared module instead.
    for (const f of ['mailer.ts', 'linkedin.ts', 'smartlead-send.ts', 'instantly-push.ts']) {
      const src = readFileSync(join(API, f), 'utf8')
      expect(src.includes('outreach-kill-switch'), `${f} does not ask the shared kill-switch`).toBe(true)
      expect(/AUTO_OUTREACH_ENABLED\s*===/.test(code(src)), `${f} re-derives the switch itself`).toBe(false)
    }
  })
})
