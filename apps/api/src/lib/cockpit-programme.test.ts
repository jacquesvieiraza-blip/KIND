// ⚑ 29 Sep (R174 · PR 5f) — THE COCKPIT'S MONEY AND AT-RISK ARE PROGRAMME TRUTH.
//   · at-risk = a running programme (14+ days) with no reply in the last 14 days, through the
//     programme's own leads; paused, young, demo and House programmes are never "at risk";
//   · an unreadable read throws (the Cockpit says so), never "nobody at risk";
//   · the money headline is programme cash from the one source; MRR is labelled history.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>
const st = vi.hoisted(() => ({ programmes: [] as Row[], clients: [] as Row[], leads: {} as Record<string, string[]>, lastReply: {} as Record<string, string | null>, fail: '' }))

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      let progFilter: string | null = null; let leadIds: string[] = []
      const q: Record<string, unknown> = {
        select: () => q, order: () => q, limit: () => q,
        eq: (c: string, v: string) => { if (c === 'programme_id') progFilter = v; return q },
        in: (c: string, v: string[]) => { if (c === 'lead_id') leadIds = v; return q },
        then: (r: (v: unknown) => unknown) => {
          if (st.fail === table) return Promise.resolve({ data: null, error: { message: 'boom' } }).then(r)
          const data = table === 'programmes' ? st.programmes
            : table === 'clients' ? st.clients
            : table === 'leads' ? (st.leads[progFilter ?? ''] ?? []).map(id => ({ id }))
            : table === 'figsy_replies' ? (() => { const at = leadIds.map(i => st.lastReply[i]).filter(Boolean).sort().reverse()[0]; return at ? [{ received_at: at }] : [] })()
            : []
          return Promise.resolve({ data, error: null }).then(r)
        },
      }
      return q
    },
  },
}))
vi.mock('./real-clients', () => ({ resolveHouseUserIds: async () => new Set(['u-house']) }))

const NOW = new Date('2026-09-29T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString()
const prog = (id: string, client_id: string, over: Row = {}): Row =>
  ({ id, client_id, status: 'LIVE', paused_at: null, run_at: daysAgo(30), went_live_at: daysAgo(31), ...over })

beforeEach(() => {
  st.fail = ''
  st.programmes = [
    prog('p-quiet', 'c1'),                          // running 30 days, last reply 20 days ago → at risk
    prog('p-never', 'c2'),                          // running 30 days, never a reply → at risk
    prog('p-busy', 'c3'),                           // reply 3 days ago → fine
    prog('p-young', 'c4', { run_at: daysAgo(5) }),  // too young to judge
    prog('p-paused', 'c5', { paused_at: daysAgo(2) }),
    prog('p-demo', 'nw'), prog('p-house', 'h'),
  ]
  st.clients = [
    { id: 'c1', company_name: 'Quiet Co', is_demo: false, user_id: 'u1' },
    { id: 'c2', company_name: 'Never Co', is_demo: false, user_id: 'u2' },
    { id: 'c3', company_name: 'Busy Co', is_demo: false, user_id: 'u3' },
    { id: 'nw', company_name: 'Northwind', is_demo: true, user_id: 'u-nw' },
    { id: 'h', company_name: 'K.I.N.D', is_demo: false, user_id: 'u-house' },
  ]
  st.leads = { 'p-quiet': ['l1'], 'p-never': ['l2'], 'p-busy': ['l3'], 'p-demo': ['l4'], 'p-house': ['l5'] }
  st.lastReply = { l1: daysAgo(20), l3: daysAgo(3) }
})

describe('programmes at risk', () => {
  it('running and quiet for 14 days — and never the young, the paused, the demo or House', async () => {
    const { programmesAtRisk } = await import('./programme-risk')
    const out = await programmesAtRisk(NOW)
    expect(out.map(r => [r.programme_id, r.reason])).toEqual([
      ['p-quiet', 'No reply in 14 days'],
      ['p-never', 'Live 14+ days and no reply yet'],
    ])
  })
  it('an unreadable read throws, never "nobody at risk"', async () => {
    const { programmesAtRisk } = await import('./programme-risk')
    st.fail = 'figsy_replies'
    await expect(programmesAtRisk(NOW)).rejects.toThrow(/replies unreadable/)
  })
})

describe('the Cockpit reads it', () => {
  const page = readFileSync(join(process.cwd(), 'apps/admin/src/app/cockpit/page.tsx'), 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  const comp = readFileSync(join(process.cwd(), 'apps/admin/src/components/vida/CockpitProgramme.tsx'), 'utf8')
  it('programme money and programme risk lead; MRR is history; churn at-risk is not read', () => {
    expect(page).toContain('<CockpitProgramme />')
    expect(page).not.toContain("label: 'MRR (USD)'")
    expect(page).not.toContain('getChurnRisk(), getSystemHealth()')
    expect(page).toContain('Old subscription model — history')
    expect(comp).toContain("useRead<{ totals: Totals }>('programme-money')")
    expect(comp).toContain("useRead<Risk[]>('programme-risk')")
    expect(readFileSync(join(process.cwd(), 'apps/api/src/routes/operator.ts'), 'utf8')).toContain("operatorRouter.get('/programme-risk'")
  })
})
