// #368 / #361b — HMAC-signed, self-verifying tokens for the calendar feature.
//
// Two uses, one signing primitive:
//   • OAuth STATE (CSRF) — the `state` round-tripped through Google's consent screen.
//     The old code used raw base64(clientId) (routes/calendar.ts), so an attacker could
//     forge a victim's clientId and bind THEIR Google account to the victim's row. A
//     signed, short-lived state closes that (#368).
//   • BOOKING TOKEN — the per-lead link FIGSY drops in a cold email so a prospect can
//     self-book WITHOUT logging in. The token binds leadId→clientId (both signed), so
//     it is the authorization: no session, no cross-tenant reach.
//
// Both are `<base64url(payload)>.<base64url(hmac)>`, HMAC-SHA256 over the payload with
// ADMIN_SECRET_KEY (already provisioned — no new env var), compared with timingSafeEqual,
// and carry an `exp` so a leaked/replayed value eventually dies.

import crypto from 'crypto'

function secret(): string {
  const s = process.env.ADMIN_SECRET_KEY
  if (!s) throw new Error('ADMIN_SECRET_KEY not set — cannot sign/verify calendar tokens')
  return s
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlDecode(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

function sign(payloadObj: Record<string, unknown>, ttlMs: number): string {
  const body = { ...payloadObj, exp: Date.now() + ttlMs }
  const payload = b64url(Buffer.from(JSON.stringify(body)))
  const sig = b64url(crypto.createHmac('sha256', secret()).update(payload).digest())
  return `${payload}.${sig}`
}

function verify<T extends Record<string, unknown>>(token: string): T | null {
  if (typeof token !== 'string' || !token.includes('.')) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = b64url(crypto.createHmac('sha256', secret()).update(payload).digest())
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  // timingSafeEqual throws on unequal lengths — guard first, and a length mismatch is
  // itself a rejection.
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  let obj: Record<string, unknown>
  try {
    obj = JSON.parse(b64urlDecode(payload).toString('utf-8')) as Record<string, unknown>
  } catch {
    return null
  }
  if (typeof obj.exp !== 'number' || Date.now() > obj.exp) return null
  return obj as T
}

const STATE_TTL = 10 * 60_000                 // 10 minutes — an OAuth round-trip is seconds
const BOOK_TTL  = 90 * 24 * 60 * 60 * 1_000   // 90 days — a cold-email link must outlive the sequence

// ── OAuth CSRF state (#368) ────────────────────────────────────────────────────
export function signOAuthState(clientId: string): string {
  return sign({ c: clientId, n: crypto.randomBytes(9).toString('hex') }, STATE_TTL)
}
export function verifyOAuthState(state: string): { clientId: string } | null {
  const p = verify<{ c?: unknown }>(state)
  return p && typeof p.c === 'string' && p.c.length >= 10 ? { clientId: p.c } : null
}

// ── Prospect booking token (#361b) ─────────────────────────────────────────────
export function signBookingToken(input: { leadId: string; clientId: string; enrollmentId?: string | null }): string {
  return sign(
    { l: input.leadId, c: input.clientId, ...(input.enrollmentId ? { e: input.enrollmentId } : {}), n: crypto.randomBytes(6).toString('hex') },
    BOOK_TTL,
  )
}
export function verifyBookingToken(token: string): { leadId: string; clientId: string; enrollmentId: string | null } | null {
  const p = verify<{ l?: unknown; c?: unknown; e?: unknown }>(token)
  if (!p || typeof p.l !== 'string' || typeof p.c !== 'string') return null
  return { leadId: p.l, clientId: p.c, enrollmentId: typeof p.e === 'string' ? p.e : null }
}

// The URL FIGSY embeds per lead. Returns the tokenised booking page when the client has
// connected Google Calendar (calendar_booking_enabled); otherwise the client's static
// booking_url (or null). Never throws — if ADMIN_SECRET_KEY is unset it falls back to the
// static link so the enroll/send path is unaffected.
export function bookingUrlForLead(
  client: { calendar_booking_enabled?: boolean | null; booking_url?: string | null } | null,
  leadId: string,
  clientId: string,
): string | null {
  if (client?.calendar_booking_enabled && process.env.ADMIN_SECRET_KEY) {
    const base = process.env.PORTAL_URL ?? 'http://localhost:3000'
    return `${base}/book/${signBookingToken({ leadId, clientId })}`
  }
  return client?.booking_url ?? null
}
