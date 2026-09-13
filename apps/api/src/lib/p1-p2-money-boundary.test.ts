import { describe, it, expect, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════════════
// R3 — WHAT THE TWO PAYMENTS ARE ALLOWED TO CAUSE, DRIVEN THROUGH THE REAL FUNCTIONS.
//
// ── WHY THIS FILE EXISTS ───────────────────────────────────────────────────────────────
//
// R108, founder-locked, verbatim: *"Approval does not send. **P2 does not Make Live.** Make
// Live does not broadly enable uncontrolled sending."* And P1 authorises sourcing and
// preparation — nothing else.
//
// Both rules were protected mainly by reading the source. That proves a line exists; it does
// not prove that calling the function writes only what it is allowed to write. This drives
// `recordFirstPayment` and `recordSecondPayment` for real against a fake database and asserts
// the PERSISTED patch.
//
// ── 🛑 THE SIDE-EFFECT ASSERTION IS AN ALLOWLIST, NOT A SPOT-CHECK ────────────────────
//
// Every table written, every RPC called and every outbound send seam is recorded, and the
// write set must be EXACTLY `programmes` with an empty RPC list and zero sends. Naming the
// forbidden fields would pass for every field nobody thought of — which is precisely how a
// payment came to arm a programme once before (the 10 Sep correction this file now guards).
// ═══════════════════════════════════════════════════════════════════════════════════════

type Row = Record<string, unknown>

const state = {
  programmes: [] as Row[],
  /** Every table written, in order, with the exact patch. */
  writes: [] as { table: string; op: 'update' | 'insert' | 'upsert'; patch: Row }[],
  /** Every RPC invoked. Must stay empty. */
  rpcs: [] as string[],
  /** Every outbound seam touched. Must stay empty for external delivery. */
  sends: [] as string[],
  /** Internal founder alerts are allowed and recorded separately — they are not client sends. */
  alerts: [] as string[],
}

function table(name: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rows = () => (name === 'programmes' ? state.programmes : [])
  const q: Record<string, unknown> = {
    select() { return q },
    eq(c: string, v: unknown) { filters.push(r => r[c] === v); return q },
    is(c: string, v: unknown) { filters.push(r => (r[c] ?? null) === (v ?? null)); return q },
    not(c: string, _o: string, v: unknown) { filters.push(r => (r[c] ?? null) !== v); return q },
    order() { return q }, limit() { return q }, or() { return q },
    async single() { const h = rows().filter(r => filters.every(f => f(r))); return { data: h[0] ?? null, error: null } },
    async maybeSingle() { const h = rows().filter(r => filters.every(f => f(r))); return { data: h[0] ?? null, error: null } },
    insert(patch: Row) {
      state.writes.push({ table: name, op: 'insert', patch })
      return { select: () => ({ async single() { return { data: patch, error: null } } }),
               then: (r: (v: unknown) => unknown) => r({ data: [patch], error: null }) }
    },
    upsert(patch: Row) {
      state.writes.push({ table: name, op: 'upsert', patch })
      return { then: (r: (v: unknown) => unknown) => r({ data: null, error: null }) }
    },
    update(patch: Row) {
      state.writes.push({ table: name, op: 'update', patch })
      const u: Record<string, unknown> = {
        eq(c: string, v: unknown) { filters.push(r => r[c] === v); return u },
        is(c: string, v: unknown) { filters.push(r => (r[c] ?? null) === (v ?? null)); return u },
        select() {
          // The compare-and-set: only rows matching EVERY filter are updated, exactly as
          // `.is('first_payment_ref', null)` intends. A loser updates zero rows.
          const hit = rows().filter(r => filters.every(f => f(r)))
          hit.forEach(r => Object.assign(r, patch))
          return { then: (res: (v: unknown) => unknown) => res({ data: hit, error: null }) }
        },
        then: (res: (v: unknown) => unknown) => {
          const hit = rows().filter(r => filters.every(f => f(r)))
          hit.forEach(r => Object.assign(r, patch))
          return res({ data: hit, error: null })
        },
      }
      return u
    },
    then(resolve: (v: unknown) => unknown) {
      return resolve({ data: rows().filter(r => filters.every(f => f(r))), error: null })
    },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => table(t),
    rpc: async (name: string) => { state.rpcs.push(name); return { data: null, error: null } },
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  },
}))
// Internal operator alert — allowed, and recorded so "it told a human" is provable.
vi.mock('./alerts', () => ({
  sendFounderAlert: async (kind: string) => { state.alerts.push(kind) },
}))
// 🛑 EVERY OUTBOUND CLIENT-FACING SEAM. If a payment ever reaches one of these, it shows here.
vi.mock('./email', () => ({
  sendTx:            async () => { state.sends.push('email:sendTx'); return null },
  sendWelcomeEmail:  async () => { state.sends.push('email:welcome') },
  sendConsentEmail:  async () => { state.sends.push('email:consent') },
}))
vi.mock('./mailer', () => ({
  sendMail: async () => { state.sends.push('mailer:sendMail'); return null },
}))

const PROGRAMME_ID = 'prog-1'

/** A programme as it stands the moment before the payment being tested. */
const programme = (o: Row): Row => ({
  id: PROGRAMME_ID, client_id: 'client-1',
  status: 'RECOMMENDED', paused_at: null, pause_reason: null,
  meeting_target: 10, recommended_volume: 400,
  price_total_cents: 500000, first_payment_cents: 250000, second_payment_cents: 250000,
  recommendation_accepted_at: '2026-09-12T09:00:00.000Z',
  first_payment_ref: null, first_payment_intent_id: null, first_paid_at: null,
  first_authorised_at: null, sourcing_ceiling: null,
  second_payment_ref: null, second_payment_intent_id: null, second_paid_at: null,
  second_authorised_at: null,
  approved_at: null, approved_by: null, went_live_at: null,
  preparation_version: null, reviewed_snapshot_sha: null,
  ...o,
})

const row = () => state.programmes[0]
/** The set of tables this call wrote to. The allowlist assertion. */
const tablesWritten = () => [...new Set(state.writes.map(w => w.table))]
/** Every field the call actually persisted, merged. */
const persisted = () => state.writes.reduce((a, w) => ({ ...a, ...w.patch }), {} as Row)

beforeEach(() => {
  vi.resetModules()
  state.programmes = []
  state.writes = []
  state.rpcs = []
  state.sends = []
  state.alerts = []
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 R3.1 · P1 AUTHORISES SOURCING AND PREPARATION — AND NOTHING ELSE', () => {
  it('a valid first payment sets the sourcing authority and the ceiling', async () => {
    state.programmes = [programme({})]
    const { recordFirstPayment } = await import('./programme')
    const r = await recordFirstPayment({ programmeId: PROGRAMME_ID, sessionId: 'cs_1', paymentIntentId: 'pi_1' })
    expect(r.ok).toBe(true)
    expect(row().status).toBe('SOURCING_AUTHORISED')
    expect(row().first_payment_ref).toBe('cs_1')
    expect(row().first_paid_at).toBeTruthy()
    // The ceiling comes from the recommended volume, not the payment amount — half the money,
    // all of the authority (founder lock 4).
    expect(row().sourcing_ceiling).toBe(400)
  })

  it('🛑 it grants NO approval, NO live and NO run authority — asserted on the persisted row', async () => {
    state.programmes = [programme({})]
    const { recordFirstPayment } = await import('./programme')
    await recordFirstPayment({ programmeId: PROGRAMME_ID, sessionId: 'cs_1' })
    expect(row().approved_at, 'P1 approved the programme').toBeNull()
    expect(row().approved_by).toBeNull()
    expect(row().went_live_at, 'P1 made the programme live').toBeNull()
    expect(row().status).not.toBe('APPROVED')
    expect(row().status).not.toBe('LIVE')
  })

  it('🛑 THE ALLOWLIST: it writes ONLY `programmes`, calls NO rpc, and sends NOTHING', async () => {
    state.programmes = [programme({})]
    const { recordFirstPayment } = await import('./programme')
    await recordFirstPayment({ programmeId: PROGRAMME_ID, sessionId: 'cs_1' })
    expect(tablesWritten()).toEqual(['programmes'])
    expect(state.rpcs).toEqual([])
    expect(state.sends, `P1 reached an outbound seam: ${state.sends.join(', ')}`).toEqual([])
  })

  it('🛑 and the persisted patch contains no approval/live/run field at all', async () => {
    state.programmes = [programme({})]
    const { recordFirstPayment } = await import('./programme')
    await recordFirstPayment({ programmeId: PROGRAMME_ID, sessionId: 'cs_1' })
    const patch = persisted()
    for (const forbidden of ['approved_at', 'approved_by', 'went_live_at', 'run_at', 'last_run_at']) {
      expect(patch, `P1 wrote ${forbidden}`).not.toHaveProperty(forbidden)
    }
    expect(Object.keys(patch).sort()).toEqual([
      'first_paid_at', 'first_payment_intent_id', 'first_payment_ref',
      'sourcing_ceiling', 'status', 'updated_at',
    ])
  })

  it('P1 is distinct from recommendation acceptance — it neither requires nor writes it here', async () => {
    // Acceptance is enforced at `checkout/first` before a session is ever minted; the webhook
    // records the money and must not restate or manufacture the client's agreement.
    state.programmes = [programme({ recommendation_accepted_at: '2026-09-12T09:00:00.000Z' })]
    const { recordFirstPayment } = await import('./programme')
    await recordFirstPayment({ programmeId: PROGRAMME_ID, sessionId: 'cs_1' })
    expect(persisted()).not.toHaveProperty('recommendation_accepted_at')
    expect(row().recommendation_accepted_at).toBe('2026-09-12T09:00:00.000Z')
  })
})

describe('🛑 R3.7 · P1 replay and authority conflicts', () => {
  it('🛑 a REDELIVERED webhook is idempotent — no second authority, no second write', async () => {
    state.programmes = [programme({})]
    const { recordFirstPayment } = await import('./programme')
    await recordFirstPayment({ programmeId: PROGRAMME_ID, sessionId: 'cs_1' })
    const after = { ...row() }
    state.writes = []
    const again = await recordFirstPayment({ programmeId: PROGRAMME_ID, sessionId: 'cs_1' })
    expect(again).toEqual({ ok: true, alreadyRecorded: true })
    expect(state.writes, 'a redelivered webhook wrote again').toEqual([])
    expect(row().first_paid_at).toBe(after.first_paid_at)
  })

  it('🛑 a DIFFERENT session against a paid programme is refused, and writes nothing', async () => {
    state.programmes = [programme({ first_payment_ref: 'cs_1', first_paid_at: '2026-09-12T10:00:00.000Z' })]
    const { recordFirstPayment } = await import('./programme')
    const r = await recordFirstPayment({ programmeId: PROGRAMME_ID, sessionId: 'cs_2' })
    expect(r.ok).toBe(false)
    expect(state.writes).toEqual([])
  })

  it('🛑 money cannot be recorded against INTERNAL P1 authority — one authority per stage', async () => {
    state.programmes = [programme({ first_authorised_at: '2026-09-12T08:00:00.000Z' })]
    const { recordFirstPayment } = await import('./programme')
    const r = await recordFirstPayment({ programmeId: PROGRAMME_ID, sessionId: 'cs_1' })
    expect(r.ok).toBe(false)
    expect(String(r.reason)).toContain('INTERNAL P1 authority')
    expect(state.writes, 'House internal authority was overwritten by a payment').toEqual([])
  })

  it('an unknown programme is refused and writes nothing', async () => {
    const { recordFirstPayment } = await import('./programme')
    const r = await recordFirstPayment({ programmeId: 'nope', sessionId: 'cs_1' })
    expect(r.ok).toBe(false)
    expect(state.writes).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 R3.5 · P2 IS MONEY ONLY — it does not Make Live, Run or send', () => {
  const approved = () => programme({
    status: 'APPROVED',
    first_payment_ref: 'cs_1', first_paid_at: '2026-09-12T10:00:00.000Z', sourcing_ceiling: 400,
    approved_at: '2026-09-13T08:00:00.000Z', approved_by: 'user-1',
    preparation_version: 'v1', reviewed_snapshot_sha: 'sha-v1',
  })

  it('a valid second payment records the money', async () => {
    state.programmes = [approved()]
    const { recordSecondPayment } = await import('./programme')
    const r = await recordSecondPayment({ programmeId: PROGRAMME_ID, sessionId: 'cs_2', paymentIntentId: 'pi_2' })
    expect(r.ok).toBe(true)
    expect(row().second_payment_ref).toBe('cs_2')
    expect(row().second_paid_at).toBeTruthy()
  })

  it('🛑 …and DOES NOT make the programme live — the founder\'s own sentence, asserted on the row', async () => {
    state.programmes = [approved()]
    const { recordSecondPayment } = await import('./programme')
    await recordSecondPayment({ programmeId: PROGRAMME_ID, sessionId: 'cs_2' })
    expect(row().went_live_at, 'P2 made the programme live').toBeNull()
    expect(row().status, 'P2 moved the programme to LIVE').toBe('APPROVED')
  })

  it('🛑 THE ALLOWLIST: P2 writes ONLY `programmes`, calls NO rpc, and sends NOTHING', async () => {
    state.programmes = [approved()]
    const { recordSecondPayment } = await import('./programme')
    await recordSecondPayment({ programmeId: PROGRAMME_ID, sessionId: 'cs_2' })
    expect(tablesWritten()).toEqual(['programmes'])
    expect(state.rpcs).toEqual([])
    expect(state.sends, `P2 reached an outbound seam: ${state.sends.join(', ')}`).toEqual([])
  })

  it('🛑 the persisted patch is money and nothing else', async () => {
    state.programmes = [approved()]
    const { recordSecondPayment } = await import('./programme')
    await recordSecondPayment({ programmeId: PROGRAMME_ID, sessionId: 'cs_2', paymentIntentId: 'pi_2' })
    const patch = persisted()
    expect(Object.keys(patch).sort()).toEqual([
      'second_paid_at', 'second_payment_intent_id', 'second_payment_ref', 'updated_at',
    ])
    for (const forbidden of ['status', 'went_live_at', 'approved_at', 'approved_by']) {
      expect(patch, `P2 wrote ${forbidden}`).not.toHaveProperty(forbidden)
    }
  })

  it('🛑 P2 DOES NOT OVERWRITE THE APPROVAL IDENTITY it was paid against', async () => {
    state.programmes = [approved()]
    const { recordSecondPayment } = await import('./programme')
    await recordSecondPayment({ programmeId: PROGRAMME_ID, sessionId: 'cs_2' })
    expect(row().approved_at).toBe('2026-09-13T08:00:00.000Z')
    expect(row().approved_by).toBe('user-1')
    expect(row().preparation_version).toBe('v1')
    expect(row().reviewed_snapshot_sha).toBe('sha-v1')
  })
})

describe('🛑 R3.7 · P2 out of order, paused, and replayed', () => {
  it('🛑 P2 BEFORE APPROVAL records the money but grants nothing — arrival order never overrides state', async () => {
    state.programmes = [programme({
      status: 'SOURCING_AUTHORISED',
      first_payment_ref: 'cs_1', first_paid_at: '2026-09-12T10:00:00.000Z',
    })]
    const { recordSecondPayment } = await import('./programme')
    const r = await recordSecondPayment({ programmeId: PROGRAMME_ID, sessionId: 'cs_2' })
    expect(r.ok).toBe(true)
    expect(r.recordedNotLive).toBe(true)
    // Money that arrived is a fact…
    expect(row().second_payment_ref).toBe('cs_2')
    // …and it bought nothing.
    expect(row().status).toBe('SOURCING_AUTHORISED')
    expect(row().approved_at).toBeNull()
    expect(row().went_live_at).toBeNull()
    // A human is told, through the internal alert seam — not through a client-facing send.
    expect(state.alerts).toContain('payment_failed')
    expect(state.sends).toEqual([])
  })

  it('🛑 a PAUSED programme records the money and does not advance', async () => {
    state.programmes = [programme({
      status: 'APPROVED', approved_at: '2026-09-13T08:00:00.000Z',
      paused_at: '2026-09-13T09:00:00.000Z', pause_reason: 'client asked',
      first_payment_ref: 'cs_1',
    })]
    const { recordSecondPayment } = await import('./programme')
    const r = await recordSecondPayment({ programmeId: PROGRAMME_ID, sessionId: 'cs_2' })
    expect(r.recordedNotLive).toBe(true)
    expect(row().second_paid_at).toBeTruthy()
    expect(row().went_live_at).toBeNull()
    expect(state.sends).toEqual([])
  })

  it('🛑 a REDELIVERED P2 webhook is idempotent — no duplicate downstream authority', async () => {
    state.programmes = [programme({
      status: 'APPROVED', approved_at: '2026-09-13T08:00:00.000Z', first_payment_ref: 'cs_1',
    })]
    const { recordSecondPayment } = await import('./programme')
    await recordSecondPayment({ programmeId: PROGRAMME_ID, sessionId: 'cs_2' })
    state.writes = []
    const again = await recordSecondPayment({ programmeId: PROGRAMME_ID, sessionId: 'cs_2' })
    expect(again.ok).toBe(true)
    expect(again.alreadyRecorded).toBe(true)
    expect(state.writes, 'a redelivered P2 wrote again').toEqual([])
    expect(row().went_live_at).toBeNull()
  })

  it('🛑 a DIFFERENT second session against a paid programme is refused, and writes nothing', async () => {
    state.programmes = [programme({ status: 'APPROVED', second_payment_ref: 'cs_2', first_payment_ref: 'cs_1' })]
    const { recordSecondPayment } = await import('./programme')
    const r = await recordSecondPayment({ programmeId: PROGRAMME_ID, sessionId: 'cs_3' })
    expect(r.ok).toBe(false)
    expect(state.writes).toEqual([])
  })

  it('🛑 money cannot be recorded against INTERNAL P2 authority', async () => {
    state.programmes = [programme({ status: 'APPROVED', second_authorised_at: '2026-09-13T08:00:00.000Z' })]
    const { recordSecondPayment } = await import('./programme')
    const r = await recordSecondPayment({ programmeId: PROGRAMME_ID, sessionId: 'cs_2' })
    expect(r.ok).toBe(false)
    expect(String(r.reason)).toContain('INTERNAL P2 authority')
    expect(state.writes).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 R3.6 · ZERO EXTERNAL DELIVERY ACROSS THE WHOLE MONEY PATH', () => {
  it('🛑 P1 → P2, end to end, reaches NO outbound seam even once', async () => {
    state.programmes = [programme({})]
    const { recordFirstPayment, recordSecondPayment } = await import('./programme')

    await recordFirstPayment({ programmeId: PROGRAMME_ID, sessionId: 'cs_1' })
    expect(state.sends, 'P1 sent something').toEqual([])

    // The programme is approved between the two payments — by the approval path, not here.
    Object.assign(row(), { status: 'APPROVED', approved_at: '2026-09-13T08:00:00.000Z' })

    await recordSecondPayment({ programmeId: PROGRAMME_ID, sessionId: 'cs_2' })
    expect(state.sends, 'P2 sent something').toEqual([])

    // The end state the certification stops at: prepared, approved, paid in full — NOT live.
    expect(row().first_paid_at).toBeTruthy()
    expect(row().second_paid_at).toBeTruthy()
    expect(row().approved_at).toBeTruthy()
    expect(row().went_live_at, 'the money path made the programme live').toBeNull()
    expect(row().status).toBe('APPROVED')

    // 🛑 THE WHOLE POINT: external delivery count across the entire money path.
    expect(state.sends).toHaveLength(0)
    expect(state.rpcs).toEqual([])
    expect(tablesWritten()).toEqual(['programmes'])
  })

  it('🛑 Make Live remains a SEPARATE authority — nothing on this path stamps `went_live_at`', async () => {
    state.programmes = [programme({ status: 'APPROVED', approved_at: '2026-09-13T08:00:00.000Z', first_payment_ref: 'cs_1' })]
    const { recordSecondPayment } = await import('./programme')
    await recordSecondPayment({ programmeId: PROGRAMME_ID, sessionId: 'cs_2' })
    const everyPatch = JSON.stringify(state.writes)
    expect(everyPatch, 'the money path stamped went_live_at').not.toContain('went_live_at')
    expect(everyPatch, 'the money path set LIVE').not.toContain('LIVE')
  })
})
