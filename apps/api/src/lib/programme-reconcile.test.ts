// ═══════════════════════════════════════════════════════════════════════════════════════
// THE OPERATOR DOOR TO `reconcile_programme_sourcing` — one exact programme, once, safely.
//
// 🛑 WHAT THIS SUITE IS ACTUALLY GUARDING. The RPC's own guards (foreign-client refusal,
// delivered-and-unbatched, the ceiling check, one settled batch) are proved against the SQL in
// `house-programme-accounting.test.ts`. What is NEW here is a DOOR into production that moves
// money-adjacent counters, and the failure modes of a door are different from the failure modes
// of a function: the wrong programme reached, a second press double-counting, a refusal
// reported as a quiet success.
//
// ⚠️ SO EVERY CASE DRIVES THE REAL `reconcileProgrammeSourcing` AGAINST A RECORDING DATABASE
// and asserts on WHAT IT CALLED and WHAT IT RETURNED — never on the shape of its source.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>

/** Every RPC the module makes, in order, with its arguments. */
const rpcCalls: { fn: string; args: Row }[] = []
/** Every table write attempted. Must stay EMPTY: the RPC owns every mutation. */
const writes: { table: string; op: string; payload: unknown }[] = []
/** Every table read, so "did it look up a client?" is answerable. */
const reads: string[] = []

let programme: Row | null = null
let programmeReadError: string | null = null
let batches: Row[] = []
let batchError: string | null = null
/** What the RPC returns — a number, or an error, or something unreadable. */
let rpcResult: { data: unknown; error: { message: string } | null } = { data: 0, error: null }
/** Applied to `programme` when the RPC "succeeds", standing in for what the SQL does. */
let onRpcSuccess: (() => void) | null = null

vi.mock('@kind/db', () => {
  const q = (table: string): Record<string, unknown> => {
    const self: any = {
      _op: null as string | null, _payload: null as unknown,
      select() { return self },
      eq() { return self },
      order() { return self },
      update(p: unknown) { self._op = 'update'; self._payload = p; return self },
      insert(p: unknown) { self._op = 'insert'; self._payload = p; return self },
      delete() { self._op = 'delete'; return self },
      async maybeSingle() {
        reads.push(table)
        if (table === 'programmes') {
          if (programmeReadError) return { data: null, error: { message: programmeReadError } }
          return { data: programme, error: null }
        }
        return { data: null, error: null }
      },
      then(res: (v: unknown) => unknown) {
        if (self._op) { writes.push({ table, op: self._op, payload: self._payload }) }
        reads.push(table)
        if (table === 'programme_batches') {
          return Promise.resolve(batchError
            ? { data: null, error: { message: batchError } }
            : { data: batches, error: null }).then(res)
        }
        return Promise.resolve({ data: [], error: null }).then(res)
      },
    }
    return self
  }
  return {
    db: {
      from: (t: string) => q(t),
      rpc: async (fn: string, args: Row) => {
        rpcCalls.push({ fn, args })
        if (fn === 'reconcile_programme_sourcing' && !rpcResult.error && onRpcSuccess) onRpcSuccess()
        return rpcResult
      },
    },
  }
})

import { reconcileProgrammeSourcing } from './programme-reconcile'

const P = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const CLIENT = '33333333-3333-4333-8333-333333333333'

/** The live House state on 8 Sep: 246 delivered, none of it accounted for. */
function houseBefore() {
  programme = {
    id: P, client_id: CLIENT, status: 'SOURCING_AUTHORISED',
    sourcing_ceiling: 2500, sourced_used: 0, sourced_reserved: 0,
  }
  batches = []
  rpcResult = { data: 246, error: null }
  onRpcSuccess = () => {
    programme = { ...(programme as Row), sourced_used: 246, status: 'SOURCING' }
    batches = [{ id: 'batch-1', seq: 1, status: 'served', requested: 246, granted: 246, delivered: 246, settled_at: '2026-09-08T10:00:00Z' }]
  }
}

beforeEach(() => {
  rpcCalls.length = 0; writes.length = 0; reads.length = 0
  programme = null; programmeReadError = null
  batches = []; batchError = null
  rpcResult = { data: 0, error: null }
  onRpcSuccess = null
})

// ── ① THE ONE RUN THIS EXISTS FOR ────────────────────────────────────────────────────

describe('① the 246 are accounted for, and the report is the database, not arithmetic', () => {
  it('🛑 246 used · 0 reserved · 2,254 left · one settled batch', async () => {
    houseBefore()
    const r = await reconcileProgrammeSourcing(P)

    expect(r.ok, r.ok ? '' : r.reason).toBe(true)
    if (!r.ok) return
    expect(r.reconciled_count).toBe(246)
    expect(r.before).toEqual({ ceiling: 2500, used: 0, reserved: 0, left: 2500 })
    expect(r.after).toEqual({ ceiling: 2500, used: 246, reserved: 0, left: 2254 })
    expect(r.batches).toHaveLength(1)
    expect(r.batches[0]).toMatchObject({ seq: 1, status: 'served', delivered: 246 })
    expect(r.headline).toContain('246 used · 0 reserved · 2254 left')
  })

  it('🛑 the counters are RE-READ, never `before + count`', async () => {
    // A database that disagrees with the RPC's own return is exactly what a read-back is for.
    // Deriving `after` would report the number this module expected rather than the one the
    // programme holds — a result that can never be wrong, and therefore proves nothing.
    houseBefore()
    onRpcSuccess = () => { programme = { ...(programme as Row), sourced_used: 200 } }

    const r = await reconcileProgrammeSourcing(P)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.reconciled_count, 'the RPC said 246').toBe(246)
    expect(r.after.used, 'and the row says 200 — the row wins').toBe(200)
  })

  it('🛑 the status change is REPORTED, not hidden', async () => {
    // The RPC ends with `status = CASE WHEN status = 'SOURCING_AUTHORISED' THEN 'SOURCING' …`.
    // It is inside the reviewed function and this module cannot suppress it without a second
    // write fighting the first — so it says so, in words, on the result.
    houseBefore()
    const r = await reconcileProgrammeSourcing(P)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.status_before).toBe('SOURCING_AUTHORISED')
    expect(r.status_after).toBe('SOURCING')
    expect(r.headline).toContain('SOURCING_AUTHORISED → SOURCING')
    expect(r.headline, 'the operator must be told what was NOT done').toContain('Nothing was approved')
  })
})

// ── ② IDENTITY — THE EXACT UUID, AND NOTHING INFERRED ────────────────────────────────

describe('② 1 · the wrong programme can never be reached by inference', () => {
  it('🛑 the RPC is passed the caller\'s id verbatim — one call, one argument', async () => {
    houseBefore()
    await reconcileProgrammeSourcing(P)
    expect(rpcCalls).toHaveLength(1)
    expect(rpcCalls[0]).toEqual({ fn: 'reconcile_programme_sourcing', args: { p_programme_id: P } })
  })

  it('🛑 3 · no other programme is named, at any point', async () => {
    houseBefore()
    await reconcileProgrammeSourcing(P)
    for (const c of rpcCalls) expect(JSON.stringify(c.args)).not.toContain(OTHER)
    // And the only reads are this programme's own row and its own batches.
    expect([...new Set(reads)].sort()).toEqual(['programme_batches', 'programmes'])
  })

  it('🛑 1 · NO CLIENT IS EVER LOOKED UP — there is no client→programme resolution to abuse', async () => {
    houseBefore()
    await reconcileProgrammeSourcing(P)
    expect(reads, 'a client lookup is a programme resolved by inference').not.toContain('clients')
    expect(reads).not.toContain('icps')
    expect(reads).not.toContain('leads')
  })

  it('🛑 a client id passed where a programme id belongs is NOT resolved — it is reconciled as given or refused', async () => {
    // ⚠️ THE HONEST LIMIT, STATED. A uuid is a uuid; this module cannot tell a client's from a
    // programme's. What it CAN guarantee is that it never turns one into the other: the id goes
    // to the RPC unchanged, and the RPC finds no programme with that id and returns 0.
    programme = null                                   // no programme row with a client's id
    rpcResult = { data: 0, error: null }
    const r = await reconcileProgrammeSourcing(CLIENT)
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.reason).toContain('no programme with that id')
    expect(rpcCalls, 'a non-existent programme never reaches the RPC').toEqual([])
  })

  for (const bad of ['', '   ', 'not-a-uuid', P.slice(0, 8), `${P}0`, null, undefined, 42, {}]) {
    it(`🛑 refuses ${JSON.stringify(bad)} — fail closed, nothing read, nothing called`, async () => {
      houseBefore()
      const r = await reconcileProgrammeSourcing(bad as never)
      expect(r.ok).toBe(false)
      expect(rpcCalls).toEqual([])
      expect(reads, 'it read the database before deciding the id was usable').toEqual([])
    })
  }
})

// ── ③ IDEMPOTENCY — A SECOND PRESS ADDS NOTHING ──────────────────────────────────────

describe('③ 2 · 7 · pressing it twice does not double-count or duplicate the batch', () => {
  it('🛑 the second run reports 0, one batch, and the SAME counters', async () => {
    houseBefore()
    const first = await reconcileProgrammeSourcing(P)
    expect(first.ok && first.reconciled_count).toBe(246)

    // The RPC's own idempotency: those leads now carry a batch_id, so nothing is orphaned.
    rpcCalls.length = 0
    rpcResult = { data: 0, error: null }
    onRpcSuccess = null                                 // a second run changes nothing
    const second = await reconcileProgrammeSourcing(P)

    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.reconciled_count, 'the second press counted people again').toBe(0)
    expect(second.after, 'the counters moved on a second press').toEqual({ ceiling: 2500, used: 246, reserved: 0, left: 2254 })
    expect(second.batches, 'a second batch was created').toHaveLength(1)
    expect(second.status_before).toBe('SOURCING')
    expect(second.status_after, 'the status moved again').toBe('SOURCING')
  })

  it('🛑 a zero is reported AS ZERO — never dressed up as a success', async () => {
    houseBefore()
    rpcResult = { data: 0, error: null }
    onRpcSuccess = null
    const r = await reconcileProgrammeSourcing(P)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.reconciled_count).toBe(0)
    expect(r.headline).toContain('Nothing to reconcile')
    expect(r.headline).toContain('Nothing was changed')
  })
})

// ── ④ FAILURE IS NEVER A QUIET SUCCESS ───────────────────────────────────────────────

describe('④ 10 · an RPC that refuses or cannot answer is never reported as done', () => {
  it('🛑 a RAISE from the RPC is a refusal, and its own sentence is passed through', async () => {
    // The two the SQL raises: a foreign-client lead (⑨) and orphans that will not fit under
    // the ceiling. Both mean NOTHING was counted, stamped or changed.
    houseBefore()
    rpcResult = { data: null, error: { message: 'reconcile_programme_sourcing: programme X has 3 lead(s) attributed to it that belong to another client.' } }
    onRpcSuccess = null

    const r = await reconcileProgrammeSourcing(P)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.reason).toContain('nothing was changed')
    expect(r.reason, 'the RPC\'s own refusal is swallowed into a generic message')
      .toContain('belong to another client')
  })

  it('🛑 8 · 9 · the module owns NO lead logic, so it cannot count the wrong people', async () => {
    // Historical/null-programme leads and foreign-client leads are refused by the RPC's own
    // predicates, proved against the SQL in `house-programme-accounting.test.ts`. What must be
    // true HERE is that this module never re-implements that decision — a second implementation
    // of "which leads count" is how the two would eventually disagree.
    const SRC = readFileSync(join(__dirname, 'programme-reconcile.ts'), 'utf8')
      .split('\n').filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') }).join('\n')
    expect(SRC, 'the module queries leads itself').not.toContain("from('leads')")
    expect(SRC).not.toContain('delivered_at')
    expect(SRC).not.toContain('batch_id')
    // And behaviourally: a full successful run touches neither table.
    houseBefore()
    await reconcileProgrammeSourcing(P)
    expect(reads).not.toContain('leads')
  })

  it('🛑 a NON-NUMBER return is UNKNOWN, not zero', async () => {
    // `RETURNS int`. Anything else means the call did not answer — and "0 reconciled, all good"
    // for an answer we never got is the false green this repo keeps removing.
    houseBefore()
    for (const weird of [null, undefined, 'ok', {}, NaN, []]) {
      rpcCalls.length = 0
      rpcResult = { data: weird, error: null }
      onRpcSuccess = null
      const r = await reconcileProgrammeSourcing(P)
      expect(r.ok, `${JSON.stringify(weird)} was read as a count`).toBe(false)
      if (r.ok) continue
      expect(r.reason).toContain('UNKNOWN')
    }
  })

  it('🛑 a programme that cannot be READ is a refusal, and the RPC is never called', async () => {
    programmeReadError = 'connection reset'
    const r = await reconcileProgrammeSourcing(P)
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.reason).toContain('could not be read')
    expect(rpcCalls, 'it reconciled a programme it could not read').toEqual([])
  })

  it('🛑 if the RE-READ fails after a successful run, it says the work WAS done', async () => {
    // The dangerous half: reporting a plain failure here would send an operator to press it
    // again, and a second press is the one thing that must not read as "it did not work".
    houseBefore()
    let calls = 0
    const realOnSuccess = onRpcSuccess!
    onRpcSuccess = () => { realOnSuccess(); programmeReadError = 'connection reset' }
    void calls

    const r = await reconcileProgrammeSourcing(P)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.reason).toContain('RAN and reported 246')
    expect(r.reason).toContain('Do NOT press this again')
  })

  it('a batch-read failure does not undo or hide a successful reconciliation', async () => {
    houseBefore()
    const realOnSuccess = onRpcSuccess!
    onRpcSuccess = () => { realOnSuccess(); batchError = 'timeout' }

    const r = await reconcileProgrammeSourcing(P)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.reconciled_count).toBe(246)
    expect(r.batches).toEqual([])
    expect(r.headline, 'the gap in the report is stated').toContain('batch list could not be read')
  })
})

// ── ⑤ WHAT IT MUST NOT DO ────────────────────────────────────────────────────────────

describe('⑤ 4 · 5 · 6 · it sources nothing, reserves nothing and writes nothing itself', () => {
  it('🛑 6 · the module performs NO write of its own — the RPC owns every mutation', async () => {
    houseBefore()
    await reconcileProgrammeSourcing(P)
    expect(writes, `the module wrote directly: ${JSON.stringify(writes)}`).toEqual([])
  })

  it('🛑 5 · no authority is reserved and no sourcing RPC is called', async () => {
    houseBefore()
    await reconcileProgrammeSourcing(P)
    const fns = rpcCalls.map(c => c.fn)
    expect(fns).toEqual(['reconcile_programme_sourcing'])
    for (const forbidden of ['try_spend_sourcing', 'try_reserve_programme_sourcing', 'increment_wallet', 'try_claim_proof_pass']) {
      expect(fns, `it called ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('🛑 4 · no provider, no sourcing, no send, no state machine — proved on the executable source', async () => {
    const SRC = readFileSync(join(__dirname, 'programme-reconcile.ts'), 'utf8')
      .split('\n').filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') }).join('\n')
    for (const banned of ['apollo', 'Apollo', 'pdl', 'PDL', 'hunter', 'Hunter',
                          'searchPeople', 'startWorkForClient', 'sourceForProgramme',
                          'autoEnrollLead', 'sendSequenceEmail', 'sendEmail',
                          'markReadyForApproval', 'approveProgramme', 'goLive',
                          'prepareProgrammeOutreach', 'checkout', 'stripe', 'Stripe']) {
      expect(SRC, `the reconciliation reaches ${banned}`).not.toContain(banned)
    }
    // The ONLY rpc name in the file.
    const rpcNames = [...SRC.matchAll(/db\.rpc\(\s*'([^']+)'/g)].map(m => m[1])
    expect(rpcNames).toEqual(['reconcile_programme_sourcing'])
  })
})

// ── ⑥ THE DOOR ITSELF ────────────────────────────────────────────────────────────────

describe('⑥ the operator route is admin-gated, audited, and refuses honestly', () => {
  const ROUTE = (() => {
    const src = readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')
    const at = src.indexOf("operatorRouter.post('/programme/:programmeId/reconcile-sourcing'")
    return src.slice(at, src.indexOf("operatorRouter.post('/proof-review", at))
  })()

  it('🛑 the route exists and is reachable at exactly one path', () => {
    expect(ROUTE.length, 'the reconcile route is gone').toBeGreaterThan(0)
    // ⚠️ COUNTED ON THE ROUTE REGISTRATION, NOT THE STRING. `reconcile-sourcing` also appears
    // in the handler's own `console.error` tag, so a bare substring count reads 2 and fails
    // while the code is right — an assertion that cannot be satisfied teaches people to
    // weaken it. What must be true is that exactly one ROUTE answers to it.
    const src = readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')
    const registrations = src.match(/Router\.(post|get|put|patch|delete)\([^)]*reconcile-sourcing/g) ?? []
    expect(registrations, 'more than one door to the same action').toHaveLength(1)
    expect(registrations[0]).toContain('.post(')
  })

  it('🛑 it requires the operator key, before anything else', () => {
    expect(ROUTE).toContain("adminKeyValid(req.headers['x-admin-key'])")
    const gateAt = ROUTE.indexOf('adminKeyValid')
    const callAt = ROUTE.indexOf('reconcileProgrammeSourcing(req.params.programmeId)')
    expect(callAt, 'the reconciliation runs before the key is checked').toBeGreaterThan(gateAt)
  })

  it('🛑 the programme id comes from the URL and is passed straight through', () => {
    expect(ROUTE).toContain('reconcileProgrammeSourcing(req.params.programmeId)')
    // Not from the body, not from a client, not defaulted.
    expect(ROUTE, 'the id is taken from the request body, where a caller could omit it').not.toContain('req.body')
    expect(ROUTE).not.toContain('client_id')
    expect(ROUTE).not.toContain('resolveHouseClientId')
  })

  it('🛑 10 · a refusal returns success:false — never a 200 with a zero', () => {
    // The whole refusal branch, from the guard to its `return`.
    const from = ROUTE.indexOf('if (!result.ok) {')
    expect(from, 'the refusal branch is gone').toBeGreaterThan(-1)
    const branch = ROUTE.slice(from, ROUTE.indexOf('return\n    }', from))
    expect(branch).toContain('res.status(400).json({ success: false, error: result.reason })')
    // ⚠️ AND IT RETURNS. Without the `return`, a refusal would fall through to the success
    // response below it — two writes to one response, and the second one says it worked.
    expect(ROUTE.slice(from, from + branch.length + 40)).toContain('return')
    // The success response is a DIFFERENT statement, reached only past that branch.
    const okAt = ROUTE.indexOf('res.json({ success: true, data: result })')
    expect(okAt, 'the success response is gone').toBeGreaterThan(from)
  })

  it('🛑 both outcomes are audited — a refusal that writes no row is invisible', () => {
    expect(ROUTE).toContain("action: 'programme_sourcing_reconciled'")
    expect(ROUTE).toContain("action: 'programme_sourcing_reconcile_refused'")
    // And the audit names the programme, not a client.
    expect(ROUTE).toContain("subjectType: 'programme'")
  })
})
