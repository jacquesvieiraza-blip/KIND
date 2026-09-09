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
const state: { programmes: Row[]; icps: Row[]; audit: Row[] } = { programmes: [], icps: [], audit: [] }
/** Every programme id `sourceProgramme` was called for. The spend, recorded. */
const sourced: string[] = []

function table(name: 'programmes' | 'icps' | 'audit') {
  const rows = () => state[name]
  const q: Record<string, unknown> & { _f: ((r: Row) => boolean)[] } = {
    _f: [], _mode: '', _payload: null as Row | null,
    select() { return q }, order() { return q }, limit() { return q },
    eq(c: string, v: unknown) { q._f.push((r: Row) => r[c] === v); return q },
    is(c: string, v: unknown) { q._f.push((r: Row) => (r[c] ?? null) === v); return q },
    not(c: string, _o: string, v: unknown) { q._f.push((r: Row) => (r[c] ?? null) !== v); return q },
    in(c: string, l: unknown[]) { q._f.push((r: Row) => l.includes(r[c] as never)); return q },
    insert(p: Row) { rows().push(p); return q },
    update(p: Row) { q._mode = 'update'; q._payload = p; return q },
    _hit() { return rows().filter(r => q._f.every(f => f(r))) },
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
    from: (t: string) => table(t === 'programmes' ? 'programmes' : t === 'icps' ? 'icps' : 'audit'),
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

import { startProgrammeAfterP1, p1ContinuationVerdict, isP1ContinuationRunning } from './programme-p1-continuation'

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
  sourced.length = 0
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
