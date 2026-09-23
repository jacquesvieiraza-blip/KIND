export * from './types/index'
export * from './constants/index'
export * from './launch-countries'
// ⚑ 23 Sep — partners are frozen: one switch for the API, the portal and Vida.
export * from './partners-frozen'
// ⚑ 14 Sep (S1-RT-006) — where we can commercially work, decided once. Distinct from the
// provider-vocabulary problem: no human can translate a country we do not operate in.
export * from './geography-support'
// ⚑ 23 Sep (R142) — seniority is Apollo's own eleven values; one list for Brief, search and check.
export * from './apollo-seniority'
export * from './company-details'
export * from './cost-floor'
export * from './panel-state'
export * from './client-honesty'
export * from './targeting-refinement'
export * from './notice'
export * from './run-outcome-banner'
// ⚠️ THE PROGRAMME MODEL — founder-approved, UNBUILT as live commercial truth (R74/R81).
// Exported so the API and admin share one curve; the legacy money constants above remain
// the LIVE model and the two may never import each other (programme-legacy-fence.test.ts).
export * from './programme-pricing'
// ⚑ 10 Sep — the CLIENT-FACING calculator. Derives no money of its own: every price, split and
// volume comes from `programme-pricing`. See its header for the committed/illustrative split.
export * from './programme-calculator'
// ⚑ 22 Sep — CAPACITY IS NOT PRICING AND NOT THE CALCULATOR, which is why it is its own
// module. Pricing answers what a meeting costs; the calculator answers what a programme comes
// to. This answers whether the pool can carry the meetings at all — the question that has to
// be settled BEFORE either of the other two is allowed to quote a number.
export * from './programme-capacity'
export * from './programme-stage'
// ⚑ MVP1 — the SIX visible stages per console, projected from the engine truth above. One
// vocabulary for both apps (C41); it decides nothing and stores nothing. See its header.
export * from './mvp1-stage'
// ⚑ MVP1 — the canonical Brief: ELEVEN data facts, one counter, every reader. Client
// confirmation is a separate gate and is deliberately not one of the eleven (C21).
export * from './brief-facts'
// ⚑ 15 Sep (O1) — carries ONE typed sentence across ONE navigation, claimed exactly once.
// Not a store, not an endpoint, not a second Milla: it hands the customer's words to the
// canonical persisted conversation so they never retype because we changed the screen.
export * from './milla-handoff'
// ⚑ XC-4 (Batch 1) — ONE rule for "which commit is this build?", shared by the API, Milla,
// Vida and the website. `/health` answered "unknown" on every deploy this repo ever made
// because `railway up` injects no SHA and the `.deploy-stamp` ship.sh writes was never
// read. Pure: no `fs` import, so both Next bundles still build.
export * from './deployed-commit'
// ⚑ J5-C14 (Batch 1) — how long a healthy Proof run may take, DERIVED from Apollo's worst
// case and from a real request timeout. The old 240s was derived entirely from PDL's size
// ladder and retry, and the worst case it measured did not exist: `searchPeople` had no
// timeout at all, so "Apollo's worst case" was unbounded.
export * from './proof-wait'
// ⚑ 18 Sep (J6-C4 · LR 6) — the ONE reason-code list. Four copies existed and two of them
// disagreed: "Bad timing" was stored by the API and read back as "Other" by the calibration
// side, so an operator saw a reason the client never gave.
export * from './lead-reason-codes'
// ⚑ 23 Sep — a client moves to Proof only when their people are ready to show (founder rule).
export * from './proof-readiness'
