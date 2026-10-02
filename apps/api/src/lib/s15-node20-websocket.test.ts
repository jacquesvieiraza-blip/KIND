// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 2 Oct (card #2553 · sending fix #15) — THE GITHUB "TESTS" CHECK RUNS ON A NODE WITH NO WEBSOCKET.
//
// RUNTIME VERIFIED from the CI log (run 36880883361): the Tests workflow runs Node 20, which has
// no built-in WebSocket, and Supabase's client throws *"Node.js 20 detected without native
// WebSocket support"* the moment `middleware/auth.ts` creates it — so every push and PR was red.
//
// The workflow is NOT edited (the founder: don't touch workflow settings). The shared test setup
// hands Supabase the `ws` library when the Node running the tests has no WebSocket of its own,
// which is what the `ws` dependency is already for in `@kind/db`. Production code is unchanged.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '..', '..', '..', '..')

describe('#2553 — the test suite runs on a Node with no built-in WebSocket', () => {
  it('🛑 without a WebSocket the auth middleware cannot load (the CI failure) — and with the setup it can', async () => {
    const g = globalThis as unknown as Record<string, unknown>
    const saved = g.WebSocket
    delete g.WebSocket
    process.env.SUPABASE_URL ||= 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY ||= 'test-anon-key'
    try {
      vi.resetModules()
      await expect(import('../middleware/auth')).rejects.toThrow(/WebSocket/)

      // Loading the setup module provides one, exactly as the shared setup does before every file…
      const { provideWebSocket } = await import(join(ROOT, 'vitest.websocket'))
      expect(typeof g.WebSocket).toBe('function')
      // …and on a bare Node, asking again provides one again.
      delete g.WebSocket
      expect(provideWebSocket()).toBe(true)
      expect(typeof g.WebSocket).toBe('function')

      vi.resetModules()
      await expect(import('../middleware/auth')).resolves.toHaveProperty('requireAuth')
    } finally {
      g.WebSocket = saved
    }
  })

  it('a Node that HAS WebSocket keeps its own — nothing is replaced', async () => {
    const { provideWebSocket } = await import(join(ROOT, 'vitest.websocket'))
    const before = (globalThis as unknown as Record<string, unknown>).WebSocket
    expect(provideWebSocket()).toBe(false)
    expect((globalThis as unknown as Record<string, unknown>).WebSocket).toBe(before)
  })

  it('🛑 the shared setup — the one both the full check and the GitHub run load — provides it', () => {
    expect(readFileSync(join(ROOT, 'vitest.setup.ts'), 'utf8')).toContain("import './vitest.websocket'")
    expect(readFileSync(join(ROOT, 'apps', 'api', 'vitest.config.ts'), 'utf8')).toContain("'../../vitest.setup.ts'")
  })
})

describe('#2553 — the tests read the repo from its root, wherever the run started', () => {
  it('🛑 a run started in apps/api (as GitHub runs it) still sees the repo root as its folder', () => {
    expect(process.cwd()).toBe(ROOT)
  })
})
