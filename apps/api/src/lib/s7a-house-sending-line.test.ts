// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 2 Oct (R187 ① · card #2547 · S7 part a) — HOUSE, AND EVERY CLIENT, ON ITS OWN LINE IN
// VIDA'S SENDING HEALTH.
//
// The founder: *"house account needs to show the sending stats. and everything so we cna track
// results."* On 1 Oct House sent 20 and Sending health read 0, because its totals leave House
// out (R174 ⑧) and nothing put House back anywhere.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Row = Record<string, unknown>
const NOW = new Date('2026-10-07T15:00:00Z')
const TODAY = '2026-10-07T09:00:00Z'
const LAST_WEEK = '2026-10-03T09:00:00Z'

const state = {
  programmes: [] as Row[],
  clients: [] as Row[],
  sends: [] as { client_id: string; email: string; sent_at: string }[],
  replies: [] as { client_id: string; classification: string; received_at: string }[],
  blocklist: [] as { email: string; reason: string; created_at: string }[],
}

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const eqs: Record<string, unknown> = {}
      const ins: Record<string, unknown[]> = {}
      let since = ''
      let head = false
      const q: Record<string, unknown> = {
        select(_c?: unknown, o?: { head?: boolean }) { head = o?.head === true; return q },
        eq(c: string, v: unknown) { eqs[c] = v; return q },
        in(c: string, v: unknown[]) { ins[c] = v; return q },
        not() { return q }, limit() { return q },
        gte(_c: string, v: string) { since = v; return q },
        then(res: (v: unknown) => unknown) {
          if (table === 'programmes') return res({ data: state.programmes, error: null })
          if (table === 'clients') return res({ data: state.clients.filter(c => (ins.id ?? []).includes(c.id)), error: null })
          if (table === 'figsy_sent_emails') {
            const rows = state.sends.filter(s => s.client_id === eqs['leads.client_id'] && s.sent_at >= since)
            return head ? res({ data: null, count: rows.length, error: null })
              : res({ data: rows.map(r => ({ leads: { email: r.email, client_id: r.client_id } })), error: null })
          }
          if (table === 'figsy_replies') {
            return res({ data: state.replies.filter(r => r.client_id === eqs.client_id && r.received_at >= since), error: null })
          }
          if (table === 'opt_out_blocklist') {
            const rows = state.blocklist.filter(b => (ins.reason ?? []).includes(b.reason) && (ins.email ?? []).includes(b.email) && b.created_at >= since)
            return res({ data: null, count: rows.length, error: null })
          }
          return res({ data: [], error: null })
        },
      }
      return q
    },
  },
}))
vi.mock('./real-clients', () => ({
  getClientExclusions: async () => ({
    houseClientIds: new Set(['house']), demoClientIds: new Set(['demo']), excludedClientIds: new Set(['house', 'demo']),
  }),
}))

const lines = async () => (await import('./sending-health-lines')).sendingLinesByClient(NOW)

beforeEach(() => {
  state.programmes = [{ client_id: 'house' }, { client_id: 'acme' }, { client_id: 'demo' }]
  state.clients = [{ id: 'house', company_name: 'K.I.N.D (house)' }, { id: 'acme', company_name: 'Acme' }, { id: 'demo', company_name: 'Northwind' }]
  state.sends = [
    ...Array.from({ length: 20 }, (_, i) => ({ client_id: 'house', email: `p${i}@us.example`, sent_at: TODAY })),
    { client_id: 'acme', email: 'buyer@acme-prospect.example', sent_at: LAST_WEEK },
  ]
  state.replies = [{ client_id: 'house', classification: 'cold', received_at: TODAY }]
  state.blocklist = [
    { email: 'p3@us.example', reason: 'hard_bounce', created_at: TODAY },         // House emailed this one
    { email: 'stranger@elsewhere.example', reason: 'hard_bounce', created_at: TODAY },   // nobody's
  ]
})

describe('R187 ① — House has its own line, with its own numbers', () => {
  it('🛑 House is listed FIRST and shows the 20 it sent today — the screen that read 0 on 1 Oct', async () => {
    const l = await lines()
    expect(l[0].clientId).toBe('house')
    expect(l[0].isHouse).toBe(true)
    expect(l[0].today.sent).toEqual({ measured: true, value: 20 })
    expect(l[0].last7.replies).toEqual({ measured: true, value: 1 })
  })

  it('every client with an open programme has its own line; the demo is never one', async () => {
    const l = await lines()
    expect(l.map(x => x.clientId)).toEqual(['house', 'acme'])
    expect(l[1].last7.sent).toEqual({ measured: true, value: 1 })
    expect(l[1].today.sent).toEqual({ measured: true, value: 0 })
  })

  it('🛑 a line\'s bounces are only those from addresses THAT client emailed', async () => {
    const l = await lines()
    expect(l[0].last7.bounced).toEqual({ measured: true, value: 1 })
    expect(l[1].last7.bounced).toEqual({ measured: true, value: 0 })
  })

  it('failed sends stay NOT MEASURED on a line, as on the totals — never a zero nobody counted', async () => {
    const l = await lines()
    expect(l[0].today.failed.measured).toBe(false)
  })
})

describe('wired through to Vida', () => {
  it('the sending-health route returns the lines beside the totals', () => {
    const op = readFileSync(join(__dirname, '..', 'routes', 'operator.ts'), 'utf8')
    const route = op.slice(op.indexOf("operatorRouter.get('/sending-health'"), op.indexOf("console.error('[operator/sending-health]'"))
    expect(route).toContain('await sendingLinesByClient(now)')
    expect(route).toContain('today, last7, byClient,')
  })

  it('🛑 the Vida page renders a "By client" table, House labelled and first', () => {
    const page = readFileSync(join(__dirname, '..', '..', '..', 'admin', 'src', 'app', 'vida', 'sending', 'page.tsx'), 'utf8')
    expect(page).toContain('By client')
    expect(page).toContain('(data.byClient ?? []).map(c =>')
    expect(page).toContain("c.isHouse ? `House · ${c.name}` : c.name")
  })
})
