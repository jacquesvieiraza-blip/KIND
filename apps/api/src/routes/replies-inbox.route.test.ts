// 25 Sep (R165) — THE INBOX'S CONTEXT READ: our emails to the people who replied, and only them.
import { describe, it, expect, vi, beforeEach } from 'vitest'

type Row = Record<string, unknown>
const state = vi.hoisted(() => ({
  replies: [] as Row[], sent: [] as Row[],
  scope: { mode: 'ids', ids: ['L1', 'L2', 'L3'], programmeId: 'P' } as Record<string, unknown>,
  sentError: false,
}))

function table(name: string) {
  const f: ((r: Row) => boolean)[] = []
  let head = false
  const rows = () => (name === 'figsy_replies' ? state.replies : name === 'figsy_sent_emails' ? state.sent
    : name === 'clients' ? [{ id: 'C', user_id: 'u' }] : [])
  const q: any = {
    select(_c: string, o?: { head?: boolean }) { head = !!o?.head; return q },
    eq(c: string, v: unknown) { f.push(r => r[c] === v); return q },
    in(c: string, l: unknown[]) { f.push(r => l.includes(r[c])); return q },
    order() { return q }, limit() { return q },
    async maybeSingle() { return { data: rows().filter(r => f.every(fn => fn(r)))[0] ?? null, error: null } },
    then(res: (v: unknown) => unknown) {
      if (name === 'figsy_sent_emails' && state.sentError) return Promise.resolve({ data: null, error: { message: 'down' }, count: null }).then(res)
      const hit = rows().filter(r => f.every(fn => fn(r)))
      return Promise.resolve({ data: head ? null : hit, error: null, count: hit.length }).then(res)
    },
  }
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => table(t) } }))
vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _r: unknown, next: () => void) => next() }))
vi.mock('../lib/alerts', () => ({ sendFounderAlert: () => Promise.resolve() }))
vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { create: async () => ({ content: [] }) } } }))
vi.mock('../lib/current-outreach', () => ({
  currentOutreachLeads: async () => state.scope,
  safeIn: (ids: string[]) => (ids.length ? ids : ['00000000-0000-0000-0000-000000000000']),
}))

async function call() {
  const m = await import('./figsy')
  const layer = (m.figsyRouter as unknown as { stack: any[] }).stack.find(l => l.route?.path === '/replies/all' && l.route?.methods.get)
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  let payload: any = null; let status = 200
  const res: any = { json: (b: unknown) => { payload = b }, status: (s: number) => { status = s; return res } }
  await handler({ userId: 'u', query: {}, body: {}, params: {} }, res, () => {})
  return { payload, status }
}

beforeEach(() => {
  state.scope = { mode: 'ids', ids: ['L1', 'L2', 'L3'], programmeId: 'P' }
  state.sentError = false
  state.replies = [{ id: 'r1', client_id: 'C', lead_id: 'L1', classification: 'hot' }]
  state.sent = [
    { lead_id: 'L1', step: 1, subject: 's', body: 'to Priya', sent_at: '1', status: 'sent' },
    { lead_id: 'L1', step: 2, subject: 's', body: 'a draft', sent_at: '2', status: 'draft' },
    { lead_id: 'L2', step: 1, subject: 's', body: 'to someone who never replied', sent_at: '1', status: 'sent' },
  ]
})

describe('GET /replies/all — the inbox context', () => {
  it('🛑 returns our emails ONLY to people who replied, and never drafts', async () => {
    const { payload } = await call()
    expect(payload.sent.map((s: Row) => s.body)).toEqual(['to Priya'])
  })

  it('counts every SENT email in the current work, so an empty inbox can say why', async () => {
    expect((await call()).payload.sent_total).toBe(2)
    state.sent = []; state.replies = []
    expect((await call()).payload.sent_total).toBe(0)
  })

  it('a calibration workspace has sent nothing and replied nothing', async () => {
    state.scope = { mode: 'none' }
    expect((await call()).payload).toEqual({ success: true, data: [], sent: [], sent_total: 0 })
  })

  it('⚠️ a failed context read never blanks the replies and never claims "nothing sent"', async () => {
    state.sentError = true
    const { payload } = await call()
    expect(payload.data).toHaveLength(1)
    expect(payload.sent).toBeNull()
    expect(payload.sent_total).toBeNull()
  })

  it('a legacy scope makes no claim about what was sent', async () => {
    state.scope = { mode: 'client' }
    expect((await call()).payload.sent_total).toBeNull()
  })
})
