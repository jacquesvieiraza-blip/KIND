// ── THE ZERO-SPEND GUARD — launch testing may never buy data ────────────────────
//
// Founder rule (R66, 25 Aug): launch-flow testing runs on **mocked providers or
// existing pooled contacts**, and nothing else. The failure it closes is specific and
// it is not hypothetical — `runIcpJob` serves what the pool can give and then buys the
// PDL remainder without anyone asking, which is how a "free" flow test spends real
// acquisition budget.
//
// ⚠️ WHY THIS LIVES AT THE `fetch` BOUNDARY AND NOWHERE ELSE. A guard placed in the
// sourcing route protects the paths somebody remembered to guard. The money leaves at
// the HTTP call, so the check has to be at the HTTP call — every other position is a
// convention, and conventions are what R66 exists because of.
//
// ⚠️ IT THROWS. It does not return empty, and that is deliberate: an empty result reads
// as "nobody matched", which is exactly the false state the proof desk already confuses
// with a real zero. Safe data exhausted must FAIL LOUDLY, never look like a finished
// audience. Callers that swallow errors will surface it as a run failure, which is the
// correct outcome — a stopped test costs nothing, a silent purchase costs money.
//
// ⚠️ FAIL-CLOSED ON A MALFORMED FLAG. Anything other than an explicit off value keeps
// the guard ON once the variable is present at all, so a typo cannot quietly re-enable
// spending. Absent variable = normal production behaviour, unguarded.

/** Providers K.I.N.D pays per call. Hunter and Clearbit both bill enrichment. */
export type PaidProvider = 'pdl' | 'apollo' | 'hunter' | 'clearbit'

/** Values that mean "explicitly yes". Anything else is a no. */
const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on'])

/** Values that mean "the override is off". Everything else present means ON. */
const OFF_VALUES = new Set(['', '0', 'false', 'no', 'off'])

/**
 * Is safe (no-spend) mode active? Read at CALL TIME, never at import — a module-level
 * constant would freeze the value before a test could set it, the same class of bug as
 * `figsy.ts`'s old module-level `FROM` constant (S5).
 *
 * ⚠️ THE UNIT SUITE IS PROTECTED SEPARATELY AND MORE STRONGLY — `vitest.setup.ts`
 * deletes every provider API key before any test runs, so the suite cannot authenticate
 * against a provider at all. This flag is not what keeps tests safe.
 *
 * ⚠️ FAIL-CLOSED BY DEFAULT. Safe mode is ON unless the environment has **deliberately**
 * opted in with `PAID_PROVIDERS_ENABLED=true`. Forgetting a variable therefore costs a
 * refused call, never money — the opposite of the first version, where forgetting cost
 * money. Real production acquisition still has its deliberate path; it is one variable,
 * set once, on purpose.
 */
export function isSafeTestMode(): boolean {
  // ① An explicit SAFE_TEST_MODE forces safe mode on (staging, a manual walk).
  const raw = process.env.SAFE_TEST_MODE
  if (raw !== undefined && !OFF_VALUES.has(raw.trim().toLowerCase())) return true

  // ② Otherwise: spending is allowed ONLY if the environment opted in on purpose.
  const allow = (process.env.PAID_PROVIDERS_ENABLED ?? '').trim().toLowerCase()
  return !TRUE_VALUES.has(allow)
}

/** Thrown instead of spending. Named so a caller can recognise it without string-matching. */
export class PaidProviderBlockedError extends Error {
  readonly provider: PaidProvider
  readonly code = 'SAFE_TEST_MODE_BLOCKED'
  constructor(provider: PaidProvider, context?: string) {
    super(
      `SAFE_TEST_MODE is on — refusing to call ${provider.toUpperCase()}` +
        (context ? ` (${context})` : '') +
        '. Launch testing uses mocks, fixtures or existing pooled contacts only. ' +
        'Safe data is exhausted: STOP and add fixtures — do not buy more data. ' +
        'To allow real provider spend, set PAID_PROVIDERS_ENABLED=true (and leave SAFE_TEST_MODE unset).',
    )
    this.name = 'PaidProviderBlockedError'
    this.provider = provider
  }
}

/**
 * Call immediately before any HTTP request that costs money. Throws in safe-test mode,
 * returns silently otherwise.
 *
 * @param provider which paid provider is about to be called
 * @param context  short call-site hint, surfaced in the error so the log names the path
 */
export function assertPaidProviderAllowed(provider: PaidProvider, context?: string): void {
  if (isSafeTestMode()) throw new PaidProviderBlockedError(provider, context)
}

/**
 * Re-throw a `PaidProviderBlockedError`, swallow nothing else.
 *
 * ⚠️ WHY THIS EXISTS, and it is not hypothetical. `apollo.ts` wrapped the PDL search in
 * `.catch(() => null)`. That handler was written for network flakiness and it did its job
 * — but it also ate the guard's deliberate refusal, so a blocked run completed with zero
 * contacts, derived `no_match`, and told a prospect **"No leads matched this ICP. Try
 * widening it"** when we had never asked PDL anything. The approved `failed` state was
 * unreachable because the throw never escaped.
 *
 * ⚠️ THE RULE THIS ENCODES: **a deliberate block must propagate as a deliberate block.**
 * An ordinary provider or network error keeps whatever soft-failure behaviour it already
 * had — those handlers are not changed, they are only taught to let this one error past.
 *
 * Call it as the FIRST statement of any catch that degrades a provider failure into a
 * neutral value (`null`, `[]`, a zero count, a "temporarily unavailable" string).
 */
export function rethrowIfProviderBlocked(err: unknown): void {
  if (err instanceof PaidProviderBlockedError) throw err
}
