// ── THE TEST RUNNER CANNOT SPEND — enforced, not promised (R66) ─────────────────
//
// Two different problems, two different mechanisms, and it matters which is which.
//
//   ① THE DEPLOYED APP is protected by `PAID_PROVIDERS_ENABLED` defaulting to OFF
//      (`lib/paid-provider-guard.ts`). That is the one the founder's launch/proof testing
//      runs against, and forgetting a variable there costs a refused call, never money.
//
//   ② THE UNIT SUITE is protected HERE, and more strongly: every provider API key is
//      deleted from the process before a single test runs. A test cannot authenticate
//      against PDL, Apollo, Hunter or Clearbit even if it tried, because there is nothing
//      to authenticate with. That is a structural guarantee, not a flag anyone can unset.
//
// ⚠️ WHY THE GUARD IS THEN TURNED **ON** FOR TESTS (`PAID_PROVIDERS_ENABLED = 'true'`):
// dozens of existing tests mock `fetch` and assert what the provider code does with the
// response — Hunter's 451 privacy refusal, PDL's size ladder, Apollo's fallback. Blocking
// the call in-process would stop those tests exercising the code at all, which protects
// nothing and hides real behaviour. The mocked call is safe because the key is gone.
//
// ⚠️ A test that genuinely wants to prove the guard REFUSES sets its own env inside the
// test and restores it afterwards. See `acquisition-memory.test.ts`.

const PROVIDER_KEYS = [
  'PDL_API_KEY',
  'APOLLO_API_KEY',
  'HUNTER_API_KEY',
  'CLEARBIT_API_KEY',
] as const

for (const key of PROVIDER_KEYS) delete process.env[key]

// Mocked provider paths may run; the keys above are gone, so nothing can reach a provider.
process.env.PAID_PROVIDERS_ENABLED = 'true'

export { PROVIDER_KEYS }
