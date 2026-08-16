import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MillaShell } from '@/components/milla/MillaShell'

// #488 — Milla owns its OWN full-screen shell, OUTSIDE the (dashboard) route group, so it
// never inherits the old portal chrome (sidebar/agent column). Auth is enforced by the
// middleware (/milla → login) + the dev-only MILLA_DEV_PREVIEW bypass for the harness.
// Design ref: docs/mv-previews/milla2.html.
//
// ── 16 Aug — MILLA ALSO HAS TO KNOW *WHO* ITS VISITOR IS ──────────────────────────────
// The middleware answers "is there a session", which is not the same question. On the
// founder's walk, the Client Partner seat opened /dashboard/leads; the middleware rewrote
// that to /milla (correct for a client, and it cannot tell her apart without a lookup) and
// she landed in the CLIENT console — with the onboarding tour explaining her $299 pack and
// a wallet card. Nothing leaked: the API resolves the client from her token, so the page
// could only say "Client not found". But R40 keeps her out of client surfaces entirely, and
// a console that cannot load anything for her is not somewhere to leave a person standing.
//
// The check runs HERE rather than in the middleware because this is where every route into
// Milla converges — a typed URL, the /dashboard rewrite, an old bookmark — and because
// answering "who is this" needs a lookup the middleware would then repeat on every asset
// request.
//
// Two things it is deliberately careful about:
//   • It only redirects someone with NO client row. Anyone who is both a client and a
//     partner (the founder is) keeps Milla exactly as it is today.
//   • It only acts on a CONFIRMED-empty lookup, never a failed one. Treating a query error
//     as "no account" is what caused the onboard⇄dashboard loop recorded in the dashboard
//     layout, and the same trap is live here.
export const dynamic = 'force-dynamic'

export default async function MillaLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: clientRow, error } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    // No client account AND the lookup actually succeeded → Milla cannot render anything for
    // this person. If they hold a seat, send them to their own portal; if they do not, leave
    // them exactly where today's product puts them (nothing about a half-finished signup
    // changes here).
    if (!clientRow && !error) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
          const res = await fetch(`${apiUrl}/partners/me`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
            signal: AbortSignal.timeout(4000),
          })
          if (res.ok) {
            const seat = await res.json().catch(() => ({}))
            redirect(seat?.seat_type === 'client_partner' ? '/dashboard/client-partner' : '/dashboard/partner')
          }
        }
      } catch (e) {
        // redirect() signals by throwing — never swallow it. Anything else (a timeout, a
        // wobbling API) means we simply do not know, and the safe answer is to render Milla
        // as before rather than bounce someone somewhere on a guess.
        if (e && typeof e === 'object' && 'digest' in e && String((e as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) throw e
      }
    }
  }

  return <MillaShell>{children}</MillaShell>
}
