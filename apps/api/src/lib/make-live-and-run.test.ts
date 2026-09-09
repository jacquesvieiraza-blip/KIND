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

  it('the route refuses without its own env gate, independently of the kill-switch', () => {
    const at = OP.indexOf("operatorRouter.post('/send-due/run-once'")
    const body = OP.slice(at, at + 1400)
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

  it('🛑 the canary works with the kill-switch ON — Run does not consult it', () => {
    // `sendSequenceEmailCore` admits an operator run through its OWN authority
    // (`opts.authority === 'operator_run' && operatorSendEnabled()`), so a canary can send
    // while automatic outreach stays off. That is the whole point of the Thursday walk.
    const FIGSY = readFileSync(join(API, 'figsy.ts'), 'utf8')
    expect(FIGSY).toContain("const operatorAuthorised = opts.authority === 'operator_run' && operatorSendEnabled()")
    expect(FIGSY).toContain('if (!opts?.isPreview && !operatorAuthorised && !outreachEnabled())')
  })
})
