import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// #308 — the admin OS had NO authentication: every page and the key-injecting
// /api/proxy route were reachable by anyone who knew the URL. This gate requires a
// signed-in Supabase user whose email is on the admin allowlist (founder-only by
// default; override with ADMIN_ALLOWED_EMAILS). Unauthenticated page loads → /login;
// unauthenticated /api/* calls → 401 JSON (so the proxy can't be a confused deputy).

const ALLOWED = (process.env.ADMIN_ALLOWED_EMAILS || 'jacques.vieiraza@gmail.com')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

export async function middleware(request: NextRequest) {
  // DEV-ONLY preview bypass (never in production). Lets the screenshot harness load
  // /vida with mocked data — no Supabase session — so we can capture the REAL app UI
  // before merge. Double-guarded: NODE_ENV must not be 'production' AND the operator
  // must opt in with VIDA_DEV_PREVIEW=1. Cannot fire on Railway (NODE_ENV=production).
  if (process.env.NODE_ENV !== 'production' && process.env.VIDA_DEV_PREVIEW === '1') {
    return NextResponse.next({ request })
  }

  // Railway terminates TLS at the edge; keep redirects on https.
  const proto = request.headers.get('x-forwarded-proto')
  const host  = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (proto === 'http' && host) {
    return NextResponse.redirect(
      new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, `https://${host}`),
      308,
    )
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const allowed = !!user && ALLOWED.includes((user.email ?? '').toLowerCase())

  const { pathname } = request.nextUrl
  const fwdProto = request.headers.get('x-forwarded-proto')
  const fwdHost  = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const base = fwdProto && fwdHost ? `${fwdProto}://${fwdHost}` : request.url

  // Public paths: the login page + Supabase's own auth callback + the build-identity read.
  //
  // 🛑 `/api/health` IS AN EXACT MATCH, DELIBERATELY (C-6, founder-approved 17 Sep).
  //
  // XC-4/XC-11 require all four services to name the commit they are running, and
  // `scripts/ship.sh` reads each one with plain curl and NO Supabase session. With every
  // `/api` path gated, this one answered 401 and the admin leg of that confirmation could
  // never succeed in production — found by booting the real process in the full-stack
  // harness, not by reading code.
  //
  // ⚠️ `===`, NEVER `startsWith`. A prefix would also exempt `/api/health/detail` and
  // `/api/healthz`, and the next route someone adds under that path would be public without
  // anybody deciding it. `middleware.test.ts` asserts those lookalikes stay 401.
  //
  // ⚠️ IT EXEMPTS NOTHING ELSE, AND `/api/proxy/*` IS THE REASON. That route injects
  // ADMIN_SECRET_KEY into upstream calls — the confused-deputy hole #308 closed — so it stays
  // gated along with every other `/api` path. The route this exempts returns only
  // `status/service/commit/commitSource/ts`: a liveness read that discloses no client data,
  // no keys and no PII.
  const isPublic = pathname === '/login' || pathname.startsWith('/auth') || pathname === '/api/health'

  if (!allowed && !isPublic) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', base))
  }

  // Already signed in + allowed → bounce away from the login page.
  if (allowed && pathname === '/login') {
    return NextResponse.redirect(new URL('/', base))
  }

  // The admin app IS Vida now — /vida is the ONLY operator console. The legacy top-level
  // routes below still exist as the SOURCE pages the /vida/* wrappers embed (same pattern
  // as the portal's old /dashboard tree), so a bookmarked or hand-typed link into one of
  // them would drop the operator out of the Vida shell (no top bar, no rail) — the same
  // class of bug fixed on the client side in #1145. Transparently rewrite into the Vida
  // twin so that can never happen, current routes and any future ones alike.
  if (allowed) {
    const seg = pathname.split('/')[1] || ''
    const LEGACY_TO_VIDA: Record<string, string> = {
      clients: 'clients-admin', unibox: 'unibox', revenue: 'revenue', ops: 'ops',
      compliance: 'compliance', outreach: 'outreach', cockpit: 'cockpit', billing: 'billing',
      health: 'health', 'money-path': 'money-path', gtm: 'gtm', founder: 'founder',
    }
    if (LEGACY_TO_VIDA[seg]) {
      const rest = pathname.slice(seg.length + 1) // keep /:id etc.
      return NextResponse.redirect(new URL(`/vida/${LEGACY_TO_VIDA[seg]}${rest}${request.nextUrl.search}`, base))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
