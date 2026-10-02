// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 2 Oct (R187 ① · card #2547 · S7 part a) — HOUSE, AND EVERY CLIENT, ON ITS OWN LINE.
//
// The founder: *"house account needs to show the sending stats. and everything so we cna track
// results."* R187 ①: *"House shows its sending numbers in Vida on its own line next to the
// clients — sent, failed, bounced, replies"*.
//
// 🛑 WHAT WAS WRONG. Sending health's totals leave House (and the demo) out — R174 ⑧, correctly:
// House's sends are not a client's results. But nothing put House back anywhere, so on 1 Oct the
// screen read 0 while House sent 20. Each client with an open programme — House first — now has
// its own line, read from that client's own rows, never mixed into the totals and never hidden.
//
// ⚠️ BOUNCES AND OPT-OUTS ARE THE CLIENT'S OWN. The blocklist is global by design (one opt-out
// protects every client), so a client's line counts only blocklist entries for addresses THAT
// client emailed in the window. Failed sends stay NOT MEASURED, exactly as on the totals: a
// failed send's row is deleted, so there is nothing to count.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'

type Metric = { measured: true; value: number } | { measured: false; why: string }
export type ClientWindow = {
  sent: Metric; failed: Metric; bounced: Metric; optOuts: Metric; replies: Metric
  repliesByClass: Record<string, number>
}
export type ClientSendingLine = { clientId: string; name: string; isHouse: boolean; today: ClientWindow; last7: ClientWindow }

const CHUNK = 200

export async function sendingLinesByClient(now: Date): Promise<ClientSendingLine[]> {
  const {
    measured, NOT_MEASURED, FAILED_NOT_MEASURED, BOUNCE_REASONS, OPT_OUT_REASONS, tallyClassifications,
  } = await import('./sending-health')
  const { getClientExclusions } = await import('./real-clients')
  const { TERMINAL_STATUSES } = await import('./programme')
  const { normalizeRevealEmails } = await import('./billing-rules')

  const { houseClientIds, demoClientIds } = await getClientExclusions()
  const { data: open, error: openErr } = await db.from('programmes')
    .select('client_id').not('status', 'in', `(${TERMINAL_STATUSES.join(',')})`)
  if (openErr) throw new Error(`open programmes: ${openErr.message}`)
  const ids = [...new Set([...houseClientIds, ...((open ?? []) as { client_id: string }[]).map(p => p.client_id)])]
    .filter(id => id && !demoClientIds.has(id))
  if (ids.length === 0) return []

  const { data: names, error: nameErr } = await db.from('clients').select('id, company_name').in('id', ids)
  if (nameErr) throw new Error(`client names: ${nameErr.message}`)
  const nameOf = new Map(((names ?? []) as { id: string; company_name: string | null }[]).map(c => [c.id, c.company_name ?? c.id]))

  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

  const windowFor = async (clientId: string, since: string): Promise<ClientWindow> => {
    const [sentRes, replyRes, toRes] = await Promise.all([
      db.from('figsy_sent_emails').select('id, leads!inner(client_id)', { count: 'exact', head: true })
        .gte('sent_at', since).eq('leads.client_id', clientId),
      db.from('figsy_replies').select('classification').gte('received_at', since).eq('client_id', clientId),
      db.from('figsy_sent_emails').select('leads!inner(email, client_id)')
        .gte('sent_at', since).eq('leads.client_id', clientId).limit(5000),
    ])
    if (sentRes.error) throw new Error(`sent (${clientId}): ${sentRes.error.message}`)
    if (replyRes.error) throw new Error(`replies (${clientId}): ${replyRes.error.message}`)
    if (toRes.error) throw new Error(`addresses (${clientId}): ${toRes.error.message}`)
    const emails = normalizeRevealEmails(((toRes.data ?? []) as { leads: { email: string | null } | { email: string | null }[] | null }[])
      .map(r => (Array.isArray(r.leads) ? r.leads[0]?.email : r.leads?.email) ?? null))
    const onBlocklist = async (reasons: readonly string[]) => {
      let n = 0
      for (let i = 0; i < emails.length; i += CHUNK) {
        const { count, error } = await db.from('opt_out_blocklist').select('email', { count: 'exact', head: true })
          .in('reason', [...reasons]).gte('created_at', since).in('email', normalizeRevealEmails(emails.slice(i, i + CHUNK)))
        if (error) throw new Error(`blocklist (${clientId}): ${error.message}`)
        n += count ?? 0
      }
      return n
    }
    const replyRows = (replyRes.data ?? []) as { classification: string | null }[]
    return {
      sent: measured(sentRes.count ?? 0),
      failed: NOT_MEASURED(FAILED_NOT_MEASURED),
      bounced: measured(await onBlocklist(BOUNCE_REASONS)),
      optOuts: measured(await onBlocklist(OPT_OUT_REASONS)),
      replies: measured(replyRows.length),
      repliesByClass: tallyClassifications(replyRows),
    }
  }

  const lines: ClientSendingLine[] = []
  for (const id of ids) {
    const [today, last7] = await Promise.all([windowFor(id, startOfToday), windowFor(id, sevenDaysAgo)])
    lines.push({ clientId: id, name: nameOf.get(id) ?? id, isHouse: houseClientIds.has(id), today, last7 })
  }
  // House first, then clients by name — House is never buried in the list.
  return lines.sort((a, b) => Number(b.isHouse) - Number(a.isHouse) || a.name.localeCompare(b.name))
}
