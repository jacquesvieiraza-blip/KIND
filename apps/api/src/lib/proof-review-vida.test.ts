// ═══════════════════════════════════════════════════════════════════════════
// PR2 — THE OPERATOR HALF: the persisted handoff has to be VISIBLE and CLOSEABLE.
//
// `proof-review-handoff.test.ts` proves the ask is persisted exactly once. A row nobody ever
// sees is not a handoff, so this file proves the other two halves against the real handlers:
//
//   GET  /operator/alerts                          → an unresolved review appears, high
//   POST /operator/proof-review/:clientId/resolve  → it stops appearing
//
// ⚠️ WHY A SEPARATE QUERY IS WORTH A TEST. The alerts route already fetches `clients` with
// `order(created_at desc).limit(200)`. Reading the review off that page would make the alert
// vanish for any prospect who fell out of a newest-200 window — which is exactly the prospect
// most likely to have exhausted proof, because they are the one who has been going back and
// forth with us for weeks. The pagination test below is the whole reason the route does its
// own bounded query.
//
// Mocks only. No provider, no database, no network, no sending, no money path.
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

type Row = Record<string, any>
type Store = { clients: Row[]; icps: Row[]; figsy_campaigns: Row[]; figsy_replies: Row[]; updateError?: { message: string } | null; selectError?: { message: string } | null }

const OPEN_REVIEW = {
  id: 'c-old', company_name: 'Waited Longest', is_demo: false, created_at: '2020-01-01T00:00:00.000Z',
  proof_review_requested_at: '2026-08-27T10:00:00.000Z',
  proof_review_resolved_at: null,
  proof_review_icp_id: 'icp-abcdef12-3456',
}

function newStore(): Store {
  // 250 newer clients, so `c-old` is pushed out of any newest-200 window. If the route ever
  // reads the review off the paged `clients` fetch, this fixture makes it disappear.
  const filler = Array.from({ length: 250 }, (_, i) => ({
    id: `c-new-${i}`, company_name: `New ${i}`, is_demo: false,
    created_at: `2026-08-${String((i % 27) + 1).padStart(2, '0')}T00:00:00.000Z`,
    proof_review_requested_at: null, proof_review_resolved_at: null, proof_review_icp_id: null,
  }))
  return { clients: [...filler, { ...OPEN_REVIEW }], icps: [], figsy_campaigns: [], figsy_replies: [], updateError: null, selectError: null }
}

function installDb(store: Store) {
  vi.doMock('@kind/db', () => {
    const build = (table: string) => {
      const rows = (): Row[] => (store as any)[table] ?? []
      const preds: Array<(r: Row) => boolean> = []
      let lim = Infinity
      let orderCol: string | null = null
      let asc = true
      const q: any = {}
      for (const m of ['select', 'in', 'gte', 'lte']) q[m] = () => q
      q.eq  = (c: string, v: unknown) => { preds.push(r => r[c] === v); return q }
      q.neq = (c: string, v: unknown) => { preds.push(r => r[c] !== v); return q }
      q.is  = (c: string, _v: unknown) => { preds.push(r => r[c] === null || r[c] === undefined); return q }
      let isProofReviewRead = false
      q.not = (c: string, _o: string, _v: unknown) => {
        if (c === 'proof_review_requested_at') isProofReviewRead = true   // tags THIS query only
        preds.push(r => r[c] !== null && r[c] !== undefined); return q
      }
      q.or  = () => q
      q.limit = (n: number) => { lim = n; return q }
      q.order = (c: string, o?: { ascending?: boolean }) => { orderCol = c; asc = o?.ascending !== false; return q }
      const matched = () => {
        let out = rows().filter(r => preds.every(f => f(r)))
        if (orderCol) out = [...out].sort((a, b) =>
          asc ? String(a[orderCol!]).localeCompare(String(b[orderCol!]))
              : String(b[orderCol!]).localeCompare(String(a[orderCol!])))
        return out.slice(0, lim)
      }
      q.maybeSingle = async () => ({ data: matched()[0] ?? null, error: null })
      q.single      = async () => ({ data: matched()[0] ?? null, error: null })
      q.then = (res: (v: unknown) => void) => {
        // The SELECT returned-error shape: data null, error set, NOTHING thrown. Tagged by
        // the `.not('proof_review_requested_at', …)` call so ONLY the proof-review read fails —
        // otherwise the fixture would break every unrelated feed query and the "ordinary feed
        // survives" assertion would pass for the wrong reason.
        if (store.selectError && isProofReviewRead) { res({ data: null, count: 0, error: store.selectError }); return }
        res({ data: matched(), count: matched().length, error: null })
      }
      q.update = (patch: Row) => {
        const up: Array<(r: Row) => boolean> = []
        const chain: any = {}
        chain.eq  = (c: string, v: unknown) => { up.push(r => r[c] === v); return chain }
        chain.is  = (c: string, _v: unknown) => { up.push(r => r[c] === null || r[c] === undefined); return chain }
        chain.not = (c: string, _o: string, _v: unknown) => { up.push(r => r[c] !== null && r[c] !== undefined); return chain }
        chain.or  = () => chain
        chain.in  = () => chain
        const apply = () => {
          const t = rows().filter(r => up.every(f => f(r)))
          t.forEach(r => Object.assign(r, patch))
          return t
        }
        chain.select = () => ({ then: (r: (v: unknown) => void) => {
          // supabase-js resolves with `{data:null,error}` for a missing column — no throw.
          if (store.updateError) { r({ data: null, error: store.updateError }); return }
          r({ data: apply(), error: null })
        } })
        chain.then = (r: (v: unknown) => void) => { apply(); r({ error: null }) }
        return chain
      }
      return q
    }
    return { db: { from: (t: string) => build(t), rpc: async () => ({ data: null, error: null }) } }
  })

  vi.doMock('../lib/real-clients', () => ({ getExcludedClientIds: async () => new Set<string>() }))
  vi.doMock('./admin', () => ({ adminKeyValid: (k: unknown) => k === 'right-key' }))
  vi.doMock('../routes/admin', () => ({ adminKeyValid: (k: unknown) => k === 'right-key' }))
}

async function handlerFor(path: string, method: 'get' | 'post') {
  const mod = await import('../routes/operator')
  const stack = (mod.operatorRouter as unknown as { stack: Array<Row> }).stack
  const layer = stack.find(l => l.route?.path === path && l.route?.methods?.[method])
  expect(layer, `${method.toUpperCase()} ${path} not found`).toBeTruthy()
  return layer!.route.stack[layer!.route.stack.length - 1].handle
}

function reqres(opts: { params?: Row; headers?: Row } = {}) {
  const res: Row = { code: 200, body: null }
  res.status = (c: number) => { res.code = c; return res }
  res.json = (b: unknown) => { res.body = b; return res }
  return { req: { params: opts.params ?? {}, headers: opts.headers ?? {}, body: {}, query: {} }, res }
}

let store: Store
beforeEach(() => { vi.resetModules(); store = newStore(); installDb(store) })
afterEach(() => { vi.restoreAllMocks(); vi.resetModules() })

async function alertsBody(): Promise<Row> {
  const h = await handlerFor('/alerts', 'get')
  const { req, res } = reqres()
  await h(req, res)
  return res.body as Row
}
async function alerts(): Promise<Row[]> {
  return ((await alertsBody())?.data ?? []) as Row[]
}
const proofAlerts = (a: Row[]) => a.filter(x => x.kind === 'proof_review')

describe('an unresolved proof review is visible in Vida', () => {
  it('appears in /operator/alerts', async () => {
    const found = proofAlerts(await alerts())
    expect(found).toHaveLength(1)
    expect(found[0].client_id).toBe('c-old')
  })

  it('survives a newest-200 client window — the oldest prospect is the likeliest one', async () => {
    // 250 newer clients exist. A review read off the paged `clients` fetch would be gone.
    expect(store.clients.length).toBeGreaterThan(200)
    expect(proofAlerts(await alerts())).toHaveLength(1)
  })

  it('identifies client, ICP, the requested time and the action needed', async () => {
    const a = proofAlerts(await alerts())[0]
    expect(a.client_id).toBe('c-old')
    expect(a.company_name).toBe('Waited Longest')
    expect(a.label).toContain('Proof review required')
    expect(a.label).toContain('icp-abcd')                    // the ICP, truncated
    expect(a.label).toContain('2026-08-27T10:00:00.000Z')    // requested time
    expect(a.label.toLowerCase()).toContain('review targeting')
  })

  it('is high severity and sorted ahead of the derived alerts', async () => {
    const all = await alerts()
    expect(all[0].kind).toBe('proof_review')
    expect(all[0].severity).toBe('high')
  })

  it('a client with NO review raises no proof alert', async () => {
    store.clients = store.clients.filter(c => c.id !== 'c-old')
    expect(proofAlerts(await alerts())).toHaveLength(0)
  })

  it('a RESOLVED review raises no proof alert', async () => {
    store.clients.find(c => c.id === 'c-old')!.proof_review_resolved_at = '2026-08-27T12:00:00.000Z'
    expect(proofAlerts(await alerts())).toHaveLength(0)
  })
})

describe('an operator can close it, and only an operator', () => {
  async function resolve(headers: Row, clientId = 'c-old') {
    const h = await handlerFor('/proof-review/:clientId/resolve', 'post')
    const { req, res } = reqres({ params: { clientId }, headers })
    await h(req, res)
    return res
  }
  const good = { 'x-admin-key': 'right-key' }

  it('resolving stamps resolved_at and removes it from the feed', async () => {
    expect(proofAlerts(await alerts())).toHaveLength(1)
    const res = await resolve(good)
    expect(res.code).toBe(200)
    expect(res.body.data.resolved).toBe('resolved')
    expect(store.clients.find(c => c.id === 'c-old')!.proof_review_resolved_at).toBeTruthy()
    expect(proofAlerts(await alerts())).toHaveLength(0)
  })

  it('a second click does not overwrite the first operator’s timestamp', async () => {
    await resolve(good)
    const first = store.clients.find(c => c.id === 'c-old')!.proof_review_resolved_at
    const res = await resolve(good)
    expect(res.body.data.resolved).toBe('already_resolved')
    expect(store.clients.find(c => c.id === 'c-old')!.proof_review_resolved_at).toBe(first)
  })

  it('cannot invent a resolution for a client who never asked', async () => {
    const res = await resolve(good, 'c-new-1')
    expect(res.body.data.resolved).toBe('already_resolved')
    expect(store.clients.find(c => c.id === 'c-new-1')!.proof_review_resolved_at).toBeNull()
  })

  it('refuses without the operator key — this is not a client-reachable action', async () => {
    const res = await resolve({})
    expect(res.code).toBe(403)
    expect(store.clients.find(c => c.id === 'c-old')!.proof_review_resolved_at).toBeNull()
    expect(proofAlerts(await alerts())).toHaveLength(1)
  })
})

describe('a FAILED resolve must never look like a handled one', () => {
  it('a returned {data:null,error} gives a server error, NOT already_resolved', async () => {
    // ⚑ THE BUG THIS REPLACES. Reading only `data` made a FAILED write indistinguishable
    // from a no-op, so the operator was told `already_resolved` — that the job was done. They
    // would close the tab on a review still open and the prospect would keep waiting. Zero
    // rows means "nothing to do"; an error means "we do not know". Never the same answer.
    store.updateError = { message: 'column clients.proof_review_resolved_at does not exist' }
    const h = await handlerFor('/proof-review/:clientId/resolve', 'post')
    const { req, res } = reqres({ params: { clientId: 'c-old' }, headers: { 'x-admin-key': 'right-key' } })
    await h(req, res)

    expect(res.code).toBe(500)
    expect(res.body.success).toBe(false)
    expect(String(res.body.error)).toContain('still open')
    expect(String(res.body.error)).toContain('does not exist')
    expect(res.body.data?.resolved).toBeUndefined()

    store.updateError = null
    expect(proofAlerts(await alerts())).toHaveLength(1)   // still owed
  })

  it('the un-migrated window still lets the rest of the alert feed load', async () => {
    // GET /operator/alerts reads the review columns too. With them absent the proof section
    // must drop out and the page must still answer.
    store.clients.forEach(c => { delete c.proof_review_requested_at; delete c.proof_review_resolved_at })
    const all = await alerts()
    expect(proofAlerts(all)).toHaveLength(0)
    expect(Array.isArray(all)).toBe(true)
  })
})

describe('a proof-review query that FAILS must never read as "nobody is waiting"', () => {
  // ⚑ THE LAST UNHARDENED SUPABASE CALL. The other two writes in this PR check their returned
  // `error`; this read did not, so `(proofReviews ?? [])` turned a FAILED query into an empty
  // list — a failed check and a genuinely empty queue produced the identical quiet console.
  // That is the silence this PR exists to remove, in the one surface that still had it.
  //
  // ⚠️ The mock's `q.then` is the SELECT path (the update path is `chain.select`), so
  // `selectError` reproduces exactly the shape supabase-js returns: data null, error set, no
  // throw. Set on the store so only this describe uses it.
  function failSelect(message: string) {
    store.selectError = { message }
  }

  it('the returned error is detected — the response is degraded, not silently empty', async () => {
    failSelect('column clients.proof_review_requested_at does not exist')
    const body = await alertsBody()
    expect(body.success).toBe(true)
    expect(body.degraded?.proof_review, 'the failure must be reported').toBeTruthy()
    expect(String(body.degraded.proof_review)).toContain('could not be checked')
    expect(String(body.degraded.proof_review)).toContain('does not exist')
    expect(String(body.degraded.proof_review)).toContain('20260827_proof_review_handoff')
  })

  it('it never claims zero reviews, and never claims one is resolved', async () => {
    failSelect('permission denied for table clients')
    const body = await alertsBody()
    const text = String(body.degraded.proof_review).toLowerCase()
    expect(text).toContain('do not read an empty list')
    expect(text).not.toContain('no reviews')
    expect(text).not.toContain('resolved')
    // and nothing was fabricated into the feed
    expect(proofAlerts((body.data ?? []) as Row[])).toHaveLength(0)
  })

  it('the ordinary operator feed still survives — the console degrades, it does not fail', async () => {
    // A client that genuinely produces a DERIVED alert: it must sit inside the route's
    // newest-200 `clients` window, so it is given the newest date in the fixture. (An earlier
    // draft used `c-new-1` at 2026-08-02, which falls outside that window — the assertion then
    // compared two empty lists and would have passed with the fallback deleted.)
    const carrier = store.clients.find(c => c.id === 'c-new-0')!
    carrier.created_at = '2026-08-28T00:00:00.000Z'
    store.icps.push({ client_id: 'c-new-0', created_at: '2026-08-27T00:00:00.000Z', updated_at: null, is_active: true })

    const clean = (await alertsBody()).data as Row[]
    const cleanOther = clean.filter(a => a.kind !== 'proof_review')
    expect(cleanOther.length, 'the fixture must produce a real unrelated alert').toBeGreaterThan(0)
    expect(clean.filter(a => a.kind === 'proof_review')).toHaveLength(1)

    failSelect('boom')
    const body = await alertsBody()
    const degraded = (body.data ?? []) as Row[]
    expect(body.success).toBe(true)
    // The unrelated half is untouched...
    expect(degraded.filter(a => a.kind !== 'proof_review')).toEqual(cleanOther)
    // ...the proof half is absent rather than fabricated...
    expect(degraded.filter(a => a.kind === 'proof_review')).toHaveLength(0)
    // ...and the operator is TOLD it is absent.
    expect(body.degraded?.proof_review).toBeTruthy()
  })

  it('the degraded message carries NO customer PII', async () => {
    failSelect('column does not exist')
    const text = String((await alertsBody()).degraded.proof_review)
    // The open-review fixture's identifying fields must not appear.
    expect(text).not.toContain('Waited Longest')          // company name
    expect(text).not.toContain('c-old')                   // client id
    expect(text).not.toContain('icp-abcdef12-3456')       // icp id
    expect(text).not.toMatch(/@/)                         // no email-shaped token
  })

  it('the SUCCESS path is unchanged — no degraded key, review still listed', async () => {
    const body = await alertsBody()
    expect(body.success).toBe(true)
    expect(body.degraded).toBeUndefined()
    expect(proofAlerts((body.data ?? []) as Row[])).toHaveLength(1)
  })
})
