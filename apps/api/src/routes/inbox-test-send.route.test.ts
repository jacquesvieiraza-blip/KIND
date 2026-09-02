// ═══════════════════════════════════════════════════════════════════════════════════════
// #553 — ONE DIAGNOSTIC EMAIL, THROUGH ONE NAMED MAILBOX, AND NO OTHER.
//
// ⚑ 2 Sep. The founder fixed `hello@kindoutreach.com`'s App Password and Vida's SMTP check
// went green — and there was still no way to prove the mailbox DELIVERS. #553's ladder asks
// for *"a test send lands in a real inbox (not Promotions, not spam) · mail-tester ≥9/10"*,
// and the runbook says to run it *"once per sending mailbox you intend to use"*.
//
// 🛑 THE CONTROL THE RUNBOOK POINTS AT TESTS THE WRONG SENDER. `/campaign/:id/test` sends
// through **Resend from `COLD_FROM`** — the shared `gettingkind.com` identity. It never opens
// `client_inboxes` and never calls `mailer.ts`. A Google box could fail inbox placement with
// every check on the board green, because nothing had ever asked that box to deliver.
//
// ⚠️ THE TWO PROPERTIES THAT WOULD FAIL SILENTLY, SO BOTH ARE TESTED AS BEHAVIOUR:
//
//   ① THE NAMED MAILBOX IS THE SENDER. `pickSendingInbox` ranks active-before-assigned and
//      branded-before-pooled and returns ONE row. On House that is `jacques@` — so a
//      diagnostic that went anywhere near the ranked picker would test the wrong box however
//      carefully the operator chose, and would look like it worked.
//   ② THE `warming` EXCEPTION IS BOUNDED. Production sending must keep refusing warming
//      boxes; only this route may test one. A test that merely asserted "warming can test"
//      would pass just as happily if someone had widened `SENDABLE_STATUSES` to get there.
//
// ⚠️ AND WHAT MUST NOT HAPPEN: no campaign, no enrolment, no lead, no `figsy_sent_emails`
// row, no status change, no warm-up timestamp change, no Instantly call, no Resend call.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// Importing the operator router pulls in the auth middleware, which constructs a Supabase
// client at module load. Same convention as `kind-owns-go.test.ts` — a local placeholder so
// the module can load; every query in this file is mocked and none of it is ever dialled.
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321'
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key'

type Row = Record<string, unknown>

const state = {
  client: { id: 'client-1', company_name: 'K.I.N.D (house — Client Zero)' } as Row | null,
  /** every `client_inboxes` row, keyed by the (id, client_id) the query filters on */
  inboxes: [] as Row[],
  /** what the query was actually filtered by — proves the scope, not just the result */
  filters: [] as Array<{ table: string; col: string; val: unknown }>,
  inboxError: null as { message: string } | null,
  inserts: [] as { table: string; row: Row }[],
  updates: [] as { table: string; patch: Row }[],
  audit: [] as Row[],
  /** every `sendAs` call: the inbox row it was handed, and the mail */
  sends: [] as { inbox: Row; mail: Row }[],
  sendOk: true,
  sendError: 'Invalid login: 535-5.7.8 Username and Password not accepted',
}

function query(table: string) {
  const eqs: Array<{ col: string; val: unknown }> = []
  const q: Record<string, unknown> = {
    select() { return q },
    eq(col: string, val: unknown) { eqs.push({ col, val }); state.filters.push({ table, col, val }); return q },
    in() { return q }, is() { return q }, not() { return q }, order() { return q }, limit() { return q },
    async maybeSingle() {
      if (table === 'clients') return { data: state.client ? { ...state.client } : null, error: null }
      if (table === 'client_inboxes') {
        if (state.inboxError) return { data: null, error: state.inboxError }
        const hit = state.inboxes.find(r => eqs.every(e => r[e.col] === e.val))
        return { data: hit ? { ...hit } : null, error: null }
      }
      return { data: null, error: null }
    },
    insert(row: Row) {
      state.inserts.push({ table, row })
      return { select: () => ({ single: async () => ({ data: { id: `${table}-new`, ...row }, error: null }) }), error: null }
    },
    update(patch: Row) { state.updates.push({ table, patch }); return q },
  }
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => query(t), rpc: async () => ({ data: null, error: null }) } }))
vi.mock('./admin', () => ({ adminKeyValid: () => true }))
vi.mock('../lib/operator-audit', () => ({
  writeOperatorAudit: async (e: Row) => { state.audit.push(e) },
  campaignAuditAction: () => 'start_campaign',
}))

const sendAsMock = vi.fn(async (inbox: Row, mail: Row) => {
  state.sends.push({ inbox, mail })
  return state.sendOk
    ? { ok: true, id: '<msg-1@kindoutreach.com>', error: null }
    : { ok: false, id: null, error: new Error(state.sendError) }
})
const verifyInboxMock = vi.fn(async () => ({ ok: true, message: 'connected' }))
vi.mock('../lib/mailer', () => ({ sendAs: sendAsMock, verifyInbox: verifyInboxMock }))

// If this route ever reached Resend or Instantly, these would record it.
const resendSend = vi.fn(async () => ({ error: null }))
vi.mock('resend', () => ({ Resend: class { emails = { send: resendSend } } }))
const instantlyPush = vi.fn(async () => ({ pushed: false, reason: 'no_api_key', detail: '' }))
vi.mock('../lib/instantly-push', () => ({ pushApprovedLeadToInstantly: instantlyPush }))

const BOX = (o: Row = {}): Row => ({
  id: 'inbox-hello', client_id: 'client-1', email: 'hello@kindoutreach.com',
  kind: 'pooled', status: 'warming',
  smtp_host: 'smtp.gmail.com', smtp_port: 587, smtp_secure: false,
  smtp_user: 'hello@kindoutreach.com', smtp_pass_enc: 'v1:cipher', from_name: 'Jacques',
  warmup_started_at: '2026-08-28T09:00:00.000Z', warmup_ready_at: '2026-09-18T09:00:00.000Z',
  ...o,
})

/** Drive the real handler through the real router. */
async function call(path: string, body: Row): Promise<{ code: number; payload: Record<string, unknown> }> {
  const { operatorRouter } = await import('./operator')
  const layer = (operatorRouter as unknown as { stack: Array<{ route?: { path: string; stack: Array<{ handle: unknown }> } }> })
    .stack.find(l => l.route?.path === path)
  if (!layer?.route) throw new Error(`route ${path} not registered`)
  const handler = layer.route.stack[layer.route.stack.length - 1].handle as
    (req: unknown, res: unknown) => Promise<void>

  let code = 200
  const payload: Record<string, unknown> = {}
  const res = {
    status(c: number) { code = c; return res },
    json(p: Record<string, unknown>) { Object.assign(payload, p); return res },
  }
  await handler(
    { body, params: { id: String(body.__id ?? 'inbox-hello') }, headers: { 'x-operator-email': 'jacques@get-kind.com' }, query: {} },
    res,
  )
  return { code, payload }
}

beforeEach(() => {
  process.env.ADMIN_API_KEY = 'test-admin-key'
  state.client = { id: 'client-1', company_name: 'K.I.N.D (house — Client Zero)' }
  state.inboxes = [BOX()]
  state.filters = []; state.inboxError = null
  state.inserts = []; state.updates = []; state.audit = []
  state.sends = []; state.sendOk = true
  sendAsMock.mockClear(); resendSend.mockClear(); instantlyPush.mockClear()
})

const PATH = '/inboxes/:id/test-send'

// ── ① THE NAMED MAILBOX IS THE SENDER ────────────────────────────────────────────────────
describe('the mailbox id decides the sender — there is no rotation on this path', () => {
  it('sends through the row addressed by :id, not the one a ranked picker would choose', async () => {
    // House exactly: an ACTIVE BRANDED box that `pickSendingInbox` ranks first, and the
    // WARMING POOLED box the operator actually wants to test. Rotation would pick jacques@.
    state.inboxes = [
      BOX({ id: 'inbox-jacques', email: 'jacques@kindoutreach.com', smtp_user: 'jacques@kindoutreach.com', kind: 'branded', status: 'active' }),
      BOX(),
    ]
    const r = await call(PATH, { __id: 'inbox-hello', client_id: 'client-1', to_email: 'me@get-kind.com' })
    expect(r.code).toBe(200)
    expect(state.sends).toHaveLength(1)
    expect(state.sends[0].inbox.smtp_user).toBe('hello@kindoutreach.com')
    expect(state.sends[0].inbox.id).toBe('inbox-hello')
    expect(r.payload.data).toMatchObject({ sent: true, from: 'hello@kindoutreach.com' })
  })

  it('🛑 the ranked picker is never consulted — the route holds no reference to it', () => {
    // A behaviour test cannot catch a future edit that resolves the row and then "helpfully"
    // asks pickSendingInbox to confirm it. The absence is the guarantee, so it is asserted.
    const src = readFileSync(join(__dirname, 'operator.ts'), 'utf8')
    const route = src.slice(src.indexOf("operatorRouter.post('/inboxes/:id/test-send'"))
      .slice(0, src.slice(src.indexOf("operatorRouter.post('/inboxes/:id/test-send'")).indexOf('\n})') + 3)
    expect(route).not.toBe('')
    for (const banned of ['pickSendingInbox', 'sendablePool', 'nextFromRotation', 'resolveSendingInbox']) {
      expect(route, `the diagnostic path must not consult ${banned}`).not.toContain(banned)
    }
    expect(route).toContain('sendAs')
  })

  it('the send names the mailbox in its own subject and body, so a stray test is traceable', async () => {
    await call(PATH, { client_id: 'client-1', to_email: 'me@get-kind.com' })
    expect(state.sends[0].mail.subject).toBe('M&V mailbox test — hello@kindoutreach.com')
    expect(String(state.sends[0].mail.text)).toContain('hello@kindoutreach.com')
    expect(String(state.sends[0].mail.text)).toContain('No campaign or outreach has been enabled.')
    expect(state.sends[0].mail.html, 'plain text only — HTML changes what a spam filter scores').toBeUndefined()
  })
})

// ── ② THE warming EXCEPTION IS BOUNDED ───────────────────────────────────────────────────
describe('warming may be TESTED here and must stay unsendable everywhere else', () => {
  it('a warming mailbox can be tested — otherwise #553 could never be climbed', async () => {
    state.inboxes = [BOX({ status: 'warming' })]
    const r = await call(PATH, { client_id: 'client-1', to_email: 'me@get-kind.com' })
    expect(r.code).toBe(200)
    expect(r.payload.data).toMatchObject({ sent: true })
  })

  it('🛑 production sender selection STILL refuses warming — the rule was not widened', async () => {
    const { pickSendingInbox, sendablePool } = await import('../lib/sending-inbox')
    const warming = [{ ...BOX(), status: 'warming' }] as never
    const picked = pickSendingInbox(warming, true)
    expect(picked.ok).toBe(false)
    expect((picked as { reason: string }).reason).toBe('warming_only')
    expect(sendablePool(warming, true).ok).toBe(false)
  })

  it('and SENDABLE_STATUSES itself is unchanged — assigned and active, never warming', () => {
    const src = readFileSync(join(__dirname, '../lib/sending-inbox.ts'), 'utf8')
    expect(src).toContain("const SENDABLE_STATUSES = new Set(['assigned', 'active'])")
    expect(src).not.toMatch(/SENDABLE_STATUSES\s*=\s*new Set\(\[[^\]]*'warming'/)
  })

  it('a released or retired mailbox is refused — out of service is not tested back in', async () => {
    for (const status of ['released', 'retired']) {
      state.inboxes = [BOX({ status })]
      state.sends = []
      const r = await call(PATH, { client_id: 'client-1', to_email: 'me@get-kind.com' })
      expect(r.code).toBe(409)
      expect(state.sends).toHaveLength(0)
    }
  })
})

// ── ③ THE KILL-SWITCH IS NOT REQUIRED, AND NOT TOUCHED ───────────────────────────────────
describe('an explicit operator test does not need outreach enabled', () => {
  it('sends with AUTO_OUTREACH_ENABLED unset', async () => {
    delete process.env.AUTO_OUTREACH_ENABLED
    const r = await call(PATH, { client_id: 'client-1', to_email: 'me@get-kind.com' })
    expect(r.payload.data).toMatchObject({ sent: true })
  })

  it('the route never reads or writes the kill-switch, HOUSE_CLIENT_ID or paid providers', () => {
    const src = readFileSync(join(__dirname, 'operator.ts'), 'utf8')
    const start = src.indexOf("operatorRouter.post('/inboxes/:id/test-send'")
    const route = src.slice(start, start + src.slice(start).indexOf('\n})') + 3)
    for (const banned of ['AUTO_OUTREACH_ENABLED', 'HOUSE_CLIENT_ID', 'PAID_PROVIDERS_ENABLED']) {
      expect(route).not.toContain(banned)
    }
  })
})

// ── ④ EXACTLY ONE MESSAGE, AND NOTHING ELSE WRITTEN ──────────────────────────────────────
describe('one email, no campaign, no enrolment, no lead, no counted volume', () => {
  it('sends exactly once', async () => {
    await call(PATH, { client_id: 'client-1', to_email: 'me@get-kind.com' })
    expect(sendAsMock).toHaveBeenCalledTimes(1)
    expect(state.sends).toHaveLength(1)
  })

  it('writes NOTHING to the product tables — the audit log is the only record', async () => {
    await call(PATH, { client_id: 'client-1', to_email: 'me@get-kind.com' })
    // The audit goes through `writeOperatorAudit` (mocked), so a clean run inserts NO rows
    // of its own at all — and the audit still landed.
    expect(state.inserts.map(i => i.table)).toEqual([])
    expect(state.audit).toHaveLength(1)
  })

  it('🛑 no figsy_sent_emails row — its lead_id is NOT NULL and five surfaces read it as the CLIENT\'S sent-counter', async () => {
    await call(PATH, { client_id: 'client-1', to_email: 'me@get-kind.com' })
    expect(state.inserts.filter(i => i.table === 'figsy_sent_emails')).toHaveLength(0)
  })

  it('updates nothing at all — status, warm-up dates and caps are untouched', async () => {
    await call(PATH, { client_id: 'client-1', to_email: 'me@get-kind.com' })
    expect(state.updates).toEqual([])
    // and the row the handler read is byte-identical to the row it was given
    expect(state.inboxes[0].status).toBe('warming')
    expect(state.inboxes[0].warmup_started_at).toBe('2026-08-28T09:00:00.000Z')
    expect(state.inboxes[0].warmup_ready_at).toBe('2026-09-18T09:00:00.000Z')
  })

  it('the audit row names the real sender, recipient and outcome under its own action', async () => {
    await call(PATH, { client_id: 'client-1', to_email: 'me@get-kind.com' })
    expect(state.audit).toHaveLength(1)
    expect(state.audit[0].action).toBe('mailbox_test_send')
    expect(state.audit[0].detail).toMatchObject({ from: 'hello@kindoutreach.com', to: 'me@get-kind.com', delivered: true })
  })
})

// ── ⑤ THE OTHER SEND PATHS ARE NOT USED ──────────────────────────────────────────────────
describe('neither Resend/COLD_FROM nor Instantly is reached', () => {
  it('Resend is never called — that is the bug this route exists to route around', async () => {
    await call(PATH, { client_id: 'client-1', to_email: 'me@get-kind.com' })
    expect(resendSend).not.toHaveBeenCalled()
  })

  it('the Instantly push is never called', async () => {
    await call(PATH, { client_id: 'client-1', to_email: 'me@get-kind.com' })
    expect(instantlyPush).not.toHaveBeenCalled()
  })

  it('and the route holds no reference to either', () => {
    const src = readFileSync(join(__dirname, 'operator.ts'), 'utf8')
    const start = src.indexOf("operatorRouter.post('/inboxes/:id/test-send'")
    const route = src.slice(start, start + src.slice(start).indexOf('\n})') + 3)
    for (const banned of ['COLD_FROM', 'resend', 'Resend', 'instantly', 'Instantly']) {
      expect(route, `the diagnostic path must not reach ${banned}`).not.toContain(banned)
    }
  })
})

// ── ⑥ REFUSALS ───────────────────────────────────────────────────────────────────────────
describe('what it refuses, and refuses before connecting to anything', () => {
  it('a foreign mailbox id is rejected — the query is scoped by client_id as well as id', async () => {
    state.inboxes = [BOX({ id: 'inbox-other', client_id: 'client-2' })]
    const r = await call(PATH, { __id: 'inbox-other', client_id: 'client-1', to_email: 'me@get-kind.com' })
    expect(r.code).toBe(404)
    expect(state.sends).toHaveLength(0)
    // The scope is the ASSERTION, not the empty result: an id-only filter would also
    // return nothing here while still being wrong.
    const cols = state.filters.filter(f => f.table === 'client_inboxes').map(f => f.col)
    expect(cols).toContain('id')
    expect(cols).toContain('client_id')
  })

  it('an unknown client is rejected before the mailbox is even read', async () => {
    state.client = null
    const r = await call(PATH, { client_id: 'nope', to_email: 'me@get-kind.com' })
    expect(r.code).toBe(404)
    expect(state.filters.some(f => f.table === 'client_inboxes')).toBe(false)
    expect(state.sends).toHaveLength(0)
  })

  it('a missing or malformed recipient is rejected before anything connects', async () => {
    for (const to of [undefined, '', '   ', 'not-an-email', 'me@', '@get-kind.com']) {
      state.sends = []; state.filters = []
      const r = await call(PATH, { client_id: 'client-1', to_email: to })
      expect(r.code, `"${to}" must be refused`).toBe(400)
      expect(state.sends).toHaveLength(0)
      expect(state.filters.some(f => f.table === 'client_inboxes'), 'refused before the mailbox read').toBe(false)
    }
  })

  it('a mailbox with no SMTP details is refused with the reason, not a connection attempt', async () => {
    state.inboxes = [BOX({ smtp_pass_enc: null })]
    const r = await call(PATH, { client_id: 'client-1', to_email: 'me@get-kind.com' })
    expect(r.code).toBe(400)
    expect(String(r.payload.error)).toContain('no SMTP details')
    expect(state.sends).toHaveLength(0)
  })
})

// ── ⑦ A FAILED SEND TELLS THE TRUTH ──────────────────────────────────────────────────────
describe('an SMTP failure is reported as a failure, never as a send', () => {
  it('returns sent:false with the server\'s own words, and still audits the attempt', async () => {
    state.sendOk = false
    const r = await call(PATH, { client_id: 'client-1', to_email: 'me@get-kind.com' })
    // 200 like /verify: "we asked and it said no" is a completed check, not our fault.
    expect(r.code).toBe(200)
    expect(r.payload.data).toMatchObject({ sent: false, from: 'hello@kindoutreach.com' })
    expect(String((r.payload.data as Row).message)).toContain('535-5.7.8')
    expect(state.audit[0].detail).toMatchObject({ delivered: false })
  })

  it('a failed send still writes no campaign, enrolment or sent-email row', async () => {
    state.sendOk = false
    await call(PATH, { client_id: 'client-1', to_email: 'me@get-kind.com' })
    expect(state.inserts.map(i => i.table)).toEqual([])
    expect(state.updates).toEqual([])
  })
})
