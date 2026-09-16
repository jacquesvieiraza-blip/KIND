// ⚑ 17 Sep — THE OPERATOR HALF: a retained reply has to be VISIBLE and DECIDABLE.
//
// `unattributed-retention.route.test.ts` proves the ambiguous reply is stored in full. A row
// nobody can see is not a recovery path — `founder_alerts` proved that, having had no reader
// anywhere in the product since 10 Jul — so this file proves the other three halves against
// the REAL handlers:
//
//   GET  /operator/alerts                              → one row per candidate client
//   POST /operator/unattributed-replies/:id/resolve    → one client, one reply, audited
//   POST /operator/unattributed-replies/:id/discard    → nobody, recorded, audited
//
// ── 🛑 THE ORDER IS THE WHOLE DESIGN, AND MOST OF THIS FILE IS ABOUT IT ────────────────
//
//   validate candidate → CLAIM → write the reply → record the resolution
//
// Marking resolved FIRST loses the reply a second time when the write fails. Marking it only
// at the END lets two operators each write one. So the claim is compare-and-set, a failure
// hands it back, and the tests below prove every one of those transitions rather than
// asserting the happy path and hoping.
//
// Mocks only. No provider, no database, no network, no sending, no money path.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

type Row = Record<string, any>
type Store = {
  unattributed_replies: Row[]
  clients: Row[]
  icps: Row[]
  figsy_campaigns: Row[]
  figsy_replies: Row[]
  audits: Row[]
  /** Forces the retention SELECT to fail, so "we cannot tell" is proved to refuse. */
  selectError?: { message: string } | null
  /** Forces every UPDATE on the retention table to fail (the claim and the settle). */
  updateError?: { message: string } | null
  /** Forces only the FINAL settle to fail, which is the half-finished-resolution case. */
  settleError?: { message: string } | null
  /** Makes the reply pipeline refuse, which is case F. */
  pipelineRefuses?: boolean
  /** Makes the reply pipeline throw, which is case F's other half. */
  pipelineThrows?: boolean
  /**
   * ⚑ 17 Sep — forces the EXISTING-ATTRIBUTION lookup to fail, which is the fail-closed case
   * of the reconciliation path. Scoped to `figsy_replies` so it cannot break unrelated reads.
   */
  replyLookupError?: { message: string } | null
  /** What the pipeline was called with, so the owner override can be asserted. */
  pipelineCalls: Array<{ inbound: Row; ctx: Row }>
}

const RETAINED = () => ({
  id: 'unattr-1',
  provider: 'resend',
  provider_event_key: 'resend:evt-1',
  from_email: 'thabo@acme.com',
  from_name: 'Thabo',
  to_email: 'inbound@kind-shared.test',
  subject: 'Re: hello',
  body: 'Sounds interesting, tell me more.',
  raw_payload: { type: 'email.received' },
  candidate_client_ids: ['client-A', 'client-B'],
  candidate_lead_ids: ['lead-a', 'lead-b'],
  received_at: '2026-09-17T09:00:00.000Z',
  resolve_claimed_at: null,
  resolve_claimed_by: null,
  resolved_at: null,
  resolved_client_id: null,
  resolved_by: null,
  resolution: null,
})

function newStore(): Store {
  return {
    unattributed_replies: [RETAINED()],
    clients: [
      { id: 'client-A', company_name: 'Acme', is_demo: false, created_at: '2026-09-01T00:00:00.000Z', proof_review_requested_at: null, proof_review_resolved_at: null },
      { id: 'client-B', company_name: 'Beta', is_demo: false, created_at: '2026-09-02T00:00:00.000Z', proof_review_requested_at: null, proof_review_resolved_at: null },
    ],
    icps: [], figsy_campaigns: [], figsy_replies: [], audits: [],
    selectError: null, updateError: null, settleError: null, replyLookupError: null,
    pipelineRefuses: false, pipelineThrows: false, pipelineCalls: [],
  }
}

function installDb(store: Store) {
  vi.doMock('@kind/db', () => {
    const build = (table: string) => {
      const rows = (): Row[] => (store as any)[table] ?? []
      const preds: Array<(r: Row) => boolean> = []
      let lim = Infinity
      let orderCol: string | null = null
      let asc = true
      const q: any = {}
      for (const m of ['select', 'in', 'gte', 'lte', 'ilike', 'or']) q[m] = () => q
      q.eq = (c: string, v: unknown) => { preds.push(r => r[c] === v); return q }
      q.neq = (c: string, v: unknown) => { preds.push(r => r[c] !== v); return q }
      q.is = (c: string, _v: unknown) => { preds.push(r => r[c] === null || r[c] === undefined); return q }
      q.not = (c: string, _o: string, _v: unknown) => { preds.push(r => r[c] !== null && r[c] !== undefined); return q }
      q.limit = (n: number) => { lim = n; return q }
      q.order = (c: string, o?: { ascending?: boolean }) => { orderCol = c; asc = o?.ascending !== false; return q }
      const matched = () => {
        let out = rows().filter(r => preds.every(f => f(r)))
        if (orderCol) out = [...out].sort((a, b) =>
          asc ? String(a[orderCol!]).localeCompare(String(b[orderCol!]))
              : String(b[orderCol!]).localeCompare(String(a[orderCol!])))
        return out.slice(0, lim)
      }
      const failedRead = () =>
        (store.selectError && table === 'unattributed_replies')
        || (store.replyLookupError && table === 'figsy_replies')
      const readErr = () => table === 'figsy_replies' ? store.replyLookupError : store.selectError
      q.maybeSingle = async () =>
        failedRead() ? { data: null, error: readErr() } : { data: matched()[0] ?? null, error: null }
      q.single = async () =>
        failedRead() ? { data: null, error: readErr() } : { data: matched()[0] ?? null, error: null }
      q.then = (res: (v: unknown) => void) => {
        if (failedRead()) { res({ data: null, count: 0, error: readErr() }); return }
        res({ data: matched(), count: matched().length, error: null })
      }
      q.insert = (row: Row) => {
        if (table === 'operator_audit_log') store.audits.push(row)
        const chain: any = {
          select: () => ({ single: async () => ({ data: { id: 'new-1' }, error: null }) }),
          then: (r: (v: unknown) => void) => r({ error: null }),
        }
        return chain
      }
      q.update = (patch: Row) => {
        const up: Array<(r: Row) => boolean> = []
        const chain: any = {}
        chain.eq = (c: string, v: unknown) => { up.push(r => r[c] === v); return chain }
        chain.is = (c: string, _v: unknown) => { up.push(r => r[c] === null || r[c] === undefined); return chain }
        chain.not = (c: string, _o: string, _v: unknown) => { up.push(r => r[c] !== null && r[c] !== undefined); return chain }
        chain.in = () => chain
        const isSettle = 'resolution' in patch
        const fails = () =>
          table === 'unattributed_replies' && (store.updateError || (isSettle && store.settleError))
        const err = () => (isSettle && store.settleError) ? store.settleError : store.updateError
        const apply = () => {
          const t = rows().filter(r => up.every(f => f(r)))
          t.forEach(r => Object.assign(r, patch))
          return t
        }
        chain.select = () => ({ then: (r: (v: unknown) => void) => {
          if (fails()) { r({ data: null, error: err() }); return }
          r({ data: apply(), error: null })
        } })
        chain.then = (r: (v: unknown) => void) => {
          if (fails()) { r({ error: err() }); return }
          apply(); r({ error: null })
        }
        return chain
      }
      return q
    }
    return { db: { from: (t: string) => build(t), rpc: async () => ({ data: null, error: null }) } }
  })

  // ⚠️ THE PIPELINE IS STUBBED, AND THAT IS THE POINT OF THIS FILE'S SCOPE. What the reply
  // pipeline DOES with a resolved owner is proved behaviourally in
  // `unattributed-owner-override.test.ts`; here the question is the ORDER of the route's
  // acts around it, which needs the pipeline to be controllable rather than real.
  vi.doMock('./reply-pipeline', () => ({
    processInboundReply: async (inbound: Row, ctx: Row) => {
      store.pipelineCalls.push({ inbound, ctx })
      if (store.pipelineThrows) throw new Error('the reply insert failed')
      if (store.pipelineRefuses) return { ok: false, dropped: 'no_lead_at_this_inbox' }
      // ⚠️ IT WRITES `provider_event_key`, BECAUSE THE REAL PIPELINE DOES. That column is the
      // durable correlation the reconciliation path reads; a stub that omitted it would make
      // every reconciliation test pass for the wrong reason (nothing to find).
      store.figsy_replies.push({
        id: `reply-${store.figsy_replies.length + 1}`,
        client_id: ctx.resolvedOwnerClientId,
        from_email: inbound.from_email ?? inbound.fromEmail,
        provider_event_key: ctx.eventKey ?? null,
      })
      return { ok: true, clients: 1, replyId: 'reply-1' }
    },
  }))
  vi.doMock('../lib/reply-pipeline', () => ({
    processInboundReply: async (inbound: Row, ctx: Row) => {
      store.pipelineCalls.push({ inbound, ctx })
      if (store.pipelineThrows) throw new Error('the reply insert failed')
      if (store.pipelineRefuses) return { ok: false, dropped: 'no_lead_at_this_inbox' }
      // ⚠️ IT WRITES `provider_event_key`, BECAUSE THE REAL PIPELINE DOES. That column is the
      // durable correlation the reconciliation path reads; a stub that omitted it would make
      // every reconciliation test pass for the wrong reason (nothing to find).
      store.figsy_replies.push({
        id: `reply-${store.figsy_replies.length + 1}`,
        client_id: ctx.resolvedOwnerClientId,
        from_email: inbound.from_email ?? inbound.fromEmail,
        provider_event_key: ctx.eventKey ?? null,
      })
      return { ok: true, clients: 1, replyId: 'reply-1' }
    },
  }))

  vi.doMock('../lib/real-clients', () => ({ getExcludedClientIds: async () => new Set<string>() }))
  vi.doMock('./admin', () => ({ adminKeyValid: (k: unknown) => k === 'right-key' }))
  vi.doMock('../routes/admin', () => ({ adminKeyValid: (k: unknown) => k === 'right-key' }))
  // ⚠️ `operatorEmail` is NOT mocked, deliberately — it is a local function in the route that
  // reads `x-operator-email`, so the identity in these assertions travels the real path a
  // real operator's request does. Only the audit WRITE is captured.
  vi.doMock('./operator-audit', () => ({ writeOperatorAudit: async (e: Row) => { store.audits.push(e) } }))
  vi.doMock('../lib/operator-audit', () => ({ writeOperatorAudit: async (e: Row) => { store.audits.push(e) } }))
}

async function handlerFor(path: string, method: 'get' | 'post') {
  const mod = await import('../routes/operator')
  const stack = (mod.operatorRouter as unknown as { stack: Array<Row> }).stack
  const layer = stack.find(l => l.route?.path === path && l.route?.methods?.[method])
  expect(layer, `${method.toUpperCase()} ${path} not found`).toBeTruthy()
  return layer!.route.stack[layer!.route.stack.length - 1].handle
}

function reqres(opts: { params?: Row; headers?: Row; body?: Row } = {}) {
  const res: Row = { code: 200, body: null }
  res.status = (c: number) => { res.code = c; return res }
  res.json = (b: unknown) => { res.body = b; return res }
  return {
    req: { params: opts.params ?? {}, headers: opts.headers ?? { 'x-admin-key': 'right-key', 'x-operator-email': 'ops@get-kind.com' }, body: opts.body ?? {}, query: {} },
    res,
  }
}

// ⚠️ ONE STORE OBJECT, RESET IN PLACE — IT IS NEVER REASSIGNED, AND THAT IS DELIBERATE.
//
// 🛑 WHAT THIS FIXES, AND IT COST AN HOUR TO FIND. The harness used to do `store = newStore()`
// in `beforeEach`. `vi.doMock`'s factory closes over whatever object it was handed, so a
// module the registry had not genuinely re-evaluated kept writing into a PREVIOUS test's
// store — and the symptom is the worst kind: the route reported success, the row this test
// could see stayed pristine, and the test passed in isolation and failed in the full file.
// The same class of leakage as a process-global set by one suite and read by another.
//
// Resetting the FIELDS of one stable object removes the failure mode entirely: every closure,
// old or new, points at the object this test is asserting on.
const store: Store = newStore()
function resetStore() { Object.assign(store, newStore()) }
beforeEach(() => { vi.resetModules(); resetStore(); installDb(store) })
afterEach(() => { vi.restoreAllMocks(); vi.resetModules() })

async function alerts(): Promise<Row[]> {
  const h = await handlerFor('/alerts', 'get')
  const { req, res } = reqres()
  await h(req, res)
  return ((res.body as Row)?.data ?? []) as Row[]
}
const replyAlerts = (a: Row[]) => a.filter(x => x.kind === 'reply_unattributed')

async function resolveTo(clientId: string, id = 'unattr-1') {
  const h = await handlerFor('/unattributed-replies/:id/resolve', 'post')
  const { req, res } = reqres({ params: { id }, body: { client_id: clientId } })
  await h(req, res)
  return res as { code: number; body: Row }
}
async function discard(id = 'unattr-1', headers?: Row) {
  const h = await handlerFor('/unattributed-replies/:id/discard', 'post')
  const { req, res } = reqres({ params: { id }, ...(headers ? { headers } : {}) })
  await h(req, res)
  return res as { code: number; body: Row }
}
const row = () => store.unattributed_replies[0]

// ═════════════════════════════════════════════════════════════════════════════
// C · THE VIDA ALERT
// ═════════════════════════════════════════════════════════════════════════════
describe('C · a retained reply is visible in Vida, once per candidate', () => {
  it('🛑 TWO CANDIDATE CLIENTS PRODUCE TWO ROWS — one would be invisible to the other', async () => {
    // Vida's surface is scoped to the selected client, so an exception keyed to only one
    // candidate is an exception the operator working the other client cannot see.
    const found = replyAlerts(await alerts())
    expect(found).toHaveLength(2)
    expect(found.map(a => a.client_id).sort()).toEqual(['client-A', 'client-B'])
  })

  it('🛑 BOTH ROWS CARRY THE SAME RETAINED ID — they are one decision, from either side', async () => {
    const found = replyAlerts(await alerts())
    expect(new Set(found.map(a => a.unattributed_reply_id))).toEqual(new Set(['unattr-1']))
  })

  it('the id is present at all — an action with no subject cannot be taken', async () => {
    for (const a of replyAlerts(await alerts())) {
      expect(a.unattributed_reply_id, 'Vida cannot address the record this alert is about').toBeTruthy()
    }
  })

  it('it is HIGH severity and names the sender and the collision', async () => {
    const a = replyAlerts(await alerts())[0]
    expect(a.severity).toBe('high')
    expect(a.label).toContain('thabo@acme.com')
    expect(a.label).toContain('2 clients')
  })

  it('🛑 AND THE LABEL CARRIES NO REPLY BODY — this renders in a shared chip row', async () => {
    const a = replyAlerts(await alerts())[0]
    expect(a.label, 'an inbound message from a stranger is not list decoration')
      .not.toContain('Sounds interesting')
  })

  it('a resolved exception stops appearing', async () => {
    await resolveTo('client-A')
    expect(replyAlerts(await alerts())).toHaveLength(0)
  })

  it('a discarded exception stops appearing too', async () => {
    await discard()
    expect(replyAlerts(await alerts())).toHaveLength(0)
  })

  it('🛑 A CLAIMED-BUT-UNRESOLVED EXCEPTION STAYS VISIBLE — it must not vanish mid-flight', async () => {
    // The half-finished state. If a claim hid the row, a failed attribution would disappear.
    row().resolve_claimed_at = '2026-09-17T10:00:00.000Z'
    expect(replyAlerts(await alerts())).toHaveLength(2)
  })

  it('🛑 AN UNREADABLE RETENTION TABLE DEGRADES LOUDLY — silence is the defect, not the fix', async () => {
    store.selectError = { message: 'relation "unattributed_replies" does not exist' }
    const h = await handlerFor('/alerts', 'get')
    const { req, res } = reqres()
    await h(req, res)
    const body = res.body as Row
    expect(body.success).toBe(true)                       // the rest of the feed still works
    expect(body.degraded?.unattributed_replies).toBeTruthy()
    expect(String(body.degraded.unattributed_replies)).toContain('does NOT mean none are waiting')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// D · HUMAN ATTRIBUTION
// ═════════════════════════════════════════════════════════════════════════════
describe('D · a human attributes it to one candidate', () => {
  it('🛑 EXACTLY ONE CLIENT-VISIBLE REPLY, FOR THE CHOSEN CLIENT ONLY', async () => {
    const r = await resolveTo('client-A')
    expect(r.code).toBe(200)
    expect(store.figsy_replies).toHaveLength(1)
    expect(store.figsy_replies[0].client_id).toBe('client-A')
  })

  it('🛑 AND ZERO FOR THE OTHER CANDIDATE — the whole point of the refusal', async () => {
    await resolveTo('client-A')
    expect(store.figsy_replies.filter(x => x.client_id === 'client-B')).toHaveLength(0)
  })

  it('🛑 IT GOES THROUGH THE EXISTING PIPELINE, with the owner supplied — not a second implementation', async () => {
    await resolveTo('client-A')
    expect(store.pipelineCalls).toHaveLength(1)
    expect(store.pipelineCalls[0].ctx.resolvedOwnerClientId).toBe('client-A')
  })

  it('the retained inbound is what gets written — body, subject, sender and provider', async () => {
    await resolveTo('client-B')
    const { inbound } = store.pipelineCalls[0]
    expect(inbound.fromEmail).toBe('thabo@acme.com')
    expect(inbound.subject).toBe('Re: hello')
    expect(inbound.body).toBe('Sounds interesting, tell me more.')
    expect(inbound.provider).toBe('resend')
    expect(inbound.toEmail).toBe('inbound@kind-shared.test')
  })

  it('🛑 THE REPLY IS KEYED ON THE RETENTION ROW, so the DB refuses a duplicate too', async () => {
    await resolveTo('client-A')
    expect(store.pipelineCalls[0].ctx.eventKey).toBe('unattributed:unattr-1')
  })

  it('the outcome is recorded, with the client and who decided', async () => {
    await resolveTo('client-A')
    expect(row().resolution).toBe('attributed')
    expect(row().resolved_client_id).toBe('client-A')
    expect(row().resolved_at).toBeTruthy()
    expect(row().resolved_by).toBe('ops@get-kind.com')
  })

  it('and it is AUDITED — the one act that makes a reply visible on judgement, not evidence', async () => {
    await resolveTo('client-A')
    const audit = store.audits.find(a => a.action === 'unattributed_reply_attributed')
    expect(audit, 'no audit row for a human attribution').toBeTruthy()
    expect(audit!.detail.attributed_to).toBe('client-A')
    expect(audit!.detail.candidates).toEqual(['client-A', 'client-B'])
    expect(audit!.operatorEmail).toBe('ops@get-kind.com')
  })

  it('either candidate may be chosen — the mirror case', async () => {
    await resolveTo('client-B')
    expect(store.figsy_replies[0].client_id).toBe('client-B')
    expect(row().resolved_client_id).toBe('client-B')
  })

  it('an operator key is required', async () => {
    const h = await handlerFor('/unattributed-replies/:id/resolve', 'post')
    const { req, res } = reqres({ params: { id: 'unattr-1' }, headers: {}, body: { client_id: 'client-A' } })
    await h(req, res)
    expect(res.code).toBe(403)
    expect(store.figsy_replies).toHaveLength(0)
  })

  it('and a missing client_id is refused rather than guessed', async () => {
    const h = await handlerFor('/unattributed-replies/:id/resolve', 'post')
    const { req, res } = reqres({ params: { id: 'unattr-1' }, body: {} })
    await h(req, res)
    expect(res.code).toBe(400)
    expect(store.figsy_replies).toHaveLength(0)
    expect(row().resolved_at).toBeNull()
  })

  it('an unknown id is a 404, not a silent success', async () => {
    const r = await resolveTo('client-A', 'nope')
    expect(r.code).toBe(404)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// E · INVALID ATTRIBUTION
// ═════════════════════════════════════════════════════════════════════════════
describe('E · a client who was never a candidate cannot be chosen', () => {
  it('🛑 REFUSED, AND NOTHING IS WRITTEN', async () => {
    const r = await resolveTo('client-C')
    expect(r.code).toBe(400)
    expect(store.figsy_replies, 'a client who never held this lead received the reply').toHaveLength(0)
  })

  it('🛑 THE EXCEPTION STAYS OPEN — a refusal is not a resolution', async () => {
    await resolveTo('client-C')
    expect(row().resolved_at).toBeNull()
    expect(row().resolution).toBeNull()
    expect(row().resolve_claimed_at, 'the claim was taken before the candidate was checked').toBeNull()
  })

  it('🛑 AND NO AUDIT CLAIMS IT HAPPENED', async () => {
    await resolveTo('client-C')
    expect(store.audits.filter(a => a.action === 'unattributed_reply_attributed')).toHaveLength(0)
  })

  it('the refusal names the real candidates, so the operator is not left guessing', async () => {
    const r = await resolveTo('client-C')
    expect(String(r.body.error)).toContain('client-A')
    expect(String(r.body.error)).toContain('client-B')
  })

  it('and it is still resolvable to a genuine candidate afterwards', async () => {
    await resolveTo('client-C')
    const ok = await resolveTo('client-A')
    expect(ok.code).toBe(200)
    expect(store.figsy_replies).toHaveLength(1)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// F · RESOLUTION FAILURE
// ═════════════════════════════════════════════════════════════════════════════
describe('F · when the reply cannot be written, the exception stays recoverable', () => {
  it('🛑 A REFUSED WRITE LEAVES NO RESOLUTION AND RELEASES THE CLAIM', async () => {
    store.pipelineRefuses = true
    const r = await resolveTo('client-A')
    expect(r.code).toBe(500)
    expect(row().resolved_at, 'a resolution was recorded for a reply that was never written').toBeNull()
    expect(row().resolution).toBeNull()
    expect(row().resolve_claimed_at, 'the claim was not handed back, so the exception is stuck').toBeNull()
  })

  it('🛑 A THROWN WRITE BEHAVES THE SAME WAY', async () => {
    store.pipelineThrows = true
    const r = await resolveTo('client-A')
    expect(r.code).toBe(500)
    expect(row().resolved_at).toBeNull()
    expect(row().resolve_claimed_at).toBeNull()
  })

  it('🛑 AND IT CAN BE RETRIED SUCCESSFULLY — recoverable means recoverable', async () => {
    store.pipelineRefuses = true
    await resolveTo('client-A')
    store.pipelineRefuses = false
    const second = await resolveTo('client-A')
    expect(second.code).toBe(200)
    expect(store.figsy_replies).toHaveLength(1)
    expect(row().resolution).toBe('attributed')
  })

  it('no audit claims success for a failed attribution', async () => {
    store.pipelineRefuses = true
    await resolveTo('client-A')
    expect(store.audits.filter(a => a.action === 'unattributed_reply_attributed')).toHaveLength(0)
  })

  it('🛑 A WRITTEN REPLY WHOSE BOOKKEEPING FAILS DOES NOT RELEASE THE CLAIM', async () => {
    // The one genuinely awkward state, and the direction is deliberate: a stuck exception is
    // recoverable by a human, a duplicate client-visible reply is not. The operator is told
    // exactly that rather than being invited to press again.
    store.settleError = { message: 'connection lost' }
    const r = await resolveTo('client-A')
    expect(r.code).toBe(500)
    expect(store.figsy_replies, 'the reply itself did land').toHaveLength(1)
    expect(row().resolve_claimed_at, 'releasing here would invite a second press and a second reply').toBeTruthy()
    expect(String(r.body.error)).toContain('Do NOT press again')
    expect(r.body.data.written).toBe(true)
  })

  it('and a claim that cannot even be taken refuses rather than proceeding', async () => {
    store.updateError = { message: 'permission denied' }
    const r = await resolveTo('client-A')
    expect(r.code).toBe(500)
    expect(store.figsy_replies, 'the reply was written without holding the claim').toHaveLength(0)
  })

  it('an unreadable retention row refuses — "we cannot tell" is not permission', async () => {
    store.selectError = { message: 'timeout' }
    const r = await resolveTo('client-A')
    expect(r.code).toBe(500)
    expect(store.figsy_replies).toHaveLength(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// G · DOUBLE RESOLUTION
// ═════════════════════════════════════════════════════════════════════════════
describe('G · a repeated operator action cannot duplicate or move the reply', () => {
  it('🛑 A SECOND RESOLVE WRITES NO SECOND REPLY', async () => {
    await resolveTo('client-A')
    const again = await resolveTo('client-A')
    expect(again.code).toBe(200)
    expect(again.body.data.resolved).toBe('already_resolved')
    expect(store.figsy_replies).toHaveLength(1)
  })

  it('🛑 AND IT CANNOT BE MOVED TO THE OTHER CANDIDATE AFTERWARDS', async () => {
    await resolveTo('client-A')
    const moved = await resolveTo('client-B')
    expect(store.figsy_replies).toHaveLength(1)
    expect(store.figsy_replies[0].client_id).toBe('client-A')
    expect(row().resolved_client_id, 'the resolution silently changed client').toBe('client-A')
    expect(moved.body.data?.resolved).toBe('already_resolved')
  })

  it('a concurrent claim is refused with a conflict rather than writing twice', async () => {
    // Another caller holds the claim: exactly the two-operators case.
    row().resolve_claimed_at = '2026-09-17T10:00:00.000Z'
    const r = await resolveTo('client-A')
    expect(r.code).toBe(409)
    expect(store.figsy_replies).toHaveLength(0)
  })

  it('and a discard after an attribution changes nothing', async () => {
    await resolveTo('client-A')
    const d = await discard()
    expect(d.body.data.resolved).toBe('already_resolved')
    expect(row().resolution).toBe('attributed')
    expect(row().resolved_client_id).toBe('client-A')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// H · DISCARD
// ═════════════════════════════════════════════════════════════════════════════
describe('H · discard — it belongs to none of the candidates', () => {
  it('🛑 NO CLIENT-VISIBLE REPLY IS EVER CREATED', async () => {
    const r = await discard()
    expect(r.code).toBe(200)
    expect(store.figsy_replies).toHaveLength(0)
    expect(store.pipelineCalls, 'discard ran the reply pipeline').toHaveLength(0)
  })

  it('the outcome and the decider are recorded', async () => {
    await discard()
    expect(row().resolution).toBe('discarded')
    expect(row().resolved_at).toBeTruthy()
    expect(row().resolved_by).toBe('ops@get-kind.com')
    expect(row().resolved_client_id, 'a discarded reply must name no client').toBeNull()
  })

  it('and it is audited', async () => {
    await discard()
    const audit = store.audits.find(a => a.action === 'unattributed_reply_discarded')
    expect(audit).toBeTruthy()
    expect(audit!.detail.candidates).toEqual(['client-A', 'client-B'])
  })

  it('⚠️ THE INBOUND ITSELF IS KEPT — a discard is a decision, not a delete', async () => {
    await discard()
    expect(row().body).toBe('Sounds interesting, tell me more.')
    expect(row().raw_payload).toBeTruthy()
  })

  it('a second discard is a no-op', async () => {
    await discard()
    const again = await discard()
    expect(again.body.data.resolved).toBe('already_resolved')
    expect(store.figsy_replies).toHaveLength(0)
  })

  it('🛑 AND A DISCARDED REPLY CANNOT THEN BE ATTRIBUTED TO ANYONE', async () => {
    await discard()
    const r = await resolveTo('client-A')
    expect(store.figsy_replies).toHaveLength(0)
    expect(row().resolution).toBe('discarded')
    expect(r.body.data?.resolved).toBe('already_resolved')
  })

  it('an operator key is required', async () => {
    const r = await discard('unattr-1', {})
    expect(r.code).toBe(403)
    expect(row().resolved_at).toBeNull()
  })

  it('a failed write is reported rather than reported as done', async () => {
    store.updateError = { message: 'permission denied' }
    const r = await discard()
    expect(r.code).toBe(500)
    expect(row().resolution).toBeNull()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// THE COMPARE-AND-SET, ASSERTED WHERE IT ACTUALLY BITES
// ═════════════════════════════════════════════════════════════════════════════
//
// 🛑 WHY THIS BLOCK EXISTS, AND IT WAS FOUND BY MUTATING RATHER THAN BY READING. Deleting
// `.is('resolved_at', null)` from `settleUnattributedReply` broke NOTHING above — because
// every route-level test is already satisfied by the handler's early `if (resolved_at)`
// return, which fires first. So the backstop that matters was untested: two requests that
// BOTH pass that early check (a genuine race, or a retry arriving mid-flight) and then both
// try to write an outcome.
//
// ⚠️ SO THE STORE IS CALLED DIRECTLY HERE. A guard proved only through a caller that short-
// circuits before reaching it is a guard that has never run (rule 16).
describe('settleUnattributedReply refuses to overwrite a decision that is already made', () => {
  it('🛑 A SECOND SETTLE CHANGES NOTHING — `changed` is false and the row is untouched', async () => {
    const { settleUnattributedReply } = await import('./unattributed-reply')
    const first = await settleUnattributedReply({ id: 'unattr-1', resolution: 'attributed', clientId: 'client-A', by: 'ops@get-kind.com' })
    expect(first.changed).toBe(true)

    const second = await settleUnattributedReply({ id: 'unattr-1', resolution: 'discarded', clientId: null, by: 'someone-else@get-kind.com' })
    expect(second.ok, 'a no-op is not an error').toBe(true)
    expect(second.changed, 'the second settle overwrote the first decision').toBe(false)
    expect(row().resolution).toBe('attributed')
    expect(row().resolved_client_id).toBe('client-A')
    expect(row().resolved_by).toBe('ops@get-kind.com')
  })

  it('🛑 AND IT CANNOT BE MOVED TO ANOTHER CLIENT BY A SECOND ATTRIBUTION', async () => {
    const { settleUnattributedReply } = await import('./unattributed-reply')
    await settleUnattributedReply({ id: 'unattr-1', resolution: 'attributed', clientId: 'client-A', by: 'ops@get-kind.com' })
    const moved = await settleUnattributedReply({ id: 'unattr-1', resolution: 'attributed', clientId: 'client-B', by: 'ops@get-kind.com' })
    expect(moved.changed).toBe(false)
    expect(row().resolved_client_id, 'the resolution silently changed client').toBe('client-A')
  })

  it('the claim cannot be released once a decision exists either', async () => {
    // Same shape, same reason: `releaseUnattributedClaim` is narrowed by `resolved_at IS NULL`
    // so a late failure path cannot unpick a finished attribution.
    const { settleUnattributedReply, releaseUnattributedClaim } = await import('./unattributed-reply')
    row().resolve_claimed_at = '2026-09-17T10:00:00.000Z'
    await settleUnattributedReply({ id: 'unattr-1', resolution: 'attributed', clientId: 'client-A', by: 'ops@get-kind.com' })
    await releaseUnattributedClaim('unattr-1')
    expect(row().resolve_claimed_at, 'a resolved exception had its claim unpicked').toBeTruthy()
    expect(row().resolution).toBe('attributed')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// THE RULING IS IN THE REGISTER, NOT ONLY IN THIS BUILD
// ═════════════════════════════════════════════════════════════════════════════
//
// ⚠️ Rule 4b / the citation law. A ruling that lives only in a chat transcript is a ruling
// that will be contradicted: the transcript is not read at session start and cannot be
// grepped. #549 was reversed on 6 Aug for exactly that reason.
describe('R132 is recorded where it can be grepped', () => {
  const rules = (() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { readFileSync } = require('node:fs') as typeof import('node:fs')
    const { join } = require('node:path') as typeof import('node:path')
    return readFileSync(join(__dirname, '../../../../docs/PRODUCT-RULES.md'), 'utf8')
  })()

  it('🛑 R132 EXISTS, in the founder\'s own words', () => {
    expect(rules).toMatch(/R132/)
    for (const clause of [
      'We must not replace a privacy leak with silent data loss.',
      'Do NOT mark the unattributed reply resolved BEFORE normal reply processing succeeds.',
      'If reply processing fails: the exception must remain recoverable.',
      'A repeated operator action must not create duplicate figsy_replies.',
      'Do NOT create a second reply-processing implementation.',
      'It must NOT re-enable fan-out.',
      'Do NOT build another alert platform.',
      'Do NOT make provider_event_key globally unique by itself.',
    ]) {
      expect(rules, `R132 is missing the founder's clause: ${clause}`).toContain(clause)
    }
  })

  it('🛑 AND IT SAYS THE MIGRATION IS UNAPPLIED rather than implying it ran', () => {
    const i = rules.indexOf('| **R132** |')
    const row = rules.slice(i, rules.indexOf('\n', i))
    expect(row).toMatch(/UNAPPLIED/)
    expect(row).toMatch(/UNMERGED, UNDEPLOYED/)
  })

  it('🛑 R132a RECORDS THE RECONCILIATION, and chains R132 rather than replacing it', () => {
    // ⚠️ THE SAME DUTY AS R132's OWN GUARD, for the amendment that makes it recoverable. A
    // consistency fix that lives only in code is one a future session will undo.
    expect(rules).toMatch(/R132a/)
    for (const clause of [
      'Do not require the operator or Founder to manually edit the database.',
      'USE THAT EXISTING CORRELATION.',
      'Do NOT invent another attribution architecture.',
      'The persisted correlation is authority.',
      'Resolution cannot silently change to a different client later.',
    ]) {
      expect(rules, `R132a is missing the founder's clause: ${clause}`).toContain(clause)
    }
    const i = rules.indexOf('| **R132a** |')
    const row = rules.slice(i, rules.indexOf('\n', i))
    expect(row, 'R132a does not chain R132').toMatch(/chains \*\*R132\*\*/)
    expect(row, 'a migration was claimed for a patch that adds none').toMatch(/NO NEW MIGRATION/)
    expect(rules, 'R132 was replaced rather than amended').toMatch(/\| \*\*R132\*\* \|/)
  })

  it('and it chains R131 rather than replacing it — R131 stays the fan-out lock', () => {
    const i = rules.indexOf('| **R132** |')
    const row = rules.slice(i, rules.indexOf('\n', i))
    expect(row).toMatch(/chains \*\*R131\*\*/)
    expect(rules, 'R131 was deleted rather than chained').toMatch(/\| \*\*R131\*\* \|/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// POST-WRITE RECONCILIATION — THE STUCK STATE, AND THE WAY OUT
// ═════════════════════════════════════════════════════════════════════════════
//
// 🛑 THE DEFECT, STATED PLAINLY. The reply is written BEFORE the outcome is recorded, and
// that order is correct: recording first would leave a resolution with no reply. But when the
// second write failed, the reply existed, the exception stayed CLAIMED, and a retry was
// refused with a 409 to avoid writing a second one. Safe — and with no exit except editing
// the database by hand, which is not an exit.
//
// ⚠️ THE ANSWER WAS ALREADY PERSISTED. `figsy_replies.provider_event_key` carries
// `unattributed:<retention id>`, stored for exactly this purpose. So the retry can KNOW the
// reply exists and who owns it, and finish only the bookkeeping. No address, no timestamp, no
// newest-row, no fuzzy match — every one of those is a guess this design refuses, and a
// recovery path built on one would smuggle it in where nobody would look for it.

/** Simulate the exact failure: reply written, settlement refused. */
async function resolveWithFailedSettle(clientId: string) {
  store.settleError = { message: 'connection lost' }
  const first = await resolveTo(clientId)
  store.settleError = null
  return first
}

describe('TEST 1 · the reply was written and the bookkeeping failed', () => {
  it('🛑 THE FIRST ATTEMPT LEAVES EXACTLY ONE REPLY AND AN UNRESOLVED EXCEPTION', async () => {
    const first = await resolveWithFailedSettle('client-A')
    expect(first.code).toBe(500)
    expect(store.figsy_replies).toHaveLength(1)
    expect(store.figsy_replies[0].client_id).toBe('client-A')
    expect(store.figsy_replies.filter(r => r.client_id === 'client-B')).toHaveLength(0)
    expect(row().resolved_at, 'the exception was falsely marked resolved').toBeNull()
    expect(row().resolution).toBeNull()
  })

  it('🛑 AND IT IS STUCK BEFORE THE FIX — the claim is held, which is why a retry needed one', async () => {
    await resolveWithFailedSettle('client-A')
    expect(row().resolve_claimed_at, 'the claim was released, which would invite a duplicate reply').toBeTruthy()
  })

  it('🛑 THE RETRY RECONCILES: NO SECOND REPLY, NO SECOND PROCESSING', async () => {
    await resolveWithFailedSettle('client-A')
    const callsBefore = store.pipelineCalls.length
    const retry = await resolveTo('client-A')

    expect(retry.code).toBe(200)
    expect(store.figsy_replies, 'a second client-visible reply was created').toHaveLength(1)
    expect(store.pipelineCalls.length, 'the reply was processed again — a second classification, a second CRM push')
      .toBe(callsBefore)
    expect(retry.body.data.reconciled).toBe(true)
  })

  it('🛑 AND THE EXCEPTION IS SETTLED TO THE CLIENT WHO ACTUALLY HAS THE REPLY', async () => {
    await resolveWithFailedSettle('client-A')
    await resolveTo('client-A')
    expect(row().resolution).toBe('attributed')
    expect(row().resolved_client_id).toBe('client-A')
    expect(row().resolved_at).toBeTruthy()
  })

  it('🛑 SO IT DISAPPEARS FROM VIDA — the operator is no longer looking at a stuck task', async () => {
    await resolveWithFailedSettle('client-A')
    expect(replyAlerts(await alerts()), 'it vanished before it was actually resolved').toHaveLength(2)
    await resolveTo('client-A')
    expect(replyAlerts(await alerts())).toHaveLength(0)
  })

  it('the reconciliation is audited, and says what it actually did', async () => {
    await resolveWithFailedSettle('client-A')
    await resolveTo('client-A')
    const audits = store.audits.filter(a => a.action === 'unattributed_reply_attributed')
    const rec = audits.find(a => a.detail?.reconciled === true)
    expect(rec, 'no audit describes the reconciliation').toBeTruthy()
    expect(rec!.detail.attributed_to).toBe('client-A')
    expect(rec!.detail.reply_ids).toEqual(['reply-1'])
    expect(String(rec!.detail.means)).toContain('bookkeeping failed')
  })

  it('and it works WITHOUT the operator or founder touching the database', async () => {
    // The whole point. Nothing in this test edits `resolve_claimed_at`; the retry is a normal
    // press of the same button.
    await resolveWithFailedSettle('client-A')
    const before = JSON.stringify(row())
    const retry = await resolveTo('client-A')
    expect(before).not.toBe(JSON.stringify(row()))
    expect(retry.body.success).toBe(true)
  })
})

describe('TEST 2 · a retry naming the WRONG candidate is refused', () => {
  it('🛑 THE PERSISTED REPLY WINS — client B is refused', async () => {
    await resolveWithFailedSettle('client-A')
    const wrong = await resolveTo('client-B')
    expect(wrong.code).toBe(409)
    expect(wrong.body.success).toBe(false)
  })

  it('🛑 NOTHING IS CREATED FOR B, AND A KEEPS THE REPLY', async () => {
    await resolveWithFailedSettle('client-A')
    await resolveTo('client-B')
    expect(store.figsy_replies).toHaveLength(1)
    expect(store.figsy_replies[0].client_id).toBe('client-A')
    expect(store.figsy_replies.filter(r => r.client_id === 'client-B')).toHaveLength(0)
  })

  it('🛑 AND THE ATTRIBUTION IS NEVER MOVED', async () => {
    await resolveWithFailedSettle('client-A')
    await resolveTo('client-B')
    expect(row().resolved_client_id, 'the exception was settled to a client who has no reply').not.toBe('client-B')
    expect(row().resolution).not.toBe('attributed')
  })

  it('the refusal names who actually holds it, so the operator knows what to press', async () => {
    await resolveWithFailedSettle('client-A')
    const wrong = await resolveTo('client-B')
    expect(String(wrong.body.error)).toContain('client-A')
    expect(wrong.body.data.already_attributed_to).toBe('client-A')
  })

  it('and the correct client can still reconcile afterwards', async () => {
    await resolveWithFailedSettle('client-A')
    await resolveTo('client-B')
    const right = await resolveTo('client-A')
    expect(right.code).toBe(200)
    expect(row().resolved_client_id).toBe('client-A')
    expect(store.figsy_replies).toHaveLength(1)
  })
})

describe('TEST 3 · discard after the reply was written', () => {
  it('🛑 IT IS REFUSED — a written reply can never be recorded as belonging to nobody', async () => {
    await resolveWithFailedSettle('client-A')
    const d = await discard()
    expect(d.code).toBe(409)
    expect(row().resolution, 'a reply in a client\'s inbox was recorded as discarded').not.toBe('discarded')
    expect(row().resolved_at).toBeNull()
  })

  it('🛑 AND THE REPLY IS UNTOUCHED', async () => {
    await resolveWithFailedSettle('client-A')
    await discard()
    expect(store.figsy_replies).toHaveLength(1)
    expect(store.figsy_replies[0].client_id).toBe('client-A')
  })

  it('it names the client and the remedy — one press of the button beside it', async () => {
    await resolveWithFailedSettle('client-A')
    const d = await discard()
    expect(String(d.body.error)).toContain('client-A')
    expect(String(d.body.error)).toContain('Attribute to this client')
    expect(d.body.data.needs).toBe('attribution_reconciliation')
  })

  it('and after reconciling, discard is simply already-resolved', async () => {
    await resolveWithFailedSettle('client-A')
    await resolveTo('client-A')
    const d = await discard()
    expect(d.body.data.resolved).toBe('already_resolved')
    expect(row().resolution).toBe('attributed')
  })

  it('an unreadable lookup also refuses a discard — not knowing is not permission', async () => {
    store.replyLookupError = { message: 'timeout' }
    const d = await discard()
    expect(d.code).toBe(500)
    expect(row().resolution).toBeNull()
    expect(row().resolved_at).toBeNull()
  })
})

describe('TEST 4 · the ordinary path is unchanged', () => {
  it('🛑 NO EXISTING REPLY → PROCESS ONCE, REPLY ONCE, SETTLE ONCE, AUDIT ONCE', async () => {
    const r = await resolveTo('client-A')
    expect(r.code).toBe(200)
    expect(store.pipelineCalls).toHaveLength(1)
    expect(store.figsy_replies).toHaveLength(1)
    expect(row().resolution).toBe('attributed')
    expect(store.audits.filter(a => a.action === 'unattributed_reply_attributed')).toHaveLength(1)
  })

  it('and it is NOT reported as a reconciliation', async () => {
    const r = await resolveTo('client-A')
    expect(r.body.data.reconciled).toBeUndefined()
    const audit = store.audits.find(a => a.action === 'unattributed_reply_attributed')
    expect(audit!.detail.reconciled).toBeUndefined()
  })

  it('the claim is still taken on the ordinary path — concurrency is not weakened', async () => {
    // The reconciliation lookup runs first, but on this path it finds nothing and the claim
    // still guards the processing. A concurrent caller is still refused.
    row().resolve_claimed_at = '2026-09-17T10:00:00.000Z'
    const r = await resolveTo('client-A')
    expect(r.code).toBe(409)
    expect(store.figsy_replies).toHaveLength(0)
  })

  it('a non-candidate is still refused before anything else happens', async () => {
    const r = await resolveTo('client-C')
    expect(r.code).toBe(400)
    expect(store.figsy_replies).toHaveLength(0)
    expect(store.pipelineCalls).toHaveLength(0)
  })
})

describe('TEST 5 · an already fully resolved exception', () => {
  it('🛑 A RETRY CREATES NOTHING AND MOVES NOTHING', async () => {
    await resolveTo('client-A')
    const again = await resolveTo('client-A')
    expect(again.code).toBe(200)
    expect(store.figsy_replies).toHaveLength(1)
    expect(store.pipelineCalls).toHaveLength(1)
    expect(again.body.data.resolved).toBe('already_resolved')
  })

  it('🛑 AND IT CANNOT BE MOVED TO THE OTHER CANDIDATE', async () => {
    await resolveTo('client-A')
    await resolveTo('client-B')
    expect(store.figsy_replies).toHaveLength(1)
    expect(store.figsy_replies[0].client_id).toBe('client-A')
    expect(row().resolved_client_id).toBe('client-A')
  })
})

describe('TEST 6 · the correlation lookup cannot be read', () => {
  beforeEach(() => { store.replyLookupError = { message: 'relation "figsy_replies" is unavailable' } })

  it('🛑 FAIL CLOSED — no new reply', async () => {
    const r = await resolveTo('client-A')
    expect(r.code).toBe(500)
    expect(store.figsy_replies, 'a reply was written without knowing whether one already existed').toHaveLength(0)
    expect(store.pipelineCalls).toHaveLength(0)
  })

  it('🛑 NO SETTLEMENT EITHER', async () => {
    await resolveTo('client-A')
    expect(row().resolved_at).toBeNull()
    expect(row().resolution).toBeNull()
  })

  it('🛑 AND NO DISCARD', async () => {
    const d = await discard()
    expect(d.code).toBe(500)
    expect(row().resolution).toBeNull()
  })

  it('the operator is told, rather than the failure being silent', async () => {
    const r = await resolveTo('client-A')
    expect(String(r.body.error)).toContain('could not be checked')
    expect(r.body.success).toBe(false)
  })

  it('the claim is not taken, so nothing is left stuck by the refusal', async () => {
    await resolveTo('client-A')
    expect(row().resolve_claimed_at).toBeNull()
  })
})

describe('the impossible case — one exception, two clients', () => {
  it('🛑 FAILS CLOSED AND PICKS NEITHER', async () => {
    // Should be unreachable: the write path routes to one client and the DB carries a partial
    // unique index on `provider_event_key`. Reaching it means an assumption has broken, and
    // choosing one would be inventing an answer to a question we have just found we cannot
    // answer.
    store.figsy_replies.push(
      { id: 'r1', client_id: 'client-A', provider_event_key: 'unattributed:unattr-1' },
      { id: 'r2', client_id: 'client-B', provider_event_key: 'unattributed:unattr-1' },
    )
    const r = await resolveTo('client-A')
    expect(r.code).toBe(500)
    expect(String(r.body.error)).toContain('should be impossible')
    expect(row().resolved_at).toBeNull()
  })

  it('and a discard is refused for it too', async () => {
    store.figsy_replies.push(
      { id: 'r1', client_id: 'client-A', provider_event_key: 'unattributed:unattr-1' },
      { id: 'r2', client_id: 'client-B', provider_event_key: 'unattributed:unattr-1' },
    )
    const d = await discard()
    expect(d.code).toBe(409)
    expect(row().resolution).toBeNull()
  })

  it('⚠️ BUT TWO REPLIES FOR ONE CLIENT IS NORMAL AND RECONCILES FINE', async () => {
    // A client legitimately holds the same prospect under two leads, and the pipeline writes
    // one row per lead. That is ONE attribution, not a conflict.
    store.figsy_replies.push(
      { id: 'r1', client_id: 'client-A', provider_event_key: 'unattributed:unattr-1' },
      { id: 'r2', client_id: 'client-A', provider_event_key: 'unattributed:unattr-1' },
    )
    const r = await resolveTo('client-A')
    expect(r.code).toBe(200)
    expect(row().resolved_client_id).toBe('client-A')
    expect(r.body.data.reply_ids).toEqual(['r1', 'r2'])
  })

  it('and a reply for a DIFFERENT retention id is never mistaken for this one', async () => {
    // The correlation is exact. A reply belonging to another exception must not satisfy this
    // one — that would settle an open exception against somebody else's reply.
    store.figsy_replies.push({ id: 'r9', client_id: 'client-A', provider_event_key: 'unattributed:unattr-999' })
    const r = await resolveTo('client-A')
    expect(r.code).toBe(200)
    expect(store.pipelineCalls, 'it reconciled against an unrelated reply instead of processing').toHaveLength(1)
    expect(r.body.data.reconciled).toBeUndefined()
  })
})
