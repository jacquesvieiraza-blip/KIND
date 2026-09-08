// ═══════════════════════════════════════════════════════════════════════════════════════
// AN EMPTY STRING IS NOT A CURSOR — the production failure, reproduced.
//
// 🛑 WHAT HAPPENED. The founder pressed `Qualify sourced leads` on the House launch programme
// and got back:
//
//     This programme's candidates could not be read (invalid input syntax for type uuid: "").
//     Nothing was judged or changed.
//
// `qualifyAndSettleBatch` pages its candidates by KEYSET CURSOR and seeded that cursor with
// `let after = ''`, so page ONE asked Postgres for `id > ''`. `leads.id` is `uuid`; the cast
// failed before a single row was considered. The programme's data was never the problem — the
// first page of the read was malformed, and it always had been.
//
// ⛓️ WHY NO TEST CAUGHT IT, SAID PLAINLY BECAUSE IT IS THE REAL LESSON. Every database mock in
// this repository is a CHAINABLE RECORDER: `.eq()`, `.gt()` and `.is()` return `self` and the
// resolver hands back a fixed array. A mock like that cannot fail a cast, because it has no
// column types — `id > ''` and `id > '<a uuid>'` are the same call to it. Eleven suites
// exercised this path and every one of them passed on a query Postgres refuses outright.
//
// 🛑 SO THIS FILE'S MOCK HAS TYPES. `TYPED_UUID_COLUMNS` names the uuid columns and the
// resolver REJECTS any predicate binding one of them to something that is not a uuid — with the
// exact PostgREST message production returned. That is the whole difference between a harness
// that would have caught this and eleven that did not.
//
// ⚠️ AND THE SAME SEED EXISTED IN THREE PLACES. `programme-review.ts` (the customer's review
// desk) and `programme-preparation.ts` (enrolment) page the same way and had the same `''`.
// Neither had run against a programme yet, so neither had failed yet. All three are asserted
// here, because one root cause with three call sites is one bug.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const PROGRAMME = '8a8d0fd7-bf6b-4d87-9188-9b3f17864bca'   // the House launch programme
const CLIENT    = '11111111-1111-4111-8111-111111111111'
const ICP       = '22222222-2222-4222-8222-222222222222'
const UUID_RE   = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Columns Postgres declares `uuid`. Bind a non-uuid to one of these and the query fails. */
const TYPED_UUID_COLUMNS = new Set(['id', 'client_id', 'programme_id', 'icp_id', 'batch_id'])

type Filter = { op: string; col: string; val: unknown }

/** What the fixture returns, and what the run did to it. */
let clientOnProgramme: unknown = CLIENT
let icpIdOnRow: unknown = ICP
let leadRows: Record<string, unknown>[] = []
let filters: Filter[][] = []
let writes: string[] = []
let providerCalls: number[] = []
let rpcCalls: string[] = []

/**
 * A recording query builder that BEHAVES LIKE A TYPED COLUMN STORE.
 *
 * ⚠️ THE REJECTION IS THE POINT. `''` bound to a uuid column returns the identical PostgREST
 * error production returned, so the fix is proved by the query succeeding rather than by
 * somebody reading the source and agreeing with it.
 */
vi.mock('@kind/db', () => {
  const make = (table: string) => {
    const mine: Filter[] = []
    const self: Record<string, unknown> = {}
    const chain = (op: string) => (col: string, val: unknown) => { mine.push({ op, col, val }); return self }
    for (const op of ['eq', 'gt', 'gte', 'lt', 'lte', 'is', 'not', 'in', 'neq']) {
      self[op] = op === 'not'
        ? (col: string, _o: string, val: unknown) => { mine.push({ op, col, val }); return self }
        : chain(op)
    }
    self.select = () => self
    self.order = () => self
    self.limit = () => self
    // ⚠️ `in('id', [...])` BINDS A LIST, and Postgres casts each member — so the list is
    // checked member-by-member. Treating the array itself as the value would reject every
    // legitimate `in` query and make this harness useless.
    const uuidOk = (v: unknown) => typeof v === 'string' && UUID_RE.test(v)
    const badFilter = () => {
      for (const f of mine) {
        if (!TYPED_UUID_COLUMNS.has(f.col) || f.op === 'is' || f.op === 'not') continue
        if (Array.isArray(f.val)) {
          const bad = f.val.find(v => !uuidOk(v))
          if (bad !== undefined) return { ...f, val: bad }
          continue
        }
        if (!uuidOk(f.val)) return f
      }
      return undefined
    }
    const settle = () => {
      filters.push([...mine])
      const bad = badFilter()
      // The exact sentence PostgREST relays from Postgres, reproduced verbatim.
      if (bad) return { data: null, error: { message: `invalid input syntax for type uuid: "${String(bad.val)}"` }, count: null }
      if (table === 'programmes') {
        return { data: { id: PROGRAMME, client_id: clientOnProgramme, status: 'SOURCING_AUTHORISED', sourcing_ceiling: 2500, sourced_used: 0, sourced_reserved: 0 }, error: null }
      }
      if (table === 'icps') {
        return { data: [{ id: icpIdOnRow, client_id: clientOnProgramme, name: 'House ICP', geographies: ['United Kingdom'] }], error: null }
      }
      if (table === 'leads') return { data: leadRows, error: null, count: leadRows.length }
      return { data: [], error: null, count: 0 }
    }
    self.maybeSingle = async () => settle()
    self.single = async () => settle()
    self.then = (r: (v: unknown) => unknown) => r(settle())
    self.update = () => { writes.push(`${table}.update`); return self }
    self.insert = () => { writes.push(`${table}.insert`); return self }
    return self
  }
  return {
    db: {
      from: (t: string) => make(t),
      rpc: async (fn: string) => { rpcCalls.push(fn); return { data: 0, error: null } },
    },
  }
})

vi.mock('./provider-boundary', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  audienceForClientStrict: async () => 'house',
}))

// 🛑 THE PROVIDER DOOR, COUNTED. `bulkMatchEmails` is the ONLY way this path can spend an
// Apollo credit, so counting its calls is the money proof — not an inference from a message.
vi.mock('./apollo', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  bulkMatchEmails: async (people: unknown[]) => { providerCalls.push(people.length); return [] },
}))

import { qualifyAndSettleBatch } from './programme-batch-recovery'

beforeEach(() => {
  clientOnProgramme = CLIENT
  icpIdOnRow = ICP
  leadRows = []
  filters = []; writes = []; providerCalls = []; rpcCalls = []
})

/** Every filter the run ever bound, flattened — for "did `''` reach a uuid column?" */
const allFilters = () => filters.flat()
const leadsQuery = () => filters.find(f => f.some(x => x.col === 'programme_id') && f.some(x => x.col === 'batch_id'))

// ── ① THE PRODUCTION FAILURE, AND ITS ABSENCE ────────────────────────────────────────

describe('① the House qualify reproduces — and the fixed cursor does not', () => {
  it('🛑 1 · 12 · the candidate read runs, with NO empty uuid anywhere in it', async () => {
    leadRows = [{ id: '33333333-3333-4333-8333-333333333331' }]
    const r = await qualifyAndSettleBatch(PROGRAMME)

    // 🛑 THE REGRESSION ITSELF. Before the fix this was the founder's exact sentence.
    if (!r.ok) {
      expect(r.reason, 'the empty-uuid failure is back — the cursor is seeded with a sentinel again')
        .not.toContain('invalid input syntax for type uuid')
    }
    // 1 · not one predicate binds a uuid column to an empty string, anywhere in the run.
    // `in('id', [...])` binds a LIST, so each member is checked rather than the array.
    for (const f of allFilters()) {
      if (!TYPED_UUID_COLUMNS.has(f.col) || f.op === 'is' || f.op === 'not') continue
      for (const v of Array.isArray(f.val) ? f.val : [f.val]) {
        expect(String(v), `${f.op}('${f.col}', ${JSON.stringify(v)}) is not a uuid`).toMatch(UUID_RE)
      }
    }
    // 12 · and the candidate query is exactly programme + client + batch-less.
    const q = leadsQuery()
    expect(q, 'the candidate population was never read').toBeTruthy()
    expect(q!.find(f => f.op === 'eq' && f.col === 'programme_id')?.val).toBe(PROGRAMME)
    expect(q!.find(f => f.op === 'eq' && f.col === 'client_id')?.val).toBe(CLIENT)
    expect(q!.find(f => f.op === 'is' && f.col === 'batch_id')?.val).toBeNull()
    // 🛑 AND NO CURSOR ON THE FIRST PAGE AT ALL — the predicate is omitted, not sent empty.
    expect(q!.find(f => f.op === 'gt' && f.col === 'id'), 'a first-page cursor was sent').toBeUndefined()
  })

  it('🛑 THE CORRECTED CASE — the candidate read succeeds and the provider phase becomes REACHABLE', async () => {
    // The other half of the founder's requirement: proving the failure is refused safely is not
    // proof that the fix WORKS. With valid identities and a real candidate, the run must get
    // past the read and into qualification — where a candidate whose stored facts cannot answer
    // the ICP is the one and only thing that reaches Apollo.
    // ⚠️ WITH AN APOLLO ID, deliberately. A candidate whose stored facts cannot answer the ICP
    // and which carries no revealable id is judged on what we hold — correctly, and without
    // touching a provider. To prove the provider phase is REACHABLE the fixture has to be a
    // candidate that genuinely warrants a reveal.
    leadRows = [
      { id: '33333333-3333-4333-8333-333333333331', apollo_id: 'apollo_person_1' },
      { id: '33333333-3333-4333-8333-333333333332', apollo_id: 'apollo_person_2' },
    ]
    const r = await qualifyAndSettleBatch(PROGRAMME)

    if (!r.ok) expect(r.reason).not.toContain('could not be read')
    expect(leadsQuery(), 'the candidate population was never read').toBeTruthy()
    // 🛑 THE PROVIDER PHASE IS REACHED — which is exactly what did NOT happen in production.
    expect(providerCalls.length, 'qualification never got as far as the provider').toBeGreaterThan(0)
    // And it was reached only AFTER the population was known: the reveal batch can never be
    // larger than the candidates the read returned.
    for (const n of providerCalls) expect(n).toBeLessThanOrEqual(leadRows.length)
  })

  it('🛑 the harness is not vacuous — this mock really does reject an empty uuid', () => {
    // If the typed mock could not fail, every case in this file would pass on the broken code.
    const bad = { op: 'gt', col: 'id', val: '' }
    expect(TYPED_UUID_COLUMNS.has(bad.col)).toBe(true)
    expect(UUID_RE.test(bad.val)).toBe(false)
    // And the paging source no longer contains the seed that produced it.
    for (const f of ['programme-batch-recovery.ts', 'programme-review.ts', 'programme-preparation.ts']) {
      const src = readFileSync(join(__dirname, f), 'utf8')
        .split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
      expect(src, `${f} still seeds a keyset cursor with an empty string`).not.toContain("let after = ''")
      expect(src, `${f} no longer declares the cursor as absent-until-set`).toContain('let after: string | null = null')
      // The guard is spelled `after !== null` in one file and `after === null` in the others;
      // what matters is that `.gt('id', after)` is never reached unguarded.
      expect(src, `${f} sends the cursor unconditionally again`).toMatch(/after (!==|===) null/)
    }
  })

  it('🛑 13 · a retry cannot reach the old path — there is only one candidate read', async () => {
    leadRows = [{ id: '33333333-3333-4333-8333-333333333331' }]
    await qualifyAndSettleBatch(PROGRAMME)
    await qualifyAndSettleBatch(PROGRAMME)
    for (const f of allFilters()) {
      if (!TYPED_UUID_COLUMNS.has(f.col) || f.op === 'is' || f.op === 'not') continue
      for (const v of Array.isArray(f.val) ? f.val : [f.val]) expect(String(v)).toMatch(UUID_RE)
    }
  })
})

// ── ② IDENTITY BEFORE POPULATION, POPULATION BEFORE PROVIDER ─────────────────────────

describe('② 2 · 3 · 4 · 5 · 6 · 7 · 8 · 9 · a broken identity stops before anything is read or spent', () => {
  it('🛑 2 · 7 · 8 · 9 · an EMPTY client id on the programme row refuses — no read, no provider, no write', async () => {
    clientOnProgramme = ''
    leadRows = [{ id: '33333333-3333-4333-8333-333333333331' }]
    const r = await qualifyAndSettleBatch(PROGRAMME)

    expect(r.ok, 'a programme naming no client was qualified anyway').toBe(false)
    if (!r.ok) {
      expect(r.reason).toContain('does not name a readable client')
      // 9 · the refusal says nothing changed, and nothing did.
      expect(r.reason).toContain('Nothing was read, judged or changed')
    }
    // 8 · the candidate population is never even asked for.
    expect(leadsQuery(), 'the candidate read ran on an unproved identity').toBeUndefined()
    // 7 · zero provider calls, and zero writes of any kind.
    expect(providerCalls, 'Apollo was reached before identity was proved').toEqual([])
    expect(writes, 'something was written during a refusal that claims nothing changed').toEqual([])
    expect(rpcCalls, 'the settle ran on an unproved identity').toEqual([])
  })

  it('🛑 4 · 11 · an EMPTY ICP id refuses rather than substituting another ICP', async () => {
    icpIdOnRow = ''
    leadRows = [{ id: '33333333-3333-4333-8333-333333333331' }]
    const r = await qualifyAndSettleBatch(PROGRAMME)

    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.reason).toContain('does not carry a readable id')
      expect(r.reason, 'the refusal leaves room for a substitute ICP').toContain('no other ICP is ever substituted')
    }
    expect(leadsQuery()).toBeUndefined()
    expect(providerCalls).toEqual([])
    expect(writes).toEqual([])
  })

  it('🛑 3 · an invalid PROGRAMME id never reaches a single read', async () => {
    for (const bad of ['', '   ', 'not-a-uuid', PROGRAMME.slice(0, 8), null, undefined]) {
      filters = []; providerCalls = []; writes = []
      const r = await qualifyAndSettleBatch(bad as never)
      expect(r.ok, `${JSON.stringify(bad)} was accepted`).toBe(false)
      expect(filters, 'an unvalidated programme id reached the database').toEqual([])
      expect(providerCalls).toEqual([])
      expect(writes).toEqual([])
    }
  })

  it('🛑 5 · 6 · 10 · 11 · nothing is ever resolved by fallback — the module names no such path', () => {
    const src = readFileSync(join(__dirname, 'programme-batch-recovery.ts'), 'utf8')
      .split('\n').filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') }).join('\n')
    // 5 · 6 · no newest, no first, no ordering, no client-derived programme.
    // ⚠️ NARROWED, AND DELIBERATELY. A blanket `.limit(1)` ban failed on the read-back that
    // fetches the batch the settle just created for THIS programme — a legitimate query, and an
    // assertion that fails while the code is right is one somebody eventually deletes. What is
    // banned is resolving an IDENTITY by ordering or by falling back to another record.
    for (const fallback of ["order('created_at'", "order('updated_at'", 'findFirst',
                            "eq('client_id', clientId).limit", '?? CLIENT', '|| CLIENT',
                            "from('programmes')\n    .select('id, client_id, status').eq('client_id'"]) {
      expect(src, `the recovery resolves an identity by ${fallback}`).not.toContain(fallback)
    }
    // The programme is never resolved FROM the client — only the other way round.
    expect(src, 'the programme is resolved from a client').not.toMatch(/from\('programmes'\)[^]{0,200}eq\('client_id'/)
    // 10 · 11 · the client comes from the PROGRAMME row and the ICP from `icps.programme_id`.
    expect(src).toContain(".eq('id', id).maybeSingle()")
    expect(src).toContain(".select('id, client_id, name, geographies').eq('programme_id', id)")
    // The ICP set is narrowed by the programme's own client — a foreign-client ICP cannot win.
    expect(src).toContain('.filter(r => r.client_id === p.client_id)')
    expect(src, 'ambiguity picks instead of refusing').toContain('if (icpRows.length > 1) {')
  })
})

// ── ③ THE ORDER IS STRUCTURAL, NOT REMEMBERED ────────────────────────────────────────

describe('③ 7 · identity → candidates → provider, proved on the executable order', () => {
  const src = readFileSync(join(__dirname, 'programme-batch-recovery.ts'), 'utf8')

  it('🛑 7 · every identity check precedes the candidate read, which precedes qualification', () => {
    const uuidGate   = src.indexOf('if (!UUID.test(id)) {')
    const clientGate = src.indexOf('if (!UUID.test(clientId)) {')
    const icpGate    = src.indexOf('if (!UUID.test(icpId)) {')
    const audience   = src.indexOf('await audienceForClientStrict(clientId)')
    const candidates = src.indexOf("const candidateIds: string[] = []")
    const qualify    = src.indexOf('const q = await qualifyCandidates(clientId, candidateIds, {')
    const settle     = src.indexOf("db.rpc('reconcile_programme_sourcing'")

    for (const [name, at] of [['uuid gate', uuidGate], ['client gate', clientGate], ['icp gate', icpGate],
                              ['audience', audience], ['candidates', candidates], ['qualify', qualify],
                              ['settle', settle]] as const) {
      expect(at, `${name} is gone`).toBeGreaterThan(-1)
    }
    expect(clientGate, 'the client id is used before it is proved').toBeGreaterThan(uuidGate)
    expect(icpGate).toBeGreaterThan(clientGate)
    expect(audience, 'the audience is proved before the identity it is proved for').toBeGreaterThan(icpGate)
    expect(candidates, 'candidates are read before identity is proved').toBeGreaterThan(audience)
    expect(qualify, 'the provider phase runs before the candidate read').toBeGreaterThan(candidates)
    expect(settle, 'the settle runs before qualification').toBeGreaterThan(qualify)
  })

  it('🛑 8 · a failed candidate read returns — it does not fall through into the provider', () => {
    const at = src.indexOf("return { ok: false, reason: `This programme's candidates could not be read")
    const qualify = src.indexOf('const q = await qualifyCandidates(clientId, candidateIds, {')
    expect(at, 'the candidate-read failure no longer returns').toBeGreaterThan(-1)
    expect(at).toBeLessThan(qualify)
    // And an empty population refuses too, rather than qualifying nobody and settling zero.
    expect(src).toContain("if (candidateIds.length === 0) {")
    expect(src.indexOf('if (candidateIds.length === 0) {')).toBeLessThan(qualify)
  })
})
