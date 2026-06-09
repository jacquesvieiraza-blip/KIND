// ── V2 per-screen promotion flags ────────────────────────────────────────────
// Approved V2 screens are promoted to the LIVE product one at a time, each behind
// its own switch. Set a comma-separated list of approved screen keys in Railway.
// Empty/unset → everything OFF → the live product is unchanged. Flip a key on to
// test; remove it to roll back instantly.
//
// Use NEXT_PUBLIC_FEATURE_V2_SCREENS — it's readable by BOTH server components
// (layout, home) AND client components (leads, signup). FEATURE_V2_SCREENS is
// still honoured for server-only screens already wired to it.
//
//   NEXT_PUBLIC_FEATURE_V2_SCREENS=layout,home,leads,signup
//   NEXT_PUBLIC_FEATURE_V2_SCREENS=all   → every promoted screen on
export function v2Enabled(screen: string): boolean {
  const raw = process.env.NEXT_PUBLIC_FEATURE_V2_SCREENS || process.env.FEATURE_V2_SCREENS || ''
  const list = raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  return list.includes('all') || list.includes(screen.toLowerCase())
}
