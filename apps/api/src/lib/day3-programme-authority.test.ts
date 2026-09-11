import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 11 Sep (DAY 3) — THREE THINGS THAT COULD HAPPEN IN THE WRONG ORDER, AND NOW CANNOT.
//
// Each was found by RECONCILING the existing implementation against the founder's locked
// sequence rather than by building something new — the machinery was there and one question
// was not being asked.
//
// ① P1 BEFORE EXPLICIT ACCEPTANCE. `POST /programme/me/accept` exists and persists
//    `recommendation_accepted_at`, and NOTHING read it before charging. The first payment was
//    reachable for a client who had only ever SEEN the recommendation. Viewing is not
//    accepting; the recommendation is a TARGET, not a guarantee; and being asked for money
//    against a target nobody agreed to is the defect.
//
// ② A GENERIC OPERATOR PAYMENT OVERRIDE. `authoriseFirstInternal` records P1 authority with
//    no payment — no Stripe object, no invoice, no revenue — and asked only what STATE the
//    programme was in. An operator with the admin key could authorise P1 on ANY programme,
//    a real paying client's included. "House is the only internal-money exception."
//
// ③ APPROVAL OF A VERSION THE CLIENT NEVER READ. The approval stamped
//    `approved_preparation_hash` from whatever was frozen AT THE MOMENT OF THE PRESS, and the
//    client never said which package they were approving. A re-preparation in between —
//    a prospect evicted, a message re-drafted, the window or sender changed — was approved in
//    silence. The founder's rule is a NEW VERSION and a NEW APPROVAL, never a mutated one.
// ═══════════════════════════════════════════════════════════════════════════════════════

type Row = Record<string, unknown>

const state = {
  client: null as Row | null,
  programme: null as Row | null,
  /** every write attempted — "charged nothing" and "wrote nothing" are assertions here */
  writes: [] as { table: string; patch: Row }[],
  /** every Stripe checkout session the route tried to mint */
  sessions: [] as Row[],
}

function table(name: string) {
  const rows = (): Row[] =>
    name === 'clients' ? (state.client ? [state.client] : [])
    : name === 'programmes' ? (state.programme ? [state.programme] : [])
    : []
  const q: Record<string, unknown> = {
    select() { return q },
    eq() { return q }, is() { return q }, not() { return q }, or() { return q },
    order() { return q }, limit() { return q },
    async maybeSingle() { return { data: rows()[0] ?? null, error: null } },
    async single() { return { data: rows()[0] ?? null, error: null } },
    update(patch: Row) {
      state.writes.push({ table: name, patch })
      const u: Record<string, unknown> = {
        eq() { return u }, is() { return u }, not() { return u }, select() { return u },
        then: (r: (v: unknown) => unknown) => r({ data: rows(), error: null }),
      }
      return u
    },
    then(resolve: (v: unknown) => unknown) { return resolve({ data: rows(), error: null }) },
  }
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => table(t) } }))
vi.mock('../middleware/auth', () => ({
  requireAuth: (_q: unknown, _s: unknown, next: () => void) => next(),
}))
// 🛑 NO REAL STRIPE, EVER. Every case below that reaches this has already failed.
vi.mock('./programme-checkout', () => ({
  createProgrammeCheckoutSession: async (p: Row) => { state.sessions.push(p); return { url: 'https://stripe.test/session' } },
}))

async function callMyProgramme(path: string, body: Row = {}) {
  const { myProgrammeRouter } = await import('../routes/my-programme')
  const layer = (myProgrammeRouter as unknown as {
    stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>
  }).stack.find(l => l.route?.path === path && l.route?.methods.post)
  if (!layer?.route) throw new Error(`POST ${path} not found on the my-programme router`)
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const out: { code: number; payload: Row } = { code: 200, payload: {} }
  const res = {
    status(c: number) { out.code = c; return res },
    json(p: Row) { out.payload = p; return res },
  }
  await handler({ body, headers: {}, params: {}, query: {}, userId: 'user-1' }, res, () => {})
  return out
}

const RECOMMENDED = (over: Row = {}): Row => ({
  id: 'prog-1', client_id: 'client-1', status: 'RECOMMENDED',
  meeting_target: 12, recommended_volume: 3000,
  first_paid_at: null, first_payment_ref: null, first_payment_intent_id: null,
  first_authorised_at: null, second_paid_at: null, second_payment_ref: null,
  second_authorised_at: null, paused_at: null, went_live_at: null, approved_at: null,
  recommendation_accepted_at: null,
  ...over,
})

beforeEach(() => {
  state.client = { id: 'client-1', user_id: 'user-1', contact_email: 'ellis@redmayne.test' }
  state.programme = RECOMMENDED()
  state.writes = []
  state.sessions = []
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 ① P1 is not exposed until the client has explicitly accepted', () => {
  it('1 · a recommendation that has only been SEEN cannot reach checkout', async () => {
    const r = await callMyProgramme('/checkout/first')
    expect(r.code).toBe(409)
    expect(r.payload.error).toBe('not_accepted')
    expect(state.sessions, 'a Stripe session was minted for an unaccepted recommendation').toEqual([])
  })

  it('2 · 🛑 and the refusal says nothing was charged', async () => {
    const r = await callMyProgramme('/checkout/first')
    expect(String(r.payload.message)).toContain('Nothing has been charged')
  })

  it('3 · once acceptance is recorded, checkout opens', async () => {
    state.programme = RECOMMENDED({ recommendation_accepted_at: '2026-09-11T12:00:00Z' })
    const r = await callMyProgramme('/checkout/first')
    expect(r.code).toBe(200)
    expect(state.sessions).toHaveLength(1)
  })

  it('4 · 🛑 C27 · and it carries the persisted contact_email — checkout is reachable', async () => {
    state.programme = RECOMMENDED({ recommendation_accepted_at: '2026-09-11T12:00:00Z' })
    await callMyProgramme('/checkout/first')
    expect((state.sessions[0] as { clientEmail?: string }).clientEmail).toBe('ellis@redmayne.test')
  })

  it('5 · 🛑 C27 · a client with NO contact_email is refused before Stripe, not after', async () => {
    state.client = { id: 'client-1', user_id: 'user-1', contact_email: null }
    state.programme = RECOMMENDED({ recommendation_accepted_at: '2026-09-11T12:00:00Z' })
    const r = await callMyProgramme('/checkout/first')
    expect(r.code).toBe(400)
    expect(r.payload.error).toBe('no_email')
    expect(state.sessions).toEqual([])
  })

  it('6 · a pre-migration row (no acceptance column at all) behaves exactly as before', async () => {
    // 🛑 FAIL-CLOSED ONLY WHERE THE COLUMN EXISTS. Refusing on an ABSENT field would refuse
    // every first payment in the book on a database where 20260910 has not run.
    const { recommendation_accepted_at: _gone, ...legacy } = RECOMMENDED() as Record<string, unknown>
    state.programme = legacy
    const r = await callMyProgramme('/checkout/first')
    expect(r.code).toBe(200)
  })

  it('7 · 🛑 the second payment is untouched by this gate — it has its own', async () => {
    state.programme = RECOMMENDED({ status: 'RECOMMENDED', recommendation_accepted_at: null })
    const r = await callMyProgramme('/checkout/second')
    // Refused for being the wrong STATE, which is P2's own rule, not the acceptance gate's.
    expect(r.code).toBe(409)
    expect(r.payload.error).toBe('wrong_state')
    expect(state.sessions).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ SOURCE-LEVEL DUTIES — the sequence, and what each stage may and may not authorise.
// ═══════════════════════════════════════════════════════════════════════════════════════
const REPO = join(__dirname, '../../../..')
const read = (p: string) => readFileSync(join(REPO, p), 'utf8')
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n')

/**
 * ONE function's body, bounded at the next top-level `export`.
 *
 * ⚠️ A FIXED CHARACTER WINDOW IS NOT A FUNCTION, and the first cut of this file used one: the
 * slices ran past their function into the next, so "internal P1 never writes went_live_at"
 * failed on a DIFFERENT function that legitimately does. A guard that reads the wrong code
 * proves nothing about the right code, whichever way it lands.
 */
function fnBody(code: string, decl: string): string {
  const at = code.indexOf(decl)
  if (at < 0) return ''
  const next = code.indexOf('\nexport ', at + decl.length)
  return code.slice(at, next < 0 ? code.length : next)
}

describe('🛑 ② internal P1 money is House’s alone (C38)', () => {
  const code = stripComments(read('apps/api/src/lib/programme.ts'))

  it('the internal-authority door asks WHOSE programme it is', () => {
    const body = fnBody(code, 'export async function authoriseFirstInternal')
    expect(body, 'authoriseFirstInternal is gone').not.toBe('')
    expect(body).toContain('getExcludedClientIds')
    expect(body).toContain('House-only')
  })

  it('🛑 …and it is asked BEFORE any write', () => {
    const body = fnBody(code, 'export async function authoriseFirstInternal')
    const houseAt = body.indexOf('getExcludedClientIds')
    const writeAt = body.indexOf("from('programmes')")
    expect(houseAt).toBeGreaterThan(-1)
    expect(writeAt, 'the internal authority no longer writes').toBeGreaterThan(-1)
    expect(houseAt, 'authority was written before we knew whose programme it is').toBeLessThan(writeAt)
  })

  it('🛑 no OTHER internal-money door was invented alongside it', () => {
    // The founder's list of what must not exist: generic fake payments, a generic operator
    // payment override, a fake wallet, a generic client bypass.
    for (const banned of ['fakePayment', 'operatorPaymentOverride', 'fakeWallet', 'bypassPayment', 'markPaidWithoutMoney']) {
      expect(code.includes(banned), `${banned} exists`).toBe(false)
    }
  })

  it('🛑 and a CLIENT can never reach the internal-authority route at all', () => {
    // It is mounted on the admin-key router; the client router has no such path.
    // ⚠️ ON THE ROUTE PATHS, NOT THE WORD. The client router legitimately READS
    // `internallyAuthorised(p)` to refuse a checkout a House programme does not owe; what must
    // not exist is a client-reachable path that RECORDS internal authority.
    const client = stripComments(read('apps/api/src/routes/my-programme.ts'))
    const clientPaths = client.match(/myProgrammeRouter\.(get|post)\('([^']+)'/g) ?? []
    expect(clientPaths.some(p => /authorise/.test(p)), 'the client router exposes an internal-authority door').toBe(false)
    const operator = stripComments(read('apps/api/src/routes/programme.ts'))
    expect(operator).toContain("programmeRouter.post('/:id/authorise/first'")
  })
})

describe('🛑 ③ the client approves the exact version they read', () => {
  const code = stripComments(read('apps/api/src/lib/programme.ts'))

  it('the approval refuses a version that is no longer the frozen one', () => {
    const body = fnBody(code, 'export async function approveProgrammeAsCustomer')
    expect(body).toContain("code: 'stale_version'")
    expect(body).toContain('review_preparation_hash')
  })

  it('🛑 …and refuses an approval that names NO version at all', () => {
    const body = fnBody(code, 'export async function approveProgrammeAsCustomer')
    expect(body).toContain('expectedVersion === null')
  })

  it('🛑 the WRITE pins the version too — a check alone can be overtaken', () => {
    const body = fnBody(code, 'export async function approveProgrammeAsCustomer')
    expect(body).toContain("claim.eq('review_preparation_hash', frozenNow)")
    // …alongside the status compare-and-set that was already there.
    expect(body).toContain(".eq('status', 'READY_FOR_APPROVAL')")
  })

  it('the client is GIVEN the version to send back', () => {
    const route = stripComments(read('apps/api/src/routes/my-programme.ts'))
    expect(route).toContain('version: (p as unknown as { review_preparation_hash?: string | null }).review_preparation_hash ?? null')
    for (const f of [
      'apps/portal/src/components/milla/ProgrammeApproval.tsx',
      'apps/portal/src/components/milla/ProgrammeReview.tsx',
    ]) {
      expect(stripComments(read(f)), `${f} approves without naming a version`).toContain('version')
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 ④ what each stage may authorise, stated where it is decided', () => {
  const programme = stripComments(read('apps/api/src/lib/programme.ts'))

  it('P1 authorises SOURCING and PREPARATION — never Live, Run or a send', () => {
    const body = fnBody(programme, 'export async function authoriseFirstInternal')
    expect(body, 'authoriseFirstInternal is gone').not.toBe('')
    for (const forbidden of ['went_live_at', 'run_at', "status: 'LIVE'"]) {
      expect(body.includes(forbidden), `internal P1 writes ${forbidden}`).toBe(false)
    }
  })

  it('🛑 approval writes status and approved_at — not P2, not Live, not money', () => {
    const body = fnBody(programme, 'export async function approveProgrammeAsCustomer')
    expect(body, 'approveProgrammeAsCustomer is gone').not.toBe('')
    for (const forbidden of ['second_paid_at', 'second_authorised_at', 'went_live_at', 'run_at', 'wallet']) {
      expect(body.includes(forbidden), `the customer approval writes ${forbidden}`).toBe(false)
    }
  })

  it('🛑 P2 requires APPROVED — money authority only, and it is not Live', () => {
    const body = fnBody(programme, 'export function maySecondCharge')
    expect(body).toContain("p.status !== 'APPROVED'")
    expect(body).toContain('went_live_at')     // already live → refused, never granted by P2
  })

  it('🛑 Make Live is a separate act from P2, in a separate function', () => {
    expect(programme).toContain('export async function authoriseSecondInternal')
    const body = fnBody(programme, 'export async function authoriseSecondInternal')
    expect(body, 'authoriseSecondInternal is gone').not.toBe('')
    expect(body.includes("went_live_at: "), 'internal P2 goes live').toBe(false)
    expect(body.includes("status: 'LIVE'"), 'internal P2 goes live').toBe(false)
  })
})
