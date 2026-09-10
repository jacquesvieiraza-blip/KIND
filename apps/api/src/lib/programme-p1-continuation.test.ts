// ═══════════════════════════════════════════════════════════════════════════════════════
// P1 IS COMMITTED, SO THE PROGRAMME STARTS — and the far longer list of what that must not do.
//
// 🛑 THE RULE (founder-locked): once valid P1 authority exists for an exact programme,
// source → enrich → qualify → account → prepare continues AUTOMATICALLY. `sourceProgramme` had
// exactly one caller and it was an operator route, so a client could pay, the ceiling could
// open, and nothing would happen until a human noticed. That is not a slower version of the
// rule — it is a different product.
//
// ⚠️ THE OLD RULE THIS SUPERSEDES was "payment must never start sourcing", and it was never
// really about payment: it was about an UNCHECKED webhook spending money. That concern is met
// by the SHAPE — authority committed first, every fact re-proved from the row, only then a
// provider call — and these cases are mostly proofs of that shape.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'

vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})
import { join } from 'node:path'

type Row = Record<string, unknown>
/**
 * ⚑ 10 Sep (I1) — `batches` IS ITS OWN TABLE NOW, AND IT HAD TO BE.
 *
 * The mapper below used to send every table that was not `programmes` or `icps` to one shared
 * `audit` array. `programme_batches` is the table that answers "has this programme already
 * spent a client's money", so leaving it pointed at the audit rows would have made the spend
 * check read whatever the last audit write happened to be — a guard that passes for the wrong
 * reason proves nothing.
 */
const state: { programmes: Row[]; icps: Row[]; audit: Row[]; batches: Row[] } =
  { programmes: [], icps: [], audit: [], batches: [] }
/** Every programme id `sourceProgramme` was called for. The spend, recorded. */
const sourced: string[] = []

function table(name: 'programmes' | 'icps' | 'audit' | 'batches') {
  const rows = () => state[name]
  const q: Record<string, unknown> & { _f: ((r: Row) => boolean)[] } = {
    _f: [], _mode: '', _payload: null as Row | null, _order: null as null | { c: string; asc: boolean },
    select() { return q },
    // ⚠️ THE MOCK ORDERS FOR REAL. `lastP1ContinuationAttempt` takes the NEWEST outcome and
    // ignores the history behind it; a no-op `order()` would have let a stale refusal win and
    // the "a later success clears the exception" case would have passed by accident.
    order(c: string, o?: { ascending?: boolean }) { q._order = { c, asc: o?.ascending !== false }; return q },
    limit(n: number) { q._limit = n; return q },
    eq(c: string, v: unknown) { q._f.push((r: Row) => r[c] === v); return q },
    is(c: string, v: unknown) { q._f.push((r: Row) => (r[c] ?? null) === v); return q },
    not(c: string, _o: string, v: unknown) { q._f.push((r: Row) => (r[c] ?? null) !== v); return q },
    in(c: string, l: unknown[]) { q._f.push((r: Row) => l.includes(r[c] as never)); return q },
    insert(p: Row) { rows().push(p); return q },
    update(p: Row) { q._mode = 'update'; q._payload = p; return q },
    _hit() {
      let h = rows().filter(r => q._f.every(f => f(r)))
      const o = q._order as null | { c: string; asc: boolean }
      if (o) {
        h = [...h].sort((a, b) => String(a[o.c] ?? '').localeCompare(String(b[o.c] ?? '')) * (o.asc ? 1 : -1))
      }
      const n = q._limit as number | undefined
      return typeof n === 'number' ? h.slice(0, n) : h
    },
    _run() {
      if (q._mode === 'update') { const h = q._hit(); for (const r of h) Object.assign(r, q._payload); return { data: h, error: null } }
      return { data: q._hit(), error: null }
    },
    async maybeSingle() { return { data: q._hit()[0] ?? null, error: null } },
    async single() { return { data: q._hit()[0] ?? null, error: null } },
    then(res: (v: unknown) => unknown) { return Promise.resolve(q._run()).then(res) },
  } as never
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => table(
      t === 'programmes' ? 'programmes'
        : t === 'icps' ? 'icps'
          : t === 'programme_batches' ? 'batches'
            : 'audit'),
    rpc: async () => ({ data: null, error: null }),
  },
}))
vi.mock('./alerts', () => ({ sendFounderAlert: async () => {} }))

// 🛑 THE SPEND, STUBBED AND RECORDED. This is the function that buys people; every case below
// asserts on whether it was reached, because "did this start" and "did this refuse" are the
// only two questions that matter here.
vi.mock('./programme-sourcing', () => ({
  sourceProgramme: async (id: string) => {
    sourced.push(id)
    return { ok: true, programmeId: id, clientId: 'c', icpId: 'i', icpName: 'ICP', requested: 250, inserted: 250, skipped: 0, relaxed: null }
  },
}))

import {
  startProgrammeAfterP1, p1ContinuationVerdict, isP1ContinuationRunning,
  p1ContinuationHealth, lastP1ContinuationAttempt,
} from './programme-p1-continuation'

const PROG = '22222222-2222-4222-8222-222222222222'
const CLIENT = '11111111-1111-4111-8111-111111111111'
const ICP = '33333333-3333-4333-8333-333333333333'

const prog = (over: Row = {}): Row => ({
  id: PROG, client_id: CLIENT, status: 'SOURCING_AUTHORISED',
  paused_at: null, disputed_at: null,
  first_paid_at: '2026-09-09', first_authorised_at: null,
  second_paid_at: null, second_payment_ref: null, second_authorised_at: null,
  approved_at: null, went_live_at: null,
  sourcing_ceiling: 2500, sourced_used: 0, sourced_reserved: 0,
  ...over,
})

/**
 * Wait until the background run has actually finished.
 *
 * ⚠️ A CONDITION, NOT A TICK COUNT. A fixed number of turns is a guess, and it was wrong: the
 * run's audit write does a dynamic import, which on its first load takes longer than the ticks
 * allowed — so the map still held the programme when the next case started and that case read
 * "already sourcing". Waiting on the state the code actually owns is deterministic.
 */
const settle = async (id: string = PROG) => {
  for (let i = 0; i < 500 && isP1ContinuationRunning(id); i++) await new Promise(r => setTimeout(r, 0))
  // One more turn so the audit write lands after the map clears.
  await new Promise(r => setTimeout(r, 0))
}

beforeEach(() => {
  state.programmes = [prog()]
  state.icps = [{ id: ICP, client_id: CLIENT, programme_id: PROG }]
  state.audit = []
  state.batches = []
  sourced.length = 0
})

/** One outcome row exactly as `writeOperatorAudit` would have written it. */
const outcome = (action: string, detail: string, created_at: string): Row => ({
  operator_email: 'stripe-webhook', action,
  subject_type: 'programme', subject_id: PROG,
  detail: { trigger: 'stripe_first_payment', detail }, created_at,
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ① IT STARTS BY ITSELF
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('① P1 authority starts the programme with no operator press', () => {
  it('🛑 a paid programme sources automatically', async () => {
    const r = await startProgrammeAfterP1(PROG, 'stripe_first_payment', 'stripe-webhook')
    expect(r.started).toBe(true)
    await settle()
    expect(sourced, 'the programme did not start on its own').toEqual([PROG])
  })

  it('internal P1 authority starts it exactly the same way', async () => {
    state.programmes = [prog({ first_paid_at: null, first_authorised_at: '2026-09-09' })]
    const r = await startProgrammeAfterP1(PROG, 'internal_first_authority', 'founder@kind')
    expect(r.started, r.detail).toBe(true)
    await settle()
    expect(sourced).toEqual([PROG])
  })

  it('the outcome is audited, because nobody pressed anything', async () => {
    await startProgrammeAfterP1(PROG, 'stripe_first_payment', 'stripe-webhook')
    await settle()
    expect(state.audit.some(a => a.action === 'programme_p1_auto_started')).toBe(true)
  })

  it('a refusal is audited too — a start nobody attempted looks identical otherwise', async () => {
    state.icps = []
    await startProgrammeAfterP1(PROG, 'stripe_first_payment', 'stripe-webhook')
    expect(state.audit.some(a => a.action === 'programme_p1_auto_refused')).toBe(true)
  })

  it('it returns at once and sources behind the response', async () => {
    const r = await startProgrammeAfterP1(PROG, 'stripe_first_payment', 'stripe-webhook')
    // 🛑 A STRIPE WEBHOOK HELD OPEN FOR A SOURCING RUN TIMES OUT AND IS REDELIVERED — which is
    // how one payment becomes two sourcing runs.
    expect(r.started).toBe(true)
    expect(isP1ContinuationRunning(PROG)).toBe(true)
    await settle()
    expect(isP1ContinuationRunning(PROG)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ② EVERY FACT IS RE-PROVED BEFORE A SINGLE PROVIDER CALL
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('② nothing is bought until the row says it may be', () => {
  const refusesWith = async (over: Row, contains: string) => {
    state.programmes = [prog(over)]
    const r = await startProgrammeAfterP1(PROG, 'stripe_first_payment', 'stripe-webhook')
    await settle()
    expect(r.started, `it sourced despite: ${contains}`).toBe(false)
    expect(sourced, 'a provider call was made anyway').toEqual([])
    expect(r.detail).toContain(contains)
  }

  it('a paused programme buys nothing', () => refusesWith({ paused_at: '2026-09-09' }, 'paused'))
  it('a terminal programme buys nothing', () => refusesWith({ status: 'CANCELLED' }, 'CANCELLED'))
  it('a programme with no P1 authority buys nothing', () =>
    refusesWith({ first_paid_at: null, first_authorised_at: null }, 'first-payment authority'))
  it('a status with no sourcing authority buys nothing', () =>
    refusesWith({ status: 'AWAITING_FIRST_PAYMENT' }, 'no sourcing authority'))
  it('a programme with nothing left to spend buys nothing', () =>
    refusesWith({ sourced_used: 2500 }, 'no entitlement left'))
  it('a fully reserved programme buys nothing', () =>
    refusesWith({ sourced_reserved: 2500 }, 'no entitlement left'))

  it('🛑 a REFUNDED or DISPUTED programme buys nothing — it is paused by the reversal', () =>
    refusesWith({ disputed_at: '2026-09-09', paused_at: '2026-09-09' }, 'paused'))

  it('🛑 no targeting → no spend', async () => {
    state.icps = []
    const r = await startProgrammeAfterP1(PROG, 'stripe_first_payment', 'x')
    await settle()
    expect(r.started).toBe(false)
    expect(sourced).toEqual([])
    expect(r.detail).toContain('No ICP is attached')
  })

  it('🛑 AMBIGUOUS targeting → no spend, because which audience is a human decision', async () => {
    state.icps.push({ id: 'icp-2', client_id: CLIENT, programme_id: PROG })
    const r = await startProgrammeAfterP1(PROG, 'stripe_first_payment', 'x')
    await settle()
    expect(r.started).toBe(false)
    expect(sourced).toEqual([])
    expect(r.detail).toContain('2 attached ICPs')
  })

  it('🛑 NO CROSS-CLIENT BLEED — an ICP belonging to another client is refused', async () => {
    state.icps = [{ id: ICP, client_id: 'someone-else', programme_id: PROG }]
    const r = await startProgrammeAfterP1(PROG, 'stripe_first_payment', 'x')
    await settle()
    expect(r.started).toBe(false)
    expect(sourced).toEqual([])
    expect(r.detail).toContain('different client')
  })

  it('a non-uuid buys nothing and reads nothing', async () => {
    for (const bad of ['', 'house', CLIENT.slice(0, 8)]) {
      const r = await startProgrammeAfterP1(bad, 'stripe_first_payment', 'x')
      expect(r.started).toBe(false)
      expect(sourced).toEqual([])
    }
  })

  it('an unknown programme buys nothing', async () => {
    state.programmes = []
    const r = await startProgrammeAfterP1(PROG, 'stripe_first_payment', 'x')
    expect(r.started).toBe(false)
    expect(sourced).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ③ ONE PAYMENT, ONE RUN
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('③ a payment cannot source twice', () => {
  it('🛑 a second start while one is in flight is refused', async () => {
    const a = await startProgrammeAfterP1(PROG, 'stripe_first_payment', 'x')
    const b = await startProgrammeAfterP1(PROG, 'stripe_first_payment', 'x')
    expect(a.started).toBe(true)
    expect(b.started).toBe(false)
    expect(b.already_running).toBe(true)
    await settle()
    expect(sourced, 'one payment produced two sourcing runs').toEqual([PROG])
  })

  it('🛑 THE WEBHOOK ONLY STARTS WHEN IT ACTUALLY CLAIMED THE ROW', () => {
    // `recordFirstPayment` compare-and-sets on `first_payment_ref IS NULL` and answers
    // `alreadyRecorded` for a redelivery. Starting on a redelivery is precisely how one
    // payment becomes two runs, so the caller is gated on that flag.
    const STRIPE = readFileSync(join(__dirname, '..', 'routes', 'stripe.ts'), 'utf8')
    expect(STRIPE).toContain('if (!r.alreadyRecorded) {')
    const at = STRIPE.indexOf('if (!r.alreadyRecorded) {')
    expect(STRIPE.slice(at, at + 500)).toContain('startProgrammeAfterP1(meta.programmeId')
  })

  it('the compare-and-set that makes it safe is still there', () => {
    const PROGRAMME = readFileSync(join(__dirname, 'programme.ts'), 'utf8')
    expect(PROGRAMME).toContain(".is('first_payment_ref', null)")
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ④ IT GRANTS NOTHING FURTHER
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('④ starting a programme is not approving, paying for or running it', () => {
  const SRC = readFileSync(join(__dirname, 'programme-p1-continuation.ts'), 'utf8')
  const code = SRC.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')

  it('🛑 no P2, no approval, no Make Live, no Run, no send', () => {
    for (const forbidden of [
      'p2Authorised', 'second_paid_at', 'second_authorised_at', 'recordSecondPayment',
      'approveProgramme', 'approved_at', 'goLiveProgramme', 'went_live_at', 'assertGoingLive',
      'sendSequenceEmail', 'operatorSendEnabled', 'FIGSY_OPERATOR_SEND_ENABLED', 'AUTO_OUTREACH_ENABLED',
    ]) {
      expect(code.includes(forbidden), `the continuation can reach ${forbidden}`).toBe(false)
    }
  })

  it('it writes no programme state of its own — sourcing owns every counter', () => {
    expect(code.includes('.update('), 'the continuation writes to the database').toBe(false)
    expect(code.includes('setStatus('), 'the continuation moves the status').toBe(false)
    for (const col of ['sourced_used', 'sourced_reserved', 'sourcing_ceiling'].map(c => `${c}:`)) {
      expect(code.includes(col), `the continuation writes ${col}`).toBe(false)
    }
  })

  it('🛑 ⚑ I1 — and the resume logic READS the spend, it never writes one', () => {
    // The obvious way to make a continuation resumable is a claim column and a compare-and-set.
    // It was deliberately not taken: the fact that protects a client's money is "has this
    // programme already SPENT", which `programme_batches` already stores. So the new code adds
    // reads and no writes, and the assertion above stays exactly as strict as it was.
    expect(code).toContain("db.from('programme_batches')")
    const at = code.indexOf("db.from('programme_batches')")
    expect(code.slice(at, at + 200), 'the spend check writes to the batch table').not.toContain('.insert(')
  })

  it('it orchestrates ONE step — the rest of the chain is already automatic', () => {
    // Enrich, qualify, settle, surface and prepare all happen inside the sourcing run and the
    // settlement hook. A second orchestrator here would be a second definition of the order.
    expect(code).toContain('sourceProgramme(id)')
    for (const forbidden of ['qualifyCandidates', 'settleBatch', 'surfaceQualifiedBatch',
                             'prepareProgrammeOutreach', 'markReadyForApproval', 'advanceAfterSettlement']) {
      expect(code.includes(forbidden), `the continuation re-orchestrates ${forbidden}`).toBe(false)
    }
  })

  it('the internal-P1 route starts it the same way, and still records no money', () => {
    const ROUTE = readFileSync(join(__dirname, '..', 'routes', 'programme.ts'), 'utf8')
    const at = ROUTE.indexOf("programmeRouter.post('/:id/authorise/first'")
    const body = ROUTE.slice(at, ROUTE.indexOf('programmeRouter.post', at + 10))
    expect(body).toContain('startProgrammeAfterP1')
    expect(body).toContain("money: 'none'")
  })

  it('🛑 and House is not restarted by any of this', () => {
    // The hook fires at the MOMENT P1 is committed. House's P1 was committed long ago and it is
    // READY_FOR_APPROVAL, which carries no `AWAITING_FIRST_PAYMENT` to authorise and no fresh
    // payment to record — so neither door can reach it.
    const PROGRAMME = readFileSync(join(__dirname, 'programme.ts'), 'utf8')
    expect(PROGRAMME).toContain("if (p.status !== 'AWAITING_FIRST_PAYMENT')")
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑤ ⚑ 10 Sep (I1) — INTERRUPT IT, CALL IT AGAIN, AND PROVE NOTHING WAS BOUGHT TWICE
//
// 🛑 THE TWO DEFECTS THESE CASES EXIST FOR:
//
//  ① The only thing standing between one payment and two sourcing runs was a `Map` in one node
//     process. A restart or a second instance emptied it, and the guard was simply gone.
//  ② `programme_p1_auto_refused` was written on every refusal and NOTHING read it back, so a
//     programme whose automatic start refused sat in `SOURCING_AUTHORISED` with no leads —
//     which `deriveLifecycle` reports as `sourcing` · **Working**, forever.
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('⑤ a continuation is safe to call again, and says what really happened', () => {
  // ── THE SPEND HAPPENS ONCE, WHATEVER THE PROCESS REMEMBERS ─────────────────────────────

  it('🛑 A RESTART DOES NOT BUY THE BATCH TWICE — the completed step is detected, not locked', async () => {
    // The first run opened a batch and the process went away with it. `inFlight` is empty, so
    // the old guard would have started a second, fully-authorised, fully-paid-for run.
    state.batches = [{ id: 'batch-1', programme_id: PROG, seq: 1 }]
    const r = await startProgrammeAfterP1(PROG, 'stripe_first_payment', 'stripe-webhook')
    await settle()
    expect(sourced, 'one payment produced a second sourcing run after a restart').toEqual([])
    expect(r.started).toBe(false)
    expect(r.already_running).toBe(true)
    expect(r.detail).toContain('already sourced')
  })

  it('a redelivered webhook after a completed run is a silent no-op, not a refusal', async () => {
    // 🛑 IT MUST NOT BE AUDITED AS REFUSED. `p1ContinuationHealth` reads the newest outcome, so
    // auditing this would put a perfectly healthy programme into Needs you.
    state.batches = [{ id: 'batch-1', programme_id: PROG, seq: 1 }]
    await startProgrammeAfterP1(PROG, 'stripe_first_payment', 'stripe-webhook')
    await settle()
    expect(state.audit.some(a => a.action === 'programme_p1_auto_refused'),
      'a healthy redelivery was recorded as a failure').toBe(false)
  })

  it('🛑 AN UNREADABLE BATCH TABLE BUYS NOTHING — "unknown spend" is not "no spend"', async () => {
    const real = state.batches
    // A read error, not an empty table. The difference is the whole point: an empty table means
    // "nothing bought yet" and an error means "we do not know", and only one of them may spend.
    Object.defineProperty(state, 'batches', { get() { throw new Error('batches unreadable') }, configurable: true })
    try {
      const r = await startProgrammeAfterP1(PROG, 'stripe_first_payment', 'x')
      await settle()
      expect(sourced, 'it spent while the existing spend was unknown').toEqual([])
      expect(r.started).toBe(false)
      expect(r.detail).toContain('unknown')
    } finally {
      Object.defineProperty(state, 'batches', { value: real, writable: true, configurable: true })
    }
  })

  it('an interruption BEFORE any batch was opened is safe to retry — nothing was bought', async () => {
    // The complement of the case above, and the reason a lock would have been the wrong tool: a
    // stranded claim would block this start, and this start is the correct thing to do.
    state.batches = []
    const r = await startProgrammeAfterP1(PROG, 'stripe_first_payment', 'x')
    await settle()
    expect(r.started).toBe(true)
    expect(sourced).toEqual([PROG])
  })

  // ── THE FAILURE IS READABLE AFTERWARDS ─────────────────────────────────────────────────

  it('🛑 A REFUSED START IS REPORTED AS STOPPED — this is the "Working forever" bug', async () => {
    state.audit = [outcome('programme_p1_auto_refused',
      'No ICP is attached to this programme, so there is nothing it is authorised to source.', '2026-09-10T09:00:00Z')]
    const h = await p1ContinuationHealth(PROG)
    expect(h.stopped, 'a programme that never started still reads as working').toBe(true)
    expect(h.detail).toContain('No ICP is attached')
  })

  it('a successful start is not an exception', async () => {
    state.audit = [outcome('programme_p1_auto_started', '250 prospect(s) obtained.', '2026-09-10T09:00:00Z')]
    expect((await p1ContinuationHealth(PROG)).stopped).toBe(false)
  })

  it('🛑 THE NEWEST OUTCOME WINS — a refusal the operator already fixed is history, not a task', async () => {
    state.audit = [
      outcome('programme_p1_auto_refused', 'No ICP is attached to this programme.', '2026-09-10T09:00:00Z'),
      outcome('programme_p1_auto_started', '250 prospect(s) obtained.', '2026-09-10T11:00:00Z'),
    ]
    expect((await p1ContinuationHealth(PROG)).stopped,
      'a fixed refusal keeps raising a task nobody can clear').toBe(false)
    expect((await lastP1ContinuationAttempt(PROG))?.ok).toBe(true)
  })

  it('🛑 A SPEND WITH NO RECORDED OUTCOME IS STOPPED — it died mid-run and will not restart', async () => {
    state.batches = [{ id: 'batch-1', programme_id: PROG, seq: 1 }]
    state.audit = []
    const h = await p1ContinuationHealth(PROG)
    expect(h.stopped).toBe(true)
    expect(h.detail).toContain('never recorded how it finished')
  })

  it('a freshly paid programme with no outcome and no batch is NOT an exception', async () => {
    // ⚠️ THE OVER-EAGER VERSION OF THIS RULE WOULD PUT EVERY NEW CLIENT INTO NEEDS YOU for the
    // seconds between their payment landing and their run starting.
    state.batches = []
    state.audit = []
    expect((await p1ContinuationHealth(PROG)).stopped).toBe(false)
  })

  it('a run in flight in this process is never an exception', async () => {
    state.audit = [outcome('programme_p1_auto_refused', 'an older failure', '2026-09-01T09:00:00Z')]
    const r = await startProgrammeAfterP1(PROG, 'stripe_first_payment', 'x')
    expect(r.started).toBe(true)
    expect(isP1ContinuationRunning(PROG)).toBe(true)
    expect((await p1ContinuationHealth(PROG)).stopped, 'a working run was called broken').toBe(false)
    await settle()
  })

  it('the verdict still refuses everything it refused before the spend check was added', async () => {
    // ⚠️ THE SPEND CHECK IS ASKED LAST, so a programme that is paused AND already sourced must
    // still answer "paused" — the refusal an operator can act on beats the one they cannot.
    state.programmes = [prog({ paused_at: '2026-09-09' })]
    state.batches = [{ id: 'batch-1', programme_id: PROG, seq: 1 }]
    const v = await p1ContinuationVerdict(PROG)
    expect(v.ok).toBe(false)
    expect(v.ok === false && v.reason).toContain('paused')
  })
})
