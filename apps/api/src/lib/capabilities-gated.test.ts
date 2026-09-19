// ═══════════════════════════════════════════════════════════════════════════════════════
// XC-8 + J14-C1 · THE GO-LIVE BLOCK MUST NAME WHAT ACTUALLY BLOCKS GOING LIVE
//
// ── WHAT EARNED THIS ──────────────────────────────────────────────────────────────────
//
// `runStartupCheck` prints a GO-LIVE READINESS block at boot: three capabilities, each
// ✅ or ❌. It is the last thing anybody reads before deciding a deploy is healthy, and
// every line of it was wrong about MVP1:
//
//   · **🎯 LEAD ENGINE** required `PDL_API_KEY` and `HUNTER_API_KEY` and did not mention
//     Apollo. Under FD-6 that is exactly inverted: the two named keys are meant to be
//     UNSET, and the one key without which nothing can be sourced was graded `optional`
//     with the description *"not used in the day-to-day PDL+Hunter stack"*. So a box with
//     no Apollo key and no leads printed ❌ for the wrong reason, and a correctly
//     configured Apollo-only box printed ❌ for a deliberate absence — training everybody
//     to ignore the block.
//   · **POOLED_SENDERS_JSON appeared nowhere in the whole register.** It is the inventory
//     the automatic sender claim draws from, so with it unset every programme stops at
//     Prepare with *"No pooled sending mailbox is available"* — and boot said nothing.
//     Being merely PRESENT is not enough either: it is JSON, and unparseable JSON yields
//     zero senders with the same silence.
//   · The capabilities for the stages MVP1 actually walks — booking a meeting, an
//     unsubscribe link, capturing a reply — were not grouped under any stage at all.
//
// ⚠️ A CAPABILITY LINE IS A PROMISE ABOUT A STAGE OF THE JOURNEY. If it cannot be read as
// "this stage can happen", it is decoration.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { CAPABILITIES, capabilityState, LAUNCH_CRITICAL_CAPABILITIES } from './startup-check'

const src = readFileSync(join(__dirname, 'startup-check.ts'), 'utf8')

/** The declared variable table, as text, so the register can be asserted on. */
const registerLine = (key: string) =>
  src.split('\n').find(l => l.includes(`key: '${key}'`)) ?? ''

describe('XC-8 · the lead engine is Apollo', () => {
  const lead = CAPABILITIES.find(c => /LEAD ENGINE/.test(c.label))

  it('exists and requires APOLLO_API_KEY', () => {
    expect(lead, 'there must be a lead-engine capability').toBeTruthy()
    expect(lead!.vars).toContain('APOLLO_API_KEY')
  })

  it('does NOT require PDL or Hunter — they are meant to be unset', () => {
    // A ❌ for a deliberate absence is worse than no line: it is a false alarm on the one
    // block whose job is to stop false greens.
    for (const c of CAPABILITIES) {
      expect(c.vars, `${c.label} still requires PDL_API_KEY`).not.toContain('PDL_API_KEY')
      expect(c.vars, `${c.label} still requires HUNTER_API_KEY`).not.toContain('HUNTER_API_KEY')
    }
  })

  it('is critical for launch — without Apollo nothing can be sourced at all', () => {
    expect(LAUNCH_CRITICAL_CAPABILITIES).toContain(lead!.label)
  })

  it('the register grades APOLLO_API_KEY as critical-for-launch, not optional', () => {
    const line = registerLine('APOLLO_API_KEY')
    expect(line).toBeTruthy()
    expect(line, 'Apollo was graded `optional` with "not used in the day-to-day stack"')
      .not.toMatch(/level: 'optional'/)
    expect(line).not.toMatch(/BYO/)
  })

  it('the register no longer describes PDL as PRIMARY sourcing', () => {
    expect(registerLine('PDL_API_KEY')).not.toMatch(/PRIMARY/)
    expect(registerLine('PDL_API_KEY')).toMatch(/retired|not a paid|FD-6/i)
    expect(registerLine('HUNTER_API_KEY')).toMatch(/locked off|retired|FD-5/i)
  })
})

describe('XC-8 · the sender pool is a capability, and it is PARSED', () => {
  const senders = CAPABILITIES.find(c => c.vars.includes('POOLED_SENDERS_JSON'))

  it('POOLED_SENDERS_JSON is in the register at all — it was in neither list', () => {
    expect(registerLine('POOLED_SENDERS_JSON')).toBeTruthy()
  })

  it('and it is a capability, under the stage that needs it', () => {
    expect(senders, 'no capability names POOLED_SENDERS_JSON').toBeTruthy()
    expect(senders!.label).toMatch(/prepar|sender|mailbox/i)
  })

  // 🛑 PRESENT IS NOT ENOUGH. Unparseable JSON yields zero senders, and every programme then
  // stops at Prepare with "No pooled sending mailbox is available" — the same silence as an
  // unset variable, with a green tick over it.
  it('a present-but-unparseable value is NOT a satisfied capability', () => {
    // The stage's OTHER variable is supplied so this case is about the JSON alone.
    const env = (pool: string) => ({ POOLED_SENDERS_JSON: pool, INBOX_SECRET_KEY: 'k' })
    const ok = capabilityState(senders!, env('[{"email":"a@b.com","smtp_host":"h","smtp_user":"u","smtp_pass":"p"}]'))
    expect(ok.ok, ok.detail).toBe(true)

    for (const bad of ['not json', '{}', '[]', '[{"email":"a@b.com"}]']) {
      const state = capabilityState(senders!, env(bad))
      expect(state.ok, `"${bad}" was accepted`).toBe(false)
      // Present-but-unusable must not be reported as a MISSING variable: the fix is
      // different, and telling somebody to set a variable they have already set is how a
      // boot block stops being read.
      expect(state.miss, `"${bad}" was reported as a missing variable`).toEqual([])
      expect(state.detail, `"${bad}" gave no reason`).toBeTruthy()
    }
  })

  it('the reason never contains a credential', () => {
    // This string is printed at boot into logs the founder pastes into chat.
    const state = capabilityState(
      CAPABILITIES.find(c => c.vars.includes('POOLED_SENDERS_JSON'))!,
      { POOLED_SENDERS_JSON: '[{"email":"a@b.com","smtp_host":"h","smtp_user":"u","smtp_pass":"sup3rsecret"}]', INBOX_SECRET_KEY: 'k' },
    )
    expect(JSON.stringify(state)).not.toContain('sup3rsecret')
  })
})

describe('XC-8 · every MVP1 stage that needs configuration has a line', () => {
  const labels = CAPABILITIES.map(c => c.label)

  it('meetings — the Google calendar keys are under a stage, not loose optionals', () => {
    const cap = CAPABILITIES.find(c => c.vars.includes('GOOGLE_CLIENT_ID'))
    expect(cap, 'no capability names the Google keys').toBeTruthy()
    expect(cap!.label).toMatch(/meeting|calendar|booking/i)
  })

  it('unsubscribe and tracking are under the sending stage that needs them', () => {
    const cap = CAPABILITIES.find(c => c.vars.includes('UNSUBSCRIBE_SECRET'))
    expect(cap).toBeTruthy()
    expect(cap!.vars).toContain('TRACKING_URL')
  })

  it('reply capture names the Resend inbound secret', () => {
    const cap = CAPABILITIES.find(c => c.vars.includes('RESEND_WEBHOOK_SECRET'))
    expect(cap, 'no capability covers reply capture').toBeTruthy()
    expect(cap!.label).toMatch(/repl/i)
  })

  it('payments and client sending survive unchanged', () => {
    expect(labels.some(l => /PAYMENTS/.test(l))).toBe(true)
    expect(labels.some(l => /CLIENT SENDING/.test(l))).toBe(true)
    const sending = CAPABILITIES.find(c => /CLIENT SENDING/.test(c.label))!
    // INBOX_SECRET_KEY was added after this block read ✅ SENDING while nothing could leave.
    expect(sending.vars).toContain('INBOX_SECRET_KEY')
  })

  it('every capability var is a real registered variable', () => {
    // A capability naming a variable nothing declares is a line that can never go green.
    for (const c of CAPABILITIES) {
      for (const v of c.vars) {
        expect(registerLine(v), `${c.label} names ${v}, which is not in the register`).toBeTruthy()
      }
    }
  })

  it('every launch-critical capability label exists', () => {
    for (const l of LAUNCH_CRITICAL_CAPABILITIES) {
      expect(labels, `${l} is launch-critical but has no capability`).toContain(l)
    }
  })
})
