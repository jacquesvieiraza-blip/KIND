// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CLIENT IS TOLD WHEN A PROSPECT SOUNDS INTERESTED — by email and on their phone.
//
// ⛓️ FOUNDER-RULED 2 Oct (R191, chains R87 — which had kept "Reply received" as "Soon"):
// *"Only interested replies"*. The client hears about a reply only when the prospect sounds
// interested, and the message takes them to their Inbox. A "no thanks", an out-of-office or a
// bounce sends them nothing.
//
// ⚠️ "INTERESTED" MEANS WHAT THE INBOX MEANS BY IT. The portal Inbox (`apps/portal/src/lib/
// inbox.ts`) files `hot`, `warm` and `interested` under "Interested"; the alert uses the same
// three, so the client is never told "someone is interested" about a reply their Inbox files
// somewhere else.
//
// ⚠️ THE REPLY BODY IS NEVER IN THE ALERT (R132: *"Do not expose reply body in a generic
// list"*). It says who replied and where to read it.
//
// ⚠️ BEST-EFFORT, AND NEVER IN THE WEBHOOK'S WAY. The reply is already stored when this runs;
// a failure here is logged and costs a nudge, never the reply.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { mayNotify } from './programme-notifications'

/** The classifications the Inbox files under "Interested". */
export const INTERESTED_CLASSIFICATIONS = ['hot', 'warm', 'interested'] as const

export function isInterestedReply(classification: string | null | undefined): boolean {
  return classification != null && (INTERESTED_CLASSIFICATIONS as readonly string[]).includes(classification)
}

/** The Inbox every alert links to. */
export function inboxLink(portalUrl: string | undefined = process.env.PORTAL_URL): string {
  return `${(portalUrl || 'https://app.get-kind.com').replace(/\/+$/, '')}/milla/replies`
}

/** The one set of words — the email and the phone alert both read them from here. */
export function interestedReplyNotice(args: {
  clientCompany: string | null
  prospectName: string | null
  prospectCompany: string | null
  link: string
}) {
  const name = args.prospectName?.trim() || 'A prospect'
  const who = args.prospectCompany?.trim() ? `${name} at ${args.prospectCompany.trim()}` : name
  return {
    subject: `${who} replied and sounds interested`,
    greeting: `Hi ${args.clientCompany?.trim() || 'there'},`,
    line: `${who} replied to your outreach and sounds interested. Open your Inbox to read their reply.`,
    button: 'Open your Inbox',
    link: args.link,
    pushTitle: 'Someone sounds interested',
    pushBody: `${who} replied to your outreach.`,
  }
}

export type InterestedNoticeOutcome = 'sent' | 'not_interested' | 'switched_off' | 'unreadable'

/**
 * Tell the client about one stored reply, if it sounds interested and their switch is on.
 * Call it once per STORED reply (never for a redelivery whose insert lost), so one reply is
 * one alert.
 */
export async function notifyClientOfInterestedReply(args: {
  clientId: string
  leadId: string
  classification: string | null
}): Promise<InterestedNoticeOutcome> {
  if (!isInterestedReply(args.classification)) return 'not_interested'
  const { db } = await import('@kind/db')

  const { data: client, error } = await db.from('clients')
    .select('company_name, user_id').eq('id', args.clientId).maybeSingle()
  if (error || !client) {
    console.error(`[interested-reply] client ${args.clientId} could not be read (${error?.message ?? 'no row'}) — they were not told about an interested reply.`)
    return 'unreadable'
  }
  // ⚠️ THE SWITCH IS READ ON ITS OWN, so a database without the column yet (migration
  // 20261002_reply_received_pref not applied) reads as "never chose" = on, instead of
  // silencing every alert until the migration runs.
  const { data: prefRow, error: prefErr } = await db.from('clients')
    .select('reply_received_emails_enabled').eq('id', args.clientId).maybeSingle()
  const pref = prefErr ? null
    : (prefRow as { reply_received_emails_enabled?: boolean | null } | null)?.reply_received_emails_enabled ?? null
  // `reply_received` is not a retired notification, so the programme answer does not decide it.
  if (!mayNotify('reply_received', { onProgramme: null, pref })) return 'switched_off'

  const { data: lead } = await db.from('leads')
    .select('first_name, last_name, company').eq('id', args.leadId).maybeSingle()
  const l = lead as { first_name?: string | null; last_name?: string | null; company?: string | null } | null
  const notice = interestedReplyNotice({
    clientCompany: (client as { company_name?: string | null }).company_name ?? null,
    prospectName: [l?.first_name, l?.last_name].filter(Boolean).join(' ') || null,
    prospectCompany: l?.company ?? null,
    link: inboxLink(),
  })

  const userId = (client as { user_id?: string | null }).user_id
  if (userId) {
    try {
      const { data: { user } } = await db.auth.admin.getUserById(userId)
      if (user?.email) {
        const { sendInterestedReplyEmail } = await import('./email')
        await sendInterestedReplyEmail(user.email, notice)
      }
    } catch (err) {
      console.error('[interested-reply] the email to the client failed —', err instanceof Error ? err.message : err)
    }
  }
  try {
    const { sendPushToClient } = await import('./push')
    await sendPushToClient(args.clientId, {
      title: notice.pushTitle, body: notice.pushBody, url: '/milla/replies', tag: 'interested-reply',
    })
  } catch (err) {
    console.error('[interested-reply] the phone alert failed —', err instanceof Error ? err.message : err)
  }
  return 'sent'
}
