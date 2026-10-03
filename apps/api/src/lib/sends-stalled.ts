// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 2 Oct (R185 ⑥ · card #2547 · S7 part c) — "SENDING HAS STALLED" ONLY WHEN IT HAS.
//
// The founder (R185 ⑥): *"Alerts and logs tell the truth — no 'stalled' alert when nothing was
// allowed to send"* (*"yes. lock"*).
//
// 🛑 WHAT WAS WRONG. The hourly watchdog fired whenever ANY enrolment anywhere was overdue and
// no email at all had gone out in six hours. It never asked whether anything was ALLOWED to send:
// a paused programme, a campaign that is not active, a programme armed but never run, a weekend
// — each read as a stall. That was about eighteen alerts every weekday, and one every hour while
// House was paused. An alarm that rings every hour is an alarm nobody hears.
//
// NOW, PER CLIENT: a client is stalled only when it has work due on an ACTIVE campaign, its
// programme's own authority would let it send right now (the same `authorityFor` the send gate
// asks), its programme has actually been run, it is a weekday in the UK, and yet none of its
// campaigns has sent anything in six hours. The alert names the client, is raised ONCE per
// stall (an open Vida task means it has already been said), and closes itself when sending
// resumes — so the next stall is news again.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'

export const STALL_WINDOW_HOURS = 6

export type StallVerdict = {
  /** Clients that should have sent and did not. */
  stalled: { clientId: string; due: number }[]
  /** Clients that had work due and DID send — any open stall task for them can close. */
  sending: string[]
}

/** Monday to Friday in London — the programme sending days (R185 ①). */
export function isUkWeekday(at: Date): boolean {
  const day = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short' }).format(at)
  return !['Sat', 'Sun'].includes(day)
}

export async function sendsStalledVerdict(now: Date): Promise<StallVerdict> {
  const none: StallVerdict = { stalled: [], sending: [] }
  // Programme email goes Monday to Friday (UK days); nothing is expected to send at a weekend.
  if (!isUkWeekday(now)) return none

  const { data: overdue, error: dueErr } = await db.from('figsy_enrollments')
    .select('client_id, campaign_id')
    .in('status', ['enrolled', 'in_progress'])
    .lte('next_send_at', now.toISOString())
    .limit(5000)
  if (dueErr || !overdue || overdue.length === 0) return none

  const campaignIds = [...new Set(overdue.map(e => (e as { campaign_id: string | null }).campaign_id).filter((x): x is string => !!x))]
  if (campaignIds.length === 0) return none
  const { data: active, error: campErr } = await db.from('figsy_campaigns')
    .select('id, client_id').eq('status', 'active').in('id', campaignIds)
  if (campErr || !active) return none
  const activeIds = new Set(active.map(c => String((c as { id: string }).id)))

  // Work due on an ACTIVE campaign, per client.
  const dueByClient = new Map<string, { due: number; campaigns: Set<string> }>()
  for (const e of overdue as { client_id: string | null; campaign_id: string | null }[]) {
    if (!e.client_id || !e.campaign_id || !activeIds.has(e.campaign_id)) continue
    const entry = dueByClient.get(e.client_id) ?? { due: 0, campaigns: new Set<string>() }
    entry.due++
    entry.campaigns.add(e.campaign_id)
    dueByClient.set(e.client_id, entry)
  }

  const { clientCommercialModel } = await import('./commercial-model')
  const { authorityFor } = await import('./programme-authority')
  const since = new Date(now.getTime() - STALL_WINDOW_HOURS * 3_600_000).toISOString()
  const verdict: StallVerdict = { stalled: [], sending: [] }

  for (const [clientId, { due, campaigns }] of dueByClient) {
    try {
      // Would the send gate let this client send right now? Paused, not live, not approved,
      // never run — each is "nothing was allowed to send", which is not a stall.
      const model = await clientCommercialModel(clientId)
      if (model.model === 'unreadable') continue
      const programme = model.openProgramme
      if (programme && !(programme as { run_at?: string | null }).run_at) continue
      if (!authorityFor(programme, 'OUTREACH', model).allowed) continue

      const { count, error } = await db.from('figsy_sent_emails')
        .select('id', { count: 'exact', head: true })
        .in('campaign_id', [...campaigns])
        .gte('sent_at', since)
      if (error || count === null || count === undefined) continue
      if (count > 0) verdict.sending.push(clientId)
      else verdict.stalled.push({ clientId, due })
    } catch (err) {
      console.error(`[sends-stalled] could not judge client ${clientId}:`, err)
    }
  }
  return verdict
}
