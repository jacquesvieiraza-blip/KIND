// ── ⚑ 2 Oct (#2553) — A WEBSOCKET FOR THE TESTS ON A NODE THAT HAS NONE ─────────────────
//
// RUNTIME VERIFIED from the CI log (run 36880883361): GitHub's "Tests" workflow runs Node 20,
// which has no built-in WebSocket, and Supabase's client throws *"Node.js 20 detected without
// native WebSocket support"* the moment `apps/api/src/middleware/auth.ts` creates one — so the
// check was red on every push and PR while `scripts/check.sh` (Node 22) stayed green.
//
// The workflow file is NOT edited (the founder: don't touch workflow settings). This hands
// Supabase the `ws` library — the same one `@kind/db` already uses for exactly this — and ONLY
// when the Node running the tests has no WebSocket of its own. Production code is unchanged.
import ws from 'ws'

/** Give the process a WebSocket if it has none. Returns whether one was provided. */
export function provideWebSocket(): boolean {
  const g = globalThis as unknown as Record<string, unknown>
  if (typeof g.WebSocket !== 'undefined') return false
  g.WebSocket = ws
  return true
}

provideWebSocket()
