import { db } from '@kind/db'

// ── SENDING A PARTNER THEIR INVITATION — ONE HOME (16 Aug) ───────────────────────────────
//
// THE EVIDENCE THIS IS BUILT ON, not a theory:
//   • The emails the founder actually received all day came from Supabase's own mailer —
//     `resetPasswordForEmail` (apps/portal/src/app/(auth)/login/page.tsx:166) sends, and it
//     reached him every time.
//   • `generateLink` does NOT send anything. It returns a URL. So the previous invite path
//     had exactly one email in it: a Resend send from `partners@get-kind.com`.
//   • `partners@get-kind.com` is used by nothing except the legacy partner programme, which
//     has never been run. Nothing in this repo shows that address ever delivering.
//
// So the invitation now goes through the mailer with evidence behind it. Supabase creates the
// account AND sends the email in one call, which is also less machinery than
// createUser + generateLink + Resend was.
//
// ⚠️ WHAT THIS DOES NOT CLAIM: that Resend is broken. That question is unanswered — it needs
// the Resend dashboard or the Railway logs, neither of which the code can see. This sidesteps
// it rather than betting on which half of it is true. The other partner emails still use
// Resend and are untouched.

export type InviteResult = {
  /** Did Supabase accept the request to send? */
  sent: boolean
  /** Why not, verbatim, when it did not. */
  error?: string
  /** Whether the account existed already — a re-invite rather than a first invitation. */
  existingAccount: boolean
  /** A link the operator can hand over by WhatsApp when email is not cooperating. */
  inviteUrl: string
}

/**
 * Invite a partner, through Supabase.
 *
 * A brand-new address gets `inviteUserByEmail`, which creates the account and emails the
 * invitation — so choosing a password IS signing up, which is what an invitation means.
 *
 * An address that ALREADY has an account cannot be invited again (Supabase refuses, correctly
 * — you cannot invite somebody who is already here). That case gets a password-reset email
 * instead, which is the right primitive for an existing account and is the exact call that has
 * been delivering all day.
 */
export async function invitePartner(o: {
  email: string
  /** Where they land after clicking, e.g. /partner-onboarding?token=… */
  packPath: string
}): Promise<InviteResult> {
  const portalUrl = process.env.PORTAL_URL || 'https://app.get-kind.com'
  // Through the callback that exchanges the one-time code for cookies and honours `next` —
  // the handler already proven on the reset flow. Landing straight on the page would arrive
  // without a session, which is the bug that made the first version of this dead on arrival.
  const redirectTo = `${portalUrl}/auth/callback?next=${encodeURIComponent(o.packPath)}`
  const plainUrl = `${portalUrl}${o.packPath}`

  let existingAccount = false
  let sent = false
  let error: string | undefined

  try {
    const { error: inviteErr } = await (db as any).auth.admin.inviteUserByEmail(o.email, { redirectTo })
    if (!inviteErr) {
      sent = true
    } else {
      const message = inviteErr?.message ?? String(inviteErr)
      // "already been registered" / "already exists" — not a failure, a different situation.
      existingAccount = /already|exists|registered/i.test(message)
      if (!existingAccount) error = message
      console.warn('[partner-invite] inviteUserByEmail:', message)
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
    console.error('[partner-invite] inviteUserByEmail threw:', error)
  }

  if (!sent && existingAccount) {
    try {
      const { error: resetErr } = await (db as any).auth.resetPasswordForEmail(o.email, { redirectTo })
      if (resetErr) {
        error = resetErr?.message ?? String(resetErr)
        console.error('[partner-invite] resetPasswordForEmail:', error)
      } else {
        sent = true
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
      console.error('[partner-invite] resetPasswordForEmail threw:', error)
    }
  }

  // A copyable link, always — so a partner is never stranded by an email problem. Best effort:
  // if the link cannot be generated we hand back the plain page URL, which still identifies
  // her by token even though it will not sign her in.
  let inviteUrl = plainUrl
  try {
    const { data: link } = await (db as any).auth.admin.generateLink({
      type: existingAccount ? 'recovery' : 'invite',
      email: o.email,
      options: { redirectTo },
    })
    if (link?.properties?.action_link) inviteUrl = link.properties.action_link
  } catch (e) {
    console.warn('[partner-invite] no copyable link generated:', e instanceof Error ? e.message : e)
  }

  return { sent, error, existingAccount, inviteUrl }
}
