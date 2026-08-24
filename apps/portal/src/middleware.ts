import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ── #560 — EVERY PUBLIC ROUTE IS PUBLIC ON PURPOSE, AND SAYS SO ──────────────────────────
//
// The portal had three routes reachable with no session and no comment: `consent`,
// `invite/accept` and `share/[token]`. Nothing distinguished "we decided this is public"
// from "nobody thought about it" — and that is the whole problem, because the two look
// identical in a file whose job is deciding who gets in. #478 found `partner-preview`
// exposed to the internet exactly that way.
//
// So the list is written down. A route that is not gated below must appear HERE with a
// reason, and `apps/api/src/lib/portal-public-routes.test.ts` enumerates the app directory
// and FAILS if a route is neither gated nor listed. A new public page cannot be added
// silently again. *(The filename in this comment used to be `middleware.public-routes.test.ts`,
// which is not a file that exists — a pointer to a missing test is worse than none, because it
// reads as proof the check is there.)*
//
// This block is DECLARATIVE — it deliberately does not short-circuit the middleware. An
// early return would skip the session lookup, and `/` and `/login` genuinely need it (a
// signed-in client is bounced to /milla from both). The enforcement is the test.
export const PUBLIC_ROUTES: { path: string; why: string }[] = [
  { path: '/',            why: 'The landing/redirect entry point. Signed-in clients are bounced to /milla below.' },
  { path: '/login',       why: 'It IS the login.' },
  { path: '/onboard',     why: 'A REDIRECT STUB to /milla/welcome, and nothing else (24 Aug). It used to be the sign-up interview; the founder ruled that authentication is all that happens before K.I.N.D, so Milla collects the account facts herself and the clients row is written when she is confirmed. The route survives only so an emailed /auth/callback?next=/onboard link, an old bookmark or a stale tab still lands somewhere sane. Left ungated because gating a redirect buys nothing: it holds no data, reads no session and grants nothing — /milla/welcome is where the real gate is (below), and a logged-out visitor is bounced from there to /login.' },
  { path: '/demo-login',  why: 'Auto-login for a demo account from Vida\'s "Open Demo". Carries a Supabase OTP (?e + ?o) which Supabase itself verifies server-side, so the credential IS the gate — and it signs the current session OUT first so a walkthrough can never land on the founder\'s own account. Must work logged-out by definition.' },
  { path: '/terms',       why: 'Legal. A client must be able to read the terms before they have an account, and after they have lost access to it.' },
  { path: '/privacy',     why: 'Legal, same reason.' },
  { path: '/offline',     why: 'The PWA offline fallback. It renders when there is no network, so it cannot depend on a session lookup.' },
  { path: '/partner-onboarding', why: 'An invited partner starts here from an emailed link and has no session yet — gating it would send them to a login they cannot pass, since their password is the thing this page exists to set. The credential is the invite token, which the API resolves server-side; every step after the password uses the normal auth session, and the page itself grants nothing (it only reads back what the API already knows about that token).' },
  { path: '/auth/reset',  why: 'Setting a new password. The person arriving here is BY DEFINITION someone who cannot sign in, so a session gate would lock the door and put the key behind it. The credential is the one-time code in the emailed link, which /auth/callback exchanges for a session before this page renders; with no session the page says the link expired rather than 404ing, which is what it did before it was built (16 Aug).' },
  { path: '/book/[token]', why: 'A PROSPECT books a meeting from a link in a cold email (#361/#368). They have no account. The 90-day per-lead booking token is HMAC-signed and carries a type claim so it cannot be replayed as an OAuth state, and the requested slot must match one the server actually offered. Same shape as /consent: the token is the credential.' },

  // ── The three #560 asked about, each decided rather than assumed ──────────────────────
  {
    path: '/consent',
    why: 'A PROSPECT lands here from the POPIA consent email — someone who has no account and never will. It carries ?lead + ?token and posts to the public /leads/public/consent endpoint, which verifies the token server-side; the token is the credential, not a session. Gating it would break consent collection outright, and consent is a legal requirement rather than a feature.',
  },
  {
    path: '/invite/accept',
    why: 'MUST be reachable logged-out, and not for the obvious reason: a middleware redirect to /login would DROP THE ?token from the URL, so the invite would be destroyed by the very act of protecting it. The page handles auth itself — it reads the session and renders "login-required" when there is none — and the API takes the accepting user from the auth token server-side rather than a spoofable body param (#266). Nothing is authorised here without a session; it just fails politely instead of vanishing.',
  },
  {
    path: '/share/[token]',
    why: 'A deliberately shareable campaign report, resolved by an unguessable share_token through the public /share/:token endpoint (service-role lookup — the portal\'s anon client cannot read those tables under RLS). Public IS the feature: a client sends the link to their own boss, who has no account. ⚠️ BUT SEE THE INVENTORY NOTE ON #560: the only UI that hands a client a share link lives in (dashboard), which this middleware redirects to /milla for every signed-in client — so no NEW link can be generated today while old tokens still resolve. That is a founder decision (retiring it breaks any link a client has already sent), not a middleware one.',
  },
]

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

  // #560 — DEAD SURFACE FROM A PROCESSOR WE REMOVED. `/billing/confirm` is the Paystack
  // return URL, and Paystack was deleted outright in #352 (a guard test asserts it is gone
  // repo-wide). Stripe returns to /dashboard/billing?stripe=success instead (stripe.ts:214),
  // so NOTHING routes here any more — yet it sat publicly reachable, telling anybody who
  // typed the URL "Payment received".
  //
  // It lives under the `(dashboard)` route GROUP, so its URL is `/billing/confirm` with no
  // `/dashboard` prefix — which is exactly why the gate below never covered it. A route group
  // is invisible in the URL, and that is easy to miss when reasoning about prefixes.
  if (pathname === '/billing/confirm') {
    return NextResponse.redirect(new URL(user ? '/milla/billing' : '/login', base))
  }

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
    // ⚠️ `client-partner` was MISSING here and it made her portal unreachable (found on the
    // founder's walk, 16 Aug). The seat, the API and the page all shipped and were tested —
    // then this line redirected her to /milla, the CLIENT lead desk, which is the one surface
    // R40 says she must never see. A persona list that is not updated when a persona is added
    // does not fail loudly; it silently sends the new person somewhere they do not belong.
    const KEEP = new Set(['partner', 'developer', 'client-partner'])
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
