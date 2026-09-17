// ══════════════════════════════════════════════════════════════════════════════════════════
// C-6 · THE ADMIN GATE — ONE PATH IS PUBLIC, AND EXACTLY ONE
//
// ── WHAT EARNED THIS FILE ───────────────────────────────────────────────────────────────
//
// XC-4/XC-11 require all four services to name the commit they are running, and
// `scripts/ship.sh` reads each one with **plain curl and no Supabase session**. The admin
// middleware treated only `/login` and `/auth*` as public, so `/api/health` answered 401 and
// the admin leg of that confirmation could never succeed in production. Nothing caught it:
// the unit suite never executed the middleware, and the release checklist's own step 4 was
// the thing being broken. It took booting the real Next process in the full-stack harness
// (`❌ CHECK 1 — ADMIN is unreadable (401 from its own middleware)`) to surface it.
//
// ── WHY THIS TEST EXECUTES THE MIDDLEWARE INSTEAD OF READING IT ─────────────────────────
//
// A source-text assertion ("the file contains '/api/health'") would pass for a prefix match,
// a regex, a header bypass or a line inside a comment — every shape this correction is
// forbidden to take. The middleware is therefore CALLED, with a real `NextRequest` and an
// unauthenticated Supabase client, and judged on what it returns.
//
// 🛑 THE SECOND HALF IS THE IMPORTANT HALF. Making a path public is a security change, and
// the boundary that matters is `/api/proxy/*`: that route injects `ADMIN_SECRET_KEY` into
// upstream calls, which is the confused-deputy hole #308 closed. So this file spends most of
// its assertions proving the gate STILL SHUTS — on the proxy, on sibling paths, on
// lookalikes like `/api/healthz` and `/api/health/detail`, and on pages.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// The middleware builds a Supabase server client and asks it for a user. Every case here is
// UNAUTHENTICATED, which is the state `ship.sh` reads in: no cookie, no session, no user.
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  }),
}))

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-for-this-test'
  // ⚠️ THE DEV BYPASS MUST BE OFF, OR THIS FILE PROVES NOTHING. `middleware.ts` returns
  // `next()` unconditionally when NODE_ENV !== 'production' AND VIDA_DEV_PREVIEW === '1' —
  // under which every assertion below would "pass" because the gate never ran.
  delete process.env.VIDA_DEV_PREVIEW
})
afterEach(() => { process.env = { ...ORIGINAL_ENV } })

/** A request as Railway's edge delivers it: TLS terminated, `x-forwarded-proto: https`. */
async function call(pathname: string, method = 'GET') {
  const { NextRequest } = await import('next/server')
  const { middleware } = await import('./middleware')
  const req = new NextRequest(`https://admin.kind.test${pathname}`, {
    method,
    headers: { 'x-forwarded-proto': 'https', host: 'admin.kind.test' },
  })
  return middleware(req)
}

describe('C-6 · the admin middleware makes /api/health public and nothing else', () => {
  it('🛑 lets an UNAUTHENTICATED caller read /api/health — the read ship.sh actually performs', async () => {
    const res = await call('/api/health')
    expect(res.status).not.toBe(401)
    expect(res.status).toBeLessThan(400)
    // Not a redirect to /login either: `ship.sh` follows nothing and parses JSON.
    expect(res.headers.get('location')).toBeNull()
  })

  it('🛑 STILL REFUSES /api/proxy/* — the key-injecting route #308 closed', async () => {
    for (const p of ['/api/proxy/operator/migrations/run', '/api/proxy/operator/tasks', '/api/proxy']) {
      const res = await call(p, 'POST')
      expect(res.status, `${p} must stay gated`).toBe(401)
      await expect(res.json()).resolves.toMatchObject({ success: false, error: 'Unauthorized' })
    }
  })

  it('🛑 refuses every OTHER /api path — the change is one path, not a category', async () => {
    for (const p of ['/api/clients', '/api/revenue', '/api/operator/tasks', '/api/internal/keys']) {
      const res = await call(p)
      expect(res.status, `${p} must stay gated`).toBe(401)
    }
  })

  it('🛑 IS AN EXACT MATCH, NOT A PREFIX — a lookalike path must not inherit the exemption', async () => {
    // The whole risk of this correction is a `startsWith`. `/api/health/detail` and
    // `/api/healthz` are the two shapes that would silently become public under one.
    for (const p of ['/api/health/detail', '/api/healthz', '/api/health-internal', '/api/healthcheck']) {
      const res = await call(p)
      expect(res.status, `${p} must NOT be public`).toBe(401)
    }
  })

  it('still redirects unauthenticated PAGE loads to /login', async () => {
    const res = await call('/vida/clients-admin')
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('leaves the two pre-existing public paths exactly as they were', async () => {
    for (const p of ['/login', '/auth/callback']) {
      const res = await call(p)
      expect(res.status, `${p} was public before C-6 and stays public`).toBeLessThan(400)
    }
  })
})
