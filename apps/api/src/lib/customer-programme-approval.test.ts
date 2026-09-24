// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CUSTOMER'S REVIEW AND THEIR ONE PROGRAMME APPROVAL
//
// R39, founder-locked 15 Aug: **"We run it in Vida; the client approves in Milla."**
//
// Two invariants are proved here, and they are mirror images of the one A2 established:
//
//   ① ON THE WAY IN  — a customer may only review work their programme actually sourced and
//     an operator actually surfaced. House's ~166 retired NULL-programme leads are not a new
//     programme's review set, and `client_id` alone cannot tell the difference.
//   ② ON THE WAY OUT — approval writes `status` and `approved_at` and NOTHING else. Not P2,
//     not Live, not a campaign, not an enrolment, not a payment, not a credit.
//
// ⚠️ THE SIDE-EFFECT ASSERTION IS AN ALLOWLIST, NOT A SPOT-CHECK — the same recorder the A2
// delivery-economics proof uses. Every table written and every RPC called is recorded, and the
// write set must be exactly `programmes` with an empty RPC list. Naming the forbidden tables
// would pass for every table nobody thought of.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>

const state: {
  programmes: Row[]; leads: Row[]; clients: Row[]
  /** The cross-client suppression table: hard bounce, spam complaint, and anyone who said STOP. */
  blocklist: Row[]
  written: string[]; rpcs: string[]
  /** Fires immediately before any UPDATE on `programmes`, to simulate a concurrent writer. */
  beforeProgrammeUpdate: null | (() => void)
  /** Tables whose reads must fail, to prove "cannot tell" is never "nothing". */
  readFails: Set<string>
} = {
  programmes: [], leads: [], clients: [], blocklist: [], written: [], rpcs: [],
  beforeProgrammeUpdate: null, readFails: new Set(),
}

function table(name: string) {
  const rows = (): Row[] =>
    name === 'programmes' ? state.programmes : name === 'leads' ? state.leads
    : name === 'opt_out_blocklist' ? state.blocklist : state.clients
  const q: any = {
    _f: [] as ((r: Row) => boolean)[], _mode: '', _payload: null as Row | null,
    _limit: 0, _count: false, _order: null as { col: string; asc: boolean } | null,
    select(_c?: string, opts?: { count?: string; head?: boolean }) { if (opts?.count) q._count = true; return q },
    eq(c: string, v: unknown) { q._f.push((r: Row) => r[c] === v); return q },
    neq(c: string, v: unknown) { q._f.push((r: Row) => r[c] !== v); return q },
    gt(c: string, v: unknown) { q._f.push((r: Row) => String(r[c]) > String(v)); return q },
    is(c: string, v: unknown) { q._f.push((r: Row) => (r[c] ?? null) === v); return q },
    in(c: string, l: unknown[]) { q._f.push((r: Row) => l.includes(r[c] as never)); return q },
    not(c: string, op: string, v: unknown) {
      if (op === 'is' && v === null) { q._f.push((r: Row) => (r[c] ?? null) !== null); return q }
      // `not(col, 'in', '(a,b,c)')` — the PostgREST spelling the suppression filter uses.
      const set = String(v).replace(/[()]/g, '').split(',')
      q._f.push((r: Row) => !set.includes(String(r[c]))); return q
    },
    order(c: string, o?: { ascending?: boolean }) { q._order = { col: c, asc: o?.ascending !== false }; return q },
    limit(n: number) { q._limit = n; return q },
    update(p: Row) { q._mode = 'update'; q._payload = p; state.written.push(name); return q },
    insert(p: Row) { q._mode = 'insert'; q._payload = p; state.written.push(name); return q },
    _all() {
      const all = rows().filter(r => q._f.every((f: (r: Row) => boolean) => f(r)))
      if (q._order) {
        const { col, asc } = q._order
        all.sort((x, y) => {
          const a = Number(x[col] ?? 0), b = Number(y[col] ?? 0)
          return asc ? a - b : b - a
        })
      }
      return all
    },
    _hit() { const all = q._all(); return q._limit > 0 ? all.slice(0, q._limit) : all },
    async maybeSingle() {
      if (state.readFails.has(name)) return { data: null, error: { message: `${name} unreadable` } }
      return { data: q._hit()[0] ?? null, error: null }
    },
    _run() {
      if (state.readFails.has(name)) return { data: null, error: { message: `${name} unreadable` }, count: null }
      if (q._mode === 'update') {
        if (name === 'programmes' && state.beforeProgrammeUpdate) state.beforeProgrammeUpdate()
        const h = q._hit()
        for (const r of h) Object.assign(r, q._payload)
        return { data: h, error: null }
      }
      if (q._mode === 'insert') { const row = { id: `x${rows().length + 1}`, ...(q._payload as Row) }; rows().push(row); return { data: row, error: null } }
      return { data: q._hit(), error: null, count: q._all().length }
    },
    then(res: (v: unknown) => unknown) { return Promise.resolve(q._run()).then(res) },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => table(t),
    rpc: async (n: string) => { state.rpcs.push(n); return { data: null, error: null } },
  },
}))
vi.mock('./alerts', () => ({ sendFounderAlert: () => Promise.resolve() }))

import { readProgrammeReviewSet, countProgrammeReviewable, REVIEW_PAGE } from './programme-review'
import { approveProgrammeAsCustomer } from './programme'

const C = 'house'
const OTHER = 'mbf'
const P = 'P_NEW'
const P_OTHER = 'P_MBF'

function seedProgramme(over: Row = {}) {
  state.programmes.push({
    id: P, client_id: C, status: 'READY_FOR_APPROVAL', approved_at: null,
    meeting_target: 4, recommended_volume: 1000, paused_at: null, went_live_at: null,
    first_paid_at: 'p1', second_paid_at: null, first_authorised_at: null, second_authorised_at: null,
    first_payment_ref: null, second_payment_ref: null, updated_at: 'u0', ...over,
  })
}

/**
 * ⚑ 8 Sep — FREEZE THE REVIEW SNAPSHOT, the way the real transition does.
 *
 * 🛑 APPROVAL NOW COPIES THE REVIEWED SNAPSHOT INSTEAD OF TAKING A FRESH ONE (founder-locked).
 * Taking a fresh one at approval recorded whatever the work had BECOME, so a change made while
 * the client was reading would have been faithfully approved on their behalf. Every case here
 * that expects an approval to SUCCEED therefore has to be a programme that was actually frozen
 * for review — which is what `markReadyForApproval` does in production.
 *
 * ⚠️ THE HASH IS COMPUTED FROM THIS FIXTURE'S OWN STATE, never typed in. A constant would make
 * "unchanged" a tautology and the comparison would prove nothing.
 */
/**
 * ⚑ 11 Sep (DAY 3) — the version the client is looking at, read back from the row the helper
 * above froze. The approval now REQUIRES it: a client approves the exact package they read,
 * not "whatever is frozen at the moment of the press".
 */
function frozenVersion(): string | null {
  return (state.programmes.find(r => r.id === P)?.review_preparation_hash as string | null) ?? null
}

async function freezeReview() {
  const { buildPreparationSnapshot } = await import('./preparation-snapshot')
  const snap = await buildPreparationSnapshot(P)
  const row = state.programmes.find(r => r.id === P)
  // ⚠️ NO ASSERTION ON `snap.ok` HERE, deliberately. Two cases in this file seed a programme
  // that CANNOT be described — an unreadable read, and another tenant's programme — and both
  // exist to prove the refusal. Failing the freeze helper for them would replace the assertion
  // under test with an assertion about the fixture. A positive case whose freeze silently did
  // nothing still fails, loudly, on its own approval.
  if (snap.ok && row) {
    row.review_preparation_hash = snap.hash
    row.review_preparation_snapshot = snap.snapshot
    row.review_preparation_at = 'frozen'
  }
}

/** A normal programme prospect: this programme's, delivered, surfaced, undecided. */
const prospect = (id: string, over: Row = {}) =>
  state.leads.push({
    id, client_id: C, programme_id: P, delivered_at: 'd', surfaced_for_approval_at: 's',
    // ⚑ 9 Sep (HOUSE-009) — A PASSING QUALIFICATION VERDICT IS NOW PART OF BEING A
    // REVIEWABLE PROSPECT. Entitlement is consumed by M&V's own verdict, so the review
    // desk and preparation both require it; a fixture without one is a candidate nobody
    // has judged, which is correctly invisible.
    qualified_at: 'q', disqualified_at: null,
    revealed_at: null, status: 'scored', score: 80,
    // The permanent prospect-level suppression columns, in their CLEAN state.
    email: `${id.toLowerCase()}@example.com`, opted_out_at: null, provider_eviction_required_at: null,
    first_name: 'Ada', last_name: 'Lovelace', job_title: 'CTO', company: 'Acme',
    industry: 'Software', country: 'GB', score_reasoning: 'Ada Lovelace runs engineering at Acme.',
    created_at: 'c', ...over,
  })

beforeEach(() => {
  state.programmes = []; state.leads = []; state.clients = []; state.blocklist = []
  state.written = []; state.rpcs = []
  state.beforeProgrammeUpdate = null; state.readFails = new Set()
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ① THE REVIEW SET IS POSITIVELY SCOPED TO ONE PROGRAMME
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('① the review set is this programme\'s work, not this client\'s history', () => {
  it('🛑 HOUSE\'S HISTORICAL NULL-PROGRAMME LEADS CANNOT APPEAR — the defect this read exists for', async () => {
    seedProgramme()
    prospect('L_PROG')
    // House's retired desk: same client, delivered, surfaced, undecided — indistinguishable
    // from programme work on every condition `/leads/for-approval` tests. Only `programme_id`
    // separates them, and `/leads/for-approval` does not test it.
    prospect('L_OLD_1', { programme_id: null })
    prospect('L_OLD_2', { programme_id: null })

    const set = await readProgrammeReviewSet(C, P)
    expect(set.prospects.map(p => p.id), 'only the programme\'s own work').toEqual(['L_PROG'])
    expect(set.total).toBe(1)
    expect(await countProgrammeReviewable(C, P)).toBe(1)
  })

  it('🛑 a WRONG-PROGRAMME lead cannot appear, even for the right client', async () => {
    seedProgramme()
    prospect('L_PROG')
    prospect('L_WRONG_PROG', { programme_id: 'P_SOMETHING_ELSE' })

    const set = await readProgrammeReviewSet(C, P)
    expect(set.prospects.map(p => p.id)).toEqual(['L_PROG'])
  })

  it('🛑 ANOTHER TENANT\'S lead cannot appear, even carrying this programme id', async () => {
    // A corrupt link — a row naming this programme while belonging to another client — must
    // not be readable by either. `client_id` is applied on the same query, always.
    seedProgramme()
    prospect('L_PROG')
    prospect('L_CROSS', { client_id: OTHER })

    const set = await readProgrammeReviewSet(C, P)
    expect(set.prospects.map(p => p.id)).toEqual(['L_PROG'])
  })

  it('🛑 DELIVERED BUT NEVER SURFACED is excluded — the A2 boundary, on the way in', async () => {
    seedProgramme()
    prospect('L_SURFACED')
    prospect('L_UNSURFACED', { surfaced_for_approval_at: null })

    const set = await readProgrammeReviewSet(C, P)
    expect(set.prospects.map(p => p.id)).toEqual(['L_SURFACED'])
  })

  it('undelivered, passed, and already-revealed work is excluded', async () => {
    seedProgramme()
    prospect('L_OK')
    prospect('L_UNDELIVERED', { delivered_at: null })
    prospect('L_PASSED', { status: 'passed' })
    // ⚠️ AN ALREADY LEGACY-REVEALED PROGRAMME LEAD (founder-locked 3 Sep): it is NOT
    // reclassified, `revealed_at` is NOT cleared, and it is NOT forced back into the review
    // set. It simply does not appear — which is what the existing four conditions already say.
    prospect('L_REVEALED', { revealed_at: 'r' })

    const set = await readProgrammeReviewSet(C, P)
    expect(set.prospects.map(p => p.id)).toEqual(['L_OK'])
    expect(state.leads.find(l => l.id === 'L_REVEALED')!.revealed_at, 'history is not rewritten').toBe('r')
  })

  it('🛑 the card is MASKED — no name, email, phone or LinkedIn field exists on it', async () => {
    seedProgramme()
    prospect('L1')
    const set = await readProgrammeReviewSet(C, P)
    const card = set.prospects[0] as unknown as Record<string, unknown>
    for (const k of ['first_name', 'last_name', 'name', 'email', 'phone', 'linkedin_url']) {
      expect(Object.keys(card), `${k} must not be on a review card`).not.toContain(k)
    }
    // And the prospect's own name is scrubbed out of the explanation, which is where it leaks.
    expect(card.why_fits).not.toMatch(/Ada|Lovelace/)
    expect(card.why_fits).toContain('this prospect')
  })

  it('a read failure THROWS — it never returns an empty desk', async () => {
    seedProgramme(); prospect('L1')
    state.readFails.add('leads')
    await expect(readProgrammeReviewSet(C, P)).rejects.toThrow(/review read failed/)
    await expect(countProgrammeReviewable(C, P)).rejects.toThrow(/review read failed/)
  })

  it('🛑 AN UNREADABLE BLOCKLIST THROWS TOO — not knowing is never "nobody is suppressed"', async () => {
    seedProgramme(); prospect('L1')
    state.readFails.add('opt_out_blocklist')
    await expect(readProgrammeReviewSet(C, P)).rejects.toThrow(/opt-out blocklist unreadable/)
    await expect(countProgrammeReviewable(C, P)).rejects.toThrow(/opt-out blocklist unreadable/)
  })

  it('the page is capped but the total is honest', async () => {
    seedProgramme()
    for (let i = 0; i < REVIEW_PAGE + 7; i++) prospect(`L${String(i).padStart(3, '0')}`)
    const set = await readProgrammeReviewSet(C, P)
    expect(set.prospects).toHaveLength(REVIEW_PAGE)
    expect(set.total, 'the customer is told how many the programme really holds').toBe(REVIEW_PAGE + 7)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ② ONE APPROVAL — THE STATE TRANSITION
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('② READY_FOR_APPROVAL → APPROVED, once', () => {
  it('🛑 the first valid approval sets APPROVED and approved_at, and writes NOTHING ELSE', async () => {
    seedProgramme(); prospect('L1')
    state.written = []; state.rpcs = []

    await freezeReview()
    const r = await approveProgrammeAsCustomer(C, P, frozenVersion())

    expect(r.ok, !r.ok ? r.reason : '').toBe(true)
    const p = state.programmes[0]
    expect(p.status).toBe('APPROVED')
    expect(p.approved_at).toBeTruthy()
    // 🛑 THE ALLOWLIST. One table written, and it is the programme.
    expect([...new Set(state.written)], 'approval may write ONLY the programmes table').toEqual(['programmes'])
    expect(state.rpcs, 'no RPC — every money path in this repo is an RPC').toEqual([])
  })

  it('🛑 IT DOES NOT AUTHORISE P2, GO LIVE, OR TOUCH MONEY — named, as well as allowlisted', async () => {
    seedProgramme(); prospect('L1')
    await freezeReview()
    await approveProgrammeAsCustomer(C, P, frozenVersion())
    const p = state.programmes[0]
    for (const col of [
      'second_paid_at', 'second_authorised_at', 'second_payment_ref',
      'went_live_at',
    ]) {
      expect(p[col] ?? null, `${col} must be untouched by approval`).toBeNull()
    }
    expect(p.status, 'approval is not LIVE').toBe('APPROVED')
    for (const t of ['credit_transactions', 'figsy_campaigns', 'figsy_enrollments', 'clients', 'invoices', 'payments', 'leads']) {
      expect(state.written, `${t} must never be written by approval`).not.toContain(t)
    }
  })

  it('🛑 A PROGRAMME WITH NOTHING TO REVIEW IS REFUSED — it does not approve silently', async () => {
    // READY_FOR_APPROVAL with an empty desk is an inconsistency, not an approvable programme.
    seedProgramme()
    await freezeReview()
    const r = await approveProgrammeAsCustomer(C, P, frozenVersion())
    expect(r.ok).toBe(false)
    expect(!r.ok && r.code).toBe('nothing_to_review')
    expect(state.programmes[0].status, 'nothing moved').toBe('READY_FOR_APPROVAL')
    expect(state.written).toEqual([])
  })

  it('🛑 a desk of ONLY historical NULL-programme leads is still nothing to review', async () => {
    // The sharpest form of the scoping defect: `client_id`-only would have found two leads
    // here and approved a programme whose own work is empty.
    seedProgramme()
    prospect('L_OLD_1', { programme_id: null })
    prospect('L_OLD_2', { programme_id: null })
    await freezeReview()
    const r = await approveProgrammeAsCustomer(C, P, frozenVersion())
    expect(r.ok).toBe(false)
    expect(!r.ok && r.code).toBe('nothing_to_review')
    expect(state.programmes[0].status).toBe('READY_FOR_APPROVAL')
  })

  it.each([
    ['DRAFT'], ['RECOMMENDED'], ['AWAITING_FIRST_PAYMENT'],
    ['SOURCING_AUTHORISED'], ['SOURCING'], ['LIVE'],
  ])('🛑 a customer cannot jump stages — %s is refused', async (status) => {
    seedProgramme({ status }); prospect('L1')
    await freezeReview()
    const r = await approveProgrammeAsCustomer(C, P, frozenVersion())
    expect(r.ok).toBe(false)
    expect(!r.ok && r.code).toBe('wrong_state')
    expect(state.programmes[0].status).toBe(status)
    expect(state.written).toEqual([])
  })

  it.each([['COMPLETED'], ['CANCELLED']])('🛑 a terminal programme (%s) is refused', async (status) => {
    seedProgramme({ status }); prospect('L1')
    await freezeReview()
    const r = await approveProgrammeAsCustomer(C, P, frozenVersion())
    expect(r.ok).toBe(false)
    expect(!r.ok && r.code).toBe('terminal')
    expect(state.written).toEqual([])
  })

  it('🛑 a PAUSED programme is refused', async () => {
    seedProgramme({ paused_at: 'x' }); prospect('L1')
    await freezeReview()
    const r = await approveProgrammeAsCustomer(C, P, frozenVersion())
    expect(r.ok).toBe(false)
    expect(!r.ok && r.code).toBe('paused')
    expect(state.programmes[0].status).toBe('READY_FOR_APPROVAL')
    expect(state.written).toEqual([])
  })

  it('an unreadable programme is "we cannot tell", never an approval and never a 404', async () => {
    seedProgramme(); prospect('L1')
    state.readFails.add('programmes')
    await freezeReview()
    const r = await approveProgrammeAsCustomer(C, P, frozenVersion())
    expect(r.ok).toBe(false)
    expect(!r.ok && r.code).toBe('unreadable')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ③ REPEAT AND RACE
// ═══════════════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 11 Sep (DAY 3) — THE CLIENT APPROVES THE EXACT VERSION THEY READ.
//
// 🛑 WHAT THIS CLOSES. Approval stamped `approved_preparation_hash` from whatever was frozen
// AT THE MOMENT OF THE PRESS, and the client never said which package they were approving. A
// re-preparation between the screen rendering and the button being pressed — a prospect
// evicted, a message re-drafted, the window or the sender changed — was approved in silence.
// The founder's rule is a NEW VERSION and a NEW APPROVAL, never a mutated one.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('②b the approval names its version, and a stale one is refused', () => {
  it('🛑 a version that is no longer frozen is REFUSED, and nothing is written', async () => {
    seedProgramme(); prospect('L1'); await freezeReview()
    const row = state.programmes.find(r => r.id === P)!
    const r = await approveProgrammeAsCustomer(C, P, 'the-version-they-were-reading')
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.code).toBe('stale_version')
    expect(row.status, 'a stale approval changed the programme').toBe('READY_FOR_APPROVAL')
    expect(row.approved_at ?? null, 'a stale approval stamped an approval').toBeNull()
  })

  it('🛑 an approval that names NO version at all is refused', async () => {
    seedProgramme(); prospect('L1'); await freezeReview()
    const r = await approveProgrammeAsCustomer(C, P, null)
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.code).toBe('stale_version')
  })

  it('the CURRENT version approves normally — the gate is not a wall', async () => {
    seedProgramme(); prospect('L1'); await freezeReview()
    const r = await approveProgrammeAsCustomer(C, P, frozenVersion())
    expect(r.ok).toBe(true)
  })

  it('🛑 …and re-freezing invalidates the version the client was holding', async () => {
    seedProgramme(); prospect('L1'); await freezeReview()
    const held = frozenVersion()
    // The work is re-prepared and the frozen package changes. ⚠️ THE HASH IS MOVED DIRECTLY
    // rather than by re-running preparation: WHAT changes a package (a prospect evicted, a
    // message re-drafted, the window or sender changed) is `preparation-snapshot`'s subject and
    // is covered there. This case is about the APPROVAL GATE, and its premise is only that the
    // frozen version is no longer the one the client is holding.
    state.programmes.find(r => r.id === P)!.review_preparation_hash = 'a-newer-frozen-package'
    expect(frozenVersion(), 'the fixture did not actually re-freeze').not.toBe(held)
    const r = await approveProgrammeAsCustomer(C, P, held)
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.code).toBe('stale_version')
    // ⚠️ THE POSITIVE HALF LIVES IN ITS OWN CASE ABOVE, deliberately. Moving the hash here
    // without moving the SNAPSHOT with it trips a different, older and entirely correct guard
    // — "the prepared work is not the work you reviewed" — so asserting the happy path from
    // this fixture would be asserting against a state the product cannot reach.
  })
})

describe('③ approving twice is safe, and approved_at is written once', () => {
  it('🛑 a repeat request is idempotent and does NOT replace approved_at', async () => {
    seedProgramme(); prospect('L1')
    await freezeReview()
    const first = await approveProgrammeAsCustomer(C, P, frozenVersion())
    expect(first.ok).toBe(true)
    const stamp = state.programmes[0].approved_at
    state.written = []

    await freezeReview()
    const second = await approveProgrammeAsCustomer(C, P, frozenVersion())
    expect(second.ok).toBe(true)
    expect(second.ok && second.alreadyApproved, 'the repeat says so').toBe(true)
    expect(state.programmes[0].approved_at, 'the original stamp survives').toBe(stamp)
    // 🛑 NO SECOND WRITE AT ALL — not a harmless one, none.
    expect(state.written, 'a repeat writes nothing').toEqual([])
  })

  it('🛑 A CONCURRENT APPROVAL CANNOT MOVE approved_at — the compare-and-set decides', async () => {
    // ⚠️ THIS IS THE TEST THE PRE-READ CANNOT PASS ON ITS OWN. Both callers read
    // READY_FOR_APPROVAL; the row is approved by the other one in between. Without
    // `.eq('status', 'READY_FOR_APPROVAL')` on the UPDATE, this caller overwrites the
    // winner's `approved_at` with a later timestamp — a moved audit date on the customer's
    // one act. The hook below is that "in between".
    seedProgramme(); prospect('L1')
    state.beforeProgrammeUpdate = () => {
      const p = state.programmes[0]
      p.status = 'APPROVED'
      p.approved_at = 'WINNER'
      state.beforeProgrammeUpdate = null
    }

    await freezeReview()
    const r = await approveProgrammeAsCustomer(C, P, frozenVersion())

    expect(r.ok).toBe(true)
    expect(r.ok && r.alreadyApproved).toBe(true)
    expect(state.programmes[0].approved_at, 'the winner\'s stamp stands').toBe('WINNER')
    expect(state.programmes[0].status).toBe('APPROVED')
  })

  it('a repeat produces no duplicate downstream side effect', async () => {
    seedProgramme(); prospect('L1')
    await freezeReview()
    await approveProgrammeAsCustomer(C, P, frozenVersion())
    await approveProgrammeAsCustomer(C, P, frozenVersion())
    await approveProgrammeAsCustomer(C, P, frozenVersion())
    expect(state.rpcs).toEqual([])
    expect(state.written.filter(t => t !== 'programmes')).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ④ TENANCY
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('④ a customer may only approve their own programme', () => {
  it('🛑 MBF CANNOT APPROVE HOUSE\'S PROGRAMME', async () => {
    seedProgramme(); prospect('L1')
    await freezeReview()
    const r = await approveProgrammeAsCustomer(OTHER, P)
    expect(r.ok).toBe(false)
    expect(!r.ok && r.code).toBe('not_found')
    expect(state.programmes[0].status, 'House\'s programme is untouched').toBe('READY_FOR_APPROVAL')
    expect(state.written).toEqual([])
  })

  it('🛑 HOUSE CANNOT APPROVE MBF\'S PROGRAMME', async () => {
    state.programmes.push({
      id: P_OTHER, client_id: OTHER, status: 'READY_FOR_APPROVAL', approved_at: null,
      paused_at: null, meeting_target: 2,
    })
    await freezeReview()
    const r = await approveProgrammeAsCustomer(C, P_OTHER)
    expect(r.ok).toBe(false)
    expect(!r.ok && r.code).toBe('not_found')
    expect(state.programmes[0].status).toBe('READY_FOR_APPROVAL')
  })

  it('🛑 a wrong-tenant programme answers IDENTICALLY to one that does not exist', async () => {
    // No enumeration oracle: a customer must not be able to tell a real id they do not own
    // from an id nobody owns.
    seedProgramme(); prospect('L1')
    await freezeReview()
    const notMine = await approveProgrammeAsCustomer(OTHER, P)
    const notReal = await approveProgrammeAsCustomer(OTHER, 'P_DOES_NOT_EXIST')
    expect(notMine).toEqual(notReal)
  })

  it('🛑 an ALREADY-APPROVED programme belonging to someone else is still not_found', async () => {
    // The `already approved → ok` shortcut must sit AFTER the tenancy check, or it becomes a
    // read oracle on another tenant's state.
    seedProgramme({ status: 'APPROVED', approved_at: 'a' })
    await freezeReview()
    const r = await approveProgrammeAsCustomer(OTHER, P)
    expect(r.ok).toBe(false)
    expect(!r.ok && r.code).toBe('not_found')
  })

  it('a review read is scoped to the caller\'s own client', async () => {
    seedProgramme(); prospect('L1')
    const mine = await readProgrammeReviewSet(C, P)
    const theirs = await readProgrammeReviewSet(OTHER, P)
    expect(mine.prospects).toHaveLength(1)
    expect(theirs.prospects, 'another tenant sees nothing of this programme').toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑤ THE ROUTE AND THE SURFACES — ONE TRUTH, TWO READERS
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑤ Milla and Vida read the same programme record', () => {
  const api = (f: string) => readFileSync(join(join(__dirname, '..'), f), 'utf8')

  it('🛑 the customer routes take NO programme id from the request', () => {
    const src = api('routes/my-programme.ts')
    // The programme is resolved from the session's client. There is no `:id` to tamper with.
    expect(src).toContain("myProgrammeRouter.get('/review'")
    expect(src).toContain("myProgrammeRouter.post('/approve'")
    expect(src).not.toMatch(/myProgrammeRouter\.(get|post)\('\/[^']*:id/)
    expect(src).toContain('openProgrammeForSession(clientId)')
  })

  it('🛑 the customer router requires a session and NEVER an admin key', () => {
    const src = api('routes/my-programme.ts')
    expect(src).toContain('myProgrammeRouter.use(requireAuth)')
    // ⚠️ COMMENTS STRIPPED FIRST. The file's own header EXPLAINS that the operator surface is
    // admin-gated and this one is not, so a raw search finds `adminKeyValid` in prose and the
    // assertion fails on the sentence that proves it right. Only executable text counts.
    const code = src.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
    expect(code).not.toMatch(/ADMIN_SECRET_KEY|adminKeyValid/)
  })

  it('🛑 the operator approve route still exists and is still admin-gated — this is a SECOND door, not a loosened one', () => {
    const src = api('routes/programme.ts')
    expect(src).toContain("programmeRouter.post('/:id/approve'")
    expect(src).toMatch(/programmeRouter\.use\(|adminKeyValid/)
  })

  it('Vida and Milla read one record: approval is visible through the operator read too', async () => {
    seedProgramme(); prospect('L1')
    await freezeReview()
    await approveProgrammeAsCustomer(C, P, frozenVersion())
    // There is exactly one programmes row, and both surfaces read `programmes` by id. The
    // customer's approval is therefore the operator's approval — not a copy of it.
    expect(state.programmes).toHaveLength(1)
    const { getProgramme } = await import('./programme')
    const asVidaSeesIt = await getProgramme(P)
    expect(asVidaSeesIt!.status).toBe('APPROVED')
    expect(asVidaSeesIt!.approved_at).toBe(state.programmes[0].approved_at)
    expect(asVidaSeesIt!.went_live_at ?? null, 'approved is not live').toBeNull()
    expect(asVidaSeesIt!.second_paid_at ?? null, 'approved is not P2').toBeNull()
    expect(asVidaSeesIt!.second_authorised_at ?? null).toBeNull()
  })

  it('🛑 the desk and the approval gate run the SAME FUNCTION, not the same conditions twice', () => {
    const src = readFileSync(join(__dirname, 'programme-review.ts'), 'utf8')
    const body = src.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
    // ⛓️ STRONGER THAN THE ASSERTION THIS REPLACES. That one counted each condition twice —
    // once per query — which proves the two queries LOOK alike, not that they ARE alike. Two
    // copies of a predicate is exactly the shape that drifts. There is now ONE query, in one
    // function, and both callers go through it.
    // ⛓️ 11 Sep (DAY 3) — SCOPED TO `scanEligible`'s OWN BODY, and that is a TIGHTENING.
    // `readFrozenReviewPage` was added below it to serve the FROZEN package rather than a live
    // eligibility read, and it legitimately scopes its own two reads by client and programme —
    // so counting those two strings across the whole file started counting a different question
    // and failed. The subject here is *the eligibility predicate exists once*, so the count is
    // taken inside the one function that owns it; the frozen reader is asserted separately
    // below to carry NO eligibility condition at all, which is the property that matters.
    const scan = body.slice(body.indexOf('async function scanEligible('), body.indexOf('function toCard('))
    for (const cond of [
      ".eq('client_id', clientId)", ".eq('programme_id', programmeId)",
      ".not('delivered_at', 'is', null)", ".not('surfaced_for_approval_at', 'is', null)",
      ".is('revealed_at', null)", ".not('status', 'in'", ".is('opted_out_at', null)",
      ".is('provider_eviction_required_at', null)", ".not('email', 'is', null)",
    ]) {
      expect(scan.split(cond).length - 1, `${cond} must exist exactly ONCE`).toBe(1)
    }
    // 🛑 AND THE FROZEN READER RE-DERIVES NONE OF IT. It reads the ids the freeze recorded; a
    // second copy of the eligibility rule in there would be the drift this case exists to stop,
    // and would also silently shrink the audience the client is approving.
    const frozenReader = body.slice(body.indexOf('export async function readFrozenReviewPage'))
    for (const cond of [
      ".not('delivered_at', 'is', null)", ".not('surfaced_for_approval_at', 'is', null)",
      ".is('revealed_at', null)", ".not('status', 'in'", ".is('opted_out_at', null)",
      ".is('provider_eviction_required_at', null)", ".not('email', 'is', null)",
      'opt_out_blocklist',
    ]) {
      expect(frozenReader, `the frozen reader re-derives ${cond}`).not.toContain(cond)
    }
    expect(body).toContain('async function scanEligible(')
    // Both public readers delegate to it.
    const read = body.slice(body.indexOf('export async function readProgrammeReviewSet'))
    const count = body.slice(body.indexOf('export async function countProgrammeReviewable'))
    expect(read).toContain('scanEligible(clientId, programmeId')
    expect(count).toContain('scanEligible(clientId, programmeId')
    // And neither builds a query of its own.
    expect(count.split("db.from(").length - 1, 'the gate owns no query').toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑥ MILLA'S SURFACE — THE ONE ACTION, AND NONE OF THE OLD ECONOMICS
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑥ Milla presents ONE programme approval and no legacy economics', () => {
  const ui = readFileSync(
    join(__dirname, '../../../portal/src/components/milla/ProgrammeReview.tsx'), 'utf8')
  const visible = ui.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
  /**
   * ⛓️ 18 Sep (J16-C1) — THE APPROVAL MOVED, SO THIS SECTION READS TWO FILES.
   *
   * This whole section asserted the customer's one action against `ProgrammeReview`, because
   * that is where the button was. It was in TWO places: this desk posted the approval having
   * shown the client the cards and a total, while `ProgrammeApproval` posted it having shown
   * them the words, the sender, the schedule and the version. The duplicate control is
   * withdrawn; the desk mounts the one surface.
   *
   * 🛑 NOT ONE PROPERTY IS DROPPED. Every assertion below still runs — the founder's verbatim
   * wording, one post and never a per-lead approve, disabled-in-flight, the empty-desk
   * ordering, the approved state — against the file that now performs the act.
   */
  const SURFACE = readFileSync(
    join(__dirname, '../../../portal/src/components/milla/ProgrammeApproval.tsx'), 'utf8')
  const surfaceVisible = SURFACE.split('\n')
    .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')

  it('🛑 the founder\'s locked wording, verbatim', () => {
    expect(SURFACE).toContain("export const APPROVE_LABEL = 'Approve this programme'")
    expect(SURFACE).toContain("export const APPROVED_COPY = 'Approved — nothing is sent until the programme goes Live.'")
    // ⚠️ AND THE DESK STILL EXPORTS THEM UNCHANGED — the names did not break, the words did not
    // move a character, and nothing that imported them from here reads a paraphrase.
    expect(ui).toContain("export { APPROVED_COPY, APPROVE_LABEL } from './ProgrammeApproval'")
    // The rejected phrasing must not reach the SCREEN. It is named in the file's header — which
    // records why the founder rejected it — so this is asserted against executable text only;
    // searching the raw file would fail on the comment that documents the ruling.
    expect(visible).not.toContain("we'll confirm before anything is sent")
    expect(visible).not.toContain('we’ll confirm before anything is sent')
  })

  it('🛑 no price, no wallet, no pack, no pay-to-reveal anywhere in the customer surface', () => {
    for (const banned of ['$4', '$1', '$3', '$299', '$99', 'wallet', 'Top up', 'top up', 'credits', 'pay to reveal', 'Reveal']) {
      expect(visible, `"${banned}" must not appear in the review surface`).not.toContain(banned)
    }
  })

  it('🛑 ONE action — it posts the programme approval, never a per-lead approve', () => {
    expect(surfaceVisible).toContain("'/my/programme/approve'")
    // ⚠️ AND THE DESK NO LONGER POSTS IT AT ALL. This is the "nowhere else" half: a second
    // component that could approve is what the one-surface rule forbids.
    expect(visible, 'the desk still approves as well as the surface')
      .not.toContain('/my/programme/approve')
    for (const src of [visible, surfaceVisible]) {
      expect(src).not.toMatch(/\/leads\/[^']*\/approve/)
      expect(src).not.toMatch(/\/leads\/[^']*\/reveal/)
      expect(src).not.toContain('approve-batch')
    }
  })

  it('🛑 it renders loading, error+retry, disabled-in-flight, empty-inconsistency and success', () => {
    expect(visible).toContain('Loading the prospects for your programme…')
    expect(visible).toContain('Try again')
    expect(visible).toContain('Your programme isn’t ready to review yet.')
    // ⛓️ 18 Sep (J16-C1) — ~~`disabled={approving || !d.canApprove}`~~ and the approved state
    // were the desk's; they belong to the button, and the button moved. Both are re-asserted
    // against the surface, and the in-flight guard is unchanged in substance: a double-click
    // cannot show a customer two spinners for one act.
    expect(surfaceVisible).toContain('disabled={busy}')
    expect(surfaceVisible).toContain('data-testid="programme-approved"')
    // The server's boolean still decides whether the action is offered at all.
    expect(surfaceVisible).toContain('data.canApprove ?')
  })

  it('🛑 a READY programme with an empty desk shows NO approve button and NO fabricated cards', () => {
    // The empty-inconsistency branch returns before the card list AND before the surface that
    // holds the button is mounted — so an empty desk cannot present an approval.
    const branchAt = visible.indexOf('if (!approved && d.total === 0)')
    const mountAt = visible.indexOf('<ProgrammeApproval')
    expect(branchAt).toBeGreaterThan(-1)
    expect(mountAt, 'the approval surface is mounted BEFORE the empty guard returns')
      .toBeGreaterThan(branchAt)
    expect(visible.slice(branchAt)).toContain('Nothing has been approved and nothing has been sent')
    // And the button itself is inside the surface, behind the server's boolean.
    expect(surfaceVisible).toContain('data-testid="approve-programme"')
  })

  it('the review is ADDITIVE — the existing workspace still renders at every stage', () => {
    const page = readFileSync(
      join(__dirname, '../../../portal/src/app/(milla)/milla/page.tsx'), 'utf8')
    // The workspace is unconditional for every non-Proof stage, exactly as before; the review
    // is a sibling beneath it, gated on the Approval stage alone.
    // ⛓️ 24 Sep (R145 — the redesign, founder: *"match everything. colors everything."*), and the founder's *"we never leave one chat to go to another… the only change
    // is the right screen"*: WAS `<ProgrammeWorkspace p={prog} />` + `prog.stage === 'Approval'`
    // + `<ProgrammeReview token={token} />` on Home. Home's right side is now the Programme
    // screen itself, so the SAME duty is asserted where it now lives: the workspace renders
    // unconditionally and the approval surface is added beneath it, never in its place.
    expect(page).toContain('<ProgrammeScreen />')
    const programme = readFileSync(
      join(__dirname, '../../../portal/src/app/(milla)/milla/programme/page.tsx'), 'utf8')
    // ⛓️ 24 Sep (R145 step 5 · #60) — AT APPROVAL THE PANEL IS THE RIGHT SIDE, ALONE. The redesign
    // draws Approval as one panel (frozen package → version card → second payment → one button);
    // the status workspace above it said the same things a second time. The workspace still
    // renders at every OTHER stage, and after approval, exactly as before.
    expect(programme).toContain('<ProgrammeWorkspace p={p} />')
    expect(programme).toContain('<ProgrammeApproval')
    expect(programme).toContain('review?.programme && review.canApprove && !review.programme.approved_at ? (')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑦ THE SUPPRESSION CONTRADICTION — RESOLVED, AND PROVED PER STATE
//
// 🛑 THE FOUNDER'S INVARIANT: "A programme must not be customer-approved solely because the
// review desk contains records already known to be permanently ineligible for programme
// outreach."
//
// ⛓️ THE FIRST VERSION OF THIS FILE FAILED THAT INVARIANT, and my own return said otherwise.
// The predicate was `/leads/for-approval`'s four conditions, and I described it as excluding
// opted-out, rejected and bounced prospects. It excluded NONE of them: `status != 'passed'`
// is one status, not a suppression rule.
//
// 🛑 AND THE STATES ARE REACHABLE. `surfaceEverything` — the act that writes BOTH stamps — has
// no email filter and no suppression filter, so every state below can be delivered and
// surfaced exactly like a good prospect. These are not impossible states proved for form.
//
// ⚠️ NOTHING SEND-TIME IS TESTED HERE. Mailbox caps, warm-up, PECR and launch-country holds are
// properties of a send, not of a prospect, and freezing one into a review desk would tell a
// customer somebody is unusable when they are merely not sendable today.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑦ permanently ineligible prospects cannot form a review or approval population', () => {
  /** A · appears on the desk? · B · counts toward the gate? · C · could it allow approval? */
  async function outcome(id: string) {
    const set = await readProgrammeReviewSet(C, P)
    const onDesk = set.prospects.some(p => p.id === id)
    const counted = (await countProgrammeReviewable(C, P)) > 0
    await freezeReview()
    const approval = await approveProgrammeAsCustomer(C, P, frozenVersion())
    return { onDesk, counted, approved: approval.ok, total: set.total }
  }

  it('① a VALID surfaced programme prospect is reviewable, counted, and can carry the approval', async () => {
    seedProgramme(); prospect('L_GOOD')
    const r = await outcome('L_GOOD')
    expect(r).toMatchObject({ onDesk: true, counted: true, approved: true, total: 1 })
  })

  it('🛑 ② OPTED OUT by status — off the desk, uncounted, cannot carry the approval', async () => {
    seedProgramme(); prospect('L_OPTED', { status: 'opted_out' })
    const r = await outcome('L_OPTED')
    expect(r).toMatchObject({ onDesk: false, counted: false, approved: false, total: 0 })
    expect(state.programmes[0].status).toBe('READY_FOR_APPROVAL')
  })

  it('🛑 ② OPTED OUT by timestamp — `opted_out_at` alone is enough, whatever the status says', async () => {
    // The person asked us to stop. A status that has not caught up is not a second opinion.
    seedProgramme(); prospect('L_OPTED_AT', { status: 'scored', opted_out_at: '2026-08-01T00:00:00Z' })
    const r = await outcome('L_OPTED_AT')
    expect(r).toMatchObject({ onDesk: false, counted: false, approved: false, total: 0 })
  })

  it('🛑 ③ REJECTED — the engine disqualified it', async () => {
    seedProgramme(); prospect('L_REJ', { status: 'rejected' })
    const r = await outcome('L_REJ')
    expect(r).toMatchObject({ onDesk: false, counted: false, approved: false, total: 0 })
  })

  it('🛑 ③ PASSED — the customer already said no to this one', async () => {
    seedProgramme(); prospect('L_PASS', { status: 'passed' })
    const r = await outcome('L_PASS')
    expect(r).toMatchObject({ onDesk: false, counted: false, approved: false, total: 0 })
  })

  it('🛑 ④ HARD BOUNCED — the blocklist is consulted, and it is not a lead column', async () => {
    // A hard bounce is recorded as `opt_out_blocklist.reason='hard_bounce'` by the Resend/Svix
    // webhook. No column filter can reach it, so the scan reads the table per page.
    seedProgramme(); prospect('L_BOUNCED')
    state.blocklist.push({ email: 'l_bounced@example.com', reason: 'hard_bounce' })
    const r = await outcome('L_BOUNCED')
    expect(r).toMatchObject({ onDesk: false, counted: false, approved: false, total: 0 })
  })

  it('🛑 ④ SPAM COMPLAINT — same door', async () => {
    seedProgramme(); prospect('L_COMPLAINED')
    state.blocklist.push({ email: 'l_complained@example.com', reason: 'spam_complaint' })
    const r = await outcome('L_COMPLAINED')
    expect(r).toMatchObject({ onDesk: false, counted: false, approved: false, total: 0 })
  })

  it('🛑 ④ CROSS-CLIENT opt-out — suppressed here even though they said STOP to somebody else', async () => {
    seedProgramme(); prospect('L_OTHERSTOP')
    state.blocklist.push({ email: 'l_otherstop@example.com', reason: 'list_unsubscribe' })
    const r = await outcome('L_OTHERSTOP')
    expect(r).toMatchObject({ onDesk: false, counted: false, approved: false, total: 0 })
  })

  it('🛑 ④ the blocklist probe is NORMALISED — a case variant does not slip through (HC-1)', async () => {
    // The blocklist is deduped on a normalised address, so a raw comparison misses
    // `L_Case@Example.com` against a stored `l_case@example.com`. `normalizeRevealEmails` is
    // the one definition of "the same email" in this repository, and this read uses it.
    seedProgramme(); prospect('L_CASE', { email: 'L_Case@Example.COM' })
    state.blocklist.push({ email: 'l_case@example.com', reason: 'hard_bounce' })
    const r = await outcome('L_CASE')
    expect(r).toMatchObject({ onDesk: false, counted: false, approved: false, total: 0 })
  })

  it('🛑 ⑤ PROVIDER-EVICTED — we owe a provider a removal for this person', async () => {
    seedProgramme(); prospect('L_EVICT', { provider_eviction_required_at: '2026-08-20T00:00:00Z' })
    const r = await outcome('L_EVICT')
    expect(r).toMatchObject({ onDesk: false, counted: false, approved: false, total: 0 })
  })

  it('🛑 NO EMAIL — nothing can ever be sent to them, so they are not a reviewable prospect', async () => {
    // ⚠️ AND THIS IS REACHABLE. `surfaceEverything` has no email filter, so an unemailable lead
    // is surfaced and delivered like anybody else.
    seedProgramme(); prospect('L_NOEMAIL', { email: null })
    const r = await outcome('L_NOEMAIL')
    expect(r).toMatchObject({ onDesk: false, counted: false, approved: false, total: 0 })
  })

  it('🛑 ⑥ A DESK OF ONLY PERMANENTLY INELIGIBLE PROSPECTS REFUSES THE APPROVAL', async () => {
    // The invariant in its sharpest form: eight surfaced, delivered, correctly-attributed
    // programme leads, every one permanently unworkable. The old predicate counted eight
    // reviewable prospects and would have approved the programme on them.
    seedProgramme()
    prospect('S1', { status: 'opted_out' })
    prospect('S2', { status: 'rejected' })
    prospect('S3', { status: 'passed' })
    prospect('S4', { opted_out_at: 'x' })
    prospect('S5', { provider_eviction_required_at: 'x' })
    prospect('S6', { email: null })
    prospect('S7'); state.blocklist.push({ email: 's7@example.com', reason: 'hard_bounce' })
    prospect('S8'); state.blocklist.push({ email: 's8@example.com', reason: 'spam_complaint' })

    const set = await readProgrammeReviewSet(C, P)
    expect(set.prospects, 'no card is fabricated').toEqual([])
    expect(set.total).toBe(0)

    await freezeReview()
    const r = await approveProgrammeAsCustomer(C, P, frozenVersion())
    expect(r.ok).toBe(false)
    expect(!r.ok && r.code).toBe('nothing_to_review')
    expect(state.programmes[0].status, 'nothing moved').toBe('READY_FOR_APPROVAL')
    expect(state.written).toEqual([])
  })

  it('🛑 ⑥ ONE good prospect among eight dead ones IS enough — the gate is not all-or-nothing', async () => {
    seedProgramme()
    prospect('S1', { status: 'opted_out' }); prospect('S2', { status: 'rejected' })
    prospect('S3', { opted_out_at: 'x' });   prospect('S4', { provider_eviction_required_at: 'x' })
    prospect('S5', { email: null })
    prospect('S6'); state.blocklist.push({ email: 's6@example.com', reason: 'hard_bounce' })
    prospect('Z_GOOD')

    const set = await readProgrammeReviewSet(C, P)
    expect(set.prospects.map(p => p.id)).toEqual(['Z_GOOD'])
    expect(set.total).toBe(1)
    await freezeReview()
    const r = await approveProgrammeAsCustomer(C, P, frozenVersion())
    expect(r.ok, !r.ok ? r.reason : '').toBe(true)
  })

  it('🛑 THE DESK IS THE POPULATION A2 WILL WORK — the two eligibility rules are the same list', () => {
    // ⚠️ ASSERTED AGAINST A2's OWN SOURCE, not against a copy of it. `prepareProgrammeOutreach`
    // is what actually enrols these people; if its filter ever gains a condition this desk does
    // not have, the customer is reviewing prospects the engine will silently drop.
    const prep = readFileSync(join(__dirname, 'programme-preparation.ts'), 'utf8')
    const rev = readFileSync(join(__dirname, 'programme-review.ts'), 'utf8')
    for (const rule of ['opted_out', 'rejected', 'passed']) {
      expect(prep, `A2 suppresses ${rule}`).toContain(`'${rule}'`)
      expect(rev, `review must suppress ${rule} too`).toContain(rule)
    }
    for (const col of ['opted_out_at', 'provider_eviction_required_at']) {
      expect(prep).toContain(col)
      expect(rev, `review must suppress ${col} too`).toContain(col)
    }
    // Both consult the same blocklist table through the same normaliser.
    for (const src of [prep, rev]) {
      expect(src).toContain("db.from('opt_out_blocklist')")
      expect(src).toContain('normalizeRevealEmails')
    }
  })
})
