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

// ── FIRE-AND-FORGET WORK CANNOT OUTLIVE ITS TEST (1 Sep) ────────────────────────────────
//
// 🛑 THE SHIP BLOCKER THIS CLOSES. `ship.sh` went red on ONE test in 4,762:
//
//     proof-review-handoff.test.ts › the third attempt is refused 409 and persists ONE open
//     review  —  expected client().proof_passes_done to be 2, received 0
//
// **Zero, not one and not three.** Nothing decremented the counter — all three requests
// incremented a store the assertion was no longer looking at.
//
// ⚠️ THE MECHANISM. `POST /icps/:id/proof` starts `runIcpJob` without awaiting it (correct —
// the prospect gets an instant answer). `runIcpJob` then performs four dynamic
// `await import(...)` calls inside its body, the first early on. Nothing held that promise,
// so the leaked job was still touching the module registry when the NEXT test ran
// `vi.resetModules()` and re-imported `routes/icps` — and the re-imported route could bind to
// the PREVIOUS test's `@kind/db` mock. Every write then landed in the previous test's store.
//
// ⚠️ WHY THIS IS GLOBAL AND NOT THREE `afterEach` HOOKS. **Thirty test files import
// `routes/icps`.** Draining in the three that happened to go red would fix those three and
// leave the same race live in twenty-seven others — and three hand-copied hooks is the
// "second copy of a rule" defect this repo logs over and over. One boundary, applied to every
// test file, including every future one nobody remembers to instrument.
//
// ⚠️ NO SLEEP, NO TIMER, NO RETRY. It awaits the actual promises. The registry lives on
// `globalThis` precisely so this still sees work started before a `vi.resetModules()`.
// ⚠️ STATICALLY IMPORTED, AND THE FIRST DRAFT'S DYNAMIC `await import(...)` WAS A REAL
// MISTAKE. Importing inside the hook ran a module-registry operation in the teardown of every
// one of the 222 test files — including the ones that call `vi.resetModules()` — so the fix
// was performing the very kind of action whose race it exists to close. Measured: it made
// shuffled-order runs worse, not better. The registry lives on `globalThis`, so a static
// import here reads the same set no matter how many times modules are reset.
import { afterEach } from 'vitest'
import { settleBackgroundWork } from './apps/api/src/lib/background'

afterEach(async () => {
  await settleBackgroundWork()
})
