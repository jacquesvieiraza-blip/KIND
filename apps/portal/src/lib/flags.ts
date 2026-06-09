// ── V2 per-screen promotion flags ────────────────────────────────────────────
// Approved V2 screens are promoted to the LIVE product one at a time, each behind
// its own switch. `FEATURE_V2_SCREENS` is a comma-separated list of approved screen
// keys set in the server env (Railway). Empty/unset → everything OFF → the live
// product is unchanged. Flip a key on to test; remove it to roll back instantly.
//
//   FEATURE_V2_SCREENS=layout            → slim sidebar + top header live
//   FEATURE_V2_SCREENS=layout,onboarding → both live
//   FEATURE_V2_SCREENS=all               → every promoted screen on (use with care)
export function v2Enabled(screen: string): boolean {
  const list = (process.env.FEATURE_V2_SCREENS || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  return list.includes('all') || list.includes(screen.toLowerCase())
}
