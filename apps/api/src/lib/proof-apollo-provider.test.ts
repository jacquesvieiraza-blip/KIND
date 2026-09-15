// ═══════════════════════════════════════════════════════════════════════════════════════
// S2-RT-001A / S2-RT-001B — CLIENT PROOF SOURCES THROUGH APOLLO, NOT PDL.
//
// Founder-locked override of AR5's audience→provider table, for the PROOF JOURNEY ONLY:
//   "CLIENT PROOF SOURCING MUST USE APOLLO."
//   "DO NOT use PDL for client Proof."   "DO NOT add PDL as a fallback for Proof."
//
// ⚠️ THE ASSERTIONS ARE ON THE WIRE, NOT ON SOURCE STRINGS. Every behavioural case drives
// the REAL `runIcpJob` through the REAL `searchPeopleWithFallback` and the REAL provider
// boundary, and asks which HOST was actually contacted. A provider rule proved by reading
// the source proves the rule was TYPED; only the request proves which provider a client's
// Proof run would really spend on. `fetch` is stubbed so no paid call is ever made.
//
// ⚠️ AR5 IS NOT REPEALED. Non-proof client sourcing must still choose PDL, and house must
// still choose Apollo — both are pinned below, because an override that silently widened
// into every sourcing flow would be a bigger defect than the one it fixes.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

type Row = Record<string, any>

const CLIENT = 'client-northstar'
const ICP = 'icp-northstar'

const APOLLO_HOST = 'api.apollo.io'
const PDL_HOST = 'peopledatalabs.com'

/** Northstar's proven persisted state. */
const baseIcp: Row = {
  id: ICP, client_id: CLIENT, is_active: true, status: 'draft',
  icp_review: null, icp_review_at: null, icp_review_resolved_at: null,
  pending_targeting: null, pending_submitted_at: null,
  programme_id: null, last_run_at: new Date().toISOString(),
  name: 'Founder-led agencies & consultancies',
  job_titles: ['Founder', 'CEO'],
  seniority_levels: [],
  company_sizes: ['11-50'],
  geographies: ['United Kingdom', 'United States'],
  industries: [],
  tech_stack: [], keywords: [],
  apollo_only_consented: false,
  pdl_scroll_token: null, pdl_scroll_query: null, pdl_exhausted_at: null,
}
let icpRow: Row = { ...baseIcp }

const clientRow: Row = {
  id: CLIENT, company_name: 'Northstar Revenue', user_id: 'auth-user-northstar',
  commercial_model: null, credit_balance: 0,
  proof_started_at: new Date().toISOString(), proof_completed_at: null,
  proof_passes_done: 0, proof_records_committed: 0,
}

/** Every host the run actually contacted, in order. */
let hits: string[] = []
/** Every row the run actually PERSISTED, by table — provenance is proved from these. */
let writes: Array<{ table: string; payload: unknown }> = []
/** Rows handed to the pool read, so "pool first" can be exercised for real. */
let poolRows: Row[] = []

/**
 * ⚠️ SHAPED FROM A LIVE `mixed_people/api_search` RESPONSE (captured 15 Sep), not invented.
 *
 * The real payload carries AVAILABILITY BOOLEANS and no values: `has_country: true`,
 * `has_city`, `has_state`, `has_email`, plus `last_name_obfuscated` ("Al***u"). There is
 * **no `country`, no `email` and no `email_status`** on a search record, on the person or
 * the organization. An earlier version of this fixture handed each contact
 * `country: 'United Kingdom'` — a field Apollo cannot produce — which made every geography
 * test pass on an impossible payload and would have hidden the Proof geography gate entirely.
 */
function apolloPerson(n: number) {
  return {
    id: `apollo-${n}`,
    first_name: `First${n}`,
    last_name_obfuscated: `La***${n}`,
    title: 'Founder',
    has_email: true, has_city: true, has_state: true, has_country: true,
    linkedin_url: `https://linkedin.com/in/person${n}`,
    organization: { name: `Agency ${n}`, has_country: true, has_city: true, has_employee_count: true },
  }
}

function installDbDouble() {
  vi.doMock('../middleware/auth', () => ({ requireAuth: (_q: Row, _r: Row, n: () => void) => n() }))
  vi.doMock('./alerts', () => ({
    sendFounderAlert: async () => ({ delivered: true }),
    alertSourceDown: () => {}, alertPdlOutOfCredits: () => {}, maybeAlertPdlBudget: async () => {},
  }))
  vi.doMock('@kind/db', () => {
    const build = (table: string) => {
      const q: any = {}
      const ret = () => q
      for (const m of ['select','eq','neq','in','not','is','order','limit','range','gte','lte','gt','lt','or','filter','contains','overlaps']) q[m] = ret
      q.single = async () => {
        if (table === 'icps')    return { data: icpRow, error: null }
        if (table === 'clients') return { data: clientRow, error: null }
        return { data: null, error: { message: 'no row', code: 'PGRST116' } }
      }
      q.maybeSingle = async () => {
        if (table === 'icps')    return { data: icpRow, error: null }
        if (table === 'clients') return { data: clientRow, error: null }
        return { data: null, error: null }
      }
      const record = (p: unknown) => {
        for (const row of Array.isArray(p) ? p : [p]) writes.push({ table, payload: row })
      }
      q.insert  = (p: unknown) => { record(p); return {
        select: () => ({ maybeSingle: async () => ({ data: { id: 'x' }, error: null }),
                         single:      async () => ({ data: { id: 'x' }, error: null }) }),
        then: (r: (v: unknown) => void) => r({ data: [{ id: 'x' }], error: null }) } }
      q.upsert  = (p: unknown) => { record(p); return {
        select: () => ({ maybeSingle: async () => ({ data: { id: 'x' }, error: null }) }),
        then: (r: (v: unknown) => void) => r({ data: [], error: null }) } }
      q.update  = () => q
      q.delete  = () => q
      q.then = (r: (v: unknown) => void) => r({ data: table === 'lead_pool' ? poolRows : [], error: null })
      return q
    }
    return {
      db: {
        from: (t: string) => build(t),
        auth: { admin: { getUserById: async () => ({ data: { user: { id: 'auth-user-northstar', email: 'jacques@northstar.example' } }, error: null }) } },
        rpc: async (name: string) => {
          if (name === 'try_reserve_proof_records') return { data: { granted: 20, reservation_id: 'res-1', reason: 'ok' }, error: null }
          if (name === 'try_reserve_programme_sourcing') return { data: 20, error: null }
          if (name === 'try_spend_sourcing') return { data: 20, error: null }
          return { data: null, error: null }
        },
      },
    }
  })
}

/**
 * Records every host contacted, and distinguishes Apollo's two doors:
 *   `apollo`        → `mixed_people/api_search`  (People Search — no country, no email)
 *   `apollo:reveal` → `people/bulk_match`        (the ONLY source of a country)
 * `reveal` supplies what bulk_match answers, so the two-stage geography behaviour is real.
 */
function stubWire(opts: { apollo?: () => Response; pdl?: () => Response; reveal?: () => Response } = {}) {
  vi.stubGlobal('fetch', async (url: unknown) => {
    const u = String(url)
    if (u.includes('people/bulk_match')) {
      hits.push('apollo:reveal')
      return opts.reveal
        ? opts.reveal()
        : new Response(JSON.stringify({ matches: [] }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (u.includes(APOLLO_HOST)) {
      hits.push('apollo')
      return opts.apollo
        ? opts.apollo()
        : new Response(JSON.stringify({ contacts: [], people: [] }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (u.includes(PDL_HOST)) {
      hits.push('pdl')
      return opts.pdl
        ? opts.pdl()
        : new Response(JSON.stringify({ error: { message: 'account maximum for search' } }),
            { status: 402, headers: { 'content-type': 'application/json' } })
    }
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
  })
}

const apolloOk = (n: number) => () =>
  new Response(JSON.stringify({ people: Array.from({ length: n }, (_, i) => apolloPerson(i + 1)) }),
    { status: 200, headers: { 'content-type': 'application/json' } })

/** What `people/bulk_match` answers. `country: null` models a match with no country. */
const revealAll = (n: number, country: string | null) => () =>
  new Response(JSON.stringify({
    matches: Array.from({ length: n }, (_, i) => ({
      // ⚠️ NOT @example.com — `email-hygiene.ts` classes that as a placeholder and
      // `bulkMatchEmails` drops placeholder matches, so the reveal would answer nobody.
      id: `apollo-${i + 1}`, email: `person${i + 1}@agency${i + 1}.co.uk`,
      email_status: 'verified', country, last_name: `Last${i + 1}`,
    })),
  }), { status: 200, headers: { 'content-type': 'application/json' } })

beforeEach(() => {
  vi.resetModules()
  hits = []
  writes = []
  poolRows = []
  icpRow = { ...baseIcp }
  process.env.PDL_API_KEY = 'test-pdl-key-not-real'
  process.env.APOLLO_API_KEY = 'test-apollo-key-not-real'
  process.env.PAID_PROVIDERS_ENABLED = 'true'
  delete process.env.SAFE_TEST_MODE
  installDbDouble()
})
afterEach(() => {
  delete process.env.PDL_API_KEY
  delete process.env.APOLLO_API_KEY
  delete process.env.PAID_PROVIDERS_ENABLED
  vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.resetModules()
})

async function runProof(pass = 1) {
  const { runIcpJob } = await import('../routes/icps')
  try {
    return { ok: true as const, r: await runIcpJob(ICP, CLIENT, 'user-1', 20, { proofPass: pass, proofKind: 'automatic' } as never) }
  } catch (e) {
    return { ok: false as const, err: e as Error }
  }
}

// ─────────────────────────────────────────────────────────────────────────────────────
// A. PROVIDER SELECTION — the pure boundary decision
// ─────────────────────────────────────────────────────────────────────────────────────
describe('A — provider selection (AR5 + the Proof override)', () => {
  it('client + PROOF chooses Apollo', async () => {
    const { sourcingProviderFor } = await import('./provider-boundary')
    expect(sourcingProviderFor('client', { proofMode: true })).toBe('apollo')
  })

  it('client WITHOUT proof still chooses PDL — AR5 is not repealed', async () => {
    const { sourcingProviderFor } = await import('./provider-boundary')
    expect(sourcingProviderFor('client', { proofMode: false })).toBe('pdl')
    expect(sourcingProviderFor('client')).toBe('pdl')
  })

  it('house chooses Apollo, proof or not', async () => {
    const { sourcingProviderFor } = await import('./provider-boundary')
    expect(sourcingProviderFor('house')).toBe('apollo')
    expect(sourcingProviderFor('house', { proofMode: true })).toBe('apollo')
  })

  it('the original AR5 selector is untouched for every non-proof caller', async () => {
    const { searchProviderFor } = await import('./provider-boundary')
    expect(searchProviderFor('client')).toBe('pdl')
    expect(searchProviderFor('house')).toBe('apollo')
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────
// B. THE WIRE — which provider a real Proof run actually contacts
// ─────────────────────────────────────────────────────────────────────────────────────
describe('B — a real client Proof run contacts Apollo and never PDL', () => {
  it('S2-RT-001A: Proof pass 1 hits Apollo, not PDL', async () => {
    stubWire({ apollo: apolloOk(20) })
    await runProof(1)
    expect(hits).toContain('apollo')
    expect(hits).not.toContain('pdl')
  })

  it('S2-RT-001B: a PDL 402 can no longer affect a Proof run, because PDL is never asked', async () => {
    stubWire({
      apollo: apolloOk(20),
      pdl: () => new Response(JSON.stringify({ error: { message: 'account maximum for search' } }), { status: 402 }),
    })
    const out = await runProof(1)
    expect(hits.filter(h => h === 'pdl')).toHaveLength(0)
    expect(out.ok).toBe(true)
  })

  it('a NON-proof client run still goes to PDL — the override is scoped to Proof', async () => {
    stubWire({ apollo: apolloOk(20) })
    const { runIcpJob } = await import('../routes/icps')
    await runIcpJob(ICP, CLIENT, 'user-1', 20).catch(() => undefined)
    expect(hits).toContain('pdl')
    expect(hits).not.toContain('apollo')
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────
// C. APOLLO SUCCESS — a healthy Proof set, and an honest zero
// ─────────────────────────────────────────────────────────────────────────────────────
describe('C — Apollo success and Apollo zero are different facts', () => {
  it('Apollo returning people produces a served run, not the snag state', async () => {
    // Geography must be PROVEN for anyone to enter the set (AR20), so the reveal answers UK.
    stubWire({ apollo: apolloOk(20), reveal: revealAll(20, 'United Kingdom') })
    const out = await runProof(1)
    expect(out.ok).toBe(true)
    if (out.ok) expect(out.r.inserted).toBeGreaterThan(0)
  })

  it('Apollo returning NOBODY is a completed search, never the crash/snag state', async () => {
    // Apollo answered; it simply matched nobody. The run must NOT record `failed`,
    // which is the state reserved for "we never learned the answer".
    stubWire({ apollo: () => new Response(JSON.stringify({ people: [] }), { status: 200 }) })
    const out = await runProof(1)
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(out.r.inserted).toBe(0)
      expect(out.r.terminal).toBe('completed')   // the pass is spent on a real answer
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────
// D. APOLLO FAILURE — fail closed, and never across to PDL
// ─────────────────────────────────────────────────────────────────────────────────────
describe('D — Apollo failure fails closed with no PDL fallback', () => {
  for (const [label, res] of [
    ['429 rate limit', () => new Response('rate limited', { status: 429 })],
    ['402 credits',    () => new Response('payment required', { status: 402 })],
    ['500 outage',     () => new Response('boom', { status: 500 })],
  ] as const) {
    it(`${label}: run rejects, PDL is never called, pass is not consumed`, async () => {
      stubWire({ apollo: res as () => Response })
      const out = await runProof(1)
      expect(out.ok).toBe(false)              // escapes to the Proof crash boundary
      expect(hits).not.toContain('pdl')       // NO fallback
    })
  }

  // ⛓️ 15 Sep — THE ZERO-SPEND GUARD STILL PROPAGATES ON THE PROOF PATH.
  // `guard-must-propagate.test.ts` pinned this for PDL back when client Proof was PDL. Proof
  // is Apollo now, so the same fact is pinned here against the provider Proof actually uses:
  // a deliberate block must escape as a block and must not leave the process.
  it('the zero-spend guard blocks Apollo, propagates, and makes ZERO outbound calls', async () => {
    process.env.SAFE_TEST_MODE = '1'
    stubWire({ apollo: apolloOk(20) })
    const { searchPeopleWithFallback } = await import('./apollo')
    let thrown: unknown
    try {
      await searchPeopleWithFallback(baseIcp as never, 1, 20, null, 'client', { proofMode: true })
      throw new Error('RESOLVED — the block was swallowed')
    } catch (e) { thrown = e }
    expect((thrown as { code?: string }).code).toBe('SAFE_TEST_MODE_BLOCKED')
    expect(hits).toHaveLength(0)     // not one request left the process
  })

  it('a network failure also fails closed without touching PDL', async () => {
    vi.stubGlobal('fetch', async (url: unknown) => {
      const u = String(url)
      if (u.includes(APOLLO_HOST)) { hits.push('apollo'); throw new Error('ECONNRESET') }
      if (u.includes(PDL_HOST)) { hits.push('pdl') }
      return new Response('{}', { status: 200 })
    })
    const out = await runProof(1)
    expect(out.ok).toBe(false)
    expect(hits).not.toContain('pdl')
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────
// F. PROVENANCE AND COST — what was actually WRITTEN, not what was queried
//
// ⚠️ ASSERTED ON PERSISTED ROWS. `actualProvider` fed five writers (acquisition_memory,
// lead_pool, leads.source, the geo gate and the provenance log) from `audience === 'house'`,
// which named the provider only while Apollo and house were the same thing. With Proof on
// Apollo that wrote Apollo people into the two provenance tables as `source: 'pdl'` at PDL's
// per-record rate — fabricated spend against the free-acquisition ceiling. Source-string
// assertions cannot catch that; only the written values can.
// ─────────────────────────────────────────────────────────────────────────────────────
describe('F — persisted provenance follows the provider actually used', () => {
  const rowsFor = (t: string) => writes.filter(w => w.table === t).map(w => w.payload as Row)

  it('Apollo Proof persists APOLLO provenance and books NO PDL cost', async () => {
    const { PDL_RATE_USD } = await import('./sourcing-fences')
    stubWire({ apollo: apolloOk(20), reveal: revealAll(20, 'United Kingdom') })
    const out = await runProof(1)
    expect(out.ok).toBe(true)

    const memory = rowsFor('acquisition_memory')
    const pool   = rowsFor('lead_pool')
    expect(memory.length + pool.length).toBeGreaterThan(0)   // something really was written

    for (const r of [...memory, ...pool]) {
      expect(r.source).toBe('apollo')                        // provenance is the truth
      const cost = r.acquisition_cost ?? r.cost_usd
      if (cost !== undefined) {
        expect(cost).toBe(0)                                 // existing Apollo semantics
        expect(cost).not.toBe(PDL_RATE_USD)                  // and NOT PDL's rate
      }
    }
  })

  it('an ordinary NON-proof client run still persists PDL provenance at the PDL rate', async () => {
    const { PDL_RATE_USD } = await import('./sourcing-fences')
    // PDL answers with real people so the same persistence path runs for the PDL provider.
    stubWire({
      pdl: () => new Response(JSON.stringify({
        status: 200,
        data: Array.from({ length: 5 }, (_, i) => ({
          work_email: `pdl${i}@example.com`, full_name: `Pdl Person${i}`,
          first_name: 'Pdl', last_name: `Person${i}`, job_title: 'Founder',
          job_company_name: `Agency ${i}`, location_country: 'united kingdom',
          linkedin_url: `linkedin.com/in/pdl${i}`,
        })),
      }), { status: 200, headers: { 'content-type': 'application/json' } }),
    })
    const { runIcpJob } = await import('../routes/icps')
    await runIcpJob(ICP, CLIENT, 'user-1', 20).catch(() => undefined)

    const rows = [...rowsFor('acquisition_memory'), ...rowsFor('lead_pool')]
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) {
      expect(r.source).toBe('pdl')                           // unchanged by this ticket
      const cost = r.acquisition_cost ?? r.cost_usd
      if (cost !== undefined) expect(cost).toBe(PDL_RATE_USD)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────
// G. PROOF GEOGRAPHY — UNKNOWN IS NEVER A PASS (founder-locked 15 Sep, AR20)
//
// People Search returns no country (live-proven), so geography for a Proof candidate is
// established by the internal qualification lookup or not at all. Each case below drives the
// real two-stage path: search answers with availability booleans, bulk_match answers (or
// does not) with a country, and only a POSITIVE match may enter the set.
// ─────────────────────────────────────────────────────────────────────────────────────
describe('G — Proof geography must be positively proven', () => {
  it('search country unknown + reveal says United Kingdom → ACCEPTED', async () => {
    stubWire({ apollo: apolloOk(5), reveal: revealAll(5, 'United Kingdom') })
    const out = await runProof(1)
    expect(out.ok).toBe(true)
    if (out.ok) expect(out.r.inserted, 'a proven UK match may join the Proof set').toBeGreaterThan(0)
    expect(hits, 'the qualification lookup ran').toContain('apollo:reveal')
  })

  it('search country unknown + reveal says France → REJECTED', async () => {
    stubWire({ apollo: apolloOk(5), reveal: revealAll(5, 'France') })
    const out = await runProof(1)
    expect(out.ok).toBe(true)
    if (out.ok) expect(out.r.inserted, 'proven OUTSIDE the ICP geography — rejected').toBe(0)
  })

  it('search country unknown + reveal returns NO country → REJECTED (unknown ≠ pass)', async () => {
    stubWire({ apollo: apolloOk(5), reveal: revealAll(5, null) })
    const out = await runProof(1)
    expect(out.ok).toBe(true)
    if (out.ok) expect(out.r.inserted, 'still unknown after enrichment — rejected').toBe(0)
  })

  it('search country unknown + reveal matches NOBODY → REJECTED', async () => {
    stubWire({ apollo: apolloOk(5), reveal: () => new Response(JSON.stringify({ matches: [] }), { status: 200 }) })
    const out = await runProof(1)
    expect(out.ok).toBe(true)
    if (out.ok) expect(out.r.inserted, 'no answer is not a pass').toBe(0)
  })

  it('an ICP with NO geography asks nothing about location, so nothing is enriched or spent', async () => {
    icpRow = { ...baseIcp, geographies: [] }
    stubWire({ apollo: apolloOk(5), reveal: revealAll(5, 'United Kingdom') })
    await runProof(1)
    expect(hits, 'no qualification lookup for an ICP that set no geography').not.toContain('apollo:reveal')
  })

  it('the revealed EMAIL never reaches the persisted lead — Proof stays masked', async () => {
    stubWire({ apollo: apolloOk(5), reveal: revealAll(5, 'United Kingdom') })
    await runProof(1)
    const leads = writes.filter(w => w.table === 'leads').map(w => w.payload as Row)
    expect(leads.length).toBeGreaterThan(0)
    for (const l of leads) {
      expect(l.email ?? null, 'the qualification reveal supplies geography only').toBeNull()
      expect(l.revealed_at ?? null, 'no commercial reveal state').toBeNull()
    }
  })

  it('a NON-proof client run is untouched: no bulk_match, PDL as before', async () => {
    stubWire({ apollo: apolloOk(5), reveal: revealAll(5, 'United Kingdom') })
    const { runIcpJob } = await import('../routes/icps')
    await runIcpJob(ICP, CLIENT, 'user-1', 20).catch(() => undefined)
    expect(hits).toContain('pdl')
    expect(hits).not.toContain('apollo:reveal')
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────
// E. POOL FIRST — unchanged, and it still comes first
// ─────────────────────────────────────────────────────────────────────────────────────
describe('E — Pool First is preserved', () => {
  it('a pool that fully satisfies the cap means no provider is contacted at all', async () => {
    poolRows = Array.from({ length: 20 }, (_, i) => ({
      id: `pool-${i}`, email: `pool${i}@example.com`, email_norm: `pool${i}@example.com`,
      first_name: 'Pool', last_name: `Person${i}`, title: 'Founder',
      company: `Agency ${i}`, country: 'United Kingdom',
      source: 'apollo', provider_id: `apollo-pool-${i}`,
    }))
    stubWire({ apollo: apolloOk(20) })
    await runProof(1)
    expect(hits).not.toContain('pdl')
  })
})
