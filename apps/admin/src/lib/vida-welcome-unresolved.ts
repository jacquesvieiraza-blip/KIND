// ═══════════════════════════════════════════════════════════════════════════════════════
// UNRESOLVED WELCOME EMAILS — making the locked human-review state VISIBLE. (B3.)
//
// ── THE DEFECT THIS CLOSES ─────────────────────────────────────────────────────────────
//
// R120's welcome-email state machine deliberately FAILS CLOSED. Past Resend's 24-hour
// idempotency window an unresolved send becomes `unresolved_expired`: no automatic resend,
// the claim is NOT released, and a human decides. `payload_conflict` is the same shape. Both
// states exist for exactly one purpose — to be SEEN by an operator — and
// `GET /operator/welcome-emails/unresolved` was built for it.
//
// Vida had no surface that called it. So the one state whose entire design is "a person must
// look" was invisible, and a client whose welcome email died was never contacted and nobody
// was told.
//
// ── 🛑 WHAT THIS IS NOT ───────────────────────────────────────────────────────────────
//
// This is VISIBILITY ONLY. It sends nothing, resends nothing, releases no claim, changes no
// outcome and invents no lifecycle truth. There is no remediation route on the server and
// this does not add one — the operator reads the Resend log and acts by hand, which is the
// locked behaviour. Every field below comes from the existing API response.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** The one canonical read. GET, and nothing else — the endpoint says so itself. */
export const WELCOME_UNRESOLVED_PATH = '/api/proxy/operator/welcome-emails/unresolved'

/** Exactly what the API sends per client. Nothing is derived or re-decided here. */
export interface UnresolvedWelcome {
  client_id: string
  company_name: string | null
  claimed_at: string | null
  outcome: string | null
  /** `null` is the FACT that makes the row unresolved, so it is rendered, never hidden. */
  provider_message_id: string | null
  /** The server's own sentence telling the operator what to do. Never re-written here. */
  action: string
}

export interface WelcomeUnresolvedPayload {
  success?: boolean
  data?: { window_ms?: number; clients?: UnresolvedWelcome[] }
  error?: string
}

/**
 *   loading  — the read is in flight
 *   ok       — the API answered; `rows` may legitimately be empty
 *   empty    — the API answered with nothing unresolved (a POSITIVE fact, not an error)
 *   failed   — the read failed. ⚠️ NEVER rendered as "all clear".
 */
export type WelcomeViewState = 'loading' | 'ok' | 'empty' | 'failed'

export interface WelcomeView {
  state: WelcomeViewState
  rows: UnresolvedWelcome[]
  windowMs: number | null
  error: string | null
}

/**
 * 🛑 A FAILED READ IS NOT AN EMPTY LIST, and that distinction is the whole point of this
 * module. "No unresolved welcome emails" and "we could not find out" look identical on a
 * screen that collapses them, and the second one silently retires the only control the
 * fail-closed design has.
 */
export const WELCOME_READ_FAILED_COPY =
  'The unresolved welcome emails could not be read, so this list is NOT proof that there are none. Reload, and check the API if it keeps failing.'

export const WELCOME_EMPTY_COPY =
  'No welcome email is waiting on a person. Every claimed send either landed with a provider id or is still safely inside the 24-hour window.'

export function welcomeView(payload: WelcomeUnresolvedPayload | null, failed = false): WelcomeView {
  if (failed || !payload || payload.success !== true) {
    return {
      state: 'failed', rows: [], windowMs: null,
      error: (payload?.error && String(payload.error)) || WELCOME_READ_FAILED_COPY,
    }
  }
  const rows = payload.data?.clients ?? []
  return {
    state: rows.length ? 'ok' : 'empty',
    rows,
    windowMs: payload.data?.window_ms ?? null,
    error: null,
  }
}

/** The six outcomes, as a person reads them. Labels only — no state is decided here. */
export const WELCOME_OUTCOME_LABEL: Record<string, string> = {
  unresolved_expired: 'Past the 24-hour window — unresolved',
  payload_conflict:   'Re-rendered differently — key spent',
  in_progress:        'Another attempt in flight',
  ambiguous:          'Provider outcome unknown',
}

export function welcomeOutcomeLabel(outcome: string | null): string {
  return (outcome && WELCOME_OUTCOME_LABEL[outcome]) || outcome || 'unknown'
}

/**
 * 🛑 THE ONES THAT NEED A PERSON *NOW*, versus the ones that are simply still in flight.
 *
 * `in_progress` and `ambiguous` inside the window resolve themselves on the next onboarding
 * retry — the server's own `action` sentence says "no action needed yet". Only the two
 * terminal-for-automation states are a standing job.
 */
export const WELCOME_NEEDS_A_PERSON = ['unresolved_expired', 'payload_conflict'] as const

export function needsAPerson(row: UnresolvedWelcome): boolean {
  return (WELCOME_NEEDS_A_PERSON as readonly string[]).includes(row.outcome ?? '')
}

/**
 * Load the list. The ONLY request this panel ever makes.
 *
 * ⚠️ GET, ALWAYS, AND THE METHOD IS ASSERTED IN THE TESTS. A panel that could POST while
 * merely rendering would be the automatic resend R120 forbids, reintroduced by a screen.
 */
export async function loadUnresolvedWelcomes(
  get: (path: string) => Promise<WelcomeUnresolvedPayload>,
): Promise<WelcomeView> {
  try {
    return welcomeView(await get(WELCOME_UNRESOLVED_PATH))
  } catch {
    return welcomeView(null, true)
  }
}
