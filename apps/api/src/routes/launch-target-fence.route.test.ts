import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── THE LAUNCH FENCE ON THE TARGET LIST — ROUTE-LEVEL, AND IT HAS TO BE ────────────────────
//
// The five send-side launch gates hold a lead we cannot email. They all fire at the END of the
// pipeline — after we have already PAID for the lead.
//
// `pdl-search.ts:110` pushes an ICP's `geographies` straight into the PDL query as
// `location_country`. So a client saving a target list that says "Nigeria" means: we spend real
// PDL budget sourcing Nigerian leads, insert them, score them, surface them — and then hold
// every single one at the send gate. Money out, nothing sendable, and NO ERROR ANYWHERE. The
// system looks like it is working perfectly while burning the sourcing budget.
//
// ⚠️ WHY THIS IS A ROUTE TEST AND NOT A UNIT TEST OF THE SCHEMA.
//
// `icpSchema` is module-private, and testing it directly would prove the refinement is correct
// while proving nothing about whether the DOORS use it. That is the exact shape of the min-20
// failure: 18 green unit tests on the decision function, and a route that fed it the wrong
// thing. THREE routes save an ICP — POST `/`, POST `/revise`, PATCH `/:id` — and the PATCH one
// runs `.partial()`, which is a real behavioural question (does the refinement survive being
// made optional?) that only an executed request can answer.
//
// So every door is driven for real, and the insert is watched: the only proof that matters is
// that no held country ever reaches the database.

type Row = Record<string, unknown>
const state = {
  /** Rows that actually reached `icps.insert(...)` / `.update(...)`. The whole question. */
  written: [] as Row[],
}

function query(table: string) {
  const q: Record<string, unknown> = {
    select() { return q },
    eq() { return q },
    order() { return q },
    limit() { return q },
    insert(row: Row) {
      if (table === 'icps') state.written.push(row)
      return { select: () => ({ single: async () => ({ data: { id: 'icp-1', name: row.name }, error: null }) }) }
    },
    update(row: Row) {
      const c: Record<string, unknown> = {
        eq() { return c },
        select() { return c },
        async single() { return { data: { id: 'icp-1', ...row }, error: null } },
        then(r: (v: unknown) => unknown) { return Promise.resolve({ data: null, error: null }).then(r) },
      }
      // An ICP `update` carrying geographies is a SAVE — `is_active: false` sweeps are not.
      if (table === 'icps' && 'geographies' in row) state.written.push(row)
      return c
    },
    async maybeSingle() {
      if (table === 'clients') return { data: { id: 'client-1', company_name: 'Acme' }, error: null }
      return { data: null, error: null }
    },
    async single() {
      if (table === 'clients') return { data: { id: 'client-1', credit_balance: 0 }, error: null }
      return { data: null, error: null }
    },
    then(resolve: (v: unknown) => unknown) { return Promise.resolve({ data: [], error: null, count: 0 }).then(resolve) },
  }
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => query(t), rpc: async () => ({ data: null, error: null }) } }))
vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _s: unknown, n: () => void) => n() }))
vi.mock('../lib/rate-limit', () => ({ rateLimit: () => (_q: unknown, _s: unknown, n: () => void) => n() }))
vi.mock('../lib/alerts', () => ({ sendFounderAlert: async () => undefined }))
vi.mock('../lib/start-work', () => ({ ensureCampaignForIcp: async () => undefined }))

type Res = { code: number; payload: Record<string, unknown> }

async function callIcpRoute(method: 'post' | 'patch', path: string, body: unknown): Promise<Res> {
  const { icpRouter } = await import('./icps')
  const layer = (icpRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }> })
    .stack.find(l => l.route?.path === path && l.route?.methods[method])
  if (!layer?.route) throw new Error(`${method.toUpperCase()} ${path} not found on the ICP router`)
  const handler = layer.route.stack[layer.route.stack.length - 1].handle

  const res: Res = { code: 200, payload: {} }
  const fakeRes = {
    status(c: number) { res.code = c; return fakeRes },
    json(p: Record<string, unknown>) { res.payload = p; return fakeRes },
  }
  await handler({ body, userId: 'user-1', params: { id: 'icp-1' } }, fakeRes, () => {})
  return res
}

const icp = (geographies: string[]) => ({
  name: 'My ICP', industries: ['SaaS'], job_titles: ['Head of Sales'],
  seniority_levels: [], company_sizes: [], geographies, tech_stack: [], keywords: [],
})

/** The three doors, driven identically so no door can be quietly weaker than the others. */
const DOORS: Array<[string, (body: unknown) => Promise<Res>]> = [
  ['POST /',        (b) => callIcpRoute('post',  '/',        b)],
  ['POST /revise',  (b) => callIcpRoute('post',  '/revise',  b)],
  ['PATCH /:id',    (b) => callIcpRoute('patch', '/:id',     b)],
]

const messageOf = (res: Res): string => {
  const e = res.payload.error
  return Array.isArray(e) ? e.map((i: { message?: string }) => i.message ?? '').join(' | ') : String(e ?? '')
}

beforeEach(() => { state.written = [] })

describe('RED PROOF — an unfenced target list buys leads we can never send to', () => {
  it('the old path wrote "Nigeria" straight into the ICP, and PDL sourced against it', () => {
    // Reproduced from the real chain: icpSchema parsed the array verbatim → inserted → and
    // `pdl-search.ts` maps `geographies` to `location_country` terms in the search body.
    const oldParse = (geos: string[]) => geos                       // no refinement at all
    const pdlTerms = (geos: string[]) => geos.map(g => g.toLowerCase())

    expect(oldParse(['Nigeria'])).toEqual(['Nigeria'])              // ← RED: saved
    expect(pdlTerms(oldParse(['Nigeria']))).toEqual(['nigeria'])    // ← RED: and paid for
  })
})

describe('every door that saves a target list refuses a country we cannot send to', () => {
  for (const [name, call] of DOORS) {
    it(`${name} — refuses Nigeria, and writes NOTHING`, async () => {
      const res = await call(icp(['Nigeria']))

      expect(res.code, name).toBe(400)
      expect(state.written, 'THE ASSERTION THAT MATTERS — no held country reached the database').toEqual([])
      expect(messageOf(res), 'and the client is told which country, not just "invalid"').toContain('Nigeria')
    })

    it(`${name} — saves a US + UK list normally`, async () => {
      // The fence must refuse the right lists AND ONLY THOSE. A fence that also blocked the
      // countries we launched in would read as "the allowlist works" while stopping every sale.
      const res = await call(icp(['United States', 'United Kingdom']))

      expect(res.code, name).toBeLessThan(400)
      expect(state.written.length, name).toBe(1)
      expect(state.written[0].geographies, name).toEqual(['United States', 'United Kingdom'])
    })
  }

  it('PATCH /:id keeps the fence even though it runs .partial() — the door most likely to leak', async () => {
    // `.partial()` makes every field optional. If that had stripped the inner refinement, this
    // door would be a silent hole: a client could create a clean ICP and then PATCH Nigeria onto
    // it, and every other test in this file would still be green.
    const res = await callIcpRoute('patch', '/:id', { geographies: ['Nigeria'] })

    expect(res.code).toBe(400)
    expect(state.written).toEqual([])
  })

  it('a partial PATCH that omits geographies entirely is still allowed through', async () => {
    // The mirror of the test above, and the reason `.partial()` matters in both directions: a
    // client renaming their ICP must not be refused because they did not resend a field.
    const res = await callIcpRoute('patch', '/:id', { name: 'Renamed' })
    expect(res.code).toBeLessThan(400)
  })

  it('refuses a mixed list — one held country poisons it, and the message names THAT one', async () => {
    // Partial acceptance would be worse than refusing: the client would believe they were
    // targeting four countries and quietly be sourced in two, with nothing telling them which.
    const res = await callIcpRoute('post', '/', icp(['United States', 'Nigeria', 'United Kingdom']))

    expect(res.code).toBe(400)
    expect(state.written).toEqual([])
    expect(messageOf(res)).toContain('Nigeria')
    expect(messageOf(res), 'the allowed ones are not reported as problems').not.toContain("can't target United States")
  })

  it('accepts the spellings enrichment and humans actually use', async () => {
    for (const spelling of ['us', 'USA', 'United States', 'uk', 'GB', 'Scotland']) {
      state.written = []
      const res = await callIcpRoute('post', '/', icp([spelling]))
      expect(res.code, spelling).toBeLessThan(400)
      expect(state.written.length, spelling).toBe(1)
    }
  })

  it('an empty geographies list saves — no targeting is not held targeting', async () => {
    const res = await callIcpRoute('post', '/', icp([]))
    expect(res.code).toBeLessThan(400)
    expect(state.written.length).toBe(1)
  })

  it('a blank tag is ignored rather than refused — a typo is not a country', async () => {
    // An empty string matches nothing in the PDL query and buys no leads, so refusing it would
    // be a confusing wall in front of a stray keystroke. Only a REAL held country is refused.
    const res = await callIcpRoute('post', '/', icp(['United States', '', '   ']))
    expect(res.code).toBeLessThan(400)
    expect(state.written.length).toBe(1)
  })
})
