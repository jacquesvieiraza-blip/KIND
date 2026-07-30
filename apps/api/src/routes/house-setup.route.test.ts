import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'

// #547/#552/#553 — THE TWO ROUTES CLIENT ZERO NEEDS, DRIVEN THROUGH THE REAL HANDLERS.
//
// The judgement is unit-tested in `lib/house-client.test.ts`. What only a route test can pin
// is what the handler DOES with that judgement — the lesson of #541 and #571, where the
// helper was right and the route called it wrong.
//
// Three properties, and all three are the kind that fail silently:
//
//   ① THE PASSWORD IS NEVER STORED OR RETURNED IN PLAINTEXT. Not in the row, not in the
//      response, not in the audit detail. A password that leaks into an audit blob is a
//      password in a table half the admin surfaces read.
//   ② NO KEY MEANS NO ROW. With INBOX_SECRET_KEY unset the password cannot be encrypted, and
//      the wrong answer is to save the mailbox anyway "and add the password later" — that
//      leaves a credential-less row that reads as ADDED on the board and sends nothing.
//   ③ THE HOUSE CLIENT IS ADOPTED, NOT DUPLICATED, and pressing the button twice is safe.

type Row = Record<string, unknown>

const state = {
  client: { id: 'client-1', company_name: 'Acme' } as Row | null,
  /** rows in `client_inboxes` — the duplicate check reads this */
  existingInbox: null as Row | null,
  existingInboxError: null as { message: string } | null,
  /** every row inserted, by table */
  inserts: [] as { table: string; row: Row }[],
  insertError: null as { message: string } | null,
  updates: [] as { table: string; patch: Row }[],
  audit: [] as Row[],
  /** house-client route state */
  houseUserIds: ['u-house'] as string[],
  clients: [] as Row[],
  clientsError: null as { message: string } | null,
  paidCount: 0,
  canSend: false,
}

function query(table: string) {
  let counting = false
  const q: Record<string, unknown> = {
    select(_c?: string, opts?: { count?: string; head?: boolean }) { counting = !!opts?.count; return q },
    eq() { return q }, in() { return q }, is() { return q }, not() { return q },
    order() { return q }, limit() { return q },
    async maybeSingle() {
      if (table === 'clients') {
        return { data: state.client ? { ...state.client } : null, error: null }
      }
      if (table === 'client_inboxes') {
        return { data: state.existingInbox, error: state.existingInboxError }
      }
      return { data: null, error: null }
    },
    insert(row: Row) {
      state.inserts.push({ table, row })
      const err = state.insertError
      const made = { id: `${table}-new`, ...row }
      delete (made as Row).smtp_pass_enc   // the real select never asks for it
      return {
        select: () => ({
          async single() { return { data: err ? null : made, error: err } },
          async maybeSingle() { return { data: err ? null : made, error: err } },
        }),
        then: (r: (v: unknown) => unknown) => r({ data: null, error: err }),
      }
    },
    update(patch: Row) {
      state.updates.push({ table, patch })
      return { eq: async () => ({ error: null }), then: (r: (v: unknown) => unknown) => r({ error: null }) }
    },
    then(resolve: (v: { data: Row[] | null; count?: number; error: unknown }) => unknown) {
      if (table === 'clients') {
        return resolve(state.clientsError ? { data: null, error: state.clientsError } : { data: state.clients, error: null })
      }
      if (table === 'credit_transactions' && counting) {
        return resolve({ data: [], count: state.paidCount, error: null })
      }
      return resolve({ data: [], count: 0, error: null })
    },
  }
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => query(t), rpc: async () => ({ data: null, error: null }) } }))
vi.mock('./admin', () => ({ adminKeyValid: () => true }))
vi.mock('../lib/real-clients', () => ({
  getExcludedClientIds: async () => new Set<string>(),
  resolveHouseUserIds: async () => new Set(state.houseUserIds),
}))
vi.mock('../lib/operator-audit', () => ({
  writeOperatorAudit: async (e: Row) => { state.audit.push(e) },
  campaignAuditAction: () => 'start_campaign',
}))
vi.mock('../lib/start-work', async (orig) => {
  const actual = await orig() as Record<string, unknown>
  return { ...actual, sendReadiness: async () => (
    state.canSend
      ? { canSend: true }
      : { canSend: false, warning: { headline: 'This client cannot SEND yet', label: 'No sending mailbox assigned', detail: 'x', reason: 'no_inbox' } }
  ) }
})

async function call(path: string, body: unknown) {
  const { operatorRouter } = await import('./operator')
  const layer = (operatorRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }> })
    .stack.find(l => l.route?.path === path && l.route?.methods.post)
  if (!layer?.route) throw new Error(`POST ${path} not found on the operator router`)
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const res: { code: number; payload: Row } = { code: 200, payload: {} }
  const fakeRes = {
    status(c: number) { res.code = c; return fakeRes },
    json(p: Row) { res.payload = p; return fakeRes },
  }
  await handler({ body, headers: { 'x-operator-email': 'op@kind.test' }, params: {}, query: {} }, fakeRes, () => {})
  return res
}

const KEY = 'a'.repeat(64)
const ORIGINAL_KEY = process.env.INBOX_SECRET_KEY
const PASSWORD = 'super-secret-app-password'
const MAILBOX = (o: Row = {}) => ({
  client_id: 'client-1', email: 'jacques@get-kind.com', kind: 'branded', provider: 'google-smtp',
  status: 'warming', smtp_host: 'smtp.gmail.com', smtp_port: '587', smtp_user: 'jacques@get-kind.com',
  smtp_pass: PASSWORD, from_name: 'Jacques', daily_cap: 30, ...o,
})

beforeEach(() => {
  process.env.INBOX_SECRET_KEY = KEY
  state.client = { id: 'client-1', company_name: 'Acme' }
  state.existingInbox = null
  state.existingInboxError = null
  state.inserts = []
  state.insertError = null
  state.updates = []
  state.audit = []
  state.houseUserIds = ['u-house']
  state.clients = []
  state.clientsError = null
  state.paidCount = 0
  state.canSend = false
})
afterAll(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.INBOX_SECRET_KEY
  else process.env.INBOX_SECRET_KEY = ORIGINAL_KEY
})

const inboxRow = () => state.inserts.find(i => i.table === 'client_inboxes')?.row

describe('① the mailbox password is never stored, returned or logged in plaintext', () => {
  it('the stored value is ciphertext in the v1 envelope, never the password', async () => {
    const r = await call('/inboxes', MAILBOX())
    expect(r.code).toBe(200)
    const row = inboxRow()!
    expect(row.smtp_pass_enc).toBeTruthy()
    expect(String(row.smtp_pass_enc)).not.toContain(PASSWORD)
    expect(String(row.smtp_pass_enc)).toMatch(/^v1:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/)
  })

  it('and it round-trips — this is encryption, not a one-way mangle', async () => {
    // Without this the first assertion would pass on a value that merely LOOKS encrypted,
    // and nothing would send because the stored password decrypts to nothing.
    await call('/inboxes', MAILBOX())
    const { decryptSecret } = await import('../lib/inbox-secret')
    expect(decryptSecret(String(inboxRow()!.smtp_pass_enc))).toBe(PASSWORD)
  })

  it('the API response carries neither the password nor the ciphertext', async () => {
    const r = await call('/inboxes', MAILBOX())
    const body = JSON.stringify(r.payload)
    expect(body).not.toContain(PASSWORD)
    expect(body).not.toContain('smtp_pass_enc')
  })

  it('the audit row records THAT a password was set, never the password', async () => {
    // An audit blob is read by several admin surfaces. A password in one is a password in
    // all of them.
    await call('/inboxes', MAILBOX())
    const detail = state.audit[0].detail as Row
    expect(detail.password_set).toBe(true)
    expect(JSON.stringify(state.audit)).not.toContain(PASSWORD)
  })
})

describe('② no INBOX_SECRET_KEY means NO ROW — fail closed, and say why', () => {
  it('refuses with the fix when the key is unset, and writes nothing at all', async () => {
    // The tempting wrong answer is "save the mailbox and add the password later". That
    // leaves a credential-less row reading as ADDED on the board that sends nothing (#552).
    delete process.env.INBOX_SECRET_KEY
    const r = await call('/inboxes', MAILBOX())
    expect(r.code).toBe(503)
    expect(String(r.payload.error)).toContain('INBOX_SECRET_KEY is not set')
    expect(String(r.payload.error)).toContain('never be stored unencrypted')
    expect(String(r.payload.error)).toContain('Nothing was written')
    expect(state.inserts).toEqual([])
  })

  it('a malformed key is refused too, with its own wording', async () => {
    process.env.INBOX_SECRET_KEY = 'too-short'
    const r = await call('/inboxes', MAILBOX())
    expect(r.code).toBe(503)
    expect(String(r.payload.error)).toContain('64 hex characters')
    expect(state.inserts).toEqual([])
  })

  it('a mailbox with NO password is allowed through even with the key unset', async () => {
    // Recording the address before generating the app password is a real workflow. Nothing
    // needs encrypting, so nothing is blocked.
    delete process.env.INBOX_SECRET_KEY
    const r = await call('/inboxes', MAILBOX({ smtp_host: '', smtp_user: '', smtp_pass: '' }))
    expect(r.code).toBe(200)
    expect(inboxRow()!.smtp_pass_enc).toBeNull()
  })
})

describe('the add-mailbox route works for a client that ALREADY has mailboxes', () => {
  it('adds a second, third and fourth box without a needs_inbox card to hang off', async () => {
    // THE GAP THIS ROUTE EXISTS FOR: the only previous control lived inside the "cannot
    // send" list, so it vanished the moment mailbox #1 worked — with three still to add.
    for (const n of ['a', 'b', 'c', 'd']) {
      const r = await call('/inboxes', MAILBOX({ email: `${n}@get-kind.com` }))
      expect(r.code).toBe(200)
    }
    expect(state.inserts.filter(i => i.table === 'client_inboxes')).toHaveLength(4)
  })

  it('records provider, status and daily cap — none of which the old endpoints could set', async () => {
    await call('/inboxes', MAILBOX({ status: 'active', daily_cap: 25 }))
    const row = inboxRow()!
    expect(row.provider).toBe('google-smtp')
    expect(row.status).toBe('active')
    expect(row.daily_cap).toBe(25)
    // Active means live: no warm-up dates, because a ready date on a live box is noise.
    expect(row.warmup_ready_at).toBeUndefined()
  })

  it('a warming box carries a ready date 21 days out, not the client SOP\'s 14', async () => {
    await call('/inboxes', MAILBOX({ status: 'warming' }))
    const row = inboxRow()!
    const days = Math.round((new Date(String(row.warmup_ready_at)).getTime() - Date.now()) / 864e5)
    expect(days).toBe(21)
  })

  it('the same address twice is a 409, not a second row', async () => {
    state.existingInbox = { id: 'inbox-1', status: 'warming' }
    const r = await call('/inboxes', MAILBOX())
    expect(r.code).toBe(409)
    expect(String(r.payload.error)).toContain('already recorded')
    expect(state.inserts).toEqual([])
  })

  it('a failed duplicate CHECK aborts rather than inserting blind', async () => {
    // Treating a failed read as "no duplicate found" is the #349 shape: the empty result and
    // the broken query are indistinguishable.
    state.existingInboxError = { message: 'connection reset' }
    const r = await call('/inboxes', MAILBOX())
    expect(r.code).toBe(500)
    expect(String(r.payload.error)).toContain('nothing was written')
    expect(state.inserts).toEqual([])
  })

  it('an unknown client is a 404', async () => {
    state.client = null
    expect((await call('/inboxes', MAILBOX())).code).toBe(404)
    expect(state.inserts).toEqual([])
  })
})

describe('③ the house client is adopted, not duplicated', () => {
  it('adopts the account the house login already owns and creates nothing', async () => {
    state.clients = [{ id: 'house-1', user_id: 'u-house', company_name: 'K.I.N.D (house — Client Zero)', is_demo: false }]
    state.paidCount = 1
    const r = await call('/house-client', {})
    expect(r.code).toBe(200)
    const d = r.payload.data as Row
    expect(d.action).toBe('adopt')
    expect(d.client_id).toBe('house-1')
    expect(state.inserts.filter(i => i.table === 'clients')).toEqual([])
  })

  it('un-demos an adopted account — a demo house client cannot even be imported into', async () => {
    // is_demo excludes it from revenue AND makes the CSV import refuse it (#599).
    state.clients = [{ id: 'house-1', user_id: 'u-house', company_name: 'old name', is_demo: true }]
    state.paidCount = 1
    await call('/house-client', {})
    const patch = state.updates.find(u => u.table === 'clients')!.patch
    expect(patch.is_demo).toBe(false)
    expect(String(patch.company_name)).toContain('house')
  })

  it('creates one against the house auth user when nothing exists', async () => {
    state.paidCount = 1
    const r = await call('/house-client', {})
    expect((r.payload.data as Row).action).toBe('create')
    const row = state.inserts.find(i => i.table === 'clients')!.row
    expect(row.user_id).toBe('u-house')
    expect(row.is_demo).toBe(false)
  })

  it('comps it with a manual_grant so sourcing is not refused for lack of payment', async () => {
    // startWorkForClient's money gate refuses a client with no paid transaction, so without
    // this Client Zero would have four mailboxes and an empty desk. manual_grant is the
    // EXISTING comp pattern and already sits inside PAID_TX_TYPES.
    state.paidCount = 0
    await call('/house-client', {})
    const tx = state.inserts.find(i => i.table === 'credit_transactions')!.row
    expect(tx.type).toBe('manual_grant')
    expect(String(tx.note)).toContain('house client comp')
  })

  it('is idempotent — an already-entitled account is not comped twice', async () => {
    state.clients = [{ id: 'house-1', user_id: 'u-house', company_name: 'K.I.N.D (house — Client Zero)', is_demo: false }]
    state.paidCount = 1
    const r = await call('/house-client', {})
    expect((r.payload.data as Row).granted).toBe(false)
    expect(state.inserts).toEqual([])
    expect(state.updates).toEqual([])
  })

  it('REFUSES when the house login owns two accounts, and names them', async () => {
    state.clients = [
      { id: 'a', user_id: 'u-house', company_name: 'one', is_demo: false },
      { id: 'b', user_id: 'u-house', company_name: 'two', is_demo: false },
    ]
    const r = await call('/house-client', {})
    expect(r.code).toBe(409)
    expect((r.payload.data as Row).candidates).toHaveLength(2)
    expect(state.inserts).toEqual([])
  })

  it('REFUSES when no house auth user exists, rather than minting a login', async () => {
    state.houseUserIds = []
    const r = await call('/house-client', {})
    expect(r.code).toBe(409)
    expect(String(r.payload.error)).toContain('Sign in to the portal')
    expect(state.inserts).toEqual([])
  })

  it('a failed client-list read aborts rather than creating a duplicate house account', async () => {
    // The worst possible swallow here: an empty list looks exactly like "nothing to adopt",
    // and the route would mint a SECOND house client beside the real one.
    state.clientsError = { message: 'statement timeout' }
    const r = await call('/house-client', {})
    expect(r.code).toBe(500)
    expect(String(r.payload.error)).toContain('nothing was created')
    expect(state.inserts).toEqual([])
  })

  it('returns the HOUSE_CLIENT_ID warning alongside the id, every time', async () => {
    // The id is exactly what makes somebody want to set the variable "to finish setup".
    state.paidCount = 1
    const r = await call('/house-client', {})
    const notice = String((r.payload.data as Row).house_client_id_notice)
    expect(notice).toContain('Do NOT set HOUSE_CLIENT_ID')
    expect(notice).toContain('#593')
  })

  it('reports readiness honestly — it does not claim the account can send', async () => {
    state.paidCount = 1
    state.canSend = false
    const r = await call('/house-client', {})
    const d = r.payload.data as Row
    expect(d.can_send).toBe(false)
    expect((d.readiness as Row).reason).toBe('no_inbox')
  })
})
