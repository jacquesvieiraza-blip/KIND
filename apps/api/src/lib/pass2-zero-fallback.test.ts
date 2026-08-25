// ═══════════════════════════════════════════════════════════════════════════
// PASS-2 ZERO-RESULT FALLBACK, AND THE ZERO-vs-EXHAUSTED DISTINCTION.
//
// WHAT HAPPENED LIVE (Glean, 25 Aug 12:15 UTC). A prospect refined their batch to
// CEO/CTO, confirmed it, and pass 2 ran the exact confirmed targeting. PDL's FIRST PAGE
// returned 404 — nobody matched. `records_requested: 20 · pool_served: 0 · total_inserted: 0`,
// and `status: audience_exhausted`. Their last free pass was spent, no second set appeared,
// and the UI told them the audience was exhausted — about people who had NEVER been sourced.
//
// TWO DEFECTS, and they are different:
//
//   A. PDL answers 404 both for "your query matches nobody" and for "you have paged to the
//      end". `pdlSearchPage` knew which — it LOGGED the difference — and then returned one
//      `exhausted: true` for both, so everything downstream was blind.
//
//   B. Free proof had no widening fallback. One narrow query ended the journey and burned
//      the pass, with no second attempt at the same buyers.
//
// ⚠️ THESE TESTS ARE BEHAVIOURAL. `pdlSearchPage` is driven with a mocked `fetch` so the
// HTTP status is real input, and `runIcpJob` is driven through its real module with every
// search call RECORDED — a source assertion cannot tell one query from two, nor show what
// the second one asked for.
//
// Mocks only. No provider, no database, no network.
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// `pdl-search` imports `./alerts`, which builds a Supabase client at module load. Hoisted so
// Part 1 can import the real search module without a database.
vi.mock('./alerts', () => ({ sendFounderAlert: async () => undefined }))

const ICP = {
  job_titles:       ['CEO', 'CTO'],
  seniority_levels: ['C-Suite', 'VP / Director', 'Head of', 'Manager'],
  industries:       ['SaaS', 'Consulting'],
  company_sizes:    ['201–500'],
  geographies:      ['United Kingdom'],
}

// ── PART 1 · THE DISTINCTION, AT THE SOURCE ──────────────────────────────────────────────
describe('a PDL 404 is two different facts, and the scroll token is which', () => {
  const realFetch = globalThis.fetch
  beforeEach(() => { process.env.PDL_API_KEY = 'test-key' })
  afterEach(() => { globalThis.fetch = realFetch; vi.restoreAllMocks() })

  const reply = (status: number, body: unknown = {}) => {
    globalThis.fetch = vi.fn(async () => ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    })) as unknown as typeof fetch
  }

  it('1 · FIRST PAGE 404 is MATCHED-NOTHING, never audience-exhausted', async () => {
    reply(404)
    const { pdlSearchPage } = await import('./pdl-search')
    const page = await pdlSearchPage(ICP, 20, null, { proofMode: true })
    expect(page.matchedNothing, 'the query matched nobody').toBe(true)
    // ⚠️ THE WHOLE POINT. Nothing was ever sourced from this query, so claiming the audience
    // is finished is false — and it is what produced the untruthful live message.
    expect(page.exhausted, 'NOT exhausted — nothing was ever paged').toBe(false)
    expect(page.contacts).toEqual([])
    expect(page.error).toBeNull()
  })

  it('2 · a PAGED 404, with a real scroll token, is STILL audience-exhausted', async () => {
    reply(404)
    const { pdlSearchPage } = await import('./pdl-search')
    const page = await pdlSearchPage(ICP, 20, 'a-real-scroll-token', { proofMode: true })
    expect(page.exhausted, 'we walked it to the end — #366 unchanged').toBe(true)
    expect(page.matchedNothing, 'and this is not a zero-result query').toBe(false)
  })

  it('the two are mutually exclusive on every path a page can return', async () => {
    const { pdlSearchPage } = await import('./pdl-search')
    const both = (p: { exhausted: boolean; matchedNothing: boolean }) => p.exhausted && p.matchedNothing
    reply(404); expect(both(await pdlSearchPage(ICP, 20, null))).toBe(false)
    reply(404); expect(both(await pdlSearchPage(ICP, 20, 'tok'))).toBe(false)
    reply(200, { data: [], scroll_token: null }); expect(both(await pdlSearchPage(ICP, 20, null))).toBe(false)
    reply(500); expect(both(await pdlSearchPage(ICP, 20, null))).toBe(false)
  })

  it('a NON-404 zero-row 200 is neither — it is an ordinary empty page', async () => {
    reply(200, { data: [], scroll_token: 'next' })
    const { pdlSearchPage } = await import('./pdl-search')
    const page = await pdlSearchPage(ICP, 20, null)
    expect(page.exhausted).toBe(false)
    expect(page.matchedNothing).toBe(false)
    expect(page.scrollToken).toBe('next')
  })

  it('an ERROR is never mistaken for either — and no key is never either', async () => {
    reply(500)
    const { pdlSearchPage } = await import('./pdl-search')
    const errored = await pdlSearchPage(ICP, 20, null)
    expect(errored.error).toBeTruthy()
    expect(errored.exhausted).toBe(false)
    expect(errored.matchedNothing, 'a failed request tells us nothing about the audience').toBe(false)

    delete process.env.PDL_API_KEY
    vi.resetModules()
    const { pdlSearchPage: dormant } = await import('./pdl-search')
    const off = await dormant(ICP, 20, null)
    expect(off.exhausted).toBe(false)
    expect(off.matchedNothing, 'we never asked').toBe(false)
  })

  it('20 · the exhaustion SENTENCE is reachable only from true paging', () => {
    const cursor = readFileSync(join(__dirname, './pdl-cursor.ts'), 'utf8')
    const outcome = readFileSync(join(__dirname, './run-outcome.ts'), 'utf8')
    // The sentence that was false live. It is produced only for `audience_exhausted`…
    expect(cursor).toContain('every matching person our data source holds has already been sourced for you')
    expect(outcome).toContain("case 'audience_exhausted':\n      // #366")
    expect(outcome).toContain('return exhaustedMessage(alreadyHeld)')
    // …and `audience_exhausted` is now reachable only from `exhausted`, which now requires a
    // scroll token. A first-page zero lands on `no_match`, whose copy claims no prior sourcing.
    expect(outcome).toContain("return audienceExhausted ? 'audience_exhausted' : 'no_match'")
    expect(outcome).toContain('No leads matched this ICP.')
    expect(outcome).not.toMatch(/no_match[\s\S]{0,200}already been sourced/)
  })
})

// ── PART 2 · THE FALLBACK, THROUGH THE REAL runIcpJob ────────────────────────────────────
//
// Every `searchPeopleWithFallback` call is recorded with the targeting it was given, so the
// tests can assert HOW MANY queries ran and WHAT the second one asked for.
type Search = { icp: Record<string, unknown>; size: number; token: string | null; opts: unknown }
type PageCfg = { exhausted?: boolean; matchedNothing?: boolean; error?: string | null } | null

async function runJob(opts: {
  proof?: number
  /** contacts returned by the FIRST (exact) search */
  exact?: number
  /** contacts returned by the SECOND (widened) search, if one happens */
  wide?: number
  /** what the EXACT search's PdlPage reports */
  page?: PageCfg
  /**
   * ⚑ 25 Aug (GPT review hold) — what the WIDENED search's PdlPage reports, INDEPENDENTLY.
   *
   * The harness used to derive both pages from one config, which made it structurally
   * incapable of expressing the state the review found: an exact query that PROVED zero
   * followed by a widened query that FAILED. Any test written on the old harness would have
   * been asserting a case it could not actually create. `null` means the call returned no
   * page at all; omitted means "an ordinary page, proved zero if it carried no contacts".
   */
  widePage?: PageCfg
  funded?: boolean
}, rec: { searches: Search[]; rpcs: string[]; icpUpdates: Record<string, unknown>[] }) {
  vi.resetModules()

  const icpRow = {
    id: 'icp-1', client_id: 'c1', name: 'Glean', is_active: true, pending_targeting: null,
    ...ICP, pdl_scroll_token: null, pdl_scroll_query: null, pdl_exhausted_at: null,
  }

  vi.doMock('@kind/db', () => {
    const q = (table: string) => {
      const chain: Record<string, unknown> = {
        select() { return chain }, eq() { return chain }, in() { return chain },
        is() { return chain }, not() { return chain }, neq() { return chain },
        order() { return chain }, limit() { return chain }, gte() { return chain },
        async maybeSingle() {
          if (table === 'icps') return { data: icpRow, error: null }
          if (table === 'clients') return { data: { id: 'c1', leads_per_run: null, is_demo: false, company_name: 'Glean' }, error: null }
          return { data: null, error: null }
        },
        async single() {
          if (table === 'icps') return { data: icpRow, error: null }
          if (table === 'clients') return { data: { id: 'c1', leads_per_run: null, is_demo: false, company_name: 'Glean' }, error: null }
          return { data: null, error: null }
        },
        update(patch: Record<string, unknown>) {
          if (table === 'icps') rec.icpUpdates.push(patch)
          const done = { data: { ...icpRow, ...patch }, error: null }
          const c2: Record<string, unknown> = {
            eq() { return c2 }, is() { return c2 }, in() { return c2 }, select() { return c2 },
            async single() { return done }, async maybeSingle() { return done },
            then(r: (v: unknown) => unknown) { return r(done) },
          }
          return c2
        },
        insert(rows: unknown) {
          const list = Array.isArray(rows) ? rows : [rows]
          const data = list.map((_, i) => ({ id: `lead-${i}` }))
          const c2: Record<string, unknown> = {
            select() { return c2 }, async single() { return { data: data[0], error: null } },
            then(r: (v: unknown) => unknown) { return r({ data, error: null }) },
          }
          return c2
        },
        then(resolve: (v: unknown) => unknown) {
          if (table === 'credit_transactions') return resolve({ data: opts.funded ? [{ type: 'purchase', reference: 'pi_1' }] : [], count: 0, error: null })
          return resolve({ data: [], count: 0, error: null })
        },
      }
      return chain
    }
    return {
      db: {
        from: (t: string) => q(t),
        rpc: async (fn: string, _args: unknown) => {
          rec.rpcs.push(fn)
          if (fn === 'try_reserve_proof_records') return { data: { granted: 20, reservation_id: 'res-1', reason: 'GRANTED' }, error: null }
          if (fn === 'try_claim_proof_pass') return { data: 1, error: null }
          if (fn === 'try_spend_sourcing') return { data: 20, error: null }
          return { data: null, error: null }
        },
        auth: { admin: { getUserById: async () => ({ data: { user: { email: '' } } }) } },
      },
    }
  })

  vi.doMock('./alerts', () => ({ sendFounderAlert: async () => undefined }))
  // `routes/icps` imports `middleware/auth`, which builds a Supabase client at module load.
  // `runIcpJob` is called directly, so the middleware never executes.
  vi.doMock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _s: unknown, n: () => void) => n() }))
  vi.doMock('./lead-delivery', () => ({ enrichAndDeliverLeads: async () => 0 }))
  vi.doMock('./provider-boundary', async () => {
    const real = await vi.importActual<typeof import('./provider-boundary')>('./provider-boundary')
    return { ...real, audienceForClient: async () => 'client', audienceForUser: async () => 'client' }
  })

  const mk = (n: number) => Array.from({ length: n }, (_, i) => ({
    id: `pdl_${i}`, first_name: 'A', last_name: `B${i}`, email: null, email_status: null,
    linkedin_url: null, title: null, seniority: null, country: 'united kingdom',
    organization_name: null, organization: null,
  }))

  vi.doMock('./apollo', () => ({
    searchPeopleWithFallback: async (icp: Record<string, unknown>, _p: number, size: number, token: string | null, _a: unknown, o: unknown) => {
      rec.searches.push({ icp, size, token, opts: o })
      const first = rec.searches.length === 1
      const n = first ? (opts.exact ?? 0) : (opts.wide ?? 0)
      // ⚠️ EACH CALL GETS ITS OWN PAGE. The exact query's outcome and the widened query's
      // outcome are separate facts, and the correction under review turns on telling them
      // apart — so the harness must be able to make them differ.
      const cfg = first ? opts.page : opts.widePage
      const pg = cfg === null ? null : {
        contacts: mk(n), scrollToken: null,
        exhausted: cfg?.exhausted ?? false,
        // Default: an empty page from PDL is a PROVED zero. A test that wants an UNPROVEN
        // empty page says so explicitly, with `error` or a null page.
        matchedNothing: cfg?.matchedNothing ?? (n === 0),
        error: cfg?.error ?? null,
      }
      return { contacts: mk(n), relaxed: null, pdlPage: pg }
    },
    ApolloCreditsExhaustedError: class extends Error {},
    ApolloRateLimitError: class extends Error {},
  }))

  const { runIcpJob } = await import('../routes/icps')
  return runIcpJob('icp-1', 'c1', 'u1', 20, ...(opts.proof ? [{ proofPass: opts.proof }] as const : []))
}

const fresh = () => ({ searches: [] as Search[], rpcs: [] as string[], icpUpdates: [] as Record<string, unknown>[] })

describe('pass 2 makes exactly one widened retry when the exact targeting matches nobody', () => {
  it('3 · exact query zero → EXACTLY ONE fallback PDL call', async () => {
    const rec = fresh()
    await runJob({ proof: 2, exact: 0, wide: 5 }, rec)
    expect(rec.searches, 'exact + one widened retry, and no more').toHaveLength(2)
  })

  it('4/5 · the fallback KEEPS titles, industries and countries — and clears only two', async () => {
    const rec = fresh()
    await runJob({ proof: 2, exact: 0, wide: 5 }, rec)
    const wide = rec.searches[1].icp
    // PRESERVED EXACTLY — a client who said "CEO and CTO, SaaS and Consulting, UK" still
    // gets CEOs and CTOs at SaaS and Consulting firms in the UK.
    expect(wide.job_titles).toEqual(['CEO', 'CTO'])
    expect(wide.industries).toEqual(['SaaS', 'Consulting'])
    expect(wide.geographies).toEqual(['United Kingdom'])
    // CLEARED — the two that AND hardest against the title clause.
    expect(wide.seniority_levels).toEqual([])
    expect(wide.company_sizes).toEqual([])
    // …and the EXACT query really did run first, unwidened.
    expect(rec.searches[0].icp.seniority_levels).toEqual(ICP.seniority_levels)
    expect(rec.searches[0].icp.company_sizes).toEqual(ICP.company_sizes)
  })

  it('6 · the SAVED ICP is never mutated by the fallback', async () => {
    const rec = fresh()
    await runJob({ proof: 2, exact: 0, wide: 5 }, rec)
    // ⚠️ SEARCH-TIME ONLY. The confirmation panel showed five values and those five stay the
    // truth of record. No write may narrow, widen or park them.
    for (const patch of rec.icpUpdates) {
      expect(patch, 'no targeting field was written').not.toHaveProperty('seniority_levels')
      expect(patch).not.toHaveProperty('company_sizes')
      expect(patch).not.toHaveProperty('job_titles')
      expect(patch).not.toHaveProperty('industries')
      expect(patch).not.toHaveProperty('geographies')
      expect(patch, 'and no pending revision was created').not.toHaveProperty('pending_targeting')
    }
  })

  it('7 · an exact query that SUCCEEDS makes no fallback call at all', async () => {
    const rec = fresh()
    await runJob({ proof: 2, exact: 12, wide: 99 }, rec)
    expect(rec.searches, 'one query — the confirmed targeting worked').toHaveLength(1)
  })

  it('a THIN but non-empty exact result is not widened either', async () => {
    const rec = fresh()
    await runJob({ proof: 2, exact: 1, wide: 99 }, rec)
    expect(rec.searches).toHaveLength(1)
  })

  it('9 · fallback zero → NO third query, and no further attempt', async () => {
    const rec = fresh()
    await runJob({ proof: 2, exact: 0, wide: 0 }, rec)
    expect(rec.searches, 'two queries, then a human').toHaveLength(2)
  })

  it('10/11 · ONE reservation and NO second pass claim, on every fallback path', async () => {
    for (const wide of [5, 0]) {
      const rec = fresh()
      await runJob({ proof: 2, exact: 0, wide }, rec)
      // ⚠️ THE RETRY SPENDS NOTHING NEW. The exact query returned zero records, so every
      // record this pass already reserved is still unspent — the fallback reuses it.
      expect(rec.rpcs.filter(r => r === 'try_reserve_proof_records'), `wide=${wide}: one reservation`).toHaveLength(1)
      expect(rec.rpcs.filter(r => r === 'try_claim_proof_pass'), `wide=${wide}: runIcpJob never claims`).toHaveLength(0)
      expect(rec.rpcs.filter(r => r === 'try_spend_sourcing'), `wide=${wide}: proof never touches the paid fence`).toHaveLength(0)
    }
  })

  it('the fallback asks for the SAME already-authorised size, and starts from page 1', async () => {
    const rec = fresh()
    await runJob({ proof: 2, exact: 0, wide: 5 }, rec)
    expect(rec.searches[1].size, 'same grantedSize — never larger').toBe(rec.searches[0].size)
    expect(rec.searches[1].size, 'and never above PROOF_PASS_LEADS').toBeLessThanOrEqual(20)
    expect(rec.searches[1].token, 'a widened query is a different result set — no cursor').toBeNull()
    expect(rec.searches[1].opts, 'still proof mode: fit, not deliverability').toEqual({ proofMode: true })
  })

  it('12 · PASS 1 is never widened, however empty it comes back', async () => {
    const rec = fresh()
    await runJob({ proof: 1, exact: 0, wide: 9 }, rec)
    expect(rec.searches, 'pass 1 has a refinement ahead of it — that is the widening').toHaveLength(1)
  })

  it('13 · a PAID (non-proof) run is never widened', async () => {
    const rec = fresh()
    await runJob({ exact: 0, wide: 9, funded: true }, rec)
    expect(rec.searches).toHaveLength(1)
    expect(rec.rpcs.filter(r => r === 'try_reserve_proof_records'), 'and never reserves proof records').toHaveLength(0)
  })

  it('a genuinely EXHAUSTED pass 2 is not widened — there is nobody left to find', async () => {
    const rec = fresh()
    await runJob({ proof: 2, exact: 0, wide: 9, page: { exhausted: true, matchedNothing: false } }, rec)
    expect(rec.searches, 'widening a finished audience finds the same nobody').toHaveLength(1)
  })

  it('an ERRORED exact query is not widened — we do not know what it would have returned', async () => {
    const rec = fresh()
    await runJob({ proof: 2, exact: 0, wide: 9, page: { matchedNothing: false, error: 'boom' } }, rec)
    expect(rec.searches).toHaveLength(1)
  })

  it('8 · the fallback keeps the SAME ICP and cannot store a cursor from a different query', async () => {
    const rec = fresh()
    await runJob({ proof: 2, exact: 0, wide: 5 }, rec)
    // Leads hang off `icp_id`; a second ICP would orphan pass 1's batch.
    expect(rec.searches[1].icp.id ?? 'icp-1').toBe('icp-1')
    // ⚠️ THE CURSOR BELONGS TO THE EXACT QUERY. Storing the widened query's token under the
    // saved ICP's fingerprint is the stale-cursor trap `pdl-cursor.ts` exists to prevent.
    const cursorWrites = rec.icpUpdates.filter(p => 'pdl_scroll_token' in p)
    for (const w of cursorWrites) {
      expect(w.pdl_scroll_token, 'the exact query matched nothing, so there is no token').toBeNull()
      expect(w.pdl_exhausted_at, 'and it must NOT be marked exhausted').toBeNull()
    }
  })
})


// ── PART 2b · A ZERO IS NOT A ZERO UNTIL PDL PROVED IT ───────────────────────────────────
//
// ⚑ 25 Aug (GPT review hold). The first cut said "That refined targeting didn't return a
// second set" for BOTH a widened query PDL answered with "nobody matches" AND a widened
// query that never produced a trustworthy answer. The second is a claim about the client's
// buyers that we never learned — the same class of untruth as the exhaustion sentence this
// build exists to remove.
const SUCCESS = 'We widened the search a little to find this set — same roles, industries and countries you confirmed.'
const PROVED_ZERO = 'That refined targeting didn’t return a second set. K.I.N.D will review it with you.'
const UNPROVEN = 'K.I.N.D couldn’t confirm a second set from that search. K.I.N.D will review it with you.'

describe('the widened result tells the truth about what we actually learned', () => {
  it('WIDENED PROVED ZERO → the zero-result human stop', async () => {
    const rec = fresh()
    const out = await runJob({ proof: 2, exact: 0, wide: 0, widePage: { matchedNothing: true } }, rec)
    expect(out.relaxed).toBe(PROVED_ZERO)
    expect(rec.searches).toHaveLength(2)
  })

  it('WIDENED ERRORED → the safe human-check sentence, NOT the zero-result one', async () => {
    const rec = fresh()
    const out = await runJob({ proof: 2, exact: 0, wide: 0, widePage: { matchedNothing: false, error: 'boom' } }, rec)
    expect(out.relaxed).toBe(UNPROVEN)
    // ⚠️ THE WHOLE POINT OF THE CORRECTION. A failed request must never be reported as a
    // fact about who exists in the client's market.
    expect(out.relaxed, 'never the proved-zero claim').not.toBe(PROVED_ZERO)
    expect(rec.searches, 'still exactly two — a failure is not a licence to search again').toHaveLength(2)
  })

  it('WIDENED RETURNED NO PAGE AT ALL → the safe human-check sentence', async () => {
    const rec = fresh()
    const out = await runJob({ proof: 2, exact: 0, wide: 0, widePage: null }, rec)
    expect(out.relaxed).toBe(UNPROVEN)
    expect(out.relaxed).not.toBe(PROVED_ZERO)
    expect(rec.searches).toHaveLength(2)
  })

  it('an empty widened page that proves nothing either way is also UNPROVEN', async () => {
    const rec = fresh()
    const out = await runJob({ proof: 2, exact: 0, wide: 0, widePage: { matchedNothing: false } }, rec)
    expect(out.relaxed, 'zero contacts is not evidence — `matchedNothing` is').toBe(UNPROVEN)
    expect(rec.searches).toHaveLength(2)
  })

  it('WIDENED FOUND PEOPLE → the success copy, unchanged', async () => {
    const rec = fresh()
    const out = await runJob({ proof: 2, exact: 0, wide: 6 }, rec)
    expect(out.relaxed).toBe(SUCCESS)
    expect(rec.searches).toHaveLength(2)
  })

  it('NO widened outcome whatsoever makes a third search, or spends anything twice', async () => {
    for (const widePage of [
      { matchedNothing: true } as PageCfg,
      { matchedNothing: false, error: 'boom' } as PageCfg,
      null as PageCfg,
      { matchedNothing: false } as PageCfg,
      { exhausted: true, matchedNothing: false } as PageCfg,
    ]) {
      const rec = fresh()
      await runJob({ proof: 2, exact: 0, wide: 0, widePage }, rec)
      expect(rec.searches, `widePage=${JSON.stringify(widePage)}: exact + one widened, never a third`).toHaveLength(2)
      expect(rec.rpcs.filter(r => r === 'try_reserve_proof_records'), 'one reservation').toHaveLength(1)
      expect(rec.rpcs.filter(r => r === 'try_claim_proof_pass'), 'no pass claim').toHaveLength(0)
    }
  })

  it('the UNPROVEN sentence claims nothing it did not learn', () => {
    // Same discipline as the proved-zero copy: no exhaustion, no prior sourcing, no retry,
    // no timing — and, additionally, no claim that the targeting matched nobody.
    expect(UNPROVEN).not.toMatch(/already been sourced|end of this audience|exhaust/i)
    expect(UNPROVEN).not.toMatch(/matched nobody|no one matches|didn’t return|did not return/i)
    expect(UNPROVEN).not.toMatch(/try again|retry/i)
    expect(UNPROVEN).not.toMatch(/minutes|shortly|notify|email you/i)
    expect(UNPROVEN, 'and it ends at a human').toContain('K.I.N.D will review it with you')
  })
})

// ── PART 3 · THE GATE, AND WHAT IT MAY NOT REACH ─────────────────────────────────────────
describe('the widened retry changes nothing else', () => {
  const icps = () => readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')
  const pdl  = () => readFileSync(join(__dirname, './pdl-search.ts'), 'utf8')
  /** Absence is asserted on CODE — the convention this repo uses everywhere. */
  const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')

  it('the gate names every condition, and `matchedNothing` is one of them', () => {
    const src = icps()
    const gateAt = src.indexOf('const canWiden =')
    expect(gateAt, 'the gate exists').toBeGreaterThan(-1)
    // ⚠️ SCOPED TO THE GATE, NOT THE FILE. `proofMode &&` also appears at the proof surfacing
    // block and `contacts.length === 0` inside an unrelated comment, so a file-wide
    // `toContain` stayed green while a mutation deleted the condition from the gate itself.
    // Mutation caught it; the fix is to look where the condition actually has to be.
    const gate = src.slice(gateAt, src.indexOf('if (canWiden) {', gateAt))
    for (const cond of [
      'proofMode &&',
      'opts?.proofPass === 2 &&',
      "audience === 'client' &&",
      'cursor.token === null &&',
      'pdlPage?.matchedNothing === true &&',
      'contacts.length === 0',
    ]) expect(gate, `gate condition: ${cond}`).toContain(cond)
    // ⚠️ NOT gated on `exhausted` — that would widen a finished audience, and it is the
    // condition the old collapsed boolean would have offered.
    expect(src).not.toMatch(/canWiden[\s\S]{0,300}pdlPage\?\.exhausted/)
    // ⚠️ SEVERAL OF THOSE CONDITIONS ARE DEFENCE IN DEPTH, AND THAT IS WHY THEY ARE PINNED
    // HERE RATHER THAN ONLY BEHAVIOURALLY. `proofMode` is implied by `proofPass === 2`,
    // `cursor.token === null` is implied by `matchedNothing`, and `contacts.length === 0` is
    // implied by it too — so deleting any one of them changes no observable behaviour today,
    // and mutation testing correctly reported the tests still green. They stay because each
    // states a different fact, and the day one implication stops holding a silent widening
    // is exactly the failure this whole build exists to prevent. This assertion is what
    // stops them being quietly deleted as redundant.
    //
    // The widened call itself, spelled exactly: same size, page 1, NO cursor, proof mode.
    expect(src).toContain('const wide = await searchPeopleWithFallback(widened, 1, grantedSize, null, audience, { proofMode })')
  })

  it('14/15/16 · no Apollo, no Hunter, no reveal, no send, no charge came with it', () => {
    const src = icps()
    const from = src.indexOf('const canWiden =')
    const to   = src.indexOf('// (Fable F1) RECONCILE', from)
    expect(from, 'the fallback block exists').toBeGreaterThan(-1)
    expect(to, 'and its end').toBeGreaterThan(from)
    const block = strip(src.slice(from, to))
    expect(block).not.toMatch(/apollo|hunter|smartlead|stripe|reveal|bulkMatch|enrichAndDeliver/i)
    // #1449 — free proof still never enters paid delivery.
    expect(src).toContain('if (!proofMode && insertedIds.length > 0) {')
    // The provider decision is untouched: client → PDL, house → Apollo.
    const boundary = readFileSync(join(__dirname, './provider-boundary.ts'), 'utf8')
    expect(boundary).toContain("export type Audience = 'house' | 'client'")
  })

  it('17/18/19 · #1447, #1448 and #1449 all still standing', () => {
    const p = pdl()
    expect(p).toContain("'Head of':                ['manager', 'director', 'vp'],")
    expect(p).toContain("'1,000+': ['1001-5000', '5001-10000', '10001+'],")
    expect(p).toContain('canonicalLaunchCountry(g)')
    expect(p).toContain("if (opts?.proofMode !== true) must.push({ exists: { field: 'work_email' } })")
    expect(icps()).toContain('if (!proofMode && insertedIds.length > 0) {')
  })

  it('the widened outcome is discriminated on `matchedNothing`, not on emptiness', () => {
    const src = icps()
    const from = src.indexOf('const canWiden =')
    const to   = src.indexOf('// (Fable F1) RECONCILE', from)
    const block = src.slice(from, to)
    // ⚠️ THREE BRANCHES, AND THE MIDDLE ONE IS THE PROOF. Success · PROVED zero · unknown.
    // A two-branch `if/else` on `contacts.length` cannot express the difference, which is
    // exactly the collapse the review caught.
    expect(block, 'the proved-zero test, on the WIDENED page').toContain('} else if (wide.pdlPage?.matchedNothing === true) {')
    expect(block, 'and a final catch-all for everything unproven').toContain('        } else {\n')
    // The unknown branch may not be reachable only from an error — a null page lands there
    // too, so it must not be spelled as an error test.
    expect(block).not.toMatch(/else if \(wide\.pdlPage\?\.error/)
    // ⚠️ THE WIDENED PAGE, NOT THE EXACT ONE. Reading `pdlPage` here would discriminate on
    // the query that already failed, and every widened outcome would read as a proved zero.
    expect(block).not.toMatch(/else if \(pdlPage\?\.matchedNothing/)
    // ⚠️ AND THE SHIPPED SENTENCES ARE THESE THREE, IN THIS ORDER. Without this the copy
    // tests above only constrain constants declared in this file, and a mutation that made
    // the unknown branch say "That search matched nobody" stayed GREEN — the guard was
    // asserting its own copy of the words rather than the words that reach a client.
    // Mutation caught it; this line is what ties the two together.
    const copies = [...block.matchAll(/relaxed = '([^']*)'/g)].map(m => m[1])
    expect(copies, 'three outcomes, exactly these words').toEqual([SUCCESS, PROVED_ZERO, UNPROVEN])
  })

  it('the money fences are named nowhere inside the retry', () => {
    const src = icps()
    const from = src.indexOf('const canWiden =')
    const to   = src.indexOf('// (Fable F1) RECONCILE', from)
    const block = strip(src.slice(from, to))
    expect(block).not.toMatch(/db\.rpc\(/)
    expect(block).not.toMatch(/grantedSize\s*=/)
    expect(src).toContain('const PROOF_PASS_LEADS = 20')
    expect(src).toContain('PROOF_CLIENT_RECORD_CAP = 40')
  })

  it('the human-stop sentence is honest — no retry, no timing, no prior sourcing claimed', () => {
    const src = icps()
    expect(src).toContain('That refined targeting didn’t return a second set. K.I.N.D will review it with you.')
    const from = src.indexOf('const canWiden =')
    const to   = src.indexOf('// (Fable F1) RECONCILE', from)
    // ⚠️ ON CODE, NOT SOURCE. The block's own comments call this a "widened retry" — which is
    // what it is — so banning /retry/i across the source failed on the explanation of the
    // thing being explained. What must not invite a retry is the COPY.
    // ⚠️ THE CLIENT-FACING COPY, NOT THE WHOLE BLOCK. Two earlier cuts failed on the block's
    // own words: first its comments (which call this a "widened retry", because it is), then
    // its console.log — an OPERATOR line that must say "retry" plainly. What may never invite
    // a retry is what the client reads, so the assertion is scoped to the `relaxed =` copy.
    const copy = [...strip(src.slice(from, to)).matchAll(/relaxed = '([^']*)'/g)].map(m => m[1]).join(' | ')
    expect(copy, 'both sentences are present').toContain('K.I.N.D will review it with you')
    expect(copy, 'never the exhaustion claim').not.toMatch(/already been sourced|end of this audience/)
    expect(copy, 'no retry invited').not.toMatch(/try again|retry/i)
    expect(copy, 'no timing promised').not.toMatch(/minutes|shortly|notify|email you/i)
  })
})
