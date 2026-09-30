// ⚑ 30 Sep (#2459) — THE "SECOND PAYMENT" BLOCKER ASKS THE SAME QUESTION AS THE SENDING GATE.
// Vida showed House — live, running, Sending Permitted — with a red "The second payment has not
// been received … no outreach". `blockersFor` read `second_paid_at` alone; the gate that actually
// decides outreach (`authorityFor(…, 'OUTREACH')` → `p2Authorised`) also accepts INTERNAL
// authority, which is how House is authorised: it never pays. One fact, one rule.
import { describe, it, expect, vi } from 'vitest'

vi.mock('@kind/db', () => ({ db: {} }))

import { blockersFor } from './operator-programme'
import { p2Authorised, type ProgrammeRow } from './programme'

function prog(over: Partial<ProgrammeRow> = {}): ProgrammeRow {
  return {
    id: 'p1', client_id: 'c1', status: 'LIVE',
    meeting_target: 10, recommended_volume: 2500,
    price_per_meeting_cents: 0, price_total_cents: 0,
    first_payment_cents: 0, second_payment_cents: 0,
    first_payment_ref: null, second_payment_ref: null,
    first_payment_intent_id: null, second_payment_intent_id: null,
    first_paid_at: null, second_paid_at: null,
    first_authorised_at: 'x', second_authorised_at: 'x',
    sourcing_ceiling: 4000, sourced_used: 250, sourced_reserved: 0,
    approved_at: 'x', went_live_at: 'x', paused_at: null, pause_reason: null,
    value_settled_at: null, make_whole_cents: 0,
    contribution_cents: null, contribution_finalised_at: null, disputed_at: null,
    review_required_at: null, review_reason: null, review_resolved_at: null,
    ...over,
  } as ProgrammeRow
}
const kinds = (p: ProgrammeRow) => blockersFor(p, { liveCampaign: true }).map(b => b.kind)

describe('#2459 — the P2 blocker follows p2Authorised', () => {
  it('HOUSE — internal P2 authority, never paid — shows NO second-payment blocker', () => {
    const house = prog()
    expect(p2Authorised(house)).toBe(true)          // the sending gate says yes…
    expect(kinds(house)).not.toContain('second_payment_missing')   // …so the panel must too
  })

  it('an UNPAID client (no payment, no internal authority) still shows it', () => {
    const unpaid = prog({ second_authorised_at: null, first_authorised_at: null, first_paid_at: 'x', first_payment_ref: 'a' })
    expect(p2Authorised(unpaid)).toBe(false)
    expect(kinds(unpaid)).toContain('second_payment_missing')
  })

  it('a paid-in-full client (P1 recorded as settling P2) shows none', () => {
    const paid = prog({ second_authorised_at: null, first_authorised_at: null,
      first_paid_at: 'x', first_payment_ref: 's', second_paid_at: 'x', second_payment_ref: 's' })
    expect(kinds(paid)).not.toContain('second_payment_missing')
  })

  it('a stamp without its reference is NOT payment — the same rule the gate applies', () => {
    const halfStamped = prog({ second_authorised_at: null, second_paid_at: 'x', second_payment_ref: null })
    expect(p2Authorised(halfStamped)).toBe(false)
    expect(kinds(halfStamped)).toContain('second_payment_missing')
  })

  it('the panel and the gate agree on every case', () => {
    const cases = [
      prog(),
      prog({ second_authorised_at: null }),
      prog({ second_authorised_at: null, second_paid_at: 'x', second_payment_ref: 'r' }),
      prog({ second_authorised_at: null, second_paid_at: 'x', second_payment_ref: null }),
      prog({ second_authorised_at: null, second_paid_at: null, second_payment_ref: 'r' }),
    ]
    for (const p of cases) expect(kinds(p).includes('second_payment_missing')).toBe(!p2Authorised(p))
  })
})
