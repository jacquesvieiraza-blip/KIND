// ═══════════════════════════════════════════════════════════════════════════════════════
// 🔐 THE FOUNDER-PRESSED SEND RUN — one client, one ceiling, and no other way in.
//
// ⚑ 2 Sep. `AUTO_OUTREACH_ENABLED` is ONE global switch that arms every automatic path at
// once: the 2-hourly campaign cron across EVERY client, day-1 batches, co-pilot releases.
// A launch canary needs the opposite — one client, a number the founder typed, sent when
// they press it, with the global switch still down.
//
// 🛑 AND TWO DEFECTS HAD TO CLOSE FOR THAT RUN TO BE WORTH PRESSING:
//
//   ① THE CAMPAIGN PATH NEVER ROTATED. `sendSequenceEmail` resolved its mailbox ONCE PER
//      EMAIL via `pickSendingInbox`, which ranks branded-before-pooled and returns the FIRST
//      row — so on a two-box client every message left from the same box and the second
//      mailbox never sent at all. `nextFromRotation` existed and was green in its own tests;
//      only `sendDay1OutreachBatch` ever called it. **A passing rotation suite was compatible
//      with rotation never running**, which is why every test here drives the REAL caller.
//   ② `client_inboxes.daily_cap` WAS NEVER READ on that path.
//
// ⚠️ THE AUTHORITY SHAPE IS THE POINT. There is no `operatorAuthorised` boolean on
// `sendSequenceEmail` — a flag on a function five call sites already use is a bypass waiting
// to be reached for. The authority travels through a DIFFERENT NAMED FUNCTION, and it is
// DOUBLE-KEYED: that function AND `FIGSY_OPERATOR_SEND_ENABLED === 'true'`. Either alone
// sends nothing.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321'
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key'
// `sendablePool` refuses every box when the mailbox-password key is unreadable — correct
// behaviour, and it would make every rotation assertion below vacuously "exhausted".
process.env.INBOX_SECRET_KEY = process.env.INBOX_SECRET_KEY || 'a'.repeat(64)

type Row = Record<string, unknown>

const state = {
  client: { id: 'client-1', company_name: 'K.I.N.D (house — Client Zero)' } as Row | null,
  campaigns: [] as Row[],
  /** what the campaigns query was filtered by — proves operator scoping at the QUERY */
  campaignFilters: [] as Array<{ col: string; val: unknown }>,
  enrollments: [] as Row[],
  inboxesByClient: {} as Record<string, Row[]>,
  inboxFilters: [] as Array<{ col: string; val: unknown }>,
  sentTodayCount: 0,
  audit: [] as Row[],
  /** every core send: which inbox row and which authority reached it */
  sends: [] as { authority: string; inbox: string; enrollmentId: string }[],
  /** address → forced outcome, else 'sent' */
  outcomeFor: {} as Record<string, string>,
  enrolmentCampaignFilter: null as string[] | null,
}

function query(table: string) {
  const q: Record<string, unknown> = {
    select(_c?: string, opts?: { count?: string; head?: boolean }) {
      if (opts?.count && table === 'figsy_sent_emails') {
        return { ...q, gte: () => ({ ...q, in: () => q, then: (r: (v: unknown) => unknown) => r({ data: [], count: state.sentTodayCount, error: null }) }) } as never
      }
      return q
    },
    eq(col: string, val: unknown) {
      if (table === 'figsy_campaigns') state.campaignFilters.push({ col, val })
      if (table === 'client_inboxes') state.inboxFilters.push({ col, val })
      return q
    },
    // ⚠️ THE MOCK HONOURS `.in('campaign_id', …)`. Production scopes an operator run at the
    // campaign query, so a stub that returned every enrolment regardless would test a
    // codebase we do not have — and would fail a client-isolation test for the wrong reason.
    in(col: string, vals: unknown) {
      if (table === 'figsy_enrollments' && col === 'campaign_id' && Array.isArray(vals)) {
        state.enrolmentCampaignFilter = vals as string[]
      }
      return q
    },
    is() { return q }, not() { return q }, gte() { return q },
    order() { return q }, limit() { return q }, lte() { return q },
    async maybeSingle() {
      if (table === 'clients') return { data: state.client ? { ...state.client } : null, error: null }
      return { data: null, error: null }
    },
    insert(row: Row) {
      if (table === 'operator_audit_log') state.audit.push(row)
      return { select: () => ({ single: async () => ({ data: { id: 'new', ...row }, error: null }) }), error: null }
    },
    update() { return q },
    then(resolve: (v: { data: Row[] | null; count?: number; error: unknown }) => unknown) {
      if (table === 'figsy_campaigns') {
        // Production narrows an operator run HERE, with `.eq('client_id', …)`. The mock must
        // apply it, or every downstream isolation assertion is testing a query we do not run.
        const cid = state.campaignFilters.filter(f => f.col === 'client_id').pop()?.val
        const rows = cid ? state.campaigns.filter(c => c.client_id === cid) : state.campaigns
        return resolve({ data: rows, error: null })
      }
      if (table === 'figsy_enrollments') {
        const f = state.enrolmentCampaignFilter
        const rows = f ? state.enrollments.filter(e => f.includes(String(e.campaign_id))) : state.enrollments
        return resolve({ data: rows, error: null })
      }
      if (table === 'client_inboxes') {
        const cid = state.inboxFilters.filter(f => f.col === 'client_id').pop()?.val as string
        return resolve({ data: state.inboxesByClient[cid] ?? [], error: null })
      }
      if (table === 'figsy_sent_emails') return resolve({ data: [], count: state.sentTodayCount, error: null })
      return resolve({ data: [], count: 0, error: null })
    },
  }
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => query(t), rpc: async () => ({ data: null, error: null }) } }))
vi.mock('./admin', () => ({ adminKeyValid: () => true }))
vi.mock('../lib/operator-audit', () => ({
  writeOperatorAudit: async (e: Row) => { state.audit.push(e) },
  campaignAuditAction: () => 'start_campaign',
}))
vi.mock('../lib/campaign-settings', () => ({ withinSendWindow: () => true }))

// ⚠️ THE SEAM. Both entry points are stubbed so the test can see WHICH ONE the run called and
// WHICH inbox it was handed — the two facts the production defect turned on.
vi.mock('../lib/figsy', () => ({
  operatorSendEnabled: () => process.env.FIGSY_OPERATOR_SEND_ENABLED === 'true',
  outreachEnabled: () => process.env.AUTO_OUTREACH_ENABLED === 'true',
  enrollmentStep: () => ({ subject: 's', body: 'b', total: 3, wait_days: 2 }),
  applyReplyBranching: async () => 'send',
  sendSequenceEmail: async (id: string, _l: Row, _s: number, _su: string, _b: string, _c: string, o?: { inbox?: { email?: string } }) => {
    // AUTOMATIC authority: the real one defers when the kill-switch is off, so the stub does too.
    if (process.env.AUTO_OUTREACH_ENABLED !== 'true') return 'deferred'
    state.sends.push({ authority: 'automatic', inbox: String(o?.inbox?.email ?? '(none)'), enrollmentId: id })
    return 'sent'
  },
  sendSequenceEmailOperatorRun: async (id: string, _l: Row, _s: number, _su: string, _b: string, _c: string, o?: { inbox?: { email?: string } }) => {
    // OPERATOR authority: double-keyed — the entry point AND the env.
    if (process.env.FIGSY_OPERATOR_SEND_ENABLED !== 'true') return 'deferred'
    const addr = String(o?.inbox?.email ?? '(none)')
    state.sends.push({ authority: 'operator_run', inbox: addr, enrollmentId: id })
    return (state.outcomeFor[addr] ?? 'sent') as string
  },
}))

const BOX = (email: string, over: Row = {}): Row => ({
  id: `box-${email}`, email, kind: 'branded', status: 'active', provider: 'google-smtp',
  daily_cap: 30, smtp_host: 'smtp.gmail.com', smtp_port: 587, smtp_secure: false,
  smtp_user: email, smtp_pass_enc: 'v1:cipher', from_name: 'Jacques', ...over,
})
const ENROL = (n: number, clientId = 'client-1'): Row => ({
  id: `enr-${clientId}-${n}`, client_id: clientId, campaign_id: `camp-${clientId}`,
  current_step: 0, status: 'enrolled',
  leads: { id: `lead-${clientId}-${n}`, email: `p${n}@${clientId}.test`, client_id: clientId },
})

async function call(path: string, body: Row): Promise<{ code: number; payload: Record<string, unknown> }> {
  const { operatorRouter } = await import('./operator')
  const layer = (operatorRouter as unknown as { stack: Array<{ route?: { path: string; stack: Array<{ handle: unknown }> } }> })
    .stack.find(l => l.route?.path === path)
  if (!layer?.route) throw new Error(`route ${path} not registered`)
  const handler = layer.route.stack[layer.route.stack.length - 1].handle as (req: unknown, res: unknown) => Promise<void>
  let code = 200
  const payload: Record<string, unknown> = {}
  const res = { status(c: number) { code = c; return res }, json(p: Record<string, unknown>) { Object.assign(payload, p); return res } }
  await handler({ body, params: {}, headers: { 'x-operator-email': 'jacques@get-kind.com' }, query: {} }, res)
  return { code, payload }
}

/** Drive the SCHEDULED path through its real route, exactly as the cron does. */
async function cronRun(): Promise<Record<string, unknown>> {
  const { internalRouter } = await import('./internal')
  const layer = (internalRouter as unknown as { stack: Array<{ route?: { path: string; stack: Array<{ handle: unknown }> } }> })
    .stack.find(l => l.route?.path === '/figsy/send-due-all')
  if (!layer?.route) throw new Error('send-due-all not registered')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle as (req: unknown, res: unknown) => Promise<void>
  const payload: Record<string, unknown> = {}
  const res = { status() { return res }, json(p: Record<string, unknown>) { Object.assign(payload, p); return res } }
  await handler({ body: {}, params: {}, headers: {}, query: {} }, res)
  return payload
}

const PATH = '/send-due/run-once'
const prevAuto = process.env.AUTO_OUTREACH_ENABLED
const prevOp = process.env.FIGSY_OPERATOR_SEND_ENABLED

beforeEach(() => {
  delete process.env.AUTO_OUTREACH_ENABLED
  process.env.FIGSY_OPERATOR_SEND_ENABLED = 'true'
  state.client = { id: 'client-1', company_name: 'K.I.N.D (house — Client Zero)' }
  state.campaigns = [{ id: 'camp-client-1', client_id: 'client-1', settings: null }]
  state.campaignFilters = []; state.inboxFilters = []
  state.enrollments = Array.from({ length: 40 }, (_, i) => ENROL(i))
  state.inboxesByClient = { 'client-1': [BOX('jacques@kindoutreach.com'), BOX('hello@kindoutreach.com', { kind: 'pooled' })] }
  state.sentTodayCount = 0
  state.audit = []; state.sends = []; state.outcomeFor = {}
  state.enrolmentCampaignFilter = null
})
afterEach(() => {
  if (prevAuto === undefined) delete process.env.AUTO_OUTREACH_ENABLED; else process.env.AUTO_OUTREACH_ENABLED = prevAuto
  if (prevOp === undefined) delete process.env.FIGSY_OPERATOR_SEND_ENABLED; else process.env.FIGSY_OPERATOR_SEND_ENABLED = prevOp
})

// ── AUTHORITY ────────────────────────────────────────────────────────────────────────────
describe('the two authorities, and the wall between them', () => {
  it('1 · operator env OFF → the route refuses and NOTHING sends', async () => {
    delete process.env.FIGSY_OPERATOR_SEND_ENABLED
    const r = await call(PATH, { client_id: 'client-1', max_sends: 10 })
    expect(r.code).toBe(503)
    expect(state.sends).toHaveLength(0)
  })

  it('6 · manual env ON + AUTO_OUTREACH_ENABLED OFF + explicit Run-once → it sends', async () => {
    expect(process.env.AUTO_OUTREACH_ENABLED).toBeUndefined()
    const r = await call(PATH, { client_id: 'client-1', max_sends: 4 })
    expect(r.code).toBe(200)
    expect((r.payload.data as Row).sent).toBe(4)
    expect(state.sends.every(s => s.authority === 'operator_run')).toBe(true)
  })

  it('7/8 · the CRON still sends ZERO with the kill-switch off, even while the operator env is ON', async () => {
    // The scheduled route runs under AUTOMATIC authority and cannot reach the operator one.
    const data = await cronRun()
    expect((data.data as Row).sent).toBe(0)
    expect(state.sends).toHaveLength(0)
  })

  it('the cron path calls the AUTOMATIC entry point — never the operator one', async () => {
    process.env.AUTO_OUTREACH_ENABLED = 'true'
    await cronRun()
    expect(state.sends.length).toBeGreaterThan(0)
    expect(state.sends.every(s => s.authority === 'automatic')).toBe(true)
  })

  it('9 · there is NO boolean an ordinary caller can pass to gain operator authority', () => {
    const src = readFileSync(join(__dirname, '../lib/figsy.ts'), 'utf8')
    // The public signature must not expose the authority or an authorised flag.
    const pub = src.slice(src.indexOf('export async function sendSequenceEmail('))
    const sig = pub.slice(0, pub.indexOf('): Promise<SendOutcome>'))
    expect(sig).not.toMatch(/operatorAuthorised|authority|operatorRun/)
    // And it pins itself to automatic authority.
    expect(pub.slice(0, 900)).toContain("authority: 'automatic'")
  })

  it('11 · the operator send function has exactly ONE production caller', () => {
    // A source guard, because no behaviour test can prove the ABSENCE of a future caller.
    const roots = ['lib', 'routes', 'scripts', 'middleware']
    const hits: string[] = []
    const walk = (dir: string) => {
      for (const f of require('fs').readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, f.name)
        if (f.isDirectory()) walk(p)
        else if (f.name.endsWith('.ts') && !f.name.includes('.test.')) {
          const t = readFileSync(p, 'utf8')
          if (t.includes('sendSequenceEmailOperatorRun') && !p.endsWith('lib/figsy.ts')) hits.push(p)
        }
      }
    }
    for (const r of roots) walk(join(__dirname, '..', r))
    expect(hits.map(h => h.split('/src/')[1])).toEqual(['lib/send-due.ts'])
  })

  it('10 · the day-1 batch gains no operator authority', () => {
    const src = readFileSync(join(__dirname, '../lib/figsy.ts'), 'utf8')
    const day1 = src.slice(src.indexOf('export async function sendDay1OutreachBatch'))
    expect(day1).not.toContain('sendSequenceEmailOperatorRun')
    expect(day1).not.toContain('operatorSendEnabled')
  })
})

// ── INPUT ────────────────────────────────────────────────────────────────────────────────
describe('what the route refuses, before anything sends', () => {
  it('3 · missing client_id → rejected, no all-clients fallback', async () => {
    const r = await call(PATH, { max_sends: 10 })
    expect(r.code).toBe(404)
    expect(state.sends).toHaveLength(0)
  })

  it('4/5 · missing, zero, negative or fractional max_sends → rejected', async () => {
    for (const max_sends of [undefined, '', 0, -1, 2.5, 'lots', null]) {
      state.sends = []
      const r = await call(PATH, { client_id: 'client-1', max_sends })
      expect(r.code, `max_sends=${String(max_sends)} must be refused`).toBe(400)
      expect(state.sends).toHaveLength(0)
    }
  })

  it('2 · the route sits behind the operator router\'s admin-key guard', () => {
    const src = readFileSync(join(__dirname, 'operator.ts'), 'utf8')
    expect(src).toContain("adminKeyValid(req.headers['x-admin-key'])")
    expect(src).toContain("operatorRouter.post('/send-due/run-once'")
  })
})

// ── MAX_SENDS ────────────────────────────────────────────────────────────────────────────
describe('max_sends is the explicit ceiling for this execution', () => {
  it('13 · max_sends 4 with two equal boxes → at most 4 successful sends', async () => {
    const r = await call(PATH, { client_id: 'client-1', max_sends: 4 })
    expect((r.payload.data as Row).sent).toBe(4)
    expect(state.sends).toHaveLength(4)
  })

  it('14 · max_sends 20 with two equal boxes → 10 / 10', async () => {
    const r = await call(PATH, { client_id: 'client-1', max_sends: 20 })
    const per = (r.payload.data as { per_mailbox: Record<string, number> }).per_mailbox
    expect(per['jacques@kindoutreach.com']).toBe(10)
    expect(per['hello@kindoutreach.com']).toBe(10)
  })

  it('15 · asking for more than the mailboxes can carry stops safely at capacity', async () => {
    state.inboxesByClient['client-1'] = [BOX('jacques@kindoutreach.com', { daily_cap: 3 })]
    const r = await call(PATH, { client_id: 'client-1', max_sends: 25 })
    const d = r.payload.data as Row
    expect(d.sent).toBe(3)
    expect((d.exhausted_clients as string[])).toEqual(['client-1'])
  })
})

// ── ROTATION + CAPS ──────────────────────────────────────────────────────────────────────
describe('the REAL run rotates and honours each mailbox cap', () => {
  it('both an active branded AND an active pooled box are used', async () => {
    await call(PATH, { client_id: 'client-1', max_sends: 6 })
    const used = new Set(state.sends.map(s => s.inbox))
    expect(used).toEqual(new Set(['jacques@kindoutreach.com', 'hello@kindoutreach.com']))
  })

  it('16 · caps 5 / 30 → the small box stops at 5 and the other carries the rest', async () => {
    state.inboxesByClient['client-1'] = [
      BOX('jacques@kindoutreach.com', { daily_cap: 5 }),
      BOX('hello@kindoutreach.com', { kind: 'pooled', daily_cap: 30 }),
    ]
    const r = await call(PATH, { client_id: 'client-1', max_sends: 20 })
    const per = (r.payload.data as { per_mailbox: Record<string, number> }).per_mailbox
    expect(per['jacques@kindoutreach.com']).toBe(5)
    expect(per['hello@kindoutreach.com']).toBe(15)
  })

  it('17 · both boxes capped → the run stops and remaining enrolments are untouched', async () => {
    state.inboxesByClient['client-1'] = [
      BOX('jacques@kindoutreach.com', { daily_cap: 2 }),
      BOX('hello@kindoutreach.com', { kind: 'pooled', daily_cap: 2 }),
    ]
    const r = await call(PATH, { client_id: 'client-1', max_sends: 30 })
    const d = r.payload.data as Row
    expect(d.sent).toBe(4)
    expect(d.exhausted_clients).toEqual(['client-1'])
    // 40 enrolments were due; only 4 were ever attempted, so 36 were never touched.
    expect(d.attempted).toBe(4)
  })

  it('a client with no sendable mailbox is exhausted immediately, not attempted', async () => {
    state.inboxesByClient['client-1'] = [BOX('warm@kindoutreach.com', { status: 'warming' })]
    const r = await call(PATH, { client_id: 'client-1', max_sends: 5 })
    const d = r.payload.data as Row
    expect(d.sent).toBe(0)
    expect(d.attempted).toBe(0)
    expect(d.exhausted_clients).toEqual(['client-1'])
  })
})

// ── SMTP FAILURE ─────────────────────────────────────────────────────────────────────────
describe('a broken mailbox is evicted from THIS run and no other', () => {
  it('18/19 · a failed send evicts that box and does not consume quota', async () => {
    state.outcomeFor['jacques@kindoutreach.com'] = 'failed'
    const r = await call(PATH, { client_id: 'client-1', max_sends: 6 })
    const d = r.payload.data as { sent: number; failed: number; per_mailbox: Record<string, number>; evicted_mailboxes: string[] }
    expect(d.failed).toBe(1)
    expect(d.evicted_mailboxes).toEqual(['jacques@kindoutreach.com'])
    // It was tried once and never again — the rest went to the healthy box.
    expect(state.sends.filter(s => s.inbox === 'jacques@kindoutreach.com')).toHaveLength(1)
    expect(d.per_mailbox['jacques@kindoutreach.com']).toBeUndefined()
    expect(d.per_mailbox['hello@kindoutreach.com']).toBe(6)
  })

  it('19b · a non-sending outcome does NOT advance least-used — the quota tracks SUCCESS only', async () => {
    // 🛑 THE PROOF THAT INCREMENT-ON-ATTEMPT WOULD BE WRONG. `jacques@` defers every time, so
    // it never accrues a successful send and stays permanently least-used — the rotation
    // therefore keeps offering it while `hello@`, having actually sent once, moves ahead.
    // Under increment-on-ATTEMPT the two would advance together and alternate roughly evenly.
    // The lopsided split is the tell.
    state.outcomeFor = { 'jacques@kindoutreach.com': 'deferred' }
    const r = await call(PATH, { client_id: 'client-1', max_sends: 3 })
    const jac = state.sends.filter(s => s.inbox === 'jacques@kindoutreach.com').length
    const hel = state.sends.filter(s => s.inbox === 'hello@kindoutreach.com').length
    expect(hel, 'the healthy box sent, so it advanced and stepped aside').toBe(1)
    expect(jac, `the deferring box must keep being chosen; alternating would be ~${hel}`).toBeGreaterThan(10)
    // and only the box that really sent is counted
    expect((r.payload.data as { per_mailbox: Record<string, number> }).per_mailbox)
      .toEqual({ 'hello@kindoutreach.com': 1 })
  })

  it('20 · deferred / suppressed / queued do NOT evict — they are healthy outcomes', async () => {
    for (const outcome of ['deferred', 'suppressed', 'queued']) {
      state.sends = []; state.outcomeFor = { 'jacques@kindoutreach.com': outcome }
      const r = await call(PATH, { client_id: 'client-1', max_sends: 6 })
      const d = r.payload.data as { evicted_mailboxes: string[] }
      expect(d.evicted_mailboxes, `${outcome} must not evict`).toEqual([])
      // Still chosen repeatedly, because least-used never advances for a non-send.
      expect(state.sends.filter(s => s.inbox === 'jacques@kindoutreach.com').length).toBeGreaterThan(1)
    }
  })

  it('every box failing exhausts the client rather than looping', async () => {
    state.outcomeFor = { 'jacques@kindoutreach.com': 'failed', 'hello@kindoutreach.com': 'failed' }
    const r = await call(PATH, { client_id: 'client-1', max_sends: 10 })
    const d = r.payload.data as Row
    expect(d.sent).toBe(0)
    expect(d.failed).toBe(2)
    expect(d.exhausted_clients).toEqual(['client-1'])
  })
})

// ── CLIENT ISOLATION ─────────────────────────────────────────────────────────────────────
describe('one client per run, and never another client\'s mailbox', () => {
  it('12 · a Run-once for client A never touches client B', async () => {
    state.campaigns = [
      { id: 'camp-client-1', client_id: 'client-1', settings: null },
      { id: 'camp-client-2', client_id: 'client-2', settings: null },
    ]
    state.enrollments = [...Array.from({ length: 5 }, (_, i) => ENROL(i, 'client-1')),
                         ...Array.from({ length: 5 }, (_, i) => ENROL(i, 'client-2'))]
    state.inboxesByClient['client-2'] = [BOX('other@elsewhere.test')]
    await call(PATH, { client_id: 'client-1', max_sends: 10 })
    expect(state.sends.every(s => s.inbox.endsWith('@kindoutreach.com'))).toBe(true)
    expect(state.sends.some(s => s.inbox === 'other@elsewhere.test')).toBe(false)
  })

  it('the scoping is at the CAMPAIGN QUERY — asserted as a filter, not as an empty result', async () => {
    await call(PATH, { client_id: 'client-1', max_sends: 2 })
    expect(state.campaignFilters).toContainEqual({ col: 'client_id', val: 'client-1' })
  })

  it('21 · in the shared implementation, one exhausted client does not stop another', async () => {
    // Automatic mode spans clients: A has no capacity, B must still send.
    process.env.AUTO_OUTREACH_ENABLED = 'true'
    state.campaigns = [
      { id: 'camp-client-1', client_id: 'client-1', settings: null },
      { id: 'camp-client-2', client_id: 'client-2', settings: null },
    ]
    state.enrollments = [...Array.from({ length: 4 }, (_, i) => ENROL(i, 'client-1')),
                         ...Array.from({ length: 4 }, (_, i) => ENROL(i, 'client-2'))]
    state.inboxesByClient = {
      'client-1': [BOX('a@one.test', { daily_cap: 0 })],
      'client-2': [BOX('b@two.test')],
    }
    const data = await cronRun()
    const d = (data.data ?? data) as Row
    expect(d.exhausted_clients).toEqual(['client-1'])
    expect(state.sends.every(s => s.inbox === 'b@two.test')).toBe(true)
    expect(state.sends.length).toBe(4)
  })
})

// ── NOTHING ELSE MOVED ───────────────────────────────────────────────────────────────────
describe('the surrounding rules are untouched', () => {
  it('22 · SENDABLE_STATUSES unchanged — assigned and active, never warming', () => {
    const src = readFileSync(join(__dirname, '../lib/sending-inbox.ts'), 'utf8')
    expect(src).toContain("const SENDABLE_STATUSES = new Set(['assigned', 'active'])")
    expect(src).not.toMatch(/SENDABLE_STATUSES\s*=\s*new Set\(\[[^\]]*'warming'/)
  })

  it('23 · the automatic authority gate itself is unchanged', () => {
    const src = readFileSync(join(__dirname, '../lib/figsy.ts'), 'utf8')
    expect(src).toContain("return process.env.AUTO_OUTREACH_ENABLED === 'true'")
    expect(src).toContain("return process.env.FIGSY_OPERATOR_SEND_ENABLED === 'true'")
    // Ranking and the legacy programme fallthrough are not part of this change.
    expect(readFileSync(join(__dirname, '../lib/sending-inbox.ts'), 'utf8'))
      .toContain("return (String(r.status) === 'active' ? 0 : 1) * 10 + (String(r.kind) === 'branded' ? 0 : 1)")
    expect(readFileSync(join(__dirname, '../lib/programme-authority.ts'), 'utf8'))
      .toMatch(/if \(!programme\) return \{ allowed: true, mode: 'legacy', programme: null \}/)
  })

  it('no global daily ceiling was invented, and mailbox caps are read from the row', () => {
    const src = readFileSync(join(__dirname, '../lib/send-due.ts'), 'utf8')
    expect(src).toContain('b.daily_cap ?? null')
    expect(src, 'no hardcoded 30/day rule').not.toMatch(/=\s*30\b/)
  })

  it('the audit row names the run under its own action', async () => {
    await call(PATH, { client_id: 'client-1', max_sends: 3 })
    expect(state.audit).toHaveLength(1)
    expect(state.audit[0].action).toBe('operator_send_run')
    expect(state.audit[0].detail).toMatchObject({ max_sends: 3, sent: 3 })
  })

  it('25 · one request produces one execution — the handler is not re-entrant per call', async () => {
    const r = await call(PATH, { client_id: 'client-1', max_sends: 5 })
    expect((r.payload.data as Row).sent).toBe(5)
    expect(state.sends).toHaveLength(5)
    // and the UI disables the control while a request is in flight
    const ui = readFileSync(join(__dirname, '../../../admin/src/app/vida/engine/page.tsx'), 'utf8')
    expect(ui).toContain('disabled={busy === `r-${c.clientId}`')
    expect(ui, 'confirmation must name the client and the ceiling').toMatch(/Run up to \$\{max\} campaign sends for \$\{clientName\}/)
    expect(ui, 'no effect may trigger a run').not.toMatch(/useEffect[\s\S]{0,300}runOnce\(/)
  })
})
