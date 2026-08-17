import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Handles Supabase email confirmation and password reset links.
// Supabase redirects here with ?code=xxx after the user clicks the link in their email.
// We exchange the code for a session (sets httpOnly cookies on this domain),
// then forward the user to the intended destination.
export async function GET(request: NextRequest) {
  const { searchParams, origin: internalOrigin } = new URL(request.url)
  const code = searchParams.get('code')
  // `next` comes off the query string, so it is attacker-supplied by definition. Only a
  // path on THIS site is a destination — `//evil.com` and `https://evil.com` are not, and a
  // link that signs somebody in and then hands them to another origin is a phishing tool.
  const rawNext = searchParams.get('next')
  const explicitNext = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : null
  const next = explicitNext ?? '/dashboard'

  // Railway forwards to the app over plain HTTP, so request.url's origin is
  // http:// internally — redirecting to it downgrades the browser to "Not
  // Secure". Honour x-forwarded-proto/host to keep the https scheme.
  const fwdProto = request.headers.get('x-forwarded-proto')
  const fwdHost  = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const origin   = fwdProto && fwdHost ? `${fwdProto}://${fwdHost}` : internalOrigin

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll()  { return cookieStore.getAll() },
          setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // ── NO `?code=` IS NOT ALWAYS A BROKEN LINK (16 Aug) ──────────────────────────────────
  //
  // Supabase links come in two shapes, and which one arrives depends on WHICH CLIENT asked
  // for the email. A browser client (`@supabase/ssr`, flowType "pkce") produces `?code=`,
  // which is everything above. A SERVER client (`@supabase/supabase-js`, whose default is
  // flowType "implicit" — the API's `@kind/db`) produces `#access_token=…` instead, and a
  // fragment is never sent to a server. This handler cannot see it and never could.
  //
  // Dead-ending those at `/login?error=confirmation_failed` is exactly what happened to the
  // founder's `inviteUserByEmail` test: the email arrived, the link worked, and he was told
  // his confirmation failed. So when the caller named a destination, forward to it — the
  // browser carries the fragment along to a Location that has none, and the destination
  // page adopts it (see lib/supabase/hash-session.ts).
  //
  // This cannot mask a genuinely dead link: every page reachable this way checks for a
  // session and says the link expired when there is none. A bad link now fails where the
  // person can do something about it instead of at a sign-in they have no password for.
  if (explicitNext) {
    return NextResponse.redirect(`${origin}${explicitNext}`)
  }

  // Nowhere named — send to login with an error flag.
  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
}
