'use client'

import { createClient } from './client'

/**
 * ADOPT A SESSION THAT ARRIVED IN THE URL FRAGMENT (#access_token=…).
 *
 * ── WHY THIS EXISTS (16 Aug, found by reading the SDK rather than the flow) ──────────────
 *
 * Supabase has two link shapes, and which one you get is decided by WHICH CLIENT asked for
 * the email — not by the kind of email:
 *
 *   • The BROWSER client (`@supabase/ssr` → `createBrowserClient`) defaults to `flowType:
 *     "pkce"`. It stores a code_verifier in a cookie and the emailed link comes back as
 *     `?code=…`, which `/auth/callback` exchanges for cookies. This is the founder's working
 *     walk: "i created a seat. recieved the email clicked reset password and was in. simple."
 *
 *   • The SERVER client (`@supabase/supabase-js` → `createClient`, which is what `@kind/db`
 *     builds) defaults to `flowType: "implicit"` — see DEFAULT_OPTIONS in auth-js. It sends
 *     `code_challenge: null`, so the link comes back with the session in the URL FRAGMENT:
 *     `#access_token=…&refresh_token=…&type=recovery`.
 *
 * A fragment is never sent to a server. `/auth/callback` is a route handler; it reads
 * `?code=` and can no more see the hash than it can see the user's screen. So every
 * SERVER-initiated invitation lands on "confirmation failed" — which is exactly what the
 * founder hit with `inviteUserByEmail`, the same evening, for the same reason. The mechanism
 * changed; the defect did not.
 *
 * Nor does the browser client rescue it on arrival: `detectSessionInUrl` refuses a fragment
 * when the client is PKCE, throwing "Not a valid PKCE flow url" (GoTrueClient
 * `_getSessionFromURL`). The tokens have to be adopted deliberately, which is this function.
 *
 * `setSession` writes the `@supabase/ssr` cookies, so the middleware and every server
 * component see her signed in — not just this tab.
 */
export type HashSession =
  | { kind: 'adopted' }
  /** No tokens in the fragment — a normal page load, or a PKCE link the callback handled. */
  | { kind: 'none' }
  /** Supabase said no (expired, already used). Her words, not a stack trace. */
  | { kind: 'error'; message: string }

export async function adoptSessionFromHash(): Promise<HashSession> {
  if (typeof window === 'undefined') return { kind: 'none' }

  const raw = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
  if (!raw) return { kind: 'none' }

  const p = new URLSearchParams(raw)

  // Supabase reports a dead link in the fragment too, and it must not read as "no link".
  const err = p.get('error_description') || p.get('error')
  const access_token = p.get('access_token')
  const refresh_token = p.get('refresh_token')

  // Clear the fragment either way: these are credentials, and leaving them in the address bar
  // means they survive a screenshot, a bookmark and the browser history.
  const strip = () => {
    const url = `${window.location.pathname}${window.location.search}`
    window.history.replaceState(window.history.state, '', url)
  }

  if (err) { strip(); return { kind: 'error', message: err } }
  if (!access_token || !refresh_token) return { kind: 'none' }

  try {
    const { error } = await createClient().auth.setSession({ access_token, refresh_token })
    strip()
    if (error) return { kind: 'error', message: error.message }
    return { kind: 'adopted' }
  } catch (e) {
    strip()
    return { kind: 'error', message: e instanceof Error ? e.message : 'That link could not be used.' }
  }
}
