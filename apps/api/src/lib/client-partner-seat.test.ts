// R40 — THE CLIENT PARTNER SEAT, and the two money/login holes it was blocked behind.
//
// The founder hired someone on commission (15 Aug). That turned three long-parked audit rows
// into blockers, because every one of them sits on HER path:
//
//   #351 — commission paid the partner's rate on EVERY payment, i.e. 20% recurring instead of
//          20%-once-then-retain. On a client spending $400/month that is ~$60/month
//          over-paid, per client, forever — and `comp-engine.ts` had the correct maths built
//          and tested but never called.
//   #370 — partner identity resolved with `.ilike(email)`, so an address containing `%`
//          matched an ARBITRARY seat. The audit named one line; there were FOUR, all on
//          authenticated routes, one of them a sandbox login.
//   #220 — commission rows had no type, so a landing fee and a retention payment were
//          indistinguishable and a monthly statement could not be derived at all.
//
// RED PROOF (each fails without its fix):
//   • restore `.ilike('email', …)` anywhere in partners.ts        → "identity is exact" fails
//   • drop the land/retain branch in maybeCreatePartnerCommission → "20% is paid ONCE" fails
//   • remove the unique index from the migration                  → "the DB is the guard" fails
//   • hard-code RATES.PARTNER_RETENTION in partnerMonthlyPay      → "the rate lives on the seat" fails
//   • re-add credit_balance to the client_partner select          → "her cut only" fails

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { partnerMonthlyPay, RATES } from './comp-engine'

const read = (p: string) => readFileSync(join(__dirname, p), 'utf8')
/** Executable lines only — a comment DESCRIBING a removed bug must not read as the bug. */
const codeOf = (src: string) => src.split('\n')
  .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
  .join('\n')
const partners = read('../routes/partners.ts')
const stripe = read('../routes/stripe.ts')
const migration = read('../../../../supabase/migrations/20260815_client_partner_seat.sql')
const runner = read('./pending-migrations.ts')

describe('#370 — a login path may never match a seat by wildcard', () => {
  it('identity is EXACT everywhere in partners.ts — no ilike survives on any lookup', () => {
    // Comments may quote the old call; executable lookups may not use it.
    const code = partners.split('\n').filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//')).join('\n')
    expect(code).not.toMatch(/\.ilike\(\s*'email'/)
  })
  it('and it goes through ONE resolver, so a fifth copy cannot drift back in', () => {
    expect(partners).toContain('function normaliseSeatEmail')
    // every seat lookup uses it
    const uses = partners.match(/\.eq\('email', normaliseSeatEmail\(/g) ?? []
    expect(uses.length).toBeGreaterThanOrEqual(4)
  })
  it('normalisation is case- and whitespace-insensitive, so it cannot fail open', () => {
    expect(partners).toMatch(/trim\(\)\.toLowerCase\(\)/)
  })
})

describe('#351 — the double-pay guard, and where it protects now', () => {
  // ⛓️ AMENDED 19 Aug 2026. This block used to assert the Stripe-payment commission writer:
  // land-vs-retain on `maybeCreatePartnerCommission`, its ref dedupe, its duplicate handling.
  // Every one of those assertions was TRUE and is now obsolete, because the founder ruled
  // commission is earned on the $4 LEAD SALE and on nothing else — *"she earns on leads
  // purchased not when they top up"* — so that writer was deleted and the three Stripe call
  // sites with it.
  //
  // The tests are rewritten rather than removed: what #351 actually protected — one payout
  // per earning event, enforced by the DATABASE and not by a read-then-write — still matters
  // exactly as much, it just guards a different event now.

  it('the DATABASE is still the guard — one row per earning event, not per month', () => {
    expect(migration).toMatch(/create unique index if not exists partner_commissions_once_per_payment/)
    expect(migration).toMatch(/\(partner_id, stripe_ref\)/)
    expect(migration).not.toMatch(/once_per_period/)   // the month-keyed design must not return
  })

  it('the lead-sale writer reuses that index rather than inventing a second guard', () => {
    // `lead:<id>` goes into stripe_ref precisely so the existing partial unique keeps working.
    const lsc = readFileSync(join(__dirname, 'lead-sale-commission.ts'), 'utf8')
    expect(lsc).toContain('stripe_ref:')
    expect(lsc).toContain('leadCommissionRef')
    expect(lsc).toContain('return `lead:${leadId}`')
  })

  it('a duplicate key is still read as the guard working, not as a lost payout', () => {
    const lsc = readFileSync(join(__dirname, 'lead-sale-commission.ts'), 'utf8')
    expect(lsc).toMatch(/duplicate key\|unique constraint/)
  })

  it('the landing fee is DB-enforced ONCE PER CLIENT, ever — its own partial unique', () => {
    expect(migration).toMatch(/partner_commissions_land_once/)
    expect(migration).toMatch(/where commission_type = 'land'/)
  })

  it('NO Stripe payment writes a commission any more — the pack, top-ups and renewals pay $0', () => {
    // The founder's ruling, asserted at its strongest: not "the pack pays a lower rate" but
    // "no payment event calls a commission writer at all".
    expect(stripe).not.toContain('async function maybeCreatePartnerCommission')
    expect(stripe).not.toContain('maybeCreatePartnerCommission(')
    expect(stripe, 'and the removal is explained where it stood').toContain('COMMISSION REMOVED HERE 19 Aug 2026')
  })

  it('the hard-coded rand rate is gone — USD is the currency of record', () => {
    expect(codeOf(stripe)).not.toMatch(/commissionUsd \* 19/)
  })
})

describe('R40 — the rate lives on the SEAT, never hard-coded to a person', () => {
  it('a seat with no rate keeps the plan default — every existing partner is untouched', () => {
    const out = partnerMonthlyPay({ newClientMrr: 0, activeBookMrr: 1000 })
    expect(out.retentionCommission).toBe(1000 * RATES.PARTNER_RETENTION)
  })
  it("her 8% comes from the seat and produces a different, larger number", () => {
    const hers = partnerMonthlyPay({ newClientMrr: 0, activeBookMrr: 1000, retainRate: RATES.CLIENT_PARTNER_RETENTION })
    expect(hers.retentionCommission).toBe(80)
    expect(hers.retentionCommission).toBeGreaterThan(partnerMonthlyPay({ newClientMrr: 0, activeBookMrr: 1000 }).retentionCommission)
  })
  it('landing is unchanged at 20% of what was landed', () => {
    expect(partnerMonthlyPay({ newClientMrr: 299, activeBookMrr: 0 }).acquisitionCommission).toBe(59.8)
  })
  it('the seat carries its own rate in the schema, defaulting to NULL = the plan rate', () => {
    expect(migration).toMatch(/add column if not exists retain_rate/)
    expect(migration).toMatch(/add column if not exists seat_type text not null default 'partner'/)
    expect(migration).toMatch(/check \(seat_type in \('partner', 'client_partner'\)\)/)
  })
})

describe('#220 — a monthly statement is derivable, so the portal is not a fake dashboard', () => {
  it('commission rows carry a type, a client and USD', () => {
    expect(migration).toMatch(/add column if not exists commission_type/)
    expect(migration).toMatch(/add column if not exists amount_usd/)
    expect(migration).toMatch(/check \(commission_type in \('land', 'retain'\)\)/)
  })
  it('the API returns the type and the client so a statement can be built', () => {
    expect(partners).toMatch(/commission_type, client_id/)
  })
})

// Her page MOVED on 16 Aug — out of `(dashboard)` (the CLIENT shell) and into `(seat)`,
// because the client layout wrapped her portal in a wallet, a "no credits — top up" banner
// and the FIGSY panel. The URL is unchanged; only the shell is. These two pins broke on the
// move and are re-pointed rather than deleted — what they assert about her page is exactly
// as true in the new shell, and a pin that gets dropped the first time a file moves was
// never a pin.
const HER_PAGE = '../../../portal/src/app/(seat)/dashboard/client-partner/page.tsx'

describe('R40 — "her cut only": her seat can never read what a client spends', () => {
  it('a client_partner select omits credit_balance; the legacy partner select keeps it', () => {
    expect(partners).toContain('const isClientPartner')
    const block = partners.slice(partners.indexOf('const referralFields'), partners.indexOf('const { data: referrals }'))
    // the client_partner branch must not carry a money column
    const clientPartnerBranch = block.slice(0, block.indexOf(':'))
    expect(block).toContain("clients(company_name)")
    expect(clientPartnerBranch).not.toContain('credit_balance')
  })
  it('her portal page has no client-spend column at all', () => {
    const page = codeOf(readFileSync(join(__dirname, HER_PAGE), 'utf8'))
    expect(page).not.toMatch(/credit_balance/)
    expect(page).toMatch(/Your share this month/)
  })
  it('and no money is typed into her page — the pack price is imported', () => {
    const page = readFileSync(join(__dirname, HER_PAGE), 'utf8')
    expect(page).toContain("import { PACK_PRICE_USD } from '@kind/shared'")
    expect(page).not.toMatch(/\$299|\$59\.80/)
  })
})

describe('the migration lives in BOTH homes (O3) — only the runner ever executes', () => {
  it('the canonical .sql exists and the runner carries the same key', () => {
    expect(migration.length).toBeGreaterThan(200)
    expect(runner).toContain("key: '20260815_client_partner_seat'")
  })
  it('the runner copy carries the real statements, not a stub', () => {
    const entry = runner.slice(runner.indexOf("key: '20260815_client_partner_seat'"))
    expect(entry).toContain('partner_commissions_once_per_payment')
    expect(entry).toContain('client_partner')
  })
  it('it is idempotent — running it twice must not fail', () => {
    expect(migration).toMatch(/add column if not exists/)
    expect(migration).toMatch(/create unique index if not exists/)
    // constraints are added only when absent
    expect(migration).toMatch(/if not exists \(\s*select 1 from pg_constraint/)
  })
})

describe('the seat is created deliberately, and audited', () => {
  it('one seat per email — the identity fix is worthless if two seats share an address', () => {
    const operator = read('../routes/operator.ts')
    const ep = operator.slice(operator.indexOf("operatorRouter.post('/seats/client-partner'"))
    expect(ep).toContain('A seat already exists for that email address.')
  })
  it('the seat is stamped client_partner with the 8% rate from the engine, never a literal', () => {
    const operator = read('../routes/operator.ts')
    const ep = operator.slice(operator.indexOf("operatorRouter.post('/seats/client-partner'"))
    expect(ep).toContain("seat_type: 'client_partner'")
    expect(ep).toContain('RATES.CLIENT_PARTNER_RETENTION')
    expect(ep).not.toMatch(/retain_rate: 0\.08/)
  })
  it('creating a login that can read money is written to the audit log', () => {
    const operator = read('../routes/operator.ts')
    expect(operator).toContain("action: 'client_partner_seat_created'")
  })
})
