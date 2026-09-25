// ═══════════════════════════════════════════════════════════════════════════════════════
// BATCH 1 · A PROGRAMME-LESS CLIENT MAY NOT SOURCE ON MVP1 AUTHORITY
//
// ⛓️ 18 Sep — WRITTEN BECAUSE GPT VERIFICATION WAS RIGHT TO PUSH. My Batch 1 return said a
// programme-less client "receives the House-style remainder and has no lifetime ceiling", and
// filed the ceiling as a commercial decision. That was true as far as it went and it left out
// the only part that decides whether it matters: **WHO can reach that line.**
//
// The frozen contract says client programme sourcing uses programme authority reserved per
// batch. So the question is not "what should the unbounded grant be?" — choosing that would be
// inventing authority, which is not mine to do. The question is whether an MVP1 normal client
// can reach an unbounded grant at all.
//
// ── THE ANSWER, PROVEN BEHAVIOURALLY BELOW ─────────────────────────────────────────────
//
// No. `runIcpJob`'s authority gate refuses every programme-model client BEFORE the pool is
// served and before any provider is called, and it does so for all four non-legacy states:
//
//   · declared `programme` + an OPEN programme + unattached ICP → `icp_not_attached_to_programme`
//   · declared `programme` + NO open programme                  → `not_this_programme`
//   · undeclared + an OPEN programme (`compat_programme`)       → `icp_not_attached_to_programme`
//   · the model cannot be resolved (`unreadable`)               → `programme_unresolvable`
//
// The ONLY model left standing at the programme-less grant is LEGACY — the retired $299-pack
// book, which keeps exactly the behaviour it had.
//
// ── AND THAT IS NOW TRUE BY CONSTRUCTION, NOT BY CONSEQUENCE ───────────────────────────
//
// 🛑 The invariant above lived ~500 lines away from the grant, in a different block. That is
// the "gated at the entry point instead of at the act" shape that has already failed in this
// exact file: AR8, and `lookalike/generate` being the caller nobody remembered. A reorder, an
// early return, or one new sourcing caller and an unbounded grant reaches a paying client.
// So the grant itself now REQUIRES legacy authority, carried from the ONE model resolution
// that also decides the gate. This changes no reachable behaviour — it makes the fence local,
// and therefore verifiable.
//
// ⚠️ WHAT THIS FILE DOES NOT DO. It does not decide whether a legacy client may source on
// K.I.N.D's prepaid Apollo credits with no lifetime ceiling. That is a commercial decision and
// it is reported as a conflict, unresolved.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** ⚑ 25 Sep (P3c) — the refusal sentence, matched by its words. (Importing `routes/icps` at the
 *  top would load the real module before each test's mocks, which is why it is not imported.) */
const NO_PROGRAMME = /This client has no programme, so nothing may be sourced for them/

const PROGRAMME_ID = '11111111-1111-4111-8111-111111111111'

describe('Batch 1 · the authority gate refuses a programme-model client with an unattached ICP', () => {
  const prev = { ...process.env }
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  })
  afterEach(() => {
    vi.doUnmock('@kind/db'); vi.doUnmock('./provider-boundary')
    vi.doUnmock('./apollo'); vi.doUnmock('./programme-authority')
    vi.resetModules()
    process.env = { ...prev }
  })

  /**
   * Drive the REAL `runIcpJob` as an ordinary CLIENT with an ICP that has no programme.
   *
   * `commercialModel` is the stored column value; `openProgramme` is what `openProgrammeFor`
   * answers. Those two inputs are exactly what `clientCommercialModel` resolves from, and the
   * REAL resolver runs — nothing here mocks the decision under test.
   */
  async function runClient(opts: {
    commercialModel: string | null | undefined
    openProgramme: boolean
    clientReadFails?: boolean
    /** ⚑ 25 Sep (P3c) — who the run is for. Defaults to an ordinary client, as before. */
    audience?: 'client' | 'house'
    /** ⚑ 25 Sep (P3c) — a Free Proof pass number; absent = an ordinary run, as before. */
    proofPass?: number
  }) {
    const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = []
    const searchCalls: Array<{ size: number }> = []
    const inserts: string[] = []

    vi.resetModules()

    vi.doMock('@kind/db', () => {
      const clientRow: Record<string, unknown> = {
        leads_per_run: null, is_demo: false, user_id: 'u1',
      }
      // `undefined` means the key was never in the row — an absence of truth, which the
      // resolver treats as unreadable. Modelled by simply not setting it.
      if (opts.commercialModel !== undefined) clientRow.commercial_model = opts.commercialModel

      const singleFor = (table: string) => {
        if (table === 'icps') return {
          // 🛑 THE CONDITION UNDER TEST: `programme_id` is NULL — an unattached ICP.
          id: 'icp-1', client_id: 'c1', programme_id: null,
          geographies: [], job_titles: [], industries: [], seniority_levels: [], company_sizes: [],
        }
        if (table === 'clients') return opts.clientReadFails ? null : clientRow
        return null
      }
      const makeQuery = (table: string) => {
        const q: Record<string, unknown> = {}
        for (const m of ['select', 'eq', 'in', 'is', 'neq', 'not', 'order', 'or', 'gte', 'lte']) q[m] = () => q
        q.limit = () => ({
          then: (r: (v: unknown) => void) => r({ data: [], error: null }),
          maybeSingle: async () => ({ data: null, error: null }),
          single: async () => ({ data: null, error: null }),
        })
        q.single = async () => ({ data: singleFor(table), error: null })
        q.maybeSingle = async () => ({
          data: singleFor(table),
          error: opts.clientReadFails && table === 'clients' ? { message: 'connection reset' } : null,
        })
        q.update = () => ({ eq: async () => ({ error: null }), in: async () => ({ error: null }) })
        q.upsert = async () => ({ error: null })
        q.insert = () => ({
          select: () => ({ single: async () => { inserts.push(table); return { data: { id: 'lead-x' }, error: null } } }),
          then: (r: (v: unknown) => void) => { inserts.push(table); return r({ error: null }) },
        })
        q.then = (r: (v: unknown) => void) => r({ data: [], count: 0, error: null })
        return q
      }
      return {
        db: {
          from: (t: string) => makeQuery(t),
          rpc: async (fn: string, args: Record<string, unknown>) => {
            rpcCalls.push({ fn, args })
            if (fn === 'try_reserve_programme_sourcing') return { data: 0, error: null }
            return { data: null, error: null }
          },
          auth: { admin: { listUsers: async () => ({ data: { users: [] }, error: null }) } },
        },
      }
    })

    // An ordinary CLIENT, not the house — the house branch has its own rules and its own item.
    // ⛓️ 25 Sep (P3c) — the audience is now a parameter, defaulting to 'client' exactly as before,
    // so the House exemption of R168 ② can be driven through the same real `runIcpJob`.
    const aud = opts.audience ?? 'client'
    vi.doMock('./provider-boundary', async () => {
      const real = await vi.importActual<typeof import('./provider-boundary')>('./provider-boundary')
      return { ...real, audienceForClient: async () => aud, audienceForClientStrict: async () => aud, audienceForUser: async () => aud }
    })

    // Only `openProgrammeFor` is overridden. `authorityFor` — which the gate also uses — stays
    // REAL, so nothing about the authority decision itself is mocked away.
    vi.doMock('./programme-authority', async () => {
      const real = await vi.importActual<typeof import('./programme-authority')>('./programme-authority')
      return {
        ...real,
        openProgrammeFor: async () => (opts.openProgramme
          ? {
              id: PROGRAMME_ID, client_id: 'c1', status: 'SOURCING_AUTHORISED', paused_at: null,
              sourcing_ceiling: 2500, sourced_used: 0, sourced_reserved: 0,
              first_authorised_at: '2026-09-01T00:00:00Z', second_authorised_at: null,
              approved_at: null, went_live_at: null, completed_at: null, cancelled_at: null,
            }
          : null),
      }
    })

    vi.doMock('./apollo', () => ({
      searchPeopleWithFallback: async (_i: unknown, _p: number, size: number) => {
        searchCalls.push({ size })
        return { contacts: [], relaxed: false }
      },
      previewCount: async () => 0,
      bulkMatchEmails: async () => [],
      ApolloCreditsExhaustedError: class extends Error {},
      ApolloRateLimitError: class extends Error {},
    }))

    const { runIcpJob } = await import('../routes/icps')
    let threw: Error | null = null
    try {
      await runIcpJob('icp-1', 'c1', 'u1', 50, opts.proofPass ? { proofPass: opts.proofPass } : undefined)
    } catch (e) {
      threw = e instanceof Error ? e : new Error(String(e))
    }
    return { threw, rpcNames: rpcCalls.map(c => c.fn), searchCalls, inserts }
  }

  it('a DECLARED programme client with an open programme is refused — ICP not attached', async () => {
    const r = await runClient({ commercialModel: 'programme', openProgramme: true })
    expect(r.threw, 'an unattached ICP sourced for a programme client').toBeTruthy()
    expect(r.threw!.message).toMatch(/not attached/i)
    // 🛑 AND NOTHING WAS SOURCED. The refusal happens before the pool is served, which is the
    // half that used to leak: `servePoolLeads` runs ahead of the provider gate and inserts
    // real people regardless of what a later RPC would have said.
    expect(r.searchCalls, 'a provider was called for an unauthorised run').toHaveLength(0)
  })

  it('a DECLARED programme client with NO open programme is refused — no authority at all', async () => {
    const r = await runClient({ commercialModel: 'programme', openProgramme: false })
    expect(r.threw).toBeTruthy()
    // The retired per-lead model does not apply to them, so there is no fallback authority.
    expect(r.threw!.message).toMatch(/no active programme|no authority/i)
    expect(r.searchCalls).toHaveLength(0)
  })

  it('an UNDECLARED client with an open programme (compat_programme) is refused too', async () => {
    // ⚠️ THE ONE MOST LIKELY TO BE REACHED IN PRACTICE — nobody has to have set the column for
    // programme rules to apply; an open programme is enough.
    const r = await runClient({ commercialModel: null, openProgramme: true })
    expect(r.threw).toBeTruthy()
    expect(r.threw!.message).toMatch(/not attached/i)
    expect(r.searchCalls).toHaveLength(0)
  })

  it('an UNREADABLE model is refused — never treated as legacy', async () => {
    // A row that carried no `commercial_model` field at all. "We could not tell" must not
    // become "the per-lead model applies", which is the direction that spends.
    const r = await runClient({ commercialModel: undefined, openProgramme: false })
    expect(r.threw).toBeTruthy()
    expect(r.threw!.message).toMatch(/could not be resolved|unreadable|no commercial_model/i)
    expect(r.searchCalls).toHaveLength(0)
  })

  it('and NONE of the refusals reserves, spends or opens a batch', async () => {
    for (const opts of [
      { commercialModel: 'programme', openProgramme: true },
      { commercialModel: 'programme', openProgramme: false },
      { commercialModel: null, openProgramme: true },
      { commercialModel: undefined, openProgramme: false },
    ] as const) {
      const r = await runClient(opts)
      expect(r.rpcNames, `${String(opts.commercialModel)} reserved anyway`).not.toContain('try_reserve_programme_sourcing')
      expect(r.rpcNames).not.toContain('try_spend_sourcing')
      expect(r.rpcNames).not.toContain('claim_programme_batch')
    }
  })

  it('a LEGACY client is the ONLY model that reaches the programme-less path', async () => {
    // ⛓️ 25 Sep (R168 ② · P3c) — WAS: `expect(r.threw, 'the legacy path was broken to fence the
    // programme one').toBeNull()`. That pinned "today's behaviour" for the retired $299-pack
    // book. The founder has now ruled on exactly this door — *"A"*: a client sources only
    // through a programme; House and Free Proof carry on. A stored `legacy` client with no
    // programme is therefore REFUSED at the gate, before the pool and before any provider.
    // Stricter than before, never weaker: the old run already granted 0 provider records
    // (`legacyAuthority` is false for every model since R124); what it still did was serve the
    // shared pool, and that is what this now stops.
    const r = await runClient({ commercialModel: 'legacy', openProgramme: false })
    expect(r.threw, 'a client with no programme was sourced').toBeTruthy()
    expect(r.threw!.message).toMatch(NO_PROGRAMME)
    expect(r.searchCalls).toHaveLength(0)
    expect(r.inserts, 'people were put into a client pipeline with no programme').toEqual([])
  })

  // ── ⚑ 25 Sep (R168 ② · P3c) — NO SOURCING WITHOUT A PROGRAMME ─────────────────────────────
  it('🛑 P3c · an UNDECLARED client with NO programme is refused before the pool — the door that was open', async () => {
    const r = await runClient({ commercialModel: null, openProgramme: false })
    expect(r.threw, 'a client with no programme reached the pool').toBeTruthy()
    expect(r.threw!.message).toMatch(NO_PROGRAMME)
    expect(r.searchCalls).toHaveLength(0)
    expect(r.inserts).toEqual([])
    expect(r.rpcNames).not.toContain('try_reserve_programme_sourcing')
  })

  it('⛓️ P3c · House with no programme is NOT refused by this rule — House sourcing must not stop', async () => {
    const r = await runClient({ commercialModel: null, openProgramme: false, audience: 'house' })
    expect(r.threw?.message ?? '', 'House was stopped by the client-only rule').not.toMatch(NO_PROGRAMME)
  })

  it('⛓️ P3c · Free Proof never meets this rule — a proof pass is sourcing before any programme exists', async () => {
    const r = await runClient({ commercialModel: null, openProgramme: false, proofPass: 1 })
    expect(r.threw?.message ?? '', 'Free Proof was stopped by the programme rule').not.toMatch(NO_PROGRAMME)
  })
})

describe('Batch 1 · the fence is at the POINT OF GRANT, not only at the entry gate', () => {
  const icps = readFileSync(join(__dirname, '..', 'routes', 'icps.ts'), 'utf8')
  /** Whole-line comments removed — a guard a comment can satisfy is not a guard. */
  const code = icps.split('\n').filter(l => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n')

  it('the unbounded remainder is granted ONLY under legacy authority', () => {
    // 🛑 THE STRUCTURAL ASSERTION. `grantedSize = pdlRemainder` on the programme-less client
    // path must sit behind a positive legacy check. Behaviourally this branch is unreachable
    // for a non-legacy client (proven above), which is exactly why a source guard is the
    // right instrument: it protects the invariant from the NEXT caller, not from this one.
    expect(code).toContain('if (!legacyAuthority) {')
    const at = code.indexOf('if (!legacyAuthority) {')
    const branch = code.slice(at, at + 1400)
    // The refusal comes first and grants nothing…
    expect(branch).toMatch(/grantedSize = 0/)
    // …and the unbounded grant is in the ELSE, i.e. after the legacy check.
    expect(branch.indexOf('grantedSize = 0')).toBeLessThan(branch.indexOf('grantedSize = pdlRemainder'))
  })

  it('legacy authority is resolved ONCE, and carried — never re-read at the grant', () => {
    // A second `clientCommercialModel(clientId)` call at the grant could disagree with the one
    // that decided the gate, which is the defect shape this file keeps being bitten by.
    expect(code).toContain('legacyAuthority = isLegacyModel(model)')
    expect((code.match(/await clientCommercialModel\(clientId\)/g) ?? [])).toHaveLength(1)
  })

  it('it starts FALSE, so any path that skips the gate grants nothing', () => {
    // Fail-closed by construction rather than by remembering to set it — a proof run never
    // sets it at all, and a proof run must never acquire client authority.
    expect(code).toMatch(/let legacyAuthority = false/)
  })
})
