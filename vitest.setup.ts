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

// ⚑ 2 Oct (#2553) — and a WebSocket for Supabase when the Node running the tests has none
// (GitHub's Tests runner is Node 20). See `vitest.websocket.ts`.
import './vitest.websocket'

// ⚑ 2 Oct (#2553) — EVERY TEST READS THE REPO FROM ITS ROOT, WHEREVER THE RUN STARTED. Many tests
// open repo files by a root-relative path ('apps/portal/src/...'). `scripts/check.sh` runs from
// the root, so they pass there; GitHub's Tests workflow runs `yarn workspace @kind/api test` from
// `apps/api`, where the same paths point at `apps/api/apps/...` and 14 files failed. Each test
// file runs in its own process (vitest's default pool), so this changes nothing between files.
process.chdir(__dirname)

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
