import { describe, it, expect, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE WHOLE SPRINT 3 CHAIN, DRIVEN FOR REAL, WITH THE DELIVERY SEAMS WATCHING.
//
// ── WHY THIS FILE EXISTS AND `p1-p2-money-boundary.test.ts` IS NOT ENOUGH ──────────────
//
// That file proves each PAYMENT in isolation, and its end-to-end case bridges the two with
// `Object.assign(row, { status: 'APPROVED' })` — a hand-written approval standing in for the
// real one. It therefore never exercises automatic preparation, the freeze, or the approval
// gate. This does: the four real functions run in the real order, and the programme reaches
// APPROVED because `approveProgrammeAsCustomer` put it there, against the exact version that
// `markReadyForApproval` actually froze.
//
//     recordFirstPayment  →  advanceAfterSettlement  →  approveProgrammeAsCustomer
//                                (prepares, proves readiness, FREEZES)
//                                                     →  recordSecondPayment
//
// 🛑 THE ONE NUMBER THIS FILE EXISTS FOR: EXTERNAL DELIVERY ACROSS THE WHOLE CHAIN = 0.
//
// ── WHAT IS DOUBLED, AND WHY — STATED PLAINLY ─────────────────────────────────────────
//
// Only work that reaches outside the orchestration:
//   · `prepareProgrammeOutreach`     — the provider/sending preparation itself
//   · `programmePreparationReadiness` — a many-table readiness read
//   · `buildPreparationSnapshot`      — a many-table snapshot build; the double returns a
//                                       DETERMINISTIC hash so the freeze identity is real
//   · `countProgrammeReviewable`      — the reviewable-desk count
//   · `reviewDrift`                   — see the note on its double below
//
// ⚠️ WHY `reviewDrift` IS DOUBLED AND WHAT THE DOUBLE PRESERVES — STATED, NOT HIDDEN. The real
// `reviewDrift` calls `buildPreparationSnapshot` through a MODULE-INTERNAL reference, so the
// snapshot double above cannot reach it: the real many-table builder would run against this
// fake database and produce a hash that is not `FROZEN_HASH`, and every approval in this file
// would refuse `unreadable` for a reason that has nothing to do with the rule under test. The
// double therefore re-expresses the real function's decision line-for-line — read the PERSISTED
// `review_preparation_hash`, compare it to the CURRENT snapshot hash, `unchanged` / `changed` /
// `unreadable` — over the SAME doubled builder. The comparison is still made against the column
// the real freeze actually wrote, and `…-drift` below moves the current hash to prove the
// `changed` branch still refuses. What is not proved HERE is the real hashing itself — that is
// `day3-prepare-freeze-approve.test.ts` #13/#14/#27.
//
// Everything that DECIDES is real: `advanceAfterSettlement` → `advanceProgrammeToReview` →
// `markReadyForApproval` → `setStatus` writes the freeze columns through the fake database,
// and the approval then reads those very columns. Nothing sets `READY_FOR_APPROVAL` or
// `APPROVED` by hand.
// ═══════════════════════════════════════════════════════════════════════════════════════

type Row = Record<string, unknown>

const PROGRAMME = 'aa11bb22-cc33-dd44-ee55-ff6677889900'
const CLIENT    = '6bd2046b-5da7-4d48-a249-b9412b7dd554'
const FROZEN_HASH = 'sha256:frozen-v1'

const state = {
  row: null as Row | null,
  /** Every table written, with the patch, in order. */
  writes: [] as { table: string; patch: Row }[],
  rpcs: [] as string[],
  /** 🛑 EVERY OUTBOUND CLIENT-FACING SEAM TOUCHED. Must stay empty. */
  sends: [] as string[],
  alerts: [] as string[],
}

vi.mock('@kind/db', () => {
  const make = (table: string) => {
    const self: Record<string, unknown> = {}
    for (const op of ['eq', 'gt', 'gte', 'lt', 'lte', 'is', 'not', 'in', 'neq', 'order', 'limit', 'select']) {
      self[op] = () => self
    }
    self.update = (patch: Row) => {
      state.writes.push({ table, patch })
      if (table === 'programmes' && state.row) Object.assign(state.row, patch)
      return self
    }
    self.insert = (patch: Row) => { state.writes.push({ table, patch }); return self }
    self.upsert = (patch: Row) => { state.writes.push({ table, patch }); return self }
    self.maybeSingle = async () => ({ data: table === 'programmes' ? state.row : null, error: null })
    self.single = async () => ({ data: table === 'programmes' ? state.row : null, error: null })
    self.then = (res: (v: unknown) => unknown) =>
      res({ data: table === 'programmes' && state.row ? [state.row] : [], error: null, count: 246 })
    return self
  }
  return {
    db: {
      from: (t: string) => make(t),
      rpc: async (n: string) => { state.rpcs.push(n); return { data: null, error: null } },
    },
  }
})

vi.mock('./alerts', () => ({ sendFounderAlert: async (k: string) => { state.alerts.push(k) } }))

// 🛑 THE DELIVERY SEAMS. If anything in this chain reaches one, it shows up here.
vi.mock('./email', () => ({
  sendTx:           async () => { state.sends.push('email:sendTx'); return null },
  sendWelcomeEmail: async () => { state.sends.push('email:welcome') },
  sendConsentEmail: async () => { state.sends.push('email:consent') },
}))
vi.mock('./mailer', () => ({ sendMail: async () => { state.sends.push('mailer:sendMail'); return null } }))
// …and the outbound paths that are not email: the campaign sender and WhatsApp.
vi.mock('./smartlead-send', async orig => ({
  ...(await orig<typeof import('./smartlead-send')>()),
  pushApprovedLeadToSmartlead: async () => {
    state.sends.push('smartlead:push')
    return { ok: true } as unknown as Awaited<ReturnType<typeof import('./smartlead-send').pushApprovedLeadToSmartlead>>
  },
}))
vi.mock('./whatsapp', async orig => ({
  ...(await orig<typeof import('./whatsapp')>()),
  sendTextMessage:     async () => { state.sends.push('whatsapp:text'); return null },
  sendTemplateMessage: async () => { state.sends.push('whatsapp:template'); return null },
}))
vi.mock('./send-due', async orig => ({
  ...(await orig<typeof import('./send-due')>()),
  runSendDue: async () => { state.sends.push('send-due:run'); return {} as never },
}))

// ── THE FOUR DOUBLES, AT GENUINE BOUNDARIES ───────────────────────────────────────────
const prep = { impl: () => ({
  ok: true, complete: true, remaining: 0, total: 246,
  campaigns: ['camp-1'], enrolled: Array.from({ length: 246 }, (_, i) => `l${i}`),
  alreadyEnrolled: 0, skipped: 0, failed: [], problems: [],
}) as unknown }
const ready = { impl: () => ({ ready: true, blockers: [], facts: null, degraded: null }) as unknown }
const snapshot = { impl: () => ({
  ok: true, hash: FROZEN_HASH,
  snapshot: { prospects: 246, messages: 3, cadence: '3 steps', window: 'Mon-Fri 09:00-17:00', sender: 'inbox-1', target: 10 },
}) as unknown }
const reviewable = { impl: () => 246 }

vi.mock('./programme-preparation', async orig => ({
  ...(await orig<typeof import('./programme-preparation')>()),
  prepareProgrammeOutreach: async () => prep.impl(),
}))
vi.mock('./preparation-readiness', async orig => ({
  ...(await orig<typeof import('./preparation-readiness')>()),
  programmePreparationReadiness: async () => ready.impl(),
}))
vi.mock('./preparation-snapshot', async orig => ({
  ...(await orig<typeof import('./preparation-snapshot')>()),
  buildPreparationSnapshot: async () => snapshot.impl(),
  // The real decision, over the doubled builder. See the header note.
  reviewDrift: async () => {
    const frozen = (state.row?.review_preparation_hash ?? null) as string | null
    if (!frozen) {
      return { state: 'unreadable', detail: 'This programme has no frozen review snapshot.' }
    }
    const now = snapshot.impl() as { ok: boolean; hash?: string; degraded?: string }
    if (!now.ok) return { state: 'unreadable', detail: now.degraded ?? 'The snapshot could not be built.' }
    if (now.hash === frozen) return { state: 'unchanged', hash: now.hash }
    return {
      state: 'changed', approved: frozen, current: now.hash,
      detail: 'The prepared work has changed since it was frozen for the client to review.',
    }
  },
}))
vi.mock('./programme-review', async orig => ({
  ...(await orig<typeof import('./programme-review')>()),
  countProgrammeReviewable: async () => reviewable.impl(),
}))

const { recordFirstPayment, recordSecondPayment, approveProgrammeAsCustomer } = await import('./programme')
const { advanceAfterSettlement } = await import('./programme-advance')

/** A programme the client has accepted, sitting at RECOMMENDED with nothing paid. */
const accepted = (over: Row = {}): Row => ({
  id: PROGRAMME, client_id: CLIENT,
  status: 'RECOMMENDED', paused_at: null, pause_reason: null,
  meeting_target: 10, recommended_volume: 400,
  price_total_cents: 500000, first_payment_cents: 250000, second_payment_cents: 250000,
  recommendation_accepted_at: '2026-09-12T09:00:00.000Z',
  first_payment_ref: null, first_paid_at: null, first_authorised_at: null, sourcing_ceiling: null,
  second_payment_ref: null, second_paid_at: null, second_authorised_at: null,
  approved_at: null, approved_by_kind: null, approved_by_user_id: null, went_live_at: null,
  review_preparation_hash: null, review_preparation_version: null, review_preparation_at: null,
  approved_preparation_hash: null,
  ...over,
})

const row = () => state.row as Row
const tablesWritten = () => [...new Set(state.writes.map(w => w.table))]

beforeEach(() => {
  state.row = accepted()
  state.writes = []
  state.rpcs = []
  state.sends = []
  state.alerts = []
  prep.impl = () => ({
    ok: true, complete: true, remaining: 0, total: 246,
    campaigns: ['camp-1'], enrolled: Array.from({ length: 246 }, (_, i) => `l${i}`),
    alreadyEnrolled: 0, skipped: 0, failed: [], problems: [],
  })
  ready.impl = () => ({ ready: true, blockers: [], facts: null, degraded: null })
  snapshot.impl = () => ({
    ok: true, hash: FROZEN_HASH,
    snapshot: { prospects: 246, messages: 3, cadence: '3 steps', window: 'Mon-Fri 09:00-17:00', sender: 'inbox-1', target: 10 },
  })
  reviewable.impl = () => 246
})

/** The real chain, in the real order. Returns each step's own result. */
async function runChain() {
  const p1 = await recordFirstPayment({ programmeId: PROGRAMME, sessionId: 'cs_1', paymentIntentId: 'pi_1' })
  // The settlement boundary the sourcing run reaches on its own — no operator press.
  if (row().status === 'SOURCING_AUTHORISED') row().status = 'SOURCING'
  const advance = await advanceAfterSettlement(PROGRAMME, 'sourcing_run')
  // The client approves the EXACT version the freeze actually wrote.
  const version = row().review_preparation_hash as string | null
  const approval = await approveProgrammeAsCustomer(CLIENT, PROGRAMME, version, 'user-1')
  const p2 = await recordSecondPayment({ programmeId: PROGRAMME, sessionId: 'cs_2', paymentIntentId: 'pi_2' })
  return { p1, advance, approval, p2 }
}

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 the REAL Sprint 3 chain — P1 → prepare → freeze → approval → P2', () => {
  it('every step is driven by production code, and the programme ends APPROVED', async () => {
    const { p1, advance, approval, p2 } = await runChain()
    expect(p1.ok, 'P1 did not record').toBe(true)
    expect(advance.attempted).toBe(true)
    expect(advance.reviewable, 'the chain did not reach review on its own').toBe(true)
    expect(advance.blockers).toEqual([])
    expect((approval as { ok: boolean }).ok,
      `the real approval refused: ${JSON.stringify(approval)}`).toBe(true)
    expect(p2.ok).toBe(true)
  })

  it('🛑 NO OPERATOR GO — preparation and the freeze happen inside the settlement boundary', async () => {
    await recordFirstPayment({ programmeId: PROGRAMME, sessionId: 'cs_1' })
    expect(row().status).toBe('SOURCING_AUTHORISED')
    row().status = 'SOURCING'
    // Nothing between here and the next line but the orchestrator itself.
    const advance = await advanceAfterSettlement(PROGRAMME, 'sourcing_run')
    expect(advance.reviewable).toBe(true)
    expect(row().status, 'the chain did not reach READY_FOR_APPROVAL by itself').toBe('READY_FOR_APPROVAL')
  })

  it('🛑 the FREEZE identity is really persisted, and the approval is pinned to it', async () => {
    await runChain()
    // Written by the real `markReadyForApproval`, not by this test.
    expect(row().review_preparation_hash).toBe(FROZEN_HASH)
    expect(row().review_preparation_version).toBe(1)
    expect(row().review_preparation_at).toBeTruthy()
    expect(row().status).toBe('APPROVED')
    expect(row().approved_at).toBeTruthy()
    expect(row().approved_by_kind).toBe('client')
    expect(row().approved_by_user_id).toBe('user-1')
  })

  it('🛑 THE WHOLE CHAIN SENDS NOTHING — external delivery count is ZERO', async () => {
    await runChain()
    expect(state.sends, `the Sprint 3 chain reached an outbound seam: ${state.sends.join(', ')}`)
      .toHaveLength(0)
  })

  it('🛑 …and it is NOT LIVE and has NO run authority at the end', async () => {
    await runChain()
    expect(row().went_live_at, 'the chain made the programme live').toBeNull()
    expect(row().status, 'the chain took the programme to LIVE').toBe('APPROVED')
    const everything = JSON.stringify(state.writes)
    expect(everything, 'the chain stamped went_live_at').not.toContain('went_live_at')
    expect(everything, 'the chain set LIVE').not.toContain('"LIVE"')
  })

  it('🛑 no outbound enrolment or send authority is created along the way', async () => {
    await runChain()
    // The only tables this chain writes are programme state; nothing enrols or arms a sender.
    for (const forbidden of ['figsy_approval_queue', 'figsy_sent_emails', 'figsy_enrollments']) {
      expect(tablesWritten(), `the chain wrote ${forbidden}`).not.toContain(forbidden)
    }
    expect(state.rpcs.filter(r => /send|live|run|enrol/i.test(r))).toEqual([])
  })

  it('🛑 P2 changes MONEY TRUTH ONLY, and leaves the approval identity exactly as frozen', async () => {
    await runChain()
    expect(row().second_payment_ref).toBe('cs_2')
    expect(row().second_paid_at).toBeTruthy()
    // The identity the client actually approved is untouched by the money.
    expect(row().review_preparation_hash).toBe(FROZEN_HASH)
    expect(row().review_preparation_version).toBe(1)
    expect(row().approved_by_kind).toBe('client')
    expect(row().approved_by_user_id).toBe('user-1')
    expect(row().went_live_at).toBeNull()
  })

  it('the end state is exactly where Sprint 3 stops: prepared, frozen, approved, paid — not live', async () => {
    await runChain()
    expect({
      status:   row().status,
      p1:       !!row().first_paid_at,
      frozen:   !!row().review_preparation_hash,
      approved: !!row().approved_at,
      p2:       !!row().second_paid_at,
      live:     row().went_live_at,
      sends:    state.sends.length,
    }).toEqual({ status: 'APPROVED', p1: true, frozen: true, approved: true, p2: true, live: null, sends: 0 })
  })
})

describe('🛑 the chain fails closed, and still sends nothing', () => {
  it('an UNVERIFIED SENDER blocks the freeze — the programme never becomes reviewable', async () => {
    ready.impl = () => ({
      ready: false,
      blockers: [{ key: 'unverified_sender', detail: 'The assigned mailbox has never been verified.' }],
      facts: null, degraded: null,
    })
    await recordFirstPayment({ programmeId: PROGRAMME, sessionId: 'cs_1' })
    row().status = 'SOURCING'
    const advance = await advanceAfterSettlement(PROGRAMME, 'sourcing_run')
    expect(advance.reviewable).toBe(false)
    expect(row().status, 'an unverified sender still reached READY_FOR_APPROVAL').not.toBe('READY_FOR_APPROVAL')
    expect(row().review_preparation_hash, 'a package was frozen without a verified sender').toBeNull()
    expect(state.sends).toEqual([])
  })

  it('🛑 INCOMPLETE PREPARATION cannot fake READY_FOR_APPROVAL', async () => {
    prep.impl = () => ({
      ok: true, complete: false, remaining: 12, total: 246,
      campaigns: ['camp-1'], enrolled: [], alreadyEnrolled: 0, skipped: 0, failed: [], problems: [],
    })
    await recordFirstPayment({ programmeId: PROGRAMME, sessionId: 'cs_1' })
    row().status = 'SOURCING'
    const advance = await advanceAfterSettlement(PROGRAMME, 'sourcing_run')
    expect(advance.reviewable).toBe(false)
    expect(row().status).not.toBe('READY_FOR_APPROVAL')
    expect(state.sends).toEqual([])
  })

  it('🛑 a STALE version cannot approve the current package — and nothing is written', async () => {
    await recordFirstPayment({ programmeId: PROGRAMME, sessionId: 'cs_1' })
    row().status = 'SOURCING'
    await advanceAfterSettlement(PROGRAMME, 'sourcing_run')
    expect(row().review_preparation_hash).toBe(FROZEN_HASH)

    state.writes = []
    const stale = await approveProgrammeAsCustomer(
      CLIENT, PROGRAMME, 'sha256:an-older-package', 'user-1') as { ok: boolean; code?: string }
    expect(stale.ok).toBe(false)
    expect(stale.code).toBe('stale_version')
    expect(row().approved_at, 'a stale version approved the programme').toBeNull()
    expect(row().status).toBe('READY_FOR_APPROVAL')
    expect(state.writes, 'a refused approval wrote something').toEqual([])
    expect(state.sends).toEqual([])
  })

  it('🛑 work that MOVED under the reviewing client cannot be approved on the frozen version', async () => {
    await recordFirstPayment({ programmeId: PROGRAMME, sessionId: 'cs_1' })
    row().status = 'SOURCING'
    await advanceAfterSettlement(PROGRAMME, 'sourcing_run')
    const version = row().review_preparation_hash as string
    expect(version).toBe(FROZEN_HASH)

    // The audience, the wording or the sender changed while they were reading.
    snapshot.impl = () => ({
      ok: true, hash: 'sha256:moved-under-them',
      snapshot: { prospects: 231, messages: 3, cadence: '3 steps', window: 'Mon-Fri 09:00-17:00', sender: 'inbox-2', target: 10 },
    })

    state.writes = []
    // They hold the CORRECT frozen version — the version check passes and drift still refuses.
    const moved = await approveProgrammeAsCustomer(CLIENT, PROGRAMME, version, 'user-1') as
      { ok: boolean; code?: string }
    expect(moved.ok, 'drifted work was approved against the version they read').toBe(false)
    expect(moved.code).toBe('unreadable')
    expect(row().approved_at, 'drifted work recorded an approval').toBeNull()
    expect(row().approved_preparation_hash).toBeNull()
    expect(row().status).toBe('READY_FOR_APPROVAL')
    expect(state.writes, 'a drift-refused approval wrote something').toEqual([])
    expect(state.sends).toEqual([])
  })

  it('🛑 and P2 after a REFUSED approval records money and grants nothing', async () => {
    await recordFirstPayment({ programmeId: PROGRAMME, sessionId: 'cs_1' })
    row().status = 'SOURCING'
    await advanceAfterSettlement(PROGRAMME, 'sourcing_run')
    await approveProgrammeAsCustomer(CLIENT, PROGRAMME, 'wrong', 'user-1')
    const p2 = await recordSecondPayment({ programmeId: PROGRAMME, sessionId: 'cs_2' })
    expect(p2.ok).toBe(true)
    expect(p2.recordedNotLive, 'P2 advanced an unapproved programme').toBe(true)
    expect(row().second_paid_at).toBeTruthy()
    expect(row().approved_at).toBeNull()
    expect(row().went_live_at).toBeNull()
    expect(state.sends).toEqual([])
  })

  it('the whole chain is retry-safe: running it twice changes nothing and still sends nothing', async () => {
    await runChain()
    const after = { ...row() }
    state.sends = []
    const again = await runChain()
    expect(again.p1.alreadyRecorded).toBe(true)
    expect(again.p2.alreadyRecorded).toBe(true)
    expect(row().approved_at).toBe(after.approved_at)
    expect(row().review_preparation_version).toBe(1)
    expect(row().went_live_at).toBeNull()
    expect(state.sends).toEqual([])
  })
})
