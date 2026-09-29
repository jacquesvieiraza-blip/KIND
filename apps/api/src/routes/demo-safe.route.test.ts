// ⚑ 29 Sep (R174 ② · PR 1f) — THE DEMO LOOKS REAL AND DOES NOTHING REAL.
// Behavioural where the route can run here (the demo check, Settle, the Money Path switch);
// ordered-source where the route needs auth or mail this harness cannot provide (team invite,
// company provision / seats, the challenge alert, calendar connect) — each asserts the demo
// gate comes BEFORE the email, insert or alert it protects.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>
const st = vi.hoisted(() => ({
  tables: {} as Record<string, Row[]>, fail: null as string | null,
  updates: [] as { table: string; patch: Row }[], settled: 0,
}))

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const filters: ((r: Row) => boolean)[] = []
      const rows = () => (st.tables[table] ?? []).filter(r => filters.every(f => f(r)))
      const q: Record<string, unknown> = {
        select: () => q,
        eq: (c: string, v: unknown) => { filters.push(r => r[c] === v); return q },
        not: (c: string, _o: string, v: unknown) => { filters.push(r => (r[c] ?? null) !== v); return q },
        in: () => q, is: () => q, order: () => q, limit: () => q,
        async maybeSingle() { return st.fail === table ? { data: null, error: { message: 'down' } } : { data: rows()[0] ?? null, error: null } },
        then(r: (v: unknown) => unknown) {
          return Promise.resolve(st.fail === table ? { data: null, error: { message: 'down' } } : { data: rows(), error: null }).then(r)
        },
        update: (patch: Row) => { st.updates.push({ table, patch }); return q },
      }
      return q
    },
  },
}))

async function call(router: unknown, method: 'post' | 'patch', path: string, req: Row) {
  const layer = (router as { stack: Array<Record<string, any>> }).stack.find(l => l.route?.path === path && l.route?.methods[method])
  if (!layer) throw new Error(`${method} ${path} not found`)
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  let payload: Row = {}; let status = 200
  const res: any = { json: (b: Row) => { payload = b; return res }, status: (s: number) => { status = s; return res } }
  await handler({ body: {}, params: {}, query: {}, headers: {}, ...req }, res, () => {})
  return { status, payload }
}

beforeEach(() => {
  st.fail = null; st.updates = []; st.settled = 0
  st.tables = {
    clients: [
      { id: 'nw', company_name: 'Northwind Field Software', is_demo: true },
      { id: 'real', company_name: 'Acme', is_demo: false },
      { id: 'paid', company_name: 'Paid Co', is_demo: false },
    ],
    programmes: [
      { id: 'p-demo', client_id: 'nw' }, { id: 'p-real', client_id: 'real' },
      { id: 'p-paid', client_id: 'paid', first_paid_at: '2026-09-20T10:00:00Z' },
    ],
  }
})

describe('the demo check fails closed', () => {
  it('demo, real, and unknown when the row cannot be read', async () => {
    const { demoCheck, demoRefusal } = await import('../lib/demo-guard')
    expect(await demoCheck('nw')).toBe('demo')
    expect(await demoCheck('real')).toBe('real')
    st.fail = 'clients'
    expect(await demoCheck('real')).toBe('unknown')
    expect(demoRefusal('unknown')?.status).toBe(503)
    expect(demoRefusal('demo')?.status).toBe(403)
    expect(demoRefusal('real')).toBeNull()
  })
})

describe('the demo is never settled', () => {
  it('the programme check sees the demo behind a programme id, and a real one as real', async () => {
    const { programmeDemoCheck } = await import('../lib/demo-guard')
    expect(await programmeDemoCheck('p-demo')).toBe('demo')
    expect(await programmeDemoCheck('p-real')).toBe('real')
    expect(await programmeDemoCheck('nope')).toBe('unknown')
  })
  it('and Settle asks it before settling', () => {
    const code = readFileSync(join(process.cwd(), 'apps/api/src/routes/programme.ts'), 'utf8')
    const start = code.indexOf("programmeRouter.post('/:id/settle-shortfall'")
    const gate = code.indexOf('demoRefusal(await programmeDemoCheck(req.params.id))', start)
    const act = code.indexOf('settleProgrammeFromRecord({', start)
    expect(gate).toBeGreaterThan(start)
    expect(gate).toBeLessThan(act)
  })
})

describe('Money Path\'s demo switch cannot undo the demo or hide a paying client', () => {
  it('Northwind cannot be un-demoed', async () => {
    const { moneyPathRouter } = await import('./money-path')
    const r = await call(moneyPathRouter, 'patch', '/client/:id/demo', { params: { id: 'nw' }, body: { is_demo: false } })
    expect(r.status).toBe(409)
    expect(st.updates).toEqual([])
  })
  it('a client who paid for a programme cannot be made a demo', async () => {
    const { moneyPathRouter } = await import('./money-path')
    const r = await call(moneyPathRouter, 'patch', '/client/:id/demo', { params: { id: 'paid' }, body: { is_demo: true } })
    expect(r.status).toBe(409)
    expect(st.updates).toEqual([])
  })
  it('an ordinary unpaid client can still be marked', async () => {
    const { moneyPathRouter } = await import('./money-path')
    const r = await call(moneyPathRouter, 'patch', '/client/:id/demo', { params: { id: 'real' }, body: { is_demo: true } })
    expect(r.status).not.toBe(409)
    expect(st.updates.length).toBe(1)
  })
})

describe('the gate comes before every real-world action', () => {
  const src = (f: string) => readFileSync(join(process.cwd(), 'apps/api/src/routes', f), 'utf8')
  const before = (code: string, from: string, gate: string, action: string) => {
    const start = code.indexOf(from)
    expect(start, `${from} is gone`).toBeGreaterThan(-1)
    const g = code.indexOf(gate, start), a = code.indexOf(action, start)
    expect(g, `no demo gate after ${from}`).toBeGreaterThan(-1)
    expect(g, `the demo gate must come before ${action}`).toBeLessThan(a)
  }
  it('team invite: before the invite row and the email', () => {
    before(src('team.ts'), "router.post('/invite'", 'demoRefusal(await demoCheck(clientId))', ".from('client_members')")
    before(src('team.ts'), "router.post('/invite'", 'demoRefusal(await demoCheck(clientId))', 'resend.emails.send')
  })
  it('company: before the company is made and before a seat invite', () => {
    before(src('company.ts'), "companyRouter.post('/provision'", 'demoRefusal(await demoCheck(client.id))', ".from('companies')")
    before(src('company.ts'), "companyRouter.post('/seats'", 'demoRefusal(await demoCheck(ctx.clientId))', 'sendSeatInviteEmail')
  })
  it('meeting challenge: recorded, but the demo returns before the founder alert', () => {
    before(src('my-programme.ts'), "myProgrammeRouter.post('/meetings/challenge'", "(await demoCheck(clientId)) === 'demo'", "sendFounderAlert('support_escalation', 'A client challenged a meeting'")
  })
  it('calendar connect: before the Google consent URL', () => {
    before(src('calendar.ts'), "calendarRouter.get('/connect'", 'demoRefusal(await demoCheck(clientId))', 'getAuthUrl(signOAuthState(clientId))')
  })
})
