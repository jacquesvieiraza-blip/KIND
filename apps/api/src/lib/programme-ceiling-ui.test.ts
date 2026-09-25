// ══════════════════════════════════════════════════════════════════════════════════════════
// 🛑 R136 PR B — WHAT THE CLIENT IS ALLOWED TO BUY, AND WHAT THEY ARE TOLD BEFORE THEY DO
//
// ── THE THREE CLAIMS UNDER TEST, AND WHY EACH ONE ROTS QUIETLY ──────────────────────────
//
// ① **THE CONTROL STOPS WHERE THE POOL DOES.** It was `max={50}` and `max={500}`, two literals
//    with no connection to whether the client's targeting contains enough people to carry any
//    of it. Nothing failed: a client could buy twenty meetings out of a pool carrying three and
//    every screen afterwards agreed with them, right up until we could not deliver.
//
// ② **THE DISCLAIMER EXISTS AND NAMES NO NUMBER.** Founder-locked 23 Sep — *"we have to add a
//    disclaimer to the client we do our best. this is not a guarentee"* — and, the same day,
//    *"i said 400 internally. we dont disclose this."* Both halves are asserted, because a
//    disclaimer that leaks the rate satisfies one ruling by breaking the other.
//
// ③ **A SHORTFALL IS PRICED AT THE TIER THEY BOUGHT.** The founder chose this explicitly over
//    the alternative. Getting it backwards is a one-character change that makes a client pay
//    MORE PER MEETING because WE fell short, and it would read as perfectly reasonable.
//
// ⚠️ COMMENTS ARE STRIPPED BEFORE ANY SOURCE ASSERTION. Asserting on raw source means a
// tombstone naming what it removed reads as the violation — the shape `milla-programme.test.ts`
// records as having bitten seven times in this repo.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  deliveredValueCents, shortfallCreditCents, programmeTotalCents, pricePerMeetingUsd,
  ProgrammePricingError, PROGRAMME_BEST_EFFORTS, WIDEN_TO_GO_FURTHER,
  LEADS_PER_MEETING_WORST_CASE, LEADS_PER_TARGETED_MEETING,
} from '@kind/shared'

const REPO = join(__dirname, '../../../..')

/** Source with comments removed, so a tombstone cannot be mistaken for the thing it buried. */
function strip(file: string): string {
  const raw = readFileSync(join(REPO, file), 'utf8')
  let inBlock = false
  return raw.split('\n').map(l => {
    const x = l.trim()
    if (inBlock) { if (x.endsWith('*/') || x.endsWith('*/}')) inBlock = false; return '' }
    if (x.startsWith('/*')) { if (!x.endsWith('*/')) inBlock = true; return '' }
    if (x.startsWith('{/*')) { if (!x.endsWith('*/}')) inBlock = true; return '' }
    const i = l.search(/(?<!:)\/\//)
    return i >= 0 ? l.slice(0, i) : l
  }).join('\n')
}

const CALC = strip('apps/portal/src/components/milla/ProgrammeCalculator.tsx')

describe('🛑 ① the meetings control stops where the pool stops', () => {
  it('the component was read and is not an empty string', () => {
    expect(CALC.length, 'the calculator could not be read').toBeGreaterThan(2_000)
  })

  it('🛑 NEITHER HARD-CODED CEILING SURVIVES AS A LITERAL', () => {
    // The exact defect: `max={50}` on the slider, `max={500}` on the number box.
    expect(CALC, 'the slider is still hard-capped at 50').not.toMatch(/max=\{50\}/)
    expect(CALC, 'the number box is still hard-capped at 500').not.toMatch(/max=\{500\}/)
  })

  it('🛑 BOTH INPUTS TAKE THEIR MAXIMUM FROM THE CAPACITY READ', () => {
    // ⛓️ 25 Sep (R168 ③ · P3·max) — WAS: two `max={…}` attributes naming `cap` directly. Both
    // controls now stop at `top`: the LOWER of the capacity read and the 50-meeting maximum on
    // the new terms (null for House and the curve). Still derived from the capacity read — `top`
    // IS `cap` whenever no maximum applies — and asserted as such, so it is not weaker.
    expect(CALC).toContain('const top = cap !== null && maxMeetings !== null ? Math.min(cap, maxMeetings) : (cap ?? maxMeetings)')
    const maxima = CALC.match(/max=\{[^}]*\}/g) ?? []
    const meetingMaxima = maxima.filter(m => m.includes('top'))
    expect(meetingMaxima.length, 'fewer than two controls read the capacity').toBeGreaterThanOrEqual(2)
  })

  it('🛑 AND A NUMBER TYPED PAST THE CEILING IS CLAMPED, not just visually limited', () => {
    // `max` on a number input is advisory — a typed value exceeds it happily. Without the
    // clamp the slider would stop at capacity while the box beside it accepted anything.
    // ⛓️ 25 Sep (P3·max) — WAS `/Math\.min\(cap/`; the clamp is now to `top` (capacity, or the
    // maximum when lower — see above).
    expect(CALC, 'the typed value is not clamped to the capacity').toMatch(/Math\.min\(top/)
  })

  it('🛑 AN UNKNOWN CAPACITY CAPS NOTHING — it must never read as zero', () => {
    // "We could not reach the provider" and "your market carries no meetings" are different
    // facts, and capping a paying client at zero for the first would be the worse failure.
    // ⛓️ 25 Sep (P3·max) — WAS `cap ?? 50` / `cap ?? 500`. Unknown capacity still caps nothing
    // beyond the old defaults: `top` is null when there is neither a capacity nor a maximum.
    expect(CALC).toMatch(/top\s*\?\?\s*50/)
    expect(CALC).toMatch(/top\s*\?\?\s*500/)
    expect(CALC).toContain('(cap ?? maxMeetings)')
    expect(CALC, 'the guard does not require a KNOWN capacity').toMatch(/c\.known/)
  })

  it('the capacity is read once per screen, never per keystroke', () => {
    // It costs a provider round trip; the quote beside it is pure arithmetic and re-runs on
    // every slider movement. Folding them together would put a vendor call behind each one.
    expect(CALC, 'the capacity read is not mounted with an empty dependency list')
      .toMatch(/\}, \[\]\)/)
  })
})

describe('🛑 ② the disclaimer is present, and it gives nothing away', () => {
  it('it says we do our best and that this is not a guarantee', () => {
    expect(PROGRAMME_BEST_EFFORTS).toMatch(/do our best/i)
    expect(PROGRAMME_BEST_EFFORTS).toMatch(/guarantee/i)
  })

  it('🛑 IT STATES THAT WE STOP — the half the older sentence does not carry', () => {
    // `TARGET_NOT_GUARANTEE` already said "target, not a guarantee" and was live while we
    // still promised to keep working until the number landed. On its own it is compatible
    // with the promise the founder removed, so the new sentence has to name the stopping.
    expect(PROGRAMME_BEST_EFFORTS).toMatch(/\bstop\b/i)
  })

  it('🛑 AND IT NAMES NO NUMBER AT ALL — *"i said 400 internally. we dont disclose this."*', () => {
    for (const sentence of [PROGRAMME_BEST_EFFORTS, WIDEN_TO_GO_FURTHER]) {
      expect(sentence, `a client sentence contains digits: ${sentence}`).not.toMatch(/\d/)
      expect(sentence.toLowerCase(), 'a client sentence names the rate in words')
        .not.toMatch(/four hundred|two hundred and fifty|per meeting/)
    }
  })

  it('🛑 the widen sentence hands them their OWN fields and proposes nothing', () => {
    // Founder-locked 23 Sep: *"they need to widen their own ICP."* The 22 Sep shape — never
    // assume, hand them the controls — applied at the Programme instead of at Proof.
    expect(WIDEN_TO_GO_FURTHER).toMatch(/widen/i)
    expect(WIDEN_TO_GO_FURTHER.toLowerCase()).toMatch(/titles|seniority|company size|location/)
    expect(WIDEN_TO_GO_FURTHER.toLowerCase(), 'we are proposing a targeting rather than handing over the fields')
      .not.toMatch(/we (suggest|recommend|will widen)/)
  })

  it('both sentences are interpolated from the server, never typed into the screen', () => {
    // Working method rule 7, applied to a commercial promise rather than to a price: a second
    // copy in a component is a sentence that drifts from the rule the day the rule moves.
    expect(CALC).toContain('best_efforts_note')
    expect(CALC).toContain('widen_note')
    expect(CALC, 'the disclaimer is hand-typed into the component').not.toMatch(/do our best/i)
  })

  it('the disclaimer sits with the commitment, not lost among the illustrative figures', () => {
    const at = CALC.indexOf('best_efforts_note')
    // ⛓️ 24 Sep (R145 step 4) — the button is the one "Accept · Pay P1" now.
    const button = CALC.indexOf('void acceptAndPay()')
    expect(at, 'the disclaimer is not rendered at all').toBeGreaterThan(-1)
    expect(at, 'the disclaimer renders after the button rather than before it').toBeLessThan(button)
  })
})

describe('🛑 ③ a short programme is priced at the tier they bought', () => {
  it('ten bought, seven delivered — the 10-meeting rate, not the 7-meeting rate', () => {
    // The founder was given both and chose this one. $437.50 × 7, not $441.67 × 7.
    expect(deliveredValueCents(10, 7)).toBe(306_250)
    expect(deliveredValueCents(10, 7)).not.toBe(programmeTotalCents(7))
  })

  it('🛑 THE CLIENT NEVER PAYS MORE PER MEETING BECAUSE WE FELL SHORT', () => {
    // The regression guard, and it is the one that matters: swapping the rate argument is a
    // one-word change that looks entirely reasonable in a diff.
    for (const [bought, delivered] of [[10, 7], [50, 20], [25, 1], [3, 2]] as const) {
      // ⚠️ THE RATE IS ASSERTED THROUGH THE TOTAL, NOT BACK-DERIVED FROM IT. Rounding happens
      // ONCE on the total (see `programme-pricing.ts`), so dividing cents back out carries a
      // sub-cent error that is correct behaviour — an earlier version of this test read that
      // error as a pricing bug.
      expect(deliveredValueCents(bought, delivered),
        `${bought}→${delivered} was not priced at the tier they bought`)
        .toBe(Math.round(pricePerMeetingUsd(bought) * delivered * 100))

      // And the tier they bought is never dearer than the tier they ended up with — the curve
      // only falls, so charging the smaller tier would always cost the client more.
      expect(pricePerMeetingUsd(bought),
        `${bought}→${delivered} would have repriced upward on our own shortfall`)
        .toBeLessThanOrEqual(pricePerMeetingUsd(delivered))
    }
  })

  it('full delivery is the full price — this cannot quietly discount a complete programme', () => {
    for (const m of [1, 7, 10, 50]) {
      expect(deliveredValueCents(m, m), `${m} meetings delivered in full`).toBe(programmeTotalCents(m))
    }
  })

  it('delivering nothing is worth nothing', () => {
    expect(deliveredValueCents(10, 0)).toBe(0)
  })

  it('🛑 OVER-DELIVERY IS NOT AN INVOICE — the eleventh meeting was never bought', () => {
    expect(deliveredValueCents(10, 14)).toBe(programmeTotalCents(10))
  })

  it('nonsense is refused rather than absorbed into a money figure', () => {
    expect(() => deliveredValueCents(10, -1)).toThrow(ProgrammePricingError)
    expect(() => deliveredValueCents(10, 2.5)).toThrow(ProgrammePricingError)
    expect(() => deliveredValueCents(0, 0)).toThrow(ProgrammePricingError)
  })
})

describe('🛑 the shortfall becomes CREDIT, computed against what was actually collected', () => {
  it('a programme paid in full that delivered seven of ten credits the difference', () => {
    const total = programmeTotalCents(10)
    expect(shortfallCreditCents(10, 7, total)).toBe(total - deliveredValueCents(10, 7))
  })

  it('🛑 IT READS WHAT WAS COLLECTED, NOT WHAT WAS QUOTED', () => {
    // A programme that took only its first payment has less to return. Inferring the figure
    // from the price would credit a client for money nobody ever received — the same refusal
    // `computeContribution` already makes about revenue.
    const half = programmeTotalCents(10) / 2
    expect(shortfallCreditCents(10, 7, Math.floor(half))).toBeLessThan(
      shortfallCreditCents(10, 7, programmeTotalCents(10)))
  })

  it('a fully delivered programme credits nothing', () => {
    expect(shortfallCreditCents(10, 10, programmeTotalCents(10))).toBe(0)
  })

  it('collecting less than was earned is not a negative credit', () => {
    // A debt is not this function's business, and a negative credit would render as a number.
    expect(shortfallCreditCents(10, 10, 1_000)).toBe(0)
  })

  it('nonsense money is refused', () => {
    expect(() => shortfallCreditCents(10, 7, -1)).toThrow(ProgrammePricingError)
    expect(() => shortfallCreditCents(10, 7, 1.5)).toThrow(ProgrammePricingError)
  })
})

describe('🛑 the client route still gives away neither rate', () => {
  const MYPROG = strip('apps/api/src/routes/my-programme.ts')

  it('the capacity route answers `committed` and `known`, and nothing else', () => {
    const at = MYPROG.indexOf("myProgrammeRouter.get('/capacity'")
    expect(at, 'the capacity route is gone').toBeGreaterThan(-1)
    const body = MYPROG.slice(at, at + 1_600)
    expect(body).toContain('committed')
    expect(body).toContain('known')
    expect(body, 'the client route leaked the benchmark view').not.toContain('benchmark')
    expect(body, 'the client route leaked the headroom').not.toContain('headroom')
    // ⛓️ 24 Sep (R145 step 4 · #29) — THE WORKABLE POOL IS SENT, AND ONLY IT. Tracker #29, approved
    // 24 Sep: *"Workable pool and ceiling shown"* — and the Proof desk has shown the same figure
    // from `/icps/:id/capacity` since 22 Sep. The pool is the client's own market; what stays ours
    // is the RATES behind the ceiling (the benchmark view and the headroom, refused above).
    expect(body).toContain('workable: cap.workable')
  })

  it('🛑 AND AN UNREADABLE CAPACITY ANSWERS known:false RATHER THAN THROWING A CAP OF ZERO', () => {
    const at = MYPROG.indexOf("myProgrammeRouter.get('/capacity'")
    const body = MYPROG.slice(at, at + 1_600)
    expect(body).toMatch(/known: false/)
  })

  it('the two rates are still only ever in the shared module', () => {
    // Neither number may be re-typed on a route or a screen; both surfaces derive them.
    expect(LEADS_PER_MEETING_WORST_CASE).toBe(400)
    expect(LEADS_PER_TARGETED_MEETING).toBe(250)
    expect(CALC, 'the calculator hard-codes a rate').not.toMatch(/\b400\b/)
  })
})

describe('🛑 there is ONE capacity derivation, and Proof and the slider both read it', () => {
  it('the Proof route no longer assembles its own', () => {
    const ICPS = strip('apps/api/src/routes/icps.ts')
    const at = ICPS.indexOf("icpRouter.get('/:id/capacity'")
    expect(at, 'the Proof capacity route is gone').toBeGreaterThan(-1)
    const body = ICPS.slice(at, at + 1_800)
    expect(body, 'the Proof route still assembles capacity itself').toContain('clientCapacityFor')
    expect(body, 'a second copy of the pool arithmetic reappeared').not.toContain('poolCapacity(')
  })

  it('and the Programme route reads the same helper', () => {
    const MYPROG = strip('apps/api/src/routes/my-programme.ts')
    expect(MYPROG).toContain('clientCapacityFor')
  })
})
