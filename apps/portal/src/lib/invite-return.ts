// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 29 Sep (R174 ① · 4d) — AN INVITED COLLEAGUE COMES BACK TO THEIR INVITE.
//
// The Command Centre seat invite sends a link to `/invite/accept?token=…`. Someone without an
// account is sent to log in or sign up with that page as the way back — and the login page
// ignored it: every sign-up went to the Brief, which creates the colleague's OWN account, and
// the seat then refused them ("already has a workspace"). The invite never gave access.
//
// Only the invite page is accepted as a way back, with a token of the shape the API issues —
// anything else is ignored, so the login page cannot be used to send someone elsewhere.
// ═══════════════════════════════════════════════════════════════════════════════════════

const INVITE_RETURN = /^\/invite\/accept\?token=([A-Za-z0-9]{10,200})$/

/** The invite page to return to after login or sign-up, or null when there is none. */
export function inviteReturn(raw: string | null | undefined): string | null {
  if (!raw) return null
  const m = INVITE_RETURN.exec(raw)
  return m ? `/invite/accept?token=${m[1]}` : null
}

/** The login link an invite page hands to someone who is not signed in. */
export function loginForInvite(token: string): string {
  return `/login?redirect=${encodeURIComponent(`/invite/accept?token=${token}`)}`
}

/** Social sign-in's way back: through `/auth/callback`, which exchanges the code first. */
export function callbackToInvite(origin: string, back: string): string {
  return `${origin}/auth/callback?next=${encodeURIComponent(back)}`
}
