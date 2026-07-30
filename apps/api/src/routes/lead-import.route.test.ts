import { describe, it, expect, vi, beforeEach } from 'vitest'

// #549 — POST /operator/import-leads, DRIVEN THROUGH THE REAL HANDLER.
//
// The decision logic is unit-tested in `lib/lead-import.test.ts` and was never the risky part.
// What is risky is what the ROUTE feeds it and what it does with the answer — the exact lesson
// of #541 and #571, where the helper was right and the route called it wrong.
//
// Four things only a route test can pin:
//
//   ① THE DEMO REFUSAL. A demo account exists to be shown to a prospect with invented data.
//      Real people landing in one means the next demo mails them.
//   ② THE READS FAIL CLOSED. `owned` and `blocked` come from the database. supabase-js RETURNS
//      `{ error }` instead of throwing (#349), so an unchecked read yields an EMPTY set that
//      looks exactly like "nobody is blocked" — and the import mails the people who opted out.
//      Both reads must abort the whole import, not proceed with a hole.
//   ③ NO MONEY MOVES. Approve is the only charge event. This route must not touch the wallet
//      or the ledger, however many rows it writes.
//   ④ A PARTIAL WRITE REPORTS THE TRUE NUMBER. If the insert dies halfway, "imported" is a lie
//      and a total is a bigger one. The operator's next move depends on the real count.

type Row = Record<string, unknown>

const state = {
  client: { id: 'client-1', company_name: 'Acme' } as Row | null,
  clientError: null as { message: string } | null,
  isDemo: false,
  /** emails this client already holds, as `leads` rows */
  ownedLeads: [] as string[],
  ownedError: null as { message: string } | null,
  blocked: [] as string[],
  blockedError: null as { message: string } | null,
  /** inserted lead batches, in order */
  inserted: [] as Row[][],
  /** fail the Nth insert batch (0-based); null = never */
  failInsertAt: null as number | null,
  audit: [] as Row[],
  /** anything written to the money tables — must stay empty */
  moneyWrites: [] as { table: string; row: unknown }[],
}

const MONEY_TABLES = ['credit_transactions', 'clients_wallet', 'subscriptions']

function query(table: string) {
  const q: Record<string, unknown> = {
    select() { return q },
    eq() { return q }, in() { return q }, is() { return q }, not() { return q },
    order() { return q }, limit() { return q },
    async maybeSingle() {
      if (table === 'clients') {
        if (state.clientError) return { data: null, error: state.clientError }
        return { data: state.client ? { ...state.client, is_demo: state.isDemo } : null, error: null }
      }
      return { data: null, error: null }
    },
    insert(rows: Row | Row[]) {
      if (MONEY_TABLES.includes(table)) state.moneyWrites.push({ table, row: rows })
      if (table === 'leads') {
        const batch = Array.isArray(rows) ? rows : [rows]
        const idx = state.inserted.length
        state.inserted.push(batch)
        if (state.failInsertAt === idx) {
          return { select: async () => ({ data: null, error: { message: 'duplicate key value violates unique constraint' } }) }
        }
        return { select: async () => ({ data: batch.map((_, i) => ({ id: `lead-${idx}-${i}` })), error: null }) }
      }
      return { select: async () => ({ data: [], error: null }), then: (r: (v: unknown) => unknown) => r({ error: null }) }
    },
    then(resolve: (v: { data: Row[] | null; error: unknown }) => unknown) {
      if (table === 'leads') {
        return resolve(state.ownedError
          ? { data: null, error: state.ownedError }
          : { data: state.ownedLeads.map(e => ({ email: e })), error: null })
      }
      if (table === 'opt_out_blocklist') {
        return resolve(state.blockedError
          ? { data: null, error: state.blockedError }
          : { data: state.blocked.map(e => ({ email: e })), error: null })
      }
      return resolve({ data: [], error: null })
    },
  }
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => query(t), rpc: async () => ({ data: null, error: null }) } }))
vi.mock('./admin', () => ({ adminKeyValid: () => true }))
vi.mock('../lib/real-clients', () => ({ getExcludedClientIds: async () => new Set<string>() }))
vi.mock('../lib/operator-audit', () => ({
  writeOperatorAudit: async (e: Row) => { state.audit.push(e) },
  campaignAuditAction: () => 'start_campaign',
}))

async function callImport(body: unknown) {
  const { operatorRouter } = await import('./operator')
  const layer = (operatorRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }> })
    .stack.find(l => l.route?.path === '/import-leads' && l.route?.methods.post)
  if (!layer?.route) throw new Error('POST /import-leads not found on the operator router')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const res: { code: number; payload: Row } = { code: 200, payload: {} }
  const fakeRes = {
    status(c: number) { res.code = c; return fakeRes },
    json(p: Row) { res.payload = p; return fakeRes },
  }
  await handler({ body, headers: { 'x-operator-email': 'op@kind.test' }, params: {}, query: {} }, fakeRes, () => {})
  return res
}

const CSV = (...lines: string[]) => 'first name,last name,email,company\n' + lines.join('\n') + '\n'
const PERSON = (n: string) => `${n},Person,${n}@acme.test,Acme`
const data = (r: { payload: Row }) => r.payload.data as Row
const tally = (r: { payload: Row }) => data(r).tally as Record<string, number>

beforeEach(() => {
  state.client = { id: 'client-1', company_name: 'Acme' }
  state.clientError = null
  state.isDemo = false
  state.ownedLeads = []
  state.ownedError = null
  state.blocked = []
  state.blockedError = null
  state.inserted = []
  state.failInsertAt = null
  state.audit = []
  state.moneyWrites = []
})

describe('the happy path lands rows the desk query will find', () => {
  it('imports every clean row, pending and undelivered', async () => {
    const r = await callImport({ client_id: 'client-1', csv: CSV(PERSON('ada'), PERSON('grace')) })
    expect(r.code).toBe(200)
    expect(tally(r)).toEqual({ imported: 2, duplicate: 0, suppressed: 0, invalid: 0 })
    expect(data(r).inserted).toBe(2)

    const written = state.inserted.flat()
    expect(written).toHaveLength(2)
    // The desk lists `status: 'pending'` leads for the client. Anything else here and the
    // import "succeeds" into a table nobody looks at.
    for (const row of written) {
      expect(row.status).toBe('pending')
      expect(row.delivered_at).toBeNull()
      expect(row.client_id).toBe('client-1')
      expect(row.source).toBe('csv_import')
    }
    expect(written.map(w => w.email)).toEqual(['ada@acme.test', 'grace@acme.test'])
  })

  it('records ONE audit row naming the operator and the counts', async () => {
    await callImport({ client_id: 'client-1', csv: CSV(PERSON('ada')) })
    expect(state.audit).toHaveLength(1)
    expect(state.audit[0].action).toBe('import_leads')
    expect(state.audit[0].operatorEmail).toBe('op@kind.test')
    expect((state.audit[0].detail as Row).inserted).toBe(1)
  })

  it('③ NO MONEY MOVES — importing a hundred people charges nothing', async () => {
    // The money model in one assertion: $99 buys 100 approved leads and every lead after is
    // $4 AT APPROVE. Charging on import would bill for leads nobody ever looked at.
    const many = Array.from({ length: 100 }, (_, i) => PERSON(`p${i}`))
    const r = await callImport({ client_id: 'client-1', csv: CSV(...many) })
    expect(data(r).inserted).toBe(100)
    expect(state.moneyWrites).toEqual([])
  })
})

describe('① a demo client refuses, and says why', () => {
  it('refuses with a reason an operator can act on, and writes nothing', async () => {
    state.isDemo = true
    const r = await callImport({ client_id: 'client-1', csv: CSV(PERSON('ada')) })
    expect(r.code).toBe(400)
    expect(String(r.payload.error)).toContain('DEMO')
    expect(String(r.payload.error)).toContain('mail them')
    expect(state.inserted).toEqual([])
  })

  it('an unknown client is a 404, not an import into nowhere', async () => {
    state.client = null
    const r = await callImport({ client_id: 'nope', csv: CSV(PERSON('ada')) })
    expect(r.code).toBe(404)
    expect(state.inserted).toEqual([])
  })
})

describe('② the two reads fail CLOSED — an empty set is not "nobody"', () => {
  it('a failed owned-leads read aborts the import rather than duplicating the desk', async () => {
    // supabase-js RETURNS the error. Ignoring it leaves `owned` empty, which reads exactly
    // like "this client holds nobody" — and re-importing yesterday's file doubles the desk.
    state.ownedError = { message: 'connection reset' }
    const r = await callImport({ client_id: 'client-1', csv: CSV(PERSON('ada')) })
    expect(r.code).toBe(500)
    expect(String(r.payload.error)).toContain('duplicates could not be ruled out')
    expect(String(r.payload.error)).toContain('nothing was imported')
    expect(state.inserted).toEqual([])
  })

  it('a failed blocklist read aborts the import rather than mailing opt-outs', async () => {
    // The worst version of the same bug: an empty `blocked` set means every person who told
    // us to stop sails through the gate that exists to catch them.
    state.blockedError = { message: 'statement timeout' }
    const r = await callImport({ client_id: 'client-1', csv: CSV(PERSON('ada')) })
    expect(r.code).toBe(500)
    expect(String(r.payload.error)).toContain('opt-out blocklist')
    expect(state.inserted).toEqual([])
  })

  it('a suppressed row is SKIPPED and REPORTED — never silently dropped', async () => {
    state.blocked = ['gone@acme.test']
    state.ownedLeads = ['held@acme.test']
    const r = await callImport({
      client_id: 'client-1',
      csv: CSV(PERSON('ada'), PERSON('gone'), PERSON('held'), 'No,Email,,Acme'),
    })
    expect(r.code).toBe(200)
    expect(tally(r)).toEqual({ imported: 1, duplicate: 1, suppressed: 1, invalid: 1 })

    // The reasons, per row, with the CSV line number the operator sees in their spreadsheet.
    const skipped = data(r).skipped as { line: number; outcome: string; email: string | null; why: string }[]
    expect(skipped.map(s => s.outcome)).toEqual(['suppressed', 'duplicate', 'invalid'])
    expect(skipped.map(s => s.line)).toEqual([3, 4, 5])
    for (const s of skipped) expect(s.why.length).toBeGreaterThan(10)
    expect(state.inserted.flat()).toHaveLength(1)
  })
})

describe('④ a partial write reports the number that actually landed', () => {
  it('a mid-import insert failure returns 500 with the true count, not a total', async () => {
    // Batches are 250. Fail the second and 250 rows are genuinely in the table — reporting
    // "imported 600" or "imported 0" both send the operator to the wrong next action.
    state.failInsertAt = 1
    const many = Array.from({ length: 600 }, (_, i) => PERSON(`p${i}`))
    const r = await callImport({ client_id: 'client-1', csv: CSV(...many) })
    expect(r.code).toBe(500)
    expect(String(r.payload.error)).toContain('250 of 600')
    expect(String(r.payload.error)).toContain('Re-uploading the same file is safe')
    expect((r.payload.data as Row).inserted).toBe(250)
  })

  it('the failure is audited as its OWN action, not as a successful import', async () => {
    state.failInsertAt = 0
    const r = await callImport({ client_id: 'client-1', csv: CSV(PERSON('ada')) })
    expect(r.code).toBe(500)
    expect(state.audit).toHaveLength(1)
    expect(state.audit[0].action).toBe('import_leads_failed')
  })
})

describe('the cap and the empty file are refused before anything is read', () => {
  it('over 1,000 rows names the cap and the actual count', async () => {
    const many = Array.from({ length: 1001 }, (_, i) => PERSON(`p${i}`))
    const r = await callImport({ client_id: 'client-1', csv: CSV(...many) })
    expect(r.code).toBe(400)
    expect(String(r.payload.error)).toContain('1,001')
    expect(String(r.payload.error)).toContain('1,000')
    expect(state.inserted).toEqual([])
  })

  it('exactly 1,000 rows is allowed — the cap is inclusive', async () => {
    const many = Array.from({ length: 1000 }, (_, i) => PERSON(`p${i}`))
    const r = await callImport({ client_id: 'client-1', csv: CSV(...many) })
    expect(r.code).toBe(200)
    expect(data(r).inserted).toBe(1000)
  })

  it('a header row with no data beneath it says so, rather than "imported 0"', async () => {
    const r = await callImport({ client_id: 'client-1', csv: 'first name,email\n' })
    expect(r.code).toBe(400)
    expect(String(r.payload.error)).toContain('no data rows')
  })

  it('an empty body is refused', async () => {
    expect((await callImport({ client_id: 'client-1', csv: '   ' })).code).toBe(400)
    expect((await callImport({ csv: CSV(PERSON('ada')) })).code).toBe(400)
  })
})

describe('a dry run answers "what would happen" and writes nothing', () => {
  it('returns the same tallies and reasons with zero rows written', async () => {
    // For a thousand rows this is the difference between looking and hoping.
    state.blocked = ['gone@acme.test']
    const r = await callImport({ client_id: 'client-1', csv: CSV(PERSON('ada'), PERSON('gone')), dry_run: true })
    expect(r.code).toBe(200)
    expect(data(r).dry_run).toBe(true)
    expect(tally(r)).toEqual({ imported: 1, duplicate: 0, suppressed: 1, invalid: 0 })
    expect(data(r).inserted).toBe(0)
    expect(state.inserted).toEqual([])
    expect(state.audit).toEqual([])
  })
})
