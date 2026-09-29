// ⚑ 29 Sep (R174 ⑧ · PR 5d) — CLIENT ADMIN READS PROGRAMME TRUTH.
//   · the list shows each client's stage, meetings delivered of bought, and what their current
//     programme has paid — from the reads the rest of Vida uses, not subscriptions or credits;
//   · the demo and House are listed apart and never counted;
//   · the detail is the client's programme record; "Apply Credits" and "Clone Best Client" are gone.
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { clientAdminRows, paidState, type MoneyRow } from '../../../admin/src/lib/client-admin-rows'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')   // code, not the notes about it
const money = (over: Partial<MoneyRow>): MoneyRow => ({
  programme_id: 'p', client_id: 'c', status: 'LIVE', band: 'growth', meetings_bought: 10, meetings_delivered: 3,
  settled: false, price_total_cents: 199000, cash_cents: 199000, shortfall_credit_cents: 0, excluded: null, ...over,
})

describe('paid state, from the programme’s own row', () => {
  it('in full, part, none — and the demo and House are named, never money', () => {
    expect(paidState(money({}))).toBe('Paid in full')
    expect(paidState(money({ cash_cents: 99500 }))).toBe('Part paid')
    expect(paidState(money({ cash_cents: 0 }))).toBe('Not paid')
    expect(paidState(money({ excluded: 'demo' }))).toBe('Demo — not money')
    expect(paidState(money({ excluded: 'house' }))).toBe('House — internal')
    expect(paidState(null)).toBe('—')
  })
})

describe('the rows', () => {
  it('stage from the lifecycle, meetings and paid from the current (newest) programme', () => {
    const rows = clientAdminRows(
      [
        { id: 'c1', company_name: 'Acme', industry: 'Logistics', country: 'UK', created_at: 't' },
        { id: 'c2', company_name: 'New Co', industry: null, country: null, created_at: 't' },
        { id: 'nw', company_name: 'Northwind', industry: null, country: null, created_at: 't', is_demo: true, house_or_demo: true },
        { id: 'h', company_name: 'K.I.N.D', industry: null, country: null, created_at: 't', house_or_demo: true },
      ],
      [{ client_id: 'c1', stage_label: 'Results' }, { client_id: 'c2', stage_label: 'Brief' }],
      [
        money({ programme_id: 'p-new', client_id: 'c1', meetings_delivered: 3, cash_cents: 99500 }),   // newest first
        money({ programme_id: 'p-old', client_id: 'c1', status: 'COMPLETED', meetings_delivered: 8 }),
        money({ programme_id: 'p-nw', client_id: 'nw', excluded: 'demo' }),
        money({ programme_id: 'p-h', client_id: 'h', excluded: 'house' }),
      ])
    const by = Object.fromEntries(rows.map(r => [r.id, r]))
    expect(by.c1).toMatchObject({ stage: 'Results', meetings: { delivered: 3, bought: 10 }, paid: 'Part paid', programmes: 2, group: 'real' })
    expect(by.c2).toMatchObject({ stage: 'Brief', meetings: null, paid: '—', programmes: 0, group: 'real' })
    expect(by.nw.group).toBe('demo')
    expect(by.h.group).toBe('house')
  })
})

describe('the pages', () => {
  const list = read('apps/admin/src/app/clients/page.tsx')
  const detail = read('apps/admin/src/app/clients/[id]/page.tsx')
  it('the list reads the three programme sources and nothing retired', () => {
    for (const p of ["read<Parameters<typeof clientAdminRows>[0]>('clients')", "('lifecycle-board')", "('programme-money')"]) expect(list).toContain(p)
    for (const gone of ['subscriptions', 'credit_balance', 'Low credits', 'CloneBestClientButton', 'churn-risk']) expect(list, gone).not.toContain(gone)
    expect(existsSync(join(process.cwd(), 'apps/admin/src/app/clients/CloneBestClientButton.tsx'))).toBe(false)
  })
  it('the detail is the programme record, with no credit form', () => {
    expect(detail).toContain("fetch('/api/proxy/operator/programme-money')")
    expect(detail).toContain('.filter(r => r.client_id === params.id)')
    for (const gone of ['Apply Credits', 'handleGrant', "proxyPost(", 'figsy/campaigns', 'Active Subscriptions']) expect(detail, gone).not.toContain(gone)
  })
})
