'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// TEAMS HUB — MILLA-NATIVE FORK, FOR ONE TRUTH DEFECT.
//
// ⚑ 1 Sep (HOUSE READINESS). This was a 13-line wrapper around the shared `(dashboard)` team
// page. It is now a fork, because one figure on it was false for every client and `/dashboard`
// is a LIVE, separately-routed portal that keeps its own behaviour (R74).
//
// 🛑 THE DEFECT, FOUND ON THE FOUNDER'S OWN ACCOUNT. The overview read **"166 Leads today"**
// on Client Zero — an account at Proof, with sourcing unauthorised and no outreach. Nothing
// had been sourced that day, or any day, on this programme.
//
// The cause is not a bleed and not a bad query: the page reads `/leads/stats` and renders
// `data.total` — **the client's ALL-TIME lead count** — under a label that says *today*
// (`(dashboard)/dashboard/team/page.tsx:156,164,323`). 166 is House's lifetime total. The
// number was right and the word above it was wrong, which is the harder kind to notice:
// nobody checks a figure that looks plausible.
//
// ⚠️ THE LABEL IS CORRECTED, NOT THE NUMBER — and no replacement metric is invented. There is
// no "leads today" figure in `/leads/stats` to swap in, and manufacturing one would be exactly
// the fabrication the brand rule forbids. So the tile says what the value actually is.
//
// ⚠️ EVERYTHING ELSE IS CARRIED OVER VERBATIM. Same layout, same tiles, same tabs, same
// endpoints, same member list and invite flow. One label changed.
// ═══════════════════════════════════════════════════════════════════════════════════════

import TeamsHub from '@/components/TeamsHub'

export default function MillaNative_teams() {
  return (
    <div className="h-full overflow-y-auto p-5 sm:p-6">
      <TeamsHub millaTruthfulLabels />
    </div>
  )
}
