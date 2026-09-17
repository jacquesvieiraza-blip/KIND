// ═══════════════════════════════════════════════════════════════════════════════
// XC-13 · WHAT KIND OF PROVIDER FAILURE WAS THAT, AND WHAT DOES IT OBLIGE?
//
// ── WHAT EARNED IT ────────────────────────────────────────────────────────────
//
// An Apollo failure inside `runIcpJob` propagated straight out to a crash boundary that
// wrote `failed` and sent an email. Three things were true of every one of them:
//
//   ① **THE PROGRAMME RESERVATION STAYED OPEN.** `openBatch` reserves volume before the
//      search and `settleBatch` converts it afterwards. A throw between the two skips the
//      settle, so a client's paid volume sits reserved against a batch that delivered
//      nothing — until somebody reconciles it by hand. HOUSE-009 was this defect from the
//      other end, and it cost 246 people counted against `0 used / 0 reserved`.
//   ② **"OUT OF CREDITS" AND "APOLLO IS DOWN" WERE THE SAME ROW.** One is a top-up, the
//      other is a wait. `icp_run_outcomes` already carries the distinction
//      (`quota_exhausted` vs `failed`) and nothing was using it.
//   ③ **NOBODY WAS TOLD IN A FORM THEY COULD ACT ON** — an email is not a queue (XC-5).
//
// With FD-6 there is no second provider, so an Apollo failure is the whole answer. That
// makes classifying it the difference between telling a client the truth and telling them
// "no companies match your profile yet" about a search that never happened.
//
// ── THE TWO RULES ─────────────────────────────────────────────────────────────
//
// ① **NOTHING DERIVES `no_match`.** A failure is never evidence about a market. The only
//    statuses this module can produce are `quota_exhausted` and `failed`.
// ② **AN UNRECOGNISED FAILURE IS `failed`, NEVER `quota_exhausted`.** `quota_exhausted` is
//    a claim about money; defaulting an unknown error to it would tell the founder his
//    credits ran out on the strength of a stack trace nobody read.
// ═══════════════════════════════════════════════════════════════════════════════

import type { OperatorTaskKind, OperatorTaskSeverity } from './operator-tasks'

export const PROVIDER_FAILURE_CLASSES = [
  /** 401/403 — the key is rejected. A key problem, not a capacity problem. */
  'unauthorised',
  /** 402 — the account needs money. */
  'payment_required',
  /** 422 mentioning credits, or `ApolloCreditsExhaustedError`. The pool is spent. */
  'credits_exhausted',
  /** 429 — too fast. A wait, not a fault. */
  'rate_limited',
  /** 5xx — the provider is unwell. */
  'provider_error',
  /** No answer inside the bound. Never evidence about the audience. */
  'timeout',
  /** A 4xx we caused, or a body that is not the shape we parse. Our bug. */
  'malformed',
] as const

export type ProviderFailureClass = typeof PROVIDER_FAILURE_CLASSES[number]

/** The two statuses `icp_run_outcomes` admits for a run that did not complete. */
export type FailedRunStatus = 'quota_exhausted' | 'failed'

export interface ProviderFailureVerdict {
  klass: ProviderFailureClass
  /** What `recordRunOutcome` must write. Never `no_match`. */
  runStatus: FailedRunStatus
  /** Which Needs-you class this becomes. */
  taskKind: OperatorTaskKind
  severity: OperatorTaskSeverity
  /** Is waiting a reasonable response? Drives FD-0's automatic recovery, in Batch 2. */
  retryable: boolean
  /**
   * Must the reservation be released?
   *
   * ⚠️ ALWAYS TRUE, AND IT IS STILL A FIELD. Making it explicit means a future class cannot
   * be added that quietly holds a client's paid volume, and the test that asserts every
   * class releases can point at something.
   */
  releaseReservation: true
  /** One sentence an operator can act on. */
  operatorAction: string
  /** The detail line. Redacted: this lands in a console and gets copied into notes. */
  operatorDetail: string
}

/**
 * Strip anything key-shaped out of a provider's own error text.
 *
 * ⚠️ THE MESSAGE IS NOT OURS. Apollo echoes parts of the request in some errors, and an
 * error that happens to contain a key must not be stored verbatim in a table a console
 * renders. The production database URL has already been exposed once this month by exactly
 * this kind of pass-through.
 */
function redact(message: string): string {
  return message
    // ① ANYTHING FOLLOWING A KEY-SHAPED LABEL, however it is punctuated. The first cut of
    // this required `[:=]`, so `bad key abcd1234secretkey` — a real 401 shape — passed
    // through untouched, and the second cut computed its replacement from the literal
    // string `'$&'` at module load, which silently collapsed the label into the redaction
    // too. Both were caught by the test, which could not run until today.
    .replace(
      /\b((?:[a-z]+[_-])?(?:api[_-]?)?(?:key|token|secret|password)s?)\b\s*[:=]?\s*\S+/gi,
      '$1 [redacted]',
    )
    // ② ANYTHING LONG AND SECRET-SHAPED, labelled or not — but it must actually look like a
    // secret. A flat `{24,}` length rule also ate `SEARCH_VALIDATION_SEARCH_PARAMS_INVALID`,
    // which is the one part of a 422 an engineer needs to read. Requiring BOTH a lowercase
    // letter and a digit keeps Apollo's SCREAMING_SNAKE error codes legible while still
    // catching keys, tokens and JWT segments.
    .replace(
      /\b(?=[A-Za-z0-9_-]{16,}\b)(?=[A-Za-z0-9_-]*[a-z])(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]+\b/g,
      '[redacted]',
    )
    .slice(0, 400)
}

const text = (err: unknown): string => {
  if (err instanceof Error) return `${err.name}: ${err.message}`
  if (typeof err === 'string') return err
  try {
    return JSON.stringify(err) ?? ''
  } catch {
    return ''
  }
}

/**
 * Classify a provider failure.
 *
 * ⚠️ MATCHED ON THE MESSAGE, NOT `instanceof`, FOR THE HTTP CLASSES. A reloaded module
 * graph — which every `vi.resetModules()` and every dynamic import produces — makes
 * `instanceof` lie, and the paid-provider guard already learned that lesson the hard way
 * ("recognised by its stable code, not instanceof"). The two named Apollo errors are still
 * matched by name as well, because their names are stable strings.
 */
export function classifyProviderFailure(err: unknown): ProviderFailureVerdict {
  const raw = text(err)
  const detail = redact(raw)
  const name = err instanceof Error ? err.name : ''
  const lower = raw.toLowerCase()

  const verdict = (
    klass: ProviderFailureClass,
    runStatus: FailedRunStatus,
    taskKind: OperatorTaskKind,
    severity: OperatorTaskSeverity,
    retryable: boolean,
    operatorAction: string,
  ): ProviderFailureVerdict => ({
    klass, runStatus, taskKind, severity, retryable,
    releaseReservation: true,
    operatorAction,
    operatorDetail: detail,
  })

  // ── credits FIRST, because a 422 means two different things ────────────────
  //
  // 🛑 APOLLO ANSWERS 422 FOR BOTH an invalid request and an exhausted credit pool. Reading
  // them as one class is how "your targeting is wrong" gets shown for "we ran out of
  // credits" — and the client is told to widen an ICP that was never the problem.
  if (name === 'ApolloCreditsExhaustedError' || /credit/.test(lower)) {
    return verdict(
      'credits_exhausted', 'quota_exhausted', 'provider_credits_exhausted', 'critical', false,
      'Top up Apollo lead credits (Apollo → Settings → Billing). Until then every reveal fails, so no Proof set and no programme batch can be delivered.',
    )
  }

  if (/\b402\b|payment required/.test(lower)) {
    return verdict(
      'payment_required', 'quota_exhausted', 'provider_credits_exhausted', 'critical', false,
      'Apollo wants payment — check billing (Apollo → Settings → Billing). No sourcing completes until it clears.',
    )
  }

  if (/\b40[13]\b|unauthorized|unauthorised|forbidden|invalid api key/.test(lower)) {
    return verdict(
      'unauthorised', 'failed', 'provider_refused', 'critical', false,
      'Apollo rejected the API key. Regenerate it in Apollo → Settings → Integrations → API and re-paste into Railway → @kind/api. The account is not out of credits; the key is the fault.',
    )
  }

  if (/\b429\b|rate limit|too many requests/.test(lower)) {
    return verdict(
      'rate_limited', 'failed', 'provider_unavailable', 'warn', true,
      'Apollo rate-limited us. Nothing is wrong with the account or the targeting — the run can be repeated shortly.',
    )
  }

  if (name === 'AbortError' || /timed out|timeout|etimedout|esockettimedout/.test(lower)) {
    return verdict(
      'timeout', 'failed', 'provider_unavailable', 'warn', true,
      'Apollo did not answer inside the bound. The search did not complete, so this run proves NOTHING about the audience — it can be repeated.',
    )
  }

  if (/\b5\d\d\b|internal server error|bad gateway|service unavailable/.test(lower)) {
    return verdict(
      'provider_error', 'failed', 'provider_unavailable', 'critical', true,
      'Apollo is returning server errors. Check status.apollo.io. Apollo is the only lead source (FD-6), so every run sources zero until it recovers.',
    )
  }

  if (name === 'SyntaxError' || /\b4\d\d\b|unexpected token|not supported|invalid/.test(lower)) {
    return verdict(
      'malformed', 'failed', 'provider_refused', 'critical', false,
      // ⚠️ THE WORDS "TOP UP" ARE DELIBERATELY ABSENT, not negated. This sentence lands in a
      // task list that gets scanned, and a scanned "do not top up" is read as "top up" often
      // enough to matter — the guard in `provider-failure.test.ts` asserts the phrase never
      // appears in a malformed action at all, which is stricter than asserting it is negated.
      'Apollo refused the request itself, or answered in a shape we do not parse. This is an engineering fault in the request we sent — not a billing problem and not a targeting one, so the account and the ICP are both fine.',
    )
  }

  // ── THE FAIL-CLOSED DEFAULT ────────────────────────────────────────────────
  return verdict(
    'provider_error', 'failed', 'provider_unavailable', 'critical', true,
    'The lead source failed in a way this build does not recognise. The run proves nothing about the audience. Read the detail, then check status.apollo.io and the key.',
  )
}
