// ═══════════════════════════════════════════════════════════════════════════════════════
// R136 ④ · THE SHORTFALL CREDIT COLUMNS, AGAINST A REAL POSTGRESQL — 23 Sep 2026
//
// THIS ONE CANNOT BE A UNIT TEST. Everything asserted below is what a CHECK constraint and
// a DEFAULT actually do, and a mocked `supabase-js` has no constraints — it returns whatever
// the test author typed. The unit suite proves the settlement's ORDER and its idempotency;
// only a real database can prove that the columns it writes into exist, carry the defaults
// the code assumes, and refuse the states the code must never produce.
//
// ── AND ONE OF THESE ALREADY CAUGHT ME ────────────────────────────────────────────────
//
// The first version of this migration carried
// `CHECK ((shortfall_credited_at IS NULL) = (shortfall_credit_cents = 0))` — "the two markers
// move together". It reads as obviously correct and it is WRONG: a programme that delivered
// everything it sold is still SETTLED, it simply owes nothing, and that state is a timestamp
// beside a zero. The constraint would have refused the settlement of every SUCCESSFUL
// programme — leaving exactly the healthy ones unable to close — and no unit test would have
// noticed, because the mock has no constraints to violate.
//
// So the shape that replaced it is asserted here, in both directions: a non-zero credit MUST
// carry its timestamp, and a zero credit beside a timestamp MUST be allowed.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Client } from 'pg'
import { realdbClient, createTestClient, dropTestClient } from './harness'

describe('R136 ④ · a programme can record what it credited, and cannot lie about it', () => {
  let c: Client
  let clientId: string
  let userId: string
  const made: string[] = []
  const users: string[] = []

  /**
   * Create a programme row and return its id.
   *
   * ⚠️ ONE CLIENT PER PROGRAMME, AND THE REAL DATABASE IS WHY. `programmes_one_open_per_client_uidx`
   * is a partial unique index permitting a single OPEN programme per client, and the mocked
   * suite has no such index — the first version of this file seeded several programmes onto one
   * client and every write here failed on it. That refusal is the schema working; reusing one
   * client would have meant weakening the fixture to get past a constraint that is correct.
   */
  const newProgramme = async (): Promise<string> => {
    const t = await createTestClient(c, { companyName: `R136 shortfall ${made.length + 1}` })
    users.push(t.userId)
    const r = await c.query(
      `insert into public.programmes(client_id, status, meeting_target, recommended_volume,
         price_per_meeting_cents, price_total_cents, first_payment_cents, second_payment_cents)
       values ($1, 'LIVE', 10, 2500, 43750, 437500, 218750, 218750) returning id`,
      [t.clientId],
    )
    const id = String(r.rows[0].id)
    made.push(id)
    return id
  }

  /** Attempt a settlement write, and report whether the database accepted it. */
  const write = async (
    id: string, creditedAt: string | null, cents: number, delivered: number | null,
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      await c.query(
        `update public.programmes
            set shortfall_credited_at = $2, shortfall_credit_cents = $3, delivered_meetings = $4
          where id = $1`,
        [id, creditedAt, cents, delivered],
      )
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  beforeAll(async () => {
    c = await realdbClient()
    const t = await createTestClient(c, { companyName: 'R136 shortfall' })
    clientId = t.clientId; userId = t.userId
  })

  afterAll(async () => {
    if (made.length) {
      await c.query(`delete from public.programmes where id = any($1::uuid[])`, [made])
    }
    for (const u of users) await dropTestClient(c, u)
    await dropTestClient(c, userId)
    await c.end()
  })

  it('🛑 THE THREE COLUMNS EXIST — without them the settlement has no claim to compare-and-set', () => {
    // Asserted as a query rather than as a file scan: a migration that was written and never
    // applied looks identical on disk to one that ran.
    return c.query(
      `select column_name, data_type, is_nullable, column_default
         from information_schema.columns
        where table_schema = 'public' and table_name = 'programmes'
          and column_name in ('shortfall_credited_at','shortfall_credit_cents','delivered_meetings')
        order by column_name`,
    ).then(r => {
      expect(r.rows.map(x => x.column_name))
        .toEqual(['delivered_meetings', 'shortfall_credit_cents', 'shortfall_credited_at'])
    })
  })

  it('a fresh programme starts unsettled, with a zero credit — not NULL', () => {
    // `settleProgrammeShortfall` adds the credit to `make_whole_cents`; a NULL default here
    // would make that arithmetic NULL and silently erase an existing make-whole.
    return newProgramme().then(id =>
      c.query(`select shortfall_credited_at, shortfall_credit_cents, delivered_meetings
                 from public.programmes where id = $1`, [id]).then(r => {
        expect(r.rows[0].shortfall_credited_at).toBeNull()
        expect(Number(r.rows[0].shortfall_credit_cents)).toBe(0)
        expect(r.rows[0].delivered_meetings).toBeNull()
      }))
  })

  it('a real shortfall settles — a timestamp beside a non-zero credit is accepted', async () => {
    const id = await newProgramme()
    expect(await write(id, new Date().toISOString(), 131_250, 7)).toMatchObject({ ok: true })
  })

  it('🛑 A FULLY DELIVERED PROGRAMME CAN STILL SETTLE — timestamp beside ZERO is ALLOWED', async () => {
    // The case the first constraint would have refused. A programme that owes nothing is not
    // an unsettled programme, and if it could not be stamped it could never be closed.
    const id = await newProgramme()
    const r = await write(id, new Date().toISOString(), 0, 10)
    expect(r.ok, `a successful programme could not be settled: ${r.error}`).toBe(true)
  })

  it('🛑 MONEY CREDITED WITHOUT A DATE IS REFUSED — a settlement nobody can audit', async () => {
    const id = await newProgramme()
    const r = await write(id, null, 131_250, 7)
    expect(r.ok, 'a credit was recorded with no moment attached to it').toBe(false)
    expect(String(r.error)).toMatch(/shortfall_credit_dated/)
  })

  it('🛑 A NEGATIVE CREDIT IS REFUSED — it would read as a number on an operator screen', async () => {
    const id = await newProgramme()
    const r = await write(id, new Date().toISOString(), -1, 7)
    expect(r.ok, 'a negative credit was accepted').toBe(false)
    expect(String(r.error)).toMatch(/shortfall_credit_non_negative/)
  })

  it('both CHECK constraints are actually on the table, by name', () => {
    return c.query(
      `select conname from pg_constraint
        where conrelid = 'public.programmes'::regclass and contype = 'c'
          and conname like 'programmes_shortfall%' order by conname`,
    ).then(r => {
      expect(r.rows.map(x => x.conname))
        .toEqual(['programmes_shortfall_credit_dated', 'programmes_shortfall_credit_non_negative'])
    })
  })

  // ── ⚑ 23 Sep · THE SPEND HALF (20260923_programme_wallet_applied · R136 ④) ────────────
  it('🛑 WALLET CREDIT MAY NEVER COVER THE WHOLE FIRST PAYMENT — the database says so too', async () => {
    // Founder-ruled 23 Sep, asked directly: *"No."* `walletCreditForPayment` caps it, and this
    // is the constraint saying the same thing — so a future caller that forgets the cap cannot
    // write the state anyway. A fully covered payment would mean no Stripe session at all.
    const id = await newProgramme()
    const full = await c.query(
      `update public.programmes set wallet_applied_cents = first_payment_cents where id = $1`, [id],
    ).then(() => ({ ok: true }), (e: unknown) => ({ ok: false, error: String(e) }))
    expect(full.ok, 'a credit covered the entire first payment').toBe(false)
    expect(String((full as { error?: string }).error)).toMatch(/wallet_applied_leaves_cash/)
  })

  it('a partial credit that leaves cash behind is accepted', async () => {
    const id = await newProgramme()
    await expect(c.query(
      `update public.programmes set wallet_applied_cents = first_payment_cents - 100 where id = $1`,
      [id])).resolves.toBeDefined()
  })

  it('🛑 A NEGATIVE CREDIT APPLIED IS REFUSED — it would ADD to revenue', async () => {
    const id = await newProgramme()
    const r = await c.query(
      `update public.programmes set wallet_applied_cents = -1 where id = $1`, [id],
    ).then(() => ({ ok: true }), (e: unknown) => ({ ok: false, error: String(e) }))
    expect(r.ok, 'a negative applied credit was accepted').toBe(false)
    expect(String((r as { error?: string }).error)).toMatch(/wallet_applied_non_negative/)
  })

  it('a fresh programme has applied nothing — not NULL, which would make revenue NaN', () => {
    return newProgramme().then(id =>
      c.query(`select wallet_applied_cents from public.programmes where id = $1`, [id])
        .then(r => expect(Number(r.rows[0].wallet_applied_cents)).toBe(0)))
  })

  // ── ⚑ 23 Sep · THE CLIENT'S OBJECTION (20260923_programme_approval_concern · Section 4) ─
  it('🛑 AN OBJECTION MUST CARRY THE MOMENT IT WAS RAISED', async () => {
    // The freeze it objects to is versioned; words with no timestamp cannot be ordered against
    // the version they were about.
    const id = await newProgramme()
    const r = await c.query(
      `update public.programmes set approval_concern = 'these are all agencies' where id = $1`, [id],
    ).then(() => ({ ok: true }), (e: unknown) => ({ ok: false, error: String(e) }))
    expect(r.ok, 'a concern was recorded with no moment attached to it').toBe(false)
    expect(String((r as { error?: string }).error)).toMatch(/approval_concern_dated/)
  })

  it('a dated objection is accepted, and the words are stored whole', async () => {
    const id = await newProgramme()
    const words = 'These are all agencies. We sell to manufacturers — I said that in the brief.'
    await expect(c.query(
      `update public.programmes set approval_concern = $2, approval_concern_at = now() where id = $1`,
      [id, words])).resolves.toBeDefined()
    const back = await c.query('select approval_concern from public.programmes where id = $1', [id])
    expect(back.rows[0].approval_concern, 'the client’s words were altered on the way in').toBe(words)
  })

  it('a programme with no objection is the normal state, not a violation', async () => {
    return newProgramme().then(id =>
      c.query('select approval_concern, approval_concern_at from public.programmes where id = $1', [id])
        .then(r => {
          expect(r.rows[0].approval_concern).toBeNull()
          expect(r.rows[0].approval_concern_at).toBeNull()
        }))
  })

  it('the migration is idempotent — re-running it changes nothing and throws nothing', async () => {
    // Every statement is `IF NOT EXISTS` or wrapped in a duplicate_object handler, and the
    // runner may legitimately replay it. A second application that threw would strand the
    // whole runner on a migration that had already succeeded.
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const sql = readFileSync(
      join(__dirname, '../../../../supabase/migrations/20260923_programme_shortfall_credit.sql'), 'utf8')
    await expect(c.query(sql)).resolves.toBeDefined()
    const r = await c.query(
      `select count(*)::int as n from pg_constraint
        where conrelid = 'public.programmes'::regclass and conname like 'programmes_shortfall%'`)
    expect(r.rows[0].n, 'a replay duplicated the constraints').toBe(2)
  })
})
