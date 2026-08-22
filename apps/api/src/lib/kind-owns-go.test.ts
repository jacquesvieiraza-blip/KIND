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

// ── ROUND 4 — THE OWNER GETS THE EMAIL, AND A RUN ICP IS NOT RE-RUN ───────────
//
// The route resolves the CLIENT's user_id before calling runIcpJob, because the operator
// now presses the button and `req.userId` would mail the operator instead of the client.
// That line was code-verified and unguarded — the declared-but-never-asserted `userIdSeen`
// in the harness above is the fossil of the assertion that should have existed. This
// harness is richer than the one above because proving WHO gets the email requires the
// fire-and-forget run to actually reach the email lookup: the sourcing grant, the PDL
// contacts and the lead inserts are all simulated so `getUserById` is genuinely called.
async function activateRich(opts: {
  icpLastRunAt?: string | null
  firstIcpRunAt?: string | null
  ensure?: 'ok' | 'refused'
}, rec: Rec & { userIds: string[]; rpcs: string[] }) {
  vi.resetModules()

  vi.doMock('@kind/db', () => {
    const makeQuery = (table: string) => {
      const q: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'in', 'is', 'neq', 'not', 'order', 'or', 'gte', 'lte']) q[m] = () => q
      q.limit = async () => ({ data: [], error: null })
      q.single = async () => ({
        data: table === 'clients'
          ? { id: 'c1', credit_balance: 0, first_icp_run_at: opts.firstIcpRunAt ?? null,
              user_id: 'client-owner-user', leads_per_run: null, is_demo: false, company_name: 'Acme' }
          : { id: 'icp-1', client_id: 'c1', name: 'Test', last_run_at: opts.icpLastRunAt ?? null,
              geographies: [], job_titles: [], industries: [], seniority_levels: [], company_sizes: [] },
        error: null,
      })
      // ⚠️ NULL for anything that is not the client or the ICP — the first cut returned a
      // row for every table, so runIcpJob's per-contact dedupe saw an "existing lead" five
      // times, inserted nothing, and the email lookup this harness exists to observe was
      // never reached.
      q.maybeSingle = async () => ({
        data: table === 'clients' ? { id: 'c1' } : table === 'icps' ? { id: 'icp-1' } : null,
        error: null,
      })
      q.update = (patch: Record<string, unknown>) => {
        if (table === 'icps') rec.icpUpdates.push(patch)
        const chain: Record<string, unknown> = {}
        for (const m of ['eq', 'in', 'is', 'neq']) chain[m] = () => chain
        ;(chain as { select: unknown }).select = () => ({ single: async () => ({
          data: { id: 'icp-1', name: 'Test', last_run_at: opts.icpLastRunAt ?? null }, error: null }) })
        ;(chain as { then: unknown }).then = (r: (v: unknown) => void) => r({ error: null })
        return chain
      }
      q.insert = (rows?: unknown) => ({
        select: () => ({
          single: async () => ({ data: { id: 'x' }, error: null }),
          then: (r: (v: unknown) => void) => r({
            data: Array.isArray(rows) ? rows.map((_, i) => ({ id: `lead-${i}` })) : [], error: null }),
        }),
        then: (r: (v: unknown) => void) => r({ error: null }),
      })
      q.upsert = async () => ({ error: null })
      // A PURCHASE row: this suite is about a PAYING client's activation — the proof path
      // must stay out of the way, and a funded account keeps the normal AR8 branch.
      q.then = (r: (v: unknown) => void) => r({
        data: table === 'credit_transactions' ? [{ type: 'purchase', reference: 'cs_live_act' }] : [],
        count: 0, error: null,
      })
      return q
    }
    return {
      db: {
        from: (t: string) => makeQuery(t),
        rpc: async (fn: string) => {
          rec.rpcs.push(fn)
          if (fn === 'try_spend_sourcing') return { data: 5, error: null }
          return { data: null, error: null }
        },
        auth: { admin: {
          listUsers: async () => ({ data: { users: [] }, error: null }),
          getUserById: async (id: string) => {
            rec.userIds.push(id)
            return { data: { user: { email: '' } }, error: null }
          },
        } },
      },
    }
  })
  vi.doMock('./start-work', () => ({
    ensureCampaignForIcp: async () => (opts.ensure === 'refused'
      ? { refused: { blockingCampaignId: 'camp-A', blockingName: 'First push' } }
      : { id: 'camp-1' }),
    startWorkForClient: async () => ({ started: false, sourced: 0, surfaced: 0, recommended: 0 }),
  }))
  vi.doMock('../routes/admin', () => ({ adminKeyValid: (k: unknown) => k === 'right-key' }))
  vi.doMock('./apollo', () => ({
    searchPeopleWithFallback: async () => ({
      contacts: Array.from({ length: 5 }, (_, i) => ({
        id: `pdl_${i}`, first_name: 'A', last_name: 'B', email: null, email_status: null,
        linkedin_url: null, title: null, seniority: null, country: null,
        organization_name: null, organization: null,
      })), relaxed: false }),
    ApolloCreditsExhaustedError: class extends Error {},
    ApolloRateLimitError: class extends Error {},
  }))
  vi.doMock('./provider-boundary', async () => {
    const real = await vi.importActual<typeof import('./provider-boundary')>('./provider-boundary')
    return { ...real, audienceForClient: async () => 'client', audienceForUser: async () => 'client' }
  })

  const mod = await import('../routes/icps')
  const layer = (mod.icpRouter as unknown as { stack: Array<Record<string, any>> }).stack
    .find(l => l.route?.path === '/:id/activate')
  const handler = layer!.route.stack[layer!.route.stack.length - 1].handle
  const res = {
    statusCode: 200, body: null as unknown,
    status(c: number) { this.statusCode = c; return this },
    json(b: unknown) { this.body = b; return this },
  }
  await handler({ params: { id: 'icp-1' }, body: { client_id: 'c1' },
    headers: { 'x-admin-key': 'right-key' }, userId: 'operator-user' }, res)
  return res
}

describe('activation runs as the CLIENT, once, behind the campaign invariant', () => {
  let rec: Rec & { userIds: string[]; rpcs: string[] }
  beforeEach(() => {
    rec = { icpUpdates: [], sourcingStarted: false, userIdSeen: null, userIds: [], rpcs: [] }
    process.env.ANTHROPIC_API_KEY = 'test-key'
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'
  })
  afterEach(() => {
    vi.doUnmock('./start-work'); vi.doUnmock('../routes/admin')
    vi.doUnmock('./apollo'); vi.doUnmock('./provider-boundary')
    vi.resetModules()
    process.env.ANTHROPIC_API_KEY = prev.anthropic
    process.env.SUPABASE_URL = prev.url
    process.env.SUPABASE_ANON_KEY = prev.anon
  })

  it('THE FIRST-LEADS EMAIL GOES TO THE CLIENT OWNER, NOT THE OPERATOR WHO PRESSED GO', async () => {
    const res = await activateRich({ icpLastRunAt: null, firstIcpRunAt: null }, rec)
    expect((res.body as { sourcing: boolean }).sourcing).toBe(true)
    // The run is fire-and-forget; wait for it to reach the email lookup.
    await vi.waitFor(() => expect(rec.userIds.length).toBeGreaterThan(0), { timeout: 2000 })
    expect(rec.userIds).toContain('client-owner-user')
    expect(rec.userIds).not.toContain('operator-user')
  })

  it('RE-ACTIVATING AN ALREADY-RUN ICP DOES NOT START A SECOND FIRST RUN', async () => {
    const res = await activateRich({ icpLastRunAt: '2026-08-20T00:00:00Z', firstIcpRunAt: '2026-08-20T00:00:00Z' }, rec)
    expect(res.statusCode).toBe(200)
    expect((res.body as { sourcing: boolean }).sourcing).toBe(false)
    // And nothing sourced: no grant was asked for, no email lookup happened.
    await new Promise(r => setTimeout(r, 50))
    expect(rec.rpcs).not.toContain('try_spend_sourcing')
    expect(rec.userIds).toHaveLength(0)
  })

  it('A SECOND ACTIVE CAMPAIGN REFUSES THE WHOLE ACTIVATION — 409, nothing flipped', async () => {
    const res = await activateRich({ icpLastRunAt: null, firstIcpRunAt: null, ensure: 'refused' }, rec)
    expect(res.statusCode).toBe(409)
    expect(String((res.body as { error: string }).error)).toMatch(/campaign/i)
    // The ICP flip never happened: a refused activation leaves the client exactly as found.
    expect(rec.icpUpdates).toHaveLength(0)
    expect(rec.userIds).toHaveLength(0)
  })
})
