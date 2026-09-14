import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  mayStartHelp, helpStateAfter, helpCopy, helpButtonLabel,
  SUPPORT_EMAIL, HELP_SENT_COPY, type HelpState,
} from './get-help-state'

// ═══════════════════════════════════════════════════════════════════════════════════════
// S1-PD-08 — GET HELP MAY NOT REPORT SUCCESS IT DID NOT HAVE.
//
// ── WHAT THIS REPLACES ─────────────────────────────────────────────────────────────────
//
// 🛑 THE OLD PROOF WAS A SOURCE PIN ON A COMMENT. It asserted that the sentence "EVEN THE
// ESCAPE HATCH FAILING MUST NOT BE A DEAD END" appeared in the page. It did appear. The
// behaviour it described did not exist — the catch block set the SAME success flag as the
// try, so a failed escalation rendered "K.I.N.D has been told" — and the pin was green for
// the whole time. A comment is not a fence, and a test that reads one proves the comment.
//
// Every assertion below EXECUTES the decision. The component is now only a renderer: it
// asks these functions what it may say.
// ═══════════════════════════════════════════════════════════════════════════════════════

const PAGE = readFileSync(
  join(process.cwd(), 'apps/portal/src/app/(milla)/milla/welcome/page.tsx'), 'utf8')

/** A run of the real flow: start → attempt → state, exactly as the component sequences it. */
function attempt(from: HelpState, escalationSucceeded: boolean): { started: boolean; state: HelpState } {
  if (!mayStartHelp(from)) return { started: false, state: from }
  return { started: true, state: helpStateAfter(escalationSucceeded) }
}

describe('🛑 S1-PD-08 · the three states are truthful', () => {
  it('1 · a SUCCESSFUL escalation reaches `sent`, and only that state claims we were told', () => {
    const r = attempt('idle', true)
    expect(r.started).toBe(true)
    expect(r.state).toBe('sent')
    expect(helpCopy('sent').text).toBe(HELP_SENT_COPY)
    expect(helpCopy('sent').text).toContain('K.I.N.D has been told')
  })

  it('2 · a FAILED escalation reaches `failed`, and says so first', () => {
    const r = attempt('idle', false)
    expect(r.state).toBe('failed')
    const c = helpCopy('failed')
    expect(c.text).toContain('didn’t go through')
    expect(c.text).toContain('nobody has been told yet')
  })

  it('🛑 3 · NO state except `sent` may render "K.I.N.D has been told"', () => {
    for (const s of ['idle', 'sending', 'failed'] as HelpState[]) {
      expect(helpCopy(s).text, `${s} must not claim anybody was notified`)
        .not.toContain('K.I.N.D has been told')
      expect(helpCopy(s).text).not.toContain('be in touch')
    }
  })

  it('🛑 4 · the FAILED state exposes a real human address AND a retry', () => {
    const c = helpCopy('failed')
    expect(c.showRetry).toBe(true)
    expect(c.showFallback).toBe(true)
    expect(c.text).toContain(SUPPORT_EMAIL)
    expect(c.fallbackHref).toContain(`mailto:${SUPPORT_EMAIL}`)
    // 🛑 A ROUTE OUT THAT DOES NOT DEPEND ON US. If our API is unreachable, another button
    // that calls our API is not an escape hatch.
    expect(c.fallbackHref?.startsWith('mailto:')).toBe(true)
    expect(helpButtonLabel('failed')).toBe('Try again')
  })

  it('🛑 5 · a retry after a failure can subsequently SUCCEED', () => {
    const first = attempt('idle', false)
    expect(first.state).toBe('failed')
    const second = attempt(first.state, true)
    expect(second.started, 'the failed state must allow another attempt').toBe(true)
    expect(second.state).toBe('sent')
    expect(helpCopy(second.state).text).toBe(HELP_SENT_COPY)
  })

  it('🛑 6 · duplicate clicks after SUCCESS raise no second escalation', () => {
    const first = attempt('idle', true)
    expect(first.state).toBe('sent')
    const second = attempt(first.state, true)
    expect(second.started, 'one stuck moment is one alert — an operator cannot tell two clicks from two problems').toBe(false)
    expect(second.state).toBe('sent')
  })

  it('🛑 and a click WHILE SENDING raises no second escalation either', () => {
    expect(mayStartHelp('sending')).toBe(false)
    expect(attempt('sending', true).started).toBe(false)
    expect(helpButtonLabel('sending')).toBe('Sending…')
  })

  it('🛑 there is NO argument to `helpStateAfter` that turns a failure into success', () => {
    // The parameter means "the escalation actually succeeded", not "we finished trying".
    expect(helpStateAfter(false)).toBe('failed')
    expect(helpStateAfter(true)).toBe('sent')
  })

  it('the fallback address is the repo\'s EXISTING human mailbox, not a new one', () => {
    // Reused, never invented — the same address global-error, Terms, Privacy, Documents and
    // the Partner page already send people to.
    expect(SUPPORT_EMAIL).toBe('hello@get-kind.com')
    const globalError = readFileSync(join(process.cwd(), 'apps/portal/src/app/global-error.tsx'), 'utf8')
    expect(globalError, 'if this address changes, this test is how you find out').toContain(SUPPORT_EMAIL)
  })
})

describe('🛑 S1-PD-08 · the page really is wired to those decisions', () => {
  it('🛑 the catch block no longer sets the success state', () => {
    const live = PAGE.split('\n').filter(l => !l.trimStart().startsWith('//') && !l.trimStart().startsWith('*')).join('\n')
    // ⛓️ The retired shape, by name. `setHelpSent` does not exist any more in any form.
    expect(live, 'the two-boolean shape is what allowed a failure to claim success')
      .not.toContain('setHelpSent')
    expect(live).not.toContain('const [helpSent')
    expect(live).toContain("setHelpState(helpStateAfter(false))")
    expect(live).toContain("setHelpState(helpStateAfter(true))")
  })

  it('🛑 the success sentence is rendered ONLY under the `sent` state', () => {
    // The literal must not appear as page copy at all — it comes from `helpCopy('sent')`.
    const live = PAGE.split('\n').filter(l => !l.trimStart().startsWith('//') && !l.trimStart().startsWith('*')).join('\n')
    expect(live, 'the claim must come from the state machine, never be typed into JSX')
      .not.toContain('K.I.N.D has been told')
    expect(live).toContain("{helpState === 'sent' ? (")
    expect(live).toContain("{helpCopy('sent').text}")
  })

  it('🛑 the duplicate fence is the one that can express a retry', () => {
    const live = PAGE.split('\n').filter(l => !l.trimStart().startsWith('//')).join('\n')
    expect(live).toContain('if (!mayStartHelp(helpState)) return')
    // ⛓️ `if (helpBusy || helpSent) return` could never let a failed attempt try again: one
    // boolean, set once, no way back.
    expect(live).not.toContain('if (helpBusy || helpSent) return')
  })

  it('the failure state renders both the retry and the address', () => {
    expect(PAGE).toContain('helpCopy(helpState).showFallback')
    expect(PAGE).toContain('Email {SUPPORT_EMAIL}')
    expect(PAGE).toContain('{helpButtonLabel(helpState)}')
  })
})
