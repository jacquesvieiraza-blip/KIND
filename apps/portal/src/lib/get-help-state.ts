// ═══════════════════════════════════════════════════════════════════════════════════════
// GET HELP — THE STATE MACHINE, AND IT MAY NEVER SAY SOMETHING THAT IS NOT TRUE. (S1-PD-08.)
//
// ── THE DEFECT ─────────────────────────────────────────────────────────────────────────
//
// 🛑 THE FAILURE PATH SET THE SUCCESS FLAG.
//
//     try  { await api.post('/support/escalate', …); setHelpSent(true) }
//     catch{                                        setHelpSent(true) }
//
// and `helpSent` rendered:  "K.I.N.D has been told — we'll be in touch by email."
//
// So a client whose escalation FAILED was told K.I.N.D had been told. Nobody had. The
// comment above the catch said the client "is given an address they can reach without us";
// the implementation gave them nothing — it set the same flag and rendered the same
// sentence. A comment describing behaviour the code does not have is worse than no comment,
// because it is what a reviewer reads instead of the code.
//
// This is the first-run dead end the founder raised, with a reassuring message on top of it:
// the one control a stuck client had, reporting success while doing nothing, so they wait
// for an email that is never coming and never try anything else.
//
// ── WHY A PURE MODULE ──────────────────────────────────────────────────────────────────
//
// There is no React component-test runtime in this repo (`@testing-library/react` and
// `jsdom` are not installed), and the previous proof for this path was a SOURCE PIN on the
// comment — it asserted that the sentence "EVEN THE ESCAPE HATCH FAILING MUST NOT BE A DEAD
// END" appeared in the file. It did. The behaviour it described did not exist, and the pin
// was green the entire time. That is the exact false-pass shape this batch has now hit four
// times.
//
// So the DECISION lives here and is executed; the component only renders what it returns.
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * 🛑 THE HUMAN MAILBOX — THE REPO'S EXISTING ONE, NOT A NEW ADDRESS.
 *
 * `hello@get-kind.com` is what the portal already gives people when it cannot help them
 * itself: `global-error.tsx`, the Terms page, the Privacy page, the Documents page and the
 * Partner page all send them there, and `packages/shared/src/cost-floor.ts` describes it in
 * so many words as "the human mailbox — the address a human replies from". Nothing here is
 * invented and no new support product is created: the failure path simply gives a stuck
 * client the same address every other dead end in this app already gives them.
 *
 * ⚠️ IT IS A DUPLICATED LITERAL AND THAT IS A KNOWN, REPORTED PROBLEM. The address appears
 * as a hard-coded string in at least eight places with no shared constant, so a change of
 * mailbox has eight edits and no compiler to catch a missed one. Centralising it touches
 * files far outside this frozen batch, so it is REPORTED rather than fixed here.
 */
export const SUPPORT_EMAIL = 'hello@get-kind.com'

/**
 * Four states, because there are four things that can be true, and the old code had two.
 *
 * ⚠️ `failed` IS NOT A VARIANT OF `sent`. The whole defect was treating them as one.
 */
export type HelpState = 'idle' | 'sending' | 'sent' | 'failed'

/**
 * 🛑 MAY A NEW ESCALATION BE STARTED?
 *
 * ⚠️ `sent` IS FALSE — one successful ask is one alert. A client pressing the button again
 * after it worked must not raise a second `support_escalation` for the same stuck moment;
 * an operator seeing two alerts cannot tell a second problem from a second click.
 *
 * ⚠️ `failed` IS TRUE — that is the retry, and it is the point. The previous code could not
 * express this at all: it had one boolean, and once set there was no way back.
 */
export function mayStartHelp(state: HelpState): boolean {
  return state === 'idle' || state === 'failed'
}

/** What the button says. `sending` is disabled; `sent` is spent. */
export function helpButtonLabel(state: HelpState): string {
  if (state === 'sending') return 'Sending…'
  if (state === 'failed') return 'Try again'
  return 'Get help'
}

/**
 * 🛑 THE STATE AFTER AN ATTEMPT. `ok` is the ONLY thing that produces `sent`.
 *
 * ⚠️ THERE IS DELIBERATELY NO WAY TO REACH `sent` FROM A FAILURE. The parameter is a boolean
 * that means "the escalation actually succeeded", not "we finished trying".
 */
export function helpStateAfter(ok: boolean): HelpState {
  return ok ? 'sent' : 'failed'
}

/** The copy for the CLIENT, and what the screen must offer them alongside it. */
export interface HelpCopy {
  /** The sentence shown. Never a claim that is not true of `state`. */
  text: string
  /** Whether the retry control is offered. */
  showRetry: boolean
  /** Whether a human address they can reach WITHOUT us is offered. */
  showFallback: boolean
  /** The mailto the fallback points at, or `null` when there is no fallback to show. */
  fallbackHref: string | null
}

/** The one sentence that may claim somebody was notified. It is used in exactly one state. */
export const HELP_SENT_COPY =
  'K.I.N.D has been told — we’ll be in touch by email.'

/**
 * ⚠️ THE FAILED SENTENCE SAYS THE TRUE THING FIRST. "It did not go through" before anything
 * else, because a client who reads only the first clause must still be correctly informed.
 * Then a retry, then an address that does not depend on us being reachable at all.
 */
export const HELP_FAILED_COPY =
  'That didn’t go through, so nobody has been told yet. Try again — or email us directly at ' +
  `${SUPPORT_EMAIL} and a person will pick it up.`

export function helpCopy(state: HelpState): HelpCopy {
  switch (state) {
    case 'sent':
      // 🛑 THE ONLY STATE THAT MAY SAY THIS.
      return { text: HELP_SENT_COPY, showRetry: false, showFallback: false, fallbackHref: null }
    case 'failed':
      return {
        text: HELP_FAILED_COPY,
        showRetry: true,
        showFallback: true,
        fallbackHref: `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('I am stuck setting up — please help')}`,
      }
    case 'sending':
      return { text: '', showRetry: false, showFallback: false, fallbackHref: null }
    default:
      return { text: '', showRetry: false, showFallback: false, fallbackHref: null }
  }
}
