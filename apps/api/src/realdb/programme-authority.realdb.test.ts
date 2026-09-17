// ═══════════════════════════════════════════════════════════════════════════════════════
// XC-13 + J12-C0 · PROGRAMME AUTHORITY UNDER PROVIDER FAILURE — AGAINST THE REAL DATABASE
//
// ⛓️ 18 Sep — THIS FILE EXISTS BECAUSE MY BATCH 1 RETURN WAS WRONG. It said of XC-13
// *"Real-DB: not required"*. The frozen manifest marks the item **Real-DB YES**, and the
// manifest is right: the reservation half of this item is not TypeScript at all.
//
// ── WHY A UNIT TEST CANNOT PROVE ANY OF THIS ───────────────────────────────────────────
//
// `classifyProviderFailure` is pure and is fully unit-tested (`provider-failure.test.ts`).
// What it CANNOT prove is the half that actually protects a client's paid volume, because
// every one of these lives inside PostgreSQL:
//
//   · `try_reserve_programme_sourcing` re-reads the ceiling INSIDE the UPDATE's WHERE clause
//     (`sourced_used + sourced_reserved + v_granted <= sourcing_ceiling`). Whether that
//     actually refuses a second concurrent reservation is a question about row locking under
//     two committed transactions. A mocked `db.rpc` returns whatever the test author types.
//   · `claim_programme_batch` serialises claimers with `FOR UPDATE` on the programme row and
//     is backed by `programme_batches_one_running_uidx` (partial unique WHERE status =
//     'running'). Idempotency-under-retry is the behaviour of that lock and that index.
//   · `settle_programme_batch` converts reserved→used for what was delivered and RELEASES the
//     remainder. A provider failure delivers ZERO, so the release is the whole thing.
//
// ⚠️ NO PROVIDER IS CALLED AND NO MONEY MOVES. The failure classes come from
// `classifyProviderFailure` (pure), and what is exercised here is the DATABASE's response to
// each one. The connection is the disposable harness cluster — `assertDisposable` refuses any
// host that is not loopback and any database not named `kind_test`.
//
// ── WHAT IT PROVES, IN THE ORDER THE CONTRACT ASKS ─────────────────────────────────────
//
//   ① one programme authority reservation;
//   ② concurrent / double reservation cannot exceed authority;
//   ③ provider failure releases / settles correctly;
//   ④ quota_exhausted / failed state persists correctly;
//   ⑤ retry cannot double-reserve or double-spend authority.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'

// ⚠️ HOISTED, and it is a PLACEHOLDER THAT IS NEVER USED. `provider-failure.ts` imports the
// Apollo error classes from `apollo.ts`, which reaches `@kind/db`, whose client throws at
// module scope without these — and a static import runs before any plain top-level statement.
// 🛑 NOTHING IN THIS FILE TALKS TO SUPABASE. Every database call below goes through the `pg`
// client pointed at the disposable harness cluster; this URL exists only so a module graph can
// load, and it addresses no project (`127.0.0.1:54321` has nothing listening).
vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://127.0.0.1:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})

import { Client } from 'pg'
import { realdbClient, realdbUrl, createTestClient, dropTestClient } from './harness'
import { classifyProviderFailure, PROVIDER_FAILURE_CLASSES } from '../lib/provider-failure'
import { ApolloCreditsExhaustedError, ApolloRateLimitError } from '../lib/apollo'

type Batch = {
  id: string; programme_id: string; seq: number
  requested: number; granted: number; delivered: number | null; status: string
}
type Authority = { sourcing_ceiling: number; sourced_used: number; sourced_reserved: number }

describe('XC-13 · programme authority under provider failure', () => {
  let c: Client
  const userIds: string[] = []

  /** A client with an authorised programme. Ceiling is the client's PAID volume. */
  const newProgramme = async (ceiling: number, status = 'SOURCING_AUTHORISED') => {
    const { clientId, userId } = await createTestClient(c)
    userIds.push(userId)
    // ⚠️ SEVEN COLUMNS ARE NOT NULL WITH NO DEFAULT — `meeting_target`, `recommended_volume`
    // and the five commercial ones. The harness taught me that one column at a time on the
    // first three runs, and it is exactly the class of fact a mocked insert never mentions:
    // a programme row cannot exist without its commercial terms, which is correct and is
    // invisible to every unit test in the repo.
    //
    // The money values are plausible-but-irrelevant here: nothing below reads a price. What
    // is under test is the AUTHORITY columns (`sourcing_ceiling`, `sourced_used`,
    // `sourced_reserved`), which is why those are the only ones the assertions touch.
    const r = await c.query<{ id: string }>(
      `insert into public.programmes(
         client_id, status, sourcing_ceiling, meeting_target, recommended_volume,
         price_per_meeting_cents, price_total_cents, first_payment_cents, second_payment_cents)
       values ($1, $2, $3, 5, $3, 50000, 250000, 125000, 125000) returning id`,
      [clientId, status, ceiling],
    )
    // An ICP too: `icp_run_outcomes.icp_id` is NOT NULL, because a run outcome with no
    // targeting attached is not attributable to anything. Another schema fact the real
    // database supplied and no mock would have.
    const icp = await c.query<{ id: string }>(
      `insert into public.icps(client_id, name) values ($1, 'Realdb authority probe') returning id`,
      [clientId],
    )
    return { clientId, programmeId: r.rows[0].id, icpId: icp.rows[0].id }
  }

  const reserve = async (programmeId: string, requested: number, on: Client = c): Promise<number> => {
    const r = await on.query<{ granted: number }>(
      'select public.try_reserve_programme_sourcing($1::uuid, $2::int) as granted',
      [programmeId, requested],
    )
    return r.rows[0].granted
  }

  const authority = async (programmeId: string): Promise<Authority> => {
    const r = await c.query<Authority>(
      'select sourcing_ceiling, sourced_used, sourced_reserved from public.programmes where id = $1',
      [programmeId],
    )
    return r.rows[0]
  }

  const claimBatch = async (programmeId: string, requested: number, granted: number, on: Client = c): Promise<Batch> => {
    const r = await on.query<Batch>(
      'select * from public.claim_programme_batch($1::uuid, $2::int, $3::int)',
      [programmeId, requested, granted],
    )
    return r.rows[0]
  }

  const settle = async (batchId: string, delivered: number): Promise<number> => {
    const r = await c.query<{ n: number }>(
      'select public.settle_programme_batch($1::uuid, $2::int) as n',
      [batchId, delivered],
    )
    return r.rows[0].n
  }

  const recordOutcome = async (clientId: string, icpId: string, status: string, requested: number, inserted: number) => {
    await c.query(
      `insert into public.icp_run_outcomes(client_id, icp_id, status, records_requested, pool_served, total_inserted)
       values ($1, $2, $3, $4, 0, $5)`,
      [clientId, icpId, status, requested, inserted],
    )
  }

  beforeAll(async () => { c = await realdbClient() })
  afterAll(async () => {
    if (!c) return
    for (const id of userIds) await dropTestClient(c, id)
    await c.end()
  })
  beforeEach(async () => {
    // The harness database is deliberately reused between runs, so a case that counts rows
    // must start from a known state — the order-dependence lesson from the XC-5 real-DB file.
    if (!c) return
    await c.query('delete from public.icp_run_outcomes where client_id in (select id from public.clients where user_id = any($1::uuid[]))', [userIds])
  })

  // ── ① ONE RESERVATION ─────────────────────────────────────────────────────────

  it('① reserves against the programme ceiling, and only against the programme', async () => {
    const { programmeId } = await newProgramme(100)
    expect(await reserve(programmeId, 40)).toBe(40)
    const a = await authority(programmeId)
    expect(a.sourced_reserved).toBe(40)
    // 🛑 RESERVED IS NOT USED. Nothing has been delivered yet, and conflating the two is how
    // a client's paid volume disappears on a run that returned nothing.
    expect(a.sourced_used).toBe(0)
  })

  it('① a reservation is clamped to the room left, never granted beyond the ceiling', async () => {
    const { programmeId } = await newProgramme(30)
    expect(await reserve(programmeId, 250)).toBe(30)
    expect((await authority(programmeId)).sourced_reserved).toBe(30)
    // And the next one gets nothing at all rather than a negative or a wrap.
    expect(await reserve(programmeId, 10)).toBe(0)
  })

  it('① a PAUSED or unauthorised programme reserves NOTHING', async () => {
    const paused = await newProgramme(100)
    await c.query('update public.programmes set paused_at = now() where id = $1', [paused.programmeId])
    expect(await reserve(paused.programmeId, 20)).toBe(0)

    const draft = await newProgramme(100, 'DRAFT')
    expect(await reserve(draft.programmeId, 20)).toBe(0)
    // ⚠️ AUTHORITY IS THE PROGRAMME'S STATE, not the caller's intention. A DRAFT programme has
    // not been paid for, and the caller cannot know that — only this function can.
    expect((await authority(draft.programmeId)).sourced_reserved).toBe(0)
  })

  // ── ② CONCURRENCY ─────────────────────────────────────────────────────────────

  it('② two reservations cannot together exceed the ceiling', async () => {
    // ⚠️ THIS CASE PROVES THE CLAMPING, NOT THE RACE. Two fast callers frequently serialise,
    // and then the second one simply sees the true remaining room — which is the correct
    // answer either way, so it would pass even against a check-then-write implementation.
    // The ten-way case below is the one that reliably interleaves, and it is the one that
    // caught the deliberately-broken function (see this file's teeth proof in the return).
    const { programmeId } = await newProgramme(100)
    const other = new Client({ connectionString: realdbUrl() })
    await other.connect()
    try {
      const [x, y] = await Promise.all([
        reserve(programmeId, 60, c),
        reserve(programmeId, 60, other),
      ])
      // One gets 60; the other is clamped to the 40 that is genuinely left. Never 60 + 60.
      expect([x, y].sort((p, q) => p - q)).toEqual([40, 60])
      expect(x + y).toBe(100)
      const a = await authority(programmeId)
      expect(a.sourced_reserved).toBe(100)
      expect(a.sourced_reserved + a.sourced_used).toBeLessThanOrEqual(a.sourcing_ceiling)
    } finally {
      await other.end().catch(() => {})
    }
  })

  it('② ten concurrent reservations never over-commit the client\'s paid volume', async () => {
    // 🛑 THE ONE THAT CANNOT BE MOCKED, AND THE ONE WITH TEETH. Ten callers read the same room
    // and all ten write. The refusal lives in the UPDATE's own WHERE clause re-checking the
    // ceiling under a row lock — a check-then-write in TypeScript would grant 10 × 10 against
    // a ceiling of 50. Proven by removing that re-check in the disposable database: this case
    // went RED and no other did.
    const { programmeId } = await newProgramme(50)
    const conns: Client[] = []
    try {
      for (let i = 0; i < 10; i++) {
        const k = new Client({ connectionString: realdbUrl() })
        await k.connect()
        conns.push(k)
      }
      const grants = await Promise.all(conns.map(k => reserve(programmeId, 10, k)))
      const total = grants.reduce((s, n) => s + n, 0)
      // 🛑 THE INVARIANT, AND IT IS THE WHOLE POINT OF THE ITEM: the sum of everything ever
      // granted is bounded by the ceiling, however many callers race.
      expect(total).toBe(50)
      const a = await authority(programmeId)
      expect(a.sourced_reserved).toBe(50)
      expect(a.sourced_reserved + a.sourced_used).toBeLessThanOrEqual(a.sourcing_ceiling)
    } finally {
      for (const k of conns) await k.end().catch(() => {})
    }
  })

  it('② and the TABLE ITSELF refuses an over-commit — defence in depth, not one guard', async () => {
    // 🛑 FOUND BY BREAKING THE FUNCTION ON PURPOSE. With the ceiling re-check removed, the
    // over-commit did not slip through silently: it was refused by
    // `programmes_ceiling_check: CHECK ((sourced_used + sourced_reserved) <= sourcing_ceiling)`,
    // a constraint I did not know was there. That is the difference between one guard and two,
    // and it deserves its own assertion rather than being a lucky by-product.
    const { programmeId } = await newProgramme(50)
    await reserve(programmeId, 50)
    await expect(c.query(
      'update public.programmes set sourced_reserved = sourced_reserved + 1 where id = $1',
      [programmeId],
    )).rejects.toThrow(/programmes_ceiling_check|violates check constraint/i)
    // The row is unchanged: a refused write leaves the client's authority exactly as it was.
    const a = await authority(programmeId)
    expect(a.sourced_reserved).toBe(50)
    expect(a.sourced_used + a.sourced_reserved).toBe(a.sourcing_ceiling)
  })

  it('② two CONCURRENT batch claims produce ONE running batch, not two', async () => {
    // Each running batch holds its own reservation against the same paid ceiling, so two of
    // them is a double-spend waiting to happen. `claim_programme_batch` returns the batch that
    // already exists rather than failing — which is what makes a retry safe (⑤).
    const { programmeId } = await newProgramme(200)
    const other = new Client({ connectionString: realdbUrl() })
    await other.connect()
    try {
      const [a, b] = await Promise.all([
        claimBatch(programmeId, 20, 20, c),
        claimBatch(programmeId, 20, 20, other),
      ])
      expect(a.id).toBe(b.id)
      const { rows } = await c.query<{ n: string }>(
        `select count(*)::text as n from public.programme_batches
          where programme_id = $1 and status = 'running'`, [programmeId],
      )
      expect(Number(rows[0].n)).toBe(1)
    } finally {
      await other.end().catch(() => {})
    }
  })

  it('② and the partial unique index refuses a second running batch written directly', async () => {
    // The backstop, proven separately from the RPC: if anything ever writes this table
    // without going through the function, the database still refuses.
    const { programmeId } = await newProgramme(200)
    await claimBatch(programmeId, 10, 10)
    await expect(c.query(
      `insert into public.programme_batches(programme_id, seq, requested, granted, status)
       values ($1, 999, 10, 10, 'running')`, [programmeId],
    )).rejects.toThrow(/programme_batches_one_running_uidx|duplicate key/i)
  })

  // ── ③ PROVIDER FAILURE RELEASES ───────────────────────────────────────────────

  it('③ EVERY provider failure class releases the reservation in full — zero delivered', async () => {
    // 🛑 THE HOUSE-009 DEFECT FROM THE OTHER END. `openBatch` reserves before the search and
    // `settleBatch` converts after it; a throw between the two skipped the settle, so a
    // client's paid volume stayed reserved against a batch that delivered nothing — for ever,
    // until somebody reconciled by hand.
    const failures: [string, unknown][] = [
      ['unauthorised', new Error('Apollo 401: unauthorized')],
      ['payment_required', new Error('Apollo 402: payment required')],
      ['credits_exhausted', new ApolloCreditsExhaustedError()],
      ['rate_limited', new ApolloRateLimitError()],
      ['provider_error', new Error('Apollo answered HTTP 503')],
      ['timeout', new Error('the request timed out after 20000ms')],
      ['malformed', new SyntaxError('Unexpected token < in JSON at position 0')],
    ]
    // Every class the contract names is covered — not a sample of them.
    expect(failures.map(([k]) => k).sort()).toEqual([...PROVIDER_FAILURE_CLASSES].sort())

    for (const [name, err] of failures) {
      const verdict = classifyProviderFailure(err)
      expect(verdict.klass, name).toBe(name)
      expect(verdict.releaseReservation, name).toBe(true)

      const { programmeId } = await newProgramme(100)
      const granted = await reserve(programmeId, 20)
      expect(granted, name).toBe(20)
      const batch = await claimBatch(programmeId, 20, granted)
      expect(batch.status, name).toBe('running')

      // The provider then fails. `releaseReservation` means settle with ZERO delivered.
      const converted = await settle(batch.id, 0)
      expect(converted, `${name}: nothing was delivered, so nothing may be converted`).toBe(0)

      const a = await authority(programmeId)
      expect(a.sourced_used, `${name}: a failed run consumed paid volume`).toBe(0)
      expect(a.sourced_reserved, `${name}: the reservation was not released`).toBe(0)

      const after = await c.query<{ status: string; delivered: number | null }>(
        'select status, delivered from public.programme_batches where id = $1', [batch.id],
      )
      expect(after.rows[0].status, name).toBe('released')
      expect(after.rows[0].delivered, name).toBe(0)
    }
  })

  it('③ a PARTIAL delivery converts what arrived and releases the rest', async () => {
    // A provider that returns 7 of 20 is not a failure, and the 13 must not be consumed —
    // unused programme value never expires (founder lock 6).
    const { programmeId } = await newProgramme(100)
    await reserve(programmeId, 20)
    const batch = await claimBatch(programmeId, 20, 20)
    expect(await settle(batch.id, 7)).toBe(7)
    const a = await authority(programmeId)
    expect(a.sourced_used).toBe(7)
    expect(a.sourced_reserved).toBe(0)
    expect((await c.query<{ status: string }>('select status from public.programme_batches where id=$1', [batch.id])).rows[0].status).toBe('served')
  })

  it('③ a settle can never convert MORE than was granted', async () => {
    // A provider reporting more than it was asked for, or a caller passing the wrong count,
    // must not be able to spend past the client's authority.
    const { programmeId } = await newProgramme(100)
    await reserve(programmeId, 20)
    const batch = await claimBatch(programmeId, 20, 20)
    await settle(batch.id, 999)
    const a = await authority(programmeId)
    expect(a.sourced_used).toBeLessThanOrEqual(20)
    expect(a.sourced_used + a.sourced_reserved).toBeLessThanOrEqual(a.sourcing_ceiling)
  })

  // ── ④ THE RUN STATE PERSISTS ──────────────────────────────────────────────────

  it('④ quota_exhausted and failed are the two states, and they persist distinctly', async () => {
    // 🛑 "OUT OF CREDITS" AND "APOLLO IS DOWN" WERE THE SAME ROW. They need different
    // answers — one is a top-up, one is a wait — and the run-outcome table already carried
    // the distinction; nothing was writing it.
    const { clientId, icpId } = await newProgramme(100)
    const credits = classifyProviderFailure(new ApolloCreditsExhaustedError())
    const down = classifyProviderFailure(new Error('Apollo answered HTTP 503'))
    expect(credits.runStatus).toBe('quota_exhausted')
    expect(down.runStatus).toBe('failed')

    await recordOutcome(clientId, icpId, credits.runStatus, 20, 0)
    await recordOutcome(clientId, icpId, down.runStatus, 20, 0)

    const { rows } = await c.query<{ status: string }>(
      'select status from public.icp_run_outcomes where client_id = $1 order by status', [clientId],
    )
    expect(rows.map(r => r.status)).toEqual(['failed', 'quota_exhausted'])
  })

  it('④ NO failure class may persist as no_match — the database refuses the others too', async () => {
    // ⚠️ THE LIE THIS PREVENTS. `no_match` renders as *"No leads matched this ICP. Try
    // widening it"* — a statement about the client's audience, from a search that never ran.
    for (const klass of PROVIDER_FAILURE_CLASSES) {
      const err = new Error(`Apollo ${klass} synthetic`)
      void err
    }
    for (const e of [new Error('Apollo 401'), new ApolloCreditsExhaustedError(), new Error('timed out'), new SyntaxError('x')]) {
      expect(classifyProviderFailure(e).runStatus).not.toBe('no_match')
    }
    // And the column is constrained, so a future caller cannot invent a status either.
    const { clientId, icpId } = await newProgramme(10)
    await expect(recordOutcome(clientId, icpId, 'exploded', 20, 0)).rejects.toThrow(/icp_run_outcomes_status_check|violates check constraint/i)
  })

  it('④ a failed run records ZERO inserted, beside the released authority', async () => {
    const { clientId, icpId, programmeId } = await newProgramme(100)
    await reserve(programmeId, 20)
    const batch = await claimBatch(programmeId, 20, 20)
    const verdict = classifyProviderFailure(new Error('Apollo answered HTTP 500'))
    await settle(batch.id, 0)
    await recordOutcome(clientId, icpId, verdict.runStatus, 20, 0)
    const { rows } = await c.query<{ status: string; total_inserted: number; records_requested: number }>(
      'select status, total_inserted, records_requested from public.icp_run_outcomes where client_id = $1', [clientId],
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe('failed')
    expect(rows[0].total_inserted).toBe(0)
    expect(rows[0].records_requested).toBe(20)
    expect((await authority(programmeId)).sourced_reserved).toBe(0)
  })

  // ── ⑤ RETRY ───────────────────────────────────────────────────────────────────

  it('⑤ a RETRY after a provider failure cannot double-reserve the ceiling', async () => {
    // 🛑 THE SEQUENCE THAT MATTERS. Reserve 20 → Apollo 503 → release → the operator or the
    // recovery path tries again. The second attempt must consume the SAME 20 of authority,
    // not a second 20.
    const { programmeId } = await newProgramme(20)
    const first = await reserve(programmeId, 20)
    const b1 = await claimBatch(programmeId, 20, first)
    await settle(b1.id, 0)                                     // provider failed
    expect((await authority(programmeId)).sourced_reserved).toBe(0)

    const second = await reserve(programmeId, 20)              // the retry
    expect(second).toBe(20)                                    // the same 20, released and re-taken
    const a = await authority(programmeId)
    expect(a.sourced_reserved).toBe(20)
    expect(a.sourced_used).toBe(0)
    expect(a.sourced_used + a.sourced_reserved).toBeLessThanOrEqual(a.sourcing_ceiling)
  })

  it('⑤ a replayed SETTLE is a no-op — never a second conversion', async () => {
    // A retried settle (a dropped response, a re-delivered webhook, an operator pressing
    // twice) must not convert the same delivery again.
    const { programmeId } = await newProgramme(100)
    await reserve(programmeId, 20)
    const batch = await claimBatch(programmeId, 20, 20)
    expect(await settle(batch.id, 12)).toBe(12)
    const once = await authority(programmeId)
    expect(await settle(batch.id, 12)).toBe(0)
    const twice = await authority(programmeId)
    expect(twice.sourced_used, 'a replay spent the client\'s volume twice').toBe(once.sourced_used)
    expect(twice.sourced_reserved).toBe(once.sourced_reserved)
  })

  it('⑤ a retried CLAIM returns the running batch, so no second reservation is opened', async () => {
    const { programmeId } = await newProgramme(200)
    await reserve(programmeId, 20)
    const a = await claimBatch(programmeId, 20, 20)
    const b = await claimBatch(programmeId, 20, 20)
    expect(b.id).toBe(a.id)
    expect(b.seq).toBe(a.seq)
    const { rows } = await c.query<{ n: string }>(
      `select count(*)::text as n from public.programme_batches where programme_id = $1`, [programmeId],
    )
    expect(Number(rows[0].n)).toBe(1)
  })

  it('⑤ the whole failure-then-retry-then-succeed cycle spends the ceiling exactly once', async () => {
    // The end-to-end shape, because each step above proves one link and the client's invariant
    // is about the WHOLE sequence: a 20-lead ceiling delivers 20 leads, once.
    const { programmeId } = await newProgramme(20)
    for (const failure of [new ApolloRateLimitError(), new Error('Apollo answered HTTP 502')]) {
      const v = classifyProviderFailure(failure)
      expect(v.releaseReservation).toBe(true)
      const g = await reserve(programmeId, 20)
      const b = await claimBatch(programmeId, 20, g)
      await settle(b.id, 0)
    }
    const g = await reserve(programmeId, 20)
    const b = await claimBatch(programmeId, 20, g)
    expect(await settle(b.id, 20)).toBe(20)

    const a = await authority(programmeId)
    expect(a.sourced_used).toBe(20)
    expect(a.sourced_reserved).toBe(0)
    // 🛑 THE CLIENT-FACING INVARIANT: two provider failures cost the client nothing.
    expect(a.sourced_used).toBe(a.sourcing_ceiling)
    expect(await reserve(programmeId, 1)).toBe(0)
  })
})
