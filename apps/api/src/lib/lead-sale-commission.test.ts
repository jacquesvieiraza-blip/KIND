import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ── PARTNER COMMISSION ON THE LEAD SALE — founder-locked 19 Aug 2026 ──────────────────────
//
// THE RULING: *"no 25% does not include the $299 nor the 100 leads we give. its everything
// after this or above this"* · *"lifetime. if they looking after their client its theirs."* ·
// *"she earns on leads purchased not when they top up... we earn money when they buy leads."*
//
// ⚠️ WHAT THESE TESTS ARE REALLY GUARDING, because it is not a rate.
//
// Before this change the code did the EXACT INVERSE of the ruling: commission fired on three
// Stripe events (pack checkout, credit-bundle top-up, subscription renewal), so the $299 pack
// paid 20% and the $4 approval paid NOTHING — and could not, because an approval is a wallet
// deduction (`try_charge_wallet`) that never touches Stripe at all.
//
// So the risk being guarded is not "wrong percentage". It is:
//   • the pack quietly still paying (the largest commission event that used to exist),
//   • a top-up paying (which would make her earnings track money-in, not leads bought),
//   • the included 100 paying (they must never charge, so they must never commission),
//   • one lead paying twice on a retried approval.
//
// The three red proofs the founder asked for are the first three describes. The rest guard
// the invariants that make them stay true.

const state = {
  referral: null as { id: string; partner_id: string } | null,
  inserted: [] as Record<string, unknown>[],
  insertError: null as { message: string; code?: string } | null,
  /** Every reference already written — the stand-in for the partial unique index. */
  seenRefs: new Set<string>(),
}

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const q: Record<string, unknown> = {
        select() { return q },
        eq() { return q },
        async maybeSingle() {
          if (table === 'partner_referrals') return { data: state.referral, error: null }
          return { data: null, error: null }
        },
        insert(row: Record<string, unknown>) {
          if (table !== 'partner_commissions') return Promise.resolve({ data: null, error: null })
          if (state.insertError) return Promise.resolve({ data: null, error: state.insertError })
          // THE DATABASE GUARD, MODELLED HONESTLY. The real protection is the partial unique
          // index on (partner_id, stripe_ref) — an app-level "check then insert" is exactly
          // the race #351 was. So this mock rejects the SECOND write of a reference rather
          // than letting the code's own check be the thing under test.
          const key = `${row.partner_id}|${row.stripe_ref}`
          if (state.seenRefs.has(key)) {
            return Promise.resolve({ data: null, error: { message: 'duplicate key value violates unique constraint', code: '23505' } })
          }
          state.seenRefs.add(key)
          state.inserted.push(row)
          return Promise.resolve({ data: null, error: null })
        },
      }
      return q
    },
  },
}))
vi.mock('./alerts', () => ({ sendFounderAlert: async () => undefined }))

const PARTNER_REFERRAL = { id: 'ref1', partner_id: 'p1' }

beforeEach(() => {
  state.referral = null
  state.inserted = []
  state.insertError = null
  state.seenRefs = new Set()
})

async function mod() { return await import('./lead-sale-commission') }

/** Local rounding twin, so the test does not import the thing it is testing to check itself. */
const roundHalfUp = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

describe('RED PROOF (a) — a $299 pack purchase creates ZERO commission rows', () => {
  it('the pack is not a lead sale, so nothing in this module can be reached by it', async () => {
    // The pack is a Stripe checkout. After 19 Aug NOTHING in routes/stripe.ts calls a
    // commission writer at all — asserted against the source, because the strongest proof
    // that a payment pays no commission is that no call site exists.
    const src = readFileSync(join(__dirname, '../routes/stripe.ts'), 'utf8')
    expect(src).not.toContain('maybeCreatePartnerCommission(')
    expect(src).not.toContain('recordLeadSaleCommission(')
  })

  it('and the writer it replaced is GONE, not merely uncalled', async () => {
    // An intact function nobody calls reads as live to the next person and to every grep.
    const src = readFileSync(join(__dirname, '../routes/stripe.ts'), 'utf8')
    expect(src).not.toContain('async function maybeCreatePartnerCommission')
    expect(src, 'the removal must be explained where it stood').toContain('COMMISSION REMOVED HERE 19 Aug 2026')
  })

  it('a pack-covered approval (the included 100) writes NOTHING even on the new path', async () => {
    const { recordLeadSaleCommission } = await mod()
    state.referral = PARTNER_REFERRAL

    // moneyMoved=false is what approve-lead passes for an approval inside the included 100.
    await recordLeadSaleCommission('c1', 'lead-1', false)

    expect(state.inserted, 'the 100 included approvals must earn nobody anything').toEqual([])
  })
})

describe('RED PROOF (b) — a $4 lead charge on a partner client pays exactly $1.00, once', () => {
  it('writes ONE row, and the amount is DERIVED from the constant, never typed', async () => {
    const { recordLeadSaleCommission, leadSaleCommissionUsd } = await mod()
    const { LEAD_PRICE_USD, PARTNER_COMMISSION_PCT } = await import('@kind/shared')
    state.referral = PARTNER_REFERRAL

    await recordLeadSaleCommission('c1', 'lead-1', true)

    expect(state.inserted).toHaveLength(1)
    const row = state.inserted[0]
    expect(row.amount_usd).toBe(leadSaleCommissionUsd())
    expect(row.amount_usd, 'derived, not the literal 1').toBe((LEAD_PRICE_USD * PARTNER_COMMISSION_PCT) / 100)
    expect(row.commission_type).toBe('lead_sale')
    expect(row.partner_id).toBe('p1')
    expect(row.client_id).toBe('c1')
  })

  it('a RETRIED approval of the same lead cannot double-pay — the unique index wins', async () => {
    const { recordLeadSaleCommission } = await mod()
    state.referral = PARTNER_REFERRAL

    await recordLeadSaleCommission('c1', 'lead-1', true)
    await recordLeadSaleCommission('c1', 'lead-1', true)   // the retry
    await recordLeadSaleCommission('c1', 'lead-1', true)   // and again

    expect(state.inserted, '#351 was a double-pay; the guard is the DATABASE, not a read-then-write').toHaveLength(1)
  })

  it('the idempotency key is the lead — the SAME reference the $4 ledger row uses', async () => {
    const { recordLeadSaleCommission, leadCommissionRef } = await mod()
    state.referral = PARTNER_REFERRAL

    await recordLeadSaleCommission('c1', 'lead-42', true)

    expect(state.inserted[0].stripe_ref).toBe(leadCommissionRef('lead-42'))
    expect(state.inserted[0].stripe_ref).toBe('lead:lead-42')
  })

  it('a DIFFERENT lead for the same client pays again — lifetime, not once per client', async () => {
    const { recordLeadSaleCommission } = await mod()
    state.referral = PARTNER_REFERRAL

    await recordLeadSaleCommission('c1', 'lead-1', true)
    await recordLeadSaleCommission('c1', 'lead-2', true)
    await recordLeadSaleCommission('c1', 'lead-3', true)

    expect(state.inserted, '*"lifetime. if they looking after their client its theirs."*').toHaveLength(3)
  })
})

describe('RED PROOF (c) — the same $4 charge on a HOUSE client creates ZERO rows', () => {
  it('no partner referral means no commission, and it is not an error', async () => {
    const { recordLeadSaleCommission } = await mod()
    state.referral = null   // a direct/house client

    await recordLeadSaleCommission('house-client', 'lead-1', true)

    expect(state.inserted).toEqual([])
  })
})

describe('the invariants that keep the three proofs true', () => {
  it('a commission failure NEVER throws into the approval path', async () => {
    const { recordLeadSaleCommission } = await mod()
    state.referral = PARTNER_REFERRAL
    state.insertError = { message: 'connection terminated unexpectedly' }

    // The client has paid and been served. Our bookkeeping problem is not theirs.
    await expect(recordLeadSaleCommission('c1', 'lead-1', true)).resolves.toBeUndefined()
  })

  it('the call in approve-lead sits AFTER the ledger row, past every reversal branch', () => {
    // Placement is the whole safety argument: a dead email refunds the $4 and returns before
    // this line, so arriving here means the money moved and stayed moved.
    const src = readFileSync(join(__dirname, 'approve-lead.ts'), 'utf8')
    const ledgerAt = src.indexOf("reference: `lead:${claim.id}`")
    const commAt = src.indexOf('recordLeadSaleCommission(clientId')
    expect(ledgerAt, 'the $4 ledger row must exist').toBeGreaterThan(-1)
    expect(commAt, 'the commission call must exist').toBeGreaterThan(-1)
    expect(commAt, 'commission must come AFTER the charge is recorded').toBeGreaterThan(ledgerAt)

    // And it must be handed `moneyMoved`, not `true` — that flag IS the included-100 rule.
    expect(src).toContain('recordLeadSaleCommission(clientId, claim.id, moneyMoved)')
  })

  it('the reversal branches return BEFORE the commission call', () => {
    const src = readFileSync(join(__dirname, 'approve-lead.ts'), 'utf8')
    const commAt = src.indexOf('recordLeadSaleCommission(clientId')
    const firstReversal = src.indexOf("increment_wallet")
    expect(firstReversal).toBeGreaterThan(-1)
    expect(firstReversal, 'a refunded $4 must never reach the commission writer').toBeLessThan(commAt)
  })

  it('the maths RESPONDS to its input — a hardcoded $1.00 cannot pass this', async () => {
    // ⚠️ THIS TEST EXISTS BECAUSE THE OBVIOUS ONE DOES NOT WORK.
    // Asserting `amount_usd === (LEAD_PRICE_USD * PARTNER_COMMISSION_PCT) / 100` looks like a
    // derivation check and is not: 25% of $4 IS $1.00, so `return 1.00` satisfies it exactly.
    // Proven by injecting that regression — every other assertion in this file stayed green.
    // Varying the input is the only thing that separates "derived" from "coincidentally equal".
    const { leadSaleCommissionUsd } = await mod()
    const { PARTNER_COMMISSION_PCT } = await import('@kind/shared')

    expect(leadSaleCommissionUsd(8)).toBe(roundHalfUp((8 * PARTNER_COMMISSION_PCT) / 100))
    expect(leadSaleCommissionUsd(100)).toBe(roundHalfUp((100 * PARTNER_COMMISSION_PCT) / 100))
    expect(leadSaleCommissionUsd(0)).toBe(0)
    // And the live number is still the live number.
    expect(leadSaleCommissionUsd()).toBe(1)
  })

  it('nothing types the rate or the $1.00 — both derive from @kind/shared', () => {
    const src = readFileSync(join(__dirname, 'lead-sale-commission.ts'), 'utf8')
    expect(src).toContain('PARTNER_COMMISSION_PCT')
    // No bare `* 0.25` or a hardcoded dollar amount doing the maths.
    expect(src).not.toMatch(/\*\s*0\.25/)
    expect(src).not.toMatch(/amount_usd:\s*1(\.0+)?[,\s]/)
  })
})

describe('the migration is in BOTH homes (AR6) and widens the type it has to', () => {
  const KEY = '20260819_lead_sale_commission'
  const runner = readFileSync(join(__dirname, 'pending-migrations.ts'), 'utf8')
  const sql = readFileSync(join(__dirname, '../../../../supabase/migrations', `${KEY}.sql`), 'utf8')

  it('both the .sql file and the runner entry exist', () => {
    expect(runner).toContain(`key: '${KEY}'`)
    expect(sql.length).toBeGreaterThan(0)
  })

  it("commission_type accepts 'lead_sale' — without this the insert is rejected outright", () => {
    expect(sql).toContain("check (commission_type in ('land', 'retain', 'lead_sale'))")
  })

  it('the two legacy types are KEPT — statements are derived from historical rows', () => {
    expect(sql).toContain("'land'")
    expect(sql).toContain("'retain'")
  })

  it('the runner carries the same statements as the file — a drifted copy is worse than none', () => {
    const strip = (s: string) => s.split('\n').filter(l => !l.trim().startsWith('--')).join('\n').replace(/\s+/g, ' ').trim()
    expect(strip(runner.slice(runner.indexOf(`key: '${KEY}'`)))).toContain(strip(sql))
  })
})
