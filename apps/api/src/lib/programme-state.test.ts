import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── THE PROGRAMME STATE MACHINE AND ITS MONEY — the failure matrix ──────────────────────
//
// These are the states where getting it wrong costs a client money or gives away work that
// was never paid for. Each `it` below is a scenario from the required matrix, and the
// assertions are about REFUSALS: what the code must NOT do when the world arrives out of
// order.
//
// ⚠️ THE DATABASE IS MOCKED, AND THAT LIMIT IS REAL. These prove the service's decisions —
// which state it reads, what it refuses, what it records anyway. The database's own
// guarantees (unique refs, the ceiling CHECK, the settle RPC) are proved as SQL structure in
// `programme-authority-gate.test.ts`. Neither file has run against Postgres: this is
// CODE VERIFIED, not RUNTIME VERIFIED, and the migration is not applied to production.

// ── a small in-memory stand-in for the programmes table ─────────────────────────────────
type Row = Record<string, unknown>
// ⚑ `leads` ADDED BY PR A2. `markReadyForApproval` now asks whether ANY lead positively
// carries the programme — a programme with nothing sourced cannot be put to a client for
// approval. Before this the fake mapped every unknown table onto `programmes`, so the head
// count came back with no `count` at all and the transition was refused for the wrong reason.
const state: { programmes: Row[]; batches: Row[]; commissions: Row[]; ledger: Row[]; leads: Row[]; alerts: string[] } = {
  programmes: [], batches: [], commissions: [], ledger: [], leads: [], alerts: [],
}

/**
 * The mock honours the two guards the real schema enforces, because those guards are the
 * whole point of the tests below: `.is(col, null)` compare-and-set (the webhook idempotency
 * seam) and the partial unique index on payment refs.
 */
function makeTable(name: keyof typeof state) {
  const rows = () => state[name] as Row[]
  const q = {
    _filters: [] as Array<(r: Row) => boolean>,
    _payload: null as Row | null,
    _mode: '' as '' | 'update' | 'insert' | 'select',
    _headCount: false,
    select(_cols?: string, opts?: { count?: string; head?: boolean }) {
      if (opts?.head) this._headCount = true
      if (this._mode === '') this._mode = 'select'; return this
    },
    eq(col: string, val: unknown) { this._filters.push(r => r[col] === val); return this },
    is(col: string, val: unknown) { this._filters.push(r => (r[col] ?? null) === val); return this },
    not(col: string, op: string, list: string | null) {
      // ⚑ `.not(col, 'is', null)` — "IS NOT NULL" — is a different shape from
      // `.not('status', 'in', '(A,B)')`, and the list form would throw on a null argument.
      // `markReadyForApproval` uses the first form to count only reviewable leads.
      if (op === 'is' && list === null) { this._filters.push(r => (r[col] ?? null) !== null); return this }
      const set = String(list).replace(/[()]/g, '').split(',')
      this._filters.push(r => !set.includes(String(r[col]))); return this
    },
    neq(col: string, val: unknown) { this._filters.push(r => r[col] !== val); return this },
    order() { return this },
    limit() { return this },
    insert(payload: Row) { this._mode = 'insert'; this._payload = payload; return this },
    update(payload: Row) { this._mode = 'update'; this._payload = payload; return this },
    _matched() { return rows().filter(r => this._filters.every(f => f(r))) },
    async maybeSingle() { return { data: this._matched()[0] ?? null, error: null } },
    async single() {
      if (this._mode === 'insert') return this._run()
      return { data: this._matched()[0] ?? null, error: null }
    },
    _run() {
      if (this._mode === 'insert') {
        const p = this._payload as Row
        // partial unique index on first/second payment refs
        for (const col of ['first_payment_ref', 'second_payment_ref']) {
          if (p[col] && rows().some(r => r[col] === p[col])) {
            return { data: null, error: { code: '23505', message: 'duplicate key' } }
          }
        }
        const row = { id: `id-${rows().length + 1}`, ...p }
        rows().push(row)
        return { data: row, error: null }
      }
      const hit = this._matched()
      for (const r of hit) Object.assign(r, this._payload)
      return { data: hit, error: null }
    },
    then(res: (v: { data: unknown; error: unknown }) => unknown) {
      // A head count returns `{ data: null, count }` and no rows — the exact supabase-js
      // shape `markReadyForApproval` reads. Answering with rows and no count would make a
      // populated programme look empty.
      if (this._headCount) return Promise.resolve({ data: null, count: this._matched().length, error: null }).then(res)
      return Promise.resolve(this._run()).then(res)
    },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => makeTable(t === 'programme_batches' ? 'batches'
      : t === 'partner_commissions' ? 'commissions'
      : t === 'sourcing_ledger' ? 'ledger'
      : t === 'leads' ? 'leads' : 'programmes'),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn === 'settle_programme_batch') {
        const b = state.batches.find(x => x.id === args.p_batch_id) as Row | undefined
        if (!b || b.status !== 'running') return { data: 0, error: null }
        const p = state.programmes.find(x => x.id === b.programme_id) as Row
        const granted = Number(b.granted)
        const delivered = Math.min(Math.max(Number(args.p_delivered) || 0, 0), granted)
        p.sourced_reserved = Math.max(0, Number(p.sourced_reserved) - granted)
        p.sourced_used = Number(p.sourced_used) + delivered
        b.delivered = delivered
        b.status = delivered > 0 ? 'served' : 'released'
        return { data: delivered, error: null }
      }
      return { data: null, error: null }
    },
  },
}))

// ⚑ PR A2 — OUTREACH PREPARATION IS STUBBED HERE, DELIBERATELY. This file is about what the
// payment and lifecycle writers do to the programme ROW. Whether a programme can actually be
// made operable — campaigns, enrolments, eligibility, pagination — is proved against the real
// implementation in `programme-preparation.test.ts`. Stubbing it lets both BRANCHES of the new
// rule be exercised here: LIVE only when preparation completes, and APPROVED when it does not.
// ⚑ 10 Sep (G) — `calls` COUNTS INVOCATIONS, because "P2 does not prepare" is now a duty and
// a stub that cannot be counted cannot prove it.
const prep: { complete: boolean; calls: number } = { complete: true, calls: 0 }
vi.mock('./programme-preparation', () => ({
  prepareProgrammeOutreach: async () => ({
    ...(prep.calls++, {}),
    ok: prep.complete, complete: prep.complete, remaining: prep.complete ? 0 : 3, total: 3,
    campaigns: ['camp-1'], enrolled: prep.complete ? ['l1'] : [], alreadyEnrolled: 0,
    skipped: 0, failed: [], problems: prep.complete ? [] : ['No ICP is attached to this programme.'],
  }),
  assertGoingLive: async () => ({ ok: true }),
  verifyProgrammeFulfilment: async () => ({ ok: true }),
}))

vi.mock('./alerts', () => ({
  sendFounderAlert: (_k: string, subject: string) => { state.alerts.push(subject); return Promise.resolve() },
}))

import {
  createProgramme, recordFirstPayment, recordSecondPayment, approveProgramme,
  // ⛓️ `markReadyForApproval` is no longer imported here (7 Sep): its own gate is now the
  // canonical preparation rule and is proved in `preparation-readiness.test.ts`.
  pauseProgramme, mayStartCampaign, maySecondCharge, mayComplete,
  completeProgramme, settleBatch, computeContribution, finaliseContribution,
  writeProgrammePartnerCommission, recordDispute, recordMakeWhole, nextBatchSize,
  PROGRAMME_STATUSES, type ProgrammeRow, goLiveProgramme,
} from './programme'

function seed(over: Partial<ProgrammeRow> = {}): ProgrammeRow {
  const p: Row = {
    id: 'prog-1', client_id: 'client-1', status: 'SOURCING_AUTHORISED',
    meeting_target: 10, recommended_volume: 2500,
    price_per_meeting_cents: 43_750, price_total_cents: 437_500,
    first_payment_cents: 218_750, second_payment_cents: 218_750,
    first_payment_ref: 'cs_first', second_payment_ref: null,
    first_paid_at: '2026-08-28T00:00:00Z', second_paid_at: null,
    sourcing_ceiling: 2500, sourced_used: 0, sourced_reserved: 0,
    approved_at: null, went_live_at: null, paused_at: null, pause_reason: null,
    value_settled_at: null, make_whole_cents: 0,
    contribution_cents: null, contribution_finalised_at: null, disputed_at: null,
    ...over,
  }
  state.programmes.push(p)
  return p as unknown as ProgrammeRow
}

beforeEach(() => { state.programmes = []; state.batches = []; state.commissions = []; state.ledger = []; state.leads = []; state.alerts = [] })

describe('① the lifecycle has no PAUSED status — pause is orthogonal', () => {
  it('PAUSED is not a status, and every status is one of the ten', () => {
    expect(PROGRAMME_STATUSES).not.toContain('PAUSED')
    expect(PROGRAMME_STATUSES).toHaveLength(10)
  })

  it('a paused programme KEEPS the state it must return to', () => {
    const p = seed({ status: 'APPROVED' })
    return pauseProgramme(p.id, 'client').then(() => {
      const after = state.programmes[0]
      expect(after.status, 'pausing must not destroy the state').toBe('APPROVED')
      expect(after.paused_at).not.toBeNull()
      expect(after.pause_reason).toBe('client')
    })
  })

  it('a material ICP change is its own pause reason, distinguishable from a client pause', () => {
    const p = seed({ status: 'SOURCING' })
    return pauseProgramme(p.id, 'icp_change').then(() => {
      expect(state.programmes[0].pause_reason).toBe('icp_change')
    })
  })
})

describe('② first payment — replay, ceiling, and NOT starting work', () => {
  it('records the payment, sets the ceiling to the FULL recommended volume, authorises sourcing', () => {
    const p = seed({ status: 'AWAITING_FIRST_PAYMENT', first_payment_ref: null, first_paid_at: null, sourcing_ceiling: 0 })
    return recordFirstPayment({ programmeId: p.id, sessionId: 'cs_1' }).then(r => {
      expect(r.ok).toBe(true)
      const after = state.programmes[0]
      // Half the money, ALL the authority (founder lock 4).
      expect(after.sourcing_ceiling).toBe(2500)
      expect(after.status).toBe('SOURCING_AUTHORISED')
      expect(after.first_payment_ref).toBe('cs_1')
    })
  })

  it('⚠️ A REPLAYED WEBHOOK DOES NOT DOUBLE ANYTHING — same session id is a no-op', () => {
    const p = seed({ status: 'AWAITING_FIRST_PAYMENT', first_payment_ref: null, first_paid_at: null, sourcing_ceiling: 0 })
    return recordFirstPayment({ programmeId: p.id, sessionId: 'cs_1' })
      .then(() => recordFirstPayment({ programmeId: p.id, sessionId: 'cs_1' }))
      .then(r => {
        expect(r.alreadyRecorded).toBe(true)
        expect(state.programmes[0].sourcing_ceiling, 'ceiling must not double').toBe(2500)
      })
  })

  it('⚠️ A DIFFERENT session id on an already-paid programme is REFUSED, not applied', () => {
    // Two real payments for one first stage is a commercial problem, not something to
    // silently absorb by overwriting the reference.
    const p = seed({ first_payment_ref: 'cs_original' })
    return recordFirstPayment({ programmeId: p.id, sessionId: 'cs_other' }).then(r => {
      expect(r.ok).toBe(false)
      expect(r.reason).toMatch(/already has a different first payment/)
      expect(state.programmes[0].first_payment_ref).toBe('cs_original')
    })
  })
})

describe('③ second payment — Go Live, and every reason not to', () => {
  // ⛓️ RETARGETED 10 Sep (G) — THE OLD DUTY WAS THE DEFECT, AND THE FOUNDER'S OWN WORDS SAY SO.
  //
  // These two cases asserted that a successful paid P2 "records and goes LIVE", and that only a
  // FAILED preparation left it APPROVED. R108 records the founder verbatim: *"Approval does not
  // send. **P2 does not Make Live.** Make Live does not broadly enable uncontrolled sending."*
  // So for every paying client the operator's Make Live was skipped — the money arriving armed
  // the programme, activated its campaign and stamped every enrolment due. House, which arms
  // through Make Live, was the only path behaving as ruled.
  //
  // The duty being protected here — "the money is recorded in full, exactly once, and nothing
  // about the operational state is invented from it" — is UNCHANGED and now asserted against
  // the correct outcome: money recorded, status untouched, no go-live, and no preparation run.
  it('records the money in full and does NOT go live — P2 arms nothing', () => {
    prep.complete = true
    prep.calls = 0
    const p = seed({ status: 'APPROVED', approved_at: 'x' })
    return recordSecondPayment({ programmeId: p.id, sessionId: 'cs_2', paymentIntentId: 'pi_2' }).then(r => {
      expect(r.ok).toBe(true)
      expect(state.programmes[0].second_payment_ref, 'the payment is recorded in full').toBe('cs_2')
      expect(state.programmes[0].second_paid_at).not.toBeNull()
      expect(state.programmes[0].second_payment_intent_id).toBe('pi_2')
      // 🛑 THE TWO ASSERTIONS THIS CHANGE EXISTS FOR.
      expect(state.programmes[0].status, 'P2 took the programme live').toBe('APPROVED')
      expect(state.programmes[0].went_live_at ?? null, 'P2 stamped a go-live').toBeNull()
      // ⚠️ AND IT DOES NOT PREPARE EITHER. Post-approval preparation activates the campaign and
      // enrols without `prepareOnly` — that is the arming half of Make Live, and it belongs to
      // the operator act, not to a webhook.
      expect(prep.calls, 'P2 ran outreach preparation').toBe(0)
      // The programme is now APPROVED + paid in full, which the lifecycle reads as
      // `live_ready_to_make_live` with a `make_live_required` task — a control that exists.
      expect(r.recordedNotLive).toBe(true)
    })
  })

  it('🛑 AND A PREPARATION THAT COULD NOT COMPLETE IS IRRELEVANT TO P2', () => {
    // Same outcome whatever preparation would have said, because P2 no longer asks it. The
    // money is still recorded in full; the operational decision belongs to Make Live.
    prep.complete = false
    prep.calls = 0
    const p = seed({ status: 'APPROVED', approved_at: 'x' })
    return recordSecondPayment({ programmeId: p.id, sessionId: 'cs_2', paymentIntentId: 'pi_2' }).then(r => {
      expect(r.ok).toBe(true)
      expect(state.programmes[0].second_payment_ref, 'the payment is recorded in full').toBe('cs_2')
      expect(state.programmes[0].status, 'it must NOT be live').toBe('APPROVED')
      expect(state.programmes[0].went_live_at ?? null, 'and must not claim a go-live').toBeNull()
      expect(prep.calls, 'P2 ran outreach preparation').toBe(0)
    })
  })

  it('…and a retry once preparation can complete takes it live, without a second payment', () => {
    prep.complete = false
    const p = seed({ status: 'APPROVED', approved_at: 'x' })
    return recordSecondPayment({ programmeId: p.id, sessionId: 'cs_2' })
      .then(() => { prep.complete = true; return goLiveProgramme(p.id) })
      .then(r => {
        expect(r.ok).toBe(true)
        expect(state.programmes[0].status).toBe('LIVE')
        expect(state.programmes[0].went_live_at).not.toBeNull()
        expect(state.programmes[0].second_payment_ref, 'the original payment still stands').toBe('cs_2')
      })
  })

  it('⚠️ A STALE CHECKOUT PAID WHILE PAUSED RECORDS THE MONEY AND DOES NOT GO LIVE', () => {
    // The exact race: a checkout is created while APPROVED, the client pauses, then pays.
    // The URL is not authority — programme state is. The money is a fact and is recorded;
    // acting on it is a separate decision, and a human is told.
    const p = seed({ status: 'APPROVED', paused_at: '2026-08-28T10:00:00Z', pause_reason: 'client' })
    return recordSecondPayment({ programmeId: p.id, sessionId: 'cs_2' }).then(r => {
      expect(r.ok).toBe(true)
      expect(r.recordedNotLive).toBe(true)
      const after = state.programmes[0]
      expect(after.second_payment_ref, 'the money MUST be recorded').toBe('cs_2')
      expect(after.status, 'but the programme must NOT go live').toBe('APPROVED')
      expect(after.went_live_at).toBeNull()
      expect(state.alerts.join(' ')).toMatch(/did NOT go live/)
    })
  })

  it('⚠️ AN OUT-OF-ORDER SECOND PAYMENT DOES NOT SKIP APPROVAL', () => {
    // Arrival order never overrides state: a second payment landing while the programme is
    // still SOURCING must not carry it past the one programme-level approval.
    const p = seed({ status: 'SOURCING' })
    return recordSecondPayment({ programmeId: p.id, sessionId: 'cs_2' }).then(r => {
      expect(r.recordedNotLive).toBe(true)
      expect(state.programmes[0].status).toBe('SOURCING')
      expect(state.programmes[0].went_live_at).toBeNull()
    })
  })

  it('⚠️ A REPLAYED SECOND WEBHOOK DOES NOT GO LIVE TWICE', () => {
    const p = seed({ status: 'APPROVED' })
    return recordSecondPayment({ programmeId: p.id, sessionId: 'cs_2' })
      .then(() => { const t = state.programmes[0].went_live_at; return recordSecondPayment({ programmeId: p.id, sessionId: 'cs_2' }).then(r => ({ r, t })) })
      .then(({ r, t }) => {
        expect(r.alreadyRecorded).toBe(true)
        expect(state.programmes[0].went_live_at, 'went_live_at must not be re-stamped').toBe(t)
      })
  })

  it('⚠️ PAUSED BEFORE GO LIVE MEANS THE SECOND 50% IS NOT CHARGED AT ALL', () => {
    // Founder lock 6. Refusing only at the webhook would take the money first and then
    // refuse to act on it — so the charge itself must not be offered.
    const paused = seed({ status: 'APPROVED', paused_at: 'now' })
    expect(maySecondCharge(paused as ProgrammeRow).allowed).toBe(false)
    expect(maySecondCharge(paused as ProgrammeRow).reason).toMatch(/Paused before Go Live/)
  })

  it('the second charge is refused for a programme that is not APPROVED, or already live', () => {
    expect(maySecondCharge(seed({ status: 'SOURCING', id: 'p2' }) as ProgrammeRow).allowed).toBe(false)
    expect(maySecondCharge(seed({ status: 'LIVE', went_live_at: 'x', id: 'p3' }) as ProgrammeRow).allowed).toBe(false)
  })
})

describe('④ no campaign starts without the second payment', () => {
  it('⚠️ APPROVED BUT UNPAID CANNOT START — the founder-locked gate', () => {
    const p = seed({ status: 'APPROVED', second_paid_at: null, second_payment_ref: null })
    const g = mayStartCampaign(p as ProgrammeRow)
    expect(g.allowed).toBe(false)
    expect(g.reason).toMatch(/second payment has not been received/)
  })

  it('LIVE and paid may start', () => {
    const p = seed({ status: 'LIVE', second_paid_at: 'x', second_payment_ref: 'cs_2', went_live_at: 'x' })
    expect(mayStartCampaign(p as ProgrammeRow).allowed).toBe(true)
  })

  it('a paused LIVE programme may not start or continue', () => {
    const p = seed({ status: 'LIVE', second_paid_at: 'x', second_payment_ref: 'cs_2', paused_at: 'now' })
    expect(mayStartCampaign(p as ProgrammeRow).allowed).toBe(false)
  })
})

describe('⑤ approval is ONE programme-level decision', () => {
  it('only from READY_FOR_APPROVAL', () => {
    const p = seed({ status: 'SOURCING' })
    return approveProgramme(p.id).then(r => {
      expect(r.ok).toBe(false)
      expect(r.reason).toMatch(/Cannot approve from SOURCING/)
    })
  })

  it('never while paused', () => {
    const p = seed({ status: 'READY_FOR_APPROVAL', paused_at: 'now' })
    return approveProgramme(p.id).then(r => expect(r.ok).toBe(false))
  })

  it('READY_FOR_APPROVAL → APPROVED stamps approved_at', () => {
    // ⛓️ 7 Sep — THIS CASE IS ABOUT `approveProgramme`, SO IT NO LONGER DRIVES THE PROGRAMME
    // THROUGH `markReadyForApproval` TO GET THERE. That transition now consults the canonical
    // preparation rule (batch, campaign, sequence, messaging, cadence, sender, enrolments,
    // freeze — preparation-readiness.ts), because a programme with leads and nothing else was
    // being offered to the client for approval. Seeding the STATUS directly keeps this test
    // measuring the thing it is named for; reaching it through a fifteen-condition gate would
    // make an approval test fail for reasons that have nothing to do with approval.
    // The gate itself is proved in `preparation-readiness.test.ts` and in `house-authority`.
    const p = seed({ status: 'READY_FOR_APPROVAL' })
    // The reviewable lead stays: it is the state a READY_FOR_APPROVAL programme really is in,
    // and removing it would make this fixture describe a programme that could not exist.
    state.leads.push({
      id: 'lead-1', programme_id: p.id, delivered_at: 'd', surfaced_for_approval_at: 's',
      revealed_at: null, status: 'scored',
    })
    // ⚑ 8 Sep — approval COPIES the reviewed snapshot rather than taking a fresh one, so a
    // programme that was never frozen for review cannot be approved. Frozen here from the
    // fixture's own state, the way `markReadyForApproval` does in production — a typed-in
    // constant would make the comparison a tautology.
    return import('./preparation-snapshot')
      .then(({ buildPreparationSnapshot }) => buildPreparationSnapshot(p.id))
      .then(snap => {
        expect(snap.ok, 'the fixture cannot describe its own prepared work').toBe(true)
        if (snap.ok) {
          const row = state.programmes[0] as Record<string, unknown>
          row.review_preparation_hash = snap.hash
          row.review_preparation_snapshot = snap.snapshot
        }
      })
      .then(() => approveProgramme(p.id))
      .then(r => {
        expect(r.ok).toBe(true)
        expect(state.programmes[0].status).toBe('APPROVED')
        expect(state.programmes[0].approved_at).not.toBeNull()
      })
  })
})

describe('⑥ batches reserve and release — paid entitlement is never stranded silently', () => {
  it('the next batch is ~250, or whatever authority remains', () => {
    expect(nextBatchSize(seed({ sourcing_ceiling: 2500, id: 'a' }) as ProgrammeRow)).toBe(250)
    expect(nextBatchSize(seed({ sourcing_ceiling: 2500, sourced_used: 2400, id: 'b' }) as ProgrammeRow)).toBe(100)
    expect(nextBatchSize(seed({ sourcing_ceiling: 2500, sourced_used: 2500, id: 'c' }) as ProgrammeRow)).toBe(0)
  })

  it('⚠️ A PROVIDER RETURNING ZERO RELEASES THE RESERVATION — the client keeps their volume', () => {
    // The 25 Aug shape: reserve 20, PDL returns nothing. Consuming at grant time would burn
    // paid entitlement for records that never existed.
    const p = seed({ sourced_reserved: 250 })
    state.batches.push({ id: 'b1', programme_id: p.id, seq: 1, requested: 250, granted: 250, status: 'running' })
    return settleBatch('b1', 0).then(() => {
      expect(state.programmes[0].sourced_reserved, 'reservation must be released').toBe(0)
      expect(state.programmes[0].sourced_used, 'nothing was delivered, so nothing is used').toBe(0)
      expect(state.batches[0].status).toBe('released')
    })
  })

  it('a partial delivery uses what arrived and releases the rest', () => {
    const p = seed({ sourced_reserved: 250 })
    state.batches.push({ id: 'b1', programme_id: p.id, seq: 1, requested: 250, granted: 250, status: 'running' })
    return settleBatch('b1', 180).then(() => {
      expect(state.programmes[0].sourced_used).toBe(180)
      expect(state.programmes[0].sourced_reserved).toBe(0)
      expect(state.batches[0].status).toBe('served')
    })
  })

  it('⚠️ SETTLING TWICE DOES NOT RELEASE TWICE', () => {
    const p = seed({ sourced_reserved: 250 })
    state.batches.push({ id: 'b1', programme_id: p.id, seq: 1, requested: 250, granted: 250, status: 'running' })
    return settleBatch('b1', 100)
      .then(() => settleBatch('b1', 100))
      .then(() => {
        expect(state.programmes[0].sourced_used, 'a replay must not add the delivery again').toBe(100)
        expect(state.programmes[0].sourced_reserved).toBe(0)
      })
  })
})

describe('⑦ unused value never expires', () => {
  it('⚠️ A PROGRAMME WITH UNDELIVERED AUTHORISED VOLUME CANNOT COMPLETE', () => {
    const p = seed({ status: 'LIVE', sourcing_ceiling: 2500, sourced_used: 900 })
    const g = mayComplete(p as ProgrammeRow)
    expect(g.allowed).toBe(false)
    expect(g.reason).toMatch(/1600 of 2500 authorised leads are undelivered/)
    return completeProgramme(p.id).then(r => {
      expect(r.ok).toBe(false)
      expect(state.programmes[0].status, 'must not silently complete').toBe('LIVE')
    })
  })

  it('it CAN complete once the volume is delivered', () => {
    const p = seed({ status: 'LIVE', sourcing_ceiling: 2500, sourced_used: 2500 })
    return completeProgramme(p.id).then(r => {
      expect(r.ok).toBe(true)
      expect(state.programmes[0].status).toBe('COMPLETED')
    })
  })

  it('or once a human settles the value — make-whole is a delivery obligation, not a refund', () => {
    const p = seed({ status: 'LIVE', sourcing_ceiling: 2500, sourced_used: 900 })
    return recordMakeWhole(p.id, 50_000, 'Could not deliver the remaining volume')
      .then(() => completeProgramme(p.id))
      .then(r => {
        expect(r.ok).toBe(true)
        expect(state.programmes[0].make_whole_cents).toBe(50_000)
        expect(state.programmes[0].value_settled_at).not.toBeNull()
        expect(state.alerts.join(' ')).toMatch(/make-whole/i)
      })
  })
})

describe('⑧ contribution — provisional while live, persisted once, and never gross', () => {
  it('⚠️ A LIVE PROGRAMME’S CONTRIBUTION IS PROVISIONAL AND IS NOT PERSISTED', () => {
    const p = seed({ status: 'LIVE', second_paid_at: 'x', sourced_used: 1000 })
    state.ledger.push({ programme_id: p.id, cost_usd: 280 })
    return computeContribution(p.id).then(b => {
      expect(b!.provisional).toBe(true)
      expect(b!.estimated, 'ai/sending/stripe are rates, not measurements').toBe(true)
      expect(state.programmes[0].contribution_cents, 'nothing is written while live').toBeNull()
    })
  })

  it('refuses to finalise a non-terminal programme', () => {
    const p = seed({ status: 'LIVE' })
    return finaliseContribution(p.id).then(r => {
      expect(r.ok).toBe(false)
      expect(r.reason).toMatch(/only on a terminal programme/)
    })
  })

  it('contribution uses COLLECTED revenue, not the quoted price', () => {
    // A programme that took only its first payment contributes only that. Counting the full
    // price would inflate contribution — and a partner's commission — on unpaid money.
    const p = seed({ status: 'COMPLETED', value_settled_at: 'x', second_paid_at: null, sourced_used: 0 })
    return computeContribution(p.id).then(b => {
      expect(b!.revenueCents).toBe(218_750) // first only
      expect(b!.revenueCents).toBeLessThan(437_500)
    })
  })

  it('make-whole reduces contribution — value we gave back is not contribution', () => {
    const p = seed({ status: 'COMPLETED', value_settled_at: 'x', second_paid_at: 'x', make_whole_cents: 20_000, sourced_used: 0 })
    return computeContribution(p.id).then(b => {
      expect(b!.revenueCents).toBe(437_500 - 20_000)
    })
  })

  it('finalises once and stamps the time', () => {
    const p = seed({ status: 'COMPLETED', value_settled_at: 'x', second_paid_at: 'x', sourced_used: 0 })
    return finaliseContribution(p.id).then(r => {
      expect(r.ok).toBe(true)
      expect(state.programmes[0].contribution_finalised_at).not.toBeNull()
      const first = state.programmes[0].contribution_cents
      return finaliseContribution(p.id).then(() => {
        expect(state.programmes[0].contribution_cents, 'a second call must not recompute').toBe(first)
      })
    })
  })
})

describe('⑨ partner commission — 25% of finalised contribution, never of revenue', () => {
  it('⚠️ REFUSES A PROGRAMME WHOSE CONTRIBUTION IS NOT FINALISED', () => {
    const p = seed({ status: 'LIVE', contribution_cents: null })
    return writeProgrammePartnerCommission({ programmeId: p.id, partnerId: 'ptr-1', periodMonth: '2026-08' }).then(r => {
      expect(r.ok).toBe(false)
      expect(r.reason).toMatch(/not finalised/)
      expect(state.commissions, 'no commission row may exist').toHaveLength(0)
    })
  })

  it('writes 25% of contribution, with the basis recorded', () => {
    const p = seed({ status: 'COMPLETED', contribution_cents: 300_000, contribution_finalised_at: 'x' })
    return writeProgrammePartnerCommission({ programmeId: p.id, partnerId: 'ptr-1', periodMonth: '2026-08' }).then(r => {
      expect(r.ok).toBe(true)
      expect(r.cents).toBe(75_000)
      expect(state.commissions[0].basis, 'the row must say which basis it used').toBe('programme_contribution')
      expect(state.commissions[0].programme_id).toBe(p.id)
    })
  })

  it('⚠️ THE COMMISSION IS NOT 25% OF THE PROGRAMME PRICE', () => {
    // The defect this whole naming exists to prevent. 25% of the $4,375 price is $1,093.75;
    // 25% of a $3,000 contribution is $750. A row carrying the first would overpay by ~46%.
    const p = seed({ status: 'COMPLETED', contribution_cents: 300_000, contribution_finalised_at: 'x', price_total_cents: 437_500 })
    return writeProgrammePartnerCommission({ programmeId: p.id, partnerId: 'ptr-1', periodMonth: '2026-08' }).then(() => {
      expect(state.commissions[0].amount_usd).toBe(750)
      expect(state.commissions[0].amount_usd).not.toBe(437_500 * 0.25 / 100)
    })
  })
})

describe('⑩ disputes stop delivery and preserve evidence', () => {
  it('⚠️ A CHARGEBACK CANNOT BE REFUSED BY CODE — it is recorded, and delivery stops', () => {
    const p = seed({ status: 'LIVE', second_paid_at: 'x' })
    return recordDispute(p.id, 'Stripe charge.dispute.created').then(() => {
      const after = state.programmes[0]
      expect(after.disputed_at).not.toBeNull()
      expect(after.paused_at, 'delivery must stop').not.toBeNull()
      expect(after.status, 'the programme is NOT deleted — it is evidence').toBe('LIVE')
      expect(state.alerts.join(' ')).toMatch(/disputed/i)
    })
  })
})

describe('⑪ one open programme per client', () => {
  it('a second open programme is refused', () => {
    seed({ status: 'SOURCING' })
    return createProgramme('client-1', 10).then(r => {
      expect(r.ok).toBe(false)
      expect(r.reason).toMatch(/already has an open programme/)
    })
  })

  it('a client whose programme is COMPLETED may open another', () => {
    seed({ status: 'COMPLETED' })
    return createProgramme('client-1', 3).then(r => {
      expect(r.ok).toBe(true)
      // and the stored money is the curve's, derived once
      expect(r.programme!.price_total_cents).toBe(134_167)
      expect(r.programme!.first_payment_cents + r.programme!.second_payment_cents).toBe(134_167)
      expect(r.programme!.recommended_volume).toBe(750)
    })
  })
})
