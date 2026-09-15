export * from './types/index'
export * from './constants/index'
export * from './launch-countries'
// ⚑ 14 Sep (S1-RT-006) — where we can commercially work, decided once. Distinct from the
// provider-vocabulary problem: no human can translate a country we do not operate in.
export * from './geography-support'
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
