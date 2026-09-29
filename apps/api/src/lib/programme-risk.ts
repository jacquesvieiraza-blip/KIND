// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 29 Sep (R174 · 5f) — WHICH LIVE PROGRAMMES ARE AT RISK, FROM PROGRAMME SIGNALS.
//
// ⛓️ Cockpit's "at risk" came from the churn engine, which scores subscriptions, credit
// balances and campaign activity — none of which a programme client has — so it never fired
// for one. The signal here is the programme's own: a programme that has been running for
// QUIET_DAYS and has had no reply in the last QUIET_DAYS. The demo and House are left out
// (neither is a client relationship at risk).
//
// ⚠️ AN UNREADABLE READ THROWS. The Cockpit shows "could not be read", never "nobody at risk".
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'

export const QUIET_DAYS = 14

export type AtRiskProgramme = {
  client_id: string; company: string | null; programme_id: string
  /** The last reply, or null when there has never been one. */
  last_reply_at: string | null
  reason: string
}

export async function programmesAtRisk(now: Date = new Date()): Promise<AtRiskProgramme[]> {
  const cutoff = now.getTime() - QUIET_DAYS * 86_400_000
  const { data: progs, error } = await db.from('programmes')
    .select('id, client_id, status, paused_at, run_at, went_live_at')
    .eq('status', 'LIVE')
  if (error) throw new Error(`programmes unreadable: ${error.message}`)
  const running = ((progs ?? []) as Array<{ id: string; client_id: string; paused_at: string | null; run_at: string | null; went_live_at: string | null }>)
    .filter(p => !p.paused_at)
    .filter(p => { const s = p.run_at ?? p.went_live_at; return !!s && new Date(s).getTime() <= cutoff })
  if (running.length === 0) return []

  const { data: clients, error: cErr } = await db.from('clients')
    .select('id, company_name, is_demo, user_id').in('id', [...new Set(running.map(p => p.client_id))])
  if (cErr) throw new Error(`clients unreadable: ${cErr.message}`)
  const { resolveHouseUserIds } = await import('./real-clients')
  const house = await resolveHouseUserIds()
  const byId = new Map(((clients ?? []) as Array<{ id: string; company_name: string | null; is_demo: boolean | null; user_id: string | null }>).map(c => [c.id, c]))

  const out: AtRiskProgramme[] = []
  for (const p of running) {
    const c = byId.get(p.client_id)
    if (!c || c.is_demo === true || (c.user_id && house.has(c.user_id))) continue
    // Replies are attributed through the programme's own leads, never client-wide.
    const { data: leads, error: lErr } = await db.from('leads').select('id').eq('programme_id', p.id).limit(20000)
    if (lErr) throw new Error(`leads unreadable: ${lErr.message}`)
    const ids = ((leads ?? []) as { id: string }[]).map(l => l.id)
    let last: string | null = null
    if (ids.length > 0) {
      const { data: r, error: rErr } = await db.from('figsy_replies').select('received_at').in('lead_id', ids)
        .order('received_at', { ascending: false }).limit(1)
      if (rErr) throw new Error(`replies unreadable: ${rErr.message}`)
      last = ((r ?? []) as { received_at: string | null }[])[0]?.received_at ?? null
    }
    if (last && new Date(last).getTime() > cutoff) continue
    out.push({
      client_id: p.client_id, company: c.company_name, programme_id: p.id, last_reply_at: last,
      reason: last ? `No reply in ${QUIET_DAYS} days` : `Live ${QUIET_DAYS}+ days and no reply yet`,
    })
  }
  return out
}
