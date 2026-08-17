import { db } from '@kind/db'

// ── SENDING A PARTNER THEIR WAY IN — ONE HOME ───────────────────────────────────────────
//
// THE ONE PATH THE FOUNDER HAS ACTUALLY WALKED, END TO END, MORE THAN ONCE:
// the account exists, Supabase sends its password email, he clicks it, he is in.
// His words after testing it: "i created a seat. recieved the email clicked reset password
// and was in. simple."
//
// Everything else tried tonight failed somewhere he could see:
//   • Resend from partners@get-kind.com — the screen said "Invited", no email ever arrived
//   • Supabase inviteUserByEmail — the email arrived, and its link bounced him to sign-in
//     with "confirmation failed", because an admin-generated invite comes back in a URL
//     fragment and /auth/callback can only read a `?code=` query parameter
//
// So this does the proven thing and nothing else. There is no branching, no second
// mechanism, no clever fallback — one email, the same one, for every seat.
//
// ⚠️ THE ACCOUNT MUST EXIST FIRST. Supabase's password email does NOT error for an unknown
// address — it silently sends nothing, deliberately, so nobody can probe which emails are
// registered. Delete the createUser below and a brand-new partner gets no email at all and
// no error either, which is exactly the shape of failure that cost this evening.

export type InviteResult = {
  /** Did Supabase accept the request to send? */
  sent: boolean
  /** Why not, verbatim, when it did not. */
  error?: string
  /** The auth user id when this call created it; null when the account already existed. */
  userId: string | null
  /** A link the operator can hand over by WhatsApp when email is not cooperating. */
  inviteUrl: string
}

/**
 * Give a partner their way in: make sure the account exists, then send the Supabase password
 * email — the link the founder has clicked and got through.
 */
export async function invitePartner(o: {
  email: string
  /** Where they land after clicking, e.g. /partner-onboarding?token=… */
  packPath: string
}): Promise<InviteResult> {
  const portalUrl = process.env.PORTAL_URL || 'https://app.get-kind.com'
  // Through the callback that exchanges the one-time code for cookies and honours `next`.
  // Proven: this is the redirect the founder's own working walk went through.
  const redirectTo = `${portalUrl}/auth/callback?next=${encodeURIComponent(o.packPath)}`

  // 1 — THE ACCOUNT. A password nobody is ever told, because the email they receive is how
  // they set their own. An existing account is not an error: she may already have signed in
  // for something else, and the email below works either way.
  let userId: string | null = null
  try {
    const { data: userData, error: userErr } = await db.auth.admin.createUser({
      email: o.email,
      email_confirm: true,
      password: `Kp${Math.random().toString(36).slice(2, 12)}!${Math.random().toString(36).slice(2, 6)}`,
    })
    if (userErr) console.warn('[partner-invite] account not created (may already exist):', userErr.message)
    else userId = userData.user?.id ?? null
  } catch (e) {
    console.error('[partner-invite] createUser threw:', e instanceof Error ? e.message : e)
  }

  // 2 — THE EMAIL. The reason is captured either way: an operator told "invited" about an
  // email that does not exist is how this evening went.
  let sent = false
  let error: string | undefined
  try {
    const { error: mailErr } = await (db as any).auth.resetPasswordForEmail(o.email, { redirectTo })
    if (mailErr) {
      error = mailErr?.message ?? String(mailErr)
      console.error('[partner-invite] password email refused:', error)
    } else {
      sent = true
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
    console.error('[partner-invite] password email threw:', error)
  }

  // 3 — A LINK, ALWAYS. Best effort: if it cannot be generated we hand back the plain page
  // URL, which still identifies her by token even though it will not sign her in. An
  // undeliverable address must never become a seat nobody can occupy.
  let inviteUrl = `${portalUrl}${o.packPath}`
  try {
    const { data: link } = await (db as any).auth.admin.generateLink({
      type: 'recovery', email: o.email, options: { redirectTo },
    })
    if (link?.properties?.action_link) inviteUrl = link.properties.action_link
  } catch (e) {
    console.warn('[partner-invite] no copyable link generated:', e instanceof Error ? e.message : e)
  }

  return { sent, error, userId, inviteUrl }
}
