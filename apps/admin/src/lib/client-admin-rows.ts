// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 29 Sep (R174 · 5d) — CLIENT ADMIN, ON PROGRAMME TRUTH.
//
// ⛓️ WAS: a list whose status came from old subscriptions ("No plan" for every programme
// client), whose risk came from credit balances ("Low credits" for everyone, because a
// programme client holds none), and whose detail showed campaigns, ICPs and leads from calls
// that are refused — beside an "Apply Credits" form. None of that is how a client is sold,
// run or paid any more.
//
// Now each row is three reads the rest of Vida already uses, joined here and nowhere else:
//   · `/operator/clients`          — who they are; `house_or_demo` is the server's own call
//   · `/operator/lifecycle-board`  — their stage (R127), the words the whole console uses
//   · `/operator/programme-money`  — meetings bought and delivered, and what was paid (R174 · 4e)
// Pure, so the rules are tested without a browser.
// ═══════════════════════════════════════════════════════════════════════════════════════

export type AdminClient = {
  id: string; company_name: string | null; industry: string | null; country: string | null
  created_at: string | null; is_demo?: boolean | null; house_or_demo?: boolean
}
export type LifecycleRow = { client_id: string; stage_label: string }
export type MoneyRow = {
  programme_id: string; client_id: string; status: string; band: string | null
  meetings_bought: number; meetings_delivered: number | null; settled: boolean
  price_total_cents: number; cash_cents: number; shortfall_credit_cents: number
  excluded: 'demo' | 'house' | null
  payments?: Array<{ stage: string; cents: number; paid_at: string; ref: string | null }>
}

export type PaidState = 'Paid in full' | 'Part paid' | 'Not paid' | 'Demo — not money' | 'House — internal' | '—'

export type ClientAdminRow = {
  id: string; company: string; industry: string | null; country: string | null
  stage: string | null
  /** The current programme's meetings, delivered of bought; null with no programme. */
  meetings: { delivered: number | null; bought: number } | null
  paid: PaidState
  programmes: number
  group: 'real' | 'demo' | 'house'
}

/** Paid state of ONE programme, from its own row. */
export function paidState(p: MoneyRow | null): PaidState {
  if (!p) return '—'
  if (p.excluded === 'demo') return 'Demo — not money'
  if (p.excluded === 'house') return 'House — internal'
  if (p.price_total_cents > 0 && p.cash_cents >= p.price_total_cents) return 'Paid in full'
  if (p.cash_cents > 0) return 'Part paid'
  return 'Not paid'
}

/** Rows arrive newest first from `programme-money`, so a client's first row is the current one. */
export function clientAdminRows(clients: AdminClient[], lifecycle: LifecycleRow[], money: MoneyRow[]): ClientAdminRow[] {
  const stageBy = new Map(lifecycle.map(l => [l.client_id, l.stage_label]))
  const byClient = new Map<string, MoneyRow[]>()
  for (const m of money) byClient.set(m.client_id, [...(byClient.get(m.client_id) ?? []), m])
  return clients.map(c => {
    const progs = byClient.get(c.id) ?? []
    const current = progs[0] ?? null
    const group: ClientAdminRow['group'] = c.is_demo === true || current?.excluded === 'demo' ? 'demo'
      : current?.excluded === 'house' || c.house_or_demo === true ? 'house' : 'real'
    return {
      id: c.id, company: c.company_name || 'Unnamed', industry: c.industry, country: c.country,
      stage: stageBy.get(c.id) ?? null,
      meetings: current ? { delivered: current.meetings_delivered, bought: current.meetings_bought } : null,
      paid: paidState(current),
      programmes: progs.length,
      group,
    }
  })
}
