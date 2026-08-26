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

/** Values that mean "the guard is off". Everything else present means ON. */
const OFF_VALUES = new Set(['', '0', 'false', 'no', 'off'])

/**
 * Is safe-test mode active? Reads `SAFE_TEST_MODE` at CALL TIME, never at import —
 * a module-level constant would freeze the value before a test could set it, which is
 * the same class of bug as `figsy.ts`'s old module-level `FROM` constant (S5).
 */
export function isSafeTestMode(): boolean {
  const raw = process.env.SAFE_TEST_MODE
  if (raw === undefined) return false
  return !OFF_VALUES.has(raw.trim().toLowerCase())
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
        'Unset SAFE_TEST_MODE to allow real provider spend.',
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
