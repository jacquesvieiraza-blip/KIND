// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CLIENT'S SENDING PANEL — what is going out for them, in numbers they can track.
//
// ⛓️ R187 ② (2 Oct, card #2551): *"yes both. lock"* · a panel for every client: *"Q6. Yes"*.
// The only sending number Milla showed was "20 emails sent · 0 replies". Every client now sees:
// sent today and in total, people left to email, the next send, replies, bounces, opt-outs and
// meetings.
//
// ⚠️ THE SAME DEFINITIONS AS VIDA'S SENDING HEALTH (`sending-health.ts`): a send is a row in
// `figsy_sent_emails` for one of this client's leads; bounces and opt-outs are blocklist rows for
// addresses THIS client emailed (`BOUNCE_REASONS`, `OPT_OUT_REASONS`), so one client never sees
// another's. A number that could not be read is `null` and shows as "—", never as 0.
// ═══════════════════════════════════════════════════════════════════════════════════════

export type SendingPanel = {
  sentToday: number | null
  sentTotal: number | null
  leftToEmail: number | null
  nextSendAt: string | null
  /** ⚑ 3 Oct (review S12) — whether anything CAN go out, from the same gate the sender asks. */
  sendingState: SendingState | null
  replies: number | null
  bounces: number | null
  optOuts: number | null
  meetings: number | null
}

export type SendingState = 'sending' | 'paused' | 'not_started' | 'finished' | 'on_hold'

/**
 * ⚑ 3 Oct (review S12) — "Next send: Due now" WAS SHOWN FOR A PROGRAMME THAT COULD NOT SEND. The
 * date was the earliest `next_send_at` of any enrolment, which knows nothing of a pause, the
 * founder's approval, a changed preparation or a finished programme. The panel now asks the SAME
 * door the sender asks (`checkProgrammeAuthority(…, 'OUTREACH')`) and says why nothing is going.
 * Outside the sending days or hours is not a stop: the next time is still the truth.
 */
export function sendingStateFor(v: { allowed: boolean; reason?: string }): SendingState {
  if (v.allowed) return 'sending'
  switch (v.reason) {
    case 'outside_send_window': return 'sending'
    case 'programme_paused': return 'paused'
    case 'programme_terminal': return 'finished'
    case 'first_payment_missing': case 'second_payment_missing': case 'programme_not_live':
    case 'programme_not_approved': case 'programme_not_run': return 'not_started'
    default: return 'on_hold'
  }
}

const CHUNK = 200

export async function clientSendingPanel(clientId: string, now = new Date()): Promise<SendingPanel> {
  const { db } = await import('@kind/db')
  const { BOUNCE_REASONS, OPT_OUT_REASONS } = await import('./sending-health')
  const { normalizeRevealEmails } = await import('./billing-rules')
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()

  const [todayR, totalR, replyR, campR, toR] = await Promise.all([
    db.from('figsy_sent_emails').select('id, leads!inner(client_id)', { count: 'exact', head: true }).gte('sent_at', startOfToday).eq('leads.client_id', clientId),
    db.from('figsy_sent_emails').select('id, leads!inner(client_id)', { count: 'exact', head: true }).eq('leads.client_id', clientId),
    db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
    db.from('figsy_campaigns').select('id').eq('client_id', clientId).eq('status', 'active'),
    db.from('figsy_sent_emails').select('leads!inner(email, client_id)').eq('leads.client_id', clientId).limit(5000),
  ])

  let leftToEmail: number | null = null
  let nextSendAt: string | null = null
  if (!campR.error) {
    const campaignIds = ((campR.data ?? []) as { id: string }[]).map(c => c.id)
    if (campaignIds.length === 0) leftToEmail = 0
    else {
      const [leftR, nextR] = await Promise.all([
        db.from('figsy_enrollments').select('id', { count: 'exact', head: true }).in('status', ['enrolled', 'in_progress']).in('campaign_id', campaignIds),
        db.from('figsy_enrollments').select('next_send_at').in('status', ['enrolled', 'in_progress']).in('campaign_id', campaignIds)
          .not('next_send_at', 'is', null).order('next_send_at', { ascending: true }).limit(1),
      ])
      leftToEmail = leftR.error ? null : (leftR.count ?? 0)
      nextSendAt = nextR.error ? null : (((nextR.data ?? []) as { next_send_at: string | null }[])[0]?.next_send_at ?? null)
    }
  }

  let bounces: number | null = null
  let optOuts: number | null = null
  if (!toR.error) {
    const emails = normalizeRevealEmails(((toR.data ?? []) as { leads: { email: string | null } | { email: string | null }[] | null }[])
      .map(r => (Array.isArray(r.leads) ? r.leads[0]?.email : r.leads?.email) ?? null))
    const onBlocklist = async (reasons: readonly string[]): Promise<number | null> => {
      let n = 0
      for (let i = 0; i < emails.length; i += CHUNK) {
        const { count, error } = await db.from('opt_out_blocklist').select('email', { count: 'exact', head: true })
          .in('reason', [...reasons]).in('email', normalizeRevealEmails(emails.slice(i, i + CHUNK)))
        if (error) return null
        n += count ?? 0
      }
      return n
    }
    bounces = await onBlocklist(BOUNCE_REASONS)
    optOuts = await onBlocklist(OPT_OUT_REASONS)
  }

  let sendingState: SendingState | null = null
  try {
    const { checkProgrammeAuthority } = await import('./programme-authority')
    sendingState = sendingStateFor(await checkProgrammeAuthority(clientId, 'OUTREACH') as { allowed: boolean; reason?: string })
  } catch { sendingState = null }

  const { clientMeetingCounts } = await import('./meeting-truth')
  const meetingsBy = await clientMeetingCounts([clientId])

  return {
    sentToday: todayR.error ? null : (todayR.count ?? 0),
    sentTotal: totalR.error ? null : (totalR.count ?? 0),
    leftToEmail,
    nextSendAt: sendingState === 'sending' ? nextSendAt : null,
    sendingState,
    replies: replyR.error ? null : (replyR.count ?? 0),
    bounces,
    optOuts,
    meetings: meetingsBy === null ? null : (meetingsBy[clientId] ?? 0),
  }
}
