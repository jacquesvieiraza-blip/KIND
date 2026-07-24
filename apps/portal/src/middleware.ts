import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // #488 — DEV-ONLY Milla preview bypass (never in production). Lets the screenshot harness
  // load /milla with mocked data — no Supabase session. Double-guarded: NODE_ENV must not be
  // 'production' AND the operator must opt in with MILLA_DEV_PREVIEW=1. Cannot fire on Railway.
  if (process.env.NODE_ENV !== 'production' && process.env.MILLA_DEV_PREVIEW === '1') {
    return NextResponse.next({ request })
  }

  // Railway terminates TLS at the edge and forwards to the app over plain HTTP.
  // If the client actually arrived over http, x-forwarded-proto is 'http' — bump
  // them to https at the entry point so no downstream redirect can land on http
  // (which shows "Not Secure"). Done first, before any other work.
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

  const { pathname } = request.nextUrl

  // Railway terminates TLS at the edge and forwards to the app over plain HTTP,
  // so request.url is http:// internally. Building redirects from it downgrades
  // the browser to http (→ "Not Secure"). Honour x-forwarded-proto/host so the
  // Location header keeps the https scheme the client actually arrived on.
  const fwdProto = request.headers.get('x-forwarded-proto')
  const fwdHost  = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const base = fwdProto && fwdHost ? `${fwdProto}://${fwdHost}` : request.url

  if (!user && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', base))
  }

  // #488 — Milla (the client lead desk) requires a signed-in client.
  if (!user && pathname.startsWith('/milla')) {
    return NextResponse.redirect(new URL('/login', base))
  }

  // #478 — partner-preview was PUBLIC (no login) → a fake partner dashboard exposed to
  // the whole internet. Require auth at minimum so it can't be reached anonymously.
  if (!user && pathname.startsWith('/partner-preview')) {
    return NextResponse.redirect(new URL('/login', base))
  }

  // #478 — the /v2 tree is ~21 mock/demo screens (including a fake signup) that any
  // logged-in client could reach by typing the URL. Gate it behind an explicit preview
  // allowlist (V2_PREVIEW_EMAILS, comma-separated). Unset = nobody → clients never see
  // the mocks; the real V2 home (DashboardHomeV2 at /dashboard) is unaffected.
  if (pathname === '/v2' || pathname.startsWith('/v2/')) {
    const allow = (process.env.V2_PREVIEW_EMAILS || '')
      .toLowerCase().split(',').map((s) => s.trim()).filter(Boolean)
    const email = (user?.email || '').toLowerCase()
    if (!user || !allow.includes(email)) {
      return NextResponse.redirect(new URL('/milla', base))
    }
  }

  // ── WORK MODEL — the old /dashboard portal is retired for clients. Milla (/milla)
  // is the ONLY client console. Any surviving link into /dashboard (from a legacy page
  // embedded in the Milla shell, or a shared component) is transparently rewritten into
  // the matching /milla screen, so a client can never be thrown back to the old portal.
  // The partner + developer sub-trees are separate personas → left reachable.
  if (user && (pathname === '/dashboard' || pathname.startsWith('/dashboard/'))) {
    const seg = pathname.split('/')[2] || ''            // /dashboard/<seg>/...
    const KEEP = new Set(['partner', 'developer'])
    if (!KEEP.has(seg)) {
      const MAP: Record<string, string> = {
        '':           '/milla',              // old portal home → New leads
        'figsy':      '/milla/campaign',
        'figsy-chat': '/milla/chat',
        'leads':      '/milla',
        'inbox':      '/milla',
        'billing':    '/milla/billing',
        'kpis':       '/milla/performance',
        'settings':   '/milla/settings',
        'company':    '/milla/command-centre',
        'usage':      '/milla/usage',
        'analytics':  '/milla/analytics',
        'roi':        '/milla/roi',
        'referral':   '/milla/referral',
        'documents':  '/milla/documents',
        'team':       '/milla/teams',
        'knowledge':  '/milla/icp',
        'messages':   '/milla/chat',
      }
      return NextResponse.redirect(new URL(MAP[seg] ?? '/milla', base))
    }
  }

  if (user && (pathname === '/login' || pathname === '/')) {
    return NextResponse.redirect(new URL('/milla', base))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
