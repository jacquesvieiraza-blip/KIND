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
type Store = { icps: Row[]; figsy_campaigns: Row[]; clients: Row[]; leads: Row[]; figsy_knowledge: Row[]; credit_transactions: Row[] }

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
        const apply = () => {
          let targets = rows().filter(r => ueqs.every(([c, v]) => r[c] === v))
          if (uneq) targets = targets.filter(r => r[uneq![0]] !== uneq![1])
          targets.forEach(r => Object.assign(r, patch))
          return targets
        }
        for (const m of ['in', 'is']) chain[m] = () => chain
        chain.eq = (c: string, v: unknown) => { ueqs.push([c, v]); return chain }
        chain.neq = (c: string, v: unknown) => { uneq = [c, v]; return chain }
        chain.select = () => ({
          single: async () => ({ data: apply()[0] ?? null, error: null }),
          maybeSingle: async () => ({ data: apply()[0] ?? null, error: null }),
        })
        chain.then = (r: (v: unknown) => void) => { apply(); r({ error: null }) }
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

  it('a paying client\'s revision still takes effect on their LIVE targeting', async () => {
    // AR9's 25-Jul half, unchanged: "no gate on their own change". Updating in place means
    // their live ICP carries the new targeting immediately — they change what is running,
    // they never ACTIVATE anything, which is AR9's 22-Aug half.
    await onboard()
    const icpId = store.icps[0].id
    await go(icpId)
    expect(store.icps[0].is_active).toBe(true)
    await refine()
    expect(store.icps).toHaveLength(1)
    expect(store.icps[0].id).toBe(icpId)
    expect(store.icps[0].name).toBe('SA SaaS CTOs — smaller firms')
    expect(store.icps[0].is_active).toBe(true)            // still live, now with new targeting
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
