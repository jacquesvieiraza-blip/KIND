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
type Store = { clients: Row[]; icps: Row[]; figsy_campaigns: Row[]; figsy_replies: Row[] }

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
  return { clients: [...filler, { ...OPEN_REVIEW }], icps: [], figsy_campaigns: [], figsy_replies: [] }
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
      q.not = (c: string, _o: string, _v: unknown) => { preds.push(r => r[c] !== null && r[c] !== undefined); return q }
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
      q.then = (res: (v: unknown) => void) => res({ data: matched(), count: matched().length, error: null })
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
        chain.select = () => ({ then: (r: (v: unknown) => void) => r({ data: apply(), error: null }) })
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

async function alerts(): Promise<Row[]> {
  const h = await handlerFor('/alerts', 'get')
  const { req, res } = reqres()
  await h(req, res)
  return (res.body?.data ?? []) as Row[]
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
