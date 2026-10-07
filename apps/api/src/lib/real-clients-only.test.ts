// ⚑ 29 Sep (R174 ⑧ · PR 8c) — THE DEMO AND HOUSE STAY OUT OF EVERY BUSINESS NUMBER.
//   · one rule, `withoutClients` in @kind/shared, used by the API and by Vida's server pages;
//   · signups, sending stats, the top-bar "sent", the Engine totals, the founder's client count;
//   · the demo is not work: not in the Needs-you badge, not in the Unibox, not the Nexus default;
//   · the Unibox is newest arrival first, so seeded rows never sit on top dated 1970.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { withoutClients, pgInList } from '@kind/shared'

type Call = { table: string; op: string; args: unknown[] }
const st = vi.hoisted(() => ({ calls: [] as Call[] }))

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const q: Record<string, unknown> = {}
      for (const op of ['select', 'eq', 'gte', 'not', 'in', 'limit', 'order', 'is']) {
        q[op] = (...args: unknown[]) => { st.calls.push({ table, op, args }); return q }
      }
      q.then = (r: (v: unknown) => unknown) => Promise.resolve(
        table === 'clients' ? { data: [{ id: 'demo' }], error: null }
          : table === 'figsy_sent_emails' ? { count: 5, error: null }
          : { data: [], count: 0, error: null }).then(r)
      return q
    },
  },
}))
vi.mock('../lib/real-clients', () => ({ getExcludedClientIds: async () => new Set(['house']) }))
vi.mock('./real-clients', () => ({ getExcludedClientIds: async () => new Set(['house']) }))
vi.mock('../lib/operator-audit', () => ({ writeOperatorAudit: async () => {}, campaignAuditAction: () => 'noop' }))
vi.mock('@anthropic-ai/sdk', () => ({ default: class {} }))
vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _r: unknown, n: () => void) => n() }))
vi.mock('../lib/alerts', () => ({ sendFounderAlert: async () => ({ delivered: true }) }))

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

beforeEach(() => { st.calls = [] })

describe('the one rule', () => {
  it('drops the named clients, and leaves the query alone when there are none', () => {
    const seen: unknown[][] = []
    const q = { not: (...a: unknown[]) => { seen.push(a); return q } }
    expect(withoutClients(q, 'client_id', new Set<string>())).toBe(q)
    expect(seen).toEqual([])
    withoutClients(q, 'leads.client_id', ['a', 'b'])
    expect(seen).toEqual([['leads.client_id', 'in', '("a","b")']])
    expect(pgInList([])).toBeNull()
  })
})

describe('the top-bar "sent" is real clients only', () => {
  it('the sent count joins through leads and drops the demo and House', async () => {
    const { operatorRouter } = await import('../routes/operator')
    const layer = (operatorRouter as unknown as { stack: Array<Record<string, any>> }).stack
      .find(l => l.route?.path === '/health' && l.route?.methods.get)
    let body: Record<string, any> = {}
    const res: any = { json: (b: Record<string, any>) => { body = b; return res }, status: () => res }
    await layer!.route.stack[layer!.route.stack.length - 1].handle({ query: {}, headers: {} }, res)
    expect(body.data.sent_today).toBe(5)
    const sent = st.calls.filter(c => c.table === 'figsy_sent_emails')
    expect(sent.find(c => c.op === 'select')!.args[0]).toBe('id, leads!inner(client_id)')
    const not = sent.find(c => c.op === 'not')!
    expect(not.args[0]).toBe('leads.client_id')
    expect(String(not.args[2])).toContain('"house"')
    expect(String(not.args[2])).toContain('"demo"')
  })
})

describe('every business screen goes through it', () => {
  it('the API reads', () => {
    const op = read('apps/api/src/routes/operator.ts')
    expect(op).toContain("q = withoutClients(q, 'leads.client_id', notReal)")          // sending-health: sent
    expect(op).toContain("q = withoutClients(q, 'client_id', notReal)")                // sending-health: replies
    expect(op).toContain("'leads.client_id', excluded)")                               // engine totals
    expect(op).toContain('sends().gte(\'sent_at\', midnight.toISOString())')
    expect(op).not.toContain("db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).gte('sent_at', since),")
    const f = read('apps/api/src/routes/founder.ts')
    expect(f).toContain("withoutClients(db.from('clients').select('id', { count: 'exact', head: true }), 'id', excluded)")
  })
  it('Vida\'s server pages and lists', () => {
    const c = read('apps/admin/src/app/cockpit/page.tsx')
    expect(c).toContain("withoutClients(supabase.from('clients').select('id', { count: 'exact', head: true }), 'id', notReal).gte('created_at', sevenDaysAgo)")
    const u = read('apps/admin/src/app/unibox/page.tsx')
    expect(u).toContain("'client_id', await demoClientIds(db))")
    expect(u).toContain(".order('received_at', { ascending: false, nullsFirst: false })")
    expect(u).not.toContain(".order('processed_at', { ascending: false })")
    const v = read('apps/admin/src/components/vida/VidaClients.tsx')
    // ⛓️ 6 Oct (N1): ~~'])).filter(id => !demoIds.has(id))'~~ — the demo is still left out of the
    // badge, now inside `needsYouBadgeIds` (which also leaves out any client not on the list).
    expect(v).toContain('demo: demoIds,')
    expect(read('apps/admin/src/lib/vida-needs-you-state.ts')).toContain('listed.has(id) && !i.demo.has(id)')
    expect(read('apps/admin/src/app/vida/nexus/page.tsx')).toContain('.filter(r => r.is_demo !== true || r.id === url)')
  })
})
