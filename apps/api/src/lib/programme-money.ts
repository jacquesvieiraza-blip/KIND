// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 29 Sep (R174 · 4e) — ONE READ OF WHAT EACH PROGRAMME WAS BOUGHT FOR AND WHAT WAS PAID.
//
// Vida's money screens each read a different store: Revenue was subscription MRR end to end,
// Billing listed credits and subscriptions, Money Path's "collected" read old credit purchases
// — so every programme client showed $0 collected on screens that were supposed to be about
// them. This is the one place that answers the programme question; the screens read it.
//
// 🛑 CASH IS THE SAME RULE AS `computeContribution` (R136 ④, founder-ruled 23 Sep: commission
// follows cash): the stages actually paid, less wallet credit applied, less make-whole, and
// nothing at all for a disputed or refunded programme. One rule, so Revenue and a partner's
// contribution can never disagree about the same programme.
//
// ⚠️ THE DEMO AND HOUSE ARE NOT REVENUE. They are listed (so nothing is hidden) and flagged,
// and the totals leave them out: the demo was never paid and House pays by internal authority.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'

export type ProgrammeMoneyInput = {
  first_paid_at: string | null
  second_paid_at: string | null
  first_payment_cents: number
  second_payment_cents: number
  wallet_applied_cents?: number | null
  make_whole_cents?: number | null
  disputed_at?: string | null
}

/** Cash actually received for one programme, in cents — `computeContribution`'s revenue rule. */
export function cashReceivedCents(p: ProgrammeMoneyInput): number {
  if (p.disputed_at) return 0
  const paid = (p.first_paid_at ? Number(p.first_payment_cents ?? 0) : 0)
    + (p.second_paid_at ? Number(p.second_payment_cents ?? 0) : 0)
  return paid - Math.max(0, Number(p.wallet_applied_cents ?? 0)) - Number(p.make_whole_cents ?? 0)
}

export type ProgrammeMoneyRow = {
  programme_id: string
  client_id: string
  company: string | null
  /** The size band it was priced on; null = the older per-meeting curve. */
  band: string | null
  status: string
  meetings_bought: number
  price_per_meeting_cents: number
  price_total_cents: number
  cash_cents: number
  /** Delivered: the settled figure once settled, else meetings booked so far. */
  meetings_delivered: number | null
  settled: boolean
  shortfall_credit_cents: number
  /** Not revenue: the demo, or House (internal authority). Listed, left out of the totals. */
  excluded: 'demo' | 'house' | null
}

export type ProgrammeMoneyBook = {
  rows: ProgrammeMoneyRow[]
  totals: {
    cash_cents: number
    cash_by_band_cents: Record<string, number>
    meetings_sold: number
    meetings_delivered: number
    shortfall_credit_cents: number
  }
}

export async function programmeMoneyBook(): Promise<ProgrammeMoneyBook> {
  const { data: progs, error } = await db.from('programmes').select(
    'id, client_id, status, size_band, meeting_target, price_per_meeting_cents, price_total_cents, ' +
    'first_payment_cents, second_payment_cents, first_paid_at, second_paid_at, wallet_applied_cents, ' +
    'make_whole_cents, disputed_at, delivered_meetings, shortfall_credited_at, shortfall_credit_cents, created_at')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`programmes unreadable: ${error.message}`)
  const list = (progs ?? []) as unknown as Array<Record<string, unknown>>

  const clientIds = [...new Set(list.map(p => String(p.client_id)))]
  const { data: clients, error: cErr } = clientIds.length
    ? await db.from('clients').select('id, company_name, is_demo, user_id').in('id', clientIds)
    : { data: [], error: null }
  if (cErr) throw new Error(`clients unreadable: ${cErr.message}`)
  const byId = new Map(((clients ?? []) as Array<{ id: string; company_name: string | null; is_demo: boolean | null; user_id: string | null }>).map(c => [c.id, c]))
  const { resolveHouseUserIds } = await import('./real-clients')
  const houseUsers = await resolveHouseUserIds()
  const { meetingCounts } = await import('./meeting-truth')

  const rows: ProgrammeMoneyRow[] = []
  for (const p of list) {
    const c = byId.get(String(p.client_id))
    const settled = !!p.shortfall_credited_at
    let delivered: number | null = settled ? Number(p.delivered_meetings ?? 0) : null
    if (!settled) {
      const m = await meetingCounts({ clientId: String(p.client_id), programmeId: String(p.id) })
      delivered = m ? m.booked : null
    }
    rows.push({
      programme_id: String(p.id), client_id: String(p.client_id), company: c?.company_name ?? null,
      band: (p.size_band as string | null) ?? null, status: String(p.status),
      meetings_bought: Number(p.meeting_target ?? 0),
      price_per_meeting_cents: Number(p.price_per_meeting_cents ?? 0),
      price_total_cents: Number(p.price_total_cents ?? 0),
      cash_cents: cashReceivedCents(p as unknown as ProgrammeMoneyInput),
      meetings_delivered: delivered, settled,
      shortfall_credit_cents: Number(p.shortfall_credit_cents ?? 0),
      excluded: c?.is_demo === true ? 'demo' : (c?.user_id && houseUsers.has(c.user_id)) ? 'house' : null,
    })
  }

  const counted = rows.filter(r => r.excluded === null)
  const cash_by_band_cents: Record<string, number> = {}
  for (const r of counted) {
    const k = r.band ?? 'curve'
    cash_by_band_cents[k] = (cash_by_band_cents[k] ?? 0) + r.cash_cents
  }
  return {
    rows,
    totals: {
      cash_cents: counted.reduce((n, r) => n + r.cash_cents, 0),
      cash_by_band_cents,
      meetings_sold: counted.reduce((n, r) => n + r.meetings_bought, 0),
      meetings_delivered: counted.reduce((n, r) => n + (r.meetings_delivered ?? 0), 0),
      shortfall_credit_cents: counted.reduce((n, r) => n + r.shortfall_credit_cents, 0),
    },
  }
}
