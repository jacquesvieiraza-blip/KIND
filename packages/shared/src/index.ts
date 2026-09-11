export * from './types/index'
export * from './constants/index'
export * from './launch-countries'
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
