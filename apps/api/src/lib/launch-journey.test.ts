// ═══════════════════════════════════════════════════════════════════════════
// THE LAUNCH JOURNEY, END TO END, AT THE APPLICATION LEVEL.
//
// Rounds 1–4 each proved one piece in isolation and every piece passed. This file exists
// because independent review found a COLLISION BETWEEN pieces that no single-piece suite
// could see — the failure mode where every part is right and the assembly is wrong:
//
//   ① SAME-ICP REFINEMENT vs. THE CREATE PATH. The proof surface sends a client who says
//      "not these people" to Milla, and Milla's save POSTed /icps — which INSERTS. So the
//      approved journey ("one core ICP, refined once, two passes") would have produced a
//      SECOND ICP for pass 2: a different experiment, not a refinement. The prospect's
//      pass-1 leads and feedback would hang off an ICP nothing looked at again.
//
//   ② MILLA STORING INTENT vs. K.I.N.D OWNING GO. `persistMillaUnderstanding` recorded
//      `campaign_intent` by calling `ensureCampaignForIcp`, which since round 4 carries the
//      one-ACTIVE-campaign invariant and creates ACTIVE. So merely telling Milla what you
//      want would have made a campaign live — before payment, before an operator looked,
//      and it would then have BLOCKED the operator's own GO through the round-4 refusal.
//      Learning is not GO.
//
// The store below is a small in-memory Postgres stand-in shared across the whole journey,
// because that is the only way these collisions are visible: each step reads what the
// previous step actually wrote. No provider, no database, no network.
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

type Row = Record<string, any>
type Store = { icps: Row[]; figsy_campaigns: Row[]; clients: Row[]; leads: Row[]; figsy_knowledge: Row[]; credit_transactions: Row[]
  /** Make the icps write fail, so a partly-applied revision is reproducible. */
  failIcpUpdate?: boolean }

function makeStore(funded = false): Store {
  return {
    icps: [],
    figsy_campaigns: [],
    clients: [{ id: 'c1', user_id: 'u1', credit_balance: 0, first_icp_run_at: null, leads_per_run: null, is_demo: false, company_name: 'Acme' }],
    leads: [],
    figsy_knowledge: [],
    credit_transactions: funded ? [{ client_id: 'c1', type: 'purchase', reference: 'cs_live_j' }] : [],
  }
}

/** Installs the mock world. Every route imported afterwards shares `store`. */
function installDb(store: Store, rec: { rpcs: Array<{ fn: string; args: Row }> }) {
  vi.doMock('@kind/db', () => {
    let seq = 0
    const build = (table: string) => {
      const eqs: Array<[string, unknown]> = []
      let orderDesc = false
      const rows = () => (store as any)[table] as Row[] ?? []
      const matched = () => {
        let out = rows().filter(r => eqs.every(([c, v]) => r[c] === v))
        if (orderDesc) out = [...out].reverse()
        return out
      }
      const q: any = {}
      for (const m of ['select', 'in', 'is', 'not', 'or', 'gte', 'lte', 'limit']) q[m] = () => q
      q.eq = (c: string, v: unknown) => { eqs.push([c, v]); return q }
      q.neq = (c: string, v: unknown) => { const f = q; (q as any)._neq = [c, v]; return f }
      q.order = () => { orderDesc = true; return q }
      const finish = () => {
        let out = matched()
        const n = (q as any)._neq
        if (n) out = out.filter(r => r[n[0]] !== n[1])
        return out
      }
      q.maybeSingle = async () => ({ data: finish()[0] ?? null, error: null })
      q.single = async () => ({ data: finish()[0] ?? null, error: null })
      q.then = (resolve: (v: unknown) => void) => resolve({ data: finish(), count: finish().length, error: null })
      q.insert = (row: Row | Row[]) => {
        const list = Array.isArray(row) ? row : [row]
        const made = list.map(r => ({ id: r.id ?? `${table}-${++seq}`, ...r }))
        rows().push(...made)
        return {
          select: () => ({
            single: async () => ({ data: made[0], error: null }),
            maybeSingle: async () => ({ data: made[0], error: null }),
            then: (r: (v: unknown) => void) => r({ data: made, error: null }),
          }),
          then: (r: (v: unknown) => void) => r({ error: null }),
        }
      }
      q.update = (patch: Row) => {
        const chain: any = {}
        const ueqs: Array<[string, unknown]> = []
        let uneq: [string, unknown] | null = null
        const failed = () => table === 'icps' && store.failIcpUpdate === true
        const apply = () => {
          if (failed()) return []                       // the write never lands
          let targets = rows().filter(r => ueqs.every(([c, v]) => r[c] === v))
          if (uneq) targets = targets.filter(r => r[uneq![0]] !== uneq![1])
          targets.forEach(r => Object.assign(r, patch))
          return targets
        }
        for (const m of ['in', 'is']) chain[m] = () => chain
        chain.eq = (c: string, v: unknown) => { ueqs.push([c, v]); return chain }
        chain.neq = (c: string, v: unknown) => { uneq = [c, v]; return chain }
        chain.select = () => ({
          single: async () => (failed()
            ? { data: null, error: { message: 'icps write failed' } }
            : { data: apply()[0] ?? null, error: null }),
          maybeSingle: async () => (failed()
            ? { data: null, error: { message: 'icps write failed' } }
            : { data: apply()[0] ?? null, error: null }),
        })
        chain.then = (r: (v: unknown) => void) => {
          const bad = failed()
          apply()
          r({ error: bad ? { message: 'icps write failed' } : null })
        }
        return chain
      }
      q.upsert = async (row: Row) => {
        const i = rows().findIndex(r => r.client_id === row.client_id && r.kind === row.kind)
        if (i >= 0) rows()[i] = { ...rows()[i], ...row }; else rows().push({ id: `${table}-${++seq}`, ...row })
        return { error: null }
      }
      q.delete = () => ({ eq: () => ({ then: (r: (v: unknown) => void) => r({ error: null }) }) })
      return q
    }
    return {
      db: {
        from: (t: string) => build(t),
        rpc: async (fn: string, args: Row) => {
          rec.rpcs.push({ fn, args })
          if (fn === 'try_claim_proof_pass') {
            const c = store.clients[0]
            c.proof_passes_done = (c.proof_passes_done ?? 0) + 1
            return { data: c.proof_passes_done > 2 ? 0 : c.proof_passes_done, error: null }
          }
          if (fn === 'try_reserve_proof_records') return { data: { granted: 0, reservation_id: null, reason: 'MONTHLY_PROOF_BUDGET_REACHED' }, error: null }
          if (fn === 'try_spend_sourcing') return { data: 0, error: null }
          if (fn === 'apply_pending_revision') {
            // A faithful stand-in for the plpgsql body, INCLUDING its transaction: every
            // change is staged and committed only if the whole function would have
            // succeeded. `store.failIcpUpdate` is the simulated raise — and the point of
            // this mock is that the campaign write must NOT survive it.
            const icp = store.icps.find(r => r.id === args.p_icp_id && r.client_id === args.p_client_id)
            if (!icp) return { data: { ok: false, reason: 'ICP_NOT_FOUND', applied: false }, error: null }
            const heldT = icp.pending_targeting ?? null
            const heldI = (icp.pending_campaign_intent ?? '').trim() || null
            const camp = store.figsy_campaigns.find(c => c.id === args.p_campaign_id && c.client_id === args.p_client_id)
            if (heldI && !camp) return { data: null, error: { message: 'campaign for the revised brief not found' } }
            if (store.failIcpUpdate) return { data: null, error: { message: 'the icp could not be updated; nothing has been applied' } }
            // Past every raise — now everything commits together.
            if (heldI && camp) { camp.campaign_intent = String(heldI).slice(0, 2000); camp.intent_mapped_at = 'now' }
            store.icps.forEach(r => { if (r.client_id === args.p_client_id && r.id !== icp.id) r.is_active = false })
            const WHITELIST = ['name', 'industries', 'job_titles', 'seniority_levels',
              'company_sizes', 'geographies', 'tech_stack', 'keywords', 'apollo_only_consented']
            if (heldT) for (const k of WHITELIST) if (heldT[k] !== undefined) icp[k] = heldT[k]
            icp.is_active = true
            icp.pending_targeting = null; icp.pending_campaign_intent = null; icp.pending_submitted_at = null
            return { data: { ok: true, applied: !!(heldT || heldI), applied_intent: !!heldI, icp: { ...icp } }, error: null }
          }
          return { data: null, error: null }
        },
        auth: { admin: {
          listUsers: async () => ({ data: { users: [] }, error: null }),
          getUserById: async () => ({ data: { user: { email: '' } }, error: null }),
        } },
      },
    }
  })
}

async function handlerFor(path: string, method: 'post' | 'patch') {
  const mod = await import('../routes/icps')
  const layer = (mod.icpRouter as unknown as { stack: Array<Record<string, any>> }).stack
    .find(l => l.route?.path === path && l.route?.methods?.[method])
  expect(layer, `${method.toUpperCase()} ${path} not found`).toBeTruthy()
  return layer!.route.stack[layer!.route.stack.length - 1].handle
}

function makeRes() {
  return {
    statusCode: 200, body: null as any,
    status(c: number) { this.statusCode = c; return this },
    json(b: unknown) { this.body = b; return this },
  }
}

const ICP_BODY = {
  name: 'SA SaaS CTOs', industries: ['SaaS'], job_titles: ['CTO'],
  seniority_levels: [], company_sizes: [], geographies: [], tech_stack: [], keywords: [],
}
const BUSINESS = { product: 'Fleet software', pitch: 'Fewer trucks off the road', pain_points: 'Breakdowns', differentiators: '', tone: '', bad_fit: '' }

const prev = { anthropic: process.env.ANTHROPIC_API_KEY, url: process.env.SUPABASE_URL, anon: process.env.SUPABASE_ANON_KEY }

describe('the launch journey — one ICP, two proof passes, then K.I.N.D presses GO', () => {
  let store: Store
  let rec: { rpcs: Array<{ fn: string; args: Row }> }

  beforeEach(() => {
    store = makeStore()
    rec = { rpcs: [] }
    vi.resetModules()
    process.env.ANTHROPIC_API_KEY = 'test-key'
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'
    installDb(store, rec)
    vi.doMock('../routes/admin', () => ({ adminKeyValid: (k: unknown) => k === 'right-key' }))
    vi.doMock('./apollo', () => ({
      searchPeopleWithFallback: async () => ({ contacts: [], relaxed: false }),
      ApolloCreditsExhaustedError: class extends Error {}, ApolloRateLimitError: class extends Error {},
    }))
    vi.doMock('./alerts', () => ({ sendFounderAlert: async () => {} }))
    vi.doMock('./provider-boundary', async () => {
      const real = await vi.importActual<typeof import('./provider-boundary')>('./provider-boundary')
      return { ...real, audienceForClient: async () => 'client', audienceForUser: async () => 'client' }
    })
  })
  afterEach(() => {
    vi.doUnmock('../routes/admin'); vi.doUnmock('./apollo'); vi.doUnmock('./alerts'); vi.doUnmock('./provider-boundary')
    vi.resetModules()
    process.env.ANTHROPIC_API_KEY = prev.anthropic
    process.env.SUPABASE_URL = prev.url
    process.env.SUPABASE_ANON_KEY = prev.anon
  })

  /** ① onboarding — Milla's save. */
  const onboard = async (body: Row = {}) => {
    const h = await handlerFor('/', 'post')
    const res = makeRes()
    await h({ body: { ...ICP_BODY, business: BUSINESS, campaign_intent: 'Book demos with fleet managers', ...body }, userId: 'u1', headers: {} }, res)
    return res
  }
  /** ③ refinement — the same conversation, saved again. */
  const refine = async (body: Row = {}) => {
    const h = await handlerFor('/revise', 'post')
    const res = makeRes()
    await h({ body: { ...ICP_BODY, name: 'SA SaaS CTOs — smaller firms', company_sizes: ['11–50'], ...body }, userId: 'u1', headers: {} }, res)
    return res
  }
  const proof = async (icpId: string) => {
    const h = await handlerFor('/:id/proof', 'post')
    const res = makeRes()
    await h({ params: { id: icpId }, body: {}, headers: {}, userId: 'u1' }, res)
    return res
  }
  const go = async (icpId: string) => {
    const h = await handlerFor('/:id/activate', 'patch')
    const res = makeRes()
    await h({ params: { id: icpId }, body: { client_id: 'c1' }, headers: { 'x-admin-key': 'right-key' }, userId: 'operator-user' }, res)
    return res
  }

  it('① MILLA LEARNING IS NOT GO — one ICP, intent stored, and NOTHING live', async () => {
    const res = await onboard()
    expect(res.statusCode).toBe(201)
    expect(store.icps).toHaveLength(1)
    expect(store.icps[0].is_active).toBeFalsy()

    // The intent is recorded — that is the whole point of the onboarding conversation…
    const camp = store.figsy_campaigns[0]
    expect(camp, 'the campaign row that carries campaign_intent').toBeTruthy()
    expect(camp.campaign_intent).toBe('Book demos with fleet managers')
    // …and the business understanding reached FIGSY's store.
    expect(store.figsy_knowledge.find(k => k.kind === 'pitch')?.data.product).toBe('Fleet software')

    // ⚠️ THE DEFECT, ASSERTED. Telling Milla what you want must not make a campaign live:
    // it precedes payment and any operator judgement, and — since round 4 — a live campaign
    // would then REFUSE the operator's own GO.
    expect(camp.status, 'Milla stored intent and the campaign went live').not.toBe('active')
  })

  it('② proof pass 1 runs against that ICP, and still does not make it live', async () => {
    await onboard()
    const icpId = store.icps[0].id
    const res = await proof(icpId)
    expect(res.statusCode).toBe(200)
    expect((res.body as any).data.pass).toBe(1)
    expect(store.icps[0].is_active).toBeFalsy()
    expect(store.figsy_campaigns[0].status).not.toBe('active')
  })

  it('③ REFINEMENT UPDATES THE SAME CORE ICP — no second experiment', async () => {
    await onboard()
    const firstId = store.icps[0].id
    await proof(firstId)
    await refine()

    // THE DEFECT, ASSERTED. "One core ICP, refined once" — a second row would mean pass 2
    // ran against a different experiment, and pass 1's leads and feedback would hang off an
    // ICP nothing ever looked at again.
    expect(store.icps, 'refinement created a second ICP').toHaveLength(1)
    expect(store.icps[0].id).toBe(firstId)
    expect(store.icps[0].name).toBe('SA SaaS CTOs — smaller firms')   // …and it really changed
    expect(store.icps[0].is_active, 'refinement made an unpaid prospect\'s ICP live').toBeFalsy()
  })

  it('④ proof pass 2 uses the UPDATED same ICP — and there is no third', async () => {
    await onboard()
    const icpId = store.icps[0].id
    await proof(icpId)
    await refine()
    const p2 = await proof(icpId)
    expect(p2.statusCode).toBe(200)
    expect((p2.body as any).data.pass).toBe(2)
    expect(store.icps).toHaveLength(1)

    const p3 = await proof(icpId)
    expect(p3.statusCode).toBe(409)                       // a human takes over
    expect(String((p3.body as any).error)).toMatch(/two sets of leads/i)
  })

  it('⑤ K.I.N.D GO ACTIVATES THE EXISTING CAMPAIGN — it does not create a duplicate', async () => {
    await onboard()
    const icpId = store.icps[0].id
    const campId = store.figsy_campaigns[0].id
    await proof(icpId)
    await refine()

    const res = await go(icpId)
    expect(res.statusCode).toBe(200)
    expect(store.figsy_campaigns, 'GO created a duplicate campaign').toHaveLength(1)
    expect(store.figsy_campaigns[0].id).toBe(campId)      // the SAME row Milla scaffolded
    expect(store.figsy_campaigns[0].status).toBe('active')
    expect(store.figsy_campaigns[0].campaign_intent).toBe('Book demos with fleet managers')
    expect(store.icps[0].is_active).toBe(true)

    // ⚠️ AND GO DOES **NOT** RE-SOURCE THIS ICP — that is correct, not a gap. Its two proof
    // passes already ran it, and the pre-existing rule is "an already-run ICP is left alone,
    // no surprise re-spend". The paying client's real batch is driven by the MONEY path
    // (`stripe.ts` → `startWorkForClient` on payment), which owns the pack target and the
    // AR8 fence. Sourcing here as well would spend twice for one decision.
    expect((res.body as any).sourcing).toBe(false)
    expect(rec.rpcs.filter(r => r.fn === 'try_spend_sourcing')).toHaveLength(0)
  })

  it('⑤b GO on an ICP that never ran DOES start its first sourcing — exactly once', async () => {
    // The other half of the same rule, so "no re-spend" can never quietly become "no
    // sourcing ever": a client who is switched on without having taken a proof pass still
    // gets their first run, and a second GO does not repeat it.
    await onboard()
    const icpId = store.icps[0].id
    const first = await go(icpId)
    expect((first.body as any).sourcing).toBe(true)
    expect((first.body as any).applied_revision).toBe(false)   // nothing was waiting
    const again = await go(icpId)
    expect((again.body as any).sourcing).toBe(false)
    expect(store.figsy_campaigns).toHaveLength(1)
  })

  it('⑥ a GENUINELY competing live campaign still refuses GO, fail-closed', async () => {
    await onboard()
    const icpId = store.icps[0].id
    // Another ICP's campaign is genuinely live — the case the invariant exists for.
    store.figsy_campaigns.push({ id: 'camp-other', client_id: 'c1', icp_id: 'icp-other', status: 'active', name: 'First push' })

    const res = await go(icpId)
    expect(res.statusCode).toBe(409)
    expect(String((res.body as any).error)).toMatch(/one active campaign/i)
    expect(store.icps[0].is_active, 'a refused GO still flipped the ICP').toBeFalsy()
    expect(store.figsy_campaigns.find(c => c.id === 'camp-other')!.status).toBe('active')  // untouched
  })

  it('a LIVE client\'s revision is SAVED and WAITS — same ICP, nothing operational changes', async () => {
    // ⛓️ THIS TEST ASSERTED THE OPPOSITE UNTIL THE FOUNDER RULED (22 Aug). It read AR9's
    // 25-Jul half — "no gate on their own change" — as licence to apply a live client's
    // revision immediately, on the reasoning that they were changing what runs rather than
    // activating anything. The founder's ruling settles it the other way: a live client's
    // change must WAIT for K.I.N.D review. Rewritten rather than deleted, because the
    // reversal is the point and a quietly vanished assertion teaches nobody anything.
    await onboard()
    const icpId = store.icps[0].id
    await go(icpId)
    expect(store.icps[0].is_active).toBe(true)
    await refine()
    expect(store.icps).toHaveLength(1)
    expect(store.icps[0].id).toBe(icpId)                          // same core ICP
    expect(store.icps[0].name).toBe('SA SaaS CTOs')                // live targeting untouched
    expect(store.icps[0].pending_targeting?.name).toBe('SA SaaS CTOs — smaller firms')
    expect(store.icps[0].is_active).toBe(true)                    // still live, on the OLD targeting
  })

  it('THE PROOF MONEY RULES ARE UNTOUCHED BY ANY OF THIS', async () => {
    await onboard()
    const icpId = store.icps[0].id
    await proof(icpId)
    const names = rec.rpcs.map(r => r.fn)
    // Proof authority, never the paid fence — across the whole assembled journey.
    expect(names).toContain('try_claim_proof_pass')
    expect(names).not.toContain('add_sourcing_allowance')
    // And the reservation asks for the 20-lead pass, not a paid client's target.
    const reserve = rec.rpcs.find(r => r.fn === 'try_reserve_proof_records')
    if (reserve) expect(Number(reserve.args.p_requested)).toBeLessThanOrEqual(20)
  })
})

// ── A LIVE CLIENT'S REVISION WAITS FOR K.I.N.D (founder-ruled 22 Aug) ─────────
//
// The targeting columns on the icps row ARE the live operational targeting — `runIcpJob`
// reads that row and hands it straight to the pool serve and the PDL query. So a live
// client editing their targeting in Milla changed who we source for them on the very next
// run, with nobody at K.I.N.D looking. The founder's ruling: Milla may SAVE it, and it
// must WAIT for review.
//
// ⚠️ THIS PREDATES THE ROUND-5 CHANGE, and saying otherwise would be flattering. Before it,
// `/revise` deactivated every ICP and inserted a new `is_active: true` row carrying the new
// targeting — also immediate, and additionally a client activating their own ICP. Round 5
// changed the shape, not the immediacy.
//
// The distinction the row could not make is now two columns: `pending_targeting` holds the
// revision, `pending_submitted_at` says since when, and NOTHING reads either for sourcing,
// scoring or sending until GO applies them.
describe('a LIVE client revises — it is saved, and it waits', () => {
  let store: Store
  let rec: { rpcs: Array<{ fn: string; args: Row }> }

  beforeEach(() => {
    store = makeStore()
    rec = { rpcs: [] }
    vi.resetModules()
    process.env.ANTHROPIC_API_KEY = 'test-key'
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'
    installDb(store, rec)
    vi.doMock('../routes/admin', () => ({ adminKeyValid: (k: unknown) => k === 'right-key' }))
    vi.doMock('./apollo', () => ({
      searchPeopleWithFallback: async () => ({ contacts: [], relaxed: false }),
      ApolloCreditsExhaustedError: class extends Error {}, ApolloRateLimitError: class extends Error {},
    }))
    vi.doMock('./alerts', () => ({ sendFounderAlert: async () => {} }))
    vi.doMock('./provider-boundary', async () => {
      const real = await vi.importActual<typeof import('./provider-boundary')>('./provider-boundary')
      return { ...real, audienceForClient: async () => 'client', audienceForUser: async () => 'client' }
    })
  })
  afterEach(() => {
    vi.doUnmock('../routes/admin'); vi.doUnmock('./apollo'); vi.doUnmock('./alerts'); vi.doUnmock('./provider-boundary')
    vi.resetModules()
    process.env.ANTHROPIC_API_KEY = prev.anthropic
    process.env.SUPABASE_URL = prev.url
    process.env.SUPABASE_ANON_KEY = prev.anon
  })

  const onboard = async (body: Row = {}) => {
    const h = await handlerFor('/', 'post')
    const res = makeRes()
    await h({ body: { ...ICP_BODY, business: BUSINESS, campaign_intent: 'Book demos', ...body }, userId: 'u1', headers: {} }, res)
    return res
  }
  const revise = async (body: Row = {}) => {
    const h = await handlerFor('/revise', 'post')
    const res = makeRes()
    await h({ body: { ...ICP_BODY, name: 'Different people entirely', industries: ['Logistics'], ...body }, userId: 'u1', headers: {} }, res)
    return res
  }
  const go = async (icpId: string) => {
    const h = await handlerFor('/:id/activate', 'patch')
    const res = makeRes()
    await h({ params: { id: icpId }, body: { client_id: 'c1' }, headers: { 'x-admin-key': 'right-key' }, userId: 'operator-user' }, res)
    return res
  }
  /** The realistic revision path: back through Milla, carrying a new brief with it. */
  const reviseViaMilla = async (intent: string) => {
    const h = await handlerFor('/', 'post')
    const res = makeRes()
    await h({ body: {
      ...ICP_BODY, name: 'Different people entirely', industries: ['Logistics'],
      business: BUSINESS, campaign_intent: intent,
    }, userId: 'u1', headers: {} }, res)
    return res
  }
  /** Take the client live, the way K.I.N.D does. */
  const makeLive = async () => {
    await onboard()
    const icpId = store.icps[0].id
    await go(icpId)
    expect(store.icps[0].is_active).toBe(true)
    // GO's first sourcing run is fire-and-forget. Let it finish before any test clears the
    // recorder, or its RPCs land afterwards and read as "the revision caused this" — an
    // assertion that would fail for a reason that has nothing to do with the code.
    await new Promise(r => setTimeout(r, 60))
    return icpId
  }

  it('A LIVE CLIENT\'S REVISION DOES NOT CHANGE LIVE TARGETING', async () => {
    const icpId = await makeLive()
    const liveBefore = { name: store.icps[0].name, industries: [...store.icps[0].industries] }

    const res = await revise()
    expect(res.statusCode).toBe(201)

    // THE DEFECT, ASSERTED. What sourcing reads must be untouched…
    expect(store.icps[0].name, 'the revision changed live targeting immediately').toBe(liveBefore.name)
    expect(store.icps[0].industries).toEqual(liveBefore.industries)
    // …and the revision must be SAVED, not thrown away — the client asked for it.
    expect(store.icps[0].pending_targeting, 'the revision was not saved anywhere').toBeTruthy()
    expect(store.icps[0].pending_targeting.name).toBe('Different people entirely')
    expect(store.icps[0].pending_submitted_at).toBeTruthy()
    // Same core ICP, still one row.
    expect(store.icps).toHaveLength(1)
    expect(store.icps[0].id).toBe(icpId)
  })

  it('NOTHING RUNS ON A PENDING REVISION — no sourcing, no campaign change', async () => {
    await makeLive()
    const campBefore = { ...store.figsy_campaigns[0] }
    rec.rpcs.length = 0

    await revise()
    // No sourcing of any kind was triggered by the client's edit.
    expect(rec.rpcs.map(r => r.fn)).not.toContain('try_spend_sourcing')
    expect(rec.rpcs.map(r => r.fn)).not.toContain('try_reserve_proof_records')
    // The live campaign is exactly as it was — not paused, not renamed, not duplicated.
    expect(store.figsy_campaigns).toHaveLength(1)
    expect(store.figsy_campaigns[0].status).toBe(campBefore.status)
    expect(store.icps[0].is_active).toBe(true)     // still live on the OLD targeting
  })

  it('K.I.N.D GO APPLIES THE REVISION AND CLEARS IT', async () => {
    const icpId = await makeLive()
    const campId = store.figsy_campaigns[0].id
    await revise()

    const res = await go(icpId)
    expect(res.statusCode).toBe(200)
    // The revision is now the live targeting…
    expect(store.icps[0].name).toBe('Different people entirely')
    expect(store.icps[0].industries).toEqual(['Logistics'])
    // …and the pending slot is empty, so a second GO cannot re-apply a stale revision.
    expect(store.icps[0].pending_targeting ?? null).toBeNull()
    expect(store.icps[0].pending_submitted_at ?? null).toBeNull()
    // …and the API says WHICH event this was, because Vida shows a different message for
    // "revision applied" than for "ICP is live" and the operator pressed one button.
    expect((res.body as any).applied_revision).toBe(true)
    // One ICP, one campaign, no duplicate, still the same rows.
    expect(store.icps).toHaveLength(1)
    expect(store.icps[0].id).toBe(icpId)
    expect(store.figsy_campaigns).toHaveLength(1)
    expect(store.figsy_campaigns[0].id).toBe(campId)
    expect(store.figsy_campaigns[0].status).toBe('active')
  })

  it('APPLYING A REVISION IS NOT A SECOND FIRST RUN', async () => {
    const icpId = await makeLive()
    await revise()
    rec.rpcs.length = 0
    const res = await go(icpId)
    // The ICP has already run, so GO applies the targeting and does NOT re-source: the
    // client's motion continues on its own schedule rather than paying for a fresh batch
    // because someone edited a job title.
    expect((res.body as any).sourcing).toBe(false)
    expect(rec.rpcs.map(r => r.fn)).not.toContain('try_spend_sourcing')
  })

  it('A COMPETING LIVE CAMPAIGN STILL REFUSES GO — and the revision stays pending', async () => {
    const icpId = await makeLive()
    await revise()
    store.figsy_campaigns.push({ id: 'camp-other', client_id: 'c1', icp_id: 'icp-other', status: 'active', name: 'Other push' })
    // Force the invariant to see a competitor that is not this ICP's own campaign.
    store.figsy_campaigns[0].status = 'paused'

    const res = await go(icpId)
    expect(res.statusCode).toBe(409)
    // Fail-closed all the way through: a refused GO must not half-apply the revision.
    expect(store.icps[0].name).toBe('SA SaaS CTOs')
    expect(store.icps[0].pending_targeting, 'a refused GO discarded the pending revision').toBeTruthy()
  })

  it('AN UNPAID PROSPECT\'S REFINEMENT IS UNCHANGED — edited in place, nothing pending', async () => {
    // Nothing of theirs is running, so there is nothing to protect: their ICP is the draft
    // they are still shaping, and a pending slot would only add a step before pass 2.
    await onboard()
    expect(store.icps[0].is_active).toBeFalsy()
    await revise()
    expect(store.icps[0].name).toBe('Different people entirely')   // applied straight away
    expect(store.icps[0].pending_targeting ?? null).toBeNull()
    expect(store.icps).toHaveLength(1)
  })
})

// ── THE BRIEF WAITS WITH THE TARGETING, AND IT IS NOT LOST ───────────────────
//
// Founder-ruled 22 Aug, closing the gap left by the first pass at the ruling: for a live
// client BOTH the revised targeting AND the revised campaign intent must wait for review.
// The first implementation got half of it — it correctly refused to write the new intent
// onto the live campaign, and then simply DROPPED it. Not applying a client's brief is
// right; losing it is not. They said what this campaign is now for, and by GO nobody could
// remember what that was.
//
// ⚠️ WHY `pending_targeting` COULD NOT JUST CARRY IT, proved in the code rather than
// asserted: GO applies the held revision with `db.from('icps').update({ ...applyHeld })`,
// so EVERY key inside `pending_targeting` is written as an `icps` column. `campaign_intent`
// is a `figsy_campaigns` column (20260524_campaign_intent.sql) and does not exist on
// `icps` — so hiding it in that payload would either fail the whole GO write or, worse,
// silently need stripping logic that the column's own name gives no hint of. It gets its
// own field, and the whole pending revision still lives in ONE row so a refused GO cannot
// clear half of it.
describe('a live client\'s revised BRIEF waits too — and survives the wait', () => {
  let store: Store
  let rec: { rpcs: Array<{ fn: string; args: Row }> }

  beforeEach(() => {
    store = makeStore()
    rec = { rpcs: [] }
    vi.resetModules()
    process.env.ANTHROPIC_API_KEY = 'test-key'
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'
    installDb(store, rec)
    vi.doMock('../routes/admin', () => ({ adminKeyValid: (k: unknown) => k === 'right-key' }))
    vi.doMock('./apollo', () => ({
      searchPeopleWithFallback: async () => ({ contacts: [], relaxed: false }),
      ApolloCreditsExhaustedError: class extends Error {}, ApolloRateLimitError: class extends Error {},
    }))
    vi.doMock('./alerts', () => ({ sendFounderAlert: async () => {} }))
    vi.doMock('./provider-boundary', async () => {
      const real = await vi.importActual<typeof import('./provider-boundary')>('./provider-boundary')
      return { ...real, audienceForClient: async () => 'client', audienceForUser: async () => 'client' }
    })
  })
  afterEach(() => {
    vi.doUnmock('../routes/admin'); vi.doUnmock('./apollo'); vi.doUnmock('./alerts'); vi.doUnmock('./provider-boundary')
    vi.resetModules()
    process.env.ANTHROPIC_API_KEY = prev.anthropic
    process.env.SUPABASE_URL = prev.url
    process.env.SUPABASE_ANON_KEY = prev.anon
  })

  const save = async (body: Row) => {
    const h = await handlerFor('/', 'post')
    const res = makeRes()
    await h({ body, userId: 'u1', headers: {} }, res)
    return res
  }
  const go = async (icpId: string) => {
    const h = await handlerFor('/:id/activate', 'patch')
    const res = makeRes()
    await h({ params: { id: icpId }, body: { client_id: 'c1' }, headers: { 'x-admin-key': 'right-key' }, userId: 'operator-user' }, res)
    return res
  }
  /** Onboard with an original brief, then take them live. */
  const liveWithBrief = async () => {
    await save({ ...ICP_BODY, business: BUSINESS, campaign_intent: 'Book demos with fleet managers' })
    const icpId = store.icps[0].id
    await go(icpId)
    await new Promise(r => setTimeout(r, 60))
    expect(store.icps[0].is_active).toBe(true)
    expect(store.figsy_campaigns[0].campaign_intent).toBe('Book demos with fleet managers')
    return icpId
  }
  const reviseBrief = (intent: string) => save({
    ...ICP_BODY, name: 'Different people entirely', industries: ['Logistics'],
    business: BUSINESS, campaign_intent: intent,
  })

  it('THE LIVE BRIEF IS UNCHANGED, AND THE NEW ONE IS KEPT', async () => {
    await liveWithBrief()
    await reviseBrief('Fill the 3 September launch webinar')

    // What FIGSY writes from is exactly what it was — the brief did not change under a
    // live campaign any more than the targeting did.
    expect(store.figsy_campaigns[0].campaign_intent).toBe('Book demos with fleet managers')
    // THE DEFECT, ASSERTED: and the client's new brief is not thrown away.
    expect(store.icps[0].pending_campaign_intent, 'the revised brief was lost').toBe('Fill the 3 September launch webinar')
    // The targeting waits alongside it, in the same row.
    expect(store.icps[0].pending_targeting?.name).toBe('Different people entirely')
  })

  it('NOTHING RUNS WHILE THE BRIEF WAITS', async () => {
    await liveWithBrief()
    rec.rpcs.length = 0
    await reviseBrief('Fill the 3 September launch webinar')
    expect(rec.rpcs.map(r => r.fn)).not.toContain('try_spend_sourcing')
    expect(rec.rpcs.map(r => r.fn)).not.toContain('try_reserve_proof_records')
    expect(store.figsy_campaigns).toHaveLength(1)
    expect(store.figsy_campaigns[0].status).toBe('active')      // untouched, still theirs
  })

  it('GO APPLIES BOTH — the targeting AND the brief — then clears them', async () => {
    const icpId = await liveWithBrief()
    const campId = store.figsy_campaigns[0].id
    await reviseBrief('Fill the 3 September launch webinar')

    const res = await go(icpId)
    expect(res.statusCode).toBe(200)
    // Targeting applied…
    expect(store.icps[0].name).toBe('Different people entirely')
    // …and the brief applied to the SAME campaign, not a new one.
    expect(store.figsy_campaigns).toHaveLength(1)
    expect(store.figsy_campaigns[0].id).toBe(campId)
    expect(store.figsy_campaigns[0].campaign_intent).toBe('Fill the 3 September launch webinar')
    expect(store.figsy_campaigns[0].status).toBe('active')
    // …and nothing is left pending, so a second GO cannot replay a stale revision.
    expect(store.icps[0].pending_targeting ?? null).toBeNull()
    expect(store.icps[0].pending_campaign_intent ?? null).toBeNull()
    expect(store.icps[0].pending_submitted_at ?? null).toBeNull()
  })

  it('A REFUSED GO LEAVES BOTH WAITING — nothing half-applied', async () => {
    const icpId = await liveWithBrief()
    await reviseBrief('Fill the 3 September launch webinar')
    // A genuinely competing live campaign, and this ICP's own campaign paused so the
    // invariant sees a competitor rather than itself.
    store.figsy_campaigns[0].status = 'paused'
    store.figsy_campaigns.push({ id: 'camp-other', client_id: 'c1', icp_id: 'icp-other', status: 'active', name: 'Other push' })

    const res = await go(icpId)
    expect(res.statusCode).toBe(409)
    expect(store.icps[0].name).toBe('SA SaaS CTOs')                                   // targeting untouched
    expect(store.icps[0].pending_targeting, 'a refused GO dropped the targeting').toBeTruthy()
    expect(store.icps[0].pending_campaign_intent, 'a refused GO dropped the brief').toBe('Fill the 3 September launch webinar')
    expect(store.figsy_campaigns[0].campaign_intent).toBe('Book demos with fleet managers')   // brief untouched
  })

  it('APPLYING A REVISED BRIEF IS NOT A SECOND FIRST RUN', async () => {
    const icpId = await liveWithBrief()
    await reviseBrief('Fill the 3 September launch webinar')
    rec.rpcs.length = 0
    const res = await go(icpId)
    expect((res.body as any).sourcing).toBe(false)
    expect(rec.rpcs.map(r => r.fn)).not.toContain('try_spend_sourcing')
  })

  it('AN UNPAID PROSPECT\'S BRIEF STILL APPLIES STRAIGHT AWAY', async () => {
    // Nothing of theirs is live, so there is no live brief to protect and no review to wait
    // for — their campaign is a draft nobody has sent from.
    await save({ ...ICP_BODY, business: BUSINESS, campaign_intent: 'Book demos with fleet managers' })
    expect(store.icps[0].is_active).toBeFalsy()
    await reviseBrief('Fill the 3 September launch webinar')
    expect(store.figsy_campaigns[0].campaign_intent).toBe('Fill the 3 September launch webinar')
    expect(store.icps[0].pending_campaign_intent ?? null).toBeNull()
  })
})

// ── APPLYING A REVISION IS ALL-OR-NOTHING ────────────────────────────────────
//
// Independent review, 22 Aug: GO applied a pending revision with TWO ordinary client writes
// — `figsy_campaigns.campaign_intent` first, then the ICP (targeting + activation + clearing
// the pending fields). Two writes across two tables are not a transaction. If the first
// landed and the second did not, the client was left with a NEW BRIEF and OLD TARGETING —
// FIGSY writing for an audience nobody had approved — while the revision could still look
// like it was waiting. My own comment claimed "a failure leaves the whole revision
// untouched and still waiting", and against two client writes that sentence was simply not
// true. Ordering them more carefully cannot fix it; only one transaction can.
//
// The fix is a single `SECURITY DEFINER` function, `apply_pending_revision`, added to the
// same still-unapplied migration. A plpgsql function body IS one transaction: it applies the
// brief, the targeting, the activation and the clearing together, and any failure inside it
// raises, which rolls back every part.
describe('GO applies a revision atomically — or not at all', () => {
  let store: Store
  let rec: { rpcs: Array<{ fn: string; args: Row }> }

  beforeEach(() => {
    store = makeStore()
    rec = { rpcs: [] }
    vi.resetModules()
    process.env.ANTHROPIC_API_KEY = 'test-key'
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'
    installDb(store, rec)
    vi.doMock('../routes/admin', () => ({ adminKeyValid: (k: unknown) => k === 'right-key' }))
    vi.doMock('./apollo', () => ({
      searchPeopleWithFallback: async () => ({ contacts: [], relaxed: false }),
      ApolloCreditsExhaustedError: class extends Error {}, ApolloRateLimitError: class extends Error {},
    }))
    vi.doMock('./alerts', () => ({ sendFounderAlert: async () => {} }))
    vi.doMock('./provider-boundary', async () => {
      const real = await vi.importActual<typeof import('./provider-boundary')>('./provider-boundary')
      return { ...real, audienceForClient: async () => 'client', audienceForUser: async () => 'client' }
    })
  })
  afterEach(() => {
    vi.doUnmock('../routes/admin'); vi.doUnmock('./apollo'); vi.doUnmock('./alerts'); vi.doUnmock('./provider-boundary')
    vi.resetModules()
    process.env.ANTHROPIC_API_KEY = prev.anthropic
    process.env.SUPABASE_URL = prev.url
    process.env.SUPABASE_ANON_KEY = prev.anon
  })

  const save = async (body: Row) => {
    const h = await handlerFor('/', 'post')
    const res = makeRes()
    await h({ body, userId: 'u1', headers: {} }, res)
    return res
  }
  const go = async (icpId: string) => {
    const h = await handlerFor('/:id/activate', 'patch')
    const res = makeRes()
    await h({ params: { id: icpId }, body: { client_id: 'c1' }, headers: { 'x-admin-key': 'right-key' }, userId: 'operator-user' }, res)
    return res
  }
  const liveWithRevision = async () => {
    await save({ ...ICP_BODY, business: BUSINESS, campaign_intent: 'Book demos with fleet managers' })
    const icpId = store.icps[0].id
    await go(icpId)
    await new Promise(r => setTimeout(r, 60))
    await save({ ...ICP_BODY, name: 'Different people entirely', industries: ['Logistics'],
                 business: BUSINESS, campaign_intent: 'Fill the 3 September launch webinar' })
    expect(store.icps[0].pending_campaign_intent).toBe('Fill the 3 September launch webinar')
    return icpId
  }

  it('A FAILED APPLICATION LEAVES THE LIVE BRIEF UNCHANGED', async () => {
    // THE DEFECT, ASSERTED. With two separate writes the brief escaped into the live
    // campaign and the targeting never followed it.
    const icpId = await liveWithRevision()
    store.failIcpUpdate = true

    const res = await go(icpId)
    expect(res.statusCode).toBeGreaterThanOrEqual(400)
    expect(store.figsy_campaigns[0].campaign_intent,
      'the new brief escaped into the live campaign while the targeting did not').toBe('Book demos with fleet managers')
  })

  it('A FAILED APPLICATION LEAVES THE LIVE TARGETING UNCHANGED', async () => {
    const icpId = await liveWithRevision()
    store.failIcpUpdate = true
    await go(icpId)
    expect(store.icps[0].name).toBe('SA SaaS CTOs')
    expect(store.icps[0].industries).toEqual(['SaaS'])
  })

  it('A FAILED APPLICATION LEAVES EVERY PENDING FIELD WAITING', async () => {
    const icpId = await liveWithRevision()
    store.failIcpUpdate = true
    await go(icpId)
    expect(store.icps[0].pending_targeting?.name).toBe('Different people entirely')
    expect(store.icps[0].pending_campaign_intent).toBe('Fill the 3 September launch webinar')
    expect(store.icps[0].pending_submitted_at).toBeTruthy()
  })

  it('A FAILED APPLICATION SOURCES NOTHING AND SPENDS NOTHING', async () => {
    const icpId = await liveWithRevision()
    rec.rpcs.length = 0
    store.failIcpUpdate = true
    await go(icpId)
    expect(rec.rpcs.map(r => r.fn)).not.toContain('try_spend_sourcing')
    expect(rec.rpcs.map(r => r.fn)).not.toContain('try_reserve_proof_records')
    expect(store.figsy_campaigns).toHaveLength(1)
  })

  it('THE SHIPPED SQL APPLIES BOTH IN ONE FUNCTION, AND RAISES RATHER THAN HALF-APPLIES', () => {
    // The simulation above proves the CONTRACT. This proves the contract belongs to the
    // function that will actually run — in BOTH homes, because a migration recorded in one
    // and run from the other is how a fence goes missing.
    const { readFileSync } = require('fs') as typeof import('fs')
    const { join } = require('path') as typeof import('path')
    for (const rel of [
      '../../../../supabase/migrations/20260822_free_proof_acquisition.sql',
      './pending-migrations.ts',
    ]) {
      const src = readFileSync(join(__dirname, rel), 'utf8')
      const start = src.indexOf('create or replace function public.apply_pending_revision')
      expect(start, `apply_pending_revision missing in ${rel}`).toBeGreaterThan(-1)
      const fn = src.slice(start, src.indexOf('revoke execute on function public.apply_pending_revision'))
      // ONE function, and it touches BOTH tables — that is what makes it one transaction.
      expect(fn).toContain('update public.figsy_campaigns')
      expect(fn).toContain('update public.icps')
      // A failure RAISES, so the whole function's work rolls back rather than half-landing.
      expect(fn).toMatch(/raise exception/i)
      // Locked and scoped: the row is taken FOR UPDATE and every write is client-scoped.
      expect(fn).toContain('for update')
      expect(fn).toContain('client_id = p_client_id')
      // And it clears all three pending fields, so a second GO cannot replay a stale one.
      for (const c of ['pending_targeting', 'pending_campaign_intent', 'pending_submitted_at']) {
        expect(fn).toContain(c)
      }
    }
  })

  it('THE ROUTE NO LONGER WRITES THE CAMPAIGN BRIEF ITSELF DURING GO', () => {
    // The anti-drift guard. The half-apply was possible because the route wrote
    // figsy_campaigns directly; if that ever comes back, atomicity is gone again and this
    // fails rather than the defect returning quietly.
    const { readFileSync } = require('fs') as typeof import('fs')
    const { join } = require('path') as typeof import('path')
    const src = readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')
    // ⛓️ ANCHOR MOVED (29 Aug). This used to slice from the ROUTE REGISTRATION, which was
    // also where the handler body began. The registration now sits at the top of the file —
    // it must precede `icpRouter.use(requireAuth)` or the operator's GO is answered 401 —
    // so slicing from it would take almost the whole file and this guard would report every
    // unrelated `figsy_campaigns` write in `icps.ts` as a returned defect. Anchored on the
    // handler instead, which is what it was always reading.
    const go = src.slice(src.indexOf('async function activateIcpHandler('))
    expect(go).toContain('apply_pending_revision')
    expect(go).not.toMatch(/from\('figsy_campaigns'\)\s*\n?\s*\.update/)
  })
})
