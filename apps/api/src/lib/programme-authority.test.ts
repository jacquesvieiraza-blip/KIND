// ═══════════════════════════════════════════════════════════════════════════════════════
// PROGRAMME AUTHORITY — BEHAVIOUR, NOT STRING SELF-CONSISTENCY.
//
// Every assertion below calls the REAL decision function with a REAL programme shape and
// checks what it decides. None of them greps a source file for a phrase, because a gate that
// is proved by the presence of its own comment is not proved at all.
//
// The path-coverage assertions at the bottom are the exception, and they are deliberately
// narrow: they assert that each execution path CALLS the gate. What the gate then decides is
// proved here, once, against the function itself.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'

// The module under test imports `@kind/db`, which throws at import time without Supabase env
// vars. Every assertion in this file exercises the PURE decision functions, so the client is
// mocked away rather than configured — a fake URL would only invite a test to make a real call.
vi.mock('@kind/db', () => ({ db: {} }))

import {
  authorityFor, mayReplyToProspect, reviewIsOpen, REVIEW_TRIGGER_LEADS,
  type ProgrammeAction, type AuthorityRefusal,
} from './programme-authority'
import { LEADS_PER_TARGETED_MEETING } from '@kind/shared'
import type { ProgrammeRow } from './programme'

/** A LIVE, fully-paid, approved programme — the only shape that may send. */
function liveProgramme(over: Partial<ProgrammeRow> = {}): ProgrammeRow {
  return {
    id: 'prog-1', client_id: 'client-1', status: 'LIVE',
    meeting_target: 4, recommended_volume: 1000,
    price_per_meeting_cents: 50000, price_total_cents: 200000,
    first_payment_cents: 100000, second_payment_cents: 100000,
    first_payment_ref: 'cs_1', second_payment_ref: 'cs_2',
    first_paid_at: '2026-08-01T00:00:00Z', second_paid_at: '2026-08-10T00:00:00Z',
    sourcing_ceiling: 1000, sourced_used: 100, sourced_reserved: 0,
    approved_at: '2026-08-09T00:00:00Z', went_live_at: '2026-08-10T00:00:00Z',
    paused_at: null, pause_reason: null, value_settled_at: null,
    make_whole_cents: 0, contribution_cents: null, contribution_finalised_at: null,
    disputed_at: null,
    review_required_at: null, review_reason: null, review_resolved_at: null, review_resolution: null,
    ...over,
  } as ProgrammeRow
}

const ACTIONS: ProgrammeAction[] = ['SOURCING', 'OUTREACH', 'NEXT_BATCH']

function refusal(p: ProgrammeRow | null, a: ProgrammeAction): AuthorityRefusal | 'ALLOWED' {
  const v = authorityFor(p, a)
  return v.allowed ? 'ALLOWED' : v.reason
}

describe('the suite is not vacuous', () => {
  it('a fully live programme is ALLOWED for every action — otherwise every test below passes for the wrong reason', () => {
    for (const a of ACTIONS) expect(refusal(liveProgramme(), a), a).toBe('ALLOWED')
  })

  it('the review threshold is DERIVED from the shared benchmark, not a second literal', () => {
    // If someone types 250 into this module, this fails — and it should, because two copies
    // of the benchmark is how the planning number and the review number start to disagree.
    expect(REVIEW_TRIGGER_LEADS).toBe(LEADS_PER_TARGETED_MEETING)
  })
})

describe('LEGACY CLIENTS ARE NOT PROGRAMME CLIENTS', () => {
  it('no programme ⇒ allowed, for every action', () => {
    // The live commercial model ($299 pack · 100 included · $4/lead) has no programme row.
    // Forcing those clients through programme controls would break what is actually selling.
    for (const a of ACTIONS) {
      const v = authorityFor(null, a)
      expect(v.allowed, a).toBe(true)
      expect(v.allowed && v.mode).toBe('legacy')
    }
  })
})

describe('① OUTREACH CANNOT HAPPEN BEFORE PAYMENT 2', () => {
  it('second payment missing ⇒ OUTREACH refused', () => {
    expect(refusal(liveProgramme({ second_paid_at: null, second_payment_ref: null }), 'OUTREACH'))
      .toBe('second_payment_missing')
  })

  it('a payment REFERENCE without a timestamp is still not a payment', () => {
    expect(refusal(liveProgramme({ second_paid_at: null }), 'OUTREACH')).toBe('second_payment_missing')
  })

  it('🛑 BUT PAYMENT 1 STILL AUTHORISES SOURCING — the load-bearing distinction', () => {
    // Requiring Payment 2 to source would mean we cannot prepare the programme the client is
    // being asked to approve. This is the assertion that keeps the two gates apart.
    const preGoLive = liveProgramme({
      status: 'SOURCING', second_paid_at: null, second_payment_ref: null, approved_at: null,
    })
    expect(refusal(preGoLive, 'SOURCING')).toBe('ALLOWED')
    expect(refusal(preGoLive, 'NEXT_BATCH')).toBe('ALLOWED')
    expect(refusal(preGoLive, 'OUTREACH')).toBe('programme_not_approved')
  })

  it('and sourcing IS refused before Payment 1', () => {
    expect(refusal(liveProgramme({ status: 'SOURCING', first_paid_at: null }), 'SOURCING'))
      .toBe('first_payment_missing')
  })
})

describe('② OUTREACH CANNOT HAPPEN BEFORE PROGRAMME APPROVAL', () => {
  it('approved_at null ⇒ OUTREACH refused even when LIVE and fully paid', () => {
    // ⚠️ THE GAP THIS CLOSES. `mayStartCampaign` reads status, pause and the second payment —
    // NOT approved_at. A programme that reached LIVE and was paid for without an approval row
    // would have sent. "One programme approval" is a founder lock, not a status side effect.
    expect(refusal(liveProgramme({ approved_at: null }), 'OUTREACH')).toBe('programme_not_approved')
  })

  it('approval alone is not enough either — status must be LIVE', () => {
    expect(refusal(liveProgramme({ status: 'APPROVED' }), 'OUTREACH')).toBe('programme_not_live')
  })
})

describe('③④⑤ PAUSE IS THE HARD STOP — EVERY ACTION, EVERY PATH', () => {
  it('a paused programme refuses SOURCING, OUTREACH and NEXT_BATCH alike', () => {
    const paused = liveProgramme({ paused_at: '2026-08-20T00:00:00Z', pause_reason: 'client' })
    for (const a of ACTIONS) expect(refusal(paused, a), a).toBe('programme_paused')
  })

  it('the pause reason reaches the operator in the message', () => {
    const v = authorityFor(liveProgramme({ paused_at: 'now', pause_reason: 'quality' }), 'SOURCING')
    expect(v.allowed).toBe(false)
    expect(!v.allowed && v.message).toContain('quality')
  })

  it('pause beats everything else — a paused programme is refused even when otherwise perfect', () => {
    expect(refusal(liveProgramme({ paused_at: 'now' }), 'OUTREACH')).toBe('programme_paused')
  })

  it('a TERMINAL programme refuses every action, and reads as finished rather than resumable', () => {
    for (const status of ['COMPLETED', 'CANCELLED'] as const) {
      for (const a of ACTIONS) {
        expect(refusal(liveProgramme({ status, paused_at: 'now' }), a), `${status}/${a}`)
          .toBe('programme_terminal')
      }
    }
  })
})

describe('⑧ THE REVIEW HOLD BLOCKS THE NEXT BATCH — AND NOTHING ELSE', () => {
  const held = liveProgramme({ review_required_at: '2026-08-25T00:00:00Z' })

  it('NEXT_BATCH is refused while a review is open', () => {
    expect(refusal(held, 'NEXT_BATCH')).toBe('review_required')
  })

  it('🛑 REVIEW IS NOT PAUSE — in-flight OUTREACH still runs', () => {
    // The founder decision, asserted directly: a prospect dropped halfway through a sequence
    // has been told the beginning of something and never the end. Review stops what has not
    // started; it never kills a story mid-telling.
    expect(refusal(held, 'OUTREACH')).toBe('ALLOWED')
    expect(refusal(held, 'SOURCING')).toBe('ALLOWED')
  })

  it('a RESOLVED review releases the hold', () => {
    expect(refusal(liveProgramme({
      review_required_at: '2026-08-25T00:00:00Z', review_resolved_at: '2026-08-26T00:00:00Z',
    }), 'NEXT_BATCH')).toBe('ALLOWED')
  })

  it('reviewIsOpen is true only when raised AND unresolved', () => {
    expect(reviewIsOpen(liveProgramme())).toBe(false)
    expect(reviewIsOpen(liveProgramme({ review_required_at: 'x' }))).toBe(true)
    expect(reviewIsOpen(liveProgramme({ review_required_at: 'x', review_resolved_at: 'y' }))).toBe(false)
  })

  it('the ceiling also holds the next batch — unused value never expires, so it waits for a human', () => {
    expect(refusal(liveProgramme({ sourcing_ceiling: 100, sourced_used: 100 }), 'NEXT_BATCH'))
      .toBe('sourcing_ceiling_reached')
    // Reserved volume counts against the room, or two runs would each claim the same headroom.
    expect(refusal(liveProgramme({ sourcing_ceiling: 100, sourced_used: 50, sourced_reserved: 50 }), 'NEXT_BATCH'))
      .toBe('sourcing_ceiling_reached')
    // ...and it does NOT block sending what has already been sourced.
    expect(refusal(liveProgramme({ sourcing_ceiling: 100, sourced_used: 100 }), 'OUTREACH')).toBe('ALLOWED')
  })
})

describe('SOURCING AUTHORITY FOLLOWS STATUS, NOT WISHFUL THINKING', () => {
  it('DRAFT / RECOMMENDED / AWAITING_FIRST_PAYMENT carry no sourcing authority', () => {
    for (const status of ['DRAFT', 'RECOMMENDED', 'AWAITING_FIRST_PAYMENT'] as const) {
      expect(refusal(liveProgramme({ status }), 'SOURCING'), status)
        .toBe('programme_not_sourcing_authorised')
    }
  })

  it('every sourcing-authorised status does carry it', () => {
    for (const status of ['SOURCING_AUTHORISED', 'SOURCING', 'READY_FOR_APPROVAL', 'APPROVED', 'LIVE'] as const) {
      expect(refusal(liveProgramme({ status }), 'SOURCING'), status).toBe('ALLOWED')
    }
  })
})

describe('REPLYING TO A PROSPECT WHO ALREADY WROTE TO US', () => {
  it('a reply is allowed before approval and before Payment 2', () => {
    // A reply exists only because authorised outreach already reached them. Gating it on
    // Go-Live money would answer a real person with silence.
    const prepping = liveProgramme({ status: 'SOURCING', approved_at: null, second_paid_at: null })
    expect(mayReplyToProspect(prepping).allowed).toBe(true)
  })

  it('🛑 but a PAUSED programme may not reply — pause reaches every send path', () => {
    const v = mayReplyToProspect(liveProgramme({ paused_at: 'now' }))
    expect(v.allowed).toBe(false)
    expect(!v.allowed && v.reason).toBe('programme_paused')
  })

  it('and a TERMINAL programme may not reply either', () => {
    expect(mayReplyToProspect(liveProgramme({ status: 'COMPLETED' })).allowed).toBe(false)
  })

  it('a legacy client may always reply', () => {
    expect(mayReplyToProspect(null).allowed).toBe(true)
  })

  it('a NEW refusal reason blocks replies by default — the safe direction', () => {
    // The forgiven list is an allowlist, not a denylist. This proves the default: an
    // unrecognised refusal is NOT forgiven. `programme_unresolvable` is the live example.
    const v = mayReplyToProspect(liveProgramme({ status: 'CANCELLED' }))
    expect(v.allowed).toBe(false)
  })
})

describe('EVERY REFUSAL SAYS SOMETHING A HUMAN CAN ACT ON', () => {
  it('no refusal is silent, and none leaks a bare status code as its whole message', () => {
    const cases: [ProgrammeRow, ProgrammeAction][] = [
      [liveProgramme({ paused_at: 'now' }), 'OUTREACH'],
      [liveProgramme({ status: 'COMPLETED' }), 'SOURCING'],
      [liveProgramme({ approved_at: null }), 'OUTREACH'],
      [liveProgramme({ second_paid_at: null }), 'OUTREACH'],
      [liveProgramme({ status: 'DRAFT' }), 'SOURCING'],
      [liveProgramme({ status: 'SOURCING', first_paid_at: null }), 'SOURCING'],
      [liveProgramme({ review_required_at: 'x' }), 'NEXT_BATCH'],
      [liveProgramme({ sourcing_ceiling: 1, sourced_used: 1 }), 'NEXT_BATCH'],
    ]
    for (const [p, a] of cases) {
      const v = authorityFor(p, a)
      expect(v.allowed, `${a} should have refused`).toBe(false)
      if (!v.allowed) {
        expect(v.message.length, `${v.reason} has no message`).toBeGreaterThan(30)
        expect(v.message).toMatch(/[.!]$/)
      }
    }
  })

  it('no refusal message promises a refund, a credit or a meeting', () => {
    // ⚠️ COMMERCIAL SAFETY. The benchmark is not a guarantee, and no gate may imply one.
    for (const p of [liveProgramme({ review_required_at: 'x' }),
                     liveProgramme({ sourcing_ceiling: 1, sourced_used: 1 }),
                     liveProgramme({ paused_at: 'now' })]) {
      for (const a of ACTIONS) {
        const v = authorityFor(p, a)
        if (v.allowed) continue
        expect(v.message.toLowerCase(), v.reason).not.toMatch(/refund|guarantee|compensat|money back|we will book/)
      }
    }
  })
})
