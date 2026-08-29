// ═══════════════════════════════════════════════════════════════════════════════════════
// THE VIDA "GO" BUTTON COULD NEVER REACH ITS OWN HANDLER.
//
// `PATCH /icps/:id/activate` is the operator route — K.I.N.D owns GO (22 Aug). Its gate is
// the ADMIN KEY, and the comment left on the client page when the client's button was
// deleted states the intended architecture in one line:
//
//     "This called `PATCH /icps/:id/activate`, which is now K.I.N.D-only and answers a
//      client JWT with 403"
//                       — apps/portal/src/app/(dashboard)/dashboard/leads/icp/page.tsx
//
// That sentence describes a route whose authentication is the admin key. But the route sits
// on `icpRouter`, and `icpRouter.use(requireAuth)` runs before every handler registered
// after it — so a request without an `Authorization: Bearer` header never reached the admin
// check at all. It was answered `401 {"error":"Missing auth token"}` by middleware written
// for the CLIENT routes on the same router.
//
// The Vida proxy holds the admin key and a verified operator session. It has no client JWT
// and must never mint one. So in production the founder pressing GO got the 401 — proven
// live on 29 Aug against the deployed API. The programme Go-Live gate behind it (BUILD-002)
// was unreachable, not because the gate was wrong, but because nothing ever got to it.
//
// ⚠️ WHY EVERY EXISTING TEST MISSED IT. `kind-owns-go.test.ts` reaches into
// `icpRouter.stack`, pulls the route's own handler out and calls it directly. That is a
// perfectly good test of the handler and a blind spot for the router: middleware registered
// on the router is never executed, so the one layer that rejected every real request was the
// one layer no test ran. THESE tests dispatch through a real Express app over the real
// router, which is the only way the fault is visible.
//
// Mocks only — no network, no provider, no spend.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createServer, request as httpRequest, type Server } from 'http'
import type { AddressInfo } from 'net'
import { stripCommentsForEnvScan } from '../lib/env-inventory'

type Rec = { rpcs: string[]; icpUpdates: Array<Record<string, unknown>>; ensureCalls: number }

type EnsureMode = 'ok' | 'programme_not_live'

/**
 * Dispatch a real HTTP request through a real Express app mounting the REAL `icpRouter`.
 *
 * Not `supertest` (not a dependency here) and deliberately not the global `fetch` — a raw
 * `http.request` to 127.0.0.1 cannot be diverted by an ambient proxy dispatcher, so a green
 * here is the router answering and never something else.
 */
async function dispatch(opts: {
  method: string
  path: string
  headers?: Record<string, string>
  body?: Record<string, unknown>
  ensure?: EnsureMode
  clientUserId?: string | null
}, rec: Rec): Promise<{ status: number; json: any }> {
  vi.resetModules()

  vi.doMock('@kind/db', () => {
    const makeQuery = (table: string) => {
      const q: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'in', 'is', 'neq', 'not', 'order', 'or', 'gte', 'lte']) q[m] = () => q
      q.limit = () => q
      q.single = async () => ({
        data: table === 'clients'
          ? { id: 'c1', credit_balance: 0, first_icp_run_at: null, user_id: opts.clientUserId === undefined ? 'client-owner-user' : opts.clientUserId }
          : { id: 'icp-1', name: 'Test', last_run_at: null },
        error: null,
      })
      q.maybeSingle = async () => ({
        data: table === 'clients' ? { id: 'c1' } : table === 'icps' ? { id: 'icp-1', name: 'Test' } : null,
        error: null,
      })
      q.update = (patch: Record<string, unknown>) => {
        if (table === 'icps') rec.icpUpdates.push(patch)
        const chain: Record<string, unknown> = {}
        for (const m of ['eq', 'in', 'is', 'neq']) chain[m] = () => chain
        ;(chain as { select: unknown }).select = () => ({ single: async () => ({ data: { id: 'icp-1' }, error: null }) })
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
        rpc: async (fn: string) => {
          rec.rpcs.push(fn)
          if (fn === 'apply_pending_revision') {
            return { data: { ok: true, applied: false, applied_intent: false,
              icp: { id: 'icp-1', name: 'Test', last_run_at: null, is_active: true } }, error: null }
          }
          return { data: 0, error: null }
        },
        auth: { admin: { listUsers: async () => ({ data: { users: [] }, error: null }), getUserById: async () => ({ data: { user: { email: '' } }, error: null }) } },
      },
    }
  })

  vi.doMock('../lib/start-work', () => ({
    ensureCampaignForIcp: async () => {
      rec.ensureCalls++
      if (opts.ensure === 'programme_not_live') {
        // The EXACT BUILD-002 refusal the founder is trying to reach in production.
        return { refused: { reason: 'programme_not_live', message: 'This client is on a programme that is RECOMMENDED and has not completed its second payment, so no campaign was activated. A programme campaign starts only at Go Live.' } }
      }
      return { id: 'camp-1' }
    },
    startWorkForClient: async () => ({ started: false, sourced: 0, surfaced: 0, recommended: 0 }),
  }))

  vi.doMock('./admin', () => ({ adminKeyValid: (k: unknown) => k === 'right-key' }))

  const { icpRouter } = await import('./icps')
  const express = (await import('express')).default
  const app = express()
  app.use(express.json())
  app.use('/icps', icpRouter)

  const server: Server = createServer(app)
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
  const port = (server.address() as AddressInfo).port

  try {
    const payload = opts.body === undefined ? undefined : JSON.stringify(opts.body)
    return await new Promise((resolve, reject) => {
      const req = httpRequest({
        host: '127.0.0.1', port, path: opts.path, method: opts.method,
        headers: {
          'content-type': 'application/json',
          ...(payload ? { 'content-length': Buffer.byteLength(payload) } : {}),
          ...(opts.headers ?? {}),
        },
      }, res => {
        let raw = ''
        res.on('data', c => { raw += c })
        res.on('end', () => {
          let json: any = null
          try { json = JSON.parse(raw) } catch { json = { raw } }
          resolve({ status: res.statusCode ?? 0, json })
        })
      })
      req.on('error', reject)
      if (payload) req.write(payload)
      req.end()
    })
  } finally {
    await new Promise<void>(r => server.close(() => r()))
  }
}

const prev = { anthropic: process.env.ANTHROPIC_API_KEY, url: process.env.SUPABASE_URL, anon: process.env.SUPABASE_ANON_KEY, admin: process.env.ADMIN_SECRET_KEY }

describe('the Vida operator can actually reach the GO handler', () => {
  let rec: Rec
  beforeEach(() => {
    rec = { rpcs: [], icpUpdates: [], ensureCalls: 0 }
    process.env.ANTHROPIC_API_KEY = 'test-key'
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'
    process.env.ADMIN_SECRET_KEY = 'right-key'
  })
  afterEach(() => {
    vi.doUnmock('../lib/start-work'); vi.doUnmock('./admin'); vi.resetModules()
    process.env.ANTHROPIC_API_KEY = prev.anthropic
    process.env.SUPABASE_URL = prev.url
    process.env.SUPABASE_ANON_KEY = prev.anon
    if (prev.admin === undefined) delete process.env.ADMIN_SECRET_KEY; else process.env.ADMIN_SECRET_KEY = prev.admin
  })

  // ── THE RED PROOF ────────────────────────────────────────────────────────────────────
  it('AN ADMIN-KEYED REQUEST WITH NO CLIENT JWT REACHES THE HANDLER (this is the live defect)', async () => {
    const res = await dispatch({
      method: 'PATCH', path: '/icps/icp-1/activate',
      headers: { 'x-admin-key': 'right-key', 'x-operator-email': 'jacques.vieiraza@gmail.com' },
      body: { client_id: 'c1' },
    }, rec)
    // Before the fix this is 401 {"success":false,"error":"Missing auth token"} — the exact
    // body production returned to the founder on 29 Aug.
    expect(res.json?.error).not.toBe('Missing auth token')
    expect(res.status).toBe(200)
    expect(res.json?.success).toBe(true)
    expect(rec.ensureCalls).toBe(1)
  })

  it('THE BUILD-002 GO-LIVE GATE IS REACHABLE — a RECOMMENDED programme refuses with programme_not_live', async () => {
    const res = await dispatch({
      method: 'PATCH', path: '/icps/icp-1/activate',
      headers: { 'x-admin-key': 'right-key' },
      body: { client_id: 'c1' },
      ensure: 'programme_not_live',
    }, rec)
    expect(res.status).toBe(409)
    expect(res.json?.refusal).toBe('programme_not_live')
    expect(String(res.json?.error)).toMatch(/second payment/i)
    // A refused GO flips nothing and asks for nothing: no revision transaction, no sourcing.
    expect(rec.rpcs).not.toContain('apply_pending_revision')
    expect(rec.rpcs).not.toContain('try_spend_sourcing')
    expect(rec.icpUpdates).toHaveLength(0)
  })

  // ── AUTHENTICATION IS STILL ENFORCED, BY THE RIGHT GATE ──────────────────────────────
  it('AN UNAUTHENTICATED DIRECT REQUEST STILL FAILS — no admin key, no activation', async () => {
    const res = await dispatch({ method: 'PATCH', path: '/icps/icp-1/activate', body: { client_id: 'c1' } }, rec)
    expect(res.status).toBe(403)
    expect(String(res.json?.error)).toMatch(/K\.I\.N\.D/)
    expect(rec.ensureCalls).toBe(0)
    expect(rec.rpcs).toHaveLength(0)
    expect(rec.icpUpdates).toHaveLength(0)
  })

  it('AN INVALID ADMIN KEY STILL FAILS — a guessed key is not an operator', async () => {
    const res = await dispatch({
      method: 'PATCH', path: '/icps/icp-1/activate',
      headers: { 'x-admin-key': 'guessed' }, body: { client_id: 'c1' },
    }, rec)
    expect(res.status).toBe(403)
    expect(rec.ensureCalls).toBe(0)
    expect(rec.icpUpdates).toHaveLength(0)
  })

  it('A CLIENT JWT WITHOUT THE ADMIN KEY STILL FAILS — the client never presses GO', async () => {
    // A client-shaped request: it carries an Authorization header, not an admin key. It is
    // refused by the ADMIN gate, which is what the portal comment says should happen.
    const res = await dispatch({
      method: 'PATCH', path: '/icps/icp-1/activate',
      headers: { authorization: 'Bearer some-client-jwt' }, body: { client_id: 'c1' },
    }, rec)
    expect(res.status).toBe(403)
    expect(rec.ensureCalls).toBe(0)
  })

  it('NO SOURCING, NO PROVIDER, NO SPEND ON A REFUSED ACTIVATION', async () => {
    await dispatch({
      method: 'PATCH', path: '/icps/icp-1/activate',
      headers: { 'x-admin-key': 'guessed' }, body: { client_id: 'c1' },
    }, rec)
    expect(rec.rpcs).not.toContain('try_spend_sourcing')
    expect(rec.rpcs).toHaveLength(0)
  })

  // ── THE CLIENT ROUTES ON THE SAME ROUTER KEEP THEIR OWN AUTH ─────────────────────────
  it('THE REST OF icpRouter STILL REQUIRES A CLIENT JWT — GET /icps is 401 without one', async () => {
    const res = await dispatch({ method: 'GET', path: '/icps' }, rec)
    expect(res.status).toBe(401)
    expect(res.json?.error).toBe('Missing auth token')
  })

  it('a client route with a bogus JWT is still refused (requireAuth is intact, not bypassed)', async () => {
    const res = await dispatch({ method: 'GET', path: '/icps', headers: { authorization: 'Bearer nonsense' } }, rec)
    expect(res.status).toBe(401)
  })

  // ── THE OPERATOR MUST NAME THE CLIENT ────────────────────────────────────────────────
  it('WITHOUT client_id THE REQUEST IS REFUSED — there is no client identity to fall back on', async () => {
    // The old fallback resolved the client from `req.userId`, which only existed because
    // `requireAuth` had run. An operator has no client account, so guessing a client from
    // the caller is not merely dead code — it is the wrong client.
    const res = await dispatch({
      method: 'PATCH', path: '/icps/icp-1/activate',
      headers: { 'x-admin-key': 'right-key' }, body: {},
    }, rec)
    expect(res.status).toBe(400)
    expect(String(res.json?.error)).toMatch(/client_id/i)
    expect(rec.ensureCalls).toBe(0)
  })

  it('a client whose account has no owner user starts NO sourcing — the first-leads email has no recipient', async () => {
    const res = await dispatch({
      method: 'PATCH', path: '/icps/icp-1/activate',
      headers: { 'x-admin-key': 'right-key' }, body: { client_id: 'c1' },
      clientUserId: null,
    }, rec)
    expect(res.status).toBe(200)
    expect(res.json?.sourcing).toBe(false)
    await new Promise(r => setTimeout(r, 50))
    expect(rec.rpcs).not.toContain('try_spend_sourcing')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE STRUCTURAL GUARD — the fix is an ORDERING, and orderings rot silently.
//
// `/:id/activate` works only because it is registered BEFORE `icpRouter.use(requireAuth)`.
// Someone tidying this file could move the registration down to sit with the other routes
// and every unit test above would still pass in isolation while production went back to
// answering the founder "Missing auth token". So the order is asserted directly.
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('the operator route is registered before the client auth middleware', () => {
  // ⚠️ COMMENTS STRIPPED FIRST. The comment explaining this fix quotes both
  // `icpRouter.use(requireAuth)` and the registration line, so a raw `indexOf` finds the
  // PROSE before the CODE and reports the order backwards. This repo has now burned five
  // times on a guard failing against its own documentation — the fix is never to delete the
  // documentation.
  const SRC = stripCommentsForEnvScan(readFileSync(join(__dirname, 'icps.ts'), 'utf8'))

  it('the admin-key route registration precedes requireAuth on the router', () => {
    const activateAt = SRC.indexOf(`icpRouter.patch('/:id/activate'`)
    const requireAuthAt = SRC.indexOf('icpRouter.use(requireAuth)')
    expect(activateAt).toBeGreaterThan(-1)
    expect(requireAuthAt).toBeGreaterThan(-1)
    expect(activateAt, 'PATCH /:id/activate must be registered BEFORE icpRouter.use(requireAuth) — after it, the operator gets 401 "Missing auth token" and the GO button is dead')
      .toBeLessThan(requireAuthAt)
  })

  it('activate is the ONLY route registered ahead of requireAuth', () => {
    const requireAuthAt = SRC.indexOf('icpRouter.use(requireAuth)')
    const ahead = SRC.slice(0, requireAuthAt).match(/^icpRouter\.(get|post|patch|put|delete)\(([^)]*)/gm) ?? []
    expect(ahead).toHaveLength(1)
    expect(ahead[0]).toContain('/:id/activate')
  })

  it('the route is still on icpRouter, so the handler tests keep finding it', () => {
    // `kind-owns-go.test.ts` locates the handler through `icpRouter.stack`. Moving the route
    // to a different router would silently orphan that suite.
    expect(SRC).toContain(`icpRouter.patch('/:id/activate'`)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE PROXY BOUNDARY IS UNCHANGED — and this proves the fix did not move the secret.
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('the Vida proxy still holds the boundary it always held', () => {
  const PROXY = readFileSync(
    join(__dirname, '../../../../apps/admin/src/app/api/proxy/[...path]/route.ts'), 'utf8')

  it('verifies a signed-in operator on the admin allowlist before proxying anything', () => {
    expect(PROXY).toContain('supabase.auth.getUser()')
    expect(PROXY).toContain('isAllowedAdminEmail')
  })

  it('NEVER reads the admin key from a NEXT_PUBLIC_ variable — that would ship it to the browser', () => {
    expect(PROXY).not.toMatch(/NEXT_PUBLIC_[A-Z_]*ADMIN/)
    expect(PROXY).toContain('process.env.ADMIN_SECRET_KEY')
  })

  it('does not manufacture, mint or forward a JWT — the operator is not a client', () => {
    expect(PROXY).not.toMatch(/Authorization/i)
    expect(PROXY).not.toMatch(/service_role|SERVICE_ROLE|signJwt|jsonwebtoken/)
  })

  it('the admin key never reaches the browser bundle — no client component reads it', () => {
    const vida = readFileSync(join(__dirname, '../../../../apps/admin/src/app/vida/page.tsx'), 'utf8')
    expect(vida).not.toContain('ADMIN_SECRET_KEY')
    expect(vida).not.toContain('x-admin-key')
    // And GO still goes through the proxy, which is the only thing that has the key.
    expect(vida).toContain('/api/proxy/icps/')
  })
})
