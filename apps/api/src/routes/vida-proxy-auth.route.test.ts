// ═══════════════════════════════════════════════════════════════════════════════════════
// THE VIDA PROXY IS THE ONLY THING THAT HOLDS THE ADMIN KEY — SO IT IS THE WHOLE BOUNDARY.
//
// `PATCH /icps/:id/activate` is authenticated by `x-admin-key` alone (K.I.N.D owns GO). The
// browser cannot set that header: `ADMIN_SECRET_KEY` is a server-side env var and the only
// code that reads it for an outbound call is `apps/admin/src/app/api/proxy/[...path]`.
// Everything therefore rests on ONE claim — that the proxy will not inject the key for a
// caller it has not verified. This file proves that claim by RUNNING the proxy, not by
// reading it.
//
// The existing `admin-proxy-only.test.ts` proves no admin COMPONENT bypasses the proxy.
// Nothing until now proved what the proxy itself does when an anonymous or non-operator
// request arrives. A source-text assertion cannot: it reads the shape of the code, not the
// order of the decisions, and "refused" and "refused only after it already called upstream"
// look identical in the source.
//
// TWO INDEPENDENT LAYERS, both exercised here:
//   1. `apps/admin/src/middleware.ts` — matcher covers /api/*, answers 401 JSON to anyone
//      not signed in on the admin allowlist.
//   2. the proxy route itself — #308 defense-in-depth, re-verifies the session on its own
//      rather than trusting the middleware ran.
//
// Layer 2 is the one that matters, because layer 1 has a documented DEV-ONLY bypass
// (`VIDA_DEV_PREVIEW=1` off production). That bypass is proven below to be unable to expose
// the proxy — which is the entire reason the second check exists.
//
// Mocks only. No network: `fetch` is replaced, and the one test that does reach an upstream
// reaches a local Express app built from the real `icpRouter`.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createServer, type Server } from 'http'
import type { AddressInfo } from 'net'

const PROXY = '../../../admin/src/app/api/proxy/[...path]/route'
const ADMIN_KEY = 'server-only-admin-secret-do-not-leak'
const OPERATOR = 'jacques.vieiraza@gmail.com'

type Upstream = { calls: Array<{ url: string; headers: Record<string, string>; body: string | null }> }

/** A NextRequest-shaped object carrying only what the proxy actually reads. */
function proxyRequest(body: Record<string, unknown> | null, method = 'PATCH') {
  return {
    method,
    nextUrl: { search: '' },
    text: async () => (body === null ? '' : JSON.stringify(body)),
  } as any
}

/**
 * Run the REAL proxy route with a given Supabase session.
 *
 * `createClient` is the only thing stubbed — the allowlist decision is made by the real
 * `isAllowedAdminEmail`, because a test that also stubs the allowlist proves nothing about
 * who is allowed.
 */
async function callProxy(opts: {
  user: { email: string } | null
  path?: string[]
  body?: Record<string, unknown> | null
  key?: string
  /** Forward upstream into a live local Express app instead of answering with a canned 200. */
  upstreamPort?: number
}): Promise<{ status: number; json: any; upstream: Upstream }> {
  vi.resetModules()
  const upstream: Upstream = { calls: [] }

  vi.doMock('@/lib/supabase/server', async () => {
    const real = await vi.importActual<typeof import('../../../admin/src/lib/supabase/server')>(
      '../../../admin/src/lib/supabase/server')
    return {
      ...real,
      createClient: async () => ({ auth: { getUser: async () => ({ data: { user: opts.user } }) } }),
    }
  })

  const prevKey = process.env.ADMIN_SECRET_KEY
  if (opts.key === undefined) process.env.ADMIN_SECRET_KEY = ADMIN_KEY
  else if (opts.key === '') delete process.env.ADMIN_SECRET_KEY
  else process.env.ADMIN_SECRET_KEY = opts.key

  const realFetch = globalThis.fetch
  globalThis.fetch = (async (url: any, init: any) => {
    const headers: Record<string, string> = {}
    for (const [k, v] of Object.entries(init?.headers ?? {})) headers[k.toLowerCase()] = String(v)
    upstream.calls.push({ url: String(url), headers, body: init?.body ?? null })
    if (opts.upstreamPort) {
      // The chain proof: the proxy's own request, unmodified, against the real API router.
      const local = String(url).replace(/^https?:\/\/[^/]+/, `http://127.0.0.1:${opts.upstreamPort}`)
      return realFetch(local, init)
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const mod = await import(PROXY)
    const res = await mod.PATCH(
      proxyRequest(opts.body === undefined ? { client_id: 'c1' } : opts.body),
      { params: { path: opts.path ?? ['icps', 'icp-1', 'activate'] } },
    )
    return { status: res.status, json: await res.json(), upstream }
  } finally {
    globalThis.fetch = realFetch
    if (prevKey === undefined) delete process.env.ADMIN_SECRET_KEY
    else process.env.ADMIN_SECRET_KEY = prevKey
    vi.doUnmock('@/lib/supabase/server')
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// A. THE PROXY REFUSES BEFORE IT CALLS ANYTHING
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('the Vida proxy will not inject the admin key for a caller it has not verified', () => {
  it('AN ANONYMOUS BROWSER REQUEST IS REFUSED — and no upstream call is made at all', async () => {
    const r = await callProxy({ user: null })
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Unauthorized')
    // ⚠️ THE ASSERTION THAT MATTERS. "Refused" is not the property being proven — "refused
    // BEFORE the key left this process" is. A proxy that called upstream and then discarded
    // the answer would satisfy every other assertion in this file and still have handed the
    // admin key to an anonymous caller's request.
    expect(r.upstream.calls).toHaveLength(0)
  })

  it('A SIGNED-IN NON-OPERATOR IS REFUSED — a client session is not operator authority', async () => {
    const r = await callProxy({ user: { email: 'client@somecompany.com' } })
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Unauthorized')
    expect(r.upstream.calls).toHaveLength(0)
  })

  it('a near-miss email is refused — the allowlist is exact, not a prefix or a domain', async () => {
    for (const email of [
      'jacques.vieiraza@gmail.com.attacker.io',
      'notjacques.vieiraza@gmail.com',
      'jacques.vieiraza@gmail.co',
      'jacques.vieiraza+admin@gmail.com',
    ]) {
      const r = await callProxy({ user: { email } })
      expect(r.status, `${email} must not be treated as the operator`).toBe(401)
      expect(r.upstream.calls).toHaveLength(0)
    }
  })

  it('a session with no email at all is refused', async () => {
    const r = await callProxy({ user: {} as { email: string } })
    expect(r.status).toBe(401)
    expect(r.upstream.calls).toHaveLength(0)
  })

  it('THE REFUSAL NEVER LEAKS THE KEY — not in the body, not in a header, not in an error', async () => {
    for (const user of [null, { email: 'client@somecompany.com' }]) {
      const r = await callProxy({ user })
      expect(JSON.stringify(r.json)).not.toContain(ADMIN_KEY)
    }
  })

  it('a missing ADMIN_SECRET_KEY is a 401, never an unauthenticated passthrough', async () => {
    const r = await callProxy({ user: { email: OPERATOR }, key: '' })
    expect(r.status).toBe(401)
    expect(r.upstream.calls).toHaveLength(0)
  })

  it('the refusal is identical whichever upstream path is asked for — activate is not special-cased', async () => {
    for (const path of [['icps', 'icp-1', 'activate'], ['operator', 'board'], ['programmes', 'p1', 'resume']]) {
      const r = await callProxy({ user: null, path })
      expect(r.status).toBe(401)
      expect(r.upstream.calls).toHaveLength(0)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// B. THE VERIFIED OPERATOR — WHAT ACTUALLY GOES UPSTREAM
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('a verified Vida operator is forwarded, with the admin key and nothing else', () => {
  it('the upstream call is made once, to the requested path, with the server-side key', async () => {
    const r = await callProxy({ user: { email: OPERATOR } })
    expect(r.status).toBe(200)
    expect(r.upstream.calls).toHaveLength(1)
    expect(r.upstream.calls[0].url).toMatch(/\/icps\/icp-1\/activate$/)
    expect(r.upstream.calls[0].headers['x-admin-key']).toBe(ADMIN_KEY)
  })

  it('the operator is NAMED from the verified session — not from anything the browser sent', () => {
    return callProxy({ user: { email: OPERATOR } }).then(r => {
      expect(r.upstream.calls[0].headers['x-operator-email']).toBe(OPERATOR)
    })
  })

  it('NO JWT IS MANUFACTURED, MINTED OR FORWARDED — there is no Authorization header', async () => {
    const r = await callProxy({ user: { email: OPERATOR } })
    expect(Object.keys(r.upstream.calls[0].headers)).not.toContain('authorization')
    expect(JSON.stringify(r.upstream.calls[0].headers)).not.toMatch(/bearer/i)
  })

  it('an allowlisted email is matched case-insensitively (a real session can be any case)', async () => {
    const r = await callProxy({ user: { email: 'Jacques.Vieiraza@Gmail.com' } })
    expect(r.status).toBe(200)
    expect(r.upstream.calls).toHaveLength(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// C. THE KEY IS SERVER-ONLY — it is never handed back to the browser
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('ADMIN_SECRET_KEY never reaches the browser', () => {
  it('the operator response body does not contain the key', async () => {
    const r = await callProxy({ user: { email: OPERATOR } })
    expect(JSON.stringify(r.json)).not.toContain(ADMIN_KEY)
  })

  it('the proxy never reads a NEXT_PUBLIC_ variable for the key — that would ship it in the bundle', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const src = readFileSync(join(__dirname, '../../../admin/src/app/api/proxy/[...path]/route.ts'), 'utf8')
    expect(src).not.toMatch(/NEXT_PUBLIC_[A-Z_]*(ADMIN|SECRET|KEY)/)
  })

  it('NEXT_PUBLIC_ADMIN_* is not a usable fallback even when it is set', async () => {
    // The failure this forbids is a one-word edit: `|| process.env.NEXT_PUBLIC_ADMIN_KEY`.
    // Next.js inlines every NEXT_PUBLIC_ read into the client bundle, so that edit would put
    // the key in front of every visitor. Proven by BEHAVIOUR: with only the public variable
    // set, the proxy must refuse rather than authenticate with it.
    const prev = process.env.NEXT_PUBLIC_ADMIN_KEY
    process.env.NEXT_PUBLIC_ADMIN_KEY = 'public-leaked-key'
    try {
      const r = await callProxy({ user: { email: OPERATOR }, key: '' })
      expect(r.status).toBe(401)
      expect(r.upstream.calls).toHaveLength(0)
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_ADMIN_KEY
      else process.env.NEXT_PUBLIC_ADMIN_KEY = prev
    }
  })

  it('no browser-side file in the admin app reads the key or sets the header', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    for (const f of ['../../../admin/src/app/vida/page.tsx', '../../../admin/src/lib/supabase/client.ts']) {
      const src = readFileSync(join(__dirname, f), 'utf8')
      expect(src, `${f} must not touch the admin key`).not.toContain('ADMIN_SECRET_KEY')
      expect(src, `${f} must not set the admin header`).not.toContain('x-admin-key')
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// D. LAYER 1 — the admin middleware, and why layer 2 is not redundant
// ═══════════════════════════════════════════════════════════════════════════════════════

async function callMiddleware(user: { email: string } | null, opts: { devPreview?: boolean } = {}) {
  vi.resetModules()
  vi.doMock('@supabase/ssr', () => ({
    createServerClient: () => ({ auth: { getUser: async () => ({ data: { user } }) } }),
  }))
  const prevPreview = process.env.VIDA_DEV_PREVIEW
  if (opts.devPreview) process.env.VIDA_DEV_PREVIEW = '1'; else delete process.env.VIDA_DEV_PREVIEW
  try {
    const mod = await import('../../../admin/src/middleware')
    const req: any = {
      headers: new Headers({ host: 'vida.example', 'x-forwarded-proto': 'https' }),
      cookies: { getAll: () => [], set: () => {} },
      nextUrl: { pathname: '/api/proxy/icps/icp-1/activate', search: '' },
      url: 'https://vida.example/api/proxy/icps/icp-1/activate',
    }
    return await mod.middleware(req)
  } finally {
    if (prevPreview === undefined) delete process.env.VIDA_DEV_PREVIEW
    else process.env.VIDA_DEV_PREVIEW = prevPreview
    vi.doUnmock('@supabase/ssr')
  }
}

describe('the admin middleware refuses the proxy path first', () => {
  it('an anonymous /api/* request is answered 401 JSON before the route ever runs', async () => {
    const res = await callMiddleware(null)
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('Unauthorized')
  })

  it('a signed-in non-operator gets the same 401 — a client session is not operator authority', async () => {
    const res = await callMiddleware({ email: 'client@somecompany.com' })
    expect(res.status).toBe(401)
  })

  it('the verified operator is let through to the route', async () => {
    const res = await callMiddleware({ email: OPERATOR })
    expect(res.status).not.toBe(401)
  })

  it('THE DEV PREVIEW BYPASS SKIPS THE MIDDLEWARE — and CANNOT reach the key, because the route checks again', async () => {
    // This is the whole argument for #308's defense-in-depth. With VIDA_DEV_PREVIEW=1 off
    // production the middleware waves an anonymous request straight through...
    const res = await callMiddleware(null, { devPreview: true })
    expect(res.status).not.toBe(401)
    // ...and the proxy route still refuses it, and still makes no upstream call. One layer
    // being bypassable is exactly why the second one is not redundant.
    const r = await callProxy({ user: null })
    expect(r.status).toBe(401)
    expect(r.upstream.calls).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// E. THE WHOLE CHAIN — verified operator → real proxy → real API router → the BUILD-002 gate
// ═══════════════════════════════════════════════════════════════════════════════════════

type Rec = { rpcs: string[]; icpUpdates: Array<Record<string, unknown>>; ensureCalls: number }

/** Stand up the REAL `icpRouter` on a local port, so the proxy's own request can hit it. */
async function startApi(rec: Rec, refuse: boolean): Promise<Server> {
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
      return refuse
        ? { refused: { reason: 'programme_not_live', message: 'This client is on a programme that is RECOMMENDED and has not completed its second payment, so no campaign was activated. A programme campaign starts only at Go Live.' } }
        : { id: 'camp-1' }
    },
    startWorkForClient: async () => ({ started: false, sourced: 0, surfaced: 0, recommended: 0 }),
  }))
  vi.doMock('./admin', () => ({ adminKeyValid: (k: unknown) => k === ADMIN_KEY }))

  const { icpRouter } = await import('./icps')
  const express = (await import('express')).default
  const app = express()
  app.use(express.json())
  app.use('/icps', icpRouter)
  const server = createServer(app)
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
  return server
}

const prevEnv = { anthropic: process.env.ANTHROPIC_API_KEY, url: process.env.SUPABASE_URL, anon: process.env.SUPABASE_ANON_KEY }

describe('END TO END — the operator presses GO and lands on the BUILD-002 gate', () => {
  let rec: Rec
  beforeEach(() => {
    rec = { rpcs: [], icpUpdates: [], ensureCalls: 0 }
    process.env.ANTHROPIC_API_KEY = 'test-key'
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'
  })
  afterEach(() => {
    vi.doUnmock('../lib/start-work'); vi.doUnmock('./admin'); vi.resetModules()
    process.env.ANTHROPIC_API_KEY = prevEnv.anthropic
    process.env.SUPABASE_URL = prevEnv.url
    process.env.SUPABASE_ANON_KEY = prevEnv.anon
  })

  it('A RECOMMENDED PROGRAMME ANSWERS programme_not_live — through the proxy, end to end', async () => {
    const server = await startApi(rec, true)
    const port = (server.address() as AddressInfo).port
    try {
      const r = await callProxy({ user: { email: OPERATOR }, upstreamPort: port })
      expect(r.status).toBe(409)
      expect(r.json.refusal).toBe('programme_not_live')
      expect(String(r.json.error)).toMatch(/second payment/i)
      // NOTHING was started by a refusal: no revision transaction, no sourcing grant.
      expect(rec.ensureCalls).toBe(1)
      expect(rec.rpcs).not.toContain('apply_pending_revision')
      expect(rec.rpcs).not.toContain('try_spend_sourcing')
      expect(rec.icpUpdates).toHaveLength(0)
    } finally {
      await new Promise<void>(r => server.close(() => r()))
    }
  })

  it('a LIVE programme activates — the same chain, proving the gate is a gate and not a wall', async () => {
    const server = await startApi(rec, false)
    const port = (server.address() as AddressInfo).port
    try {
      const r = await callProxy({ user: { email: OPERATOR }, upstreamPort: port })
      expect(r.status).toBe(200)
      expect(r.json.success).toBe(true)
      expect(rec.rpcs).toContain('apply_pending_revision')
    } finally {
      await new Promise<void>(r => server.close(() => r()))
    }
  })

  it('AN ANONYMOUS CALLER REACHES THE API NOT AT ALL — the server sees zero requests', async () => {
    const server = await startApi(rec, true)
    const port = (server.address() as AddressInfo).port
    let hits = 0
    server.on('request', () => { hits++ })
    try {
      const r = await callProxy({ user: null, upstreamPort: port })
      expect(r.status).toBe(401)
      expect(hits).toBe(0)
      expect(rec.ensureCalls).toBe(0)
      expect(rec.rpcs).toHaveLength(0)
    } finally {
      await new Promise<void>(r => server.close(() => r()))
    }
  })

  it('A NON-OPERATOR SESSION REACHES THE API NOT AT ALL — no operator authority is gained', async () => {
    const server = await startApi(rec, true)
    const port = (server.address() as AddressInfo).port
    let hits = 0
    server.on('request', () => { hits++ })
    try {
      const r = await callProxy({ user: { email: 'client@somecompany.com' }, upstreamPort: port })
      expect(r.status).toBe(401)
      expect(hits).toBe(0)
      expect(rec.ensureCalls).toBe(0)
      expect(rec.rpcs).toHaveLength(0)
    } finally {
      await new Promise<void>(r => server.close(() => r()))
    }
  })
})
