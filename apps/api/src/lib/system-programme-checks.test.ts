// ⚑ 29 Sep (R174 · PR 5g) — SYSTEM CHECKS THE PROGRAMME, AND HEALTH LIVES INSIDE IT.
//   · the integrity report asks programme questions: paid but cannot send; finished short
//     without the credit (or never settled); the ledger check stays (shortfall credit is wallet credit);
//   · the seven wallet / per-lead checks are gone from the report;
//   · job history and captured errors moved into System, and a failed read says it failed;
//   · /vida/health and the pages that pointed at it land on System; Health leaves the menu.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>
const st = vi.hoisted(() => ({ programmes: [] as Row[], demo: [] as Row[], inboxes: {} as Record<string, Row[]> }))

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      let clientId = ''; let status: string | null = null; let isDemo = false
      const q: Record<string, unknown> = {
        select: () => q, limit: () => q, in: () => q, order: () => q,
        eq: (c: string, v: unknown) => { if (c === 'client_id') clientId = String(v); if (c === 'status') status = String(v); if (c === 'is_demo') isDemo = true; return q },
        then: (r: (v: unknown) => unknown) => Promise.resolve({
          data: table === 'clients' && isDemo ? st.demo
            : table === 'programmes' ? st.programmes.filter(p => !status || p.status === status)
            : table === 'client_inboxes' ? (st.inboxes[clientId] ?? [])
            : [],
          error: null,
        }).then(r),
      }
      return q
    },
    rpc: async () => ({ data: null, error: null }),
  },
}))
vi.mock('./sending-inbox', () => ({ pickSendingInbox: (boxes: Row[]) => ({ ok: boxes.length > 0 }) }))
vi.mock('./inbox-secret', () => ({ secretState: () => ({ ok: true }) }))

beforeEach(() => {
  st.demo = [{ id: 'nw' }]
  st.programmes = [
    { id: 'p1', client_id: 'c1', status: 'LIVE', first_paid_at: 't', first_authorised_at: null, disputed_at: null },       // paid, no mailbox → stuck
    { id: 'p2', client_id: 'c2', status: 'LIVE', first_paid_at: 't', first_authorised_at: null, disputed_at: null },       // paid, has a mailbox
    { id: 'p3', client_id: 'nw', status: 'LIVE', first_paid_at: null, first_authorised_at: 't', disputed_at: null },       // the demo — never counted
    { id: 'p4', client_id: 'c4', status: 'COMPLETED', meeting_target: 10, delivered_meetings: 7, shortfall_credited_at: 't', shortfall_credit_cents: 0 },    // short, no credit
    { id: 'p5', client_id: 'c5', status: 'COMPLETED', meeting_target: 10, delivered_meetings: 7, shortfall_credited_at: 't', shortfall_credit_cents: 59700 }, // credited
    { id: 'p6', client_id: 'c6', status: 'COMPLETED', meeting_target: 10, delivered_meetings: null, shortfall_credited_at: null, shortfall_credit_cents: 0 }, // never settled
  ]
  st.inboxes = { c2: [{ id: 'i' }] }
})

describe('the integrity report asks programme questions', () => {
  it('paid-but-cannot-send and short-not-credited find exactly the right programmes', async () => {
    const { runIntegrity } = await import('./integrity')
    const r = await runIntegrity()
    const by = Object.fromEntries(r.checks.map(c => [c.key, c]))
    expect(Object.keys(by).sort()).toEqual(['ledger_types', 'meetings_short_not_credited', 'paid_cannot_send'])
    expect(by.paid_cannot_send.affected).toEqual(['c1'])
    expect(by.paid_cannot_send.severity).toBe('critical')
    expect(by.meetings_short_not_credited.affected.sort()).toEqual(['p4', 'p6'])
  })
  it('the retired wallet and per-lead checks are gone from the report', () => {
    const src = readFileSync(join(process.cwd(), 'apps/api/src/lib/integrity.ts'), 'utf8')
      .split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
    for (const gone of ['chargedInsidePack', 'doubleCharged', 'packAndWallet', 'paidNeverEnrolled', 'approvedWithoutEmail', 'surfacedButInvisible', 'fundedCannotSend']) {
      expect(src, gone).not.toContain(gone)
    }
  })
})

describe('Health lives inside System', () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
  it('System renders job history and errors, and a failed read says so', () => {
    expect(read('apps/admin/src/app/vida/system/page.tsx')).toContain('<SystemHistory />')
    const hist = read('apps/admin/src/components/vida/SystemHistory.tsx')
    expect(hist).toContain('Could not read the error log')
    expect(hist).toContain("useAdminRead<CronRun[]>('cron-runs', j => j.data?.jobs)")
    const admin = read('apps/api/src/routes/admin.ts')
    expect(admin).not.toContain("res.json({ success: true, data: { errors: [] } })")
    expect(admin).not.toContain("res.json({ success: true, data: { jobs: [] } })")
  })
  it('/vida/health and the pages that pointed at it land on System; Health leaves the menu', () => {
    const mw = read('apps/admin/src/middleware.ts')
    expect(mw).toContain("if (pathname === '/vida/health' || pathname.startsWith('/vida/health/')) {")
    expect(mw).toContain("health: 'system'")
    expect(mw).toContain("agents: 'system', status: 'system', launch: 'system', smoketest: 'system'")
    expect(read('apps/admin/src/lib/vida-nav.ts')).not.toContain("href: '/vida/health'")
  })
})
