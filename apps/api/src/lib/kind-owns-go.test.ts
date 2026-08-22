// ═══════════════════════════════════════════════════════════════════════════
// K.I.N.D OWNS GO — the client cannot switch their own ICP live.
//
// Until 22 Aug `PATCH /icps/:id/activate` was client-authenticated. The client's revision
// went live the moment they pressed it, nobody at K.I.N.D was told, and — because activating
// a never-run ICP fires its first sourcing run — a client edit could start real, money-
// spending sourcing with no operator watching. The founder's ruling is the opposite: the
// client writes and refines, K.I.N.D decides when it runs.
//
// The gate is the ADMIN KEY, reusing the check `routes/lookalike.ts` already uses rather
// than inventing an approval state machine. These tests prove the door, both ways: a client
// is refused, an operator is not.
//
// Mocks only.
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

type Rec = { icpUpdates: Array<Record<string, unknown>>; sourcingStarted: boolean; userIdSeen: string | null }

async function activate(headers: Record<string, unknown>, body: Record<string, unknown>, rec: Rec) {
  vi.resetModules()

  vi.doMock('@kind/db', () => {
    const makeQuery = (table: string) => {
      const q: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'in', 'is', 'neq', 'not', 'order', 'or']) q[m] = () => q
      q.limit = () => q
      q.single = async () => ({
        data: table === 'clients'
          ? { id: 'c1', credit_balance: 0, first_icp_run_at: null, user_id: 'client-owner-user' }
          : { id: 'icp-1', name: 'Test', last_run_at: null },
        error: null,
      })
      q.maybeSingle = async () => ({ data: table === 'clients' ? { id: 'c1' } : { id: 'icp-1' }, error: null })
      q.update = (patch: Record<string, unknown>) => {
        if (table === 'icps') rec.icpUpdates.push(patch)
        const chain: Record<string, unknown> = {}
        for (const m of ['eq', 'in', 'is', 'neq']) chain[m] = () => chain
        ;(chain as { select: unknown }).select = () => ({ single: async () => ({ data: { id: 'icp-1', name: 'Test', last_run_at: null }, error: null }) })
        ;(chain as { then: unknown }).then = (r: (v: unknown) => void) => r({ error: null })
        return chain
      }
      q.insert = () => ({ select: () => ({ single: async () => ({ data: { id: 'x' }, error: null }) }), then: (r: (v: unknown) => void) => r({ error: null }) })
      q.then = (r: (v: unknown) => void) => r({ data: [], count: 0, error: null })
      return q
    }
    return {
      db: {
        from: (t: string) => makeQuery(t),
        rpc: async () => ({ data: 0, error: null }),
        auth: { admin: { listUsers: async () => ({ data: { users: [] }, error: null }), getUserById: async () => ({ data: { user: { email: '' } }, error: null }) } },
      },
    }
  })
  vi.doMock('./start-work', () => ({
    ensureCampaignForIcp: async () => ({ id: 'camp-1' }),
    startWorkForClient: async () => ({ started: false, sourced: 0, surfaced: 0, recommended: 0 }),
  }))
  vi.doMock('../routes/admin', () => ({ adminKeyValid: (k: unknown) => k === 'right-key' }))

  const mod = await import('../routes/icps')
  const layer = (mod.icpRouter as unknown as { stack: Array<Record<string, any>> }).stack
    .find(l => l.route?.path === '/:id/activate')
  const handler = layer!.route.stack[layer!.route.stack.length - 1].handle
  const res = {
    statusCode: 200, body: null as unknown,
    status(c: number) { this.statusCode = c; return this },
    json(b: unknown) { this.body = b; return this },
  }
  await handler({ params: { id: 'icp-1' }, body, headers, userId: 'operator-user' }, res)
  return res
}

const prev = { anthropic: process.env.ANTHROPIC_API_KEY, url: process.env.SUPABASE_URL, anon: process.env.SUPABASE_ANON_KEY }

describe('activating an ICP is K.I.N.D\'s decision, not the client\'s', () => {
  let rec: Rec
  beforeEach(() => {
    rec = { icpUpdates: [], sourcingStarted: false, userIdSeen: null }
    process.env.ANTHROPIC_API_KEY = 'test-key'
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'
  })
  afterEach(() => {
    vi.doUnmock('./start-work'); vi.doUnmock('../routes/admin'); vi.resetModules()
    process.env.ANTHROPIC_API_KEY = prev.anthropic
    process.env.SUPABASE_URL = prev.url
    process.env.SUPABASE_ANON_KEY = prev.anon
  })

  it('A CLIENT IS REFUSED — no admin key, no activation', async () => {
    const res = await activate({}, {}, rec)
    expect(res.statusCode).toBe(403)
    // Nothing was flipped: a refused activation must not half-deactivate their ICPs either.
    expect(rec.icpUpdates).toHaveLength(0)
  })

  it('a wrong key is refused too', async () => {
    const res = await activate({ 'x-admin-key': 'guessed' }, {}, rec)
    expect(res.statusCode).toBe(403)
    expect(rec.icpUpdates).toHaveLength(0)
  })

  it('the refusal explains what happens next instead of reading as an error', async () => {
    const res = await activate({}, {}, rec)
    expect(String((res.body as { error: string }).error)).toMatch(/K\.I\.N\.D/)
    expect(String((res.body as { error: string }).error)).toMatch(/saved/i)
  })

  it('AN OPERATOR CAN ACTIVATE, and the ICP goes live', async () => {
    const res = await activate({ 'x-admin-key': 'right-key' }, { client_id: 'c1' }, rec)
    expect(res.statusCode).toBe(200)
    expect((res.body as { success: boolean }).success).toBe(true)
    // Exactly the old behaviour: deactivate the client's others, then activate this one.
    expect(rec.icpUpdates.some(u => u.is_active === false)).toBe(true)
    expect(rec.icpUpdates.some(u => u.is_active === true)).toBe(true)
  })

  it('the first sourcing run still fires for a never-run ICP', async () => {
    const res = await activate({ 'x-admin-key': 'right-key' }, { client_id: 'c1' }, rec)
    // `sourcing: true` is the route's own signal that it started the first run — the
    // behaviour that must survive moving the button from the client to us.
    expect((res.body as { sourcing: boolean }).sourcing).toBe(true)
  })
})
