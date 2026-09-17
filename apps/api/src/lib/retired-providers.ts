// ═══════════════════════════════════════════════════════════════════════════════
// FD-6 + FD-5 · THE PROVIDERS THAT ARE OFF, AND CANNOT BE TURNED ON BY A KEY
//
// ── THE TWO FOUNDER RULINGS THIS FILE ENFORCES ────────────────────────────────
//
// **FD-6 (17 Sep), verbatim:** *"PDL IS NOT A PAID/ACTIVE PROVIDER FOR MVP1. We are not
// paying for PDL."*
//
// **FD-5 (17 Sep):** a verified business email is required before any send, and
// *"Hunter remains LOCKED OFF. Do not silently re-enable Hunter."* Workbook APOLLO-005
// records the same lock for the Wednesday MVP: *"HUNTER_API_KEY remains unset"*, and
// APOLLO-011 records the founder removing it.
//
// ── WHY A KEY CHECK IS NOT ENOUGH ─────────────────────────────────────────────
//
// Every one of these providers was gated on `if (!process.env.X_API_KEY) return null`.
// That is a gate on CONFIGURATION, and it makes the lock a property of a Railway variable
// rather than of the product. The failure it permits is precise and cheap to trigger:
// somebody pastes a key back in — to test something, to debug a reveal, because an old
// runbook says to — and a provider the founder locked off is live again, silently, with
// every test still green because the suite deletes the keys before it runs.
//
// So the lock lives here, in code, and the key check stays where it is as a second layer.
// Turning one of these back on requires editing this file, which means a diff, a review
// and a founder decision — which is what "locked off" has to mean to be worth saying.
//
// ⚠️ THIS IS NOT A KILL-SWITCH AND MUST NOT BE READ AS ONE. The outbound kill-switch
// (`AUTO_OUTREACH_ENABLED`) is an operational control the founder opens and closes. This is
// a RETIREMENT: a statement that these vendors are not part of MVP1's architecture. There
// is deliberately no environment variable that lifts it.
// ═══════════════════════════════════════════════════════════════════════════════

/** Vendors retired from the MVP1 architecture. Not "disabled" — retired. */
export const RETIRED_PROVIDERS = {
  pdl: 'FD-6 (17 Sep): PDL is not a paid or active provider for MVP1. We are not paying for PDL.',
  hunter: 'FD-5 (17 Sep): Hunter remains LOCKED OFF and must not be silently re-enabled.',
  clearbit:
    'Not part of the MVP1 architecture: it sits at the end of a waterfall whose earlier two ' +
    'stages are retired, so it can only ever be reached by a path that no longer exists.',
} as const

export type RetiredProvider = keyof typeof RETIRED_PROVIDERS

/** Is this vendor retired? The only question any call site needs to ask. */
export function isRetiredProvider(name: string): name is RetiredProvider {
  return Object.prototype.hasOwnProperty.call(RETIRED_PROVIDERS, name)
}

// Logged ONCE per provider per process. A refusal that prints on every lead would bury the
// run's real output, and a refusal nobody ever sees is how a retirement becomes a mystery.
const announced = new Set<string>()

/**
 * Refuse a retired provider, loudly the first time and silently thereafter.
 *
 * Returns `true` when the caller must stand down. It does NOT throw: these call sites sit
 * inside an enrichment waterfall whose contract is "return null when you cannot help", and
 * a throw would turn a retirement into a crash on a path that already handles absence
 * correctly.
 *
 * ⚠️ IT IS THE CALLER'S JOB TO RETURN. This function cannot make anybody stop; a call site
 * that ignores the answer is not fenced. `one-provider-apollo.test.ts` proves the fence
 * behaviourally, with every key SET, which is the only test that could catch that.
 */
export function refuseRetiredProvider(name: RetiredProvider, where: string): true {
  if (!announced.has(name)) {
    announced.add(name)
    console.warn(
      `[retired-providers] ${name} is RETIRED and was not called from ${where}. ` +
      `${RETIRED_PROVIDERS[name]} ` +
      `A key being present does not re-enable it — the lock is in code, not in configuration.`,
    )
  }
  return true
}

/**
 * Is this provider retired? A quiet predicate, for a CALLER that wants to skip preparatory
 * work rather than make a request and be refused.
 *
 * ⚠️ IT EXISTS BECAUSE A FENCE AT THE LAST STEP IS NOT A FENCE ON THE STEP BEFORE IT. The
 * enrichment waterfall resolves a company domain (a free Clearbit autocomplete, no key)
 * purely so it can hand one to Hunter. With Hunter retired, that request is a call to a
 * third party for an answer nobody will use — harmless in money, not harmless in fact: it
 * is a lead's company name leaving the building for no reason.
 */
export function providerRetired(name: string): boolean {
  return isRetiredProvider(name)
}

/** Test-only: forget which refusals have been announced. */
export function resetRetiredProviderAnnouncements(): void {
  announced.clear()
}
